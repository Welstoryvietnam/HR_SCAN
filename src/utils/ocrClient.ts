import type {EmployeeDocumentGroup,DocumentExtractionResult,OptimizedImageFile} from '../types';
import type {ExtractReply} from './batchExtraction';
import {safeFetchJson} from './apiHelper';
import {OCR_ENGINE_VERSION} from './ocrVersion';
type OCRPage=NonNullable<OptimizedImageFile['ocrPages']>[number];
class OCRRequestError extends Error {
  constructor(public reply:ExtractReply,public status=0) {super(reply.data?.error || reply.error || 'Không nhận được kết quả OCR.');}
}
type FastVisionReply = {
  success: boolean;
  data?: DocumentExtractionResult;
  pages?: Record<string, OCRPage>;
  error?: string;
  retryable?: boolean;
};
const FAST_VISION_TIMEOUT_MS=55_000;
const MAX_FAST_VISION_REQUEST_BYTES=3_000_000;
async function recognize(mimeType:string,base64Data:string):Promise<OCRPage> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const reply = await safeFetchJson<{
      success: boolean;
      data?: OCRPage;
      error?: string;
      status?: number;
      retryable?: boolean;
      retryAfterSeconds?: number;
    }>('/api/ocr/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({ mimeType, base64Data }),
    });

    if (reply.ok && reply.data?.success && reply.data.data) {
      return reply.data.data;
    }

    // Auto-retry with jitter if OCR engine is busy (429) or temporary queue
    if ((reply.data?.retryable || reply.status === 429) && attempt < 7) {
      const wait = Math.max(800, (reply.data?.retryAfterSeconds || 1) * 1000) + Math.round(Math.random() * 400);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    throw new OCRRequestError(
      {
        ok: false,
        data: {
          success: false,
          error: reply.data?.error || reply.error,
          retryable: reply.data?.retryable,
          retryAfterSeconds: reply.data?.retryAfterSeconds,
        },
      },
      reply.data?.status || reply.status
    );
  }
  throw new Error('Không nhận được kết quả OCR.');
}
export async function extractOCRGroup(
  group:EmployeeDocumentGroup,
  onDocument:(doc:OptimizedImageFile)=>void,
  onStatus:(message:string)=>void,
  scanMode:'ai'|'local'='ai'
):Promise<ExtractReply> {
  const documents: {id:string;fileName:string;docType:string;pages:OCRPage[]}[]=[];
  try {
    // Fast AI Vision Mode: directly extract using Gemini 3.8 Flash multimodal API (~2 seconds)
    if (scanMode === 'ai' && group.documents.length > 0) {
      onStatus(`⚡ Đang Quét AI Siêu Tốc (${group.documents.length} tài liệu)…`);
      const fastPayload={
        documents: group.documents.map(d => ({
          id: d.id,
          fileName: d.fileName,
          docType: d.docType,
          mimeType: d.mimeType,
          base64Data: d.base64Data,
        })),
        label: group.label,
      };
      const fastBody=JSON.stringify(fastPayload);
      const fastBytes=new TextEncoder().encode(fastBody).byteLength;
      if(fastBytes>MAX_FAST_VISION_REQUEST_BYTES) {
        return {ok:false,data:{success:false,retryable:false,error:'Bốn ảnh hiện vượt dung lượng ổn định cho một lần quét trên điện thoại. Hãy dùng “Xem / Xoay / Cắt” để giảm/cắt ảnh, hoặc tải lại ảnh để hệ thống nén trước khi quét.'}};
      }
      const requestFastVision=()=>safeFetchJson<FastVisionReply>('/api/ocr/extract-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(FAST_VISION_TIMEOUT_MS),
        body: fastBody,
      });
      let fastReply=await requestFastVision();

      // Retry once for a transient connection issue. The server reuses an
      // identical in-flight request when both calls reach the same instance.
      const transient=/mất kết nối|timed out|timeout|http 5\d\d|phản hồi rỗng/i.test(fastReply.error || fastReply.data?.error || '');
      if (!fastReply.ok && (fastReply.status === 503 || fastReply.status === 429 || fastReply.data?.retryable || transient)) {
        onStatus('Kết nối AI đang chậm, giữ nguyên hồ sơ và thử lại một lần…');
        await new Promise(r => setTimeout(r, 900));
        fastReply=await requestFastVision();
      }

      if (fastReply.ok && fastReply.data?.success && fastReply.data.data) {
        const pagesMap = fastReply.data.pages || {};
        for (const doc of group.documents) {
          const docPage: OCRPage = pagesMap[doc.id] || {
            page: 1,
            text: fastReply.data.data.hoVaTen || '',
            confidence: 99,
            lines: [],
            engine: 'gemini',
            assistance: { status: 'used' },
          };
          onDocument({
            ...doc,
            ocrPages: [docPage],
            ocrVersion: OCR_ENGINE_VERSION,
          });
        }
        return {
          ok: true,
          data: {
            success: true,
            data: fastReply.data.data,
          },
        };
      }
      const message=fastReply.data?.error || fastReply.error || 'Quét AI chưa hoàn thành.';
      const retryable=fastReply.data?.retryable || transient;
      onStatus('Quét AI chưa hoàn thành. Ảnh và kết quả đang được giữ nguyên để thử lại.');
      return {ok:false,data:{success:false,error:message,retryable,retryAfterSeconds:retryable ? 2 : 0}};
    }

    const capabilities=await safeFetchJson<{success:boolean;data?:{enabled:boolean;aiVisionAvailable?:boolean;revision:string}}>('/api/ocr/capabilities',{signal:AbortSignal.timeout(10_000)});
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
    const documents = await Promise.all(
      group.documents.map(async (document) => {
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
          onStatus(`⚡ Đang OCR song song: ${document.fileName}…`);
          checkpoint(await readRaster(document.mimeType,document.base64Data,1,pages.find(page=>page.page===1)));
        }
        return {id:document.id,fileName:document.fileName,docType:document.docType,pages};
      })
    );
    const result=await safeFetchJson<{success:boolean;data?:DocumentExtractionResult;error?:string;retryable?:boolean}>('/api/ocr/extract-profile',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documents}),signal:AbortSignal.timeout(20_000),
    });
    if(result.ok && result.data?.success && result.data.data && documents.some(document=>document.pages.some(page=>page.manualRotationSuggested))) {
      const warning='Một hoặc nhiều ảnh có thể bị xoay ngang hoặc chữ chưa rõ. Hãy dùng “Xem / Xoay / Cắt” ở Bước 1 rồi quét lại riêng ảnh đó nếu thông tin còn thiếu.';
      result.data.data.cauHoiLamRo=[...new Set([...(result.data.data.cauHoiLamRo || []),warning])];
    }
    return result;
  } catch(error) {
    return error instanceof OCRRequestError ? error.reply : {ok:false,error:(error as Error).message || 'Không đọc được tài liệu. Hãy kiểm tra PDF/ảnh.'};
  }
}
// Kept separate because the current document variable represents an uploaded file.
const documentElement=()=>window.document.createElement('canvas');
