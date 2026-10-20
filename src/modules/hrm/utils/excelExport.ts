import ExcelJS from 'exceljs';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, AuthUser, MealSession, MealType } from '../types';
import { getCycleDays, formatNumber, numberToVietnameseWords, formatDateVN } from './cycleHelper';

/**
 * Normalizes a meal record into a list of MealSessions
 */
export function getRecordSessions(rec: any, dateStr: string): MealSession[] {
  if (!rec || rec.mealsCount === 0) return [];
  if (rec.sessions && rec.sessions.length > 0) {
    return rec.sessions;
  }

  const count = rec.mealsCount || 1;
  const sessions: MealSession[] = [];
  const location = rec.location || '';
  const purpose = rec.purpose || rec.note || '';

  if (count === 1) {
    sessions.push({
      id: `${dateStr}_trua`,
      mealType: 'Bữa Trưa',
      startTime: '08:00',
      endTime: '17:00',
      location,
      purpose,
      mealsCount: 1,
    });
  } else if (count === 2) {
    sessions.push({
      id: `${dateStr}_trua`,
      mealType: 'Bữa Trưa',
      startTime: '08:00',
      endTime: '17:00',
      location,
      purpose,
      mealsCount: 1,
    });
    sessions.push({
      id: `${dateStr}_toi`,
      mealType: 'Bữa Tối',
      startTime: '17:00',
      endTime: '19:00',
      location,
      purpose,
      mealsCount: 1,
    });
  } else {
    for (let i = 0; i < count; i++) {
      sessions.push({
        id: `${dateStr}_${i}`,
        mealType: i === 0 ? 'Bữa Trưa' : i === 1 ? 'Bữa Tối' : i === 2 ? 'Bữa Sáng' : 'Bữa Đêm',
        startTime: i === 0 ? '08:00' : '17:00',
        endTime: i === 0 ? '17:00' : '19:00',
        location,
        purpose,
        mealsCount: 1,
      });
    }
  }

  return sessions;
}

// Styling Constants
const FONT_NAME = 'Times New Roman';
const BORDER_THIN = {
  top: { style: 'thin' as const, color: { argb: 'FF888888' } },
  left: { style: 'thin' as const, color: { argb: 'FF888888' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF888888' } },
  right: { style: 'thin' as const, color: { argb: 'FF888888' } },
};
const BORDER_TOTAL = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF888888' } },
  bottom: { style: 'double' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF888888' } },
};

/**
 * Helper to download an ExcelJS workbook in the browser
 */
/**
 * Floating helper for mobile browsers (Zalo, iOS Safari, Android Webview)
 * to ensure users can always download or open the Excel file.
 */
function showMobileDownloadFallback(url: string, fileName: string) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('mobile-excel-download-helper');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'mobile-excel-download-helper';
  container.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:99999;max-width:420px;margin:0 auto;background:rgba(15,23,42,0.95);color:#fff;padding:14px;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);border:1px solid rgba(16,185,129,0.5);backdrop-filter:blur(8px);';

  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
      <div>
        <div style="font-size:13px;font-weight:700;color:#34d399;display:flex;align-items:center;gap:6px;">
          <span>📊 Đã tạo xong file Excel!</span>
        </div>
        <div style="font-size:11px;color:#cbd5e1;margin-top:3px;word-break:break-all;font-family:monospace;">${fileName}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Nếu điện thoại chưa tự tải, vui lòng chạm nút bên dưới:</div>
      </div>
      <button id="close-mobile-excel-helper" style="color:#94a3b8;background:transparent;border:none;font-size:16px;cursor:pointer;padding:2px 6px;">✕</button>
    </div>
    <div style="margin-top:10px;">
      <a href="${url}" download="${fileName}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:10px 14px;background:#059669;color:#fff;border-radius:10px;text-align:center;font-size:13px;font-weight:700;text-decoration:none;">
        📥 Chạm vào đây để Tải / Mở File
      </a>
    </div>
  `;

  document.body.appendChild(container);

  const closeBtn = document.getElementById('close-mobile-excel-helper');
  if (closeBtn) {
    closeBtn.onclick = () => container.remove();
  }

  setTimeout(() => {
    if (container.parentNode) {
      container.remove();
    }
  }, 18000);
}

/**
 * Helper to download an ExcelJS workbook across all devices (Desktop, iOS Safari, Android, In-App Browsers).
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([buffer], { type: mimeType });

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isMobile =
    typeof navigator !== 'undefined' &&
    (isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  // 1. Try Native Web Share API on Mobile devices (iOS Safari, Chrome Android)
  if (isMobile && typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      if (typeof File !== 'undefined' && 'canShare' in navigator) {
        const file = new File([blob], fileName, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: 'Bảng kê tiền ăn ngoài Welstory',
          });
          return;
        }
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        // User voluntarily closed the share sheet
        return;
      }
      console.warn('Web Share API error, using standard download:', shareErr);
    }
  }

  // 2. Direct Blob Download with Mobile Protection
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = fileName;
  anchor.setAttribute('download', fileName);

  if (isIOS) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }

  document.body.appendChild(anchor);
  anchor.click();

  // Show a direct fallback tap button on mobile in case in-app browser blocked click
  if (isMobile) {
    showMobileDownloadFallback(url, fileName);
  }

  // CRITICAL FIX: Keep object URL alive for 3 minutes so mobile browsers have sufficient time
  setTimeout(() => {
    try {
      if (anchor.parentNode) {
        document.body.removeChild(anchor);
      }
      window.URL.revokeObjectURL(url);
    } catch (e) {}
  }, 180000);
}

/**
 * Builds Sheet 1: Detailed Meal Allowance Sheet
 * - Font: Times New Roman, size 12
 * - Beautiful border formatting & bold header
 * - Title: "TỔNG HỢP TIỀN ĂN NHÓM NHÂN SỰ TỪ NGÀY ... ĐẾN NGÀY ..."
 * - Formula for Thành tiền: = đơn giá * số bữa ăn hỗ trợ (=K{r}*L{r})
 */
function buildDetailedSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  targetEmployees: Employee[],
  mealData: Record<string, EmployeeMealData>,
  cycle: CycleConfig,
  settings: AppSettings
) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // Set column widths
  ws.columns = [
    { key: 'stt', width: 7 },       // A: STT
    { key: 'dept', width: 22 },      // B: Phòng ban
    { key: 'id', width: 16 },        // C: Mã thẻ NV (ID)
    { key: 'name', width: 25 },      // D: Họ và tên
    { key: 'date', width: 15 },      // E: Ngày
    { key: 'start', width: 16 },     // F: Thời gian bắt đầu (Giờ)
    { key: 'end', width: 16 },       // G: Thời gian kết thúc (Giờ)
    { key: 'location', width: 20 },  // H: Địa điểm làm việc
    { key: 'purpose', width: 44 },   // I: Mục đích công việc
    { key: 'mealType', width: 17 },  // J: Phân loại bữa ăn
    { key: 'meals', width: 16 },     // K: Số bữa ăn hỗ trợ
    { key: 'price', width: 16 },     // L: Đơn giá (VND)
    { key: 'amount', width: 19 },    // M: Thành tiền (VND)
  ];

  // 1. Company and Department Info (Rows 1-2)
  const r1 = ws.getRow(1);
  r1.getCell(1).value = settings.companyName.toUpperCase();
  r1.getCell(1).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF333333' } };

  const r2 = ws.getRow(2);
  r2.getCell(1).value = `${settings.departmentName.toUpperCase()} · BỘ PHẬN TUYỂN DỤNG`;
  r2.getCell(1).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF555555' } };

  // 2. Main Title (Row 4)
  // "TỔNG HỢP TIỀN ĂN NHÓM NHÂN SỰ TỪ NGÀY ... ĐẾN NGÀY ..."
  const titleText = `TỔNG HỢP TIỀN ĂN NHÓM NHÂN SỰ TỪ NGÀY ${formatDateVN(cycle.startDate)} ĐẾN NGÀY ${formatDateVN(cycle.endDate)}`;
  ws.mergeCells('A4:M4');
  const titleRow = ws.getRow(4);
  titleRow.height = 30;
  const titleCell = ws.getCell('A4');
  titleCell.value = titleText;
  titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtitle (Row 5)
  ws.mergeCells('A5:M5');
  const subRow = ws.getRow(5);
  subRow.height = 20;
  const subCell = ws.getCell('A5');
  subCell.value = `(Đơn giá định mức: ${formatNumber(settings.mealPrice)} VNĐ/1 bữa ăn ngoài | Đơn vị tính: VNĐ)`;
  subCell.font = { name: FONT_NAME, size: 11, italic: true, color: { argb: 'FF444444' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Table Headers (Row 7)
  const headerRowIndex = 7;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.height = 32;

  const headers = [
    'STT',
    'Phòng ban',
    'Mã thẻ NV (ID)',
    'Họ và tên',
    'Ngày',
    'Thời gian bắt đầu\n(Giờ)',
    'Thời gian kết thúc\n(Giờ)',
    'Địa điểm làm việc',
    'Mục đích công việc',
    'Phân loại bữa ăn',
    'Số bữa ăn hỗ trợ',
    'Đơn giá\n(VND)',
    'Thành tiền\n(VND)',
  ];

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2EFDA' }, // Professional accounting light green tint
    };
    cell.border = BORDER_THIN;
  });

  // 4. Data Rows (Starting at Row 8)
  const cycleDays = getCycleDays(cycle);
  let currentRowIndex = 8;
  let sttCounter = 1;
  let precomputedTotalMeals = 0;
  let precomputedTotalAmount = 0;

  targetEmployees.forEach((emp) => {
    const empMeals = mealData[emp.id]?.records || {};

    cycleDays.forEach((day) => {
      const rec = empMeals[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        const sessions = getRecordSessions(rec, day.dateStr);

        sessions.forEach((session) => {
          const row = ws.getRow(currentRowIndex);
          row.height = 24;

          const mealsCount = session.mealsCount || 1;
          const lineAmount = mealsCount * settings.mealPrice;
          precomputedTotalMeals += mealsCount;
          precomputedTotalAmount += lineAmount;

          const defaultStart = session.mealType === 'Bữa Tối' ? '17:00' : session.mealType === 'Bữa Sáng' ? '06:30' : session.mealType === 'Bữa Đêm' ? '22:00' : '08:00';
          const defaultEnd = session.mealType === 'Bữa Tối' ? '19:00' : session.mealType === 'Bữa Sáng' ? '08:30' : session.mealType === 'Bữa Đêm' ? '06:00' : '17:00';

          // Values
          row.getCell(1).value = sttCounter++;
          row.getCell(2).value = emp.department || 'HUMAN RESOURCES';
          row.getCell(3).value = emp.id;
          row.getCell(4).value = emp.name;
          row.getCell(5).value = formatDateVN(day.dateStr);
          row.getCell(6).value = session.startTime || defaultStart;
          row.getCell(7).value = session.endTime || defaultEnd;
          row.getCell(8).value = session.location || 'Bắc Ninh';
          row.getCell(9).value = session.purpose || 'Tuyển dụng các bếp Samsung Yên Phong và các bếp Quế Võ';
          row.getCell(10).value = session.mealType || 'Bữa Trưa';
          row.getCell(11).value = mealsCount;
          row.getCell(12).value = settings.mealPrice;

          // Cột thành tiền để công thức: = đơn giá * số bữa ăn hỗ trợ (=K{r}*L{r})
          row.getCell(13).value = {
            formula: `K${currentRowIndex}*L${currentRowIndex}`,
            result: lineAmount,
          };

          // Fonts, alignments, borders
          for (let c = 1; c <= 13; c++) {
            const cell = row.getCell(c);
            cell.font = { name: FONT_NAME, size: 12, color: { argb: 'FF000000' } };
            cell.border = BORDER_THIN;
            cell.alignment = { vertical: 'middle' };

            if ([1, 3, 5, 6, 7, 10, 11].includes(c)) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if ([12, 13].includes(c)) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '#,##0';
            } else if (c === 9) {
              cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            }
          }

          // Bold for Employee name and Amount
          row.getCell(4).font = { name: FONT_NAME, size: 12, bold: true };
          row.getCell(13).font = { name: FONT_NAME, size: 12, bold: true };

          currentRowIndex++;
        });
      }
    });
  });

  const lastDataRowIndex = currentRowIndex - 1;

  // 5. Total Row
  const totalRow = ws.getRow(currentRowIndex);
  totalRow.height = 28;

  ws.mergeCells(`A${currentRowIndex}:J${currentRowIndex}`);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = 'TỔNG CỘNG';
  totalLabelCell.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: 'FF000000' } };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total meals formula
  const totalMealsCell = totalRow.getCell(11);
  if (lastDataRowIndex >= 8) {
    totalMealsCell.value = {
      formula: `SUM(K8:K${lastDataRowIndex})`,
      result: precomputedTotalMeals,
    };
  } else {
    totalMealsCell.value = 0;
  }
  totalMealsCell.font = { name: FONT_NAME, size: 12, bold: true };
  totalMealsCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalMealsCell.numFmt = '#,##0';

  // Empty Price cell
  totalRow.getCell(12).value = '';

  // Total amount formula
  const totalAmountCell = totalRow.getCell(13);
  if (lastDataRowIndex >= 8) {
    totalAmountCell.value = {
      formula: `SUM(M8:M${lastDataRowIndex})`,
      result: precomputedTotalAmount,
    };
  } else {
    totalAmountCell.value = 0;
  }
  totalAmountCell.font = { name: FONT_NAME, size: 12, bold: true };
  totalAmountCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalAmountCell.numFmt = '#,##0';

  // Style all cells in total row
  for (let c = 1; c <= 13; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell.border = BORDER_TOTAL;
  }

  return { lastDataRowIndex, totalMeals: precomputedTotalMeals, totalAmount: precomputedTotalAmount };
}

/**
 * Builds Sheet 2: Pivotable Summary Table
 * - Displays: Mã thẻ nhân viên (ID), Họ tên, Tổng số bữa và Tổng số tiền
 * - Font: Times New Roman, size 12
 * - Borders, bold headers, formula = đơn giá * tổng số bữa
 */
function buildPivotSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  targetEmployees: Employee[],
  mealData: Record<string, EmployeeMealData>,
  cycle: CycleConfig,
  settings: AppSettings,
  detailedSheetName: string,
  lastDetailRowIndex: number
) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // Set column widths
  ws.columns = [
    { key: 'stt', width: 8 },      // A: STT
    { key: 'id', width: 20 },       // B: Mã thẻ nhân viên (ID)
    { key: 'name', width: 28 },     // C: Họ và tên
    { key: 'dept', width: 24 },     // D: Phòng ban
    { key: 'meals', width: 18 },    // E: Tổng số bữa ăn
    { key: 'price', width: 18 },    // F: Đơn giá (VND)
    { key: 'amount', width: 22 },   // G: Tổng số tiền (VND)
    { key: 'sign', width: 18 },     // H: Ký nhận
  ];

  // 1. Title Block (Row 2-4)
  ws.mergeCells('A2:H2');
  const t1 = ws.getCell('A2');
  t1.value = `${settings.companyName.toUpperCase()} · ${settings.departmentName.toUpperCase()}`;
  t1.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF333333' } };
  t1.alignment = { horizontal: 'center' };

  ws.mergeCells('A3:H3');
  const t2 = ws.getCell('A3');
  t2.value = `BẢNG PIVOT TỔNG HỢP TIỀN ĂN THEO NHÂN VIÊN`;
  t2.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: 'FF000000' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 28;

  ws.mergeCells('A4:H4');
  const t3 = ws.getCell('A4');
  t3.value = `(Chu kỳ: Từ ngày ${formatDateVN(cycle.startDate)} đến ngày ${formatDateVN(cycle.endDate)})`;
  t3.font = { name: FONT_NAME, size: 11, italic: true, color: { argb: 'FF555555' } };
  t3.alignment = { horizontal: 'center' };

  // 2. Table Headers (Row 6)
  const headerRowIndex = 6;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.height = 30;

  const pivotHeaders = [
    'STT',
    'Mã thẻ nhân viên (ID)',
    'Họ và tên',
    'Phòng ban',
    'Tổng số bữa',
    'Đơn giá (VND)',
    'Tổng số tiền (VND)',
    'Ký nhận',
  ];

  pivotHeaders.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 12, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }, // Corporate soft blue fill for Pivot
    };
    cell.border = BORDER_THIN;
  });

  // 3. Employee Rows (Row 7 to N)
  const cycleDays = getCycleDays(cycle);
  let currentRow = 7;
  let grandTotalMeals = 0;
  let grandTotalAmount = 0;

  targetEmployees.forEach((emp, idx) => {
    const empMeals = mealData[emp.id]?.records || {};
    let empCount = 0;
    cycleDays.forEach((day) => {
      const rec = empMeals[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        empCount += rec.mealsCount;
      }
    });

    const empAmount = empCount * settings.mealPrice;
    grandTotalMeals += empCount;
    grandTotalAmount += empAmount;

    const row = ws.getRow(currentRow);
    row.height = 25;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = emp.id;
    row.getCell(3).value = emp.name;
    row.getCell(4).value = emp.department || 'HUMAN RESOURCES';

    // Formula for meals: SUMIF from Detailed sheet if available, else direct count
    if (lastDetailRowIndex >= 8) {
      row.getCell(5).value = {
        formula: `SUMIF('${detailedSheetName}'!$C$8:$C$${lastDetailRowIndex}, B${currentRow}, '${detailedSheetName}'!$K$8:$K$${lastDetailRowIndex})`,
        result: empCount,
      };
    } else {
      row.getCell(5).value = empCount;
    }

    row.getCell(6).value = settings.mealPrice;

    // Formula for Total Amount: = E{r} * F{r}
    row.getCell(7).value = {
      formula: `E${currentRow}*F${currentRow}`,
      result: empAmount,
    };

    row.getCell(8).value = ''; // Ký nhận

    // Styling
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.font = { name: FONT_NAME, size: 12 };
      cell.border = BORDER_THIN;
      cell.alignment = { vertical: 'middle' };

      if ([1, 2, 5].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([6, 7].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }
    }

    row.getCell(2).font = { name: FONT_NAME, size: 12, bold: true };
    row.getCell(3).font = { name: FONT_NAME, size: 12, bold: true };
    row.getCell(7).font = { name: FONT_NAME, size: 12, bold: true };

    currentRow++;
  });

  const lastEmployeeRowIndex = currentRow - 1;

  // 4. Grand Total Row
  const totalRow = ws.getRow(currentRow);
  totalRow.height = 28;

  ws.mergeCells(`A${currentRow}:D${currentRow}`);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'TỔNG CỘNG';
  totalLabel.font = { name: FONT_NAME, size: 12, bold: true };
  totalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total meals formula
  const totMeals = totalRow.getCell(5);
  if (lastEmployeeRowIndex >= 7) {
    totMeals.value = {
      formula: `SUM(E7:E${lastEmployeeRowIndex})`,
      result: grandTotalMeals,
    };
  } else {
    totMeals.value = 0;
  }
  totMeals.font = { name: FONT_NAME, size: 12, bold: true };
  totMeals.alignment = { horizontal: 'center', vertical: 'middle' };
  totMeals.numFmt = '#,##0';

  totalRow.getCell(6).value = '';

  // Total amount formula
  const totAmount = totalRow.getCell(7);
  if (lastEmployeeRowIndex >= 7) {
    totAmount.value = {
      formula: `SUM(G7:G${lastEmployeeRowIndex})`,
      result: grandTotalAmount,
    };
  } else {
    totAmount.value = 0;
  }
  totAmount.font = { name: FONT_NAME, size: 12, bold: true };
  totAmount.alignment = { horizontal: 'right', vertical: 'middle' };
  totAmount.numFmt = '#,##0';

  for (let c = 1; c <= 8; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell.border = BORDER_TOTAL;
  }
}

/**
 * Export ONLY an individual employee's report:
 * Sheet 1: Detailed Table with Formulas, Times New Roman 12, Borders, Title
 * Sheet 2: Pivotable Summary for that Employee
 */
export async function exportIndividualMealAllowanceToExcel(
  employee: Employee,
  mealData: Record<string, EmployeeMealData>,
  cycle: CycleConfig,
  settings: AppSettings
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ Thống Tiền Ăn Tuyển Dụng';
  workbook.created = new Date();

  const detailSheetName = 'Chi_Tiet_Tien_An';
  const pivotSheetName = 'Pivot_Tong_Hop';

  const { lastDataRowIndex } = buildDetailedSheet(
    workbook,
    detailSheetName,
    [employee],
    mealData,
    cycle,
    settings
  );

  buildPivotSheet(
    workbook,
    pivotSheetName,
    [employee],
    mealData,
    cycle,
    settings,
    detailSheetName,
    lastDataRowIndex
  );

  const safeName = employee.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '_');

  const fileName = `Bang_Ke_Tien_An_${safeName}_${employee.id}_${cycle.startDate}_den_${cycle.endDate}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}

/**
 * Export full department meal allowance sheet (Manager & Admin only):
 * Sheet 1: Detailed Table with Formulas, Times New Roman 12, Borders, Title
 * Sheet 2: Pivotable Summary Table for all Employees
 */
export async function exportDepartmentMealAllowanceToExcel(
  employees: Employee[],
  mealData: Record<string, EmployeeMealData>,
  cycle: CycleConfig,
  settings: AppSettings
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ Thống Tiền Ăn Tuyển Dụng';
  workbook.created = new Date();

  const detailSheetName = 'Chi_Tiet_Tien_An';
  const pivotSheetName = 'Pivot_Tong_Hop_NV';

  const { lastDataRowIndex } = buildDetailedSheet(
    workbook,
    detailSheetName,
    employees,
    mealData,
    cycle,
    settings
  );

  buildPivotSheet(
    workbook,
    pivotSheetName,
    employees,
    mealData,
    cycle,
    settings,
    detailSheetName,
    lastDataRowIndex
  );

  const fileName = `Bang_Ke_Tien_An_Toan_Bo_Phan_${cycle.startDate}_den_${cycle.endDate}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}

/**
 * Smart Export Dispatcher:
 * Ensures employee accounts ONLY export their own records!
 */
export async function exportSmartMealAllowanceToExcel(
  currentUser: AuthUser | null,
  employees: Employee[],
  mealData: Record<string, EmployeeMealData>,
  cycle: CycleConfig,
  settings: AppSettings,
  targetEmployeeId?: string
) {
  // If logged in as regular employee, STRICTLY export only their own data
  if (currentUser && currentUser.role === 'nhan_vien_nhan_su') {
    const ownEmployee = employees.find((e) => e.id === currentUser.id);
    if (ownEmployee) {
      await exportIndividualMealAllowanceToExcel(ownEmployee, mealData, cycle, settings);
      return;
    }
  }

  // For Admin / Manager: if target employee is explicitly requested, export that individual
  if (targetEmployeeId) {
    const targetEmp = employees.find((e) => e.id === targetEmployeeId);
    if (targetEmp) {
      await exportIndividualMealAllowanceToExcel(targetEmp, mealData, cycle, settings);
      return;
    }
  }

  // If Manager or Admin and no specific target, export full department sheet
  await exportDepartmentMealAllowanceToExcel(employees, mealData, cycle, settings);
}
