import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ExtractionError,extractWithFallback,openAIVision} from '../backend/aiExtraction.js';
import {documentKey,prepareEmployees,runBatchExtraction} from '../src/utils/batchExtraction.js';
import type {EmployeeDocumentGroup} from '../src/types.js';
const json=JSON.stringify({hoVaTen:'NHÂN VIÊN MẪU',soCCCD:'000000000000'});
const groups:EmployeeDocumentGroup[]=Array.from({length:10},(_,index)=>({id:String(index),label:`Mẫu ${index}`,documents:[{id:`doc${index}`,fileName:'sample.png',base64Data:'YWJjZA==',mimeType:'image/png',docType:'khac',dataUrl:'',width:100,height:100,originalSize:6,compressedSize:6}]}));
test('fallback reserves time for another Gemini model and OpenAI after slow failures',async()=>{
  let clock=0;const calls:string[]=[];
  const result=await extractWithFallback({parts:[],now:()=>clock,gemini:async(model,timeout)=>{calls.push(model);clock+=timeout;throw new ExtractionError('busy',503,true);},openai:async(model,timeout)=>{calls.push(model);assert.equal(timeout,18000);return json;}});
  assert.equal(clock,30000);assert.equal(result.provider,'openai');assert.equal(calls.length,3);
});
test('Gemini success never calls OpenAI; invalid payload is not retried',async()=>{
  let called=false;
  await extractWithFallback({parts:[],gemini:async()=>json,openai:async()=>{called=true;return json;}});
  assert.equal(called,false);
  await assert.rejects(extractWithFallback({parts:[],gemini:async()=>{throw new ExtractionError('bad',400);},openai:async()=>{called=true;return json;}}),{status:400});
  assert.equal(called,false);
});
test('429 remains distinguishable even if another model returns 404',async()=>{
  let call=0;
  await assert.rejects(extractWithFallback({parts:[],gemini:async()=>{throw new ExtractionError('limited',call++ ? 404 : 429,! (call>1),12);}}),{status:429,retryable:true,retryAfterSeconds:12});
});
test('truncated and empty AI output never become successful profiles',async()=>{
  await assert.rejects(extractWithFallback({parts:[],gemini:async()=>'{"hoVaTen":"A"'}));
  await assert.rejects(extractWithFallback({parts:[],gemini:async()=>'{}'}),{status:422});
});
test('OpenAI uses vision + PDF + text, disables storage, preserves retry-after',async()=>{
  const parts=[{text:'Return JSON'},{inlineData:{mimeType:'image/png',data:'YWJjZA=='}},{inlineData:{mimeType:'application/pdf',data:'YWJjZA=='}}];
  const mock=async(url:any,init:any)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.text.format.type,'json_object');
    assert.deepEqual(body.input[0].content.map((p:any)=>p.type),['input_text','input_image','input_file']);
    return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:json}]}]}));
  };
  assert.equal(await openAIVision(parts,'test-model','test-key',1000,mock),json);
  await assert.rejects(openAIVision(parts,'test','test',1000,async()=>new Response('',{status:429,headers:{'retry-after':'21'}})),{status:429,retryable:true,retryAfterSeconds:21});
});
test('10-person queue runs sequentially, checkpoints successes and only retries failures',async()=>{
  let active=0,maxActive=0;const calls:string[]=[];const checkpoints:number[]=[];
  const first=await runBatchExtraction({groups,previous:[],sleep:async()=>{},random:()=>0,extract:async group=>{
    active++;maxActive=Math.max(active,maxActive);calls.push(group.id);await Promise.resolve();active--;
    return group.id==='3' ? {ok:false,data:{success:false,error:'Busy',retryable:true}} : {ok:true,data:{success:true,data:JSON.parse(json)}};
  },progress:list=>{checkpoints.push(list.filter(e=>e.extractionStatus==='success').length);}});
  assert.equal(maxActive,1);assert.equal(first.filter(e=>e.extractionStatus==='success').length,9);assert.equal(calls.filter(id=>id==='3').length,3);assert.ok(checkpoints.includes(1));
  const retryCalls:string[]=[];
  const second=await runBatchExtraction({groups,previous:first,extract:async group=>{retryCalls.push(group.id);return {ok:true,data:{success:true,data:JSON.parse(json)}};},progress:()=>{}});
  assert.deepEqual(retryCalls,['3']);assert.equal(second.filter(e=>e.extractionStatus==='success').length,10);
  const changed=structuredClone(groups);changed[0].documents[0].id='new-file';
  assert.notEqual(documentKey(changed[0]),documentKey(groups[0]));
  assert.equal(prepareEmployees(changed,second)[0].extractionStatus,'waiting');
});
test('pause preserves the finished employee and does not start the next one',async()=>{
  let pause=false,calls=0;
  const result=await runBatchExtraction({groups,previous:[],cancelled:()=>pause,extract:async()=>{calls++;pause=true;return {ok:true,data:{success:true,data:JSON.parse(json)}};},progress:()=>{}});
  assert.equal(calls,1);assert.equal(result[0].extractionStatus,'success');assert.equal(result[1].extractionStatus,'waiting');
});
