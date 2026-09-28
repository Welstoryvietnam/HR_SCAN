import React, { useState, useEffect } from 'react';
import { NhanSuRecord, TieuChuanLuongItem } from '../types';
import {
  X,
  Save,
  ShieldCheck,
  Building,
  Briefcase,
  DollarSign,
  User,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Calculator
} from 'lucide-react';

interface EditRecordModalProps {
  record: NhanSuRecord;
  tieuChuanLuongList?: TieuChuanLuongItem[];
  onClose: () => void;
  onSave: (updatedRecord: NhanSuRecord) => Promise<boolean>;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  record,
  tieuChuanLuongList = [],
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<NhanSuRecord>({ ...record });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Tự động tính toán phụ cấp và tổng thu nhập khi các giá trị lương thay đổi
  const calcTongPhuCapCoDinh = () => {
    return (
      (Number(formData.phuCapChucVu) || 0) +
      (Number(formData.phuCapDienThoai) || 0) +
      (Number(formData.troCapTayNghe) || 0) +
      (Number(formData.troCapGiaDinh) || 0) +
      (Number(formData.thuongChuyenCan) || 0) +
      (Number(formData.thuongSangKien) || 0)
    );
  };

  const calcTongThuNhap = () => {
    const fixed = calcTongPhuCapCoDinh();
    const manual =
      (Number(formData.phuCapMoiTruong) || 0) +
      (Number(formData.phuCapXangXe) || 0) +
      (Number(formData.anToanVeSinhVien) || 0) +
      (Number(formData.phuCapKinhDoanh) || 0) +
      (Number(formData.phuCapNangNhoc) || 0) +
      (Number(formData.phuCapPhatSinh) || 0);
    return (Number(formData.luongCoBan) || 0) + fixed + manual;
  };

  const calcLuongBHXH = () => {
    return (Number(formData.luongCoBan) || 0) + (Number(formData.phuCapChucVu) || 0);
  };

  const handleChange = (field: keyof NhanSuRecord, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Áp dụng định mức tiêu chuẩn nếu chọn Chức vụ có trong danh mục
  const handleChucVuChange = (chucVuName: string) => {
    const matched = tieuChuanLuongList.find(
      (t) => t.chucVu.toLowerCase() === chucVuName.toLowerCase()
    );

    if (matched) {
      setFormData((prev) => ({
        ...prev,
        chucVu: matched.chucVu,
        congViecDuKien: matched.congViec || prev.congViecDuKien,
        luongCoBan: matched.luongCoBan,
        phuCapChucVu: matched.phuCapChucVu || 0,
        phuCapDienThoai: matched.phuCapDienThoai || 0,
        troCapTayNghe: matched.troCapTayNghe || 0,
        troCapGiaDinh: matched.troCapGiaDinh || 150000,
        thuongChuyenCan: matched.thuongChuyenCan || 200000,
        thuongSangKien: matched.thuongSangKien || 0,
        isManualSalary: false,
      }));
    } else {
      handleChange('chucVu', chucVuName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hoVaTen.trim()) {
      setErrorMessage('Họ và tên không được để trống.');
      return;
    }
    if (!formData.soCCCD.trim()) {
      setErrorMessage('Số CCCD không được để trống.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const finalRecord: NhanSuRecord = {
      ...formData,
      hoVaTen: formData.hoVaTen.toUpperCase().trim(),
      phuCapCoDinh: calcTongPhuCapCoDinh(),
      tongThuNhapDuKien: calcTongThuNhap(),
      luongDongBHXH: calcLuongBHXH(),
    };

    try {
      const ok = await onSave(finalRecord);
      if (ok) {
        onClose();
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 relative shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  CHỈNH SỬA TOÀN BỘ HỒ SƠ NHÂN SỰ
                </h3>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                  Quyền Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mã hồ sơ: <strong>{formData.id}</strong> &bull; Người gửi:{' '}
                <span className="text-blue-700">{formData.userEmail}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. Thông tin cá nhân & Định danh</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={formData.hoVaTen}
                  onChange={(e) => handleChange('hoVaTen', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số CCCD (12 số) *</label>
                <input
                  type="text"
                  required
                  value={formData.soCCCD}
                  onChange={(e) => handleChange('soCCCD', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.soDienThoai || ''}
                  onChange={(e) => handleChange('soDienThoai', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ngày sinh (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={formData.ngaySinh || ''}
                  onChange={(e) => handleChange('ngaySinh', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Giới tính</label>
                <select
                  value={formData.gioiTinh || 'Nam'}
                  onChange={(e) => handleChange('gioiTinh', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ngày cấp CCCD</label>
                <input
                  type="text"
                  value={formData.ngayCap || ''}
                  onChange={(e) => handleChange('ngayCap', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-medium mb-1">Nơi cấp</label>
                <input
                  type="text"
                  value={formData.noiCap || ''}
                  onChange={(e) => handleChange('noiCap', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-medium mb-1">Quê quán</label>
                <input
                  type="text"
                  value={formData.queQuan || ''}
                  onChange={(e) => handleChange('queQuan', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-medium mb-1">
                  Địa chỉ thường trú (Ưu tiên chuẩn VNeID sau sáp nhập)
                </label>
                <input
                  type="text"
                  value={formData.diaChiThuongTru || ''}
                  onChange={(e) => handleChange('diaChiThuongTru', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* PHẦN 2: CƠ CẤU TỔ CHỨC & VỊ TRÍ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>2. Cơ cấu tổ chức & Vị trí làm việc</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Khối</label>
                <input
                  type="text"
                  value={formData.khoi || ''}
                  onChange={(e) => handleChange('khoi', e.target.value)}
                  placeholder="Ví dụ: FD MANAGEMENT"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Ban</label>
                <input
                  type="text"
                  value={formData.ban || ''}
                  onChange={(e) => handleChange('ban', e.target.value)}
                  placeholder="Ví dụ: LOGISTICS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Phòng</label>
                <input
                  type="text"
                  value={formData.phong || ''}
                  onChange={(e) => handleChange('phong', e.target.value)}
                  placeholder="Ví dụ: LOGISTICS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Công việc dự kiến</label>
                <input
                  type="text"
                  value={formData.congViecDuKien || ''}
                  onChange={(e) => handleChange('congViecDuKien', e.target.value)}
                  placeholder="Ví dụ: Đầu Bếp, Bán Hàng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Chức vụ đảm nhận</label>
                <input
                  type="text"
                  value={formData.chucVu || ''}
                  onChange={(e) => handleChucVuChange(e.target.value)}
                  placeholder="Ví dụ: Bếp Trưởng, Cửa Hàng Trưởng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Chế độ định mức lương</label>
                <select
                  value={formData.isManualSalary ? 'manual' : 'standard'}
                  onChange={(e) => handleChange('isManualSalary', e.target.value === 'manual')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white"
                >
                  <option value="standard">Theo Sheet "TieuChuanLuong"</option>
                  <option value="manual">Nhập thủ công theo thỏa thuận</option>
                </select>
              </div>
            </div>
          </div>

          {/* PHẦN 3: LƯƠNG & CÁC KHOẢN PHỤ CẤP */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>3. Chi tiết lương & Các khoản phụ cấp (VNĐ)</span>
              </div>
              <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Admin được phép sửa toàn bộ số tiền
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lương cơ bản *</label>
                <input
                  type="number"
                  value={formData.luongCoBan}
                  onChange={(e) => handleChange('luongCoBan', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Phụ cấp chức vụ</label>
                <input
                  type="number"
                  value={formData.phuCapChucVu || 0}
                  onChange={(e) => handleChange('phuCapChucVu', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Phụ cấp điện thoại</label>
                <input
                  type="number"
                  value={formData.phuCapDienThoai || 0}
                  onChange={(e) => handleChange('phuCapDienThoai', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Trợ cấp tay nghề</label>
                <input
                  type="number"
                  value={formData.troCapTayNghe || 0}
                  onChange={(e) => handleChange('troCapTayNghe', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Trợ cấp gia đình</label>
                <input
                  type="number"
                  value={formData.troCapGiaDinh || 0}
                  onChange={(e) => handleChange('troCapGiaDinh', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Thưởng chuyên cần</label>
                <input
                  type="number"
                  value={formData.thuongChuyenCan || 0}
                  onChange={(e) => handleChange('thuongChuyenCan', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Thưởng sáng kiến</label>
                <input
                  type="number"
                  value={formData.thuongSangKien || 0}
                  onChange={(e) => handleChange('thuongSangKien', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Phụ cấp phát sinh</label>
                <input
                  type="number"
                  value={formData.phuCapPhatSinh || 0}
                  onChange={(e) => handleChange('phuCapPhatSinh', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">PC Môi trường</label>
                <input
                  type="number"
                  value={formData.phuCapMoiTruong || 0}
                  onChange={(e) => handleChange('phuCapMoiTruong', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">PC Xăng xe</label>
                <input
                  type="number"
                  value={formData.phuCapXangXe || 0}
                  onChange={(e) => handleChange('phuCapXangXe', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">An toàn Vệ sinh viên</label>
                <input
                  type="number"
                  value={formData.anToanVeSinhVien || 0}
                  onChange={(e) => handleChange('anToanVeSinhVien', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">PC Kinh doanh / Nặng nhọc</label>
                <input
                  type="number"
                  value={(formData.phuCapKinhDoanh || 0) + (formData.phuCapNangNhoc || 0)}
                  onChange={(e) => handleChange('phuCapKinhDoanh', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>
            </div>

            {/* Khung tính toán tổng kết live */}
            <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">TỔNG PHỤ CẤP CỐ ĐỊNH:</span>
                <span className="text-base font-bold font-mono text-indigo-300">
                  {calcTongPhuCapCoDinh().toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">MỨC ĐÓNG BHXH (LCB + PC Chức vụ):</span>
                <span className="text-base font-bold font-mono text-cyan-300">
                  {calcLuongBHXH().toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">TỔNG THU NHẬP DỰ KIẾN:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {calcTongThuNhap().toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú của Quản trị viên
            </label>
            <input
              type="text"
              value={formData.ghiChu || ''}
              onChange={(e) => handleChange('ghiChu', e.target.value)}
              placeholder="Nhập ghi chú điều chỉnh, quyết định duyệt..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-blue-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu cập nhật...' : 'Lưu Thay Đổi (Cập Nhật Sheet)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
