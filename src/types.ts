export type UserRole = 'admin' | 'employee';
export type HrmSubRole =
  | 'admin'
  | 'nhan_vien_tuyen_dung'
  | 'nhan_vien_y_te'
  | 'nhan_vien_quan_ly_ho_so'
  | 'truong_nhom_cnb'
  | 'truong_nhom_tuyen_dung'
  | 'quan_ly_nhan_su'
  | 'nhan_vien_nhan_su';


export interface UserProfile {
  employeeCode?:string;
  contactEmail?:string;
  phone?: string;
  hrmRole?:HrmSubRole;
  department?:string;
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
  contactEmail?:string;
  phone?: string;
  hrmRole?:HrmSubRole;
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
  hoVaTen?: string;
  hoTen?: string;
  thamQuyen?: '' | 'Trưởng địa điểm' | 'Dinh dưỡng viên trưởng' | 'Giám sát trưởng';
  ngayVaoLam?: string;
  diaChiTamTru?: string;
  emailCaNhan?: string;
  tinhTrangHoSo?: string;
  nguyenQuan?: string;
  noiSinh?: string;
  phuTrachTD?: string;
  tonGiao?: string;
  hocVan?: string;
  tenTruong?: string;
  nganhHoc?: string;
  namHoc?: string;
  xacMinhHocVan?: string;
  cmndCu?: string;
}

export interface EmployeeIdentityInfo {
  danToc?: string;
  extractionMethod?: 'ocr' | 'vision' | 'manual';
  aiVisionExtracted?: boolean;
  tinhTrangHonNhan?: string;
  ngayHetHanCCCD?: string;
  canh_bao_sai_lech?: string;
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
  kskLockedFields?: string[];
  trangThaiKSK?: string;
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
  ocrVersion?: string;
  ocrPages?: {page:number;text:string;confidence:number;lines:{text:string;x:number;y:number;width:number;height:number}[];manualRotationSuggested?:boolean;engine?:'tesseract'|'gemini';assistance?:{status:'used'|'disabled'|'not-needed'|'unavailable'|'conflict';message?:string};assistanceRevision?:string}[];
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
  docType: 'cccd_truoc' | 'cccd_sau' | 'vneid_cu_tru' | 'cv' | 'so_yeu_ly_lich' | 'xac_nhan_cu_tru' | 'khac';
}

export interface DocumentExtractionResult extends EmployeeIdentityInfo, EmployeeHouseholdInfo {
  emailCaNhan?: string;
  diaChiTamTru?: string;
  tonGiao?: string;
  hocVan?: string;
  tenTruong?: string;
  nganhHoc?: string;
  namHoc?: string;
  hoVaTen: string;
  hoTen?: string;
  ngaySinh: string;
  gioiTinh: string;
  soCCCD: string;
  loaiGiayTo?: string;
  ngayCap: string;
  ngayCapCCCD?: string;
  noiCap: string;
  noiCapCCCD?: string;
  queQuan: string;
  diaChiThuongTru: string;
  noiThuongTru?: string;
  hoTenChuHo?: string;
  quanHeChuHo?: string;
  chuHoInfo?: Partial<ThanhVienHoGiaDinh>;
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
  doTinCayOCR?: number;
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

export interface HealthCheckNotificationItem {
  id: string;
  title: string;
  message: string;
  candidateNames: string[];
  candidateCount: number;
  phong?: string;
  nhaCungCap?: string;
  ngayHenKham?: string;
  createdBy: string;
  createdByEmail?: string;
  createdAt: string;
  readBy: string[];
  targetRole: 'nhan_vien_y_te' | 'all';
}

export type BenefitApprovalStatus = 'cho_duyet' | 'du_dieu_kien' | 'da_chi_tra' | 'tu_choi';

export type RecruitmentBenefitSubTab =
  | 'danh_muc_chinh_sach'
  | 'thuong_gioi_thieu'
  | 'nguoi_cu_quay_lai'
  | 'ho_tro_nha_tro';

export interface RecruitmentPolicyItem {
  id: string;
  stt?: number;
  maChinhSach: string;
  tenChinhSach: string;
  loaiChinhSach: 'thuong_gioi_thieu' | 'nguoi_cu_quay_lai' | 'ho_tro_nha_tro' | 'khac';
  doiTuong: string;
  chinhSachHoTro: string;
  thoiHan: string;
  thoiGianApDung: string;
  dieuKienChiTiet?: string;
  trangThai: 'dang_ap_dung' | 'tam_dung' | 'het_hieu_luc';
  ghiChu?: string;
  nguoiTao?: string;
  capNhatLuc?: string;
}

export interface ReferralBonusRecord {
  id: string;
  maNVNguoiGioiThieu: string;
  tenNguoiGioiThieu: string;
  phongNguoiGioiThieu: string;
  sdtNguoiGioiThieu: string;
  hoVaTenUngVien: string;
  soCCCD: string;
  soDienThoai: string;
  khoi: string;
  ban: string;
  phong: string;
  congViec: string;
  chucVu: string;
  ngayVaoLam: string;
  ngayDuDieuKien: string;
  mucThuong: number;
  kyChiTra: string;
  trangThai: BenefitApprovalStatus;
  ghiChu: string;
  nguoiTao: string;
  capNhatLuc: string;
}

export interface RehireEmployeeRecord {
  id: string;
  maNVCu: string;
  hoVaTen: string;
  soCCCD: string;
  soDienThoai: string;
  khoi: string;
  ban: string;
  phongCu: string;
  ngayNghiViecCu: string;
  lyDoNghiCu: string;
  phongMoi: string;
  congViec: string;
  chucVu: string;
  ngayQuayLai: string;
  mucHoTro: number;
  danhGiaTruocDay: 'tot' | 'binh_thuong' | 'can_luu_y';
  trangThai: BenefitApprovalStatus;
  ghiChu: string;
  nguoiTao: string;
  capNhatLuc: string;
}

export interface HousingSupportRecord {
  id: string;
  maNV: string;
  hoVaTen: string;
  soCCCD: string;
  soDienThoai: string;
  khoi: string;
  ban: string;
  phong: string;
  congViec: string;
  chucVu: string;
  ngayVaoLam: string;
  queQuan: string;
  diaChiNhaTro: string;
  loaiHoTro: 'tien_mat' | 'ky_tuc_xa' | 'ho_tro_thue_ngoai';
  mucHoTroThang: number;
  soThangHoTro: number;
  tongHoTro: number;
  tuNgay: string;
  denNgay: string;
  trangThai: BenefitApprovalStatus;
  ghiChu: string;
  nguoiTao: string;
  capNhatLuc: string;
}

// ==========================================
// MODULE: TRA CỨU & ĐĂNG KÝ SOP NHÂN SỰ
// ==========================================
export type HrSopSubTab = 'tra_cuu_sop' | 'dang_ky_sop';

export type HrSopCategory =
  | 'tuyen_dung'
  | 'cnb_luong_thuong'
  | 'dao_tao_hoi_nhap'
  | 'quan_he_lao_dong'
  | 'y_te_an_toan'
  | 'hanh_chinh_nhan_su';

export type HrSopStatus = 'dang_ap_dung' | 'dang_ra_soat' | 'het_hieu_luc';

export interface HrSopItem {
  id: string;
  maSop: string;
  tenSop: string;
  phienBan: string;
  nhomNghiepVu: HrSopCategory;
  boPhanBanHanh: string;
  doiTuongApDung: string;
  ngayHieuLuc: string;
  ngayRaSoatTiepTheo?: string;
  mucDich: string;
  noiDungTomTat: string;
  cacBuocThucHien: string; // Multi-line steps
  bieuMauDinhKem?: string;
  trangThai: HrSopStatus;
  nguoiBienSoan: string;
  nguoiPheDuyet: string;
  ghiChu?: string;
  capNhatLuc?: string;
}

export type SopRegistrationType = 'ban_hanh_moi' | 'sua_doi' | 'huy_bo';
export type SopRegistrationStatus = 'cho_duyet' | 'dang_tham_dinh' | 'da_phe_duyet' | 'tu_choi';
export type SopPriorityLevel = 'binh_thuong' | 'gap' | 'khan_cap';

export interface HrSopRegistrationItem {
  id: string;
  maYeuCau: string;
  loaiDeXuat: SopRegistrationType;
  maSopLienQuan?: string;
  tenSopDeXuat: string;
  nhomNghiepVu: HrSopCategory;
  donViDeXuat: string;
  nguoiDeXuat: string;
  ngayDeXuat: string;
  ngayMongMuonApDung: string;
  mucDoUuTien: SopPriorityLevel;
  lyDoDeXuat: string;
  noiDungDeXuat: string;
  trangThai: SopRegistrationStatus;
  nguoiDuyet?: string;
  phanHoiDuyet?: string;
  capNhatLuc?: string;
}

// ==========================================
// MODULE: TRA CỨU LUẬT LAO ĐỘNG & NỘI QUY LAO ĐỘNG
// ==========================================
export type LaborLawSubTab = 'luat_lao_dong' | 'noi_quy_lao_dong';

export type LaborLawTopic =
  | 'hop_dong_lao_dong'
  | 'thoi_gio_lam_viec'
  | 'tien_luong_thuong'
  | 'ky_luat_lao_dong'
  | 'bhxh_thai_san'
  | 'an_toan_vsld'
  | 'nghi_phep_nghi_viec'
  | 'quy_dinh_chung';

export interface LaborLawDocumentItem {
  id: string;
  loaiVanBan: 'luat_lao_dong' | 'noi_quy_lao_dong';
  soDieu: string; // VD: Điều 25 - BLLĐ 2019 hoặc Chương II - Điều 5
  tieuDe: string;
  nguonVanBan: string; // VD: Bộ luật Lao động 45/2019/QH14, Nội quy lao động Công ty 2026
  chuyenDe: LaborLawTopic;
  tomTatCotLoi: string;
  noiDungChiTiet: string;
  luuYApDungThucTe?: string;
  ngayHieuLuc: string;
  trangThai: 'dang_hieu_luc' | 'sap_ap_dung' | 'het_hieu_luc';
  tuKhoa?: string;
  nguoiCapNhat?: string;
  capNhatLuc?: string;
}

