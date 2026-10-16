import React, { useMemo, useState } from 'react';
import { Building2, CalendarDays, Files, LayoutDashboard, ScanLine, Users } from 'lucide-react';
import type { NhanSuRecord } from '../types';
import { currentMonthRange, dashboardReport } from '../utils/dashboardStats';

export function Dashboard({records}: {records: NhanSuRecord[]}) {
  const [range,setRange] = useState(() => currentMonthRange());
  const report = useMemo(() => dashboardReport(records,range.from,range.to),[records,range.from,range.to]);
  const monthLabel = `${report.currentMonth.slice(5,7)}/${report.currentMonth.slice(0,4)}`;
  const cards = [
    {label:'Tổng số hồ sơ',value:report.total,unit:'hồ sơ',icon:Files,color:'bg-blue-50 text-blue-700',note:'Hồ sơ đã lưu trong kỳ'},
    {label:'Đã số hóa qua AI Vision',value:report.ai,unit:'hồ sơ',icon:ScanLine,color:'bg-violet-50 text-violet-700',note:'Đã trích xuất AI thành công'},
    {label:'Hồ sơ xử lý trong tháng',value:report.monthly,unit:'hồ sơ',icon:CalendarDays,color:'bg-amber-50 text-amber-700',note:`Tháng hiện tại ${monthLabel}, trong kỳ đã chọn`},
    {label:'Đơn vị tiếp nhận',value:report.units,unit:'đơn vị',icon:Building2,color:'bg-emerald-50 text-emerald-700',note:'Đếm riêng theo Khối / Ban / Phòng'},
  ];
  return <div className="space-y-5">
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Kỳ thống kê">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700"><LayoutDashboard className="h-5 w-5" /></div>
        <div><h2 className="text-lg font-bold text-slate-900">Dashboard tuyển dụng</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Thống kê hồ sơ đã lưu theo ngày nhập, tính theo giờ Việt Nam. Các chỉ số và bảng cùng áp dụng kỳ đã chọn.</p></div>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
        <span className="w-full text-sm font-semibold text-slate-700 sm:w-auto sm:self-center">Kỳ thống kê</span>
        <label className="min-w-0 flex-1 space-y-1 text-xs font-medium text-slate-600 sm:max-w-52">Từ ngày
          <input type="date" value={range.from} onChange={event => setRange(previous => ({...previous,from:event.target.value}))} aria-invalid={Boolean(report.error)} aria-describedby={report.error ? 'dashboard-date-error' : undefined} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </label>
        <label className="min-w-0 flex-1 space-y-1 text-xs font-medium text-slate-600 sm:max-w-52">Đến ngày
          <input type="date" value={range.to} onChange={event => setRange(previous => ({...previous,to:event.target.value}))} aria-invalid={Boolean(report.error)} aria-describedby={report.error ? 'dashboard-date-error' : undefined} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </label>
        <button type="button" onClick={() => setRange(currentMonthRange())} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">Tháng hiện tại</button>
        <button type="button" onClick={() => setRange({from:'',to:''})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Toàn bộ thời gian</button>
      </div>
      {report.error && <p id="dashboard-date-error" role="alert" className="text-sm text-rose-700">{report.error}</p>}
    </section>
    <section aria-label="Chỉ số tuyển dụng" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({label,value,unit,icon:Icon,color,note}) => <article key={label} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div><h3 className="text-xs font-medium text-slate-600">{label}</h3><p className="mt-2 text-3xl font-bold text-slate-900">{value.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">{unit}</span></p><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{note}</p></div>
        <div className={`shrink-0 rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
      </article>)}
    </section>
    {report.unknownAI > 0 && <p className="text-xs text-slate-500">{report.unknownAI} hồ sơ cũ chưa có dấu xác nhận trích xuất AI nên chưa được tính vào chỉ số AI Vision.</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Thống kê theo người nhập">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Users className="h-4 w-4 text-indigo-600" />Thống kê theo người nhập nhân viên mới</h3>
        <p className="text-xs text-slate-500">{report.people.length} người nhập • {report.total} hồ sơ</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm" aria-label="Thống kê hồ sơ theo người nhập">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>
            {['STT','Người nhập','Tổng số hồ sơ','Đã số hóa AI Vision','Hồ sơ trong tháng','Đơn vị tiếp nhận','Lần nhập gần nhất'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!report.people.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">{report.error ? 'Vui lòng chọn lại kỳ thống kê hợp lệ.' : 'Không có hồ sơ trong kỳ đã chọn.'}</td></tr> : report.people.map((person,index) => <tr key={person.email || 'unknown'} className="hover:bg-slate-50/70">
              <td className="px-4 py-4 text-xs text-slate-500">{index+1}</td>
              <th scope="row" className="px-4 py-4 font-medium text-slate-900"><span className="block">{person.name}</span>{person.email && person.email !== person.name && <span className="mt-1 block text-xs font-normal text-slate-500">{person.email}</span>}</th>
              <td className="px-4 py-4 font-bold text-indigo-700">{person.total}</td>
              <td className="px-4 py-4">{person.ai}</td>
              <td className="px-4 py-4">{person.monthly}</td>
              <td className="px-4 py-4">{person.units}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{person.latest ? new Date(person.latest).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : 'Chưa xác định'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
