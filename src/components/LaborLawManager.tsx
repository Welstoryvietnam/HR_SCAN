import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  ShieldCheck,
  Search,
  Plus,
  Download,
  X,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import {
  UserProfile,
  LaborLawSubTab,
  LaborLawTopic,
  LaborLawDocumentItem,
} from '../types';
import {
  DEFAULT_LABOR_LAW_ITEMS,
  DEFAULT_INTERNAL_REGULATION_ITEMS,
} from '../data/hrKnowledgeDefaults';
import { safeFetchJson } from '../utils/apiHelper';

export interface LaborLawCounts {
  luat_lao_dong: number;
  noi_quy_lao_dong: number;
}

interface LaborLawManagerProps {
  currentUser: UserProfile;
  activeSubTab?: LaborLawSubTab;
  onSubTabChange?: (tab: LaborLawSubTab) => void;
  onCountsChange?: (counts: LaborLawCounts) => void;
}

const TOPIC_LABELS: Record<LaborLawTopic, string> = {
  hop_dong_lao_dong: 'Hợp đồng & Thử việc',
  thoi_gio_lam_viec: 'Thời giờ & Tăng ca',
  tien_luong_thuong: 'Tiền lương & Thưởng',
  ky_luat_lao_dong: 'Kỷ luật & Sa thải',
  bhxh_thai_san: 'BHXH & Thai sản',
  an_toan_vsld: 'ATVSLĐ & Y tế',
  nghi_phep_nghi_viec: 'Nghỉ phép & Nghỉ việc',
  quy_dinh_chung: 'Quy định & Bảo mật',
};

const TOPIC_BADGE: Record<LaborLawTopic, string> = {
  hop_dong_lao_dong: 'bg-blue-50 text-blue-700 border-blue-200',
  thoi_gio_lam_viec: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  tien_luong_thuong: 'bg-amber-50 text-amber-800 border-amber-200',
  ky_luat_lao_dong: 'bg-rose-50 text-rose-700 border-rose-200',
  bhxh_thai_san: 'bg-pink-50 text-pink-700 border-pink-200',
  an_toan_vsld: 'bg-teal-50 text-teal-700 border-teal-200',
  nghi_phep_nghi_viec: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  quy_dinh_chung: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_META = {
  dang_hieu_luc: { label: 'Đang hiệu lực', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sap_ap_dung: { label: 'Sắp áp dụng', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  het_hieu_luc: { label: 'Hết hiệu lực', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const QUICK_TAGS_LAW = ['145/2020/NĐ-CP', 'thử việc', 'tăng ca', 'phép năm', 'báo trước', 'sa thải', 'thai sản', 'hành kinh'];
const QUICK_TAGS_NQLD = ['145/2020/NĐ-CP', 'quấy rối tình dục', 'chấm công', 'ATVSTP', 'khám sức khỏe', 'kỷ luật', 'lao động nữ'];

const LS_LAW = 'hr_knowledge_v1_luat_lao_dong';
const LS_NQLD = 'hr_knowledge_v1_noi_quy_lao_dong';

function loadLocal<T extends { id: string }>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const ids = new Set(parsed.map((x: any) => x?.id));
        const missing = fallback.filter((f) => !ids.has(f.id));
        return missing.length > 0 ? [...parsed, ...missing] : parsed;
      }
    }
  } catch {}
  return fallback;
}

export const LaborLawManager: React.FC<LaborLawManagerProps> = ({
  currentUser,
  activeSubTab: controlledSubTab,
  onSubTabChange,
  onCountsChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<LaborLawSubTab>('luat_lao_dong');
  const activeSubTab = controlledSubTab ?? internalSubTab;
  const setActiveSubTab = (t: LaborLawSubTab) => {
    setInternalSubTab(t);
    onSubTabChange?.(t);
  };

  const [lawList, setLawList] = useState<LaborLawDocumentItem[]>(() =>
    loadLocal<LaborLawDocumentItem>(LS_LAW, DEFAULT_LABOR_LAW_ITEMS)
  );
  const [nqldList, setNqldList] = useState<LaborLawDocumentItem[]>(() =>
    loadLocal<LaborLawDocumentItem>(LS_NQLD, DEFAULT_INTERNAL_REGULATION_ITEMS)
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Toast & Copy indicator
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Detail & Form modal
  const [viewingItem, setViewingItem] = useState<LaborLawDocumentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = (tab: LaborLawSubTab): Omit<LaborLawDocumentItem, 'id'> => ({
    loaiVanBan: tab,
    soDieu: tab === 'luat_lao_dong' ? 'Điều ... – BLLĐ 2019' : 'NQLĐ – Chương ...',
    tieuDe: '',
    nguonVanBan:
      tab === 'luat_lao_dong'
        ? 'Bộ luật Lao động số 45/2019/QH14'
        : 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'quy_dinh_chung',
    tomTatCotLoi: '',
    noiDungChiTiet: '',
    luuYApDungThucTe: '',
    ngayHieuLuc: tab === 'luat_lao_dong' ? '2021-01-01' : '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '',
    nguoiCapNhat: currentUser.name || currentUser.email,
  });

  const [form, setForm] = useState<Omit<LaborLawDocumentItem, 'id'>>(() => emptyForm('luat_lao_dong'));

  // Load from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await safeFetchJson<{
          success: boolean;
          data?: {
            luat_lao_dong?: LaborLawDocumentItem[];
            noi_quy_lao_dong?: LaborLawDocumentItem[];
          };
        }>('/api/hr-knowledge/all');
        if (mounted && res.ok && res.data?.data) {
          const l =
            Array.isArray(res.data.data.luat_lao_dong) && res.data.data.luat_lao_dong.length > 0
              ? res.data.data.luat_lao_dong
              : DEFAULT_LABOR_LAW_ITEMS;
          const n =
            Array.isArray(res.data.data.noi_quy_lao_dong) && res.data.data.noi_quy_lao_dong.length > 0
              ? res.data.data.noi_quy_lao_dong
              : DEFAULT_INTERNAL_REGULATION_ITEMS;
          setLawList(l);
          setNqldList(n);
          try {
            localStorage.setItem(LS_LAW, JSON.stringify(l));
            localStorage.setItem(LS_NQLD, JSON.stringify(n));
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
      luat_lao_dong: lawList.length,
      noi_quy_lao_dong: nqldList.length,
    });
  }, [lawList.length, nqldList.length, onCountsChange]);

  useEffect(() => {
    setSearchQuery('');
    setFilterTopic('ALL');
    setFilterStatus('ALL');
  }, [activeSubTab]);

  const currentList = activeSubTab === 'luat_lao_dong' ? lawList : nqldList;
  const setCurrentList = (next: LaborLawDocumentItem[]) => {
    if (activeSubTab === 'luat_lao_dong') {
      setLawList(next);
      try {
        localStorage.setItem(LS_LAW, JSON.stringify(next));
      } catch {}
    } else {
      setNqldList(next);
      try {
        localStorage.setItem(LS_NQLD, JSON.stringify(next));
      } catch {}
    }
  };

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return currentList.filter((item) => {
      if (filterTopic !== 'ALL' && item.chuyenDe !== filterTopic) return false;
      if (filterStatus !== 'ALL' && item.trangThai !== filterStatus) return false;
      if (!q) return true;
      return [
        item.soDieu,
        item.tieuDe,
        item.nguonVanBan,
        item.tomTatCotLoi,
        item.noiDungChiTiet,
        item.luuYApDungThucTe || '',
        item.tuKhoa || '',
        TOPIC_LABELS[item.chuyenDe],
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [currentList, searchQuery, filterTopic, filterStatus]);

  const kpi = useMemo(() => {
    const activeCount = currentList.filter((x) => x.trangThai === 'dang_hieu_luc').length;
    const byTopic: Record<string, number> = {};
    currentList.forEach((x) => {
      byTopic[x.chuyenDe] = (byTopic[x.chuyenDe] || 0) + 1;
    });
    return { activeCount, byTopic };
  }, [currentList]);

  // CRUD
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm(activeSubTab));
    setModalOpen(true);
  };

  const handleOpenEdit = (item: LaborLawDocumentItem) => {
    setEditingId(item.id);
    const { id: _id, ...rest } = item;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.soDieu.trim() || !form.tieuDe.trim() || !form.tomTatCotLoi.trim()) {
      showToast('error', 'Vui lòng nhập Số điều, Tiêu đề và Tóm tắt cốt lõi.');
      return;
    }
    const payload: LaborLawDocumentItem = {
      ...form,
      loaiVanBan: activeSubTab,
      id: editingId || `${activeSubTab}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      capNhatLuc: new Date().toISOString(),
    };
    const nextList = editingId
      ? currentList.map((x) => (x.id === editingId ? payload : x))
      : [payload, ...currentList];
    setCurrentList(nextList);
    setModalOpen(false);
    try {
      const res = await safeFetchJson<{ success: boolean; list?: LaborLawDocumentItem[] }>(
        `/api/hr-knowledge/${activeSubTab}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok && res.data?.list) {
        setCurrentList(res.data.list);
      }
      showToast('success', editingId ? 'Đã cập nhật điều khoản thành công!' : 'Đã thêm điều khoản mới!');
    } catch {
      showToast('info', 'Đã lưu vào bộ nhớ trình duyệt.');
    }
  };

  const handleDuplicate = async (item: LaborLawDocumentItem) => {
    const dup: LaborLawDocumentItem = {
      ...item,
      id: `${activeSubTab}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      soDieu: `${item.soDieu} (Bản sao)`,
      tieuDe: `${item.tieuDe} (Bản sao)`,
      capNhatLuc: new Date().toISOString(),
    };
    const next = [dup, ...currentList];
    setCurrentList(next);
    try {
      await safeFetchJson(`/api/hr-knowledge/${activeSubTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dup),
      });
      showToast('success', 'Đã sao chép nhân bản điều khoản thành công!');
    } catch {
      showToast('info', 'Đã nhân bản vào bộ nhớ tạm.');
    }
  };

  const handleCopyCitation = async (item: LaborLawDocumentItem) => {
    const text = `[${item.soDieu} - ${item.nguonVanBan}]\n${item.tieuDe}\n\nTóm tắt: ${item.tomTatCotLoi}\n\nChi tiết:\n${item.noiDungChiTiet}${
      item.luuYApDungThucTe ? `\n\nLưu ý áp dụng tại Công ty: ${item.luuYApDungThucTe}` : ''
    }`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      showToast('success', `Đã sao chép trích dẫn "${item.soDieu}" vào bộ nhớ tạm!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('error', 'Không thể sao chép tự động.');
    }
  };

  const handleDelete = async (item: LaborLawDocumentItem) => {
    if (!window.confirm(`Xóa điều khoản "${item.soDieu} - ${item.tieuDe}"?`)) return;
    const next = currentList.filter((x) => x.id !== item.id);
    setCurrentList(next);
    try {
      await safeFetchJson(`/api/hr-knowledge/${activeSubTab}/${item.id}`, { method: 'DELETE' });
      showToast('success', `Đã xóa "${item.soDieu}".`);
    } catch {
      showToast('info', `Đã xóa "${item.soDieu}" khỏi bộ nhớ cục bộ.`);
    }
  };

  const handleResetDefaults = async () => {
    const defaults =
      activeSubTab === 'luat_lao_dong'
        ? DEFAULT_LABOR_LAW_ITEMS
        : DEFAULT_INTERNAL_REGULATION_ITEMS;
    if (
      !window.confirm(
        activeSubTab === 'luat_lao_dong'
          ? 'Khôi phục bộ điều khoản Bộ luật Lao động 2019 chuẩn mặc định?'
          : 'Khôi phục bộ Nội quy Lao động Công ty chuẩn mặc định?'
      )
    ) {
      return;
    }
    setCurrentList(defaults);
    try {
      await safeFetchJson(`/api/hr-knowledge/${activeSubTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: defaults }),
      });
    } catch {}
    showToast('success', 'Đã khôi phục dữ liệu chuẩn mặc định!');
  };

  const handleExportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'STT',
      'Số Điều / Chương',
      'Tiêu đề',
      'Nguồn văn bản',
      'Chuyên đề',
      'Tóm tắt cốt lõi',
      'Lưu ý áp dụng thực tế',
      'Ngày hiệu lực',
      'Trạng thái',
    ];
    const rows = filteredList.map((item, idx) => [
      String(idx + 1),
      item.soDieu,
      item.tieuDe,
      item.nguonVanBan,
      TOPIC_LABELS[item.chuyenDe],
      item.tomTatCotLoi,
      item.luuYApDungThucTe || '',
      item.ngayHieuLuc,
      STATUS_META[item.trangThai].label,
    ]);
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename =
      activeSubTab === 'luat_lao_dong'
        ? `Tra_Cuu_Luat_Lao_Dong_${new Date().toISOString().slice(0, 10)}.csv`
        : `Noi_Quy_Lao_Dong_Cong_Ty_${new Date().toISOString().slice(0, 10)}.csv`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Đã xuất file ${filename}!`);
  };

  const quickTags = activeSubTab === 'luat_lao_dong' ? QUICK_TAGS_LAW : QUICK_TAGS_NQLD;

  return (
    <div className="space-y-4 animate-fade-in">
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
              HỆ THỐNG TRA CỨU LUẬT LAO ĐỘNG &amp; NỘI QUY LAO ĐỘNG
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
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>
                {activeSubTab === 'luat_lao_dong'
                  ? '+ Thêm Điều khoản Luật LĐ'
                  : '+ Thêm Quy định Nội quy LĐ'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('luat_lao_dong')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'luat_lao_dong'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>1. Tra cứu Luật Lao động</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeSubTab === 'luat_lao_dong'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {lawList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('noi_quy_lao_dong')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeSubTab === 'noi_quy_lao_dong'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>2. Nội quy Lao động Công ty</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeSubTab === 'noi_quy_lao_dong'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {nqldList.length}
          </span>
        </button>
      </div>

      {/* 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {activeSubTab === 'luat_lao_dong' ? 'Điều Khoản Luật LĐ' : 'Chương / Điều NQLĐ'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{currentList.length}</span>
            <span className="text-xs text-slate-500">
              mục (Đang hiển thị:{' '}
              <strong className="text-[#1a73e8] tabular-nums">{filteredList.length}</strong>)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Đang hiệu lực: {kpi.activeCount}</span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" /> Mặc định
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chuyên Đề Tra Cứu Nhanh
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(TOPIC_LABELS) as LaborLawTopic[]).map((topic) => {
              const count = kpi.byTopic[topic] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setFilterTopic(filterTopic === topic ? 'ALL' : topic)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition ${
                    filterTopic === topic
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{TOPIC_LABELS[topic]}</span>
                  <span className="font-bold tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-1.5 text-[11px] text-slate-400">Nhấn vào chuyên đề để lọc nhanh</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Từ Khóa Phổ Biến
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition ${
                  searchQuery === tag
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
          <div className="mt-2 pt-1.5 text-[11px] text-slate-400">Chạm để tra cứu tức thì</div>
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
                activeSubTab === 'luat_lao_dong'
                  ? 'Tra cứu theo số điều (VD: Điều 98, Điều 125), từ khóa (thử việc, tăng ca, phép năm, sa thải)...'
                  : 'Tra cứu Nội quy LĐ theo chương, từ khóa (chấm công, ATVSTP, đồng phục, kỷ luật, bảo mật)...'
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
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:border-[#1a73e8] outline-none"
            >
              <option value="ALL">Tất cả Chuyên đề</option>
              {(Object.keys(TOPIC_LABELS) as LaborLawTopic[]).map((t) => (
                <option key={t} value={t}>
                  {TOPIC_LABELS[t]}
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
              <option value="ALL">Tất cả Trạng thái hiệu lực</option>
              <option value="dang_hieu_luc">Đang hiệu lực</option>
              <option value="sap_ap_dung">Sắp áp dụng</option>
              <option value="het_hieu_luc">Hết hiệu lực</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1a73e8]" />
            <span className="font-semibold text-slate-800">
              {activeSubTab === 'luat_lao_dong'
                ? `Danh mục Điều khoản Bộ luật Lao động & Văn bản hướng dẫn (${filteredList.length} / ${lawList.length})`
                : `Danh mục Quy định Nội quy Lao động Công ty (${filteredList.length} / ${nqldList.length})`}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Nhấn vào dòng bất kỳ để đọc toàn văn điều khoản &amp; lưu ý áp dụng thực tế
          </span>
        </div>

        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#1e3c72] text-white sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 w-10">STT</th>
                <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[155px]">Số Điều / Chương</th>
                <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[220px]">Tiêu đề quy định</th>
                <th className="py-2.5 px-2.5 border-r border-blue-800/60 min-w-[135px]">Chuyên đề</th>
                <th className="py-2.5 px-3 border-r border-blue-800/60 min-w-[280px]">Tóm tắt nội dung cốt lõi</th>
                <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 min-w-[95px]">Hiệu lực</th>
                <th className="py-2.5 px-2.5 text-center border-r border-blue-800/60 min-w-[105px]">Trạng thái</th>
                <th className="py-2.5 px-2.5 text-center min-w-[125px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Không tìm thấy điều khoản nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setViewingItem(item)}
                    className="hover:bg-blue-50/50 transition cursor-pointer"
                  >
                    <td className="py-3 px-2.5 text-center font-mono text-slate-500 border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100">
                      <div className="font-bold text-[#1e3c72]">{item.soDieu}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.nguonVanBan}</div>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100">
                      <div className="font-bold text-slate-900">{item.tieuDe}</div>
                      {item.luuYApDungThucTe && (
                        <div className="text-[10px] text-amber-700 mt-0.5 line-clamp-1">
                          Lưu ý HR: {item.luuYApDungThucTe}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          TOPIC_BADGE[item.chuyenDe]
                        }`}
                      >
                        {TOPIC_LABELS[item.chuyenDe]}
                      </span>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100 text-[11px] text-slate-700 leading-relaxed max-w-[340px]">
                      <p className="line-clamp-3">{item.tomTatCotLoi}</p>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      {item.ngayHieuLuc}
                    </td>
                    <td className="py-3 px-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          STATUS_META[item.trangThai].cls
                        }`}
                      >
                        {STATUS_META[item.trangThai].label}
                      </span>
                    </td>
                    <td
                      className="py-2.5 px-2 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingItem(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Đọc chi tiết điều khoản"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyCitation(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 transition cursor-pointer"
                          title="Sao chép trích dẫn điều khoản"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                          title="Chỉnh sửa điều khoản"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa điều khoản"
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
        </div>
      </div>

      {/* DETAIL MODAL */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#1e3c72] to-[#1a73e8] text-white px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-white/20 text-xs font-bold">
                    {viewingItem.soDieu}
                  </span>
                  <span className="text-xs text-blue-100">{viewingItem.nguonVanBan}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold mt-1.5">{viewingItem.tieuDe}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                <div className="text-[11px] font-bold uppercase text-blue-800 mb-1">
                  Tóm tắt nội dung cốt lõi
                </div>
                <p className="text-slate-900 font-medium leading-relaxed">{viewingItem.tomTatCotLoi}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#1e3c72] mb-1.5">Nội dung chi tiết điều khoản</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 leading-relaxed whitespace-pre-line text-slate-800">
                  {viewingItem.noiDungChiTiet}
                </div>
              </div>

              {viewingItem.luuYApDungThucTe && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="text-[11px] font-bold uppercase text-amber-800 mb-1">
                    Lưu ý áp dụng thực tế tại Công ty (HR / Quản lý điểm)
                  </div>
                  <p className="text-amber-950 leading-relaxed">{viewingItem.luuYApDungThucTe}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                <span>
                  Chuyên đề: <strong>{TOPIC_LABELS[viewingItem.chuyenDe]}</strong> &bull; Hiệu lực từ:{' '}
                  <strong>{viewingItem.ngayHieuLuc}</strong>
                </span>
                {viewingItem.tuKhoa && <span>Từ khóa: {viewingItem.tuKhoa}</span>}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyCitation(viewingItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Sao chép trích dẫn
                </button>
                <button
                  type="button"
                  onClick={() => void handleDuplicate(viewingItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Nhân bản
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingItem;
                    setViewingItem(null);
                    handleOpenEdit(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-[#1e3c72] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingId
                  ? 'Chỉnh sửa Điều khoản / Quy định'
                  : activeSubTab === 'luat_lao_dong'
                  ? 'Thêm Điều khoản Luật Lao động Mới'
                  : 'Thêm Quy định Nội quy Lao động Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Điều / Chương *</label>
                  <input
                    required
                    value={form.soDieu}
                    onChange={(e) => setForm({ ...form, soDieu: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    placeholder="VD: Điều 107 – BLLĐ 2019"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nguồn văn bản</label>
                  <input
                    value={form.nguonVanBan}
                    onChange={(e) => setForm({ ...form, nguonVanBan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề điều khoản *</label>
                <input
                  required
                  value={form.tieuDe}
                  onChange={(e) => setForm({ ...form, tieuDe: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Nhập tiêu đề ngắn gọn, dễ tra cứu..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chuyên đề</label>
                  <select
                    value={form.chuyenDe}
                    onChange={(e) => setForm({ ...form, chuyenDe: e.target.value as LaborLawTopic })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {(Object.keys(TOPIC_LABELS) as LaborLawTopic[]).map((t) => (
                      <option key={t} value={t}>
                        {TOPIC_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày hiệu lực</label>
                  <input
                    type="date"
                    value={form.ngayHieuLuc}
                    onChange={(e) => setForm({ ...form, ngayHieuLuc: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={form.trangThai}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        trangThai: e.target.value as LaborLawDocumentItem['trangThai'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="dang_hieu_luc">Đang hiệu lực</option>
                    <option value="sap_ap_dung">Sắp áp dụng</option>
                    <option value="het_hieu_luc">Hết hiệu lực</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tóm tắt nội dung cốt lõi *</label>
                <textarea
                  required
                  rows={2}
                  value={form.tomTatCotLoi}
                  onChange={(e) => setForm({ ...form, tomTatCotLoi: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết điều khoản</label>
                <textarea
                  rows={5}
                  value={form.noiDungChiTiet}
                  onChange={(e) => setForm({ ...form, noiDungChiTiet: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lưu ý áp dụng thực tế tại Công ty
                </label>
                <textarea
                  rows={2}
                  value={form.luuYApDungThucTe || ''}
                  onChange={(e) => setForm({ ...form, luuYApDungThucTe: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Từ khóa tra cứu (cách nhau dấu phẩy)</label>
                <input
                  value={form.tuKhoa || ''}
                  onChange={(e) => setForm({ ...form, tuKhoa: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="VD: thử việc, 60 ngày, 85% lương..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Lưu Điều Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
