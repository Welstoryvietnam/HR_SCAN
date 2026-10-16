import assert from 'node:assert/strict';
import {test} from 'node:test';
import {documentKey,prepareEmployees,runBatchExtraction} from '../src/utils/batchExtraction.js';
import type {EmployeeDocumentGroup} from '../src/types.js';
const json=JSON.stringify({hoVaTen:'NHÂN VIÊN MẪU',soCCCD:'000000000000'});
const groups:EmployeeDocumentGroup[]=Array.from({length:10},(_,index)=>({id:String(index),label:`Mẫu ${index}`,documents:[{id:`doc${index}`,fileName:'sample.png',base64Data:'YWJjZA==',mimeType:'image/png',docType:'khac',dataUrl:'',width:100,height:100,originalSize:6,compressedSize:6}]}));
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
