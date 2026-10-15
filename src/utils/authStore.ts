import { SystemUserAccount, UserProfile } from '../types';
import { safeFetchJson } from './apiHelper';

const STORAGE_KEY_ACCOUNTS = 'hr_user_accounts';
const STORAGE_KEY_RESET_TOKENS = 'hr_reset_tokens';

// Danh sách tài khoản ban đầu mặc định
const INITIAL_ACCOUNTS: SystemUserAccount[] = [
  {
    id: 'usr_admin_01',
    username: 'admin',
    password: 'admin123',
    email: 'Happyendpu@gmail.com'.toLowerCase(),
    fullName: 'Quản Trị Viên Hệ Thống',
    role: 'admin',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'usr_admin_thang',
    username: 'tranvanthang',
    password: 'admin123',
    email: 'tranvanthang@congty.com'.toLowerCase(),
    fullName: 'Trần Văn Thắng (Quản Trị Viên)',
    role: 'admin',
    status: 'active',
    createdAt: '2026-09-05T08:00:00.000Z',
  },
  {
    id: 'usr_recruiter_01',
    username: 'tuyendung',
    password: 'tuyendung123',
    email: 'tuyendung@congty.com'.toLowerCase(),
    fullName: 'Nguyễn Thu Hà (Tuyển Dụng)',
    role: 'employee',
    status: 'active',
    createdAt: '2026-09-10T08:00:00.000Z',
  },
  {
    id: 'usr_recruiter_02',
    username: 'hr_mai',
    password: '123456',
    email: 'mai.tran@congty.com'.toLowerCase(),
    fullName: 'Trần Thị Mai (Chuyên viên Nhân sự)',
    role: 'employee',
    status: 'active',
    createdAt: '2026-09-15T08:00:00.000Z',
  },
];

// Lấy danh sách tài khoản từ localStorage
export function getStoredAccounts(): SystemUserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Đảm bảo các tài khoản mặc định luôn tồn tại
      const existingUsernames = new Set(parsed.map((u: SystemUserAccount) => u.username.toLowerCase()));
      const merged = [...parsed];
      for (const init of INITIAL_ACCOUNTS) {
        if (!existingUsernames.has(init.username.toLowerCase())) {
          merged.push(init);
        }
      }
      return merged;
    }
  } catch (e) {
    console.warn('Lỗi đọc accounts từ localStorage:', e);
  }
  return INITIAL_ACCOUNTS;
}

// Lưu danh sách tài khoản vào localStorage
export function saveStoredAccounts(accounts: SystemUserAccount[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Lỗi lưu accounts vào localStorage:', e);
  }
}

/**
 * Xác thực đăng nhập an toàn kết hợp Server API & Local Cache (Fallback khi mạng/CDN lỗi)
 */
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const result = await safeFetchJson<{success:boolean;user?:UserProfile;error?:string}>('/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:identifier.trim(),password}),
  });
  if (result.ok && result.data?.success && result.data.user?.sessionToken) return {success:true,user:result.data.user};
  return {success:false,error:result.data?.error || result.error || 'Không thể đăng nhập máy chủ. Vui lòng thử lại.'};
}

/**
 * Yêu cầu gửi mã đặt lại mật khẩu qua email
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string; simulatedCode?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Thử gọi API backend
  try {
    const res = await safeFetchJson<{
      success: boolean;
      message?: string;
      simulatedCode?: string;
      error?: string;
    }>('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    if (res.data?.success) {
      return {
        success: true,
        message: res.data.message || 'Mã xác nhận đã được gửi đến email.',
        simulatedCode: res.data.simulatedCode,
      };
    }
    if (res.data?.error) {
      return { success: false, message: '', error: res.data.error };
    }
  } catch (e) {
    console.warn('Server forgot-password API không phản hồi, fallback local:', e);
  }

  // Fallback kiểm tra trong store cục bộ
  const accounts = getStoredAccounts();
  const matched = accounts.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!matched) {
    return {
      success: false,
      message: '',
      error: `Không tìm thấy tài khoản nhân sự nào liên kết với email "${cleanEmail}".`,
    };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const tokens = JSON.parse(localStorage.getItem(STORAGE_KEY_RESET_TOKENS) || '{}');
    tokens[cleanEmail] = { code, expires: Date.now() + 15 * 60 * 1000 };
    localStorage.setItem(STORAGE_KEY_RESET_TOKENS, JSON.stringify(tokens));
  } catch (e) {
    console.warn(e);
  }

  return {
    success: true,
    message: `Đã gửi mã xác nhận 6 số đến email ${cleanEmail}. Vui lòng kiểm tra hộp thư email để lấy mã xác nhận.`,
    simulatedCode: code,
  };
}

/**
 * Xác nhận đặt lại mật khẩu mới
 */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  // Thử gọi server API
  try {
    const res = await safeFetchJson<{
      success: boolean;
      message?: string;
      error?: string;
    }>('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code: cleanCode,
        newPassword,
      }),
    });

    if (res.data?.success) {
      // Cập nhật luôn local store
      const accounts = getStoredAccounts();
      const user = accounts.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) {
        user.password = newPassword;
        saveStoredAccounts(accounts);
      }
      return { success: true, message: res.data.message };
    }
    if (res.data?.error) {
      return { success: false, error: res.data.error };
    }
  } catch (e) {
    console.warn('Server reset-password API không phản hồi, fallback local:', e);
  }

  // Fallback xử lý cục bộ
  try {
    const tokens = JSON.parse(localStorage.getItem(STORAGE_KEY_RESET_TOKENS) || '{}');
    const tokenInfo = tokens[cleanEmail];
    if (!tokenInfo || tokenInfo.code !== cleanCode || Date.now() > tokenInfo.expires) {
      return {
        success: false,
        error: 'Mã xác nhận không đúng hoặc đã hết hạn (quá 15 phút). Vui lòng thử lại.',
      };
    }

    const accounts = getStoredAccounts();
    const user = accounts.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Không tìm thấy tài khoản nhân viên tương ứng.' };
    }

    user.password = newPassword;
    saveStoredAccounts(accounts);
    delete tokens[cleanEmail];
    localStorage.setItem(STORAGE_KEY_RESET_TOKENS, JSON.stringify(tokens));

    return {
      success: true,
      message: `Đặt lại mật khẩu thành công cho tài khoản "${user.username}"! Bạn có thể dùng mật khẩu mới để đăng nhập ngay bây giờ.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
