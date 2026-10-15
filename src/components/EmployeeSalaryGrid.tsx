import React, { useState } from 'react';
import { BatchEmployeeDraft, NhanSuRecord } from '../types';
import { Search, Users } from 'lucide-react';

interface Props {
  employees: NhanSuRecord[];
  onChange: (id: string, updates: Partial<BatchEmployeeDraft>) => void;
  disabled?: boolean;
}

const fixedFields = [
  ['phuCapChucVu','PC chức vụ'], ['phuCapDienThoai','PC điện thoại'],
  ['troCapTayNghe','Trợ cấp tay nghề'], ['troCapGiaDinh','Trợ cấp gia đình'],
  ['thuongChuyenCan','Thưởng chuyên cần'], ['thuongSangKien','Thưởng sáng kiến'],
] as const;
const variableFields = [
  ['phuCapNangLuc','Phụ cấp năng lực'],
  ['phuCapMoiTruong','PC môi trường'], ['phuCapXangXe','PC xăng xe'],
  ['anToanVeSinhVien','An toàn vệ sinh viên'], ['phuCapKinhDoanh','PC kinh doanh'],
  ['phuCapNangNhoc','PC nặng nhọc'], ['troCapDacThuFPT','Trợ cấp đặc thù FPT'],
  ['thuongNangLucAM','Thưởng năng lực AM'], ['phuCapLuuDong','PC lưu động'],
  ['phuCapPhatSinh','PC phát sinh khác'],
] as const;
const money = (value: number = 0) => value.toLocaleString('vi-VN');
const displayDate = (value?: string) => value?.split('-').reverse().join('/') || 'Chưa nhập';

export function EmployeeSalaryGrid({ employees, onChange, disabled }: Props) {
  const [query,setQuery] = useState('');
  const normalize = (value:string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const visible = employees.filter(employee => normalize(`${employee.hoVaTen} ${employee.soCCCD}`).includes(normalize(query.trim())));
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs font-semibold tabular-nums text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50';
  const numberInput = (employee:NhanSuRecord, index:number, key:keyof BatchEmployeeDraft, label:string) => <input type="number" min="0" step="any" disabled={disabled} aria-label={`${label} nhân viên ${index + 1}`} value={Number(employee[key as keyof NhanSuRecord] ?? 0)} onChange={event => onChange(employee.id,{[key]:event.target.value === '' ? 0 : Number(event.target.value)})} className={inputClass} />;
  return <section className="space-y-4" aria-label="Bảng lương tất cả nhân viên">
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Users className="h-4 w-4 text-indigo-600" />Danh sách lương ({employees.length} nhân viên)</div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Tìm nhân viên trong bảng lương" placeholder="Tìm họ tên hoặc CCCD" value={query} onChange={event => setQuery(event.target.value)} className="w-48 text-xs outline-none" /></label>
      </div>
      <p className="bg-slate-50 px-3 py-2 text-xs text-slate-500">Mỗi dòng là một nhân viên. Mở “Chi tiết phụ cấp” để sửa từng khoản; tổng thu nhập được tính tự động. Lưu và xuất Excel áp dụng cho toàn bộ danh sách.</p>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[1500px] border-separate border-spacing-0 text-left text-xs" aria-label="Lương và phụ cấp Bước 4">
          <thead className="sticky top-0 z-20 bg-indigo-50 text-indigo-950"><tr>{['Nhân viên / Thông tin tiếp nhận','Đơn vị / Chức vụ','Lương cơ bản (đ)','Phụ cấp cố định (đ)','Phụ cấp khác (đ)','Lương đóng BHXH (đ)','Tổng thu nhập (đ)','Ghi chú'].map((title,index) => <th key={title} scope="col" className={`border-b border-indigo-200 px-3 py-3 ${index === 0 ? 'sticky left-0 z-30 min-w-60 bg-indigo-50' : ''}`}>{title}</th>)}</tr></thead>
          <tbody>{visible.map(employee => {
            const index = employees.findIndex(item => item.id === employee.id);
            const variableTotal = variableFields.reduce((sum,[key]) => sum + Number(employee[key] || 0),0);
            return <tr key={employee.id} className="align-top">
              <th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 font-normal">
                <p className="font-bold text-slate-900">{index + 1}. {employee.hoVaTen || 'Chưa có họ tên'}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">CCCD: {employee.soCCCD || 'Chưa nhập'}</p>
                <p className="mt-1 text-[11px] text-slate-500">Vào làm: {displayDate(employee.ngayVaoLam)}</p>
                <details className="mt-2 text-[11px]"><summary className="cursor-pointer font-semibold text-indigo-700">Thông tin đã nhập</summary><dl className="mt-2 space-y-2 text-slate-600">
                  {[
                    ['Ngày sinh',employee.ngaySinh],['Giới tính',employee.gioiTinh],['Điện thoại',employee.soDienThoai],
                    ['Tình trạng hôn nhân',employee.tinhTrangHonNhan],['Ngày hết hạn CCCD',employee.ngayHetHanCCCD],['Thẩm quyền',employee.thamQuyen],
                    ['Email cá nhân',employee.emailCaNhan],['Thường trú',employee.diaChiThuongTru],['Tạm trú',employee.diaChiTamTru],
                    ['Tình trạng hồ sơ',employee.tinhTrangHoSo],['Loại hợp đồng',employee.loaiHopDong],['Điểm làm việc',employee.diemLamViec],
                  ].map(([label,value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="break-words whitespace-pre-wrap">{value || 'Chưa nhập'}</dd></div>)}
                </dl></details>
              </th>
              <td className="min-w-44 border-b border-slate-200 p-3"><p className="font-semibold text-slate-800">{employee.congViecDuKien || 'Chưa chọn công việc'}</p><p className="mt-1 text-indigo-700">{employee.chucVu || 'Chưa chọn chức vụ'}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{[employee.khoi,employee.ban,employee.phong].filter(Boolean).join(' → ') || 'Chưa phân bổ đơn vị'}</p></td>
              <td className="min-w-36 border-b border-slate-200 p-3">{numberInput(employee,index,'luongCoBan','Lương cơ bản')}</td>
              {([['Cố định',fixedFields,employee.phuCapCoDinh],['Khác',variableFields,variableTotal]] as const).map(([group,fields,total]) => <td key={group} className="min-w-48 border-b border-slate-200 p-3"><p className="py-2 font-semibold tabular-nums text-slate-800">{money(total)}</p><details className="mt-1"><summary className="cursor-pointer text-[11px] font-semibold text-indigo-700">Chi tiết phụ cấp {group.toLowerCase()}</summary><div className="mt-3 space-y-2">{fields.map(([key,label]) => <label key={key} className="block space-y-1"><span className="text-[10px] text-slate-500">{label}</span>{numberInput(employee,index,key,label)}</label>)}</div></details></td>)}
              <td className="min-w-40 border-b border-slate-200 p-3">{numberInput(employee,index,'luongDongBHXH','Lương đóng BHXH')}</td>
              <td className="min-w-40 border-b border-slate-200 bg-indigo-50/40 p-3"><p aria-label={`Tổng thu nhập nhân viên ${index + 1}`} className="py-2 font-bold tabular-nums text-indigo-800">{money(employee.tongThuNhapDuKien)} đ</p><p className="text-[10px] text-slate-500">Lương cơ bản + {money(employee.tongPhuCap)} đ phụ cấp</p></td>
              <td className="min-w-48 border-b border-slate-200 p-3"><textarea rows={2} disabled={disabled} aria-label={`Ghi chú lương nhân viên ${index + 1}`} value={employee.ghiChu || ''} onChange={event => onChange(employee.id,{ghiChu:event.target.value})} placeholder="Ghi chú cho nhân viên này" className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs" /></td>
            </tr>;
          })}{!visible.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Không có nhân viên phù hợp.</td></tr>}</tbody>
        </table>
      </div>
      <p className="bg-slate-50 px-3 py-2 text-xs text-slate-500" aria-live="polite">Hiển thị {visible.length} / {employees.length} nhân viên • Đơn vị tiền tệ: VNĐ</p>
    </div>
  </section>;
}
