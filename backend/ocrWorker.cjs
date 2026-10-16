// Isolate the native/WASM engine so a timeout can terminate all OCR work.
const {parentPort,workerData}=require('node:worker_threads');
const path=require('node:path');
const {createRequire}=require('node:module');
async function run() {
  let worker;
  try {
    const {createWorker,PSM}=require(workerData.engineEntry);
    const engineRequire=createRequire(workerData.engineEntry);
    worker=await createWorker(['vie','eng'],1,{
      workerPath:engineRequire.resolve('./worker-script/node/index.js'),
      corePath:path.dirname(engineRequire.resolve('tesseract.js-core')),
      langPath:workerData.langPath,cacheMethod:'none',logger:()=>{},errorHandler:()=>{},
    });
    await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1',user_defined_dpi:'300'});
    const {data}=await worker.recognize(Buffer.from(workerData.image),{rotateAuto:true},{text:true,blocks:true});
    const text=data.text.trim();
    if(!text || text.length>100_000) {parentPort.postMessage({ok:false});return;}
    const lines=(data.blocks || []).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.map(line=>({text:line.text.trim(),x:line.bbox.x0,y:line.bbox.y0,width:line.bbox.x1-line.bbox.x0,height:line.bbox.y1-line.bbox.y0}))));
    parentPort.postMessage({ok:true,data:{page:1,text,confidence:data.confidence,lines}});
  } catch {parentPort.postMessage({ok:false});}
  finally {await worker?.terminate().catch(()=>{});}
}
run();
