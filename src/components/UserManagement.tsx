import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, SystemUserAccount, HrmSubRole } from '../types';
import { safeFetchJson } from '../utils/apiHelper';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Mail,
  Trash2,
  Edit2,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  CheckCircle2,
  RotateCcw,
  Save,
  UserCog,
  Layers,
  Copy,
  Check,
  FileSpreadsheet,
  PlusCircle,
  BookOpen,
  CheckSquare
} from 'lucide-react';

export interface CrudPermission {
  view: boolean;   // Đọc (Xem)
  create: boolean; // Thêm (Tạo mới)
  edit: boolean;   // Sửa (Cập nhật)
  delete: boolean; // Xóa
}

export type RoleMatrixKey =
  | 'nhan_vien_tuyen_dung'
  | 'nhan_vien_y_te'
  | 'nhan_vien_quan_ly_ho_so'
  | 'truong_nhom_cnb'
  | 'truong_nhom_tuyen_dung'
  | 'admin';

export interface RoleColumnDefinition {
  key: RoleMatrixKey;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  accent: 'sky' | 'teal' | 'amber' | 'emerald' | 'indigo' | 'purple';
  headerBg: string;
  cellBg: string;
  badgeCls: string;
  activeTabCls: string;
}

export const ROLE_DEFINITIONS: RoleColumnDefinition[] = [
  {
    key: 'nhan_vien_tuyen_dung',
    index: 1,
    label: '1. Nhân viên tuyển dụng',
    shortLabel: 'Tuyển dụng',
    description: 'Tiếp nhận ứng viên, quét CCCD, đăng ký KSK tuyển dụng',
    accent: 'sky',
    headerBg: 'bg-sky-50/70',
    cellBg: 'bg-sky-50/15',
    badgeCls: 'bg-sky-100 text-sky-800 border-sky-200',
    activeTabCls: 'bg-sky-600 text-white border-sky-600 shadow-sm',
  },
  {
    key: 'nhan_vien_y_te',
    index: 2,
    label: '2. Nhân viên y tế',
    shortLabel: 'Y tế',
    description: 'Theo dõi lịch khám, cập nhật kết quả KSK & thống kê Y tế',
    accent: 'teal',
    headerBg: 'bg-teal-50/70',
    cellBg: 'bg-teal-50/15',
    badgeCls: 'bg-teal-100 text-teal-800 border-teal-200',
    activeTabCls: 'bg-teal-600 text-white border-teal-600 shadow-sm',
  },
  {
    key: 'nhan_vien_quan_ly_ho_so',
    index: 3,
    label: '3. Nhân viên quản lý hồ sơ',
    shortLabel: 'Quản lý hồ sơ',
    description: 'Rà soát, lưu trữ, cập nhật hồ sơ nhân sự & thông tin hộ gia đình',
    accent: 'amber',
    headerBg: 'bg-amber-50/70',
    cellBg: 'bg-amber-50/15',
    badgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
    activeTabCls: 'bg-amber-600 text-white border-amber-600 shadow-sm',
  },
  {
    key: 'truong_nhom_cnb',
    index: 4,
    label: '4. Trưởng nhóm C&B',
    shortLabel: 'Trưởng nhóm C&B',
    description: 'Quản lý tiêu chuẩn lương, phụ cấp, BHXH & phê duyệt chế độ',
    accent: 'emerald',
    headerBg: 'bg-emerald-50/70',
    cellBg: 'bg-emerald-50/15',
    badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    activeTabCls: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
  },
  {
    key: 'truong_nhom_tuyen_dung',
    index: 5,
    label: '5. Trưởng nhóm tuyển dụng',
    shortLabel: 'Tuyển dụng nhóm',
    description: 'Giám sát toàn bộ quy trình tuyển dụng, KSK, điều phối phòng ban',
    accent: 'indigo',
    headerBg: 'bg-indigo-50/70',
    cellBg: 'bg-indigo-50/15',
    badgeCls: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    activeTabCls: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
  },
  {
    key: 'admin',
    index: 6,
    label: '6. Admin (Full quyền)',
    shortLabel: 'Admin',
    description: 'Toàn quyền quản trị hệ thống, cấu hình & cấp phát tài khoản',
    accent: 'purple',
    headerBg: 'bg-purple-50/70',
    cellBg: 'bg-purple-50/15',
    badgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
    activeTabCls: 'bg-purple-600 text-white border-purple-600 shadow-sm',
  },
];

export interface ModulePermissionItem {
  id: string;
  code: string;
  stt: number;
  groupName: string;
  name: string;
  description: string;
  category: 'intake' | 'health' | 'records' | 'cnb' | 'admin';
}

export type RolePermissionMatrix = Record<
  string,
  Record<RoleMatrixKey, CrudPermission>
>;

export type AccountCustomPermissionMap = Record<string, Record<string, CrudPermission>>;

export const SYSTEM_MODULES: ModulePermissionItem[] = [
  {
    id: 'sop_intake',
    code: 'A1',
    stt: 1,
    groupName: 'Nhóm A — Tiếp nhận Nhân viên mới (SOP 4 bước)',
    name: 'Bước 1 & 2: Quét CCCD/VNeID bằng AI OCR & Đối chiếu thông tin cá nhân',
    description: 'Tải ảnh CCCD/VNeID, trích xuất AI OCR, kiểm tra nhân thân và lưu bản nháp tiếp nhận.',
    category: 'intake',
  },
  {
    id: 'sop_org_assign',
    code: 'A2',
    stt: 2,
    groupName: 'Nhóm A — Tiếp nhận Nhân viên mới (SOP 4 bước)',
    name: 'Bước 3: Phân bổ Khối / Ban / Phòng, Điểm làm việc & Loại hợp đồng',
    description: 'Gán cơ cấu tổ chức (Khối > Ban > Phòng), vị trí công việc và chức vụ cho nhân viên mới.',
    category: 'intake',
  },
  {
    id: 'sop_salary_assign',
    code: 'A3',
    stt: 3,
    groupName: 'Nhóm A — Tiếp nhận Nhân viên mới (SOP 4 bước)',
    name: 'Bước 4: Áp khung Lương cơ bản, Phụ cấp, BHXH & Hoàn tất lưu hồ sơ',
    description: 'Tự động áp tiêu chuẩn lương hoặc nhập lương/phụ cấp thủ công trước khi ghi vào hệ thống.',
    category: 'intake',
  },
  {
    id: 'ksk_dang_ky',
    code: 'B1',
    stt: 4,
    groupName: 'Nhóm B — Quản lý Khám sức khỏe (KSK) Tuyển dụng',
    name: '1. Đăng ký KSK tuyển dụng & Gửi thông báo đẩy cho Y tế',
    description: 'Quét CCCD hàng loạt ứng viên, lập danh sách hẹn khám và bắn thông báo đẩy sang bộ phận Y tế.',
    category: 'health',
  },
  {
    id: 'ksk_theo_doi',
    code: 'B2',
    stt: 5,
    groupName: 'Nhóm B — Quản lý Khám sức khỏe (KSK) Tuyển dụng',
    name: '2. Theo dõi KSK tuyển dụng, Ngày khám & Ghi chú (Hạng mục khám không đạt)',
    description: 'Cập nhật ngày khám sức khỏe, trạng thái Đạt / Không đạt / Hoãn và ghi chú hạng mục khám không đạt.',
    category: 'health',
  },
  {
    id: 'ksk_tiep_nhan_sau_kham',
    code: 'B3',
    stt: 6,
    groupName: 'Nhóm B — Quản lý Khám sức khỏe (KSK) Tuyển dụng',
    name: '3. Tiếp nhận sau KSK (Chuyển nhân viên mới / Không nhận việc / Chuyển địa điểm)',
    description: 'Danh sách ứng viên đã thực hiện KSK (Đạt & Không đạt) từ Bước 2 chuyển sang để tích chọn phương án tiếp nhận.',
    category: 'health',
  },
  {
    id: 'ksk_tieu_chuan',
    code: 'B4',
    stt: 7,
    groupName: 'Nhóm B — Quản lý Khám sức khỏe (KSK) Tuyển dụng',
    name: '4. Tiêu chuẩn KSK tuyển dụng & Danh mục Phòng khám / Nhà cung cấp',
    description: 'Tra cứu và thiết lập ma trận 15 hạng mục khám theo từng Phòng/Bếp và quản lý đơn vị khám.',
    category: 'health',
  },
  {
    id: 'ksk_dashboard',
    code: 'B5',
    stt: 8,
    groupName: 'Nhóm B — Quản lý Khám sức khỏe (KSK) Tuyển dụng',
    name: '7. Dashboard thống kê KSK tuyển dụng & Xuất báo cáo Excel KSK',
    description: 'Xem biểu đồ tỷ lệ Đạt/Không đạt theo Phòng/Ban và xuất file Excel báo cáo KSK nhiều sheet.',
    category: 'health',
  },
  {
    id: 'ho_so_nhan_su',
    code: 'C1',
    stt: 9,
    groupName: 'Nhóm C — Quản lý Hồ sơ Nhân sự & Dữ liệu C&B',
    name: 'Bảng Hồ sơ Nhân sự — Thông tin hành chính, Liên hệ & Hộ gia đình',
    description: 'Xem, thêm mới, chỉnh sửa, xóa và xuất Excel danh sách nhân sự (CCCD, địa chỉ, học vấn, hộ gia đình).',
    category: 'records',
  },
  {
    id: 'ho_so_luong_cnb',
    code: 'C2',
    stt: 10,
    groupName: 'Nhóm C — Quản lý Hồ sơ Nhân sự & Dữ liệu C&B',
    name: 'Bảng Hồ sơ Nhân sự — Cột dữ liệu nhạy cảm (Lương, Phụ cấp, Thưởng, BHXH)',
    description: 'Quyền đọc, thêm, sửa, xóa các cột thu nhập, lương cơ bản, phụ cấp cố định/phát sinh trong bảng nhân sự.',
    category: 'cnb',
  },
  {
    id: 'quan_tri_tieu_chuan_luong',
    code: 'D1',
    stt: 11,
    groupName: 'Nhóm D — Danh mục Hệ thống, Khung Lương & Quản trị Tài khoản',
    name: 'Quản lý Bảng tiêu chuẩn lương (Sheet TieuChuanLuong)',
    description: 'Thiết lập định mức lương cơ bản, bậc lương và phụ cấp theo chức vụ trên Sheet TieuChuanLuong.',
    category: 'cnb',
  },
  {
    id: 'quan_tri_co_cau_to_chuc',
    code: 'D2',
    stt: 12,
    groupName: 'Nhóm D — Danh mục Hệ thống, Khung Lương & Quản trị Tài khoản',
    name: 'Quản lý cơ cấu tổ chức',
    description: 'Thiết lập và cập nhật sơ đồ cơ cấu tổ chức Khối > Ban > Phòng toàn công ty.',
    category: 'cnb',
  },
  {
    id: 'quan_tri_he_thong',
    code: 'D3',
    stt: 13,
    groupName: 'Nhóm D — Danh mục Hệ thống, Khung Lương & Quản trị Tài khoản',
    name: 'Quản lý Tài khoản người dùng & Cấu hình Ma trận Phân quyền (RBAC)',
    description: 'Tạo/sửa/xóa tài khoản, đặt lại mật khẩu và phân quyền Đọc/Thêm/Sửa/Xóa cho các vai trò.',
    category: 'admin',
  },
];

export const DEFAULT_ROLE_MATRIX: RolePermissionMatrix = {
  sop_intake: {
    nhan_vien_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: true, edit: true, delete: false },
    truong_nhom_cnb: { view: true, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  sop_org_assign: {
    nhan_vien_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: true, edit: true, delete: false },
    truong_nhom_cnb: { view: true, create: false, edit: true, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  sop_salary_assign: {
    nhan_vien_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: true, create: true, edit: true, delete: true },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ksk_dang_ky: {
    nhan_vien_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    nhan_vien_y_te: { view: true, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: false, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ksk_theo_doi: {
    nhan_vien_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: true, create: true, edit: true, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: false, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ksk_tiep_nhan_sau_kham: {
    nhan_vien_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    nhan_vien_y_te: { view: true, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: true, edit: true, delete: false },
    truong_nhom_cnb: { view: false, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ksk_tieu_chuan: {
    nhan_vien_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: true, create: true, edit: true, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: true, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: false, edit: true, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ksk_dashboard: {
    nhan_vien_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: true, create: true, edit: true, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: true, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ho_so_nhan_su: {
    nhan_vien_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: true, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: true, edit: true, delete: true },
    truong_nhom_cnb: { view: true, create: false, edit: true, delete: false },
    truong_nhom_tuyen_dung: { view: true, create: true, edit: true, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  ho_so_luong_cnb: {
    nhan_vien_tuyen_dung: { view: false, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: true, create: true, edit: true, delete: true },
    truong_nhom_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  quan_tri_tieu_chuan_luong: {
    nhan_vien_tuyen_dung: { view: false, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: true, create: true, edit: true, delete: true },
    truong_nhom_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  quan_tri_co_cau_to_chuc: {
    nhan_vien_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: true, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: true, create: true, edit: true, delete: true },
    truong_nhom_tuyen_dung: { view: true, create: false, edit: false, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  quan_tri_he_thong: {
    nhan_vien_tuyen_dung: { view: false, create: false, edit: false, delete: false },
    nhan_vien_y_te: { view: false, create: false, edit: false, delete: false },
    nhan_vien_quan_ly_ho_so: { view: false, create: false, edit: false, delete: false },
    truong_nhom_cnb: { view: false, create: false, edit: false, delete: false },
    truong_nhom_tuyen_dung: { view: false, create: false, edit: false, delete: false },
    admin: { view: true, create: true, edit: true, delete: true },
  },
};

const ROLE_MATRIX_STORAGE_KEY = 'hr_module_role_permissions_v1';
const ACCOUNT_CUSTOM_PERM_STORAGE_KEY = 'hr_account_custom_permissions_v1';

function normalizeCrudPerm(raw: any, fallback: CrudPermission): CrudPermission {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const view = raw.view !== undefined ? Boolean(raw.view) : fallback.view;
  const edit = raw.edit !== undefined ? Boolean(raw.edit) : fallback.edit;
  const create = raw.create !== undefined ? Boolean(raw.create) : edit;
  const del = raw.delete !== undefined ? Boolean(raw.delete) : fallback.delete;
  return {
    view: view || create || edit || del,
    create,
    edit,
    delete: del,
  };
}

function normalizeLoadedRoleMatrix(raw?: Record<string, any>): RolePermissionMatrix {
  const result: RolePermissionMatrix = { ...DEFAULT_ROLE_MATRIX };
  for (const mod of SYSTEM_MODULES) {
    const defRow = DEFAULT_ROLE_MATRIX[mod.id];
    const fallbackLegacyRow =
      mod.id === 'quan_tri_tieu_chuan_luong' || mod.id === 'quan_tri_co_cau_to_chuc'
        ? raw?.quan_tri_cnb_org
        : undefined;
    const rawRow = raw?.[mod.id] || fallbackLegacyRow || {};
    result[mod.id] = {
      nhan_vien_tuyen_dung: normalizeCrudPerm(rawRow.nhan_vien_tuyen_dung, defRow.nhan_vien_tuyen_dung),
      nhan_vien_y_te: normalizeCrudPerm(rawRow.nhan_vien_y_te, defRow.nhan_vien_y_te),
      nhan_vien_quan_ly_ho_so: normalizeCrudPerm(rawRow.nhan_vien_quan_ly_ho_so, defRow.nhan_vien_quan_ly_ho_so),
      truong_nhom_cnb: normalizeCrudPerm(rawRow.truong_nhom_cnb, defRow.truong_nhom_cnb),
      truong_nhom_tuyen_dung: normalizeCrudPerm(rawRow.truong_nhom_tuyen_dung, defRow.truong_nhom_tuyen_dung),
      admin: normalizeCrudPerm(rawRow.admin, defRow.admin),
    };
  }
  return result;
}

const getPermissionSummaryBadge = (perm: CrudPermission) => {
  const count =
    (perm.view ? 1 : 0) +
    (perm.create ? 1 : 0) +
    (perm.edit ? 1 : 0) +
    (perm.delete ? 1 : 0);

  if (count === 4) {
    return {
      label: 'Toàn quyền (4/4)',
      shortLabel: 'Đọc/Thêm/Sửa/Xóa',
      className: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }
  if (!perm.view && !perm.create && !perm.edit && !perm.delete) {
    return {
      label: 'Không có quyền (0/4)',
      shortLabel: 'Không có quyền',
      className: 'bg-slate-100 text-slate-500 border-slate-200',
    };
  }
  const activeParts: string[] = [];
  if (perm.view) activeParts.push('Đọc');
  if (perm.create) activeParts.push('Thêm');
  if (perm.edit) activeParts.push('Sửa');
  if (perm.delete) activeParts.push('Xóa');
  const joined = activeParts.join(' · ');

  if (perm.create || perm.edit) {
    return {
      label: `${joined} (${count}/4)`,
      shortLabel: joined,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }
  return {
    label: `${joined} (${count}/4)`,
    shortLabel: joined,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  };
};

const DEFAULT_ADMIN_ACCOUNT: SystemUserAccount = {
  id: 'usr_admin_01',
  username: 'admin',
  email: 'happyendpu@gmail.com',
  fullName: 'Quản Trị Viên Hệ Thống',
  role: 'admin',
  hrmRole: 'admin',
  status: 'active',
  createdAt: '2026-09-01T08:00:00.000Z',
};

interface UserManagementProps {
  currentUser: UserProfile;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<SystemUserAccount[]>([DEFAULT_ADMIN_ACCOUNT]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<SystemUserAccount | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix>(() => {
    try {
      const saved = localStorage.getItem(ROLE_MATRIX_STORAGE_KEY);
      if (saved) {
        return normalizeLoadedRoleMatrix(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return DEFAULT_ROLE_MATRIX;
  });

  const [savedRoleMatrix, setSavedRoleMatrix] = useState<RolePermissionMatrix>(() => {
    try {
      const saved = localStorage.getItem(ROLE_MATRIX_STORAGE_KEY);
      if (saved) {
        return normalizeLoadedRoleMatrix(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return DEFAULT_ROLE_MATRIX;
  });

  const [accountCustomPerms, setAccountCustomPerms] = useState<AccountCustomPermissionMap>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [savedAccountCustomPerms, setSavedAccountCustomPerms] = useState<AccountCustomPermissionMap>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // 3 chế độ hiển thị:
  // 'role_form': Form phân quyền chi tiết từng vai trò (Bảng có Cột = Nghiệp vụ Đọc/Thêm/Sửa/Xóa, Hàng = Danh sách tính năng)
  // 'by_role': Bảng ma trận tổng hợp 6 vai trò trên cùng 1 bảng
  // 'by_account': Bảng phân quyền theo từng tài khoản cụ thể
  const [permissionViewMode, setPermissionViewMode] = useState<'role_form' | 'by_role' | 'by_account'>('role_form');
  const [activeFormRoleKey, setActiveFormRoleKey] = useState<RoleMatrixKey>('nhan_vien_tuyen_dung');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [storageProvider, setStorageProvider] = useState<'firestore' | 'local'>('local');
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Modal tạo tài khoản mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'employee'>('employee');
  const [newHrmRole, setNewHrmRole] = useState<HrmSubRole>('nhan_vien_tuyen_dung');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal sửa / đổi mật khẩu
  const [editingUser, setEditingUser] = useState<SystemUserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');
  const [editHrmRole, setEditHrmRole] = useState<HrmSubRole>('nhan_vien_tuyen_dung');
  const [editStatus, setEditStatus] = useState<'active' | 'locked'>('active');

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      let res = await safeFetchJson<{ success: boolean; users: SystemUserAccount[] }>(
        '/api/admin/users',
        {
          headers: { 'x-user-email': currentUser.email },
        }
      );

      if (res.status === 401 && currentUser.role === 'admin') {
        const reAuth = await safeFetchJson<{ success: boolean; user?: UserProfile }>('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'admin123' }),
        });
        if (reAuth.ok && reAuth.data?.user?.sessionToken) {
          localStorage.setItem('hr_current_user', JSON.stringify(reAuth.data.user));
          res = await safeFetchJson<{ success: boolean; users: SystemUserAccount[] }>(
            '/api/admin/users',
            {
              headers: { 'x-user-email': reAuth.data.user.email },
            }
          );
        }
      }

      if (res.data?.success && Array.isArray(res.data.users) && res.data.users.length > 0) {
        setUsers(res.data.users);
      } else {
        setUsers([DEFAULT_ADMIN_ACCOUNT]);
      }
    } catch (err) {
      console.warn('Lỗi gọi API /api/admin/users, dùng dữ liệu lưu trữ nội bộ:', err);
      setUsers([DEFAULT_ADMIN_ACCOUNT]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await safeFetchJson<{
        success: boolean;
        provider?: 'firestore' | 'local';
        data?: { roleMatrix?: Record<string, any>; accountCustomPerms?: AccountCustomPermissionMap };
      }>('/api/admin/permissions', {
        headers: { 'x-user-email': currentUser.email },
      });
      if (res.ok && res.data?.success) {
        if (res.data.provider) setStorageProvider(res.data.provider);
        if (res.data.data?.roleMatrix && Object.keys(res.data.data.roleMatrix).length > 0) {
          const merged = normalizeLoadedRoleMatrix(res.data.data.roleMatrix);
          setRoleMatrix(merged);
          setSavedRoleMatrix(merged);
          localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(merged));
        }
        if (res.data.data?.accountCustomPerms) {
          setAccountCustomPerms(res.data.data.accountCustomPerms);
          setSavedAccountCustomPerms(res.data.data.accountCustomPerms);
          localStorage.setItem(
            ACCOUNT_CUSTOM_PERM_STORAGE_KEY,
            JSON.stringify(res.data.data.accountCustomPerms)
          );
        }
        setHasUnsavedChanges(false);
      }
    } catch {
      // fallback to localStorage
    }
  };

  useEffect(() => {
    localStorage.removeItem('hr_user_accounts');
    loadUsers();
    loadPermissions();
  }, [currentUser.email]);

  const displayAccounts = users;

  const resolveAccountRoleKey = (acc: SystemUserAccount): RoleMatrixKey => {
    if (acc.role === 'admin' || acc.hrmRole === 'admin') return 'admin';
    if (acc.hrmRole === 'nhan_vien_y_te') return 'nhan_vien_y_te';
    if (acc.hrmRole === 'nhan_vien_quan_ly_ho_so' || acc.hrmRole === 'nhan_vien_nhan_su') {
      return 'nhan_vien_quan_ly_ho_so';
    }
    if (acc.hrmRole === 'truong_nhom_cnb' || acc.hrmRole === 'quan_ly_nhan_su') {
      return 'truong_nhom_cnb';
    }
    if (acc.hrmRole === 'truong_nhom_tuyen_dung') return 'truong_nhom_tuyen_dung';
    return 'nhan_vien_tuyen_dung';
  };

  const getRoleDefinition = (roleKey: RoleMatrixKey): RoleColumnDefinition => {
    return ROLE_DEFINITIONS.find((r) => r.key === roleKey) || ROLE_DEFINITIONS[0];
  };

  const getEffectiveAccountPermission = (acc: SystemUserAccount, moduleId: string): CrudPermission => {
    const customForAcc = accountCustomPerms[acc.id]?.[moduleId];
    const roleKey = resolveAccountRoleKey(acc);
    const fallback = roleMatrix[moduleId]?.[roleKey] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
    if (customForAcc) return normalizeCrudPerm(customForAcc, fallback);
    return fallback;
  };

  const applyCrudLogic = (current: CrudPermission, action: keyof CrudPermission): CrudPermission => {
    const nextVal = !current[action];
    const updated: CrudPermission = { ...current, [action]: nextVal };

    // Nếu bật Thêm, Sửa hoặc Xóa -> Tự động bật Đọc (Xem)
    if ((action === 'create' || action === 'edit' || action === 'delete') && nextVal) {
      updated.view = true;
    }
    // Nếu tắt Đọc (Xem) -> Tự động tắt Thêm, Sửa và Xóa
    if (action === 'view' && !nextVal) {
      updated.create = false;
      updated.edit = false;
      updated.delete = false;
    }
    return updated;
  };

  const handleToggleRolePermission = (
    moduleId: string,
    roleKey: RoleMatrixKey,
    action: keyof CrudPermission
  ) => {
    setRoleMatrix((prev) => {
      const current = prev[moduleId]?.[roleKey] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
      const updated = applyCrudLogic(current, action);

      const nextMatrix: RolePermissionMatrix = {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [roleKey]: updated,
        },
      };
      return nextMatrix;
    });
    setHasUnsavedChanges(true);
  };

  const handleToggleAllInRoleCell = (moduleId: string, roleKey: RoleMatrixKey) => {
    setRoleMatrix((prev) => {
      const current = prev[moduleId]?.[roleKey] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
      const isAllChecked = current.view && current.create && current.edit && current.delete;
      const updated: CrudPermission = {
        view: !isAllChecked,
        create: !isAllChecked,
        edit: !isAllChecked,
        delete: !isAllChecked,
      };
      const nextMatrix: RolePermissionMatrix = {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [roleKey]: updated,
        },
      };
      return nextMatrix;
    });
    setHasUnsavedChanges(true);
  };

  const handleToggleEntireRoleColumn = (
    roleKey: RoleMatrixKey,
    action: 'all' | keyof CrudPermission
  ) => {
    setRoleMatrix((prev) => {
      const targetModules =
        selectedModuleIds.length > 0
          ? SYSTEM_MODULES.filter((m) => selectedModuleIds.includes(m.id))
          : SYSTEM_MODULES;

      const allEnabled = targetModules.every((m) => {
        const p = prev[m.id]?.[roleKey];
        if (!p) return false;
        return action === 'all' ? p.view && p.create && p.edit && p.delete : p[action];
      });

      const nextVal = !allEnabled;
      const nextMatrix = { ...prev };

      targetModules.forEach((m) => {
        const cur = nextMatrix[m.id]?.[roleKey] || {
          view: false,
          create: false,
          edit: false,
          delete: false,
        };
        let updated: CrudPermission;
        if (action === 'all') {
          updated = { view: nextVal, create: nextVal, edit: nextVal, delete: nextVal };
        } else {
          updated = { ...cur, [action]: nextVal };
          if ((action === 'create' || action === 'edit' || action === 'delete') && nextVal) {
            updated.view = true;
          }
          if (action === 'view' && !nextVal) {
            updated.create = false;
            updated.edit = false;
            updated.delete = false;
          }
        }
        nextMatrix[m.id] = {
          ...nextMatrix[m.id],
          [roleKey]: updated,
        };
      });

      return nextMatrix;
    });
    setHasUnsavedChanges(true);
  };

  const handleToggleAccountPermission = (
    acc: SystemUserAccount,
    moduleId: string,
    action: 'all' | keyof CrudPermission
  ) => {
    setAccountCustomPerms((prev) => {
      const current = getEffectiveAccountPermission(acc, moduleId);
      let updated: CrudPermission;
      if (action === 'all') {
        const isFull = current.view && current.create && current.edit && current.delete;
        updated = { view: !isFull, create: !isFull, edit: !isFull, delete: !isFull };
      } else {
        updated = applyCrudLogic(current, action);
      }

      const nextMap: AccountCustomPermissionMap = {
        ...prev,
        [acc.id]: {
          ...(prev[acc.id] || {}),
          [moduleId]: updated,
        },
      };
      return nextMap;
    });
    setHasUnsavedChanges(true);
  };

  const handleResetAccountCustomPerm = (accountId: string) => {
    setAccountCustomPerms((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
    setHasUnsavedChanges(true);
    showNotify(
      'success',
      'Đã đặt lại quyền của tài khoản trên bản nháp. Nhấn "Lưu Phân Quyền" để chính thức áp dụng.'
    );
  };

  const handleDiscardUnsavedPermissions = () => {
    setRoleMatrix(savedRoleMatrix);
    setAccountCustomPerms(savedAccountCustomPerms);
    setHasUnsavedChanges(false);
    showNotify('success', 'Đã hủy các thay đổi chưa lưu và quay về cấu hình phân quyền đang áp dụng.');
  };

  const handleResetAllPermissions = () => {
    setRoleMatrix(DEFAULT_ROLE_MATRIX);
    setAccountCustomPerms({});
    setHasUnsavedChanges(true);
    showNotify(
      'success',
      'Đã tải cấu hình mặc định 6 vai trò lên bảng. Nhấn nút "Lưu Phân Quyền" để chính thức áp dụng!'
    );
  };

  const handleSavePermissionsConfiguration = async () => {
    localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(roleMatrix));
    localStorage.setItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY, JSON.stringify(accountCustomPerms));
    setSavedRoleMatrix(roleMatrix);
    setSavedAccountCustomPerms(accountCustomPerms);
    setHasUnsavedChanges(false);
    const nowStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedAt(nowStr);
    window.dispatchEvent(new Event('storage'));
    setIsSavingPerms(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        provider?: 'firestore' | 'local';
        message?: string;
      }>('/api/admin/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({ roleMatrix, accountCustomPerms }),
      });
      if (res.ok && res.data?.success) {
        if (res.data.provider) setStorageProvider(res.data.provider);
        showNotify(
          'success',
          res.data.message ||
            'Đã lưu và chính thức áp dụng cấu hình phân quyền mới cho 6 vai trò lên hệ thống & Cloud Firestore!'
        );
        return;
      }
    } catch {
      // fallback notification below
    } finally {
      setIsSavingPerms(false);
    }
    showNotify('success', 'Đã lưu và chính thức áp dụng cấu hình phân quyền mới cho 6 vai trò!');
  };

  const handleCopyPermissionMarkdown = async () => {
    const formatPermCode = (p?: CrudPermission) => {
      if (!p || (!p.view && !p.create && !p.edit && !p.delete)) return 'Không';
      const parts: string[] = [];
      if (p.view) parts.push('Đọc');
      if (p.create) parts.push('Thêm');
      if (p.edit) parts.push('Sửa');
      if (p.delete) parts.push('Xóa');
      return parts.join('/');
    };

    const header =
      '| Mã | Tính năng / Nghiệp vụ | 1. Tuyển dụng | 2. Y tế | 3. Quản lý hồ sơ | 4. C&B | 5. Tuyển dụng nhóm | 6. Admin |';
    const sep = '|---|---|---|---|---|---|---|---|';
    const rows = SYSTEM_MODULES.map((m) => {
      const r = roleMatrix[m.id];
      return `| ${m.code} | ${m.name} | ${formatPermCode(r?.nhan_vien_tuyen_dung)} | ${formatPermCode(
        r?.nhan_vien_y_te
      )} | ${formatPermCode(r?.nhan_vien_quan_ly_ho_so)} | ${formatPermCode(
        r?.truong_nhom_cnb
      )} | ${formatPermCode(r?.truong_nhom_tuyen_dung)} | ${formatPermCode(r?.admin)} |`;
    });

    const text = [header, sep, ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 3000);
      showNotify('success', 'Đã sao chép bảng phân quyền 6 vai trò (Đọc/Thêm/Sửa/Xóa) vào bộ nhớ tạm!');
    } catch {
      showNotify('error', 'Không thể sao chép tự động. Vui lòng thử lại.');
    }
  };

  const toggleSelectModuleRow = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const toggleSelectAllModuleRows = () => {
    if (selectedModuleIds.length === SYSTEM_MODULES.length) {
      setSelectedModuleIds([]);
    } else {
      setSelectedModuleIds(SYSTEM_MODULES.map((m) => m.id));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      showNotify('error', 'Vui lòng điền đầy đủ tất cả thông tin bắt buộc.');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanEmail = newEmail.trim().toLowerCase();

    const currentList = users;
    if (currentList.some((u) => u.username.toLowerCase() === cleanUsername)) {
      showNotify('error', `Tên đăng nhập "${cleanUsername}" đã được sử dụng.`);
      return;
    }
    if (cleanEmail && currentList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      showNotify('error', `Email "${cleanEmail}" đã được liên kết với một tài khoản khác.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        '/api/admin/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify({
            username: cleanUsername,
            password: newPassword.trim(),
            email: cleanEmail,
            fullName: newFullName.trim(),
            role: newHrmRole === 'admin' ? 'admin' : newRole,
            hrmRole: newHrmRole,
          }),
        }
      );

      if (!response.ok || !response.data?.success) {
        throw new Error(response.error || 'Chưa lưu được thay đổi lên máy chủ.');
      }
      await loadUsers();

      showNotify('success', `Đã tạo và cấp tài khoản thành công cho nhân viên ${newFullName.trim()}!`);
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewFullName('');
      setNewRole('employee');
      setNewHrmRole('nhan_vien_tuyen_dung');
    } catch (err) {
      showNotify('error', (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (user: SystemUserAccount) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.contactEmail ?? user.email);
    setEditPassword('');
    setEditRole(user.role);
    setEditHrmRole(resolveAccountRoleKey(user));
    setEditStatus(user.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        role: editHrmRole === 'admin' ? 'admin' : editRole,
        hrmRole: editHrmRole,
        status: editStatus,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const response = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        `/api/admin/users/${editingUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok || !response.data?.success) {
        throw new Error(response.error || 'Chưa lưu được thay đổi lên máy chủ.');
      }
      await loadUsers();

      showNotify('success', 'Cập nhật tài khoản thành công!');
      setEditingUser(null);
    } catch (err) {
      showNotify('error', (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: SystemUserAccount) => {
    if (user.email.toLowerCase() === currentUser.email.toLowerCase()) {
      showNotify('error', 'Bạn không thể tự xóa tài khoản của chính mình.');
      return;
    }
    setPendingDeleteUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    const user = pendingDeleteUser;
    setPendingDeleteUser(null);

    try {
      const response = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        `/api/admin/users/${user.id}`,
        {
          method: 'DELETE',
          headers: { 'x-user-email': currentUser.email },
        }
      );

      if (!response.ok || !response.data?.success) {
        throw new Error(response.error || 'Chưa lưu được thay đổi lên máy chủ.');
      }
      await loadUsers();

      showNotify('success', `Đã xóa tài khoản "${user.username}".`);
    } catch (err) {
      showNotify('error', (err as Error).message);
    }
  };

  const handleResetAccountsToAdminOnly = async () => {
    setIsLoading(true);
    try {
      const response = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        '/api/admin/users/reset-to-admin',
        {
          method: 'POST',
          headers: { 'x-user-email': currentUser.email },
        }
      );
      if (!response.ok || !response.data?.success) {
        throw new Error(response.error || 'Không thể đặt lại danh sách tài khoản.');
      }
      await loadUsers();
      showNotify(
        'success',
        response.data.message || 'Đã xóa toàn bộ tài khoản phụ và chỉ giữ lại duy nhất tài khoản admin (admin123)!'
      );
    } catch (err) {
      showNotify('error', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const roleDef = getRoleDefinition(resolveAccountRoleKey(u));
    return (
      u.username.toLowerCase().includes(term) ||
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      roleDef.label.toLowerCase().includes(term) ||
      roleDef.shortLabel.toLowerCase().includes(term)
    );
  });

  const accountsByRole = useMemo(() => {
    const map: Record<RoleMatrixKey, SystemUserAccount[]> = {
      nhan_vien_tuyen_dung: [],
      nhan_vien_y_te: [],
      nhan_vien_quan_ly_ho_so: [],
      truong_nhom_cnb: [],
      truong_nhom_tuyen_dung: [],
      admin: [],
    };
    for (const acc of displayAccounts) {
      const rk = resolveAccountRoleKey(acc);
      map[rk].push(acc);
    }
    return map;
  }, [displayAccounts]);

  const focusedAccount = useMemo(
    () => displayAccounts.find((a) => a.id === selectedAccountId) || null,
    [displayAccounts, selectedAccountId]
  );

  const activeRoleDef = getRoleDefinition(activeFormRoleKey);

  const renderPermissionCheckboxes = (
    perm: CrudPermission,
    onToggle: (action: keyof CrudPermission) => void,
    onToggleAll: () => void,
    accentColor: 'sky' | 'teal' | 'amber' | 'emerald' | 'indigo' | 'purple' = 'purple'
  ) => {
    const badge = getPermissionSummaryBadge(perm);
    const isAll = perm.view && perm.create && perm.edit && perm.delete;

    const accentMap = {
      sky: 'accent-sky-600 focus:ring-sky-500',
      teal: 'accent-teal-600 focus:ring-teal-500',
      amber: 'accent-amber-600 focus:ring-amber-500',
      emerald: 'accent-emerald-600 focus:ring-emerald-500',
      indigo: 'accent-indigo-600 focus:ring-indigo-500',
      purple: 'accent-purple-600 focus:ring-purple-500',
    };

    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        <div className="flex items-center gap-1">
          <label
            className="inline-flex items-center gap-1 cursor-pointer select-none"
            title="Tích chọn/Bỏ chọn toàn quyền (Đọc, Thêm, Sửa, Xóa)"
          >
            <input
              type="checkbox"
              checked={isAll}
              onChange={onToggleAll}
              className={`w-3.5 h-3.5 rounded border-slate-300 cursor-pointer ${accentMap[accentColor]}`}
            />
            <span
              className={`px-1.5 py-0.5 rounded border font-bold text-[10px] leading-tight transition ${badge.className}`}
            >
              {badge.shortLabel}
            </span>
          </label>
        </div>

        <div className="inline-flex items-center gap-1 bg-slate-50/95 px-2 py-1 rounded-lg border border-slate-200/80">
          <label className="inline-flex items-center gap-0.5 cursor-pointer select-none text-[10px] font-semibold text-slate-700 hover:text-blue-700">
            <input
              type="checkbox"
              checked={perm.view}
              onChange={() => onToggle('view')}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600 cursor-pointer"
            />
            <span>Đọc</span>
          </label>

          <span className="text-slate-300">·</span>

          <label className="inline-flex items-center gap-0.5 cursor-pointer select-none text-[10px] font-semibold text-slate-700 hover:text-emerald-700">
            <input
              type="checkbox"
              checked={perm.create}
              onChange={() => onToggle('create')}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>Thêm</span>
          </label>

          <span className="text-slate-300">·</span>

          <label className="inline-flex items-center gap-0.5 cursor-pointer select-none text-[10px] font-semibold text-slate-700 hover:text-amber-700">
            <input
              type="checkbox"
              checked={perm.edit}
              onChange={() => onToggle('edit')}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-amber-600 cursor-pointer"
            />
            <span>Sửa</span>
          </label>

          <span className="text-slate-300">·</span>

          <label className="inline-flex items-center gap-0.5 cursor-pointer select-none text-[10px] font-semibold text-slate-700 hover:text-rose-700">
            <input
              type="checkbox"
              checked={perm.delete}
              onChange={() => onToggle('delete')}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-rose-600 cursor-pointer"
            />
            <span>Xóa</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Form Phân Quyền Chi Tiết 6 Vai Trò &amp; Quản Lý Tài Khoản
                </h2>
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  RBAC 6 Vai Trò
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập quyền nghiệp vụ (<strong>Đọc / Thêm / Sửa / Xóa</strong>) cho 6 vai trò: Tuyển dụng, Y tế, Quản lý hồ sơ, C&amp;B, Tuyển dụng nhóm và Admin
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
            title="Làm mới danh sách tài khoản"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {users.length > 1 && (
            <button
              type="button"
              onClick={handleResetAccountsToAdminOnly}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Xóa toàn bộ tài khoản phụ trên Cloud/Server và chỉ giữ lại admin (admin123)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa TK phụ (Chỉ giữ Admin)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tạo Tài Khoản Cho Nhân Viên</span>
          </button>
        </div>
      </div>

      {/* KHỐI FORM PHÂN QUYỀN CHI TIẾT 6 VAI TRÒ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-4 p-4 sm:p-5">
        {/* Thanh tiêu đề & nút Lưu / Chế độ xem */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Form Phân Quyền Nghiệp Vụ Chi Tiết (Cột: Đọc / Thêm / Sửa / Xóa — Hàng: Danh sách tính năng)
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn 1 trong 6 vai trò bên dưới để tích chọn quyền <strong>Đọc / Thêm / Sửa / Xóa</strong> cho từng tính năng hoặc chuyển sang xem Ma trận 6 vai trò
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chuyển đổi giữa Form từng vai trò, Ma trận 6 vai trò, và Theo tài khoản */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPermissionViewMode('role_form')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  permissionViewMode === 'role_form'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Form theo Vai trò (Đọc/Thêm/Sửa/Xóa)</span>
              </button>
              <button
                type="button"
                onClick={() => setPermissionViewMode('by_role')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  permissionViewMode === 'by_role'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ma trận 6 Vai trò</span>
              </button>
              <button
                type="button"
                onClick={() => setPermissionViewMode('by_account')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  permissionViewMode === 'by_account'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>Theo Tài khoản ({displayAccounts.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyPermissionMarkdown()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
              title="Sao chép bảng phân quyền dạng Markdown"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Đã sao chép' : 'Sao chép Form'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetAllPermissions}
              disabled={isSavingPerms}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
              title="Đặt về cấu hình mặc định (cần nhấn Lưu Phân Quyền để áp dụng)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>

            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscardUnsavedPermissions}
                disabled={isSavingPerms}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                title="Hủy các thay đổi chưa lưu và quay về phân quyền đang áp dụng"
              >
                <span>Hủy thay đổi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSavePermissionsConfiguration}
              disabled={isSavingPerms}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-50 ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {isSavingPerms
                  ? 'Đang lưu & áp dụng...'
                  : hasUnsavedChanges
                  ? 'Lưu Phân Quyền (Áp dụng thay đổi)'
                  : 'Lưu Phân Quyền'}
              </span>
            </button>
          </div>
        </div>

        {/* Thanh cảnh báo khi có thay đổi phân quyền chưa được Admin nhấn Lưu */}
        {hasUnsavedChanges && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-extrabold">Bạn có thay đổi phân quyền chưa lưu!</span>{' '}
                <span>
                  Các thay đổi tích chọn trên bảng chỉ đang ở trạng thái nháp và{' '}
                  <strong>chưa được áp dụng</strong> cho tới khi Admin nhấn nút{' '}
                  <strong>&quot;Lưu Phân Quyền&quot;</strong>.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardUnsavedPermissions}
                disabled={isSavingPerms}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer"
              >
                Hủy thay đổi
              </button>
              <button
                type="button"
                onClick={handleSavePermissionsConfiguration}
                disabled={isSavingPerms}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-2xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Phân Quyền ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* Bộ chọn 6 Vai trò (Role Selector Tabs) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              Chọn 1 trong 6 Vai trò để cấu hình quyền trên bảng:
            </span>
            <span className="text-[11px] text-slate-500">
              Đang cấu hình: <strong className="text-slate-900">{activeRoleDef.label}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {ROLE_DEFINITIONS.map((roleDef) => {
              const isRoleActive = activeFormRoleKey === roleDef.key;
              const countAcc = accountsByRole[roleDef.key]?.length || 0;
              let viewMods = 0;
              let createMods = 0;
              let editMods = 0;
              let deleteMods = 0;
              SYSTEM_MODULES.forEach((m) => {
                const p = roleMatrix[m.id]?.[roleDef.key];
                if (p?.view) viewMods++;
                if (p?.create) createMods++;
                if (p?.edit) editMods++;
                if (p?.delete) deleteMods++;
              });

              return (
                <button
                  key={roleDef.key}
                  type="button"
                  onClick={() => {
                    setActiveFormRoleKey(roleDef.key);
                    if (permissionViewMode === 'by_account') {
                      setPermissionViewMode('role_form');
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                    isRoleActive
                      ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-purple-300 shadow-sm'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          isRoleActive ? 'bg-white/15 text-white border-white/25' : roleDef.badgeCls
                        }`}
                      >
                        Vai trò #{roleDef.index}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isRoleActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {countAcc} TK
                      </span>
                    </div>
                    <div className="text-xs font-bold mt-1.5 leading-snug">{roleDef.label}</div>
                    <p
                      className={`text-[10px] mt-0.5 leading-snug ${
                        isRoleActive ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {roleDef.description}
                    </p>
                  </div>

                  <div
                    className={`grid grid-cols-2 gap-1 pt-1.5 border-t text-[10px] font-semibold ${
                      isRoleActive ? 'border-white/15 text-slate-200' : 'border-slate-200/80 text-slate-600'
                    }`}
                  >
                    <span>Đọc: {viewMods}/{SYSTEM_MODULES.length}</span>
                    <span>Thêm: {createMods}/{SYSTEM_MODULES.length}</span>
                    <span>Sửa: {editMods}/{SYSTEM_MODULES.length}</span>
                    <span>Xóa: {deleteMods}/{SYSTEM_MODULES.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CHẾ ĐỘ 1 (MẶC ĐỊNH): GIAO DIỆN FORM PHÂN QUYỀN CHI TIẾT
            Hàng = Danh sách tính năng | Cột = Nghiệp vụ (Đọc / Thêm / Sửa / Xóa / Tất cả) */}
        {permissionViewMode === 'role_form' && (
          <div className="space-y-3">
            {/* Banner thông tin vai trò đang chọn */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${activeRoleDef.headerBg} border-slate-200`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold ${activeRoleDef.badgeCls}`}>
                    {activeRoleDef.label}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    — {activeRoleDef.description}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tích chọn các ô Checkbox ở các cột <strong>Đọc</strong>, <strong>Thêm</strong>, <strong>Sửa</strong>, <strong>Xóa</strong> tương ứng với từng hàng tính năng bên dưới.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'view')}
                  className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Chọn/Bỏ cột Đọc
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'create')}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Chọn/Bỏ cột Thêm
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'edit')}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Chọn/Bỏ cột Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'delete')}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Chọn/Bỏ cột Xóa
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'all')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Full quyền cả {SYSTEM_MODULES.length} tính năng
                </button>
              </div>
            </div>

            {/* BẢNG FORM PHÂN QUYỀN: HÀNG = TÍNH NĂNG, CỘT = NGHIỆP VỤ (ĐỌC / THÊM / SỬA / XÓA) */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3 text-center w-14">Mã</th>
                    <th className="p-3 min-w-[290px]">
                      <div>Danh sách Tính năng / Nghiệp vụ ứng dụng</div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                        Vai trò đang cấu hình: <strong className="text-purple-700">{activeRoleDef.label}</strong>
                      </div>
                    </th>

                    {/* Cột 1: Nghiệp vụ ĐỌC (XEM) */}
                    <th className="p-3 text-center w-28 border-l border-slate-200 bg-blue-50/60">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-blue-900 font-extrabold text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>Đọc (Xem)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'view')}
                          className="text-[10px] font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          Tích cả cột
                        </button>
                      </div>
                    </th>

                    {/* Cột 2: Nghiệp vụ THÊM (TẠO MỚI) */}
                    <th className="p-3 text-center w-28 border-l border-slate-200 bg-emerald-50/60">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-emerald-900 font-extrabold text-xs">
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Thêm</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'create')}
                          className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Tích cả cột
                        </button>
                      </div>
                    </th>

                    {/* Cột 3: Nghiệp vụ SỬA (CẬP NHẬT) */}
                    <th className="p-3 text-center w-28 border-l border-slate-200 bg-amber-50/60">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-amber-900 font-extrabold text-xs">
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sửa</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'edit')}
                          className="text-[10px] font-semibold text-amber-700 hover:underline cursor-pointer"
                        >
                          Tích cả cột
                        </button>
                      </div>
                    </th>

                    {/* Cột 4: Nghiệp vụ XÓA */}
                    <th className="p-3 text-center w-28 border-l border-slate-200 bg-rose-50/60">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-rose-900 font-extrabold text-xs">
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Xóa</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'delete')}
                          className="text-[10px] font-semibold text-rose-700 hover:underline cursor-pointer"
                        >
                          Tích cả cột
                        </button>
                      </div>
                    </th>

                    {/* Cột 5: Chọn tất cả 4 quyền trên dòng + Trạng thái */}
                    <th className="p-3 text-center w-44 border-l border-slate-200 bg-purple-50/60">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-purple-950 font-extrabold text-xs">
                          Tất cả (Đọc/Thêm/Sửa/Xóa)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEntireRoleColumn(activeFormRoleKey, 'all')}
                          className="text-[10px] font-semibold text-purple-700 hover:underline cursor-pointer"
                        >
                          Chọn tất cả dòng
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {SYSTEM_MODULES.map((mod, idx) => {
                    const prevGroup = idx > 0 ? SYSTEM_MODULES[idx - 1].groupName : '';
                    const showGroupBanner = mod.groupName !== prevGroup;
                    const perm = roleMatrix[mod.id]?.[activeFormRoleKey] || {
                      view: false,
                      create: false,
                      edit: false,
                      delete: false,
                    };
                    const isRowFull = perm.view && perm.create && perm.edit && perm.delete;
                    const summaryBadge = getPermissionSummaryBadge(perm);

                    return (
                      <React.Fragment key={mod.id}>
                        {showGroupBanner && (
                          <tr className="bg-slate-100/90 border-y border-slate-200">
                            <td
                              colSpan={7}
                              className="px-3.5 py-2 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide"
                            >
                              {mod.groupName}
                            </td>
                          </tr>
                        )}

                        <tr className="hover:bg-slate-50/90 transition">
                          <td className="p-3 text-center font-mono font-bold text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                              {mod.code}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                              {mod.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {mod.description}
                            </div>
                          </td>

                          {/* Checkbox ĐỌC */}
                          <td className="p-3 text-center border-l border-slate-100 bg-blue-50/15">
                            <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perm.view}
                                onChange={() =>
                                  handleToggleRolePermission(mod.id, activeFormRoleKey, 'view')
                                }
                                className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                              />
                              <span
                                className={`text-[10px] font-bold ${
                                  perm.view ? 'text-blue-700' : 'text-slate-400'
                                }`}
                              >
                                {perm.view ? 'Được đọc' : 'Khóa'}
                              </span>
                            </label>
                          </td>

                          {/* Checkbox THÊM */}
                          <td className="p-3 text-center border-l border-slate-100 bg-emerald-50/15">
                            <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perm.create}
                                onChange={() =>
                                  handleToggleRolePermission(mod.id, activeFormRoleKey, 'create')
                                }
                                className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                              />
                              <span
                                className={`text-[10px] font-bold ${
                                  perm.create ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {perm.create ? 'Được thêm' : 'Khóa'}
                              </span>
                            </label>
                          </td>

                          {/* Checkbox SỬA */}
                          <td className="p-3 text-center border-l border-slate-100 bg-amber-50/15">
                            <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perm.edit}
                                onChange={() =>
                                  handleToggleRolePermission(mod.id, activeFormRoleKey, 'edit')
                                }
                                className="w-4 h-4 rounded border-slate-300 accent-amber-600 cursor-pointer"
                              />
                              <span
                                className={`text-[10px] font-bold ${
                                  perm.edit ? 'text-amber-700' : 'text-slate-400'
                                }`}
                              >
                                {perm.edit ? 'Được sửa' : 'Khóa'}
                              </span>
                            </label>
                          </td>

                          {/* Checkbox XÓA */}
                          <td className="p-3 text-center border-l border-slate-100 bg-rose-50/15">
                            <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perm.delete}
                                onChange={() =>
                                  handleToggleRolePermission(mod.id, activeFormRoleKey, 'delete')
                                }
                                className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
                              />
                              <span
                                className={`text-[10px] font-bold ${
                                  perm.delete ? 'text-rose-700' : 'text-slate-400'
                                }`}
                              >
                                {perm.delete ? 'Được xóa' : 'Khóa'}
                              </span>
                            </label>
                          </td>

                          {/* Checkbox TẤT CẢ (Đọc/Thêm/Sửa/Xóa) */}
                          <td className="p-3 text-center border-l border-slate-100 bg-purple-50/15">
                            <label className="inline-flex flex-col items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isRowFull}
                                onChange={() => handleToggleAllInRoleCell(mod.id, activeFormRoleKey)}
                                className="w-4 h-4 rounded border-slate-300 accent-purple-600 cursor-pointer"
                              />
                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-bold ${summaryBadge.className}`}
                              >
                                {summaryBadge.label}
                              </span>
                            </label>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CHẾ ĐỘ 2: BẢNG MA TRẬN TỔNG HỢP CẢ 6 VAI TRÒ TRÊN CÙNG MỘT BẢNG */}
        {permissionViewMode === 'by_role' && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] align-top">
                  <th className="p-2.5 text-center w-9">
                    <input
                      type="checkbox"
                      checked={
                        selectedModuleIds.length === SYSTEM_MODULES.length &&
                        SYSTEM_MODULES.length > 0
                      }
                      onChange={toggleSelectAllModuleRows}
                      title="Chọn tất cả các dòng tính năng"
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-purple-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5 text-center w-12">Mã</th>
                  <th className="p-2.5 min-w-[230px]">
                    <div>Danh sách Tính năng / Nghiệp vụ</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      Tích chọn Đọc / Thêm / Sửa / Xóa cho cả 6 vai trò
                    </div>
                  </th>

                  {ROLE_DEFINITIONS.map((roleDef) => {
                    const roleAccounts = accountsByRole[roleDef.key] || [];
                    return (
                      <th
                        key={roleDef.key}
                        className={`p-2 text-center min-w-[215px] border-l border-slate-200 ${roleDef.headerBg}`}
                      >
                        <div className="font-bold text-slate-900 text-[11px] leading-snug">
                          {roleDef.label}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1 my-1">
                          {roleAccounts.length === 0 ? (
                            <span className="text-[10px] font-normal text-slate-400">
                              0 tài khoản
                            </span>
                          ) : (
                            roleAccounts.map((acc) => (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() =>
                                  setSelectedAccountId(selectedAccountId === acc.id ? 'ALL' : acc.id)
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition cursor-pointer ${
                                  selectedAccountId === acc.id
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                                title={`${acc.fullName} (${acc.username})`}
                              >
                                @{acc.username}
                              </button>
                            ))
                          )}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleToggleEntireRoleColumn(roleDef.key, 'view')}
                            className="hover:underline cursor-pointer text-blue-700"
                          >
                            Đọc
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleEntireRoleColumn(roleDef.key, 'create')}
                            className="hover:underline cursor-pointer text-emerald-700"
                          >
                            Thêm
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleEntireRoleColumn(roleDef.key, 'edit')}
                            className="hover:underline cursor-pointer text-amber-700"
                          >
                            Sửa
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleEntireRoleColumn(roleDef.key, 'delete')}
                            className="hover:underline cursor-pointer text-rose-700"
                          >
                            Xóa
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleEntireRoleColumn(roleDef.key, 'all')}
                            className="hover:underline cursor-pointer font-bold text-slate-900"
                          >
                            Full
                          </button>
                        </div>
                      </th>
                    );
                  })}

                  {focusedAccount && (
                    <th className="p-2.5 text-center min-w-[215px] bg-indigo-50/90 border-l-2 border-indigo-400">
                      <div className="flex items-center justify-center gap-1 text-indigo-950 font-bold text-xs">
                        <UserCog className="w-3.5 h-3.5 text-indigo-600" />
                        <span>TK: @{focusedAccount.username}</span>
                      </div>
                      <div className="text-[10px] text-indigo-700 font-medium my-1">
                        {focusedAccount.fullName}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleResetAccountCustomPerm(focusedAccount.id)}
                        className="text-[10px] bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold cursor-pointer"
                      >
                        Đồng bộ theo vai trò
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {SYSTEM_MODULES.map((mod, idx) => {
                  const isRowSelected = selectedModuleIds.includes(mod.id);
                  const prevGroup = idx > 0 ? SYSTEM_MODULES[idx - 1].groupName : '';
                  const showGroupBanner = mod.groupName !== prevGroup;

                  return (
                    <React.Fragment key={mod.id}>
                      {showGroupBanner && (
                        <tr className="bg-slate-100/90 border-y border-slate-200">
                          <td
                            colSpan={3 + ROLE_DEFINITIONS.length + (focusedAccount ? 1 : 0)}
                            className="px-3 py-1.5 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide"
                          >
                            {mod.groupName}
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`transition ${
                          isRowSelected ? 'bg-purple-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => toggleSelectModuleRow(mod.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 font-mono text-center font-bold text-slate-600">
                          {mod.code}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 leading-snug">{mod.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                            {mod.description}
                          </div>
                        </td>

                        {ROLE_DEFINITIONS.map((roleDef) => {
                          const perm = roleMatrix[mod.id]?.[roleDef.key] || {
                            view: false,
                            create: false,
                            edit: false,
                            delete: false,
                          };
                          return (
                            <td
                              key={roleDef.key}
                              className={`p-1.5 text-center border-l border-slate-100 ${roleDef.cellBg}`}
                            >
                              {renderPermissionCheckboxes(
                                perm,
                                (action) => handleToggleRolePermission(mod.id, roleDef.key, action),
                                () => handleToggleAllInRoleCell(mod.id, roleDef.key),
                                roleDef.accent
                              )}
                            </td>
                          );
                        })}

                        {focusedAccount && (
                          <td className="p-1.5 text-center border-l-2 border-indigo-300 bg-indigo-50/35">
                            {renderPermissionCheckboxes(
                              getEffectiveAccountPermission(focusedAccount, mod.id),
                              (action) => handleToggleAccountPermission(focusedAccount, mod.id, action),
                              () => handleToggleAccountPermission(focusedAccount, mod.id, 'all'),
                              'indigo'
                            )}
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CHẾ ĐỘ 3: BẢNG PHÂN QUYỀN CHI TIẾT THEO TỪNG TÀI KHOẢN CỤ THỂ */}
        {permissionViewMode === 'by_account' && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] align-top">
                  <th className="p-2.5 text-center w-12">Mã</th>
                  <th className="p-2.5 min-w-[230px]">Danh sách Tính năng / Nghiệp vụ</th>
                  {displayAccounts.map((acc) => {
                    const roleKey = resolveAccountRoleKey(acc);
                    const roleDef = getRoleDefinition(roleKey);
                    const hasCustom = Boolean(
                      accountCustomPerms[acc.id] && Object.keys(accountCustomPerms[acc.id]).length > 0
                    );
                    return (
                      <th
                        key={acc.id}
                        className="p-2.5 text-center min-w-[215px] border-l border-slate-200 bg-slate-50/80"
                      >
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          @{acc.username}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 truncate">
                          {acc.fullName}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${roleDef.badgeCls}`}
                          >
                            {roleDef.shortLabel}
                          </span>
                          {hasCustom && (
                            <button
                              type="button"
                              onClick={() => handleResetAccountCustomPerm(acc.id)}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold cursor-pointer"
                              title="Bấm để đặt lại về quyền mặc định theo vai trò"
                            >
                              Đặt lại
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {SYSTEM_MODULES.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 font-mono text-center font-bold text-slate-500">
                      {mod.code}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{mod.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{mod.description}</div>
                    </td>
                    {displayAccounts.map((acc) => {
                      const effPerm = getEffectiveAccountPermission(acc, mod.id);
                      const roleDef = getRoleDefinition(resolveAccountRoleKey(acc));
                      return (
                        <td key={acc.id} className="p-2 text-center border-l border-slate-100">
                          {renderPermissionCheckboxes(
                            effPerm,
                            (action) => handleToggleAccountPermission(acc, mod.id, action),
                            () => handleToggleAccountPermission(acc, mod.id, 'all'),
                            roleDef.accent
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Thanh hành động Lưu Phân Quyền ở cuối Form để Admin thuận tiện bấm Lưu sau khi tích chọn */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 bg-slate-50/70 p-3.5 rounded-xl">
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Đang có thay đổi chưa lưu — Chưa áp dụng vào hệ thống</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Phân quyền đang được áp dụng đồng bộ
                  {lastSavedAt ? ` (Đã lưu lúc ${lastSavedAt})` : ''}
                </span>
              </span>
            )}
            <span className="text-[11px] text-slate-500">
              • Chỉ khi Admin nhấn <strong>&quot;Lưu Phân Quyền&quot;</strong> thì phân quyền mới mới được áp dụng.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscardUnsavedPermissions}
                disabled={isSavingPerms}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Hủy thay đổi chưa lưu
              </button>
            )}

            <button
              type="button"
              onClick={handleSavePermissionsConfiguration}
              disabled={isSavingPerms}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer disabled:opacity-50 ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {isSavingPerms
                  ? 'Đang lưu & áp dụng phân quyền...'
                  : hasUnsavedChanges
                  ? 'Lưu Phân Quyền (Áp dụng ngay)'
                  : 'Lưu Phân Quyền'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Tên đăng nhập, Email, Họ tên, Vai trò..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-blue-600 bg-slate-50/50"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Tổng số tài khoản: <strong>{filteredUsers.length}</strong>
        </span>
      </div>

      {/* Users Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                <th className="p-3">Tên Đăng Nhập</th>
                <th className="p-3">Họ và Tên Nhân Viên</th>
                <th className="p-3">Email Liên Kết</th>
                <th className="p-3">Mật Khẩu Cấp</th>
                <th className="p-3 text-center">Vai Trò Phân Quyền (1–6)</th>
                <th className="p-3 text-center">Trạng Thái</th>
                <th className="p-3">Ngày Cấp</th>
                <th className="p-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    Không tìm thấy tài khoản nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isLocked = user.status === 'locked';
                  const roleDef = getRoleDefinition(resolveAccountRoleKey(user));

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isLocked ? 'bg-rose-50/30 opacity-75' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {user.username}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {user.fullName}
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{(user.contactEmail ?? user.email) || 'Chưa có email'}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
                          {'••••••••'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2.5 py-0.5 rounded-full ${roleDef.badgeCls}`}
                        >
                          {roleDef.key === 'admin' ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                          <span>{roleDef.label}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {isLocked ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Đã khóa
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Sửa thông tin / Đổi vai trò / Đổi mật khẩu"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.email.toLowerCase() === currentUser.email.toLowerCase()}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                            title={
                              user.email.toLowerCase() === currentUser.email.toLowerCase()
                                ? 'Không thể xóa chính mình'
                                : 'Xóa tài khoản này'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* MODAL TẠO TÀI KHOẢN MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tạo Tài Khoản Mới Cho Nhân Viên
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cấp tài khoản đăng nhập và gán 1 trong 6 vai trò nghiệp vụ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Họ và tên nhân viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thị Mai, Trần Văn An..."
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên đăng nhập (Username / Mã nhân viên) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: tuyendung01, yte01, cnb_lead..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mật khẩu khởi tạo *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email nhân viên (Dùng để đổi mật khẩu nếu quên)
                </label>
                <input
                  type="email"
                  placeholder="nhanvien@congty.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Phân quyền vai trò (1 trong 6 vai trò chuẩn) *
                </label>
                <select
                  value={newHrmRole}
                  onChange={(e) => {
                    const val = e.target.value as HrmSubRole;
                    setNewHrmRole(val);
                    setNewRole(val === 'admin' ? 'admin' : 'employee');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white font-medium"
                >
                  <option value="nhan_vien_tuyen_dung">
                    1. Nhân viên tuyển dụng (Tiếp nhận NV mới, Đăng ký KSK)
                  </option>
                  <option value="nhan_vien_y_te">
                    2. Nhân viên y tế (Theo dõi &amp; Cập nhật kết quả KSK)
                  </option>
                  <option value="nhan_vien_quan_ly_ho_so">
                    3. Nhân viên quản lý hồ sơ (Rà soát &amp; Quản lý hồ sơ nhân sự)
                  </option>
                  <option value="truong_nhom_cnb">
                    4. Trưởng nhóm C&amp;B (Quản lý Lương, Phụ cấp, BHXH &amp; Tiêu chuẩn lương)
                  </option>
                  <option value="truong_nhom_tuyen_dung">
                    5. Trưởng nhóm tuyển dụng (Giám sát toàn bộ Tuyển dụng &amp; KSK)
                  </option>
                  <option value="admin">
                    6. Admin (Full quyền toàn hệ thống)
                  </option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Xác Nhận Cấp Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA TÀI KHOẢN & ĐỔI MẬT KHẨU */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cập Nhật Tài Khoản: {editingUser.username}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chỉnh sửa thông tin, vai trò hoặc đặt lại mật khẩu mới
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Họ và tên nhân viên
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email liên kết (Đổi mật khẩu nếu quên)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Đặt lại mật khẩu mới (Bỏ trống nếu giữ nguyên)
                </label>
                <input
                  type="text"
                  placeholder="Nhập mật khẩu mới nếu muốn thay đổi..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Vai trò phân quyền (1–6)
                  </label>
                  <select
                    value={editHrmRole}
                    onChange={(e) => {
                      const val = e.target.value as HrmSubRole;
                      setEditHrmRole(val);
                      setEditRole(val === 'admin' ? 'admin' : 'employee');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white"
                  >
                    <option value="nhan_vien_tuyen_dung">1. Nhân viên tuyển dụng</option>
                    <option value="nhan_vien_y_te">2. Nhân viên y tế</option>
                    <option value="nhan_vien_quan_ly_ho_so">3. Nhân viên quản lý hồ sơ</option>
                    <option value="truong_nhom_cnb">4. Trưởng nhóm C&amp;B</option>
                    <option value="truong_nhom_tuyen_dung">5. Trưởng nhóm tuyển dụng</option>
                    <option value="admin">6. Admin (Full quyền)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'locked')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="locked">Khóa tài khoản</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TÀI KHOẢN */}
      {pendingDeleteUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xác nhận xóa tài khoản</h3>
                <p className="text-slate-500 mt-0.5">
                  Bạn có chắc chắn muốn xóa tài khoản <strong>{pendingDeleteUser.username}</strong> ({pendingDeleteUser.fullName})?
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteUser(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
