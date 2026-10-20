import { CycleConfig, CycleDayInfo } from '../types';

/**
 * Given a year and target month (where cycle ends on 25th of that month),
 * compute the cycle configuration.
 * Cycle runs from 26th of (month - 1) to 25th of month.
 */
export function getCycleConfig(targetYear: number, targetMonth: number): CycleConfig {
  // previous month
  const prevDate = new Date(targetYear, targetMonth - 2, 26);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  const startMonthStr = String(prevMonth).padStart(2, '0');
  const endMonthStr = String(targetMonth).padStart(2, '0');

  const startDate = `${prevYear}-${startMonthStr}-26`;
  const endDate = `${targetYear}-${endMonthStr}-25`;

  const label = `Kỳ tháng ${targetMonth}/${targetYear} (26/${startMonthStr}/${prevYear} - 25/${endMonthStr}/${targetYear})`;

  return {
    year: targetYear,
    month: targetMonth,
    startDate,
    endDate,
    label,
  };
}

/**
 * Determine the cycle for a given date (defaults to today).
 * If date >= 26, it belongs to the NEXT month's cycle (ending on 25th of next month).
 * If date <= 25, it belongs to THIS month's cycle.
 */
export function getCurrentCycle(date: Date = new Date()): CycleConfig {
  const currentDay = date.getDate();
  let targetYear = date.getFullYear();
  let targetMonth = date.getMonth() + 1; // 1-12

  if (currentDay >= 26) {
    // Current date is 26th or later, belongs to next month's cycle
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  return getCycleConfig(targetYear, targetMonth);
}

const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Returns all consecutive days in the cycle from startDate (26th) to endDate (25th)
 */
export function getCycleDays(cycle: CycleConfig): CycleDayInfo[] {
  const [startYear, startMonth, startDay] = cycle.startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = cycle.endDate.split('-').map(Number);

  const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
  const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);

  const todayStr = getTodayDateString();
  const days: CycleDayInfo[] = [];

  const curr = new Date(start);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = curr.getMonth() + 1;
    const d = curr.getDate();
    const dow = curr.getDay(); // 0 is Sunday

    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isFuture = dateStr > todayStr;

    days.push({
      dateStr,
      dayNum: d,
      monthNum: m,
      yearNum: y,
      dayOfWeek: dow,
      dayOfWeekLabel: DOW_LABELS[dow],
      isWeekend: dow === 0 || dow === 6,
      isToday: dateStr === todayStr,
      isFuture,
    });

    curr.setDate(curr.getDate() + 1);
  }

  return days;
}

export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (e) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Returns true if the date is strictly in the future (after today)
 */
export function isFutureDate(dateStr: string): boolean {
  const todayStr = getTodayDateString();
  return dateStr > todayStr;
}

/**
 * Format currency in Vietnamese Dong (VNĐ)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format short number with dots (e.g. 40.000)
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

/**
 * Format date string YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Convert number to Vietnamese text (Đọc số tiền thành chữ)
 * e.g. 1200000 -> "Một triệu hai trăm nghìn đồng chẵn"
 */
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(number: number, readZeroHundreds: boolean): string {
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;
  let result = '';

  if (hundreds > 0 || readZeroHundreds) {
    result += `${DIGITS[hundreds]} trăm `;
  }

  if (tens === 0 && units === 0) {
    return result.trim();
  }

  if (tens === 0) {
    if (hundreds > 0 || readZeroHundreds) {
      result += 'lẻ ';
    }
    result += DIGITS[units];
    return result.trim();
  }

  if (tens === 1) {
    result += 'mười ';
  } else {
    result += `${DIGITS[tens]} mươi `;
  }

  if (units === 1) {
    result += tens > 1 ? 'mốt' : 'một';
  } else if (units === 5) {
    result += 'lăm';
  } else if (units > 0) {
    result += DIGITS[units];
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (amount === 0) return 'Không đồng';
  if (amount < 0) return 'Âm ' + numberToVietnameseWords(-amount);

  let num = Math.floor(amount);
  const groups: number[] = [];

  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;

    const readZero = i < groups.length - 1;
    const groupText = readThreeDigits(group, readZero);
    words += `${groupText} ${UNITS[i]} `;
  }

  words = words.trim();
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);
  return `${words} đồng chẵn.`;
}
