import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { addPersonnelSupplement, HR_43_COLUMNS } from '../src/utils/excelExport.js';
import type { NhanSuRecord } from '../src/types.js';

test('new personnel fields and competency allowance survive XLSX serialization',async () => {
  const record = {id:'TEST_EXPORT',hoVaTen:'TEST ONLY',tinhTrangHonNhan:'Đã kết hôn',ngayHetHanCCCD:'Không thời hạn',thamQuyen:'Giám sát trưởng',phuCapNangLuc:350000,phuCapCoDinh:0,phuCapPhatSinh:0} as NhanSuRecord;
  assert.equal(HR_43_COLUMNS.length,43);
  assert.equal(HR_43_COLUMNS.find(column => column.id === 'tongPhuCap')?.getValue(record,0),350000);
  const book = new ExcelJS.Workbook();
  addPersonnelSupplement(book,[record]);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await book.xlsx.writeBuffer());
  const sheet = restored.getWorksheet('Thong_Tin_Bo_Sung')!;
  assert.equal(sheet.getCell('C2').value,'Đã kết hôn');
  assert.equal(sheet.getCell('D2').value,'Không thời hạn');
  assert.equal(sheet.getCell('E2').value,'Giám sát trưởng');
  assert.equal(sheet.getCell('F2').value,350000);
});
