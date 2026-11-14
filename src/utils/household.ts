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

export function foldHouseholdText(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function formatHouseholdBirthDate(raw?: string): string {
  const clean = householdText(raw);
  if (!clean) return '';
  const iso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`;
  }
  const dmy = clean.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  }
  return clean;
}

function isHeadRelation(relation?: string): boolean {
  const folded = foldHouseholdText(relation);
  return folded === 'CHU HO' || folded === 'BAN THAN (CHU HO)' || folded === 'CHU HO THUONG TRU';
}

function mergeMember(existing: ThanhVienHoGiaDinh, incoming: ThanhVienHoGiaDinh): ThanhVienHoGiaDinh {
  return {
    hoTen: existing.hoTen || incoming.hoTen,
    ngaySinh: existing.ngaySinh || incoming.ngaySinh,
    quanHeVoiChuHo: isHeadRelation(incoming.quanHeVoiChuHo)
      ? 'Chủ hộ'
      : existing.quanHeVoiChuHo || incoming.quanHeVoiChuHo,
    gioiTinh: existing.gioiTinh || incoming.gioiTinh,
    diaChiThuongTru: existing.diaChiThuongTru || incoming.diaChiThuongTru,
    quocTich: existing.quocTich || incoming.quocTich,
    danToc: existing.danToc || incoming.danToc,
  };
}

export interface VneidHouseholdRuleInput {
  members?: unknown;
  employee: {
    hoVaTen?: string;
    ngaySinh?: string;
    gioiTinh?: string;
    diaChiThuongTru?: string;
    danToc?: string;
    quocTich?: string;
  };
  hoTenChuHo?: string;
  quanHeChuHo?: string;
  chuHoInfo?: Partial<ThanhVienHoGiaDinh>;
  hasVneidContext?: boolean;
}

/**
 * Quy tắc lấy thành viên hộ gia đình từ VNeID ("Thông tin cư trú" -> "Thông tin chủ hộ thường trú"):
 * 1. Nếu chủ hộ thường trú chính là nhân viên mới (đương sự) -> lấy đương sự vào HouseholdMember[] với quanHeVoiChuHo = "Chủ hộ".
 * 2. Nếu chủ hộ thường trú khác nhân viên mới -> lấy CẢ chủ hộ thường trú ("Chủ hộ") VÀ nhân viên mới (theo mối quan hệ với chủ hộ) vào HouseholdMember[].
 */
export function applyVneidHouseholdRule(input: VneidHouseholdRuleInput): ThanhVienHoGiaDinh[] {
  const normalizedList = normalizeHouseholdMembers(input.members).map((m) => ({
    ...m,
    hoTen: m.hoTen.toUpperCase(),
    ngaySinh: formatHouseholdBirthDate(m.ngaySinh),
    quocTich: m.quocTich || 'Việt Nam',
  }));

  const empNameRaw = householdText(input.employee.hoVaTen).toUpperCase();
  const empNameFold = foldHouseholdText(empNameRaw);
  const headNameRaw = householdText(input.hoTenChuHo || input.chuHoInfo?.hoTen).toUpperCase();
  const headNameFold = foldHouseholdText(headNameRaw);
  const empRelationRaw = householdText(input.quanHeChuHo);
  const hasHeadFromList = normalizedList.some((m) => isHeadRelation(m.quanHeVoiChuHo));

  const hasContext = Boolean(
    input.hasVneidContext ||
      normalizedList.length > 0 ||
      headNameFold ||
      empRelationRaw
  );

  if (!hasContext) {
    return normalizedList;
  }

  const empMatchFromList = empNameFold
    ? normalizedList.find((m) => foldHouseholdText(m.hoTen) === empNameFold)
    : undefined;
  const headMatchFromList =
    normalizedList.find((m) => isHeadRelation(m.quanHeVoiChuHo)) ||
    (headNameFold ? normalizedList.find((m) => foldHouseholdText(m.hoTen) === headNameFold) : undefined);

  const isSelfHead = Boolean(
    (empNameFold && headNameFold && empNameFold === headNameFold) ||
      isHeadRelation(empRelationRaw) ||
      (empNameFold && headMatchFromList && foldHouseholdText(headMatchFromList.hoTen) === empNameFold) ||
      (!headNameFold && !hasHeadFromList && input.hasVneidContext && empNameFold)
  );

  const employeeAddress = householdText(input.employee.diaChiThuongTru);
  const employeeDob = formatHouseholdBirthDate(input.employee.ngaySinh);
  const employeeGender = householdText(input.employee.gioiTinh);
  const employeeEthnicity = householdText(input.employee.danToc);
  const employeeNationality = householdText(input.employee.quocTich) || 'Việt Nam';

  const resultMap = new Map<string, ThanhVienHoGiaDinh>();
  const upsertMember = (member: ThanhVienHoGiaDinh, preferFront = false) => {
    const clean: ThanhVienHoGiaDinh = {
      hoTen: householdText(member.hoTen).toUpperCase(),
      ngaySinh: formatHouseholdBirthDate(member.ngaySinh),
      quanHeVoiChuHo: householdText(member.quanHeVoiChuHo),
      gioiTinh: householdText(member.gioiTinh),
      diaChiThuongTru: householdText(member.diaChiThuongTru) || employeeAddress,
      quocTich: householdText(member.quocTich) || 'Việt Nam',
      danToc: householdText(member.danToc),
    };
    const key = foldHouseholdText(clean.hoTen) || `__ROW_${resultMap.size}`;
    const existing = resultMap.get(key);
    if (existing) {
      resultMap.set(key, mergeMember(existing, clean));
      return;
    }
    if (preferFront) {
      const entries = Array.from(resultMap.entries());
      resultMap.clear();
      resultMap.set(key, clean);
      entries.forEach(([k, v]) => resultMap.set(k, v));
    } else {
      resultMap.set(key, clean);
    }
  };

  if (isSelfHead) {
    if (empNameRaw || headNameRaw) {
      upsertMember(
        {
          hoTen: empNameRaw || headNameRaw,
          ngaySinh: employeeDob || formatHouseholdBirthDate(input.chuHoInfo?.ngaySinh || empMatchFromList?.ngaySinh),
          quanHeVoiChuHo: 'Chủ hộ',
          gioiTinh: employeeGender || householdText(input.chuHoInfo?.gioiTinh || empMatchFromList?.gioiTinh),
          diaChiThuongTru: employeeAddress || householdText(input.chuHoInfo?.diaChiThuongTru || empMatchFromList?.diaChiThuongTru),
          quocTich: employeeNationality || householdText(input.chuHoInfo?.quocTich || empMatchFromList?.quocTich) || 'Việt Nam',
          danToc: employeeEthnicity || householdText(input.chuHoInfo?.danToc || empMatchFromList?.danToc),
        },
        true
      );
    }
  } else {
    // Trường hợp 2: Chủ hộ thường trú khác nhân viên mới -> thêm CẢ Chủ hộ thường trú VÀ Nhân viên mới
    const resolvedHeadName = headNameRaw || headMatchFromList?.hoTen || '';
    if (resolvedHeadName) {
      upsertMember(
        {
          hoTen: resolvedHeadName,
          ngaySinh: formatHouseholdBirthDate(input.chuHoInfo?.ngaySinh || headMatchFromList?.ngaySinh),
          quanHeVoiChuHo: 'Chủ hộ',
          gioiTinh: householdText(input.chuHoInfo?.gioiTinh || headMatchFromList?.gioiTinh),
          diaChiThuongTru:
            householdText(input.chuHoInfo?.diaChiThuongTru || headMatchFromList?.diaChiThuongTru) || employeeAddress,
          quocTich: householdText(input.chuHoInfo?.quocTich || headMatchFromList?.quocTich) || 'Việt Nam',
          danToc: householdText(input.chuHoInfo?.danToc || headMatchFromList?.danToc),
        },
        true
      );
    }

    if (empNameRaw) {
      const resolvedEmpRelation =
        !isHeadRelation(empRelationRaw) && empRelationRaw
          ? empRelationRaw
          : empMatchFromList?.quanHeVoiChuHo && !isHeadRelation(empMatchFromList.quanHeVoiChuHo)
          ? empMatchFromList.quanHeVoiChuHo
          : 'Thành viên';

      upsertMember({
        hoTen: empNameRaw,
        ngaySinh: employeeDob || empMatchFromList?.ngaySinh || '',
        quanHeVoiChuHo: resolvedEmpRelation,
        gioiTinh: employeeGender || empMatchFromList?.gioiTinh || '',
        diaChiThuongTru: employeeAddress || empMatchFromList?.diaChiThuongTru || '',
        quocTich: employeeNationality,
        danToc: employeeEthnicity || empMatchFromList?.danToc || '',
      });
    }
  }

  // Giữ lại các thành viên khác đã đọc được từ VNeID và gộp không trùng lặp
  for (const member of normalizedList) {
    upsertMember(member);
  }

  return Array.from(resultMap.values()).filter((member) =>
    HOUSEHOLD_FIELDS.some((key) => Boolean(member[key]))
  );
}
