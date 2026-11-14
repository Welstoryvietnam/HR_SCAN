import React from 'react';
import { UserProfile } from '../types';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
export type AppTab = 'upload' | 'records' | 'health' | 'organization' | 'salary' | 'users';

interface HeaderProps {
  currentUser: UserProfile;
  onLogout: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isMedicalStaff = !isAdmin && currentUser.hrmRole === 'nhan_vien_y_te';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs h-16">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

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

        {/* User Profile & Logout Action */}
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
                    <ShieldCheck className="w-3 h-3" /> {currentUser.hrmRole==='quan_ly_nhan_su'?'Quản lý nhân sự':'Admin'}
                  </span>
                ) : isMedicalStaff ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                    <Stethoscope className="w-3 h-3" /> Y tế
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                    <UserCheck className="w-3 h-3" /> Tuyển dụng
                  </span>
                )}
              </div>
            </div>
          </div>

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
    </header>
  );
};
