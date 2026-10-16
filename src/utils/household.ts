import type { ThanhVienHoGiaDinh } from '../types';

export const HOUSEHOLD_FIELDS = ['hoTen','ngaySinh','quanHeVoiChuHo','gioiTinh','diaChiThuongTru','quocTich','danToc'] as const;
export function normalizeHouseholdMembers(value: unknown): ThanhVienHoGiaDinh[] {
  if (!Array.isArray(value)) return [];
  return value.filter(member => member && typeof member === 'object' && !Array.isArray(member)).slice(0,100).map(member =>
    Object.fromEntries(HOUSEHOLD_FIELDS.map(key => [key,typeof member[key] === 'string' ? member[key].trim() : ''])) as unknown as ThanhVienHoGiaDinh
  ).filter(member => HOUSEHOLD_FIELDS.some(key => member[key]));
}
