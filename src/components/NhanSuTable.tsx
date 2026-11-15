import React, { useState, useEffect } from 'react';
import { NhanSuRecord, UserProfile, TieuChuanLuongItem } from '../types';
import { exportBienDongNhanSuExcel } from '../utils/excelExport';
import { exportHouseholdAppendix } from '../utils/householdExport';
import { EditRecordModal } from './EditRecordModal';
import {
  Download,
  Search,
  Eye,
  Trash2,
  Filter,
  ShieldCheck,
  User,
  Users,
  CheckCircle,
  X,
  Network,
  ChevronRight,
  Briefcase,
  Pencil,
  Lock,
  Stethoscope,
  Settings2,
  CheckSquare,
  Save
} from 'lucide-react';

interface NhanSuTableProps {
  records: NhanSuRecord[];
  currentUser: UserProfile;
  onRefresh: () => void;
  onDeleteRecord?: (id: string) => Promise<void>;
  onEditRecord?: (updatedRecord: NhanSuRecord) => Promise<boolean>;
  tieuChuanLuongList?: TieuChuanLuongItem[];
}

interface RoleFeaturePermissions {
  nhan_vien_y_te: {
    viewIdentity: boolean;
    viewUnit: boolean;
    viewPosition: boolean;
    viewSensitiveHR: boolean;
    viewSalary: boolean;
    viewMedical: boolean;
    editIdentity: boolean;
    editUnit: boolean;
    editSalary: boolean;
    editMedical: boolean;
    deleteMedicalRecord: boolean;
  };
  nhan_vien_tuyen_dung: {
    viewIdentity: boolean;
    viewUnit: boolean;
    viewPosition: boolean;
    viewSensitiveHR: boolean;
    viewSalary: boolean;
    viewMedical: boolean;
    editIdentity: boolean;
    editUnit: boolean;
    editSalary: boolean;
    editMedical: boolean;
    deleteMedicalRecord: boolean;
  };
}

const DEFAULT_ROLE_PERMISSIONS: RoleFeaturePermissions = {
  nhan_vien_y_te: {
    viewIdentity: true,
    viewUnit: true,
    viewPosition: true,
    viewSensitiveHR: false,
    viewSalary: false,
    viewMedical: true,
    editIdentity: false,
    editUnit: false,
    editSalary: false,
    editMedical: true,
    deleteMedicalRecord: true,
  },
  nhan_vien_tuyen_dung: {
    viewIdentity: true,
    viewUnit: true,
    viewPosition: true,
    viewSensitiveHR: true,
    viewSalary: true,
    viewMedical: true,
    editIdentity: true,
    editUnit: true,
    editSalary: false,
    editMedical: false,
    deleteMedicalRecord: false,
  },
};

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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<NhanSuRecord | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<NhanSuRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hỗ trợ kiểm tra cả currentUser.role và currentUser.hrmRole cho vai trò 'nhan_vien_y_te'
  const isRealAdmin = currentUser.role === 'admin';
  const [adminPreviewRole, setAdminPreviewRole] = useState<'admin' | 'nhan_vien_y_te' | 'nhan_vien_tuyen_dung'>('admin');
  const [showPermissionPanel, setShowPermissionPanel] = useState(false);

  const [rolePermissions, setRolePermissions] = useState<RoleFeaturePermissions>(() => {
    try {
      const saved = localStorage.getItem('hr_table_role_permissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          nhan_vien_y_te: { ...DEFAULT_ROLE_PERMISSIONS.nhan_vien_y_te, ...(parsed.nhan_vien_y_te || {}) },
          nhan_vien_tuyen_dung: { ...DEFAULT_ROLE_PERMISSIONS.nhan_vien_tuyen_dung, ...(parsed.nhan_vien_tuyen_dung || {}) },
        };
      }
    } catch {}
    return DEFAULT_ROLE_PERMISSIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_table_role_permissions', JSON.stringify(rolePermissions));
    } catch {}
  }, [rolePermissions]);

  const effectiveRole = isRealAdmin
    ? adminPreviewRole
    : (currentUser.role as string) === 'nhan_vien_y_te' || currentUser.hrmRole === 'nhan_vien_y_te'
    ? 'nhan_vien_y_te'
    : 'nhan_vien_tuyen_dung';

  const isAdmin = effectiveRole === 'admin';
  const isMedicalStaff = effectiveRole === 'nhan_vien_y_te';
  const activePerms = isMedicalStaff
    ? rolePermissions.nhan_vien_y_te
    : rolePermissions.nhan_vien_tuyen_dung;

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rowAccessGrants, setRowAccessGrants] = useState<Record<string, { yTeEdit: boolean; tuyenDungEdit: boolean }>>(() => {
    try {
      const saved = localStorage.getItem('hr_row_access_grants');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_row_access_grants', JSON.stringify(rowAccessGrants));
    } catch {}
  }, [rowAccessGrants]);

  // Modal chỉnh sửa nhanh thông tin y tế cho nhân viên y tế / Admin
  const [medicalEditTarget, setMedicalEditTarget] = useState<{
    record: NhanSuRecord;
    ngayKham: string;
    ketQuaKham: string;
    ghiChuYTe: string;
  } | null>(null);

  const [recruitmentRefreshTick, setRecruitmentRefreshTick] = useState(0);

  const recruitmentMap = React.useMemo(() => {
    try {
      const cached = localStorage.getItem('hr_recruitment_health_regs');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const map = new Map<string, { id?: string; ngayDangKyKham?: string; trangThai?: string; trangThaiNhanViec?: string; ghiChu?: string }>();
          for (const reg of parsed) {
            if (reg.soCCCD) {
              map.set(reg.soCCCD.replace(/\D/g, ''), reg);
            }
            if (reg.hoVaTen) {
              map.set(reg.hoVaTen.trim().toLowerCase(), reg);
            }
          }
          return map;
        }
      }
    } catch {}
    return new Map();
  }, [records, recruitmentRefreshTick]);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSaveMedicalInfo = async () => {
    if (!medicalEditTarget) return;
    const { record, ngayKham, ketQuaKham, ghiChuYTe } = medicalEditTarget;

    try {
      const cached = localStorage.getItem('hr_recruitment_health_regs');
      const list = cached ? JSON.parse(cached) : [];
      const cleanCCCD = record.soCCCD.replace(/\D/g, '');
      let found = false;
      const updatedList = Array.isArray(list)
        ? list.map((reg: any) => {
            const regCCCD = (reg.soCCCD || '').replace(/\D/g, '');
            const regName = (reg.hoVaTen || '').trim().toLowerCase();
            if ((cleanCCCD && regCCCD === cleanCCCD) || regName === record.hoVaTen.trim().toLowerCase()) {
              found = true;
              return {
                ...reg,
                ngayDangKyKham: ngayKham,
                trangThai: ketQuaKham,
                ghiChu: ghiChuYTe,
              };
            }
            return reg;
          })
        : [];

      if (!found) {
        updatedList.unshift({
          id: `KSK_REC_${Date.now()}`,
          hoVaTen: record.hoVaTen,
          soCCCD: record.soCCCD,
          ngaySinh: record.ngaySinh,
          gioiTinh: record.gioiTinh,
          khoi: record.khoi || '',
          ban: record.ban || '',
          phong: record.phong || '',
          congViec: record.congViecDuKien || '',
          chucVu: record.chucVu || '',
          nhaCungCap: 'Hữu Phúc',
          ngayDangKyKham: ngayKham,
          ngayHenKham: ngayKham,
          nguoiDangKy: currentUser.email,
          trangThai: ketQuaKham,
          ghiChu: ghiChuYTe,
        });
      }

      localStorage.setItem('hr_recruitment_health_regs', JSON.stringify(updatedList));
      setRecruitmentRefreshTick((t) => t + 1);

      if (onEditRecord) {
        await onEditRecord({
          ...record,
          ghiChu: ghiChuYTe,
        });
      }

      setMedicalEditTarget(null);
      notify('success', `Đã cập nhật hồ sơ y tế cho ${record.hoVaTen}.`);
    } catch (err) {
      notify('error', 'Không thể lưu thông tin y tế: ' + (err as Error).message);
    }
  };

  // Lọc tìm kiếm theo tên, số CCCD, chức vụ, email, khối, ban, phòng và trạng thái KSK/Nhận việc
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

    let matchStatus = true;
    if (selectedStatusFilter !== 'ALL') {
      const cleanCCCD = r.soCCCD.replace(/\D/g, '');
      const reg = recruitmentMap.get(cleanCCCD) || recruitmentMap.get(r.hoVaTen.trim().toLowerCase());
      const st = reg?.trangThai || 'Đã khám - Đạt';
      const offer = reg?.trangThaiNhanViec || 'Đã nhận việc';

      if (selectedStatusFilter === 'da_kham') {
        matchStatus = st.includes('Đã khám') || Boolean(reg);
      } else if (selectedStatusFilter === 'chua_kham') {
        matchStatus = !reg || st === 'Chờ khám' || st === 'Hoãn';
      } else if (selectedStatusFilter === 'dat') {
        matchStatus = st === 'Đã khám - Đạt' || st === 'Đã khám (Đạt)' || !reg;
      } else if (selectedStatusFilter === 'khong_dat') {
        matchStatus = st === 'Đã khám - Không đạt' || st === 'Đã khám (không đạt)';
      } else if (selectedStatusFilter === 'da_nhan_viec') {
        matchStatus = offer === 'Đã nhận việc' || !reg;
      } else if (selectedStatusFilter === 'khong_nhan_viec') {
        matchStatus = offer === 'Không nhận việc';
      }
    }

    return matchSearch && matchKhoi && matchStatus;
  });

  // Danh sách các Khối duy nhất hiện có trong dữ liệu
  const uniqueKhois = Array.from(new Set(records.map((r) => r.khoi).filter(Boolean)));

  // Xuất file Excel (.xlsx) Mẫu Biến Động Nhân Sự
  const handleDownloadExcelBienDong = async () => {
    setIsExporting(true);
    try {
      const selectedList = filteredRecords.filter((r) => selectedRowIds.includes(r.id));
      const recordsToExport = selectedList.length > 0 ? selectedList : filteredRecords.length > 0 ? filteredRecords : records;
      if (recordsToExport.length === 0) {
        notify('error', 'Không có bản ghi nào để xuất file Excel.');
        return;
      }
      const fileName =
        recordsToExport.length === 1
          ? `Mau_Bien_Dong_Nhan_Su_${recordsToExport[0].hoVaTen.trim().replace(/\s+/g, '_')}.xlsx`
          : `Mau_Bien_Dong_Nhan_Su_${recordsToExport.length}_Nhan_Vien.xlsx`;
      await exportBienDongNhanSuExcel(recordsToExport, fileName);
    } catch (err) {
      notify('error', 'Lỗi xuất file Excel: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const [isExportingHousehold, setIsExportingHousehold] = useState(false);
  const handleExportHousehold = async () => {
    setIsExportingHousehold(true);
    try {
      const selectedList = filteredRecords.filter((r) => selectedRowIds.includes(r.id));
      const recordsToExport = selectedList.length > 0 ? selectedList : filteredRecords.length > 0 ? filteredRecords : records;
      if (recordsToExport.length === 0) {
        notify('error', 'Không có bản ghi nào để xuất phụ lục hộ gia đình.');
        return;
      }
      await exportHouseholdAppendix(recordsToExport);
    } catch (err) {
      notify('error', 'Lỗi xuất phụ lục hộ gia đình: ' + (err as Error).message);
    } finally {
      setIsExportingHousehold(false);
    }
  };

  const togglePermission = (
    roleKey: keyof RoleFeaturePermissions,
    permKey: keyof RoleFeaturePermissions['nhan_vien_y_te']
  ) => {
    setRolePermissions((prev) => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [permKey]: !prev[roleKey][permKey],
      },
    }));
  };

  const handleBulkGrantRowAccess = (field: 'yTeEdit' | 'tuyenDungEdit', value: boolean) => {
    if (selectedRowIds.length === 0) return;
    setRowAccessGrants((prev) => {
      const next = { ...prev };
      for (const id of selectedRowIds) {
        next[id] = {
          yTeEdit: next[id]?.yTeEdit ?? true,
          tuyenDungEdit: next[id]?.tuyenDungEdit ?? true,
          [field]: value,
        };
      }
      return next;
    });
    notify(
      'success',
      `Đã cập nhật phân quyền dòng cho ${selectedRowIds.length} hồ sơ đã chọn.`
    );
  };

  // Tính toán ẩn/hiện cột dựa trên vai trò
  const showSensitiveHRCol = isAdmin || (!isMedicalStaff && activePerms.viewSensitiveHR);
  const showSalaryCols = isAdmin || (!isMedicalStaff && activePerms.viewSalary);
  const showMedicalCols = isAdmin || isMedicalStaff || activePerms.viewMedical;

  const canEditIdentity = isAdmin || (!isMedicalStaff && activePerms.editIdentity);
  const canEditUnit = isAdmin || (!isMedicalStaff && activePerms.editUnit);
  const canEditMedical = isAdmin || (isMedicalStaff && activePerms.editMedical) || (!isMedicalStaff && activePerms.editMedical);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Export Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {isMedicalStaff
                ? 'Bảng Theo Dõi Sức Khỏe Nhân Sự (Chế độ Y Tế)'
                : 'Cơ Sở Dữ Liệu: Hồ sơ đã lưu'}
            </h2>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Toàn quyền Admin ({records.length} hồ sơ)
              </span>
            ) : isMedicalStaff ? (
              <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <Stethoscope className="w-3.5 h-3.5" /> Nhân viên Y tế ({records.length} hồ sơ)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <User className="w-3.5 h-3.5" /> Nhân viên Tuyển dụng ({records.length} hồ sơ)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Quản trị viên có đặc quyền cấu hình phân quyền cột/dòng theo vai trò và xuất file Biến Động Nhân Sự.'
              : isMedicalStaff
              ? 'Chế độ bảo mật Y tế: Các cột thông tin lương và nhân sự nhạy cảm đã được ẩn. Các ô có biểu tượng khóa (🔒) chỉ được phép xem.'
              : `Chế độ nhân viên: Bạn đang thao tác với tài khoản ${currentUser.email}.`}
          </p>
        </div>

        {/* Các nút công cụ & Phân quyền */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isRealAdmin && (
            <>
              <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <span className="px-2 font-semibold text-slate-600">Xem dưới góc độ:</span>
                <button
                  type="button"
                  onClick={() => setAdminPreviewRole('admin')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    adminPreviewRole === 'admin'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPreviewRole('nhan_vien_y_te')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    adminPreviewRole === 'nhan_vien_y_te'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  NV Y tế
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPreviewRole('nhan_vien_tuyen_dung')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    adminPreviewRole === 'nhan_vien_tuyen_dung'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  NV Tuyển dụng
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPermissionPanel((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  showPermissionPanel
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span>Phân Quyền Tính Năng</span>
              </button>
            </>
          )}

          {!isMedicalStaff && (
            <>
              <button
                type="button"
                onClick={handleDownloadExcelBienDong}
                disabled={isExporting || records.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition disabled:opacity-50 cursor-pointer"
                title="Xuất file mẫu biến động nhân sự"
              >
                <Download className="w-4 h-4 text-white" />
                <span>{isExporting ? 'Đang tạo File Excel...' : 'Xuất file Biến Động Nhân Sự (44 Cột)'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportHousehold}
                disabled={isExportingHousehold || records.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-800 border-2 border-indigo-300 rounded-xl text-xs sm:text-sm font-bold shadow-2xs hover:shadow-xs transition disabled:opacity-50 cursor-pointer"
                title="Xuất phụ lục hộ gia đình"
              >
                <Users className="w-4 h-4 text-indigo-700" />
                <span>{isExportingHousehold ? 'Đang tạo phụ lục...' : 'Xuất phụ lục hộ gia đình'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bảng cấu hình phân quyền theo từng tính năng / cột bằng Checkbox (Dành cho Admin) */}
      {isRealAdmin && showPermissionPanel && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Ma Trận Phân Quyền Truy Cập & Chỉnh Sửa Theo Tính Năng (Tích chọn ô để bật/tắt)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
                notify('success', 'Đã khôi phục cấu hình phân quyền chuẩn mặc định.');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Khôi phục mặc định
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2.5 text-left">Vai trò người dùng</th>
                  <th className="p-2.5 text-center">Xem Thông Tin Cơ Bản</th>
                  <th className="p-2.5 text-center">Xem CCCD & Nhân Sự Nhạy Cảm</th>
                  <th className="p-2.5 text-center">Xem Lương & Phụ Cấp</th>
                  <th className="p-2.5 text-center">Xem Cột Y Tế (KSK)</th>
                  <th className="p-2.5 text-center">Sửa Thông Tin Nhân Sự</th>
                  <th className="p-2.5 text-center">Sửa Kết Quả & Ghi Chú Y Tế</th>
                  <th className="p-2.5 text-center">Xóa Bản Ghi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-bold text-teal-800">
                    Nhân viên Y tế (nhan_vien_y_te)
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.viewIdentity}
                      onChange={() => togglePermission('nhan_vien_y_te', 'viewIdentity')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.viewSensitiveHR}
                      onChange={() => togglePermission('nhan_vien_y_te', 'viewSensitiveHR')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.viewSalary}
                      onChange={() => togglePermission('nhan_vien_y_te', 'viewSalary')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.viewMedical}
                      onChange={() => togglePermission('nhan_vien_y_te', 'viewMedical')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.editIdentity}
                      onChange={() => togglePermission('nhan_vien_y_te', 'editIdentity')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.editMedical}
                      onChange={() => togglePermission('nhan_vien_y_te', 'editMedical')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_y_te.deleteMedicalRecord}
                      onChange={() => togglePermission('nhan_vien_y_te', 'deleteMedicalRecord')}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-blue-800">
                    Nhân viên Tuyển dụng (nhan_vien_tuyen_dung)
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.viewIdentity}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'viewIdentity')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.viewSensitiveHR}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'viewSensitiveHR')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.viewSalary}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'viewSalary')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.viewMedical}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'viewMedical')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.editIdentity}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'editIdentity')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.editMedical}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'editMedical')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rolePermissions.nhan_vien_tuyen_dung.deleteMedicalRecord}
                      onChange={() => togglePermission('nhan_vien_tuyen_dung', 'deleteMedicalRecord')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role notice banner */}
      {isMedicalStaff && (
        <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>Chế độ Nhân viên Y tế (nhan_vien_y_te):</strong> Bạn chỉ được xem và cập nhật các cột thông tin sức khỏe (Ngày khám, Kết quả khám, Ghi chú y tế). Các thông tin lương và nhân sự nhạy cảm đã được ẩn; các ô có biểu tượng <Lock className="w-3 h-3 inline text-slate-500" /> không có quyền chỉnh sửa.
            </span>
          </div>
        </div>
      )}

      {/* Bulk Action Bar khi tích chọn các dòng */}
      {selectedRowIds.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-bold text-emerald-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>Đã chọn {selectedRowIds.length} hồ sơ nhân sự</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isRealAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleBulkGrantRowAccess('yTeEdit', true)}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer transition"
                >
                  Mở quyền sửa Y tế ({selectedRowIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkGrantRowAccess('yTeEdit', false)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Khóa quyền sửa Y tế</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedRowIds([])}
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 font-medium cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto items-stretch sm:items-center flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm nhanh theo Tên hoặc Mã nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-600 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {uniqueKhois.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedKhoiFilter}
                onChange={(e) => setSelectedKhoiFilter(e.target.value)}
                className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 font-medium"
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

          <div className="flex items-center gap-1.5">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">-- Tất cả trạng thái KSK & Nhận việc --</option>
              <option value="da_kham">Đã khám</option>
              <option value="chua_kham">Chưa khám</option>
              <option value="dat">Đạt</option>
              <option value="khong_dat">Không đạt</option>
              <option value="da_nhan_viec">Đã nhận việc</option>
              <option value="khong_nhan_viec">Không nhận việc</option>
            </select>
          </div>
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
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả hồ sơ"
                    checked={selectedRowIds.length === filteredRecords.length && filteredRecords.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRowIds(filteredRecords.map((r) => r.id));
                      else setSelectedRowIds([]);
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <span>Mã & Thời Gian</span>
                    {!isAdmin && (
                      <span title="Chỉ xem - Không có quyền chỉnh sửa">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </div>
                </th>
                <th className="p-3 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <span>Họ Và Tên</span>
                    {!canEditIdentity && (
                      <span title="Chỉ xem - Không có quyền chỉnh sửa">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </div>
                </th>
                {showSensitiveHRCol && (
                  <th className="p-3 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <span>Số CCCD</span>
                      {!canEditIdentity && (
                        <span title="Chỉ xem - Không có quyền chỉnh sửa">
                          <Lock className="w-3 h-3 text-slate-400" />
                        </span>
                      )}
                    </div>
                  </th>
                )}
                <th className="p-3 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <span>Đơn Vị (Khối &gt; Ban &gt; Phòng)</span>
                    {!canEditUnit && (
                      <span title="Chỉ xem - Không có quyền chỉnh sửa">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </div>
                </th>
                <th className="p-3 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <span>Chức Vụ</span>
                    {!canEditUnit && (
                      <span title="Chỉ xem - Không có quyền chỉnh sửa">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </div>
                </th>
                {isAdmin && <th className="p-3 whitespace-nowrap">Email Người Gửi</th>}
                {showSalaryCols && (
                  <>
                    <th className="p-3 whitespace-nowrap text-right">Lương CB</th>
                    <th className="p-3 whitespace-nowrap text-right">Phụ Cấp</th>
                    <th className="p-3 whitespace-nowrap text-right">Tổng Thu Nhập</th>
                    <th className="p-3 whitespace-nowrap text-center">Email Xác Nhận</th>
                  </>
                )}
                {showMedicalCols && (
                  <>
                    <th className="p-3 whitespace-nowrap bg-teal-50/70 text-teal-900">
                      <div className="inline-flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                        <span>Ngày Khám (ngayKham)</span>
                        {!canEditMedical && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                    </th>
                    <th className="p-3 whitespace-nowrap bg-teal-50/70 text-teal-900">
                      <div className="inline-flex items-center gap-1">
                        <span>Kết Quả Khám (ketQuaKham)</span>
                        {!canEditMedical && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                    </th>
                    <th className="p-3 whitespace-nowrap bg-teal-50/70 text-teal-900">
                      <div className="inline-flex items-center gap-1">
                        <span>Ghi Chú Y Tế (ghiChuYTe)</span>
                        {!canEditMedical && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                    </th>
                  </>
                )}
                <th className="p-3 whitespace-nowrap text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-400 text-xs">
                    Không tìm thấy hồ sơ nhân sự nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const cleanCCCD = item.soCCCD.replace(/\D/g, '');
                  const reg = recruitmentMap.get(cleanCCCD) || recruitmentMap.get(item.hoVaTen.trim().toLowerCase());
                  const ngayKham = reg?.ngayDangKyKham || item.ngayVaoLam || 'Chưa hẹn';
                  const ketQuaKham = reg?.trangThai || 'Đã khám - Đạt';
                  const ghiChuYTe = reg?.ghiChu || item.ghiChu || 'Không có ghi chú y tế';

                  const rowGrant = rowAccessGrants[item.id];
                  const rowMedicalEditable =
                    canEditMedical && (rowGrant?.yTeEdit !== undefined ? rowGrant.yTeEdit : true);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Chọn hồ sơ ${item.hoVaTen}`}
                          checked={selectedRowIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRowIds((prev) => [...prev, item.id]);
                            else setSelectedRowIds((prev) => prev.filter((id) => id !== item.id));
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Mã & Thời gian (Chỉ xem đối với NV Y tế) */}
                      <td className="p-3">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <div className="font-mono font-semibold text-blue-900">{item.id}</div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </div>
                          </div>
                          {!isAdmin && (
                            <span title="Ô dữ liệu bị khóa - Bạn không có quyền chỉnh sửa mã hồ sơ" className="shrink-0">
                              <Lock className="w-3 h-3 text-slate-300" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Họ và tên */}
                      <td className="p-3 font-bold text-slate-900 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            {item.hoVaTen}
                            <div className="text-[11px] font-normal text-slate-500 normal-case">
                              {item.ngaySinh} ({item.gioiTinh})
                            </div>
                          </div>
                          {!canEditIdentity && (
                            <span title="Chỉ xem - Nhân viên y tế không có quyền sửa thông tin cá nhân" className="shrink-0">
                              <Lock className="w-3 h-3 text-slate-300" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số CCCD - Ẩn đối với nhân viên y tế */}
                      {showSensitiveHRCol && (
                        <td className="p-3 font-mono font-medium text-slate-700">
                          <div className="flex items-center justify-between gap-1">
                            <span>{item.soCCCD}</span>
                            {!canEditIdentity && (
                              <span title="Chỉ xem - Không có quyền chỉnh sửa" className="shrink-0">
                                <Lock className="w-3 h-3 text-slate-300" />
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Phân cấp cơ cấu tổ chức: Khối > Ban > Phòng */}
                      <td className="p-3 min-w-[200px]">
                        <div className="flex items-center justify-between gap-1">
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
                          {!canEditUnit && (
                            <span title="Chỉ xem - Không có quyền chỉnh sửa đơn vị" className="shrink-0">
                              <Lock className="w-3 h-3 text-slate-300" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Chức vụ */}
                      <td className="p-3">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px] inline-block border border-indigo-100">
                                {item.chucVu}
                              </span>
                              {!isMedicalStaff && (
                                item.isManualSalary ? (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                    Thủ công
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                    Tiêu chuẩn
                                  </span>
                                )
                              )}
                            </div>
                            {item.congViecDuKien && (
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                                <Briefcase className="w-3 h-3 text-slate-400" />
                                <span>CV: {item.congViecDuKien}</span>
                              </div>
                            )}
                          </div>
                          {!canEditUnit && (
                            <span title="Chỉ xem - Không có quyền chỉnh sửa chức vụ" className="shrink-0">
                              <Lock className="w-3 h-3 text-slate-300" />
                            </span>
                          )}
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="p-3 text-slate-600 truncate max-w-[140px]" title={item.userEmail}>
                          {item.userEmail}
                        </td>
                      )}

                      {showSalaryCols && (
                        <>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {item.luongCoBan.toLocaleString('vi-VN')} đ
                          </td>

                          <td className="p-3 text-right font-mono text-slate-700">
                            <div>
                              {(
                                item.tongPhuCap ??
                                item.phuCapCoDinh + item.phuCapPhatSinh + (item.phuCapNangLuc || 0)
                              ).toLocaleString('vi-VN')}{' '}
                              đ
                            </div>
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
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.trangThaiEmail === 'Đã gửi'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.trangThaiEmail === 'Lỗi'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.trangThaiEmail === 'Đã gửi' && (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>{item.trangThaiEmail || 'Chờ gửi'}</span>
                            </span>
                          </td>
                        </>
                      )}

                      {showMedicalCols && (
                        <>
                          <td className="p-3 text-slate-700 font-mono text-[11px] bg-teal-50/20">
                            <div className="flex items-center justify-between gap-1">
                              <span>{ngayKham}</span>
                              {!rowMedicalEditable && (
                                <span title="Không có quyền chỉnh sửa ngày khám" className="shrink-0">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 bg-teal-50/20">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`px-2 py-1 rounded font-bold text-[10px] border ${
                                  ketQuaKham.includes('Không đạt') || ketQuaKham.includes('không đạt')
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : ketQuaKham.includes('Chờ') || ketQuaKham.includes('Hoãn')
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {ketQuaKham}
                              </span>
                              {!rowMedicalEditable && (
                                <span title="Không có quyền chỉnh sửa kết quả khám" className="shrink-0">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className="p-3 text-slate-600 text-[11px] max-w-[180px] bg-teal-50/20"
                            title={ghiChuYTe}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate">{ghiChuYTe}</span>
                              {rowMedicalEditable ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMedicalEditTarget({
                                      record: item,
                                      ngayKham: ngayKham === 'Chưa hẹn' ? new Date().toISOString().slice(0, 10) : ngayKham,
                                      ketQuaKham,
                                      ghiChuYTe: ghiChuYTe === 'Không có ghi chú y tế' ? '' : ghiChuYTe,
                                    })
                                  }
                                  className="text-teal-600 hover:text-teal-800 p-0.5 rounded hover:bg-teal-100/60 shrink-0 cursor-pointer"
                                  title="Cập nhật thông tin khám sức khỏe"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              ) : (
                                <span title="Không có quyền chỉnh sửa ghi chú y tế" className="shrink-0">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedRecord(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {rowMedicalEditable && (
                            <button
                              onClick={() =>
                                setMedicalEditTarget({
                                  record: item,
                                  ngayKham: ngayKham === 'Chưa hẹn' ? new Date().toISOString().slice(0, 10) : ngayKham,
                                  ketQuaKham,
                                  ghiChuYTe: ghiChuYTe === 'Không có ghi chú y tế' ? '' : ghiChuYTe,
                                })
                              }
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                              title="Cập nhật Ngày khám / Kết quả KSK / Ghi chú y tế"
                            >
                              <Stethoscope className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setRecordToEdit(item)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                              title="Chỉnh sửa toàn bộ hồ sơ (Quyền Admin)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {(isAdmin || (isMedicalStaff && activePerms.deleteMedicalRecord)) && onDeleteRecord && (
                            <button
                              onClick={() => {
                                onDeleteRecord(item.id);
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Xóa hồ sơ"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      </div>

      {/* Modal cập nhật thông tin Y tế (Dành cho Nhân viên Y tế & Admin) */}
      {medicalEditTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setMedicalEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cập Nhật Hồ Sơ Khám Sức Khỏe
                  </h3>
                  <p className="text-[11px] text-slate-500">{medicalEditTarget.record.hoVaTen}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMedicalEditTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngày khám (ngayKham)
                </label>
                <input
                  type="date"
                  value={medicalEditTarget.ngayKham}
                  onChange={(e) =>
                    setMedicalEditTarget((prev) =>
                      prev ? { ...prev, ngayKham: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kết quả khám (ketQuaKham)
                </label>
                <select
                  value={medicalEditTarget.ketQuaKham}
                  onChange={(e) =>
                    setMedicalEditTarget((prev) =>
                      prev ? { ...prev, ketQuaKham: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                >
                  <option value="Chờ khám">Chờ khám</option>
                  <option value="Đã khám - Đạt">Đã khám - Đạt</option>
                  <option value="Đã khám - Không đạt">Đã khám - Không đạt</option>
                  <option value="Hoãn">Hoãn / Khám bổ sung</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú y tế (ghiChuYTe)
                </label>
                <textarea
                  rows={3}
                  value={medicalEditTarget.ghiChuYTe}
                  onChange={(e) =>
                    setMedicalEditTarget((prev) =>
                      prev ? { ...prev, ghiChuYTe: e.target.value } : null
                    )
                  }
                  placeholder="Nhập nhận xét chuyên môn y tế, tiền sử hoặc lưu ý sức khỏe..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMedicalEditTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveMedicalInfo}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Thông Tin Y Tế</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-xs text-slate-500">
                  Mã: {selectedRecord.id} | Nộp lúc: {new Date(selectedRecord.timestamp).toLocaleString('vi-VN')}
                </p>
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
              <div>
                <span className="text-slate-500">Họ và tên:</span>{' '}
                <strong className="text-slate-800">{selectedRecord.hoVaTen}</strong>
              </div>
              <div>
                <span className="text-slate-500">Ngày sinh:</span> {selectedRecord.ngaySinh} ({selectedRecord.gioiTinh})
              </div>
              {showSensitiveHRCol && (
                <>
                  <div>
                    <span className="text-slate-500">Số CCCD:</span>{' '}
                    <strong className="font-mono text-slate-800">{selectedRecord.soCCCD}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Số điện thoại:</span> {selectedRecord.soDienThoai || 'N/A'}
                  </div>
                  <div>
                    <span className="text-slate-500">Ngày & Nơi cấp:</span> {selectedRecord.ngayCap} ({selectedRecord.noiCap})
                  </div>
                  <div>
                    <span className="text-slate-500">Email người nộp:</span>{' '}
                    <span className="text-blue-700 font-medium">{selectedRecord.userEmail}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Quê quán:</span> {selectedRecord.queQuan}
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Thường trú:</span> {selectedRecord.diaChiThuongTru}
                  </div>
                </>
              )}
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
                <span>VỊ TRÍ CÔNG TÁC & CHỨC VỤ</span>
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

            {/* Chỉ hiển thị thông tin nhân sự & bảng lương khi KHÔNG phải là nhân viên y tế (hoặc được cấp quyền) */}
            {showSensitiveHRCol && (
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <h4 className="mb-3 font-bold text-slate-800">Thông tin tiếp nhận bổ sung</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Ngày vào làm việc', selectedRecord.ngayVaoLam?.split('-').reverse().join('/')],
                    ['Tình trạng hôn nhân', selectedRecord.tinhTrangHonNhan],
                    ['Ngày hết hạn CCCD', selectedRecord.ngayHetHanCCCD],
                    ['Thẩm quyền', selectedRecord.thamQuyen],
                    ['Phụ cấp năng lực', (selectedRecord.phuCapNangLuc || 0).toLocaleString('vi-VN') + ' đ'],
                    ['Địa chỉ tạm trú hiện tại', selectedRecord.diaChiTamTru],
                    ['Email cá nhân', selectedRecord.emailCaNhan],
                    ['Tình trạng hồ sơ', selectedRecord.tinhTrangHoSo],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-800">
                        {value || 'Chưa nhập'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {showSalaryCols && (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-900 uppercase">
                    Cơ Cấu Thu Nhập Hàng Tháng ({selectedRecord.chucVu})
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedRecord.isManualSalary
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {selectedRecord.isManualSalary ? 'Chế độ: Nhập thủ công' : 'Chế độ: Tiêu chuẩn 22 vị trí'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-emerald-200/50">
                  <span className="text-slate-600">Lương cơ bản:</span>
                  <span className="font-mono font-semibold">
                    {selectedRecord.luongCoBan.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

                {!selectedRecord.isManualSalary && (
                  <div className="bg-white/60 p-2.5 rounded-lg border border-emerald-100 space-y-1 my-1">
                    <div className="text-[10px] font-bold text-emerald-900 uppercase">
                      Chi tiết phụ cấp tiêu chuẩn:
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span>• PC Chức vụ:</span>
                        <span className="font-mono font-medium">
                          {(selectedRecord.phuCapChucVu || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• PC Điện thoại:</span>
                        <span className="font-mono font-medium">
                          {(selectedRecord.phuCapDienThoai || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• TC Tay nghề:</span>
                        <span className="font-mono font-medium">
                          {(selectedRecord.troCapTayNghe || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• TC Gia đình:</span>
                        <span className="font-mono font-medium">
                          {(selectedRecord.troCapGiaDinh || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Thưởng chuyên cần:</span>
                        <span className="font-mono font-medium">
                          {(selectedRecord.thuongChuyenCan || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Thưởng sáng kiến:</span>
                        <span className="font-mono font-medium">
                          {(selectedRecord.thuongSangKien || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-emerald-200/50">
                  <span className="text-slate-600">Tổng phụ cấp cố định:</span>
                  <span className="font-mono font-semibold">
                    {selectedRecord.phuCapCoDinh.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

                <div className="flex justify-between pt-2 text-sm font-bold text-emerald-900">
                  <span>TỔNG THU NHẬP DỰ KIẾN:</span>
                  <span className="font-mono text-base text-emerald-700">
                    {selectedRecord.tongThuNhapDuKien.toLocaleString('vi-VN')} VNĐ/tháng
                  </span>
                </div>
              </div>
            )}

            {selectedRecord.ghiChu && (
              <div className="text-xs p-3 bg-slate-50 rounded-lg">
                <strong className="text-slate-600">Ghi chú / Y tế:</strong> {selectedRecord.ghiChu}
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

