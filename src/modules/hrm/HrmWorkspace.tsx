import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, Plus, RefreshCw, Save, X } from 'lucide-react';
import type { UserProfile } from '../../types';
import type { AppSettings, Employee, Task } from './types';
import { safeFetchJson } from '../../utils/apiHelper';
import { getTodayDateString } from './utils/cycleHelper';

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
const emptyTask=(id:string):Task=>({id:'',employeeId:id,title:'',description:'',dueDate:getTodayDateString(),status:'pending',assignedBy:'',priority:'medium',progress:0,resultNote:'',createdAt:'',updatedAt:''});

export default function HrmWorkspace({currentUser,module='tasks'}:{currentUser:UserProfile;module?:'tasks'}) {
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [,setSettings]=useState<AppSettings|null>(null);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const [revision,setRevision]=useState(0);
  const [employeeId,setEmployeeId]=useState(currentUser.id || '');
  const [taskEditor,setTaskEditor]=useState<{task:Task;version:string}|null>(null);
  const [directory,setDirectory]=useState<{profiles:LegacyProfile[];accounts:{id:string;name:string;email:string}[]}|null>(null);
  const [profileEditor,setProfileEditor]=useState<Versioned<LegacyProfile>|null>(null);
  const [statusFilter,setStatusFilter]=useState('all'),[assigneeFilter,setAssigneeFilter]=useState('all'),[query,setQuery]=useState('');
  const [taskView,setTaskView]=useState<'list'|'board'>('board');
  const isAdmin=currentUser.role==='admin';
  const generation=useRef(0);

  useEffect(()=>{
    const run=++generation.current;setLoading(true);setReady(false);setError('');
    Promise.all([api<{employees:Employee[];settings:AppSettings}>('/bootstrap'),api<Task[]>('/tasks')]).then(([bootstrap,work])=>{
      if(run!==generation.current)return;
      setEmployees(bootstrap.employees);setSettings(bootstrap.settings);setTasks(work);setReady(true);
      setEmployeeId(previous=>bootstrap.employees.some(e=>e.id===previous)?previous:bootstrap.employees[0]?.id || '');
    }).catch(e=>{if(run===generation.current)setError(e.message);}).finally(()=>{if(run===generation.current)setLoading(false);});
    return ()=>{generation.current++;};
  },[revision]);

  async function action(fn:()=>Promise<void>) {
    if(busy)return;setBusy(true);setError('');setMessage('');
    try {await fn();} catch(e){setError((e as Error).message);} finally{setBusy(false);}
  }
  const refresh=()=>setRevision(n=>n+1);
  const name=(id:string)=>employees.find(e=>e.id===id)?.name || id;
  const visibleTasks=tasks.filter(t=>(statusFilter==='all'||t.status===statusFilter)&&(assigneeFilter==='all'||t.employeeId===assigneeFilter)&&`${t.title} ${t.description} ${name(t.employeeId)}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const openTask=(task:Task)=>action(async()=>{const item=await api<Versioned<Task>>('/tasks/'+task.id);setTaskEditor({task:item.record,version:item.version});});

  return <section className="space-y-5" aria-label="Quản lý công việc nhân sự">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold flex items-center gap-2"><CheckSquare className="text-indigo-600"/>Quản lý công việc nhân sự</h2><p className="mt-1 text-sm text-slate-500">Giao việc, theo dõi hạn hoàn thành và cập nhật kết quả.</p></div>
      <button type="button" disabled={busy||loading} onClick={refresh} className="flex gap-2 items-center text-sm border rounded-lg bg-white px-3 py-2"><RefreshCw size={16}/>Tải lại</button>
    </div>
    {error&&<div role="alert" className="border border-rose-200 rounded-xl bg-rose-50 text-rose-800 p-4">{error}<button type="button" disabled={busy||loading} className="ml-4 underline" onClick={refresh}>Thử tải lại</button></div>}
    {message&&<p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl">{message}</p>}
    {loading&&<p role="status">Đang tải dữ liệu cloud…</p>}
    {isAdmin&&<div className="space-y-3"><button type="button" disabled={busy} onClick={()=>action(async()=>setDirectory(directory?null:await api('/directory')))} className="text-sm text-indigo-700 underline">{directory?'Đóng liên kết tài khoản':'Nhân viên HRM-Mini & liên kết tài khoản'}</button>{directory&&<div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3"><p className="text-sm text-slate-600">Tài khoản HRM-Mini dùng mã nhân viên để đăng nhập. Chỉ liên kết thêm khi đã đối chiếu đúng người sở hữu hồ sơ.</p>{directory.profiles.length?directory.profiles.map(profile=><div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2"><div><p className="font-medium text-sm">{profile.name}</p><p className="text-xs text-slate-500">{profile.email} · {directory.accounts.find(a=>a.id===profile.accountId)?.name||'Chưa liên kết tài khoản'}</p></div><button type="button" disabled={busy} className="text-sm text-indigo-700 underline" onClick={()=>action(async()=>setProfileEditor(await api('/directory/'+profile.id)))}>Liên kết</button></div>):<p className="text-sm">Chưa có nhân viên được chuyển từ HRM-Mini.</p>}</div>}</div>}
    {!loading&&ready&&<>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <div className="flex flex-wrap gap-3 bg-white border rounded-2xl p-4">
          <label className="grow min-w-48 text-sm">Tìm công việc<input className={inputClass+' mt-1'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên công việc, người nhận…"/></label>
          <label className="text-sm">Trạng thái<select className={inputClass+' mt-1'} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Tất cả</option>{Object.entries(statuses).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
          {isAdmin&&<label className="text-sm">Người nhận<select className={inputClass+' mt-1'} value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}><option value="all">Tất cả nhân viên</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}
          <div className="flex items-end gap-2"><button type="button" className="border px-3 py-2 rounded-lg text-sm" onClick={()=>setTaskView(v=>v==='board'?'list':'board')}>{taskView==='board'?'Dạng danh sách':'Dạng bảng tiến độ'}</button>{isAdmin&&<button type="button" className={buttonClass} onClick={()=>setTaskEditor({task:emptyTask(employeeId),version:''})}><Plus size={16}/>Giao công việc</button>}</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Object.entries(statuses),['overdue','Quá hạn']].map(([status,label])=><div key={status} className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{tasks.filter(t=>status==='overdue'?t.status!=='completed'&&t.dueDate<getTodayDateString():t.status===status).length}</p></div>)}</div>
        {!visibleTasks.length?<div className="bg-white border rounded-2xl p-12 text-center text-slate-500">Chưa có công việc phù hợp.</div>:taskView==='board'?<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{Object.entries(statuses).map(([status,label])=><div key={status} className="rounded-2xl bg-slate-100 p-3 space-y-3"><h3 className="font-semibold px-1">{label} <span className="text-slate-500">({visibleTasks.filter(t=>t.status===status).length})</span></h3>{visibleTasks.filter(t=>t.status===status).map(task=><button type="button" key={task.id} onClick={()=>openTask(task)} className="block w-full rounded-xl border bg-white p-4 text-left shadow-sm hover:border-indigo-400"><span className="text-xs text-indigo-700">{priorities[task.priority || 'medium']}</span><h4 className="font-semibold mt-1">{task.title}</h4><p className="text-sm text-slate-500 mt-2">{name(task.employeeId)}</p><p className={`text-xs mt-2 ${task.dueDate<getTodayDateString()&&task.status!=='completed'?'text-rose-600':'text-slate-500'}`}>Hạn: {task.dueDate.split('-').reverse().join('/')}</p><progress aria-label={`Tiến độ ${task.title}`} className="w-full mt-3 accent-indigo-600" max={100} value={task.progress||0}/><p className="text-xs text-slate-500">{task.progress||0}% hoàn thành</p></button>)}</div>)}</div>:<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>{['Công việc','Người nhận','Hạn hoàn thành','Trạng thái','Tiến độ',''].map((h,i)=><th key={i} scope="col" className="p-3">{h}</th>)}</tr></thead><tbody>{visibleTasks.map(t=><tr className="border-t" key={t.id}><td className="p-3">{t.title}</td><td className="p-3">{name(t.employeeId)}</td><td className="p-3">{t.dueDate}</td><td className="p-3">{statuses[t.status]}</td><td className="p-3">{t.progress||0}%</td><td className="p-3"><button type="button" className="text-indigo-700 underline" onClick={()=>openTask(t)}>Chi tiết</button></td></tr>)}</tbody></table></div>}
      </fieldset>
    </>}

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

    {profileEditor&&directory&&<Editor title={`Liên kết tài khoản · ${profileEditor.record.name}`} busy={busy} error={error} onClose={()=>setProfileEditor(null)} onSubmit={()=>action(async()=>{await api('/directory/'+profileEditor.record.id,'PUT',{accountId:profileEditor.record.accountId,version:profileEditor.version});setProfileEditor(null);setDirectory(await api('/directory'));setMessage('Đã lưu liên kết tài khoản.');refresh();})}><p className="text-sm text-slate-600">Tài khoản được chọn có thể xem và cập nhật dữ liệu công việc của nhân viên này.</p><label className="block text-sm">Tài khoản đăng nhập<select className={inputClass} value={profileEditor.record.accountId||''} onChange={e=>setProfileEditor({...profileEditor,record:{...profileEditor.record,accountId:e.target.value}})}><option value="">Chưa liên kết</option>{directory.accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}</select></label></Editor>}
  </section>;
}

function Editor({title,busy,error,onClose,onSubmit,children}:{title:string;busy:boolean;error:string;onClose:()=>void;onSubmit:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();if(!busy)onClose();}} className="m-auto w-[min(94vw,640px)] max-h-[90dvh] rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/40"><form onSubmit={e=>{e.preventDefault();onSubmit();}} className="p-5 space-y-4"><div className="flex items-center justify-between gap-4"><h3 className="font-bold text-lg">{title}</h3><button disabled={busy} type="button" onClick={onClose} aria-label="Đóng"><X size={20}/></button></div>{error&&<p role="alert" className="text-rose-800 bg-rose-50 rounded-lg p-3 text-sm">{error} Nếu dữ liệu đã thay đổi trên thiết bị khác, đóng hộp thoại, tải lại rồi mở lại để chỉnh sửa.</p>}<fieldset disabled={busy} className="space-y-4 min-w-0">{children}</fieldset><div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="border px-4 py-2 rounded-lg text-sm">Đóng</button><button type="submit" disabled={busy} className={buttonClass}><Save size={16}/>{busy?'Đang lưu…':'Lưu lên cloud'}</button></div></form></dialog>;
}
