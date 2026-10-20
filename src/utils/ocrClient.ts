import type {EmployeeDocumentGroup,DocumentExtractionResult,OptimizedImageFile} from '../types';
import type {ExtractReply} from './batchExtraction';
import {safeFetchJson} from './apiHelper';
import {OCR_ENGINE_VERSION} from './ocrVersion';
type OCRPage=NonNullable<OptimizedImageFile['ocrPages']>[number];
class OCRRequestError extends Error {
  constructor(public reply:ExtractReply,public status=0) {super(reply.data?.error || reply.error || 'Không nhận được kết quả OCR.');}
}
async function recognize(mimeType:string,base64Data:string):Promise<OCRPage> {
  const reply=await safeFetchJson<{success:boolean;data?:OCRPage;error?:string;status?:number;retryable?:boolean;retryAfterSeconds?:number}>('/api/ocr/recognize',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(55_000),body:JSON.stringify({mimeType,base64Data}),
  });
  if(!reply.ok || !reply.data?.success || !reply.data.data) throw new OCRRequestError({ok:false,data:{success:false,error:reply.data?.error || reply.error,retryable:reply.data?.retryable,retryAfterSeconds:reply.data?.retryAfterSeconds}},reply.data?.status);
  return reply.data.data;
}
export async function extractOCRGroup(group:EmployeeDocumentGroup,onDocument:(doc:OptimizedImageFile)=>void,onStatus:(message:string)=>void):Promise<ExtractReply> {
  const documents: {id:string;fileName:string;docType:string;pages:OCRPage[]}[]=[];
  try {
    const capabilities=await safeFetchJson<{success:boolean;data?:{enabled:boolean;revision:string}}>('/api/ocr/capabilities',{signal:AbortSignal.timeout(10_000)});
    const config=capabilities.ok && capabilities.data?.success ? capabilities.data.data : undefined;
    const needsAssist=(page:OCRPage)=>Boolean(config?.enabled && page.engine!=='gemini' && page.assistanceRevision!==config.revision);
    const assist=async(mimeType:string,base64Data:string,page:OCRPage):Promise<OCRPage>=>{
      if(!needsAssist(page)) return page;
      onStatus('Kiểm tra chất lượng OCR; Gemini hỗ trợ nếu trang còn thiếu hoặc khó đọc…');
      const reply=await safeFetchJson<{success:boolean;data?:OCRPage}>('/api/ocr/gemini-assist',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mimeType,base64Data,ocrPage:page}),signal:AbortSignal.timeout(40_000),
      });
      if(!reply.ok || !reply.data?.success || !reply.data.data) return {...page,assistance:{status:'unavailable',message:'Chưa kết nối được Gemini hỗ trợ; đã giữ kết quả OCR.'}};
      const result=reply.data.data;
      return {...result,...(result.assistance && ['used','not-needed','conflict'].includes(result.assistance.status) ? {assistanceRevision:config!.revision} : {})};
    };
    const readRaster=async(mimeType:string,base64Data:string,index=1,saved?:OCRPage)=>{
      let page=saved;
      if(!page) {
        try {page={...await recognize(mimeType,base64Data),page:index};}
        catch(error) {
          if(!config?.enabled || !(error instanceof OCRRequestError) || ![422,503,504].includes(error.status)) throw error;
          page={page:index,text:'',confidence:0,lines:[]};
        }
      }
      return assist(mimeType,base64Data,page);
    };
    for(const document of group.documents) {
      let pages=document.ocrVersion===OCR_ENGINE_VERSION ? [...(document.ocrPages || [])] : [];
      const checkpoint=(page:OCRPage)=>{
        pages=[...pages.filter(previous=>previous.page!==page.page),page].sort((a,b)=>a.page-b.page);
        onDocument({...document,ocrPages:pages,ocrVersion:OCR_ENGINE_VERSION});
      };
      if(document.mimeType==='application/pdf') {
        const pdfjs=await import('pdfjs-dist');
        const {default:workerUrl}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
        const task=pdfjs.getDocument({data:Uint8Array.from(atob(document.base64Data),char=>char.charCodeAt(0))});
        try {
          const pdf=await task.promise;
          if(pdf.numPages>30) throw new Error('PDF vượt 30 trang. Hãy chia nhỏ tài liệu trước khi OCR.');
          for(let index=1;index<=pdf.numPages;index++) {
            const saved=pages.find(page=>page.page===index);
            if(saved && !needsAssist(saved)) continue;
            onStatus(`Đọc ${document.fileName}, trang ${index}/${pdf.numPages}…`);
            const page=await pdf.getPage(index);
            const content=await page.getTextContent();
            const lines:OCRPage['lines']=[];
            const items=content.items.filter((item):item is import('pdfjs-dist/types/src/display/api').TextItem=>'str' in item);
            const sorted=items.filter(item=>item.str.trim()).sort((a,b)=>Math.abs(a.transform[5]-b.transform[5])>3 ? b.transform[5]-a.transform[5] : a.transform[4]-b.transform[4]);
            for(const item of sorted) {
              const x=item.transform[4],y=item.transform[5];const last=lines.at(-1);
              if(last && Math.abs(last.y-y)<=3) {last.text+='  '+item.str;last.width=x+item.width-last.x;}
              else lines.push({text:item.str,x,y,width:item.width,height:item.height});
            }
            const text=lines.map(line=>line.text).join('\n');
            const operators=await page.getOperatorList();
            const rasterOps=new Set([pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintImageMaskXObject]);
            const textPage=saved || (text.replace(/\s/g,'').length>=80 && !operators.fnArray.some(op=>rasterOps.has(op)) ? {page:index,text,confidence:100,lines} : undefined);
            if(textPage && !needsAssist(textPage)) checkpoint(textPage);
            else {
              const original=page.getViewport({scale:1});const scale=Math.min(2,2000/Math.max(original.width,original.height));
              const viewport=page.getViewport({scale});const canvas=documentElement();
              canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
              const context=canvas.getContext('2d');if(!context) throw new Error('Trình duyệt không hỗ trợ chuyển PDF thành ảnh.');
              try {
                await page.render({canvas,canvasContext:context,viewport,background:'white'}).promise;
                const result=await readRaster('image/jpeg',canvas.toDataURL('image/jpeg',0.85).split(',')[1],index,textPage);
                checkpoint({...result,page:index});
              } finally {canvas.width=0;canvas.height=0;}
            }
            page.cleanup();
          }
        } finally {await task.destroy();}
      } else if(!pages.some(page=>page.page===1) || needsAssist(pages.find(page=>page.page===1)!)) {
        onStatus(`OCR ${document.fileName}…`);
        checkpoint(await readRaster(document.mimeType,document.base64Data,1,pages.find(page=>page.page===1)));
      }
      documents.push({id:document.id,fileName:document.fileName,docType:document.docType,pages});
    }
    return await safeFetchJson<{success:boolean;data?:DocumentExtractionResult;error?:string;retryable?:boolean}>('/api/ocr/extract-profile',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documents}),signal:AbortSignal.timeout(20_000),
    });
  } catch(error) {
    return error instanceof OCRRequestError ? error.reply : {ok:false,error:(error as Error).message || 'Không đọc được tài liệu. Hãy kiểm tra PDF/ảnh.'};
  }
}
// Kept separate because the current document variable represents an uploaded file.
const documentElement=()=>window.document.createElement('canvas');
