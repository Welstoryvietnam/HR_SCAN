import React, { useState, useEffect } from 'react';
import { UserProfile, SystemUserAccount } from '../types';
import { safeFetchJson } from '../utils/apiHelper';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  Key,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface UserManagementProps {
  currentUser: UserProfile;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<SystemUserAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal tạo tài khoản mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'employee'>('employee');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal sửa / đổi mật khẩu
  const [editingUser, setEditingUser] = useState<SystemUserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');
  const [editStatus, setEditStatus] = useState<'active' | 'locked'>('active');

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ success: boolean; users: SystemUserAccount[] }>(
        '/api/admin/users',
        {
          headers: { 'x-user-email': currentUser.email },
        }
      );
      if (res.data?.success && Array.isArray(res.data.users)) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.warn('Lỗi gọi API /api/admin/users, dùng dữ liệu lưu trữ nội bộ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser.email]);

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
            role: newRole,
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
        role: editRole,
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

    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.username}" (${user.fullName})?`)) {
      return;
    }

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

  // Lọc tài khoản theo từ khóa tìm kiếm
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      u.username.toLowerCase().includes(term) ||
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role === 'admin' ? 'quản trị viên admin' : 'nhân viên tuyển dụng').includes(term)
    );
  });

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

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
            title="Làm mới danh sách tài khoản"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

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
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'employee')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white font-medium"
                >
                  <option value="employee">
                    Nhân viên tuyển dụng (Chỉ thực hiện nhập & điền hồ sơ)
                  </option>
                  <option value="admin">
                    Quản trị viên (Toàn quyền xem & sửa toàn bộ thông tin)
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
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'employee')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-blue-600 bg-white"
                  >
                    <option value="employee">Nhân viên tuyển dụng</option>
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
    </div>
  );
};
