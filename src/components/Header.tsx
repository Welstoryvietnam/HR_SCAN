import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, User, RefreshCw, FileSpreadsheet, Code2, Mail, Users, UploadCloud, ChevronDown, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  onChangeUser: (email: string) => void;
  activeTab: 'upload' | 'records' | 'dashboard' | 'salary' | 'emails' | 'apps_script';
  onTabChange: (tab: 'upload' | 'records' | 'dashboard' | 'salary' | 'emails' | 'apps_script') => void;
  recordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onChangeUser,
  activeTab,
  onTabChange,
  recordsCount,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const demoAccounts = [
    { email: 'Happyendpu@gmail.com', label: 'Happyendpu@gmail.com (Quản trị viên)', role: 'admin' },
    { email: 'nguyenvana@congty.com', label: 'nguyenvana@congty.com (Nhân viên IT)', role: 'employee' },
    { email: 'tranthingoc@congty.com', label: 'tranthingoc@congty.com (Nhân viên Kinh Doanh)', role: 'employee' },
  ];

  const handleCustomSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmail.trim() && customEmail.includes('@')) {
      onChangeUser(customEmail.trim().toLowerCase());
      setCustomEmail('');
      setShowDropdown(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-100">Google Workspace Solution:</span>
          <span className="text-slate-300">Google Sheets + Gemini Multimodal Vision + MailApp</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Tối ưu hóa: 1024px JPEG 0.8 (~85% token savings)</span>
          <span className="bg-blue-800 text-blue-200 px-2 py-0.5 rounded font-mono text-[11px]">Apps Script Web App</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              HR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  HR Document AI Automator
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  v2.5 Vision
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Hệ thống tự động hóa nhập liệu hồ sơ nhân sự bằng AI tích hợp Google Sheets
              </p>
            </div>
          </div>

          {/* User Profile & Role Switcher (Session.getActiveUser().getEmail()) */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-left transition text-xs sm:text-sm"
              title="Nhấn để đổi tài khoản kiểm thử phân quyền"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                {currentUser.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 max-w-[140px] truncate">
                    {currentUser.email}
                  </span>
                  {currentUser.role === 'admin' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                      <User className="w-3 h-3" /> Nhân viên
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Session.getActiveUser()</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown switch account */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Mô phỏng tài khoản Google
                </div>
                <div className="space-y-1">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => {
                        onChangeUser(acc.email);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        currentUser.email.toLowerCase() === acc.email.toLowerCase()
                          ? 'bg-blue-50 text-blue-800 font-semibold border border-blue-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="truncate">{acc.email}</div>
                        <div className="text-[10px] text-slate-400">
                          {acc.role === 'admin' ? 'Quyền Quản trị viên (Toàn quyền)' : 'Quyền Nhân viên (Chỉ hồ sơ của mình)'}
                        </div>
                      </div>
                      {acc.role === 'admin' ? (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0">
                          Nhân viên
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <form onSubmit={handleCustomSwitch} className="space-y-2">
                    <label className="text-[11px] text-slate-600 block">Hoặc nhập email Google khác:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        placeholder="ten@congty.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-blue-600"
                      />
                      <button
                        type="submit"
                        className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md hover:bg-slate-900"
                      >
                        Đổi
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-100 overflow-x-auto py-1">
          <button
            onClick={() => onTabChange('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Nộp Hồ Sơ & AI Vision</span>
          </button>

          <button
            onClick={() => onTabChange('records')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Sheet "DanhSachNhanSu"</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[11px] rounded-full">
              {recordsCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Phân Tích</span>
          </button>

          <button
            onClick={() => onTabChange('salary')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'salary'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Sheet "TieuChuanLuong"</span>
            {currentUser.role === 'admin' && (
              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                Admin
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('emails')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'emails'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Hộp Thư MailApp</span>
          </button>

          <button
            onClick={() => onTabChange('apps_script')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'apps_script'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Mã Nguồn Apps Script (Code.gs)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
