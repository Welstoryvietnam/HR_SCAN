import React, { useState, useEffect } from 'react';
import { GeminiExtractionResult, TieuChuanLuongItem, ThanhVienGiaDinh, NhanSuRecord, BatchEmployeeDraft, KhoiNode, EmployeeIntakeInfo } from '../types';
import { EmployeeReviewGrid } from './EmployeeReviewGrid';
import { EmployeeIntakeFields } from './EmployeeIntakeFields';
import { EmployeeSalaryGrid } from './EmployeeSalaryGrid';
import { DEFAULT_ORGANIZATION_HIERARCHY } from '../data/organizationHierarchy';
import { DEFAULT_JOB_POSITIONS } from '../data/jobPositionHierarchy';
import { findTieuChuanLuong, DEFAULT_TIEU_CHUAN_LUONG } from '../data/tieuChuanLuongData';
import { generateExcel43Columns, HR_43_COLUMNS } from '../utils/excelExport';
import {
  Save,
  Plus,
  Trash2,
  Calculator,
  UserCheck,
  Building,
  Mail,
  CheckCircle,
  FileCheck2,
  AlertTriangle,
  Coins,
  Network,
  ChevronRight,
  ChevronLeft,
  Layers,
  Edit3,
  Briefcase,
  Award,
  Sparkles,
  Info,
  HelpCircle,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  DollarSign,
  Download,
  Check,
  FileText,
  BadgeCheck,
  Users,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';

interface ExtractedFormProps {
  initialData: GeminiExtractionResult | null;
  existingRecords?: NhanSuRecord[];
  tieuChuanLuongList: TieuChuanLuongItem[];
  userEmail: string;
  onSaveToSheet: (formData: any) => Promise<boolean>;
  isSaving: boolean;
  onStepChange?: (step: number) => void;
  currentStep?: number;
  onBackToStep1?: () => void;
  onReExtractAI?: () => void;
  isProcessingAI?: boolean;
  onResetNewRecord?: () => void;
  onViewRecordsTab?: () => void;
  uploadedImagesCount?: number;
  batchEmployees?: BatchEmployeeDraft[];
  onBatchEmployeesChange?: (employees: BatchEmployeeDraft[]) => void;
  onSaveBatchToSheet?: (batchList: BatchEmployeeDraft[]) => Promise<boolean>;
  organizationHierarchy?: KhoiNode[];
  intakeInfo?: EmployeeIntakeInfo;
  onIntakeInfoChange?: (updates: Partial<EmployeeIntakeInfo>) => void;
}

// Hàm format tiền tệ an toàn tuyệt đối chống crash unhandled TypeError
const formatVND = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

export const ExtractedForm: React.FC<ExtractedFormProps> = ({
  initialData,
  existingRecords = [],
  tieuChuanLuongList,
  userEmail,
  onSaveToSheet,
  isSaving,
  onStepChange,
  currentStep,
  onBackToStep1,
  onReExtractAI,
  isProcessingAI,
  onResetNewRecord,
  onViewRecordsTab,
  uploadedImagesCount = 0,
  batchEmployees = [],
  onBatchEmployeesChange,
  onSaveBatchToSheet,
  organizationHierarchy = DEFAULT_ORGANIZATION_HIERARCHY,
  intakeInfo = {},
  onIntakeInfoChange,
}) => {
  // Cơ cấu tổ chức động do Admin cấu hình (hoặc mặc định)
  const orgHierarchy = organizationHierarchy && organizationHierarchy.length > 0 ? organizationHierarchy : DEFAULT_ORGANIZATION_HIERARCHY;

  // Quản lý bước hiển thị trong SOP: 2 (Form), 3 (Chức vụ), 4 (Lương & Lưu), 5 (Bước sau Bước 4: Đã lưu & Tiếp nhận mới)
  const [activeTabStep, setActiveTabStep] = useState<2 | 3 | 4 | 5>(
    currentStep && currentStep >= 2 && currentStep <= 4 ? (currentStep as 2 | 3 | 4) : 2
  );

  // Trạng thái đã lưu thành công vào Firestore & dữ liệu tóm tắt vừa lưu để phục vụ "+ Tiếp nhận hồ sơ mới"
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [savedSummary, setSavedSummary] = useState<{
    hoVaTen: string;
    soCCCD: string;
    chucVu: string;
    phongBan: string;
    count: number;
  } | null>(null);

  // Xử lý chuyển tab bước SOP
  const handleSelectStep = (step: 2 | 3 | 4 | 5) => {
    setActiveTabStep(step);
    if (onStepChange && step <= 4) {
      onStepChange(step);
    }
  };

  // Đồng bộ bước hiển thị khi prop currentStep thay đổi từ bên ngoài (ví dụ header SOP)
  useEffect(() => {
    if (currentStep && (currentStep === 2 || currentStep === 3 || currentStep === 4)) {
      setActiveTabStep(currentStep as 2 | 3 | 4);
    }
  }, [currentStep]);

  // Bước 2: Thông tin cá nhân & Giấy tờ tùy thân (VNeID / CCCD)
  const [hoVaTen, setHoVaTen] = useState('');
  const [ngaySinh, setNgaySinh] = useState('');
  const [gioiTinh, setGioiTinh] = useState('Nam');
  const [soCCCD, setSoCCCD] = useState('');
  const [ngayCap, setNgayCap] = useState('');
  const [ngayHetHanCCCD, setNgayHetHanCCCD] = useState('');
  const [tinhTrangHonNhan, setTinhTrangHonNhan] = useState('');
  const [noiCap, setNoiCap] = useState('');
  const [queQuan, setQueQuan] = useState('');
  const [diaChiThuongTru, setDiaChiThuongTru] = useState('');
  const [nguonDiaChi, setNguonDiaChi] = useState<'VNeID' | 'CCCD'>('VNeID');
  const [ghiChuSapNhap, setGhiChuSapNhap] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [thongTinGiaDinh, setThongTinGiaDinh] = useState<ThanhVienGiaDinh[]>([]);

  // Bước 3: Cơ cấu tổ chức & Vị trí công tác (do con người chọn)
  const [khoi, setKhoi] = useState('FD MANAGEMENT');
  const [ban, setBan] = useState('FD SALES & MARKETING');
  const [phong, setPhong] = useState('FD SALES & MARKETING');
  const [isCustomOrg, setIsCustomOrg] = useState(false);

  const [congViecDuKien, setCongViecDuKien] = useState('Đầu Bếp');
  const [chucVu, setChucVu] = useState('Bếp Trưởng');
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [diemLamViec, setDiemLamViec] = useState('Hà Nội - FPT Tower');
  const [loaiHopDong, setLoaiHopDong] = useState('Toàn thời gian (Chính thức)');

  // Bước 4: 12+ khoản Lương & Phụ cấp (SẼ ĐIỀN TAY / HIỆU CHỈNH TRỰC TIẾP)
  const [isManualSalary, setIsManualMode] = useState(true); // Cho phép HR tự do điền tay mọi khoản
  const [luongCoBan, setLuongCoBan] = useState<number>(7683000);
  const [phuCapChucVu, setPhuCapChucVu] = useState<number>(1500000);
  const [phuCapDienThoai, setPhuCapDienThoai] = useState<number>(0);
  const [phuCapXangXe, setPhuCapXangXe] = useState<number>(0);
  const [phuCapMoiTruong, setPhuCapMoiTruong] = useState<number>(0);
  const [anToanVeSinhVien, setAnToanVeSinhVien] = useState<number>(0);
  const [phuCapKinhDoanh, setPhuCapKinhDoanh] = useState<number>(0);
  const [phuCapNangNhoc, setPhuCapNangNhoc] = useState<number>(0);
  const [troCapTayNghe, setTroCapTayNghe] = useState<number>(500000);
  const [troCapGiaDinh, setTroCapGiaDinh] = useState<number>(150000);
  const [thuongChuyenCan, setThuongChuyenCan] = useState<number>(200000);
  const [thuongSangKien, setThuongSangKien] = useState<number>(200000);
  // Các khoản biến động điền tay đặc thù
  const [troCapDacThuFPT, setTroCapDacThuFPT] = useState<number>(0);
  const [thuongNangLucAM, setThuongNangLucAM] = useState<number>(0);
  const [phuCapNangLuc, setPhuCapNangLuc] = useState<number>(0);
  const [phuCapLuuDong, setPhuCapLuuDong] = useState<number>(0);
  const [phuCapPhatSinh, setPhuCapPhatSinh] = useState<number>(0);
  const [luongDongBHXH, setLuongDongBHXH] = useState<number>(9183000);
  const [ghiChu, setGhiChu] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Quản lý trạng thái danh sách hàng loạt (Batch Mode)
  const [batchList, setBatchList] = useState<BatchEmployeeDraft[]>(batchEmployees);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);

  // Cấu hình điền hàng loạt vị trí & chức vụ ở Bước 3
  const [bulkKhoi, setBulkKhoi] = useState('FS MANAGEMENT');
  const [bulkBan, setBulkBan] = useState('FS1');
  const [bulkPhong, setBulkPhong] = useState('FPT TOWER');
  const [bulkCongViec, setBulkCongViec] = useState('Đầu Bếp');
  const [bulkChucVu, setBulkChucVu] = useState('Bếp Trưởng');
  const [bulkDiemLamViec, setBulkDiemLamViec] = useState('Hà Nội - FPT Tower');
  const [bulkLoaiHopDong, setBulkLoaiHopDong] = useState('Toàn thời gian (Chính thức)');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // Đồng bộ khi batchEmployees prop thay đổi
  useEffect(() => {
    if (batchEmployees && batchEmployees.length > 0) {
      setBatchList(batchEmployees);
      setSelectedBatchIds(previous => batchEmployees
        .filter(employee => !batchList.some(item => item.id === employee.id) || previous.includes(employee.id))
        .map(employee => employee.id));
    }
  }, [batchEmployees]);

  const handleReviewChange = (id: string, updates: Partial<BatchEmployeeDraft>) => {
    if (batchList.length) {
      handleUpdateBatchEmployeeRow(id, updates);
      if (batchList.length > 1) return;
    }
    if (updates.hoVaTen !== undefined) setHoVaTen(updates.hoVaTen);
    if (updates.ngaySinh !== undefined) setNgaySinh(updates.ngaySinh);
    if (updates.gioiTinh !== undefined) setGioiTinh(updates.gioiTinh);
    if (updates.soCCCD !== undefined) setSoCCCD(updates.soCCCD);
    if (updates.ngayCap !== undefined) setNgayCap(updates.ngayCap);
    if (updates.ngayHetHanCCCD !== undefined) setNgayHetHanCCCD(updates.ngayHetHanCCCD);
    if (updates.tinhTrangHonNhan !== undefined) setTinhTrangHonNhan(updates.tinhTrangHonNhan);
    if (updates.noiCap !== undefined) setNoiCap(updates.noiCap);
    if (updates.queQuan !== undefined) setQueQuan(updates.queQuan);
    if (updates.diaChiThuongTru !== undefined) setDiaChiThuongTru(updates.diaChiThuongTru);
    if ('nguonDiaChi' in updates) setNguonDiaChi(updates.nguonDiaChi || 'CCCD');
    if (updates.ghiChuSapNhap !== undefined) setGhiChuSapNhap(updates.ghiChuSapNhap);
    if (updates.soDienThoai !== undefined) setSoDienThoai(updates.soDienThoai);
    if (updates.thongTinGiaDinh !== undefined) setThongTinGiaDinh(updates.thongTinGiaDinh);
    if (updates.ghiChu !== undefined) setGhiChu(updates.ghiChu);
    const intakeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => ['ngayVaoLam','diaChiTamTru','emailCaNhan','tinhTrangHoSo','thamQuyen'].includes(key)));
    if (Object.keys(intakeUpdates).length) onIntakeInfoChange?.(intakeUpdates);
  };

  // Điền dữ liệu khi Gemini AI hoàn thành trích xuất đơn lẻ
  useEffect(() => {
    setIsSavedSuccess(false);
    setSavedSummary(null);
    if (initialData) {
      setHoVaTen(initialData.hoVaTen ? initialData.hoVaTen.toUpperCase() : '');
      setNgaySinh(initialData.ngaySinh || '');
      setGioiTinh(initialData.gioiTinh || 'Nam');
      setSoCCCD(initialData.soCCCD || '');
      setNgayCap(initialData.ngayCap || '');
      setNgayHetHanCCCD(initialData.ngayHetHanCCCD || '');
      setTinhTrangHonNhan(initialData.tinhTrangHonNhan || '');
      setNoiCap(initialData.noiCap || '');
      setQueQuan(initialData.queQuan || '');
      setDiaChiThuongTru(initialData.diaChiThuongTru || '');
      setNguonDiaChi(initialData.nguonDiaChi || 'VNeID');
      setGhiChuSapNhap(
        initialData.ghiChuSapNhap ||
          (initialData.nguonDiaChi === 'VNeID'
            ? 'Đã lấy theo dữ liệu VNeID mới nhất sau đợt sáp nhập cấp xã/phường/huyện'
            : 'Trích xuất từ mặt CCCD - HR cần kiểm tra địa giới sáp nhập mới')
      );
      setSoDienThoai(initialData.soDienThoai || '');

      if (initialData.thongTinGiaDinh && initialData.thongTinGiaDinh.length > 0) {
        setThongTinGiaDinh(initialData.thongTinGiaDinh);
      }

      // Tự động chuyển về Bước 2 để người dùng kiểm tra thông tin AI trả ra
      setActiveTabStep(2);
      if (onStepChange) onStepChange(2);
    }
  }, [initialData]);

  // Tự động gợi ý các định mức lương chuẩn khi chức vụ ở Bước 3 thay đổi (HR vẫn có thể tự do sửa tay)
  useEffect(() => {
    const std = findTieuChuanLuong(congViecDuKien, chucVu);
    if (std) {
      setLuongCoBan(std.luongCoBan || 0);
      setPhuCapChucVu(std.phuCapChucVu || 0);
      setPhuCapDienThoai(std.phuCapDienThoai || 0);
      setTroCapTayNghe(std.troCapTayNghe || 0);
      setTroCapGiaDinh(std.troCapGiaDinh || 0);
      setThuongChuyenCan(std.thuongChuyenCan || 0);
      setThuongSangKien(std.thuongSangKien || 0);
      setLuongDongBHXH((std.luongCoBan || 0) + (std.phuCapChucVu || 0));
    }
  }, [congViecDuKien, chucVu]);

  // Tra cứu bảng tiêu chuẩn lương
  const matchedStandard = findTieuChuanLuong(congViecDuKien, chucVu);

  // Tính toán tổng các khoản phụ cấp (12+ khoản)
  const phuCapCoDinh =
    (Number(phuCapChucVu) || 0) +
    (Number(phuCapDienThoai) || 0) +
    (Number(troCapTayNghe) || 0) +
    (Number(troCapGiaDinh) || 0) +
    (Number(thuongChuyenCan) || 0) +
    (Number(thuongSangKien) || 0);

  const tongPhuCap =
    phuCapCoDinh +
    (Number(phuCapMoiTruong) || 0) +
    (Number(phuCapXangXe) || 0) +
    (Number(anToanVeSinhVien) || 0) +
    (Number(phuCapKinhDoanh) || 0) +
    (Number(phuCapNangNhoc) || 0) +
    (Number(troCapDacThuFPT) || 0) +
    (Number(thuongNangLucAM) || 0) +
    (Number(phuCapNangLuc) || 0) +
    (Number(phuCapLuuDong) || 0) +
    (Number(phuCapPhatSinh) || 0);

  const tongThuNhapDuKien = (Number(luongCoBan) || 0) + tongPhuCap;

  // Đối tượng Master Record 43 cột chuẩn
  const currentRecordObject: NhanSuRecord = {
    id: `NS_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userEmail,
    hoVaTen: hoVaTen.trim().toUpperCase() || 'CHƯA ĐẶT TÊN',
    ngaySinh,
    gioiTinh,
    soCCCD: soCCCD.trim(),
    ngayHetHanCCCD,
    tinhTrangHonNhan,
    ngayCap,
    noiCap,
    queQuan,
    diaChiThuongTru,
    nguonDiaChi,
    ghiChuSapNhap,
    soDienThoai,
    khoi: khoi.trim(),
    ban: ban.trim(),
    phong: phong.trim(),
    congViecDuKien,
    chucVu: chucVu || 'Nhân viên',
    diemLamViec,
    loaiHopDong,
    ...intakeInfo,
    emailCaNhan: intakeInfo.emailCaNhan ?? initialData?.emailCaNhan ?? '',
    luongCoBan: Number(luongCoBan) || 0,
    phuCapChucVu: Number(phuCapChucVu) || 0,
    phuCapDienThoai: Number(phuCapDienThoai) || 0,
    phuCapXangXe: Number(phuCapXangXe) || 0,
    phuCapMoiTruong: Number(phuCapMoiTruong) || 0,
    anToanVeSinhVien: Number(anToanVeSinhVien) || 0,
    phuCapKinhDoanh: Number(phuCapKinhDoanh) || 0,
    phuCapNangNhoc: Number(phuCapNangNhoc) || 0,
    troCapTayNghe: Number(troCapTayNghe) || 0,
    troCapGiaDinh: Number(troCapGiaDinh) || 0,
    thuongChuyenCan: Number(thuongChuyenCan) || 0,
    thuongSangKien: Number(thuongSangKien) || 0,
    troCapDacThuFPT: Number(troCapDacThuFPT) || 0,
    thuongNangLucAM: Number(thuongNangLucAM) || 0,
    phuCapNangLuc: Number(phuCapNangLuc) || 0,
    phuCapLuuDong: Number(phuCapLuuDong) || 0,
    phuCapCoDinh,
    phuCapPhatSinh: Number(phuCapPhatSinh) || 0,
    tongPhuCap,
    tongThuNhapDuKien,
    luongDongBHXH: Number(luongDongBHXH) || 0,
    thongTinGiaDinh,
    ghiChu,
    soTaiLieuDinhKem: uploadedImagesCount || 1,
    trangThaiEmail: 'Đã gửi',
    thoiGianGuiEmail: new Date().toISOString(),
  };

  // Chuyển đổi danh sách batch thành mảng NhanSuRecord chuẩn 43 cột
  const getBatchRecordObjects = (): NhanSuRecord[] => {
    if (batchList.length === 0) return [currentRecordObject];
    return batchList.map((emp, idx) => {
      const std = findTieuChuanLuong(emp.congViecDuKien, emp.chucVu);
      const lcb = Number(emp.luongCoBan ?? std?.luongCoBan ?? 0);
      const pcCV = Number(emp.phuCapChucVu ?? std?.phuCapChucVu ?? 0);
      const pcDT = Number(emp.phuCapDienThoai ?? std?.phuCapDienThoai ?? 0);
      const pcTN = Number(emp.troCapTayNghe ?? std?.troCapTayNghe ?? 0);
      const pcGD = Number(emp.troCapGiaDinh ?? std?.troCapGiaDinh ?? 0);
      const pcCC = Number(emp.thuongChuyenCan ?? std?.thuongChuyenCan ?? 0);
      const pcSK = Number(emp.thuongSangKien ?? std?.thuongSangKien ?? 0);
      const pcCoDinh = pcCV + pcDT + pcTN + pcGD + pcCC + pcSK;

      const pcXX = Number(emp.phuCapXangXe) || 0;
      const pcMT = Number(emp.phuCapMoiTruong) || 0;
      const pcAT = Number(emp.anToanVeSinhVien) || 0;
      const pcKD = Number(emp.phuCapKinhDoanh) || 0;
      const pcNN = Number(emp.phuCapNangNhoc) || 0;
      const pcFPT = Number(emp.troCapDacThuFPT) || 0;
      const pcAM = Number(emp.thuongNangLucAM) || 0;
      const pcNL = Number(emp.phuCapNangLuc) || 0;
      const pcLD = Number(emp.phuCapLuuDong) || 0;
      const pcPS = Number(emp.phuCapPhatSinh) || 0;

      const pcTong = pcCoDinh + pcXX + pcMT + pcAT + pcKD + pcNN + pcFPT + pcAM + pcNL + pcLD + pcPS;
      const tongThuNhap = lcb + pcTong;

      return {
        id: emp.id || `NS_BATCH_${idx + 1}`,
        timestamp: new Date().toISOString(),
        userEmail,
        hoVaTen: (emp.hoVaTen || '').toUpperCase(),
        ngaySinh: emp.ngaySinh || '',
        gioiTinh: emp.gioiTinh || '',
        soCCCD: emp.soCCCD || '',
        ngayCap: emp.ngayCap || '',
        ngayHetHanCCCD: emp.ngayHetHanCCCD || '',
        tinhTrangHonNhan: emp.tinhTrangHonNhan || '',
        noiCap: emp.noiCap || '',
        queQuan: emp.queQuan || '',
        diaChiThuongTru: emp.diaChiThuongTru || '',
        nguonDiaChi: emp.nguonDiaChi,
        ghiChuSapNhap: emp.ghiChuSapNhap || '',
        soDienThoai: emp.soDienThoai || '',
        khoi: emp.khoi || '',
        ban: emp.ban || '',
        phong: emp.phong || '',
        congViecDuKien: emp.congViecDuKien || '',
        chucVu: emp.chucVu || '',
        diemLamViec: emp.diemLamViec || '',
        loaiHopDong: emp.loaiHopDong || '',
        ngayVaoLam: emp.ngayVaoLam || '',
        diaChiTamTru: emp.diaChiTamTru || '',
        emailCaNhan: emp.emailCaNhan || '',
        tinhTrangHoSo: emp.tinhTrangHoSo || '',
        thamQuyen: emp.thamQuyen || '',
        luongCoBan: lcb,
        phuCapChucVu: pcCV,
        phuCapDienThoai: pcDT,
        phuCapXangXe: pcXX,
        phuCapMoiTruong: pcMT,
        anToanVeSinhVien: pcAT,
        phuCapKinhDoanh: pcKD,
        phuCapNangNhoc: pcNN,
        troCapTayNghe: pcTN,
        troCapGiaDinh: pcGD,
        thuongChuyenCan: pcCC,
        thuongSangKien: pcSK,
        troCapDacThuFPT: pcFPT,
        thuongNangLucAM: pcAM,
        phuCapNangLuc: pcNL,
        phuCapLuuDong: pcLD,
        phuCapCoDinh: pcCoDinh,
        phuCapPhatSinh: pcPS,
        tongPhuCap: pcTong,
        tongThuNhapDuKien: tongThuNhap,
        luongDongBHXH: Number(emp.luongDongBHXH ?? (lcb + pcCV)),
        isManualSalary: emp.isManualSalary ?? !std,
        thongTinGiaDinh: emp.thongTinGiaDinh || [],
        ghiChu: emp.ghiChu || '',
        soTaiLieuDinhKem: emp.soTaiLieuDinhKem ?? 0,
        trangThaiEmail: 'Đã gửi',
        thoiGianGuiEmail: new Date().toISOString(),
      };
    });
  };

  // Xuất file Excel (.xlsx) 43 cột chuẩn màu sắc header (hỗ trợ cả 1 hoặc nhiều người)
  const handleExportSingleExcel = async () => {
    setIsExportingExcel(true);
    try {
      const recordsToExport = batchList.length > 0 ? getBatchRecordObjects() : [currentRecordObject];
      const fileName =
        recordsToExport.length > 1
          ? `Bang_Luong_Nhan_Su_Chuan_43_Cot_${recordsToExport.length}_Nhan_Vien.xlsx`
          : `HoSo_${hoVaTen.trim().replace(/\s+/g, '_') || 'NhanSu'}_Chuan_43_Cot.xlsx`;

      await generateExcel43Columns(recordsToExport, fileName);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel: ' + (err as Error).message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Xử lý thay đổi Khối ở thanh công cụ hàng loạt Bước 3
  const handleBulkKhoiChange = (newKhoi: string) => {
    setBulkKhoi(newKhoi);
    const kObj = orgHierarchy.find((k) => k.name === newKhoi);
    if (kObj && kObj.bans.length > 0) {
      setBulkBan(kObj.bans[0].name);
      if (kObj.bans[0].phongs.length > 0) {
        setBulkPhong(kObj.bans[0].phongs[0].name);
      } else {
        setBulkPhong('');
      }
    } else {
      setBulkBan('');
      setBulkPhong('');
    }
  };

  // Xử lý thay đổi Công việc ở thanh công cụ hàng loạt Bước 3
  const handleBulkCongViecChange = (newJob: string) => {
    setBulkCongViec(newJob);
    const jobObj = DEFAULT_JOB_POSITIONS.find((j) => j.name === newJob);
    if (jobObj && jobObj.chucVus.length > 0) {
      setBulkChucVu(jobObj.chucVus[0]);
    }
  };

  // Áp dụng công việc, chức vụ, phòng ban cho nhiều người cùng lúc (YÊU CẦU CỦA NGƯỜI DÙNG Ở BƯỚC 3)
  const handleApplyBulkPositionToSelected = () => {
    if (selectedBatchIds.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 nhân viên trong danh sách để áp dụng!');
      return;
    }

    const std = findTieuChuanLuong(bulkCongViec, bulkChucVu);
    const updated = batchList.map((emp) => {
      if (!selectedBatchIds.includes(emp.id)) return emp;
      return {
        ...emp,
        khoi: bulkKhoi,
        ban: bulkBan,
        phong: bulkPhong,
        congViecDuKien: bulkCongViec,
        chucVu: bulkChucVu,
        diemLamViec: bulkDiemLamViec,
        loaiHopDong: bulkLoaiHopDong,
        luongCoBan: std?.luongCoBan ?? emp.luongCoBan ?? 0,
        phuCapChucVu: std?.phuCapChucVu ?? emp.phuCapChucVu ?? 0,
        phuCapDienThoai: std?.phuCapDienThoai ?? emp.phuCapDienThoai ?? 0,
        troCapTayNghe: std?.troCapTayNghe ?? emp.troCapTayNghe ?? 0,
        troCapGiaDinh: std?.troCapGiaDinh ?? emp.troCapGiaDinh ?? 0,
        thuongChuyenCan: std?.thuongChuyenCan ?? emp.thuongChuyenCan ?? 0,
        thuongSangKien: std?.thuongSangKien ?? emp.thuongSangKien ?? 0,
        luongDongBHXH: (std?.luongCoBan ?? emp.luongCoBan ?? 0) + (std?.phuCapChucVu ?? emp.phuCapChucVu ?? 0),
      };
    });

    setBatchList(updated);
    if (onBatchEmployeesChange) {
      onBatchEmployeesChange(updated);
    }
    setBulkSuccessMsg(
      `✓ Đã áp dụng thành công Chức vụ "${bulkChucVu}" (${bulkCongViec}) & Cơ cấu "${bulkKhoi} > ${bulkBan}" cho ${selectedBatchIds.length} nhân sự!`
    );
    setTimeout(() => setBulkSuccessMsg(null), 5000);
  };

  // Cập nhật từng dòng riêng biệt trong bảng ma trận Bước 3
  const handleUpdateBatchEmployeeRow = (id: string, updates: Partial<BatchEmployeeDraft>) => {
    const updated = batchList.map((emp) => {
      if (emp.id !== id) return emp;
      const merged = { ...emp, ...updates };
      if (updates.congViecDuKien || updates.chucVu) {
        const std = findTieuChuanLuong(merged.congViecDuKien, merged.chucVu);
        if (std) {
          merged.luongCoBan = std.luongCoBan;
          merged.phuCapChucVu = std.phuCapChucVu;
          merged.luongDongBHXH = (std.luongCoBan || 0) + (std.phuCapChucVu || 0);
        }
      }
      return merged;
    });
    setBatchList(updated);
    if (onBatchEmployeesChange) {
      onBatchEmployeesChange(updated);
    }
  };

  const handleSalaryChange = (id: string, updates: Partial<BatchEmployeeDraft>) => {
    const employee = batchList.length ? getBatchRecordObjects().find(item => item.id === id) : currentRecordObject;
    if (!employee) return;
    const adjusted = {...updates, isManualSalary:true};
    if ((updates.luongCoBan !== undefined || updates.phuCapChucVu !== undefined) &&
      employee.luongDongBHXH === employee.luongCoBan + (employee.phuCapChucVu || 0)) {
      adjusted.luongDongBHXH = (updates.luongCoBan ?? employee.luongCoBan) + (updates.phuCapChucVu ?? employee.phuCapChucVu ?? 0);
    }
    if (batchList.length) {
      handleUpdateBatchEmployeeRow(id, adjusted);
      return;
    }
    const setters: Partial<Record<keyof BatchEmployeeDraft, (value:number) => void>> = {
      luongCoBan:setLuongCoBan, phuCapChucVu:setPhuCapChucVu, phuCapDienThoai:setPhuCapDienThoai,
      troCapTayNghe:setTroCapTayNghe, troCapGiaDinh:setTroCapGiaDinh, thuongChuyenCan:setThuongChuyenCan,
      thuongSangKien:setThuongSangKien, phuCapMoiTruong:setPhuCapMoiTruong, phuCapXangXe:setPhuCapXangXe,
      anToanVeSinhVien:setAnToanVeSinhVien, phuCapKinhDoanh:setPhuCapKinhDoanh, phuCapNangNhoc:setPhuCapNangNhoc,
      troCapDacThuFPT:setTroCapDacThuFPT, thuongNangLucAM:setThuongNangLucAM, phuCapLuuDong:setPhuCapLuuDong,
      phuCapNangLuc:setPhuCapNangLuc,
      phuCapPhatSinh:setPhuCapPhatSinh, luongDongBHXH:setLuongDongBHXH,
    };
    Object.entries(adjusted).forEach(([key,value]) => setters[key as keyof BatchEmployeeDraft]?.(Number(value)));
    if (updates.ghiChu !== undefined) setGhiChu(updates.ghiChu);
    setIsManualMode(true);
  };

  // Chọn / bỏ chọn tất cả nhân viên trong Bước 3
  const handleToggleSelectAllBatch = () => {
    if (selectedBatchIds.length === batchList.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batchList.map((e) => e.id));
    }
  };

  // Chọn / bỏ chọn 1 nhân viên trong Bước 3
  const handleToggleSelectOne = (id: string) => {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter((item) => item !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  };

  // Xử lý cơ cấu Khối > Ban > Phòng
  const handleKhoiChange = (newKhoi: string) => {
    setKhoi(newKhoi);
    const kObj = orgHierarchy.find((k) => k.name === newKhoi);
    if (kObj && kObj.bans.length > 0) {
      setBan(kObj.bans[0].name);
      if (kObj.bans[0].phongs.length > 0) {
        setPhong(kObj.bans[0].phongs[0].name);
      } else {
        setPhong('');
      }
    } else {
      setBan('');
      setPhong('');
    }
  };

  const handleBanChange = (newBan: string) => {
    setBan(newBan);
    const kObj = orgHierarchy.find((k) => k.name === khoi);
    const bObj = kObj?.bans.find((b) => b.name === newBan);
    if (bObj && bObj.phongs.length > 0) {
      setPhong(bObj.phongs[0].name);
    } else {
      setPhong('');
    }
  };

  // Xử lý Công việc > Chức vụ
  const handleJobChange = (newJob: string) => {
    setCongViecDuKien(newJob);
    const jobObj = DEFAULT_JOB_POSITIONS.find((j) => j.name === newJob);
    if (jobObj && jobObj.chucVus.length > 0) {
      setChucVu(jobObj.chucVus[0]);
    }
  };

  // Thêm / sửa / xóa người thân
  const addFamilyMember = () => {
    setThongTinGiaDinh([
      ...thongTinGiaDinh,
      { quanHe: 'Bố', hoTen: '', namSinh: '', ngheNghiep: '' },
    ]);
  };

  const updateFamilyMember = (index: number, field: keyof ThanhVienGiaDinh, value: string) => {
    const updated = [...thongTinGiaDinh];
    updated[index] = { ...updated[index], [field]: value };
    setThongTinGiaDinh(updated);
  };

  const removeFamilyMember = (index: number) => {
    setThongTinGiaDinh(thongTinGiaDinh.filter((_, i) => i !== index));
  };

  // Nộp form lưu vào Firestore (Chuẩn 43 cột - Hỗ trợ cả 1 hoặc nhiều người)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const missingEmployee = batchList.find(employee => !employee.hoVaTen.trim() || !employee.soCCCD.trim());
    if (missingEmployee) {
      setValidationError(`Vui lòng bổ sung họ tên và số CCCD cho ${missingEmployee.hoVaTen || 'nhân viên chưa có tên'} tại Bước 2 trước khi lưu danh sách.`);
      handleSelectStep(2);
      return;
    }
    const invalidEmail = (batchList.length ? batchList : [currentRecordObject]).find(employee =>
      employee.emailCaNhan?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.emailCaNhan.trim())
    );
    if (invalidEmail) {
      setValidationError(`Email cá nhân của ${invalidEmail.hoVaTen || 'nhân viên'} chưa đúng định dạng. Vui lòng kiểm tra tại Bước 3.`);
      handleSelectStep(3);
      return;
    }

    if (batchList.length > 0 && onSaveBatchToSheet) {
      const ok = await onSaveBatchToSheet(getBatchRecordObjects());
      if (ok) {
        setIsSavedSuccess(true);
        setSavedSummary({
          hoVaTen: batchList.map((b) => b.hoVaTen).join(', '),
          soCCCD: `${batchList.length} hồ sơ`,
          chucVu: `${batchList.length} vị trí`,
          phongBan: 'Theo danh sách phân bổ',
          count: batchList.length,
        });
        setActiveTabStep(4);
      }
      return;
    }

    if (!hoVaTen.trim()) {
      setValidationError('Vui lòng nhập Họ và tên (VIẾT HOA).');
      setActiveTabStep(2);
      return;
    }
    if (!soCCCD.trim()) {
      setValidationError('Vui lòng nhập Số Căn cước công dân (12 số).');
      setActiveTabStep(2);
      return;
    }

    const payload = {
      ...currentRecordObject,
      isManualSalary: true,
    };

    const ok = await onSaveToSheet(payload);
    if (ok) {
      setIsSavedSuccess(true);
      setSavedSummary({
        hoVaTen: hoVaTen,
        soCCCD: soCCCD,
        chucVu: chucVu || 'Chưa phân bổ',
        phongBan: phong || ban || khoi || 'Chưa chọn',
        count: 1,
      });
      setActiveTabStep(5);
    }
  };

  // Kiểm tra trùng số CCCD với cơ sở dữ liệu đã lưu (Cảnh báo Bước 2)
  const cleanCurrentCCCD = soCCCD.replace(/\D/g, '');
  const duplicateCCCDRecord = cleanCurrentCCCD.length >= 9
    ? existingRecords?.find((r) => {
        if (!r.soCCCD) return false;
        const cleanExisting = r.soCCCD.replace(/\D/g, '');
        return cleanExisting === cleanCurrentCCCD;
      })
    : null;

  // Phân tích danh sách trường chưa rõ từ AI
  const thongTinChuaRo = initialData?.thongTinChuaRo || [];
  const cauHoiLamRo = initialData?.cauHoiLamRo || [];

  // Helper kiểm tra trường có bị thiếu hoặc cần làm rõ không
  const isFieldUnclear = (fieldName: string, value: string) => {
    if (!value || value.trim() === '') return true;
    return thongTinChuaRo.some((item) => item.toLowerCase().includes(fieldName.toLowerCase()));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Form Header with SOP Steps Navigation */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ${
                activeTabStep === 2 ? 'bg-blue-600' : activeTabStep === 3 ? 'bg-emerald-600' : activeTabStep === 4 ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}>
                {activeTabStep === 5 ? 'HOÀN TẤT' : `BƯỚC ${activeTabStep} / 4`}
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {activeTabStep === 2 && 'Bước 2: AI Trích Xuất Form'}
                {activeTabStep === 3 && 'Bước 3: Con Người Chọn Đơn Vị & Chức Vụ'}
                {activeTabStep === 4 && 'Bước 4: Bảng Tiêu Chuẩn Tiền Lương & Lưu Hồ Sơ'}
                {activeTabStep === 5 && 'Bước Sau Bước 4: Đã Lưu Hồ Sơ Thành Công'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
              Tài khoản: <strong className="text-blue-700">{userEmail}</strong>
            </div>
            {onBackToStep1 && (
              <button
                type="button"
                onClick={onBackToStep1}
                className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition cursor-pointer"
              >
                ← Quay lại Bước 1 (Tải/Chụp ảnh)
              </button>
            )}
          </div>
        </div>

        {/* Tab Stepper Bar for Step 2, 3, 4 and Post-Step 4 */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => handleSelectStep(2)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTabStep === 2
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              activeTabStep === 2 ? 'bg-white text-blue-700 font-black' : 'bg-slate-300 text-slate-700'
            }`}>
              2
            </span>
            <span>Bước 2: AI Trích Xuất Form</span>
            {duplicateCCCDRecord && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                Trùng CCCD
              </span>
            )}
            {cauHoiLamRo.length > 0 && (
              <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {cauHoiLamRo.length} câu hỏi
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectStep(3)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTabStep === 3
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              activeTabStep === 3 ? 'bg-white text-emerald-700 font-black' : 'bg-slate-300 text-slate-700'
            }`}>
              3
            </span>
            <span>Bước 3: Con Người Chọn Đơn Vị &amp; Chức Vụ</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectStep(4)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTabStep === 4
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              activeTabStep === 4 ? 'bg-white text-indigo-700 font-black' : 'bg-slate-300 text-slate-700'
            }`}>
              4
            </span>
            <span>Bước 4: Bảng Tiêu Chuẩn &amp; Lưu Sheet</span>
          </button>

          {/* Bước sau Bước 4: Hiển thị sau khi đã lưu thành công */}
          {isSavedSuccess && (
            <button
              type="button"
              onClick={() => handleSelectStep(5)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTabStep === 5
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ Đã Lưu &amp; Tiếp Nhận Mới</span>
            </button>
          )}
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================================= */}
        {/* BƯỚC 2: AI TRẢ RA THÔNG TIN THEO FORM TIÊU CHUẨN (HỎI LẠI NẾU KHÔNG RÕ) */}
        {/* ========================================================================= */}
        {activeTabStep === 2 && (
          <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/20 p-4 sm:p-5 animate-fade-in">
            {/* Header Bước 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded">
                    BƯỚC 2 (SOP)
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Trả Ra Thông Tin Nhân Viên Theo Form Tiêu Chuẩn
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Quy định nghiệp vụ SOP:</strong> Nếu có thông tin không rõ hoặc mờ trên ảnh, AI tuyệt đối <strong>không tự suy đoán</strong> mà hỏi lại để bạn xác nhận hoặc bổ sung.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-blue-700 bg-blue-100 font-semibold px-2 py-1 rounded">
                  Form tiêu chuẩn Bước 2 (Sẵn sàng nhận form từ bạn)
                </span>
              </div>
            </div>

            <EmployeeReviewGrid
              employees={batchList.length ? batchList : [{...currentRecordObject, id: 'single-review', hoVaTen, cauHoiLamRo: initialData?.cauHoiLamRo, thongTinChuaRo: initialData?.thongTinChuaRo}]}
              existingRecords={existingRecords}
              onChange={handleReviewChange}
            />

            {/* Điều hướng Bước 2 */}
            {activeTabStep === 2 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (onBackToStep1) onBackToStep1();
                    else if (onStepChange) onStepChange(1);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay Lại Bước 1 (Tải/Chụp lại ảnh)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (batchList.length ? batchList.some(employee => !employee.hoVaTen.trim()) : !hoVaTen.trim()) {
                      setValidationError('Vui lòng nhập họ tên cho tất cả nhân viên trước khi chuyển sang Bước 3.');
                      return;
                    }
                    setValidationError(null);
                    handleSelectStep(3);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Xác Nhận Bước 2 &amp; Tiếp Tục Sang Bước 3 (Phân Bổ Phòng Ban)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 3: CON NGƯỜI THAO TÁC - LỰA CHỌN PHÒNG BAN, BỘ PHẬN, CÔNG VIỆC CHỨC VỤ */}
        {/* ========================================================================= */}
        {activeTabStep === 3 && (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 sm:p-5 animate-fade-in">
            <EmployeeIntakeFields
              employees={batchList.length ? batchList : [{...currentRecordObject, id: 'single-review', hoVaTen}]}
              onChange={handleReviewChange}
            />
            {/* Header Bước 3 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-xs font-black px-2 py-0.5 rounded">
                    BƯỚC 3 (SOP)
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Điền Thông Tin Công Việc &amp; Chức Vụ Của Nhiều Người Cùng Lúc
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Bulk Job Assignment
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  HR có thể <strong>chọn nhiều hoặc tất cả nhân sự để gán nhanh</strong> cùng một Khối/Ban/Phòng, Công việc, Chức vụ và Điểm làm việc, hoặc tinh chỉnh độc lập từng người trong bảng ma trận phía dưới.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomOrg(!isCustomOrg)}
                  className="text-xs text-slate-600 hover:text-emerald-700 font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 transition"
                >
                  {isCustomOrg ? 'Dùng cơ cấu chuẩn' : 'Nhập cơ cấu tùy chỉnh'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomJob(!isCustomJob);
                    if (!isCustomJob) setIsManualMode(true);
                  }}
                  className="text-xs text-slate-600 hover:text-blue-700 font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 transition"
                >
                  {isCustomJob ? 'Dùng 22 chức danh chuẩn' : 'Chức vụ ngoài chuẩn'}
                </button>
              </div>
            </div>

            {/* Thông báo áp dụng thành công nếu có */}
            {bulkSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            {/* ================= KHỐI CÔNG CỤ ĐIỀN HÀNG LOẠT (BULK ASSIGN TOOLBAR) ================= */}
            {batchList.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-emerald-500/80 p-4 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      ⚡
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        Thanh Công Cụ Điền Hàng Loạt: Gán Vị Trí Cho Nhiều Người Cùng Lúc
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Tích chọn nhân viên cần gán &rarr; Chọn chức vụ &amp; cơ cấu &rarr; Bấm "Áp Dụng Cho Nhân Sự Đang Chọn".
                      </p>
                    </div>
                  </div>

                  {/* Chọn tất cả / Bỏ chọn tất cả */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllBatch}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {selectedBatchIds.length === batchList.length ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã chọn tất cả ({batchList.length})</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chọn tất cả ({batchList.length})</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Đang chọn: {selectedBatchIds.length} / {batchList.length} nhân sự
                    </span>
                  </div>
                </div>

                {/* Danh sách chip chọn nhanh nhân viên */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 mr-1">Tích chọn nhân sự:</span>
                  {batchList.map((emp, idx) => {
                    const isSelected = selectedBatchIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleToggleSelectOne(emp.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <div className="w-3 h-3 rounded-sm border border-slate-400" />
                        )}
                        <span>{idx + 1}. {emp.hoVaTen}</span>
                        {emp.chucVu && (
                          <span className="text-[10px] text-slate-400 font-normal">({emp.chucVu})</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Form điền hàng loạt */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200">
                  {/* Khối */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      1. Khối (Hàng loạt)
                    </label>
                    <select
                      value={bulkKhoi}
                      onChange={(e) => handleBulkKhoiChange(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-1 focus:ring-emerald-500"
                    >
                      {orgHierarchy.map((k) => (
                        <option key={k.name} value={k.name}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ban */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      2. Ban (Hàng loạt)
                    </label>
                    <select
                      value={bulkBan}
                      onChange={(e) => {
                        setBulkBan(e.target.value);
                        const kObj = orgHierarchy.find((k) => k.name === bulkKhoi);
                        const bObj = kObj?.bans.find((b) => b.name === e.target.value);
                        if (bObj && bObj.phongs.length > 0) {
                          setBulkPhong(bObj.phongs[0].name);
                        } else {
                          setBulkPhong('');
                        }
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-1 focus:ring-emerald-500"
                    >
                      {orgHierarchy.find((k) => k.name === bulkKhoi)?.bans.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phòng */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      3. Phòng (Hàng loạt)
                    </label>
                    <select
                      value={bulkPhong}
                      onChange={(e) => setBulkPhong(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-1 focus:ring-emerald-500"
                    >
                      {orgHierarchy.find((k) => k.name === bulkKhoi)
                        ?.bans.find((b) => b.name === bulkBan)
                        ?.phongs.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Công việc */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      4. Công việc dự kiến
                    </label>
                    <select
                      value={bulkCongViec}
                      onChange={(e) => handleBulkCongViecChange(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-blue-900 focus:ring-1 focus:ring-emerald-500"
                    >
                      {DEFAULT_JOB_POSITIONS.map((j) => (
                        <option key={j.name} value={j.name}>
                          {j.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chức vụ */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      5. Chức vụ (Title)
                    </label>
                    <select
                      value={bulkChucVu}
                      onChange={(e) => setBulkChucVu(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-emerald-400 rounded-lg bg-white font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    >
                      {DEFAULT_JOB_POSITIONS.find((j) => j.name === bulkCongViec)?.chucVus.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Điểm làm việc */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      6. Điểm làm việc
                    </label>
                    <input
                      type="text"
                      value={bulkDiemLamViec}
                      onChange={(e) => setBulkDiemLamViec(e.target.value)}
                      placeholder="Hà Nội - FPT Tower"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Loại hợp đồng */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      7. Loại Hợp Đồng
                    </label>
                    <select
                      value={bulkLoaiHopDong}
                      onChange={(e) => setBulkLoaiHopDong(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Toàn thời gian (Chính thức)">Toàn thời gian (Chính thức)</option>
                      <option value="Hợp đồng thử việc (60 ngày)">Hợp đồng thử việc (60 ngày)</option>
                      <option value="Hợp đồng xác định thời hạn (12 tháng)">Hợp đồng xác định thời hạn (12 tháng)</option>
                      <option value="Hợp đồng không xác định thời hạn">Hợp đồng không xác định thời hạn</option>
                      <option value="Bán thời gian (Part-time)">Bán thời gian (Part-time)</option>
                      <option value="Thời vụ / Khoán việc">Thời vụ / Khoán việc</option>
                    </select>
                  </div>

                  {/* Nút hành động áp dụng */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleApplyBulkPositionToSelected}
                      disabled={selectedBatchIds.length === 0}
                      className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer h-[34px]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Áp Dụng Cho {selectedBatchIds.length} Người</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= BẢNG MA TRẬN PHÂN BỔ VỊ TRÍ CHI TIẾT CỦA TỪNG NHÂN SỰ ================= */}
            {batchList.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">
                      Bảng Phân Bổ Công Việc &amp; Chức Vụ Chi Tiết ({batchList.length} nhân sự)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Bạn có thể chỉnh sửa trực tiếp từng dòng hoặc dùng thanh công cụ ở trên để gán hàng loạt
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200 font-bold z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.length === batchList.length && batchList.length > 0}
                            onChange={handleToggleSelectAllBatch}
                            className="rounded text-emerald-600"
                            title="Chọn / Bỏ chọn tất cả"
                          />
                        </th>
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Họ và Tên &amp; CCCD</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Khối &amp; Ban</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Công Việc</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Chức Vụ (Title)</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Điểm Làm Việc</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Loại Hợp Đồng</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Lương Chuẩn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchList.map((emp, idx) => {
                        const isSelected = selectedBatchIds.includes(emp.id);
                        const std = findTieuChuanLuong(emp.congViecDuKien, emp.chucVu);
                        return (
                          <tr
                            key={emp.id}
                            className={`hover:bg-emerald-50/30 transition ${
                              isSelected ? 'bg-emerald-50/15' : ''
                            }`}
                          >
                            {/* Checkbox chọn */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(emp.id)}
                                className="rounded text-emerald-600 cursor-pointer"
                              />
                            </td>

                            {/* STT */}
                            <td className="py-2 px-3 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Họ tên & CCCD */}
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900 uppercase">
                                {emp.hoVaTen}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                                <span>CCCD: {emp.soCCCD}</span>
                                {emp.nguonDiaChi === 'VNeID' && (
                                  <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                    VNeID
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Khối & Ban */}
                            <td className="py-2 px-3">
                              <select
                                value={emp.khoi || bulkKhoi}
                                onChange={(e) => {
                                  const newKhoi = e.target.value;
                                  const kObj = orgHierarchy.find((k) => k.name === newKhoi);
                                  const firstBan = kObj && kObj.bans.length > 0 ? kObj.bans[0].name : '';
                                  const firstPhong = kObj && kObj.bans.length > 0 && kObj.bans[0].phongs.length > 0 ? kObj.bans[0].phongs[0].name : '';
                                  handleUpdateBatchEmployeeRow(emp.id, {
                                    khoi: newKhoi,
                                    ban: firstBan,
                                    phong: firstPhong,
                                  });
                                }}
                                className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700"
                              >
                                {orgHierarchy.map((k) => (
                                  <option key={k.name} value={k.name}>
                                    {k.name}
                                  </option>
                                ))}
                              </select>
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                Ban: {emp.ban || bulkBan} | {emp.phong || bulkPhong}
                              </div>
                            </td>

                            {/* Công việc */}
                            <td className="py-2 px-3">
                              <select
                                value={emp.congViecDuKien || bulkCongViec}
                                onChange={(e) => {
                                  const newJob = e.target.value;
                                  const jobObj = DEFAULT_JOB_POSITIONS.find((j) => j.name === newJob);
                                  const firstTitle = jobObj && jobObj.chucVus.length > 0 ? jobObj.chucVus[0] : '';
                                  handleUpdateBatchEmployeeRow(emp.id, {
                                    congViecDuKien: newJob,
                                    chucVu: firstTitle,
                                  });
                                }}
                                className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-900"
                              >
                                {DEFAULT_JOB_POSITIONS.map((j) => (
                                  <option key={j.name} value={j.name}>
                                    {j.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Chức vụ */}
                            <td className="py-2 px-3">
                              <select
                                value={emp.chucVu || bulkChucVu}
                                onChange={(e) => {
                                  handleUpdateBatchEmployeeRow(emp.id, {
                                    chucVu: e.target.value,
                                  });
                                }}
                                className="w-full text-xs px-2 py-1 bg-white border border-emerald-300 rounded font-bold text-emerald-900"
                              >
                                {DEFAULT_JOB_POSITIONS.find(
                                  (j) => j.name === (emp.congViecDuKien || bulkCongViec)
                                )?.chucVus.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Điểm làm việc */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={emp.diemLamViec || bulkDiemLamViec}
                                onChange={(e) =>
                                  handleUpdateBatchEmployeeRow(emp.id, {
                                    diemLamViec: e.target.value,
                                  })
                                }
                                className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded text-slate-700"
                              />
                            </td>

                            {/* Loại HĐ */}
                            <td className="py-2 px-3">
                              <select
                                value={emp.loaiHopDong || bulkLoaiHopDong}
                                onChange={(e) =>
                                  handleUpdateBatchEmployeeRow(emp.id, {
                                    loaiHopDong: e.target.value,
                                  })
                                }
                                className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded text-slate-700"
                              >
                                <option value="Toàn thời gian (Chính thức)">Toàn thời gian</option>
                                <option value="Hợp đồng thử việc (60 ngày)">Thử việc 60 ngày</option>
                                <option value="Hợp đồng xác định thời hạn (12 tháng)">12 tháng</option>
                                <option value="Hợp đồng không xác định thời hạn">Không thời hạn</option>
                                <option value="Bán thời gian (Part-time)">Part-time</option>
                                <option value="Thời vụ / Khoán việc">Thời vụ</option>
                              </select>
                            </td>

                            {/* Lương chuẩn tự động gợi ý */}
                            <td className="py-2 px-3 text-center">
                              {std ? (
                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-mono font-bold text-[10px]" title={`Lương CB: ${formatVND(std.luongCoBan)} đ, PC: ${formatVND(std.phuCapChucVu)} đ`}>
                                  {formatVND(std.luongCoBan)} đ
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Theo vị trí</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Thẻ tóm tắt hồ sơ nhân sự đang xử lý */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                  {hoVaTen ? hoVaTen.trim().charAt(0) : 'NV'}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Đang phân bổ nhân sự:</div>
                  <div className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                    {hoVaTen || 'Ứng viên chưa đặt tên'}
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 mt-0.5">
                    <span>CCCD: <strong className="text-slate-700 font-mono">{soCCCD || 'Chưa có'}</strong></span>
                    <span>SĐT: <strong className="text-slate-700 font-mono">{soDienThoai || 'Chưa có'}</strong></span>
                    <span>Ngày sinh: <strong className="text-slate-700">{ngaySinh || 'Chưa có'}</strong></span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectStep(2)}
                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Kiểm tra lại thông tin cá nhân (Bước 2)</span>
              </button>
            </div>

            {/* Dải Breadcrumb hiển thị phân bổ */}
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  Cơ cấu:
                </span>
                <span className="bg-slate-100 border border-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded">
                  Khối: {khoi || 'Chưa chọn'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="bg-slate-100 border border-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded">
                  Ban: {ban || 'Chưa chọn'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                  Phòng: {phong || 'Chưa chọn'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  Chức danh:
                </span>
                <span className="bg-blue-50 border border-blue-200 text-blue-900 font-semibold px-2 py-0.5 rounded">
                  Công việc: {congViecDuKien}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Chức vụ: {chucVu}
                </span>
                {matchedStandard && (
                  <span className="ml-auto text-[11px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                    Khớp chuẩn: {formatVND(matchedStandard.luongCoBan)} đ
                  </span>
                )}
              </div>
            </div>

            {/* Trường chọn Cơ Cấu Tổ Chức */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                1. Lựa Chọn Phòng Ban &amp; Đơn Vị Công Tác
              </span>
              {!isCustomOrg ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cấp Khối <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={khoi}
                      onChange={(e) => handleKhoiChange(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {orgHierarchy.map((k) => (
                        <option key={k.id} value={k.name}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cấp Ban <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={ban}
                      onChange={(e) => handleBanChange(e.target.value)}
                      disabled={!khoi}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium disabled:bg-slate-100"
                    >
                      {orgHierarchy.find((k) => k.name === khoi)?.bans.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cấp Phòng <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={phong}
                      onChange={(e) => setPhong(e.target.value)}
                      disabled={!ban}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium disabled:bg-slate-100"
                    >
                      {orgHierarchy.find((k) => k.name === khoi)
                        ?.bans.find((b) => b.name === ban)
                        ?.phongs.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Tên Khối"
                    value={khoi}
                    onChange={(e) => setKhoi(e.target.value)}
                    className="text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Tên Ban"
                    value={ban}
                    onChange={(e) => setBan(e.target.value)}
                    className="text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Tên Phòng"
                    value={phong}
                    onChange={(e) => setPhong(e.target.value)}
                    className="text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Trường chọn Công Việc & Chức Vụ */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                2. Lựa Chọn Công Việc &amp; Chức Vụ
              </span>
              {!isCustomJob ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nhóm Công Việc <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={congViecDuKien}
                      onChange={(e) => handleJobChange(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {DEFAULT_JOB_POSITIONS.map((job) => (
                        <option key={job.id} value={job.name}>
                          {job.name} ({job.chucVus.length} chức vụ)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chức Vụ Tương Ứng <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={chucVu}
                      onChange={(e) => setChucVu(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-indigo-900"
                    >
                      {DEFAULT_JOB_POSITIONS.find((j) => j.name === congViecDuKien)?.chucVus.map((pos) => {
                        const std = DEFAULT_TIEU_CHUAN_LUONG.find((t) => t.chucVu === pos && t.congViec === congViecDuKien);
                        return (
                          <option key={pos} value={pos}>
                            {pos} {std ? `[Lương CB: ${formatVND(std.luongCoBan)} đ]` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nhập tên công việc..."
                    value={congViecDuKien}
                    onChange={(e) => setCongViecDuKien(e.target.value)}
                    className="text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Nhập tên chức vụ..."
                    value={chucVu}
                    onChange={(e) => setChucVu(e.target.value)}
                    className="text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-bold text-indigo-900"
                  />
                </div>
              )}
            </div>

            {/* Điều hướng Bước 3 */}
            {activeTabStep === 3 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSelectStep(2)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay Lại Bước 2 (Thông tin cá nhân &amp; VNeID)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!chucVu.trim() || !congViecDuKien.trim()) {
                      setValidationError('Vui lòng chọn Công việc và Chức vụ trước khi sang Bước 4.');
                      return;
                    }
                    setValidationError(null);
                    handleSelectStep(4);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Xác Nhận Bước 3 &amp; Sang Bước 4 (Lương &amp; Xuất File)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 4: 12 KHOẢN LƯƠNG & PHỤ CẤP (ĐIỀN TAY) + LƯU SHEET + XUẤT EXCEL 43 CỘT */}
        {/* ========================================================================= */}
        {activeTabStep === 4 && (
          <div className="space-y-5 rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 sm:p-5 animate-fade-in">
            {/* Header Bước 4 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-xs font-black px-2 py-0.5 rounded">
                    BƯỚC 4 (SOP)
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Bảng 12 Khoản Lương &amp; Phụ Cấp (HR Điền Tay / Hiệu Chỉnh) &amp; Xuất File Excel
                  </h3>
                </div>
              </div>

            </div>

            <EmployeeSalaryGrid
              employees={getBatchRecordObjects().map(employee => batchList.length ? employee : {...employee,id:'single-salary'})}
              onChange={handleSalaryChange}
              disabled={isSaving || isSavedSuccess}
            />

            {isSavedSuccess && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span>Đã lưu thành công {savedSummary?.count || 1} hồ sơ trong danh sách.</span><button type="button" onClick={() => handleSelectStep(5)} className="font-bold underline">Xem kết quả tiếp nhận</button></div>}

            {/* Điều hướng & Nút Lưu Dữ Liệu Vào Sheet + Nút Xuất File Excel */}
            <div className="pt-3 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectStep(3)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay Lại Bước 3 (Chức vụ &amp; Phòng ban)</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                {/* NÚT XUẤT FILE EXCEL (.XLSX) */}
                <button
                  type="button"
                  onClick={handleExportSingleExcel}
                  disabled={isExportingExcel}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-400 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-600" />
                  <span>
                    {isExportingExcel
                      ? 'Đang tạo File Excel...'
                      : batchList.length > 1
                      ? `Xuất File Excel (.xlsx) [${batchList.length} Nhân Viên - 43 Cột & 4 Màu]`
                      : 'Xuất File Excel (.xlsx) [43 Cột - 4 Màu Header]'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled
                  aria-label="Xuất thông tin hộ gia đình"
                  aria-describedby="household-export-template-note"
                  className="w-full sm:w-auto px-5 py-3 bg-slate-50 text-slate-500 border-2 border-slate-200 rounded-xl text-xs sm:text-sm font-bold flex flex-wrap items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Users className="w-4 h-4" />
                  <span>Xuất thông tin hộ gia đình</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Chờ mẫu</span>
                </button>

                {/* NÚT LƯU VÀO GOOGLE SHEETS */}
                <button
                  type="submit"
                  disabled={isSaving || isSavedSuccess}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <span>Đang lưu hồ sơ...</span>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>
                        {batchList.length > 1
                          ? `Lưu ${batchList.length} Hồ Sơ Vào Hệ Thống`
                          : 'Lưu Hồ Sơ Vào Hệ Thống'}
                      </span>
                    </>
                  )}
                </button>
                <p id="household-export-template-note" className="w-full text-xs text-slate-500">
                  Xuất thông tin hộ gia đình sẽ được kích hoạt khi có mẫu xuất.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC SAU BƯỚC 4 (BƯỚC 5): HOÀN TẤT & TIẾP NHẬN HỒ SƠ MỚI TIẾP THEO       */}
        {/* ========================================================================= */}
        {activeTabStep === 5 && (
          <div className="space-y-6 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-6 sm:p-10 shadow-lg animate-in fade-in duration-300">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-100">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <span className="inline-block text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full mb-2">
                  ✓ BƯỚC HOÀN TẤT (SAU BƯỚC 4): ĐÃ LƯU HỒ SƠ THÀNH CÔNG
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Đã Lưu Dòng Dữ Liệu Nhân Sự Thành Công!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Dữ liệu của nhân sự <strong>{savedSummary?.hoVaTen || hoVaTen}</strong> đã được lưu vào hệ thống. Hãy bấm nút bên dưới để tiếp nhận hồ sơ nhân viên mới tiếp theo!
                </p>
              </div>

              {/* Thẻ tóm tắt thông tin chi tiết của nhân sự vừa lưu */}
              {savedSummary && (
                <div className="bg-white rounded-2xl border border-emerald-200 p-5 text-xs text-left grid grid-cols-1 sm:grid-cols-2 gap-3.5 shadow-sm">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">HỌ VÀ TÊN</span>
                    <strong className="text-slate-900 text-sm font-bold block">{savedSummary.hoVaTen}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">SỐ CĂN CƯỚC CÔNG DÂN</span>
                    <strong className="text-slate-900 text-sm font-mono font-bold block">{savedSummary.soCCCD}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">CHỨC VỤ / VỊ TRÍ</span>
                    <strong className="text-blue-700 font-bold block">{savedSummary.chucVu}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">ĐƠN VỊ CÔNG TÁC</span>
                    <strong className="text-slate-700 font-bold block">{savedSummary.phongBan}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">LƯƠNG CƠ BẢN</span>
                    <strong className="text-slate-900 font-mono font-bold block">{formatVND(luongCoBan)} đ</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">TỔNG THU NHẬP DỰ KIẾN</span>
                    <strong className="text-emerald-700 font-mono font-black text-sm block">{formatVND(tongThuNhapDuKien)} đ</strong>
                  </div>
                </div>
              )}

              {/* NÚT CHÍNH NỔI BẬT ĐƯỢC YÊU CẦU: + TIẾP NHẬN HỒ SƠ MỚI (NHẬP NHÂN VIÊN TIẾP THEO) */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                {onResetNewRecord && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavedSuccess(false);
                      setSavedSummary(null);
                      setActiveTabStep(2);
                      onResetNewRecord();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-base sm:text-lg font-black shadow-xl hover:shadow-2xl transition cursor-pointer active:scale-98 ring-4 ring-blue-100"
                  >
                    <Plus className="w-6 h-6" />
                    <span>+ Tiếp Nhận Hồ Sơ Mới (Nhập Nhân Viên Tiếp Theo)</span>
                  </button>
                )}
              </div>

              {/* Các thao tác phụ */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTabStep(4)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Xem lại biểu mẫu Bước 4
                </button>
                {onViewRecordsTab && (
                  <button
                    type="button"
                    onClick={onViewRecordsTab}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Mở Bảng Danh Sách Nhân Sự</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
