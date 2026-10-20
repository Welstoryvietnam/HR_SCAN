import { Router, type RequestHandler } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { FirestoreRecordStore, StorageError } from './recordStore.js';
import type { SessionUser } from './session.js';
import type { SystemUserAccount } from '../src/types.js';
import type { AppSettings, MealSession, Task } from '../src/modules/hrm/types/index.js';

export const HRM_SETTINGS: AppSettings = { mealPrice:40000, companyName:'Công ty TNHH Welstory Việt Nam', departmentName:'HR Group', preparerName:'', accountantName:'', leaderName:'', directorName:'' };
const text = (value: unknown, max = 2000) => {
  if (typeof value !== 'string' || value.length > max) throw new StorageError('Nội dung không hợp lệ hoặc quá dài.',400);
  return value.trim();
};
export function validDate(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T00:00:00Z')) || new Date(value+'T00:00:00Z').toISOString().slice(0,10) !== value) throw new StorageError('Ngày không hợp lệ.',400);
  return value;
}
export function normalizeSessions(value: unknown): MealSession[] {
  if (!Array.isArray(value) || value.length > 4) throw new StorageError('Mỗi ngày tối đa 4 bữa ăn.',400);
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || !['Bữa Sáng','Bữa Trưa','Bữa Tối','Bữa Đêm'].includes(item.mealType) || seen.has(item.mealType)) throw new StorageError('Loại bữa ăn không hợp lệ hoặc bị trùng.',400);
    seen.add(item.mealType);
    if (![item.startTime,item.endTime].every(v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v))) throw new StorageError('Giờ bắt đầu/kết thúc không hợp lệ.',400);
    const location = text(item.location,300), purpose = text(item.purpose,1000);
    if (!location || !purpose) throw new StorageError('Vui lòng nhập địa điểm và mục đích công tác.',400);
    return {id:randomUUID(),mealType:item.mealType,startTime:item.startTime,endTime:item.endTime,location,purpose,mealsCount:1};
  });
}
export function normalizeTask(input: any, user: SessionUser, previous?: Task): Task {
  if (!input || typeof input !== 'object') throw new StorageError('Công việc không hợp lệ.',400);
  if (previous && user.role !== 'admin' && previous.employeeId !== user.id) throw new StorageError('Bạn không có quyền cập nhật công việc này.',403);
  if (!previous && user.role !== 'admin') throw new StorageError('Chỉ quản trị viên được giao công việc.',403);
  if (!['pending','in-progress','completed'].includes(input.status) || !Number.isInteger(input.progress) || input.progress < 0 || input.progress > 100) throw new StorageError('Trạng thái hoặc tiến độ không hợp lệ.',400);
  const now = new Date().toISOString();
  const base = user.role === 'admin' ? { employeeId:text(input.employeeId,150),title:text(input.title,300),description:text(input.description || '',5000),dueDate:validDate(input.dueDate),priority:input.priority || 'medium' } : previous!;
  if (!base.title || !['urgent','high','medium','low'].includes(base.priority || 'medium')) throw new StorageError('Vui lòng nhập tên công việc và mức ưu tiên hợp lệ.',400);
  return {id:previous?.id || randomUUID(),employeeId:base.employeeId,title:base.title,description:base.description,dueDate:base.dueDate,priority:base.priority as Task['priority'],assignedBy:previous?.assignedBy || user.id,status:input.status,progress:input.status === 'completed' ? 100 : Math.min(input.progress,99),resultNote:text(input.resultNote || '',5000),createdAt:previous?.createdAt || now,updatedAt:now,...(input.status === 'completed' ? {completedAt:previous?.completedAt || now} : {})};
}
export function createHrmRouter(accounts: () => SystemUserAccount[]) {
  const router = Router();
  const meals = new FirestoreRecordStore('hrm_meals',v=>v);
  const tasks = new FirestoreRecordStore('hrm_tasks',v=>v);
  const settings = new FirestoreRecordStore('hrm_settings',v=>v);
  const directory = new FirestoreRecordStore('hrm_directory',v=>v);
  const route = (fn: (req: any,user: SessionUser) => Promise<any>): RequestHandler => async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    try { res.json({success:true,data:await fn(req,res.locals.personnelUser)}); }
    catch (error) {res.status(error instanceof StorageError ? error.status : 500).json({success:false,error:error instanceof StorageError ? error.message : 'Không thể lưu dữ liệu HRM. Vui lòng thử lại.'});}
  };
  const own = async (user: SessionUser,id: string) => {
    if(user.role==='admin'||id===user.id)return;
    try {if((await directory.get(id)).record.accountId===user.id)return;}catch(e){if(!(e instanceof StorageError&&e.status===404))throw e;}
    throw new StorageError('Bạn chỉ có quyền truy cập dữ liệu của mình.',403);
  };
  const active = async (id: string) => {
    const account=accounts().find(a=>a.id===id && a.status==='active');
    if(account)return account;
    try {const profile=(await directory.get(id)).record;return {id:profile.id,email:String(profile.email||'')};} catch(e){if(!(e instanceof StorageError&&e.status===404))throw e;}
    throw new StorageError('Không tìm thấy nhân viên hoặc tài khoản không còn hoạt động.',400);
  };
  const scopedList=async(store:FirestoreRecordStore,user:SessionUser)=>{
    if(user.role==='admin')return store.list();
    const ids=[...new Set([user.id,...(await directory.listMatching('accountId',user.id)).map(p=>p.id)])];
    return (await Promise.all(ids.map(id=>store.listMatching('employeeId',id)))).flat();
  };
  const getSettings = async () => {try {return (await settings.get('default')).record as AppSettings;} catch(e) {if (e instanceof StorageError && e.status===404) return HRM_SETTINGS; throw e;}};
  router.get('/bootstrap',route(async (_req,user) => {
    const [legacy,config]=await Promise.all([user.role==='admin'?directory.list():directory.listMatching('accountId',user.id),getSettings()]);
    const employees=accounts().filter(a=>a.status==='active'&&(user.role==='admin'||a.id===user.id)).map(a=>({id:a.id,name:a.fullName,email:(a as any).contactEmail??a.email,employeeCode:(a as any).employeeCode||a.username,department:(a as any).department||'HR Group',notes:(a as any).notes,phone:(a as any).phone,avatarColor:(a as any).avatarColor,role:(a as any).hrmRole||(a.role==='admin'?'admin':'nhan_vien_nhan_su')}));
    const primaryIds=new Set(employees.map(a=>a.id));
    return {employees:[...employees,...legacy.filter(p=>!primaryIds.has(p.id)).map(p=>({id:p.id,name:p.name,email:p.email,employeeCode:p.legacyId,department:p.department||'HR Group',role:'nhan_vien_nhan_su',legacy:true,accountId:p.accountId||''}))],settings:config};
  }));
  router.get('/directory',route(async(_req,user)=>{
    if(user.role!=='admin')throw new StorageError('Chỉ quản trị viên được liên kết tài khoản.',403);
    return {profiles:await directory.list(),accounts:accounts().filter(a=>a.status==='active').map(a=>({id:a.id,name:a.fullName,email:a.email}))};
  }));
  router.put('/directory/:id',route(async(req,user)=>{
    if(user.role!=='admin')throw new StorageError('Chỉ quản trị viên được liên kết tài khoản.',403);
    const id=String(req.params.id),previous=await directory.get(id),accountId=text(req.body.accountId,150);
    if(accountId&&!accounts().some(a=>a.id===accountId&&a.status==='active'))throw new StorageError('Tài khoản không còn hoạt động.',400);
    if(accountId&&(await directory.listMatching('accountId',accountId)).some(p=>p.id!==id))throw new StorageError('Tài khoản đã liên kết với một nhân viên HRM-Mini khác.',409);
    await directory.update(id,{...previous.record,accountId},text(req.body.version,100));return {id,accountId};
  }));
  router.get('/directory/:id',route(async(req,user)=>{
    if(user.role!=='admin')throw new StorageError('Chỉ quản trị viên được liên kết tài khoản.',403);
    return directory.get(String(req.params.id));
  }));
  router.get('/meals',route(async (req,user) => {
    const start=validDate(req.query.start),end=validDate(req.query.end);
    if(end<start || (Date.parse(end)-Date.parse(start))/86400000>62) throw new StorageError('Chỉ tải tối đa 62 ngày mỗi lần.',400);
    return (await scopedList(meals,user)).filter(r=>r.date>=start && r.date<=end);
  }));
  router.put('/meals/:employeeId/:date',route(async (req,user) => {
    const employeeId=String(req.params.employeeId);await own(user,employeeId);const employee=await active(employeeId);
    const date=validDate(req.params.date);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(date>today) throw new StorageError('Không khai báo bữa ăn cho ngày tương lai.',400);
    const sessions=normalizeSessions(req.body.sessions);
    const id=createHash('sha256').update(employeeId+':'+date).digest('hex');
    const record={id,employeeId,userEmail:employee.email.toLowerCase(),date,sessions,mealsCount:sessions.length,timestamp:new Date().toISOString()};
    // Client sends the version it actually viewed, preventing another device's changes being overwritten.
    if(req.body.version) await meals.update(id,record,text(req.body.version,100));
    else await meals.create([record]);
    return record;
  }));
  router.get('/meals/:id',route(async (req,user) => {const item=await meals.get(String(req.params.id));await own(user,item.record.employeeId);return item;}));
  router.get('/tasks',route(async (_req,user) => scopedList(tasks,user)));
  router.get('/tasks/:id',route(async (req,user) => {const item=await tasks.get(String(req.params.id));await own(user,item.record.employeeId);return item;}));
  router.post('/tasks',route(async (req,user) => {
    const task=normalizeTask(req.body,user);const employee=await active(task.employeeId);
    await tasks.create([{...task,userEmail:employee.email.toLowerCase()}]);return task;
  }));
  router.put('/tasks/:id',route(async (req,user) => {
    const previous=await tasks.get(String(req.params.id));
    await own(user,previous.record.employeeId);
    // Ownership of a linked historical profile was verified above. Keep its ID in the record.
    const validatorUser=user.role==='admin'?user:{...user,id:previous.record.employeeId};
    const task=normalizeTask(req.body,validatorUser,previous.record as Task);const employee=await active(task.employeeId);
    await tasks.update(task.id,{...task,userEmail:employee.email.toLowerCase()},text(req.body.version,100));return task;
  }));
  router.delete('/tasks/:id',route(async (req,user) => {
    if(user.role!=='admin') throw new StorageError('Chỉ quản trị viên được xóa công việc.',403);
    // Deletion also uses a version so an updated result cannot disappear unnoticed.
    const id=String(req.params.id);await tasks.get(id);
    await tasks.removeVersioned(id,text(req.body.version,100));return {id};
  }));
  router.put('/settings',route(async (req,user) => {
    if(user.role!=='admin') throw new StorageError('Chỉ quản trị viên được sửa đơn giá.',403);
    if(!Number.isInteger(req.body.mealPrice)||req.body.mealPrice<0||req.body.mealPrice>1000000) throw new StorageError('Đơn giá không hợp lệ.',400);
    const value={...HRM_SETTINGS,mealPrice:req.body.mealPrice};
    for(const key of ['companyName','departmentName','preparerName','accountantName','leaderName','directorName'] as const) value[key]=text(req.body[key]||'',300);
    let previous;try {previous=await settings.get('default');} catch(e){if(!(e instanceof StorageError && e.status===404)) throw e;}
    if(previous) await settings.update('default',value,text(req.body.version,100));else await settings.create([{...value,id:'default'}]);
    return value;
  }));
  router.get('/settings',route(async()=>{try{return await settings.get('default');}catch(e){if(e instanceof StorageError&&e.status===404)return {record:HRM_SETTINGS,version:''};throw e;}}));
  return router;
}
