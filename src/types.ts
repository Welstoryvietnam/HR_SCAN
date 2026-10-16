export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  sessionToken?: string;
  id?: string;
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  displayName?: string;
}

export interface SystemUserAccount {
  id: string;
  username: string;
  password?: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'locked';
  createdAt: string;
  lastLogin?: string;
}

export interface TieuChuanLuongItem {
  id: string;
  congViec: string;
  chucVu: string;
  luongCoBan: number;
  phuCapChucVu: number; // Phụ cấp chức vụ
  phuCapDienThoai?: number; // Phụ cấp điện thoại (Quản lý, Trưởng phòng, Giám đốc, Quản lý vùng...)
  phuCapMoiTruong?: number | 'Thủ công'; // Phụ cấp môi trường (Thủ công)
  phuCapXangXe?: number | 'Thủ công'; // Phụ cấp xăng xe (Thủ công)
  anToanVeSinhVien?: number | 'Thủ công'; // An toàn vệ sinh viên (Thủ công)
  phuCapKinhDoanh?: number | 'Thủ công'; // Phụ cấp kinh doanh (Thủ công)
  phuCapNangNhoc?: number | 'Thủ công'; // Phụ cấp Nặng nhọc (Thủ công)
  troCapTayNghe: number; // Trợ cấp tay nghề
  troCapGiaDinh: number; // Trợ cấp Gia Đình (150,000 đ)
  thuongChuyenCan: number; // Thưởng chuyên cần (200,000 đ)
  thuongSangKien: number; // Thưởng sáng kiến (200,000 đ hoặc 0)
  phuCapCoDinh: number; // Tổng phụ cấp tiêu chuẩn cố định
  moTa?: string;
  capNhatLuc?: string;
}

export interface ThanhVienGiaDinh {
  quanHe: string;
  hoTen: string;
  namSinh?: string;
  ngheNghiep?: string;
}

export interface ThanhVienHoGiaDinh {
  hoTen: string;
  ngaySinh: string;
  quanHeVoiChuHo: string;
  gioiTinh: string;
  diaChiThuongTru: string;
  quocTich: string;
  danToc: string;
}

export interface EmployeeHouseholdInfo {
  thanhVienHoGiaDinh?: ThanhVienHoGiaDinh[];
}

export interface EmployeeIntakeInfo {
  thamQuyen?: '' | 'Trưởng địa điểm' | 'Dinh dưỡng viên trưởng' | 'Giám sát trưởng';
  ngayVaoLam?: string;
  diaChiTamTru?: string;
  emailCaNhan?: string;
  tinhTrangHoSo?: string;
}

export interface EmployeeIdentityInfo {
  aiVisionExtracted?: boolean;
  tinhTrangHonNhan?: string;
  ngayHetHanCCCD?: string;
}

export interface NhanSuRecord extends EmployeeIntakeInfo, EmployeeIdentityInfo, EmployeeHouseholdInfo {
  nguoiNhap?: string;
  phuCapNangLuc?: number;
  id: string;
  timestamp: string;
  userEmail: string;
  hoVaTen: string;
  ngaySinh: string;
  gioiTinh: 'Nam' | 'Nữ' | 'Khác' | string;
  soCCCD: string;
  ngayCap: string;
  noiCap: string;
  queQuan: string;
  diaChiThuongTru: string;
  soDienThoai: string;
  // Phân cấp phòng ban: Khối > Ban > Phòng
  khoi?: string;
  ban?: string;
  phong?: string;
  congViecDuKien: string;
  chucVu: string;
  isManualSalary?: boolean; // Vị trí công việc nhập thủ công (ngoài bảng tiêu chuẩn)
  thongTinGiaDinh: ThanhVienGiaDinh[];
  luongCoBan: number;
  // Chi tiết cơ cấu phụ cấp & trợ cấp theo bảng tiêu chuẩn
  phuCapChucVu?: number;
  phuCapDienThoai?: number; // Phụ cấp điện thoại
  troCapTayNghe?: number;
  troCapGiaDinh?: number;
  thuongChuyenCan?: number;
  thuongSangKien?: number;
  // Các khoản phụ cấp thủ công theo bảng tiêu chuẩn & điền tay
  phuCapMoiTruong?: number;
  phuCapXangXe?: number;
  anToanVeSinhVien?: number;
  phuCapKinhDoanh?: number;
  phuCapNangNhoc?: number;
  // Các khoản phụ cấp điền tay đặc thù theo yêu cầu nghiệp vụ
  troCapDacThuFPT?: number; // Trợ cấp đặc thù (FPT)
  thuongNangLucAM?: number; // Thưởng năng lực AM
  phuCapLuuDong?: number; // Phụ cấp lưu động
  phuCapCoDinh: number;
  phuCapPhatSinh: number;
  tongPhuCap?: number; // Tổng toàn bộ phụ cấp
  tongThuNhapDuKien: number;
  luongDongBHXH?: number; // Mức lương tham gia đóng BHXH
  diemLamViec?: string; // Địa bàn / Điểm làm việc
  loaiHopDong?: string; // Hợp đồng lao động
  nguonDiaChi?: 'VNeID' | 'CCCD'; // Nguồn thông tin cư trú (Ưu tiên VNeID mới nhất sau sáp nhập)
  ghiChuSapNhap?: string;
  ghiChu?: string;
  soTaiLieuDinhKem: number;
  trangThaiEmail: 'Đã gửi' | 'Chờ gửi' | 'Lỗi';
  thoiGianGuiEmail?: string;
}

export interface BatchEmployeeDraft extends EmployeeIntakeInfo, EmployeeIdentityInfo, EmployeeHouseholdInfo {
  extractionDocumentKey?: string;
  extractionStatus?: 'waiting' | 'running' | 'success' | 'failed';
  extractionError?: string;
  phuCapNangLuc?: number;
  id: string;
  hoVaTen: string;
  ngaySinh: string;
  gioiTinh: 'Nam' | 'Nữ' | 'Khác' | string;
  soCCCD: string;
  ngayCap?: string;
  noiCap?: string;
  queQuan: string;
  diaChiThuongTru: string;
  nguonDiaChi?: 'VNeID' | 'CCCD';
  ghiChuSapNhap?: string;
  soDienThoai: string;
  // Bước 3 fields:
  khoi?: string;
  ban?: string;
  phong?: string;
  congViecDuKien?: string;
  chucVu?: string;
  diemLamViec?: string;
  loaiHopDong?: string;
  // Bước 4 fields (salary & allowances):
  luongCoBan?: number;
  phuCapChucVu?: number;
  phuCapDienThoai?: number;
  troCapTayNghe?: number;
  troCapGiaDinh?: number;
  thuongChuyenCan?: number;
  thuongSangKien?: number;
  phuCapMoiTruong?: number;
  phuCapXangXe?: number;
  anToanVeSinhVien?: number;
  phuCapKinhDoanh?: number;
  phuCapNangNhoc?: number;
  troCapDacThuFPT?: number;
  thuongNangLucAM?: number;
  phuCapLuuDong?: number;
  phuCapPhatSinh?: number;
  luongDongBHXH?: number;
  phuCapCoDinh?: number;
  tongPhuCap?: number;
  tongThuNhapDuKien?: number;
  isManualSalary?: boolean;
  thongTinGiaDinh?: ThanhVienGiaDinh[];
  ghiChu?: string;
  soTaiLieuDinhKem?: number;
  thongTinChuaRo?: string[];
  cauHoiLamRo?: string[];
}

export interface EmployeeDocumentGroup {
  id: string;
  label: string;
  documents: OptimizedImageFile[];
}

export interface IntakeDraftSnapshot {
  form?: IntakeFormDraft;
  step: number;
  employees: BatchEmployeeDraft[];
  groups: EmployeeDocumentGroup[];
}

export interface IntakeFormDraft {
  employee: Partial<BatchEmployeeDraft>;
  bulk: {khoi:string;ban:string;phong:string;congViec:string;chucVu:string;diemLamViec:string;loaiHopDong:string};
  selectedIds: string[];
  activeIndex: number;
  isCustomOrg: boolean;
  isCustomJob: boolean;
}

export interface IntakeDraftSummary {
  ready?: boolean;
  id: string;
  title: string;
  step: number;
  employeeCount: number;
  documentCount: number;
  timestamp: string;
  version: string;
}

export interface OptimizedImageFile {
  extractedText?: string;
  id: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  mimeType: string;
  base64Data: string; // purely the base64 payload without prefix
  dataUrl: string; // data:image/jpeg;base64,...
  docType: 'cccd_truoc' | 'cccd_sau' | 'vneid_cu_tru' | 'so_yeu_ly_lich' | 'xac_nhan_cu_tru' | 'khac';
}

export interface GeminiExtractionResult extends EmployeeIdentityInfo, EmployeeHouseholdInfo {
  emailCaNhan?: string;
  hoVaTen: string;
  ngaySinh: string;
  gioiTinh: string;
  soCCCD: string;
  ngayCap: string;
  noiCap: string;
  queQuan: string;
  diaChiThuongTru: string;
  nguonDiaChi?: 'VNeID' | 'CCCD'; // AI tự động ghi nhận nguồn trích xuất
  ghiChuSapNhap?: string; // Nhắc nhở đơn vị hành chính mới sau sáp nhập
  soDienThoai: string;
  khoi?: string;
  ban?: string;
  phong?: string;
  congViecDuKien: string;
  chucVu: string;
  thongTinGiaDinh: ThanhVienGiaDinh[];
  ghiChu?: string;
  rawJson?: string;
  // Bổ sung các trường kiểm soát SOP Bước 2 (Chống suy đoán)
  thongTinChuaRo?: string[]; // Danh sách các trường không nhìn rõ / thiếu trên ảnh
  cauHoiLamRo?: string[]; // Câu hỏi AI gửi lại người dùng yêu cầu làm rõ
  mucDoTinCay?: 'CAO' | 'CAN_XAC_NHAN' | 'CHUA_RO';
}

export interface PhongNode {
  id: string;
  name: string;
}

export interface BanNode {
  id: string;
  name: string;
  phongs: PhongNode[];
}

export interface KhoiNode {
  id: string;
  name: string;
  bans: BanNode[];
}

export interface CongViecNode {
  id: string;
  name: string; // Tên công việc (Bán Hàng, Bếp Phụ, Đầu Bếp, Dinh Dưỡng Viên, Giám Sát Bếp)
  chucVus: string[]; // Danh sách các chức vụ tương ứng
}

export interface EmailLogItem {
  id: string;
  timestamp: string;
  toEmail: string;
  subject: string;
  htmlContent: string;
  status: 'Thành công' | 'Thất bại';
}
