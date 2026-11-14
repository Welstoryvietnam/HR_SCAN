import React, { useState, useMemo } from 'react';
import { TieuChuanLuongItem, UserProfile } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Coins,
  Sparkles,
  FileSpreadsheet,
  Save,
  X,
} from 'lucide-react';
import { GoogleSheetSyncModal } from './GoogleSheetSyncModal';

interface TieuChuanLuongManagerProps {
  standards: TieuChuanLuongItem[];
  currentUser: UserProfile;
  onSaveStandard: (item: Partial<TieuChuanLuongItem>) => Promise<void>;
  onDeleteStandard: (id: string) => Promise<void>;
  onStandardsUpdated?: (updatedList: TieuChuanLuongItem[]) => void;
}

export const TieuChuanLuongManager: React.FC<TieuChuanLuongManagerProps> = ({
  standards,
  currentUser,
  onSaveStandard,
  onDeleteStandard,
  onStandardsUpdated,
}) => {
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [congViec, setCongViec] = useState('Đầu Bếp');
  const [chucVu, setChucVu] = useState('');
  const [luongCoBan, setLuongCoBan] = useState<number>(5447000);
  const [phuCapChucVu, setPhuCapChucVu] = useState<number>(0);
  const [phuCapDienThoai, setPhuCapDienThoai] = useState<number>(0);
  const [troCapTayNghe, setTroCapTayNghe] = useState<number>(0);
  const [troCapGiaDinh, setTroCapGiaDinh] = useState<number>(150000);
  const [thuongChuyenCan, setThuongChuyenCan] = useState<number>(200000);
  const [thuongSangKien, setThuongSangKien] = useState<number>(200000);
  const [phuCapMoiTruong, setPhuCapMoiTruong] = useState<any>('Thủ công');
  const [phuCapXangXe, setPhuCapXangXe] = useState<any>('Thủ công');
  const [anToanVeSinhVien, setAnToanVeSinhVien] = useState<any>('Thủ công');
  const [phuCapKinhDoanh, setPhuCapKinhDoanh] = useState<any>('Thủ công');
  const [phuCapNangNhoc, setPhuCapNangNhoc] = useState<any>('Thủ công');
  const [moTa, setMoTa] = useState('');
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');

  const isAdmin = currentUser.role === 'admin';

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

  const jobCategories = useMemo(() => {
    const set = new Set<string>();
    standards.forEach((s) => {
      if (s.congViec) set.add(s.congViec);
    });
    return Array.from(set).sort();
  }, [standards]);

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

  const handleSubmitStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await onSaveStandard({
        id: editingId || `std_${Date.now()}`,
        congViec: congViec.trim(),
        chucVu: chucVu.trim(),
        luongCoBan: Number(luongCoBan) || 0,
        phuCapChucVu: Number(phuCapChucVu) || 0,
        phuCapDienThoai: Number(phuCapDienThoai) || 0,
        troCapTayNghe: Number(troCapTayNghe) || 0,
        troCapGiaDinh: Number(troCapGiaDinh) || 0,
        thuongChuyenCan: Number(thuongChuyenCan) || 0,
        thuongSangKien: Number(thuongSangKien) || 0,
        phuCapCoDinh: formComputedPhuCapCoDinh,
        phuCapMoiTruong,
        phuCapXangXe,
        anToanVeSinhVien,
        phuCapKinhDoanh,
        phuCapNangNhoc,
        moTa,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Không thể lưu tiêu chuẩn lương: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Nhóm Công Việc',
      'Chức Vụ',
      'Lương Cơ Bản',
      'PC Chức Vụ',
      'PC Điện Thoại',
      'TC Tay Nghề',
      'TC Gia Đình',
      'Thưởng Chuyên Cần',
      'Thưởng Sáng Kiến',
      'Tổng PC Cố Định',
      'Tổng Thu Nhập Dự Kiến',
      'Mô Tả',
    ];

    const rows = filteredStandards.map((item, i) => [
      i + 1,
      `"${item.congViec || ''}"`,
      `"${item.chucVu || ''}"`,
      item.luongCoBan,
      item.phuCapChucVu || 0,
      item.phuCapDienThoai || 0,
      item.troCapTayNghe || 0,
      item.troCapGiaDinh !== undefined ? item.troCapGiaDinh : 150000,
      item.thuongChuyenCan !== undefined ? item.thuongChuyenCan : 200000,
      item.thuongSangKien || 0,
      item.phuCapCoDinh,
      item.luongCoBan + item.phuCapCoDinh,
      `"${item.moTa || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sheet_TieuChuanLuong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Bảng Định Mức Lương Tiêu Chuẩn &amp; Phụ Cấp theo công việc, chức vụ, thẩm quyền
            </h1>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setIsGoogleSheetModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-950" />
                <span>Kết Nối Google Sheets Lấy Form Tiêu Chuẩn</span>
              </button>

              <button
                type="button"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Vị Trí Tiêu Chuẩn Mới</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Xuất CSV Sheet</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal Thêm / Chỉnh Sửa Tiêu Chuẩn */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingId ? `Chỉnh Sửa Tiêu Chuẩn Chức Vụ: ${chucVu}` : 'Thêm Mới Vị Trí Tiêu Chuẩn Lương'}
                  </h3>
                  <span className="text-xs text-slate-500">Cập nhật trực tiếp lên Sheet "TieuChuanLuong"</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStandard} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhóm Công Việc (Job Category) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={congViec}
                    onChange={(e) => setCongViec(e.target.value)}
                    placeholder="Ví dụ: Đầu Bếp, Bán Hàng, Dinh Dưỡng Viên..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Vị Trí / Chức Vụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chucVu}
                    onChange={(e) => setChucVu(e.target.value)}
                    placeholder="Ví dụ: Bếp Trưởng, Cửa Hàng Trưởng, GS II..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Lương Cơ Bản Tiêu Chuẩn (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={luongCoBan}
                    onChange={(e) => setLuongCoBan(Number(e.target.value))}
                    className="w-full text-xs font-bold text-amber-950 px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    Đóng BHXH theo mức này
                  </span>
                </div>

                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Phụ Cấp Chức Vụ (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={phuCapChucVu}
                    onChange={(e) => setPhuCapChucVu(Number(e.target.value))}
                    className="w-full text-xs font-bold text-indigo-950 px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Phụ Cấp Điện Thoại (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={phuCapDienThoai}
                    onChange={(e) => setPhuCapDienThoai(Number(e.target.value))}
                    className="w-full text-xs font-bold text-indigo-950 px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Trợ Cấp Tay Nghề
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={troCapTayNghe}
                    onChange={(e) => setTroCapTayNghe(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Trợ Cấp Gia Đình
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={troCapGiaDinh}
                    onChange={(e) => setTroCapGiaDinh(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Thưởng Chuyên Cần
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={thuongChuyenCan}
                    onChange={(e) => setThuongChuyenCan(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Thưởng Sáng Kiến
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={thuongSangKien}
                    onChange={(e) => setThuongSangKien(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">
                    Tổng Phụ Cấp Cố Định: {formComputedPhuCapCoDinh.toLocaleString('vi-VN')} đ/tháng
                  </span>
                </div>
                <div className="text-xs font-extrabold text-emerald-800">
                  Tổng Thu Nhập Dự Kiến: {formComputedTongThuNhap.toLocaleString('vi-VN')} đ/tháng
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Đang Lưu...' : 'Lưu Tiêu Chuẩn Này'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thanh tìm kiếm & Lọc tiêu chuẩn */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chức vụ, công việc..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 shrink-0">Lọc Công Việc:</span>
          <select
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-indigo-500 w-full sm:w-auto"
          >
            <option value="ALL">Tất cả ({standards.length})</option>
            {jobCategories.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bảng Hiển Thị Chi Tiết Từng Loại Phụ Cấp Trên Sheet "TieuChuanLuong" */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">STT</th>
                <th className="py-2.5 px-3 min-w-[130px]">Nhóm Công Việc</th>
                <th className="py-2.5 px-3 min-w-[140px]">Chức Vụ</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">Lương Cơ Bản</th>
                <th className="py-2.5 px-3 text-right">PC Chức Vụ</th>
                <th className="py-2.5 px-3 text-right">PC Đ.Thoại</th>
                <th className="py-2.5 px-3 text-right">TC Tay Nghề</th>
                <th className="py-2.5 px-3 text-right">TC Gia Đình</th>
                <th className="py-2.5 px-3 text-right">Thưởng C.Cần</th>
                <th className="py-2.5 px-3 text-right">Thưởng S.Kiến</th>
                <th className="py-2.5 px-3 text-right min-w-[110px] text-indigo-900 bg-indigo-50/50">
                  Tổng PC Cố Định
                </th>
                <th className="py-2.5 px-3 text-right min-w-[120px] text-emerald-900 bg-emerald-50/50">
                  Tổng Thu Nhập
                </th>
                {isAdmin && (
                  <th className="py-2.5 px-3 text-center min-w-[100px]">Thao Tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStandards.map((item, idx) => {
                const totalIncome = item.luongCoBan + item.phuCapCoDinh;
                return (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{item.congViec}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-950">{item.chucVu}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {item.luongCoBan.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {item.phuCapChucVu ? `${item.phuCapChucVu.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {item.phuCapDienThoai ? `${item.phuCapDienThoai.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {item.troCapTayNghe ? `${item.troCapTayNghe.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {(item.troCapGiaDinh !== undefined ? item.troCapGiaDinh : 150000).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {(item.thuongChuyenCan !== undefined ? item.thuongChuyenCan : 200000).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {item.thuongSangKien ? `${item.thuongSangKien.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30">
                      {item.phuCapCoDinh.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/30">
                      {totalIncome.toLocaleString('vi-VN')} đ
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa định mức lương & phụ cấp chức vụ này"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa tiêu chuẩn chức vụ "${item.chucVu}" khỏi Sheet "TieuChuanLuong"?`)) {
                                void onDeleteStandard(item.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa vị trí này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Kết nối Google Sheets lấy Form Tiêu Chuẩn */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        currentUser={currentUser}
        currentStandards={standards}
        onStandardsUpdated={(updatedList) => {
          if (onStandardsUpdated) {
            onStandardsUpdated(updatedList);
          }
        }}
      />
    </div>
  );
};
