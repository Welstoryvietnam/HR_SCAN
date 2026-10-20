import { createHash } from 'node:crypto';
import { HRM_SETTINGS, normalizeSessions, normalizeTask, validDate } from './hrm.js';
import { StorageError } from './recordStore.js';

type Entry={collection:string;record:Record<string,any>};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=(kind:string,value:string)=>`legacy_${kind}_${hash(value).slice(0,24)}`;
const clean=(value:unknown,max=1000)=>String(value??'').trim().slice(0,max);
const tagged=(collection:string,record:Record<string,any>):Entry=>({collection,record:{...record,migrationSource:'HRM-Mini',migrationHash:hash(record)}});

/** A pure migration plan. Never imports passwords, login roles or executable configuration. */
export function planLegacyHrmImport(source:any,options:{preserveOrphans?:boolean}={}) {
  if(!source||!Array.isArray(source.employees)||!source.employees.length)throw new StorageError('Bản sao thiếu danh sách nhân viên.',400);
  const employees=new Map<string,string>(),entries:Entry[]=[];
  for(const employee of source.employees){
    const legacyId=clean(employee.id,150),name=clean(employee.name,300);
    if(!legacyId||!name||employees.has(legacyId))throw new StorageError('Mã nhân viên thiếu hoặc trùng.',400);
    const employeeId=id('employee',legacyId);employees.set(legacyId,employeeId);
    entries.push(tagged('hrm_directory',{id:employeeId,legacyId,name,email:clean(employee.email,300).toLowerCase(),phone:clean(employee.phone,50),department:clean(employee.department,300),accountId:''}));
  }
  const employeeId=(value:unknown)=>{
    const legacyId=clean(value,150),found=employees.get(legacyId);if(found)return found;
    if(!options.preserveOrphans||!legacyId)throw new StorageError('Bản ghi tham chiếu nhân viên không tồn tại: '+legacyId,400);
    const profileId=id('employee',legacyId);employees.set(legacyId,profileId);
    entries.push(tagged('hrm_directory',{id:profileId,legacyId,name:`Nhân viên cũ · ${legacyId} (chưa đối chiếu)`,email:'',phone:'',department:'HR Group',accountId:'',needsIdentityReview:true}));
    return profileId;
  };
  const taskIds=new Set<string>();
  for(const old of source.tasks||[]){
    const legacyId=clean(old.id,150);if(!legacyId||taskIds.has(legacyId))throw new StorageError('Mã công việc thiếu hoặc trùng.',400);taskIds.add(legacyId);
    const assignedBy=employees.get(String(old.assignedBy))||'legacy_unmapped';
    const normalized=normalizeTask({...old,employeeId:employeeId(old.employeeId),progress:old.progress??(old.status==='completed'?100:0)},{id:assignedBy,role:'admin',email:''});
    if(!Number.isFinite(Date.parse(old.createdAt))||!Number.isFinite(Date.parse(old.updatedAt)))throw new StorageError('Thời gian công việc không hợp lệ.',400);
    const task={...normalized,id:id('task',legacyId),legacyId,createdAt:old.createdAt,updatedAt:old.updatedAt};
    if(task.status==='completed')task.completedAt=old.completedAt||old.updatedAt;
    entries.push(tagged('hrm_tasks',task));
  }
  for(const [oldEmployeeId,data] of Object.entries(source.mealData||{}) as [string,any][]){
    const owner=employeeId(oldEmployeeId);
    if(data.employeeId&&String(data.employeeId)!==oldEmployeeId)throw new StorageError('Mã nhân viên trong dữ liệu tiền ăn không khớp.',400);
    for(const [date,old] of Object.entries(data.records||{}) as [string,any][]){
      validDate(date);
      if(old.date&&old.date!==date)throw new StorageError('Ngày tiền ăn không khớp.',400);
      let sessions=old.sessions;
      if(!sessions?.length&&old.mealsCount){
        if(!Number.isInteger(old.mealsCount)||old.mealsCount<0||old.mealsCount>4)throw new StorageError('Số bữa ăn cũ không hợp lệ.',400);
        throw new StorageError('Bữa ăn cũ thiếu chi tiết loại bữa hoặc thời gian. Cần đối chiếu bản gốc trước khi chuyển.',400);
      }
      const normalized=normalizeSessions(sessions||[]).map((s,index)=>({...s,id:`${date}_${index}`}));
      if(normalized.length!==Number(old.mealsCount||0))throw new StorageError('Số bữa ăn và chi tiết cũ không khớp.',400);
      const recordId=createHash('sha256').update(owner+':'+date).digest('hex');
      entries.push(tagged('hrm_meals',{id:recordId,employeeId:owner,date,sessions:normalized,mealsCount:normalized.length}));
    }
  }
  if(source.settings){
    const settings={...HRM_SETTINGS};
    if(!Number.isInteger(source.settings.mealPrice)||source.settings.mealPrice<0||source.settings.mealPrice>1000000)throw new StorageError('Đơn giá cũ không hợp lệ.',400);
    settings.mealPrice=source.settings.mealPrice;
    for(const key of ['companyName','departmentName','preparerName','accountantName','leaderName','directorName'] as const)settings[key]=clean(source.settings[key],300);
    entries.push(tagged('hrm_settings',{id:'default',...settings}));
  }
  return {entries,counts:Object.fromEntries(['hrm_directory','hrm_tasks','hrm_meals','hrm_settings'].map(collection=>[collection,entries.filter(e=>e.collection===collection).length]))};
}
