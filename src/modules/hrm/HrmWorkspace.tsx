import React, { useEffect, useRef, useState } from 'react';
import { Save, X } from 'lucide-react';
import type { UserProfile } from '../../types';
import type { AppSettings, Employee, EmployeeMealData, MealSession, Task } from './types';
import TaskModule from './TaskModule';
import MealModule,{MealDayDialog,defaultMealSession} from './MealModule';
import { safeFetchJson } from '../../utils/apiHelper';
import { getCurrentCycle, getTodayDateString } from './utils/cycleHelper';

type Meal = {id:string;employeeId:string;date:string;sessions:MealSession[];mealsCount:number};
type Versioned<T> = {record:T;version:string};
type LegacyProfile={id:string;name:string;email:string;accountId:string};
async function api<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const result=await safeFetchJson<{success:boolean;data:T;error?:string}>('/api/hrm'+path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  if(!result.ok || !result.data?.success) throw new Error(result.error || 'Không thể đồng bộ dữ liệu.');
  return result.data.data;
}
const inputClass='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const buttonClass='inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const statuses={pending:'Chưa thực hiện','in-progress':'Đang thực hiện',completed:'Hoàn thành'};
const priorities={urgent:'Khẩn cấp',high:'Cao',medium:'Trung bình',low:'Thấp'};
const newSession=()=>defaultMealSession('Bữa Trưa');
const emptyTask=(id:string):Task=>({id:'',employeeId:id,title:'',description:'',dueDate:getTodayDateString(),status:'pending',assignedBy:'',priority:'medium',progress:0,resultNote:'',createdAt:'',updatedAt:''});

export default function HrmWorkspace({currentUser,module}:{currentUser:UserProfile;module:'meals'|'tasks'}) {
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [settings,setSettings]=useState<AppSettings|null>(null);
  const [cycle,setCycle]=useState(()=>getCurrentCycle(new Date(getTodayDateString()+'T12:00:00')));
  const [meals,setMeals]=useState<Meal[]>([]),[tasks,setTasks]=useState<Task[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const [revision,setRevision]=useState(0);
  const [employeeId,setEmployeeId]=useState(currentUser.id || '');
  const [mealEditor,setMealEditor]=useState<{date:string;employeeId:string;version:string;sessions:MealSession[]}|null>(null);
  const [taskEditor,setTaskEditor]=useState<{task:Task;version:string}|null>(null);
  const [settingsEditor,setSettingsEditor]=useState<Versioned<AppSettings>|null>(null);
  const [directory,setDirectory]=useState<{profiles:LegacyProfile[];accounts:{id:string;name:string;email:string}[]}|null>(null);
  const [profileEditor,setProfileEditor]=useState<Versioned<LegacyProfile>|null>(null);
  const isAdmin=currentUser.role==='admin';
  const generation=useRef(0);
  useEffect(()=>{
    const run=++generation.current;setLoading(true);setReady(false);setError('');
    Promise.all([api<{employees:Employee[];settings:AppSettings}>('/bootstrap'),api<Meal[]>(`/meals?start=${cycle.startDate}&end=${cycle.endDate}`),api<Task[]>('/tasks')]).then(([bootstrap,rows,work])=>{
      if(run!==generation.current)return;
      setEmployees(bootstrap.employees);setSettings(bootstrap.settings);setMeals(rows);setTasks(work);setReady(true);
      setEmployeeId(previous=>bootstrap.employees.some(e=>e.id===previous)?previous:bootstrap.employees[0]?.id || '');
    }).catch(e=>{if(run===generation.current)setError(e.message);}).finally(()=>{if(run===generation.current)setLoading(false);});
    return ()=>{generation.current++;};
  },[cycle.startDate,cycle.endDate,revision]);
  async function action(fn:()=>Promise<void>) {
    if(busy)return;setBusy(true);setError('');setMessage('');
    try {await fn();} catch(e){setError((e as Error).message);} finally{setBusy(false);}
  }
  const refresh=()=>setRevision(n=>n+1);
  const mealData:Record<string,EmployeeMealData>={};
  for(const meal of meals){mealData[meal.employeeId]??={employeeId:meal.employeeId,records:{}};mealData[meal.employeeId].records[meal.date]=meal;}
  const openMeal=(date:string,targetId=employeeId)=>action(async()=>{
    const previous=meals.find(m=>m.employeeId===targetId&&m.date===date);
    const loaded=previous?await api<Versioned<Meal>>('/meals/'+previous.id):null;
    setMealEditor({date,employeeId:targetId,version:loaded?.version || '',sessions:loaded?.record.sessions || [newSession()]});
  });
  const openTask=(task:Task)=>action(async()=>{const item=await api<Versioned<Task>>('/tasks/'+task.id);setTaskEditor({task:item.record,version:item.version});});
  const exportMeals=(targetId=employeeId)=>action(async()=>{
    const {exportSmartMealAllowanceToExcel}=await import('./utils/excelExport');
    await exportSmartMealAllowanceToExcel({id:currentUser.id!,name:currentUser.name,role:isAdmin?'admin':'nhan_vien_nhan_su',department:'HR Group'},employees,mealData,cycle,settings!,targetId);
  });

  return <section className="space-y-5" aria-label={module==='meals'?'Khai báo tiền ăn bên ngoài':'Quản lý công việc nhân sự'}>
    {error&&<div role="alert" className="border border-rose-200 rounded-xl bg-rose-50 text-rose-800 p-4">{error}<button type="button" disabled={busy||loading} className="ml-4 underline" onClick={refresh}>Thử tải lại</button></div>}
    {message&&<p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl">{message}</p>}
    {loading&&<p role="status">Đang tải dữ liệu cloud…</p>}
    {isAdmin&&module==='tasks'&&<div className="space-y-3"><button type="button" disabled={busy} onClick={()=>action(async()=>setDirectory(directory?null:await api('/directory')))} className="text-sm text-indigo-700 underline">{directory?'Đóng liên kết tài khoản':'Nhân viên HRM-Mini & liên kết tài khoản'}</button>{directory&&<div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3"><p className="text-sm text-slate-600">Tài khoản HRM-Mini dùng mã nhân viên để đăng nhập. Chỉ liên kết thêm khi đã đối chiếu đúng người sở hữu hồ sơ.</p>{directory.profiles.length?directory.profiles.map(profile=><div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2"><div><p className="font-medium text-sm">{profile.name}</p><p className="text-xs text-slate-500">{profile.email} · {directory.accounts.find(a=>a.id===profile.accountId)?.name||'Chưa liên kết tài khoản'}</p></div><button type="button" disabled={busy} className="text-sm text-indigo-700 underline" onClick={()=>action(async()=>setProfileEditor(await api('/directory/'+profile.id)))}>Liên kết</button></div>):<p className="text-sm">Chưa có nhân viên được chuyển từ HRM-Mini.</p>}</div>}</div>}
    {!loading&&ready&&settings&&<>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
      {module==='meals'?<MealModule employees={employees} mealData={mealData} cycle={cycle} settings={settings} currentUser={{id:currentUser.id!,name:currentUser.name,employeeCode:currentUser.employeeCode,department:currentUser.department||'HR Group',role:currentUser.hrmRole||(isAdmin?'admin':'nhan_vien_nhan_su')}} selectedEmployeeId={employeeId} onSelectEmployee={setEmployeeId} onCycleChange={setCycle} busy={busy} onOpenDay={openMeal} onExport={exportMeals} onExportAll={()=>action(async()=>{const {exportDepartmentMealAllowanceToExcel}=await import('./utils/excelExport');await exportDepartmentMealAllowanceToExcel(employees,mealData,cycle,settings);})} onSettings={()=>action(async()=>setSettingsEditor(await api<Versioned<AppSettings>>('/settings')))}/>:<TaskModule employees={employees} tasks={tasks} ownEmployeeId={currentUser.id || employeeId} isAdmin={isAdmin} onCreate={(targetId=employeeId,date=getTodayDateString())=>setTaskEditor({task:{...emptyTask(targetId),dueDate:date},version:''})} onOpen={openTask}/>}
      </fieldset>
    </>}

    {mealEditor&&settings&&<MealDayDialog key={mealEditor.employeeId+mealEditor.date} date={mealEditor.date} sessions={mealEditor.sessions} mealPrice={settings.mealPrice} busy={busy} error={error} onClose={()=>setMealEditor(null)} onSave={sessions=>action(async()=>{
      await api(`/meals/${encodeURIComponent(mealEditor.employeeId)}/${mealEditor.date}`,'PUT',{sessions,version:mealEditor.version});setMealEditor(null);setMessage('Đã lưu tiền ăn lên cloud.');refresh();
    })}/>}

    {taskEditor&&<Editor title={taskEditor.task.id?'Chi tiết công việc':'Giao công việc mới'} busy={busy} error={error} onClose={()=>setTaskEditor(null)} onSubmit={()=>action(async()=>{
      const t=taskEditor.task;await api(t.id?'/tasks/'+t.id:'/tasks',t.id?'PUT':'POST',{...t,version:taskEditor.version});setTaskEditor(null);setMessage('Đã lưu công việc lên cloud.');refresh();
    })}>
      <label className="block text-sm">Tên công việc<input required disabled={!isAdmin} maxLength={300} className={inputClass} value={taskEditor.task.title} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,title:e.target.value}})}/></label>
      <label className="block text-sm">Người nhận<select disabled={!isAdmin} required className={inputClass} value={taskEditor.task.employeeId} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,employeeId:e.target.value}})}>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <label className="block text-sm">Mô tả<textarea disabled={!isAdmin} maxLength={5000} className={inputClass} value={taskEditor.task.description} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,description:e.target.value}})}/></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Hạn hoàn thành<input required type="date" disabled={!isAdmin} className={inputClass} value={taskEditor.task.dueDate} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,dueDate:e.target.value}})}/></label><label className="text-sm">Ưu tiên<select disabled={!isAdmin} className={inputClass} value={taskEditor.task.priority} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,priority:e.target.value as Task['priority']}})}>{Object.entries(priorities).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Trạng thái<select className={inputClass} value={taskEditor.task.status} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,status:e.target.value as Task['status'],progress:e.target.value==='completed'?100:Math.min(taskEditor.task.progress||0,99)}})}>{Object.entries(statuses).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><label className="text-sm">Tiến độ (%)<input type="number" min={0} max={taskEditor.task.status==='completed'?100:99} required disabled={taskEditor.task.status==='completed'} className={inputClass} value={taskEditor.task.progress||0} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,progress:Number(e.target.value)}})}/></label></div>
      <label className="block text-sm">Kết quả / Ghi chú<textarea maxLength={5000} className={inputClass} value={taskEditor.task.resultNote||''} onChange={e=>setTaskEditor({...taskEditor,task:{...taskEditor.task,resultNote:e.target.value}})}/></label>
      {isAdmin&&taskEditor.task.id&&<button type="button" className="text-rose-700 underline" onClick={()=>{if(window.confirm('Xóa công việc này?'))void action(async()=>{await api('/tasks/'+taskEditor.task.id,'DELETE',{version:taskEditor.version});setTaskEditor(null);setMessage('Đã xóa công việc.');refresh();});}}>Xóa công việc</button>}
    </Editor>}

    {profileEditor&&directory&&<Editor title={`Liên kết tài khoản · ${profileEditor.record.name}`} busy={busy} error={error} onClose={()=>setProfileEditor(null)} onSubmit={()=>action(async()=>{await api('/directory/'+profileEditor.record.id,'PUT',{accountId:profileEditor.record.accountId,version:profileEditor.version});setProfileEditor(null);setDirectory(await api('/directory'));setMessage('Đã lưu liên kết tài khoản.');refresh();})}><p className="text-sm text-slate-600">Tài khoản được chọn có thể xem và cập nhật dữ liệu tiền ăn, công việc của nhân viên này.</p><label className="block text-sm">Tài khoản đăng nhập<select className={inputClass} value={profileEditor.record.accountId||''} onChange={e=>setProfileEditor({...profileEditor,record:{...profileEditor.record,accountId:e.target.value}})}><option value="">Chưa liên kết</option>{directory.accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}</select></label></Editor>}
    {settingsEditor&&<Editor title="Đơn giá & biểu mẫu tiền ăn" busy={busy} error={error} onClose={()=>setSettingsEditor(null)} onSubmit={()=>action(async()=>{const updated=await api<AppSettings>('/settings','PUT',{...settingsEditor.record,version:settingsEditor.version});setSettings(updated);setSettingsEditor(null);setMessage('Đã lưu cấu hình tiền ăn.');})}>
      <label className="block text-sm">Đơn giá mỗi bữa (đồng)<input required type="number" min={0} max={1000000} step={1} className={inputClass} value={settingsEditor.record.mealPrice} onChange={e=>setSettingsEditor({...settingsEditor,record:{...settingsEditor.record,mealPrice:Number(e.target.value)}})}/></label>
      {([['companyName','Tên công ty'],['departmentName','Bộ phận'],['preparerName','Người lập biểu'],['accountantName','Kế toán'],['leaderName','Trưởng bộ phận'],['directorName','Giám đốc']] as const).map(([key,label])=><label className="block text-sm" key={key}>{label}<input className={inputClass} maxLength={300} value={settingsEditor.record[key]} onChange={e=>setSettingsEditor({...settingsEditor,record:{...settingsEditor.record,[key]:e.target.value}})}/></label>)}
    </Editor>}
  </section>;
}

function Editor({title,busy,error,onClose,onSubmit,children}:{title:string;busy:boolean;error:string;onClose:()=>void;onSubmit:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();if(!busy)onClose();}} className="m-auto w-[min(94vw,640px)] max-h-[90dvh] rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/40"><form onSubmit={e=>{e.preventDefault();onSubmit();}} className="p-5 space-y-4"><div className="flex items-center justify-between gap-4"><h3 className="font-bold text-lg">{title}</h3><button disabled={busy} type="button" onClick={onClose} aria-label="Đóng"><X size={20}/></button></div>{error&&<p role="alert" className="text-rose-800 bg-rose-50 rounded-lg p-3 text-sm">{error} Nếu dữ liệu đã thay đổi trên thiết bị khác, đóng hộp thoại, tải lại rồi mở lại để chỉnh sửa.</p>}<fieldset disabled={busy} className="space-y-4 min-w-0">{children}</fieldset><div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="border px-4 py-2 rounded-lg text-sm">Đóng</button><button type="submit" disabled={busy} className={buttonClass}><Save size={16}/>{busy?'Đang lưu…':'Lưu lên cloud'}</button></div></form></dialog>;
}

