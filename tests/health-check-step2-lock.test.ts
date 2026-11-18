import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStep3ConfirmedLocked,
  isStep2LockedForUser,
  applyStep2ItemPatch,
  applyStep2SaveResults,
  applyStep3ToggleChoice,
  applyStep3ConfirmSave,
  type HealthStepLockableRecord,
} from '../src/utils/healthCheckStepLock.js';

const baseCandidate = (): HealthStepLockableRecord => ({
  id: 'reg-100',
  hoVaTen: 'Nguyễn Văn A',
  ngayHenKham: '2026-11-15',
  ngayKhamSucKhoe: '2026-11-16',
  trangThai: 'Đã khám (Đạt)',
  ghiChuHangMucKhongDat: '',
  trangThaiNhanViec: 'Chưa xử lý',
  luaChonSauKham: '',
  step3Confirmed: false,
});

test('Step 2 stays unlocked when Step 3 checkbox is only toggled and not yet saved', () => {
  const initial = [baseCandidate()];
  const toggled = applyStep3ToggleChoice(initial, 'reg-100', 'chuyen_nhan_vien_moi');

  assert.equal(toggled.nextChoice, 'chuyen_nhan_vien_moi');
  assert.equal(isStep3ConfirmedLocked(toggled.nextList[0]), false);
  assert.equal(isStep2LockedForUser(toggled.nextList[0], false), false);
});

test('Step 2 locks Trạng thái KSK and Ngày khám for medical staff after Step 3 Save, while Ghi chú remains editable', () => {
  const initial = [baseCandidate()];
  const toggled = applyStep3ToggleChoice(initial, 'reg-100', 'chuyen_nhan_vien_moi');
  const savedStep3 = applyStep3ConfirmSave(toggled.nextList, 'Nhân viên Tuyển dụng', '2026-11-16T10:00:00.000Z');

  assert.equal(savedStep3.lockedCount, 1);
  assert.equal(isStep3ConfirmedLocked(savedStep3.nextList[0]), true);
  assert.equal(isStep2LockedForUser(savedStep3.nextList[0], false), true);

  // Medical staff tries to change trangThai and ngayKhamSucKhoe -> blocked
  const blockedAttempt = applyStep2ItemPatch(
    savedStep3.nextList,
    savedStep3.nextList,
    'reg-100',
    { trangThai: 'Đã khám (không đạt)', ngayKhamSucKhoe: '2026-11-20' },
    false
  );
  assert.equal(blockedAttempt.blockedLockedFields, true);
  assert.equal(blockedAttempt.nextDrafts[0].trangThai, 'Đã khám (Đạt)');
  assert.equal(blockedAttempt.nextDrafts[0].ngayKhamSucKhoe, '2026-11-16');

  // Medical staff updates ghiChuHangMucKhongDat -> allowed!
  const noteUpdate = applyStep2ItemPatch(
    savedStep3.nextList,
    blockedAttempt.nextDrafts,
    'reg-100',
    { ghiChuHangMucKhongDat: 'Bổ sung lưu ý huyết áp nhẹ' },
    false
  );
  assert.equal(noteUpdate.blockedLockedFields, false);
  assert.equal(noteUpdate.nextDrafts[0].ghiChuHangMucKhongDat, 'Bổ sung lưu ý huyết áp nhẹ');

  // Even if draft somehow mutated status/date, Step 2 Save preserves locked status/date while persisting notes
  const tamperedDrafts = noteUpdate.nextDrafts.map((item) => ({
    ...item,
    trangThai: 'Hoãn',
    ngayKhamSucKhoe: '2026-12-01',
  }));
  const savedStep2 = applyStep2SaveResults(savedStep3.nextList, tamperedDrafts, false, '2026-11-16');
  assert.equal(savedStep2[0].trangThai, 'Đã khám (Đạt)');
  assert.equal(savedStep2[0].ngayKhamSucKhoe, '2026-11-16');
  assert.equal(savedStep2[0].ghiChuHangMucKhongDat, 'Bổ sung lưu ý huyết áp nhẹ');
});

test('Admin can still edit all fields at Step 2 even after Step 3 confirmation', () => {
  const initial = [baseCandidate()];
  const toggled = applyStep3ToggleChoice(initial, 'reg-100', 'chuyen_dia_diem');
  const savedStep3 = applyStep3ConfirmSave(toggled.nextList, 'Tuyển dụng', '2026-11-16T10:00:00.000Z');

  assert.equal(isStep2LockedForUser(savedStep3.nextList[0], true), false);

  const adminPatch = applyStep2ItemPatch(
    savedStep3.nextList,
    savedStep3.nextList,
    'reg-100',
    {
      trangThai: 'Đã khám (không đạt)',
      ngayKhamSucKhoe: '2026-11-18',
      ghiChuHangMucKhongDat: 'Admin cập nhật ngoại lệ',
    },
    true
  );
  assert.equal(adminPatch.blockedLockedFields, false);
  const adminSaved = applyStep2SaveResults(savedStep3.nextList, adminPatch.nextDrafts, true, '2026-11-16');
  assert.equal(adminSaved[0].trangThai, 'Đã khám (không đạt)');
  assert.equal(adminSaved[0].ngayKhamSucKhoe, '2026-11-18');
  assert.equal(adminSaved[0].ghiChuHangMucKhongDat, 'Admin cập nhật ngoại lệ');
});

test('Unchecking Step 3 decision automatically unlocks Step 2 for medical staff', () => {
  const initial = [baseCandidate()];
  const checked = applyStep3ToggleChoice(initial, 'reg-100', 'khong_nhan_viec');
  const confirmed = applyStep3ConfirmSave(checked.nextList, 'Tuyển dụng', '2026-11-16T10:00:00.000Z');
  assert.equal(isStep2LockedForUser(confirmed.nextList[0], false), true);

  // Uncheck the same option in Step 3
  const unchecked = applyStep3ToggleChoice(confirmed.nextList, 'reg-100', 'khong_nhan_viec');
  assert.equal(unchecked.nextChoice, '');
  assert.equal(unchecked.unlockedFromConfirmed, true);
  assert.equal(isStep3ConfirmedLocked(unchecked.nextList[0]), false);
  assert.equal(isStep2LockedForUser(unchecked.nextList[0], false), false);

  // Medical staff can edit status and date again
  const editAfterUnlock = applyStep2ItemPatch(
    unchecked.nextList,
    unchecked.nextList,
    'reg-100',
    { trangThai: 'Hoãn', ngayKhamSucKhoe: '2026-11-22' },
    false
  );
  assert.equal(editAfterUnlock.blockedLockedFields, false);
  assert.equal(editAfterUnlock.nextDrafts[0].trangThai, 'Hoãn');
  assert.equal(editAfterUnlock.nextDrafts[0].ngayKhamSucKhoe, '2026-11-22');
});
