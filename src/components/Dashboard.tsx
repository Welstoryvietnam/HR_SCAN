import React, { useState, useMemo } from 'react';
import { NhanSuRecord, UserProfile, TieuChuanLuongItem } from '../types';
import { DEFAULT_JOB_POSITIONS, findJobByPosition } from '../data/jobPositionHierarchy';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Filter,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Layers,
  Briefcase,
  Award
} from 'lucide-react';

interface DashboardProps {
  records: NhanSuRecord[];
  currentUser: UserProfile;
  standards?: TieuChuanLuongItem[];
}

const PALETTE = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#059669', // Emerald
  '#4f46e5', // Indigo
  '#ea580c', // Orange
  '#0284c7', // Sky
  '#16a34a', // Green
];

export const Dashboard: React.FC<DashboardProps> = ({ records, currentUser }) => {
  const [selectedKhoiFilter, setSelectedKhoiFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'current_month' | 'last_30_days'>('all');

  // Lọc danh sách bản ghi theo bộ lọc thời gian và khối nếu có
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return records.filter((r) => {
      // Lọc theo Khối
      if (selectedKhoiFilter !== 'all' && r.khoi !== selectedKhoiFilter) {
        return false;
      }

      // Lọc theo thời gian nộp
      if (timeRange === 'all') return true;

      const recordDate = new Date(r.timestamp);
      if (isNaN(recordDate.getTime())) return true;

      if (timeRange === 'current_month') {
        return (
          recordDate.getMonth() === currentMonth &&
          recordDate.getFullYear() === currentYear
        );
      }

      if (timeRange === 'last_30_days') {
        const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }

      return true;
    });
  }, [records, selectedKhoiFilter, timeRange]);

  // Các thẻ chỉ số tổng quan (KPIs)
  const stats = useMemo(() => {
    const totalRecords = filteredRecords.length;

    // Tính số lượng hồ sơ xử lý trong tháng hiện tại
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthCount = records.filter((r) => {
      const d = new Date(r.timestamp);
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Tổng số phòng ban / đơn vị có hồ sơ
    const uniquePhongs = new Set(filteredRecords.map((r) => r.phong).filter(Boolean));
    const uniqueKhois = new Set(filteredRecords.map((r) => r.khoi).filter(Boolean));

    // Tổng quỹ thu nhập dự kiến
    const totalPayroll = filteredRecords.reduce((acc, r) => acc + (r.tongThuNhapDuKien || 0), 0);
    const avgSalary = totalRecords > 0 ? Math.round(totalPayroll / totalRecords) : 0;

    // Tỷ lệ email gửi thành công
    const sentEmailCount = filteredRecords.filter((r) => r.trangThaiEmail === 'Đã gửi').length;
    const emailRate = totalRecords > 0 ? Math.round((sentEmailCount / totalRecords) * 100) : 100;

    return {
      totalRecords,
      thisMonthCount,
      uniquePhongsCount: uniquePhongs.size,
      uniqueKhoisCount: uniqueKhois.size,
      totalPayroll,
      avgSalary,
      emailRate,
    };
  }, [records, filteredRecords]);

  // Dữ liệu biểu đồ 1: Nhân sự theo Khối
  const khoiData = useMemo(() => {
    const counts: Record<string, { count: number; totalPayroll: number }> = {};
    filteredRecords.forEach((r) => {
      const k = r.khoi || 'Chưa phân bổ';
      if (!counts[k]) {
        counts[k] = { count: 0, totalPayroll: 0 };
      }
      counts[k].count += 1;
      counts[k].totalPayroll += r.tongThuNhapDuKien || 0;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        soLuong: data.count,
        tongLuongTrieu: Math.round(data.totalPayroll / 1000000),
      }))
      .sort((a, b) => b.soLuong - a.soLuong);
  }, [filteredRecords]);

  // Dữ liệu biểu đồ 2: Nhân sự theo Phòng ban (Top phòng ban)
  const phongData = useMemo(() => {
    const counts: Record<string, { count: number; ban: string; khoi: string }> = {};
    filteredRecords.forEach((r) => {
      const p = r.phong || 'Chưa xác định';
      if (!counts[p]) {
        counts[p] = { count: 0, ban: r.ban || '', khoi: r.khoi || '' };
      }
      counts[p].count += 1;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        phong: name,
        ban: data.ban,
        soLuong: data.count,
      }))
      .sort((a, b) => b.soLuong - a.soLuong)
      .slice(0, 10); // Lấy top 10 phòng
  }, [filteredRecords]);

  // Dữ liệu biểu đồ 3: Nhân sự theo Ban
  const banData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const b = r.ban || 'Khác';
      counts[b] = (counts[b] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // Dữ liệu biểu đồ 4: Số lượng hồ sơ được xử lý theo các tháng (Monthly Trend)
  const monthlyTrendData = useMemo(() => {
    // Thu thập dữ liệu theo các tháng
    const monthCounts: Record<string, { soLuong: number; thanhCong: number }> = {};

    // Khởi tạo các tháng gần nhất nếu ít dữ liệu để biểu đồ luôn trực quan
    const months = [
      'Tháng 04/2026',
      'Tháng 05/2026',
      'Tháng 06/2026',
      'Tháng 07/2026',
      'Tháng 08/2026',
      'Tháng 09/2026',
    ];
    months.forEach((m) => {
      monthCounts[m] = { soLuong: 0, thanhCong: 0 };
    });

    records.forEach((r) => {
      const d = new Date(r.timestamp);
      if (!isNaN(d.getTime())) {
        const monthKey = `Tháng ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        if (!monthCounts[monthKey]) {
          monthCounts[monthKey] = { soLuong: 0, thanhCong: 0 };
        }
        monthCounts[monthKey].soLuong += 1;
        if (r.trangThaiEmail === 'Đã gửi') {
          monthCounts[monthKey].thanhCong += 1;
        }
      }
    });

    return Object.entries(monthCounts).map(([month, data]) => ({
      thang: month,
      soLuongHoSo: data.soLuong,
      daGuiEmail: data.thanhCong,
    }));
  }, [records]);

  // Thống kê theo Hệ Thống Công Việc & Chức Vụ
  const jobPositionStats = useMemo(() => {
    const map: Record<string, { count: number; positions: Record<string, number>; totalSalary: number }> = {};

    DEFAULT_JOB_POSITIONS.forEach((j) => {
      map[j.name] = { count: 0, positions: {}, totalSalary: 0 };
      j.chucVus.forEach((cv) => {
        map[j.name].positions[cv] = 0;
      });
    });

    filteredRecords.forEach((r) => {
      const jobName = r.congViecDuKien || findJobByPosition(r.chucVu) || 'Khác';
      if (!map[jobName]) {
        map[jobName] = { count: 0, positions: {}, totalSalary: 0 };
      }
      map[jobName].count += 1;
      map[jobName].totalSalary += r.tongThuNhapDuKien || 0;
      const posName = r.chucVu || 'Chưa phân loại';
      map[jobName].positions[posName] = (map[jobName].positions[posName] || 0) + 1;
    });

    return Object.entries(map).map(([jobName, data]) => ({
      jobName,
      count: data.count,
      totalSalary: data.totalSalary,
      positions: Object.entries(data.positions)
        .map(([posName, count]) => ({ posName, count }))
        .sort((a, b) => b.count - a.count),
    }));
  }, [filteredRecords]);

  // Danh sách các Khối duy nhất cho dropdown filter
  const uniqueKhoisList = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.khoi).filter(Boolean)));
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Dashboard Báo Cáo Nhân Sự & Phân Tích Hồ Sơ
            </h2>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Trực Quan Hóa Recharts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-9">
            Tổng hợp cơ cấu nhân sự theo Khối &gt; Ban &gt; Phòng, tiến độ trích xuất hồ sơ và quỹ lương dự kiến.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lọc theo Khối */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Khối:</span>
            <select
              value={selectedKhoiFilter}
              onChange={(e) => setSelectedKhoiFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none text-xs cursor-pointer"
            >
              <option value="all">Tất cả Khối ({records.length})</option>
              {uniqueKhoisList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Thời gian */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Kỳ:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none text-xs cursor-pointer"
            >
              <option value="all">Toàn bộ thời gian</option>
              <option value="current_month">Tháng hiện tại (09/2026)</option>
              <option value="last_30_days">30 ngày gần nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng nhân sự */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Tổng số hồ sơ</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalRecords}{' '}
              <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Đã số hóa qua AI Vision</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Hồ sơ trong tháng */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Hồ sơ xử lý trong tháng</span>
            <div className="text-2xl font-bold text-indigo-900 mt-1">
              {stats.thisMonthCount}{' '}
              <span className="text-xs font-normal text-slate-500">hồ sơ mới</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
              <CalendarDays className="w-3 h-3 text-indigo-500" />
              <span>Kỳ tuyển dụng tháng 09/2026</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Cơ cấu phòng ban */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Đơn vị tiếp nhận</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              {stats.uniquePhongsCount}{' '}
              <span className="text-xs font-normal text-slate-500">Phòng</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
              <Building2 className="w-3 h-3 text-emerald-600" />
              <span>Thuộc {stats.uniqueKhoisCount} Khối quản lý</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Tổng quỹ thu nhập */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Quỹ thu nhập dự kiến</span>
            <div className="text-2xl font-bold text-amber-900 mt-1">
              {(stats.totalPayroll / 1000000).toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">triệu VNĐ</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
              <DollarSign className="w-3 h-3 text-amber-600" />
              <span>TB: {(stats.avgSalary / 1000000).toFixed(1)} triệu/người</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Phân bố theo Phòng ban & Khối */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 1: Số lượng nhân sự theo Khối (BarChart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Phân Bố Nhân Sự Theo Khối Cơ Cấu
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Đơn vị: Số người & Quỹ lương</span>
          </div>

          <div className="h-72 w-full">
            {khoiData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu nhân sự cho khối được chọn.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={khoiData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                            <div className="font-bold border-b border-slate-700 pb-1">{label}</div>
                            <div className="text-blue-300">
                              Số nhân sự: <strong>{payload[0]?.value} người</strong>
                            </div>
                            {payload[1] && (
                              <div className="text-emerald-300">
                                Quỹ lương: <strong>{payload[1]?.value} triệu VNĐ</strong>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                  />
                  <Bar
                    dataKey="soLuong"
                    name="Số nhân sự (người)"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                  <Bar
                    dataKey="tongLuongTrieu"
                    name="Quỹ lương (Tr. VNĐ)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Biểu đồ 2: Tỷ trọng nhân sự theo Ban (PieChart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Tỷ Trọng Nhân Sự Theo Ban
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Cơ cấu %</span>
          </div>

          <div className="h-72 w-full">
            {banData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu cơ cấu ban.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={banData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {banData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        const total = banData.reduce((sum, b) => sum + b.value, 0);
                        const pct = total > 0 ? ((Number(item.value) / total) * 100).toFixed(1) : '0';
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg">
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-blue-300">
                              {item.value} hồ sơ ({pct}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    wrapperStyle={{ fontSize: 10, maxHeight: 60, overflowY: 'auto' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Row 2: Tiến độ xử lý trong tháng & Top Phòng ban */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ 3: Số lượng hồ sơ được xử lý theo tháng (AreaChart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Số Lượng Hồ Sơ Được Xử Lý Trong Tháng
                </h3>
                <p className="text-[11px] text-slate-400">
                  Xu hướng số lượng hồ sơ nộp và tỷ lệ gửi email MailApp xác nhận
                </p>
              </div>
            </div>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
              Tự động đồng bộ
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 20, left: -15, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorHoSo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorEmail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="thang" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                          <div className="font-bold border-b border-slate-700 pb-1">{label}</div>
                          <div className="text-blue-300">
                            Tổng hồ sơ: <strong>{payload[0]?.value}</strong>
                          </div>
                          <div className="text-emerald-300">
                            Đã gửi xác nhận: <strong>{payload[1]?.value}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="soLuongHoSo"
                  name="Tổng hồ sơ xử lý"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHoSo)"
                />
                <Area
                  type="monotone"
                  dataKey="daGuiEmail"
                  name="Xác nhận thành công"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEmail)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 4: Top Phòng / Đơn vị tiếp nhận nhiều nhất (BarChart ngang) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Top Phòng / Đơn Vị Tiếp Nhận Hồ Sơ
                </h3>
                <p className="text-[11px] text-slate-400">
                  Xếp hạng các phòng ban có số lượng nhân sự đã tiếp nhận
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Top 10 phòng</span>
          </div>

          <div className="h-64 w-full">
            {phongData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu phòng ban.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={phongData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="phong"
                    tick={{ fontSize: 10, fill: '#334155' }}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg space-y-1">
                            <div className="font-bold">{data.phong}</div>
                            <div className="text-slate-300">Ban: {data.ban}</div>
                            <div className="text-indigo-300">
                              Số nhân sự: <strong>{data.soLuong} người</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="soLuong"
                    name="Số hồ sơ"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary Table: Bảng tổng hợp theo Khối */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Bảng Tổng Hợp Chi Tiết Cơ Cấu Nhân Sự Theo Khối
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Tổng cộng: {filteredRecords.length} hồ sơ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
              <tr>
                <th className="p-3">Khối Quản Lý</th>
                <th className="p-3 text-center">Số Lượng Nhân Sự</th>
                <th className="p-3 text-center">Tỷ Trọng (%)</th>
                <th className="p-3 text-right">Tổng Quỹ Lương Dự Kiến (VNĐ)</th>
                <th className="p-3 text-right">Thu Nhập Bình Quân (VNĐ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {khoiData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    Không có dữ liệu tổng hợp.
                  </td>
                </tr>
              ) : (
                khoiData.map((k) => {
                  const pct =
                    filteredRecords.length > 0
                      ? ((k.soLuong / filteredRecords.length) * 100).toFixed(1)
                      : '0';
                  const totalVnd = k.tongLuongTrieu * 1000000;
                  const avgVnd = k.soLuong > 0 ? Math.round(totalVnd / k.soLuong) : 0;

                  return (
                    <tr key={k.name} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>{k.name}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-blue-700">
                        {k.soLuong}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium text-[11px]">
                          {pct}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-800">
                        {totalVnd.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3 text-right text-slate-600">
                        {avgVnd.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng phân tích chi tiết Hệ Thống Công Việc & Chức Vụ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Phân Bổ Nhân Lực Theo Hệ Thống Công Việc & Chức Vụ
            </h3>
          </div>
          <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-200">
            5 Nhóm Công Việc Chuẩn
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobPositionStats.map((item) => (
            <div
              key={item.jobName}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h4 className="font-bold text-slate-900 text-sm">{item.jobName}</h4>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                  {item.count} nhân sự
                </span>
              </div>

              <div className="text-[11px] text-slate-500 mb-3">
                Tổng thu nhập: <strong className="text-slate-800">{item.totalSalary.toLocaleString('vi-VN')} đ</strong>
              </div>

              {/* Danh sách chức vụ con */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Chức vụ trực thuộc:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.positions.map((pos) => (
                    <span
                      key={pos.posName}
                      className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                        pos.count > 0
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Award className="w-3 h-3 text-indigo-500" />
                      <span>{pos.posName}</span>
                      {pos.count > 0 && (
                        <span className="ml-1 bg-indigo-600 text-white rounded-full px-1 text-[9px] font-bold">
                          {pos.count}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
