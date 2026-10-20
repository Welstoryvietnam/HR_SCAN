import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Info, Banknote, Clock } from 'lucide-react';
import { CycleConfig, AppSettings } from '../types';
import { getCycleConfig, formatVND, getCurrentCycle } from '../utils/cycleHelper';

interface CycleSelectorProps {
  cycle: CycleConfig;
  setCycle: (cycle: CycleConfig) => void;
  settings: AppSettings;
}

export const CycleSelector: React.FC<CycleSelectorProps> = ({
  cycle,
  setCycle,
  settings,
}) => {
  const handlePrevCycle = () => {
    let nextMonth = cycle.month - 1;
    let nextYear = cycle.year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setCycle(getCycleConfig(nextYear, nextMonth));
  };

  const handleNextCycle = () => {
    let nextMonth = cycle.month + 1;
    let nextYear = cycle.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setCycle(getCycleConfig(nextYear, nextMonth));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split('-').map(Number);
    setCycle(getCycleConfig(y, m));
  };

  const handleCurrentCycle = () => {
    setCycle(getCurrentCycle());
  };

  // Generate options for recent cycles (previous 6 months + next 3 months)
  const cycleOptions = [];
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth() + 1;

  for (let offset = -6; offset <= 3; offset++) {
    let m = baseMonth + offset;
    let y = baseYear;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    const val = `${y}-${m}`;
    const cfg = getCycleConfig(y, m);
    cycleOptions.push({
      value: val,
      label: cfg.label,
      year: y,
      month: m,
    });
  }

  const [sY, sM, sD] = cycle.startDate.split('-');
  const [eY, eM, eD] = cycle.endDate.split('-');

  return (
    <div className="no-print bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs select-none">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
        {/* Left: Modern Month Navigator with Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevCycle}
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Kỳ trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2.5">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <select
                value={`${cycle.year}-${cycle.month}`}
                onChange={handleMonthChange}
                aria-label="Chọn chu kỳ tính tiền ăn"
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 border-none focus:outline-none cursor-pointer pr-1"
              >
                {cycleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Chu Kỳ Tháng {opt.month}/{opt.year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextCycle}
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Kỳ tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date range details */}
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <span>Từ</span>
            <span className="font-semibold font-mono text-slate-800">{sD}/{sM}/{sY}</span>
            <span className="text-slate-400">→</span>
            <span>Đến</span>
            <span className="font-semibold font-mono text-slate-800">{eD}/{eM}/{eY}</span>
          </div>

          {/* Quick jump to current cycle button */}
          <button
            type="button"
            onClick={handleCurrentCycle}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            Hôm nay
          </button>
        </div>

        {/* Right: Policy Standard & Rule Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-900 border border-emerald-200/80 px-3 py-1 rounded-lg font-medium shadow-2xs">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            <span>Định mức:</span>
            <span className="font-bold text-emerald-800 font-mono tabular-nums">
              {formatVND(settings.mealPrice)}
            </span>
            <span className="text-slate-500 font-normal">/suất ăn ngoài</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Chốt từ ngày 26 tháng trước đến 25 tháng này</span>
          </div>
        </div>
      </div>
    </div>
  );
};
