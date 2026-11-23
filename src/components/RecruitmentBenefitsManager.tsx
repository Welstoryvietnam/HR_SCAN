import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  RotateCcw,
  Home,
  Plus,
  Download,
  Search,
  Filter,
  X,
  Edit3,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Users,
  UserPlus,
  AlertTriangle,
  Building2,
  BookOpen,
  FileText,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  UserProfile,
  NhanSuRecord,
  KhoiNode,
  BenefitApprovalStatus,
  RecruitmentBenefitSubTab,
  RecruitmentPolicyItem,
  ReferralBonusRecord,
  RehireEmployeeRecord,
  HousingSupportRecord,
} from '../types';
import { safeFetchJson } from '../utils/apiHelper';

export interface BenefitCounts {
  danh_muc_chinh_sach: number;
  thuong_gioi_thieu: number;
  nguoi_cu_quay_lai: number;
  ho_tro_nha_tro: number;
}

interface RecruitmentBenefitsManagerProps {
  currentUser: UserProfile;
  records: NhanSuRecord[];
  organizationHierarchy: KhoiNode[];
  activeSubTab: RecruitmentBenefitSubTab;
  onSubTabChange: (sub: RecruitmentBenefitSubTab) => void;
  onCountsChange?: (counts: BenefitCounts) => void;
}

export const DEFAULT_RECRUITMENT_POLICIES: RecruitmentPolicyItem[] = [
  {
    id: 'CS_GT_01',
    stt: 1,
    maChinhSach: 'CS-GT-01',
    tenChinhSach: 'Chính sách thưởng giới thiệu nhân viên mới',
    loaiChinhSach: 'thuong_gioi_thieu',
    doiTuong:
      'Toàn thể Cán bộ Nhân viên đang làm việc tại Công ty giới thiệu ứng viên cho các vị trí Vận hành (Bếp, Bán hàng, Phục vụ, Tạp vụ)',
    chinhSachHoTro:
      '500,000 đ – 1,000,000 đ / người (tùy theo từng điểm bếp và vị trí tuyển dụng)',
    thoiHan: 'Nhân viên mới làm việc đủ 30 ngày công thực tế và không vi phạm kỷ luật',
    thoiGianApDung: '01/01/2026 – 31/12/2026 (Chi trả cùng kỳ lương liền kề)',
    dieuKienChiTiet:
      'Người giới thiệu nộp thông tin trước khi NVM phỏng vấn; NVM phải hoàn thành 30 ngày công',
    trangThai: 'dang_ap_dung',
    ghiChu: 'Áp dụng cho toàn bộ các điểm bếp và khối văn phòng',
    nguoiTao: 'Ban Tuyển dụng',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'CS_QL_01',
    stt: 2,
    maChinhSach: 'CS-QL-01',
    tenChinhSach: 'Chính sách thu hút người cũ quay lại làm việc',
    loaiChinhSach: 'nguoi_cu_quay_lai',
    doiTuong:
      'Cựu nhân viên từng làm việc trên 06 tháng, hoàn tất thủ tục nghỉ đúng quy trình, đánh giá Tốt hoặc Bình thường',
    chinhSachHoTro:
      'Thưởng tái gia nhập 500,000 đ – 1,500,000 đ + Bảo lưu xếp bậc tay nghề và bậc lương phù hợp',
    thoiHan: 'Hoàn thành đủ 01 tháng làm việc đầu tiên kể từ ngày ký lại HĐLĐ',
    thoiGianApDung: 'Từ 01/01/2026 đến khi có thông báo mới',
    dieuKienChiTiet:
      'Được quản lý điểm/bếp tiếp nhận và Trưởng nhóm Tuyển dụng/C&B phê duyệt',
    trangThai: 'dang_ap_dung',
    ghiChu: 'Không áp dụng cho nhân viên từng bị xử lý kỷ luật sa thải',
    nguoiTao: 'Ban Tuyển dụng',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'CS_NT_01',
    stt: 3,
    maChinhSach: 'CS-NT-01',
    tenChinhSach: 'Chính sách hỗ trợ nhà trọ cho nhân viên mới',
    loaiChinhSach: 'ho_tro_nha_tro',
    doiTuong:
      'Nhân viên mới có hộ khẩu ngoài tỉnh (khoảng cách đến nơi làm việc từ 30km trở lên) phải thuê trọ hoặc ở KTX',
    chinhSachHoTro:
      '500,000 đ/tháng/người (chi trả tiền mặt) HOẶC Bố trí 01 chỗ ở miễn phí tại Ký túc xá công ty',
    thoiHan: 'Hỗ trợ tối đa 03 đến 06 tháng đầu tiên kể từ ngày nhận việc chính thức',
    thoiGianApDung: 'Áp dụng liên tục trong năm 2026',
    dieuKienChiTiet:
      'Có hợp đồng thuê nhà trọ hoặc giấy xác nhận tạm trú hợp lệ được quản lý cơ sở xác nhận',
    trangThai: 'dang_ap_dung',
    ghiChu: 'Xét duyệt theo tháng, chi trả cùng kỳ lương',
    nguoiTao: 'Bộ phận C&B',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'CS_GT_02',
    stt: 4,
    maChinhSach: 'CS-GT-02',
    tenChinhSach: 'Chính sách thưởng nóng giới thiệu vị trí Trọng yếu / Khó tuyển',
    loaiChinhSach: 'thuong_gioi_thieu',
    doiTuong:
      'CBNV giới thiệu ứng viên cho các vị trí: Bếp trưởng, Giám sát bếp, Chuyên viên dinh dưỡng, Quản lý điểm',
    chinhSachHoTro: '1,500,000 đ – 2,000,000 đ / vị trí',
    thoiHan: 'Nhân viên mới hoàn thành thời gian thử việc đạt yêu cầu (tối thiểu 60 ngày)',
    thoiGianApDung: '01/02/2026 – 31/12/2026',
    dieuKienChiTiet:
      'Ưu tiên ứng viên có chứng chỉ nghề và kinh nghiệm quản lý bếp ăn công nghiệp',
    trangThai: 'dang_ap_dung',
    ghiChu: 'Theo danh mục vị trí khó tuyển hàng quý của Khối Tuyển dụng',
    nguoiTao: 'Ban Tuyển dụng',
    capNhatLuc: '2026-02-01T08:00:00.000Z',
  },
];

const POLICY_CATEGORY_META: Record<
  RecruitmentPolicyItem['loaiChinhSach'],
  { label: string; badgeCls: string }
> = {
  thuong_gioi_thieu: {
    label: 'Thưởng giới thiệu',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  nguoi_cu_quay_lai: {
    label: 'Người cũ quay lại',
    badgeCls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  ho_tro_nha_tro: {
    label: 'Hỗ trợ nhà trọ',
    badgeCls: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  khac: {
    label: 'Chính sách khác',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

const POLICY_STATUS_META: Record<
  RecruitmentPolicyItem['trangThai'],
  { label: string; badgeCls: string }
> = {
  dang_ap_dung: {
    label: 'Đang áp dụng',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  tam_dung: {
    label: 'Tạm dừng',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  het_hieu_luc: {
    label: 'Hết hiệu lực',
    badgeCls: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

const STATUS_META: Record<
  BenefitApprovalStatus,
  { label: string; badgeClass: string }
> = {
  cho_duyet: {
    label: 'Chờ duyệt',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  du_dieu_kien: {
    label: 'Đủ điều kiện',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  da_chi_tra: {
    label: 'Đã chi trả',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  tu_choi: {
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

const HOUSING_TYPE_LABELS: Record<HousingSupportRecord['loaiHoTro'], string> = {
  tien_mat: 'Hỗ trợ tiền mặt',
  ky_tuc_xa: 'Bố trí Ký túc xá',
  ho_tro_thue_ngoai: 'Hỗ trợ thuê ngoài',
};

const REHIRE_RATING_META: Record<
  RehireEmployeeRecord['danhGiaTruocDay'],
  { label: string; cls: string }
> = {
  tot: { label: 'Tốt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  binh_thuong: { label: 'Bình thường', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
  can_luu_y: { label: 'Cần lưu ý', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
};

const formatVnd = (n: number | undefined | null): string => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
};

const addDaysIso = (isoDate: string, days: number): string => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const normalizeDateForInput = (raw?: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dm = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dm) {
    return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  }
  return '';
};

const currentMonthLabel = (): string => {
  const now = new Date();
  return `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
};

export const RecruitmentBenefitsManager: React.FC<RecruitmentBenefitsManagerProps> = ({
  currentUser,
  records,
  organizationHierarchy,
  activeSubTab,
  onSubTabChange,
  onCountsChange,
}) => {
  // Policies State
  const [policies, setPolicies] = useState<RecruitmentPolicyItem[]>(() => {
    try {
      const saved = localStorage.getItem('hr_benefits_v1_danh_muc_chinh_sach');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_RECRUITMENT_POLICIES;
  });

  const [referrals, setReferrals] = useState<ReferralBonusRecord[]>(() => {
    try {
      const saved = localStorage.getItem('hr_benefits_v1_thuong_gioi_thieu');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rehires, setRehires] = useState<RehireEmployeeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('hr_benefits_v1_nguoi_cu_quay_lai');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [housingList, setHousingList] = useState<HousingSupportRecord[]>(() => {
    try {
      const saved = localStorage.getItem('hr_benefits_v1_ho_tro_nha_tro');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filters for applications (Modules 2, 3, 4)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKhoi, setFilterKhoi] = useState('ALL');
  const [filterBan, setFilterBan] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<BenefitApprovalStatus | 'ALL'>('ALL');

  // Filters for Policy Catalog (Module 1)
  const [policySearch, setPolicySearch] = useState('');
  const [policyCategoryFilter, setPolicyCategoryFilter] = useState<
    RecruitmentPolicyItem['loaiChinhSach'] | 'ALL'
  >('ALL');
  const [policyStatusFilter, setPolicyStatusFilter] = useState<
    RecruitmentPolicyItem['trangThai'] | 'ALL'
  >('ALL');

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3800);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nvmPickerQuery, setNvmPickerQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Forms for each module
  const emptyPolicyForm = (): Omit<RecruitmentPolicyItem, 'id' | 'capNhatLuc'> => ({
    maChinhSach: `CS-${Date.now().toString().slice(-4)}`,
    tenChinhSach: '',
    loaiChinhSach: 'thuong_gioi_thieu',
    doiTuong: '',
    chinhSachHoTro: '',
    thoiHan: '',
    thoiGianApDung: '01/01/2026 – 31/12/2026',
    dieuKienChiTiet: '',
    trangThai: 'dang_ap_dung',
    ghiChu: '',
    nguoiTao: currentUser.name || currentUser.email,
  });

  const emptyReferralForm = (): Omit<ReferralBonusRecord, 'id' | 'capNhatLuc'> => ({
    maNVNguoiGioiThieu: '',
    tenNguoiGioiThieu: '',
    phongNguoiGioiThieu: '',
    sdtNguoiGioiThieu: '',
    hoVaTenUngVien: '',
    soCCCD: '',
    soDienThoai: '',
    khoi: '',
    ban: '',
    phong: '',
    congViec: '',
    chucVu: '',
    ngayVaoLam: new Date().toISOString().slice(0, 10),
    ngayDuDieuKien: addDaysIso(new Date().toISOString().slice(0, 10), 30),
    mucThuong: 500000,
    kyChiTra: currentMonthLabel(),
    trangThai: 'cho_duyet',
    ghiChu: '',
    nguoiTao: currentUser.name || currentUser.email,
  });

  const emptyRehireForm = (): Omit<RehireEmployeeRecord, 'id' | 'capNhatLuc'> => ({
    maNVCu: '',
    hoVaTen: '',
    soCCCD: '',
    soDienThoai: '',
    khoi: '',
    ban: '',
    phongCu: '',
    ngayNghiViecCu: '',
    lyDoNghiCu: '',
    phongMoi: '',
    congViec: '',
    chucVu: '',
    ngayQuayLai: new Date().toISOString().slice(0, 10),
    mucHoTro: 0,
    danhGiaTruocDay: 'tot',
    trangThai: 'cho_duyet',
    ghiChu: '',
    nguoiTao: currentUser.name || currentUser.email,
  });

  const emptyHousingForm = (): Omit<HousingSupportRecord, 'id' | 'capNhatLuc'> => ({
    maNV: '',
    hoVaTen: '',
    soCCCD: '',
    soDienThoai: '',
    khoi: '',
    ban: '',
    phong: '',
    congViec: '',
    chucVu: '',
    ngayVaoLam: new Date().toISOString().slice(0, 10),
    queQuan: '',
    diaChiNhaTro: '',
    loaiHoTro: 'tien_mat',
    mucHoTroThang: 500000,
    soThangHoTro: 3,
    tongHoTro: 1500000,
    tuNgay: new Date().toISOString().slice(0, 10),
    denNgay: addDaysIso(new Date().toISOString().slice(0, 10), 90),
    trangThai: 'cho_duyet',
    ghiChu: '',
    nguoiTao: currentUser.name || currentUser.email,
  });

  const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
  const [referralForm, setReferralForm] = useState(emptyReferralForm);
  const [rehireForm, setRehireForm] = useState(emptyRehireForm);
  const [housingForm, setHousingForm] = useState(emptyHousingForm);

  // Load all datasets from backend on mount
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const res = await safeFetchJson<{
          success: boolean;
          data?: {
            danh_muc_chinh_sach?: RecruitmentPolicyItem[];
            thuong_gioi_thieu?: ReferralBonusRecord[];
            nguoi_cu_quay_lai?: RehireEmployeeRecord[];
            ho_tro_nha_tro?: HousingSupportRecord[];
          };
        }>('/api/benefits/all');
        if (mounted && res.ok && res.data?.data) {
          const d = res.data.data;
          const loadedPolicies =
            Array.isArray(d.danh_muc_chinh_sach) && d.danh_muc_chinh_sach.length > 0
              ? d.danh_muc_chinh_sach
              : DEFAULT_RECRUITMENT_POLICIES;
          setPolicies(loadedPolicies);
          setReferrals(d.thuong_gioi_thieu || []);
          setRehires(d.nguoi_cu_quay_lai || []);
          setHousingList(d.ho_tro_nha_tro || []);
          try {
            localStorage.setItem(
              'hr_benefits_v1_danh_muc_chinh_sach',
              JSON.stringify(loadedPolicies)
            );
            localStorage.setItem(
              'hr_benefits_v1_thuong_gioi_thieu',
              JSON.stringify(d.thuong_gioi_thieu || [])
            );
            localStorage.setItem(
              'hr_benefits_v1_nguoi_cu_quay_lai',
              JSON.stringify(d.nguoi_cu_quay_lai || [])
            );
            localStorage.setItem(
              'hr_benefits_v1_ho_tro_nha_tro',
              JSON.stringify(d.ho_tro_nha_tro || [])
            );
          } catch {}
        }
      } catch {
        // fallback to localStorage
      }
    };
    void loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  // Notify parent counts whenever lists change
  useEffect(() => {
    onCountsChange?.({
      danh_muc_chinh_sach: policies.length,
      thuong_gioi_thieu: referrals.length,
      nguoi_cu_quay_lai: rehires.length,
      ho_tro_nha_tro: housingList.length,
    });
  }, [
    policies.length,
    referrals.length,
    rehires.length,
    housingList.length,
    onCountsChange,
  ]);

  // Reset filters when switching sub-tab
  useEffect(() => {
    setSearchQuery('');
    setFilterKhoi('ALL');
    setFilterBan('ALL');
    setFilterStatus('ALL');
    setPolicySearch('');
    setPolicyCategoryFilter('ALL');
    setPolicyStatusFilter('ALL');
  }, [activeSubTab]);

  // Organization hierarchy helpers
  const availableKhois = useMemo(
    () => organizationHierarchy.map((k) => k.name),
    [organizationHierarchy]
  );

  const availableBansForFilter = useMemo(() => {
    if (filterKhoi === 'ALL') {
      const set = new Set<string>();
      organizationHierarchy.forEach((k) => k.bans?.forEach((b) => set.add(b.name)));
      return Array.from(set);
    }
    const found = organizationHierarchy.find((k) => k.name === filterKhoi);
    return found ? found.bans.map((b) => b.name) : [];
  }, [organizationHierarchy, filterKhoi]);

  const getBansByKhoi = (khoiName: string): string[] => {
    if (!khoiName) return [];
    const found = organizationHierarchy.find((k) => k.name === khoiName);
    return found ? found.bans.map((b) => b.name) : [];
  };

  const getPhongsByKhoiBan = (khoiName: string, banName: string): string[] => {
    if (!khoiName || !banName) return [];
    const foundKhoi = organizationHierarchy.find((k) => k.name === khoiName);
    const foundBan = foundKhoi?.bans.find((b) => b.name === banName);
    return foundBan ? foundBan.phongs.map((p) => p.name) : [];
  };

  // Filtered NVM list for quick picker inside Modal
  const filteredNvmRecords = useMemo(() => {
    const q = nvmPickerQuery.trim().toLowerCase();
    if (!q) return records.slice(0, 12);
    return records
      .filter((r) => {
        return (
          (r.hoVaTen || '').toLowerCase().includes(q) ||
          (r.soCCCD || '').toLowerCase().includes(q) ||
          (r.soDienThoai || '').toLowerCase().includes(q) ||
          (r.phong || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [records, nvmPickerQuery]);

  // Apply quick-selected NVM record to active form
  const handlePickNvmRecord = (rec: NhanSuRecord) => {
    const ngayVao =
      normalizeDateForInput(rec.ngayVaoLam) || new Date().toISOString().slice(0, 10);
    if (activeSubTab === 'thuong_gioi_thieu') {
      setReferralForm((prev) => ({
        ...prev,
        hoVaTenUngVien: rec.hoVaTen || prev.hoVaTenUngVien,
        soCCCD: rec.soCCCD || prev.soCCCD,
        soDienThoai: rec.soDienThoai || prev.soDienThoai,
        khoi: rec.khoi || prev.khoi,
        ban: rec.ban || prev.ban,
        phong: rec.phong || prev.phong,
        congViec: rec.congViec || prev.congViec,
        chucVu: rec.chucVu || prev.chucVu,
        ngayVaoLam: ngayVao,
        ngayDuDieuKien: addDaysIso(ngayVao, 30),
      }));
    } else if (activeSubTab === 'nguoi_cu_quay_lai') {
      setRehireForm((prev) => ({
        ...prev,
        hoVaTen: rec.hoVaTen || prev.hoVaTen,
        soCCCD: rec.soCCCD || prev.soCCCD,
        soDienThoai: rec.soDienThoai || prev.soDienThoai,
        khoi: rec.khoi || prev.khoi,
        ban: rec.ban || prev.ban,
        phongMoi: rec.phong || prev.phongMoi,
        congViec: rec.congViec || prev.congViec,
        chucVu: rec.chucVu || prev.chucVu,
        ngayQuayLai: ngayVao,
      }));
    } else if (activeSubTab === 'ho_tro_nha_tro') {
      setHousingForm((prev) => ({
        ...prev,
        hoVaTen: rec.hoVaTen || prev.hoVaTen,
        soCCCD: rec.soCCCD || prev.soCCCD,
        soDienThoai: rec.soDienThoai || prev.soDienThoai,
        khoi: rec.khoi || prev.khoi,
        ban: rec.ban || prev.ban,
        phong: rec.phong || prev.phong,
        congViec: rec.congViec || prev.congViec,
        chucVu: rec.chucVu || prev.chucVu,
        ngayVaoLam: ngayVao,
        queQuan: rec.queQuan || prev.queQuan,
        tuNgay: ngayVao,
        denNgay: addDaysIso(ngayVao, (prev.soThangHoTro || 3) * 30),
      }));
    }
    showToast('success', `Đã điền thông tin từ hồ sơ NVM: ${rec.hoVaTen}`);
  };

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    const q = policySearch.trim().toLowerCase();
    return policies.filter((item) => {
      if (policyCategoryFilter !== 'ALL' && item.loaiChinhSach !== policyCategoryFilter) {
        return false;
      }
      if (policyStatusFilter !== 'ALL' && item.trangThai !== policyStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.tenChinhSach.toLowerCase().includes(q) ||
        item.maChinhSach.toLowerCase().includes(q) ||
        item.doiTuong.toLowerCase().includes(q) ||
        item.chinhSachHoTro.toLowerCase().includes(q) ||
        item.thoiHan.toLowerCase().includes(q) ||
        item.thoiGianApDung.toLowerCase().includes(q) ||
        (item.ghiChu && item.ghiChu.toLowerCase().includes(q))
      );
    });
  }, [policies, policySearch, policyCategoryFilter, policyStatusFilter]);

  // Filtered datasets for Applications
  const filteredReferrals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return referrals.filter((item) => {
      if (filterKhoi !== 'ALL' && item.khoi !== filterKhoi) return false;
      if (filterBan !== 'ALL' && item.ban !== filterBan) return false;
      if (filterStatus !== 'ALL' && item.trangThai !== filterStatus) return false;
      if (!q) return true;
      return (
        item.hoVaTenUngVien.toLowerCase().includes(q) ||
        item.soCCCD.toLowerCase().includes(q) ||
        item.tenNguoiGioiThieu.toLowerCase().includes(q) ||
        item.maNVNguoiGioiThieu.toLowerCase().includes(q) ||
        item.phong.toLowerCase().includes(q) ||
        item.phongNguoiGioiThieu.toLowerCase().includes(q)
      );
    });
  }, [referrals, searchQuery, filterKhoi, filterBan, filterStatus]);

  const filteredRehires = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rehires.filter((item) => {
      if (filterKhoi !== 'ALL' && item.khoi !== filterKhoi) return false;
      if (filterBan !== 'ALL' && item.ban !== filterBan) return false;
      if (filterStatus !== 'ALL' && item.trangThai !== filterStatus) return false;
      if (!q) return true;
      return (
        item.hoVaTen.toLowerCase().includes(q) ||
        item.soCCCD.toLowerCase().includes(q) ||
        item.maNVCu.toLowerCase().includes(q) ||
        item.phongCu.toLowerCase().includes(q) ||
        item.phongMoi.toLowerCase().includes(q)
      );
    });
  }, [rehires, searchQuery, filterKhoi, filterBan, filterStatus]);

  const filteredHousing = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return housingList.filter((item) => {
      if (filterKhoi !== 'ALL' && item.khoi !== filterKhoi) return false;
      if (filterBan !== 'ALL' && item.ban !== filterBan) return false;
      if (filterStatus !== 'ALL' && item.trangThai !== filterStatus) return false;
      if (!q) return true;
      return (
        item.hoVaTen.toLowerCase().includes(q) ||
        item.soCCCD.toLowerCase().includes(q) ||
        item.maNV.toLowerCase().includes(q) ||
        item.phong.toLowerCase().includes(q) ||
        item.diaChiNhaTro.toLowerCase().includes(q) ||
        item.queQuan.toLowerCase().includes(q)
      );
    });
  }, [housingList, searchQuery, filterKhoi, filterBan, filterStatus]);

  // Policy KPI stats
  const policyStats = useMemo(() => {
    const total = policies.length;
    const dangApDung = policies.filter((p) => p.trangThai === 'dang_ap_dung').length;
    const thuong = policies.filter(
      (p) => p.loaiChinhSach === 'thuong_gioi_thieu' || p.loaiChinhSach === 'nguoi_cu_quay_lai'
    ).length;
    const nhaTroVaKhac = policies.filter(
      (p) => p.loaiChinhSach === 'ho_tro_nha_tro' || p.loaiChinhSach === 'khac'
    ).length;
    return {
      total,
      shown: filteredPolicies.length,
      dangApDung,
      thuong,
      nhaTroVaKhac,
    };
  }, [policies, filteredPolicies]);

  // Active KPI stats for application lists
  const activeStats = useMemo(() => {
    const rawList =
      activeSubTab === 'thuong_gioi_thieu'
        ? referrals
        : activeSubTab === 'nguoi_cu_quay_lai'
        ? rehires
        : housingList;
    const shownList =
      activeSubTab === 'thuong_gioi_thieu'
        ? filteredReferrals
        : activeSubTab === 'nguoi_cu_quay_lai'
        ? filteredRehires
        : filteredHousing;

    const choDuyet = rawList.filter((r) => r.trangThai === 'cho_duyet').length;
    const duDieuKien = rawList.filter((r) => r.trangThai === 'du_dieu_kien').length;
    const daChiTra = rawList.filter((r) => r.trangThai === 'da_chi_tra').length;

    const getAmount = (r: any) => {
      if (activeSubTab === 'thuong_gioi_thieu') return Number(r.mucThuong) || 0;
      if (activeSubTab === 'nguoi_cu_quay_lai') return Number(r.mucHoTro) || 0;
      return Number(r.tongHoTro) || (Number(r.mucHoTroThang) || 0) * (Number(r.soThangHoTro) || 0);
    };

    const tongKinhPhi = rawList
      .filter((r) => r.trangThai !== 'tu_choi')
      .reduce((sum, r) => sum + getAmount(r), 0);
    const daChiKinhPhi = rawList
      .filter((r) => r.trangThai === 'da_chi_tra')
      .reduce((sum, r) => sum + getAmount(r), 0);

    return {
      total: rawList.length,
      shown: shownList.length,
      choDuyet,
      duDieuKien,
      daChiTra,
      tongKinhPhi,
      daChiKinhPhi,
    };
  }, [
    activeSubTab,
    referrals,
    rehires,
    housingList,
    filteredReferrals,
    filteredRehires,
    filteredHousing,
  ]);

  // Open Add / Edit Modal
  const handleOpenAdd = () => {
    setEditingId(null);
    setNvmPickerQuery('');
    if (activeSubTab === 'danh_muc_chinh_sach') setPolicyForm(emptyPolicyForm());
    else if (activeSubTab === 'thuong_gioi_thieu') setReferralForm(emptyReferralForm());
    else if (activeSubTab === 'nguoi_cu_quay_lai') setRehireForm(emptyRehireForm());
    else setHousingForm(emptyHousingForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setNvmPickerQuery('');
    if (activeSubTab === 'danh_muc_chinh_sach') {
      setPolicyForm({ ...emptyPolicyForm(), ...item });
    } else if (activeSubTab === 'thuong_gioi_thieu') {
      setReferralForm({ ...emptyReferralForm(), ...item });
    } else if (activeSubTab === 'nguoi_cu_quay_lai') {
      setRehireForm({ ...emptyRehireForm(), ...item });
    } else {
      setHousingForm({ ...emptyHousingForm(), ...item });
    }
    setIsModalOpen(true);
  };

  // Reset policies to default
  const handleResetDefaultPolicies = async () => {
    if (!window.confirm('Khôi phục lại danh sách 4 chính sách tuyển dụng chuẩn mặc định?')) {
      return;
    }
    try {
      const res = await safeFetchJson<{ success: boolean; list?: any[] }>(
        '/api/benefits/danh_muc_chinh_sach',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: DEFAULT_RECRUITMENT_POLICIES }),
        }
      );
      setPolicies(DEFAULT_RECRUITMENT_POLICIES);
      localStorage.setItem(
        'hr_benefits_v1_danh_muc_chinh_sach',
        JSON.stringify(DEFAULT_RECRUITMENT_POLICIES)
      );
      showToast('success', 'Đã khôi phục danh mục chính sách chuẩn mặc định thành công!');
    } catch {
      setPolicies(DEFAULT_RECRUITMENT_POLICIES);
      localStorage.setItem(
        'hr_benefits_v1_danh_muc_chinh_sach',
        JSON.stringify(DEFAULT_RECRUITMENT_POLICIES)
      );
      showToast('success', 'Đã khôi phục danh mục chính sách chuẩn mặc định.');
    }
  };

  // Persist save
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    let payload: any = null;

    if (activeSubTab === 'danh_muc_chinh_sach') {
      if (!policyForm.tenChinhSach.trim() || !policyForm.doiTuong.trim()) {
        showToast('error', 'Vui lòng nhập Tên chính sách và Đối tượng áp dụng.');
        return;
      }
      payload = {
        ...policyForm,
        id: editingId || undefined,
      };
    } else if (activeSubTab === 'thuong_gioi_thieu') {
      if (!referralForm.tenNguoiGioiThieu.trim() || !referralForm.hoVaTenUngVien.trim()) {
        showToast(
          'error',
          'Vui lòng nhập đầy đủ Họ tên người giới thiệu và Họ tên NVM được giới thiệu.'
        );
        return;
      }
      payload = {
        ...referralForm,
        id: editingId || undefined,
        mucThuong: Number(referralForm.mucThuong) || 0,
      };
    } else if (activeSubTab === 'nguoi_cu_quay_lai') {
      if (!rehireForm.hoVaTen.trim()) {
        showToast('error', 'Vui lòng nhập Họ và tên nhân viên quay lại.');
        return;
      }
      payload = {
        ...rehireForm,
        id: editingId || undefined,
        mucHoTro: Number(rehireForm.mucHoTro) || 0,
      };
    } else {
      if (!housingForm.hoVaTen.trim()) {
        showToast('error', 'Vui lòng nhập Họ và tên nhân viên được hỗ trợ nhà trọ.');
        return;
      }
      const mucThang = Number(housingForm.mucHoTroThang) || 0;
      const soThang = Number(housingForm.soThangHoTro) || 1;
      payload = {
        ...housingForm,
        id: editingId || undefined,
        mucHoTroThang: mucThang,
        soThangHoTro: soThang,
        tongHoTro: mucThang * soThang,
      };
    }

    setIsSaving(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        list?: any[];
        data?: any;
        error?: string;
      }>(`/api/benefits/${activeSubTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let updatedList: any[];
      if (res.ok && res.data?.list) {
        updatedList = res.data.list;
      } else {
        // Offline fallback
        const now = new Date().toISOString();
        const savedItem = {
          ...payload,
          id: editingId || `${activeSubTab}_${Date.now()}`,
          capNhatLuc: now,
        };
        const currentList =
          activeSubTab === 'danh_muc_chinh_sach'
            ? policies
            : activeSubTab === 'thuong_gioi_thieu'
            ? referrals
            : activeSubTab === 'nguoi_cu_quay_lai'
            ? rehires
            : housingList;
        updatedList = editingId
          ? currentList.map((i) => (i.id === editingId ? savedItem : i))
          : [savedItem, ...currentList];
      }

      if (activeSubTab === 'danh_muc_chinh_sach') {
        setPolicies(updatedList);
        localStorage.setItem(
          'hr_benefits_v1_danh_muc_chinh_sach',
          JSON.stringify(updatedList)
        );
      } else if (activeSubTab === 'thuong_gioi_thieu') {
        setReferrals(updatedList);
        localStorage.setItem(
          'hr_benefits_v1_thuong_gioi_thieu',
          JSON.stringify(updatedList)
        );
      } else if (activeSubTab === 'nguoi_cu_quay_lai') {
        setRehires(updatedList);
        localStorage.setItem(
          'hr_benefits_v1_nguoi_cu_quay_lai',
          JSON.stringify(updatedList)
        );
      } else {
        setHousingList(updatedList);
        localStorage.setItem(
          'hr_benefits_v1_ho_tro_nha_tro',
          JSON.stringify(updatedList)
        );
      }

      setIsModalOpen(false);
      showToast(
        'success',
        editingId ? 'Đã cập nhật thành công!' : 'Đã thêm mới thành công!'
      );
    } catch {
      showToast('error', 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Inline quick status change for Policy
  const handleQuickPolicyStatusChange = async (
    item: RecruitmentPolicyItem,
    newStatus: RecruitmentPolicyItem['trangThai']
  ) => {
    const updated = { ...item, trangThai: newStatus, capNhatLuc: new Date().toISOString() };
    try {
      const res = await safeFetchJson<{ success: boolean; list?: any[] }>(
        '/api/benefits/danh_muc_chinh_sach',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }
      );
      const next =
        res.ok && res.data?.list
          ? res.data.list
          : policies.map((p) => (p.id === item.id ? updated : p));
      setPolicies(next);
      localStorage.setItem('hr_benefits_v1_danh_muc_chinh_sach', JSON.stringify(next));
      showToast(
        'success',
        `Đã chuyển trạng thái chính sách sang "${POLICY_STATUS_META[newStatus].label}".`
      );
    } catch {
      showToast('error', 'Không thể cập nhật trạng thái chính sách.');
    }
  };

  // Inline quick status change for Applications
  const handleQuickStatusChange = async (item: any, newStatus: BenefitApprovalStatus) => {
    const updatedItem = {
      ...item,
      trangThai: newStatus,
      capNhatLuc: new Date().toISOString(),
    };
    try {
      const res = await safeFetchJson<{ success: boolean; list?: any[] }>(
        `/api/benefits/${activeSubTab}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem),
        }
      );
      const applyList = (prev: any[]) =>
        res.ok && res.data?.list
          ? res.data.list
          : prev.map((r) => (r.id === item.id ? updatedItem : r));

      if (activeSubTab === 'thuong_gioi_thieu') {
        const next = applyList(referrals);
        setReferrals(next);
        localStorage.setItem('hr_benefits_v1_thuong_gioi_thieu', JSON.stringify(next));
      } else if (activeSubTab === 'nguoi_cu_quay_lai') {
        const next = applyList(rehires);
        setRehires(next);
        localStorage.setItem('hr_benefits_v1_nguoi_cu_quay_lai', JSON.stringify(next));
      } else {
        const next = applyList(housingList);
        setHousingList(next);
        localStorage.setItem('hr_benefits_v1_ho_tro_nha_tro', JSON.stringify(next));
      }
      showToast('success', `Đã chuyển trạng thái sang "${STATUS_META[newStatus].label}".`);
    } catch {
      showToast('error', 'Không thể cập nhật trạng thái.');
    }
  };

  // Duplicate record (Sao chép / Nhân bản)
  const handleDuplicateRecord = async (item: any) => {
    if (activeSubTab === 'danh_muc_chinh_sach') {
      const p = item as RecruitmentPolicyItem;
      const duplicated: RecruitmentPolicyItem = {
        ...p,
        id: `policy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        maChinhSach: `${p.maChinhSach}_COPY`,
        tenChinhSach: `${p.tenChinhSach} (Bản sao)`,
        capNhatLuc: new Date().toISOString(),
      };
      const nextList = [duplicated, ...policies];
      setPolicies(nextList);
      try {
        localStorage.setItem('hr_benefits_v1_danh_muc_chinh_sach', JSON.stringify(nextList));
      } catch {}
      try {
        await safeFetchJson('/api/benefits/danh_muc_chinh_sach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicated),
        });
        showToast('success', `Đã nhân bản chính sách "${duplicated.tenChinhSach}" thành công!`);
      } catch {
        showToast('info', `Đã nhân bản chính sách "${duplicated.tenChinhSach}" vào bộ nhớ.`);
      }
      return;
    }

    const dupItem = {
      ...item,
      id: `${activeSubTab}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ghiChu: item.ghiChu ? `${item.ghiChu} (Bản sao)` : '(Bản sao)',
      trangThai: 'CHUA_DUYET' as BenefitApprovalStatus,
      ngayTao: new Date().toISOString().slice(0, 10),
    };

    if (activeSubTab === 'thuong_gioi_thieu') {
      const next = [dupItem, ...referrals];
      setReferrals(next);
      try {
        localStorage.setItem('hr_benefits_v1_thuong_gioi_thieu', JSON.stringify(next));
      } catch {}
    } else if (activeSubTab === 'nguoi_cu_quay_lai') {
      const next = [dupItem, ...rehires];
      setRehires(next);
      try {
        localStorage.setItem('hr_benefits_v1_nguoi_cu_quay_lai', JSON.stringify(next));
      } catch {}
    } else if (activeSubTab === 'ho_tro_nha_tro') {
      const next = [dupItem, ...housingList];
      setHousingList(next);
      try {
        localStorage.setItem('hr_benefits_v1_ho_tro_nha_tro', JSON.stringify(next));
      } catch {}
    }

    try {
      await safeFetchJson(`/api/benefits/${activeSubTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dupItem),
      });
      showToast('success', 'Đã sao chép nhân bản bản ghi thành công!');
    } catch {
      showToast('info', 'Đã sao chép bản ghi vào bộ nhớ.');
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string, displayName: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${displayName}"?`)) return;
    try {
      const res = await safeFetchJson<{ success: boolean; list?: any[] }>(
        `/api/benefits/${activeSubTab}/${id}`,
        { method: 'DELETE' }
      );
      const applyDelete = (prev: any[]) =>
        res.ok && res.data?.list ? res.data.list : prev.filter((r) => r.id !== id);

      if (activeSubTab === 'danh_muc_chinh_sach') {
        const next = applyDelete(policies);
        setPolicies(next);
        localStorage.setItem('hr_benefits_v1_danh_muc_chinh_sach', JSON.stringify(next));
      } else if (activeSubTab === 'thuong_gioi_thieu') {
        const next = applyDelete(referrals);
        setReferrals(next);
        localStorage.setItem('hr_benefits_v1_thuong_gioi_thieu', JSON.stringify(next));
      } else if (activeSubTab === 'nguoi_cu_quay_lai') {
        const next = applyDelete(rehires);
        setRehires(next);
        localStorage.setItem('hr_benefits_v1_nguoi_cu_quay_lai', JSON.stringify(next));
      } else {
        const next = applyDelete(housingList);
        setHousingList(next);
        localStorage.setItem('hr_benefits_v1_ho_tro_nha_tro', JSON.stringify(next));
      }
      showToast('success', `Đã xóa "${displayName}".`);
    } catch {
      showToast('error', 'Không thể xóa bản ghi.');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeSubTab === 'danh_muc_chinh_sach') {
      headers = [
        'STT',
        'Mã chính sách',
        'Tên chính sách',
        'Nhóm chính sách',
        'Đối tượng áp dụng',
        'Chính sách hỗ trợ',
        'Thời hạn',
        'Thời gian áp dụng',
        'Điều kiện chi tiết',
        'Trạng thái',
        'Ghi chú',
      ];
      rows = filteredPolicies.map((p, i) => [
        i + 1,
        p.maChinhSach,
        p.tenChinhSach,
        POLICY_CATEGORY_META[p.loaiChinhSach]?.label || p.loaiChinhSach,
        p.doiTuong,
        p.chinhSachHoTro,
        p.thoiHan,
        p.thoiGianApDung,
        p.dieuKienChiTiet || '',
        POLICY_STATUS_META[p.trangThai]?.label || p.trangThai,
        p.ghiChu || '',
      ]);
      filename = `Danh_Muc_Chinh_Sach_TD_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (activeSubTab === 'thuong_gioi_thieu') {
      headers = [
        'STT',
        'Mã NV giới thiệu',
        'Họ tên người giới thiệu',
        'Phòng người giới thiệu',
        'SĐT người giới thiệu',
        'Họ tên NVM được giới thiệu',
        'Số CCCD NVM',
        'SĐT NVM',
        'Khối',
        'Ban',
        'Phòng/Bếp làm việc',
        'Công việc',
        'Chức vụ',
        'Ngày vào làm',
        'Ngày đủ điều kiện',
        'Mức thưởng (VNĐ)',
        'Kỳ chi trả',
        'Trạng thái',
        'Ghi chú',
      ];
      rows = filteredReferrals.map((r, i) => [
        i + 1,
        r.maNVNguoiGioiThieu,
        r.tenNguoiGioiThieu,
        r.phongNguoiGioiThieu,
        r.sdtNguoiGioiThieu,
        r.hoVaTenUngVien,
        r.soCCCD,
        r.soDienThoai,
        r.khoi,
        r.ban,
        r.phong,
        r.congViec,
        r.chucVu,
        r.ngayVaoLam,
        r.ngayDuDieuKien,
        r.mucThuong,
        r.kyChiTra,
        STATUS_META[r.trangThai]?.label || r.trangThai,
        r.ghiChu,
      ]);
      filename = `Thuong_Gioi_Thieu_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (activeSubTab === 'nguoi_cu_quay_lai') {
      headers = [
        'STT',
        'Mã NV cũ',
        'Họ và tên',
        'Số CCCD',
        'SĐT',
        'Phòng/Bếp cũ',
        'Ngày nghỉ cũ',
        'Lý do nghỉ cũ',
        'Đánh giá trước đây',
        'Khối mới',
        'Ban mới',
        'Phòng/Bếp tiếp nhận',
        'Công việc',
        'Chức vụ',
        'Ngày quay lại',
        'Mức hỗ trợ (VNĐ)',
        'Trạng thái',
        'Ghi chú',
      ];
      rows = filteredRehires.map((r, i) => [
        i + 1,
        r.maNVCu,
        r.hoVaTen,
        r.soCCCD,
        r.soDienThoai,
        r.phongCu,
        r.ngayNghiViecCu,
        r.lyDoNghiCu,
        REHIRE_RATING_META[r.danhGiaTruocDay]?.label || r.danhGiaTruocDay,
        r.khoi,
        r.ban,
        r.phongMoi,
        r.congViec,
        r.chucVu,
        r.ngayQuayLai,
        r.mucHoTro,
        STATUS_META[r.trangThai]?.label || r.trangThai,
        r.ghiChu,
      ]);
      filename = `Nguoi_Cu_Quay_Lai_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      headers = [
        'STT',
        'Mã NV',
        'Họ và tên',
        'Số CCCD',
        'SĐT',
        'Khối',
        'Ban',
        'Phòng/Bếp làm việc',
        'Công việc',
        'Chức vụ',
        'Ngày vào làm',
        'Quê quán',
        'Địa chỉ nhà trọ/KTX',
        'Hình thức hỗ trợ',
        'Mức hỗ trợ/tháng (VNĐ)',
        'Số tháng',
        'Tổng hỗ trợ (VNĐ)',
        'Từ ngày',
        'Đến ngày',
        'Trạng thái',
        'Ghi chú',
      ];
      rows = filteredHousing.map((r, i) => [
        i + 1,
        r.maNV,
        r.hoVaTen,
        r.soCCCD,
        r.soDienThoai,
        r.khoi,
        r.ban,
        r.phong,
        r.congViec,
        r.chucVu,
        r.ngayVaoLam,
        r.queQuan,
        r.diaChiNhaTro,
        HOUSING_TYPE_LABELS[r.loaiHoTro] || r.loaiHoTro,
        r.mucHoTroThang,
        r.soThangHoTro,
        r.tongHoTro,
        r.tuNgay,
        r.denNgay,
        STATUS_META[r.trangThai]?.label || r.trangThai,
        r.ghiChu,
      ]);
      filename = `Ho_Tro_Nha_Tro_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `Đã xuất ${rows.length} dòng ra file Excel/CSV!`);
  };

  const moduleHeaderInfo =
    activeSubTab === 'danh_muc_chinh_sach'
      ? {
          title: 'HỆ THỐNG QUẢN LÝ DANH MỤC CHÍNH SÁCH PHÚC LỢI TUYỂN DỤNG',
          addLabel: 'Thêm Chính Sách Mới',
          icon: BookOpen,
        }
      : activeSubTab === 'thuong_gioi_thieu'
      ? {
          title: 'QUẢN LÝ THƯỞNG GIỚI THIỆU NHÂN VIÊN MỚI',
          addLabel: 'Thêm Thưởng Giới Thiệu',
          icon: Award,
        }
      : activeSubTab === 'nguoi_cu_quay_lai'
      ? {
          title: 'QUẢN LÝ NGƯỜI CŨ QUAY LẠI LÀM VIỆC',
          addLabel: 'Thêm Người Cũ Quay Lại',
          icon: RotateCcw,
        }
      : {
          title: 'QUẢN LÝ HỖ TRỢ NHÀ TRỌ NHÂN VIÊN MỚI',
          addLabel: 'Thêm Hỗ Trợ Nhà Trọ',
          icon: Home,
        };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
                : 'bg-rose-900 text-rose-50 border-rose-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3c72] via-[#1a56b0] to-[#1a73e8] text-white p-5 sm:p-6 shadow-md border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <moduleHeaderInfo.icon className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {moduleHeaderInfo.title}
              </h2>
              {activeSubTab === 'danh_muc_chinh_sach' && (
                <p className="text-xs text-blue-100 mt-0.5">
                  Quy chuẩn các chính sách Thưởng giới thiệu, Thưởng người cũ quay lại và Hỗ trợ nhà trọ
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {activeSubTab === 'danh_muc_chinh_sach' && (
              <button
                type="button"
                onClick={handleResetDefaultPolicies}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition cursor-pointer"
                title="Khôi phục 4 chính sách tuyển dụng mẫu mặc định"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <span>Mặc định</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>Xuất Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{moduleHeaderInfo.addLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK SUB-TAB BAR */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => onSubTabChange('danh_muc_chinh_sach')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'danh_muc_chinh_sach'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Danh mục chính sách</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'danh_muc_chinh_sach'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {policies.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('thuong_gioi_thieu')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'thuong_gioi_thieu'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. Thưởng giới thiệu</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'thuong_gioi_thieu'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {referrals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('nguoi_cu_quay_lai')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'nguoi_cu_quay_lai'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>3. Người cũ quay lại</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'nguoi_cu_quay_lai'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {rehires.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('ho_tro_nha_tro')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'ho_tro_nha_tro'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>4. Hỗ trợ nhà trọ</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'ho_tro_nha_tro'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {housingList.length}
          </span>
        </button>
      </div>

      {/* KPI SUMMARY CARDS */}
      {activeSubTab === 'danh_muc_chinh_sach' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng Chính Sách
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {policyStats.total}
              </span>
              <span className="text-xs text-slate-500">
                chính sách (Hiển thị:{' '}
                <strong className="text-[#1a73e8] tabular-nums">{policyStats.shown}</strong>)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setPolicyStatusFilter(
                policyStatusFilter === 'dang_ap_dung' ? 'ALL' : 'dang_ap_dung'
              )
            }
            className={`bg-white rounded-xl border p-4 shadow-2xs text-left flex flex-col justify-between transition cursor-pointer ${
              policyStatusFilter === 'dang_ap_dung'
                ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-50/30'
                : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Đang Áp Dụng
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                {policyStats.dangApDung}
              </span>
              <span className="text-xs text-slate-400">Nhấn để lọc</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setPolicyCategoryFilter(
                policyCategoryFilter === 'thuong_gioi_thieu' ? 'ALL' : 'thuong_gioi_thieu'
              )
            }
            className={`bg-white rounded-xl border p-4 shadow-2xs text-left flex flex-col justify-between transition cursor-pointer ${
              policyCategoryFilter === 'thuong_gioi_thieu'
                ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/30'
                : 'border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Thưởng Giới Thiệu
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700 tabular-nums">
                {policies.filter((p) => p.loaiChinhSach === 'thuong_gioi_thieu').length}
              </span>
              <span className="text-xs text-slate-400">Nhấn để lọc</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setPolicyCategoryFilter(
                policyCategoryFilter === 'ho_tro_nha_tro' ? 'ALL' : 'ho_tro_nha_tro'
              )
            }
            className={`bg-white rounded-xl border p-4 shadow-2xs text-left flex flex-col justify-between transition cursor-pointer ${
              policyCategoryFilter === 'ho_tro_nha_tro'
                ? 'border-teal-400 ring-1 ring-teal-400 bg-teal-50/30'
                : 'border-slate-200 hover:border-teal-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Hỗ Trợ Nhà Trọ &amp; Khác
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-teal-700 tabular-nums">
                {policyStats.nhaTroVaKhac}
              </span>
              <span className="text-xs text-slate-400">Nhấn để lọc</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng Hồ Sơ
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {activeStats.total}
              </span>
              <span className="text-xs text-slate-500">
                hồ sơ (Hiển thị:{' '}
                <strong className="text-[#1a73e8] tabular-nums">{activeStats.shown}</strong>)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'cho_duyet' ? 'ALL' : 'cho_duyet')}
            className={`bg-white rounded-xl border p-4 shadow-2xs text-left flex flex-col justify-between transition cursor-pointer ${
              filterStatus === 'cho_duyet'
                ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/30'
                : 'border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Chờ Duyệt
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700 tabular-nums">
                {activeStats.choDuyet}
              </span>
              <span className="text-xs text-slate-400">Nhấn để lọc</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'da_chi_tra' ? 'ALL' : 'da_chi_tra')}
            className={`bg-white rounded-xl border p-4 shadow-2xs text-left flex flex-col justify-between transition cursor-pointer ${
              filterStatus === 'da_chi_tra'
                ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-50/30'
                : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Đủ ĐK / Đã Chi Trả
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                {activeStats.daChiTra}
              </span>
              <span className="text-xs text-slate-500">
                đã chi • <strong className="text-blue-700">{activeStats.duDieuKien}</strong> đủ ĐK
              </span>
            </div>
          </button>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng Kinh Phí
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-slate-900 tabular-nums">
                {formatVnd(activeStats.tongKinhPhi)}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Đã chi trả: {formatVnd(activeStats.daChiKinhPhi)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      {activeSubTab === 'danh_muc_chinh_sach' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
            <div className="lg:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                placeholder="Tìm theo Tên chính sách, Mã, Đối tượng, Mức hỗ trợ..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              {policySearch && (
                <button
                  type="button"
                  onClick={() => setPolicySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="lg:col-span-3">
              <select
                value={policyCategoryFilter}
                onChange={(e) =>
                  setPolicyCategoryFilter(
                    e.target.value as RecruitmentPolicyItem['loaiChinhSach'] | 'ALL'
                  )
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
              >
                <option value="ALL">Tất cả Nhóm chính sách</option>
                <option value="thuong_gioi_thieu">Thưởng giới thiệu</option>
                <option value="nguoi_cu_quay_lai">Người cũ quay lại</option>
                <option value="ho_tro_nha_tro">Hỗ trợ nhà trọ</option>
                <option value="khac">Chính sách khác</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <select
                value={policyStatusFilter}
                onChange={(e) =>
                  setPolicyStatusFilter(
                    e.target.value as RecruitmentPolicyItem['trangThai'] | 'ALL'
                  )
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
              >
                <option value="ALL">Tất cả Trạng thái</option>
                <option value="dang_ap_dung">Đang áp dụng</option>
                <option value="tam_dung">Tạm dừng</option>
                <option value="het_hieu_luc">Hết hiệu lực</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>
                Kết quả lọc:{' '}
                <strong className="text-slate-900 tabular-nums">
                  {filteredPolicies.length}
                </strong>{' '}
                / {policies.length} chính sách
              </span>
              {(policySearch ||
                policyCategoryFilter !== 'ALL' ||
                policyStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setPolicySearch('');
                    setPolicyCategoryFilter('ALL');
                    setPolicyStatusFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-semibold cursor-pointer"
                >
                  <X className="w-3 h-3" /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo Họ tên, CCCD, Mã NV, Phòng/Bếp..."
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

            <div className="lg:col-span-3">
              <select
                value={filterKhoi}
                onChange={(e) => {
                  setFilterKhoi(e.target.value);
                  setFilterBan('ALL');
                }}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
              >
                <option value="ALL">Tất cả Khối</option>
                {availableKhois.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <select
                value={filterBan}
                onChange={(e) => setFilterBan(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
              >
                <option value="ALL">Tất cả Ban</option>
                {availableBansForFilter.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as BenefitApprovalStatus | 'ALL')
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
              >
                <option value="ALL">Tất cả Trạng thái</option>
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="du_dieu_kien">Đủ điều kiện</option>
                <option value="da_chi_tra">Đã chi trả</option>
                <option value="tu_choi">Từ chối</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>
                Kết quả lọc:{' '}
                <strong className="text-slate-900 tabular-nums">
                  {activeStats.shown}
                </strong>{' '}
                / {activeStats.total} hồ sơ
              </span>
              {(searchQuery ||
                filterKhoi !== 'ALL' ||
                filterBan !== 'ALL' ||
                filterStatus !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterKhoi('ALL');
                    setFilterBan('ALL');
                    setFilterStatus('ALL');
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-semibold cursor-pointer"
                >
                  <X className="w-3 h-3" /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px]">
          {/* TAB 1: DANH MỤC CHÍNH SÁCH */}
          {activeSubTab === 'danh_muc_chinh_sach' && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">
                    STT
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[190px]">
                    Mã &amp; Tên chính sách
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">
                    Nhóm chính sách
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[210px]">
                    Đối tượng áp dụng
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[190px]">
                    Chính sách hỗ trợ
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[180px]">
                    Thời hạn
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[140px]">
                    Thời gian áp dụng
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[120px]">
                    Trạng thái
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Chưa có chính sách nào phù hợp. Nhấn{' '}
                      <strong>&ldquo;+ Thêm Chính Sách Mới&rdquo;</strong> hoặc{' '}
                      <strong>&ldquo;Mặc định&rdquo;</strong> để nạp dữ liệu.
                    </td>
                  </tr>
                ) : (
                  filteredPolicies.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100">
                        <div className="font-bold text-[#1e3c72]">{p.tenChinhSach}</div>
                        <div className="text-[11px] font-mono font-semibold text-slate-500 mt-0.5">
                          {p.maChinhSach}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                            POLICY_CATEGORY_META[p.loaiChinhSach]?.badgeCls || ''
                          }`}
                        >
                          {POLICY_CATEGORY_META[p.loaiChinhSach]?.label || p.loaiChinhSach}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-800">
                        <div className="font-medium line-clamp-3 leading-relaxed">
                          {p.doiTuong}
                        </div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100">
                        <div className="font-bold text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/80 leading-relaxed">
                          {p.chinhSachHoTro}
                        </div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-700">
                        <div className="flex items-start gap-1.5 leading-relaxed">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{p.thoiHan}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 border-r border-slate-100 font-mono text-[11px] text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
                          <span>{p.thoiGianApDung || 'Liên tục'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 border-r border-slate-100">
                        <select
                          value={p.trangThai}
                          onChange={(e) =>
                            handleQuickPolicyStatusChange(
                              p,
                              e.target.value as RecruitmentPolicyItem['trangThai']
                            )
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none cursor-pointer ${
                            POLICY_STATUS_META[p.trangThai]?.badgeCls || ''
                          }`}
                        >
                          <option value="dang_ap_dung">Đang áp dụng</option>
                          <option value="tam_dung">Tạm dừng</option>
                          <option value="het_hieu_luc">Hết hiệu lực</option>
                        </select>
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDuplicateRecord(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép / Nhân bản chính sách"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa chính sách"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(p.id, p.tenChinhSach)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa chính sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: THƯỞNG GIỚI THIỆU */}
          {activeSubTab === 'thuong_gioi_thieu' && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">
                    STT
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[170px]">
                    Người giới thiệu
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[170px]">
                    NVM được giới thiệu
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[160px]">
                    Đơn vị tiếp nhận
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[110px]">
                    Ngày vào / Đủ ĐK
                  </th>
                  <th className="py-2.5 px-2.5 text-right border-r border-blue-800/60 min-w-[110px]">
                    Mức thưởng
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[100px]">
                    Kỳ chi trả
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">
                    Trạng thái
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">
                    Ghi chú
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Chưa có hồ sơ thưởng giới thiệu nào. Nhấn{' '}
                      <strong>&ldquo;+ Thêm Thưởng Giới Thiệu&rdquo;</strong> để tạo mới.
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-bold text-slate-900">{r.tenNguoiGioiThieu}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.maNVNguoiGioiThieu && (
                            <span className="font-mono text-blue-700 mr-1.5">
                              #{r.maNVNguoiGioiThieu}
                            </span>
                          )}
                          {r.phongNguoiGioiThieu || '—'}
                        </div>
                        {r.sdtNguoiGioiThieu && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.sdtNguoiGioiThieu}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-bold text-[#1e3c72]">{r.hoVaTenUngVien}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {r.soCCCD || 'Chưa có CCCD'}
                        </div>
                        {r.soDienThoai && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.soDienThoai}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-800">{r.phong || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {[r.khoi, r.ban].filter(Boolean).join(' • ') || '—'}
                        </div>
                        {(r.congViec || r.chucVu) && (
                          <div className="text-[10px] text-slate-400">
                            {[r.congViec, r.chucVu].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 font-mono text-[11px]">
                        <div className="text-slate-800">Vào: {r.ngayVaoLam || '—'}</div>
                        <div className="text-emerald-700">ĐK: {r.ngayDuDieuKien || '—'}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right border-r border-slate-100 font-mono font-bold text-slate-900">
                        {formatVnd(r.mucThuong)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 text-slate-700">
                        {r.kyChiTra || '—'}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100">
                        <select
                          value={r.trangThai}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              r,
                              e.target.value as BenefitApprovalStatus
                            )
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none cursor-pointer ${
                            STATUS_META[r.trangThai]?.badgeClass || ''
                          }`}
                        >
                          <option value="cho_duyet">Chờ duyệt</option>
                          <option value="du_dieu_kien">Đủ điều kiện</option>
                          <option value="da_chi_tra">Đã chi trả</option>
                          <option value="tu_choi">Từ chối</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 text-[11px] text-slate-600">
                        {r.ghiChu || '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDuplicateRecord(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép / Nhân bản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id, r.hoVaTenUngVien)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: NGƯỜI CŨ QUAY LẠI */}
          {activeSubTab === 'nguoi_cu_quay_lai' && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">
                    STT
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[170px]">
                    Nhân viên quay lại
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[160px]">
                    Lịch sử trước đây
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[160px]">
                    Đơn vị tiếp nhận mới
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[100px]">
                    Ngày quay lại
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[100px]">
                    Đánh giá cũ
                  </th>
                  <th className="py-2.5 px-2.5 text-right border-r border-blue-800/60 min-w-[110px]">
                    Mức hỗ trợ
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">
                    Trạng thái
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">
                    Ghi chú
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRehires.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Chưa có hồ sơ người cũ quay lại nào. Nhấn{' '}
                      <strong>&ldquo;+ Thêm Người Cũ Quay Lại&rdquo;</strong> để tạo mới.
                    </td>
                  </tr>
                ) : (
                  filteredRehires.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-bold text-[#1e3c72]">{r.hoVaTen}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {r.maNVCu && <span className="text-blue-700 mr-1.5">#{r.maNVCu}</span>}
                          {r.soCCCD || '—'}
                        </div>
                        {r.soDienThoai && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.soDienThoai}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-medium text-slate-800">
                          Phòng cũ: {r.phongCu || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nghỉ: {r.ngayNghiViecCu || '—'}
                        </div>
                        {r.lyDoNghiCu && (
                          <div className="text-[10px] text-slate-400 italic">
                            {r.lyDoNghiCu}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-800">{r.phongMoi || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {[r.khoi, r.ban].filter(Boolean).join(' • ') || '—'}
                        </div>
                        {(r.congViec || r.chucVu) && (
                          <div className="text-[10px] text-slate-400">
                            {[r.congViec, r.chucVu].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 font-mono text-[11px] text-slate-800">
                        {r.ngayQuayLai || '—'}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            REHIRE_RATING_META[r.danhGiaTruocDay]?.cls || ''
                          }`}
                        >
                          {REHIRE_RATING_META[r.danhGiaTruocDay]?.label || r.danhGiaTruocDay}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right border-r border-slate-100 font-mono font-bold text-slate-900">
                        {formatVnd(r.mucHoTro)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100">
                        <select
                          value={r.trangThai}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              r,
                              e.target.value as BenefitApprovalStatus
                            )
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none cursor-pointer ${
                            STATUS_META[r.trangThai]?.badgeClass || ''
                          }`}
                        >
                          <option value="cho_duyet">Chờ duyệt</option>
                          <option value="du_dieu_kien">Đủ điều kiện</option>
                          <option value="da_chi_tra">Đã chi trả</option>
                          <option value="tu_choi">Từ chối</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 text-[11px] text-slate-600">
                        {r.ghiChu || '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDuplicateRecord(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép / Nhân bản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id, r.hoVaTen)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: HỖ TRỢ NHÀ TRỌ */}
          {activeSubTab === 'ho_tro_nha_tro' && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">
                    STT
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[160px]">
                    Nhân viên mới
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[150px]">
                    Đơn vị làm việc
                  </th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[180px]">
                    Quê quán &amp; Nhà trọ
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[120px]">
                    Hình thức
                  </th>
                  <th className="py-2.5 px-2.5 text-right border-r border-blue-800/60 min-w-[125px]">
                    Mức / Tổng hỗ trợ
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[110px]">
                    Thời gian hưởng
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">
                    Trạng thái
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[120px]">
                    Ghi chú
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredHousing.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Chưa có hồ sơ hỗ trợ nhà trọ nào. Nhấn{' '}
                      <strong>&ldquo;+ Thêm Hỗ Trợ Nhà Trọ&rdquo;</strong> để tạo mới.
                    </td>
                  </tr>
                ) : (
                  filteredHousing.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-bold text-[#1e3c72]">{r.hoVaTen}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {r.maNV && <span className="text-blue-700 mr-1.5">#{r.maNV}</span>}
                          {r.soCCCD || '—'}
                        </div>
                        {r.soDienThoai && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.soDienThoai}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-800">{r.phong || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {[r.khoi, r.ban].filter(Boolean).join(' • ') || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="text-[11px] text-slate-600">
                          <strong>Quê:</strong> {r.queQuan || '—'}
                        </div>
                        <div className="text-[11px] text-slate-800 mt-0.5">
                          <strong>Trọ:</strong> {r.diaChiNhaTro || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100">
                        <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                          {HOUSING_TYPE_LABELS[r.loaiHoTro] || r.loaiHoTro}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right border-r border-slate-100 font-mono">
                        <div className="font-bold text-slate-900">{formatVnd(r.tongHoTro)}</div>
                        <div className="text-[10px] text-slate-500">
                          {formatVnd(r.mucHoTroThang)} × {r.soThangHoTro}T
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 font-mono text-[11px]">
                        <div>Từ: {r.tuNgay || '—'}</div>
                        <div className="text-slate-500">Đến: {r.denNgay || '—'}</div>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100">
                        <select
                          value={r.trangThai}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              r,
                              e.target.value as BenefitApprovalStatus
                            )
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none cursor-pointer ${
                            STATUS_META[r.trangThai]?.badgeClass || ''
                          }`}
                        >
                          <option value="cho_duyet">Chờ duyệt</option>
                          <option value="du_dieu_kien">Đủ điều kiện</option>
                          <option value="da_chi_tra">Đã chi trả</option>
                          <option value="tu_choi">Từ chối</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-100 text-[11px] text-slate-600">
                        {r.ghiChu || '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDuplicateRecord(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép / Nhân bản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id, r.hoVaTen)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3c72] to-[#1a73e8] px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <moduleHeaderInfo.icon className="w-5 h-5 text-teal-300" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingId ? 'Chỉnh sửa' : moduleHeaderInfo.addLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveRecord}
              className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-xs"
            >
              {/* QUICK PICK FROM SAVED NVM (For application modules 2, 3, 4) */}
              {activeSubTab !== 'danh_muc_chinh_sach' && records.length > 0 && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <UserPlus className="w-4 h-4 text-[#1a73e8]" />
                      <span>
                        Chọn nhanh từ danh sách Nhân viên mới đã lưu ({records.length})
                      </span>
                    </div>
                    <input
                      type="text"
                      value={nvmPickerQuery}
                      onChange={(e) => setNvmPickerQuery(e.target.value)}
                      placeholder="Gõ tên, CCCD hoặc phòng để lọc..."
                      className="px-2.5 py-1 text-xs bg-white border border-blue-200 rounded-lg outline-none focus:border-[#1a73e8] w-60"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {filteredNvmRecords.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handlePickNvmRecord(rec)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                      >
                        <span className="font-bold">{rec.hoVaTen}</span>
                        {rec.phong && <span className="opacity-75">({rec.phong})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MODULE 1: DANH MỤC CHÍNH SÁCH FORM */}
              {activeSubTab === 'danh_muc_chinh_sach' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mã chính sách <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={policyForm.maChinhSach}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, maChinhSach: e.target.value })
                        }
                        placeholder="VD: CS-GT-01"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tên chính sách <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={policyForm.tenChinhSach}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, tenChinhSach: e.target.value })
                        }
                        placeholder="VD: Chính sách thưởng giới thiệu nhân viên mới..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nhóm chính sách
                      </label>
                      <select
                        value={policyForm.loaiChinhSach}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            loaiChinhSach: e.target
                              .value as RecruitmentPolicyItem['loaiChinhSach'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="thuong_gioi_thieu">Thưởng giới thiệu</option>
                        <option value="nguoi_cu_quay_lai">Người cũ quay lại</option>
                        <option value="ho_tro_nha_tro">Hỗ trợ nhà trọ</option>
                        <option value="khac">Chính sách khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Trạng thái áp dụng
                      </label>
                      <select
                        value={policyForm.trangThai}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            trangThai: e.target
                              .value as RecruitmentPolicyItem['trangThai'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="dang_ap_dung">Đang áp dụng</option>
                        <option value="tam_dung">Tạm dừng</option>
                        <option value="het_hieu_luc">Hết hiệu lực</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Đối tượng áp dụng <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={policyForm.doiTuong}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, doiTuong: e.target.value })
                      }
                      placeholder="Quy định rõ đối tượng được hưởng (VD: Toàn thể CBNV giới thiệu ứng viên cho các vị trí Vận hành...)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chính sách hỗ trợ (Quyền lợi / Mức thưởng){' '}
                      <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={policyForm.chinhSachHoTro}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, chinhSachHoTro: e.target.value })
                      }
                      placeholder="VD: 500,000 đ – 1,000,000 đ / người; hoặc Hỗ trợ 500,000 đ/tháng tiền mặt..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Thời hạn hưởng / Điều kiện thời gian{' '}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={policyForm.thoiHan}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, thoiHan: e.target.value })
                        }
                        placeholder="VD: Làm việc đủ 30 ngày công; Hỗ trợ tối đa 3 đến 6 tháng..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Thời gian áp dụng <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={policyForm.thoiGianApDung}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, thoiGianApDung: e.target.value })
                        }
                        placeholder="VD: 01/01/2026 – 31/12/2026 hoặc Đến khi có thông báo mới"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Điều kiện chi tiết / Hướng dẫn xét duyệt
                    </label>
                    <textarea
                      rows={2}
                      value={policyForm.dieuKienChiTiet}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, dieuKienChiTiet: e.target.value })
                      }
                      placeholder="Quy trình nộp đơn, thời điểm thanh toán, hồ sơ chứng từ cần nộp..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ghi chú bổ sung
                    </label>
                    <input
                      type="text"
                      value={policyForm.ghiChu}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, ghiChu: e.target.value })
                      }
                      placeholder="Phạm vi áp dụng, lưu ý ngoại lệ..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                </div>
              )}

              {/* MODULE 2: THƯỞNG GIỚI THIỆU FORM */}
              {activeSubTab === 'thuong_gioi_thieu' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-1 font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Thông tin Người giới thiệu</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mã NV giới thiệu
                      </label>
                      <input
                        type="text"
                        value={referralForm.maNVNguoiGioiThieu}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            maNVNguoiGioiThieu: e.target.value,
                          })
                        }
                        placeholder="VD: 2302016468"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Họ tên người giới thiệu <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={referralForm.tenNguoiGioiThieu}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            tenNguoiGioiThieu: e.target.value,
                          })
                        }
                        placeholder="Nguyễn Văn A"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phòng / Bếp người GT
                      </label>
                      <input
                        type="text"
                        value={referralForm.phongNguoiGioiThieu}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            phongNguoiGioiThieu: e.target.value,
                          })
                        }
                        placeholder="VD: SEV1"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        SĐT người giới thiệu
                      </label>
                      <input
                        type="text"
                        value={referralForm.sdtNguoiGioiThieu}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            sdtNguoiGioiThieu: e.target.value,
                          })
                        }
                        placeholder="09xxxxxxxx"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="border-b border-slate-100 pb-1 font-bold text-slate-800 flex items-center gap-1.5 pt-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Thông tin NVM được giới thiệu &amp; Mức thưởng</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Họ tên NVM <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={referralForm.hoVaTenUngVien}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            hoVaTenUngVien: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số CCCD</label>
                      <input
                        type="text"
                        value={referralForm.soCCCD}
                        onChange={(e) =>
                          setReferralForm({ ...referralForm, soCCCD: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số điện thoại NVM
                      </label>
                      <input
                        type="text"
                        value={referralForm.soDienThoai}
                        onChange={(e) =>
                          setReferralForm({ ...referralForm, soDienThoai: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Khối</label>
                      <select
                        value={referralForm.khoi}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            khoi: e.target.value,
                            ban: '',
                            phong: '',
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="">-- Chọn Khối --</option>
                        {availableKhois.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ban</label>
                      <select
                        value={referralForm.ban}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            ban: e.target.value,
                            phong: '',
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="">-- Chọn Ban --</option>
                        {getBansByKhoi(referralForm.khoi).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phòng / Bếp làm việc
                      </label>
                      <input
                        type="text"
                        list="benefit-phongs-list"
                        value={referralForm.phong}
                        onChange={(e) =>
                          setReferralForm({ ...referralForm, phong: e.target.value })
                        }
                        placeholder="Chọn hoặc nhập tên phòng"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                      <datalist id="benefit-phongs-list">
                        {getPhongsByKhoiBan(referralForm.khoi, referralForm.ban).map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ngày vào làm
                      </label>
                      <input
                        type="date"
                        value={referralForm.ngayVaoLam}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            ngayVaoLam: e.target.value,
                            ngayDuDieuKien: addDaysIso(e.target.value, 30),
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ngày đủ ĐK (+30 ngày)
                      </label>
                      <input
                        type="date"
                        value={referralForm.ngayDuDieuKien}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            ngayDuDieuKien: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mức thưởng (VNĐ)
                      </label>
                      <input
                        type="number"
                        step={50000}
                        min={0}
                        value={referralForm.mucThuong}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            mucThuong: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kỳ chi trả
                      </label>
                      <input
                        type="text"
                        value={referralForm.kyChiTra}
                        onChange={(e) =>
                          setReferralForm({ ...referralForm, kyChiTra: e.target.value })
                        }
                        placeholder="VD: Tháng 11/2026"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Trạng thái duyệt
                      </label>
                      <select
                        value={referralForm.trangThai}
                        onChange={(e) =>
                          setReferralForm({
                            ...referralForm,
                            trangThai: e.target.value as BenefitApprovalStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="cho_duyet">Chờ duyệt</option>
                        <option value="du_dieu_kien">Đủ điều kiện</option>
                        <option value="da_chi_tra">Đã chi trả</option>
                        <option value="tu_choi">Từ chối</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                      <input
                        type="text"
                        value={referralForm.ghiChu}
                        onChange={(e) =>
                          setReferralForm({ ...referralForm, ghiChu: e.target.value })
                        }
                        placeholder="Ghi chú xác nhận, tài khoản nhận thưởng..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 3: NGƯỜI CŨ QUAY LẠI FORM */}
              {activeSubTab === 'nguoi_cu_quay_lai' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã NV cũ</label>
                      <input
                        type="text"
                        value={rehireForm.maNVCu}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, maNVCu: e.target.value })
                        }
                        placeholder="VD: 2104056789"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Họ và tên <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={rehireForm.hoVaTen}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, hoVaTen: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số CCCD</label>
                      <input
                        type="text"
                        value={rehireForm.soCCCD}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, soCCCD: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        value={rehireForm.soDienThoai}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, soDienThoai: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phòng / Bếp cũ
                      </label>
                      <input
                        type="text"
                        value={rehireForm.phongCu}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, phongCu: e.target.value })
                        }
                        placeholder="Đơn vị làm việc trước đây"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ngày nghỉ việc cũ
                      </label>
                      <input
                        type="date"
                        value={rehireForm.ngayNghiViecCu}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, ngayNghiViecCu: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Đánh giá lịch sử cũ
                      </label>
                      <select
                        value={rehireForm.danhGiaTruocDay}
                        onChange={(e) =>
                          setRehireForm({
                            ...rehireForm,
                            danhGiaTruocDay: e.target
                              .value as RehireEmployeeRecord['danhGiaTruocDay'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="tot">Tốt</option>
                        <option value="binh_thuong">Bình thường</option>
                        <option value="can_luu_y">Cần lưu ý</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Lý do nghỉ việc trước đây
                    </label>
                    <input
                      type="text"
                      value={rehireForm.lyDoNghiCu}
                      onChange={(e) =>
                        setRehireForm({ ...rehireForm, lyDoNghiCu: e.target.value })
                      }
                      placeholder="VD: Việc gia đình, hết hợp đồng, chuyển chỗ ở..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Khối tiếp nhận
                      </label>
                      <select
                        value={rehireForm.khoi}
                        onChange={(e) =>
                          setRehireForm({
                            ...rehireForm,
                            khoi: e.target.value,
                            ban: '',
                            phongMoi: '',
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="">-- Chọn Khối --</option>
                        {availableKhois.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ban tiếp nhận
                      </label>
                      <select
                        value={rehireForm.ban}
                        onChange={(e) =>
                          setRehireForm({
                            ...rehireForm,
                            ban: e.target.value,
                            phongMoi: '',
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="">-- Chọn Ban --</option>
                        {getBansByKhoi(rehireForm.khoi).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phòng / Bếp tiếp nhận mới
                      </label>
                      <input
                        type="text"
                        list="rehire-phongs-list"
                        value={rehireForm.phongMoi}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, phongMoi: e.target.value })
                        }
                        placeholder="Chọn hoặc nhập tên phòng"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                      <datalist id="rehire-phongs-list">
                        {getPhongsByKhoiBan(rehireForm.khoi, rehireForm.ban).map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ngày quay lại làm việc
                      </label>
                      <input
                        type="date"
                        value={rehireForm.ngayQuayLai}
                        onChange={(e) =>
                          setRehireForm({ ...rehireForm, ngayQuayLai: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mức hỗ trợ quay lại (VNĐ)
                      </label>
                      <input
                        type="number"
                        step={50000}
                        min={0}
                        value={rehireForm.mucHoTro}
                        onChange={(e) =>
                          setRehireForm({
                            ...rehireForm,
                            mucHoTro: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Trạng thái duyệt
                      </label>
                      <select
                        value={rehireForm.trangThai}
                        onChange={(e) =>
                          setRehireForm({
                            ...rehireForm,
                            trangThai: e.target.value as BenefitApprovalStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="cho_duyet">Chờ duyệt</option>
                        <option value="du_dieu_kien">Đủ điều kiện</option>
                        <option value="da_chi_tra">Đã chi trả</option>
                        <option value="tu_choi">Từ chối</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={rehireForm.ghiChu}
                      onChange={(e) =>
                        setRehireForm({ ...rehireForm, ghiChu: e.target.value })
                      }
                      placeholder="Ghi chú xác minh hồ sơ cũ, ý kiến quản lý..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                </div>
              )}

              {/* MODULE 4: HỖ TRỢ NHÀ TRỌ FORM */}
              {activeSubTab === 'ho_tro_nha_tro' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã NV</label>
                      <input
                        type="text"
                        value={housingForm.maNV}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, maNV: e.target.value })
                        }
                        placeholder="Mã NV (nếu có)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Họ và tên <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={housingForm.hoVaTen}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, hoVaTen: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số CCCD</label>
                      <input
                        type="text"
                        value={housingForm.soCCCD}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, soCCCD: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        value={housingForm.soDienThoai}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, soDienThoai: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Khối</label>
                      <select
                        value={housingForm.khoi}
                        onChange={(e) =>
                          setHousingForm({
                            ...housingForm,
                            khoi: e.target.value,
                            ban: '',
                            phong: '',
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="">-- Chọn Khối --</option>
                        {availableKhois.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ban</label>
                      <select
                        value={housingForm.ban}
                        onChange={(e) =>
                          setHousingForm({
                            ...housingForm,
                            ban: e.target.value,
                            phong: '',
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="">-- Chọn Ban --</option>
                        {getBansByKhoi(housingForm.khoi).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phòng / Bếp làm việc
                      </label>
                      <input
                        type="text"
                        list="housing-phongs-list"
                        value={housingForm.phong}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, phong: e.target.value })
                        }
                        placeholder="Chọn hoặc nhập tên phòng"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                      <datalist id="housing-phongs-list">
                        {getPhongsByKhoiBan(housingForm.khoi, housingForm.ban).map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Quê quán (căn cứ xét hỗ trợ)
                      </label>
                      <input
                        type="text"
                        value={housingForm.queQuan}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, queQuan: e.target.value })
                        }
                        placeholder="Tỉnh/TP, Xã/Phường..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Địa chỉ nhà trọ / Ký túc xá
                      </label>
                      <input
                        type="text"
                        value={housingForm.diaChiNhaTro}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, diaChiNhaTro: e.target.value })
                        }
                        placeholder="Số phòng, khu trọ, địa chỉ..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Hình thức hỗ trợ
                      </label>
                      <select
                        value={housingForm.loaiHoTro}
                        onChange={(e) =>
                          setHousingForm({
                            ...housingForm,
                            loaiHoTro: e.target
                              .value as HousingSupportRecord['loaiHoTro'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="tien_mat">Hỗ trợ tiền mặt</option>
                        <option value="ky_tuc_xa">Bố trí Ký túc xá</option>
                        <option value="ho_tro_thue_ngoai">Hỗ trợ thuê ngoài</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mức hỗ trợ / tháng (VNĐ)
                      </label>
                      <input
                        type="number"
                        step={50000}
                        min={0}
                        value={housingForm.mucHoTroThang}
                        onChange={(e) => {
                          const muc = Number(e.target.value) || 0;
                          setHousingForm({
                            ...housingForm,
                            mucHoTroThang: muc,
                            tongHoTro: muc * (Number(housingForm.soThangHoTro) || 0),
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số tháng hỗ trợ
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={housingForm.soThangHoTro}
                        onChange={(e) => {
                          const months = Number(e.target.value) || 1;
                          setHousingForm({
                            ...housingForm,
                            soThangHoTro: months,
                            tongHoTro:
                              (Number(housingForm.mucHoTroThang) || 0) * months,
                            denNgay: addDaysIso(housingForm.tuNgay, months * 30),
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tổng hỗ trợ
                      </label>
                      <div className="w-full px-2.5 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg font-mono font-bold">
                        {formatVnd(
                          (Number(housingForm.mucHoTroThang) || 0) *
                            (Number(housingForm.soThangHoTro) || 0)
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Từ ngày</label>
                      <input
                        type="date"
                        value={housingForm.tuNgay}
                        onChange={(e) =>
                          setHousingForm({
                            ...housingForm,
                            tuNgay: e.target.value,
                            denNgay: addDaysIso(
                              e.target.value,
                              (Number(housingForm.soThangHoTro) || 3) * 30
                            ),
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Đến ngày
                      </label>
                      <input
                        type="date"
                        value={housingForm.denNgay}
                        onChange={(e) =>
                          setHousingForm({ ...housingForm, denNgay: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Trạng thái duyệt
                      </label>
                      <select
                        value={housingForm.trangThai}
                        onChange={(e) =>
                          setHousingForm({
                            ...housingForm,
                            trangThai: e.target.value as BenefitApprovalStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1a73e8]"
                      >
                        <option value="cho_duyet">Chờ duyệt</option>
                        <option value="du_dieu_kien">Đủ điều kiện</option>
                        <option value="da_chi_tra">Đã chi trả</option>
                        <option value="tu_choi">Từ chối</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={housingForm.ghiChu}
                      onChange={(e) =>
                        setHousingForm({ ...housingForm, ghiChu: e.target.value })
                      }
                      placeholder="Ghi chú hợp đồng thuê trọ, xác nhận tạm trú..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
