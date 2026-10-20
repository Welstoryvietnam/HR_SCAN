import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, Download, Plus, RefreshCw, Save, Utensils, X } from 'lucide-react';
import type { UserProfile } from '../../types';
import type { AppSettings, Employee, EmployeeMealData, MealSession, MealType, Task } from './types';
import { safeFetchJson } from '../../utils/apiHelper';
import { getCurrentCycle, getCycleConfig, getCycleDays, getTodayDateString, formatVND } from './utils/cycleHelper';

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
const mealTypes:MealType[]=['Bữa Sáng','Bữa Trưa','Bữa Tối','Bữa Đêm'];
const newSession=():MealSession=>({id:crypto.randomUUID(),mealType:'Bữa Trưa',startTime:'08:00',endTime:'17:00',location:'',purpose:'',mealsCount:1});
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
  const [statusFilter,setStatusFilter]=useState('all'),[assigneeFilter,setAssigneeFilter]=useState('all'),[query,setQuery]=useState('');
  const [taskView,setTaskView]=useState<'list'|'board'>('board');
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
  const selectedMeals=meals.filter(m=>m.employeeId===employeeId);
  const total=selectedMeals.reduce((sum,m)=>sum+m.mealsCount,0);
  const name=(id:string)=>employees.find(e=>e.id===id)?.name || id;
  const visibleTasks=tasks.filter(t=>(statusFilter==='all'||t.status===statusFilter)&&(assigneeFilter==='all'||t.employeeId===assigneeFilter)&&`${t.title} ${t.description} ${name(t.employeeId)}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const openMeal=(date:string)=>action(async()=>{
    const previous=meals.find(m=>m.employeeId===employeeId&&m.date===date);
    const loaded=previous?await api<Versioned<Meal>>('/meals/'+previous.id):null;
    setMealEditor({date,employeeId,version:loaded?.version || '',sessions:loaded?.record.sessions || [newSession()]});
  });
  const openTask=(task:Task)=>action(async()=>{const item=await api<Versioned<Task>>('/tasks/'+task.id);setTaskEditor({task:item.record,version:item.version});});
  const exportMeals=()=>action(async()=>{
    const {exportSmartMealAllowanceToExcel}=await import('./utils/excelExport');
    await exportSmartMealAllowanceToExcel({id:currentUser.id!,name:currentUser.name,role:isAdmin?'admin':'nhan_vien_nhan_su',department:'HR Group'},employees,mealData,cycle,settings!,employeeId);
  });

  return <section className="space-y-5" aria-label={module==='meals'?'Khai báo tiền ăn bên ngoài':'Quản lý công việc nhân sự'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold flex items-center gap-2">{module==='meals'?<Utensils className="text-amber-600"/>:<CheckSquare className="text-indigo-600"/>}{module==='meals'?'Khai báo tiền ăn bên ngoài':'Quản lý công việc nhân sự'}</h2><p className="mt-1 text-sm text-slate-500">{module==='meals'?'Theo dõi bữa ăn khi đi tuyển dụng và công tác.':'Giao việc, theo dõi hạn hoàn thành và cập nhật kết quả.'}</p></div>
      <button type="button" disabled={busy||loading} onClick={refresh} className="flex gap-2 items-center text-sm border rounded-lg bg-white px-3 py-2"><RefreshCw size={16}/>Tải lại</button>
    </div>
    {error&&<div role="alert" className="border border-rose-200 rounded-xl bg-rose-50 text-rose-800 p-4">{error}<button type="button" disabled={busy||loading} className="ml-4 underline" onClick={refresh}>Thử tải lại</button></div>}
    {message&&<p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl">{message}</p>}
    {loading&&<p role="status">Đang tải dữ liệu cloud…</p>}
    {isAdmin&&<div className="space-y-3"><button type="button" disabled={busy} onClick={()=>action(async()=>setDirectory(directory?null:await api('/directory')))} className="text-sm text-indigo-700 underline">{directory?'Đóng liên kết tài khoản':'Nhân viên HRM-Mini & liên kết tài khoản'}</button>{directory&&<div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3"><p className="text-sm text-slate-600">Nhân viên chuyển từ HRM-Mini chỉ truy cập được hồ sơ cũ sau khi quản trị viên liên kết với đúng tài khoản đăng nhập. Mật khẩu từ ứng dụng cũ không được chuyển.</p>{directory.profiles.length?directory.profiles.map(profile=><div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2"><div><p className="font-medium text-sm">{profile.name}</p><p className="text-xs text-slate-500">{profile.email} · {directory.accounts.find(a=>a.id===profile.accountId)?.name||'Chưa liên kết tài khoản'}</p></div><button type="button" disabled={busy} className="text-sm text-indigo-700 underline" onClick={()=>action(async()=>setProfileEditor(await api('/directory/'+profile.id)))}>Liên kết</button></div>):<p className="text-sm">Chưa có nhân viên được chuyển từ HRM-Mini.</p>}</div>}</div>}
    {!loading&&ready&&settings&&<>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
      {module==='meals'?<>
        <div className="flex flex-wrap gap-4 items-end bg-white border border-slate-200 rounded-2xl p-4">
          <label className="text-sm font-medium">Kỳ tính tiền ăn<input aria-label="Kỳ tính tiền ăn" type="month" className={inputClass+' mt-1'} value={`${cycle.year}-${String(cycle.month).padStart(2,'0')}`} onChange={e=>{if(e.target.value){const[y,m]=e.target.value.split('-').map(Number);setCycle(getCycleConfig(y,m));}}}/></label>
          <label className="text-sm font-medium grow max-w-sm">Nhân viên<select className={inputClass+' mt-1'} value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <button type="button" className={buttonClass} onClick={exportMeals} disabled={!employeeId}><Download size={16}/>Xuất Excel cá nhân</button>
          {isAdmin&&<><button type="button" className="text-sm border rounded-lg px-3 py-2" onClick={()=>action(async()=>{const {exportDepartmentMealAllowanceToExcel}=await import('./utils/excelExport');await exportDepartmentMealAllowanceToExcel(employees,mealData,cycle,settings);})}>Excel tổng hợp</button><button type="button" className="text-sm underline" onClick={()=>action(async()=>setSettingsEditor(await api<Versioned<AppSettings>>('/settings')))}>Đơn giá & biểu mẫu</button></>}
          <p className="w-full text-sm text-slate-500">{cycle.label}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[['Tổng số bữa',total],['Đơn giá / bữa',formatVND(settings.mealPrice)],['Tiền ăn trong kỳ',formatVND(total*settings.mealPrice)]].map(([label,value])=><div key={label} className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}</div>
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>{['Ngày','Bữa ăn','Địa điểm / Mục đích','Thành tiền','Thao tác'].map(h=><th className="p-3" scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{getCycleDays(cycle).map(day=>{
          const row=selectedMeals.find(m=>m.date===day.dateStr);
          return <tr key={day.dateStr} className={`border-t ${day.isWeekend?'bg-slate-50/70':''}`}><td className="p-3 whitespace-nowrap">{day.dayOfWeekLabel}, {day.dayNum}/{day.monthNum}{day.isToday&&<span className="ml-2 text-indigo-700">Hôm nay</span>}</td><td className="p-3">{row?.sessions.map(s=>s.mealType).join(', ')||'—'}</td><td className="p-3 min-w-48">{row?.sessions.map(s=><p key={s.id}>{s.location} · {s.purpose} <span className="text-slate-500">({s.startTime}–{s.endTime})</span></p>)}</td><td className="p-3 whitespace-nowrap">{formatVND((row?.mealsCount||0)*settings.mealPrice)}</td><td className="p-3"><button type="button" disabled={day.isFuture||!employeeId} onClick={()=>openMeal(day.dateStr)} className="text-indigo-700 underline disabled:text-slate-400 disabled:no-underline">{day.isFuture?'Chưa đến ngày':row?.mealsCount?'Chỉnh sửa':'Khai báo'}</button></td></tr>;
        })}</tbody></table></div>
        {isAdmin&&<div className="bg-white rounded-2xl border overflow-x-auto"><h3 className="font-semibold p-4">Tổng hợp nhân viên trong kỳ</h3><table className="w-full text-sm text-left"><thead><tr>{['Nhân viên','Số bữa','Tổng tiền'].map(h=><th key={h} className="px-4 pb-3" scope="col">{h}</th>)}</tr></thead><tbody>{employees.map(e=>{const count=meals.filter(m=>m.employeeId===e.id).reduce((sum,m)=>sum+m.mealsCount,0);return <tr className="border-t" key={e.id}><td className="p-4">{e.name}</td><td>{count}</td><td>{formatVND(count*settings.mealPrice)}</td></tr>;})}</tbody></table></div>}
      </>:<>
        <div className="flex flex-wrap gap-3 bg-white border rounded-2xl p-4">
          <label className="grow min-w-48 text-sm">Tìm công việc<input className={inputClass+' mt-1'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên công việc, người nhận…"/></label>
          <label className="text-sm">Trạng thái<select className={inputClass+' mt-1'} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Tất cả</option>{Object.entries(statuses).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
          {isAdmin&&<label className="text-sm">Người nhận<select className={inputClass+' mt-1'} value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}><option value="all">Tất cả nhân viên</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}
          <div className="flex items-end gap-2"><button type="button" className="border px-3 py-2 rounded-lg text-sm" onClick={()=>setTaskView(v=>v==='board'?'list':'board')}>{taskView==='board'?'Dạng danh sách':'Dạng bảng tiến độ'}</button>{isAdmin&&<button type="button" className={buttonClass} onClick={()=>setTaskEditor({task:emptyTask(employeeId),version:''})}><Plus size={16}/>Giao công việc</button>}</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Object.entries(statuses),['overdue','Quá hạn']].map(([status,label])=><div key={status} className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{tasks.filter(t=>status==='overdue'?t.status!=='completed'&&t.dueDate<getTodayDateString():t.status===status).length}</p></div>)}</div>
        {!visibleTasks.length?<div className="bg-white border rounded-2xl p-12 text-center text-slate-500">Chưa có công việc phù hợp.</div>:taskView==='board'?<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{Object.entries(statuses).map(([status,label])=><div key={status} className="rounded-2xl bg-slate-100 p-3 space-y-3"><h3 className="font-semibold px-1">{label} <span className="text-slate-500">({visibleTasks.filter(t=>t.status===status).length})</span></h3>{visibleTasks.filter(t=>t.status===status).map(task=><button type="button" key={task.id} onClick={()=>openTask(task)} className="block w-full rounded-xl border bg-white p-4 text-left shadow-sm hover:border-indigo-400"><span className="text-xs text-indigo-700">{priorities[task.priority || 'medium']}</span><h4 className="font-semibold mt-1">{task.title}</h4><p className="text-sm text-slate-500 mt-2">{name(task.employeeId)}</p><p className={`text-xs mt-2 ${task.dueDate<getTodayDateString()&&task.status!=='completed'?'text-rose-600':'text-slate-500'}`}>Hạn: {task.dueDate.split('-').reverse().join('/')}</p><progress aria-label={`Tiến độ ${task.title}`} className="w-full mt-3 accent-indigo-600" max={100} value={task.progress||0}/><p className="text-xs text-slate-500">{task.progress||0}% hoàn thành</p></button>)}</div>)}</div>:<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>{['Công việc','Người nhận','Hạn hoàn thành','Trạng thái','Tiến độ',''].map((h,i)=><th key={i} scope="col" className="p-3">{h}</th>)}</tr></thead><tbody>{visibleTasks.map(t=><tr className="border-t" key={t.id}><td className="p-3">{t.title}</td><td className="p-3">{name(t.employeeId)}</td><td className="p-3">{t.dueDate}</td><td className="p-3">{statuses[t.status]}</td><td className="p-3">{t.progress||0}%</td><td className="p-3"><button type="button" className="text-indigo-700 underline" onClick={()=>openTask(t)}>Chi tiết</button></td></tr>)}</tbody></table></div>}
      </>}
      </fieldset>
    </>}

    {mealEditor&&<Editor title={`Khai báo tiền ăn · ${mealEditor.date.split('-').reverse().join('/')} · ${name(mealEditor.employeeId)}`} busy={busy} onClose={()=>setMealEditor(null)} error={error} onSubmit={()=>action(async()=>{
      await api(`/meals/${encodeURIComponent(mealEditor.employeeId)}/${mealEditor.date}`,'PUT',{sessions:mealEditor.sessions,version:mealEditor.version});setMealEditor(null);setMessage('Đã lưu tiền ăn lên cloud.');refresh();
    })}>
      {mealEditor.sessions.map((session,index)=><div key={session.id} className="border rounded-xl p-3 space-y-3"><div className="flex items-center gap-2"><label className="grow text-sm">Bữa ăn<select className={inputClass} value={session.mealType} onChange={e=>setMealEditor({...mealEditor,sessions:mealEditor.sessions.map((s,i)=>i===index?{...s,mealType:e.target.value as MealType}:s)})}>{mealTypes.map(t=><option key={t}>{t}</option>)}</select></label><button aria-label={`Xóa bữa ${index+1}`} type="button" onClick={()=>setMealEditor({...mealEditor,sessions:mealEditor.sessions.filter((_,i)=>i!==index)})} className="text-rose-600 px-2 pt-5"><X size={18}/></button></div>
        <div className="grid grid-cols-2 gap-3">{(['startTime','endTime'] as const).map(key=><label key={key} className="text-sm">{key==='startTime'?'Giờ bắt đầu':'Giờ kết thúc'}<input type="time" required className={inputClass} value={session[key]} onChange={e=>setMealEditor({...mealEditor,sessions:mealEditor.sessions.map((s,i)=>i===index?{...s,[key]:e.target.value}:s)})}/></label>)}</div>
        {(['location','purpose'] as const).map(key=><label key={key} className="block text-sm">{key==='location'?'Địa điểm công tác':'Mục đích công tác'}<input required maxLength={key==='location'?300:1000} className={inputClass} value={session[key]} onChange={e=>setMealEditor({...mealEditor,sessions:mealEditor.sessions.map((s,i)=>i===index?{...s,[key]:e.target.value}:s)})}/></label>)}
      </div>)}
      {mealEditor.sessions.length<4&&<button type="button" className="text-indigo-700 underline" onClick={()=>{const session=newSession();session.mealType=mealTypes.find(t=>!mealEditor.sessions.some(s=>s.mealType===t))!;setMealEditor({...mealEditor,sessions:[...mealEditor.sessions,session]});}}>+ Thêm bữa ăn</button>}
      {!mealEditor.sessions.length&&<p className="text-sm text-rose-700">Lưu để xóa các bữa ăn đã khai báo trong ngày này.</p>}
    </Editor>}

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
