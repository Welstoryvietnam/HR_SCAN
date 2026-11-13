import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, OptimizedImageFile, EmployeeDocumentGroup } from '../types';
import {
  HEALTH_CHECK_ITEMS,
  HEALTH_CHECK_GROUP_LABELS,
  HEALTH_PRESET_TEMPLATES,
  DEFAULT_HEALTH_CHECK_STANDARDS,
  HEALTH_STANDARD_GAS_CODE_GS,
  createHealthItemsMap,
  type HealthCheckStandardItem,
  type HealthCheckItemKey,
  type HealthCheckColumnDef,
} from '../data/healthCheckStandards';
import { safeFetchJson } from '../utils/apiHelper';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { extractOCRGroup } from '../utils/ocrClient';
import { DEFAULT_JOB_POSITIONS } from '../data/jobPositionHierarchy';
import { DEFAULT_ORGANIZATION_HIERARCHY } from '../data/organizationHierarchy';
import { RecruitmentHealthDashboard } from './RecruitmentHealthDashboard';
import {
  exportRecruitmentHealthExcel,
  exportRecruitmentSummaryMultiSheet,
  filterRecruitmentRecordsForExport,
  type RecruitmentExportKind,
} from '../utils/recruitmentHealthExport';
import {
  Stethoscope,
  Search,
  Filter,
  Plus,
  Download,
  Copy,
  Check,
  Edit3,
  Upload,
  Trash2,
  X,
  Building2,
  MapPin,
  Clock,
  Hospital,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Code2,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  ClipboardList,
  Info,
  ShieldAlert,
  UserPlus,
  FileText,
  CalendarCheck,
  Phone,
  Mail,
  Camera,
  Send,
  BarChart3,
  UserX,
  UserCheck,
} from 'lucide-react';

export interface HealthcareProviderItem {
  id: string;
  tenNhaCungCap: string;
  diaChi: string;
  thoiHanHopDong: string;
  nguoiPhuTrach: string;
  soDienThoai: string;
  email: string;
  dichVuTheManh: string;
  ghiChu: string;
}

export interface RecruitmentHealthRegItem {
  id: string;
  hoVaTen: string;
  soCCCD: string;
  ngaySinh: string;
  gioiTinh: string;
  khoi: string;
  ban: string;
  phong: string;
  congViec: string;
  chucVu: string;
  nhaCungCap: string;
  ngayDangKyKham: string;
  ngayHenKham: string;
  nguoiDangKy: string;
  ghiChu: string;
  soDienThoai?: string;
  phongBanKhoi?: string;
  viTriViecLam?: string;
  trangThai?: string;
  trangThaiNhanViec?: 'Chưa xử lý' | 'Đã nhận việc' | 'Không nhận việc';
  lyDoKhongNhanViec?: string;
}

export interface RecruitmentStandardItem {
  id: string;
  nhomDoiTuong: string;
  chiTieuKhamBatBuoc: string[];
  luuYdacBiet: string;
}

interface HealthCheckStandardsManagerProps {
  currentUser: UserProfile;
  onTransferToNewEmployee?: (reg: RecruitmentHealthRegItem) => void;
}

const PHAN_LOAI_OPTIONS = ['Bếp Samsung', 'Bếp ngoài', 'OFFICE'];
const THOI_HAN_OPTIONS = [
  '6 tháng',
  '12 tháng',
  '6 tháng (bếp chính)-12 tháng (bếp phụ)',
];
const MUC_DICH_OPTIONS = ['ĐK', 'ĐK VP', 'ĐK 4C', 'ĐK & GPLĐ', 'TD & GPLĐ'];
const KHU_VUC_OPTIONS = [
  'Bắc Ninh',
  'Thái Nguyên',
  'Hà Nội',
  'Ninh Bình',
  'Phú Thọ',
  'Hải Phòng',
  'Nghệ An',
  'TP.HCM',
];
const NHA_CUNG_CAP_SUGGESTIONS = [
  'Hữu Phúc',
  'Âu Cơ',
  'Huệ Linh',
  'Đông Âu',
  'Medlatec',
  'Hồng Ngọc',
  'Hoàn Mỹ',
];

export const RECRUITMENT_CHECK_ITEMS = HEALTH_CHECK_ITEMS.filter(
  (col) =>
    ![
      'khamPhuKhoa',
      'tamSoatTuyenVu',
      'tamSoatUngThuCoTuCung',
      'sieuAmOBung',
      'nhomMauRh',
      'nhomMauABO',
    ].includes(col.key)
);

export const HealthCheckStandardsManager: React.FC<HealthCheckStandardsManagerProps> = ({
  currentUser,
  onTransferToNewEmployee,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isMedicalStaff = !isAdmin && currentUser.hrmRole === 'nhan_vien_y_te';
  const isRecruiter = !isAdmin && !isMedicalStaff;

  const [standards, setStandards] = useState<HealthCheckStandardItem[]>(() => {
    try {
      const cached = localStorage.getItem('hr_health_check_standards');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_HEALTH_CHECK_STANDARDS;
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Main Tabs & Participants state
  const [activeMainTab, setActiveMainTab] = useState<'standards' | 'participants'>('standards');
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterActivity, setFilterActivity] = useState<'ALL' | 'ksk' | 'blood'>('ALL');

  // Sub-tabs state for Tiêu chuẩn KSK
  const [healthSubTab, setHealthSubTab] = useState<
    | 'tuyen_dung_dang_ky'
    | 'tuyen_dung_theo_doi'
    | 'tuyen_dung_tieu_chuan'
    | 'dinh_ky'
    | 'nha_cung_cap'
    | 'tuyen_dung_dashboard'
  >(() => (isMedicalStaff ? 'tuyen_dung_theo_doi' : 'tuyen_dung_dang_ky'));

  // Enforce role permissions on active sub-tab
  useEffect(() => {
    if (isMedicalStaff && healthSubTab === 'tuyen_dung_dang_ky') {
      setHealthSubTab('tuyen_dung_theo_doi');
    } else if (
      isRecruiter &&
      (healthSubTab === 'tuyen_dung_theo_doi' ||
        healthSubTab === 'dinh_ky' ||
        healthSubTab === 'nha_cung_cap' ||
        healthSubTab === 'tuyen_dung_dashboard')
    ) {
      setHealthSubTab('tuyen_dung_dang_ky');
    }
  }, [isMedicalStaff, isRecruiter, healthSubTab]);

  // 1. Nhà cung cấp KSK (Providers)
  const [providers, setProviders] = useState<HealthcareProviderItem[]>(() => {
    try {
      const cached = localStorage.getItem('hr_healthcare_providers');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'prov-1',
        tenNhaCungCap: 'Phòng khám Đa khoa Hữu Phúc',
        diaChi: 'KCN Yên Phong, Bắc Ninh',
        thoiHanHopDong: '31/12/2026',
        nguoiPhuTrach: 'Bs. Nguyễn Văn Hùng',
        soDienThoai: '0912345678',
        email: 'contact@huuphuclinic.vn',
        dichVuTheManh: 'Khám tuyển dụng nhanh, XN máu, X-Quang phổi',
        ghiChu: 'Đối tác chiến lược KCN Yên Phong.',
      },
      {
        id: 'prov-2',
        tenNhaCungCap: 'Bệnh viện Đa khoa Âu Cơ',
        diaChi: 'TP. Bắc Ninh',
        thoiHanHopDong: '30/06/2026',
        nguoiPhuTrach: 'ThS. Trần Thị Mai',
        soDienThoai: '0988776655',
        email: 'hospital@auco.vn',
        dichVuTheManh: 'Khám chuyên khoa sâu, siêu âm, phụ khoa',
        ghiChu: 'Ưu đãi giá khám đoàn.',
      },
      {
        id: 'prov-3',
        tenNhaCungCap: 'Phòng khám Đa khoa Huệ Linh',
        diaChi: 'Yên Phong, Bắc Ninh',
        thoiHanHopDong: '15/10/2026',
        nguoiPhuTrach: 'Lê Văn Tuấn',
        soDienThoai: '0903112233',
        email: 'huelinh@clinic.vn',
        dichVuTheManh: 'Xét nghiệm viên gan, ma túy, soi phân',
        ghiChu: 'Lấy mẫu tại doanh nghiệp theo yêu cầu.',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_healthcare_providers', JSON.stringify(providers));
    } catch {}
  }, [providers]);

  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<HealthcareProviderItem | null>(null);
  const [provTen, setProvTen] = useState('');
  const [provDiaChi, setProvDiaChi] = useState('');
  const [provThoiHan, setProvThoiHan] = useState('');
  const [provPhuTrach, setProvPhuTrach] = useState('');
  const [provDienThoai, setProvDienThoai] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provDichVu, setProvDichVu] = useState('');
  const [provGhiChu, setProvGhiChu] = useState('');

  const handleOpenProviderModal = (prov?: HealthcareProviderItem) => {
    if (prov) {
      setEditingProvider(prov);
      setProvTen(prov.tenNhaCungCap);
      setProvDiaChi(prov.diaChi);
      setProvThoiHan(prov.thoiHanHopDong);
      setProvPhuTrach(prov.nguoiPhuTrach);
      setProvDienThoai(prov.soDienThoai);
      setProvEmail(prov.email);
      setProvDichVu(prov.dichVuTheManh);
      setProvGhiChu(prov.ghiChu);
    } else {
      setEditingProvider(null);
      setProvTen('');
      setProvDiaChi('');
      setProvThoiHan('');
      setProvPhuTrach('');
      setProvDienThoai('');
      setProvEmail('');
      setProvDichVu('');
      setProvGhiChu('');
    }
    setIsProviderModalOpen(true);
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provTen.trim()) {
      showToast('error', 'Vui lòng nhập tên nhà cung cấp!');
      return;
    }
    const newItem: HealthcareProviderItem = {
      id: editingProvider ? editingProvider.id : 'prov-' + Date.now(),
      tenNhaCungCap: provTen.trim(),
      diaChi: provDiaChi.trim(),
      thoiHanHopDong: provThoiHan.trim(),
      nguoiPhuTrach: provPhuTrach.trim(),
      soDienThoai: provDienThoai.trim(),
      email: provEmail.trim(),
      dichVuTheManh: provDichVu.trim(),
      ghiChu: provGhiChu.trim(),
    };
    const updated = editingProvider
      ? providers.map((p) => (p.id === editingProvider.id ? newItem : p))
      : [newItem, ...providers];
    setProviders(updated);
    setIsProviderModalOpen(false);
    showToast('success', editingProvider ? 'Đã cập nhật nhà cung cấp thành công!' : 'Đã thêm nhà cung cấp mới thành công!');
  };

  const handleDeleteProvider = (id: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa nhà cung cấp này không?')) return;
    setProviders(providers.filter((p) => p.id !== id));
    showToast('success', 'Đã xóa nhà cung cấp thành công!');
  };

  // 2. Đăng ký KSK Tuyển dụng
  const lookupNhaCungCap = (phongName: string) => {
    const found = standards.find(s => s.phong.toLowerCase() === phongName.toLowerCase() || s.phong.toLowerCase().includes(phongName.toLowerCase()));
    if (found && found.nhaCungCap) return found.nhaCungCap;
    return providers[0]?.tenNhaCungCap || 'Phòng khám Đa khoa Hữu Phúc';
  };

  const [recruitmentRegs, setRecruitmentRegs] = useState<RecruitmentHealthRegItem[]>(() => {
    try {
      const cached = localStorage.getItem('hr_recruitment_health_regs');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'reg-1',
        hoVaTen: 'Nguyễn Văn An',
        soCCCD: '001098002345',
        ngaySinh: '1998-05-12',
        gioiTinh: 'Nam',
        khoi: 'FS MANAGEMENT',
        ban: 'FS1',
        phong: 'SEV1',
        congViec: 'Đầu Bếp',
        chucVu: 'Bếp Chính',
        nhaCungCap: 'Phòng khám Đa khoa Hữu Phúc',
        ngayDangKyKham: '2026-11-10',
        ngayHenKham: '2026-11-15',
        nguoiDangKy: currentUser.name || currentUser.email,
        ghiChu: 'Đợt tuyển dụng tháng 11/2026',
        trangThai: 'Chờ khám',
      },
      {
        id: 'reg-2',
        hoVaTen: 'Trần Thị Bình',
        soCCCD: '038195004123',
        ngaySinh: '2000-09-20',
        gioiTinh: 'Nữ',
        khoi: 'FS BUSINESS SUPPORT',
        ban: 'PRODUCT PLANNING',
        phong: 'CULINARY ACADEMY',
        congViec: 'Dinh Dưỡng Viên',
        chucVu: 'DDV I',
        nhaCungCap: 'Phòng khám Đa khoa Huệ Linh',
        ngayDangKyKham: '2026-11-08',
        ngayHenKham: '2026-11-10',
        nguoiDangKy: currentUser.name || currentUser.email,
        ghiChu: 'Đã có kết quả xét nghiệm phân và viêm gan A, E.',
        trangThai: 'Đã khám - Đạt',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_recruitment_health_regs', JSON.stringify(recruitmentRegs));
    } catch {}
  }, [recruitmentRegs]);

  // Bước 1: Danh sách đăng ký nháp tại Bảng 2 (chỉ đẩy sang Bước 2 sau khi nhấn "Gửi đăng ký")
  const [draftRecruitmentRegs, setDraftRecruitmentRegs] = useState<RecruitmentHealthRegItem[]>(() => {
    try {
      const cached = localStorage.getItem('hr_recruitment_health_drafts');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_recruitment_health_drafts', JSON.stringify(draftRecruitmentRegs));
    } catch {}
  }, [draftRecruitmentRegs]);

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<RecruitmentHealthRegItem | null>(null);
  const [regHoVaTen, setRegHoVaTen] = useState('');
  const [regCCCD, setRegCCCD] = useState('');
  const [regNgaySinh, setRegNgaySinh] = useState('2000-01-01');
  const [regGioiTinh, setRegGioiTinh] = useState('Nam');
  const [regKhoi, setRegKhoi] = useState(DEFAULT_ORGANIZATION_HIERARCHY[0]?.name || '');
  const [regBan, setRegBan] = useState(DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.name || '');
  const [regPhong, setRegPhong] = useState(DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.phongs[0]?.name || '');
  const [regCongViec, setRegCongViec] = useState(DEFAULT_JOB_POSITIONS[0]?.name || '');
  const [regChucVu, setRegChucVu] = useState(DEFAULT_JOB_POSITIONS[0]?.chucVus[0] || '');
  const [regNhaCungCap, setRegNhaCungCap] = useState(lookupNhaCungCap(DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.phongs[0]?.name || ''));
  const [regNgayDangKyKham, setRegNgayDangKyKham] = useState(new Date().toISOString().slice(0, 10));
  const [regNgayHenKham, setRegNgayHenKham] = useState(new Date().toISOString().slice(0, 10));
  const [regNguoiDangKy, setRegNguoiDangKy] = useState(currentUser.name || currentUser.email);
  const [regGhiChu, setRegGhiChu] = useState('');
  const [isOcrScanning, setIsOcrScanning] = useState(false);

  // Multi-candidate upload slots for recruitment registration step 1 (isolated photo upload/capture boxes per candidate)
  interface RecruitmentUploadSlot {
    id: string;
    files: OptimizedImageFile[];
    scanning?: boolean;
    ocrDone?: boolean;
    statusText?: string;
    engineLabel?: string;
    ocrError?: string;
    extracted?: {
      hoVaTen?: string;
      soCCCD?: string;
      ngaySinh?: string;
      gioiTinh?: string;
    };
  }

  const createEmptySlot = (suffix?: string | number): RecruitmentUploadSlot => ({
    id: `slot-${Date.now()}-${suffix ?? Math.random().toString(36).slice(2, 6)}`,
    files: [],
  });

  const [recruitmentUploadSlots, setRecruitmentUploadSlots] = useState<RecruitmentUploadSlot[]>([
    createEmptySlot(1),
    createEmptySlot(2),
  ]);
  const [isBatchRegistering, setIsBatchRegistering] = useState(false);

  const normalizeDateForInput = (val?: string): string => {
    if (!val) return '2000-01-01';
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    return trimmed;
  };

  const runSlotOcrExtraction = async (
    slotId: string,
    docs: OptimizedImageFile[],
    slotIndex: number
  ): Promise<{ hoVaTen?: string; soCCCD?: string; ngaySinh?: string; gioiTinh?: string }> => {
    if (docs.length === 0) return {};

    setRecruitmentUploadSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, scanning: true, ocrError: undefined, statusText: 'Đang đọc bằng AI Gemini & OCR...' }
          : s
      )
    );

    const group: EmployeeDocumentGroup = {
      id: slotId,
      label: `Ứng viên #${slotIndex + 1}`,
      documents: docs,
    };

    try {
      const reply = await extractOCRGroup(
        group,
        (updatedDoc) => {
          setRecruitmentUploadSlots((prev) =>
            prev.map((s) =>
              s.id === slotId
                ? { ...s, files: s.files.map((f) => (f.id === updatedDoc.id ? updatedDoc : f)) }
                : s
            )
          );
        },
        (statusMsg) => {
          setRecruitmentUploadSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, statusText: statusMsg } : s))
          );
        },
        'ai'
      );

      if (reply.ok && reply.data?.success && reply.data.data) {
        const d = reply.data.data;
        const extracted = {
          hoVaTen: (d.hoVaTen || d.hoTen || '').trim(),
          soCCCD: (d.soCCCD || '').replace(/\D/g, ''),
          ngaySinh: normalizeDateForInput(d.ngaySinh),
          gioiTinh: d.gioiTinh || 'Nam',
        };
        const engineLabel = d.aiVisionExtracted ? 'Gemini AI + OCR' : 'OCR';
        setRecruitmentUploadSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  scanning: false,
                  ocrDone: true,
                  ocrError: undefined,
                  engineLabel,
                  statusText: extracted.hoVaTen
                    ? `${engineLabel}: ${extracted.hoVaTen}`
                    : `Đã đọc (${engineLabel})`,
                  extracted,
                }
              : s
          )
        );
        return extracted;
      }

      const errMsg = reply.data?.error || reply.error || 'Chưa đọc được thông tin từ ảnh.';
      setRecruitmentUploadSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, scanning: false, ocrDone: false, ocrError: errMsg, statusText: undefined }
            : s
        )
      );
      showToast('error', `Ứng viên #${slotIndex + 1}: ${errMsg}`);
      return {};
    } catch (err) {
      const errMsg = (err as Error).message || 'Lỗi kết nối AI Gemini / OCR.';
      setRecruitmentUploadSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, scanning: false, ocrDone: false, ocrError: errMsg, statusText: undefined }
            : s
        )
      );
      showToast('error', `Ứng viên #${slotIndex + 1}: ${errMsg}`);
      return {};
    }
  };

  const handleAddRecruitmentSlot = () => {
    setRecruitmentUploadSlots((prev) => [...prev, createEmptySlot(prev.length + 1)]);
  };

  const handleRemoveRecruitmentSlot = (id: string) => {
    if (recruitmentUploadSlots.length === 1) {
      setRecruitmentUploadSlots([createEmptySlot(1)]);
      return;
    }
    setRecruitmentUploadSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSlotFilesAdded = async (slotId: string, fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    const slotIndex = recruitmentUploadSlots.findIndex((s) => s.id === slotId);
    setRecruitmentUploadSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, scanning: true, ocrDone: false, ocrError: undefined, statusText: 'Đang tối ưu ảnh...' }
          : s
      )
    );

    try {
      const optimized = await Promise.all(rawFiles.map((f) => optimizeImageFile(f, 'cccd_truoc')));
      setRecruitmentUploadSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s;
          const mergedDocs = [...s.files, ...optimized];
          return {
            ...s,
            files: mergedDocs,
            scanning: false,
            ocrDone: false,
            ocrError: undefined,
            extracted: undefined,
            statusText: `Đã tải ${mergedDocs.length} ảnh — chờ quét AI`,
          };
        })
      );
      showToast(
        'success',
        `Đã tải ${rawFiles.length} ảnh cho Nhân viên #${Math.max(1, slotIndex + 1)}. Nhấn "Quét AI & Đưa vào bảng" để trích xuất.`
      );
    } catch {
      setRecruitmentUploadSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, scanning: false, ocrError: 'Không thể đọc tệp ảnh.' } : s))
      );
      showToast('error', 'Không thể đọc tệp ảnh đã chọn.');
    }
  };

  const handleRemoveSlotFile = (slotId: string, fileId: string) => {
    setRecruitmentUploadSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const remaining = s.files.filter((f) => f.id !== fileId);
        return {
          ...s,
          files: remaining,
          ocrDone: remaining.length > 0 ? s.ocrDone : false,
          extracted: remaining.length > 0 ? s.extracted : undefined,
        };
      })
    );
  };

  const handleBatchRegisterSlots = async () => {
    const filledSlots = recruitmentUploadSlots.filter((s) => s.files.length > 0);
    if (filledSlots.length === 0) {
      showToast('error', 'Vui lòng tải lên hoặc chụp ảnh CCCD cho ít nhất 1 ứng viên!');
      return;
    }

    setIsBatchRegistering(true);
    try {
      const defKhoi = DEFAULT_ORGANIZATION_HIERARCHY[0];
      const defBan = defKhoi?.bans[0];
      const defPhong = defBan?.phongs[0]?.name || 'SEV1';
      const defJob = DEFAULT_JOB_POSITIONS[0];
      const today = new Date().toISOString().slice(0, 10);

      const newRegs: RecruitmentHealthRegItem[] = [];
      for (let i = 0; i < filledSlots.length; i++) {
        const slot = filledSlots[i];
        const idxInList = recruitmentUploadSlots.findIndex((s) => s.id === slot.id);
        const extracted =
          slot.ocrDone && slot.extracted
            ? slot.extracted
            : await runSlotOcrExtraction(slot.id, slot.files, Math.max(0, idxInList));

        newRegs.push({
          id: 'reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          hoVaTen: extracted.hoVaTen || `Ứng viên mới #${i + 1}`,
          soCCCD: extracted.soCCCD || '',
          ngaySinh: extracted.ngaySinh || '2000-01-01',
          gioiTinh: extracted.gioiTinh || 'Nam',
          khoi: defKhoi?.name || 'FS MANAGEMENT',
          ban: defBan?.name || 'FS1',
          phong: defPhong,
          congViec: defJob?.name || 'Bán Hàng',
          chucVu: defJob?.chucVus[0] || 'Nhân viên',
          nhaCungCap: lookupNhaCungCap(defPhong),
          ngayDangKyKham: today,
          ngayHenKham: today,
          nguoiDangKy: currentUser.name || currentUser.email,
          ghiChu: `Đã tải ${slot.files.length} ảnh CCCD`,
          trangThai: 'Chờ khám',
        });
      }

      setDraftRecruitmentRegs((prev) => [...newRegs, ...prev]);
      showToast('success', `Đã trích xuất & đưa ${newRegs.length} ứng viên vào bảng Bước 1! Kiểm tra thông tin và nhấn "Gửi đăng ký" để chuyển sang Bước 2.`);
      setRecruitmentUploadSlots([createEmptySlot(1), createEmptySlot(2)]);
    } finally {
      setIsBatchRegistering(false);
    }
  };

  const handleRegKhoiChange = (khoiName: string) => {
    setRegKhoi(khoiName);
    const kObj = DEFAULT_ORGANIZATION_HIERARCHY.find(k => k.name === khoiName);
    if (kObj && kObj.bans.length > 0) {
      const firstBan = kObj.bans[0];
      setRegBan(firstBan.name);
      if (firstBan.phongs.length > 0) {
        const firstPhong = firstBan.phongs[0].name;
        setRegPhong(firstPhong);
        setRegNhaCungCap(lookupNhaCungCap(firstPhong));
      } else {
        setRegPhong('');
      }
    } else {
      setRegBan('');
      setRegPhong('');
    }
  };

  const handleRegBanChange = (banName: string) => {
    setRegBan(banName);
    const kObj = DEFAULT_ORGANIZATION_HIERARCHY.find(k => k.name === regKhoi);
    if (kObj) {
      const bObj = kObj.bans.find(b => b.name === banName);
      if (bObj && bObj.phongs.length > 0) {
        const firstPhong = bObj.phongs[0].name;
        setRegPhong(firstPhong);
        setRegNhaCungCap(lookupNhaCungCap(firstPhong));
      } else {
        setRegPhong('');
      }
    }
  };

  const handleRegPhongChange = (phongName: string) => {
    setRegPhong(phongName);
    setRegNhaCungCap(lookupNhaCungCap(phongName));
  };

  const handleRegCongViecChange = (jobName: string) => {
    setRegCongViec(jobName);
    const jObj = DEFAULT_JOB_POSITIONS.find(j => j.name === jobName);
    if (jObj && jObj.chucVus.length > 0) {
      setRegChucVu(jObj.chucVus[0]);
    } else {
      setRegChucVu('');
    }
  };

  const handleCccdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOcrScanning(true);
    showToast('success', 'Đang quét ảnh CCCD bằng AI Gemini & OCR...');
    try {
      const optimized = await optimizeImageFile(file, 'cccd_truoc');
      const group: EmployeeDocumentGroup = {
        id: 'modal-cccd',
        label: 'Đăng ký KSK tuyển dụng CCCD',
        documents: [optimized],
      };
      const reply = await extractOCRGroup(
        group,
        () => {},
        () => {},
        'ai'
      );
      if (reply.ok && reply.data?.success && reply.data.data) {
        const d = reply.data.data;
        if (d.hoVaTen || d.hoTen) setRegHoVaTen(d.hoVaTen || d.hoTen || '');
        if (d.soCCCD) setRegCCCD(d.soCCCD.replace(/\D/g, ''));
        if (d.ngaySinh) setRegNgaySinh(normalizeDateForInput(d.ngaySinh));
        if (d.gioiTinh) setRegGioiTinh(d.gioiTinh);
        showToast('success', 'AI Gemini & OCR đã trích xuất thông tin CCCD thành công!');
      } else {
        showToast('error', reply.data?.error || reply.error || 'Không đọc được thông tin từ ảnh CCCD.');
      }
    } catch (err) {
      showToast('error', `Lỗi quét OCR CCCD: ${(err as Error).message}`);
    } finally {
      setIsOcrScanning(false);
    }
  };

  const handleOpenRegModal = (reg?: RecruitmentHealthRegItem) => {
    if (reg) {
      setEditingReg(reg);
      setRegHoVaTen(reg.hoVaTen);
      setRegCCCD(reg.soCCCD);
      setRegNgaySinh(reg.ngaySinh || '2000-01-01');
      setRegGioiTinh(reg.gioiTinh || 'Nam');
      setRegKhoi(reg.khoi || DEFAULT_ORGANIZATION_HIERARCHY[0]?.name || '');
      setRegBan(reg.ban || DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.name || '');
      setRegPhong(reg.phong || DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.phongs[0]?.name || '');
      setRegCongViec(reg.congViec || DEFAULT_JOB_POSITIONS[0]?.name || '');
      setRegChucVu(reg.chucVu || DEFAULT_JOB_POSITIONS[0]?.chucVus[0] || '');
      setRegNhaCungCap(reg.nhaCungCap || lookupNhaCungCap(reg.phong || ''));
      setRegNgayDangKyKham(reg.ngayDangKyKham || new Date().toISOString().slice(0, 10));
      setRegNgayHenKham(reg.ngayHenKham || new Date().toISOString().slice(0, 10));
      setRegNguoiDangKy(reg.nguoiDangKy || currentUser.name || currentUser.email);
      setRegGhiChu(reg.ghiChu || '');
    } else {
      setEditingReg(null);
      setRegHoVaTen('');
      setRegCCCD('');
      setRegNgaySinh('2000-01-01');
      setRegGioiTinh('Nam');
      const defKhoi = DEFAULT_ORGANIZATION_HIERARCHY[0];
      const defBan = defKhoi?.bans[0];
      const defPhong = defBan?.phongs[0]?.name || '';
      setRegKhoi(defKhoi?.name || '');
      setRegBan(defBan?.name || '');
      setRegPhong(defPhong);
      setRegCongViec(DEFAULT_JOB_POSITIONS[0]?.name || '');
      setRegChucVu(DEFAULT_JOB_POSITIONS[0]?.chucVus[0] || '');
      setRegNhaCungCap(lookupNhaCungCap(defPhong));
      setRegNgayDangKyKham(new Date().toISOString().slice(0, 10));
      setRegNgayHenKham(new Date().toISOString().slice(0, 10));
      setRegNguoiDangKy(currentUser.name || currentUser.email);
      setRegGhiChu('');
    }
    setIsRegModalOpen(true);
  };

  const handleSaveReg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regHoVaTen.trim()) {
      showToast('error', 'Vui lòng nhập họ tên ứng viên!');
      return;
    }
    const newItem: RecruitmentHealthRegItem = {
      id: editingReg ? editingReg.id : 'reg-' + Date.now(),
      hoVaTen: regHoVaTen.trim(),
      soCCCD: regCCCD.trim(),
      ngaySinh: regNgaySinh,
      gioiTinh: regGioiTinh,
      khoi: regKhoi,
      ban: regBan,
      phong: regPhong,
      congViec: regCongViec,
      chucVu: regChucVu,
      nhaCungCap: regNhaCungCap,
      ngayDangKyKham: regNgayDangKyKham,
      ngayHenKham: regNgayHenKham,
      nguoiDangKy: regNguoiDangKy,
      ghiChu: regGhiChu.trim(),
    };
    const updated = editingReg
      ? recruitmentRegs.map((r) => (r.id === editingReg.id ? newItem : r))
      : [newItem, ...recruitmentRegs];
    setRecruitmentRegs(updated);
    setIsRegModalOpen(false);
    showToast('success', editingReg ? 'Đã cập nhật đăng ký KSK tuyển dụng!' : 'Đã đăng ký lịch khám tuyển dụng thành công!');
  };

  const [confirmDeleteRegId, setConfirmDeleteRegId] = useState<string | null>(null);
  const [confirmDeleteTrackingRegId, setConfirmDeleteTrackingRegId] = useState<string | null>(null);

  const handleDeleteTrackingReg = (id: string, name?: string) => {
    setRecruitmentRegs((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteTrackingRegId((prev) => (prev === id ? null : prev));
    showToast('success', `Đã xóa ứng viên${name ? ` ${name}` : ''} khỏi danh sách theo dõi KSK!`);
  };

  const allPhongs = React.useMemo(() => {
    const map = new Map<string, { phong: string; ban: string; khoi: string }>();
    for (const k of DEFAULT_ORGANIZATION_HIERARCHY) {
      for (const b of k.bans) {
        for (const p of b.phongs) {
          if (!map.has(p.name)) {
            map.set(p.name, { phong: p.name, ban: b.name, khoi: k.name });
          }
        }
      }
    }
    return Array.from(map.values());
  }, []);

  const handleInlineUpdateReg = (id: string, patch: Partial<RecruitmentHealthRegItem>) => {
    setDraftRecruitmentRegs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleAddInlineBlankReg = () => {
    const firstPhongInfo = allPhongs[0] || { phong: 'SEV1', ban: 'FS1', khoi: 'FS MANAGEMENT' };
    const defJob = DEFAULT_JOB_POSITIONS[0];
    const today = new Date().toISOString().slice(0, 10);
    const blank: RecruitmentHealthRegItem = {
      id: 'reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      hoVaTen: '',
      soCCCD: '',
      ngaySinh: '2000-01-01',
      gioiTinh: 'Nam',
      khoi: firstPhongInfo.khoi,
      ban: firstPhongInfo.ban,
      phong: firstPhongInfo.phong,
      congViec: defJob?.name || 'Bán Hàng',
      chucVu: defJob?.chucVus[0] || 'Nhân viên',
      nhaCungCap: lookupNhaCungCap(firstPhongInfo.phong),
      ngayDangKyKham: today,
      ngayHenKham: today,
      nguoiDangKy: currentUser.name || currentUser.email,
      ghiChu: '',
      trangThai: 'Chờ khám',
    };
    setDraftRecruitmentRegs((prev) => [blank, ...prev]);
  };

  const handleDeleteReg = (id: string) => {
    setDraftRecruitmentRegs((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteRegId((prev) => (prev === id ? null : prev));
    showToast('success', 'Đã xóa dòng đăng ký khỏi bảng!');
  };

  const handleSubmitDraftRegs = () => {
    if (draftRecruitmentRegs.length === 0) {
      showToast('error', 'Chưa có thông tin ứng viên nào trong bảng để gửi đăng ký!');
      return;
    }

    const missingNameIdx = draftRecruitmentRegs.findIndex((r) => !r.hoVaTen || !r.hoVaTen.trim());
    if (missingNameIdx !== -1) {
      showToast('error', `Vui lòng nhập Họ và tên cho ứng viên ở dòng #${missingNameIdx + 1} trước khi gửi đăng ký!`);
      return;
    }

    const readyItems: RecruitmentHealthRegItem[] = draftRecruitmentRegs.map((r) => ({
      ...r,
      hoVaTen: r.hoVaTen.trim(),
      soCCCD: (r.soCCCD || '').trim(),
      soDienThoai: r.soDienThoai || '',
      phongBanKhoi: r.phong || r.phongBanKhoi || '',
      viTriViecLam: r.viTriViecLam || [r.congViec, r.chucVu].filter(Boolean).join(' - '),
      trangThai: r.trangThai || 'Chờ khám',
    }));

    setRecruitmentRegs((prev) => [...readyItems, ...prev]);
    setDraftRecruitmentRegs([]);
    setConfirmDeleteRegId(null);
    showToast('success', `Đã gửi ${readyItems.length} hồ sơ đăng ký sang Bước 2 - Theo dõi KSK tuyển dụng!`);
  };

  // 3. Tiêu chuẩn KSK Tuyển dụng
  const [recruitmentStandards, setRecruitmentStandards] = useState<RecruitmentStandardItem[]>(() => {
    try {
      const cached = localStorage.getItem('hr_recruitment_health_standards');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'std-1',
        nhomDoiTuong: 'Lao động phổ thông / Công nhân sản xuất',
        chiTieuKhamBatBuoc: ['Khám lâm sàng tổng quát (Nội, Ngoại, Da liễu, TMH, RHM)', 'Xét nghiệm máu (Glucose, Ure, Creatinin, AST/ALT)', 'Xét nghiệm nước tiểu', 'Chụp X-Quang ngực thẳng'],
        luuYdacBiet: 'Theo TT 14/2013/TT-BYT. Đánh giá sức khỏe loại I, II, III.',
      },
      {
        id: 'std-2',
        nhomDoiTuong: 'Nhân viên Bếp ăn / Canteen / Chế biến thực phẩm',
        chiTieuKhamBatBuoc: ['Khám lâm sàng tổng quát', 'Xét nghiệm phân (Nuôi cấy tả, lỵ, thương hàn)', 'Xét nghiệm viêm gan A', 'Xét nghiệm viêm gan E', 'Soi phân tìm ký sinh trùng'],
        luuYdacBiet: 'Bắt buộc đối với nhân viên trực tiếp tiếp xúc thực phẩm theo quy định ATTP.',
      },
      {
        id: 'std-3',
        nhomDoiTuong: 'Lái xe / Vận hành thiết bị nâng hạ',
        chiTieuKhamBatBuoc: ['Khám lâm sàng tổng quát', 'Xét nghiệm ma túy (4-panel)', 'Xét nghiệm nồng độ cồn', 'Đo thị lực & Điện tâm đồ (ECG)'],
        luuYdacBiet: 'Sàng lọc nghiêm ngặt chất kích thích và các bệnh lý tim mạch.',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_recruitment_health_standards', JSON.stringify(recruitmentStandards));
    } catch {}
  }, [recruitmentStandards]);

  const [isRecStdModalOpen, setIsRecStdModalOpen] = useState(false);
  const [editingRecStd, setEditingRecStd] = useState<RecruitmentStandardItem | null>(null);
  const [recStdDoiTuong, setRecStdDoiTuong] = useState('');
  const [recStdBatBuocText, setRecStdBatBuocText] = useState('');
  const [recStdLuuY, setRecStdLuuY] = useState('');

  const handleOpenRecStdModal = (std?: RecruitmentStandardItem) => {
    if (std) {
      setEditingRecStd(std);
      setRecStdDoiTuong(std.nhomDoiTuong);
      setRecStdBatBuocText(std.chiTieuKhamBatBuoc.join('\n'));
      setRecStdLuuY(std.luuYdacBiet);
    } else {
      setEditingRecStd(null);
      setRecStdDoiTuong('');
      setRecStdBatBuocText('Khám lâm sàng tổng quát\nXét nghiệm máu\nXét nghiệm nước tiểu\nX-Quang phổi');
      setRecStdLuuY('');
    }
    setIsRecStdModalOpen(true);
  };

  const handleSaveRecStd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recStdDoiTuong.trim()) {
      showToast('error', 'Vui lòng nhập nhóm đối tượng!');
      return;
    }
    const batBuocList = recStdBatBuocText.split('\n').map((s) => s.trim()).filter(Boolean);
    const newItem: RecruitmentStandardItem = {
      id: editingRecStd ? editingRecStd.id : 'std-' + Date.now(),
      nhomDoiTuong: recStdDoiTuong.trim(),
      chiTieuKhamBatBuoc: batBuocList,
      luuYdacBiet: recStdLuuY.trim(),
    };
    const updated = editingRecStd
      ? recruitmentStandards.map((s) => (s.id === editingRecStd.id ? newItem : s))
      : [newItem, ...recruitmentStandards];
    setRecruitmentStandards(updated);
    setIsRecStdModalOpen(false);
    showToast('success', editingRecStd ? 'Đã cập nhật tiêu chuẩn tuyển dụng!' : 'Đã thêm tiêu chuẩn tuyển dụng mới!');
  };

  const handleDeleteRecStd = (id: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa tiêu chuẩn này không?')) return;
    setRecruitmentStandards(recruitmentStandards.filter((s) => s.id !== id));
    showToast('success', 'Đã xóa tiêu chuẩn thành công!');
  };

  // 4. Tracking filters state
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackingMonth, setTrackingMonth] = useState('ALL');
  const [trackingStartDate, setTrackingStartDate] = useState('');
  const [trackingEndDate, setTrackingEndDate] = useState('');
  const [trackingStatusFilter, setTrackingStatusFilter] = useState('ALL');
  const [trackingViewMode, setTrackingViewMode] = useState<'active' | 'declined'>('active');

  const trackingPeriodRegs = useMemo(() => {
    return recruitmentRegs.filter((reg) => {
      if (trackingSearch.trim()) {
        const q = trackingSearch.toLowerCase();
        const matchName = (reg.hoVaTen || '').toLowerCase().includes(q);
        const matchCCCD = (reg.soCCCD || '').includes(q);
        const matchPhone = (reg.soDienThoai || '').includes(q);
        const posLabel = reg.viTriViecLam || [reg.congViec, reg.chucVu].filter(Boolean).join(' - ');
        const matchPos = posLabel.toLowerCase().includes(q) || (reg.phong || '').toLowerCase().includes(q) || (reg.ban || '').toLowerCase().includes(q);
        if (!matchName && !matchCCCD && !matchPhone && !matchPos) return false;
      }
      if (reg.ngayHenKham) {
        const [, m] = reg.ngayHenKham.split('-');
        if (trackingMonth !== 'ALL' && m !== trackingMonth.padStart(2, '0')) return false;
        if (trackingStartDate && reg.ngayHenKham < trackingStartDate) return false;
        if (trackingEndDate && reg.ngayHenKham > trackingEndDate) return false;
      }
      return true;
    });
  }, [recruitmentRegs, trackingSearch, trackingMonth, trackingStartDate, trackingEndDate]);

  const activeTrackingRegs = useMemo(() => {
    return trackingPeriodRegs.filter((reg) => reg.trangThaiNhanViec !== 'Không nhận việc');
  }, [trackingPeriodRegs]);

  const declinedTrackingRegs = useMemo(() => {
    return trackingPeriodRegs.filter((reg) => reg.trangThaiNhanViec === 'Không nhận việc');
  }, [trackingPeriodRegs]);

  const filteredTrackingRegs = useMemo(() => {
    const base = trackingViewMode === 'declined' ? declinedTrackingRegs : activeTrackingRegs;
    if (trackingStatusFilter === 'ALL') return base;
    return base.filter((reg) => (reg.trangThai || 'Chờ khám') === trackingStatusFilter);
  }, [trackingViewMode, activeTrackingRegs, declinedTrackingRegs, trackingStatusFilter]);

  const handleMarkOfferDecision = (
    reg: RecruitmentHealthRegItem,
    decision: 'Đã nhận việc' | 'Không nhận việc' | 'Chưa xử lý'
  ) => {
    setRecruitmentRegs((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, trangThaiNhanViec: decision } : r))
    );
    if (decision === 'Không nhận việc') {
      showToast('success', `Đã chuyển ${reg.hoVaTen} sang danh sách Không nhận việc để quản lý riêng.`);
    } else if (decision === 'Đã nhận việc') {
      onTransferToNewEmployee?.(reg);
    } else {
      showToast('success', `Đã khôi phục ${reg.hoVaTen} về danh sách theo dõi KSK.`);
    }
  };

  const handleExportTrackingExcel = async (kind: RecruitmentExportKind) => {
    try {
      const count = await exportRecruitmentHealthExcel(trackingPeriodRegs, kind);
      if (count === 0) {
        const emptyLabels: Record<RecruitmentExportKind, string> = {
          da_kham_nhan_viec: 'Không có ứng viên nào thuộc nhóm Đã khám và nhận việc trong bộ lọc hiện tại.',
          da_kham_khong_nhan_viec: 'Không có ứng viên nào thuộc nhóm Đã khám không nhận việc trong bộ lọc hiện tại.',
          khong_dat: 'Không có ứng viên nào có kết quả khám Không đạt trong bộ lọc hiện tại.',
          tat_ca_khong_nhan_viec: 'Không có ứng viên nào trong danh sách Không nhận việc.',
        };
        showToast('error', emptyLabels[kind]);
        return;
      }
      showToast('success', `Đã xuất file Excel (${count} ứng viên)!`);
    } catch (err) {
      showToast('error', `Lỗi xuất file Excel: ${(err as Error).message}`);
    }
  };

  const handleExportSummaryExcel = async () => {
    try {
      const res = await exportRecruitmentSummaryMultiSheet(trackingPeriodRegs);
      const total = res.nhanViecCount + res.khongNhanViecCount + res.khongDatCount;
      if (total === 0) {
        showToast('error', 'Chưa có dữ liệu ở 3 nhóm (Đã khám nhận việc / Đã khám không nhận việc / Không đạt) để xuất báo cáo.');
        return;
      }
      showToast(
        'success',
        `Đã xuất báo cáo tổng hợp 3 sheet: Nhận việc (${res.nhanViecCount}), Không nhận việc (${res.khongNhanViecCount}), Không đạt (${res.khongDatCount}).`
      );
    } catch (err) {
      showToast('error', `Lỗi xuất báo cáo Excel: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    safeFetchJson<{ success: boolean; data: any[] }>('/api/sheets/tham-gia-ksk')
      .then((res) => {
        if (res.ok && res.data?.success && Array.isArray(res.data.data)) {
          setParticipants(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const participantCompanies = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      if (p.donViCongTac) set.add(p.donViCongTac);
    });
    return Array.from(set);
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (participantSearch.trim()) {
        const q = participantSearch.toLowerCase();
        const matchName = p.hoVaTen.toLowerCase().includes(q);
        const matchUnit = p.donViCongTac.toLowerCase().includes(q);
        const matchPhone = p.soDienThoai.toLowerCase().includes(q);
        if (!matchName && !matchUnit && !matchPhone) return false;
      }
      if (filterCompany !== 'ALL' && p.donViCongTac !== filterCompany) return false;
      if (filterActivity === 'ksk' && !p.thamGiaKhamSucKhoe) return false;
      if (filterActivity === 'blood' && !p.thamGiaHienMau) return false;
      return true;
    });
  }, [participants, participantSearch, filterCompany, filterActivity]);

  const handleExportParticipantsCsv = () => {
    const headers = ['STT', 'Họ và tên', 'Đơn vị công tác', 'Số điện thoại', 'Tham gia khám sức khỏe', 'Tham gia hiến máu'];
    const rows = filteredParticipants.map((p) => [
      p.stt,
      `"${p.hoVaTen}"`,
      `"${p.donViCongTac}"`,
      `"${p.soDienThoai}"`,
      p.thamGiaKhamSucKhoe ? '1' : '',
      p.thamGiaHienMau ? '1' : '',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_tham_gia_ksk_hien_mau_yen_phong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Đã xuất ${filteredParticipants.length} bản ghi danh sách tham gia thành công!`);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPhanLoai, setFilterPhanLoai] = useState<string>('ALL');
  const [filterKhuVuc, setFilterKhuVuc] = useState<string>('ALL');
  const [filterThoiHan, setFilterThoiHan] = useState<string>('ALL');
  const [filterTestItem, setFilterTestItem] = useState<HealthCheckItemKey | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');

  // Detail Modal state & Edit mode state
  const [selectedRoom, setSelectedRoom] = useState<HealthCheckStandardItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [detailPhong, setDetailPhong] = useState('');
  const [detailPhanLoai, setDetailPhanLoai] = useState('Bếp ngoài');
  const [detailKhuVuc, setDetailKhuVuc] = useState('Bắc Ninh');
  const [detailThoiHan, setDetailThoiHan] = useState('6 tháng');
  const [detailMucDich, setDetailMucDich] = useState('ĐK');
  const [detailNhaCungCap, setDetailNhaCungCap] = useState('Hữu Phúc');
  const [detailGhiChu, setDetailGhiChu] = useState('');
  const [detailItems, setDetailItems] = useState<Record<HealthCheckItemKey, boolean>>(() =>
    createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys)
  );
  const [detailError, setDetailError] = useState('');

  const handleOpenDetailModal = (room: HealthCheckStandardItem) => {
    setSelectedRoom(room);
    setIsDetailEditing(false);
    setDetailPhong(room.phong);
    setDetailPhanLoai(room.phanLoai);
    setDetailKhuVuc(room.khuVuc);
    setDetailThoiHan(room.thoiHan);
    setDetailMucDich(room.mucDichKham);
    setDetailNhaCungCap(room.nhaCungCap || '');
    setDetailGhiChu(room.ghiChu || '');
    setDetailItems({ ...room.items });
    setDetailError('');
  };

  const handleSaveDetailRoom = async () => {
    if (!selectedRoom) return;
    setDetailError('');
    const cleanPhong = detailPhong.trim();
    if (!cleanPhong) {
      setDetailError('Vui lòng nhập Tên Phòng / Địa điểm.');
      return;
    }

    const duplicate = standards.find(
      (item) =>
        item.id !== selectedRoom.id &&
        item.phong.toLowerCase() === cleanPhong.toLowerCase()
    );
    if (duplicate) {
      setDetailError(`Phòng / Địa điểm "${cleanPhong}" đã tồn tại ở STT #${duplicate.stt}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: selectedRoom.id,
        phong: cleanPhong,
        phanLoai: detailPhanLoai.trim() || 'Bếp ngoài',
        khuVuc: detailKhuVuc.trim() || 'Bắc Ninh',
        thoiHan: detailThoiHan.trim() || '6 tháng',
        mucDichKham: detailMucDich.trim() || 'ĐK',
        nhaCungCap: detailNhaCungCap.trim(),
        ghiChu: detailGhiChu.trim(),
        items: detailItems,
      };

      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        error?: string;
        data?: HealthCheckStandardItem;
        list?: HealthCheckStandardItem[];
      }>('/api/sheets/tieu-chuan-ksk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data?.success && Array.isArray(res.data.list)) {
        setStandards(res.data.list);
        localStorage.setItem('hr_health_check_standards', JSON.stringify(res.data.list));
        if (res.data.data) {
          setSelectedRoom(res.data.data);
        } else {
          setSelectedRoom({
            ...selectedRoom,
            phong: cleanPhong,
            phanLoai: detailPhanLoai,
            khuVuc: detailKhuVuc,
            thoiHan: detailThoiHan,
            mucDichKham: detailMucDich,
            nhaCungCap: detailNhaCungCap,
            ghiChu: detailGhiChu,
            items: detailItems,
          });
        }
        setIsDetailEditing(false);
        showToast('success', `Đã lưu cập nhật tiêu chuẩn khám cho phòng "${cleanPhong}" thành công!`);
      } else {
        throw new Error(res.error || res.data?.error || 'Không thể lưu dữ liệu.');
      }
    } catch (err) {
      const updatedItem: HealthCheckStandardItem = {
        ...selectedRoom,
        phong: cleanPhong,
        phanLoai: detailPhanLoai,
        khuVuc: detailKhuVuc,
        thoiHan: detailThoiHan,
        mucDichKham: detailMucDich,
        nhaCungCap: detailNhaCungCap,
        ghiChu: detailGhiChu,
        items: { ...detailItems },
        capNhatLuc: new Date().toISOString(),
      };
      const nextList = standards.map((s) => (s.id === selectedRoom.id ? updatedItem : s));
      setStandards(nextList);
      localStorage.setItem('hr_health_check_standards', JSON.stringify(nextList));
      setSelectedRoom(updatedItem);
      setIsDetailEditing(false);
      showToast('success', `Đã lưu cập nhật tiêu chuẩn khám cho phòng "${cleanPhong}" thành công.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add / Edit Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HealthCheckStandardItem | null>(null);
  const [formPhong, setFormPhong] = useState('');
  const [formPhanLoai, setFormPhanLoai] = useState('Bếp ngoài');
  const [formKhuVuc, setFormKhuVuc] = useState('Bắc Ninh');
  const [formThoiHan, setFormThoiHan] = useState('6 tháng');
  const [formMucDich, setFormMucDich] = useState('ĐK');
  const [formNhaCungCap, setFormNhaCungCap] = useState('Hữu Phúc');
  const [formGhiChu, setFormGhiChu] = useState('');
  const [formItems, setFormItems] = useState<Record<HealthCheckItemKey, boolean>>(() =>
    createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys)
  );
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<HealthCheckStandardItem | null>(null);

  // GAS Source Code Modal state
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [gasTab, setGasTab] = useState<'code_gs' | 'guide'>('code_gs');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Load from backend API
  const fetchStandards = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        data: HealthCheckStandardItem[];
      }>('/api/sheets/tieu-chuan-ksk');
      if (res.ok && res.data?.success && Array.isArray(res.data.data)) {
        setStandards(res.data.data);
        localStorage.setItem('hr_health_check_standards', JSON.stringify(res.data.data));
      }
    } catch {
      // fallback to local state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStandards();
  }, []);

  // Count mandatory tests for a room
  const countMandatoryTests = (item: HealthCheckStandardItem): number => {
    return HEALTH_CHECK_ITEMS.reduce(
      (acc, col) => acc + (item.items?.[col.key] ? 1 : 0),
      0
    );
  };

  // KPI Metrics Calculation
  const kpiStats = useMemo(() => {
    const total = standards.length;
    const byClassification: Record<string, number> = {
      'Bếp Samsung': 0,
      'Bếp ngoài': 0,
      OFFICE: 0,
    };
    const byRegion: Record<string, number> = {};
    let freq6Months = 0;
    let freq12Months = 0;
    let freqMixed = 0;

    for (const item of standards) {
      const pl = item.phanLoai || 'Khác';
      byClassification[pl] = (byClassification[pl] || 0) + 1;

      const kv = item.khuVuc || 'Chưa phân vùng';
      byRegion[kv] = (byRegion[kv] || 0) + 1;

      const th = (item.thoiHan || '').toLowerCase();
      if (th.includes('6 tháng') && th.includes('12 tháng')) {
        freqMixed += 1;
      } else if (th.includes('6 tháng')) {
        freq6Months += 1;
      } else {
        freq12Months += 1;
      }
    }

    const sortedRegions = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);

    return {
      total,
      byClassification,
      sortedRegions,
      freq6Months,
      freq12Months,
      freqMixed,
    };
  }, [standards]);

  // Unique options from data + defaults
  const availableRegions = useMemo(() => {
    const set = new Set<string>(KHU_VUC_OPTIONS);
    standards.forEach((s) => {
      if (s.khuVuc) set.add(s.khuVuc);
    });
    return Array.from(set);
  }, [standards]);

  const availablePhanLoai = useMemo(() => {
    const set = new Set<string>(PHAN_LOAI_OPTIONS);
    standards.forEach((s) => {
      if (s.phanLoai) set.add(s.phanLoai);
    });
    return Array.from(set);
  }, [standards]);

  // Filtered rows
  const filteredStandards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return standards.filter((item) => {
      if (q) {
        const matchRoom = item.phong.toLowerCase().includes(q);
        const matchProvider = (item.nhaCungCap || '').toLowerCase().includes(q);
        const matchRegion = (item.khuVuc || '').toLowerCase().includes(q);
        const matchNote = (item.ghiChu || '').toLowerCase().includes(q);
        const matchPurpose = (item.mucDichKham || '').toLowerCase().includes(q);
        if (!matchRoom && !matchProvider && !matchRegion && !matchNote && !matchPurpose) {
          return false;
        }
      }

      if (filterPhanLoai !== 'ALL' && item.phanLoai !== filterPhanLoai) {
        return false;
      }

      if (filterKhuVuc !== 'ALL' && item.khuVuc !== filterKhuVuc) {
        return false;
      }

      if (filterThoiHan !== 'ALL') {
        if (filterThoiHan === '6 tháng' && !item.thoiHan.toLowerCase().startsWith('6 tháng')) {
          return false;
        }
        if (filterThoiHan === '12 tháng' && item.thoiHan !== '12 tháng') {
          return false;
        }
        if (
          filterThoiHan === '6 tháng (bếp chính)-12 tháng (bếp phụ)' &&
          !item.thoiHan.toLowerCase().includes('bếp phụ')
        ) {
          return false;
        }
      }

      if (filterTestItem !== 'ALL' && !item.items?.[filterTestItem]) {
        return false;
      }

      return true;
    });
  }, [
    standards,
    searchQuery,
    filterPhanLoai,
    filterKhuVuc,
    filterThoiHan,
    filterTestItem,
  ]);

  // Format clipboard text for emailing clinics
  const formatStandardForClipboard = (room: HealthCheckStandardItem): string => {
    const mandatoryCols = HEALTH_CHECK_ITEMS.filter((col) => room.items?.[col.key]);
    const lines = [
      `==========================================================`,
      `TIÊU CHUẨN KHÁM SỨC KHỎE ĐỊNH KỲ - ĐỊA ĐIỂM: ${room.phong.toUpperCase()}`,
      `==========================================================`,
      `• STT (Sheet "Tiêu chuẩn"): #${room.stt} (Hàng ${room.stt + 3})`,
      `• Phòng / Địa điểm (Cột C): ${room.phong}`,
      `• Phân loại (Cột E): ${room.phanLoai}`,
      `• Khu vực (Cột AE): ${room.khuVuc}`,
      `• Thời hạn khám (Cột D): ${room.thoiHan}`,
      `• Mục đích khám (Cột F): ${room.mucDichKham}`,
      `• Nhà cung cấp / Phòng khám (Cột AC): ${room.nhaCungCap || 'Chưa chỉ định'}`,
      `• Ghi chú đặc biệt (Cột AD): ${room.ghiChu || 'Không có'}`,
      `----------------------------------------------------------`,
      `DANH MỤC KHÁM & XÉT NGHIỆM BẮT BUỘC (${mandatoryCols.length}/21 HẠNG MỤC CÓ DẤU "X"):`,
      ...mandatoryCols.map(
        (col, idx) => `  ${idx + 1}. [Cột ${col.colLetter}] ${col.label} (${col.description})`
      ),
      `==========================================================`,
    ];
    return lines.join('\n');
  };

  const handleCopyStandard = async (room: HealthCheckStandardItem) => {
    const text = formatStandardForClipboard(room);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(room.id);
      showToast(
        'success',
        `Đã sao chép tiêu chuẩn khám của phòng "${room.phong}" (${countMandatoryTests(room)} hạng mục) vào bộ nhớ tạm!`
      );
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast('error', 'Không thể sao chép tự động. Vui lòng thử lại.');
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormPhong('');
    setFormPhanLoai('Bếp ngoài');
    setFormKhuVuc('Bắc Ninh');
    setFormThoiHan('6 tháng');
    setFormMucDich('ĐK');
    setFormNhaCungCap('Hữu Phúc');
    setFormGhiChu('');
    setFormItems(createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys));
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (room: HealthCheckStandardItem) => {
    setEditingRoom(room);
    setFormPhong(room.phong);
    setFormPhanLoai(room.phanLoai);
    setFormKhuVuc(room.khuVuc);
    setFormThoiHan(room.thoiHan);
    setFormMucDich(room.mucDichKham);
    setFormNhaCungCap(room.nhaCungCap);
    setFormGhiChu(room.ghiChu);
    setFormItems({ ...room.items });
    setFormError('');
    setIsFormOpen(true);
  };

  // Save Add / Edit
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanPhong = formPhong.trim();
    if (!cleanPhong) {
      setFormError('Vui lòng nhập Tên Phòng / Địa điểm (Cột C).');
      return;
    }

    const duplicate = standards.find(
      (item) =>
        item.id !== editingRoom?.id &&
        item.phong.toLowerCase() === cleanPhong.toLowerCase()
    );
    if (duplicate) {
      setFormError(
        `Phòng / Địa điểm "${cleanPhong}" đã tồn tại ở STT #${duplicate.stt}. Vui lòng chọn chỉnh sửa hoặc đặt tên khác.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingRoom?.id,
        phong: cleanPhong,
        phanLoai: formPhanLoai.trim() || 'Bếp ngoài',
        khuVuc: formKhuVuc.trim() || 'Bắc Ninh',
        thoiHan: formThoiHan.trim() || '6 tháng',
        mucDichKham: formMucDich.trim() || 'ĐK',
        nhaCungCap: formNhaCungCap.trim(),
        ghiChu: formGhiChu.trim(),
        items: formItems,
      };

      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        error?: string;
        data?: HealthCheckStandardItem;
        list?: HealthCheckStandardItem[];
      }>('/api/sheets/tieu-chuan-ksk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data?.success && Array.isArray(res.data.list)) {
        setStandards(res.data.list);
        localStorage.setItem('hr_health_check_standards', JSON.stringify(res.data.list));
        if (selectedRoom && editingRoom && selectedRoom.id === editingRoom.id && res.data.data) {
          setSelectedRoom(res.data.data);
        }
        showToast(
          'success',
          res.data.message || `Đã lưu tiêu chuẩn khám cho phòng "${cleanPhong}" thành công!`
        );
        setIsFormOpen(false);
      } else {
        throw new Error(res.error || res.data?.error || 'Không thể lưu dữ liệu.');
      }
    } catch (err) {
      // Fallback update locally if offline
      const nextStt =
        editingRoom?.stt ??
        standards.reduce((max, item) => Math.max(max, item.stt || 0), 0) + 1;
      const fallbackItem: HealthCheckStandardItem = {
        id: editingRoom?.id || `KSK_${Date.now()}`,
        stt: nextStt,
        phong: cleanPhong,
        phanLoai: formPhanLoai.trim() || 'Bếp ngoài',
        khuVuc: formKhuVuc.trim() || 'Bắc Ninh',
        thoiHan: formThoiHan.trim() || '6 tháng',
        mucDichKham: formMucDich.trim() || 'ĐK',
        nhaCungCap: formNhaCungCap.trim(),
        ghiChu: formGhiChu.trim(),
        items: { ...formItems },
        capNhatLuc: new Date().toISOString(),
      };
      const nextList = editingRoom
        ? standards.map((s) => (s.id === editingRoom.id ? fallbackItem : s))
        : [...standards, fallbackItem];
      setStandards(nextList);
      localStorage.setItem('hr_health_check_standards', JSON.stringify(nextList));
      showToast(
        'success',
        `Đã lưu tiêu chuẩn khám cho phòng "${cleanPhong}" (${(err as Error).message ? 'Chế độ cục bộ' : 'Thành công'}).`
      );
      setIsFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Room
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        list?: HealthCheckStandardItem[];
      }>(`/api/sheets/tieu-chuan-ksk/${target.id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser.email },
      });

      if (res.ok && res.data?.success && Array.isArray(res.data.list)) {
        setStandards(res.data.list);
        localStorage.setItem('hr_health_check_standards', JSON.stringify(res.data.list));
      } else {
        const updated = standards
          .filter((item) => item.id !== target.id)
          .map((item, idx) => ({ ...item, stt: idx + 1 }));
        setStandards(updated);
        localStorage.setItem('hr_health_check_standards', JSON.stringify(updated));
      }

      if (selectedRoom?.id === target.id) {
        setSelectedRoom(null);
      }
      showToast('success', `Đã xóa phòng "${target.phong}" khỏi Sheet "Tiêu chuẩn".`);
    } catch {
      const updated = standards
        .filter((item) => item.id !== target.id)
        .map((item, idx) => ({ ...item, stt: idx + 1 }));
      setStandards(updated);
      localStorage.setItem('hr_health_check_standards', JSON.stringify(updated));
      showToast('success', `Đã xóa phòng "${target.phong}".`);
    }
  };

  // Reset default standards
  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        'Khôi phục lại danh sách 22 Phòng / Bếp tiêu chuẩn mặc định của Sheet "Tiêu chuẩn"?'
      )
    ) {
      return;
    }
    try {
      const res = await safeFetchJson<{
        success: boolean;
        list?: HealthCheckStandardItem[];
      }>('/api/sheets/tieu-chuan-ksk/reset', {
        method: 'POST',
        headers: { 'x-user-email': currentUser.email },
      });
      if (res.ok && res.data?.list) {
        setStandards(res.data.list);
        localStorage.setItem('hr_health_check_standards', JSON.stringify(res.data.list));
      } else {
        setStandards(DEFAULT_HEALTH_CHECK_STANDARDS);
        localStorage.setItem(
          'hr_health_check_standards',
          JSON.stringify(DEFAULT_HEALTH_CHECK_STANDARDS)
        );
      }
      showToast('success', 'Đã khôi phục dữ liệu gốc của Sheet "Tiêu chuẩn".');
    } catch {
      setStandards(DEFAULT_HEALTH_CHECK_STANDARDS);
      showToast('success', 'Đã khôi phục dữ liệu gốc của Sheet "Tiêu chuẩn".');
    }
  };

  // Export CSV matching exact Google Sheet "Tiêu chuẩn" layout (Row 3 Header, Columns B -> AE)
  const handleExportCsv = () => {
    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const row1Title = [
      '',
      'BẢNG TIÊU CHUẨN KHÁM SỨC KHỎE ĐỊNH KỲ (SHEET: TIÊU CHUẨN)',
      ...Array(29).fill(''),
    ];
    const row2Meta = [
      '',
      `Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')} | Số điểm lọc: ${filteredStandards.length}`,
      ...Array(29).fill(''),
    ];

    // Row 3 Header: Col A (blank), Col B..F, Col G..AA (21 items), Col AB (Tổng mục khám), Col AC..AE
    const row3Headers = [
      'Cột A',
      'STT (Cột B)',
      'Phòng (Cột C)',
      'Thời hạn (Cột D)',
      'Phân loại (Cột E)',
      'Mục đích khám (Cột F)',
      ...HEALTH_CHECK_ITEMS.map((col) => `${col.label} (${col.colLetter})`),
      'Tổng mục (Cột AB)',
      'Nhà cung cấp (Cột AC)',
      'Note / Ghi chú (Cột AD)',
      'Khu vực (Cột AE)',
    ];

    const dataRows = filteredStandards.map((item) => [
      '',
      item.stt,
      item.phong,
      item.thoiHan,
      item.phanLoai,
      item.mucDichKham,
      ...HEALTH_CHECK_ITEMS.map((col) => (item.items?.[col.key] ? 'X' : '')),
      countMandatoryTests(item),
      item.nhaCungCap,
      item.ghiChu,
      item.khuVuc,
    ]);

    const csvLines = [row1Title, row2Meta, row3Headers, ...dataRows].map((row) =>
      row.map(escapeCsv).join(',')
    );

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Tieu_Chuan_Kham_Suc_Khoe_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      'success',
      `Đã xuất ${filteredStandards.length} địa điểm ra file Excel/CSV chuẩn cấu trúc Sheet "Tiêu chuẩn"!`
    );
  };

  // Badge styling helper for Phan Loai
  const renderPhanLoaiBadge = (phanLoai: string) => {
    if (phanLoai === 'Bếp Samsung') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Bếp Samsung
        </span>
      );
    }
    if (phanLoai === 'OFFICE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          OFFICE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
        {phanLoai || 'Bếp ngoài'}
      </span>
    );
  };

  // Group items by clinical category for Detail Inspection Modal
  const groupedHealthColumns = useMemo(() => {
    const groups: Record<string, HealthCheckColumnDef[]> = {
      lam_sang: [],
      xet_nghiem_co_ban: [],
      vi_sinh_tieu_hoa: [],
      phu_khoa: [],
      truyen_nhiem: [],
      doc_chat_nhom_mau: [],
    };
    for (const col of HEALTH_CHECK_ITEMS) {
      if (!groups[col.group]) groups[col.group] = [];
      groups[col.group].push(col);
    }
    return groups;
  }, []);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-4">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-teal-900 text-teal-50 border-teal-700'
                : 'bg-rose-900 text-rose-50 border-rose-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation (Ordered & Scoped by Role) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 border border-slate-200 rounded-2xl p-2 shadow-2xs">
        {(isAdmin || isRecruiter) && (
          <button
            type="button"
            onClick={() => setHealthSubTab('tuyen_dung_dang_ky')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              healthSubTab === 'tuyen_dung_dang_ky'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4 text-teal-300" />
            <span>1. Đăng ký KSK tuyển dụng ({recruitmentRegs.length})</span>
          </button>
        )}

        {(isAdmin || isMedicalStaff) && (
          <button
            type="button"
            onClick={() => setHealthSubTab('tuyen_dung_theo_doi')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              healthSubTab === 'tuyen_dung_theo_doi'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-purple-300" />
            <span>2. Theo dõi KSK tuyển dụng</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setHealthSubTab('tuyen_dung_tieu_chuan')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            healthSubTab === 'tuyen_dung_tieu_chuan'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-300" />
          <span>3. Tiêu chuẩn KSK tuyển dụng</span>
        </button>

        {(isAdmin || isMedicalStaff) && (
          <>
            <button
              type="button"
              onClick={() => setHealthSubTab('dinh_ky')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                healthSubTab === 'dinh_ky'
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-emerald-300" />
              <span>4. Tiêu chuẩn KSK định kỳ ({standards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setHealthSubTab('nha_cung_cap')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                healthSubTab === 'nha_cung_cap'
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Hospital className="w-4 h-4 text-blue-300" />
              <span>5. Nhà cung cấp KSK ({providers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setHealthSubTab('tuyen_dung_dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                healthSubTab === 'tuyen_dung_dashboard'
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-300" />
              <span>6. Dashboard khám sức khỏe tuyển dụng</span>
            </button>
          </>
        )}
      </div>

      {healthSubTab === 'tuyen_dung_dang_ky' && (isAdmin || isRecruiter) && (
        <div className="space-y-6 animate-fade-in">
          {/* TOP: Multi-Candidate Compact Dark Upload Boxes (Isolated per candidate) */}
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-4 sm:p-5 text-slate-100 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Bước 1: Tải Lên Ảnh CCCD Từng Ứng Viên Riêng Biệt ({recruitmentUploadSlots.length} ứng viên)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Mỗi nhân viên mới 1 ô tải ảnh riêng biệt để tránh lẫn thông tin. Tự động đọc dữ liệu bằng Gemini AI &amp; OCR.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAddRecruitmentSlot}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Thêm nhân viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleBatchRegisterSlots()}
                  disabled={isBatchRegistering || recruitmentUploadSlots.every((s) => s.files.length === 0)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isBatchRegistering
                      ? 'Đang đọc AI & OCR...'
                      : `Quét AI & Đưa vào bảng (${recruitmentUploadSlots.filter((s) => s.files.length > 0).length})`}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={`grid gap-3 ${
                recruitmentUploadSlots.length === 1
                  ? 'grid-cols-1'
                  : recruitmentUploadSlots.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {recruitmentUploadSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.length) {
                      void handleSlotFilesAdded(slot.id, e.dataTransfer.files);
                    }
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 flex flex-col justify-between gap-2 transition"
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-[11px] shrink-0">
                        Nhân viên #{index + 1}
                      </span>
                      {slot.extracted?.hoVaTen && (
                        <span className="text-xs font-semibold text-teal-300 truncate">{slot.extracted.hoVaTen}</span>
                      )}
                      {slot.scanning ? (
                        <span className="text-[11px] text-amber-300 font-medium truncate">
                          Đang đọc AI &amp; OCR...
                        </span>
                      ) : slot.ocrDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{slot.engineLabel || 'AI + OCR'} ({slot.files.length} ảnh)</span>
                        </span>
                      ) : slot.ocrError ? (
                        <span className="text-[11px] font-medium text-rose-400 truncate" title={slot.ocrError}>
                          Lỗi OCR: {slot.ocrError}
                        </span>
                      ) : slot.files.length > 0 ? (
                        <span className="text-[11px] font-medium text-blue-300 truncate">
                          Đã tải {slot.files.length} ảnh • Chờ quét AI
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {slot.files.length > 0 && !slot.scanning && (
                        <button
                          type="button"
                          onClick={() => void runSlotOcrExtraction(slot.id, slot.files, index)}
                          className="p-1 rounded hover:bg-slate-800 text-blue-400 cursor-pointer"
                          title="Quét lại bằng AI Gemini & OCR"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {recruitmentUploadSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecruitmentSlot(slot.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Xóa ô nhân viên này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Exact Compact Horizontal Dropzone */}
                  <div
                    onClick={() => document.getElementById(`slot-file-${slot.id}`)?.click()}
                    className="border border-dashed border-slate-700 hover:border-blue-500 bg-[#131d32] rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-[160px] flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 flex items-center justify-center shrink-0 transition">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-slate-200 leading-snug">
                          Kéo thả ảnh CCCD hoặc chọn tệp từ máy / điện thoại
                        </div>
                        <div className="text-[10px] text-slate-400 leading-snug">
                          Hỗ trợ định dạng JPG, PNG, PDF (Tối đa 10MB)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                      <label
                        htmlFor={`slot-camera-${slot.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer transition"
                        title="Chụp ảnh CCCD"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Chụp ảnh</span>
                      </label>
                      <label
                        htmlFor={`slot-file-${slot.id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer transition"
                      >
                        Chọn tệp
                      </label>
                    </div>
                    <input
                      id={`slot-file-${slot.id}`}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          void handleSlotFilesAdded(slot.id, e.target.files);
                        }
                        e.target.value = '';
                      }}
                    />
                    <input
                      id={`slot-camera-${slot.id}`}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          void handleSlotFilesAdded(slot.id, e.target.files);
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Uploaded files preview chips for this candidate */}
                  {slot.files.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Ảnh đã tải ({slot.files.length}):
                      </span>
                      {slot.files.map((doc) => (
                        <span
                          key={doc.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800 text-teal-400 text-[11px] font-mono"
                        >
                          <span className="truncate max-w-[180px]">{doc.fileName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlotFile(slot.id, doc.id)}
                            className="text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Xóa ảnh này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM: Bảng thông tin đăng ký khám sức khỏe tuyển dụng (Chỉnh sửa trực tiếp trên bảng, chỉ hiển thị Phòng) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bảng Thông Tin Đăng Ký Khám Sức Khỏe Tuyển Dụng ({draftRecruitmentRegs.length} hồ sơ chờ gửi)
                </h3>
                <p className="text-xs text-slate-500">
                  Điền tay hoặc chỉnh sửa trực tiếp từng ô bên dưới, sau đó nhấn <strong>&quot;Gửi đăng ký&quot;</strong> để đẩy danh sách sang Bước 2 - Theo dõi KSK tuyển dụng.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddInlineBlankReg}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm dòng nhập tay</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDraftRegs}
                  disabled={draftRecruitmentRegs.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi đăng ký ({draftRecruitmentRegs.length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5 text-center w-10">STT</th>
                    <th className="p-2.5 min-w-[170px]">Họ và tên / CCCD</th>
                    <th className="p-2.5 min-w-[130px]">Công việc</th>
                    <th className="p-2.5 min-w-[130px]">Chức vụ</th>
                    <th className="p-2.5 text-center min-w-[130px]">Ngày khám</th>
                    <th className="p-2.5 min-w-[140px]">Phòng</th>
                    <th className="p-2.5 min-w-[170px]">Nhà cung cấp khám</th>
                    <th className="p-2.5 text-center min-w-[130px]">Ngày đăng ký</th>
                    <th className="p-2.5 min-w-[140px]">Nhân viên phụ trách</th>
                    <th className="p-2.5 text-center w-24">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {draftRecruitmentRegs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        Chưa có ứng viên nào trong danh sách chờ gửi. Nhấn &quot;Quét AI &amp; Đưa vào bảng&quot; hoặc &quot;Thêm dòng nhập tay&quot; để nhập thông tin đăng ký.
                      </td>
                    </tr>
                  ) : (
                    draftRecruitmentRegs.map((reg, idx) => {
                      const jobObj = DEFAULT_JOB_POSITIONS.find((j) => j.name === reg.congViec);
                      const chucVuOptions = jobObj?.chucVus || [];
                      return (
                        <tr key={reg.id} className="hover:bg-slate-50/80 transition align-top">
                          <td className="p-2.5 text-center font-bold text-slate-600 pt-3.5">{idx + 1}</td>
                          <td className="p-2 space-y-1">
                            <input
                              type="text"
                              value={reg.hoVaTen}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { hoVaTen: e.target.value })}
                              placeholder="Họ và tên ứng viên..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white font-semibold text-slate-900 outline-none"
                            />
                            <input
                              type="text"
                              value={reg.soCCCD}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { soCCCD: e.target.value })}
                              placeholder="Số CCCD (12 số)..."
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-slate-50 font-mono text-[11px] text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={reg.congViec}
                              onChange={(e) => {
                                const nextJob = e.target.value;
                                const found = DEFAULT_JOB_POSITIONS.find((j) => j.name === nextJob);
                                handleInlineUpdateReg(reg.id, {
                                  congViec: nextJob,
                                  chucVu: found?.chucVus[0] || reg.chucVu,
                                });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white font-medium text-blue-800 outline-none"
                            >
                              {!jobObj && reg.congViec && <option value={reg.congViec}>{reg.congViec}</option>}
                              {DEFAULT_JOB_POSITIONS.map((j) => (
                                <option key={j.id} value={j.name}>
                                  {j.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={reg.chucVu}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { chucVu: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white text-slate-800 outline-none"
                            >
                              {!chucVuOptions.includes(reg.chucVu) && reg.chucVu && (
                                <option value={reg.chucVu}>{reg.chucVu}</option>
                              )}
                              {chucVuOptions.map((cv) => (
                                <option key={cv} value={cv}>
                                  {cv}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="date"
                              value={reg.ngayHenKham || ''}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { ngayHenKham: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white font-mono text-slate-800 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={reg.phong}
                              onChange={(e) => {
                                const nextPhong = e.target.value;
                                const matched = allPhongs.find((p) => p.phong === nextPhong);
                                handleInlineUpdateReg(reg.id, {
                                  phong: nextPhong,
                                  ban: matched?.ban || reg.ban,
                                  khoi: matched?.khoi || reg.khoi,
                                  nhaCungCap: lookupNhaCungCap(nextPhong),
                                });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white font-semibold text-slate-900 outline-none"
                            >
                              {!allPhongs.some((p) => p.phong === reg.phong) && reg.phong && (
                                <option value={reg.phong}>{reg.phong}</option>
                              )}
                              {allPhongs.map((p) => (
                                <option key={p.phong} value={p.phong}>
                                  {p.phong}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="recruitment-providers-list"
                              value={reg.nhaCungCap}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { nhaCungCap: e.target.value })}
                              placeholder="Nhà cung cấp khám..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white font-medium text-teal-800 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="date"
                              value={reg.ngayDangKyKham || ''}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { ngayDangKyKham: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white font-mono text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={reg.nguoiDangKy}
                              onChange={(e) => handleInlineUpdateReg(reg.id, { nguoiDangKy: e.target.value })}
                              placeholder="Nhân viên phụ trách..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2 text-center pt-2.5">
                            <div className="inline-flex items-center gap-1.5">
                              {confirmDeleteRegId === reg.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReg(reg.id)}
                                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer transition"
                                  >
                                    Xác nhận xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRegId(null)}
                                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] cursor-pointer transition"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRegId(reg.id)}
                                  className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer transition"
                                  title="Xóa dòng này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <datalist id="recruitment-providers-list">
                {providers.map((prov) => (
                  <option key={prov.id} value={prov.tenNhaCungCap} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      )}

      {healthSubTab === 'tuyen_dung_tieu_chuan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Tiêu Chuẩn Khám Sức Khỏe Tuyển Dụng - Bảng Ma Trận Chuẩn Y Tế</h3>
              <p className="text-xs text-slate-500">Quy định danh mục khám tối thiểu bắt buộc đối với ứng viên tuyển dụng (đã loại bỏ 6 mục chuyên sâu: Khám phụ khoa, Siêu âm ổ bụng, Nhóm máu Rh/ABO, Tuyến vú, UT cổ tử cung).</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  Chế độ chỉ xem (Không có quyền chỉnh sửa)
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                15 Hạng mục y khoa (Từ 1 đến 15 theo hàng ngang)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#1a73e8]" />
                <span className="font-semibold text-slate-800">
                  Bảng Ma Trận Tiêu Chuẩn Tuyển Dụng (Thứ tự từ 1 đến 15 theo hàng ngang)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-teal-600 text-white font-bold inline-flex items-center justify-center text-[10px]">
                    X
                  </span>
                  Bắt buộc
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[640px]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#1e3c72] text-white sticky top-0 z-20">
                  <tr>
                    <th className="py-2.5 px-2.5 font-bold text-center border-r border-blue-800/60 w-12 sticky left-0 bg-[#1e3c72] z-30">
                      STT
                    </th>
                    <th className="py-2.5 px-3 font-bold border-r border-blue-800/60 min-w-[140px] sticky left-12 bg-[#1e3c72] z-30">
                      Nhóm Đối Tượng / Vị Trí
                    </th>
                    <th className="py-2.5 px-2.5 font-bold border-r border-blue-800/60 min-w-[100px]">
                      Thời hạn
                    </th>
                    <th className="py-2.5 px-2.5 font-bold border-r border-blue-800/60 min-w-[100px]">
                      Phân loại
                    </th>
                    <th className="py-2.5 px-2 font-bold text-center border-r border-blue-800/60 min-w-[70px]">
                      Mục đích
                    </th>

                    {/* 15 Recruitment Examination Columns numbered 1 to 15 horizontally */}
                    {RECRUITMENT_CHECK_ITEMS.map((col, idx) => (
                      <th
                        key={col.key}
                        title={`${col.label} (${col.description})`}
                        className="py-2 px-1 text-center border-r border-blue-800/50 min-w-[56px] max-w-[70px]"
                      >
                        <div className="text-[10px] font-bold text-teal-300 tabular-nums">#{idx + 1}</div>
                        <div className="text-[9px] font-semibold leading-tight line-clamp-2">
                          {col.shortLabel}
                        </div>
                      </th>
                    ))}

                    <th className="py-2.5 px-2 font-bold text-center border-r border-blue-800/60 min-w-[60px] bg-blue-950/50">
                      Tổng X
                    </th>
                    <th className="py-2.5 px-3 font-bold border-r border-blue-800/60 min-w-[160px]">
                      Lưu ý đặc biệt / Tiêu chuẩn
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {standards.map((room, roomIdx) => {
                    const mandatoryRecCount = RECRUITMENT_CHECK_ITEMS.filter((col) => room.items?.[col.key]).length;
                    return (
                      <tr
                        key={room.id}
                        className="hover:bg-blue-50/60 transition group"
                      >
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-blue-50/90 z-10 tabular-nums">
                          {roomIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100 sticky left-12 bg-white group-hover:bg-blue-50/90 z-10">
                          <span className="text-[#1e3c72]">
                            {room.phong}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 border-r border-slate-100">
                          <span className="text-[11px] font-medium">{room.thoiHan}</span>
                        </td>
                        <td className="py-2.5 px-2.5 border-r border-slate-100 whitespace-nowrap">
                          {renderPhanLoaiBadge(room.phanLoai)}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            {room.mucDichKham}
                          </span>
                        </td>

                        {/* 15 "X" cells */}
                        {RECRUITMENT_CHECK_ITEMS.map((col) => {
                          const checked = Boolean(room.items?.[col.key]);
                          return (
                            <td
                              key={col.key}
                              className={`py-2 px-1 text-center border-r border-slate-100 ${
                                checked ? 'bg-teal-50/50' : ''
                              }`}
                            >
                              {checked ? (
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded bg-teal-600 text-white font-bold text-[11px] shadow-2xs"
                                  title={`Bắt buộc ${col.label}`}
                                >
                                  X
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[10px]">·</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-2 text-center font-mono font-bold text-teal-700 bg-teal-50/30 border-r border-slate-100 tabular-nums">
                          {mandatoryRecCount}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {room.ghiChu || 'Tiêu chuẩn KSK tuyển dụng theo quy định công ty.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {healthSubTab === 'tuyen_dung_theo_doi' && (isAdmin || isMedicalStaff) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Theo Dõi KSK Tuyển Dụng &amp; Tiến Độ Khám</h3>
              <p className="text-xs text-slate-500">
                Tra cứu lịch hẹn khám, cập nhật trạng thái KSK, phân loại nhận việc / không nhận việc và xuất danh sách Excel theo nhóm.
              </p>
            </div>

            {/* Segmented Switcher: Active Tracking vs Separate Declined List */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setTrackingViewMode('active')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  trackingViewMode === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Theo dõi KSK ({activeTrackingRegs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackingViewMode('declined')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  trackingViewMode === 'declined'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                <span>Không nhận việc ({declinedTrackingRegs.length})</span>
              </button>
            </div>
          </div>

          {/* Search & Date Range Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="lg:col-span-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={trackingSearch}
                onChange={(e) => setTrackingSearch(e.target.value)}
                placeholder="Tìm tên, CCCD, Phòng..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#1a73e8]"
              />
            </div>

            <div>
              <select
                value={trackingMonth}
                onChange={(e) => setTrackingMonth(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none font-medium"
              >
                <option value="ALL">Tất cả các tháng</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>Tháng {m}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-slate-500 mb-0.5">Từ ngày:</div>
              <input
                type="date"
                value={trackingStartDate}
                onChange={(e) => setTrackingStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none font-mono"
              />
            </div>

            <div>
              <div className="text-[10px] font-semibold text-slate-500 mb-0.5">Đến ngày:</div>
              <input
                type="date"
                value={trackingEndDate}
                onChange={(e) => setTrackingEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none font-mono"
              />
            </div>

            <div>
              <select
                value={trackingStatusFilter}
                onChange={(e) => setTrackingStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none font-medium mt-4"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="Chờ khám">Chờ khám</option>
                <option value="Đã khám - Đạt">Đã khám - Đạt</option>
                <option value="Đã khám - Không đạt">Đã khám - Không đạt</option>
                <option value="Hoãn">Hoãn</option>
              </select>
            </div>
          </div>

          {/* Excel Export Toolbar for Recruitment Outcomes */}
          {(() => {
            const countNhanViec = filterRecruitmentRecordsForExport(trackingPeriodRegs, 'da_kham_nhan_viec').length;
            const countKhongNhanViec = filterRecruitmentRecordsForExport(trackingPeriodRegs, 'da_kham_khong_nhan_viec').length;
            const countKhongDat = filterRecruitmentRecordsForExport(trackingPeriodRegs, 'khong_dat').length;
            const countAllDeclined = filterRecruitmentRecordsForExport(trackingPeriodRegs, 'tat_ca_khong_nhan_viec').length;
            return (
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-[#1a73e8]" />
                  <span>Xuất danh sách kết quả KSK tuyển dụng (Excel):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExportTrackingExcel('da_kham_nhan_viec')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Đã khám &amp; Nhận việc ({countNhanViec})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportTrackingExcel('da_kham_khong_nhan_viec')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Đã khám - Không nhận việc ({countKhongNhanViec})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportTrackingExcel('khong_dat')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>KQ khám Không đạt ({countKhongDat})</span>
                  </button>
                  {trackingViewMode === 'declined' && (
                    <button
                      type="button"
                      onClick={() => void handleExportTrackingExcel('tat_ca_khong_nhan_viec')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tất cả Không nhận việc ({countAllDeclined})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleExportSummaryExcel()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất tổng hợp (3 Sheet)</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {trackingViewMode === 'active' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 text-center w-12">STT</th>
                    <th className="p-3">Họ và tên ứng viên</th>
                    <th className="p-3">Vị trí việc làm</th>
                    <th className="p-3">Nhà cung cấp khám</th>
                    <th className="p-3 text-center">Ngày hẹn khám</th>
                    <th className="p-3 text-center">Trạng thái KSK</th>
                    <th className="p-3 text-center">Cập nhật nhanh trạng thái</th>
                    <th className="p-3 text-center">Tiếp nhận / Không nhận việc</th>
                    <th className="p-3 text-center w-24">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTrackingRegs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Không tìm thấy lịch khám tuyển dụng phù hợp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredTrackingRegs.map((reg, idx) => (
                      <tr key={reg.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{reg.hoVaTen}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            CCCD: {reg.soCCCD || '---'}{reg.soDienThoai ? ` • SĐT: ${reg.soDienThoai}` : ''}
                          </div>
                          {reg.nguoiDangKy && (
                            <div className="text-[10px] text-slate-400">
                              Phụ trách: {reg.nguoiDangKy}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-blue-800">
                            {reg.viTriViecLam || [reg.congViec, reg.chucVu].filter(Boolean).join(' - ') || '---'}
                          </div>
                          {reg.phong && (
                            <div className="text-[10px] text-slate-500 font-medium">Phòng: {reg.phong}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-700">{reg.nhaCungCap}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{reg.ngayHenKham}</td>
                        <td className="p-3 text-center">
                          {(() => {
                            const currentStatus = reg.trangThai || 'Chờ khám';
                            return (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                currentStatus === 'Đã khám - Đạt' ? 'bg-teal-100 text-teal-800' :
                                currentStatus === 'Đã khám - Không đạt' ? 'bg-rose-100 text-rose-800' :
                                currentStatus === 'Hoãn' ? 'bg-amber-100 text-amber-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {currentStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={reg.trangThai || 'Chờ khám'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecruitmentRegs(recruitmentRegs.map(r => r.id === reg.id ? {...r, trangThai: val} : r));
                              showToast('success', `Đã cập nhật trạng thái của ${reg.hoVaTen} thành ${val}!`);
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="Chờ khám">Chờ khám</option>
                            <option value="Đã khám - Đạt">Đã khám - Đạt</option>
                            <option value="Đã khám - Không đạt">Đã khám - Không đạt</option>
                            <option value="Hoãn">Hoãn</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                            {!isMedicalStaff && (
                              <button
                                type="button"
                                onClick={() => handleMarkOfferDecision(reg, 'Đã nhận việc')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                                  reg.trangThaiNhanViec === 'Đã nhận việc'
                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                                }`}
                                title="Đánh dấu đã nhận việc & chuyển thông tin ứng viên sang Đăng ký nhân viên mới"
                              >
                                {reg.trangThaiNhanViec === 'Đã nhận việc' ? (
                                  <UserCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <UserPlus className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {reg.trangThaiNhanViec === 'Đã nhận việc' ? 'Đã nhận việc / ĐK NV' : 'Đăng Ký NV Mới'}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleMarkOfferDecision(reg, 'Không nhận việc')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
                              title="Chuyển ứng viên sang danh sách Không nhận việc để quản lý riêng"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Không nhận việc</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {confirmDeleteTrackingRegId === reg.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteTrackingReg(reg.id, reg.hoVaTen)}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer transition"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTrackingRegId(null)}
                                className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] cursor-pointer transition"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTrackingRegId(reg.id)}
                              className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer transition"
                              title={`Xóa ứng viên ${reg.hoVaTen}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <span className="font-semibold">
                  Danh sách quản lý riêng các ứng viên không nhận việc (không chuyển thành nhân viên mới).
                </span>
                <span className="font-mono font-bold tabular-nums">{filteredTrackingRegs.length} ứng viên</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-50/70 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Họ và tên ứng viên</th>
                      <th className="p-3">Vị trí / Phòng</th>
                      <th className="p-3">Nhà cung cấp khám</th>
                      <th className="p-3 text-center">Ngày hẹn khám</th>
                      <th className="p-3 text-center">Trạng thái KSK</th>
                      <th className="p-3 min-w-[200px]">Lý do / Ghi chú không nhận việc</th>
                      <th className="p-3 text-center">Khôi phục</th>
                      <th className="p-3 text-center w-24">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTrackingRegs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          Chưa có ứng viên nào trong danh sách Không nhận việc.
                        </td>
                      </tr>
                    ) : (
                      filteredTrackingRegs.map((reg, idx) => (
                        <tr key={reg.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{reg.hoVaTen}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              CCCD: {reg.soCCCD || '---'}{reg.soDienThoai ? ` • SĐT: ${reg.soDienThoai}` : ''}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-blue-800">
                              {reg.viTriViecLam || [reg.congViec, reg.chucVu].filter(Boolean).join(' - ') || '---'}
                            </div>
                            {reg.phong && (
                              <div className="text-[10px] text-slate-500 font-medium">Phòng: {reg.phong}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">{reg.nhaCungCap}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{reg.ngayHenKham}</td>
                          <td className="p-3 text-center">
                            {(() => {
                              const currentStatus = reg.trangThai || 'Chờ khám';
                              return (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  currentStatus === 'Đã khám - Đạt' ? 'bg-teal-100 text-teal-800' :
                                  currentStatus === 'Đã khám - Không đạt' ? 'bg-rose-100 text-rose-800' :
                                  currentStatus === 'Hoãn' ? 'bg-amber-100 text-amber-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {currentStatus}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={reg.lyDoKhongNhanViec || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecruitmentRegs((prev) =>
                                  prev.map((r) => (r.id === reg.id ? { ...r, lyDoKhongNhanViec: val } : r))
                                );
                              }}
                              placeholder="Nhập lý do không nhận việc..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#1a73e8] bg-white text-xs text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleMarkOfferDecision(reg, 'Chưa xử lý')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
                              title="Chuyển lại về danh sách theo dõi KSK"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Khôi phục</span>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            {confirmDeleteTrackingRegId === reg.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTrackingReg(reg.id, reg.hoVaTen)}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer transition"
                                >
                                  Xác nhận xóa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteTrackingRegId(null)}
                                  className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] cursor-pointer transition"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTrackingRegId(reg.id)}
                                className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer transition"
                                title={`Xóa ứng viên ${reg.hoVaTen}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {healthSubTab === 'tuyen_dung_dashboard' && (isAdmin || isMedicalStaff) && (
        <RecruitmentHealthDashboard
          records={recruitmentRegs}
          onNavigateToTrackingWithFilter={(status) => {
            setTrackingViewMode('active');
            setTrackingStatusFilter(status);
            setHealthSubTab('tuyen_dung_theo_doi');
          }}
        />
      )}

      {healthSubTab === 'nha_cung_cap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Quản Lý Danh Sách Nhà Cung Cấp Khám Sức Khỏe (Bệnh Viện / Phòng Khám)</h3>
              <p className="text-xs text-slate-500">Quản lý thời hạn hợp đồng, thông tin liên hệ phụ trách (tên, SĐT, email) và dịch vụ y tế đối tác.</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenProviderModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Nhà Cung Cấp Mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((prov) => (
              <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Hospital className="w-4 h-4 text-[#1a73e8]" />
                        {prov.tenNhaCungCap}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{prov.diaChi}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProviderModal(prov)}
                          className="p-1.5 rounded hover:bg-amber-50 text-slate-500 hover:text-amber-600 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProvider(prov.id)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 text-[11px] text-amber-900 font-medium">
                    <strong>Hạn hợp đồng:</strong> {prov.thoiHanHopDong || 'Chưa cập nhật'}
                  </div>

                  <div className="space-y-1 text-xs pt-1 border-t border-slate-100 text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">Phụ trách:</span>
                      <span>{prov.nguoiPhuTrach || '---'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{prov.soDienThoai || '---'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-blue-600 truncate">{prov.email || '---'}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <strong>Thế mạnh:</strong> {prov.dichVuTheManh || '---'}
                  </div>
                </div>

                {prov.ghiChu && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    Ghi chú: {prov.ghiChu}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {healthSubTab === 'dinh_ky' && (
      <div>

          {/* TOP HEADER BANNER (Medical / Corporate Deep Blue Theme) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3c72] via-[#1a56b0] to-[#1a73e8] text-white p-5 sm:p-6 shadow-md border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-400/20 border border-teal-300/40 text-teal-100 text-[11px] font-bold tracking-wide uppercase">
                <Stethoscope className="w-3.5 h-3.5 text-teal-300" />
                Sheet: &ldquo;Tiêu chuẩn&rdquo; (Hàng 3 &bull; Cột B &rarr; AE)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 text-white text-[11px] font-medium">
                21 Hạng mục Y khoa (Cột G &rarr; AA)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              HỆ THỐNG QUẢN LÝ TIÊU CHUẨN KHÁM SỨC KHỎE ĐỊNH KỲ
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-3xl">
              Quản lý danh mục khám lâm sàng, xét nghiệm vi sinh, truyền nhiễm và độc chất bắt buộc (&ldquo;X&rdquo;) theo từng Bếp Samsung, Bếp ngoài, Văn phòng (OFFICE) và Khu vực địa lý.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition cursor-pointer"
              title="Xuất dữ liệu đang lọc ra file Excel/CSV chuẩn Sheet Tiêu chuẩn"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>Xuất Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGasModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition cursor-pointer"
              title="Xem mã nguồn Google Apps Script (Code.gs) đồng bộ trực tiếp Google Sheet"
            >
              <Code2 className="w-4 h-4 text-amber-300" />
              <span>Mã Apps Script (Sheet)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm Phòng / Điểm Khám</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. DASHBOARD & KPI OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Rooms */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Điểm / Phòng Quản Lý
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {kpiStats.total}
            </span>
            <span className="text-xs text-slate-500">
              địa điểm (Đang hiển thị:{' '}
              <strong className="text-[#1a73e8] tabular-nums">
                {filteredStandards.length}
              </strong>
              )
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Chuẩn 21 cột khám (G &rarr; AA)</span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
              title="Khôi phục dữ liệu mẫu"
            >
              <RotateCcw className="w-3 h-3" /> Mặc định
            </button>
          </div>
        </div>

        {/* Card 2: Classification Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phân Loại (Cột E)
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setFilterPhanLoai(
                  filterPhanLoai === 'Bếp Samsung' ? 'ALL' : 'Bếp Samsung'
                )
              }
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                filterPhanLoai === 'Bếp Samsung'
                  ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-blue-50/40'
              }`}
            >
              <div className="text-[10px] font-semibold text-blue-700 truncate">
                Bếp Samsung
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {kpiStats.byClassification['Bếp Samsung'] || 0}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterPhanLoai(filterPhanLoai === 'Bếp ngoài' ? 'ALL' : 'Bếp ngoài')
              }
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                filterPhanLoai === 'Bếp ngoài'
                  ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-teal-50/40'
              }`}
            >
              <div className="text-[10px] font-semibold text-teal-700 truncate">
                Bếp ngoài
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {kpiStats.byClassification['Bếp ngoài'] || 0}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterPhanLoai(filterPhanLoai === 'OFFICE' ? 'ALL' : 'OFFICE')
              }
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                filterPhanLoai === 'OFFICE'
                  ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-purple-50/40'
              }`}
            >
              <div className="text-[10px] font-semibold text-purple-700 truncate">
                OFFICE
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {kpiStats.byClassification['OFFICE'] || 0}
              </div>
            </button>
          </div>
          <div className="mt-2 pt-1.5 text-[11px] text-slate-400">
            Nhấn vào từng nhóm để lọc nhanh
          </div>
        </div>

        {/* Card 3: Checkup Frequency (Thời hạn) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chu Kỳ / Thời Hạn Khám (Cột D)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Định kỳ 6 tháng:</span>
              <span className="font-bold text-slate-900 tabular-nums bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                {kpiStats.freq6Months} điểm
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Định kỳ 12 tháng:</span>
              <span className="font-bold text-slate-900 tabular-nums bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-200">
                {kpiStats.freq12Months} điểm
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">6T (Bếp chính) - 12T (Phụ):</span>
              <span className="font-bold text-slate-900 tabular-nums bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                {kpiStats.freqMixed} điểm
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Regional Distribution (Khu vực) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phân Bổ Khu Vực (Cột AE)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 max-h-[76px] overflow-y-auto pr-1">
            {kpiStats.sortedRegions.map(([region, count]) => (
              <button
                key={region}
                type="button"
                onClick={() =>
                  setFilterKhuVuc(filterKhuVuc === region ? 'ALL' : region)
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                  filterKhuVuc === region
                    ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{region}</span>
                <span
                  className={`font-bold tabular-nums px-1 rounded text-[10px] ${
                    filterKhuVuc === region
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 pt-1.5 text-[11px] text-slate-400">
            {kpiStats.sortedRegions.length} tỉnh/thành phố vận hành
          </div>
        </div>
      </div>

      {/* 2. MULTI-CRITERIA SEARCH & REAL-TIME FILTER BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Global Search */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh theo Phòng (SEV1, TCE...), Nhà cung cấp (Hữu Phúc, Âu Cơ...)"
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Phân loại */}
          <div className="lg:col-span-2">
            <select
              value={filterPhanLoai}
              onChange={(e) => setFilterPhanLoai(e.target.value)}
              aria-label="Lọc theo Phân loại"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Tất cả Phân loại (Cột E)</option>
              {availablePhanLoai.map((pl) => (
                <option key={pl} value={pl}>
                  {pl}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Khu vực */}
          <div className="lg:col-span-2">
            <select
              value={filterKhuVuc}
              onChange={(e) => setFilterKhuVuc(e.target.value)}
              aria-label="Lọc theo Khu vực"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Tất cả Khu vực (Cột AE)</option>
              {availableRegions.map((kv) => (
                <option key={kv} value={kv}>
                  {kv}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Thời hạn */}
          <div className="lg:col-span-2">
            <select
              value={filterThoiHan}
              onChange={(e) => setFilterThoiHan(e.target.value)}
              aria-label="Lọc theo Thời hạn"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Tất cả Thời hạn (Cột D)</option>
              {THOI_HAN_OPTIONS.map((th) => (
                <option key={th} value={th}>
                  {th}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Specific Medical Test Item (21 items) */}
          <div className="lg:col-span-2">
            <select
              value={filterTestItem}
              onChange={(e) =>
                setFilterTestItem(e.target.value as HealthCheckItemKey | 'ALL')
              }
              aria-label="Lọc theo Hạng mục xét nghiệm"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Lọc theo Xét nghiệm (21 mục)</option>
              {HEALTH_CHECK_ITEMS.map((col) => (
                <option key={col.key} value={col.key}>
                  [{col.colLetter}] {col.shortLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter bar & View Mode switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
              <Filter className="w-3.5 h-3.5 text-[#1a73e8]" />
              Kết quả lọc:{' '}
              <strong className="text-slate-900 tabular-nums">
                {filteredStandards.length}
              </strong>{' '}
              / {standards.length} phòng
            </span>

            {(searchQuery ||
              filterPhanLoai !== 'ALL' ||
              filterKhuVuc !== 'ALL' ||
              filterThoiHan !== 'ALL' ||
              filterTestItem !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterPhanLoai('ALL');
                  setFilterKhuVuc('ALL');
                  setFilterThoiHan('ALL');
                  setFilterTestItem('ALL');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] transition cursor-pointer"
              >
                <X className="w-3 h-3" /> Xóa bộ lọc
              </button>
            )}

            {filterTestItem !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                Đang lọc nơi bắt buộc có:{' '}
                {HEALTH_CHECK_ITEMS.find((c) => c.key === filterTestItem)?.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">
              Chế độ xem:
            </span>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-[#1a73e8] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Bảng Ma Trận (Sheet)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#1a73e8] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ Địa Điểm</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. DATA VIEW: MATRIX TABLE OR CARD GRID */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
          Đang đồng bộ dữ liệu từ Sheet &ldquo;Tiêu chuẩn&rdquo;...
        </div>
      ) : filteredStandards.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800">
            Không tìm thấy Phòng / Địa điểm nào khớp với điều kiện lọc
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hãy thử xóa bớt bộ lọc hoặc nhấn nút &ldquo;Thêm Phòng / Điểm Khám&rdquo; để bổ sung tiêu chuẩn mới vào Sheet.
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* SHEET MATRIX TABLE VIEW (Columns B -> AE) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1a73e8]" />
              <span className="font-semibold text-slate-800">
                Bảng Ma Trận Tiêu Chuẩn Khám Sức Khỏe (Cấu trúc dòng 3 Sheet &ldquo;Tiêu chuẩn&rdquo;)
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                &bull; Nhấp vào bất kỳ hàng nào để mở Cửa sổ Đối chiếu Chi tiết &amp; Sao chép gửi Phòng khám
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-teal-600 text-white font-bold inline-flex items-center justify-center text-[10px]">
                  X
                </span>
                Bắt buộc khám
              </span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span className="w-4 h-4 rounded border border-slate-200 inline-flex items-center justify-center text-[10px]">
                  -
                </span>
                Không áp dụng
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-20">
                <tr>
                  <th className="py-2.5 px-2.5 font-bold text-center border-r border-blue-800/60 w-12 sticky left-0 bg-[#1e3c72] z-30">
                    STT
                  </th>
                  <th className="py-2.5 px-3 font-bold border-r border-blue-800/60 min-w-[130px] sticky left-12 bg-[#1e3c72] z-30">
                    Phòng / Điểm
                  </th>
                  <th className="py-2.5 px-2.5 font-bold border-r border-blue-800/60 min-w-[110px]">
                    Thời hạn
                  </th>
                  <th className="py-2.5 px-2.5 font-bold border-r border-blue-800/60 min-w-[105px]">
                    Phân loại
                  </th>
                  <th className="py-2.5 px-2 font-bold text-center border-r border-blue-800/60 min-w-[72px]">
                    Mục đích
                  </th>

                  {/* 21 Medical Examination Columns */}
                  {HEALTH_CHECK_ITEMS.map((col) => (
                    <th
                      key={col.key}
                      title={`${col.label} (${col.description})`}
                      className={`py-2 px-1.5 text-center border-r border-blue-800/50 min-w-[54px] max-w-[68px] ${
                        filterTestItem === col.key ? 'bg-teal-700' : ''
                      }`}
                    >
                      <div className="text-[10px] font-semibold leading-tight line-clamp-2">
                        {col.shortLabel}
                      </div>
                    </th>
                  ))}

                  <th className="py-2.5 px-2 font-bold text-center border-r border-blue-800/60 min-w-[65px] bg-blue-950/50">
                    Tổng X
                  </th>
                  <th className="py-2.5 px-2.5 font-bold border-r border-blue-800/60 min-w-[95px]">
                    Nhà cung cấp
                  </th>
                  <th className="py-2.5 px-3 font-bold border-r border-blue-800/60 min-w-[170px]">
                    Note / Ghi chú
                  </th>
                  <th className="py-2.5 px-2.5 font-bold border-r border-blue-800/60 min-w-[95px]">
                    Khu vực
                  </th>
                  <th className="py-2.5 px-2.5 font-bold text-center min-w-[100px]">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredStandards.map((room) => {
                  const mandatoryCount = countMandatoryTests(room);
                  return (
                    <tr
                      key={room.id}
                      onClick={() => handleOpenDetailModal(room)}
                      className="hover:bg-blue-50/60 transition cursor-pointer group"
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-blue-50/90 z-10 tabular-nums">
                        {room.stt}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100 sticky left-12 bg-white group-hover:bg-blue-50/90 z-10">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[#1e3c72] group-hover:underline">
                            {room.phong}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 border-r border-slate-100">
                        <span className="text-[11px] font-medium">{room.thoiHan}</span>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 whitespace-nowrap">
                        {renderPhanLoaiBadge(room.phanLoai)}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {room.mucDichKham}
                        </span>
                      </td>

                      {/* 21 "X" cells */}
                      {HEALTH_CHECK_ITEMS.map((col) => {
                        const checked = Boolean(room.items?.[col.key]);
                        return (
                          <td
                            key={col.key}
                            className={`py-2 px-1 text-center border-r border-slate-100 ${
                              checked
                                ? 'bg-teal-50/50'
                                : ''
                            }`}
                          >
                            {checked ? (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded bg-teal-600 text-white font-bold text-[11px] shadow-2xs"
                                title={`${room.phong}: Bắt buộc ${col.label}`}
                              >
                                X
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">·</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-slate-50/70 font-bold tabular-nums">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-900">
                          {mandatoryCount}/21
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 font-medium border-r border-slate-100 whitespace-nowrap">
                        {room.nhaCungCap || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] border-r border-slate-100 max-w-[220px] truncate">
                        {room.ghiChu || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 font-medium border-r border-slate-100 whitespace-nowrap">
                        {room.khuVuc}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-2 px-2 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleCopyStandard(room)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép tiêu chuẩn gửi Phòng khám"
                          >
                            {copiedId === room.id ? (
                              <Check className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(room)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa tiêu chuẩn phòng"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(room)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Xóa phòng khỏi Sheet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStandards.map((room) => {
            const mandatoryCols = HEALTH_CHECK_ITEMS.filter(
              (col) => room.items?.[col.key]
            );
            return (
              <div
                key={room.id}
                onClick={() => handleOpenDetailModal(room)}
                className="bg-white rounded-xl border border-slate-200 hover:border-[#1a73e8] p-4 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          #{room.stt}
                        </span>
                        <h3 className="text-base font-bold text-[#1e3c72]">
                          {room.phong}
                        </h3>
                        {renderPhanLoaiBadge(room.phanLoai)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {room.khuVuc}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Hospital className="w-3.5 h-3.5 text-slate-400" />
                          {room.nhaCungCap || 'Chưa chỉ định'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {room.thoiHan}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs tabular-nums shrink-0">
                      {mandatoryCols.length}/21 mục
                    </span>
                  </div>

                  {room.ghiChu && (
                    <div className="text-[11px] bg-amber-50/80 text-amber-900 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                      <strong>Ghi chú:</strong> {room.ghiChu}
                    </div>
                  )}

                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                      Danh mục đánh dấu &ldquo;X&rdquo;:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {mandatoryCols.slice(0, 10).map((col) => (
                        <span
                          key={col.key}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                        >
                          <span className="text-teal-600 font-bold">X</span>
                          {col.shortLabel}
                        </span>
                      ))}
                      {mandatoryCols.length > 10 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold">
                          +{mandatoryCols.length - 10} mục khác
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => void handleCopyStandard(room)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1a73e8] text-xs font-semibold transition cursor-pointer"
                  >
                    {copiedId === room.id ? (
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Sao chép tiêu chuẩn</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(room)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(room)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DETAIL INSPECTION MODAL (DRAWER / DIALOG) */}
      {selectedRoom && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (!isDetailEditing) setSelectedRoom(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3c72] to-[#1a73e8] text-white px-6 py-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs font-bold">
                    STT #{selectedRoom.stt} (Hàng {selectedRoom.stt + 3})
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-teal-400 text-slate-950 text-xs font-bold">
                    {isDetailEditing ? detailPhanLoai : selectedRoom.phanLoai}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-white/15 text-white text-xs font-medium">
                    Khu vực: {isDetailEditing ? detailKhuVuc : selectedRoom.khuVuc}
                  </span>
                  {isDetailEditing && (
                    <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 text-xs font-bold animate-pulse">
                      Đang chỉnh sửa tiêu chuẩn
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  Phòng / Địa điểm: {isDetailEditing ? detailPhong : selectedRoom.phong}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              {detailError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{detailError}</span>
                </div>
              )}

              {isDetailEditing ? (
                /* Editable Metadata & Form Inputs */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Phòng / Địa điểm <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={detailPhong}
                      onChange={(e) => setDetailPhong(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phân loại</label>
                    <select
                      value={detailPhanLoai}
                      onChange={(e) => setDetailPhanLoai(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white outline-none font-medium"
                    >
                      {PHAN_LOAI_OPTIONS.map((pl) => (
                        <option key={pl} value={pl}>{pl}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Khu vực</label>
                    <input
                      type="text"
                      list="khu-vuc-list-detail"
                      value={detailKhuVuc}
                      onChange={(e) => setDetailKhuVuc(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <datalist id="khu-vuc-list-detail">
                      {availableRegions.map((kv) => (
                        <option key={kv} value={kv} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Thời hạn khám</label>
                    <input
                      type="text"
                      list="thoi-han-list-detail"
                      value={detailThoiHan}
                      onChange={(e) => setDetailThoiHan(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <datalist id="thoi-han-list-detail">
                      {THOI_HAN_OPTIONS.map((th) => (
                        <option key={th} value={th} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mục đích khám</label>
                    <input
                      type="text"
                      list="muc-dich-list-detail"
                      value={detailMucDich}
                      onChange={(e) => setDetailMucDich(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <datalist id="muc-dich-list-detail">
                      {MUC_DICH_OPTIONS.map((md) => (
                        <option key={md} value={md} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nhà cung cấp</label>
                    <input
                      type="text"
                      list="ncc-list-detail"
                      value={detailNhaCungCap}
                      onChange={(e) => setDetailNhaCungCap(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <datalist id="ncc-list-detail">
                      {NHA_CUNG_CAP_SUGGESTIONS.map((ncc) => (
                        <option key={ncc} value={ncc} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={detailGhiChu}
                      onChange={(e) => setDetailGhiChu(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* Metadata Summary Grid (Read-only) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <div className="text-slate-400 font-medium">Thời hạn khám (Cột D)</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedRoom.thoiHan}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Mục đích khám (Cột F)</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedRoom.mucDichKham}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Nhà cung cấp (Cột AC)</div>
                    <div className="font-bold text-[#1a73e8] mt-0.5">
                      {selectedRoom.nhaCungCap || 'Chưa chỉ định'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Tổng hạng mục bắt buộc</div>
                    <div className="font-bold text-teal-700 mt-0.5 tabular-nums">
                      {countMandatoryTests(selectedRoom)} / 21 danh mục (&ldquo;X&rdquo;)
                    </div>
                  </div>
                </div>
              )}

              {!isDetailEditing && selectedRoom.ghiChu && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Note / Ghi chú đặc biệt (Cột AD):</strong> {selectedRoom.ghiChu}
                  </div>
                </div>
              )}

              {/* Checklist of 21 Clinical & Laboratory Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    {isDetailEditing ? 'Chỉnh Sửa 21 Danh Mục Khám (Tích chọn = Ghi "X")' : 'Chi Tiết 21 Danh Mục Khám Lâm Sàng & Xét Nghiệm (Cột G → AA)'}
                  </h4>
                  <span className="text-xs text-slate-500">
                    {isDetailEditing ? (
                      <strong className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Đã chọn: {HEALTH_CHECK_ITEMS.filter((c) => Boolean(detailItems[c.key])).length} / 21 mục
                      </strong>
                    ) : (
                      `Các mục đánh dấu X là bắt buộc đối với nhân sự tại ${selectedRoom.phong}`
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {Object.entries(groupedHealthColumns).map(([groupKey, cols]) => (
                    <div
                      key={groupKey}
                      className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-2"
                    >
                      <div className="text-xs font-bold text-[#1e3c72] border-b border-slate-100 pb-1.5">
                        {HEALTH_CHECK_GROUP_LABELS[
                          groupKey as HealthCheckColumnDef['group']
                        ] || groupKey}
                      </div>
                      <div className="space-y-1.5">
                        {cols.map((col) => {
                          const isMandatory = isDetailEditing
                            ? Boolean(detailItems[col.key])
                            : Boolean(selectedRoom.items?.[col.key]);
                          return isDetailEditing ? (
                            <label
                              key={col.key}
                              className={`flex items-start gap-2 p-2 rounded-lg text-xs cursor-pointer transition select-none ${
                                isMandatory
                                  ? 'bg-teal-50 border border-teal-300 text-slate-900'
                                  : 'bg-slate-50/80 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isMandatory}
                                onChange={(e) =>
                                  setDetailItems((prev) => ({
                                    ...prev,
                                    [col.key]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold">{col.label}</span>
                                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                                    Cột {col.colLetter}
                                  </span>
                                </div>
                              </div>
                            </label>
                          ) : (
                            <div
                              key={col.key}
                              className={`flex items-start gap-2 p-2 rounded-lg text-xs transition ${
                                isMandatory
                                  ? 'bg-teal-50/90 border border-teal-200 text-teal-950'
                                  : 'bg-slate-50/60 text-slate-400'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                                  isMandatory
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-200 text-slate-400'
                                }`}
                              >
                                {isMandatory ? 'X' : '—'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                                    Cột {col.colLetter}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      isMandatory ? 'text-slate-900' : 'text-slate-400'
                                    }`}
                                  >
                                    {col.label}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {col.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isDetailEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyStandard(selectedRoom)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Sao chép Tiêu chuẩn gửi Phòng khám</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDetailEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-amber-600" />
                      <span>Chỉnh sửa tiêu chuẩn</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDetailEditing(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDetailEditing ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveDetailRoom()}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi Tiêu Chuẩn'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedRoom(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT ROOM MODAL (FULL CRUD SUPPORT) */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#1e3c72] to-[#1a73e8] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  {editingRoom
                    ? `Chỉnh Sửa Tiêu Chuẩn Khám: ${editingRoom.phong} (STT #${editingRoom.stt})`
                    : 'Thêm Phòng / Địa Điểm Khám Mới Vào Sheet "Tiêu chuẩn"'}
                </h3>
                <p className="text-xs text-blue-100">
                  Tích chọn các hạng mục bắt buộc khám để hệ thống tự động điền dấu &ldquo;X&rdquo; vào cột tương ứng (Cột G &rarr; AA).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Phòng / Địa điểm (Cột C) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhong}
                    onChange={(e) => setFormPhong(e.target.value)}
                    placeholder="VD: SEV1, TCE, OFFICE, REGENT2..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại (Cột E)
                  </label>
                  <select
                    value={formPhanLoai}
                    onChange={(e) => setFormPhanLoai(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-[#1a73e8] outline-none font-medium"
                  >
                    {PHAN_LOAI_OPTIONS.map((pl) => (
                      <option key={pl} value={pl}>
                        {pl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khu vực / Tỉnh thành (Cột AE)
                  </label>
                  <input
                    type="text"
                    list="khu-vuc-list"
                    value={formKhuVuc}
                    onChange={(e) => setFormKhuVuc(e.target.value)}
                    placeholder="VD: Bắc Ninh, Thái Nguyên, Hà Nội..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none"
                  />
                  <datalist id="khu-vuc-list">
                    {availableRegions.map((kv) => (
                      <option key={kv} value={kv} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời hạn khám (Cột D)
                  </label>
                  <input
                    type="text"
                    list="thoi-han-list"
                    value={formThoiHan}
                    onChange={(e) => setFormThoiHan(e.target.value)}
                    placeholder="VD: 6 tháng, 12 tháng..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none"
                  />
                  <datalist id="thoi-han-list">
                    {THOI_HAN_OPTIONS.map((th) => (
                      <option key={th} value={th} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mục đích khám (Cột F)
                  </label>
                  <input
                    type="text"
                    list="muc-dich-list"
                    value={formMucDich}
                    onChange={(e) => setFormMucDich(e.target.value)}
                    placeholder="VD: ĐK, ĐK VP, ĐK 4C, ĐK & GPLĐ..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none"
                  />
                  <datalist id="muc-dich-list">
                    {MUC_DICH_OPTIONS.map((md) => (
                      <option key={md} value={md} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhà cung cấp / Bệnh viện (Cột AC)
                  </label>
                  <input
                    type="text"
                    list="ncc-list"
                    value={formNhaCungCap}
                    onChange={(e) => setFormNhaCungCap(e.target.value)}
                    placeholder="VD: Hữu Phúc, Âu Cơ, Huệ Linh, Đông Âu..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none"
                  />
                  <datalist id="ncc-list">
                    {NHA_CUNG_CAP_SUGGESTIONS.map((ncc) => (
                      <option key={ncc} value={ncc} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Note / Ghi chú đặc biệt (Cột AD)
                  </label>
                  <input
                    type="text"
                    value={formGhiChu}
                    onChange={(e) => setFormGhiChu(e.target.value)}
                    placeholder="VD: XN nuôi cấy phân; Bỏ VGB, HIV từ 10/7/2023..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] outline-none"
                  />
                </div>
              </div>

              {/* Preset Templates Bar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
                    Áp dụng nhanh Mẫu tiêu chuẩn (Preset):
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setFormItems(
                          createHealthItemsMap(HEALTH_CHECK_ITEMS.map((c) => c.key))
                        )
                      }
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Chọn tất cả (21/21)
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormItems(createHealthItemsMap([]))}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(HEALTH_PRESET_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormItems(createHealthItemsMap(tpl.keys))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-400 text-xs font-medium text-slate-700 transition cursor-pointer"
                      title={tpl.description}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 21 Medical Check Items Multi-Checkbox Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Danh Mục 21 Xét Nghiệm &amp; Khám Lâm Sàng (Tích chọn = Ghi &ldquo;X&rdquo; vào Cột G &rarr; AA)
                  </label>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 tabular-nums">
                    Đã chọn:{' '}
                    {
                      HEALTH_CHECK_ITEMS.filter((c) => Boolean(formItems[c.key]))
                        .length
                    }{' '}
                    / 21 mục
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {HEALTH_CHECK_ITEMS.map((col, idx) => {
                    const checked = Boolean(formItems[col.key]);
                    return (
                      <label
                        key={col.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                          checked
                            ? 'bg-teal-50/90 border-teal-400 text-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFormItems((prev) => ({
                              ...prev,
                              [col.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold leading-snug">
                              {idx + 1}. {col.shortLabel}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                              Cột {col.colLetter}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {col.label}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Đang ghi vào Sheet...'
                      : editingRoom
                      ? 'Lưu Cập Nhật Tiêu Chuẩn'
                      : 'Ghi Phòng Mới Vào Sheet "Tiêu chuẩn"'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Bạn chắc chắn muốn xóa không?
                </h4>
                <p className="text-xs text-slate-600">
                  Hành động này sẽ xóa tiêu chuẩn khám sức khỏe của phòng{' '}
                  <strong className="text-slate-900">{deleteTarget.phong}</strong> (STT #
                  {deleteTarget.stt}, khu vực {deleteTarget.khuVuc}) khỏi Sheet &ldquo;Tiêu chuẩn&rdquo;.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GOOGLE APPS SCRIPT DELIVERABLE MODAL (Code.gs & Deployment Guide) */}
      {isGasModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsGasModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-base font-bold">
                    Bộ Mã Nguồn Google Apps Script Kết Nối Trực Tiếp Sheet &ldquo;Tiêu chuẩn&rdquo;
                  </h3>
                  <p className="text-xs text-slate-300">
                    Đọc/Ghi từ Hàng 3 (Header) và Hàng 4+ (Dữ liệu), Cột B (STT) đến Cột AE (Khu vực).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGasModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setGasTab('code_gs')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition cursor-pointer ${
                    gasTab === 'code_gs'
                      ? 'bg-white text-[#1a73e8] border-[#1a73e8]'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  1. File Code.gs (Backend Google Sheet)
                </button>
                <button
                  type="button"
                  onClick={() => setGasTab('guide')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition cursor-pointer ${
                    gasTab === 'guide'
                      ? 'bg-white text-[#1a73e8] border-[#1a73e8]'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  2. Hướng dẫn triển khai (Deployment Guide)
                </button>
              </div>

              {gasTab === 'code_gs' && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(HEALTH_STANDARD_GAS_CODE_GS);
                    showToast('success', 'Đã sao chép toàn bộ mã Code.gs vào bộ nhớ tạm!');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a73e8] text-white text-xs font-bold cursor-pointer mb-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép Code.gs</span>
                </button>
              )}
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto text-xs">
              {gasTab === 'code_gs' ? (
                <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto">
                  {HEALTH_STANDARD_GAS_CODE_GS}
                </pre>
              ) : (
                <div className="space-y-4 text-slate-700 leading-relaxed">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                    <h4 className="font-bold text-sm mb-1">
                      Quy trình tích hợp lên Google Sheets thực tế của công ty
                    </h4>
                    <p className="text-xs">
                      Bạn có thể sử dụng trực tiếp giao diện này ngay trên Web App, hoặc gắn mã <code>Code.gs</code> vào file Google Sheet có tab <strong>&ldquo;Tiêu chuẩn&rdquo;</strong> để đồng bộ hai chiều.
                    </p>
                  </div>

                  <ol className="list-decimal list-inside space-y-2.5 font-medium">
                    <li>
                      Mở file Google Sheets chứa tab <strong>Tiêu chuẩn</strong> (Dòng 3 là tiêu đề cột từ Cột B đến Cột AE, dữ liệu từ Dòng 4).
                    </li>
                    <li>
                      Trên thanh menu Google Sheets, chọn <strong>Tiện ích mở rộng (Extensions) &rarr; Apps Script</strong>.
                    </li>
                    <li>
                      Xóa mã mặc định trong file <code>Code.gs</code> và dán toàn bộ nội dung <strong>Code.gs</strong> ở tab bên cạnh vào, sau đó nhấn <strong>Lưu (Ctrl+S)</strong>.
                    </li>
                    <li>
                      Nhấn nút <strong>Triển khai (Deploy) &rarr; Tùy chọn triển khai mới (New deployment)</strong>.
                    </li>
                    <li>
                      Chọn loại: <strong>Ứng dụng web (Web App)</strong>:
                      <ul className="list-disc list-inside ml-5 mt-1 text-slate-600 font-normal space-y-1">
                        <li>Thực thi dưới dạng (Execute as): <strong>Tôi (Me)</strong></li>
                        <li>Ai có quyền truy cập (Who has access): <strong>Bất kỳ ai trong tổ chức / Bất kỳ ai (Anyone)</strong></li>
                      </ul>
                    </li>
                    <li>
                      Nhấn <strong>Triển khai (Deploy)</strong>, cấp quyền truy cập Google Sheets và sử dụng đường dẫn Web App URL.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Provider Modal */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsProviderModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editingProvider ? 'Cập Nhật Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}</h3>
              <button type="button" onClick={() => setIsProviderModalOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveProvider} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Bệnh viện / Phòng khám *</label>
                <input type="text" required value={provTen} onChange={(e) => setProvTen(e.target.value)} placeholder="VD: Phòng khám Đa khoa Hữu Phúc" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Địa chỉ</label>
                  <input type="text" value={provDiaChi} onChange={(e) => setProvDiaChi(e.target.value)} placeholder="VD: KCN Yên Phong, Bắc Ninh" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời hạn hợp đồng</label>
                  <input type="text" value={provThoiHan} onChange={(e) => setProvThoiHan(e.target.value)} placeholder="VD: 31/12/2026" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người phụ trách</label>
                  <input type="text" value={provPhuTrach} onChange={(e) => setProvPhuTrach(e.target.value)} placeholder="VD: Bs. Hùng" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input type="text" value={provDienThoai} onChange={(e) => setProvDienThoai(e.target.value)} placeholder="VD: 0912345678" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input type="email" value={provEmail} onChange={(e) => setProvEmail(e.target.value)} placeholder="VD: contact@clinic.vn" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dịch vụ thế mạnh / Gói khám</label>
                <input type="text" value={provDichVu} onChange={(e) => setProvDichVu(e.target.value)} placeholder="VD: Khám tuyển dụng nhanh, XN máu, X-Quang" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                <textarea rows={2} value={provGhiChu} onChange={(e) => setProvGhiChu(e.target.value)} placeholder="VD: Đối tác chiến lược tại khu vực..." className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsProviderModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer">Lưu Nhà Cung Cấp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recruitment Registration Modal */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsRegModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editingReg ? 'Cập Nhật Đăng Ký Khám Tuyển Dụng' : 'Đăng Ký Khám Sức Khỏe Cho Ứng Viên'}</h3>
              <button type="button" onClick={() => setIsRegModalOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {/* CCCD OCR Upload Dropzone */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950">Đăng ký tự động qua CCCD (AI OCR)</div>
                  <div className="text-[11px] text-blue-700">Tải lên ảnh CCCD mặt trước/mặt sau để hệ thống tự động điền họ tên, ngày sinh, số CCCD.</div>
                </div>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0 transition">
                <FileText className="w-4 h-4" />
                <span>{isOcrScanning ? 'Đang quét OCR...' : 'Chọn ảnh CCCD'}</span>
                <input type="file" accept="image/*" onChange={handleCccdUpload} className="hidden" disabled={isOcrScanning} />
              </label>
            </div>

            <form onSubmit={handleSaveReg} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên ứng viên *</label>
                  <input type="text" required value={regHoVaTen} onChange={(e) => setRegHoVaTen(e.target.value)} placeholder="VD: Nguyễn Văn An" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD</label>
                  <input type="text" value={regCCCD} onChange={(e) => setRegCCCD(e.target.value)} placeholder="VD: 001098002345" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày sinh</label>
                  <input type="date" value={regNgaySinh} onChange={(e) => setRegNgaySinh(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới tính</label>
                  <select value={regGioiTinh} onChange={(e) => setRegGioiTinh(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              {/* Cascading Org Hierarchy (Khối > Ban > Phòng) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối</label>
                  <select value={regKhoi} onChange={(e) => handleRegKhoiChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-medium">
                    {DEFAULT_ORGANIZATION_HIERARCHY.map((k) => (
                      <option key={k.id} value={k.name}>{k.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ban</label>
                  <select value={regBan} onChange={(e) => handleRegBanChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-medium">
                    {DEFAULT_ORGANIZATION_HIERARCHY.find(k => k.name === regKhoi)?.bans.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng</label>
                  <select value={regPhong} onChange={(e) => handleRegPhongChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-medium">
                    {DEFAULT_ORGANIZATION_HIERARCHY.find(k => k.name === regKhoi)?.bans.find(b => b.name === regBan)?.phongs.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Job Position Hierarchy (Công việc -> Chức vụ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Công việc</label>
                  <select value={regCongViec} onChange={(e) => handleRegCongViecChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-medium">
                    {DEFAULT_JOB_POSITIONS.map((j) => (
                      <option key={j.id} value={j.name}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức vụ</label>
                  <select value={regChucVu} onChange={(e) => setRegChucVu(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-medium">
                    {DEFAULT_JOB_POSITIONS.find(j => j.name === regCongViec)?.chucVus.map((cv) => (
                      <option key={cv} value={cv}>{cv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng khám dự kiến (AI Lookup theo Phòng)</label>
                  <input type="text" value={regNhaCungCap} readOnly className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 font-bold text-teal-800" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày khám (Dự kiến)</label>
                  <input type="date" value={regNgayHenKham} onChange={(e) => setRegNgayHenKham(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhân viên tuyển dụng phụ trách (Người đăng ký)</label>
                  <input type="text" value={regNguoiDangKy} onChange={(e) => setRegNguoiDangKy(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                  <input type="text" value={regGhiChu} onChange={(e) => setRegGhiChu(e.target.value)} placeholder="VD: Đợt tuyển tháng 11..." className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsRegModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer">Xác Nhận Đăng Ký</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recruitment Standard Modal */}
      {isRecStdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsRecStdModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editingRecStd ? 'Cập Nhật Tiêu Chuẩn Tuyển Dụng' : 'Thêm Nhóm Tiêu Chuẩn Tuyển Dụng'}</h3>
              <button type="button" onClick={() => setIsRecStdModalOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveRecStd} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhóm đối tượng / Vị trí *</label>
                <input type="text" required value={recStdDoiTuong} onChange={(e) => setRecStdDoiTuong(e.target.value)} placeholder="VD: Công nhân sản xuất / Nhân viên bếp..." className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Danh mục khám bắt buộc (mỗi dòng 1 mục)</label>
                <textarea rows={5} value={recStdBatBuocText} onChange={(e) => setRecStdBatBuocText(e.target.value)} placeholder="Khám lâm sàng tổng quát&#10;Xét nghiệm máu&#10;Xét nghiệm nước tiểu" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono text-xs" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lưu ý đặc biệt / Quy định</label>
                <input type="text" value={recStdLuuY} onChange={(e) => setRecStdLuuY(e.target.value)} placeholder="VD: Theo thông tư 14/2013/TT-BYT..." className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsRecStdModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer">Lưu Tiêu Chuẩn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
