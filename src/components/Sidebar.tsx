import React from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Coins,
  Building2,
  UserCog,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserCheck,
  CalendarCheck,
  FileText,
  Hospital,
  BarChart3,
  Gift,
  Award,
  RotateCcw,
  Home,
  BookOpen,
  ClipboardList,
  FilePlus2,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { AppTab } from './Header';
import { HealthSubTab } from './HealthCheckStandardsManager';
import { BenefitCounts } from './RecruitmentBenefitsManager';
import { SopCounts } from './HrSopManager';
import { LaborLawCounts } from './LaborLawManager';
import {
  UserProfile,
  RecruitmentBenefitSubTab,
  HrSopSubTab,
  LaborLawSubTab,
} from '../types';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  healthSubTab: HealthSubTab;
  onHealthSubTabChange: (subTab: HealthSubTab) => void;
  healthCounts: { regs: number; completedRegs?: number; standards: number; providers: number };
  benefitsSubTab: RecruitmentBenefitSubTab;
  onBenefitsSubTabChange: (subTab: RecruitmentBenefitSubTab) => void;
  benefitCounts: BenefitCounts;
  sopSubTab: HrSopSubTab;
  onSopSubTabChange: (subTab: HrSopSubTab) => void;
  sopCounts: SopCounts;
  laborLawSubTab: LaborLawSubTab;
  onLaborLawSubTabChange: (subTab: LaborLawSubTab) => void;
  laborLawCounts: LaborLawCounts;
  currentUser: UserProfile;
  recordsCount: number;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  healthSubTab,
  onHealthSubTabChange,
  healthCounts,
  benefitsSubTab,
  onBenefitsSubTabChange,
  benefitCounts,
  sopSubTab,
  onSopSubTabChange,
  sopCounts,
  laborLawSubTab,
  onLaborLawSubTabChange,
  laborLawCounts,
  currentUser,
  recordsCount,
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isMedicalStaff = !isAdmin && currentUser.hrmRole === 'nhan_vien_y_te';
  const isRecruiter = !isAdmin && !isMedicalStaff;
  const canAccessBenefits =
    isAdmin ||
    currentUser.hrmRole === 'admin' ||
    currentUser.hrmRole === 'truong_nhom_tuyen_dung' ||
    currentUser.hrmRole === 'truong_nhom_cnb';

  const isUploadGroup = ['upload', 'records', 'salary'].includes(activeTab);

  const handleSelectHealthSubTab = (sub: HealthSubTab) => {
    onTabChange('health');
    onHealthSubTabChange(sub);
  };

  const handleSelectBenefitsSubTab = (sub: RecruitmentBenefitSubTab) => {
    onTabChange('benefits');
    onBenefitsSubTabChange(sub);
  };

  const handleSelectSopSubTab = (sub: HrSopSubTab) => {
    onTabChange('sop');
    onSopSubTabChange(sub);
  };

  const handleSelectLaborLawSubTab = (sub: LaborLawSubTab) => {
    onTabChange('labor_law');
    onLaborLawSubTabChange(sub);
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shrink-0 select-none ${
        sidebarCollapsed ? 'w-20' : 'w-68'
      }`}
    >
      {/* Toggle Button at top of sidebar */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        {!sidebarCollapsed && (
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-2">
            Menu Chức Năng
          </span>
        )}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer mx-auto"
          title={sidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {/* 1. Quản lý & Tiêu chuẩn KSK */}
        <div>
          <button
            type="button"
            onClick={() => onTabChange('health')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'health'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Quản Lý & Tiêu Chuẩn KSK"
          >
            <Stethoscope className={`w-5 h-5 shrink-0 ${activeTab === 'health' ? 'text-teal-300' : 'text-teal-600'}`} />
            {!sidebarCollapsed && <span className="truncate">Quản Lý &amp; Tiêu Chuẩn KSK</span>}
          </button>

          {/* Sub-menu items for Quản Lý & Tiêu Chuẩn KSK when expanded */}
          {!sidebarCollapsed && activeTab === 'health' && (
            <div className="pl-4 pt-1.5 space-y-1 animate-fade-in border-l-2 border-blue-100 ml-4 my-1">
              {(isAdmin || isRecruiter) && (
                <button
                  type="button"
                  onClick={() => handleSelectHealthSubTab('tuyen_dung_dang_ky')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    healthSubTab === 'tuyen_dung_dang_ky'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserPlus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">1. Đăng ký KSK tuyển dụng</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] rounded-full font-bold shrink-0">
                    {healthCounts.regs}
                  </span>
                </button>
              )}

              {(isAdmin || isMedicalStaff) && (
                <button
                  type="button"
                  onClick={() => handleSelectHealthSubTab('tuyen_dung_theo_doi')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    healthSubTab === 'tuyen_dung_theo_doi'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">2. Theo dõi KSK tuyển dụng</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelectHealthSubTab('tuyen_dung_ket_qua')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  healthSubTab === 'tuyen_dung_ket_qua'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">3. Tiếp nhận sau KSK</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold shrink-0">
                  {healthCounts.completedRegs ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectHealthSubTab('tuyen_dung_tieu_chuan')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  healthSubTab === 'tuyen_dung_tieu_chuan'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">4. Tiêu chuẩn KSK tuyển dụng</span>
              </button>

              {(isAdmin || isMedicalStaff) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelectHealthSubTab('dinh_ky')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      healthSubTab === 'dinh_ky'
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">5. Tiêu chuẩn KSK định kỳ</span>
                    </div>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold shrink-0">
                      {healthCounts.standards}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectHealthSubTab('nha_cung_cap')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      healthSubTab === 'nha_cung_cap'
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hospital className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">6. Nhà cung cấp KSK</span>
                    </div>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold shrink-0">
                      {healthCounts.providers}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectHealthSubTab('tuyen_dung_dashboard')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      healthSubTab === 'tuyen_dung_dashboard'
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">7. Dashboard KSK tuyển dụng</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 2. Đăng Ký Nhân Viên Mới */}
        {!isMedicalStaff && (
          <div>
            <button
              type="button"
              onClick={() => onTabChange('upload')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                isUploadGroup
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Đăng Ký Nhân Viên Mới"
            >
              <UploadCloud className={`w-5 h-5 shrink-0 ${isUploadGroup ? 'text-white' : 'text-blue-600'}`} />
              {!sidebarCollapsed && <span className="truncate">Đăng Ký Nhân Viên Mới</span>}
            </button>

            {/* Sub-menu items for Upload group when expanded */}
            {!sidebarCollapsed && isUploadGroup && (
              <div className="pl-4 pt-1.5 space-y-1 animate-fade-in border-l-2 border-blue-100 ml-4 my-1">
                <button
                  type="button"
                  onClick={() => onTabChange('upload')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{isAdmin ? 'Đăng ký nhân viên mới' : 'Nhập & Điền Hồ Sơ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onTabChange('records')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'records'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{isAdmin ? 'Hồ sơ đã lưu' : 'Hồ Sơ Của Bạn'}</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold shrink-0">
                    {recordsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onTabChange('salary')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'salary'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Tiêu chuẩn lương</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Chính sách & Phúc lợi tuyển dụng (Chỉ Admin, Trưởng nhóm Tuyển dụng, Trưởng nhóm C&B) */}
        {canAccessBenefits && (
          <div>
            <button
              type="button"
              onClick={() => onTabChange('benefits')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'benefits'
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Chính sách & Phúc lợi tuyển dụng"
            >
              <Gift className={`w-5 h-5 shrink-0 ${activeTab === 'benefits' ? 'text-amber-300' : 'text-amber-600'}`} />
              {!sidebarCollapsed && <span className="truncate">Chính sách &amp; Phúc lợi TD</span>}
            </button>

            {!sidebarCollapsed && activeTab === 'benefits' && (
              <div className="pl-4 pt-1.5 space-y-1 animate-fade-in border-l-2 border-blue-100 ml-4 my-1">
                <button
                  type="button"
                  onClick={() => handleSelectBenefitsSubTab('danh_muc_chinh_sach')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    benefitsSubTab === 'danh_muc_chinh_sach'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">1. Danh mục chính sách</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold shrink-0">
                    {benefitCounts.danh_muc_chinh_sach ?? 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectBenefitsSubTab('thuong_gioi_thieu')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    benefitsSubTab === 'thuong_gioi_thieu'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">2. Thưởng giới thiệu</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold shrink-0">
                    {benefitCounts.thuong_gioi_thieu}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectBenefitsSubTab('nguoi_cu_quay_lai')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    benefitsSubTab === 'nguoi_cu_quay_lai'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">3. Người cũ quay lại</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-bold shrink-0">
                    {benefitCounts.nguoi_cu_quay_lai}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectBenefitsSubTab('ho_tro_nha_tro')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    benefitsSubTab === 'ho_tro_nha_tro'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Home className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">4. Hỗ trợ nhà trọ</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] rounded-full font-bold shrink-0">
                    {benefitCounts.ho_tro_nha_tro}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. Tra cứu, đăng ký SOP nhân sự */}
        <div>
          <button
            type="button"
            onClick={() => onTabChange('sop')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'sop'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tra cứu, đăng ký SOP nhân sự"
          >
            <ClipboardList className={`w-5 h-5 shrink-0 ${activeTab === 'sop' ? 'text-teal-300' : 'text-indigo-600'}`} />
            {!sidebarCollapsed && <span className="truncate">Tra cứu &amp; Đăng ký SOP</span>}
          </button>

          {!sidebarCollapsed && activeTab === 'sop' && (
            <div className="pl-4 pt-1.5 space-y-1 animate-fade-in border-l-2 border-blue-100 ml-4 my-1">
              <button
                type="button"
                onClick={() => handleSelectSopSubTab('tra_cuu_sop')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sopSubTab === 'tra_cuu_sop'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">1. Tra cứu SOP nhân sự</span>
                </div>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold shrink-0">
                  {sopCounts.sop_list}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSopSubTab('dang_ky_sop')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sopSubTab === 'dang_ky_sop'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FilePlus2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">2. Đăng ký / Đề xuất SOP</span>
                </div>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold shrink-0">
                  {sopCounts.sop_registrations}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Tra cứu Luật lao động, Nội quy lao động */}
        <div>
          <button
            type="button"
            onClick={() => onTabChange('labor_law')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'labor_law'
                ? 'bg-[#1a73e8] text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tra cứu luật lao động, nội quy lao động"
          >
            <Scale className={`w-5 h-5 shrink-0 ${activeTab === 'labor_law' ? 'text-amber-300' : 'text-emerald-600'}`} />
            {!sidebarCollapsed && <span className="truncate">Luật LĐ &amp; Nội quy LĐ</span>}
          </button>

          {!sidebarCollapsed && activeTab === 'labor_law' && (
            <div className="pl-4 pt-1.5 space-y-1 animate-fade-in border-l-2 border-blue-100 ml-4 my-1">
              <button
                type="button"
                onClick={() => handleSelectLaborLawSubTab('luat_lao_dong')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  laborLawSubTab === 'luat_lao_dong'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">1. Tra cứu Luật lao động</span>
                </div>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold shrink-0">
                  {laborLawCounts.luat_lao_dong}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLaborLawSubTab('noi_quy_lao_dong')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  laborLawSubTab === 'noi_quy_lao_dong'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">2. Nội quy lao động</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold shrink-0">
                  {laborLawCounts.noi_quy_lao_dong}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Tabs */}
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => onTabChange('organization')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeTab === 'organization'
                  ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Cài đặt tiêu chuẩn chung"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Building2 className="w-5 h-5 text-purple-600 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Cài đặt tiêu chuẩn chung</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded shrink-0">
                  Admin
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Quản Lý Tài Khoản"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserCog className="w-5 h-5 text-rose-600 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Quản Lý Tài Khoản</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded shrink-0">
                  Admin
                </span>
              )}
            </button>
          </>
        )}
      </nav>
    </aside>
  );
};
