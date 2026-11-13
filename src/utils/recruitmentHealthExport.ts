import ExcelJS from 'exceljs';
import type { RecruitmentHealthRegItem } from '../components/HealthCheckStandardsManager';

export type RecruitmentExportKind =
  | 'da_kham_nhan_viec'
  | 'da_kham_khong_nhan_viec'
  | 'khong_dat'
  | 'tat_ca_khong_nhan_viec';

export function isExaminedStatus(trangThai?: string): boolean {
  return trangThai === 'Đã khám - Đạt' || trangThai === 'Đã khám - Không đạt';
}

export function filterRecruitmentRecordsForExport(
  records: RecruitmentHealthRegItem[],
  kind: RecruitmentExportKind
): RecruitmentHealthRegItem[] {
  switch (kind) {
    case 'da_kham_nhan_viec':
      return records.filter(
        (r) => isExaminedStatus(r.trangThai) && r.trangThaiNhanViec === 'Đã nhận việc'
      );
    case 'da_kham_khong_nhan_viec':
      return records.filter(
        (r) => isExaminedStatus(r.trangThai) && r.trangThaiNhanViec === 'Không nhận việc'
      );
    case 'khong_dat':
      return records.filter((r) => r.trangThai === 'Đã khám - Không đạt');
    case 'tat_ca_khong_nhan_viec':
      return records.filter((r) => r.trangThaiNhanViec === 'Không nhận việc');
  }
}

const EXPORT_META: Record<
  RecruitmentExportKind,
  { sheetName: string; title: string; filePrefix: string }
> = {
  da_kham_nhan_viec: {
    sheetName: 'DaKham_NhanViec',
    title: 'DANH SÁCH ỨNG VIÊN ĐÃ KHÁM VÀ NHẬN VIỆC',
    filePrefix: 'KSK_Da_Kham_Nhan_Viec',
  },
  da_kham_khong_nhan_viec: {
    sheetName: 'DaKham_KhongNhanViec',
    title: 'DANH SÁCH ỨNG VIÊN ĐÃ KHÁM KHÔNG NHẬN VIỆC',
    filePrefix: 'KSK_Da_Kham_Khong_Nhan_Viec',
  },
  khong_dat: {
    sheetName: 'KetQua_KhongDat',
    title: 'DANH SÁCH ỨNG VIÊN CÓ KẾT QUẢ KHÁM KHÔNG ĐẠT',
    filePrefix: 'KSK_Ket_Qua_Khong_Dat',
  },
  tat_ca_khong_nhan_viec: {
    sheetName: 'KhongNhanViec',
    title: 'DANH SÁCH ỨNG VIÊN KHÔNG NHẬN VIỆC',
    filePrefix: 'KSK_Ung_Vien_Khong_Nhan_Viec',
  },
};

const HEADERS = [
  'STT',
  'Họ và tên ứng viên',
  'Số CCCD',
  'Ngày sinh',
  'Giới tính',
  'Số điện thoại',
  'Phòng',
  'Ban',
  'Khối',
  'Công việc',
  'Chức vụ',
  'Nhà cung cấp khám',
  'Ngày đăng ký',
  'Ngày hẹn khám',
  'Trạng thái KSK',
  'Trạng thái nhận việc',
  'Nhân viên phụ trách',
  'Ghi chú / Lý do',
];

function appendSheetToWorkbook(
  workbook: ExcelJS.Workbook,
  records: RecruitmentHealthRegItem[],
  sheetName: string,
  title: string
) {
  const sheet = workbook.addWorksheet(sheetName);

  sheet.mergeCells('A1:R1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3C72' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  const headerRow = sheet.addRow(HEADERS);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  records.forEach((reg, idx) => {
    const noteParts = [reg.lyDoKhongNhanViec, reg.ghiChu].filter(Boolean);
    const row = sheet.addRow([
      idx + 1,
      reg.hoVaTen || '',
      reg.soCCCD || '',
      reg.ngaySinh || '',
      reg.gioiTinh || '',
      reg.soDienThoai || '',
      reg.phong || '',
      reg.ban || '',
      reg.khoi || '',
      reg.congViec || reg.viTriViecLam || '',
      reg.chucVu || '',
      reg.nhaCungCap || '',
      reg.ngayDangKyKham || '',
      reg.ngayHenKham || '',
      reg.trangThai || 'Chờ khám',
      reg.trangThaiNhanViec || 'Chưa xử lý',
      reg.nguoiDangKy || '',
      noteParts.join(' | '),
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { size: 10, color: { argb: 'FF0F172A' } };
      cell.alignment = {
        horizontal: colNumber === 1 || colNumber === 13 || colNumber === 14 ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  const colWidths = [6, 24, 16, 13, 10, 14, 18, 16, 18, 18, 16, 28, 14, 14, 20, 18, 22, 32];
  colWidths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportRecruitmentHealthExcel(
  records: RecruitmentHealthRegItem[],
  kind: RecruitmentExportKind
): Promise<number> {
  const filtered = filterRecruitmentRecordsForExport(records, kind);
  if (filtered.length === 0) return 0;

  const meta = EXPORT_META[kind];
  const workbook = new ExcelJS.Workbook();
  appendSheetToWorkbook(workbook, filtered, meta.sheetName, meta.title);

  const dateTag = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `${meta.filePrefix}_${dateTag}.xlsx`);
  return filtered.length;
}

export async function exportRecruitmentSummaryMultiSheet(
  records: RecruitmentHealthRegItem[]
): Promise<{
  nhanViecCount: number;
  khongNhanViecCount: number;
  khongDatCount: number;
}> {
  const nhanViec = filterRecruitmentRecordsForExport(records, 'da_kham_nhan_viec');
  const khongNhanViec = filterRecruitmentRecordsForExport(records, 'da_kham_khong_nhan_viec');
  const khongDat = filterRecruitmentRecordsForExport(records, 'khong_dat');

  const total = nhanViec.length + khongNhanViec.length + khongDat.length;
  if (total === 0) {
    return { nhanViecCount: 0, khongNhanViecCount: 0, khongDatCount: 0 };
  }

  const workbook = new ExcelJS.Workbook();
  appendSheetToWorkbook(
    workbook,
    nhanViec,
    EXPORT_META.da_kham_nhan_viec.sheetName,
    EXPORT_META.da_kham_nhan_viec.title
  );
  appendSheetToWorkbook(
    workbook,
    khongNhanViec,
    EXPORT_META.da_kham_khong_nhan_viec.sheetName,
    EXPORT_META.da_kham_khong_nhan_viec.title
  );
  appendSheetToWorkbook(
    workbook,
    khongDat,
    EXPORT_META.khong_dat.sheetName,
    EXPORT_META.khong_dat.title
  );

  const dateTag = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `Bao_Cao_KSK_Tuyen_Dung_${dateTag}.xlsx`);
  return {
    nhanViecCount: nhanViec.length,
    khongNhanViecCount: khongNhanViec.length,
    khongDatCount: khongDat.length,
  };
}
