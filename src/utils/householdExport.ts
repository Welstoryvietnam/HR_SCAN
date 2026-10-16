import ExcelJS from 'exceljs';
import type { NhanSuRecord } from '../types';
import { normalizeHouseholdMembers } from './household';

export const HOUSEHOLD_HEADERS = ['STT','Họ và tên','Ngày tháng năm sinh','Mối quan hệ\nvới chủ hộ','Giới tính','Nơi cấp giấy khai sinh','Quốc Tịch','Dân Tộc'];
type HouseholdEmployee = Pick<NhanSuRecord,'hoVaTen'|'diaChiThuongTru'|'thanhVienHoGiaDinh'>;
function excelBirthDate(raw:string): Date|string {
  const value = raw.trim();
  const vietnam = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!vietnam && !iso) return value;
  const [year,month,day] = vietnam ? [Number(vietnam[3]),Number(vietnam[2]),Number(vietnam[1])] : [Number(iso![1]),Number(iso![2]),Number(iso![3])];
  const date = new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month-1 && date.getUTCDate() === day ? date : value;
}

export function createHouseholdWorkbook(employees:HouseholdEmployee[]) {
  if (!employees.length) throw new Error('Chưa có nhân viên để xuất phụ lục hộ gia đình.');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Scan';
  employees.forEach((employee,index) => {
    const label = employee.hoVaTen.replace(/[\[\]:*?/\\\u0000-\u001f']/g,' ').trim() || 'Nhan vien';
    const name = `${index+1}_${label}`.slice(0,31).trim();
    const sheet = workbook.addWorksheet(name,{views:[{state:'frozen',ySplit:1,showGridLines:false}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:1'}});
    [9,24,28,22,15,73,17,14].forEach((width,i) => {sheet.getColumn(i+1).width=width;});
    const header = sheet.addRow(HOUSEHOLD_HEADERS);
    header.height=42;
    header.eachCell(cell => {
      cell.font={name:'Times New Roman',size:14,bold:true,color:{argb:'FF000000'}};
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC0D8EC'}};
      cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};
    });
    const members = normalizeHouseholdMembers(employee.thanhVienHoGiaDinh);
    members.forEach((member,i) => {
      // The user's required mapping is a permanent address, never birthplace,
      // hometown, temporary residence or the CCCD issuing authority.
      const address = member.diaChiThuongTru || employee.diaChiThuongTru?.trim() || '';
      const row = sheet.addRow([i+1,member.hoTen,excelBirthDate(member.ngaySinh),member.quanHeVoiChuHo,member.gioiTinh,address,member.quocTich,member.danToc]);
      row.height=Math.max(28,Math.ceil(address.length/70)*17,Math.ceil(member.hoTen.length/24)*17,Math.ceil(member.quanHeVoiChuHo.length/20)*17);
      row.eachCell({includeEmpty:true},(cell,column) => {
        cell.font={name:'Times New Roman',size:12,color:{argb:'FF000000'}};
        cell.alignment={vertical:'middle',horizontal:[1,3,4,5,7,8].includes(column) ? 'center' : 'left',wrapText:true};
        cell.numFmt=column === 3 && cell.value instanceof Date ? 'dd/mm/yyyy' : column === 1 ? '0' : '@';
      });
    });
    if (!members.length) {sheet.addRow(['','','','','','','','']).height=28;}
    for (let row=1;row<=sheet.rowCount;row++) for (let column=1;column<=8;column++) sheet.getCell(row,column).border={
      top:{style:'thin',color:{argb:'FF000000'}},bottom:{style:'thin',color:{argb:'FF000000'}},left:{style:'thin',color:{argb:'FF000000'}},right:{style:'thin',color:{argb:'FF000000'}},
    };
    sheet.pageSetup.printArea=`A1:H${sheet.rowCount}`;
    sheet.pageSetup.margins={left:0.25,right:0.25,top:0.35,bottom:0.35,header:0.1,footer:0.1};
  });
  return workbook;
}

export async function exportHouseholdAppendix(employees:HouseholdEmployee[]) {
  const workbook = createHouseholdWorkbook(employees);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href=url;anchor.download=`Phu_Luc_Ho_Gia_Dinh_${employees.length}_Nhan_Vien.xlsx`;
  document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
