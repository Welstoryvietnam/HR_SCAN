export type Step3DecisionChoice =
  | 'chuyen_nhan_vien_moi'
  | 'khong_nhan_viec'
  | 'chuyen_dia_diem'
  | '';

export interface HealthStepLockableRecord {
  id: string;
  hoVaTen?: string;
  ngayHenKham?: string;
  ngayKhamSucKhoe?: string;
  trangThai?: string;
  ghiChuHangMucKhongDat?: string;
  trangThaiNhanViec?: 'Chưa xử lý' | 'Đã nhận việc' | 'Không nhận việc';
  luaChonSauKham?: Step3DecisionChoice;
  step3Confirmed?: boolean;
  step3ConfirmedAt?: string;
  step3ConfirmedBy?: string;
}

export const isCompletedKskStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('đã khám') || s.includes('đạt') || s.includes('không đạt');
};

export const isStep3ConfirmedLocked = (reg: HealthStepLockableRecord): boolean =>
  Boolean(reg.step3Confirmed && reg.luaChonSauKham);

export const isStep2LockedForUser = (
  reg: HealthStepLockableRecord,
  isAdmin: boolean
): boolean => !isAdmin && isStep3ConfirmedLocked(reg);

export const getStep3ChoiceShortLabel = (choice?: Step3DecisionChoice): string => {
  if (choice === 'chuyen_nhan_vien_moi') return 'Chuyển NV mới';
  if (choice === 'khong_nhan_viec') return 'Không nhận việc';
  if (choice === 'chuyen_dia_diem') return 'Chuyển địa điểm';
  return '';
};

export function applyStep2ItemPatch<T extends HealthStepLockableRecord>(
  sourceList: T[],
  draftList: T[],
  id: string,
  patch: Partial<T>,
  isAdmin: boolean
): { nextDrafts: T[]; blockedLockedFields: boolean } {
  const source = sourceList.find((r) => r.id === id) || draftList.find((r) => r.id === id);
  if (source && isStep2LockedForUser(source, isAdmin)) {
    const safePatch: Partial<T> = { ...patch };
    const triedLockedField =
      'trangThai' in safePatch || 'ngayKhamSucKhoe' in safePatch;
    delete safePatch.trangThai;
    delete safePatch.ngayKhamSucKhoe;

    if (Object.keys(safePatch).length === 0) {
      return {
        nextDrafts: draftList,
        blockedLockedFields: triedLockedField,
      };
    }

    return {
      nextDrafts: draftList.map((r) => (r.id === id ? { ...r, ...safePatch } : r)),
      blockedLockedFields: triedLockedField,
    };
  }

  return {
    nextDrafts: draftList.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    blockedLockedFields: false,
  };
}

export function applyStep2SaveResults<T extends HealthStepLockableRecord>(
  sourceList: T[],
  draftList: T[],
  isAdmin: boolean,
  fallbackDate: string = new Date().toISOString().slice(0, 10)
): T[] {
  const sourceById = new Map<string, T>(sourceList.map((item) => [item.id, item]));

  return draftList.map((r) => {
    const source = sourceById.get(r.id);
    if (source && isStep2LockedForUser(source, isAdmin)) {
      return {
        ...r,
        trangThai: source.trangThai,
        ngayKhamSucKhoe: source.ngayKhamSucKhoe,
        luaChonSauKham: source.luaChonSauKham,
        trangThaiNhanViec: source.trangThaiNhanViec,
        step3Confirmed: source.step3Confirmed,
        step3ConfirmedAt: source.step3ConfirmedAt,
        step3ConfirmedBy: source.step3ConfirmedBy,
      };
    }
    if (isCompletedKskStatus(r.trangThai) && !r.ngayKhamSucKhoe) {
      return {
        ...r,
        ngayKhamSucKhoe: r.ngayHenKham || fallbackDate,
      };
    }
    return r;
  });
}

export function applyStep3ToggleChoice<T extends HealthStepLockableRecord>(
  list: T[],
  id: string,
  choice: Exclude<Step3DecisionChoice, ''>
): { nextList: T[]; unlockedFromConfirmed: boolean; nextChoice: Step3DecisionChoice } {
  const target = list.find((r) => r.id === id);
  const nextChoice: Step3DecisionChoice = target?.luaChonSauKham === choice ? '' : choice;
  const nextTrangThaiNhanViec: HealthStepLockableRecord['trangThaiNhanViec'] =
    nextChoice === 'chuyen_nhan_vien_moi'
      ? 'Đã nhận việc'
      : nextChoice === 'khong_nhan_viec'
      ? 'Không nhận việc'
      : 'Chưa xử lý';
  const unlockedFromConfirmed = nextChoice === '' && Boolean(target?.step3Confirmed);

  const nextList = list.map((r) =>
    r.id === id
      ? {
          ...r,
          luaChonSauKham: nextChoice,
          trangThaiNhanViec: nextTrangThaiNhanViec,
          // Chỉ khóa Bước 2 sau khi nhấn "Lưu lựa chọn Bước 3"; bỏ chọn sẽ mở khóa Bước 2 ngay
          step3Confirmed: false,
          step3ConfirmedAt: undefined,
          step3ConfirmedBy: undefined,
        }
      : r
  );

  return { nextList, unlockedFromConfirmed, nextChoice };
}

export function applyStep3ConfirmSave<T extends HealthStepLockableRecord>(
  list: T[],
  confirmedBy: string,
  nowIso: string = new Date().toISOString()
): { nextList: T[]; lockedCount: number } {
  const nextList = list.map((r) => {
    if (r.luaChonSauKham) {
      return {
        ...r,
        step3Confirmed: true,
        step3ConfirmedAt: r.step3Confirmed && r.step3ConfirmedAt ? r.step3ConfirmedAt : nowIso,
        step3ConfirmedBy: r.step3Confirmed && r.step3ConfirmedBy ? r.step3ConfirmedBy : confirmedBy,
      };
    }
    return {
      ...r,
      step3Confirmed: false,
      step3ConfirmedAt: undefined,
      step3ConfirmedBy: undefined,
    };
  });

  const lockedCount = nextList.filter((r) => isStep3ConfirmedLocked(r)).length;
  return { nextList, lockedCount };
}
