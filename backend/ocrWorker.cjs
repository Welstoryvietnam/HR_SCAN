// Isolate the native/WASM engine so a timeout can terminate all OCR work.
const {parentPort,workerData}=require('node:worker_threads');
const path=require('node:path');
const {createRequire}=require('node:module');
const fold=text=>String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
function validDates(text) {
  return [...text.matchAll(/\b(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4})\b/g)].filter(match=>{
    const [day,month,year]=match.slice(1).map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return year>=1900 && year<=2200 && date.getUTCDate()===day && date.getUTCMonth()===month-1;
  }).length;
}
function candidateQuality(page) {
  const text=fold(page?.text);
  const lines=String(page?.text || '').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const nameLabel=/^(?:ho(?:,?\s*chu dem)? va (?:ten|len)|ho ten|full name|fl\s*name)\b/;
  const birthLabel=/^(?:ngay(?:,? thang,? (?:nam|adm))? sinh|date of bi(?:r)?th)\b/;
  const fieldLabel=/^(?:gioi tinh|sex|quoc tich|nationality|que quan|place of origin|(?:noi )?thuong tru|place of residence|ngay cap|date of issue|co gia tri den|ngay het han|date of expiry|cap nhat|dan toc|ho.{0,20}va (?:ten|len))\b/;
  const hasLabeledValue=(pattern,validate)=>lines.some((line,index)=>{
    const match=fold(line).match(pattern);
    if(!match) return false;
    const rest=line.slice(match[0].length).replace(/^\s*\/?\s*(?:Full?\s*name|Fl\s*name|Date of bi(?:r)?th)?\s*[:：.-]?\s*/i,'');
    if(validate(rest)) return true;
    for(let next=index+1;next<Math.min(lines.length,index+3);next++) {
      if(fieldLabel.test(fold(lines[next]))) break;
      if(validate(lines[next])) return true;
    }
    return false;
  });
  const name=hasLabeledValue(nameLabel,value=>{
    const clean=value.normalize('NFC').replace(/\s{3,}[\p{L}\p{M}]\s*[|¦]*$/u,'').replace(/[.\s|¦]+$/g,'').trim();
    return /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)+$/u.test(clean) && clean.length<=100;
  });
  const birth=hasLabeledValue(birthLabel,value=>validDates(value)>0);
  const id=/\b\d{12}\b/.test(text);
  const dates=validDates(text);
  const labels=[/can cuoc|identity card/,/so cccd|so dinh danh|personal identification/,/gioi tinh|sex|gender/,/quoc tich|nationality/,/que quan|place of origin/,/thuong tru|place of residence/,/ngay cap|date of issue/,/co gia tri den|date of expiry/,/dan toc|ethnicity/].filter(pattern=>pattern.test(text)).length;
  // Confidence alone favours short, confidently misread fragments on a sideways
  // card. Prefer recognisable identity labels, real dates and twelve-digit IDs.
  const score=Number(name)*20+Number(birth)*18+Number(id)*25+Math.min(dates,3)*7+labels*6+
    Math.min(Number(page?.confidence) || 0,100)/12+Math.min(text.length,600)/100;
  return {score,complete:name && birth && id && dates>0,name,birth,id,labels,dates};
}
function shouldRetryOrientations(page) {
  const quality=candidateQuality(page);
  // Missing profile fields are not evidence of a sideways image. Recognisable
  // upright labels/values establish direction even when birth/expiry is faint.
  if(quality.name && (quality.id || quality.birth)) return false;
  if(quality.labels>=2 && (quality.id || quality.dates>0 || (page.confidence>=70 && page.text.length>=100))) return false;
  if(!quality.name && !quality.birth && !quality.id && quality.labels>=3 && page.confidence>=85 && page.text.length>=250) return false;
  // A well-read long letter/CV does not need all CCCD labels. Sparse/short
  // results still try other orientations, even if their confidence is high.
  if(!quality.labels && page.confidence>=86 && page.text.length>=700) return false;
  return true;
}
function needsRecognitionRetry(page) {
  const quality=candidateQuality(page);
  return page.confidence<70 || page.text.trim().length<40 || (!quality.complete && (quality.name || quality.birth || quality.id));
}
function chooseCandidate(current,next) {
  if(!next?.text?.trim() || next.text.length>100_000) return current;
  if(!current || candidateQuality(next).score>candidateQuality(current).score) return next;
  return current;
}
async function run() {
  let worker;
  let best;
  let bestImage;
  let uprightOriginal=false;
  let passes=0;
  const deadline=Date.now()+39_000;
  try {
    const sharp=require(workerData.sharpEntry);
    sharp.cache(false);sharp.concurrency(1);
    const {createWorker,PSM}=require(workerData.engineEntry);
    const engineRequire=createRequire(workerData.engineEntry);
    worker=await createWorker(['vie','eng'],1,{
      workerPath:engineRequire.resolve('./worker-script/node/index.js'),
      corePath:path.dirname(engineRequire.resolve('tesseract.js-core')),
      langPath:workerData.langPath,cacheMethod:'none',logger:()=>{},errorHandler:()=>{},
    });
    await worker.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'300'});
    const original=Buffer.from(workerData.image);
    async function recognize(image,rotation,mode) {
      await worker.setParameters({tessedit_pageseg_mode:mode});
      const {data}=await worker.recognize(image,{rotateAuto:false},{text:true,blocks:true});
      passes++;
      const text=data.text?.trim();
      if(!text || text.length>100_000) return;
      const lines=(data.blocks || []).flatMap(block=>(block.paragraphs || []).flatMap(paragraph=>(paragraph.lines || []).map(line=>({text:line.text.trim(),x:line.bbox.x0,y:line.bbox.y0,width:line.bbox.x1-line.bbox.x0,height:line.bbox.y1-line.bbox.y0}))));
      const next={page:1,text,confidence:Number(data.confidence) || 0,lines,rotation,processing:{passes,partial:false}};
      if(rotation===0 && !shouldRetryOrientations(next)) uprightOriginal=true;
      // Parent scores every pass using the real field parser. A heuristic
      // winner can still contain less usable data than an earlier rotation.
      parentPort.postMessage({checkpoint:true,data:next});
      const chosen=chooseCandidate(best,next);
      if(chosen!==best) {
        best=chosen;bestImage=image;
      }
    }
    await recognize(original,0,PSM.AUTO);
    // Try a different text layout on the unchanged image before any physical
    // quarter-turn. This also improves faint fields on an already upright page.
    if((!best || shouldRetryOrientations(best) || needsRecognitionRetry(best)) && Date.now()<deadline-5_000) {
      await recognize(original,0,PSM.SPARSE_TEXT);
    }
    if(!uprightOriginal && (!best || shouldRetryOrientations(best))) {
      for(const rotation of [90,270,180]) {
        if(Date.now()>deadline-5_000) break;
        const image=await sharp(original,{limitInputPixels:12_000_000}).rotate(rotation).png().toBuffer();
        await recognize(image,rotation,PSM.AUTO);
        if(best && !shouldRetryOrientations(best)) break;
      }
      if(!best || shouldRetryOrientations(best)) {
        // AUTO can find only page decorations on a card surrounded by blank
        // space. Try sparse layout in the other orientations too; selecting
        // sparse only on AUTO's winner would never rescue a sideways card.
        const rotations=[...new Set([best?.rotation,90,270,180].filter(value=>value!==undefined && value!==0))];
        for(const rotation of rotations) {
          if(Date.now()>deadline-5_000) break;
          const image=rotation===0 ? original : await sharp(original,{limitInputPixels:12_000_000}).rotate(rotation).png().toBuffer();
          await recognize(image,rotation,PSM.SPARSE_TEXT);
          if(best && !shouldRetryOrientations(best)) break;
        }
      }
    }
    if(bestImage && Date.now()<deadline-7_000 && needsRecognitionRetry(best)) {
      const metadata=await sharp(bestImage).metadata();
      const scale=Math.min(2,3000/Math.max(metadata.width,metadata.height),Math.sqrt(10_000_000/(metadata.width*metadata.height)));
      if(scale>1.2) {
        const enlarged=await sharp(bestImage).resize({width:Math.round(metadata.width*scale),height:Math.round(metadata.height*scale)}).grayscale().normalize().sharpen({sigma:0.5}).png().toBuffer();
        await recognize(enlarged,best.rotation,PSM.SPARSE_TEXT);
      }
    }
    if(best) parentPort.postMessage({ok:true,data:{...best,processing:{passes,partial:Date.now()>=deadline}}});
    else parentPort.postMessage({ok:false});
  } catch {
    parentPort.postMessage(best ? {ok:true,data:{...best,processing:{passes,partial:true}}} : {ok:false});
  }
  finally {await worker?.terminate().catch(()=>{});}
}
// Pure scoring helpers can be tested without loading OCR models or Sharp.
module.exports={candidateQuality,shouldRetryOrientations,chooseCandidate};
if(parentPort && workerData) run();
