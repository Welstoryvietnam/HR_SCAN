import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSpreadsheetId,
  parseSheetNumber,
  parseStandardRows,
} from '../src/utils/googleSheetsService.js';

test('Google Sheets Sync: extractSpreadsheetId handles various formats', () => {
  // Full Google Docs URL
  const fullUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  assert.equal(extractSpreadsheetId(fullUrl), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  // Short URL
  const shortUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.equal(extractSpreadsheetId(shortUrl), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  // Raw ID
  const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.equal(extractSpreadsheetId(rawId), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  // Invalid strings
  assert.equal(extractSpreadsheetId(''), null);
  assert.equal(extractSpreadsheetId('invalid-string'), null);
});

test('Google Sheets Sync: parseSheetNumber parses currency and formatted numbers', () => {
  // Plain number
  assert.equal(parseSheetNumber(5000000), 5000000);

  // Vietnamese formatted currency with dots: 5.895.000
  assert.equal(parseSheetNumber('5.895.000'), 5895000);

  // Formatted currency with commas: 5,895,000
  assert.equal(parseSheetNumber('5,895,000'), 5895000);

  // Formatted with currency suffix
  assert.equal(parseSheetNumber('5.895.000 đ'), 5895000);
  assert.equal(parseSheetNumber('5,895,000 VND'), 5895000);

  // 'k' notation: 500k -> 500,000
  assert.equal(parseSheetNumber('500k'), 500000);

  // 'tr' notation: 5.5tr -> 5,500,000
  assert.equal(parseSheetNumber('5.5tr'), 5500000);

  // Text values: "Thủ công", "-", ""
  assert.equal(parseSheetNumber('Thủ công', 0), 0);
  assert.equal(parseSheetNumber('-', 0), 0);
  assert.equal(parseSheetNumber('', 150000), 150000);
  assert.equal(parseSheetNumber(null, 200000), 200000);
});

test('Google Sheets Sync: parseStandardRows recognizes Vietnamese headers and builds items', () => {
  const sampleRows = [
    // Header row
    [
      'Nhóm Công Việc',
      'Chức Danh / Vị Trí',
      'Lương Cơ Bản',
      'Phụ Cấp Chức Vụ',
      'Phụ Cấp Điện Thoại',
      'Trợ Cấp Tay Nghề',
      'Trợ Cấp Gia Đình',
      'Thưởng Chuyên Cần',
      'Thưởng Sáng Kiến',
      'Mô Tả Công Việc'
    ],
    // Data row 1
    [
      'Bán Hàng',
      'Cửa Hàng Trưởng',
      '5.895.000',
      '500.000',
      '0',
      '0',
      '150.000',
      '200.000',
      '200.000',
      'Quản lý điểm bán hàng'
    ],
    // Data row 2
    [
      'Bán Hàng',
      'Nhân Viên Bán Hàng',
      '5447000',
      '0',
      '0',
      '500000',
      '150000',
      '200000',
      '0',
      'Bán hàng trực tiếp'
    ],
    // Empty row (should be skipped)
    ['', '', '', '', ''],
  ];

  const result = parseStandardRows(sampleRows);
  assert.equal(result.items.length, 2);
  assert.equal(result.warnings.length, 0);

  // Row 1 verification
  const item1 = result.items[0];
  assert.equal(item1.congViec, 'Bán Hàng');
  assert.equal(item1.chucVu, 'Cửa Hàng Trưởng');
  assert.equal(item1.luongCoBan, 5895000);
  assert.equal(item1.phuCapChucVu, 500000);
  assert.equal(item1.troCapGiaDinh, 150000);
  assert.equal(item1.thuongChuyenCan, 200000);
  assert.equal(item1.thuongSangKien, 200000);
  // phuCapCoDinh = 500k + 0 + 0 + 150k + 200k + 200k = 1,050,000
  assert.equal(item1.phuCapCoDinh, 1050000);

  // Row 2 verification
  const item2 = result.items[1];
  assert.equal(item2.congViec, 'Bán Hàng');
  assert.equal(item2.chucVu, 'Nhân Viên Bán Hàng');
  assert.equal(item2.luongCoBan, 5447000);
  assert.equal(item2.troCapTayNghe, 500000);
  // phuCapCoDinh = 0 + 0 + 500k + 150k + 200k + 0 = 850,000
  assert.equal(item2.phuCapCoDinh, 850000);
});

test('Google Sheets Sync: parseStandardRows handles empty or headerless sheet safely', () => {
  const emptyResult = parseStandardRows([]);
  assert.equal(emptyResult.items.length, 0);
  assert.ok(emptyResult.warnings.length > 0);
});
