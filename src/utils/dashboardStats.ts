import type { NhanSuRecord } from '../types';

const dayFormatter = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});
export function vietnamDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = dayFormatter.formatToParts(date);
  return ['year','month','day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function currentMonthRange(now = new Date()) {
  const today = vietnamDay(now);
  const [year,month] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year,month,0)).getUTCDate();
  return {from:`${today.slice(0,7)}-01`,to:`${today.slice(0,7)}-${lastDay}`};
}
function receivingUnit(record: NhanSuRecord) {
  const path = [record.khoi,record.ban,record.phong].map(value => value?.trim() || '');
  return path.some(Boolean) ? JSON.stringify(path.map(value => value.normalize('NFC').toLocaleLowerCase('vi-VN'))) : '';
}
export function dashboardReport(records: NhanSuRecord[],from: string,to: string,now = new Date()) {
  const validDay = (day:string) => !day || (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10) === day);
  const error = !validDay(from) || !validDay(to) ? 'Ngày thống kê không hợp lệ.' : from && to && from > to ? 'Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.' : '';
  const filtered = error ? [] : records.filter(record => {
    const day = vietnamDay(record.timestamp);
    if (!from && !to) return true;
    return Boolean(day) && (!from || day >= from) && (!to || day <= to);
  });
  const currentMonth = vietnamDay(now).slice(0,7);
  const inMonth = (record:NhanSuRecord) => vietnamDay(record.timestamp).slice(0,7) === currentMonth;
  const units = new Set<string>();
  const people = new Map<string,{email:string;name:string;total:number;ai:number;monthly:number;units:Set<string>;latest:string;latestTime:number}>();
  for (const record of filtered) {
    const email = String(record.userEmail || '').trim().toLowerCase();
    const key = email || 'unknown';
    let person = people.get(key);
    if (!person) {
      person = {email,name:record.nguoiNhap?.trim() || email || 'Chưa xác định người nhập',total:0,ai:0,monthly:0,units:new Set(),latest:'',latestTime:-Infinity};
      people.set(key,person);
    }
    person.total++;
    if ((record.aiVisionExtracted === true || record.extractionMethod === 'ocr')) person.ai++;
    if (inMonth(record)) person.monthly++;
    const unit = receivingUnit(record);
    if (unit) {units.add(unit);person.units.add(unit);}
    const time = Date.parse(record.timestamp);
    if (Number.isFinite(time) && time > person.latestTime) {
      person.latest = record.timestamp;person.latestTime=time;
      if (record.nguoiNhap?.trim()) person.name=record.nguoiNhap.trim();
    }
  }
  return {error,currentMonth,total:filtered.length,ai:filtered.filter(record => (record.aiVisionExtracted === true || record.extractionMethod === 'ocr')).length,
    unknownAI:filtered.filter(record => typeof record.aiVisionExtracted !== 'boolean' && record.extractionMethod !== 'ocr').length,
    monthly:filtered.filter(inMonth).length,units:units.size,
    people:[...people.values()].map(person => ({...person,units:person.units.size})).sort((a,b) => b.total-a.total || a.name.localeCompare(b.name,'vi'))};
}
