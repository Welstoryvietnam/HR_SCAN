import type { BatchEmployeeDraft, EmployeeDocumentGroup, IntakeFormDraft } from '../types';

export interface OfflineBackupData {
  savedAt: string;
  step: number;
  employees: BatchEmployeeDraft[];
  groups: EmployeeDocumentGroup[];
  formState?: IntakeFormDraft;
}

const STORAGE_KEY = 'hr_offline_unsaved_backup';

export function saveOfflineBackup(data: {
  step: number;
  employees: BatchEmployeeDraft[];
  groups: EmployeeDocumentGroup[];
  formState?: IntakeFormDraft;
}): void {
  try {
    const payload: OfflineBackupData = {
      savedAt: new Date().toISOString(),
      step: data.step,
      employees: data.employees,
      groups: data.groups,
      formState: data.formState,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Unable to save offline backup to localStorage', e);
  }
}

export function loadOfflineBackup(): OfflineBackupData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearOfflineBackup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
