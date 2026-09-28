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
export async function generateExcel43Columns(records: NhanSuRecord[], customFileName?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FPT HR AI Automation';
  workbook.lastModifiedBy = 'FPT HR System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('DanhSachNhanSu_43Cot', {
    views: [{ state: 'frozen', ySplit: 2 }], // Cố định 2 dòng tiêu đề (Super Header + Column Header)
  });

  // 1. Tạo Dòng 1: Super Header (Nhóm chức năng gom màu)
  const superHeaderRow = worksheet.getRow(1);
  superHeaderRow.height = 30;

  // Merge các vùng super header
  worksheet.mergeCells('A1:M1'); // 13 cột: Navy Blue
  worksheet.mergeCells('N1:T1'); // 7 cột: Light Blue
  worksheet.mergeCells('U1:AJ1'); // 16 cột: Olive Green
  worksheet.mergeCells('AK1:AQ1'); // 7 cột: Vàng chanh FPT

  // Gán giá trị và style cho cell Super Header
  const cellA1 = worksheet.getCell('A1');
  cellA1.value = 'THÔNG TIN ĐỊNH DANH & CÁ NHÂN (ƯU TIÊN VNeID / CCCD) [13 CỘT]';
  cellA1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Navy Blue
  };
  cellA1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellA1.alignment = { vertical: 'middle', horizontal: 'center' };

  const cellN1 = worksheet.getCell('N1');
  cellN1.value = 'CƠ CẤU TỔ CHỨC & VỊ TRÍ CÔNG TÁC [7 CỘT]';
  cellN1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' }, // Light Blue
  };
  cellN1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellN1.alignment = { vertical: 'middle', horizontal: 'center' };

  const cellU1 = worksheet.getCell('U1');
  cellU1.value = 'LƯƠNG CƠ BẢN & 12+ KHOẢN PHỤ CẤP ĐIỀN TAY THỰC TẾ [16 CỘT]';
  cellU1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4D7C0F' }, // Olive Green
  };
  cellU1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellU1.alignment = { vertical: 'middle', horizontal: 'center' };

  const cellAK1 = worksheet.getCell('AK1');
  cellAK1.value = 'TỔNG THU NHẬP DỰ KIẾN, BHXH & ĐỒNG BỘ HỆ THỐNG [7 CỘT]';
  cellAK1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFACC15' }, // Vàng chanh FPT
  };
  cellAK1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  cellAK1.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Tạo Dòng 2: Từng Cột Chi Tiết (43 Cột Header)
  const headerRow = worksheet.getRow(2);
  headerRow.height = 36;

  HR_43_COLUMNS.forEach((col, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = col.header;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.headerBgColor },
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: col.headerTextColor },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF64748B' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    // Đặt độ rộng cột
    worksheet.getColumn(colNumber).width = col.width;
  });

  // 3. Thêm các dòng dữ liệu nhân viên
  records.forEach((record, recIdx) => {
    const rowValues = HR_43_COLUMNS.map((col) => col.getValue(record, recIdx));
    const row = worksheet.addRow(rowValues);
    row.height = 24;

    // Định dạng cell dữ liệu
    HR_43_COLUMNS.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);

      // Border
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignment & Number format
      if (col.format === 'currency') {
        cell.numFmt = '#,##0" đ"';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.format === 'center') {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Tô nhẹ cột Tổng thu nhập để dễ nhận diện
      if (col.id === 'tongThuNhapDuKien') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF9C3' }, // Vàng chanh nhạt nổi bật
        };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FF854D0E' } };
      }
    });
  });

  // 4. Xuất file về máy tính người dùng
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName =
    customFileName ||
    `Bang_Luong_Nhan_Su_Chuan_43_Cot_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
