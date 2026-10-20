import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {generateKeyPairSync} from 'node:crypto';
import type {Server} from 'node:http';
import {FirestoreRecordStore} from '../backend/recordStore.js';
import {planHrmAccounts} from '../backend/hrmAccountMigration.js';
import {verifyPassword,accountStore,AccountStore} from '../backend/accountStore.js';
import {planLegacyHrmImport} from '../backend/legacyHrmMigration.js';
const source={employees:[
 {id:'9900001',name:'TEST ADMIN',role:'admin',email:'admin@example.test',password:'SyntheticAdmin!'},
 {id:'9900002',name:'TEST MANAGER',role:'quan_ly_nhan_su',email:'',password:'SyntheticManager!'},
 {id:'9900003',name:'TEST EMPLOYEE',role:'nhan_vien_nhan_su',email:'',password:'SyntheticEmployee!'},
 {id:'9900004',name:'TEST OTHER',role:'nhan_vien_nhan_su',email:'other@example.test',password:'SyntheticOther!'},
]};
const accounts=planHrmAccounts(source),originalFetch=globalThis.fetch,documents=new Map<string,any>();
let server:Server,base:string,revision=0;
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
before(async()=>{
 process.env.VERCEL='1';process.env.FIREBASE_PROJECT_ID='hrscan';
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 process.env.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({project_id:'hrscan',client_email:'test@hrscan.iam.gserviceaccount.com',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
 globalThis.fetch=async(input,init)=>{
  const url=String(input);if(url==='https://oauth2.googleapis.com/token')return json({access_token:'test-token',expires_in:3600});
  if(!url.startsWith('https://firestore.googleapis.com/'))return originalFetch(input,init);
  const body=init?.body?JSON.parse(String(init.body)):{};
  if(url.endsWith(':commit')){
   for(const w of body.writes){const old=documents.get(w.update?.name||w.delete);if(w.currentDocument?.exists===false&&old)return json({error:{status:'ALREADY_EXISTS'}},409);if(w.currentDocument?.updateTime&&w.currentDocument.updateTime!==old?.updateTime)return json({error:{status:'FAILED_PRECONDITION'}},409);}
   revision++;const updateTime=`2026-10-20T00:00:${String(revision).padStart(2,'0')}Z`;
   for(const w of body.writes){if(w.delete)documents.delete(w.delete);else documents.set(w.update.name,{...w.update,updateTime});}
   return json({writeResults:body.writes.map(()=>({updateTime}))});
  }
  if(url.endsWith(':runQuery')){const q=body.structuredQuery,f=q.where?.fieldFilter;return json([...documents.values()].filter(d=>d.name.split('/').at(-2)===q.from[0].collectionId&&(!f||d.fields[f.field.fieldPath]?.stringValue===f.value.stringValue)).map(document=>({document})));}
  const name=url.split('/v1/')[1];return documents.has(name)?json(documents.get(name)):json({error:{status:'NOT_FOUND'}},404);
 };
 await new FirestoreRecordStore('hrm_accounts',v=>v).create(accounts);
 await new FirestoreRecordStore('hrm_auth',v=>v).create([{id:'config',enabled:true}]);
 await new FirestoreRecordStore('hrm_directory',v=>v).create(planLegacyHrmImport(source).entries.map(e=>({...e.record,accountId:e.record.id})));
 const {default:app}=await import('../api/index.js');
 server=await new Promise<Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const address=server.address();assert.ok(address&&typeof address==='object');base=`http://127.0.0.1:${address.port}`;
});
after(async()=>{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));globalThis.fetch=originalFetch;});
async function call(path:string,token='',method='GET',body?:any){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,...await response.json()};}
const login=async(index:number)=>{const employee=source.employees[index],result=await call('/api/auth/login','','POST',{username:employee.id,password:employee.password});assert.equal(result.status,200);return result.user;};
test('HRM codes and stored passwords work without universal or last-four-digit bypasses',async()=>{
 for(let i=0;i<source.employees.length;i++){const user=await login(i);assert.equal(user.id,accounts[i].id);assert.equal(user.employeeCode,source.employees[i].id);assert.equal(user.role,i<2?'admin':'employee');assert.equal('passwordHash' in user,false);assert.equal(verifyPassword(accounts[i],source.employees[i].password),true);}
 for(const password of ['123456','0003','admin123'])assert.equal((await call('/api/auth/login','','POST',{username:'9900003',password})).status,401);
 assert.equal((await call('/api/auth/login','','POST',{username:'admin',password:'admin123'})).status,401);
});
test('automatic ownership uses the original employee profile; other employees remain inaccessible',async()=>{
 const admin=await login(0),employee=await login(2),other=await login(3);
 const bootstrap=await call('/api/hrm/bootstrap',employee.sessionToken);assert.equal(bootstrap.data.employees.length,1);assert.equal(bootstrap.data.employees[0].id,employee.id);assert.equal(bootstrap.data.employees[0].employeeCode,'9900003');
 const task=await call('/api/hrm/tasks',admin.sessionToken,'POST',{employeeId:employee.id,title:'TEST OWN TASK',description:'',dueDate:'2026-10-20',status:'pending',progress:0});assert.equal(task.status,200);
 assert.equal((await call('/api/hrm/tasks/'+task.data.id,employee.sessionToken)).status,200);
 assert.equal((await call('/api/hrm/tasks/'+task.data.id,other.sessionToken)).status,403);
 assert.equal((await call('/api/admin/users',employee.sessionToken)).status,403);
 const manager=await login(1);assert.equal((await call('/api/admin/users',manager.sessionToken)).status,200);
});
test('admin responses never disclose password hashes, and contact edits preserve stable ownership',async()=>{
 const admin=await login(0),token=admin.sessionToken;
 const list=await call('/api/admin/users',token);assert.equal(list.status,200);assert.equal(JSON.stringify(list).includes('scrypt:'),false);assert.ok(list.users.every((u:any)=>!('password' in u)&&!('passwordHash' in u)));
 const saved=await call('/api/admin/users/'+accounts[2].id,token,'PUT',{email:'new-contact@example.test'});assert.equal(saved.status,200);assert.equal(saved.user.email,accounts[2].email);assert.equal(saved.user.contactEmail,'new-contact@example.test');
 accountStore.invalidate();const employee=await login(2);assert.equal(employee.email,accounts[2].email);
 const reloaded=await new FirestoreRecordStore('hrm_accounts',v=>v).get(accounts[2].id);assert.equal(reloaded.record.contactEmail,'new-contact@example.test');assert.equal(reloaded.record.password,undefined);
});
test('missing HRM activation never restores seeded accounts in Production',async()=>{
 const name='projects/hrscan/databases/(default)/documents/hrm_auth/config',previous=documents.get(name);
 const oldEnvironment=process.env.VERCEL_ENV,oldFixtures=process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS;
 documents.delete(name);process.env.VERCEL_ENV='production';process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS='1';
 try {await assert.rejects(()=>new AccountStore().load(accounts),/chưa được kích hoạt/);}finally{documents.set(name,previous);if(oldEnvironment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnvironment;if(oldFixtures===undefined)delete process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS;else process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS=oldFixtures;}
});
