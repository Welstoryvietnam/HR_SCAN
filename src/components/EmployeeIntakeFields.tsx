import React from 'react';
import { BatchEmployeeDraft, EmployeeIntakeInfo } from '../types';

interface Props {
  employees: BatchEmployeeDraft[];
  onChange: (id: string, updates: Partial<EmployeeIntakeInfo>) => void;
}

export function EmployeeIntakeFields({ employees, onChange }: Props) {
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';
  return <section className="overflow-hidden rounded-xl border border-emerald-200 bg-white" aria-label="Thông tin tiếp nhận nhân viên">
    <div className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-3">
      <h3 className="text-sm font-bold text-emerald-950">Thông tin tiếp nhận bổ sung</h3>
      <p className="mt-1 text-xs text-slate-600">Nhập riêng cho từng nhân viên. Email cá nhân được điền sẵn nếu AI đọc được từ tài liệu ở Bước 1; bạn có thể chỉnh sửa hoặc bổ sung.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-xs" aria-label="Thông tin bổ sung Bước 3">
        <thead className="bg-slate-50 text-slate-600"><tr>{['Nhân viên','Ngày vào làm việc','Địa chỉ tạm trú hiện tại','Email cá nhân','Tình trạng hồ sơ'].map(label => <th key={label} scope="col" className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{employees.map((employee,index) => <tr key={employee.id} className="align-top">
          <th scope="row" className="min-w-44 px-3 py-3 font-semibold text-slate-800"><span className="mr-2 text-slate-400">{index + 1}.</span>{employee.hoVaTen || 'Chưa có họ tên'}</th>
          <td className="min-w-44 px-3 py-3"><input type="date" aria-label={`Ngày vào làm việc nhân viên ${index + 1}`} value={employee.ngayVaoLam || ''} onChange={event => onChange(employee.id,{ngayVaoLam:event.currentTarget.value})} onInput={event => onChange(employee.id,{ngayVaoLam:event.currentTarget.value})} onBlur={event => onChange(employee.id,{ngayVaoLam:event.currentTarget.value})} className={inputClass} /></td>
          <td className="min-w-64 px-3 py-3"><textarea aria-label={`Địa chỉ tạm trú hiện tại nhân viên ${index + 1}`} placeholder="Nhập địa chỉ đang tạm trú" rows={2} value={employee.diaChiTamTru || ''} onChange={event => onChange(employee.id,{diaChiTamTru:event.target.value})} className={`${inputClass} resize-y`} /></td>
          <td className="min-w-56 px-3 py-3"><input type="email" autoComplete="off" aria-label={`Email cá nhân nhân viên ${index + 1}`} placeholder="ten@example.com" value={employee.emailCaNhan || ''} onChange={event => onChange(employee.id,{emailCaNhan:event.target.value})} className={inputClass} /></td>
          <td className="min-w-52 px-3 py-3"><input type="text" aria-label={`Tình trạng hồ sơ nhân viên ${index + 1}`} placeholder="Nhập tình trạng hồ sơ" value={employee.tinhTrangHoSo || ''} onChange={event => onChange(employee.id,{tinhTrangHoSo:event.target.value})} className={inputClass} /></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
