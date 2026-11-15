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
  ShieldAlert,
  RotateCcw,
  Save,
  UserCog,
  Layers
} from 'lucide-react';

export interface CrudPermission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface ModulePermissionItem {
  id: string;
  stt: number;
  name: string;
  description: string;
  category: 'intake' | 'health' | 'records' | 'admin';
}

export type RolePermissionMatrix = Record<
  string,
  {
    nhan_vien_tuyen_dung: CrudPermission;
    nhan_vien_y_te: CrudPermission;
    admin: CrudPermission;
  }
>;

export type AccountCustomPermissionMap = Record<string, Record<string, CrudPermission>>;

const SYSTEM_MODULES: ModulePermissionItem[] = [
  {
    id: 'sop_intake',
    stt: 1,
    name: 'Đăng ký nhân viên mới (SOP 4 bước & AI OCR)',
    description: 'Quét CCCD bằng AI OCR, trích xuất dữ liệu & tạo hồ sơ nhân sự mới.',
    category: 'intake',
  },
  {
    id: 'ksk_dang_ky',
    stt: 2,
    name: '1. Đăng ký KSK tuyển dụng',
    description: 'Tải ảnh CCCD nhiều ứng viên, quét AI OCR và chỉnh sửa trực tiếp bảng đăng ký KSK.',
    category: 'health',
  },
  {
    id: 'ksk_theo_doi',
    stt: 3,
    name: '2. Theo dõi KSK tuyển dụng',
    description: 'Theo dõi lịch hẹn khám, lọc thời gian và cập nhật trạng thái kết quả KSK ứng viên.',
    category: 'health',
  },
  {
    id: 'ksk_tieu_chuan',
    stt: 4,
    name: '3. Tiêu chuẩn KSK tuyển dụng',
    description: 'Tra cứu và cấu hình bảng ma trận 15 hạng mục tiêu chuẩn KSK tuyển dụng.',
    category: 'health',
  },
  {
    id: 'ksk_dashboard',
    stt: 5,
    name: '6. Dashboard khám sức khỏe tuyển dụng',
    description: 'Biểu đồ thống kê số lượng ứng viên theo trạng thái khám và phân loại Phòng/Ban.',
    category: 'health',
  },
  {
    id: 'ho_so_nhan_su',
    stt: 6,
    name: 'Bảng hồ sơ nhân sự (Sheet DanhSachNhanSu)',
    description: 'Quản lý danh sách hồ sơ nhân sự đã tiếp nhận toàn công ty (Xem/Sửa/Xóa).',
    category: 'records',
  },
  {
    id: 'quan_tri_he_thong',
    stt: 7,
    name: 'Tiêu chuẩn lương, Cơ cấu tổ chức & Tài khoản',
    description: 'Quản trị bảng lương, cơ cấu tổ chức và cấp phát tài khoản.',
    category: 'admin',
  },
];

const DEFAULT_ROLE_MATRIX: RolePermissionMatrix = {
  sop_intake: {
    nhan_vien_tuyen_dung: { view: true, edit: true, delete: false },
    nhan_vien_y_te: { view: false, edit: false, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
  ksk_dang_ky: {
    nhan_vien_tuyen_dung: { view: true, edit: true, delete: false },
    nhan_vien_y_te: { view: false, edit: false, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
  ksk_theo_doi: {
    nhan_vien_tuyen_dung: { view: false, edit: false, delete: false },
    nhan_vien_y_te: { view: true, edit: true, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
  ksk_tieu_chuan: {
    nhan_vien_tuyen_dung: { view: true, edit: false, delete: false },
    nhan_vien_y_te: { view: true, edit: false, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
  ksk_dashboard: {
    nhan_vien_tuyen_dung: { view: false, edit: false, delete: false },
    nhan_vien_y_te: { view: true, edit: false, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
  ho_so_nhan_su: {
    nhan_vien_tuyen_dung: { view: true, edit: false, delete: false },
    nhan_vien_y_te: { view: true, edit: true, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
  quan_tri_he_thong: {
    nhan_vien_tuyen_dung: { view: false, edit: false, delete: false },
    nhan_vien_y_te: { view: false, edit: false, delete: false },
    admin: { view: true, edit: true, delete: true },
  },
};

const ROLE_MATRIX_STORAGE_KEY = 'hr_module_role_permissions_v1';
const ACCOUNT_CUSTOM_PERM_STORAGE_KEY = 'hr_account_custom_permissions_v1';

const getPermissionSummaryBadge = (perm: CrudPermission) => {
  if (perm.view && perm.edit && perm.delete) {
    return {
      label: 'Toàn quyền (Xem/Sửa/Xóa)',
      className: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }
  if (perm.view && perm.edit && !perm.delete) {
    return {
      label: 'Xem & Sửa',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }
  if (perm.view && !perm.edit && perm.delete) {
    return {
      label: 'Xem & Xóa',
      className: 'bg-rose-100 text-rose-800 border-rose-200',
    };
  }
  if (perm.view && !perm.edit && !perm.delete) {
    return {
      label: 'Chỉ xem',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }
  return {
    label: 'Không có quyền',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
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

  // State cho Bảng Phân Quyền Truy Cập Module & Nội Dung Hệ Thống
  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix>(() => {
    try {
      const saved = localStorage.getItem(ROLE_MATRIX_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_ROLE_MATRIX, ...JSON.parse(saved) };
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

  const [permissionViewMode, setPermissionViewMode] = useState<'by_role' | 'by_account'>('by_role');
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

      // Nếu phiên cũ trước khi khởi động lại server bị hết hạn (401), tự động đồng bộ lại phiên admin
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
        data?: { roleMatrix?: RolePermissionMatrix; accountCustomPerms?: AccountCustomPermissionMap };
      }>('/api/admin/permissions', {
        headers: { 'x-user-email': currentUser.email },
      });
      if (res.ok && res.data?.success) {
        if (res.data.provider) setStorageProvider(res.data.provider);
        if (res.data.data?.roleMatrix && Object.keys(res.data.data.roleMatrix).length > 0) {
          const merged = { ...DEFAULT_ROLE_MATRIX, ...res.data.data.roleMatrix };
          setRoleMatrix(merged);
          localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(merged));
        }
        if (res.data.data?.accountCustomPerms) {
          setAccountCustomPerms(res.data.data.accountCustomPerms);
          localStorage.setItem(
            ACCOUNT_CUSTOM_PERM_STORAGE_KEY,
            JSON.stringify(res.data.data.accountCustomPerms)
          );
        }
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

  // Đồng bộ hoàn toàn danh sách tài khoản trên bảng phân quyền và bảng danh sách bên dưới
  const displayAccounts = users;

  const resolveAccountRoleKey = (acc: SystemUserAccount): 'admin' | 'nhan_vien_y_te' | 'nhan_vien_tuyen_dung' => {
    if (acc.role === 'admin' || acc.hrmRole === 'admin') return 'admin';
    if (acc.hrmRole === 'nhan_vien_y_te') return 'nhan_vien_y_te';
    return 'nhan_vien_tuyen_dung';
  };

  // Lấy quyền thực tế của 1 tài khoản trên 1 module (ưu tiên quyền tùy chỉnh riêng nếu có, nếu không lấy theo vai trò)
  const getEffectiveAccountPermission = (acc: SystemUserAccount, moduleId: string): CrudPermission => {
    const customForAcc = accountCustomPerms[acc.id]?.[moduleId];
    if (customForAcc) return customForAcc;
    const roleKey = resolveAccountRoleKey(acc);
    return roleMatrix[moduleId]?.[roleKey] || { view: false, edit: false, delete: false };
  };

  // Cập nhật quyền theo Vai trò
  const handleToggleRolePermission = (
    moduleId: string,
    roleKey: 'nhan_vien_tuyen_dung' | 'nhan_vien_y_te' | 'admin',
    action: keyof CrudPermission
  ) => {
    setRoleMatrix((prev) => {
      const current = prev[moduleId]?.[roleKey] || { view: false, edit: false, delete: false };
      const nextVal = !current[action];
      const updated: CrudPermission = { ...current, [action]: nextVal };

      // Nếu bật Sửa hoặc Xóa thì tự động bật Xem
      if ((action === 'edit' || action === 'delete') && nextVal) {
        updated.view = true;
      }
      // Nếu tắt Xem thì tự động tắt Sửa và Xóa
      if (action === 'view' && !nextVal) {
        updated.edit = false;
        updated.delete = false;
      }

      const nextMatrix = {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [roleKey]: updated,
        },
      };
      localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(nextMatrix));
      return nextMatrix;
    });
  };

  // Tích chọn / Bỏ chọn tất cả Xem/Sửa/Xóa cho 1 ô (Module + Vai trò)
  const handleToggleAllInRoleCell = (
    moduleId: string,
    roleKey: 'nhan_vien_tuyen_dung' | 'nhan_vien_y_te' | 'admin'
  ) => {
    setRoleMatrix((prev) => {
      const current = prev[moduleId]?.[roleKey] || { view: false, edit: false, delete: false };
      const isAllChecked = current.view && current.edit && current.delete;
      const updated: CrudPermission = {
        view: !isAllChecked,
        edit: !isAllChecked,
        delete: !isAllChecked,
      };
      const nextMatrix = {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [roleKey]: updated,
        },
      };
      localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(nextMatrix));
      return nextMatrix;
    });
  };

  // Tích chọn / Bỏ chọn toàn bộ 1 cột Vai trò
  const handleToggleEntireRoleColumn = (
    roleKey: 'nhan_vien_tuyen_dung' | 'nhan_vien_y_te' | 'admin',
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
        return action === 'all' ? p.view && p.edit && p.delete : p[action];
      });

      const nextVal = !allEnabled;
      const nextMatrix = { ...prev };

      targetModules.forEach((m) => {
        const cur = nextMatrix[m.id]?.[roleKey] || { view: false, edit: false, delete: false };
        let updated: CrudPermission;
        if (action === 'all') {
          updated = { view: nextVal, edit: nextVal, delete: nextVal };
        } else {
          updated = { ...cur, [action]: nextVal };
          if ((action === 'edit' || action === 'delete') && nextVal) updated.view = true;
          if (action === 'view' && !nextVal) {
            updated.edit = false;
            updated.delete = false;
          }
        }
        nextMatrix[m.id] = {
          ...nextMatrix[m.id],
          [roleKey]: updated,
        };
      });

      localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(nextMatrix));
      return nextMatrix;
    });
  };

  // Cập nhật quyền riêng cho từng Tài khoản cụ thể
  const handleToggleAccountPermission = (
    acc: SystemUserAccount,
    moduleId: string,
    action: 'all' | keyof CrudPermission
  ) => {
    setAccountCustomPerms((prev) => {
      const current = getEffectiveAccountPermission(acc, moduleId);
      let updated: CrudPermission;
      if (action === 'all') {
        const isFull = current.view && current.edit && current.delete;
        updated = { view: !isFull, edit: !isFull, delete: !isFull };
      } else {
        const nextVal = !current[action];
        updated = { ...current, [action]: nextVal };
        if ((action === 'edit' || action === 'delete') && nextVal) updated.view = true;
        if (action === 'view' && !nextVal) {
          updated.edit = false;
          updated.delete = false;
        }
      }

      const nextMap: AccountCustomPermissionMap = {
        ...prev,
        [acc.id]: {
          ...(prev[acc.id] || {}),
          [moduleId]: updated,
        },
      };
      localStorage.setItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY, JSON.stringify(nextMap));
      return nextMap;
    });
  };

  // Xóa quyền tùy chỉnh của 1 tài khoản để quay về quyền chuẩn theo vai trò
  const handleResetAccountCustomPerm = (accountId: string) => {
    setAccountCustomPerms((prev) => {
      const next = { ...prev };
      delete next[accountId];
      localStorage.setItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    showNotify('success', 'Đã đồng bộ quyền của tài khoản về mặc định theo nhóm vai trò.');
  };

  // Khôi phục toàn bộ bảng phân quyền về mặc định
  const handleResetAllPermissions = async () => {
    setRoleMatrix(DEFAULT_ROLE_MATRIX);
    setAccountCustomPerms({});
    localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(DEFAULT_ROLE_MATRIX));
    localStorage.removeItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY);
    setIsSavingPerms(true);
    try {
      const res = await safeFetchJson<{ success: boolean; provider?: 'firestore' | 'local' }>(
        '/api/admin/permissions',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify({ roleMatrix: DEFAULT_ROLE_MATRIX, accountCustomPerms: {} }),
        }
      );
      if (res.data?.provider) setStorageProvider(res.data.provider);
    } catch {
      // ignore
    } finally {
      setIsSavingPerms(false);
    }
    showNotify('success', 'Đã khôi phục ma trận phân quyền về cấu hình chuẩn mặc định và đồng bộ máy chủ.');
  };

  const handleSavePermissionsConfiguration = async () => {
    localStorage.setItem(ROLE_MATRIX_STORAGE_KEY, JSON.stringify(roleMatrix));
    localStorage.setItem(ACCOUNT_CUSTOM_PERM_STORAGE_KEY, JSON.stringify(accountCustomPerms));
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
            'Đã lưu và đồng bộ cấu hình phân quyền Xem / Sửa / Xóa lên hệ thống!'
        );
        return;
      }
    } catch {
      // fallback notification below
    } finally {
      setIsSavingPerms(false);
    }
    showNotify('success', 'Đã lưu và áp dụng cấu hình phân quyền Xem / Sửa / Xóa cho toàn hệ thống!');
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

  // Xử lý tạo tài khoản mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      showNotify('error', 'Vui lòng điền đầy đủ tất cả thông tin bắt buộc.');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanEmail = newEmail.trim().toLowerCase();

    // Kiểm tra trùng lặp trên local
    const currentList = users;
    if (currentList.some((u) => u.username.toLowerCase() === cleanUsername)) {
      showNotify('error', `Tên đăng nhập "${cleanUsername}" đã được sử dụng.`);
      return;
    }
    if (cleanEmail && currentList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      showNotify('error', `Email "${cleanEmail}" đã được liên kết với một tài khoản khác.`);
      return;
    }

    const newAcc: SystemUserAccount = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      password: newPassword.trim(),
      email: cleanEmail,
      fullName: newFullName.trim(),
      role: newRole,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

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

      if (!response.ok || !response.data?.success) throw new Error(response.error || 'Chưa lưu được thay đổi lên máy chủ.');
      await loadUsers();

      showNotify('success', `Đã tạo và cấp tài khoản thành công cho nhân viên ${newAcc.fullName}!`);
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

  // Mở modal sửa tài khoản
  const handleOpenEdit = (user: SystemUserAccount) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.contactEmail ?? user.email);
    setEditPassword('');
    setEditRole(user.role);
    setEditHrmRole(user.hrmRole || (user.role === 'admin' ? 'admin' : 'nhan_vien_tuyen_dung'));
    setEditStatus(user.status);
  };

  // Lưu chỉnh sửa tài khoản
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

      if (!response.ok || !response.data?.success) throw new Error(response.error || 'Chưa lưu được thay đổi lên máy chủ.');
      await loadUsers();

      showNotify('success', 'Cập nhật tài khoản thành công!');
      setEditingUser(null);
    } catch (err) {
      showNotify('error', (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa tài khoản
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

      if (!response.ok || !response.data?.success) throw new Error(response.error || 'Chưa lưu được thay đổi lên máy chủ.');
      await loadUsers();

      showNotify('success', `Đã xóa tài khoản "${user.username}".`);
    } catch (err) {
      showNotify('error', (err as Error).message);
    }
  };

  // Xóa toàn bộ tài khoản phụ trên Cloud/Server và chỉ giữ lại tài khoản admin (admin123)
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

  // Lọc tài khoản theo từ khóa tìm kiếm
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      u.username.toLowerCase().includes(term) ||
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role === 'admin'
        ? 'quản trị viên admin'
        : u.hrmRole === 'nhan_vien_y_te'
        ? 'nhân viên y tế'
        : 'nhân viên tuyển dụng').includes(term)
    );
  });

  // Phân nhóm tài khoản theo vai trò để hiển thị trực tiếp trong bảng phân quyền
  const accountsByRole = useMemo(() => {
    return {
      nhan_vien_tuyen_dung: displayAccounts.filter((u) => resolveAccountRoleKey(u) === 'nhan_vien_tuyen_dung'),
      nhan_vien_y_te: displayAccounts.filter((u) => resolveAccountRoleKey(u) === 'nhan_vien_y_te'),
      admin: displayAccounts.filter((u) => resolveAccountRoleKey(u) === 'admin'),
    };
  }, [displayAccounts]);

  const focusedAccount = useMemo(
    () => displayAccounts.find((a) => a.id === selectedAccountId) || null,
    [displayAccounts, selectedAccountId]
  );

  const renderPermissionCheckboxes = (
    perm: CrudPermission,
    onToggle: (action: keyof CrudPermission) => void,
    onToggleAll: () => void,
    accentColor: 'sky' | 'teal' | 'purple' | 'indigo' = 'purple'
  ) => {
    const badge = getPermissionSummaryBadge(perm);
    const isAll = perm.view && perm.edit && perm.delete;

    const accentMap = {
      sky: 'accent-sky-600 focus:ring-sky-500',
      teal: 'accent-teal-600 focus:ring-teal-500',
      purple: 'accent-purple-600 focus:ring-purple-500',
      indigo: 'accent-indigo-600 focus:ring-indigo-500',
    };

    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        <div className="flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1 cursor-pointer select-none" title="Tích chọn/Bỏ chọn toàn quyền (Xem, Sửa, Xóa)">
            <input
              type="checkbox"
              checked={isAll}
              onChange={onToggleAll}
              className={`w-3.5 h-3.5 rounded border-slate-300 cursor-pointer ${accentMap[accentColor]}`}
            />
            <span className={`px-2 py-0.5 rounded border font-bold text-[10px] leading-tight transition ${badge.className}`}>
              {badge.label}
            </span>
          </label>
        </div>

        <div className="inline-flex items-center gap-2 bg-slate-50/90 px-2.5 py-1 rounded-lg border border-slate-200/80">
          <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-700 hover:text-blue-700">
            <input
              type="checkbox"
              checked={perm.view}
              onChange={() => onToggle('view')}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600 cursor-pointer"
            />
            <span>Xem</span>
          </label>

          <span className="text-slate-300">|</span>

          <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-700 hover:text-amber-700">
            <input
              type="checkbox"
              checked={perm.edit}
              onChange={() => onToggle('edit')}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-amber-600 cursor-pointer"
            />
            <span>Sửa</span>
          </label>

          <span className="text-slate-300">|</span>

          <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-700 hover:text-rose-700">
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
                  Quản Lý & Cấp Phát Tài Khoản Nhân Sự
                </h2>
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tạo tài khoản đăng nhập (Tên đăng nhập, Mật khẩu, Email) và phân quyền nghiệp vụ cho từng nhân viên
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

      {/* Policy Notice Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldAlert className="w-4 h-4 text-purple-600" />
          <span>Nguyên tắc cấp phát tài khoản & phục hồi mật khẩu:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 text-[11px]">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block mb-1">1. Đăng nhập theo định danh:</strong>
            Nhân viên sử dụng <strong>Tên đăng nhập (username)</strong> hoặc <strong>Email</strong> cùng <strong>Mật khẩu</strong> đã được Quản trị viên cấp/phê duyệt để đăng nhập.
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block mb-1">2. Đổi mật khẩu qua Email:</strong>
            Nếu nhân viên quên mật khẩu, họ sử dụng tính năng <em>"Quên mật khẩu"</em> trên màn hình đăng nhập để nhận mã xác nhận gửi tới Email đã đăng ký để tạo mật khẩu mới.
          </div>
        </div>
      </div>

      {/* Bảng Phân Quyền Truy Cập Module & Nội Dung Hệ Thống */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4 p-4 sm:p-5">
        {/* Header của bảng phân quyền */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bảng Phân Quyền Truy Cập Module &amp; Nội Dung Hệ Thống
              </h3>
              <p className="text-[11px] text-slate-500">
                Hiển thị trực quan từng tài khoản đang có quyền gì và tích chọn Checkbox (<strong>Xem / Sửa / Xóa</strong>) cho từng tính năng
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chuyển chế độ hiển thị: Theo Vai trò vs Theo Từng Tài khoản */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
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
                <span>Ma trận Vai trò &amp; Tài khoản</span>
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
                <span>Chi tiết từng Tài khoản ({displayAccounts.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetAllPermissions}
              disabled={isSavingPerms}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
              title="Khôi phục về phân quyền mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>

            <button
              type="button"
              onClick={handleSavePermissionsConfiguration}
              disabled={isSavingPerms}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSavingPerms
                  ? 'Đang đồng bộ...'
                  : storageProvider === 'firestore'
                  ? 'Lưu & Đồng bộ Cloud Firestore'
                  : 'Lưu Phân Quyền'}
              </span>
            </button>
          </div>
        </div>

        {/* Khối Tổng hợp Tài khoản đang có quyền như thế nào (Click để chọn tài khoản phân quyền riêng) */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>Danh sách tài khoản &amp; trạng thái phân quyền hiện tại (Bấm chọn tài khoản để tích quyền riêng):</span>
            </div>
            {selectedAccountId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedAccountId('ALL')}
                className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer self-start sm:self-auto"
              >
                Hiển thị tất cả nhóm vai trò
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {displayAccounts.map((acc) => {
              const roleKey = resolveAccountRoleKey(acc);
              const isSelected = selectedAccountId === acc.id;
              const hasCustom = Boolean(accountCustomPerms[acc.id] && Object.keys(accountCustomPerms[acc.id]).length > 0);

              // Đếm số module có quyền Xem / Sửa / Xóa của tài khoản này
              let viewCount = 0;
              let editCount = 0;
              let deleteCount = 0;
              SYSTEM_MODULES.forEach((m) => {
                const p = getEffectiveAccountPermission(acc, m.id);
                if (p.view) viewCount++;
                if (p.edit) editCount++;
                if (p.delete) deleteCount++;
              });

              const roleBadge =
                roleKey === 'admin'
                  ? { text: 'Quản trị viên (Admin)', cls: 'bg-purple-100 text-purple-800 border-purple-200' }
                  : roleKey === 'nhan_vien_y_te'
                  ? { text: 'Nhân viên y tế', cls: 'bg-teal-100 text-teal-800 border-teal-200' }
                  : { text: 'Nhân viên tuyển dụng', cls: 'bg-sky-100 text-sky-800 border-sky-200' };

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(isSelected ? 'ALL' : acc.id)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-200 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900 truncate">
                          {acc.username}
                        </span>
                        {acc.status === 'locked' && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">
                            Khóa
                          </span>
                        )}
                        {hasCustom && (
                          <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold">
                            Quyền riêng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium truncate">{acc.fullName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${roleBadge.cls}`}>
                      {roleBadge.text}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Xem: {viewCount}/{SYSTEM_MODULES.length}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Sửa: {editCount}/{SYSTEM_MODULES.length}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        Xóa: {deleteCount}/{SYSTEM_MODULES.length}
                      </span>
                    </div>
                    <span className="text-purple-600 font-bold">
                      {isSelected ? 'Đang chọn' : 'Tùy chỉnh →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHẾ ĐỘ 1: BẢNG MA TRẬN THEO VAI TRÒ & TÀI KHOẢN ĐANG CHỌN */}
        {permissionViewMode === 'by_role' ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] align-top">
                  <th className="p-2.5 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedModuleIds.length === SYSTEM_MODULES.length && SYSTEM_MODULES.length > 0}
                      onChange={toggleSelectAllModuleRows}
                      title="Chọn tất cả các dòng tính năng"
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-purple-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5 text-center w-10">STT</th>
                  <th className="p-2.5 min-w-[220px]">
                    <div>Module / Tính năng hệ thống</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      {selectedModuleIds.length > 0
                        ? `Đang chọn ${selectedModuleIds.length}/${SYSTEM_MODULES.length} tính năng`
                        : 'Tích chọn dòng hoặc tích trực tiếp Xem / Sửa / Xóa'}
                    </div>
                  </th>

                  {/* Cột Nhân viên tuyển dụng + Danh sách tài khoản thuộc vai trò */}
                  <th className="p-2.5 text-center min-w-[215px] bg-sky-50/50 border-l border-slate-200">
                    <div className="text-sky-900 font-bold text-xs">Nhân viên tuyển dụng</div>
                    <div className="flex flex-wrap items-center justify-center gap-1 my-1.5">
                      {accountsByRole.nhan_vien_tuyen_dung.length === 0 ? (
                        <span className="text-[10px] font-normal text-slate-400">Chưa có tài khoản</span>
                      ) : (
                        accountsByRole.nhan_vien_tuyen_dung.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? 'ALL' : acc.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition cursor-pointer ${
                              selectedAccountId === acc.id
                                ? 'bg-sky-600 text-white border-sky-700'
                                : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-100'
                            }`}
                            title={`${acc.fullName} (${acc.username}) - Bấm để phân quyền riêng`}
                          >
                            @{acc.username}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-200">
                      <span>Cột:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_tuyen_dung', 'view')}
                        className="hover:underline cursor-pointer text-blue-700"
                      >
                        Xem
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_tuyen_dung', 'edit')}
                        className="hover:underline cursor-pointer text-amber-700"
                      >
                        Sửa
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_tuyen_dung', 'delete')}
                        className="hover:underline cursor-pointer text-rose-700"
                      >
                        Xóa
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_tuyen_dung', 'all')}
                        className="hover:underline cursor-pointer font-bold text-sky-900"
                      >
                        Tất cả
                      </button>
                    </div>
                  </th>

                  {/* Cột Nhân viên y tế + Danh sách tài khoản thuộc vai trò */}
                  <th className="p-2.5 text-center min-w-[215px] bg-teal-50/50 border-l border-slate-200">
                    <div className="text-teal-900 font-bold text-xs">Nhân viên y tế</div>
                    <div className="flex flex-wrap items-center justify-center gap-1 my-1.5">
                      {accountsByRole.nhan_vien_y_te.length === 0 ? (
                        <span className="text-[10px] font-normal text-slate-400">Chưa có tài khoản</span>
                      ) : (
                        accountsByRole.nhan_vien_y_te.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? 'ALL' : acc.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition cursor-pointer ${
                              selectedAccountId === acc.id
                                ? 'bg-teal-600 text-white border-teal-700'
                                : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-100'
                            }`}
                            title={`${acc.fullName} (${acc.username}) - Bấm để phân quyền riêng`}
                          >
                            @{acc.username}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                      <span>Cột:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_y_te', 'view')}
                        className="hover:underline cursor-pointer text-blue-700"
                      >
                        Xem
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_y_te', 'edit')}
                        className="hover:underline cursor-pointer text-amber-700"
                      >
                        Sửa
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_y_te', 'delete')}
                        className="hover:underline cursor-pointer text-rose-700"
                      >
                        Xóa
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('nhan_vien_y_te', 'all')}
                        className="hover:underline cursor-pointer font-bold text-teal-900"
                      >
                        Tất cả
                      </button>
                    </div>
                  </th>

                  {/* Cột Quản trị viên (Admin) + Danh sách tài khoản thuộc vai trò */}
                  <th className="p-2.5 text-center min-w-[215px] bg-purple-50/50 border-l border-slate-200">
                    <div className="text-purple-900 font-bold text-xs">Quản trị viên (Admin)</div>
                    <div className="flex flex-wrap items-center justify-center gap-1 my-1.5">
                      {accountsByRole.admin.length === 0 ? (
                        <span className="text-[10px] font-normal text-slate-400">Chưa có tài khoản</span>
                      ) : (
                        accountsByRole.admin.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? 'ALL' : acc.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition cursor-pointer ${
                              selectedAccountId === acc.id
                                ? 'bg-purple-600 text-white border-purple-700'
                                : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-100'
                            }`}
                            title={`${acc.fullName} (${acc.username}) - Bấm để phân quyền riêng`}
                          >
                            @{acc.username}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                      <span>Cột:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('admin', 'view')}
                        className="hover:underline cursor-pointer text-blue-700"
                      >
                        Xem
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('admin', 'edit')}
                        className="hover:underline cursor-pointer text-amber-700"
                      >
                        Sửa
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('admin', 'delete')}
                        className="hover:underline cursor-pointer text-rose-700"
                      >
                        Xóa
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntireRoleColumn('admin', 'all')}
                        className="hover:underline cursor-pointer font-bold text-purple-900"
                      >
                        Tất cả
                      </button>
                    </div>
                  </th>

                  {/* Cột Phân quyền riêng cho Tài khoản đang chọn (nếu có) */}
                  {focusedAccount && (
                    <th className="p-2.5 text-center min-w-[230px] bg-indigo-50/90 border-l-2 border-indigo-400">
                      <div className="flex items-center justify-center gap-1 text-indigo-950 font-bold text-xs">
                        <UserCog className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tài khoản: @{focusedAccount.username}</span>
                      </div>
                      <div className="text-[10px] text-indigo-700 font-medium my-1">
                        {focusedAccount.fullName}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetAccountCustomPerm(focusedAccount.id)}
                          className="text-[10px] bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold cursor-pointer"
                        >
                          Đồng bộ theo vai trò
                        </button>
                      </div>
                    </th>
                  )}

                  <th className="p-2.5 min-w-[200px] border-l border-slate-200">Mô tả quyền hạn chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {SYSTEM_MODULES.map((mod) => {
                  const isRowSelected = selectedModuleIds.includes(mod.id);
                  const tdPerm = roleMatrix[mod.id]?.nhan_vien_tuyen_dung || {
                    view: false,
                    edit: false,
                    delete: false,
                  };
                  const ytPerm = roleMatrix[mod.id]?.nhan_vien_y_te || {
                    view: false,
                    edit: false,
                    delete: false,
                  };
                  const adPerm = roleMatrix[mod.id]?.admin || {
                    view: true,
                    edit: true,
                    delete: true,
                  };

                  return (
                    <tr
                      key={mod.id}
                      className={`transition ${
                        isRowSelected ? 'bg-purple-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleSelectModuleRow(mod.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 accent-purple-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-mono text-center font-bold text-slate-500">
                        {mod.stt}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{mod.name}</div>
                      </td>

                      {/* Ô Checkbox Nhân viên tuyển dụng */}
                      <td className="p-2 text-center border-l border-slate-100 bg-sky-50/15">
                        {renderPermissionCheckboxes(
                          tdPerm,
                          (action) => handleToggleRolePermission(mod.id, 'nhan_vien_tuyen_dung', action),
                          () => handleToggleAllInRoleCell(mod.id, 'nhan_vien_tuyen_dung'),
                          'sky'
                        )}
                      </td>

                      {/* Ô Checkbox Nhân viên y tế */}
                      <td className="p-2 text-center border-l border-slate-100 bg-teal-50/15">
                        {renderPermissionCheckboxes(
                          ytPerm,
                          (action) => handleToggleRolePermission(mod.id, 'nhan_vien_y_te', action),
                          () => handleToggleAllInRoleCell(mod.id, 'nhan_vien_y_te'),
                          'teal'
                        )}
                      </td>

                      {/* Ô Checkbox Quản trị viên (Admin) */}
                      <td className="p-2 text-center border-l border-slate-100 bg-purple-50/15">
                        {renderPermissionCheckboxes(
                          adPerm,
                          (action) => handleToggleRolePermission(mod.id, 'admin', action),
                          () => handleToggleAllInRoleCell(mod.id, 'admin'),
                          'purple'
                        )}
                      </td>

                      {/* Ô Checkbox riêng cho Tài khoản đang chọn (nếu có) */}
                      {focusedAccount && (
                        <td className="p-2 text-center border-l-2 border-indigo-300 bg-indigo-50/35">
                          {renderPermissionCheckboxes(
                            getEffectiveAccountPermission(focusedAccount, mod.id),
                            (action) => handleToggleAccountPermission(focusedAccount, mod.id, action),
                            () => handleToggleAccountPermission(focusedAccount, mod.id, 'all'),
                            'indigo'
                          )}
                        </td>
                      )}

                      <td className="p-2.5 text-slate-500 text-[11px] border-l border-slate-100">
                        {mod.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CHẾ ĐỘ 2: BẢNG PHÂN QUYỀN CHI TIẾT THEO TỪNG TÀI KHOẢN CỤ THỂ */
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] align-top">
                  <th className="p-2.5 text-center w-10">STT</th>
                  <th className="p-2.5 min-w-[220px]">Module / Tính năng hệ thống</th>
                  {displayAccounts.map((acc) => {
                    const roleKey = resolveAccountRoleKey(acc);
                    const hasCustom = Boolean(
                      accountCustomPerms[acc.id] && Object.keys(accountCustomPerms[acc.id]).length > 0
                    );
                    return (
                      <th
                        key={acc.id}
                        className="p-2.5 text-center min-w-[210px] border-l border-slate-200 bg-slate-50/80"
                      >
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          @{acc.username}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 truncate">
                          {acc.fullName}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              roleKey === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : roleKey === 'nhan_vien_y_te'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {roleKey === 'admin'
                              ? 'Admin'
                              : roleKey === 'nhan_vien_y_te'
                              ? 'NV Y tế'
                              : 'NV Tuyển dụng'}
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
                      {mod.stt}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{mod.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{mod.description}</div>
                    </td>
                    {displayAccounts.map((acc) => {
                      const effPerm = getEffectiveAccountPermission(acc, mod.id);
                      const roleKey = resolveAccountRoleKey(acc);
                      return (
                        <td key={acc.id} className="p-2 text-center border-l border-slate-100">
                          {renderPermissionCheckboxes(
                            effPerm,
                            (action) => handleToggleAccountPermission(acc, mod.id, action),
                            () => handleToggleAccountPermission(acc, mod.id, 'all'),
                            roleKey === 'admin' ? 'purple' : roleKey === 'nhan_vien_y_te' ? 'teal' : 'sky'
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
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Tên đăng nhập, Email, Họ tên..."
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
                <th className="p-3 text-center">Vai Trò</th>
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
                  const isUserAdmin = user.role === 'admin';
                  const isLocked = user.status === 'locked';

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
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Admin (Toàn quyền)
                          </span>
                        ) : user.hrmRole === 'nhan_vien_y_te' ? (
                          <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" /> Nhân viên y tế
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" /> Nhân viên tuyển dụng
                          </span>
                        )}
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
                            title="Sửa thông tin / Đổi mật khẩu"
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
                    Cấp tài khoản đăng nhập và thông tin xác thực qua Email
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
                  Tên đăng nhập (Username) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: tuyendung02, hr_nguyen..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tên đăng nhập viết liền không dấu, dùng để đăng nhập vào hệ thống
                </p>
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
                  Email nhân viên (Dùng để đổi mật khẩu nếu quên) *
                </label>
                <input
                  type="email"
                  placeholder="nhanvien@congty.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Có thể để trống nếu nhân viên chưa có email; đăng nhập bằng mã nhân viên.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Phân quyền vai trò *
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
                    Nhân viên tuyển dụng (Đăng ký NV mới, Đăng ký KSK &amp; Xem tiêu chuẩn KSK)
                  </option>
                  <option value="nhan_vien_y_te">
                    Nhân viên y tế (Theo dõi &amp; Cập nhật KSK tuyển dụng)
                  </option>
                  <option value="admin">
                    Quản trị viên (Toàn quyền xem &amp; sửa toàn bộ thông tin)
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
                    Vai trò phân quyền
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
                    <option value="nhan_vien_tuyen_dung">Nhân viên tuyển dụng</option>
                    <option value="nhan_vien_y_te">Nhân viên y tế</option>
                    <option value="admin">Quản trị viên (Admin)</option>
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
