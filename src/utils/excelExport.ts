import ExcelJS from 'exceljs';
import { NhanSuRecord } from '../types';

export type ColumnColorGroup = 'navy' | 'light_blue' | 'olive_green' | 'fpt_yellow';

export interface ColumnDefinition {
  index: number;
  id: string;
  header: string;
  group: ColumnColorGroup;
  groupTitle: string;
  headerBgColor: string; // ARGB hex for ExcelJS, e.g. FF1E3A8A
  headerTextColor: string; // ARGB hex, e.g. FFFFFFFF
  cssBgClass: string;
  cssTextClass: string;
  width: number;
  format?: 'currency' | 'date' | 'text' | 'center';
  getValue: (record: NhanSuRecord, index: number) => any;
}

// Định nghĩa chuẩn 43 cột nghiệp vụ chia làm 4 nhóm màu chuẩn:
// 1. Navy Blue: Thông tin định danh & cá nhân (VNeID / CCCD)
// 2. Light Blue: Cơ cấu tổ chức & Vị trí công tác
// 3. Olive Green: Lương cơ bản & 12+ khoản phụ cấp điền tay
// 4. Vàng chanh FPT: Tổng thu nhập, BHXH & Tổng kết
export const HR_43_COLUMNS: ColumnDefinition[] = [
  // --- NHÓM 1: NAVY BLUE (13 cột) ---
  {
    index: 1,
    id: 'stt',
    header: 'STT',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A', // Deep Navy Blue
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 8,
    format: 'center',
    getValue: (_, idx) => idx + 1,
  },
  {
    index: 2,
    id: 'maHoSo',
    header: 'Mã Hồ Sơ',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'center',
    getValue: (r) => r.id,
  },
  {
    index: 3,
    id: 'thoiGianTiepNhan',
    header: 'Thời Gian Tiếp Nhận',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'center',
    getValue: (r) => (r.timestamp ? new Date(r.timestamp).toLocaleString('vi-VN') : ''),
  },
  {
    index: 4,
    id: 'hoVaTen',
    header: 'Họ Và Tên',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 26,
    format: 'text',
    getValue: (r) => (r.hoVaTen || '').toUpperCase(),
  },
  {
    index: 5,
    id: 'ngaySinh',
    header: 'Ngày Sinh',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 14,
    format: 'center',
    getValue: (r) => r.ngaySinh || '',
  },
  {
    index: 6,
    id: 'gioiTinh',
    header: 'Giới Tính',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 12,
    format: 'center',
    getValue: (r) => r.gioiTinh || 'Nam',
  },
  {
    index: 7,
    id: 'soCCCD',
    header: 'Số CCCD',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 18,
    format: 'center',
    getValue: (r) => r.soCCCD || '',
  },
  {
    index: 8,
    id: 'ngayCap',
    header: 'Ngày Cấp CCCD',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 15,
    format: 'center',
    getValue: (r) => r.ngayCap || '',
  },
  {
    index: 9,
    id: 'noiCap',
    header: 'Nơi Cấp CCCD',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 25,
    format: 'text',
    getValue: (r) => r.noiCap || '',
  },
  {
    index: 10,
    id: 'queQuan',
    header: 'Quê Quán',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 32,
    format: 'text',
    getValue: (r) => r.queQuan || '',
  },
  {
    index: 11,
    id: 'diaChiThuongTru',
    header: 'Nơi Thường Trú (Ưu tiên VNeID)',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 38,
    format: 'text',
    getValue: (r) => r.diaChiThuongTru || '',
  },
  {
    index: 12,
    id: 'nguonDiaChi',
    header: 'Nguồn Cư Trú (VNeID/CCCD)',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 22,
    format: 'center',
    getValue: (r) => r.nguonDiaChi === 'VNeID' ? 'VNeID (Đã sáp nhập)' : 'Mặt CCCD (Cần kiểm tra)',
  },
  {
    index: 13,
    id: 'soDienThoaiEmail',
    header: 'SĐT & Email Liên Hệ',
    group: 'navy',
    groupTitle: 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (VNeID / CCCD)',
    headerBgColor: 'FF1E3A8A',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#1e3a8a]',
    cssTextClass: 'text-white',
    width: 28,
    format: 'text',
    getValue: (r) => `${r.soDienThoai || ''} - ${r.userEmail || ''}`,
  },

  // --- NHÓM 2: LIGHT BLUE (7 cột) ---
  {
    index: 14,
    id: 'khoi',
    header: 'Khối',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7', // Sky / Light Blue
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 22,
    format: 'text',
    getValue: (r) => r.khoi || '',
  },
  {
    index: 15,
    id: 'ban',
    header: 'Ban',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 24,
    format: 'text',
    getValue: (r) => r.ban || '',
  },
  {
    index: 16,
    id: 'phong',
    header: 'Phòng / Đơn Vị',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 24,
    format: 'text',
    getValue: (r) => r.phong || '',
  },
  {
    index: 17,
    id: 'diemLamViec',
    header: 'Điểm Làm Việc / Địa Bàn',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 22,
    format: 'text',
    getValue: (r) => r.diemLamViec || r.phong || 'Hà Nội / Điểm bán',
  },
  {
    index: 18,
    id: 'congViecDuKien',
    header: 'Nhóm Công Việc',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'text',
    getValue: (r) => r.congViecDuKien || '',
  },
  {
    index: 19,
    id: 'chucVu',
    header: 'Chức Danh / Chức Vụ',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 22,
    format: 'text',
    getValue: (r) => r.chucVu || '',
  },
  {
    index: 20,
    id: 'cheDoLuong',
    header: 'Chế Độ Lương',
    group: 'light_blue',
    groupTitle: 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC',
    headerBgColor: 'FF0284C7',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#0284c7]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'center',
    getValue: (r) => (r.isManualSalary ? 'Điền tay thỏa thuận' : 'Chuẩn định mức'),
  },

  // --- NHÓM 3: OLIVE GREEN (16 cột) ---
  {
    index: 21,
    id: 'luongCoBan',
    header: 'Lương Cơ Bản',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F', // Olive Green
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 18,
    format: 'currency',
    getValue: (r) => Number(r.luongCoBan) || 0,
  },
  {
    index: 22,
    id: 'phuCapChucVu',
    header: 'PC Chức Vụ',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 16,
    format: 'currency',
    getValue: (r) => Number(r.phuCapChucVu) || 0,
  },
  {
    index: 23,
    id: 'phuCapDienThoai',
    header: 'PC Điện Thoại',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 16,
    format: 'currency',
    getValue: (r) => Number(r.phuCapDienThoai) || 0,
  },
  {
    index: 24,
    id: 'phuCapXangXe',
    header: 'PC Xăng Xe (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 18,
    format: 'currency',
    getValue: (r) => Number(r.phuCapXangXe) || 0,
  },
  {
    index: 25,
    id: 'phuCapMoiTruong',
    header: 'PC Môi Trường (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'currency',
    getValue: (r) => Number(r.phuCapMoiTruong) || 0,
  },
  {
    index: 26,
    id: 'anToanVeSinhVien',
    header: 'ATVSV (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 18,
    format: 'currency',
    getValue: (r) => Number(r.anToanVeSinhVien) || 0,
  },
  {
    index: 27,
    id: 'phuCapKinhDoanh',
    header: 'PC Kinh Doanh (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'currency',
    getValue: (r) => Number(r.phuCapKinhDoanh) || 0,
  },
  {
    index: 28,
    id: 'phuCapNangNhoc',
    header: 'PC Nặng Nhọc (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'currency',
    getValue: (r) => Number(r.phuCapNangNhoc) || 0,
  },
  {
    index: 29,
    id: 'troCapTayNghe',
    header: 'TC Tay Nghề',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 16,
    format: 'currency',
    getValue: (r) => Number(r.troCapTayNghe) || 0,
  },
  {
    index: 30,
    id: 'troCapGiaDinh',
    header: 'TC Gia Đình',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 16,
    format: 'currency',
    getValue: (r) => Number(r.troCapGiaDinh) || 0,
  },
  {
    index: 31,
    id: 'thuongChuyenCan',
    header: 'Thưởng Chuyên Cần',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 18,
    format: 'currency',
    getValue: (r) => Number(r.thuongChuyenCan) || 0,
  },
  {
    index: 32,
    id: 'thuongSangKien',
    header: 'Thưởng Sáng Kiến',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 18,
    format: 'currency',
    getValue: (r) => Number(r.thuongSangKien) || 0,
  },
  {
    index: 33,
    id: 'troCapDacThuFPT',
    header: 'TC Đặc Thù FPT (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 22,
    format: 'currency',
    getValue: (r) => Number(r.troCapDacThuFPT) || 0,
  },
  {
    index: 34,
    id: 'thuongNangLucAM',
    header: 'Thưởng Năng Lực AM (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 23,
    format: 'currency',
    getValue: (r) => Number(r.thuongNangLucAM) || 0,
  },
  {
    index: 35,
    id: 'phuCapLuuDong',
    header: 'PC Lưu Động (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 20,
    format: 'currency',
    getValue: (r) => Number(r.phuCapLuuDong) || 0,
  },
  {
    index: 36,
    id: 'phuCapPhatSinh',
    header: 'PC Phát Sinh / Khác (Điền tay)',
    group: 'olive_green',
    groupTitle: '12+ KHOẢN LƯƠNG & PHỤ CẤP ĐIỀN TAY THỰC TẾ',
    headerBgColor: 'FF4D7C0F',
    headerTextColor: 'FFFFFFFF',
    cssBgClass: 'bg-[#4d7c0f]',
    cssTextClass: 'text-white',
    width: 23,
    format: 'currency',
    getValue: (r) => Number(r.phuCapPhatSinh) || 0,
  },

  // --- NHÓM 4: VÀNG CHANH FPT (7 cột) ---
  {
    index: 37,
    id: 'tongPhuCap',
    header: 'Tổng Phụ Cấp (VNĐ)',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15', // FPT Lemon Yellow
    headerTextColor: 'FF1E293B', // Dark Navy / Slate for high contrast readability
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 20,
    format: 'currency',
    getValue: (r) => {
      if (r.tongPhuCap !== undefined) return r.tongPhuCap;
      const sum =
        (Number(r.phuCapCoDinh) || 0) +
        (Number(r.phuCapMoiTruong) || 0) +
        (Number(r.phuCapXangXe) || 0) +
        (Number(r.anToanVeSinhVien) || 0) +
        (Number(r.phuCapKinhDoanh) || 0) +
        (Number(r.phuCapNangNhoc) || 0) +
        (Number(r.troCapDacThuFPT) || 0) +
        (Number(r.thuongNangLucAM) || 0) +
        (Number(r.phuCapNangLuc) || 0) +
        (Number(r.phuCapLuuDong) || 0) +
        (Number(r.phuCapPhatSinh) || 0);
      return sum;
    },
  },
  {
    index: 38,
    id: 'tongThuNhapDuKien',
    header: 'TỔNG THU NHẬP DỰ KIẾN (VNĐ)',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15',
    headerTextColor: 'FF1E293B',
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 26,
    format: 'currency',
    getValue: (r) => Number(r.tongThuNhapDuKien) || 0,
  },
  {
    index: 39,
    id: 'luongDongBHXH',
    header: 'Lương Đóng BHXH (VNĐ)',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15',
    headerTextColor: 'FF1E293B',
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 22,
    format: 'currency',
    getValue: (r) => r.luongDongBHXH || (Number(r.luongCoBan) || 0) + (Number(r.phuCapChucVu) || 0),
  },
  {
    index: 40,
    id: 'thongTinGiaDinh',
    header: 'Thành Phần Gia Đình',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15',
    headerTextColor: 'FF1E293B',
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 35,
    format: 'text',
    getValue: (r) =>
      Array.isArray(r.thongTinGiaDinh)
        ? r.thongTinGiaDinh.map((f) => `${f.quanHe}: ${f.hoTen} (${f.namSinh || '?'})`).join('; ')
        : '',
  },
  {
    index: 41,
    id: 'ghiChuSapNhap',
    header: 'Ghi Chú & Đơn Vị Sáp Nhập',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15',
    headerTextColor: 'FF1E293B',
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 32,
    format: 'text',
    getValue: (r) => r.ghiChuSapNhap || r.ghiChu || 'Đã kiểm tra đơn vị hành chính sau sáp nhập',
  },
  {
    index: 42,
    id: 'trangThaiSheet',
    header: 'Đồng Bộ Google Sheets',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15',
    headerTextColor: 'FF1E293B',
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 22,
    format: 'center',
    getValue: () => 'Đã lưu Sheet chuẩn 43 cột',
  },
  {
    index: 43,
    id: 'trangThaiMailApp',
    header: 'Trạng Thái MailApp',
    group: 'fpt_yellow',
    groupTitle: 'TỔNG THU NHẬP & PHÊ DUYỆT HỆ THỐNG',
    headerBgColor: 'FFFACC15',
    headerTextColor: 'FF1E293B',
    cssBgClass: 'bg-[#facc15]',
    cssTextClass: 'text-slate-900',
    width: 20,
    format: 'center',
    getValue: (r) => r.trangThaiEmail || 'Đã gửi',
  },
];

/**
 * Hàm xuất file Excel (.xlsx) với định dạng chuẩn 43 cột và 4 khối màu header chuẩn:
 * - 1-13: Navy Blue (#1E3A8A)
 * - 14-20: Light Blue (#0284C7)
 * - 21-36: Olive Green (#4D7C0F)
 * - 37-43: Vàng chanh FPT (#FACC15)
 */
export function addPersonnelSupplement(workbook: ExcelJS.Workbook, records: NhanSuRecord[]) {
  const sheet = workbook.addWorksheet('Thong_Tin_Bo_Sung',{views:[{state:'frozen',ySplit:1}]});
  sheet.columns = [
    {header:'Mã hồ sơ',key:'id',width:42},{header:'Họ và tên',key:'hoVaTen',width:30},
    {header:'Tình trạng hôn nhân',key:'tinhTrangHonNhan',width:25},{header:'Ngày hết hạn CCCD',key:'ngayHetHanCCCD',width:24},
    {header:'Thẩm quyền',key:'thamQuyen',width:28},{header:'Phụ cấp năng lực (VNĐ)',key:'phuCapNangLuc',width:26},
    {header:'Ngày vào làm việc',key:'ngayVaoLam',width:22},{header:'Địa chỉ tạm trú hiện tại',key:'diaChiTamTru',width:45},
    {header:'Email cá nhân',key:'emailCaNhan',width:32},{header:'Tình trạng hồ sơ',key:'tinhTrangHoSo',width:30},
  ];
  sheet.getRow(1).font = {bold:true,color:{argb:'FFFFFFFF'}};
  sheet.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1E3A8A'}};
  for (const record of records) sheet.addRow({...record,phuCapNangLuc:Number(record.phuCapNangLuc)||0});
  sheet.getColumn('phuCapNangLuc').numFmt = '#,##0" đ"';
  sheet.autoFilter = 'A1:J1';
  return sheet;
}

export async function generateExcel43Columns(records: NhanSuRecord[], customFileName?: string): Promise<void> {
  const fileName =
    customFileName && !customFileName.includes('43_Cot')
      ? customFileName
      : `Mau_Bien_Dong_Nhan_Su_${records.length > 1 ? `${records.length}_Nhan_Vien` : (records[0]?.hoVaTen?.trim().replace(/\s+/g, '_') || 'NhanSu')}.xlsx`;
  return exportBienDongNhanSuExcel(records, fileName);
}


// =========================================================================
// MẪU BIẾN ĐỘNG NHÂN SỰ CHUẨN 44 CỘT (Theo file đính kèm & quy định sáp nhập)
// =========================================================================

export interface BienDongColumnDefinition {
  index: number;
  id: string;
  header: string;
  width: number;
  format?: 'currency' | 'date' | 'text' | 'center';
  bgColor: string;
}

export const BIEN_DONG_NHAN_SU_COLUMNS: BienDongColumnDefinition[] = [
  { index: 1, id: 'stt', header: 'STT', width: 8, format: 'center', bgColor: 'FF1E3A8A' },
  { index: 2, id: 'tinhTrangHoSo1', header: 'Tình trạng hồ sơ', width: 18, format: 'center', bgColor: 'FF1E3A8A' },
  { index: 3, id: 'phong', header: 'Phòng', width: 22, format: 'text', bgColor: 'FF1E3A8A' },
  { index: 4, id: 'tinhTrangHoSo2', header: 'Tình trạng hồ sơ', width: 18, format: 'center', bgColor: 'FF1E3A8A' },
  { index: 5, id: 'hoVaTen', header: 'Họ và tên', width: 26, format: 'text', bgColor: 'FF0284C7' },
  { index: 6, id: 'ngayVao', header: 'Ngày vào', width: 14, format: 'center', bgColor: 'FF0284C7' },
  { index: 7, id: 'nguyenQuan', header: 'Nguyên quán\n (theo CCCD)', width: 28, format: 'text', bgColor: 'FF0284C7' },
  { index: 8, id: 'queQuanVNID', header: 'Quê quán\n (sau sáp nhập)\n (lấy các trường thông tin theo VNID)', width: 34, format: 'text', bgColor: 'FF0284C7' },
  { index: 9, id: 'diaChiThuongTru', header: 'Địa chỉ thường trú\n (sau sáp nhập)\n (Số nhà/Đường/Xóm, Thôn, Xã/Phường/Thị trấn, Tỉnh)', width: 40, format: 'text', bgColor: 'FF0284C7' },
  { index: 10, id: 'diaChiTamTru', header: 'Địa chỉ tạm trú\n (sau sáp nhập)\n (Số nhà/Đường/Xóm, Thôn, Xã/Phường/Thị trấn, Tỉnh)', width: 40, format: 'text', bgColor: 'FF0284C7' },
  { index: 11, id: 'dienThoai', header: 'Điện thoại', width: 15, format: 'center', bgColor: 'FF0284C7' },
  { index: 12, id: 'gioiTinh', header: 'Giới tính', width: 11, format: 'center', bgColor: 'FF0284C7' },
  { index: 13, id: 'cccd', header: 'CCCD', width: 18, format: 'center', bgColor: 'FF0284C7' },
  { index: 14, id: 'ngayCap', header: 'Ngày cấp', width: 14, format: 'center', bgColor: 'FF0284C7' },
  { index: 15, id: 'noiCap', header: 'Nơi cấp', width: 28, format: 'text', bgColor: 'FF0284C7' },
  { index: 16, id: 'ngaySinh', header: 'Ngày sinh', width: 14, format: 'center', bgColor: 'FF0284C7' },
  { index: 17, id: 'noiSinh', header: 'Nơi sinh', width: 22, format: 'text', bgColor: 'FF0284C7' },
  { index: 18, id: 'congViec', header: 'Công việc', width: 20, format: 'text', bgColor: 'FF0284C7' },
  { index: 19, id: 'chucVu', header: 'Chức vụ', width: 20, format: 'text', bgColor: 'FF0284C7' },
  { index: 20, id: 'phuTrachTD', header: 'Phụ trách TD', width: 20, format: 'text', bgColor: 'FF0284C7' },
  { index: 21, id: 'danToc', header: 'Dân tộc', width: 12, format: 'center', bgColor: 'FF4338CA' },
  { index: 22, id: 'tonGiao', header: 'Tôn giáo', width: 12, format: 'center', bgColor: 'FF4338CA' },
  { index: 23, id: 'honNhan', header: 'Hôn nhân', width: 14, format: 'center', bgColor: 'FF4338CA' },
  { index: 24, id: 'hocVan', header: 'Học vấn', width: 14, format: 'center', bgColor: 'FF4338CA' },
  { index: 25, id: 'tenTruong', header: 'Tên trường', width: 24, format: 'text', bgColor: 'FF4338CA' },
  { index: 26, id: 'nganhHoc', header: 'Ngành học', width: 22, format: 'text', bgColor: 'FF4338CA' },
  { index: 27, id: 'namHoc', header: 'Năm học', width: 12, format: 'center', bgColor: 'FF4338CA' },
  { index: 28, id: 'xacMinhHocVan', header: 'Xác minh học vấn (Offline/Online)', width: 24, format: 'center', bgColor: 'FF4338CA' },
  { index: 29, id: 'emailCaNhan', header: 'Email cá nhân (nếu có)', width: 28, format: 'text', bgColor: 'FF4338CA' },
  { index: 30, id: 'cmndCu', header: 'CMND cũ', width: 16, format: 'center', bgColor: 'FF4338CA' },
  { index: 31, id: 'note', header: 'Note (Ngày hết hạn CCCD)', width: 22, format: 'center', bgColor: 'FF4338CA' },
  { index: 32, id: 'luongCoBan', header: 'Lương Cơ bản', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 33, id: 'troCapChucVu', header: 'Trợ cấp chức vụ', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 34, id: 'troCapDacThuFPT', header: 'Trợ cấp đặc thù (FPT)', width: 18, format: 'currency', bgColor: 'FF15803D' },
  { index: 35, id: 'troCapMoiTruong', header: 'Trợ cấp môi trường', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 36, id: 'troCapDienThoai', header: 'Trợ cấp Điện thoại', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 37, id: 'troCapXangXe', header: 'Trợ cấp Xăng xe', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 38, id: 'thuongNangLucAM', header: 'Thưởng năng lực AM', width: 18, format: 'currency', bgColor: 'FF15803D' },
  { index: 39, id: 'troCapKinhDoanh', header: 'Trợ cấp kinh doanh', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 40, id: 'troCapNangLuc', header: 'Trợ cấp Năng lực', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 41, id: 'troCapTayNghe', header: 'Trợ cấp Tay nghề', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 42, id: 'troCapGiaDinh', header: 'Trợ cấp Gia đình', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 43, id: 'phuCapLuuDong', header: 'Phụ cấp lưu động', width: 16, format: 'currency', bgColor: 'FF15803D' },
  { index: 44, id: 'tongLuong', header: 'Tổng lương', width: 20, format: 'currency', bgColor: 'FFB45309' },
];

export function getBienDongRowValues(record: NhanSuRecord, index: number): (string | number)[] {
  const r = record;
  const rawRec = r as any;
  const lcb = Number(r.luongCoBan) || 0;
  const pcCV = Number(r.phuCapChucVu) || 0;
  const pcFPT = Number(r.troCapDacThuFPT) || 0;
  const pcMT = Number(r.phuCapMoiTruong) || 0;
  const pcDT = Number(r.phuCapDienThoai) || 0;
  const pcXX = Number(r.phuCapXangXe) || 0;
  const pcAM = Number(r.thuongNangLucAM) || 0;
  const pcKD = Number(r.phuCapKinhDoanh) || 0;
  const pcNL = Number(r.phuCapNangLuc) || 0;
  const pcTN = Number(r.troCapTayNghe) || 0;
  const pcGD = Number(r.troCapGiaDinh) || 0;
  const pcLD = Number(r.phuCapLuuDong) || 0;
  const pcCC = Number(rawRec.thuongChuyenCan) || 0;
  const pcSK = Number(rawRec.thuongSangKien) || 0;
  const pcPS = Number(r.phuCapPhatSinh) || 0;

  const tongLuong = Number(r.tongThuNhapDuKien) ||
    (lcb + pcCV + pcFPT + pcMT + pcDT + pcXX + pcAM + pcKD + pcNL + pcTN + pcGD + pcLD + pcCC + pcSK + pcPS);

  // Nguyên quán theo CCCD
  const nguyenQuan = rawRec.nguyenQuan || (r.nguonDiaChi === 'CCCD' ? r.queQuan : '') || r.queQuan || '';
  // Quê quán sau sáp nhập theo VNeID
  const queQuanVNID = (r.nguonDiaChi === 'VNeID' ? r.queQuan : '') || r.queQuan || '';

  return [
    index + 1, // 1: STT
    r.tinhTrangHoSo || 'Đủ hồ sơ', // 2: Tình trạng hồ sơ
    r.phong || r.ban || r.khoi || '', // 3: Phòng
    r.tinhTrangHoSo || 'Mới tiếp nhận', // 4: Tình trạng hồ sơ
    (r.hoVaTen || '').toUpperCase(), // 5: Họ và tên
    r.ngayVaoLam || '', // 6: Ngày vào
    nguyenQuan, // 7: Nguyên quán\n (theo CCCD)
    queQuanVNID, // 8: Quê quán\n (sau sáp nhập)\n (lấy các trường thông tin theo VNID)
    r.diaChiThuongTru || '', // 9: Địa chỉ thường trú\n (sau sáp nhập)\n (Số nhà/Đường/Xóm, Thôn, Xã/Phường/Thị trấn, Tỉnh)
    r.diaChiTamTru || '', // 10: Địa chỉ tạm trú\n (sau sáp nhập)\n (Số nhà/Đường/Xóm, Thôn, Xã/Phường/Thị trấn, Tỉnh)
    r.soDienThoai || '', // 11: Điện thoại
    r.gioiTinh || 'Nam', // 12: Giới tính
    r.soCCCD || '', // 13: CCCD
    r.ngayCap || '', // 14: Ngày cấp
    r.noiCap || '', // 15: Nơi cấp
    r.ngaySinh || '', // 16: Ngày sinh
    rawRec.noiSinh || r.queQuan || '', // 17: Nơi sinh
    r.congViecDuKien || '', // 18: Công việc
    r.chucVu || '', // 19: Chức vụ
    r.nguoiNhap || rawRec.phuTrachTD || (r.userEmail ? r.userEmail.split('@')[0] : ''), // 20: Phụ trách TD
    r.danToc || 'Kinh', // 21: Dân tộc
    rawRec.tonGiao || 'Không', // 22: Tôn giáo
    r.tinhTrangHonNhan || '', // 23: Hôn nhân
    rawRec.hocVan || rawRec.trinhDoHocVan || '', // 24: Học vấn
    rawRec.tenTruong || '', // 25: Tên trường
    rawRec.nganhHoc || '', // 26: Ngành học
    rawRec.namHoc || '', // 27: Năm học
    rawRec.xacMinhHocVan || 'Chưa xác minh', // 28: Xác minh học vấn (Offline/Online)
    r.emailCaNhan || '', // 29: Email cá nhân (nếu có)
    rawRec.cmndCu || rawRec.soCMNDCu || '', // 30: CMND cũ
    r.ngayHetHanCCCD || r.ghiChu || '', // 31: Note (Ngày hết hạn CCCD)
    lcb, // 32: Lương Cơ bản
    pcCV, // 33: Trợ cấp chức vụ
    pcFPT, // 34: Trợ cấp đặc thù (FPT)
    pcMT, // 35: Trợ cấp môi trường
    pcDT, // 36: Trợ cấp Điện thoại
    pcXX, // 37: Trợ cấp Xăng xe
    pcAM, // 38: Thưởng năng lực AM
    pcKD, // 39: Trợ cấp kinh doanh
    pcNL, // 40: Trợ cấp Năng lực
    pcTN, // 41: Trợ cấp Tay nghề
    pcGD, // 42: Trợ cấp Gia đình
    pcLD, // 43: Phụ cấp lưu động
    tongLuong, // 44: Tổng lương
  ];
}

export async function buildBienDongNhanSuWorkbook(records: NhanSuRecord[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Scan - FPT Telecom / Phuc Thinh';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Bien_Dong_Nhan_Su', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Thiết lập dòng 1: Tiêu đề 44 cột
  const headerRow = worksheet.getRow(1);
  headerRow.height = 54;

  BIEN_DONG_NHAN_SU_COLUMNS.forEach((col, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = col.header;

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.bgColor },
    };
    cell.font = {
      name: 'Calibri',
      size: 10.5,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    worksheet.getColumn(colNumber).width = col.width;
  });

  // Thêm dữ liệu các dòng
  records.forEach((record, recIdx) => {
    const values = getBienDongRowValues(record, recIdx);
    const row = worksheet.addRow(values);
    row.height = 26;

    BIEN_DONG_NHAN_SU_COLUMNS.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (col.format === 'currency') {
        cell.numFmt = '#,##0" đ"';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.format === 'center') {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Nổi bật cột Tổng lương (cột 44)
      if (col.id === 'tongLuong') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF9C3' }, // Vàng chanh nhạt nổi bật
        };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FF854D0E' } };
      }
    });
  });

  worksheet.autoFilter = 'A1:AR1';
  return workbook;
}

export async function exportBienDongNhanSuExcel(records: NhanSuRecord[], customFileName?: string): Promise<void> {
  const workbook = await buildBienDongNhanSuWorkbook(records);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName =
    customFileName ||
    `Mau_Bien_Dong_Nhan_Su_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}

export function generateBienDongNhanSuCSV(records: NhanSuRecord[]): string {
  const escapeCSV = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = BIEN_DONG_NHAN_SU_COLUMNS.map((col) => escapeCSV(col.header)).join(',');
  const lines = [headerLine];

  records.forEach((record, index) => {
    const rowValues = getBienDongRowValues(record, index);
    lines.push(rowValues.map(escapeCSV).join(','));
  });

  return '\uFEFF' + lines.join('\n'); // UTF-8 BOM
}

export function exportBienDongNhanSuCSV(records: NhanSuRecord[], customFileName?: string): void {
  const csvContent = generateBienDongNhanSuCSV(records);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName =
    customFileName ||
    `Mau_Bien_Dong_Nhan_Su_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}

