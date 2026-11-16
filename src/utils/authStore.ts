import type { SystemUserAccount, UserProfile } from '../types';
import { safeFetchJson } from './apiHelper';

export const AUTH_USER_STORAGE_KEY = 'hr_current_user';
export const AUTH_ACCOUNTS_STORAGE_KEY = 'hr_user_accounts';
export const AUTH_SESSION_EXPIRED_EVENT = 'hr-auth-session-expired';

export const HRM_ROLE_LABELS: Record<string, string> = {
  nhan_vien_tuyen_dung: 'Nhân viên tuyển dụng',
  nhan_vien_y_te: 'Nhân viên y tế',
  nhan_vien_quan_ly_ho_so: 'Nhân viên quản lý hồ sơ',
  truong_nhom_cnb: 'Trưởng nhóm C&B',
  truong_nhom_tuyen_dung: 'Trưởng nhóm tuyển dụng',
  admin: 'Admin (Full quyền)',
  quan_ly_nhan_su: 'Quản lý nhân sự',
  nhan_vien_nhan_su: 'Nhân viên nhân sự',
};

export function normalizeUserProfile(raw: Partial<UserProfile> & Record<string, any>): UserProfile {
  const isAdmin =
    raw.role === 'admin' ||
    raw.hrmRole === 'admin' ||
    String(raw.username || '').toLowerCase() === 'admin';
  const role: 'admin' | 'employee' = isAdmin ? 'admin' : 'employee';
  const validSubRoles = [
    'nhan_vien_tuyen_dung',
    'nhan_vien_y_te',
    'nhan_vien_quan_ly_ho_so',
    'truong_nhom_cnb',
    'truong_nhom_tuyen_dung',
    'quan_ly_nhan_su',
    'nhan_vien_nhan_su',
    'admin',
  ];
  const hrmRole = (
    isAdmin
      ? 'admin'
      : validSubRoles.includes(String(raw.hrmRole || ''))
      ? raw.hrmRole
      : 'nhan_vien_tuyen_dung'
  ) as UserProfile['hrmRole'];

  return {
    id: String(raw.id || (isAdmin ? 'usr_admin_01' : 'usr_employee')),
    username: String(raw.username || raw.employeeCode || (isAdmin ? 'admin' : '')),
    email: String(raw.email || (isAdmin ? 'admin@hrm.local' : '')),
    name: String(raw.name || raw.fullName || raw.username || (isAdmin ? 'Quản trị viên Hệ thống' : 'Nhân viên')),
    role,
    hrmRole,
    displayName:
      raw.displayName ||
      HRM_ROLE_LABELS[hrmRole || 'nhan_vien_tuyen_dung'] ||
      'Nhân viên tuyển dụng',
    employeeCode: raw.employeeCode || raw.username,
    department: raw.department,
    contactEmail: raw.contactEmail || raw.email,
    sessionToken: raw.sessionToken ? String(raw.sessionToken) : undefined,
  };
}

export function getStoredSessionUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.sessionToken) {
      return null;
    }
    return normalizeUserProfile(parsed);
  } catch {
    return null;
  }
}

export function saveStoredSessionUser(user: UserProfile): UserProfile {
  const normalized = normalizeUserProfile(user);
  try {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage quota errors
  }
  return normalized;
}

export function clearStoredSessionUser(): void {
  try {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem('hr_reset_tokens');
  } catch {
    // ignore
  }
}

export function getStoredAccounts(): SystemUserAccount[] {
  try {
    return JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_STORAGE_KEY) || '[]').map(
      ({ password, passwordHash, ...account }: any) => account
    );
  } catch {
    return [];
  }
}

export function saveStoredAccounts(accounts: SystemUserAccount[]) {
  try {
    localStorage.setItem(
      AUTH_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(accounts.map(({ password, passwordHash, ...account }: any) => account))
    );
  } catch {
    // ignore
  }
}

export async function authenticateUser(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const trimmedIdentifier = identifier.trim();
  const result = await safeFetchJson<{ success: boolean; user?: UserProfile; error?: string }>(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedIdentifier, password }),
    }
  );

  if (result.ok && result.data?.success && result.data.user?.sessionToken) {
    const normalizedUser = saveStoredSessionUser(result.data.user);
    return { success: true, user: normalizedUser };
  }

  return {
    success: false,
    error: result.data?.error || result.error || 'Không thể đăng nhập máy chủ. Vui lòng thử lại.',
  };
}

export async function verifyCurrentSession(): Promise<{
  valid: boolean;
  user?: UserProfile;
  unauthorized?: boolean;
}> {
  const stored = getStoredSessionUser();
  if (!stored?.sessionToken) {
    return { valid: false, unauthorized: true };
  }

  const result = await safeFetchJson<UserProfile & { error?: string }>('/api/auth/me', {
    method: 'GET',
    headers: {
      'x-user-email': stored.email,
    },
  });

  if (result.ok && result.data && result.data.id) {
    const merged = saveStoredSessionUser({
      ...stored,
      ...result.data,
      sessionToken: result.data.sessionToken || stored.sessionToken,
    });
    return { valid: true, user: merged };
  }

  if (result.status === 401 || result.status === 403) {
    clearStoredSessionUser();
    return { valid: false, unauthorized: true };
  }

  // Network/temporary error: preserve existing local session so offline state is not lost
  return { valid: true, user: stored };
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string; error?: string; simulatedCode?: string }> {
  const result = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }
  );
  return {
    success: !!(result.ok && result.data?.success),
    message: result.data?.message || '',
    error: result.data?.error || result.error,
  };
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const result = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
    '/api/auth/reset-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      }),
    }
  );
  return {
    success: !!(result.ok && result.data?.success),
    message: result.data?.message,
    error: result.data?.error || result.error,
  };
}
