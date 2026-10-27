import React from 'react';
import { UserProfile } from '../types';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  FileSpreadsheet,
  Mail,
  Users,
  UploadCloud,
  LayoutDashboard,
  UserCog,
  Download
} from 'lucide-react';

export type AppTab = 'upload' | 'records' | 'dashboard' | 'salary' | 'emails' | 'users';
export type WorkspaceModule = 'hrscan' | 'tasks';

interface HeaderProps {
  currentUser: UserProfile;
  onLogout: () => void;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  recordsCount: number;
  module?: WorkspaceModule;
  onModuleChange?: (module: WorkspaceModule) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onTabChange,
  recordsCount,
}) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-xs">
              WELV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  WELV HR Workspace
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  HR
                </span>
              </div>
            </div>
          </div>

          {/* User Profile & Logout Action (Thay thế việc chuyển tài khoản bằng chọn trên giao diện) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                  isAdmin ? 'bg-purple-600' : 'bg-sky-600'
                }`}
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 max-w-[150px] truncate">
                    {currentUser.employeeCode || currentUser.email}
                  </span>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                      <ShieldCheck className="w-3 h-3" /> {currentUser.hrmRole==='quan_ly_nhan_su'?'Quản lý nhân sự':'Admin (Toàn quyền)'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                      <UserCheck className="w-3 h-3" /> Nhân viên tuyển dụng
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Nút Tải Toàn Bộ Code ZIP */}
            <a
              href="/source-code.zip"
              download="hr-scan-source-code.zip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Tải toàn bộ mã nguồn (.ZIP) để đưa lên GitHub thủ công"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Tải code (ZIP)</span>
            </a>

            {/* Nút Đăng Xuất */}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Chức năng hệ thống nhân sự" className="flex space-x-1 sm:space-x-4 border-t border-slate-100 overflow-x-auto py-2">
          {/* Tab Nộp hồ sơ: Cả Admin và Nhân viên tuyển dụng đều sử dụng */}
          <button
            type="button"
            onClick={() => onTabChange('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>
              {isAdmin ? 'Tiếp Nhận & Xử Lý SOP' : 'Nhập & Điền Hồ Sơ Tuyển Dụng'}
            </span>
          </button>

          {/* Tab Sheet DanhSachNhanSu */}
          <button
            type="button"
            onClick={() => onTabChange('records')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'records'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {isAdmin ? 'Hồ sơ đã lưu' : 'Hồ Sơ Đã Nộp Của Bạn'}
            </span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[11px] rounded-full">
              {recordsCount}
            </span>
          </button>

          {/* CÁC TAB DÀNH RIÊNG CHO QUẢN TRỊ VIÊN (ADMIN) - Nhân viên tuyển dụng không có quyền xem */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => onTabChange('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Phân Tích</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('salary')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'salary'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Tiêu Chuẩn Lương &amp; Cơ Cấu</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('emails')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'emails'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Hộp Thư MailApp</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('users')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span>Quản Lý Tài Khoản</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                  Admin
                </span>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
