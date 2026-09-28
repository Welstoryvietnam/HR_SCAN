import React, { useState, useMemo } from 'react';
import { TieuChuanLuongItem, UserProfile } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  DollarSign,
  Check,
  AlertCircle,
  X,
  Briefcase,
  Search,
  Filter,
  Download,
  Coins,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { DEFAULT_JOB_POSITIONS } from '../data/jobPositionHierarchy';

interface TieuChuanLuongManagerProps {
  standards: TieuChuanLuongItem[];
  currentUser: UserProfile;
  onSaveStandard: (item: Partial<TieuChuanLuongItem>) => Promise<void>;
  onDeleteStandard: (id: string) => Promise<void>;
}

export const TieuChuanLuongManager: React.FC<TieuChuanLuongManagerProps> = ({
  standards,
  currentUser,
  onSaveStandard,
  onDeleteStandard,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states cho từng loại phụ cấp
  const [congViec, setCongViec] = useState('Đầu Bếp');
  const [chucVu, setChucVu] = useState('');
  const [luongCoBan, setLuongCoBan] = useState<number>(5447000);
  const [phuCapChucVu, setPhuCapChucVu] = useState<number>(0);
  const [phuCapDienThoai, setPhuCapDienThoai] = useState<number>(0);
  const [troCapTayNghe, setTroCapTayNghe] = useState<number>(0);
  const [troCapGiaDinh, setTroCapGiaDinh] = useState<number>(150000);
  const [thuongChuyenCan, setThuongChuyenCan] = useState<number>(200000);
  const [thuongSangKien, setThuongSangKien] = useState<number>(200000);
  const [phuCapMoiTruong, setPhuCapMoiTruong] = useState<string>('Thủ công');
  const [phuCapXangXe, setPhuCapXangXe] = useState<string>('Thủ công');
  const [anToanVeSinhVien, setAnToanVeSinhVien] = useState<string>('Thủ công');
  const [phuCapKinhDoanh, setPhuCapKinhDoanh] = useState<string>('Thủ công');
  const [phuCapNangNhoc, setPhuCapNangNhoc] = useState<string>('Thủ công');
  const [moTa, setMoTa] = useState('');
  const [saving, setSaving] = useState(false);

  // Bộ lọc & tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');

  const isAdmin = currentUser.role === 'admin';

  // Tính toán phụ cấp cố định tự động trong Form
  const formComputedPhuCapCoDinh = useMemo(() => {
    return (
      (Number(phuCapChucVu) || 0) +
      (Number(phuCapDienThoai) || 0) +
      (Number(troCapTayNghe) || 0) +
      (Number(troCapGiaDinh) || 0) +
      (Number(thuongChuyenCan) || 0) +
      (Number(thuongSangKien) || 0)
    );
  }, [phuCapChucVu, phuCapDienThoai, troCapTayNghe, troCapGiaDinh, thuongChuyenCan, thuongSangKien]);

  const formComputedTongThuNhap = useMemo(() => {
    return (Number(luongCoBan) || 0) + formComputedPhuCapCoDinh;
  }, [luongCoBan, formComputedPhuCapCoDinh]);

  // Danh sách công việc để lọc
  const jobCategories = useMemo(() => {
    const set = new Set<string>();
    standards.forEach((s) => {
      if (s.congViec) set.add(s.congViec);
    });
    return Array.from(set).sort();
  }, [standards]);

  // Lọc dữ liệu theo tìm kiếm & công việc
  const filteredStandards = useMemo(() => {
    return standards.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.chucVu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.congViec && item.congViec.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.moTa && item.moTa.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchJob =
        selectedJobFilter === 'ALL' || item.congViec === selectedJobFilter;

      return matchSearch && matchJob;
    });
  }, [standards, searchQuery, selectedJobFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = standards.length;
    const baseSalaries = standards.map((s) => s.luongCoBan).filter((n) => n > 0);
    const minBase = baseSalaries.length > 0 ? Math.min(...baseSalaries) : 0;
    const maxBase = baseSalaries.length > 0 ? Math.max(...baseSalaries) : 0;

    const fixedAllowances = standards.map((s) => s.phuCapCoDinh);
    const minAllowance = fixedAllowances.length > 0 ? Math.min(...fixedAllowances) : 0;
    const maxAllowance = fixedAllowances.length > 0 ? Math.max(...fixedAllowances) : 0;

    return { total, minBase, maxBase, minAllowance, maxAllowance };
  }, [standards]);

  const handleStartEdit = (item: TieuChuanLuongItem) => {
    if (!isAdmin) return;
    setEditingId(item.id);
    setCongViec(item.congViec || 'Công việc chuyên môn');
    setChucVu(item.chucVu);
    setLuongCoBan(item.luongCoBan);
    setPhuCapChucVu(item.phuCapChucVu || 0);
    setPhuCapDienThoai(item.phuCapDienThoai || 0);
    setTroCapTayNghe(item.troCapTayNghe || 0);
    setTroCapGiaDinh(item.troCapGiaDinh !== undefined ? item.troCapGiaDinh : 150000);
    setThuongChuyenCan(item.thuongChuyenCan !== undefined ? item.thuongChuyenCan : 200000);
    setThuongSangKien(item.thuongSangKien || 0);
    setPhuCapMoiTruong(String(item.phuCapMoiTruong || 'Thủ công'));
    setPhuCapXangXe(String(item.phuCapXangXe || 'Thủ công'));
    setAnToanVeSinhVien(String(item.anToanVeSinhVien || 'Thủ công'));
    setPhuCapKinhDoanh(String(item.phuCapKinhDoanh || 'Thủ công'));
    setPhuCapNangNhoc(String(item.phuCapNangNhoc || 'Thủ công'));
    setMoTa(item.moTa || '');
    setIsEditing(true);
  };

  const handleStartCreate = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setCongViec('Đầu Bếp');
    setChucVu('');
    setLuongCoBan(5447000);
    setPhuCapChucVu(0);
    setPhuCapDienThoai(0);
    setTroCapTayNghe(0);
    setTroCapGiaDinh(150000);
    setThuongChuyenCan(200000);
    setThuongSangKien(200000);
    setPhuCapMoiTruong('Thủ công');
    setPhuCapXangXe('Thủ công');
    setAnToanVeSinhVien('Thủ công');
    setPhuCapKinhDoanh('Thủ công');
    setPhuCapNangNhoc('Thủ công');
    setMoTa('');
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chucVu.trim()) {
      alert('Vui lòng nhập tên chức vụ');
      return;
    }

    setSaving(true);
    try {
      await onSaveStandard({
        id: editingId || undefined,
        congViec: congViec.trim(),
        chucVu: chucVu.trim(),
        luongCoBan: Number(luongCoBan) || 0,
        phuCapChucVu: Number(phuCapChucVu) || 0,
        phuCapDienThoai: Number(phuCapDienThoai) || 0,
        troCapTayNghe: Number(troCapTayNghe) || 0,
        troCapGiaDinh: Number(troCapGiaDinh) || 0,
        thuongChuyenCan: Number(thuongChuyenCan) || 0,
        thuongSangKien: Number(thuongSangKien) || 0,
        phuCapMoiTruong: (phuCapMoiTruong === 'Thủ công' ? 'Thủ công' : (Number(phuCapMoiTruong) || 'Thủ công')) as number | 'Thủ công',
        phuCapXangXe: (phuCapXangXe === 'Thủ công' ? 'Thủ công' : (Number(phuCapXangXe) || 'Thủ công')) as number | 'Thủ công',
        anToanVeSinhVien: (anToanVeSinhVien === 'Thủ công' ? 'Thủ công' : (Number(anToanVeSinhVien) || 'Thủ công')) as number | 'Thủ công',
        phuCapKinhDoanh: (phuCapKinhDoanh === 'Thủ công' ? 'Thủ công' : (Number(phuCapKinhDoanh) || 'Thủ công')) as number | 'Thủ công',
        phuCapNangNhoc: (phuCapNangNhoc === 'Thủ công' ? 'Thủ công' : (Number(phuCapNangNhoc) || 'Thủ công')) as number | 'Thủ công',
        phuCapCoDinh: formComputedPhuCapCoDinh,
        moTa: moTa.trim(),
      });
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      alert('Lỗi lưu tiêu chuẩn lương: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Xuất file CSV Sheet TieuChuanLuong với đầy đủ từng loại phụ cấp
  const handleExportCSV = () => {
    const headers = [
      'Mã Vị Trí',
      'Công Việc',
      'Chức Vụ',
      'Lương Cơ Bản (VNĐ)',
      'Phụ Cấp Chức Vụ (VNĐ)',
      'Phụ Cấp Điện Thoại (VNĐ)',
      'PC Môi Trường',
      'PC Xăng Xe',
      'An Toàn Vệ Sinh Viên',
      'PC Kinh Doanh',
      'PC Nặng Nhọc',
      'Trợ Cấp Tay Nghề (VNĐ)',
      'Trợ Cấp Gia Đình (VNĐ)',
      'Thưởng Chuyên Cần (VNĐ)',
      'Thưởng Sáng Kiến (VNĐ)',
      'Tổng Phụ Cấp Cố Định (VNĐ)',
      'Tổng Định Mức (Lương CB + PC Cố Định)',
      'Mô Tả / Ghi Chú'
    ];

    const rows = filteredStandards.map((item) => [
      `"${item.id}"`,
      `"${item.congViec || ''}"`,
      `"${item.chucVu}"`,
      item.luongCoBan,
      item.phuCapChucVu || 0,
      item.phuCapDienThoai || 0,
      `"${item.phuCapMoiTruong || 'Thủ công'}"`,
      `"${item.phuCapXangXe || 'Thủ công'}"`,
      `"${item.anToanVeSinhVien || 'Thủ công'}"`,
      `"${item.phuCapKinhDoanh || 'Thủ công'}"`,
      `"${item.phuCapNangNhoc || 'Thủ công'}"`,
      item.troCapTayNghe || 0,
      item.troCapGiaDinh || 0,
      item.thuongChuyenCan || 0,
      item.thuongSangKien || 0,
      item.phuCapCoDinh,
      item.luongCoBan + item.phuCapCoDinh,
      `"${(item.moTa || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sheet_TieuChuanLuong_TungLoaiPhuCap_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
      {/* Header & Quyền truy cập */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Sheet "TieuChuanLuong": Chi Tiết Từng Loại Phụ Cấp & Định Mức</span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  {standards.length} vị trí ban hành
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy chuẩn Lương cơ bản và bóc tách chi tiết <strong>từng loại phụ cấp</strong> (Chức vụ, Môi trường, ATVSV, Kinh doanh, Nặng nhọc, Tay nghề, Gia đình, Chuyên cần, Sáng kiến).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Xuất CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition"
            title="Tải bảng tiêu chuẩn chi tiết về máy tính định dạng Excel CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Xuất CSV Bảng Lương</span>
          </button>

          {/* Nút Thêm Mới Vị Trí (Dành cho Admin) */}
          {isAdmin && (
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Vị Trí Tiêu Chuẩn</span>
            </button>
          )}

          {isAdmin ? (
            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Admin Quản Trị</span>
            </span>
          ) : (
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-xl border border-slate-200">
              Chế độ xem
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <span className="text-[11px] text-slate-500 block">Số vị trí tiêu chuẩn</span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {stats.total} chức danh
          </span>
          <span className="text-[10px] text-blue-600 block mt-0.5">Thuộc 6 nhóm công việc</span>
        </div>

        <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
          <span className="text-[11px] text-blue-700 block">Dải Lương cơ bản</span>
          <span className="text-sm sm:text-base font-bold text-blue-950 font-mono">
            {stats.minBase.toLocaleString('vi-VN')} - {stats.maxBase.toLocaleString('vi-VN')}
          </span>
          <span className="text-[10px] text-blue-600 block mt-0.5">VNĐ/tháng theo vị trí</span>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl">
          <span className="text-[11px] text-emerald-700 block">Phụ cấp cố định chuẩn</span>
          <span className="text-sm sm:text-base font-bold text-emerald-950 font-mono">
            {stats.minAllowance.toLocaleString('vi-VN')} - {stats.maxAllowance.toLocaleString('vi-VN')}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Gồm 5 khoản phụ cấp thành phần</span>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
          <span className="text-[11px] text-amber-800 block">Phụ cấp điều kiện thực tế</span>
          <span className="text-sm sm:text-base font-bold text-amber-950 font-mono">
            4 loại thủ công
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">Môi trường, ATVSV, KD, Nặng nhọc</span>
        </div>
      </div>

      {/* Thông báo quyền nếu là nhân viên */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Bạn đang đăng nhập bằng tài khoản <strong>Nhân viên ({currentUser.email})</strong>. Dữ liệu Sheet "TieuChuanLuong" ở chế độ chỉ đọc. Chỉ tài khoản Quản trị viên (Admin) mới có quyền thêm hoặc chỉnh sửa định mức lương & phụ cấp.
          </span>
        </div>
      )}

      {/* Bộ Lọc & Tìm Kiếm & Chuyển Chế Độ Xem */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo chức vụ, công việc, mô tả..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Lọc theo Công việc */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium">Lọc công việc:</span>
          <button
            onClick={() => setSelectedJobFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              selectedJobFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả ({standards.length})
          </button>
          {jobCategories.map((job) => {
            const count = standards.filter((s) => s.congViec === job).length;
            return (
              <button
                key={job}
                onClick={() => setSelectedJobFilter(job)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedJobFilter === job
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {job} ({count})
              </button>
            );
          })}
        </div>

        {/* Chế độ xem cột */}
        <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-0.5 bg-white shrink-0">
          <button
            onClick={() => setViewMode('full')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
              viewMode === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Hiển thị từng cột phụ cấp riêng biệt"
          >
            Tất cả phụ cấp
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
              viewMode === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Xem tóm tắt thu gọn"
          >
            Xem cô đọng
          </button>
        </div>
      </div>

      {/* Modal / Inline Form Thêm/Chỉnh sửa Tiêu Chuẩn Lương & Phụ Cấp */}
      {isEditing && (
        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border-2 border-blue-300 rounded-xl space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                {editingId ? `Cập Nhật Định Mức Vị Trí: ${chucVu}` : 'Thêm Vị Trí Tiêu Chuẩn & Cấu Hình Phụ Cấp Mới'}
              </h3>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nhóm Thông tin Vị trí & Lương cơ bản */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Nhóm Công Việc <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={congViec}
                    onChange={(e) => setCongViec(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    {DEFAULT_JOB_POSITIONS.map((j) => (
                      <option key={j.id} value={j.name}>
                        {j.name}
                      </option>
                    ))}
                    <option value="Khác">Khác (Tự nhập)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Chức Vụ Cụ Thể <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={chucVu}
                  onChange={(e) => setChucVu(e.target.value)}
                  placeholder="VD: Bếp Chính Âu"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-indigo-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Lương Cơ Bản (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  value={luongCoBan}
                  onChange={(e) => setLuongCoBan(Number(e.target.value))}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Khối Cấu Hình TỪNG LOẠI PHỤ CẤP CỐ ĐỊNH */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>Các Khoản Phụ Cấp & Trợ Cấp Cố Định Chuẩn Hóa:</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Tổng PC Cố Định: {formComputedPhuCapCoDinh.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    PC Chức Vụ (đ)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={phuCapChucVu}
                    onChange={(e) => setPhuCapChucVu(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    PC Điện Thoại (đ)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={phuCapDienThoai}
                    onChange={(e) => setPhuCapDienThoai(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    TC Tay Nghề (đ)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={troCapTayNghe}
                    onChange={(e) => setTroCapTayNghe(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    TC Gia Đình (đ)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={troCapGiaDinh}
                    onChange={(e) => setTroCapGiaDinh(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    Thưởng Chuyên Cần (đ)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={thuongChuyenCan}
                    onChange={(e) => setThuongChuyenCan(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    Thưởng Sáng Kiến (đ)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={thuongSangKien}
                    onChange={(e) => setThuongSangKien(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Khối Các Phụ Cấp Thực Tế (Quy định "Thủ công" theo tiêu chuẩn) */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wide block mb-2">
                Các Khoản Phụ Cấp Điều Kiện Thực Tế (Mặc định: "Thủ công"):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    PC Môi Trường
                  </label>
                  <input
                    type="text"
                    value={phuCapMoiTruong}
                    onChange={(e) => setPhuCapMoiTruong(e.target.value)}
                    placeholder="Thủ công"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-amber-50/40 font-medium text-amber-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    PC Xăng Xe
                  </label>
                  <input
                    type="text"
                    value={phuCapXangXe}
                    onChange={(e) => setPhuCapXangXe(e.target.value)}
                    placeholder="Thủ công"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-amber-50/40 font-medium text-amber-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    An Toàn Vệ Sinh Viên
                  </label>
                  <input
                    type="text"
                    value={anToanVeSinhVien}
                    onChange={(e) => setAnToanVeSinhVien(e.target.value)}
                    placeholder="Thủ công"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-amber-50/40 font-medium text-amber-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    PC Kinh Doanh
                  </label>
                  <input
                    type="text"
                    value={phuCapKinhDoanh}
                    onChange={(e) => setPhuCapKinhDoanh(e.target.value)}
                    placeholder="Thủ công"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-amber-50/40 font-medium text-amber-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                    PC Nặng Nhọc
                  </label>
                  <input
                    type="text"
                    value={phuCapNangNhoc}
                    onChange={(e) => setPhuCapNangNhoc(e.target.value)}
                    placeholder="Thủ công"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-amber-50/40 font-medium text-amber-900"
                  />
                </div>
              </div>
            </div>

            {/* Mô tả & Nút Lưu */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả Nhiệm Vụ & Ghi Chú
                </label>
                <input
                  type="text"
                  value={moTa}
                  onChange={(e) => setMoTa(e.target.value)}
                  placeholder="Mô tả tiêu chuẩn chuyên môn, yêu cầu..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-1 flex flex-col justify-center bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium">Tổng thu nhập định mức:</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {formComputedTongThuNhap.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              <div className="sm:col-span-1 flex items-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-2xs"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Vào Sheet'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Hủy
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Bảng Hiển Thị Chi Tiết Từng Loại Phụ Cấp Trên Sheet "TieuChuanLuong" */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header Tầng 1: Phân nhóm các loại phụ cấp */}
              <tr className="bg-slate-800 text-white font-bold border-b border-slate-700 text-[11px]">
                <th colSpan={3} className="p-2.5 text-center border-r border-slate-700">
                  THÔNG TIN CHỨC DANH
                </th>
                <th className="p-2.5 text-right border-r border-slate-700 bg-slate-850">
                  LƯƠNG CƠ BẢN
                </th>
                <th
                  colSpan={viewMode === 'full' ? 7 : 1}
                  className="p-2.5 text-center border-r border-slate-700 bg-emerald-950/80 text-emerald-300"
                >
                  PHỤ CẤP & TRỢ CẤP CỐ ĐỊNH (CHUẨN HÓA)
                </th>
                {viewMode === 'full' && (
                  <th colSpan={5} className="p-2.5 text-center border-r border-slate-700 bg-amber-950/70 text-amber-300">
                    PHỤ CẤP THEO THỰC TẾ (THỦ CÔNG)
                  </th>
                )}
                <th className="p-2.5 text-right border-r border-slate-700 bg-indigo-950/80 text-indigo-300">
                  TỔNG ĐỊNH MỨC
                </th>
                <th className="p-2.5">GHI CHÚ / MÔ TẢ</th>
                {isAdmin && <th className="p-2.5 text-center">THAO TÁC</th>}
              </tr>

              {/* Header Tầng 2: Từng loại phụ cấp chi tiết */}
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                <th className="p-2.5 whitespace-nowrap">Mã Vị Trí</th>
                <th className="p-2.5 whitespace-nowrap">Công Việc</th>
                <th className="p-2.5 whitespace-nowrap">Chức Vụ</th>
                <th className="p-2.5 whitespace-nowrap text-right bg-slate-50 font-bold text-slate-900 border-r border-slate-200">
                  Lương CB (VNĐ)
                </th>

                {/* Từng loại phụ cấp cố định */}
                {viewMode === 'full' ? (
                  <>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-50/40">PC Chức Vụ</th>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-50/40">PC Điện Thoại</th>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-50/40">TC Tay Nghề</th>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-50/40">TC Gia Đình</th>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-50/40">Thưởng C.Cần</th>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-50/40">Thưởng S.Kiến</th>
                    <th className="p-2 text-right whitespace-nowrap bg-emerald-100/70 font-bold text-emerald-950 border-r border-slate-200">
                      Tổng PC Cố Định
                    </th>
                  </>
                ) : (
                  <th className="p-2.5 text-right whitespace-nowrap bg-emerald-100/70 font-bold text-emerald-950 border-r border-slate-200">
                    Tổng PC Cố Định
                  </th>
                )}

                {/* Từng loại phụ cấp thực tế (thủ công) */}
                {viewMode === 'full' && (
                  <>
                    <th className="p-2 text-center whitespace-nowrap bg-amber-50/40">PC Môi Trường</th>
                    <th className="p-2 text-center whitespace-nowrap bg-amber-50/40">PC Xăng Xe</th>
                    <th className="p-2 text-center whitespace-nowrap bg-amber-50/40">ATVS Viên</th>
                    <th className="p-2 text-center whitespace-nowrap bg-amber-50/40">PC Kinh Doanh</th>
                    <th className="p-2 text-center whitespace-nowrap bg-amber-50/40 border-r border-slate-200">PC Nặng Nhọc</th>
                  </>
                )}

                <th className="p-2.5 text-right whitespace-nowrap font-bold text-indigo-900 bg-indigo-50/70 border-r border-slate-200">
                  Lương + PC (VNĐ)
                </th>
                <th className="p-2.5 min-w-[140px]">Nhiệm Vụ</th>
                {isAdmin && <th className="p-2.5 text-center whitespace-nowrap">Thao Tác</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredStandards.length === 0 ? (
                <tr>
                  <td
                    colSpan={viewMode === 'full' ? 18 : 8}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    Không tìm thấy chức danh hoặc vị trí nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStandards.map((item, index) => {
                  const tongThuNhap = item.luongCoBan + item.phuCapCoDinh;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition group"
                    >
                      {/* Mã */}
                      <td className="p-2.5 font-mono text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* Nhóm Công việc */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="inline-block bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[10px] border border-slate-200">
                          {item.congViec || '—'}
                        </span>
                      </td>

                      {/* Chức vụ */}
                      <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-950 font-bold">{item.chucVu}</span>
                        </div>
                      </td>

                      {/* Lương cơ bản */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50 border-r border-slate-200 whitespace-nowrap">
                        {item.luongCoBan.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Từng loại phụ cấp cố định chi tiết */}
                      {viewMode === 'full' ? (
                        <>
                          {/* 1. PC Chức Vụ */}
                          <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {item.phuCapChucVu && item.phuCapChucVu > 0 ? (
                              <span className="font-semibold text-emerald-900">
                                {item.phuCapChucVu.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* 2. PC Điện Thoại */}
                          <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {item.phuCapDienThoai && item.phuCapDienThoai > 0 ? (
                              <span className="font-semibold text-emerald-900">
                                {item.phuCapDienThoai.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* 3. TC Tay Nghề */}
                          <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {item.troCapTayNghe && item.troCapTayNghe > 0 ? (
                              <span className="font-semibold text-emerald-900">
                                {item.troCapTayNghe.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* 4. TC Gia Đình */}
                          <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {item.troCapGiaDinh && item.troCapGiaDinh > 0 ? (
                              <span>{item.troCapGiaDinh.toLocaleString('vi-VN')} đ</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* 5. Thưởng Chuyên Cần */}
                          <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {item.thuongChuyenCan && item.thuongChuyenCan > 0 ? (
                              <span>{item.thuongChuyenCan.toLocaleString('vi-VN')} đ</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* 6. Thưởng Sáng Kiến */}
                          <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {item.thuongSangKien && item.thuongSangKien > 0 ? (
                              <span>{item.thuongSangKien.toLocaleString('vi-VN')} đ</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* TỔNG PHỤ CẤP CỐ ĐỊNH */}
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/60 border-r border-slate-200 whitespace-nowrap">
                            {item.phuCapCoDinh.toLocaleString('vi-VN')} đ
                          </td>
                        </>
                      ) : (
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/60 border-r border-slate-200 whitespace-nowrap">
                          {item.phuCapCoDinh.toLocaleString('vi-VN')} đ
                        </td>
                      )}

                      {/* Các phụ cấp thực tế (Thủ công) */}
                      {viewMode === 'full' && (
                        <>
                          <td className="p-2 text-center whitespace-nowrap bg-amber-50/20">
                            <span className="text-[10px] font-semibold bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                              {String(item.phuCapMoiTruong || 'Thủ công')}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap bg-amber-50/20">
                            <span className="text-[10px] font-semibold bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                              {String(item.phuCapXangXe || 'Thủ công')}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap bg-amber-50/20">
                            <span className="text-[10px] font-semibold bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                              {String(item.anToanVeSinhVien || 'Thủ công')}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap bg-amber-50/20">
                            <span className="text-[10px] font-semibold bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                              {String(item.phuCapKinhDoanh || 'Thủ công')}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap bg-amber-50/20 border-r border-slate-200">
                            <span className="text-[10px] font-semibold bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                              {String(item.phuCapNangNhoc || 'Thủ công')}
                            </span>
                          </td>
                        </>
                      )}

                      {/* TỔNG ĐỊNH MỨC DỰ KIẾN (LƯƠNG CB + PC CỐ ĐỊNH) */}
                      <td className="p-2.5 text-right font-mono font-black text-indigo-950 bg-indigo-50/50 border-r border-slate-200 whitespace-nowrap text-[12px]">
                        {tongThuNhap.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Ghi chú mô tả */}
                      <td className="p-2.5 text-slate-600 max-w-[220px] truncate" title={item.moTa}>
                        {item.moTa || '—'}
                      </td>

                      {/* Nút hành động */}
                      {isAdmin && (
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                              title="Sửa định mức & từng phụ cấp của vị trí"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Xác nhận xóa tiêu chuẩn chức vụ "${item.chucVu}" khỏi Sheet "TieuChuanLuong"?`)) {
                                  onDeleteStandard(item.id);
                                }
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-100 rounded transition"
                              title="Xóa chức vụ này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chú giải ý nghĩa các khoản phụ cấp */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
        <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px]">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>Quy định hạch toán từng loại phụ cấp trên Sheet "TieuChuanLuong":</span>
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div>
            <strong className="text-emerald-900">• Cụm phụ cấp cố định:</strong> Phụ cấp chức vụ (500k-2tr), Trợ cấp tay nghề (500k-1.2tr), Trợ cấp gia đình (chuẩn 150k), Thưởng chuyên cần (chuẩn 200k), Thưởng sáng kiến (200k). Tổng các khoản này được tự động cộng vào <strong>Tổng Phụ Cấp Cố Định</strong>.
          </div>
          <div>
            <strong className="text-amber-900">• Cụm phụ cấp thực tế ("Thủ công"):</strong> Phụ cấp môi trường, Phụ cấp xăng xe, An toàn vệ sinh viên, Phụ cấp kinh doanh, Phụ cấp nặng nhọc được ấn định mức chi trả linh hoạt dựa theo điều kiện thực tế tại đơn vị/bếp làm việc của nhân sự.
          </div>
        </div>
      </div>
    </div>
  );
};
