import React, { useState } from 'react';
import { BatchEmployeeDraft, NhanSuRecord } from '../types';
import { Search, Users, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { HouseholdMembersEditor } from './HouseholdMembersEditor';
import { findSystemDuplicateCCCD, findBatchDuplicateCCCD, normalizeCCCD } from '../utils/duplicateCheck';

interface Props {
  employees: BatchEmployeeDraft[];
  existingRecords: NhanSuRecord[];
  onChange: (id: string, updates: Partial<BatchEmployeeDraft>) => void;
}

export function EmployeeReviewGrid({ employees, existingRecords, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const issues = (employee: BatchEmployeeDraft) => {
    const messages: string[] = [];
    if (!employee.hoVaTen.trim()) messages.push('Thiếu họ tên');
    if (!/^\d{12}$/.test(employee.soCCCD.trim())) messages.push('CCCD cần đủ 12 chữ số');
    if (!employee.ngaySinh.trim()) messages.push('Thiếu ngày sinh');
    if (!employee.diaChiThuongTru.trim()) messages.push('Thiếu địa chỉ');
    if (employee.soCCCD.trim()) {
      const clean = normalizeCCCD(employee.soCCCD);
      if (clean.length >= 9) {
        const sysMatch = findSystemDuplicateCCCD(clean, existingRecords);
        if (sysMatch) {
          messages.push(`Trùng CCCD (${clean}) với hồ sơ đã lưu: ${sysMatch.hoVaTen} (${sysMatch.chucVu || 'Chưa rõ'}, mã: ${sysMatch.id})`);
        }
        const batchMatch = findBatchDuplicateCCCD(clean, employee.id, employees);
        if (batchMatch) {
          messages.push(`Trùng CCCD (${clean}) với Nhân viên ${batchMatch.index + 1} (${batchMatch.employee.hoVaTen || 'Chưa đặt tên'}) trong cùng đợt tải`);
        }
      }
    }
    if (employee.canh_bao_sai_lech) messages.push(`⚠️ Đối soát chéo: ${employee.canh_bao_sai_lech}`);
    return [...messages, ...(employee.cauHoiLamRo || [])];
  };
  const incompleteCount = employees.filter(employee => issues(employee).length > 0).length;
  const visibleEmployees = employees.filter(employee =>
    normalize(`${employee.hoVaTen} ${employee.soCCCD} ${employee.soDienThoai}`).includes(normalize(query.trim())) &&
    (!onlyIncomplete || issues(employee).length > 0)
  );
  const inputClass = 'w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Bảng đối chiếu nhân viên">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Users className="h-4 w-4 text-blue-600" />{employees.length} nhân viên <span className="text-xs font-normal text-amber-700">• {incompleteCount} cần kiểm tra</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Tìm nhân viên" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên, CCCD, điện thoại" className="w-48 text-xs outline-none" /></label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={onlyIncomplete} onChange={event => setOnlyIncomplete(event.target.checked)} />Chỉ hiện hồ sơ cần kiểm tra</label>
        </div>
      </div>
      <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">Mỗi dòng là một nhân viên. Chỉnh sửa trực tiếp trong ô; cuộn ngang để xem đầy đủ các cột.</p>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[1400px] border-separate border-spacing-0 text-left text-xs" aria-label="Thông tin nhân viên Bước 2">
          <thead className="sticky top-0 z-20 bg-blue-50 text-blue-950">
            <tr>{['STT', 'Họ và tên', 'Thông tin cá nhân', 'Dân tộc', 'Giấy tờ CCCD', 'Liên hệ / Địa chỉ', 'Gia đình / Ghi chú'].map((title, index) => <th key={title} scope="col" className={`border-b border-blue-200 px-3 py-3 ${index === 1 ? 'sticky left-0 z-30 min-w-56 bg-blue-50' : ''}`}>{title}</th>)}</tr>
          </thead>
          <tbody>
            {visibleEmployees.map(employee => {
              const index = employees.findIndex(item => item.id === employee.id);
              const rowIssues = issues(employee);
              const field = (key: keyof BatchEmployeeDraft, label: string, placeholder = label) => (
                <label className="block space-y-1"><span className="text-[10px] text-slate-500">{label}</span><input aria-label={`${label} nhân viên ${index + 1}`} value={String(employee[key] || '')} placeholder={placeholder} onChange={event => onChange(employee.id, { [key]: key === 'hoVaTen' ? event.target.value.toUpperCase() : event.target.value })} className={inputClass} /></label>
              );
              return <tr key={employee.id} className="align-top">
                <td className="border-b border-slate-200 p-3 font-mono text-slate-400">{index + 1}</td>
                <td className="sticky left-0 z-10 min-w-56 border-b border-r border-slate-200 bg-white p-3">
                  {field('hoVaTen', 'Họ và tên')}
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${rowIssues.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{rowIssues.length ? <><AlertTriangle className="h-3 w-3" />Cần kiểm tra</> : 'Đủ thông tin cơ bản'}</span>
                  {rowIssues.length > 0 && <details className="mt-2 text-[11px] text-amber-800"><summary className="cursor-pointer">Xem {rowIssues.length} lưu ý</summary><ul className="mt-1 space-y-1 pl-3 list-disc">{rowIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details>}
                </td>
                <td className="min-w-40 space-y-2 border-b border-slate-200 p-3">
                  {field('ngaySinh', 'Ngày sinh', 'DD/MM/YYYY')}
                  {field('tinhTrangHonNhan', 'Tình trạng hôn nhân', 'AI trích xuất hoặc nhập bổ sung')}
                  <label className="block space-y-1"><span className="text-[10px] text-slate-500">Giới tính</span><select aria-label={`Giới tính nhân viên ${index + 1}`} value={employee.gioiTinh} onChange={event => onChange(employee.id, {gioiTinh:event.target.value})} className={inputClass}><option value="">Chưa rõ</option>{['Nam','Nữ','Khác'].map(value => <option key={value}>{value}</option>)}</select></label>
                </td>
                <td className="min-w-32 border-b border-slate-200 p-3">{field('danToc','Dân tộc','OCR trích xuất hoặc nhập bổ sung')}</td>
                <td className="min-w-56 space-y-2 border-b border-slate-200 p-3">
                  {field('soCCCD','Số CCCD')}
                  {(() => {
                    const clean = normalizeCCCD(employee.soCCCD);
                    if (clean.length < 9) return null;
                    const sys = findSystemDuplicateCCCD(clean, existingRecords);
                    if (sys) {
                      return (
                        <div className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-[11px] text-rose-900 shadow-2xs space-y-1">
                          <div className="font-bold flex items-center gap-1 text-rose-700">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Đã tồn tại trong hệ thống!</span>
                          </div>
                          <div>👤 <strong>{sys.hoVaTen}</strong></div>
                          {sys.chucVu && <div className="text-[10px] text-slate-600">💼 {sys.chucVu} (Mã: {sys.id})</div>}
                        </div>
                      );
                    }
                    const batch = findBatchDuplicateCCCD(clean, employee.id, employees);
                    if (batch) {
                      return (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 shadow-2xs space-y-1">
                          <div className="font-bold flex items-center gap-1 text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Trùng với NV {batch.index + 1}!</span>
                          </div>
                          <div>👤 <strong>{batch.employee.hoVaTen || 'Chưa đặt tên'}</strong></div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {field('ngayCap','Ngày cấp','DD/MM/YYYY')}
                  {field('ngayHetHanCCCD','Ngày hết hạn CCCD','DD/MM/YYYY hoặc Không thời hạn')}
                  {field('noiCap','Nơi cấp')}
                </td>
                <td className="min-w-64 space-y-2 border-b border-slate-200 p-3">{field('soDienThoai','Số điện thoại')}{field('queQuan','Quê quán')}{field('diaChiThuongTru','Địa chỉ thường trú')}</td>
                <td className="min-w-64 space-y-2 border-b border-slate-200 p-3">
                  {field('ghiChu','Ghi chú hồ sơ')}
                  <HouseholdMembersEditor members={employee.thanhVienHoGiaDinh || []} onChange={members => onChange(employee.id,{thanhVienHoGiaDinh:members})} employeeNumber={index+1} permanentAddress={employee.diaChiThuongTru} />
                  <details><summary className="cursor-pointer font-semibold text-blue-700">Gia đình ({employee.thongTinGiaDinh?.length || 0})</summary>
                    <div className="mt-2 space-y-2">{(employee.thongTinGiaDinh || []).map((member, memberIndex) => <div key={memberIndex} className="space-y-1 rounded-lg bg-slate-50 p-2">
                      {(['quanHe','hoTen','namSinh','ngheNghiep'] as const).map((key, fieldIndex) => <input key={key} aria-label={`${['Quan hệ','Họ tên người thân','Năm sinh người thân','Nghề nghiệp'][fieldIndex]} ${memberIndex + 1} nhân viên ${index + 1}`} placeholder={['Quan hệ','Họ tên người thân','Năm sinh','Nghề nghiệp'][fieldIndex]} value={member[key] || ''} onChange={event => onChange(employee.id,{thongTinGiaDinh:(employee.thongTinGiaDinh || []).map((item,i) => i === memberIndex ? {...item,[key]:event.target.value} : item)})} className={inputClass} />)}
                      <button type="button" aria-label={`Xóa người thân ${memberIndex + 1} nhân viên ${index + 1}`} onClick={() => onChange(employee.id,{thongTinGiaDinh:employee.thongTinGiaDinh?.filter((_,i) => i !== memberIndex)})} className="text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>)}<button type="button" onClick={() => onChange(employee.id,{thongTinGiaDinh:[...(employee.thongTinGiaDinh || []),{quanHe:'',hoTen:''}]})} className="inline-flex items-center gap-1 text-blue-700"><Plus className="h-3 w-3" />Thêm người thân</button></div>
                  </details>
                </td>
              </tr>;
            })}
            {!visibleEmployees.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Không có nhân viên phù hợp với bộ lọc.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 px-3 py-2 text-xs text-slate-500" aria-live="polite">Hiển thị {visibleEmployees.length} / {employees.length} nhân viên</div>
    </section>
  );
}
