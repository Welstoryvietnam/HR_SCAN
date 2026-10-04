/**
 * Dữ liệu tài liệu mẫu tổng hợp (Synthetic Demo Documents) cho 3 người khác nhau:
 * 1. NGUYỄN VĂN AN (Hà Nội - Đầu Bếp / Bếp Trưởng)
 * 2. TRẦN THỊ MAI HOA (Hải Dương / Hà Nội - Bán Hàng / Cửa Hàng Trưởng)
 * 3. LÊ HOÀNG NAM (TP. Hồ Chí Minh - Kỹ Thuật / Trưởng Nhóm Kỹ Thuật)
 */

import { OptimizedImageFile, BatchEmployeeDraft } from '../types';

export interface SamplePersonConfig {
  id: string;
  hoVaTen: string;
  ngaySinh: string;
  gioiTinh: 'Nam' | 'Nữ';
  soCCCD: string;
  ngayCap: string;
  noiCap: string;
  queQuan: string;
  diaChiThuongTru: string;
  soDienThoai: string;
  congViecDuKien: string;
  chucVu: string;
  khoi: string;
  ban: string;
  phong: string;
  diemLamViec: string;
  loaiHopDong: string;
  luongCoBan: number;
  giaDinh: { quanHe: string; hoTen: string; namSinh: string; ngheNghiep: string }[];
}

export const SAMPLE_PERSONS: SamplePersonConfig[] = [
  {
    id: 'sample_p1',
    hoVaTen: 'NGUYỄN VĂN AN',
    ngaySinh: '1995-04-15',
    gioiTinh: 'Nam',
    soCCCD: '001095012345',
    ngayCap: '2021-05-20',
    noiCap: 'Cục Cảnh sát QLHC về TTXH',
    queQuan: 'Xã Kim Chung, Huyện Hoài Đức, Thành phố Hà Nội',
    diaChiThuongTru: 'Số 28, Ngõ 195 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
    soDienThoai: '0912345678',
    congViecDuKien: 'Đầu Bếp',
    chucVu: 'Bếp Trưởng',
    khoi: 'Khối Vận Hành',
    ban: 'Ban Ẩm Thực & Bếp',
    phong: 'Phòng Bếp Trung Tâm',
    diemLamViec: 'Nhà máy Hà Nội',
    loaiHopDong: 'Hợp đồng 12 tháng',
    luongCoBan: 8500000,
    giaDinh: [
      { quanHe: 'Bố', hoTen: 'Nguyễn Văn Bình', namSinh: '1965', ngheNghiep: 'Cán bộ hưu trí' },
      { quanHe: 'Mẹ', hoTen: 'Lê Thị Mai', namSinh: '1968', ngheNghiep: 'Kinh doanh tự do' },
      { quanHe: 'Vợ', hoTen: 'Trần Thu Hà', namSinh: '1997', ngheNghiep: 'Giáo viên THPT' },
    ],
  },
  {
    id: 'sample_p2',
    hoVaTen: 'TRẦN THỊ MAI HOA',
    ngaySinh: '1998-08-22',
    gioiTinh: 'Nữ',
    soCCCD: '030198006789',
    ngayCap: '2022-09-15',
    noiCap: 'Cục Cảnh sát QLHC về TTXH',
    queQuan: 'Xã Cẩm Phúc, Huyện Cẩm Giàng, Tỉnh Hải Dương',
    diaChiThuongTru: 'Số 12 Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Thành phố Hà Nội',
    soDienThoai: '0987654321',
    congViecDuKien: 'Bán Hàng',
    chucVu: 'Cửa Hàng Trưởng',
    khoi: 'Khối Kinh Doanh',
    ban: 'Ban Phát Triển Chuỗi',
    phong: 'Phòng Bán Hàng & Dịch Vụ',
    diemLamViec: 'Chi nhánh Đống Đa',
    loaiHopDong: 'Hợp đồng không xác định thời hạn',
    luongCoBan: 7800000,
    giaDinh: [
      { quanHe: 'Bố', hoTen: 'Trần Văn Hùng', namSinh: '1969', ngheNghiep: 'Kỹ sư cơ khí' },
      { quanHe: 'Mẹ', hoTen: 'Phạm Thị Lan', namSinh: '1972', ngheNghiep: 'Dược sĩ' },
    ],
  },
  {
    id: 'sample_p3',
    hoVaTen: 'LÊ HOÀNG NAM',
    ngaySinh: '1992-11-10',
    gioiTinh: 'Nam',
    soCCCD: '079092008899',
    ngayCap: '2020-11-05',
    noiCap: 'Cục Cảnh sát QLHC về TTXH',
    queQuan: 'Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
    diaChiThuongTru: 'Số 45/2 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    soDienThoai: '0903998877',
    congViecDuKien: 'Kỹ Thuật',
    chucVu: 'Trưởng Nhóm Kỹ Thuật',
    khoi: 'Khối Kỹ Thuật & Bảo Trì',
    ban: 'Ban Cơ Điện & Tự Động Hóa',
    phong: 'Phòng Bảo Trì Hệ Thống',
    diemLamViec: 'Trụ sở TP. Hồ Chí Minh',
    loaiHopDong: 'Hợp đồng 36 tháng',
    luongCoBan: 9500000,
    giaDinh: [
      { quanHe: 'Bố', hoTen: 'Lê Văn Khải', namSinh: '1960', ngheNghiep: 'Cán bộ hưu trí' },
      { quanHe: 'Mẹ', hoTen: 'Vũ Thị Thảo', namSinh: '1963', ngheNghiep: 'Nội trợ' },
      { quanHe: 'Vợ', hoTen: 'Nguyễn Thị Bích', namSinh: '1994', ngheNghiep: 'Nhân viên ngân hàng' },
    ],
  },
];

// Hàm tạo 1 tài liệu canvas theo người và loại
export function createSyntheticDocumentForPerson(
  person: SamplePersonConfig,
  type: 'cccd_truoc' | 'cccd_sau' | 'so_yeu_ly_lich' | 'vneid_cu_tru'
): {
  fileName: string;
  dataUrl: string;
  base64Data: string;
  width: number;
  height: number;
} {
  const canvas = document.createElement('canvas');

  if (type === 'vneid_cu_tru') {
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;

    // Background VNeID
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, 720, 180);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 180, 720, 1100);

    // Header VNeID
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ĐỊNH DANH ĐIỆN TỬ QUỐC GIA - VNeID', 360, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('THÔNG TIN CƯ TRÚ & QUÊ QUÁN', 360, 110);
    ctx.font = 'italic 16px Arial';
    ctx.fillText('(Dữ liệu hành chính mới nhất sau sáp nhập)', 360, 145);

    // Thẻ định danh
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 210, 660, 1000);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(30, 210, 660, 1000);

    // Badge mức 2
    ctx.fillStyle = '#059669';
    ctx.fillRect(60, 240, 260, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('✓ TÀI KHOẢN MỨC 2', 80, 268);

    // Thông tin định danh chi tiết
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(person.hoVaTen, 60, 330);

    ctx.fillStyle = '#475569';
    ctx.font = '18px Arial';
    ctx.fillText(`Số ĐDCN / CCCD: ${person.soCCCD}`, 60, 370);
    ctx.fillText(`Ngày sinh: ${person.ngaySinh}   |   Giới tính: ${person.gioiTinh}`, 60, 410);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 440);
    ctx.lineTo(660, 440);
    ctx.stroke();

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('📍 NƠI THƯỜNG TRÚ (ĐƠN VỊ HÀNH CHÍNH MỚI):', 60, 480);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(person.diaChiThuongTru, 60, 520);
    ctx.font = 'italic 16px Arial';
    ctx.fillText('(Đơn vị hành chính đã xác thực hệ thống dân cư quốc gia)', 60, 560);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏡 QUÊ QUÁN:', 60, 630);
    ctx.fillStyle = '#0f172a';
    ctx.font = '18px Arial';
    ctx.fillText(person.queQuan, 60, 670);

    // Khung xác thực
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(60, 740, 600, 200);
    ctx.strokeStyle = '#86efac';
    ctx.strokeRect(60, 740, 600, 200);

    ctx.fillStyle = '#166534';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('HỆ THỐNG CƠ SỞ DỮ LIỆU QUỐC GIA VỀ DÂN CƯ', 80, 780);
    ctx.font = '15px Arial';
    ctx.fillText('Dữ liệu đã được Bộ Công An xác thực trực tuyến.', 80, 815);
    ctx.fillText('Thời điểm truy xuất: 2026-10-03 14:00:00', 80, 850);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return {
      fileName: `VNeID_${person.hoVaTen.replace(/\s+/g, '_')}.jpg`,
      dataUrl,
      base64Data: rawBase64.replace(/[\r\n\s]+/g, ''),
      width: 720,
      height: 1280,
    };
  } else if (type === 'cccd_truoc') {
    canvas.width = 1000;
    canvas.height = 630;
    const ctx = canvas.getContext('2d')!;

    // Mặt trước CCCD
    ctx.fillStyle = person.gioiTinh === 'Nữ' ? '#fdf2f8' : '#e0f2fe';
    ctx.fillRect(0, 0, 1000, 630);

    ctx.lineWidth = 6;
    ctx.strokeStyle = person.gioiTinh === 'Nữ' ? '#db2777' : '#0284c7';
    ctx.strokeRect(10, 10, 980, 610);

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 500, 50);
    ctx.font = 'italic 18px Arial';
    ctx.fillText('Độc lập - Tự do - Hạnh phúc', 500, 80);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('CĂN CƯỚC CÔNG DÂN / CITIZEN IDENTITY CARD', 500, 130);

    // Chân dung
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(50, 180, 220, 290);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`ẢNH (${person.gioiTinh})`, 160, 330);

    // Thông tin chi tiết
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Số / No.: ${person.soCCCD}`, 310, 200);

    ctx.font = '18px Arial';
    ctx.fillText(`Họ và tên / Full name: ${person.hoVaTen}`, 310, 245);
    ctx.fillText(`Ngày sinh / Date of birth: ${person.ngaySinh}`, 310, 290);
    ctx.fillText(`Giới tính / Sex: ${person.gioiTinh}       Quốc tịch: Việt Nam`, 310, 335);
    ctx.fillText(`Quê quán: ${person.queQuan}`, 310, 380);
    ctx.fillText(`Nơi thường trú: ${person.diaChiThuongTru}`, 310, 425);
    ctx.fillText(`Có giá trị đến / Date of expiry: 2035-12-31`, 310, 470);

    // Chip
    ctx.fillStyle = '#eab308';
    ctx.fillRect(310, 510, 80, 60);
    ctx.fillStyle = '#713f12';
    ctx.font = '14px Arial';
    ctx.fillText('CHIP', 330, 545);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return {
      fileName: `CCCD_MatTruoc_${person.hoVaTen.replace(/\s+/g, '_')}.jpg`,
      dataUrl,
      base64Data: rawBase64.replace(/[\r\n\s]+/g, ''),
      width: 1000,
      height: 630,
    };
  } else if (type === 'cccd_sau') {
    canvas.width = 1000;
    canvas.height = 630;
    const ctx = canvas.getContext('2d')!;

    // Mặt sau CCCD
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1000, 630);

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(10, 10, 980, 610);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Đặc điểm nhân dạng: Nốt ruồi cánh mũi / Sẹo nhẹ lông mày', 60, 70);
    ctx.fillText(`Ngày cấp: ${person.ngayCap}`, 60, 120);
    ctx.fillText(`Nơi cấp: ${person.noiCap}`, 60, 160);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(60, 200, 180, 220);
    ctx.fillStyle = '#475569';
    ctx.fillText('VÂN TAY', 110, 310);

    // Mã MRZ
    ctx.fillStyle = '#1e293b';
    ctx.font = '22px monospace';
    ctx.fillText(`IDVNM${person.soCCCD}<<<<<<<<<<<<<<<`, 60, 500);
    ctx.fillText(`9504155M3504154VNM<<<<<<<<<<<0`, 60, 540);
    ctx.fillText(`${person.hoVaTen.replace(/\s+/g, '<')}<<<<<<<<<<<<<<<<<<`, 60, 580);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return {
      fileName: `CCCD_MatSau_${person.hoVaTen.replace(/\s+/g, '_')}.jpg`,
      dataUrl,
      base64Data: rawBase64.replace(/[\r\n\s]+/g, ''),
      width: 1000,
      height: 630,
    };
  } else {
    // Sơ yếu lý lịch
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1100);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SƠ YẾU LÝ LỊCH TỰ THUẬT', 400, 60);

    ctx.textAlign = 'left';
    ctx.font = '16px Arial';
    ctx.fillText(`Họ và tên: ${person.hoVaTen} (Giới tính: ${person.gioiTinh})`, 80, 120);
    ctx.fillText(`Sinh ngày: ${person.ngaySinh}`, 80, 160);
    ctx.fillText(`Số điện thoại liên hệ: ${person.soDienThoai}`, 80, 200);
    ctx.fillText(`Vị trí / Công việc ứng tuyển: ${person.congViecDuKien} - ${person.chucVu}`, 80, 240);
    ctx.fillText(`Quê quán: ${person.queQuan}`, 80, 280);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('THÀNH PHẦN GIA ĐÌNH:', 80, 340);

    ctx.font = '16px Arial';
    let yPos = 380;
    person.giaDinh.forEach((tv, idx) => {
      ctx.fillText(`${idx + 1}. ${tv.quanHe}: ${tv.hoTen} (Sinh năm: ${tv.namSinh}) - Nghề nghiệp: ${tv.ngheNghiep}`, 100, yPos);
      yPos += 40;
    });

    ctx.font = 'italic 15px Arial';
    ctx.fillText('Tôi cam đoan những lời khai trên hoàn toàn đúng sự thật.', 80, yPos + 40);
    ctx.font = '16px Arial';
    ctx.fillText(`Người khai: ${person.hoVaTen} (Đã ký)`, 430, yPos + 100);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return {
      fileName: `SoYeuLyLich_${person.hoVaTen.replace(/\s+/g, '_')}.jpg`,
      dataUrl,
      base64Data: rawBase64.replace(/[\r\n\s]+/g, ''),
      width: 800,
      height: 1100,
    };
  }
}

// Hàm backward-compatible cho caller cũ
export function createSyntheticDocument(type: 'cccd_truoc' | 'cccd_sau' | 'so_yeu_ly_lich' | 'vneid_cu_tru') {
  return createSyntheticDocumentForPerson(SAMPLE_PERSONS[0], type);
}

// Hàm sinh ảnh mẫu và danh sách Batch cho 3 người khác nhau
export function generate3PersonsSampleData(): {
  images: OptimizedImageFile[];
  batchEmployees: BatchEmployeeDraft[];
} {
  const images: OptimizedImageFile[] = [];
  const batchEmployees: BatchEmployeeDraft[] = [];

  SAMPLE_PERSONS.forEach((p, pIndex) => {
    // Tạo 3 tài liệu ảnh cho mỗi người: CCCD Trước, CCCD Sau, Sơ yếu lý lịch (+ VNeID cho người 1)
    const docTypes: ('cccd_truoc' | 'cccd_sau' | 'so_yeu_ly_lich' | 'vneid_cu_tru')[] =
      pIndex === 0
        ? ['cccd_truoc', 'cccd_sau', 'so_yeu_ly_lich', 'vneid_cu_tru']
        : ['cccd_truoc', 'cccd_sau', 'so_yeu_ly_lich'];

    docTypes.forEach((dtype) => {
      const doc = createSyntheticDocumentForPerson(p, dtype);
      images.push({
        id: `sample_${pIndex + 1}_${dtype}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fileName: doc.fileName,
        originalSize: 2200000,
        compressedSize: Math.round((doc.base64Data.length * 3) / 4),
        width: doc.width,
        height: doc.height,
        mimeType: 'image/jpeg',
        base64Data: doc.base64Data,
        dataUrl: doc.dataUrl,
        docType: dtype,
      });
    });

    // Tạo bản nháp BatchEmployeeDraft tương ứng cho từng người
    batchEmployees.push({
      id: `draft_sample_${pIndex + 1}_${Date.now()}`,
      hoVaTen: p.hoVaTen,
      ngaySinh: p.ngaySinh,
      gioiTinh: p.gioiTinh,
      soCCCD: p.soCCCD,
      ngayCap: p.ngayCap,
      noiCap: p.noiCap,
      queQuan: p.queQuan,
      diaChiThuongTru: p.diaChiThuongTru,
      nguonDiaChi: pIndex === 0 ? 'VNeID' : 'CCCD',
      ghiChuSapNhap: `Hồ sơ mẫu Người #${pIndex + 1}: ${p.hoVaTen} (${p.congViecDuKien} - ${p.chucVu})`,
      soDienThoai: p.soDienThoai,
      khoi: p.khoi,
      ban: p.ban,
      phong: p.phong,
      congViecDuKien: p.congViecDuKien,
      chucVu: p.chucVu,
      diemLamViec: p.diemLamViec,
      loaiHopDong: p.loaiHopDong,
      luongCoBan: p.luongCoBan,
      thongTinGiaDinh: p.giaDinh,
    });
  });

  return { images, batchEmployees };
}
