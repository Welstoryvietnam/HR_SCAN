import React,{useRef,useEffect,useState} from 'react';
import {CalendarDays,UserCheck,TableProperties,BarChart3,Pencil,MapPin,Briefcase,X,Trash2,Check} from 'lucide-react';
import type {Employee,EmployeeMealData,CycleConfig,AppSettings,AuthUser,MealSession,MealType} from './types';
import {getCycleDays,formatVND} from './utils/cycleHelper';
import {CycleSelector} from './components/CycleSelector';
import {SummaryStats} from './components/SummaryStats';
import {SummaryTable} from './components/SummaryTable';

interface Props {
 employees:Employee[];mealData:Record<string,EmployeeMealData>;cycle:CycleConfig;settings:AppSettings;currentUser:AuthUser;
 selectedEmployeeId:string;onSelectEmployee:(id:string)=>void;onCycleChange:(cycle:CycleConfig)=>void;busy:boolean;
 onOpenDay:(date:string,employeeId?:string)=>void;onExport:(employeeId?:string)=>void;onExportAll:()=>void;onSettings:()=>void;
}
export default function MealModule(p:Props){
 const [view,setView]=useState<'personal'|'summary'|'dashboard'>('personal');
 const [detail,setDetail]=useState<Employee|null>(null);
 const personal=p.currentUser.role==='nhan_vien_nhan_su';
 const days=getCycleDays(p.cycle),records=p.mealData[p.selectedEmployeeId]?.records||{};
 const selected=p.employees.find(e=>e.id===p.selectedEmployeeId);
 return <div className="space-y-5">
  <nav aria-label="Chức năng tiền ăn" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
   {([['personal','Chấm ăn của tôi',UserCheck],['summary',personal?'Bảng kê cá nhân':'Bảng kê tiền ăn',TableProperties],['dashboard','Dashboard tiền ăn',BarChart3]] as const).map(([key,label,Icon])=><button key={key} type="button" onClick={()=>setView(key)} aria-current={view===key?'page':undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${view===key?'bg-emerald-100 text-emerald-800':'text-slate-600 hover:bg-white'}`}><Icon size={16}/>{label}</button>)}
  </nav>
  <CycleSelector cycle={p.cycle} setCycle={p.onCycleChange} settings={p.settings}/>
  {!personal&&<div className="flex flex-wrap gap-3 items-center"><label className="text-sm font-medium flex items-center gap-2">Nhân viên<select className="rounded-lg border border-slate-200 bg-white px-3 py-2" value={p.selectedEmployeeId} onChange={e=>p.onSelectEmployee(e.target.value)}>{p.employees.map(e=><option key={e.id} value={e.id}>{e.name} · {e.employeeCode||e.id}</option>)}</select></label><button type="button" className="text-sm text-emerald-700 underline" onClick={p.onExportAll}>Excel tổng hợp</button><button type="button" className="text-sm text-emerald-700 underline" onClick={p.onSettings}>Đơn giá & biểu mẫu</button></div>}
  {view==='personal'?<div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
   <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3"><div><h3 className="font-semibold text-sm flex gap-2 items-center"><CalendarDays size={17} className="text-emerald-600"/>Chấm Tiền Ăn Bên Ngoài ({p.cycle.label})</h3><p className="text-xs text-slate-500 mt-1">Chọn phân loại bữa ăn (Bữa Trưa, Bữa Tối, Bữa Sáng, Bữa Đêm), Địa điểm làm việc bên ngoài và Mục đích công việc</p>{!personal&&<p className="text-xs font-medium text-emerald-800 mt-1">{selected?.name}</p>}</div><span className="text-xs text-slate-500">Định mức: <strong>{formatVND(p.settings.mealPrice)}/bữa</strong></span></div>
   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{days.map(day=>{
    const record=records[day.dateStr],hasMeals=!!record?.mealsCount,disabled=p.busy||day.isFuture||!selected;
    return <article key={day.dateStr} className={`min-h-40 flex flex-col rounded-xl border p-3 ${day.isWeekend?'border-amber-200 bg-amber-50/10':'border-slate-200'} ${day.isFuture?'opacity-50':''} ${day.isToday?'ring-2 ring-emerald-300':''}`}>
     <div className="flex justify-between items-center"><button type="button" disabled={disabled} onClick={()=>p.onOpenDay(day.dateStr)} aria-label={`Chấm ăn ngày ${day.dayNum}/${day.monthNum}`} className="flex items-center gap-2"><strong className="text-sm">{String(day.dayNum).padStart(2,'0')}/{String(day.monthNum).padStart(2,'0')}</strong><span className={`text-xs rounded px-1.5 py-0.5 ${day.isWeekend?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'}`}>{day.dayOfWeekLabel}</span></button><button type="button" disabled={disabled} onClick={()=>p.onOpenDay(day.dateStr)} className="border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed">{hasMeals?'Sửa':'+ Tích'}</button></div>
     <div className="flex-1 py-4 text-xs">{hasMeals?<div className="space-y-2">{record.sessions?.map(s=><div key={s.id}><span className="inline-flex gap-1 items-center rounded-md bg-emerald-50 text-emerald-800 px-2 py-1 font-semibold"><Check size={12}/>{s.mealType}</span><p className="mt-1 text-slate-500">{s.location} · {s.purpose}</p></div>)}</div>:<p className="text-center text-slate-400 pt-2">{day.isFuture?'Chưa đến ngày chấm ăn':'Chưa đăng ký bữa ăn ngoài'}</p>}</div>
     <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs"><span className={hasMeals?'text-emerald-700 font-semibold':'text-slate-400'}>{formatVND((record?.mealsCount||0)*p.settings.mealPrice)}</span><button disabled={disabled} type="button" onClick={()=>p.onOpenDay(day.dateStr)} className="inline-flex gap-1 items-center text-slate-500"><Pencil size={12}/>{hasMeals?'Chỉnh sửa':'Thêm chi tiết'}</button></div>
    </article>;
   })}</div>
  </div>:<>
   <SummaryStats employees={p.employees} mealData={p.mealData} cycle={p.cycle} settings={p.settings} currentUser={p.currentUser}/>
   {view==='summary'?<SummaryTable employees={p.employees} mealData={p.mealData} cycle={p.cycle} settings={p.settings} currentUser={p.currentUser} onViewEmployeeDetail={setDetail} onQuickCheckin={employee=>{p.onSelectEmployee(employee.id);setView('personal');}} onExportExcel={()=>personal?p.onExport(p.currentUser.id):p.onExportAll()} onExportEmployeeExcel={employee=>p.onExport(employee.id)}/>:<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{['Bữa Trưa','Bữa Tối','Bữa Sáng','Bữa Đêm'].map(type=>{
    const target=personal?p.employees.filter(e=>e.id===p.currentUser.id):p.employees;
    const count=target.reduce((sum,e)=>sum+days.reduce((n,d)=>n+(p.mealData[e.id]?.records[d.dateStr]?.sessions||[]).filter(s=>s.mealType===type).length,0),0);
    return <div key={type} className="bg-white border border-slate-200 rounded-xl p-5"><h3 className="font-semibold">{type}</h3><p className="text-2xl font-bold mt-2">{count} <span className="font-normal text-sm text-slate-500">suất</span></p><p className="text-emerald-700 mt-1">{formatVND(count*p.settings.mealPrice)}</p></div>;
   })}</div>}
  </>}
  {detail&&<MealDetails employee={detail} {...p} onClose={()=>setDetail(null)}/>}
 </div>;
}
function MealDetails(p:Props&{employee:Employee;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();p.onClose();}} aria-label={`Chi tiết tiền ăn ${p.employee.name}`} className="m-auto w-[min(94vw,900px)] max-h-[90dvh] rounded-2xl border border-slate-200 p-5 backdrop:bg-slate-900/40"><header className="flex justify-between items-center mb-4"><h3 className="font-bold">Chi tiết tiền ăn · {p.employee.name}</h3><button type="button" onClick={p.onClose} aria-label="Đóng chi tiết"><X size={20}/></button></header><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Ngày','Bữa ăn','Địa điểm / Mục đích','Thành tiền',''].map((h,i)=><th key={i} scope="col" className="p-2">{h}</th>)}</tr></thead><tbody>{getCycleDays(p.cycle).filter(d=>p.mealData[p.employee.id]?.records[d.dateStr]?.mealsCount).map(day=>{const record=p.mealData[p.employee.id].records[day.dateStr];return <tr key={day.dateStr} className="border-t border-slate-200"><td className="p-2">{day.dayNum}/{day.monthNum}</td><td className="p-2">{record.sessions?.map(s=>s.mealType).join(', ')}</td><td className="p-2">{record.sessions?.map(s=><p key={s.id}>{s.location} · {s.purpose}</p>)}</td><td className="p-2">{formatVND(record.mealsCount*p.settings.mealPrice)}</td><td className="p-2"><button type="button" className="text-emerald-700 underline" onClick={()=>{p.onClose();p.onSelectEmployee(p.employee.id);p.onOpenDay(day.dateStr,p.employee.id);}}>Sửa</button></td></tr>;})}</tbody></table></div><button type="button" className="mt-4 rounded-lg bg-emerald-600 text-white px-4 py-2" onClick={()=>p.onExport(p.employee.id)}>Tải Excel cá nhân</button></dialog>;
}

const types:MealType[]=['Bữa Trưa','Bữa Tối','Bữa Sáng','Bữa Đêm'];
const locations=['Bắc Ninh','Phú Thọ','Hải Phòng','Hà Nam','Bắc Giang cũ','Thái Nguyên','Hà Nội'];
const purposes=['Phỏng vấn','Đưa nhân viên đi khám sức khỏe','Tham gia ngày hội việc làm','Gặp nhà cung cấp'];
const defaults:Record<MealType,[string,string]>={'Bữa Sáng':['06:30','08:30'],'Bữa Trưa':['08:00','17:00'],'Bữa Tối':['17:00','19:00'],'Bữa Đêm':['22:00','06:00']};
export function defaultMealSession(type:MealType):MealSession{return {id:crypto.randomUUID(),mealType:type,startTime:defaults[type][0],endTime:defaults[type][1],location:'Bắc Ninh',purpose:'Phỏng vấn',mealsCount:1};}
export function MealDayDialog({date,sessions,mealPrice,busy,error,onClose,onSave}:{date:string;sessions:MealSession[];mealPrice:number;busy:boolean;error:string;onClose:()=>void;onSave:(sessions:MealSession[])=>void}){
 const ref=useRef<HTMLDialogElement>(null),first=sessions[0];
 const [chosen,setChosen]=useState<MealType[]>(sessions.map(s=>s.mealType));
 const [location,setLocation]=useState(first?.location||'Bắc Ninh'),[purpose,setPurpose]=useState(first?.purpose||'Phỏng vấn');
 const [showTimes,setShowTimes]=useState(false);
 const [times,setTimes]=useState<Record<MealType,[string,string]>>(()=>Object.fromEntries(types.map(type=>{const old=sessions.find(s=>s.mealType===type);return [type,old?[old.startTime,old.endTime]:defaults[type]];})) as Record<MealType,[string,string]>);
 useEffect(()=>{ref.current?.showModal();},[]);
 const build=()=>chosen.map(type=>{
  const previous=sessions.find(s=>s.mealType===type);
  return {...defaultMealSession(type),location:previous&&location===first?.location?previous.location:location.trim(),purpose:previous&&purpose===first?.purpose?previous.purpose:purpose.trim(),startTime:times[type][0],endTime:times[type][1]};
 });
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} aria-label={`Đăng ký bữa ăn ngày ${date}`} className="m-auto w-[min(94vw,520px)] max-h-[92dvh] rounded-2xl border border-slate-200 p-0 backdrop:bg-black/50"><form onSubmit={e=>{e.preventDefault();onSave(build());}} className="p-5 space-y-5"><header className="flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="font-bold text-sm flex items-center gap-2"><CalendarDays size={20} className="text-emerald-600"/>Đăng Ký Bữa Ăn Ngày {date.split('-').slice(1).reverse().map(Number).join('/')} ({getCycleDays({startDate:date,endDate:date} as CycleConfig)[0].dayOfWeekLabel})</h3><button type="button" aria-label="Đóng đăng ký bữa ăn" disabled={busy} onClick={onClose}><X size={20} className="text-slate-400"/></button></header>
  {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  <fieldset disabled={busy} className="space-y-4"><legend className="sr-only">Thông tin bữa ăn</legend><div><p className="font-semibold text-xs mb-2">1. Phân loại bữa ăn:</p><div className="grid grid-cols-2 gap-2">{types.map(type=><label key={type} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm font-semibold cursor-pointer ${chosen.includes(type)?'border-emerald-500 bg-emerald-50 text-slate-800 ring-1 ring-emerald-500':'border-slate-200 bg-slate-50'}`}><span>{type}</span><input type="checkbox" aria-label={type} className="accent-emerald-600" checked={chosen.includes(type)} onChange={e=>setChosen(previous=>e.target.checked?[...previous,type]:previous.filter(v=>v!==type))}/></label>)}</div></div>
   <label className="block text-xs font-semibold"><span className="flex items-center gap-1 mb-1"><MapPin size={14} className="text-orange-500"/>2. Địa điểm làm việc bên ngoài:</span><input required={chosen.length>0} maxLength={300} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" value={location} onChange={e=>setLocation(e.target.value)}/></label><div className="flex flex-wrap gap-1">{locations.map(value=><button type="button" key={value} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500" onClick={()=>setLocation(value)}>{value}</button>)}</div>
   <label className="block text-xs font-semibold"><span className="flex items-center gap-1 mb-1"><Briefcase size={14} className="text-violet-500"/>3. Mục đích công việc:</span><input required={chosen.length>0} maxLength={1000} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" value={purpose} onChange={e=>setPurpose(e.target.value)}/></label><div className="flex flex-wrap gap-1">{purposes.map(value=><button type="button" key={value} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500" onClick={()=>setPurpose(value)}>{value}</button>)}</div>
   <button type="button" className="text-[11px] text-slate-400 underline" onClick={()=>setShowTimes(v=>!v)}>{showTimes?'Ẩn':'Điều chỉnh'} giờ công tác</button>{showTimes&&chosen.map(type=><div key={type} className="grid grid-cols-2 gap-3"><span className="col-span-2 text-xs font-semibold">{type}</span>{([0,1] as const).map(index=><label key={index} className="text-xs">{index?'Giờ kết thúc':'Giờ bắt đầu'}<input required type="time" aria-label={`${type} ${index?'giờ kết thúc':'giờ bắt đầu'}`} className="block border border-slate-200 rounded-lg px-2 py-1" value={times[type][index]} onChange={e=>setTimes(previous=>({...previous,[type]:index?[previous[type][0],e.target.value]:[e.target.value,previous[type][1]]}))}/></label>)}</div>)}
  </fieldset>
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-slate-500">Tổng phụ cấp ngày này: <strong className="text-emerald-800 text-sm">{formatVND(chosen.length*mealPrice)}</strong> ({chosen.length} bữa)</div>
  <footer className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><button type="button" disabled={busy} className="flex items-center gap-1 text-xs text-rose-600" onClick={()=>onSave([])}><Trash2 size={14}/>Xóa ngày này</button><div className="flex gap-3 items-center"><button type="button" disabled={busy} className="text-xs text-slate-500" onClick={onClose}>Hủy</button><button disabled={busy} type="submit" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy?'Đang lưu…':'Lưu Bữa Ăn'}</button></div></footer>
 </form></dialog>;
}
