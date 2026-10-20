import dotenv from 'dotenv';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {FirestoreRecordStore,StorageError,encodeFields} from '../backend/recordStore.js';
import {planLegacyHrmImport} from '../backend/legacyHrmMigration.js';

dotenv.config({quiet:true});
const sourceIndex=process.argv.indexOf('--source'),sourcePath=sourceIndex>=0?process.argv[sourceIndex+1]:'';
if(!sourcePath)throw Error('Usage: node --import tsx scripts/migrate-hrm.ts --source PATH [--apply]');
if(process.env.FIREBASE_PROJECT_ID!=='hrscan')throw Error('Expected destination Firebase project hrscan.');
const raw=await readFile(sourcePath,'utf8'),source=JSON.parse(raw);
const plan=planLegacyHrmImport(source,{preserveOrphans:process.argv.includes('--preserve-orphans')});
const runHash=createHash('sha256').update(raw).digest('hex');
const folder=path.resolve('build/hrm-migration');await mkdir(folder,{recursive:true});
const pending:typeof plan.entries=[],existing:unknown[]=[],skipped:string[]=[],conflicts:string[]=[];
const stores=new Map<string,FirestoreRecordStore>();
const storeFor=(collection:string)=>{if(!stores.has(collection))stores.set(collection,new FirestoreRecordStore(collection,v=>v));return stores.get(collection)!;};
for(const entry of plan.entries){
  const store=storeFor(entry.collection);
  try {
    const previous=await store.get(entry.record.id);existing.push({collection:entry.collection,...previous});
    if(previous.record.migrationHash===entry.record.migrationHash || entry.collection==='hrm_settings')skipped.push(entry.collection+'/'+entry.record.id);
    else conflicts.push(entry.collection+'/'+entry.record.id);
  }catch(e){if(e instanceof StorageError&&e.status===404)pending.push(entry);else throw e;}
}
const backupPath=path.join(folder,`destination-before-${runHash.slice(0,12)}-${Date.now()}.json`);
await writeFile(backupPath,JSON.stringify(existing,null,2));
console.log(JSON.stringify({destination:'hrscan/(default)',mode:process.argv.includes('--apply')?'apply':'dry-run',counts:plan.counts,pending:pending.length,skipped:skipped.length,conflicts:conflicts.length}));
if(conflicts.length)throw Error('Migration conflicts detected; no writes performed.');
class MigrationWriter extends FirestoreRecordStore {
  async commit(){
    if(pending.length>399)throw Error('Plan exceeds one atomic batch; split source before importing.');
    const marker={id:runHash,source:'HRM-Mini',sourceHash:runHash,counts:plan.counts,completedAt:new Date().toISOString()};
    const writes=pending.map(entry=>({update:{name:`${this.root()}/${entry.collection}/${entry.record.id}`,fields:encodeFields(entry.record)},currentDocument:{exists:false}}));
    writes.push({update:{name:`${this.root()}/hrm_migrations/${runHash}`,fields:encodeFields(marker)},currentDocument:{exists:false}});
    await this.request(`${this.root()}:commit`,'POST',{writes});
  }
}
if(process.argv.includes('--apply')&&pending.length){await new MigrationWriter().commit();}
if(process.argv.includes('--apply')){
  for(const entry of pending){const actual=(await storeFor(entry.collection).get(entry.record.id)).record;if(actual.migrationHash!==entry.record.migrationHash)throw Error('Verification failed.');}
  const report={sourceHash:runHash,destination:'hrscan/(default)',counts:plan.counts,created:pending.length,skipped:skipped.length,verified:true,completedAt:new Date().toISOString()};
  await writeFile(path.join(folder,`report-${runHash.slice(0,12)}-${Date.now()}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
