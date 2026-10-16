export interface VisionPart { text?: string; inlineData?: {mimeType:string;data:string}; }
export class ExtractionError extends Error {
  constructor(message:string, public status=502, public retryable=false, public retryAfterSeconds=0) { super(message); }
}
export function classifyAIError(error:unknown) {
  const value = error as {status?:number;message?:string;retryAfterSeconds?:number};
  const message = String(value?.message || '');
  const status = value?.status || Number(message.match(/\b(400|401|403|404|408|429|500|502|503|504)\b/)?.[1]) || 502;
  const timeout = /timeout|timed out|abort/i.test(message);
  return {status:timeout ? 504 : status,retryable:timeout || [408,429,500,502,503,504].includes(status),retryAfterSeconds:value?.retryAfterSeconds || 0};
}
function validateJSON(text:string) {
  const value = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
  if (!value || Array.isArray(value) || typeof value !== 'object' || !['hoVaTen','soCCCD','ngaySinh','diaChiThuongTru','emailCaNhan'].some(key => typeof value[key] === 'string' && value[key].trim())) {
    throw new ExtractionError('AI chưa đọc được thông tin nhận dạng. Hãy dùng ảnh rõ chữ hơn.',422);
  }
  return text.replace(/^```(?:json)?\s*|\s*```$/g,'').trim();
}
export async function openAIVision(parts:VisionPart[],model:string,key:string,timeout:number,fetcher:typeof fetch=fetch) {
  const content = parts.map(part => part.text ? {type:'input_text',text:part.text} : part.inlineData?.mimeType === 'application/pdf'
    ? {type:'input_file',filename:'document.pdf',file_data:`data:application/pdf;base64,${part.inlineData.data}`}
    : {type:'input_image',image_url:`data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}`,detail:'high'});
  const response = await fetcher('https://api.openai.com/v1/responses',{
    method:'POST',signal:AbortSignal.timeout(timeout),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,store:false,input:[{role:'user',content}],text:{format:{type:'json_object'}},max_output_tokens:8192}),
  });
  if (!response.ok) {
    // Never include provider response bodies, documents or credentials in logs.
    const after = response.headers.get('retry-after');
    const seconds = after ? (Number(after) || Math.ceil((Date.parse(after)-Date.now())/1000)) : 0;
    throw new ExtractionError(`OpenAI HTTP ${response.status}`,response.status,[408,429,500,502,503,504].includes(response.status),Math.max(0,seconds || 0));
  }
  const body = await response.json();
  if (body.status !== 'completed') throw new ExtractionError('OpenAI chưa trả kết quả đầy đủ.',502,true);
  return body.output?.flatMap((item:any) => item.content || []).filter((item:any) => item.type === 'output_text').map((item:any) => item.text).join('') || '';
}
export async function extractWithFallback(options:{
  parts:VisionPart[];gemini?: (model:string,timeout:number)=>Promise<string>;
  openai?: (model:string,timeout:number)=>Promise<string>;openaiModel?:string;
  now?:()=>number;log?:(event:Record<string,unknown>)=>void;
}) {
  const now = options.now || Date.now;
  const start = now();
  const attempts = [
    ...(options.gemini ? [{provider:'gemini',model:'gemini-3.8-flash',budget:options.openai ? 16_000 : 24_000,run:options.gemini},{provider:'gemini',model:'gemini-3.1-flash-lite',budget:options.openai ? 14_000 : 24_000,run:options.gemini}] : []),
    ...(options.openai ? [{provider:'openai',model:options.openaiModel || 'gpt-4.1-mini',budget:18_000,run:options.openai}] : []),
  ];
  if (!attempts.length) throw new ExtractionError('Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY trên máy chủ.',503);
  const errors:ReturnType<typeof classifyAIError>[] = [];
  for (const attempt of attempts) {
    const remaining = 50_000-(now()-start);
    if (remaining < 1000) break;
    const started = now();
    try {
      const text = validateJSON(await attempt.run(attempt.model,Math.min(attempt.budget,remaining)));
      options.log?.({provider:attempt.provider,model:attempt.model,status:200,durationMs:now()-started});
      return {text,model:attempt.model,provider:attempt.provider};
    } catch(error) {
      const classified = error instanceof ExtractionError ? {status:error.status,retryable:error.retryable,retryAfterSeconds:error.retryAfterSeconds} : classifyAIError(error);
      errors.push(classified);
      options.log?.({provider:attempt.provider,model:attempt.model,status:classified.status,durationMs:now()-started});
      // Do not send malformed documents to additional providers.
      if (classified.status === 400 || classified.status === 422) throw new ExtractionError('Tài liệu hoặc định dạng chưa được AI chấp nhận. Hãy kiểm tra lại ảnh/PDF.',classified.status);
    }
  }
  const transient = errors.find(error => error.retryable);
  const last = transient || errors.at(-1);
  const status = last?.status || 504;
  const message = status === 429 ? 'AI đang đạt hạn mức. Hồ sơ này sẽ được thử lại sau.' : status === 504 ? 'AI phản hồi chậm. Kết quả các hồ sơ khác vẫn được giữ lại.' : [401,403].includes(status) ? 'Khóa API không hợp lệ hoặc chưa có quyền gọi AI. Quản trị viên cần kiểm tra cấu hình.' : status === 404 ? 'Model AI chưa khả dụng. Quản trị viên cần kiểm tra cấu hình model.' : 'Dịch vụ AI tạm thời bận. Bạn có thể thử lại riêng hồ sơ này.';
  throw new ExtractionError(message,status,Boolean(transient),Math.max(0,...errors.map(error=>error.retryAfterSeconds)));
}
