import React, { useState } from 'react';
import {
  Search,
  Eye,
  CheckSquare,
  Calendar,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  Utensils
} from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, AuthUser } from '../types';
import { getCycleDays, formatVND, formatNumber, numberToVietnameseWords } from '../utils/cycleHelper';

interface SummaryTableProps {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  cycle: CycleConfig;
  settings: AppSettings;
  currentUser?: AuthUser | null;
  onViewEmployeeDetail: (employee: Employee) => void;
  onQuickCheckin: (employee: Employee) => void;
  onExportExcel: () => void;
  onExportEmployeeExcel?: (employee: Employee) => void;
}

export const SummaryTable: React.FC<SummaryTableProps> = ({
  employees,
  mealData,
  cycle,
  settings,
  currentUser,
  onViewEmployeeDetail,
  onQuickCheckin,
  onExportExcel,
  onExportEmployeeExcel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_meals' | 'zero_meals'>('all');
  const [sortField, setSortField] = useState<'name' | 'id' | 'meals' | 'amount'>('meals');
  const [sortAsc, setSortAsc] = useState(false);

  const cycleDays = getCycleDays(cycle);
  const totalDaysInCycle = cycleDays.length;

  const isPersonalOnly = Boolean(currentUser && currentUser.role === 'nhan_vien_nhan_su');

  // If logged in as an employee, ONLY show their own data and summary!
  const targetEmployees = isPersonalOnly
    ? employees.filter((e) => e.id === currentUser?.id)
    : employees;

  // Compute stats per employee
  const employeeStats = targetEmployees.map((emp, index) => {
    const records = mealData[emp.id]?.records || {};
    let mealsCount = 0;
    const checkedDates: string[] = [];

    cycleDays.forEach((day) => {
      const rec = records[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        mealsCount += rec.mealsCount;
        checkedDates.push(day.dateStr);
      }
    });

    const amount = mealsCount * settings.mealPrice;
    return {
      stt: index + 1,
      employee: emp,
      mealsCount,
      amount,
      checkedDates,
    };
  });

  // Filter
  const filtered = employeeStats.filter((item) => {
    const matchSearch =
      item.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.id.includes(searchTerm) ||
      item.employee.employeeCode?.includes(searchTerm) ||
      (item.employee.phone && item.employee.phone.includes(searchTerm));

    if (!matchSearch) return false;

    if (filterType === 'has_meals') return item.mealsCount > 0;
    if (filterType === 'zero_meals') return item.mealsCount === 0;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let result = 0;
    if (sortField === 'meals') {
      result = a.mealsCount - b.mealsCount;
    } else if (sortField === 'amount') {
      result = a.amount - b.amount;
    } else if (sortField === 'id') {
      result = a.employee.id.localeCompare(b.employee.id);
    } else {
      result = a.employee.name.localeCompare(b.employee.name, 'vi');
    }
    return sortAsc ? result : -result;
  });

  const handleSort = (field: 'name' | 'id' | 'meals' | 'amount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for numbers
    }
  };

  // Grand totals of filtered or all
  const grandTotalMeals = employeeStats.reduce((acc, curr) => acc + curr.mealsCount, 0);
  const grandTotalAmount = grandTotalMeals * settings.mealPrice;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {isPersonalOnly ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bảng Tổng Hợp Tiền Ăn Cá Nhân:
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {currentUser?.name} ({currentUser?.employeeCode || currentUser?.id})
            </span>
            <span className="text-[10px] text-slate-400">
              · Chỉ hiển thị dữ liệu của chính bạn
            </span>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo Mã NV hoặc Tên nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({employeeStats.length})
            </button>
            <button
              onClick={() => setFilterType('has_meals')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                filterType === 'has_meals'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Có ăn ngoài ({employeeStats.filter((i) => i.mealsCount > 0).length})
            </button>
            <button
              onClick={() => setFilterType('zero_meals')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                filterType === 'zero_meals'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0 bữa ({employeeStats.filter((i) => i.mealsCount === 0).length})
            </button>
          </div>

          <button
            onClick={onExportExcel}
            title={
              currentUser?.role === 'nhan_vien_nhan_su'
                ? `Tải bảng kê chi tiết tiền ăn của riêng bạn (${currentUser.name})`
                : 'Tải file Excel (.xlsx)'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-emerald-700 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {currentUser?.role === 'nhan_vien_nhan_su' ? 'Tải Excel Của Tôi' : 'Tải Excel'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">STT</th>
              <th className="py-3 px-4 w-36">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Mã NV</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4 min-w-[200px]">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Họ và Tên</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4 hidden md:table-cell">Bộ phận</th>
              <th className="py-3 px-4 text-center w-28">
                <button
                  onClick={() => handleSort('meals')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Số ngày/bữa</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4 text-right w-32">Đơn giá</th>
              <th className="py-3 px-4 text-right w-36">
                <button
                  onClick={() => handleSort('amount')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                >
                  <span>Thành tiền</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4 text-center w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Utensils className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">Không tìm thấy nhân viên phù hợp</p>
                    <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc bỏ lọc</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => {
                const ratio = Math.min(100, Math.round((item.checkedDates.length / (totalDaysInCycle || 30)) * 100));

                return (
                  <tr
                    key={item.employee.employeeCode || item.employee.id}
                    className={`transition-colors group ${
                      currentUser?.role === 'nhan_vien_nhan_su' && item.employee.id === currentUser.id
                        ? 'bg-emerald-50/60 hover:bg-emerald-50'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 text-xs">
                      {item.employee.employeeCode || item.employee.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                            item.employee.avatarColor || 'bg-emerald-600'
                          }`}
                        >
                          {item.employee.name.split(' ').pop()?.charAt(0) || 'N'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {item.employee.name}
                            </span>
                            {currentUser?.role === 'nhan_vien_nhan_su' && item.employee.id === currentUser.id && (
                              <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                                Bạn
                              </span>
                            )}
                          </div>
                          {item.employee.notes && (
                            <div className="text-xs text-slate-500 truncate max-w-xs">
                              {item.employee.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 hidden md:table-cell">
                      {item.employee.department}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold text-slate-900 font-mono text-base tabular-nums">
                          {item.mealsCount}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {ratio}% kỳ ({item.checkedDates.length}/{totalDaysInCycle} ngày)
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatNumber(settings.mealPrice)} ₫
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm tabular-nums">
                      {item.amount > 0 ? (
                        <span className="text-emerald-700">{formatVND(item.amount)}</span>
                      ) : (
                        <span className="text-slate-400">0 ₫</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewEmployeeDetail(item.employee)}
                          title="Xem chi tiết các ngày đã tích ăn ngoài"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chi tiết</span>
                        </button>

                        {onExportEmployeeExcel && (
                          currentUser?.role === 'nhan_vien_nhan_su' ? (
                            item.employee.id === currentUser.id ? (
                              <button
                                onClick={() => onExportEmployeeExcel(item.employee)}
                                title="Tải file Excel bảng kê chi tiết của bạn"
                                className="p-1 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                              </button>
                            ) : null
                          ) : (
                            <button
                              onClick={() => onExportEmployeeExcel(item.employee)}
                              title={`Tải file Excel bảng kê chi tiết của ${item.employee.name}`}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                          )
                        )}

                        <button
                          onClick={() => onQuickCheckin(item.employee)}
                          title="Chấm công/tích ngày ăn cho nhân viên này"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tích ngày</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Grand Total Footer */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-900">
              <td colSpan={4} className="py-4 px-4 text-left font-bold text-xs uppercase tracking-wider text-slate-700">
                {isPersonalOnly
                  ? `TỔNG CỘNG TIỀN ĂN CỦA BẠN (${currentUser?.name})`
                  : `TỔNG CỘNG TOÀN BỘ PHẬN (${employeeStats.length} NHÂN VIÊN)`}
              </td>
              <td className="py-4 px-4 text-center font-mono font-bold text-lg text-slate-900 tabular-nums">
                {grandTotalMeals}{' '}
                <span className="text-xs font-normal text-slate-600">bữa</span>
              </td>
              <td className="py-4 px-4 text-right text-xs font-mono text-slate-600 tabular-nums">
                {formatNumber(settings.mealPrice)} ₫
              </td>
              <td className="py-4 px-4 text-right font-mono font-bold text-lg text-emerald-800 tabular-nums">
                {formatVND(grandTotalAmount)}
              </td>
              <td className="py-4 px-4 text-center text-xs text-slate-500">
                Chốt ngày 25 hằng tháng
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Written Amount Kicker */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
        <div>
          <span className="font-semibold text-slate-800">Số tiền viết bằng chữ: </span>
          <span className="italic text-slate-900 font-medium">
            {numberToVietnameseWords(grandTotalAmount)}
          </span>
        </div>
        <div className="text-slate-500">
          Biểu mẫu chuẩn tính theo ngày 26 đến ngày 25
        </div>
      </div>
    </div>
  );
};
