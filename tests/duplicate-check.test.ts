import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeCCCD,
  isValidCCCDFormat,
  extractPotentialCCCDs,
  findSystemDuplicateCCCD,
  findBatchDuplicateCCCD,
  checkGroupDuplicateCCCD,
} from '../src/utils/duplicateCheck.js';
import type { NhanSuRecord, EmployeeDocumentGroup, BatchEmployeeDraft } from '../src/types.js';

test('normalizeCCCD & isValidCCCDFormat chuẩn hóa số CCCD chính xác', () => {
  assert.equal(normalizeCCCD(' 001 095 012 345 '), '001095012345');
  assert.equal(normalizeCCCD('CCCD: 036098001234'), '036098001234');
  assert.equal(normalizeCCCD(''), '');
  assert.equal(normalizeCCCD(null), '');

  assert.equal(isValidCCCDFormat('001095012345'), true);
  assert.equal(isValidCCCDFormat('012345678'), true);
  assert.equal(isValidCCCDFormat('12345'), false);
  assert.equal(isValidCCCDFormat('0010950123456'), false);
});

test('extractPotentialCCCDs bóc tách số CCCD từ tên file hoặc nhãn nhóm ngay khi chọn file', () => {
  const fromFilename1 = extractPotentialCCCDs('001095012345_cccd_mat_truoc.jpg');
  assert.deepEqual(fromFilename1, ['001095012345']);

  const fromFilename2 = extractPotentialCCCDs('Scan_CCCD_036098001234_NguyenVanA.pdf');
  assert.deepEqual(fromFilename2, ['036098001234']);

  const fromFilename3 = extractPotentialCCCDs('cmnd_012345678_mat_sau.png');
  assert.deepEqual(fromFilename3, ['012345678']);

  const noCCCD = extractPotentialCCCDs('avatar_profile_image.jpg');
  assert.deepEqual(noCCCD, []);
});

test('findSystemDuplicateCCCD đối chiếu số CCCD với danh sách NhanSuRecord đã lưu', () => {
  const existingRecords: NhanSuRecord[] = [
    {
      id: 'NS_001',
      timestamp: '2026-03-01T10:00:00Z',
      userEmail: 'hr@example.com',
      hoVaTen: 'NGUYỄN VĂN AN',
      soCCCD: '001 095 012 345',
      ngaySinh: '15/06/1995',
      gioiTinh: 'Nam',
      chucVu: 'Bếp Trưởng',
      congViecDuKien: 'Đầu Bếp',
      khoi: 'FS MANAGEMENT',
      ban: 'FS1',
      phong: 'FPT TOWER',
      ngayCap: '10/05/2021',
      noiCap: 'Cục Cảnh sát',
      queQuan: 'Hà Nội',
      diaChiThuongTru: 'Hà Nội',
      soDienThoai: '0901234567',
      thongTinGiaDinh: [],
      luongCoBan: 7683000,
      phuCapCoDinh: 1500000,
      phuCapPhatSinh: 0,
      tongThuNhapDuKien: 9183000,
      soTaiLieuDinhKem: 2,
      trangThaiEmail: 'Đã gửi',
    },
  ];

  // Khớp chính xác dù có khoảng trắng
  const found = findSystemDuplicateCCCD('001095012345', existingRecords);
  assert.ok(found);
  assert.equal(found?.id, 'NS_001');
  assert.equal(found?.hoVaTen, 'NGUYỄN VĂN AN');

  // Không khớp với số khác
  const notFound = findSystemDuplicateCCCD('036098009999', existingRecords);
  assert.equal(notFound, undefined);
});

test('checkGroupDuplicateCCCD phát hiện trùng lặp ngay khi chọn file (qua tên file)', () => {
  const existingRecords: NhanSuRecord[] = [
    {
      id: 'NS_002',
      timestamp: '2026-03-02T10:00:00Z',
      userEmail: 'hr@example.com',
      hoVaTen: 'TRẦN THỊ BÍCH',
      soCCCD: '036098001234',
      ngaySinh: '20/08/1998',
      gioiTinh: 'Nữ',
      chucVu: 'Nhân viên Phục Vụ',
      congViecDuKien: 'Bán Hàng',
      khoi: 'FS MANAGEMENT',
      ban: 'FS1',
      phong: 'FPT TOWER',
      ngayCap: '15/07/2022',
      noiCap: 'Cục Cảnh sát',
      queQuan: 'Nam Định',
      diaChiThuongTru: 'Nam Định',
      soDienThoai: '0912345678',
      thongTinGiaDinh: [],
      luongCoBan: 6000000,
      phuCapCoDinh: 500000,
      phuCapPhatSinh: 0,
      tongThuNhapDuKien: 6500000,
      soTaiLieuDinhKem: 1,
      trangThaiEmail: 'Đã gửi',
    },
  ];

  // Người dùng vừa chọn file có tên chứa CCCD 036098001234, chưa chạy OCR
  const group: EmployeeDocumentGroup = {
    id: 'grp-01',
    label: '',
    documents: [
      {
        id: 'doc-01',
        fileName: '036098001234_mat_truoc_cccd.jpg',
        mimeType: 'image/jpeg',
        base64Data: 'dummy',
        docType: 'cccd_truoc',
        dataUrl: '',
        width: 800,
        height: 600,
        originalSize: 1024,
        compressedSize: 1024,
      },
    ],
  };

  const result = checkGroupDuplicateCCCD(group, undefined, existingRecords, [group], []);
  assert.ok(result);
  assert.equal(result?.isDuplicate, true);
  assert.equal(result?.duplicateType, 'system');
  assert.equal(result?.detectionSource, 'filename');
  assert.equal(result?.detectedCCCD, '036098001234');
  assert.equal(result?.matchedRecord?.hoVaTen, 'TRẦN THỊ BÍCH');
});

test('checkGroupDuplicateCCCD phát hiện trùng lặp sau khi OCR trích xuất được số CCCD', () => {
  const existingRecords: NhanSuRecord[] = [
    {
      id: 'NS_003',
      timestamp: '2026-03-03T10:00:00Z',
      userEmail: 'hr@example.com',
      hoVaTen: 'LÊ VĂN CƯỜNG',
      soCCCD: '001090005678',
      ngaySinh: '10/10/1990',
      gioiTinh: 'Nam',
      chucVu: 'Bếp Trưởng',
      congViecDuKien: 'Đầu Bếp',
      khoi: 'FS MANAGEMENT',
      ban: 'FS1',
      phong: 'FPT TOWER',
      ngayCap: '12/03/2021',
      noiCap: 'Cục Cảnh sát',
      queQuan: 'Hà Nội',
      diaChiThuongTru: 'Hà Nội',
      soDienThoai: '0987654321',
      thongTinGiaDinh: [],
      luongCoBan: 7683000,
      phuCapCoDinh: 1500000,
      phuCapPhatSinh: 0,
      tongThuNhapDuKien: 9183000,
      soTaiLieuDinhKem: 2,
      trangThaiEmail: 'Đã gửi',
    },
  ];

  const group: EmployeeDocumentGroup = {
    id: 'grp-02',
    label: 'Lê Văn Cường',
    documents: [
      {
        id: 'doc-02',
        fileName: 'image_scan.jpg', // Tên tệp không chứa số CCCD
        mimeType: 'image/jpeg',
        base64Data: 'dummy',
        docType: 'cccd_truoc',
        dataUrl: '',
        width: 800,
        height: 600,
        originalSize: 1024,
        compressedSize: 1024,
      },
    ],
  };

  // Sau khi OCR bóc tách, kết quả trả về soCCCD: '001090005678'
  const employeeDraft: BatchEmployeeDraft = {
    id: 'grp-02',
    hoVaTen: 'LÊ VĂN CƯỜNG',
    soCCCD: '001090005678',
    ngaySinh: '10/10/1990',
    gioiTinh: 'Nam',
    queQuan: 'Hà Nội',
    diaChiThuongTru: 'Hà Nội',
    soDienThoai: '0987654321',
    extractionStatus: 'success',
  };

  const result = checkGroupDuplicateCCCD(
    group,
    employeeDraft,
    existingRecords,
    [group],
    [employeeDraft]
  );

  assert.ok(result);
  assert.equal(result?.isDuplicate, true);
  assert.equal(result?.duplicateType, 'system');
  assert.equal(result?.detectionSource, 'ocr');
  assert.equal(result?.detectedCCCD, '001090005678');
  assert.equal(result?.matchedRecord?.hoVaTen, 'LÊ VĂN CƯỜNG');
});

test('checkGroupDuplicateCCCD phát hiện trùng lặp giữa 2 nhân viên trong cùng đợt tải', () => {
  const groups: EmployeeDocumentGroup[] = [
    {
      id: 'grp-A',
      label: 'Nhân viên 1',
      documents: [],
    },
    {
      id: 'grp-B',
      label: 'Nhân viên 2',
      documents: [],
    },
  ];

  const drafts: BatchEmployeeDraft[] = [
    {
      id: 'grp-A',
      hoVaTen: 'NGUYỄN VĂN A',
      soCCCD: '001202008888',
      ngaySinh: '01/01/2000',
      gioiTinh: 'Nam',
      queQuan: 'Hà Nội',
      diaChiThuongTru: 'Hà Nội',
      soDienThoai: '0901111111',
      extractionStatus: 'success',
    },
    {
      id: 'grp-B',
      hoVaTen: 'NGUYỄN VĂN B',
      soCCCD: '001202008888', // Trùng số CCCD với A
      ngaySinh: '02/02/2000',
      gioiTinh: 'Nam',
      queQuan: 'Hà Nam',
      diaChiThuongTru: 'Hà Nam',
      soDienThoai: '0902222222',
      extractionStatus: 'success',
    },
  ];

  const result = checkGroupDuplicateCCCD(groups[1], drafts[1], [], groups, drafts);
  assert.ok(result);
  assert.equal(result?.isDuplicate, true);
  assert.equal(result?.duplicateType, 'batch');
  assert.equal(result?.matchedBatchIndex, 0);
  assert.equal(result?.matchedBatchEmployee?.hoVaTen, 'NGUYỄN VĂN A');
});
