import dotenv from 'dotenv';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FirestoreRecordStore,StorageError,encodeFields} from '../backend/recordStore.js';
import {planHrmAccounts} from '../backend/hrmAccountMigration.js';
import {verifyPassword} from '../backend/accountStore.js';
dotenv.config({quiet:true});
const sourcePath=process.argv[process.argv.indexOf('--source')+1];
if(!process.argv.includes('--source')||!sourcePath)throw Error('Specify --source PATH [--apply]');
if(process.env.FIREBASE_PROJECT_ID!=='hrscan')throw Error('Expected destination hrscan.');
const raw=await readFile(sourcePath,'utf8'),source=JSON.parse(raw),accounts=planHrmAccounts(source);
const store=new FirestoreRecordStore('hrm_accounts',v=>v),directory=new FirestoreRecordStore('hrm_directory',v=>v),configuration=new FirestoreRecordStore('hrm_auth',v=>v);
const existing=await store.list();
if(existing.length)throw Error('Accounts already exist. Refusing to replace passwords or roles.');
let config:any;try{config=await configuration.get('config');}catch(e){if(!(e instanceof StorageError&&e.status===404))throw e;}
if(config?.record.enabled)throw Error('Account cutover already enabled.');
const profiles=await Promise.all(accounts.map(a=>directory.get(a.id)));
for(let i=0;i<profiles.length;i++)if(profiles[i].record.legacyId!==accounts[i].employeeCode)throw Error('Historical profile does not match employee code.');
await mkdir('build/hrm-account-migration',{recursive:true});
await writeFile(`build/hrm-account-migration/before-${Date.now()}.json`,JSON.stringify({accounts:existing,profiles,config},null,2));
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',accounts:accounts.length,administrators:accounts.filter(a=>a.role==='admin').length,employees:accounts.filter(a=>a.role==='employee').length,missingContactEmail:accounts.filter(a=>!a.contactEmail).length,profileMatches:profiles.length}));
class Writer extends FirestoreRecordStore{async apply(){
  const writes:any[]=accounts.map(a=>({update:{name:`${this.root()}/hrm_accounts/${a.id}`,fields:encodeFields(a)},currentDocument:{exists:false}}));
  profiles.forEach((profile,i)=>writes.push({update:{name:`${this.root()}/hrm_directory/${accounts[i].id}`,fields:encodeFields({...profile.record,accountId:accounts[i].id})},currentDocument:{updateTime:profile.version}}));
  writes.push({update:{name:`${this.root()}/hrm_auth/config`,fields:encodeFields({id:'config',enabled:true,source:'HRM-Mini',sourceHash:createHash('sha256').update(raw).digest('hex'),cutoverAt:new Date().toISOString()})},currentDocument:config?{updateTime:config.version}:{exists:false}});
  await this.request(`${this.root()}:commit`,'POST',{writes});
}}
if(process.argv.includes('--apply')){
  await new Writer().apply();
  const restored=await store.list();
  if(restored.length!==accounts.length)throw Error('Account count mismatch after cutover.');
  for(const account of restored){const old=source.employees.find((e:any)=>String(e.id).toLowerCase()===account.username);if(!old||!verifyPassword(account as any,old.password)||account.password)throw Error('Credential verification failed.');}
  const report={accounts:restored.length,passwordHashesVerified:true,plaintextPasswordsStored:false,oldSeedAccountsDisabled:true,completedAt:new Date().toISOString()};
  await writeFile('build/hrm-account-migration/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
