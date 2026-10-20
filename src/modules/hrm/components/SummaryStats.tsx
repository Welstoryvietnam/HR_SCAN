import React from 'react';
import {
  Wallet,
  Utensils,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, AuthUser } from '../types';
import { getCycleDays, formatVND, formatNumber, numberToVietnameseWords } from '../utils/cycleHelper';

interface SummaryStatsProps {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  cycle: CycleConfig;
  settings: AppSettings;
  currentUser?: AuthUser | null;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  employees,
  mealData,
  cycle,
  settings,
  currentUser,
}) => {
  const cycleDays = getCycleDays(cycle);
  const isPersonalOnly = Boolean(currentUser && currentUser.role === 'nhan_vien_nhan_su');

  const targetEmployees = isPersonalOnly
    ? employees.filter((e) => e.id === currentUser?.id)
    : employees;

  let totalMeals = 0;
  let activeEmployeesCount = 0;
  let myActiveDaysCount = 0;
  let lunchCount = 0;
  let dinnerCount = 0;

  targetEmployees.forEach((emp) => {
    const records = mealData[emp.id]?.records || {};
    let empMeals = 0;
    cycleDays.forEach((day) => {
      const rec = records[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        empMeals += rec.mealsCount;
        if (isPersonalOnly) {
          myActiveDaysCount++;
        }
        if (rec.sessions && rec.sessions.length > 0) {
          rec.sessions.forEach((s) => {
            if (s.mealType === 'Bữa Trưa' || s.mealType?.includes('Trưa')) {
              lunchCount += s.mealsCount || 1;
            } else if (s.mealType === 'Bữa Tối' || s.mealType?.includes('Tối')) {
              dinnerCount += s.mealsCount || 1;
            }
          });
        } else {
          lunchCount += rec.mealsCount;
        }
      }
    });

    totalMeals += empMeals;
    if (empMeals > 0) {
      activeEmployeesCount++;
    }
  });

  const mealPrice = settings.mealPrice || 40000;
  const totalAmount = totalMeals * mealPrice;
  const avgMealsPerPerson =
    targetEmployees.length > 0 ? (totalMeals / targetEmployees.length).toFixed(1) : '0';

  const participationRate = Math.round((activeEmployeesCount / (targetEmployees.length || 1)) * 100);

  return (
    <div className="no-print space-y-3 select-none">
      {/* 4 Cards Grid - Enterprise HR Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Money Payable */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isPersonalOnly ? 'Tiền Ăn Kỳ Này Của Tôi' : 'Tổng Kinh Phí Thanh Toán'}
              </span>
              <div className="flex items-baseline gap-1.5 pt-0.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-950 tracking-tight tabular-nums">
                  {formatVND(totalAmount)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate font-medium pt-0.5">
                {numberToVietnameseWords(totalAmount)}
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Meals */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isPersonalOnly ? 'Tổng Số Suất Của Tôi' : 'Tổng Số Suất Ăn Chu Kỳ'}
              </span>
              <div className="flex items-baseline gap-1.5 pt-0.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                  {formatNumber(totalMeals)}
                </span>
                <span className="text-xs text-slate-500 font-medium">suất</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                <span>Đơn giá chuẩn:</span>
                <strong className="text-slate-800 font-mono font-semibold">
                  {formatNumber(mealPrice)} ₫
                </strong>
                <span>/suất</span>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Active Personnel / Days */}
        {isPersonalOnly ? (
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1 min-w-0 pr-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Số Ngày Đi Tuyển Dụng
                </span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                    {myActiveDaysCount}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ {cycleDays.length} ngày</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 shadow-inner">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((myActiveDaysCount / (cycleDays.length || 30)) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0 border border-violet-100/80 shadow-2xs">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1 min-w-0 pr-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Nhân Sự Có Phát Sinh
                </span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                    {activeEmployeesCount}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ {employees.length} người</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 shadow-inner">
                  <div
                    className="bg-violet-600 h-full rounded-full transition-all"
                    style={{ width: `${participationRate}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5">
                  {participationRate}% quân số phòng Nhân sự đã chấm
                </div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0 border border-violet-100/80 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Average / Policy standard */}
        {isPersonalOnly ? (
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Trạng Thái Chấm Ăn
                </span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-lg font-bold text-emerald-800">
                    Sẵn sàng duyệt
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                  Chốt chu kỳ: ngày 25 hàng tháng
                </div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Bình Quân / Nhân Sự
                </span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                    {avgMealsPerPerson}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">suất/người</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate pt-0.5">
                  Tương đương ~ {formatVND(Number(avgMealsPerPerson) * mealPrice)}
                </div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
