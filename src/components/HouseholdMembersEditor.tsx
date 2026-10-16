import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ThanhVienHoGiaDinh } from '../types';

const fields: [keyof ThanhVienHoGiaDinh,string][] = [
  ['hoTen','Họ và tên'],['ngaySinh','Ngày tháng năm sinh'],['quanHeVoiChuHo','Mối quan hệ với chủ hộ'],
  ['gioiTinh','Giới tính'],['diaChiThuongTru','Địa chỉ thường trú thành viên'],['quocTich','Quốc tịch'],['danToc','Dân tộc'],
];
export function HouseholdMembersEditor({members,onChange,employeeNumber,permanentAddress}: {
  members:ThanhVienHoGiaDinh[];onChange:(members:ThanhVienHoGiaDinh[]) => void;employeeNumber:number;permanentAddress:string;
}) {
  return <details className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-2">
    <summary className="cursor-pointer font-semibold text-indigo-800">Hộ gia đình VNeID ({members.length})</summary>
    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Kiểm tra theo VNeID, quan hệ với chủ hộ. Nơi cấp giấy khai sinh khi xuất lấy từ thường trú của thành viên; nếu trống lấy thường trú nhân viên. Không tự điền quốc tịch/dân tộc khi chưa rõ.</p>
    <div className="mt-2 space-y-3">{members.map((member,index) => <fieldset key={index} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
      <legend className="px-1 text-xs font-semibold text-indigo-800">Thành viên {index+1}</legend>
      {fields.map(([key,label]) => <label key={key} className="block space-y-1"><span className="text-[10px] text-slate-500">{label}</span>
        <input aria-label={`${label} hộ gia đình ${index+1} nhân viên ${employeeNumber}`} value={member[key] || ''}
          placeholder={key === 'ngaySinh' ? 'DD/MM/YYYY; chỉ có năm thì giữ nguyên năm' : key === 'diaChiThuongTru' ? permanentAddress || 'Chưa có địa chỉ thường trú' : label}
          onChange={event => onChange(members.map((item,i) => i === index ? {...item,[key]:event.target.value} : item))}
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
      </label>)}
      <button type="button" aria-label={`Xóa thành viên hộ gia đình ${index+1} nhân viên ${employeeNumber}`} onClick={() => onChange(members.filter((_,i) => i !== index))} className="inline-flex items-center gap-1 text-xs text-rose-700"><Trash2 className="h-3.5 w-3.5" />Bỏ thành viên</button>
    </fieldset>)}</div>
    <button type="button" onClick={() => onChange([...members,{hoTen:'',ngaySinh:'',quanHeVoiChuHo:'',gioiTinh:'',diaChiThuongTru:'',quocTich:'',danToc:''}])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700"><Plus className="h-3.5 w-3.5" />Thêm thành viên hộ gia đình</button>
  </details>;
}
