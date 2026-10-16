import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { createHouseholdWorkbook, HOUSEHOLD_HEADERS } from '../src/utils/householdExport.js';
import { normalizeHouseholdMembers } from '../src/utils/household.js';

const member = (updates:Record<string,string> = {}) => ({hoTen:'NGUYỄN VĂN MẪU',ngaySinh:'02/03/2014',quanHeVoiChuHo:'Con',gioiTinh:'Nam',diaChiThuongTru:'',quocTich:'',danToc:'',...updates});
test('household appendix has exactly eight template columns and separate employee sheets',async () => {
  const workbook = createHouseholdWorkbook([
    {hoVaTen:'NHÂN VIÊN / A',diaChiThuongTru:'ĐỊA CHỈ THƯỜNG TRÚ A',thanhVienHoGiaDinh:[member(),member({hoTen:'NGƯỜI MẪU B',ngaySinh:'1980',diaChiThuongTru:'THƯỜNG TRÚ THÀNH VIÊN B',quocTich:'Việt Nam',danToc:'Kinh',quanHeVoiChuHo:'Chủ hộ'})]},
    {hoVaTen:'NHÂN VIÊN / A',diaChiThuongTru:'THƯỜNG TRÚ C',thanhVienHoGiaDinh:[member({hoTen:'THÀNH VIÊN HỘ KHÁC',ngaySinh:'2012-05-16'})]},
    {hoVaTen:'CHƯA CÓ VNeID',diaChiThuongTru:''},
  ]);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(restored.worksheets.length,3);
  const [first,second,empty] = restored.worksheets;
  assert.deepEqual((first.getRow(1).values as ExcelJS.CellValue[]).slice(1),HOUSEHOLD_HEADERS);
  assert.equal(first.columnCount,8);
  assert.equal(first.getCell('F2').value,'ĐỊA CHỈ THƯỜNG TRÚ A');
  assert.equal(first.getCell('F3').value,'THƯỜNG TRÚ THÀNH VIÊN B');
  assert.equal((first.getCell('C2').value as Date).toISOString(),'2014-03-02T00:00:00.000Z');
  assert.equal(first.getCell('C2').numFmt,'dd/mm/yyyy');
  assert.equal(first.getCell('C3').value,'1980','a birth year must not become a fabricated full date');
  assert.equal(first.getCell('D2').value,'Con');
  assert.equal(first.getCell('G2').value ?? '','');
  assert.equal(first.getCell('H2').value ?? '','');
  assert.equal(second.getCell('A2').value,1,'numbering restarts for each household');
  assert.equal(second.getCell('B2').value,'THÀNH VIÊN HỘ KHÁC');
  assert.equal(empty.rowCount,2,'missing household produces only the blank template');
  assert.equal(empty.getCell('B2').value ?? '','');
  assert.notEqual(first.name,second.name);
  assert.ok(first.name.length<=31 && !first.name.includes('/'));
  assert.equal(first.getCell('A1').font.name,'Times New Roman');
  assert.equal(first.getCell('A1').fill.type,'pattern');
  assert.equal(first.getCell('A1').border.bottom.style,'thin');
});

test('normalization never reuses SYLL relatives or invents missing household data',() => {
  assert.deepEqual(normalizeHouseholdMembers(undefined),[]);
  assert.deepEqual(normalizeHouseholdMembers([{},null,[],{image:'PRIVATE_IMAGE'}]),[]);
  const cleaned = normalizeHouseholdMembers([{...member({hoTen:'  TÊN MẪU  '}),image:'PRIVATE_IMAGE',base64Data:'PRIVATE',quanHe:'Vợ'}]);
  assert.equal(cleaned[0].hoTen,'TÊN MẪU');
  assert.equal(cleaned[0].quanHeVoiChuHo,'Con');
  assert.doesNotMatch(JSON.stringify(cleaned),/PRIVATE|base64|image|quanHe"/);
  const missing = normalizeHouseholdMembers([member({quocTich:'[KHONG HIEN THI]',danToc:'Chưa rõ',ngaySinh:'N/A'})]);
  assert.equal(missing[0].quocTich,'');assert.equal(missing[0].danToc,'');assert.equal(missing[0].ngaySinh,'');
  const sheet = createHouseholdWorkbook([{hoVaTen:'MẪU',diaChiThuongTru:'',thanhVienHoGiaDinh:[member({ngaySinh:'31/02/2014',hoTen:'=1+1'})]}]).worksheets[0];
  assert.equal(sheet.getCell('C2').value,'31/02/2014','invalid dates are not silently corrected');
  assert.equal(sheet.getCell('B2').type,ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('F2').value ?? '','');
});
