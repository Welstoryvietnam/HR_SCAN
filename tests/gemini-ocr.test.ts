import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {assistGeminiOCR,geminiOCRConfig,needsGeminiOCR} from '../backend/geminiOCR.js';
import {parseOCRProfile} from '../backend/ocrProfile.js';
import type {OCRPage} from '../backend/ocrService.js';
import {extractOCRGroup} from '../src/utils/ocrClient.js';
import {OCR_ENGINE_VERSION} from '../src/utils/ocrVersion.js';
import type {EmployeeDocumentGroup,OptimizedImageFile} from '../src/types.js';
import {geminiProfileText} from '../backend/geminiProfile.js';

const config={enabled:true,apiKey:'test-key-never-sent',model:'gemini-test'};
const text='CĂN CƯỚC CÔNG DÂN\nSố CCCD: 000000001234\nHọ và tên: NGUYỄN VĂN MẪU\nGiới tính: Nam';
const page:OCRPage={page:1,text,confidence:85,lines:[]};
const complete=text+'\nNgày sinh: 15/06/1995';
const image=await readFile(new URL('./fixtures/ocr-identity.png',import.meta.url));
const input=(ocrPage:OCRPage=page)=>({mimeType:'image/png',base64Data:image.toString('base64'),ocrPage});
const response=(text:string,finishReason='STOP')=>new Response(JSON.stringify({candidates:[{finishReason,content:{parts:[{text:JSON.stringify({text})}]}}]}),{status:200});
const forbidden:typeof fetch=async()=>{assert.fail('Provider must not be called');};

test('Gemini remains opt-in, key stays server-side and strong OCR never calls provider',async()=>{
  assert.equal(geminiOCRConfig({GEMINI_API_KEY:'existing-key'}).enabled,false);
  assert.equal((await assistGeminiOCR(input(),'disabled',{config:{...config,enabled:false},fetcher:forbidden})).assistance?.status,'disabled');
  assert.equal((await assistGeminiOCR(input(),'missing',{config:{...config,apiKey:''},fetcher:forbidden})).assistance?.status,'disabled');
  assert.equal(needsGeminiOCR(page),true);
  assert.equal(needsGeminiOCR({...page,text:complete}),false);
  // Identity cards print gender; a damaged label must not suppress assistance.
  assert.equal(needsGeminiOCR({...page,text:complete.replace('Giới tính: Nam','Gi6i tmh / Sex NỮ')}),true);
  assert.equal((await assistGeminiOCR(input({...page,text:complete}),'strong',{config,fetcher:forbidden})).assistance?.status,'not-needed');
});

test('weak OCR gains a birth date with one bounded image request and private cache',async()=>{
  let calls=0;
  const fetcher:typeof fetch=async(url,init)=>{
    calls++;assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'),config.apiKey);
    const body=JSON.parse(init?.body as string);
    assert.equal(body.store,false);assert.equal(body.generationConfig.maxOutputTokens,4096);
    assert.equal(body.contents[0].parts[0].inlineData.mimeType,'image/png');
    assert.ok(init?.signal);
    return response(complete);
  };
  const first=await assistGeminiOCR(input(),'owner-one',{config,fetcher});
  assert.equal(first.engine,'gemini');assert.equal(first.assistance?.status,'used');
  const profile=parseOCRProfile([{id:'sample',pages:[first]}]);
  assert.equal(profile.ngaySinh,'15/06/1995');assert.equal(profile.aiVisionExtracted,true);
  assert.equal((await assistGeminiOCR(input(),'owner-one',{config,fetcher})).assistance?.status,'used');
  assert.equal(calls,1);
  await assistGeminiOCR(input(),'owner-two',{config,fetcher});assert.equal(calls,2);
  assert.ok(!JSON.stringify(first).includes(config.apiKey));
});

test('identity conflicts and missing existing core fields keep original OCR',async()=>{
  const conflict=await assistGeminiOCR(input(),'conflict',{config,fetcher:async()=>response(complete.replace('000000001234','000000009999'))});
  assert.equal(conflict.text,text);assert.equal(conflict.assistance?.status,'conflict');
  const missing=await assistGeminiOCR(input(),'missing-core',{config,fetcher:async()=>response('Ngày sinh: 15/06/1995')});
  assert.equal(missing.text,text);assert.equal(missing.assistance?.status,'unavailable');
});

test('legacy Gemini structured fields recover data without depending on readable OCR labels',async()=>{
  const result=await assistGeminiOCR(input(),'structured-sop',{config,fetcher:async(_url,init)=>{
    const body=JSON.parse(init?.body as string);
    assert.ok(body.generationConfig.responseSchema.required.includes('ngaySinh'));
    assert.ok(body.generationConfig.responseSchema.properties.ngayHetHanCCCD);
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({text:'Nhãn ảnh bị mờ: abc xyz',hoVaTen:'Nguyễn Văn Mẫu',soCCCD:'000000001234',ngaySinh:'15/06/1995',ngayHetHanCCCD:'Không thời hạn',gioiTinh:'',danToc:''})}]}}]});
  }});
  assert.equal(result.assistance?.status,'used');
  const fields=parseOCRProfile([{id:'structured',pages:[result]}]);
  assert.equal(fields.ngaySinh,'15/06/1995');assert.equal(fields.ngayHetHanCCCD,'Không thời hạn');
  assert.equal(fields.hoVaTen,'NGUYỄN VĂN MẪU');assert.equal(fields.danToc,'');
  assert.equal(fields.gioiTinh,'Nam'); // Preserved from local OCR, not a JSON default.
});

test('old field-only JSON is accepted while invalid generated dates and IDs stay blank',()=>{
  const valid=geminiProfileText({hoVaTen:'Nguyễn Văn Mẫu',soCCCD:'000000001234',ngaySinh:'15/06/1995',gioiTinh:'',danToc:''});
  const fields=parseOCRProfile([{id:'legacy',pages:[{...page,text:valid}]}]);
  assert.equal(fields.ngaySinh,'15/06/1995');assert.equal(fields.gioiTinh,'');assert.equal(fields.danToc,'');
  const invalid=geminiProfileText({text:'Thông tin mờ',soCCCD:'00000O001234',ngaySinh:'31/02/1995',ngayHetHanCCCD:'tính từ tuổi'});
  const partial=parseOCRProfile([{id:'invalid',pages:[{...page,text:invalid}]}],{allowIncomplete:true});
  assert.equal(partial.soCCCD,'');assert.equal(partial.ngaySinh,'');assert.equal(partial.ngayHetHanCCCD,'');
  assert.throws(()=>geminiProfileText({hoVaTen:{text:'not a string'}}));
});

test('structured blank fields never borrow a relatives birth date from the raw transcript',()=>{
  const result=geminiProfileText({hoVaTen:'Nguyễn Văn Mẫu',soCCCD:'000000001234',ngaySinh:'',emailCaNhan:'',text:'Thông tin gia đình\nHọ và tên: TRẦN THỊ MẪU\nNgày sinh: 01/02/1970\nEmail: relative@example.com'});
  const fields=parseOCRProfile([{id:'relative',pages:[{...page,text:result,engine:'gemini'}]}]);
  assert.equal(fields.hoVaTen,'NGUYỄN VĂN MẪU');assert.equal(fields.ngaySinh,'');assert.equal(fields.emailCaNhan,'');
});

test('truncation, malformed output and transport failure preserve usable OCR',async()=>{
  for(const [index,fetcher] of [async()=>response(complete,'MAX_TOKENS'),async()=>new Response('not-json'),async()=>{throw new Error('secret transport details');}].entries()) {
    const result=await assistGeminiOCR(input(),`failure-${index}`,{config,fetcher});
    assert.equal(result.text,text);assert.equal(result.assistance?.status,'unavailable');
    assert.ok(!JSON.stringify(result).includes('secret transport details'));
  }
});

test('invalid images and oversized OCR text never reach Gemini',async()=>{
  await assert.rejects(()=>assistGeminiOCR({...input(),base64Data:'invalid'},'invalid',{config,fetcher:forbidden}),{status:400});
  await assert.rejects(()=>assistGeminiOCR(input({...page,text:'x'.repeat(100001)}),'huge',{config,fetcher:forbidden}),{status:400});
});

test('parallel requests do not fan out into paid provider calls',async()=>{
  let release:(response:Response)=>void;
  const first=assistGeminiOCR(input(),'parallel-one',{config,fetcher:()=>new Promise<Response>(resolve=>{release=resolve;})});
  const second=await assistGeminiOCR(input(),'parallel-two',{config,fetcher:forbidden});
  assert.equal(second.assistance?.status,'unavailable');
  release!(response(complete));assert.equal((await first).assistance?.status,'used');
});

test('provider quota errors open a cooldown without automatic retries',async()=>{
  const result=await assistGeminiOCR(input(),'quota',{config,fetcher:async()=>new Response('{}',{status:429})});
  assert.equal(result.assistance?.status,'unavailable');
  assert.match(result.assistance?.message || '',/hạn mức/);
  assert.equal((await assistGeminiOCR(input(),'cooldown',{config,fetcher:forbidden})).assistance?.status,'unavailable');
});

test('browser resumes cached OCR, requests assistance once and caches the enhanced page',async()=>{
  const savedFetch=globalThis.fetch;
  const document:OptimizedImageFile={id:'sample',fileName:'sample.png',originalSize:image.length,compressedSize:image.length,width:100,height:100,mimeType:'image/png',base64Data:image.toString('base64'),dataUrl:'',docType:'khac',ocrVersion:OCR_ENGINE_VERSION,ocrPages:[page]};
  const group:EmployeeDocumentGroup={id:'sample-person',label:'',documents:[document]};
  let assists=0,recognizes=0,checkpoint:OptimizedImageFile|undefined;
  globalThis.fetch=async(url,init)=>{
    if(String(url).endsWith('/capabilities')) return Response.json({success:true,data:{enabled:true,revision:'test-v1'}});
    if(String(url).endsWith('/recognize')) {recognizes++;throw Error('Must reuse cached OCR');}
    if(String(url).endsWith('/gemini-assist')) {assists++;return Response.json({success:true,data:{...page,text:complete,engine:'gemini',assistance:{status:'used'}}});}
    if(String(url).endsWith('/extract-profile')) return Response.json({success:true,data:parseOCRProfile(JSON.parse(init?.body as string).documents)});
    throw Error('Unexpected URL');
  };
  try {
    const result=await extractOCRGroup(group,value=>{checkpoint=value;},()=>{});
    assert.equal(result.data?.data?.ngaySinh,'15/06/1995');assert.equal(result.data?.data?.aiVisionExtracted,true);
    assert.equal(checkpoint?.ocrPages?.[0].assistanceRevision,'test-v1');
    await extractOCRGroup({...group,documents:[checkpoint!]},()=>{},()=>{});
    assert.equal(assists,1);assert.equal(recognizes,0);
  } finally {globalThis.fetch=savedFetch;}
});

test('browser retains usable local OCR when Gemini endpoint is unavailable',async()=>{
  const savedFetch=globalThis.fetch;
  const group:EmployeeDocumentGroup={id:'sample',label:'',documents:[{id:'sample',fileName:'sample.png',originalSize:1,compressedSize:1,width:100,height:100,mimeType:'image/png',base64Data:image.toString('base64'),dataUrl:'',docType:'khac',ocrVersion:OCR_ENGINE_VERSION,ocrPages:[page]}]};
  globalThis.fetch=async(url,init)=>{
    if(String(url).endsWith('/capabilities')) return Response.json({success:true,data:{enabled:true,revision:'test-v1'}});
    if(String(url).endsWith('/gemini-assist')) return Response.json({success:false,error:'Unavailable'},{status:503});
    if(String(url).endsWith('/extract-profile')) return Response.json({success:true,data:parseOCRProfile(JSON.parse(init?.body as string).documents)});
    throw Error('Unexpected URL');
  };
  try {
    const result=await extractOCRGroup(group,()=>{},()=>{});
    assert.equal(result.data?.success,true);assert.equal(result.data?.data?.hoVaTen,'NGUYỄN VĂN MẪU');
    assert.ok(result.data?.data?.cauHoiLamRo?.some(text=>text.includes('Chưa kết nối được Gemini')));
  } finally {globalThis.fetch=savedFetch;}
});
