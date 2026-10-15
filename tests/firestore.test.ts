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
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-token');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.endsWith(':commit')) {
      commits++;
      if (failCommit) return json({error:{status:'UNAVAILABLE'}},503);
      for (const write of body.writes) {
        const existing = documents.get(write.update?.name);
        if (write.currentDocument?.exists === false && existing) return json({error:{status:'ALREADY_EXISTS'}},409);
        if (write.currentDocument?.updateTime && write.currentDocument.updateTime !== existing?.updateTime) return json({error:{status:'FAILED_PRECONDITION'}},409);
      }
      for (const write of body.writes) {
        if (write.delete) documents.delete(write.delete);
        else documents.set(write.update.name,{...write.update,updateTime:`2026-10-15T01:00:${String(commits).padStart(2,'0')}Z`});
      }
      return json({writeResults:body.writes.map(() => ({}))});
    }
    if (url.endsWith(':runQuery')) {
      const email = body.structuredQuery.where?.fieldFilter.value.stringValue;
      return json([...documents.values()].filter(doc => !email || doc.fields.userEmail.stringValue === email).map(document => ({document})));
    }
    const name = url.split('/v1/')[1];
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

test('Step 4 save survives independent store instances and another device login, excluding uploads',async () => {
  const token = await login('tuyendung','tuyendung123');
  const response = await fetch(`${urls[0]}/api/sheets/danh-sach-nhan-su`,{method:'POST',headers:headers(token),body:JSON.stringify({hoVaTen:'TEST FIRESTORE',soCCCD:'000000000001',ngayVaoLam:'2026-10-15',emailCaNhan:'test@example.com',luongCoBan:6000000,phuCapCoDinh:0,images:[{base64Data:'PRIVATE_IMAGE'}],pdf:'PRIVATE_PDF',thongTinGiaDinh:[{hoTen:'TEST FAMILY',quanHe:'Anh',image:'PRIVATE_IMAGE'}]})});
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
