import type { ThanhVienHoGiaDinh } from '../types';

export const HOUSEHOLD_FIELDS = ['hoTen','ngaySinh','quanHeVoiChuHo','gioiTinh','diaChiThuongTru','quocTich','danToc'] as const;
function householdText(value: unknown) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  const marker = text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\[\]()]/g,'').trim();
  return ['khong hien thi','khong co thong tin','chua ro','khong ro','khong doc duoc','khong xac dinh','unknown','n/a','null','undefined','...','?','-'].includes(marker) ? '' : text;
}
export function normalizeHouseholdMembers(value: unknown): ThanhVienHoGiaDinh[] {
  if (!Array.isArray(value)) return [];
  return value.filter(member => member && typeof member === 'object' && !Array.isArray(member)).slice(0,100).map(member =>
    Object.fromEntries(HOUSEHOLD_FIELDS.map(key => [key,householdText(member[key])])) as unknown as ThanhVienHoGiaDinh
  ).filter(member => HOUSEHOLD_FIELDS.some(key => member[key]));
}
