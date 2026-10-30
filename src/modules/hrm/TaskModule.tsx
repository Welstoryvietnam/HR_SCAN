import React, { useState } from 'react';
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Clock3, Columns3, List, Mail, Phone, Plus, Send, UserRoundCheck } from 'lucide-react';
import type { Employee, Task } from './types';
import { getTodayDateString } from './utils/cycleHelper';

type View = 'calendar' | 'board' | 'list' | 'people';
const statuses = { pending: 'Chưa làm', 'in-progress': 'Đang làm', completed: 'Đã xong' };
const priorities = { urgent: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-emerald-400';
const field = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';

export function shiftTaskMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(year, number - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function filterTasks(tasks: Task[], month: string, assignee: string, status: string, query: string, employees: Employee[]) {
  const names = new Map(employees.map(employee => [employee.id, employee.name]));
  const search = query.trim().toLocaleLowerCase('vi');
  return tasks.filter(task => (!month || task.dueDate.startsWith(month + '-')) &&
    (assignee === 'all' || task.employeeId === assignee) && (status === 'all' || task.status === status) &&
    `${task.title} ${task.description} ${names.get(task.employeeId) || ''}`.toLocaleLowerCase('vi').includes(search))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, 'vi'));
}

export default function TaskModule({ employees, tasks, ownEmployeeId, isAdmin, onCreate, onOpen }: {
  employees: Employee[]; tasks: Task[]; ownEmployeeId: string; isAdmin: boolean;
  onCreate: (employeeId?: string, date?: string) => void; onOpen: (task: Task) => void;
}) {
  const today = getTodayDateString();
  const [view, setView] = useState<View>('people');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [anchorMonth, setAnchorMonth] = useState(today.slice(0, 7));
  const [assignee, setAssignee] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const selectMonth = (value: string) => { setMonth(value); if (value) setAnchorMonth(value); };
  const ownTasks = tasks.filter(task => task.employeeId === ownEmployeeId);
  const outstanding = ownTasks.filter(task => task.status !== 'completed').length;
  const visible = filterTasks(tasks, month, assignee, status, query, employees);
  const employeeName = (id: string) => employees.find(employee => employee.id === id)?.name || 'Nhân viên';
  const monthLabel = month ? `${month.slice(5)}/${month.slice(0, 4)}` : 'Tất cả các tháng';
  const showEmployee = (id: string) => { setAssignee(id); setStatus('all'); setQuery(''); setView('list'); };
  const people = employees.filter(employee => (assignee === 'all' || employee.id === assignee) &&
    `${employee.name} ${employee.employeeCode || ''} ${employee.department}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const tabs = [
    { id: 'calendar' as const, label: 'Bảng Lịch Làm Việc', icon: CalendarDays },
    { id: 'board' as const, label: 'Bảng Kanban', icon: Columns3 },
    { id: 'list' as const, label: 'Danh sách', icon: List },
    { id: 'people' as const, label: `Bộ phận & Nhân sự (${employees.length})`, icon: Building2 },
  ];
  return <div className="space-y-6 text-slate-800">
    <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
      <div className="flex min-w-0 flex-1 items-start gap-4"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-600"><Send size={26}/></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-950">Quản Lý & Giao Công Việc Theo Bộ Phận & Nhân Sự</h2><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">HR WORK MANAGEMENT</span></div><p className="mt-1 text-sm text-slate-500">Giao việc đến từng cá nhân, theo dõi trạng thái tiến độ và báo cáo kết quả.</p></div></div>
      <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto"><div role="tablist" aria-label="Chế độ xem công việc" className="flex max-w-full flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={view === id} aria-controls="task-view-panel" id={`task-tab-${id}`} onClick={() => setView(id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${view === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}><Icon size={16}/>{label}</button>)}</div>{isAdmin && <button type="button" className={primary} onClick={() => onCreate()}><Plus size={18}/>Giao Việc Mới</button>}</div>
    </header>

    <section aria-label="Nhiệm vụ của tôi" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
      <div className="flex items-center gap-4"><span className="rounded-2xl bg-emerald-600 p-3 text-white"><Clock3 size={25}/></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-lg">Nhiệm vụ cấp trên đã giao cho bạn ({ownTasks.length} công việc)</h3><span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{outstanding} việc cần làm</span></div><p className="mt-1 text-sm text-teal-700">Lọc riêng việc của tôi để xem các nhiệm vụ được giao.</p></div></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={() => { showEmployee(ownEmployeeId); selectMonth(''); }}><UserRoundCheck size={18}/>Lọc riêng việc của tôi</button><button type="button" className={secondary} onClick={() => selectMonth('')}>Xem tất cả các tháng</button></div>
    </section>

    <section aria-label="Lọc tháng công việc" className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5">
      <div className="flex items-center gap-4"><span className="rounded-2xl bg-emerald-600 p-3 text-white"><CalendarDays size={25}/></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-lg">Quản Lý Công Việc Theo Tháng</h3><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">{monthLabel}</span></div><p className="mt-1 text-sm text-slate-600">Lọc theo tháng hạn hoàn thành, theo dõi tiến độ công việc và phân công nhiệm vụ.</p></div></div>
      <div className="space-y-2"><div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={() => selectMonth(shiftTaskMonth(anchorMonth, -1))}><ChevronLeft size={16}/>Tháng trước</button><div className="flex flex-wrap rounded-xl border border-slate-200 bg-white p-1"><button type="button" aria-pressed={!month} className={`rounded-lg px-3 py-1 text-sm ${!month ? 'bg-emerald-600 text-white' : ''}`} onClick={() => selectMonth('')}>Tất cả các tháng</button>{[-1, 0, 1, 2].map(offset => { const value = shiftTaskMonth(today.slice(0, 7), offset); return <button type="button" key={value} aria-pressed={month === value} className={`rounded-lg px-3 py-1 text-sm font-semibold ${month === value ? 'bg-emerald-600 text-white' : 'text-slate-600'}`} onClick={() => selectMonth(value)}>T{value.slice(5)}/{value.slice(0, 4)}{offset === 0 ? ' (Hiện tại)' : ''}</button>; })}</div><button type="button" className={secondary} onClick={() => selectMonth(shiftTaskMonth(anchorMonth, 1))}>Tháng sau<ChevronRight size={16}/></button></div><input aria-label="Chọn tháng công việc" type="month" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={month} onChange={event => selectMonth(event.target.value)}/></div>
    </section>

    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4"><label className="min-w-48 flex-1 text-sm">{view === 'people' ? 'Tìm nhân viên' : 'Tìm công việc'}<input className={field} value={query} onChange={event => setQuery(event.target.value)} placeholder={view === 'people' ? 'Tên, mã nhân viên, bộ phận…' : 'Tên công việc, người nhận…'}/></label><label className="text-sm">Trạng thái<select className={field} value={status} onChange={event => setStatus(event.target.value)}><option value="all">Tất cả</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{isAdmin && <label className="text-sm">Người nhận<select className={field} value={assignee} onChange={event => setAssignee(event.target.value)}><option value="all">Tất cả nhân viên</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}</div>

    <div role="tabpanel" id="task-view-panel" aria-labelledby={`task-tab-${view}`}>
      {view === 'people' ? <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-center gap-4"><span className="rounded-2xl bg-emerald-600 p-3 text-white"><Building2 size={25}/></span><div><h3 className="font-bold text-lg">Công Cụ Quản Lý Bộ Phận Giao Việc Đến Cá Nhân</h3><p className="mt-1 text-sm text-slate-600">Theo dõi khối lượng công việc, tỷ lệ hoàn thành theo từng nhân viên và phân công việc nhanh.</p></div></div>{isAdmin && <button type="button" className={primary} onClick={() => onCreate()}><Plus size={18}/>Giao Việc Cho Cá Nhân</button>}</div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['STT', 'Nhân viên phụ trách', 'Bộ phận', 'Liên hệ (Zalo / Email)', 'Tổng việc', 'Chưa làm', 'Đang làm', 'Đã xong', 'Tỷ lệ hoàn thành', 'Hành động'].map(label => <th key={label} scope="col" className="px-4 py-4">{label}</th>)}</tr></thead><tbody>{people.map((employee, index) => {
          // All status counts use the selected month; the status filter only narrows task views.
          const work = filterTasks(tasks, month, employee.id, 'all', '', employees);
          const completed = work.filter(task => task.status === 'completed').length;
          const rate = work.length ? Math.round(completed / work.length * 100) : 0;
          return <tr key={employee.id} className="border-t border-slate-100"><td className="px-4 py-5 text-slate-400">{index + 1}</td><td className="px-4 py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">{employee.name.trim().split(/\s+/).at(-1)?.[0]}</span><div><p className="font-semibold text-slate-950">{employee.name}</p><p className="text-xs text-slate-400">Mã NV: {employee.employeeCode || 'Chưa có mã'}</p></div></div></td><td className="px-4 py-5"><span className="rounded bg-slate-100 px-2 py-1 text-xs">{employee.department || 'Chưa cập nhật'}</span></td><td className="px-4 py-5"><div className="space-y-1 text-xs text-slate-500">{employee.phone ? <a href={`tel:${employee.phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-2 text-sky-700"><Phone size={14}/>{employee.phone}</a> : <span className="flex items-center gap-2"><Phone size={14}/>Chưa có SĐT</span>}{employee.email && !employee.email.endsWith('@hrm-accounts.invalid') ? <a href={`mailto:${employee.email}`} className="flex items-center gap-2 text-sky-700"><Mail size={14}/>{employee.email}</a> : <span className="flex items-center gap-2"><Mail size={14}/>Chưa có email</span>}</div></td><td className="px-4 py-5 font-bold">{work.length}</td>{(['pending', 'in-progress', 'completed'] as const).map(value => <td key={value} className="px-4 py-5"><span className={`rounded border px-2 py-1 font-semibold ${value === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : value === 'in-progress' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{work.filter(task => task.status === value).length}</span></td>)}<td className="min-w-40 px-4 py-5"><div className="mb-1 flex justify-between gap-3 text-xs"><span>{completed}/{work.length} xong</span><span className="text-emerald-700">{rate}%</span></div><progress aria-label={`Tỷ lệ hoàn thành của ${employee.name}`} className="h-1.5 w-full accent-emerald-500" max={100} value={rate}/></td><td className="px-4 py-5"><div className="flex gap-2">{isAdmin && <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => onCreate(employee.id)}><Send size={14}/>Giao việc</button>}<button type="button" className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 text-xs" onClick={() => showEmployee(employee.id)}>Xem việc</button></div></td></tr>;
        })}{!people.length && <tr><td colSpan={10} className="p-10 text-center text-slate-500">Không có nhân viên phù hợp.</td></tr>}</tbody></table></div>
      </> : view === 'calendar' ? <TaskCalendar month={month || anchorMonth} tasks={visible} today={today} isAdmin={isAdmin} onCreate={onCreate} onOpen={onOpen} employeeName={employeeName}/> : view === 'board' ? <div className="grid gap-4 lg:grid-cols-3">{Object.entries(statuses).map(([value, label]) => <section key={value} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><h3 className="mb-3 px-1 font-semibold">{label} <span className="text-slate-400">({visible.filter(task => task.status === value).length})</span></h3><div className="space-y-3">{visible.filter(task => task.status === value).map(task => <button type="button" key={task.id} onClick={() => onOpen(task)} className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-400"><span className="text-xs text-emerald-700">{priorities[task.priority || 'medium']}</span><h4 className="mt-1 font-semibold">{task.title}</h4><p className="mt-2 text-sm text-slate-500">{employeeName(task.employeeId)}</p><p className={`mt-2 text-xs ${task.dueDate < today && task.status !== 'completed' ? 'text-rose-600' : 'text-slate-500'}`}>Hạn: {task.dueDate.split('-').reverse().join('/')}</p><progress aria-label={`Tiến độ ${task.title}`} className="mt-3 w-full accent-emerald-600" max={100} value={task.progress || 0}/><p className="text-xs text-slate-500">{task.progress || 0}% hoàn thành</p></button>)}{!visible.some(task => task.status === value) && <p className="p-5 text-center text-sm text-slate-400">Chưa có công việc.</p>}</div></section>)}</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Công việc', 'Người nhận', 'Hạn hoàn thành', 'Trạng thái', 'Tiến độ', 'Thao tác'].map(label => <th key={label} scope="col" className="p-4">{label}</th>)}</tr></thead><tbody>{visible.map(task => <tr key={task.id} className="border-t border-slate-100"><td className="p-4 font-semibold">{task.title}</td><td className="p-4">{employeeName(task.employeeId)}</td><td className="p-4">{task.dueDate.split('-').reverse().join('/')}</td><td className="p-4">{statuses[task.status]}</td><td className="p-4">{task.progress || 0}%</td><td className="p-4"><button type="button" className="text-emerald-700 underline" onClick={() => onOpen(task)}>Chi tiết</button></td></tr>)}{!visible.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Chưa có công việc phù hợp.</td></tr>}</tbody></table></div>}
    </div>
  </div>;
}

function TaskCalendar({ month, tasks, today, isAdmin, onCreate, onOpen, employeeName }: {
  month: string; tasks: Task[]; today: string; isAdmin: boolean;
  onCreate: (employeeId?: string, date?: string) => void; onOpen: (task: Task) => void; employeeName: (id: string) => string;
}) {
  const [year, number] = month.split('-').map(Number);
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, number, 0).getDate();
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><div className="min-w-[760px]"><p className="border-b p-4 text-sm text-slate-600">Lịch hạn hoàn thành tháng {number}/{year}. {isAdmin ? 'Bấm dấu + để giao việc vào ngày tương ứng.' : 'Chọn công việc để cập nhật kết quả.'}</p><div className="grid grid-cols-7">{['T2', 'T3', 'T4', 'T5', 'T6', 'CN'].map(day => <div key={day} className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-500">{day}</div>)}{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > days) return <div key={index} className="min-h-32 border-t border-r border-slate-100 bg-slate-50/50"/>;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    return <div key={index} className={`min-h-32 space-y-2 border-t border-r border-slate-100 p-2 ${date === today ? 'bg-emerald-50' : ''}`}><div className="flex items-center justify-between"><span className={`text-sm font-semibold ${date === today ? 'text-emerald-700' : ''}`}>{day}</span>{isAdmin && <button type="button" aria-label={`Giao việc ngày ${date}`} className="rounded p-1 text-emerald-700 hover:bg-emerald-100" onClick={() => onCreate(undefined, date)}><Plus size={15}/></button>}</div>{tasks.filter(task => task.dueDate === date).map(task => <button type="button" key={task.id} onClick={() => onOpen(task)} className={`block w-full rounded-lg border p-2 text-left text-xs ${task.status === 'completed' ? 'border-emerald-200 bg-emerald-50' : task.dueDate < today ? 'border-rose-200 bg-rose-50' : 'border-sky-200 bg-sky-50'}`}><span className="block font-semibold">{task.title}</span><span className="mt-1 block text-slate-500">{employeeName(task.employeeId)} · {statuses[task.status]}</span></button>)}</div>;
  })}</div></div></div>;
}

