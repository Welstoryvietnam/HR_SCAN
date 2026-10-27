import {createHash} from 'node:crypto';
import {OCRError,scoreOCRPage,validateOCRImage,type OCRPage} from './ocrService.js';
import {parseOCRProfile} from './ocrProfile.js';
import {geminiProfileInstruction,geminiProfileSchema,geminiProfileText} from './geminiProfile.js';
import {GEMINI_TRANSCRIPT_SEPARATOR} from './visionFormat.js';

type Config={enabled:boolean;apiKey:string;model:string};
export function geminiOCRConfig(env:NodeJS.ProcessEnv=process.env):Config {
  return {enabled:env.GEMINI_OCR_ENABLED==='true',apiKey:env.GEMINI_API_KEY || '',model:env.GEMINI_OCR_MODEL || 'gemini-3.5-flash-lite'};
}
export function geminiOCRCapabilities() {
  const config=geminiOCRConfig();
  return {enabled:config.enabled && Boolean(config.apiKey),aiVisionAvailable:Boolean(process.env.GEMINI_API_KEY),revision:`gemini-assist-v3:${config.model}`};
}
const profile=(page:OCRPage)=>parseOCRProfile([{id:'page',docType:'khac',pages:[page]}],{allowIncomplete:true});
const fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
export function needsGeminiOCR(page:OCRPage) {
  if(page.confidence<78 || page.processing?.partial || page.text.trim().length<40) return true;
  const text=fold(page.text),fields=profile(page);
  const front=/ho(?:,?\s*chu dem)?\s*va|full?\s*name|ngay.*sinh|date of birth|so cccd|so dinh danh|personal identification/.test(text);
  if(front && (!fields.hoVaTen || !fields.soCCCD || !fields.ngaySinh || !fields.gioiTinh)) return true;
  if(/co gia tri den|ngay het han|date of expiry/.test(text) && !fields.ngayHetHanCCCD) return true;
  if(/gioi tinh|\bsex\b/.test(text) && !fields.gioiTinh) return true;
  return false;
}
function validatePage(value:any):OCRPage {
  if(!value || typeof value.text!=='string' || value.text.length>100_000 || !Number.isFinite(value.confidence) || value.confidence<0 || value.confidence>100 || !Number.isInteger(value.page) || value.page<1 || value.page>30) throw new OCRError('Trang OCR hỗ trợ không hợp lệ.');
  // Coordinates supplied by the browser are not needed for assistance.
  return {page:value.page,text:value.text,confidence:value.confidence,lines:[],processing:value.processing?.partial===true ? {passes:1,partial:true} : undefined};
}

// Cache only successful results, in memory for five minutes, scoped to account.
// Keys are hashes, not identifiers. Nothing is written to disk or provider Files API.
const cache=new Map<string,{until:number;page:OCRPage}>();
const usage=new Map<string,{until:number;calls:number}>();
let active=0;
let coolingUntil=0;
export async function assistGeminiOCR(input:any,owner:string,options:{config?:Config;fetcher?:typeof fetch}={}) {
  const page=validatePage(input?.ocrPage);
  const config=options.config || geminiOCRConfig();
  if(!config.enabled || !config.apiKey) return {...page,assistance:{status:'disabled' as const}};
  if(!needsGeminiOCR(page)) return {...page,assistance:{status:'not-needed' as const}};
  const image=validateOCRImage(input);
  if(!/^gemini-[a-z0-9.-]+$/.test(config.model)) throw new OCRError('Tên model Gemini chưa hợp lệ.');
  const key=createHash('sha256').update(owner).update('\0').update(config.model).update('\0').update(image).update('\0').update(page.text).digest('hex');
  const found=cache.get(key);
  if(found && found.until>Date.now()) return {...found.page,page:page.page};
  const unavailable=(message:string)=>({...page,assistance:{status:'unavailable' as const,message}});
  if(active>=1 || Date.now()<coolingUntil) return unavailable('Gemini đang bận hoặc hết hạn mức tạm thời; đã giữ kết quả OCR để bạn kiểm tra.');
  const ownerKey=createHash('sha256').update(owner).digest('hex');
  for(const [id,value] of usage) if(value.until<Date.now()) usage.delete(id);
  const recent=usage.get(ownerKey) || {until:Date.now()+600_000,calls:0};
  if(recent.calls>=20 || (!usage.has(ownerKey) && usage.size>=100)) return unavailable('Đã đạt giới hạn Gemini hỗ trợ tạm thời; đã giữ dữ liệu OCR. Hãy kiểm tra hoặc thử lại sau.');
  usage.set(ownerKey,{...recent,calls:recent.calls+1});
  active++;
  try {
    const response=await (options.fetcher || fetch)(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},signal:AbortSignal.timeout(30_000),
      body:JSON.stringify({store:false,systemInstruction:{parts:[{text:geminiProfileInstruction}]},contents:[{role:'user',parts:[{inlineData:{mimeType:input.mimeType,data:input.base64Data}},{text:'Trích xuất trực tiếp các trường từ ảnh theo SOP. Chữ OCR có thể sai, chỉ dùng đối chiếu:\n'+page.text.slice(0,20_000)}]}],generationConfig:{temperature:0,maxOutputTokens:4096,responseMimeType:'application/json',responseSchema:geminiProfileSchema}}),
    });
    if(!response.ok) {
      if(response.status===429 || response.status===503) coolingUntil=Date.now()+60_000;
      return unavailable(response.status===429 ? 'Gemini đã chạm hạn mức; đã giữ kết quả OCR. Không tự gọi lại để tránh tốn thêm lượt.' : 'Gemini chưa trả được kết quả; đã giữ dữ liệu OCR. Hãy kiểm tra khóa, model và cấu hình Billing.');
    }
    const data=await response.json();
    const candidate=data?.candidates?.[0];
    if(candidate?.finishReason!=='STOP') return unavailable('Gemini chưa đọc xong trang; đã giữ kết quả OCR.');
    const raw=candidate.content?.parts?.filter((part:any)=>typeof part.text==='string' && !part.thought).map((part:any)=>part.text).join('');
    const parsed=JSON.parse(raw || '{}');
    const enhanced:OCRPage={page:page.page,text:geminiProfileText(parsed),confidence:page.confidence,lines:[],engine:'gemini',assistance:{status:'used'}};
    const before=profile(page),after=profile(enhanced);
    for(const field of ['hoVaTen','soCCCD','ngaySinh'] as const) {
      if(before[field] && after[field] && fold(before[field])!==fold(after[field])) return {...page,assistance:{status:'conflict' as const,message:'OCR và Gemini đọc khác nhau ở họ tên, CCCD hoặc ngày sinh. Đã giữ kết quả OCR; cần đối chiếu ảnh gốc.'}};
      if(before[field] && !after[field]) return unavailable('Gemini đọc thiếu trường đã có; đã giữ kết quả OCR.');
    }
    // A better identity read must not discard other values local OCR already
    // found on this same page. Keep them only where Gemini left a field blank.
    const labels={ngayCap:'Ngày cấp',ngayHetHanCCCD:'Có giá trị đến',noiCap:'Nơi cấp',queQuan:'Quê quán',diaChiThuongTru:'Nơi thường trú',gioiTinh:'Giới tính',danToc:'Dân tộc',tinhTrangHonNhan:'Tình trạng hôn nhân',soDienThoai:'Số thuê bao di động',emailCaNhan:'Email'};
    const retained=Object.entries(labels).flatMap(([field,label])=>before[field] && !after[field] ? [`${label}: ${String(before[field]).replace(/[\r\n]+/g,' ')}`] : []);
    if(retained.length) enhanced.text=enhanced.text.includes(GEMINI_TRANSCRIPT_SEPARATOR)
      ? enhanced.text.replace(GEMINI_TRANSCRIPT_SEPARATOR,`\n${retained.join('\n')}${GEMINI_TRANSCRIPT_SEPARATOR}`)
      : `${enhanced.text}\n${retained.join('\n')}`;
    if(scoreOCRPage(enhanced)<scoreOCRPage(page)) return unavailable('Gemini chưa cải thiện kết quả tách trường; đã giữ dữ liệu OCR.');
    for(const [id,value] of cache) if(value.until<Date.now()) cache.delete(id);
    if(cache.size>=50) cache.delete(cache.keys().next().value!);
    cache.set(key,{until:Date.now()+300_000,page:enhanced});
    return enhanced;
  } catch {
    return unavailable('Gemini hết thời gian chờ hoặc trả lỗi; đã giữ kết quả OCR để bạn tiếp tục.');
  } finally {active--;}
}
