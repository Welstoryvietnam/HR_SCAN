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
  UserCog,
  Building2,
  Stethoscope,
  Layers,
  Coins
} from 'lucide-react';

export type AppTab = 'upload' | 'records' | 'health' | 'organization' | 'salary' | 'emails' | 'users';

interface HeaderProps {
  currentUser: UserProfile;
  onLogout: () => void;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  recordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onTabChange,
  recordsCount,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isMedicalStaff = !isAdmin && currentUser.hrmRole === 'nhan_vien_y_te';

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
                  ) : isMedicalStaff ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                      <Stethoscope className="w-3 h-3" /> Nhân viên y tế
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                      <UserCheck className="w-3 h-3" /> Nhân viên tuyển dụng
                    </span>
                  )}
                </div>
              </div>
            </div>


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
        <nav aria-label="Chức năng hệ thống nhân sự" className="flex flex-col space-y-2 border-t border-slate-100 py-2">
          {/* Primary Module Tabs */}
          <div className="flex space-x-1 sm:space-x-4 overflow-x-auto">
            {!isMedicalStaff && (
              <button
                type="button"
                onClick={() => onTabChange('upload')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  ['upload', 'records', 'salary'].includes(activeTab)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Đăng Ký Nhân Viên Mới</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onTabChange('health')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Quản Lý &amp; Tiêu Chuẩn KSK</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => onTabChange('organization')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'organization'
                      ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Cơ Cấu Tổ Chức</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                    Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onTabChange('emails')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
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
          </div>

          {/* Sub-Navigation Bar for Đăng ký nhân viên mới module */}
          {!isMedicalStaff && ['upload', 'records', 'salary'].includes(activeTab) && (
            <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-100 rounded-xl p-1.5 overflow-x-auto animate-fade-in">
              <span className="text-xs font-bold text-blue-900 px-2 flex items-center gap-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Danh mục con:
              </span>

              <button
                type="button"
                onClick={() => onTabChange('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold border border-blue-200'
                    : 'text-blue-900/70 hover:text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>{isAdmin ? 'Đăng ký nhân viên mới' : 'Nhập & Điền Hồ Sơ Tuyển Dụng'}</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('records')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'records'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold border border-blue-200'
                    : 'text-blue-900/70 hover:text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAdmin ? 'Hồ sơ đã lưu' : 'Hồ Sơ Đã Nộp Của Bạn'}</span>
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                  {recordsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('salary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'salary'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold border border-blue-200'
                    : 'text-blue-900/70 hover:text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>Tiêu chuẩn lương</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
