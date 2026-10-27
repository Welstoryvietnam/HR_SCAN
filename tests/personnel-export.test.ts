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

test('Mẫu Biến Động Nhân Sự chuẩn 44 cột khớp chính xác với file mẫu đính kèm', async () => {
  const { BIEN_DONG_NHAN_SU_COLUMNS, buildBienDongNhanSuWorkbook, generateBienDongNhanSuCSV, getBienDongRowValues } = await import('../src/utils/excelExport.js');
  const { readFileSync } = await import('node:fs');

  assert.equal(BIEN_DONG_NHAN_SU_COLUMNS.length, 44);

  // Đối chiếu với file mẫu attachment
  const sampleTemplate = readFileSync('public/assets/aistudio/M_u_bi_n___ng_nh_n_s__2e164f1e', 'utf-8');
  assert.ok(sampleTemplate.startsWith('STT,Tình trạng hồ sơ,Phòng,Tình trạng hồ sơ,Họ và tên,Ngày vào,'));

  const sampleRecord = {
    id: 'NV001',
    hoVaTen: 'NGUYỄN VĂN MẪU',
    soCCCD: '001095012345',
    ngaySinh: '15/06/1995',
    gioiTinh: 'Nam',
    ngayCap: '10/05/2021',
    noiCap: 'Cục Cảnh sát QLHC về TTXH',
    queQuan: 'Hà Nội',
    diaChiThuongTru: 'Số 10 Phố Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    diaChiTamTru: 'Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
    nguonDiaChi: 'VNeID',
    soDienThoai: '0901234567',
    emailCaNhan: 'nguyenvanmau@gmail.com',
    congViecDuKien: 'Đầu Bếp',
    chucVu: 'Bếp Trưởng',
    phong: 'Bếp FPT Tower',
    tinhTrangHoSo: 'Đủ hồ sơ',
    ngayVaoLam: '2026-11-01',
    ngayHetHanCCCD: '15/06/2035',
    danToc: 'Kinh',
    tinhTrangHonNhan: 'Đã kết hôn',
    luongCoBan: 7683000,
    phuCapChucVu: 1500000,
    troCapDacThuFPT: 500000,
    phuCapMoiTruong: 200000,
    phuCapDienThoai: 200000,
    phuCapXangXe: 300000,
    thuongNangLucAM: 0,
    phuCapKinhDoanh: 0,
    phuCapNangLuc: 400000,
    troCapTayNghe: 500000,
    troCapGiaDinh: 150000,
    phuCapLuuDong: 0,
    tongThuNhapDuKien: 11433000,
    thongTinGiaDinh: [],
    thanhVienHoGiaDinh: [],
    soTaiLieuDinhKem: 2,
    trangThaiEmail: 'Đã gửi',
    timestamp: new Date().toISOString(),
    userEmail: 'tuyendung@congty.com',
  } as NhanSuRecord;

  const rowValues = getBienDongRowValues(sampleRecord, 0);
  assert.equal(rowValues.length, 44);
  assert.equal(rowValues[0], 1); // STT
  assert.equal(rowValues[1], 'Đủ hồ sơ'); // Tình trạng hồ sơ
  assert.equal(rowValues[2], 'Bếp FPT Tower'); // Phòng
  assert.equal(rowValues[4], 'NGUYỄN VĂN MẪU'); // Họ và tên
  assert.equal(rowValues[5], '2026-11-01'); // Ngày vào
  assert.equal(rowValues[7], 'Hà Nội'); // Quê quán VNeID
  assert.equal(rowValues[8], 'Số 10 Phố Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội'); // Thường trú
  assert.equal(rowValues[10], '0901234567'); // Điện thoại
  assert.equal(rowValues[12], '001095012345'); // CCCD
  assert.equal(rowValues[17], 'Đầu Bếp'); // Công việc
  assert.equal(rowValues[18], 'Bếp Trưởng'); // Chức vụ
  assert.equal(rowValues[30], '15/06/2035'); // Note (Ngày hết hạn CCCD)
  assert.equal(rowValues[31], 7683000); // Lương Cơ bản
  assert.equal(rowValues[32], 1500000); // Trợ cấp chức vụ
  assert.equal(rowValues[33], 500000); // Trợ cấp đặc thù (FPT)
  assert.equal(rowValues[43], 11433000); // Tổng lương

  // Kiểm tra tạo file Excel hợp lệ
  const workbook = await buildBienDongNhanSuWorkbook([sampleRecord]);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = restored.getWorksheet('Bien_Dong_Nhan_Su')!;
  assert.equal(sheet.rowCount, 2);
  assert.equal(sheet.getCell('A1').value, 'STT');
  assert.equal(sheet.getCell('AR1').value, 'Tổng lương'); // Cột 44 là AR
  assert.equal(sheet.getCell('E2').value, 'NGUYỄN VĂN MẪU');
  assert.equal(sheet.getCell('AR2').value, 11433000);

  // Kiểm tra tạo CSV có UTF-8 BOM và đầy đủ 44 cột
  const csv = generateBienDongNhanSuCSV([sampleRecord]);
  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.trim().split('\n');
  assert.ok(lines.length >= 2);
});
