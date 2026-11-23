import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  FilePlus2,
  Search,
  Plus,
  Download,
  X,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ClipboardList,
  ArrowUpRight,
  Layers,
  Send,
} from 'lucide-react';
import {
  UserProfile,
  HrSopSubTab,
  HrSopCategory,
  HrSopStatus,
  HrSopItem,
  HrSopRegistrationItem,
  SopRegistrationType,
  SopRegistrationStatus,
  SopPriorityLevel,
} from '../types';
import {
  DEFAULT_HR_SOP_LIST,
  DEFAULT_HR_SOP_REGISTRATIONS,
} from '../data/hrKnowledgeDefaults';
import { safeFetchJson } from '../utils/apiHelper';

export interface SopCounts {
  sop_list: number;
  sop_registrations: number;
}

interface HrSopManagerProps {
  currentUser: UserProfile;
  activeSubTab?: HrSopSubTab;
  onSubTabChange?: (tab: HrSopSubTab) => void;
  onCountsChange?: (counts: SopCounts) => void;
}

const SOP_CATEGORY_LABELS: Record<HrSopCategory, string> = {
  tuyen_dung: 'Tuyển dụng',
  cnb_luong_thuong: 'C&B & Lương thưởng',
  dao_tao_hoi_nhap: 'Đào tạo & Hội nhập',
  quan_he_lao_dong: 'Quan hệ Lao động',
  y_te_an_toan: 'Y tế & An toàn',
  hanh_chinh_nhan_su: 'Hành chính Nhân sự',
};

const SOP_CATEGORY_BADGE: Record<HrSopCategory, string> = {
  tuyen_dung: 'bg-blue-50 text-blue-700 border-blue-200',
  cnb_luong_thuong: 'bg-amber-50 text-amber-800 border-amber-200',
  dao_tao_hoi_nhap: 'bg-purple-50 text-purple-700 border-purple-200',
  quan_he_lao_dong: 'bg-rose-50 text-rose-700 border-rose-200',
  y_te_an_toan: 'bg-teal-50 text-teal-700 border-teal-200',
  hanh_chinh_nhan_su: 'bg-slate-100 text-slate-700 border-slate-200',
};

const SOP_STATUS_META: Record<HrSopStatus, { label: string; cls: string }> = {
  dang_ap_dung: { label: 'Đang áp dụng', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  dang_ra_soat: { label: 'Đang rà soát', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  het_hieu_luc: { label: 'Hết hiệu lực', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const REG_TYPE_LABELS: Record<SopRegistrationType, { label: string; cls: string }> = {
  ban_hanh_moi: { label: 'Ban hành mới', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  sua_doi: { label: 'Sửa đổi / Cập nhật', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  huy_bo: { label: 'Đề xuất hủy bỏ', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const REG_STATUS_META: Record<SopRegistrationStatus, { label: string; cls: string }> = {
  cho_duyet: { label: 'Chờ duyệt', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  dang_tham_dinh: { label: 'Đang thẩm định', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  da_phe_duyet: { label: 'Đã phê duyệt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tu_choi: { label: 'Từ chối', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const PRIORITY_META: Record<SopPriorityLevel, { label: string; cls: string }> = {
  binh_thuong: { label: 'Bình thường', cls: 'bg-slate-100 text-slate-600' },
  gap: { label: 'Gấp', cls: 'bg-amber-100 text-amber-800' },
  khan_cap: { label: 'Khẩn cấp', cls: 'bg-rose-100 text-rose-700' },
};

const LS_SOP_LIST = 'hr_knowledge_v1_sop_list';
const LS_SOP_REGS = 'hr_knowledge_v1_sop_registrations';

function loadLocal<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return fallback;
}

export const HrSopManager: React.FC<HrSopManagerProps> = ({
  currentUser,
  activeSubTab: controlledSubTab,
  onSubTabChange,
  onCountsChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<HrSopSubTab>('tra_cuu_sop');
  const activeSubTab = controlledSubTab ?? internalSubTab;
  const setActiveSubTab = (t: HrSopSubTab) => {
    setInternalSubTab(t);
    onSubTabChange?.(t);
  };

  const [sopList, setSopList] = useState<HrSopItem[]>(() =>
    loadLocal<HrSopItem>(LS_SOP_LIST, DEFAULT_HR_SOP_LIST)
  );
  const [regList, setRegList] = useState<HrSopRegistrationItem[]>(() =>
    loadLocal<HrSopRegistrationItem>(LS_SOP_REGS, DEFAULT_HR_SOP_REGISTRATIONS)
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Detail modal
  const [viewingSop, setViewingSop] = useState<HrSopItem | null>(null);

  // Add/Edit SOP Modal
  const [sopModalOpen, setSopModalOpen] = useState(false);
  const [editingSopId, setEditingSopId] = useState<string | null>(null);
  const emptySopForm = (): Omit<HrSopItem, 'id'> => ({
    maSop: `SOP-HR-${String(sopList.length + 1).padStart(2, '0')}`,
    tenSop: '',
    phienBan: 'v1.0',
    nhomNghiepVu: 'tuyen_dung',
    boPhanBanHanh: 'Phòng Nhân sự',
    doiTuongApDung: 'Toàn thể CBNV Công ty',
    ngayHieuLuc: new Date().toISOString().slice(0, 10),
    ngayRaSoatTiepTheo: '',
    mucDich: '',
    noiDungTomTat: '',
    cacBuocThucHien: 'Bước 1: \nBước 2: \nBước 3: ',
    bieuMauDinhKem: '',
    trangThai: 'dang_ap_dung',
    nguoiBienSoan: currentUser.name || currentUser.email,
    nguoiPheDuyet: 'Giám đốc Nhân sự',
    ghiChu: '',
  });
  const [sopForm, setSopForm] = useState<Omit<HrSopItem, 'id'>>(emptySopForm);

  // Add/Edit Registration Modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const emptyRegForm = (): Omit<HrSopRegistrationItem, 'id'> => ({
    maYeuCau: `DK-SOP-${new Date().getFullYear()}-${String(regList.length + 1).padStart(3, '0')}`,
    loaiDeXuat: 'ban_hanh_moi',
    maSopLienQuan: '',
    tenSopDeXuat: '',
    nhomNghiepVu: 'tuyen_dung',
    donViDeXuat: currentUser.department || 'Phòng Nhân sự',
    nguoiDeXuat: currentUser.name || currentUser.email,
    ngayDeXuat: new Date().toISOString().slice(0, 10),
    ngayMongMuonApDung: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    mucDoUuTien: 'binh_thuong',
    lyDoDeXuat: '',
    noiDungDeXuat: '',
    trangThai: 'cho_duyet',
    nguoiDuyet: '',
    phanHoiDuyet: '',
  });
  const [regForm, setRegForm] = useState<Omit<HrSopRegistrationItem, 'id'>>(emptyRegForm);

  // Load from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await safeFetchJson<{
          success: boolean;
          data?: { sop_list?: HrSopItem[]; sop_registrations?: HrSopRegistrationItem[] };
        }>('/api/hr-knowledge/all');
        if (mounted && res.ok && res.data?.data) {
          const s =
            Array.isArray(res.data.data.sop_list) && res.data.data.sop_list.length > 0
              ? res.data.data.sop_list
              : DEFAULT_HR_SOP_LIST;
          const r = Array.isArray(res.data.data.sop_registrations)
            ? res.data.data.sop_registrations
            : DEFAULT_HR_SOP_REGISTRATIONS;
          setSopList(s);
          setRegList(r);
          try {
            localStorage.setItem(LS_SOP_LIST, JSON.stringify(s));
            localStorage.setItem(LS_SOP_REGS, JSON.stringify(r));
          } catch {}
        }
      } catch {}
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    onCountsChange?.({
      sop_list: sopList.length,
      sop_registrations: regList.length,
    });
  }, [sopList.length, regList.length, onCountsChange]);

  useEffect(() => {
    setSearchQuery('');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
  }, [activeSubTab]);

  // Filtered lists
  const filteredSops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sopList.filter((item) => {
      if (filterCategory !== 'ALL' && item.nhomNghiepVu !== filterCategory) return false;
      if (filterStatus !== 'ALL' && item.trangThai !== filterStatus) return false;
      if (!q) return true;
      return [
        item.maSop,
        item.tenSop,
        item.boPhanBanHanh,
        item.doiTuongApDung,
        item.mucDich,
        item.noiDungTomTat,
        item.cacBuocThucHien,
        item.bieuMauDinhKem || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [sopList, searchQuery, filterCategory, filterStatus]);

  const filteredRegs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return regList.filter((item) => {
      if (filterCategory !== 'ALL' && item.nhomNghiepVu !== filterCategory) return false;
      if (filterStatus !== 'ALL' && item.trangThai !== filterStatus) return false;
      if (!q) return true;
      return [
        item.maYeuCau,
        item.maSopLienQuan || '',
        item.tenSopDeXuat,
        item.donViDeXuat,
        item.nguoiDeXuat,
        item.lyDoDeXuat,
        item.noiDungDeXuat,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [regList, searchQuery, filterCategory, filterStatus]);

  // KPI stats
  const kpi = useMemo(() => {
    const activeSops = sopList.filter((s) => s.trangThai === 'dang_ap_dung').length;
    const reviewSops = sopList.filter((s) => s.trangThai === 'dang_ra_soat').length;
    const pendingRegs = regList.filter(
      (r) => r.trangThai === 'cho_duyet' || r.trangThai === 'dang_tham_dinh'
    ).length;
    const approvedRegs = regList.filter((r) => r.trangThai === 'da_phe_duyet').length;
    const byCat: Record<string, number> = {};
    sopList.forEach((s) => {
      byCat[s.nhomNghiepVu] = (byCat[s.nhomNghiepVu] || 0) + 1;
    });
    return { activeSops, reviewSops, pendingRegs, approvedRegs, byCat };
  }, [sopList, regList]);

  // CRUD for SOP
  const handleOpenAddSop = () => {
    setEditingSopId(null);
    setSopForm(emptySopForm());
    setSopModalOpen(true);
  };

  const handleOpenEditSop = (item: HrSopItem) => {
    setEditingSopId(item.id);
    const { id: _id, ...rest } = item;
    setSopForm(rest);
    setSopModalOpen(true);
  };

  const handleSaveSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sopForm.maSop.trim() || !sopForm.tenSop.trim()) {
      showToast('error', 'Vui lòng nhập Mã SOP và Tên quy trình SOP.');
      return;
    }
    const payload: HrSopItem = {
      ...sopForm,
      id: editingSopId || `SOP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      capNhatLuc: new Date().toISOString(),
    };
    const nextList = editingSopId
      ? sopList.map((s) => (s.id === editingSopId ? payload : s))
      : [payload, ...sopList];
    setSopList(nextList);
    try {
      localStorage.setItem(LS_SOP_LIST, JSON.stringify(nextList));
    } catch {}
    setSopModalOpen(false);
    try {
      const res = await safeFetchJson<{ success: boolean; list?: HrSopItem[] }>(
        '/api/hr-knowledge/sop_list',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok && res.data?.list) {
        setSopList(res.data.list);
        localStorage.setItem(LS_SOP_LIST, JSON.stringify(res.data.list));
      }
      showToast('success', editingSopId ? 'Đã cập nhật SOP nhân sự thành công!' : 'Đã thêm SOP nhân sự mới!');
    } catch {
      showToast('info', 'Đã lưu SOP vào bộ nhớ trình duyệt.');
    }
  };

  const handleDuplicateSop = async (item: HrSopItem) => {
    const dup: HrSopItem = {
      ...item,
      id: `SOP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      maSop: `${item.maSop}-COPY`,
      tenSop: `${item.tenSop} (Bản sao)`,
      capNhatLuc: new Date().toISOString(),
    };
    const next = [dup, ...sopList];
    setSopList(next);
    try {
      localStorage.setItem(LS_SOP_LIST, JSON.stringify(next));
    } catch {}
    try {
      await safeFetchJson('/api/hr-knowledge/sop_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dup),
      });
      showToast('success', `Đã nhân bản SOP "${dup.tenSop}"!`);
    } catch {
      showToast('info', 'Đã nhân bản SOP vào bộ nhớ tạm.');
    }
  };

  const handleDeleteSop = async (item: HrSopItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa quy trình "${item.maSop} - ${item.tenSop}"?`)) return;
    const next = sopList.filter((s) => s.id !== item.id);
    setSopList(next);
    try {
      localStorage.setItem(LS_SOP_LIST, JSON.stringify(next));
    } catch {}
    try {
      await safeFetchJson(`/api/hr-knowledge/sop_list/${item.id}`, { method: 'DELETE' });
      showToast('success', `Đã xóa SOP "${item.maSop}".`);
    } catch {
      showToast('info', `Đã xóa SOP "${item.maSop}" khỏi bộ nhớ cục bộ.`);
    }
  };

  const handleResetDefaultSops = async () => {
    if (!window.confirm('Khôi phục danh sách 6 SOP nhân sự chuẩn mặc định?')) return;
    setSopList(DEFAULT_HR_SOP_LIST);
    try {
      localStorage.setItem(LS_SOP_LIST, JSON.stringify(DEFAULT_HR_SOP_LIST));
      await safeFetchJson('/api/hr-knowledge/sop_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: DEFAULT_HR_SOP_LIST }),
      });
    } catch {}
    showToast('success', 'Đã khôi phục bộ SOP nhân sự mặc định!');
  };

  // CRUD for Registrations
  const handleOpenAddReg = (prefillSop?: HrSopItem) => {
    setEditingRegId(null);
    const base = emptyRegForm();
    if (prefillSop) {
      base.loaiDeXuat = 'sua_doi';
      base.maSopLienQuan = prefillSop.maSop;
      base.tenSopDeXuat = `Cập nhật ${prefillSop.tenSop}`;
      base.nhomNghiepVu = prefillSop.nhomNghiepVu;
    }
    setRegForm(base);
    setViewingSop(null);
    setRegModalOpen(true);
  };

  const handleOpenEditReg = (item: HrSopRegistrationItem) => {
    setEditingRegId(item.id);
    const { id: _id, ...rest } = item;
    setRegForm(rest);
    setRegModalOpen(true);
  };

  const handleSaveReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.tenSopDeXuat.trim() || !regForm.lyDoDeXuat.trim()) {
      showToast('error', 'Vui lòng nhập Tên SOP đề xuất và Lý do đăng ký.');
      return;
    }
    const payload: HrSopRegistrationItem = {
      ...regForm,
      id: editingRegId || `REQ_SOP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      capNhatLuc: new Date().toISOString(),
    };
    const nextList = editingRegId
      ? regList.map((r) => (r.id === editingRegId ? payload : r))
      : [payload, ...regList];
    setRegList(nextList);
    try {
      localStorage.setItem(LS_SOP_REGS, JSON.stringify(nextList));
    } catch {}
    setRegModalOpen(false);
    setActiveSubTab('dang_ky_sop');
    try {
      const res = await safeFetchJson<{ success: boolean; list?: HrSopRegistrationItem[] }>(
        '/api/hr-knowledge/sop_registrations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok && res.data?.list) {
        setRegList(res.data.list);
        localStorage.setItem(LS_SOP_REGS, JSON.stringify(res.data.list));
      }
      showToast(
        'success',
        editingRegId ? 'Đã cập nhật phiếu đăng ký SOP!' : 'Đã gửi đăng ký / đề xuất SOP thành công!'
      );
    } catch {
      showToast('info', 'Đã lưu phiếu đăng ký SOP vào bộ nhớ trình duyệt.');
    }
  };

  const handleQuickStatusReg = async (item: HrSopRegistrationItem, newStatus: SopRegistrationStatus) => {
    const updated: HrSopRegistrationItem = {
      ...item,
      trangThai: newStatus,
      nguoiDuyet: currentUser.name || currentUser.email,
      capNhatLuc: new Date().toISOString(),
    };
    const next = regList.map((r) => (r.id === item.id ? updated : r));
    setRegList(next);
    try {
      localStorage.setItem(LS_SOP_REGS, JSON.stringify(next));
      await safeFetchJson('/api/hr-knowledge/sop_registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      showToast('success', `Đã cập nhật trạng thái phiếu ${item.maYeuCau} -> ${REG_STATUS_META[newStatus].label}`);
    } catch {}
  };

  const handlePublishRegToSop = async (reg: HrSopRegistrationItem) => {
    const newSop: HrSopItem = {
      id: `SOP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      maSop: reg.maSopLienQuan?.trim() || `SOP-HR-${String(sopList.length + 1).padStart(2, '0')}`,
      tenSop: reg.tenSopDeXuat,
      phienBan: reg.loaiDeXuat === 'sua_doi' ? 'v2.0' : 'v1.0',
      nhomNghiepVu: reg.nhomNghiepVu,
      boPhanBanHanh: reg.donViDeXuat || 'Phòng Nhân sự',
      doiTuongApDung: 'Toàn thể CBNV / Đơn vị liên quan',
      ngayHieuLuc: reg.ngayMongMuonApDung || new Date().toISOString().slice(0, 10),
      mucDich: reg.lyDoDeXuat,
      noiDungTomTat: reg.noiDungDeXuat,
      cacBuocThucHien: reg.noiDungDeXuat,
      trangThai: 'dang_ap_dung',
      nguoiBienSoan: reg.nguoiDeXuat,
      nguoiPheDuyet: currentUser.name || 'Giám đốc Nhân sự',
      ghiChu: `Ban hành từ phiếu đăng ký ${reg.maYeuCau}`,
      capNhatLuc: new Date().toISOString(),
    };
    const nextSops = [newSop, ...sopList];
    setSopList(nextSops);
    try {
      localStorage.setItem(LS_SOP_LIST, JSON.stringify(nextSops));
      await safeFetchJson('/api/hr-knowledge/sop_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSop),
      });
    } catch {}
    await handleQuickStatusReg(reg, 'da_phe_duyet');
    showToast('success', `Đã ban hành "${newSop.tenSop}" vào Danh mục SOP chính thức!`);
  };

  const handleDuplicateReg = async (item: HrSopRegistrationItem) => {
    const dup: HrSopRegistrationItem = {
      ...item,
      id: `REQ_SOP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      maYeuCau: `${item.maYeuCau}-COPY`,
      tenSopDeXuat: `${item.tenSopDeXuat} (Bản sao)`,
      trangThai: 'cho_duyet',
      capNhatLuc: new Date().toISOString(),
    };
    const next = [dup, ...regList];
    setRegList(next);
    try {
      localStorage.setItem(LS_SOP_REGS, JSON.stringify(next));
      await safeFetchJson('/api/hr-knowledge/sop_registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dup),
      });
    } catch {}
    showToast('success', 'Đã sao chép phiếu đăng ký SOP!');
  };

  const handleDeleteReg = async (item: HrSopRegistrationItem) => {
    if (!window.confirm(`Xóa phiếu đăng ký SOP "${item.maYeuCau} - ${item.tenSopDeXuat}"?`)) return;
    const next = regList.filter((r) => r.id !== item.id);
    setRegList(next);
    try {
      localStorage.setItem(LS_SOP_REGS, JSON.stringify(next));
      await safeFetchJson(`/api/hr-knowledge/sop_registrations/${item.id}`, { method: 'DELETE' });
    } catch {}
    showToast('success', `Đã xóa phiếu ${item.maYeuCau}.`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = 'SOP_Nhan_Su.csv';

    if (activeSubTab === 'tra_cuu_sop') {
      headers = [
        'STT',
        'Mã SOP',
        'Phiên bản',
        'Tên quy trình SOP',
        'Nhóm nghiệp vụ',
        'Bộ phận ban hành',
        'Đối tượng áp dụng',
        'Ngày hiệu lực',
        'Trạng thái',
        'Nội dung tóm tắt',
      ];
      rows = filteredSops.map((s, idx) => [
        String(idx + 1),
        s.maSop,
        s.phienBan,
        s.tenSop,
        SOP_CATEGORY_LABELS[s.nhomNghiepVu],
        s.boPhanBanHanh,
        s.doiTuongApDung,
        s.ngayHieuLuc,
        SOP_STATUS_META[s.trangThai].label,
        s.noiDungTomTat,
      ]);
      filename = `Danh_Muc_SOP_Nhan_Su_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      headers = [
        'STT',
        'Mã yêu cầu',
        'Loại đề xuất',
        'Mã SOP liên quan',
        'Tên SOP đề xuất',
        'Nhóm nghiệp vụ',
        'Đơn vị đề xuất',
        'Người đề xuất',
        'Ngày đề xuất',
        'Ưu tiên',
        'Trạng thái',
        'Lý do đề xuất',
      ];
      rows = filteredRegs.map((r, idx) => [
        String(idx + 1),
        r.maYeuCau,
        REG_TYPE_LABELS[r.loaiDeXuat].label,
        r.maSopLienQuan || '',
        r.tenSopDeXuat,
        SOP_CATEGORY_LABELS[r.nhomNghiepVu],
        r.donViDeXuat,
        r.nguoiDeXuat,
        r.ngayDeXuat,
        PRIORITY_META[r.mucDoUuTien].label,
        REG_STATUS_META[r.trangThai].label,
        r.lyDoDeXuat,
      ]);
      filename = `Dang_Ky_SOP_Nhan_Su_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Đã xuất file ${filename}!`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3c72] via-[#1a56b0] to-[#1a73e8] text-white p-5 sm:p-6 shadow-md border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              HỆ THỐNG TRA CỨU &amp; ĐĂNG KÝ SOP NHÂN SỰ
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
              onClick={() => handleOpenAddReg()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4 stroke-[2.2]" />
              <span>+ Đăng ký / Đề xuất SOP</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddSop}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Thêm SOP Chuẩn</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('tra_cuu_sop')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'tra_cuu_sop'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Tra cứu SOP Nhân sự</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeSubTab === 'tra_cuu_sop'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {sopList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('dang_ky_sop')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'dang_ky_sop'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FilePlus2 className="w-4 h-4" />
          <span>2. Đăng ký / Đề xuất SOP</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeSubTab === 'dang_ky_sop'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {regList.length}
          </span>
        </button>
      </div>

      {/* 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng SOP Nhân Sự
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{sopList.length}</span>
            <span className="text-xs text-slate-500">
              quy trình ({kpi.activeSops} đang áp dụng)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Đang rà soát: {kpi.reviewSops}</span>
            <button
              type="button"
              onClick={handleResetDefaultSops}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" /> Mặc định
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phân Bổ Nghiệp Vụ
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(SOP_CATEGORY_LABELS) as HrSopCategory[]).map((cat) => {
              const c = kpi.byCat[cat] || 0;
              if (c === 0) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(filterCategory === cat ? 'ALL' : cat)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border cursor-pointer transition ${
                    filterCategory === cat
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{SOP_CATEGORY_LABELS[cat]}</span>
                  <span className="font-bold tabular-nums">{c}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-1.5 text-[11px] text-slate-400">Nhấn vào nhóm để lọc nhanh</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phiếu Đăng Ký Chờ Duyệt
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 tabular-nums">{kpi.pendingRegs}</span>
            <span className="text-xs text-slate-500">yêu cầu đang xử lý</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Tổng phiếu đăng ký: <strong>{regList.length}</strong>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã Phê Duyệt &amp; Ban Hành
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">{kpi.approvedRegs}</span>
            <span className="text-xs text-slate-500">phiếu đã duyệt</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Hỗ trợ chuyển phiếu duyệt thành SOP 1-click
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSubTab === 'tra_cuu_sop'
                  ? 'Tìm theo mã SOP, tên quy trình, bộ phận, biểu mẫu, từ khóa...'
                  : 'Tìm theo mã yêu cầu, tên SOP đề xuất, người đề xuất, lý do...'
              }
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Tất cả Nhóm nghiệp vụ</option>
              {(Object.keys(SOP_CATEGORY_LABELS) as HrSopCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {SOP_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              {activeSubTab === 'tra_cuu_sop'
                ? (Object.keys(SOP_STATUS_META) as HrSopStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {SOP_STATUS_META[st].label}
                    </option>
                  ))
                : (Object.keys(REG_STATUS_META) as SopRegistrationStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {REG_STATUS_META[st].label}
                    </option>
                  ))}
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#1a73e8]" />
            <span className="font-semibold text-slate-800">
              {activeSubTab === 'tra_cuu_sop'
                ? `Danh mục Quy trình SOP Nhân sự (${filteredSops.length} / ${sopList.length})`
                : `Danh sách Phiếu Đăng ký / Đề xuất SOP (${filteredRegs.length} / ${regList.length})`}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {activeSubTab === 'tra_cuu_sop'
              ? 'Nhấn vào dòng bất kỳ để xem chi tiết các bước thực hiện & biểu mẫu'
              : 'Quản lý có thể duyệt trạng thái trực tiếp hoặc nhấn Ban hành SOP'}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[620px]">
          {activeSubTab === 'tra_cuu_sop' ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">STT</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[130px]">Mã SOP &amp; Ver</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[240px]">Tên quy trình SOP</th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[130px]">Nhóm nghiệp vụ</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[170px]">Bộ phận ban hành</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[220px]">Tóm tắt nội dung</th>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 min-w-[95px]">Hiệu lực</th>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 min-w-[115px]">Trạng thái</th>
                  <th className="py-2.5 px-2.5 text-center min-w-[120px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSops.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Không tìm thấy quy trình SOP phù hợp với từ khóa/bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredSops.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => setViewingSop(item)}
                      className="hover:bg-blue-50/50 transition cursor-pointer"
                    >
                      <td className="py-3 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#1e3c72]">{item.maSop}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold">
                          {item.phienBan}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100">
                        <div className="font-bold text-slate-900">{item.tenSop}</div>
                        {item.bieuMauDinhKem && (
                          <div className="text-[10px] text-blue-700 mt-0.5 truncate max-w-[260px]">
                            Biểu mẫu: {item.bieuMauDinhKem}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            SOP_CATEGORY_BADGE[item.nhomNghiepVu]
                          }`}
                        >
                          {SOP_CATEGORY_LABELS[item.nhomNghiepVu]}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-700 font-medium">
                        {item.boPhanBanHanh}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-600 text-[11px] max-w-[260px]">
                        <p className="line-clamp-2">{item.noiDungTomTat}</p>
                      </td>
                      <td className="py-3 px-2.5 text-center font-mono text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {item.ngayHieuLuc}
                      </td>
                      <td className="py-3 px-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            SOP_STATUS_META[item.trangThai].cls
                          }`}
                        >
                          {SOP_STATUS_META[item.trangThai].label}
                        </span>
                      </td>
                      <td
                        className="py-2.5 px-2 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingSop(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Xem chi tiết quy trình SOP"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDuplicateSop(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép / Nhân bản SOP"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSop(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa SOP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSop(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa SOP"
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
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">STT</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[130px]">Mã phiếu &amp; Loại</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[230px]">Tên SOP đăng ký / Đề xuất</th>
                  <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[135px]">Đơn vị &amp; Người gửi</th>
                  <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[220px]">Lý do &amp; Nội dung đề xuất</th>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 min-w-[95px]">Ưu tiên / Hạn</th>
                  <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 min-w-[135px]">Trạng thái</th>
                  <th className="py-2.5 px-2.5 text-center min-w-[140px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRegs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Chưa có phiếu đăng ký SOP nào. Nhấn <strong>&ldquo;+ Đăng ký / Đề xuất SOP&rdquo;</strong> để tạo mới.
                    </td>
                  </tr>
                ) : (
                  filteredRegs.map((reg, idx) => (
                    <tr key={reg.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#1e3c72]">{reg.maYeuCau}</div>
                        <span
                          className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            REG_TYPE_LABELS[reg.loaiDeXuat].cls
                          }`}
                        >
                          {REG_TYPE_LABELS[reg.loaiDeXuat].label}
                        </span>
                        {reg.maSopLienQuan && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Ref: {reg.maSopLienQuan}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100">
                        <div className="font-bold text-slate-900">{reg.tenSopDeXuat}</div>
                        <span
                          className={`inline-flex mt-1 px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                            SOP_CATEGORY_BADGE[reg.nhomNghiepVu]
                          }`}
                        >
                          {SOP_CATEGORY_LABELS[reg.nhomNghiepVu]}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 border-r border-slate-100">
                        <div className="font-semibold text-slate-800">{reg.nguoiDeXuat}</div>
                        <div className="text-[11px] text-slate-500">{reg.donViDeXuat}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{reg.ngayDeXuat}</div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 text-[11px] text-slate-600 max-w-[260px]">
                        <div className="font-semibold text-slate-800">Lý do: {reg.lyDoDeXuat}</div>
                        <p className="mt-0.5 line-clamp-2 text-slate-600">{reg.noiDungDeXuat}</p>
                      </td>
                      <td className="py-3 px-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            PRIORITY_META[reg.mucDoUuTien].cls
                          }`}
                        >
                          {PRIORITY_META[reg.mucDoUuTien].label}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Áp dụng: {reg.ngayMongMuonApDung || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <select
                          value={reg.trangThai}
                          onChange={(e) =>
                            void handleQuickStatusReg(reg, e.target.value as SopRegistrationStatus)
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border outline-none cursor-pointer ${
                            REG_STATUS_META[reg.trangThai].cls
                          }`}
                        >
                          {(Object.keys(REG_STATUS_META) as SopRegistrationStatus[]).map((st) => (
                            <option key={st} value={st}>
                              {REG_STATUS_META[st].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {reg.trangThai !== 'tu_choi' && (
                            <button
                              type="button"
                              onClick={() => void handlePublishRegToSop(reg)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Phê duyệt & Ban hành ngay vào Danh mục SOP"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDuplicateReg(reg)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                            title="Sao chép / Nhân bản phiếu"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditReg(reg)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Chỉnh sửa phiếu"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteReg(reg)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa phiếu"
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

      {/* SOP DETAIL MODAL */}
      {viewingSop && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#1e3c72] to-[#1a73e8] text-white px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/20 font-mono text-xs font-bold">
                    {viewingSop.maSop}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-400/20 text-teal-200 font-mono text-xs font-bold">
                    {viewingSop.phienBan}
                  </span>
                  <span className="text-xs text-blue-100">
                    Hiệu lực từ: {viewingSop.ngayHieuLuc}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold mt-1.5">{viewingSop.tenSop}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSop(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Nhóm nghiệp vụ:</span>{' '}
                  <strong className="text-slate-900">{SOP_CATEGORY_LABELS[viewingSop.nhomNghiepVu]}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Bộ phận ban hành:</span>{' '}
                  <strong className="text-slate-900">{viewingSop.boPhanBanHanh}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Người biên soạn:</span>{' '}
                  <strong className="text-slate-900">{viewingSop.nguoiBienSoan}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Người phê duyệt:</span>{' '}
                  <strong className="text-slate-900">{viewingSop.nguoiPheDuyet}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Đối tượng áp dụng:</span>{' '}
                  <strong className="text-slate-900">{viewingSop.doiTuongApDung}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#1e3c72] mb-1">1. Mục đích &amp; Phạm vi</h4>
                <p className="text-slate-700 leading-relaxed">{viewingSop.mucDich}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#1e3c72] mb-1.5">2. Các bước thực hiện chuẩn</h4>
                <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-2">
                  {viewingSop.cacBuocThucHien.split('\n').map((line, i) => (
                    <div key={i} className="leading-relaxed text-slate-800">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {viewingSop.bieuMauDinhKem && (
                <div>
                  <h4 className="font-bold text-[#1e3c72] mb-1">3. Biểu mẫu đính kèm</h4>
                  <p className="text-blue-800 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 text-xs font-medium">
                    {viewingSop.bieuMauDinhKem}
                  </p>
                </div>
              )}

              {viewingSop.ghiChu && (
                <div className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">
                  Ghi chú: {viewingSop.ghiChu}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleOpenAddReg(viewingSop)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Đề xuất sửa đổi SOP này</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingSop;
                    setViewingSop(null);
                    handleOpenEditSop(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={() => setViewingSop(null)}
                  className="px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SOP MODAL */}
      {sopModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-[#1e3c72] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSopId ? 'Chỉnh sửa Quy trình SOP Nhân sự' : 'Thêm Quy trình SOP Nhân sự Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setSopModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSop} className="p-5 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã SOP *</label>
                  <input
                    required
                    value={sopForm.maSop}
                    onChange={(e) => setSopForm({ ...sopForm, maSop: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    placeholder="VD: SOP-HR-TD-07"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phiên bản</label>
                  <input
                    value={sopForm.phienBan}
                    onChange={(e) => setSopForm({ ...sopForm, phienBan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    placeholder="v1.0"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={sopForm.trangThai}
                    onChange={(e) => setSopForm({ ...sopForm, trangThai: e.target.value as HrSopStatus })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {(Object.keys(SOP_STATUS_META) as HrSopStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {SOP_STATUS_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên quy trình SOP *</label>
                <input
                  required
                  value={sopForm.tenSop}
                  onChange={(e) => setSopForm({ ...sopForm, tenSop: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Nhập tên đầy đủ của quy trình SOP..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhóm nghiệp vụ</label>
                  <select
                    value={sopForm.nhomNghiepVu}
                    onChange={(e) => setSopForm({ ...sopForm, nhomNghiepVu: e.target.value as HrSopCategory })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {(Object.keys(SOP_CATEGORY_LABELS) as HrSopCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {SOP_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bộ phận ban hành</label>
                  <input
                    value={sopForm.boPhanBanHanh}
                    onChange={(e) => setSopForm({ ...sopForm, boPhanBanHanh: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày hiệu lực</label>
                  <input
                    type="date"
                    value={sopForm.ngayHieuLuc}
                    onChange={(e) => setSopForm({ ...sopForm, ngayHieuLuc: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đối tượng áp dụng</label>
                <input
                  value={sopForm.doiTuongApDung}
                  onChange={(e) => setSopForm({ ...sopForm, doiTuongApDung: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục đích</label>
                <textarea
                  rows={2}
                  value={sopForm.mucDich}
                  onChange={(e) => setSopForm({ ...sopForm, mucDich: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tóm tắt nội dung</label>
                <textarea
                  rows={2}
                  value={sopForm.noiDungTomTat}
                  onChange={(e) => setSopForm({ ...sopForm, noiDungTomTat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Các bước thực hiện chi tiết (mỗi bước 1 dòng)
                </label>
                <textarea
                  rows={5}
                  value={sopForm.cacBuocThucHien}
                  onChange={(e) => setSopForm({ ...sopForm, cacBuocThucHien: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biểu mẫu đính kèm</label>
                  <input
                    value={sopForm.bieuMauDinhKem || ''}
                    onChange={(e) => setSopForm({ ...sopForm, bieuMauDinhKem: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    placeholder="VD: BM-TD-01, BM-TD-02..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                  <input
                    value={sopForm.ghiChu || ''}
                    onChange={(e) => setSopForm({ ...sopForm, ghiChu: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSopModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Lưu SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT REGISTRATION MODAL */}
      {regModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-[#1e3c72] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-300" />
                <span>
                  {editingRegId ? 'Cập nhật Phiếu Đăng ký SOP' : 'Đăng ký / Đề xuất Ban hành hoặc Sửa đổi SOP'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setRegModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveReg} className="p-5 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã phiếu</label>
                  <input
                    value={regForm.maYeuCau}
                    onChange={(e) => setRegForm({ ...regForm, maYeuCau: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại đề xuất</label>
                  <select
                    value={regForm.loaiDeXuat}
                    onChange={(e) =>
                      setRegForm({ ...regForm, loaiDeXuat: e.target.value as SopRegistrationType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ban_hanh_moi">Ban hành mới</option>
                    <option value="sua_doi">Sửa đổi / Cập nhật</option>
                    <option value="huy_bo">Đề xuất hủy bỏ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã SOP liên quan (nếu có)</label>
                  <input
                    value={regForm.maSopLienQuan || ''}
                    onChange={(e) => setRegForm({ ...regForm, maSopLienQuan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    placeholder="VD: SOP-HR-TD-01"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên SOP đề xuất *</label>
                <input
                  required
                  value={regForm.tenSopDeXuat}
                  onChange={(e) => setRegForm({ ...regForm, tenSopDeXuat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Nhập tên quy trình cần ban hành mới hoặc sửa đổi..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhóm nghiệp vụ</label>
                  <select
                    value={regForm.nhomNghiepVu}
                    onChange={(e) =>
                      setRegForm({ ...regForm, nhomNghiepVu: e.target.value as HrSopCategory })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {(Object.keys(SOP_CATEGORY_LABELS) as HrSopCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {SOP_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={regForm.mucDoUuTien}
                    onChange={(e) =>
                      setRegForm({ ...regForm, mucDoUuTien: e.target.value as SopPriorityLevel })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="binh_thuong">Bình thường</option>
                    <option value="gap">Gấp</option>
                    <option value="khan_cap">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày mong muốn áp dụng</label>
                  <input
                    type="date"
                    value={regForm.ngayMongMuonApDung}
                    onChange={(e) => setRegForm({ ...regForm, ngayMongMuonApDung: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn vị đề xuất</label>
                  <input
                    value={regForm.donViDeXuat}
                    onChange={(e) => setRegForm({ ...regForm, donViDeXuat: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người đề xuất</label>
                  <input
                    value={regForm.nguoiDeXuat}
                    onChange={(e) => setRegForm({ ...regForm, nguoiDeXuat: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do / Mục tiêu đề xuất *</label>
                <textarea
                  required
                  rows={2}
                  value={regForm.lyDoDeXuat}
                  onChange={(e) => setRegForm({ ...regForm, lyDoDeXuat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Nêu rõ vấn đề thực tế hoặc yêu cầu quản trị cần chuẩn hóa..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung quy trình / Các điểm sửa đổi dự kiến
                </label>
                <textarea
                  rows={4}
                  value={regForm.noiDungDeXuat}
                  onChange={(e) => setRegForm({ ...regForm, noiDungDeXuat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Mô tả tóm tắt các bước thực hiện hoặc điểm cần điều chỉnh..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRegModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Gửi Đăng Ký SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
