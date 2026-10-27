import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Download,
  UploadCloud,
  Check,
  ChevronDown,
  Info,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { TieuChuanLuongItem, UserProfile } from '../types';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logoutGoogle,
  auth
} from '../utils/googleWorkspaceAuth';
import {
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  fetchSheetValues,
  parseStandardRows,
  createStandardFormGoogleSheet,
  SpreadsheetMetadata,
  SheetTabInfo
} from '../utils/googleSheetsService';
import type { User } from 'firebase/auth';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentStandards: TieuChuanLuongItem[];
  onStandardsUpdated: (updatedList: TieuChuanLuongItem[]) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentStandards,
  onStandardsUpdated,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [sheetUrlOrId, setSheetUrlOrId] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [parsedItems, setParsedItems] = useState<TieuChuanLuongItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<{ [key: string]: string }>({});

  const [syncMode, setSyncMode] = useState<'merge' | 'replace'>('merge');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  // Handle Sign-in with Google
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setSuccessMessage(`Đã liên kết tài khoản Google: ${res.user.email}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    setMetadata(null);
    setParsedItems([]);
    setSuccessMessage('Đã ngắt kết nối tài khoản Google.');
  };

  // Handle Fetching Metadata (Tabs)
  const handleFetchSpreadsheet = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setExportSuccessUrl(null);

    const token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMessage('Vui lòng đăng nhập Google trước để cấp quyền đọc bảng tính.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!spreadsheetId) {
      setErrorMessage('Đường dẫn hoặc ID Google Sheet không hợp lệ. Vui lòng kiểm tra lại link bảng tính.');
      return;
    }

    setIsLoadingMetadata(true);
    try {
      const meta = await fetchSpreadsheetMetadata(spreadsheetId, token);
      setMetadata(meta);
      if (meta.sheets.length > 0) {
        // Look for preferred sheet names like "TieuChuanLuong", "Tiêu chuẩn lương", or first sheet
        const preferred = meta.sheets.find(s =>
          /tieuchuan|chuanluong|luong|sop|form/i.test(s.title.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
        ) || meta.sheets[0];
        setSelectedTab(preferred.title);
        // Automatically load data for preferred tab
        await loadTabRows(spreadsheetId, preferred.title, token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể đọc thông tin Google Sheet. Hãy chắc chắn rằng bạn có quyền xem bảng tính này.');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Handle reading tab data
  const loadTabRows = async (spreadsheetId: string, sheetName: string, token: string) => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const rawRows = await fetchSheetValues(spreadsheetId, sheetName, token);
      const parsed = parseStandardRows(rawRows);
      setParsedItems(parsed.items);
      setWarnings(parsed.warnings);
      setDetectedHeaders(parsed.detectedHeaders);
      if (parsed.items.length > 0) {
        setSuccessMessage(`Đã đọc ${parsed.items.length} vị trí chức danh và tiêu chuẩn lương từ tab "${sheetName}".`);
      } else {
        setErrorMessage(`Tab "${sheetName}" không có dữ liệu chức danh hoặc tiêu chuẩn lương phù hợp.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Lỗi đọc tab "${sheetName}".`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Switch tab selection
  const handleSelectTab = async (tabName: string) => {
    setSelectedTab(tabName);
    if (metadata && accessToken) {
      await loadTabRows(metadata.id, tabName, accessToken);
    }
  };

  // Export current system standards to a new Google Sheet on user's Google Drive
  const handleExportTemplateToDrive = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMessage('Vui lòng đăng nhập Google để tạo biểu mẫu trên Google Drive của bạn.');
      return;
    }

    if (!window.confirm('Tạo một bảng tính Google Sheets mới trên tài khoản Google Drive của bạn chứa toàn bộ form tiêu chuẩn hiện tại?')) {
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    try {
      const result = await createStandardFormGoogleSheet(
        `Biểu mẫu Tiêu chuẩn Lương & SOP [${new Date().toLocaleDateString('vi-VN')}]`,
        currentStandards,
        token
      );
      setExportSuccessUrl(result.spreadsheetUrl);
      setSheetUrlOrId(result.spreadsheetUrl);
      setSuccessMessage('Đã tạo thành công Google Sheet trên Drive của bạn!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo Google Sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  // Perform Final Sync to System
  const executeSync = async () => {
    setShowConfirmDialog(false);
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/sheets/tieu-chuan-luong/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({
          items: parsedItems,
          mode: syncMode,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Lỗi khi lưu dữ liệu tiêu chuẩn lên hệ thống.');
      }

      onStandardsUpdated(resData.list);
      setSuccessMessage(resData.message || 'Đồng bộ tiêu chuẩn lương thành công!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi đồng bộ vào hệ thống.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Kết nối Google Sheets lấy Form tiêu chuẩn
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Google Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Đọc bảng phân bậc chức danh, mức lương cơ bản và phụ cấp từ Google Sheet cá nhân hoặc công ty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Section 1: Google Account Connection */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {googleUser ? (
                <>
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-10 h-10 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center">
                      {googleUser.email?.[0].toUpperCase() || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">
                        {googleUser.displayName || 'Tài khoản Google'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        <Check className="w-3 h-3" /> Đã kết nối
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{googleUser.email}</div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800">Chưa liên kết tài khoản Google</div>
                    <div className="text-xs text-slate-500">
                      Cần cấp quyền đọc Google Sheets để nạp biểu mẫu tiêu chuẩn
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              {googleUser ? (
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đổi tài khoản
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  {isLoggingIn ? 'Đang kết nối...' : 'Đăng nhập với Google'}
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Input Spreadsheet URL or ID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Đường dẫn Google Sheets hoặc ID bảng tính:
              </label>
              <button
                type="button"
                onClick={handleExportTemplateToDrive}
                disabled={isExporting || !googleUser}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 disabled:opacity-50"
                title="Tạo một bản sao biểu mẫu chuẩn trực tiếp trên Google Drive của bạn"
              >
                {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Tạo bản mẫu chuẩn trên Drive của tôi
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={sheetUrlOrId}
                  onChange={(e) => setSheetUrlOrId(e.target.value)}
                  placeholder="Dán link ví dụ: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleFetchSpreadsheet}
                disabled={isLoadingMetadata || !sheetUrlOrId.trim() || !googleUser}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoadingMetadata ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang nạp bảng tính...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    Đọc dữ liệu bảng tính
                  </>
                )}
              </button>
            </div>

            {exportSuccessUrl && (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                <span>Đã tạo bảng mẫu thành công trên Drive!</span>
                <a
                  href={exportSuccessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-900"
                >
                  Mở Google Sheet trên tab mới <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Section 3: Sheet Metadata & Tab Selector */}
          {metadata && (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span className="font-semibold text-sm text-slate-800">{metadata.title}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {metadata.sheets.length} trang tính (sheet tabs)
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-medium text-slate-600 shrink-0">Chọn Tab dữ liệu:</span>
                {metadata.sheets.map((tab) => (
                  <button
                    key={tab.title}
                    type="button"
                    onClick={() => handleSelectTab(tab.title)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                      selectedTab === tab.title
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Preview Table */}
          {isLoadingData ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Đang phân tích các cột và chuẩn hóa số liệu từ Google Sheet...</p>
            </div>
          ) : parsedItems.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <span>Dữ liệu tiêu chuẩn nhận diện:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {parsedItems.length} vị trí chức danh
                  </span>
                </div>

                {/* Sync Mode Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Chế độ đồng bộ:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="syncMode"
                      value="merge"
                      checked={syncMode === 'merge'}
                      onChange={() => setSyncMode('merge')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Gộp & Cập nhật
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium ml-2">
                    <input
                      type="radio"
                      name="syncMode"
                      value="replace"
                      checked={syncMode === 'replace'}
                      onChange={() => setSyncMode('replace')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Ghi đè toàn bộ
                  </label>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-inner bg-slate-50/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">STT</th>
                      <th className="py-2.5 px-3">Công Việc</th>
                      <th className="py-2.5 px-3">Chức Danh / Vị Trí</th>
                      <th className="py-2.5 px-3 text-right">Lương Cơ Bản</th>
                      <th className="py-2.5 px-3 text-right">Phụ Cấp Cố Định</th>
                      <th className="py-2.5 px-3 text-right">Tổng Dự Kiến</th>
                      <th className="py-2.5 px-3">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.congViec}</td>
                        <td className="py-2 px-3 font-semibold text-emerald-700">{item.chucVu}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.luongCoBan?.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.phuCapCoDinh?.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {((item.luongCoBan || 0) + (item.phuCapCoDinh || 0)).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">
                          {item.moTa || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            {parsedItems.length > 0 ? (
              <span>Sẵn sàng nạp {parsedItems.length} tiêu chuẩn vào hệ thống.</span>
            ) : (
              <span>Vui lòng đăng nhập Google và nạp link bảng tính để bắt đầu.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isSyncing || parsedItems.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Đồng bộ vào hệ thống ({parsedItems.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Explicit Confirmation Dialog (Mandatory for modifying user data) */}
        {showConfirmDialog && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Xác nhận cập nhật dữ liệu tiêu chuẩn</h3>
              </div>

              <p className="text-sm text-slate-600">
                Bạn sắp cập nhật <strong>{parsedItems.length}</strong> chức danh và tiêu chuẩn lương từ Google Sheet vào hệ thống với chế độ{' '}
                <span className="font-semibold text-emerald-700">
                  {syncMode === 'replace' ? 'Ghi đè toàn bộ' : 'Gộp & Cập nhật'}
                </span>.
                {syncMode === 'replace' && (
                  <span className="block mt-2 text-rose-600 text-xs font-semibold">
                    Lưu ý: Toàn bộ danh mục tiêu chuẩn lương hiện tại sẽ được thay thế bằng danh sách mới.
                  </span>
                )}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeSync}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Đồng ý & Cập nhật
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
