import { BatchEmployeeDraft, EmployeeDocumentGroup, NhanSuRecord } from '../types';

/**
 * Chuẩn hóa số CCCD / CMND: loại bỏ khoảng trắng và ký tự không phải chữ số
 */
export function normalizeCCCD(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '').trim();
}

/**
 * Kiểm tra xem một chuỗi số có phải là định dạng CCCD (12 số) hoặc CMND (9 số) hợp lệ không
 */
export function isValidCCCDFormat(digits: string): boolean {
  return digits.length === 12 || digits.length === 9;
}

/**
 * Trích xuất các chuỗi 9 hoặc 12 chữ số liên tiếp từ tên tệp, nhãn nhóm hoặc văn bản bất kỳ
 * Phục vụ kiểm tra trùng lặp ngay khi người dùng chọn file hoặc đặt tên nhóm
 */
export function extractPotentialCCCDs(text?: string | null): string[] {
  if (!text) return [];
  const results: string[] = [];
  // Tìm chuỗi 12 số (CCCD) hoặc 9 số (CMND) được phân tách bởi ký tự không phải số
  const regex = /(?:^|\D)(\d{12}|\d{9})(?!\d)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && !results.includes(match[1])) {
      results.push(match[1]);
    }
  }
  return results;
}

/**
 * Tìm kiếm hồ sơ nhân sự đã tồn tại trong hệ thống có cùng số CCCD
 */
export function findSystemDuplicateCCCD(
  cccd: string,
  existingRecords: NhanSuRecord[]
): NhanSuRecord | undefined {
  const clean = normalizeCCCD(cccd);
  if (!clean || clean.length < 9) return undefined;
  return existingRecords.find(record => {
    if (!record.soCCCD) return false;
    return normalizeCCCD(record.soCCCD) === clean;
  });
}

/**
 * Tìm kiếm nhân sự khác trong cùng đợt tải hiện tại có cùng số CCCD
 */
export function findBatchDuplicateCCCD(
  cccd: string,
  currentId: string,
  employees: BatchEmployeeDraft[]
): { employee: BatchEmployeeDraft; index: number } | undefined {
  const clean = normalizeCCCD(cccd);
  if (!clean || clean.length < 9) return undefined;
  const idx = employees.findIndex(
    item => item.id !== currentId && normalizeCCCD(item.soCCCD) === clean
  );
  if (idx !== -1) {
    return { employee: employees[idx], index: idx };
  }
  return undefined;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  detectedCCCD: string;
  duplicateType: 'system' | 'batch';
  detectionSource: 'ocr' | 'filename' | 'label' | 'manual';
  matchedRecord?: NhanSuRecord;
  matchedBatchEmployee?: BatchEmployeeDraft;
  matchedBatchIndex?: number;
  message: string;
}

/**
 * Kiểm tra toàn diện trùng lặp CCCD cho một nhóm nhân viên:
 * 1. Sau khi OCR (hoặc người dùng nhập CCCD trong draft)
 * 2. Ngay khi chọn file (qua tên file chứa CCCD) hoặc nhập nhãn nhóm
 */
export function checkGroupDuplicateCCCD(
  group: EmployeeDocumentGroup,
  employeeDraft: BatchEmployeeDraft | undefined,
  existingRecords: NhanSuRecord[],
  allGroups: EmployeeDocumentGroup[] = [],
  allEmployees: BatchEmployeeDraft[] = []
): DuplicateDetectionResult | null {
  // 1. ƯU TIÊN KIỂM TRA SỐ CCCD ĐÃ TRÍCH XUẤT HOẶC NHẬP TAY (Sau khi OCR)
  if (employeeDraft?.soCCCD) {
    const cleanDraftCCCD = normalizeCCCD(employeeDraft.soCCCD);
    if (cleanDraftCCCD.length >= 9) {
      // Đối chiếu với danh sách NhanSuRecord hiện có trong hệ thống
      const sysMatch = findSystemDuplicateCCCD(cleanDraftCCCD, existingRecords);
      if (sysMatch) {
        const orgInfo = [sysMatch.khoi, sysMatch.ban, sysMatch.phong].filter(Boolean).join(' > ');
        return {
          isDuplicate: true,
          detectedCCCD: cleanDraftCCCD,
          duplicateType: 'system',
          detectionSource: 'ocr',
          matchedRecord: sysMatch,
          message: `Số CCCD ${cleanDraftCCCD} đã tồn tại trong hệ thống (Nhân viên: ${sysMatch.hoVaTen || 'Chưa rõ'}${sysMatch.chucVu ? ` - Chức vụ: ${sysMatch.chucVu}` : ''}${orgInfo ? ` - Đơn vị: ${orgInfo}` : ''}${sysMatch.id ? ` - Mã: ${sysMatch.id}` : ''}).`,
        };
      }

      // Đối chiếu với các nhân viên khác trong cùng đợt tải hiện tại
      const batchMatch = findBatchDuplicateCCCD(cleanDraftCCCD, group.id, allEmployees);
      if (batchMatch) {
        return {
          isDuplicate: true,
          detectedCCCD: cleanDraftCCCD,
          duplicateType: 'batch',
          detectionSource: 'ocr',
          matchedBatchEmployee: batchMatch.employee,
          matchedBatchIndex: batchMatch.index,
          message: `Số CCCD ${cleanDraftCCCD} bị trùng với Nhân viên ${batchMatch.index + 1} (${batchMatch.employee.hoVaTen || 'Chưa đặt tên'}) trong cùng đợt tải này.`,
        };
      }
    }
  }

  // 2. KIỂM TRA NGAY KHI CHỌN FILE HOẶC ĐẶT TÊN NHÓM (Trước khi bấm quét OCR)
  // Quét từ tên file đính kèm
  const filenameCCCDs = (group.documents || []).flatMap(doc => extractPotentialCCCDs(doc.fileName));
  // Quét từ nhãn nhóm (nếu người dùng gõ tên hoặc CCCD vào ô tên nhóm)
  const labelCCCDs = extractPotentialCCCDs(group.label);
  const potentialCCCDs = Array.from(new Set([...filenameCCCDs, ...labelCCCDs]));

  for (const cccd of potentialCCCDs) {
    const sysMatch = findSystemDuplicateCCCD(cccd, existingRecords);
    if (sysMatch) {
      const orgInfo = [sysMatch.khoi, sysMatch.ban, sysMatch.phong].filter(Boolean).join(' > ');
      const source = labelCCCDs.includes(cccd) ? 'label' : 'filename';
      return {
        isDuplicate: true,
        detectedCCCD: cccd,
        duplicateType: 'system',
        detectionSource: source,
        matchedRecord: sysMatch,
        message: `Phát hiện số CCCD ${cccd} từ ${source === 'filename' ? 'tên tệp đã chọn' : 'nhãn nhóm'} đã tồn tại trong hệ thống (Nhân viên: ${sysMatch.hoVaTen || 'Chưa rõ'}${sysMatch.chucVu ? ` - Chức vụ: ${sysMatch.chucVu}` : ''}${orgInfo ? ` - Đơn vị: ${orgInfo}` : ''}).`,
      };
    }

    // Kiểm tra trùng với các nhóm khác trong đợt tải
    const otherGroupIndex = allGroups.findIndex(g => {
      if (g.id === group.id) return false;
      const otherFilenameCCCDs = (g.documents || []).flatMap(d => extractPotentialCCCDs(d.fileName));
      const otherLabelCCCDs = extractPotentialCCCDs(g.label);
      return otherFilenameCCCDs.includes(cccd) || otherLabelCCCDs.includes(cccd);
    });

    if (otherGroupIndex !== -1) {
      const otherGroup = allGroups[otherGroupIndex];
      return {
        isDuplicate: true,
        detectedCCCD: cccd,
        duplicateType: 'batch',
        detectionSource: 'filename',
        matchedBatchIndex: otherGroupIndex,
        message: `Phát hiện số CCCD ${cccd} từ tệp đã chọn trùng với Nhân viên ${otherGroupIndex + 1} (${otherGroup.label || 'Chưa đặt tên'}) trong cùng đợt tải.`,
      };
    }
  }

  return null;
}
