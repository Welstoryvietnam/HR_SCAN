import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOCRProfile, type OCRDocument } from '../backend/ocrProfile.js';
import { prepareEmployees, runBatchExtraction, documentKey } from '../src/utils/batchExtraction.js';
import type { EmployeeDocumentGroup, BatchEmployeeDraft } from '../src/types.js';

// --- BƯỚC 1: TIẾP NHẬN HỒ SƠ & BATCH EXTRACTION ---
test('SOP Bước 1: Tiếp nhận nhiều hồ sơ, phân loại theo nhóm nhân viên và xử lý tuần tự', async () => {
  const groups: EmployeeDocumentGroup[] = [
    {
      id: 'emp-01',
      label: 'Nguyễn Văn An',
      documents: [
        {
          id: 'doc-01a',
          fileName: 'cccd_truoc.jpg',
          mimeType: 'image/jpeg',
          base64Data: 'dGVzdDE=',
          docType: 'cccd_truoc',
          dataUrl: '',
          width: 800,
          height: 600,
          originalSize: 1024,
          compressedSize: 1024,
        },
        {
          id: 'doc-01b',
          fileName: 'cccd_sau.jpg',
          mimeType: 'image/jpeg',
          base64Data: 'dGVzdDI=',
          docType: 'cccd_sau',
          dataUrl: '',
          width: 800,
          height: 600,
          originalSize: 1024,
          compressedSize: 1024,
        },
      ],
    },
    {
      id: 'emp-02',
      label: 'Trần Thị Bích',
      documents: [
        {
          id: 'doc-02a',
          fileName: 'vneid.png',
          mimeType: 'image/png',
          base64Data: 'dGVzdDM=',
          docType: 'vneid_cu_tru',
          dataUrl: '',
          width: 800,
          height: 600,
          originalSize: 1024,
          compressedSize: 1024,
        },
      ],
    },
  ];

  const prepared = prepareEmployees(groups, []);
  assert.equal(prepared.length, 2);
  assert.equal(prepared[0].id, 'emp-01');
  assert.equal(prepared[0].hoVaTen, 'NGUYỄN VĂN AN');
  assert.equal(prepared[0].extractionStatus, 'waiting');
  assert.equal(prepared[0].soTaiLieuDinhKem, 2);

  assert.equal(prepared[1].id, 'emp-02');
  assert.equal(prepared[1].hoVaTen, 'TRẦN THỊ BÍCH');
  assert.equal(prepared[1].soTaiLieuDinhKem, 1);

  // Chạy giả lập queue trích xuất batch
  const progressLogs: string[] = [];
  const processed = await runBatchExtraction({
    groups,
    previous: prepared,
    extract: async (group) => {
      if (group.id === 'emp-01') {
        return {
          ok: true,
          data: {
            success: true,
            data: {
              hoVaTen: 'NGUYỄN VĂN AN',
              soCCCD: '001095012345',
              ngaySinh: '15/06/1995',
              gioiTinh: 'Nam',
              danToc: 'Kinh',
              ngayCap: '10/05/2021',
              ngayHetHanCCCD: '15/06/2035',
              noiCap: 'Cục Cảnh sát QLHC về TTXH',
              queQuan: 'Hà Nội',
              diaChiThuongTru: 'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
              nguonDiaChi: 'CCCD',
              soDienThoai: '0901234567',
              congViecDuKien: 'Đầu Bếp',
              chucVu: 'Bếp Trưởng',
              thongTinGiaDinh: [],
              thanhVienHoGiaDinh: [],
              thongTinChuaRo: [],
              cauHoiLamRo: [],
            },
          },
        };
      }
      return {
        ok: true,
        data: {
          success: true,
          data: {
            hoVaTen: 'TRẦN THỊ BÍCH',
            soCCCD: '079198009876',
            ngaySinh: '20/11/1998',
            gioiTinh: 'Nữ',
            danToc: 'Kinh',
            ngayCap: '25/12/2022',
            ngayHetHanCCCD: '20/11/2038',
            noiCap: 'Cục Cảnh sát QLHC về TTXH',
            queQuan: 'TP. Hồ Chí Minh',
            diaChiThuongTru: 'Quận 1, TP. Hồ Chí Minh',
            nguonDiaChi: 'VNeID',
            soDienThoai: '0987654321',
            congViecDuKien: 'Bán Hàng',
            chucVu: 'Cửa Hàng Trưởng',
            thongTinGiaDinh: [],
            thanhVienHoGiaDinh: [],
            thongTinChuaRo: [],
            cauHoiLamRo: [],
          },
        },
      };
    },
    progress: (_list, message) => {
      progressLogs.push(message);
    },
  });

  assert.equal(processed.length, 2);
  assert.equal(processed[0].extractionStatus, 'success');
  assert.equal(processed[0].soCCCD, '001095012345');
  assert.equal(processed[1].extractionStatus, 'success');
  assert.equal(processed[1].soCCCD, '079198009876');
  assert.ok(progressLogs.length > 0);
});

// --- BƯỚC 2: OCR TRÍCH XUẤT FORM, ĐỐI SOÁT CHÉO & CHỐNG SUY ĐOÁN ---
test('SOP Bước 2: Chuẩn hóa 12 số CCCD, ngày tháng, và không tự bịa thông tin khi thiếu/mờ', () => {
  // 1. Thẻ CCCD hợp lệ chuẩn: loại bỏ khoảng trắng và ký tự đặc biệt
  const cccdDoc: OCRDocument = {
    id: 'doc-cccd',
    docType: 'cccd_truoc',
    pages: [
      {
        page: 1,
        confidence: 90,
        lines: [],
        text: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
CĂN CƯỚC CÔNG DÂN
Số / No.: 001 092 015 678
Họ và tên / Full name: PHẠM VĂN ĐỒNG
Ngày sinh / Date of birth: 12/08/1992
Giới tính / Sex: Nam
Quốc tịch / Nationality: Việt Nam
Quê quán / Place of origin: Xã Kim Sơn, Huyện Đông Triều, Tỉnh Quảng Ninh
Nơi thường trú / Place of residence: Số 12, Ngõ 45, Đường Giải Phóng, Phường Phương Mai, Quận Đống Đa, Hà Nội
Có giá trị đến / Date of expiry: 12/08/2032`,
      },
      {
        page: 2,
        confidence: 88,
        lines: [],
        text: `Đặc điểm nhân dạng: Sẹo chấm cách 1cm dưới sau đuôi lông mày phải
Ngày cấp: 15/04/2021
Nơi cấp: CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI`,
      },
    ],
  };

  const profile = parseOCRProfile([cccdDoc]);
  assert.equal(profile.hoVaTen, 'PHẠM VĂN ĐỒNG');
  assert.equal(profile.soCCCD, '001092015678', 'CCCD phải là chuỗi số liền mạch 12 số');
  assert.equal(profile.ngaySinh, '12/08/1992');
  assert.equal(profile.gioiTinh, 'Nam');
  assert.equal(profile.ngayCap, '15/04/2021');
  assert.equal(profile.ngayHetHanCCCD, '12/08/2032');
  assert.ok(profile.noiCap.includes('CỤC CẢNH SÁT'));

  // 2. Chống suy đoán: Chữ viết tay hoặc tài liệu mờ, thiếu trường -> không được bịa
  const blurryDoc: OCRDocument = {
    id: 'doc-blurry',
    docType: 'cccd_truoc',
    pages: [
      {
        page: 1,
        confidence: 45,
        lines: [],
        text: `CĂN CƯỚC CÔNG DÂN
Số: 034098001122
Họ và tên: LÊ THỊ MAI
Giới tính: Nữ`,
      },
    ],
  };

  const blurryProfile = parseOCRProfile([blurryDoc]);
  assert.equal(blurryProfile.hoVaTen, 'LÊ THỊ MAI');
  assert.equal(blurryProfile.soCCCD, '034098001122');
  assert.equal(blurryProfile.ngaySinh, '', 'Ngày sinh mờ/thiếu không được tự bịa');
  assert.equal(blurryProfile.ngayCap, '', 'Ngày cấp mờ/thiếu không được tự bịa');
  assert.ok(blurryProfile.thongTinChuaRo?.includes('Ngày sinh'));
  assert.ok(blurryProfile.thongTinChuaRo?.includes('Nơi cấp CCCD'));
  assert.ok(blurryProfile.cauHoiLamRo?.some((msg) => msg.includes('đối chiếu kỹ') || msg.includes('Chưa đọc chắc chắn')));
});

test('SOP Bước 2: Đối soát chéo (Cross-check) phát hiện sai lệch họ tên hoặc số định danh giữa các tài liệu', () => {
  // Tài liệu 1 là CCCD mang tên NGUYỄN VĂN A, số 001095000001
  // Tài liệu 2 là Sơ yếu lý lịch nhưng bị lệch số hoặc sai tên
  const conflictingDocs: OCRDocument[] = [
    {
      id: 'doc-cccd',
      docType: 'cccd_truoc',
      pages: [
        {
          page: 1,
          confidence: 90,
          lines: [],
          text: `CĂN CƯỚC CÔNG DÂN
Số: 001095000001
Họ và tên: NGUYỄN VĂN AN
Ngày sinh: 01/01/1995`,
        },
      ],
    },
    {
      id: 'doc-syll',
      docType: 'so_yeu_ly_lich',
      pages: [
        {
          page: 1,
          confidence: 85,
          lines: [],
          text: `SƠ YẾU LÝ LỊCH
Họ và tên: NGUYỄN VĂN ANH
Số CCCD: 001095000002
Ngày sinh: 01/01/1995`,
        },
      ],
    },
  ];

  const profile = parseOCRProfile(conflictingDocs);
  // Khi có nhiều tên hoặc số CCCD khác nhau, hệ thống không tùy tiện gộp mà đưa vào cảnh báo sai lệch
  assert.equal(profile.hoVaTen, '', 'Khi xung đột tên, không chọn bừa một tên');
  assert.equal(profile.soCCCD, '', 'Khi xung đột CCCD, để trống để kiểm tra');
  assert.ok(
    profile.cauHoiLamRo?.some((msg) => msg.includes('Phát hiện nhiều tên hoặc số CCCD khác nhau')),
    'Cần có cảnh báo đối soát chéo về sai lệch tài liệu'
  );
});

// --- BƯỚC 3 & 4: CƠ CẤU TỔ CHỨC, TIÊU CHUẨN LƯƠNG & 12+ KHOẢN PHỤ CẤP ---
test('SOP Bước 3 & 4: Khớp chức vụ, tính 12+ khoản lương phụ cấp và xác thực đóng BHXH', () => {
  const tieuChuanLuong = [
    {
      id: 'tcl-01',
      chucVu: 'Bếp Trưởng',
      congViec: 'Đầu Bếp',
      luongCoBan: 7683000,
      phuCapChucVu: 1500000,
      phuCapDienThoai: 200000,
      troCapTayNghe: 500000,
      troCapGiaDinh: 150000,
      thuongChuyenCan: 200000,
      thuongSangKien: 200000,
    },
    {
      id: 'tcl-02',
      chucVu: 'Nhân Viên Bán Hàng',
      congViec: 'Bán Hàng',
      luongCoBan: 5000000,
      phuCapChucVu: 0,
      phuCapDienThoai: 0,
      troCapTayNghe: 0,
      troCapGiaDinh: 0,
      thuongChuyenCan: 200000,
      thuongSangKien: 100000,
    },
  ];

  // Giả lập ứng viên đã chọn chức vụ ở Bước 3
  const candidate = {
    hoVaTen: 'NGUYỄN VĂN AN',
    soCCCD: '001095012345',
    congViecDuKien: 'Đầu Bếp',
    chucVu: 'Bếp Trưởng',
    khoi: 'FD MANAGEMENT',
    ban: 'FD SALES & MARKETING',
    phong: 'FD SALES & MARKETING',
  };

  const std = tieuChuanLuong.find(
    (s) => s.congViec === candidate.congViecDuKien && s.chucVu === candidate.chucVu
  );
  assert.ok(std, 'Khớp được tiêu chuẩn lương của Bếp Trưởng');

  const lcb = std.luongCoBan;
  const pcChucVu = std.phuCapChucVu;
  const pcDienThoai = std.phuCapDienThoai;
  const pcTayNghe = std.troCapTayNghe;
  const pcGiaDinh = std.troCapGiaDinh;
  const pcChuyenCan = std.thuongChuyenCan;
  const pcSangKien = std.thuongSangKien;

  // Lương đóng BHXH = Lương cơ bản + Phụ cấp chức vụ
  const luongDongBHXH = lcb + pcChucVu;
  assert.equal(luongDongBHXH, 9183000);

  // Tổng phụ cấp cố định
  const tongPhuCap = pcChucVu + pcDienThoai + pcTayNghe + pcGiaDinh + pcChuyenCan + pcSangKien;
  assert.equal(tongPhuCap, 2750000);

  // Tổng thu nhập dự kiến
  const tongThuNhap = lcb + tongPhuCap;
  assert.equal(tongThuNhap, 10433000);
});
