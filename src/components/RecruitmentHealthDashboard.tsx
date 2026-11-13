import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  Stethoscope,
  UserCheck,
  UserX,
  RotateCcw,
} from 'lucide-react';
import type { RecruitmentHealthRegItem } from './HealthCheckStandardsManager';

interface RecruitmentHealthDashboardProps {
  records: RecruitmentHealthRegItem[];
  onNavigateToTrackingWithFilter?: (status: string) => void;
}

interface StatusDatum {
  name: string;
  value: number;
  color: string;
  filterKey?: string;
}

interface DeptDatum {
  name: string;
  subLabel: string;
  daKham: number;
  chuaKham: number;
  dat: number;
  khongDat: number;
  total: number;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: StatusDatum & DeptDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

const StatusTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-slate-900">{item.name || item.payload?.name}</div>
      <div className="mt-1 font-mono font-bold tabular-nums text-slate-800">
        {Number(item.value ?? 0).toLocaleString('vi-VN')} ứng viên
      </div>
    </div>
  );
};

const DeptTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-md text-xs space-y-1.5 min-w-[190px]">
      <div className="border-b border-slate-100 pb-1">
        <div className="font-bold text-slate-900">{label}</div>
        {row.subLabel && <div className="text-[11px] text-slate-500">{row.subLabel}</div>}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-600">Tổng hồ sơ</span>
        <span className="font-mono font-bold tabular-nums text-slate-900">{row.total}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-teal-700 font-medium">Đã khám</span>
        <span className="font-mono font-bold tabular-nums text-teal-700">{row.daKham}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-green-700 font-medium">Đạt</span>
        <span className="font-mono font-bold tabular-nums text-green-700">{row.dat}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-rose-700 font-medium">Không đạt</span>
        <span className="font-mono font-bold tabular-nums text-rose-700">{row.khongDat}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-blue-700 font-medium">Chưa khám</span>
        <span className="font-mono font-bold tabular-nums text-blue-700">{row.chuaKham}</span>
      </div>
    </div>
  );
};

export const RecruitmentHealthDashboard: React.FC<RecruitmentHealthDashboardProps> = ({
  records,
  onNavigateToTrackingWithFilter,
}) => {
  const [statusChartType, setStatusChartType] = useState<'bar' | 'pie'>('bar');
  const [groupBy, setGroupBy] = useState<'phong' | 'ban'>('phong');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const deptOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      const val = groupBy === 'phong' ? (r.phong || '').trim() : (r.ban || '').trim();
      if (val) set.add(val);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [records, groupBy]);

  const filteredRecords = useMemo(() => {
    return records.filter((reg) => {
      if (reg.ngayHenKham) {
        const [, m] = reg.ngayHenKham.split('-');
        if (monthFilter !== 'ALL' && m !== monthFilter.padStart(2, '0')) return false;
        if (startDate && reg.ngayHenKham < startDate) return false;
        if (endDate && reg.ngayHenKham > endDate) return false;
      }
      if (deptFilter !== 'ALL') {
        const val = groupBy === 'phong' ? (reg.phong || '').trim() : (reg.ban || '').trim();
        if (val !== deptFilter) return false;
      }
      return true;
    });
  }, [records, monthFilter, startDate, endDate, deptFilter, groupBy]);

  const summary = useMemo(() => {
    let dat = 0;
    let khongDat = 0;
    let choKham = 0;
    let hoan = 0;
    let nhanViec = 0;
    let khongNhanViec = 0;

    for (const reg of filteredRecords) {
      const st = reg.trangThai || 'Chờ khám';
      if (st === 'Đã khám - Đạt') {
        dat += 1;
      } else if (st === 'Đã khám - Không đạt') {
        khongDat += 1;
      } else if (st === 'Hoãn') {
        hoan += 1;
      } else {
        choKham += 1;
      }

      if (reg.trangThaiNhanViec === 'Đã nhận việc') {
        nhanViec += 1;
      } else if (reg.trangThaiNhanViec === 'Không nhận việc') {
        khongNhanViec += 1;
      }
    }

    const daKham = dat + khongDat;
    const chuaKham = choKham + hoan;
    const total = filteredRecords.length;
    const completionRate = total > 0 ? Math.round((daKham / total) * 100) : 0;
    const passRate = daKham > 0 ? Math.round((dat / daKham) * 100) : 0;
    const chuaXuLyNhanViec = Math.max(0, total - nhanViec - khongNhanViec);

    return {
      total,
      daKham,
      chuaKham,
      choKham,
      hoan,
      dat,
      khongDat,
      completionRate,
      passRate,
      nhanViec,
      khongNhanViec,
      chuaXuLyNhanViec,
    };
  }, [filteredRecords]);

  const statusBarData: StatusDatum[] = useMemo(
    () => [
      { name: 'Đã khám', value: summary.daKham, color: '#0f766e' },
      { name: 'Chưa khám', value: summary.chuaKham, color: '#2563eb', filterKey: 'Chờ khám' },
      { name: 'Đạt', value: summary.dat, color: '#16a34a', filterKey: 'Đã khám - Đạt' },
      { name: 'Không đạt', value: summary.khongDat, color: '#dc2626', filterKey: 'Đã khám - Không đạt' },
    ],
    [summary]
  );

  const statusPieData: StatusDatum[] = useMemo(
    () =>
      [
        { name: 'Đã khám - Đạt', value: summary.dat, color: '#16a34a', filterKey: 'Đã khám - Đạt' },
        { name: 'Đã khám - Không đạt', value: summary.khongDat, color: '#dc2626', filterKey: 'Đã khám - Không đạt' },
        { name: 'Chưa khám (Chờ/Hoãn)', value: summary.chuaKham, color: '#2563eb', filterKey: 'Chờ khám' },
      ].filter((d) => d.value > 0),
    [summary]
  );

  const deptData: DeptDatum[] = useMemo(() => {
    const map = new Map<string, DeptDatum>();
    for (const reg of filteredRecords) {
      const phongName = (reg.phong || '').trim() || 'Chưa phân phòng';
      const banName = (reg.ban || '').trim() || 'Chưa phân ban';
      const key = groupBy === 'phong' ? phongName : banName;
      const existing = map.get(key) || {
        name: key,
        subLabel: groupBy === 'phong' ? (reg.ban ? `Ban ${reg.ban}` : '') : (reg.khoi ? `Khối ${reg.khoi}` : ''),
        daKham: 0,
        chuaKham: 0,
        dat: 0,
        khongDat: 0,
        total: 0,
      };

      const st = reg.trangThai || 'Chờ khám';
      if (st === 'Đã khám - Đạt') {
        existing.dat += 1;
        existing.daKham += 1;
      } else if (st === 'Đã khám - Không đạt') {
        existing.khongDat += 1;
        existing.daKham += 1;
      } else {
        existing.chuaKham += 1;
      }
      existing.total += 1;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredRecords, groupBy]);

  const kpiCards = [
    {
      id: 'daKham',
      label: 'Đã khám',
      value: summary.daKham,
      sub: `${summary.completionRate}% tổng ${summary.total} ứng viên`,
      icon: Stethoscope,
      accentClass: 'text-teal-700',
      iconBg: 'bg-teal-50 text-teal-700',
      filterValue: undefined as string | undefined,
    },
    {
      id: 'chuaKham',
      label: 'Chưa khám',
      value: summary.chuaKham,
      sub: summary.hoan > 0 ? `${summary.choKham} chờ khám · ${summary.hoan} hoãn` : `${summary.choKham} đang chờ lịch khám`,
      icon: Clock,
      accentClass: 'text-blue-700',
      iconBg: 'bg-blue-50 text-blue-700',
      filterValue: 'Chờ khám',
    },
    {
      id: 'dat',
      label: 'Đạt tiêu chuẩn',
      value: summary.dat,
      sub: summary.daKham > 0 ? `${summary.passRate}% trong số đã khám` : 'Chưa có kết quả đã khám',
      icon: CheckCircle2,
      accentClass: 'text-green-700',
      iconBg: 'bg-green-50 text-green-700',
      filterValue: 'Đã khám - Đạt',
    },
    {
      id: 'khongDat',
      label: 'Không đạt',
      value: summary.khongDat,
      sub: summary.daKham > 0 ? `${100 - summary.passRate}% trong số đã khám` : 'Chưa có ca không đạt',
      icon: XCircle,
      accentClass: 'text-rose-700',
      iconBg: 'bg-rose-50 text-rose-700',
      filterValue: 'Đã khám - Không đạt',
    },
  ];

  const hasFilters = monthFilter !== 'ALL' || Boolean(startDate) || Boolean(endDate) || deptFilter !== 'ALL';

  return (
    <section
      aria-label="Dashboard khám sức khỏe tuyển dụng"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fade-in"
    >
      {/* Header & Outcome Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1a73e8]" />
            <h3 className="text-base font-bold text-slate-900">
              6. Dashboard Khám Sức Khỏe Tuyển Dụng
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê trực quan số lượng ứng viên theo trạng thái khám (Đã khám, Chưa khám, Đạt, Không đạt) và phân loại Phòng/Ban.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-medium text-teal-800">
            <UserCheck className="w-3.5 h-3.5" />
            Đã nhận việc: <strong className="font-mono">{summary.nhanViec}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
            <UserX className="w-3.5 h-3.5" />
            Không nhận việc: <strong className="font-mono">{summary.khongNhanViec}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">|</span>
          <span className="text-slate-500">
            Hiển thị <strong className="font-mono text-slate-900">{summary.total}</strong> / {records.length} hồ sơ
          </span>
        </div>
      </div>

      {/* Period & Department Filter Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 items-end">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Theo tháng</label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none font-medium"
          >
            <option value="ALL">Tất cả các tháng</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Từ ngày</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Đến ngày</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
            Lọc theo {groupBy === 'phong' ? 'Phòng' : 'Ban'}
          </label>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none font-medium"
          >
            <option value="ALL">Tất cả {groupBy === 'phong' ? 'Phòng' : 'Ban'}</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => {
              setMonthFilter('ALL');
              setStartDate('');
              setEndDate('');
              setDeptFilter('ALL');
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isClickable = Boolean(card.filterValue && onNavigateToTrackingWithFilter);
          return (
            <button
              key={card.id}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (card.filterValue && onNavigateToTrackingWithFilter) {
                  onNavigateToTrackingWithFilter(card.filterValue);
                }
              }}
              title={isClickable ? `Xem danh sách ${card.label} ở Bước 2` : undefined}
              className={`text-left rounded-xl border border-slate-200 bg-white p-4 transition-colors ${
                isClickable ? 'hover:border-[#1a73e8] cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">{card.label}</div>
                  <div className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${card.accentClass}`}>
                    {card.value.toLocaleString('vi-VN')}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 truncate">{card.sub}</div>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recharts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Panel 1: Status breakdown */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h5 className="text-xs font-bold text-slate-900">Số lượng ứng viên theo trạng thái</h5>
              <p className="text-[11px] text-slate-500">Đã khám, Chưa khám, Đạt và Không đạt</p>
            </div>
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusChartType('bar')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  statusChartType === 'bar'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Biểu đồ cột
              </button>
              <button
                type="button"
                onClick={() => setStatusChartType('pie')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  statusChartType === 'pie'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Biểu đồ tròn
              </button>
            </div>
          </div>

          <div className="h-[290px] w-full pt-3">
            {summary.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu ứng viên để hiển thị biểu đồ trạng thái.
              </div>
            ) : statusChartType === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBarData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<StatusTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar
                    dataKey="value"
                    name="Số ứng viên"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    onClick={(entry) => {
                      const key = (entry as unknown as StatusDatum)?.filterKey;
                      if (key && onNavigateToTrackingWithFilter) {
                        onNavigateToTrackingWithFilter(key);
                      }
                    }}
                    className={onNavigateToTrackingWithFilter ? 'cursor-pointer' : undefined}
                  >
                    {statusBarData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                    onClick={(entry) => {
                      const key = (entry as unknown as StatusDatum)?.filterKey;
                      if (key && onNavigateToTrackingWithFilter) {
                        onNavigateToTrackingWithFilter(key);
                      }
                    }}
                    className={onNavigateToTrackingWithFilter ? 'cursor-pointer' : undefined}
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: '#334155' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Panel 2: Department (Phòng / Ban) breakdown */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h5 className="text-xs font-bold text-slate-900">
                Thống kê ứng viên theo phân loại {groupBy === 'phong' ? 'Phòng' : 'Ban'}
              </h5>
              <p className="text-[11px] text-slate-500">
                So sánh số lượng Đạt, Không đạt và Chưa khám theo từng {groupBy === 'phong' ? 'Phòng' : 'Ban'}
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setGroupBy('phong');
                  setDeptFilter('ALL');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  groupBy === 'phong'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo Phòng
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupBy('ban');
                  setDeptFilter('ALL');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  groupBy === 'ban'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo Ban
              </button>
            </div>
          </div>

          <div className="h-[290px] w-full pt-3">
            {deptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu Phòng/Ban để hiển thị biểu đồ.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(val: string) => (val.length > 16 ? `${val.slice(0, 15)}…` : val)}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DeptTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar
                    dataKey="dat"
                    name="Đã khám - Đạt"
                    stackId="dept"
                    fill="#16a34a"
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="khongDat"
                    name="Đã khám - Không đạt"
                    stackId="dept"
                    fill="#dc2626"
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="chuaKham"
                    name="Chưa khám"
                    stackId="dept"
                    fill="#2563eb"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
