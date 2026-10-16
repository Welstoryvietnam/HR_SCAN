import {createRequire} from 'node:module';
import {copyFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
// Keep the isolated worker's dependency graph visible to Vercel file tracing.
import 'tesseract.js';
const require=createRequire(path.resolve(process.cwd(),'package.json'));
export class OCRError extends Error {
  constructor(message:string,public status=400,public retryable=false) {super(message);}
}
export interface OCRLine {text:string;x:number;y:number;width:number;height:number;}
export interface OCRPage {page:number;text:string;confidence:number;lines:OCRLine[];}

export function validateOCRImage(input:any) {
  if(!input || !['image/jpeg','image/png'].includes(input.mimeType) || typeof input.base64Data!=='string' || !input.base64Data.length || input.base64Data.length>4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64Data) || input.base64Data.length%4) throw new OCRError('OCR cần một ảnh JPEG/PNG hợp lệ, tối đa 3 MB.');
  const data=Buffer.from(input.base64Data,'base64');
  let width=0,height=0;
  if(input.mimeType==='image/png' && data.length>=24 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.toString('ascii',12,16)==='IHDR') {width=data.readUInt32BE(16);height=data.readUInt32BE(20);}
  else if(input.mimeType==='image/jpeg' && data[0]===255 && data[1]===216) {
    let offset=2;
    while(offset+8<data.length) {
      if(data[offset++]!==255) break;
      while(data[offset]===255) offset++;
      const marker=data[offset++];
      if(marker===217 || marker===218) break;
      const length=data.readUInt16BE(offset);
      if(length<2 || offset+length>data.length) break;
      if([192,193,194].includes(marker)) {height=data.readUInt16BE(offset+3);width=data.readUInt16BE(offset+5);break;}
      offset+=length;
    }
  }
  if(!width || !height || width*height>12_000_000 || Math.max(width,height)>8000) throw new OCRError('Ảnh không hợp lệ hoặc vượt 12 triệu điểm ảnh. Hãy thu nhỏ ảnh rồi thử lại.');
  return data;
}

let busy=false;
let modelDirectory:Promise<string>|undefined;
function prepareModels() {
  return modelDirectory ||= (async()=>{
    const directory=path.join(tmpdir(),'hrscan-ocr-v1');await mkdir(directory,{recursive:true});
    await Promise.all(['vie','eng'].map(async code=>{
      const entry=code==='vie' ? require.resolve('@tesseract.js-data/vie') : require.resolve('@tesseract.js-data/eng');
      await copyFile(path.join(path.dirname(entry),'4.0.0_best_int',`${code}.traineddata.gz`),path.join(directory,`${code}.traineddata.gz`));
    }));
    return directory;
  })().catch(error=>{modelDirectory=undefined;throw error;});
}
export async function recognizeImage(input:unknown):Promise<OCRPage> {
  const image=validateOCRImage(input);
  if(busy) throw new OCRError('Máy OCR đang xử lý ảnh khác. Hệ thống sẽ thử lại.',429,true);
  busy=true;
  let worker:Worker|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    const langPath=await prepareModels();
    worker=new Worker(path.resolve(process.cwd(),'backend/ocrWorker.cjs'),{
      workerData:{image,langPath,engineEntry:require.resolve('tesseract.js')},execArgv:[],stdout:true,stderr:true,
    });
    // Engine diagnostics can contain OCR text: do not forward them to logs.
    worker.stdout?.resume();worker.stderr?.resume();
    const result=await new Promise<OCRPage>((resolve,reject)=>{
      timer=setTimeout(()=>reject(new OCRError('OCR quá thời gian chờ. Hãy thử lại ảnh hoặc chia nhỏ trang.',504,true)),45_000);
      worker!.once('message',message=>message?.ok && message.data ? resolve(message.data) : reject(new OCRError('OCR chưa đọc được chữ rõ ràng. Hãy chụp gần, đủ sáng và thẳng tài liệu.',422)));
      worker!.once('error',()=>reject(new OCRError('Không khởi động được máy OCR. Vui lòng thử lại.',503,true)));
      worker!.once('exit',()=>reject(new OCRError('Máy OCR đã dừng trước khi trả kết quả. Vui lòng thử lại.',503,true)));
    });
    return result;
  } catch(error) {
    if(error instanceof OCRError) throw error;
    throw new OCRError('Máy OCR chưa nạp được bộ nhận dạng. Vui lòng kiểm tra cấu hình triển khai.',503);
  } finally {
    clearTimeout(timer);await worker?.terminate().catch(()=>{});busy=false;
  }
}
