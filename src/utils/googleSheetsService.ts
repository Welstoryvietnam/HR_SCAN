import { TieuChuanLuongItem, KhoiNode, BanNode, PhongNode } from '../types';

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  sheets: SheetTabInfo[];
}

export interface ParseResult {
  items: TieuChuanLuongItem[];
  warnings: string[];
  totalRows: number;
  detectedHeaders: { [column: string]: string };
}

/**
 * Extract Google Spreadsheet ID from a link or raw ID string.
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Format: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // If user pasted bare ID (Google Sheet IDs are typically 40-50 chars containing letters, numbers, hyphens, underscores)
  if (/^[a-zA-Z0-9-_]{20,80}$/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Fetch spreadsheet title and sheet tab names using Google Sheets API v4.
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=properties.title,sheets.properties(sheetId,title,gridProperties)`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error?.message ||
      `Lỗi kết nối Google Sheets (Mã HTTP ${response.status}). Vui lòng kiểm tra quyền truy cập bảng tính.`;
    throw new Error(message);
  }

  const data = await response.json();
  const title = data.properties?.title || 'Bảng tính Google Sheets';
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId || 0,
    title: s.properties?.title || 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    id: spreadsheetId,
    title,
    sheets,
  };
}

/**
 * Fetch values for a given sheet range from Google Sheets API v4.
 */
export async function fetchSheetValues(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<any[][]> {
  // Quote sheet name to handle special characters or spaces
  const safeRange = `'${sheetName.replace(/'/g, "''")}'!A1:Z500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(safeRange)}?valueRenderOption=UNFORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error?.message ||
      `Không thể đọc dữ liệu trang tính "${sheetName}". Mã HTTP: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  return (data.values as any[][]) || [];
}

/**
 * Clean & parse numeric values (handling formatted currency, dots, commas, 'k', etc.).
 */
export function parseSheetNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  const str = String(val).trim().toLowerCase();
  if (str === 'thủ công' || str === 'thu cong' || str === '-' || str === 'n/a') {
    return fallback;
  }

  // Handle formats like "5k" or "500k"
  if (str.endsWith('k')) {
    const num = parseFloat(str.replace('k', '').replace(/,/g, '.'));
    return isNaN(num) ? fallback : Math.round(num * 1000);
  }
  if (str.endsWith('tr') || str.endsWith('m')) {
    const num = parseFloat(str.replace(/(tr|m)/, '').replace(/,/g, '.'));
    return isNaN(num) ? fallback : Math.round(num * 1000000);
  }

  // Remove currency symbols, commas/periods used as thousand separators
  // Standard Vietnamese: 5.895.000 or 5,895,000
  const cleanStr = str.replace(/[₫đ$vnd\s]/g, '');
  // If contains dots as thousands separator and no commas: "5.895.000"
  if (/^\d{1,3}(\.\d{3})+$/.test(cleanStr)) {
    return parseInt(cleanStr.replace(/\./g, ''), 10);
  }
  // If contains commas as thousands separator: "5,895,000"
  if (/^\d{1,3}(,\d{3})+$/.test(cleanStr)) {
    return parseInt(cleanStr.replace(/,/g, ''), 10);
  }

  const parsed = parseFloat(cleanStr.replace(/,/g, '.'));
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Standardize text header for matching
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseManualAllowance(val: any): number | 'Thủ công' {
  if (val === null || val === undefined || val === '') return 'Thủ công';
  const str = String(val).trim().toLowerCase();
  if (str === 'thủ công' || str === 'thu cong' || str === '-' || str === 'n/a') return 'Thủ công';
  const num = parseSheetNumber(val, NaN);
  if (!isNaN(num) && num > 0) return num;
  return 'Thủ công';
}

/**
 * Parse raw rows from Google Sheet into TieuChuanLuongItem[]
 */
export function parseStandardRows(rows: any[][]): ParseResult {
  const warnings: string[] = [];
  const items: TieuChuanLuongItem[] = [];
  const detectedHeaders: { [col: string]: string } = {};

  if (!rows || rows.length === 0) {
    return { items, warnings: ['Trang tính không có dữ liệu (trống).'], totalRows: 0, detectedHeaders };
  }

  // Step 1: Detect header row (first row with keywords like 'chuc vu', 'cong viec', 'luong', etc.)
  let headerRowIndex = -1;
  const colIndexMap: { [key: string]: number } = {};

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let hasPositionCol = false;
    let hasSalaryCol = false;

    row.forEach((cell, c) => {
      const cellStr = normalizeHeader(String(cell || ''));
      if (cellStr.includes('chucvu') || cellStr.includes('chucdanh') || cellStr.includes('vitri') || cellStr.includes('position')) {
        hasPositionCol = true;
      }
      if (cellStr.includes('luong') || cellStr.includes('salary') || cellStr.includes('lcb') || cellStr.includes('coban')) {
        hasSalaryCol = true;
      }
    });

    if (hasPositionCol || (hasSalaryCol && row.length >= 2)) {
      headerRowIndex = r;
      break;
    }
  }

  // If no clear header detected, use first row as header
  if (headerRowIndex === -1 && rows.length > 0) {
    headerRowIndex = 0;
  }

  const headerRow = rows[headerRowIndex] || [];
  headerRow.forEach((cell, c) => {
    const raw = String(cell || '').trim();
    const norm = normalizeHeader(raw);
    detectedHeaders[`Cột ${c + 1}`] = raw;

    if (norm.includes('mota') || norm.includes('ghichu') || norm.includes('description') || norm.includes('nhiemvu')) {
      colIndexMap['moTa'] = c;
    } else if (norm.includes('phucapchucvu') || norm.includes('pcchucvu') || norm.includes('pcchuc') || (norm.includes('phucap') && norm.includes('chuc'))) {
      colIndexMap['phuCapChucVu'] = c;
    } else if (norm.includes('dienthoai') || norm.includes('pcdienthoai')) {
      colIndexMap['phuCapDienThoai'] = c;
    } else if (norm.includes('taynghe') || norm.includes('trocaptaynghe')) {
      colIndexMap['troCapTayNghe'] = c;
    } else if (norm.includes('giadinh') || norm.includes('trocapgiadinh')) {
      colIndexMap['troCapGiaDinh'] = c;
    } else if (norm.includes('chuyencan') || norm.includes('thuongchuyencan')) {
      colIndexMap['thuongChuyenCan'] = c;
    } else if (norm.includes('sangkien') || norm.includes('thuongsangkien')) {
      colIndexMap['thuongSangKien'] = c;
    } else if (norm.includes('phucapcodinh') || norm.includes('tongphucap') || norm.includes('pccodinh')) {
      colIndexMap['phuCapCoDinh'] = c;
    } else if (norm.includes('moitruong') || norm.includes('pcmoitruong')) {
      colIndexMap['phuCapMoiTruong'] = c;
    } else if (norm.includes('xangxe') || norm.includes('pcxangxe')) {
      colIndexMap['phuCapXangXe'] = c;
    } else if (norm.includes('antoan') || norm.includes('atvsv')) {
      colIndexMap['anToanVeSinhVien'] = c;
    } else if (norm.includes('kinhdoanh') || norm.includes('pckinhdoanh')) {
      colIndexMap['phuCapKinhDoanh'] = c;
    } else if (norm.includes('nangnhoc') || norm.includes('pcnangnhoc')) {
      colIndexMap['phuCapNangNhoc'] = c;
    } else if (!norm.includes('phucap') && !norm.includes('pc') && (norm.includes('chucvu') || norm.includes('chucdanh') || norm.includes('vitri') || norm.includes('title') || norm.includes('position'))) {
      colIndexMap['chucVu'] = c;
    } else if (norm.includes('congviec') || norm.includes('nhom') || norm.includes('bophan') || norm.includes('phongban') || norm.includes('nganh')) {
      colIndexMap['congViec'] = c;
    } else if ((norm.includes('luong') && (norm.includes('coban') || norm.includes('cb'))) || norm === 'lcb' || norm.includes('basicsalary') || (norm.includes('luong') && !norm.includes('phucap'))) {
      colIndexMap['luongCoBan'] = c;
    }
  });

  // Fallbacks if columns weren't explicitly matched
  if (colIndexMap['chucVu'] === undefined && headerRow.length > 1) {
    colIndexMap['chucVu'] = 1; // Default second col
  }
  if (colIndexMap['congViec'] === undefined && headerRow.length > 0) {
    colIndexMap['congViec'] = 0; // Default first col
  }
  if (colIndexMap['luongCoBan'] === undefined && headerRow.length > 2) {
    colIndexMap['luongCoBan'] = 2; // Default third col
  }

  // Step 2: Iterate over data rows
  let lastCongViec = 'Khác';
  const startRow = headerRowIndex + 1;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue; // Skip empty rows
    }

    const rawCongViec = colIndexMap['congViec'] !== undefined ? String(row[colIndexMap['congViec']] || '').trim() : '';
    const rawChucVu = colIndexMap['chucVu'] !== undefined ? String(row[colIndexMap['chucVu']] || '').trim() : '';

    if (rawCongViec) {
      lastCongViec = rawCongViec;
    }

    // Must have a position title to be valid
    if (!rawChucVu) {
      continue;
    }

    const luongCoBan = colIndexMap['luongCoBan'] !== undefined
      ? parseSheetNumber(row[colIndexMap['luongCoBan']], 0)
      : 0;
    const phuCapChucVu = colIndexMap['phuCapChucVu'] !== undefined
      ? parseSheetNumber(row[colIndexMap['phuCapChucVu']], 0)
      : 0;
    const phuCapDienThoai = colIndexMap['phuCapDienThoai'] !== undefined
      ? parseSheetNumber(row[colIndexMap['phuCapDienThoai']], 0)
      : 0;
    const troCapTayNghe = colIndexMap['troCapTayNghe'] !== undefined
      ? parseSheetNumber(row[colIndexMap['troCapTayNghe']], 0)
      : 0;
    const troCapGiaDinh = colIndexMap['troCapGiaDinh'] !== undefined
      ? parseSheetNumber(row[colIndexMap['troCapGiaDinh']], 150000)
      : 150000;
    const thuongChuyenCan = colIndexMap['thuongChuyenCan'] !== undefined
      ? parseSheetNumber(row[colIndexMap['thuongChuyenCan']], 200000)
      : 200000;
    const thuongSangKien = colIndexMap['thuongSangKien'] !== undefined
      ? parseSheetNumber(row[colIndexMap['thuongSangKien']], 0)
      : 0;

    const computedPhuCapCoDinh =
      (colIndexMap['phuCapCoDinh'] !== undefined && row[colIndexMap['phuCapCoDinh']] !== undefined && row[colIndexMap['phuCapCoDinh']] !== '')
        ? parseSheetNumber(row[colIndexMap['phuCapCoDinh']])
        : phuCapChucVu + phuCapDienThoai + troCapTayNghe + troCapGiaDinh + thuongChuyenCan + thuongSangKien;

    const phuCapMoiTruong = colIndexMap['phuCapMoiTruong'] !== undefined
      ? parseManualAllowance(row[colIndexMap['phuCapMoiTruong']])
      : 'Thủ công';
    const phuCapXangXe = colIndexMap['phuCapXangXe'] !== undefined
      ? parseManualAllowance(row[colIndexMap['phuCapXangXe']])
      : 'Thủ công';
    const anToanVeSinhVien = colIndexMap['anToanVeSinhVien'] !== undefined
      ? parseManualAllowance(row[colIndexMap['anToanVeSinhVien']])
      : 'Thủ công';
    const phuCapKinhDoanh = colIndexMap['phuCapKinhDoanh'] !== undefined
      ? parseManualAllowance(row[colIndexMap['phuCapKinhDoanh']])
      : 'Thủ công';
    const phuCapNangNhoc = colIndexMap['phuCapNangNhoc'] !== undefined
      ? parseManualAllowance(row[colIndexMap['phuCapNangNhoc']])
      : 'Thủ công';
    const moTa = colIndexMap['moTa'] !== undefined && row[colIndexMap['moTa']]
      ? String(row[colIndexMap['moTa']]).trim()
      : `Tiêu chuẩn lương cho ${rawChucVu}`;

    const id = `TCL_GS_${r}_${Math.random().toString(36).substring(2, 7)}`;

    items.push({
      id,
      congViec: rawCongViec || lastCongViec,
      chucVu: rawChucVu,
      luongCoBan,
      phuCapChucVu,
      phuCapDienThoai,
      troCapTayNghe,
      troCapGiaDinh,
      thuongChuyenCan,
      thuongSangKien,
      phuCapCoDinh: computedPhuCapCoDinh,
      phuCapMoiTruong,
      phuCapXangXe,
      anToanVeSinhVien,
      phuCapKinhDoanh,
      phuCapNangNhoc,
      moTa,
    });
  }

  if (items.length === 0) {
    warnings.push('Không tìm thấy dòng dữ liệu tiêu chuẩn hợp lệ trong trang tính.');
  }

  return {
    items,
    warnings,
    totalRows: items.length,
    detectedHeaders,
  };
}

/**
 * Create a new Google Spreadsheet with standard salary form layout.
 * Requires user confirmation prior to execution as it creates a document on behalf of the user.
 */
export async function createStandardFormGoogleSheet(
  title: string,
  items: TieuChuanLuongItem[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const headers = [
    'Nhóm Công Việc',
    'Chức Danh / Vị Trí',
    'Lương Cơ Bản (VNĐ)',
    'Phụ Cấp Chức Vụ',
    'Phụ Cấp Điện Thoại',
    'Trợ Cấp Tay Nghề',
    'Trợ Cấp Gia Đình',
    'Thưởng Chuyên Cần',
    'Thưởng Sáng Kiến',
    'Phụ Cấp Cố Định',
    'PC Môi Trường',
    'PC Xăng Xe',
    'ATVS Viên',
    'PC Kinh Doanh',
    'PC Nặng Nhọc',
    'Mô Tả Công Việc'
  ];

  const rows = items.map(item => [
    item.congViec || '',
    item.chucVu || '',
    item.luongCoBan || 0,
    item.phuCapChucVu || 0,
    item.phuCapDienThoai || 0,
    item.troCapTayNghe || 0,
    item.troCapGiaDinh || 150000,
    item.thuongChuyenCan || 200000,
    item.thuongSangKien || 0,
    item.phuCapCoDinh || 0,
    item.phuCapMoiTruong || 'Thủ công',
    item.phuCapXangXe || 'Thủ công',
    item.anToanVeSinhVien || 'Thủ công',
    item.phuCapKinhDoanh || 'Thủ công',
    item.phuCapNangNhoc || 'Thủ công',
    item.moTa || ''
  ]);

  const body = {
    properties: {
      title: title || 'Biểu mẫu tiêu chuẩn lương và phụ cấp SOP',
    },
    sheets: [
      {
        properties: {
          title: 'TieuChuanLuong',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headers.map(h => ({
                  userEnteredValue: { stringValue: h },
                })),
              },
              ...rows.map(r => ({
                values: r.map(val => (
                  typeof val === 'number'
                    ? { userEnteredValue: { numberValue: val } }
                    : { userEnteredValue: { stringValue: String(val) } }
                )),
              })),
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Lỗi tạo Google Sheet (Mã ${response.status})`);
  }

  const result = await response.json();
  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl,
  };
}

export interface OrgFlatRow {
  khoi: string;
  ban: string;
  phong: string;
}

export interface OrgParseResult {
  hierarchy: KhoiNode[];
  flatRows: OrgFlatRow[];
  warnings: string[];
  totalRows: number;
  detectedHeaders: { [column: string]: string };
}

function makeOrgNodeId(prefix: string, name: string, fallbackIndex: number): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `${prefix}_${slug || 'node'}_${fallbackIndex}`;
}

/**
 * Parse raw rows from Google Sheet into KhoiNode[] (Khối / Team -> Ban / Group -> Phòng / Bộ phận / Part).
 * Supports fill-down for merged cells and auto-detects column headers.
 */
export function parseOrganizationRows(rows: any[][]): OrgParseResult {
  const warnings: string[] = [];
  const flatRows: OrgFlatRow[] = [];
  const detectedHeaders: { [col: string]: string } = {};

  if (!rows || rows.length === 0) {
    return {
      hierarchy: [],
      flatRows,
      warnings: ['Trang tính không có dữ liệu (trống).'],
      totalRows: 0,
      detectedHeaders,
    };
  }

  let headerRowIndex = -1;
  const colIndexMap: { khoi?: number; ban?: number; phong?: number } = {};

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    row.forEach((cell) => {
      const norm = normalizeHeader(String(cell || ''));
      if (norm.includes('khoi') || norm.includes('team') || norm.includes('division')) score++;
      if (norm.includes('ban') || norm.includes('group')) score++;
      if (
        norm.includes('phong') ||
        norm.includes('part') ||
        norm.includes('bophan') ||
        norm.includes('donvi') ||
        norm.includes('diadiem')
      ) {
        score++;
      }
    });

    if (score >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  // Check if row 0 looks like a header even with only 1 match or standard labels
  const firstRow = rows[0] || [];
  if (headerRowIndex === -1 && firstRow.length > 0) {
    const hasHeaderLikeText = firstRow.some((cell) => {
      const norm = normalizeHeader(String(cell || ''));
      return (
        norm === 'stt' ||
        norm.includes('khoi') ||
        norm.includes('team') ||
        norm.includes('ban') ||
        norm.includes('group') ||
        norm.includes('phong') ||
        norm.includes('part') ||
        norm.includes('bophan')
      );
    });
    if (hasHeaderLikeText) {
      headerRowIndex = 0;
    }
  }

  if (headerRowIndex >= 0) {
    const headerRow = rows[headerRowIndex] || [];
    headerRow.forEach((cell, c) => {
      const raw = String(cell || '').trim();
      const norm = normalizeHeader(raw);
      if (raw) detectedHeaders[`Cột ${c + 1}`] = raw;

      if (norm === 'stt' || norm === 'no' || norm === 'tt') {
        return;
      }

      if (
        colIndexMap.khoi === undefined &&
        (norm.includes('khoi') || norm.includes('team') || norm.includes('division'))
      ) {
        colIndexMap.khoi = c;
      } else if (
        colIndexMap.ban === undefined &&
        !norm.includes('phongban') &&
        (norm.includes('ban') || norm.includes('group'))
      ) {
        colIndexMap.ban = c;
      } else if (
        colIndexMap.phong === undefined &&
        (norm.includes('phong') ||
          norm.includes('part') ||
          norm.includes('bophan') ||
          norm.includes('donvi') ||
          norm.includes('diadiem') ||
          norm.includes('canteen') ||
          norm.includes('bep'))
      ) {
        colIndexMap.phong = c;
      }
    });
  }

  // Fallback column order: skip STT column if first column is STT or numeric
  const refRow = rows[headerRowIndex >= 0 ? headerRowIndex : 0] || [];
  if (
    colIndexMap.khoi === undefined ||
    colIndexMap.ban === undefined ||
    colIndexMap.phong === undefined
  ) {
    const firstColNorm = normalizeHeader(String(refRow[0] || ''));
    const hasSttCol =
      firstColNorm === 'stt' ||
      firstColNorm === 'no' ||
      (headerRowIndex === -1 && /^\d+$/.test(String(refRow[0] || '').trim()));
    const offset = hasSttCol ? 1 : 0;

    if (colIndexMap.khoi === undefined && refRow.length > offset) {
      colIndexMap.khoi = offset;
    }
    if (colIndexMap.ban === undefined && refRow.length > offset + 1) {
      colIndexMap.ban = offset + 1;
    }
    if (colIndexMap.phong === undefined && refRow.length > offset + 2) {
      colIndexMap.phong = offset + 2;
    }
  }

  if (colIndexMap.khoi === undefined) {
    return {
      hierarchy: [],
      flatRows,
      warnings: ['Không nhận diện được cột Team (Khối), Group (Ban), Part (Bộ phận / Phòng) trong trang tính.'],
      totalRows: 0,
      detectedHeaders,
    };
  }

  const khoiMap = new Map<string, { node: KhoiNode; banMap: Map<string, { node: BanNode; phongSet: Set<string> }> }>();
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  let lastKhoi = '';
  let lastBan = '';
  let nodeSeq = 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }

    const rawKhoi = colIndexMap.khoi !== undefined ? String(row[colIndexMap.khoi] ?? '').trim() : '';
    const rawBan = colIndexMap.ban !== undefined ? String(row[colIndexMap.ban] ?? '').trim() : '';
    const rawPhong = colIndexMap.phong !== undefined ? String(row[colIndexMap.phong] ?? '').trim() : '';

    // Skip duplicate repeated header row inside body
    const normKhoi = normalizeHeader(rawKhoi);
    const normBan = normalizeHeader(rawBan);
    if ((normKhoi === 'khoi' || normKhoi === 'team') && (normBan === 'ban' || normBan === 'group')) {
      continue;
    }

    if (rawKhoi && rawKhoi.toUpperCase() !== lastKhoi.toUpperCase()) {
      lastKhoi = rawKhoi;
      lastBan = '';
    }
    const effectiveKhoi = rawKhoi || lastKhoi;
    if (!effectiveKhoi) continue;

    if (rawBan) {
      lastBan = rawBan;
    }
    const effectiveBan = rawBan || lastBan || effectiveKhoi;
    const effectivePhong = rawPhong || effectiveBan;

    const khoiKey = effectiveKhoi.toUpperCase();
    const banKey = effectiveBan.toUpperCase();
    const phongKey = effectivePhong.toUpperCase();

    let khoiEntry = khoiMap.get(khoiKey);
    if (!khoiEntry) {
      nodeSeq++;
      khoiEntry = {
        node: {
          id: makeOrgNodeId('khoi', effectiveKhoi, nodeSeq),
          name: effectiveKhoi.toUpperCase(),
          bans: [],
        },
        banMap: new Map(),
      };
      khoiMap.set(khoiKey, khoiEntry);
    }

    let banEntry = khoiEntry.banMap.get(banKey);
    if (!banEntry) {
      nodeSeq++;
      const banNode: BanNode = {
        id: makeOrgNodeId('ban', effectiveBan, nodeSeq),
        name: effectiveBan.toUpperCase(),
        phongs: [],
      };
      banEntry = { node: banNode, phongSet: new Set() };
      khoiEntry.banMap.set(banKey, banEntry);
      khoiEntry.node.bans.push(banNode);
    }

    if (!banEntry.phongSet.has(phongKey)) {
      nodeSeq++;
      const phongNode: PhongNode = {
        id: makeOrgNodeId('part', effectivePhong, nodeSeq),
        name: effectivePhong.toUpperCase(),
      };
      banEntry.phongSet.add(phongKey);
      banEntry.node.phongs.push(phongNode);
      flatRows.push({
        khoi: khoiEntry.node.name,
        ban: banEntry.node.name,
        phong: phongNode.name,
      });
    }
  }

  const hierarchy = Array.from(khoiMap.values()).map((entry) => entry.node);

  if (hierarchy.length === 0) {
    warnings.push('Không tìm thấy dữ liệu Team (Khối) / Group (Ban) / Part (Phòng) hợp lệ trong trang tính.');
  }

  return {
    hierarchy,
    flatRows,
    warnings,
    totalRows: flatRows.length,
    detectedHeaders,
  };
}

/**
 * Merge incoming KhoiNode[] into existing KhoiNode[] without duplicating Teams/Groups/Parts (case-insensitive).
 */
export function mergeOrganizationHierarchies(existing: KhoiNode[], incoming: KhoiNode[]): KhoiNode[] {
  const result: KhoiNode[] = existing.map((k) => ({
    ...k,
    bans: k.bans.map((b) => ({
      ...b,
      phongs: b.phongs.map((p) => ({ ...p })),
    })),
  }));

  incoming.forEach((incKhoi) => {
    const existingKhoi = result.find(
      (k) => k.name.trim().toUpperCase() === incKhoi.name.trim().toUpperCase()
    );
    if (!existingKhoi) {
      result.push(incKhoi);
      return;
    }

    incKhoi.bans.forEach((incBan) => {
      const existingBan = existingKhoi.bans.find(
        (b) => b.name.trim().toUpperCase() === incBan.name.trim().toUpperCase()
      );
      if (!existingBan) {
        existingKhoi.bans.push(incBan);
        return;
      }

      incBan.phongs.forEach((incPhong) => {
        const hasPhong = existingBan.phongs.some(
          (p) => p.name.trim().toUpperCase() === incPhong.name.trim().toUpperCase()
        );
        if (!hasPhong) {
          existingBan.phongs.push(incPhong);
        }
      });
    });
  });

  return result;
}

/**
 * Create a new Google Spreadsheet populated with the current organization hierarchy template.
 */
export async function createOrganizationGoogleSheet(
  title: string,
  hierarchy: KhoiNode[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const headers = ['STT', 'Team (Khối)', 'Group (Ban)', 'Part (Bộ phận / Phòng)'];

  const rows: (string | number)[][] = [];
  let stt = 1;
  hierarchy.forEach((khoi) => {
    if (khoi.bans.length === 0) {
      rows.push([stt++, khoi.name, '', '']);
      return;
    }
    khoi.bans.forEach((ban) => {
      if (ban.phongs.length === 0) {
        rows.push([stt++, khoi.name, ban.name, '']);
        return;
      }
      ban.phongs.forEach((phong) => {
        rows.push([stt++, khoi.name, ban.name, phong.name]);
      });
    });
  });

  const body = {
    properties: {
      title: title || 'Biểu mẫu Cơ cấu tổ chức (Team - Group - Part)',
    },
    sheets: [
      {
        properties: {
          title: 'CoCauToChuc',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headers.map((h) => ({
                  userEnteredValue: { stringValue: h },
                })),
              },
              ...rows.map((r) => ({
                values: r.map((val) =>
                  typeof val === 'number'
                    ? { userEnteredValue: { numberValue: val } }
                    : { userEnteredValue: { stringValue: String(val) } }
                ),
              })),
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Lỗi tạo Google Sheet (Mã ${response.status})`);
  }

  const result = await response.json();
  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl,
  };
}
