import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import type { Server } from 'node:http';
import { FirestoreRecordStore } from '../backend/recordStore.js';
import { createSession, readSession } from '../backend/session.js';

// Fake external Firestore, not a process-local personnel cache. No real data or
// credentials are used. Two independent API servers read the same remote store.
const documents = new Map<string,any>();
const originalFetch = globalThis.fetch;
let failCommit = false;
let upstreamFailure: {status:number;body:any} | null = null;
let commits = 0;
let servers: Server[] = [];
let urls: string[] = [];
const json = (body: any,status = 200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

before(async () => {
  process.env.VERCEL = '1';
  process.env.FIREBASE_PROJECT_ID = 'hrscan';
  const {privateKey} = generateKeyPairSync('rsa',{modulusLength:2048});
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({project_id:'hrscan',client_email:'test@hrscan.iam.gserviceaccount.com',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
  globalThis.fetch = async (input,init) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') return json({access_token:'test-token',expires_in:3600});
    if (!url.startsWith('https://firestore.googleapis.com/')) return originalFetch(input,init);
    if (upstreamFailure) return json(upstreamFailure.body,upstreamFailure.status);
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-token');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.endsWith(':commit')) {
      commits++;
      if (failCommit) return json({error:{status:'UNAVAILABLE'}},503);
      for (const write of body.writes) {
        const existing = documents.get(write.update?.name || write.verify || write.delete);
        if (write.currentDocument?.exists === false && existing) return json({error:{status:'ALREADY_EXISTS'}},409);
        if (write.currentDocument?.updateTime && write.currentDocument.updateTime !== existing?.updateTime) return json({error:{status:'FAILED_PRECONDITION'}},409);
      }
      for (const write of body.writes) {
        if (write.verify) continue;
        if (write.delete) documents.delete(write.delete);
        else documents.set(write.update.name,{...write.update,updateTime:`2026-10-15T01:00:${String(commits).padStart(2,'0')}Z`});
      }
      return json({writeResults:body.writes.map(() => ({updateTime:`2026-10-15T01:00:${String(commits).padStart(2,'0')}Z`}))});
    }
    if (url.endsWith(':runQuery')) {
      const email = body.structuredQuery.where?.fieldFilter.value.stringValue;
      const collection = body.structuredQuery.from[0].collectionId;
      return json([...documents.values()].filter(doc => doc.name.split('/').at(-2) === collection && (!email || doc.fields.userEmail?.stringValue === email)).map(document => ({document})));
    }
    const name = url.split('/v1/')[1];
    if (name.includes('/parts?')) {
      const parent = name.split('?')[0]+'/';
      return json({documents:[...documents.values()].filter(doc => doc.name.startsWith(parent))});
    }
    return documents.has(name) ? json(documents.get(name)) : json({error:{status:'NOT_FOUND'}},404);
  };
  const {default:app} = await import('../api/index.js');
  for (let i=0;i<2;i++) {
    const server = await new Promise<Server>(resolve => {const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    servers.push(server);
    urls.push(`http://127.0.0.1:${address.port}`);
  }
});

after(async () => {
  globalThis.fetch = originalFetch;
  await Promise.all(servers.map(server => new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve()))));
});

async function login(username: string,password: string,server = 0) {
  const response = await fetch(`${urls[server]}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  assert.equal(response.status,200);
  return (await response.json()).user.sessionToken as string;
}
function headers(token: string) { return {'Content-Type':'application/json',Authorization:`Bearer ${token}`}; }

async function draftCall(token:string,path:string,method='GET',body?:any,device=0) {
  const response = await fetch(`${urls[device]}/api/drafts${path}`,{method,headers:headers(token),...(body === undefined ? {} : {body:JSON.stringify(body)})});
  return {status:response.status,...await response.json()};
}
const draftSnapshot = (step=1) => ({step,employees:step>1 ? [{id:'employee-a',hoVaTen:'TEST DRAFT',soCCCD:'000000001234',ngaySinh:'',gioiTinh:'',queQuan:'',diaChiThuongTru:'',soDienThoai:'',thamQuyen:'Giám sát trưởng',phuCapNangLuc:345000}] : [],groups:[{id:'employee-a',label:'TEST DRAFT',documents:[{id:'file-a',fileName:'test.pdf',mimeType:'application/pdf',base64Data:Buffer.from('%PDF-test synthetic document').toString('base64'),docType:'khac'}]}]});
async function uploadDraft(token:string,snapshot:any,active?:any) {
  const content = JSON.stringify(snapshot);
  const staged = await draftCall(token,'/stage','POST',{...active,chunkCount:2,byteLength:Buffer.byteLength(content)});
  assert.equal(staged.status,200);
  const meta = staged.data;
  const split = Math.floor(content.length/2);
  for (const [index,part] of [content.slice(0,split),content.slice(split)].entries()) assert.equal((await draftCall(token,`/${meta.id}/parts/${meta.revision}/${index}`,'PUT',{content:part})).status,200);
  const finished = await draftCall(token,`/${meta.id}/finish`,'POST',{revision:meta.revision,version:meta.version});
  assert.equal(finished.status,200,JSON.stringify(finished));
  return finished.data;
}

test('Step 4 save survives independent store instances and another device login, excluding uploads',async () => {
  const token = await login('tuyendung','tuyendung123');
  const response = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su`,{method:'POST',headers:headers(token),body:JSON.stringify({hoVaTen:'TEST FIRESTORE',soCCCD:'000000000001',ngayVaoLam:'2026-10-15',emailCaNhan:'test@example.com',tinhTrangHonNhan:'Đã kết hôn',ngayHetHanCCCD:'15/04/2035',thamQuyen:'Trưởng địa điểm',phuCapNangLuc:250000,tongThuNhapDuKien:1,luongCoBan:6000000,phuCapCoDinh:0,images:[{base64Data:'PRIVATE_IMAGE'}],pdf:'PRIVATE_PDF',thongTinGiaDinh:[{hoTen:'TEST FAMILY',quanHe:'Anh',image:'PRIVATE_IMAGE'}]})});
  assert.equal(response.status,200);
  const saved = (await response.json()).record;
  const newDevice = await login('tuyendung','tuyendung123',1);
  const list = await (await fetch(`${urls[1]}/api/sheets/danh-sach-nhan-su`,{headers:headers(newDevice)})).json();
  assert.ok(list.data.some((record: any) => record.id === saved.id));
  const freshStore = new FirestoreRecordStore();
  const restored = (await freshStore.get(saved.id)).record;
  assert.equal(restored.ngayVaoLam,'2026-10-15');
  assert.equal(restored.phuCapCoDinh,0);
  assert.equal(restored.emailCaNhan,'test@example.com');
  assert.equal(restored.tinhTrangHonNhan,'Đã kết hôn');
  assert.equal(restored.ngayHetHanCCCD,'15/04/2035');
  assert.equal(restored.thamQuyen,'Trưởng địa điểm');
  assert.equal(restored.phuCapNangLuc,250000);
  assert.equal(restored.tongThuNhapDuKien,6250000);
  assert.doesNotMatch(JSON.stringify([...documents.values()]),/PRIVATE_|base64|images|pdf/);
});

test('client email spoofing cannot read or change another user records',async () => {
  const noSession = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su`,{headers:{'x-user-email':'happyendpu@gmail.com'}});
  assert.equal(noSession.status,401);
  const token = await login('hr_mai','123456');
  const list = await (await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su`,{headers:{...headers(token),'x-user-email':'happyendpu@gmail.com'}})).json();
  assert.equal(list.isAdmin,false);
  assert.equal(list.data.length,0);
  const change = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su/unknown`,{method:'PUT',headers:headers(token),body:'{}'});
  assert.equal(change.status,403);
  const adminSpoof = await fetch(`${urls[0]}/api/admin/users`,{headers:{'x-user-email':'happyendpu@gmail.com'}});
  assert.equal(adminSpoof.status,401);
  const employeeAdmin = await fetch(`${urls[0]}/api/admin/users`,{headers:headers(token)});
  assert.equal(employeeAdmin.status,403);
  const reset = await fetch(`${urls[0]}/api/auth/forgot-password`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'happyendpu@gmail.com'})});
  assert.equal(reset.status,503);
  assert.equal((await reset.json()).simulatedCode,undefined);
});

test('batch validation is atomic and Firestore outage never reports successful save',async () => {
  const token = await login('admin','admin123');
  const initialSize = documents.size;
  const count = commits;
  const invalid = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su/batch`,{method:'POST',headers:headers(token),body:JSON.stringify({records:[{hoVaTen:'VALID',soCCCD:'000000000002'},{hoVaTen:'INVALID'}]})});
  assert.equal(invalid.status,400);
  assert.equal(commits,count);
  failCommit = true;
  try {
    const response = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su`,{method:'POST',headers:headers(token),body:JSON.stringify({hoVaTen:'OUTAGE',soCCCD:'000000000003'})});
    assert.equal(response.status,503);
    assert.equal((await response.json()).success,false);
    assert.equal(documents.size,initialSize);
  } finally { failCommit = false; }
});

test('admin update, CSV export and delete use the same durable Firestore records',async () => {
  const token = await login('admin','admin123');
  const list = await (await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su`,{headers:headers(token)})).json();
  const id = list.data[0].id;
  const response = await fetch(`${urls[1]}/api/sheets/danh-sach-nhan-su/${id}`,{method:'PUT',headers:headers(token),body:JSON.stringify({hoVaTen:'UPDATED TEST',userEmail:'evil@example.com',images:['PRIVATE_IMAGE'],luongCoBan:7000000})});
  assert.equal(response.status,200);
  const stored = (await new FirestoreRecordStore().get(id)).record;
  assert.equal(stored.hoVaTen,'UPDATED TEST');
  assert.equal(stored.userEmail,'tuyendung@congty.com');
  assert.equal(stored.images,undefined);
  assert.equal(stored.phuCapNangLuc,250000);
  assert.equal(stored.ngayHetHanCCCD,'15/04/2035');
  assert.equal(stored.thongTinGiaDinh[0].hoTen,'TEST FAMILY');
  const freshStore = new FirestoreRecordStore();
  const snapshot = await freshStore.get(id);
  await freshStore.update(id,{...snapshot.record,ghiChu:'First update'},snapshot.version);
  await assert.rejects(() => freshStore.update(id,{...snapshot.record,ghiChu:'Stale update'},snapshot.version),/Hồ sơ đã thay đổi/);
  const csv = await fetch(`${urls[0]}/api/export/csv`,{headers:headers(token)});
  assert.equal(csv.status,200);
  assert.match(await csv.text(),/UPDATED TEST/);
  const deleted = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su/${id}`,{method:'DELETE',headers:headers(token)});
  assert.equal(deleted.status,200);
  assert.equal(documents.size,0);
});

test('tampered sessions and missing Firestore configuration fail closed',async () => {
  const token = createSession({id:'usr_admin_01',email:'happyendpu@gmail.com',role:'admin'});
  assert.equal(readSession(`${token}tampered`),null);
  const old = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '';
  try {
    await assert.rejects(() => new FirestoreRecordStore().list(),/FIREBASE_PROJECT_ID/);
  } finally { process.env.FIREBASE_SERVICE_ACCOUNT_JSON = old; }
});

test('a valid multi-employee batch is committed together and readable from a fresh store',async () => {
  const token = await login('tuyendung','tuyendung123');
  const response = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su/batch`,{method:'POST',headers:headers(token),body:JSON.stringify({employees:[{hoVaTen:'BATCH ONE',soCCCD:'000000000004'},{hoVaTen:'BATCH TWO',soCCCD:'000000000005'}]})});
  assert.equal(response.status,200);
  const result = await response.json();
  assert.equal(result.count,2);
  const store = new FirestoreRecordStore();
  assert.equal((await store.list('tuyendung@congty.com')).length,2);
  for (const record of result.records) await store.delete(record.id);
});

test('configuration errors distinguish missing database, disabled API and missing IAM access',async () => {
  const store = new FirestoreRecordStore();
  try {
    upstreamFailure = {status:404,body:{error:{status:'NOT_FOUND'}}};
    await assert.rejects(() => store.list(),/database \(default\)/);
    upstreamFailure = {status:403,body:{error:{status:'PERMISSION_DENIED',details:[{reason:'SERVICE_DISABLED'}]}}};
    await assert.rejects(() => store.list(),/Chưa bật Cloud Firestore API/);
    upstreamFailure = {status:403,body:[{error:{status:'PERMISSION_DENIED',details:[{reason:'SERVICE_DISABLED'}]}}]};
    await assert.rejects(() => store.list(),/Chưa bật Cloud Firestore API/);
    upstreamFailure = {status:403,body:{error:{status:'PERMISSION_DENIED'}}};
    await assert.rejects(() => store.list(),/roles\/datastore.user/);
  } finally {upstreamFailure = null;}
});

test('draft Step 1 files and Step 3 fields resume on an independent device, private even from other admins',async () => {
  const token = await login('tuyendung','tuyendung123');
  let draft = await uploadDraft(token,draftSnapshot());
  const deviceToken = await login('tuyendung','tuyendung123',1);
  const listed = await draftCall(deviceToken,'','GET',undefined,1);
  assert.equal(listed.data[0].documentCount,1);
  assert.equal(listed.data[0].step,1);
  assert.doesNotMatch(JSON.stringify(listed),/base64Data|PDF-test/);
  const meta = (await draftCall(deviceToken,`/${draft.id}`,'GET',undefined,1)).data;
  let content = '';
  for (let index=0;index<meta.chunkCount;index++) content += (await draftCall(deviceToken,`/${draft.id}/parts/${meta.revision}/${index}`,'GET',undefined,1)).data;
  assert.deepEqual(JSON.parse(content),draftSnapshot());
  const other = await login('admin','admin123');
  assert.equal((await draftCall(other,`/${draft.id}`)).status,404);
  assert.equal((await draftCall(other,'')).data.length,0);
  assert.equal((await draftCall(other,`/${draft.id}/parts/${meta.revision}/0`)).status,404);
  assert.equal((await draftCall(other,`/${draft.id}`,'DELETE',{version:draft.version})).status,404);
  assert.equal((await draftCall('', '')).status,401);
  const previous = {...draft};
  draft = await uploadDraft(deviceToken,draftSnapshot(3),draft);
  const form = {employee:{hoVaTen:'TEST DRAFT',luongCoBan:1234567,congViecDuKien:'Công việc tùy chỉnh',chucVu:'Chức vụ tùy chỉnh'},bulk:{khoi:'K',ban:'B',phong:'P',congViec:'CV',chucVu:'V',diemLamViec:'D',loaiHopDong:'H'},selectedIds:['employee-a'],activeIndex:0,isCustomOrg:true,isCustomJob:true};
  draft = await uploadDraft(deviceToken,{...draftSnapshot(3),form},draft);
  const formMeta = (await draftCall(token,`/${draft.id}`)).data;
  let restoredForm = '';
  for (let index=0;index<formMeta.chunkCount;index++) restoredForm += (await draftCall(token,`/${draft.id}/parts/${formMeta.revision}/${index}`)).data;
  assert.deepEqual(JSON.parse(restoredForm).form,form);
  const stale = await draftCall(token,'/stage','POST',{id:draft.id,version:previous.version,chunkCount:1,byteLength:10});
  assert.equal(stale.status,409);
  const current = (await draftCall(token,`/${draft.id}`)).data;
  assert.equal(current.step,3);
  assert.ok([...documents.keys()].filter(name => name.includes(`/intakeDrafts/${draft.id}/parts/`)).every(name => name.includes(current.revision)));
  const submitted = await fetch(`${urls[1]}/api/sheets/danh-sach-nhan-su/batch`,{method:'POST',headers:headers(deviceToken),body:JSON.stringify({employees:draftSnapshot(3).employees,draftId:draft.id,draftVersion:draft.version})});
  assert.equal(submitted.status,200,await submitted.clone().text());
  assert.equal((await submitted.json()).draftCleanupPending,false);
  assert.equal((await draftCall(token,`/${draft.id}`)).status,404);
  assert.ok(![...documents.keys()].some(name => name.includes(`/intakeDrafts/${draft.id}`)));
  const store = new FirestoreRecordStore();
  const records = await store.list('tuyendung@congty.com');
  assert.equal(records[0].phuCapNangLuc,345000);
  assert.doesNotMatch(JSON.stringify(records),/base64Data|test.pdf|PDF-test/);
  for (const record of records) await store.delete(record.id);
});

test('incomplete uploads preserve the previous revision; invalid sizes and mutable parts fail closed',async () => {
  const token = await login('tuyendung','tuyendung123');
  const draft = await uploadDraft(token,draftSnapshot());
  const staged = (await draftCall(token,'/stage','POST',{id:draft.id,version:draft.version,chunkCount:2,byteLength:100})).data;
  const path = `/${draft.id}/parts/${staged.revision}/0`;
  assert.equal((await draftCall(token,path,'PUT',{content:'partial'})).status,200);
  assert.equal((await draftCall(token,path,'PUT',{content:'partial'})).status,200);
  assert.equal((await draftCall(token,path,'PUT',{content:'tampered'})).status,409);
  assert.notEqual((await draftCall(token,`/${draft.id}/finish`,'POST',staged)).status,200);
  assert.equal((await draftCall(token,`/${draft.id}`)).data.revision,draft.revision);
  assert.equal((await draftCall(token,'/stage','POST',{chunkCount:999,byteLength:5})).status,400);
  assert.equal((await draftCall(token,'/stage','POST',{chunkCount:1,byteLength:17*1024*1024})).status,400);
  const invalidContent = JSON.stringify({...draftSnapshot(),groups:[{id:'invalid',label:'invalid',documents:[{id:'x',fileName:'script',mimeType:'text/html',base64Data:'eA=='}]}]});
  const invalid = (await draftCall(token,'/stage','POST',{chunkCount:1,byteLength:Buffer.byteLength(invalidContent)})).data;
  await draftCall(token,`/${invalid.id}/parts/${invalid.revision}/0`,'PUT',{content:invalidContent});
  assert.equal((await draftCall(token,`/${invalid.id}/finish`,'POST',invalid)).status,400);
  const list = (await draftCall(token,'')).data;
  assert.ok(list.some((item:any) => item.id === invalid.id && !item.ready));
  for (const item of list) assert.equal((await draftCall(token,`/${item.id}`,'DELETE',{version:item.version})).status,200);
  assert.equal(documents.size,0);
});

test('failed draft completion leaves personnel unchanged, successful completion cannot be submitted twice',async () => {
  const token = await login('tuyendung','tuyendung123');
  const draft = await uploadDraft(token,draftSnapshot(4));
  const body = {employees:draftSnapshot(4).employees,draftId:draft.id,draftVersion:draft.version};
  failCommit = true;
  const request = () => fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su/batch`,{method:'POST',headers:headers(token),body:JSON.stringify(body)});
  try {assert.equal((await request()).status,503);} finally {failCommit=false;}
  assert.equal((await new FirestoreRecordStore().list()).length,0);
  assert.equal((await request()).status,200);
  assert.equal((await request()).status,404);
  const store = new FirestoreRecordStore();
  assert.equal((await store.list()).length,1);
  for (const record of await store.list()) await store.delete(record.id);
});
