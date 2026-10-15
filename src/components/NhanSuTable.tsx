import React, { useState } from 'react';
import { NhanSuRecord, UserProfile, TieuChuanLuongItem } from '../types';
import { generateExcel43Columns } from '../utils/excelExport';
import { EditRecordModal } from './EditRecordModal';
import {
  Download,
  Search,
  Eye,
  Trash2,
  Filter,
  ShieldCheck,
  User,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  FileSpreadsheet,
  X,
  Building,
  Mail,
  Network,
  ChevronRight,
  Layers,
  Briefcase,
  Pencil
} from 'lucide-react';

interface NhanSuTableProps {
  records: NhanSuRecord[];
  currentUser: UserProfile;
  onRefresh: () => void;
  onDeleteRecord?: (id: string) => Promise<void>;
  onEditRecord?: (updatedRecord: NhanSuRecord) => Promise<boolean>;
  tieuChuanLuongList?: TieuChuanLuongItem[];
}

export const NhanSuTable: React.FC<NhanSuTableProps> = ({
  records,
  currentUser,
  onRefresh,
  onDeleteRecord,
  onEditRecord,
  tieuChuanLuongList = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKhoiFilter, setSelectedKhoiFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<NhanSuRecord | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<NhanSuRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  // Lọc tìm kiếm theo tên, số CCCD, chức vụ, email, khối, ban, phòng
  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      r.hoVaTen.toLowerCase().includes(term) ||
      r.soCCCD.includes(term) ||
      r.chucVu.toLowerCase().includes(term) ||
      (r.congViecDuKien && r.congViecDuKien.toLowerCase().includes(term)) ||
      r.userEmail.toLowerCase().includes(term) ||
      (r.khoi && r.khoi.toLowerCase().includes(term)) ||
      (r.ban && r.ban.toLowerCase().includes(term)) ||
      (r.phong && r.phong.toLowerCase().includes(term));

    const matchKhoi = !selectedKhoiFilter || r.khoi === selectedKhoiFilter;

    return matchSearch && matchKhoi;
  });

  // Danh sách các Khối duy nhất hiện có trong dữ liệu
  const uniqueKhois = Array.from(new Set(records.map((r) => r.khoi).filter(Boolean)));

  // Xuất file Excel (.xlsx) chuẩn 43 cột định dạng 4 dải màu Header
  const handleDownloadExcel43 = async () => {
    setIsExporting(true);
    try {
      const recordsToExport = filteredRecords.length > 0 ? filteredRecords : records;
      if (recordsToExport.length === 0) {
        alert('Không có bản ghi nào để xuất file Excel.');
        return;
      }
      await generateExcel43Columns(recordsToExport, 'Bang_Tong_Hop_Nhan_Su_Chuan_43_Cot.xlsx');
    } catch (err) {
      alert('Lỗi xuất file Excel: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // Tải xuống file CSV chuẩn Excel "Bang_Tong_Hop_Nhan_Su.csv" (Chỉ Quản trị viên)
  const handleDownloadCsv = async () => {
    if (!isAdmin) {
      alert('Chỉ Quản trị viên (Admin) mới có quyền tải xuống file Bảng tổng hợp nhân sự.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/export/csv', {
        headers: {
          'x-user-email': currentUser.email,
          'Authorization': `Bearer ${currentUser.sessionToken || ''}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Không thể tải xuống file CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Bang_Tong_Hop_Nhan_Su.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất file CSV: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top Header & Export Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Cơ Sở Dữ Liệu: Hồ sơ đã lưu
            </h2>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Toàn quyền Admin ({records.length} hồ sơ)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <User className="w-3.5 h-3.5" /> Hồ sơ cá nhân của bạn ({records.length} hồ sơ)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Quản trị viên có đặc quyền xem toàn bộ nhân sự các phòng ban và xuất báo cáo Excel/CSV.'
              : `Chế độ nhân viên: Bạn chỉ xem được các hồ sơ được gửi từ tài khoản ${currentUser.email}.`}
          </p>
        </div>

        {/* Nút bấm tải xuống Excel 43 cột và CSV */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadExcel43}
            disabled={isExporting || records.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50"
            title="Xuất file Excel (.xlsx) chuẩn 43 cột với format 4 màu header"
          >
            <Download className="w-4 h-4 text-slate-900" />
            <span>{isExporting ? 'Đang xuất Excel...' : 'Xuất Excel 43 Cột (.xlsx)'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleDownloadCsv}
              disabled={isExporting || records.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-medium transition disabled:opacity-50"
              title="Tải bảng tổng hợp toàn bộ nhân sự chuẩn UTF-8 CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Role notice banner */}
      {!isAdmin && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Bạn đang đăng nhập với vai trò <strong>Nhân viên</strong> ({currentUser.email}). Hệ thống áp dụng cơ chế phân quyền bảo mật tự động của Google Account.
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto items-stretch sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo Tên, CCCD, Chức vụ, Phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-600 bg-slate-50/50"
            />
          </div>

          {uniqueKhois.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedKhoiFilter}
                onChange={(e) => setSelectedKhoiFilter(e.target.value)}
                className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Tất cả các Khối --</option>
                {uniqueKhois.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Hiển thị <strong>{filteredRecords.length}</strong> / {records.length} hồ sơ
        </div>
      </div>

      {/* Responsive Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 whitespace-nowrap">Mã & Thời Gian</th>
                <th className="p-3 whitespace-nowrap">Họ Và Tên</th>
                <th className="p-3 whitespace-nowrap">Số CCCD</th>
                <th className="p-3 whitespace-nowrap">Đơn Vị (Khối &gt; Ban &gt; Phòng)</th>
                <th className="p-3 whitespace-nowrap">Chức Vụ</th>
                {isAdmin && <th className="p-3 whitespace-nowrap">Email Người Gửi</th>}
                <th className="p-3 whitespace-nowrap text-right">Lương CB</th>
                <th className="p-3 whitespace-nowrap text-right">Phụ Cấp</th>
                <th className="p-3 whitespace-nowrap text-right">Tổng Thu Nhập</th>
                <th className="p-3 whitespace-nowrap text-center">Email Xác Nhận</th>
                <th className="p-3 whitespace-nowrap text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 11 : 10} className="p-8 text-center text-slate-400 text-xs">
                    Không tìm thấy hồ sơ nhân sự nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3">
                      <div className="font-mono font-semibold text-blue-900">{item.id}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(item.timestamp).toLocaleString('vi-VN')}
                      </div>
                    </td>

                    <td className="p-3 font-bold text-slate-900 uppercase">
                      {item.hoVaTen}
                      <div className="text-[11px] font-normal text-slate-500 normal-case">
                        {item.ngaySinh} ({item.gioiTinh})
                      </div>
                    </td>

                    <td className="p-3 font-mono font-medium text-slate-700">
                      {item.soCCCD}
                    </td>

                    {/* Phân cấp cơ cấu tổ chức: Khối > Ban > Phòng */}
                    <td className="p-3 min-w-[200px]">
                      {item.khoi ? (
                        <div className="space-y-0.5 text-[11px]">
                          <div className="font-semibold text-emerald-900 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{item.khoi}</span>
                          </div>
                          <div className="text-slate-600 flex items-center gap-1 pl-2.5">
                            <span className="text-slate-300">↳</span>
                            <span className="text-indigo-900 font-medium">{item.ban}</span>
                          </div>
                          <div className="text-slate-600 flex items-center gap-1 pl-5">
                            <span className="text-slate-300">↳</span>
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {item.phong}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa phân bổ</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px] inline-block border border-indigo-100">
                          {item.chucVu}
                        </span>
                        {item.isManualSalary ? (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                            Thủ công
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                            Tiêu chuẩn
                          </span>
                        )}
                      </div>
                      {item.congViecDuKien && (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>CV: {item.congViecDuKien}</span>
                        </div>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="p-3 text-slate-600 truncate max-w-[140px]" title={item.userEmail}>
                        {item.userEmail}
                      </td>
                    )}

                    <td className="p-3 text-right font-mono text-slate-700">
                      {item.luongCoBan.toLocaleString('vi-VN')} đ
                    </td>

                    <td className="p-3 text-right font-mono text-slate-700">
                      <div>{(item.phuCapCoDinh + item.phuCapPhatSinh).toLocaleString('vi-VN')} đ</div>
                      {item.phuCapPhatSinh > 0 && (
                        <div className="text-[10px] text-amber-700">
                          (PS: +{item.phuCapPhatSinh.toLocaleString('vi-VN')})
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                      {item.tongThuNhapDuKien.toLocaleString('vi-VN')} đ
                    </td>

                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Đã gửi</span>
                      </span>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setRecordToEdit(item)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="Chỉnh sửa toàn bộ hồ sơ (Quyền Admin)"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && onDeleteRecord && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ của ${item.hoVaTen}?`)) {
                                onDeleteRecord(item.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa hồ sơ (Chỉ Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chi Tiết Hồ Sơ Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  HỒ SƠ NHÂN SỰ: {selectedRecord.hoVaTen}
                </h3>
                <p className="text-xs text-slate-500">Mã: {selectedRecord.id} | Nộp lúc: {new Date(selectedRecord.timestamp).toLocaleString('vi-VN')}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin cơ bản */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><span className="text-slate-500">Họ và tên:</span> <strong className="text-slate-800">{selectedRecord.hoVaTen}</strong></div>
              <div><span className="text-slate-500">Số CCCD:</span> <strong className="font-mono text-slate-800">{selectedRecord.soCCCD}</strong></div>
              <div><span className="text-slate-500">Ngày sinh:</span> {selectedRecord.ngaySinh} ({selectedRecord.gioiTinh})</div>
              <div><span className="text-slate-500">Số điện thoại:</span> {selectedRecord.soDienThoai || 'N/A'}</div>
              <div><span className="text-slate-500">Ngày & Nơi cấp:</span> {selectedRecord.ngayCap} ({selectedRecord.noiCap})</div>
              <div><span className="text-slate-500">Email người nộp:</span> <span className="text-blue-700 font-medium">{selectedRecord.userEmail}</span></div>
              <div className="col-span-2"><span className="text-slate-500">Quê quán:</span> {selectedRecord.queQuan}</div>
              <div className="col-span-2"><span className="text-slate-500">Thường trú:</span> {selectedRecord.diaChiThuongTru}</div>
            </div>

            {/* Phân cấp cơ cấu tổ chức: Khối > Ban > Phòng */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200 text-xs">
              <div className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                <Network className="w-4 h-4 text-emerald-700" />
                <span>CƠ CẤU TỔ CHỨC ĐƠN VỊ (KHỐI &gt; BAN &gt; PHÒNG)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white border border-emerald-300 text-emerald-800 font-medium px-2.5 py-1 rounded shadow-2xs">
                  <strong>Khối:</strong> {selectedRecord.khoi || 'Chưa phân bổ'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                <span className="bg-white border border-emerald-300 text-emerald-800 font-medium px-2.5 py-1 rounded shadow-2xs">
                  <strong>Ban:</strong> {selectedRecord.ban || 'Chưa phân bổ'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                <span className="bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded shadow-2xs">
                  <strong>Phòng:</strong> {selectedRecord.phong || 'Chưa phân bổ'}
                </span>
              </div>
            </div>

            {/* Hệ thống Công việc & Chức vụ */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
              <div className="font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span>VỊ TRÍ CÔNG TÁC & CHỨC VỤ ĐẢM NHẬN</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white border border-blue-300 text-blue-800 font-medium px-2.5 py-1 rounded shadow-2xs">
                  <strong>Công việc:</strong> {selectedRecord.congViecDuKien || 'Chưa phân loại'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                <span className="bg-blue-600 text-white font-semibold px-2.5 py-1 rounded shadow-2xs">
                  <strong>Chức vụ:</strong> {selectedRecord.chucVu}
                </span>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <h4 className="mb-3 font-bold text-slate-800">Thông tin tiếp nhận bổ sung</h4>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Ngày vào làm việc', selectedRecord.ngayVaoLam?.split('-').reverse().join('/')],
                  ['Địa chỉ tạm trú hiện tại', selectedRecord.diaChiTamTru],
                  ['Email cá nhân', selectedRecord.emailCaNhan],
                  ['Tình trạng hồ sơ', selectedRecord.tinhTrangHoSo],
                ].map(([label,value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-800">{value || 'Chưa nhập'}</dd></div>)}
              </dl>
            </section>

            {/* Bảng lương chi tiết */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-emerald-900 uppercase">Cơ Cấu Thu Nhập Hàng Tháng ({selectedRecord.chucVu})</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedRecord.isManualSalary
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {selectedRecord.isManualSalary ? 'Chế độ: Nhập thủ công' : 'Chế độ: Tiêu chuẩn 22 vị trí'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-emerald-200/50">
                <span className="text-slate-600">Lương cơ bản:</span>
                <span className="font-mono font-semibold">{selectedRecord.luongCoBan.toLocaleString('vi-VN')} VNĐ</span>
              </div>

              {/* Các khoản phụ cấp thành phần nếu là tiêu chuẩn */}
              {!selectedRecord.isManualSalary && (
                <div className="bg-white/60 p-2.5 rounded-lg border border-emerald-100 space-y-1 my-1">
                  <div className="text-[10px] font-bold text-emerald-900 uppercase">Chi tiết phụ cấp tiêu chuẩn:</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>• PC Chức vụ:</span>
                      <span className="font-mono font-medium">{(selectedRecord.phuCapChucVu || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• PC Điện thoại:</span>
                      <span className="font-mono font-medium">{(selectedRecord.phuCapDienThoai || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• TC Tay nghề:</span>
                      <span className="font-mono font-medium">{(selectedRecord.troCapTayNghe || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• TC Gia đình:</span>
                      <span className="font-mono font-medium">{(selectedRecord.troCapGiaDinh || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Thưởng chuyên cần:</span>
                      <span className="font-mono font-medium">{(selectedRecord.thuongChuyenCan || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Thưởng sáng kiến:</span>
                      <span className="font-mono font-medium">{(selectedRecord.thuongSangKien || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-emerald-200/50">
                <span className="text-slate-600">Tổng phụ cấp cố định:</span>
                <span className="font-mono font-semibold">{selectedRecord.phuCapCoDinh.toLocaleString('vi-VN')} VNĐ</span>
              </div>

              {/* Phụ cấp thực tế làm việc nếu có */}
              {((selectedRecord.phuCapMoiTruong || 0) > 0 ||
                (selectedRecord.phuCapXangXe || 0) > 0 ||
                (selectedRecord.anToanVeSinhVien || 0) > 0 ||
                (selectedRecord.phuCapKinhDoanh || 0) > 0 ||
                (selectedRecord.phuCapNangNhoc || 0) > 0) && (
                <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 space-y-1 my-1 text-[11px]">
                  <div className="text-[10px] font-bold text-amber-900 uppercase">Phụ cấp thực tế làm việc:</div>
                  {(selectedRecord.phuCapMoiTruong || 0) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>• PC Môi trường:</span>
                      <span className="font-mono font-semibold text-amber-900">+{selectedRecord.phuCapMoiTruong?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  {(selectedRecord.phuCapXangXe || 0) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>• PC Xăng xe:</span>
                      <span className="font-mono font-semibold text-amber-900">+{selectedRecord.phuCapXangXe?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  {(selectedRecord.anToanVeSinhVien || 0) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>• An toàn vệ sinh viên:</span>
                      <span className="font-mono font-semibold text-amber-900">+{selectedRecord.anToanVeSinhVien?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  {(selectedRecord.phuCapKinhDoanh || 0) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>• PC Kinh doanh:</span>
                      <span className="font-mono font-semibold text-amber-900">+{selectedRecord.phuCapKinhDoanh?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  {(selectedRecord.phuCapNangNhoc || 0) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>• PC Nặng nhọc:</span>
                      <span className="font-mono font-semibold text-amber-900">+{selectedRecord.phuCapNangNhoc?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                </div>
              )}

              {selectedRecord.phuCapPhatSinh > 0 && (
                <div className="flex justify-between py-1 border-b border-emerald-200/50">
                  <span className="text-slate-600">Phụ cấp phát sinh khác (điền tay):</span>
                  <span className="font-mono font-semibold text-amber-800">+{selectedRecord.phuCapPhatSinh.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}

              <div className="flex justify-between pt-2 text-sm font-bold text-emerald-900">
                <span>TỔNG THU NHẬP DỰ KIẾN:</span>
                <span className="font-mono text-base text-emerald-700">{selectedRecord.tongThuNhapDuKien.toLocaleString('vi-VN')} VNĐ/tháng</span>
              </div>
            </div>

            {/* Thành phần gia đình */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Thành Phần Gia Đình</h4>
              {selectedRecord.thongTinGiaDinh && selectedRecord.thongTinGiaDinh.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                  {selectedRecord.thongTinGiaDinh.map((f, i) => (
                    <div key={i} className="p-2.5 flex justify-between bg-white hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-indigo-900 mr-2">{f.quanHe}:</span>
                        <span className="font-semibold uppercase text-slate-800">{f.hoTen}</span>
                        {f.namSinh && <span className="text-slate-400 ml-1">({f.namSinh})</span>}
                      </div>
                      <span className="text-slate-500">{f.ngheNghiep || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Không có thông tin gia đình.</p>
              )}
            </div>

            {selectedRecord.ghiChu && (
              <div className="text-xs p-3 bg-slate-50 rounded-lg">
                <strong className="text-slate-600">Ghi chú:</strong> {selectedRecord.ghiChu}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = selectedRecord;
                      setSelectedRecord(null);
                      setRecordToEdit(rec);
                    }}
                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Chỉnh Sửa Toàn Bộ Hồ Sơ (Admin)</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal (Dành riêng cho Quản trị viên - Admin) */}
      {recordToEdit && (
        <EditRecordModal
          record={recordToEdit}
          tieuChuanLuongList={tieuChuanLuongList}
          onClose={() => setRecordToEdit(null)}
          onSave={async (updated) => {
            if (onEditRecord) {
              const ok = await onEditRecord(updated);
              if (ok) {
                setRecordToEdit(null);
                onRefresh();
                return true;
              }
              return false;
            }
            return false;
          }}
        />
      )}
    </div>
  );
};
