import React, { useState } from 'react';
import { UserProfile } from '../types';
import { authenticateUser, requestPasswordReset, confirmPasswordReset } from '../utils/authStore';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  CheckCircle2,
  X,
  HelpCircle
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Trạng thái modal Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [hintCode, setHintCode] = useState('');

  // Xử lý gửi biểu mẫu đăng nhập
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Vui lòng nhập Tên đăng nhập hoặc Email đã được cấp.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authenticateUser(username.trim(), password);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(
          res.error ||
          'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng liên hệ Admin để được cấp tài khoản.'
        );
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  // Nạp nhanh tài khoản mẫu vào form
  const fillPreset = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setErrorMessage('');
  };

  // Bước 1 Quên mật khẩu: Gửi mã xác nhận qua email
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Vui lòng nhập email đăng ký tài khoản.');
      return;
    }

    setIsForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await requestPasswordReset(forgotEmail.trim());

      if (res.success) {
        setForgotSuccess(res.message);
        if (res.simulatedCode) {
          setHintCode(res.simulatedCode);
          setResetCode(res.simulatedCode); // tự động điền để test thuận tiện
        }
        setForgotStep(2);
      } else {
        setForgotError(res.error || 'Không tìm thấy tài khoản với email này.');
      }
    } catch (err) {
      setForgotError((err as Error).message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Bước 2 Quên mật khẩu: Xác nhận đổi mật khẩu mới
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setForgotError('Vui lòng nhập mã xác nhận 6 số gửi trong email.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsForgotLoading(true);
    setForgotError('');

    try {
      const res = await confirmPasswordReset(forgotEmail.trim(), resetCode.trim(), newPassword);

      if (res.success) {
        setSuccessMessage(
          res.message || 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.'
        );
        setShowForgotModal(false);
        setPassword(newPassword);
        setForgotStep(1);
        setForgotEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setHintCode('');
      } else {
        setForgotError(res.error || 'Không thể đổi mật khẩu.');
      }
    } catch (err) {
      setForgotError((err as Error).message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              HR Document AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Hệ Thống Quản Trị & Tuyển Dụng Nhân Sự Doanh Nghiệp
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Phân quyền tài khoản &bull; Quản lý bảo mật qua Email</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Đăng nhập tài khoản</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Vui lòng nhập Tên đăng nhập và Mật khẩu đã được cấp hoặc phê duyệt
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-tight">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-tight">{successMessage}</div>
            </div>
          )}

          {/* Form Đăng Nhập */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên đăng nhập hoặc Email đã cấp *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: tuyendung, admin, hoặc email..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-slate-50/50 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Mật khẩu *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotStep(1);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-slate-50/50 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Đang kiểm tra tài khoản...</span>
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Helper: Thông tin tài khoản mẫu để test phân quyền */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Tài khoản mẫu đã cấp để kiểm thử:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Preset 1: Admin */}
              <button
                type="button"
                onClick={() => fillPreset('admin', 'admin123')}
                className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1 text-purple-900 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Admin</span>
                </div>
                <div className="font-mono text-[10px] text-purple-800 mt-0.5">
                  admin / admin123
                </div>
                <div className="text-[9px] text-purple-600 mt-0.5">
                  Toàn quyền xem & sửa
                </div>
              </button>

              {/* Preset 2: Recruiter */}
              <button
                type="button"
                onClick={() => fillPreset('tuyendung', 'tuyendung123')}
                className="p-2.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1 text-sky-900 font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tuyển dụng</span>
                </div>
                <div className="font-mono text-[10px] text-sky-800 mt-0.5">
                  tuyendung / tuyendung123
                </div>
                <div className="text-[9px] text-sky-600 mt-0.5">
                  Chỉ nhập & điền hồ sơ
                </div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center italic">
              Bấm vào thẻ trên để điền tự động Tên đăng nhập & Mật khẩu
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400">
          Chỉ các tài khoản được Quản trị viên cấp phép mới có thể truy cập hệ thống
        </div>
      </div>

      {/* MODAL QUÊN MẬT KHẨU (GỬI MÃ QUA EMAIL) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl space-y-4 border border-slate-200 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Đặt Lại Mật Khẩu Qua Email
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bước {forgotStep}/2: {forgotStep === 1 ? 'Xác thực Email' : 'Nhập mã & Mật khẩu mới'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* BƯỚC 1: NHẬP EMAIL */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Vui lòng nhập địa chỉ Email nhân sự đã được liên kết với tài khoản của bạn. Hệ thống sẽ gửi mã xác minh 6 số để bạn đổi lại mật khẩu.
                </p>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Email đăng ký tài khoản *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="nhanvien@congty.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {isForgotLoading ? 'Đang gửi mã...' : 'Gửi Mã Xác Nhận'}
                  </button>
                </div>
              </form>
            )}

            {/* BƯỚC 2: NHẬP MÃ XÁC NHẬN & MẬT KHẨU MỚI */}
            {forgotStep === 2 && (
              <form onSubmit={handleConfirmReset} className="space-y-3">
                {hintCode && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
                    <strong>Mã xác nhận gửi về email của bạn là:</strong>{' '}
                    <span className="font-mono text-sm font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-300">
                      {hintCode}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mã xác nhận 6 chữ số *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Nhập 6 chữ số..."
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-base font-bold focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mật khẩu mới (Tối thiểu 6 ký tự) *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Xác nhận lại mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-blue-600"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    ← Gửi lại mã khác
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                    >
                      {isForgotLoading ? 'Đang đổi mật khẩu...' : 'Xác Nhận Đổi Mật Khẩu'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
