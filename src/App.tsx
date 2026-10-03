import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  OptimizedImageFile,
  GeminiExtractionResult,
  TieuChuanLuongItem,
  NhanSuRecord,
  EmailLogItem,
  BatchEmployeeDraft
} from './types';
import { Header, AppTab } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { DocumentUploader } from './components/DocumentUploader';
import { ExtractedForm } from './components/ExtractedForm';
import { NhanSuTable } from './components/NhanSuTable';
import { TieuChuanLuongManager } from './components/TieuChuanLuongManager';
import { EmailViewer } from './components/EmailViewerModal';
import { Dashboard } from './components/Dashboard';
import { UserManagement } from './components/UserManagement';
import { SopProgressHeader } from './components/SopProgressHeader';
import { safeFetchJson } from './utils/apiHelper';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function App() {
  // Trạng thái phiên đăng nhập & thông tin người dùng
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('hr_current_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('hr_current_user'));
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('upload');
  const [images, setImages] = useState<OptimizedImageFile[]>([]);
  const [extractedData, setExtractedData] = useState<GeminiExtractionResult | null>(null);
  const [batchEmployees, setBatchEmployees] = useState<BatchEmployeeDraft[]>([]);
  const [currentSopStep, setCurrentSopStep] = useState<number>(1);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [tieuChuanLuong, setTieuChuanLuong] = useState<TieuChuanLuongItem[]>([]);
  const [records, setRecords] = useState<NhanSuRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Tải dữ liệu Tiêu chuẩn lương (Sheet "TieuChuanLuong")
  const loadTieuChuanLuong = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; data: TieuChuanLuongItem[] }>(
        '/api/sheets/tieu-chuan-luong'
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTieuChuanLuong(res.data.data);
      }
    } catch (err) {
      console.warn('Lỗi tải tiêu chuẩn lương:', err);
    }
  };

  // Lấy dữ liệu hồ sơ nhân sự (Sheet "DanhSachNhanSu") có phân quyền theo email
  const loadRecords = async (email: string) => {
    try {
      const res = await safeFetchJson<{ success: boolean; data: NhanSuRecord[] }>(
        '/api/sheets/danh-sach-nhan-su',
        {
          headers: { 'x-user-email': email },
        }
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRecords(res.data.data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách hồ sơ:', err);
    }
  };

  // Lấy lịch sử email MailApp
  const loadEmailLogs = async (email: string) => {
    try {
      const res = await safeFetchJson<{ logs: EmailLogItem[] }>('/api/email-logs', {
        headers: { 'x-user-email': email },
      });
      if (Array.isArray(res.data?.logs)) {
        setEmailLogs(res.data.logs);
      }
    } catch (err) {
      console.warn('Lỗi tải email logs:', err);
    }
  };

  // Khởi tạo ban đầu khi người dùng đã đăng nhập
  useEffect(() => {
    if (currentUser?.email) {
      loadTieuChuanLuong();
      loadRecords(currentUser.email);
      loadEmailLogs(currentUser.email);
    }
  }, [currentUser?.email]);

  // Xử lý khi đăng nhập thành công
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('hr_current_user', JSON.stringify(user));
    setActiveTab('upload');
    loadTieuChuanLuong();
    loadRecords(user.email);
    loadEmailLogs(user.email);
    showNotification('success', `Đăng nhập thành công: ${user.name} (${user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên tuyển dụng'})`);
  };

  // Xử lý khi đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('hr_current_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setImages([]);
    setExtractedData(null);
    setBatchEmployees([]);
    setCurrentSopStep(1);
    showNotification('success', 'Đã đăng xuất khỏi hệ thống thành công.');
  };

  // Bảo vệ tab theo phân quyền: Nếu không phải Admin thì chỉ được ở tab upload hoặc records
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      if (activeTab === 'dashboard' || activeTab === 'salary' || activeTab === 'emails' || activeTab === 'users') {
        setActiveTab('upload');
      }
    }
  }, [activeTab, currentUser]);

  // Gọi Gemini Multimodal AI trích xuất thông tin
  const handleExtractAI = async () => {
    if (images.length === 0) {
      showNotification('error', 'Vui lòng chọn hoặc chụp ít nhất một ảnh tài liệu.');
      return;
    }

    setIsProcessingAI(true);
    try {
      const payload = {
        images: images.map((img) => ({
          fileName: img.fileName,
          docType: img.docType,
          mimeType: img.mimeType,
          base64Data: img.base64Data,
        })),
      };

      const res = await safeFetchJson<{ success: boolean; data?: any; error?: string }>(
        '/api/ai/extract-documents',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok || !res.data?.success || !res.data?.data) {
        console.warn('AI Vision API cảnh báo hoặc gián đoạn:', res.error);
        // Tự động kích hoạt hồ sơ bán tự động để người dùng không bị kẹt ở Bước 1
        const fallbackData: GeminiExtractionResult = {
          hoVaTen: '',
          ngaySinh: '',
          gioiTinh: 'Nam',
          soCCCD: '',
          ngayCap: '',
          noiCap: 'Cục Cảnh sát QLHC về TTXH',
          queQuan: '',
          diaChiThuongTru: '',
          nguonDiaChi: 'VNeID',
          ghiChuSapNhap: 'Chờ đối soát ảnh tài liệu tại Bước 2',
          soDienThoai: '',
          congViecDuKien: '',
          chucVu: '',
          thongTinGiaDinh: [],
          thongTinChuaRo: ['Họ và tên', 'Số CCCD (12 số)', 'Ngày sinh', 'Địa chỉ thường trú'],
          cauHoiLamRo: [
            'Hệ thống AI đang tải cao điểm hoặc ảnh chụp có định dạng đặc thù. Vui lòng đối chiếu nhanh ảnh tài liệu bên cạnh để hoàn tất Bước 2!',
          ],
          mucDoTinCay: 'CAN_XAC_NHAN',
        };
        setExtractedData(fallbackData);
        setCurrentSopStep(2);
        showNotification(
          'success',
          'Đã chuyển sang Bước 2 (Kiểm tra & Bổ sung). Vui lòng đối chiếu ảnh tài liệu bên phải để xác nhận thông tin!'
        );
        return;
      }

      const extractedInfo = res.data.data;
      setExtractedData(extractedInfo);
      setCurrentSopStep(2);

      if (extractedInfo.cauHoiLamRo && extractedInfo.cauHoiLamRo.length > 0) {
        showNotification(
          'success',
          `AI đã trích xuất theo Bước 2 SOP. Phát hiện ${extractedInfo.cauHoiLamRo.length} câu hỏi làm rõ theo nguyên tắc chống suy đoán!`
        );
      } else {
        showNotification(
          'success',
          `AI Vision đã trích xuất thành công hồ sơ: ${extractedInfo.hoVaTen || 'Ứng viên'}!`
        );
      }
    } catch (err) {
      console.warn('Thông báo trích xuất tài liệu:', (err as Error).message);
      // Khi gặp ngoại lệ trình duyệt (như Safari Pattern error), vẫn mở Bước 2 với ảnh gốc hiển thị
      const fallbackData: GeminiExtractionResult = {
        hoVaTen: '',
        ngaySinh: '',
        gioiTinh: 'Nam',
        soCCCD: '',
        ngayCap: '',
        noiCap: 'Cục Cảnh sát QLHC về TTXH',
        queQuan: '',
        diaChiThuongTru: '',
        nguonDiaChi: 'VNeID',
        ghiChuSapNhap: 'Chờ đối soát ảnh tài liệu tại Bước 2',
        soDienThoai: '',
        congViecDuKien: '',
        chucVu: '',
        thongTinGiaDinh: [],
        thongTinChuaRo: ['Họ và tên', 'Số CCCD (12 số)', 'Ngày sinh', 'Địa chỉ thường trú'],
        cauHoiLamRo: [
          'Trình duyệt gặp trở ngại khi nén ảnh tự động. Vui lòng đối chiếu nhanh ảnh tài liệu bên cạnh để hoàn tất hồ sơ!',
        ],
        mucDoTinCay: 'CAN_XAC_NHAN',
      };
      setExtractedData(fallbackData);
      setCurrentSopStep(2);
      showNotification(
        'success',
        'Đã mở biểu mẫu Bước 2 đối chiếu ảnh trực tiếp. Vui lòng kiểm tra và xác nhận hồ sơ.'
      );
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Lưu hồ sơ vào Sheet "DanhSachNhanSu" và kích hoạt gửi email
  const handleSaveToSheet = async (formData: any): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        userEmail: currentUser.email,
        soTaiLieuDinhKem: images.length,
      };

      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        '/api/sheets/danh-sach-nhan-su',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể lưu hồ sơ vào Sheet.');
      }

      showNotification(
        'success',
        `Đã lưu hồ sơ của ${formData.hoVaTen} vào Sheet "DanhSachNhanSu" & gửi email xác nhận thành công!`
      );

      // Cập nhật lại danh sách và email logs
      await loadRecords(currentUser.email);
      await loadEmailLogs(currentUser.email);

      // Chuyển tab sang bảng hồ sơ để người dùng kiểm tra ngay
      setActiveTab('records');
      return true;
    } catch (err) {
      showNotification('error', (err as Error).message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Lưu danh sách nhiều hồ sơ vào Sheet "DanhSachNhanSu" (Batch Mode)
  const handleSaveBatchToSheet = async (batchList: BatchEmployeeDraft[]): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSaving(true);
    try {
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        '/api/sheets/danh-sach-nhan-su/batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify({
            employees: batchList,
            userEmail: currentUser.email,
          }),
        }
      );

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể lưu danh sách hồ sơ hàng loạt.');
      }

      showNotification(
        'success',
        `Đã lưu thành công ${batchList.length} nhân sự vào Google Sheets và gửi email xác nhận!`
      );

      // Cập nhật lại danh sách và email logs
      await loadRecords(currentUser.email);
      await loadEmailLogs(currentUser.email);

      // Chuyển tab sang bảng hồ sơ để người dùng kiểm tra ngay
      setActiveTab('records');
      return true;
    } catch (err) {
      showNotification('error', (err as Error).message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Cập nhật/Sửa toàn bộ hồ sơ (Dành riêng cho Quản trị viên - Admin)
  const handleEditRecord = async (updatedRecord: NhanSuRecord): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        `/api/sheets/danh-sach-nhan-su/${updatedRecord.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify(updatedRecord),
        }
      );

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể cập nhật hồ sơ.');
      }

      showNotification(
        'success',
        `Quản trị viên đã cập nhật thành công hồ sơ của ${updatedRecord.hoVaTen}!`
      );
      await loadRecords(currentUser.email);
      return true;
    } catch (err) {
      showNotification('error', (err as Error).message);
      return false;
    }
  };

  // Lưu / Cập nhật tiêu chuẩn lương (Admin)
  const handleSaveStandard = async (item: Partial<TieuChuanLuongItem>) => {
    if (!currentUser) return;
    try {
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        '/api/sheets/tieu-chuan-luong',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify(item),
        }
      );

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể lưu tiêu chuẩn lương.');
      }

      showNotification('success', 'Đã cập nhật Sheet "TieuChuanLuong" thành công!');
      loadTieuChuanLuong();
    } catch (err) {
      showNotification('error', (err as Error).message);
      throw err;
    }
  };

  // Xóa tiêu chuẩn lương (Admin)
  const handleDeleteStandard = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        `/api/sheets/tieu-chuan-luong/${id}`,
        {
          method: 'DELETE',
          headers: { 'x-user-email': currentUser.email },
        }
      );
      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể xóa tiêu chuẩn lương.');
      }
      showNotification('success', 'Đã xóa chức vụ khỏi Sheet "TieuChuanLuong".');
      loadTieuChuanLuong();
    } catch (err) {
      showNotification('error', (err as Error).message);
    }
  };

  // Xóa hồ sơ (Admin)
  const handleDeleteRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        `/api/sheets/danh-sach-nhan-su/${id}`,
        {
          method: 'DELETE',
          headers: { 'x-user-email': currentUser.email },
        }
      );
      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể xóa hồ sơ.');
      }
      showNotification('success', 'Đã xóa hồ sơ khỏi Sheet "DanhSachNhanSu".');
      loadRecords(currentUser.email);
    } catch (err) {
      showNotification('error', (err as Error).message);
    }
  };

  // NẾU CHƯA ĐĂNG NHẬP: Hiển thị Màn Hình Đăng Nhập chuyên dụng
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recordsCount={records.length}
      />

      {/* Floating Notifications */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
          <div
            className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
                : 'bg-rose-900 text-rose-50 border-rose-700'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Banner hiển thị vai trò */}
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                isAdmin
                  ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                  : 'bg-sky-50/80 border-sky-200 text-sky-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                ) : (
                  <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span>
                  {isAdmin ? (
                    <>
                      <strong>Quản trị viên (Admin):</strong> Bạn có toàn quyền xem, sửa, xóa tất cả hồ sơ, cập nhật bảng lương tiêu chuẩn và xem Dashboard.
                    </>
                  ) : (
                    <>
                      <strong>Nhân viên tuyển dụng:</strong> Bạn đang ở giao diện chuyên biệt để thực hiện tiếp nhận, quét AI, nhập và điền thông tin hồ sơ ứng viên.
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Thanh tiến trình SOP 4 Bước */}
            <SopProgressHeader
              currentStep={currentSopStep}
              onSelectStep={(step) => {
                setCurrentSopStep(step);
              }}
              hasImages={images.length > 0}
              hasExtractedData={!!extractedData}
              step2Verified={!!extractedData && !!extractedData.hoVaTen}
              step3Verified={currentSopStep >= 4}
            />

            {/* BƯỚC 1: Chỉ hiện màn hình Uploader khi currentSopStep === 1 */}
            {currentSopStep === 1 && (
              <div className="space-y-4">
                {extractedData && (
                  <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Hồ sơ của <strong>{extractedData.hoVaTen || 'Ứng viên'}</strong> đã được trích xuất sẵn.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentSopStep(2)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Tiếp tục xử lý Bước 2 (Form Chuẩn)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <DocumentUploader
                  images={images}
                  onImagesChange={(newImgs) => {
                    setImages(newImgs);
                  }}
                  onExtractAI={handleExtractAI}
                  isProcessingAI={isProcessingAI}
                  onProceedToStep2Direct={() => {
                    if (images.length === 0) {
                      showNotification('error', 'Vui lòng chọn hoặc chụp ít nhất một ảnh tài liệu.');
                      return;
                    }
                    setCurrentSopStep(2);
                    showNotification('success', 'Đã chuyển sang Bước 2 (Kiểm tra & Bổ sung). Bạn có thể xem ảnh và biểu mẫu song song.');
                  }}
                  batchEmployees={batchEmployees}
                  onBatchEmployeesChange={setBatchEmployees}
                  onProceedToStep2WithBatch={(list) => {
                    setBatchEmployees(list);
                    if (list.length > 0) {
                      const first = list[0];
                      setExtractedData({
                        hoVaTen: first.hoVaTen,
                        ngaySinh: first.ngaySinh,
                        gioiTinh: first.gioiTinh,
                        soCCCD: first.soCCCD,
                        ngayCap: first.ngayCap,
                        noiCap: first.noiCap,
                        queQuan: first.queQuan,
                        diaChiThuongTru: first.diaChiThuongTru,
                        nguonDiaChi: first.nguonDiaChi,
                        ghiChuSapNhap: first.ghiChuSapNhap,
                        soDienThoai: first.soDienThoai,
                        congViecDuKien: first.congViecDuKien || 'Đầu Bếp',
                        chucVu: first.chucVu || 'Bếp Trưởng',
                        thongTinGiaDinh: first.thongTinGiaDinh || [],
                        thongTinChuaRo: [],
                        cauHoiLamRo: [],
                      });
                    }
                    setCurrentSopStep(2);
                  }}
                />
              </div>
            )}

            {/* BƯỚC 2, 3, 4: Chỉ hiện màn hình của Bước đang làm việc */}
            {currentSopStep >= 2 && (
              <div className="space-y-4">
                {/* Thanh trạng thái hồ sơ tinh gọn trên đầu workspace */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Đang xử lý:{' '}
                      <strong className="text-slate-900 uppercase">
                        {batchEmployees.length > 1
                          ? `${batchEmployees.length} nhân sự (Hàng loạt)`
                          : extractedData?.hoVaTen || 'Hồ sơ nhân sự'}
                      </strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">
                      {batchEmployees.length > 1
                        ? `Danh sách: ${batchEmployees.length} người`
                        : `Tài liệu: ${images.length} ảnh`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentSopStep(1)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white border border-slate-300 rounded-lg hover:border-blue-300 transition cursor-pointer"
                    >
                      ← Đổi danh sách/ảnh (Bước 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImages([]);
                        setExtractedData(null);
                        setBatchEmployees([]);
                        setCurrentSopStep(1);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 rounded-lg hover:border-rose-300 transition cursor-pointer"
                    >
                      + Nhập hồ sơ mới
                    </button>
                  </div>
                </div>

                {/* Form chi tiết hiển thị DUY NHẤT bước tương ứng */}
                <ExtractedForm
                  initialData={extractedData}
                  tieuChuanLuongList={tieuChuanLuong}
                  userEmail={currentUser.email}
                  onSaveToSheet={handleSaveToSheet}
                  isSaving={isSaving}
                  onStepChange={(step) => setCurrentSopStep(step)}
                  currentStep={currentSopStep}
                  onBackToStep1={() => setCurrentSopStep(1)}
                  onResetNewRecord={() => {
                    setImages([]);
                    setExtractedData(null);
                    setBatchEmployees([]);
                    setCurrentSopStep(1);
                  }}
                  uploadedImagesCount={images.length}
                  batchEmployees={batchEmployees}
                  onBatchEmployeesChange={setBatchEmployees}
                  onSaveBatchToSheet={handleSaveBatchToSheet}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab Bảng hồ sơ nhân sự (Sheet DanhSachNhanSu) */}
        {activeTab === 'records' && (
          <NhanSuTable
            records={records}
            currentUser={currentUser}
            onRefresh={() => loadRecords(currentUser.email)}
            onDeleteRecord={isAdmin ? handleDeleteRecord : undefined}
            onEditRecord={isAdmin ? handleEditRecord : undefined}
            tieuChuanLuongList={tieuChuanLuong}
          />
        )}

        {/* CÁC TAB CHỈ QUẢN TRỊ VIÊN MỚI TRUY CẬP ĐƯỢC */}
        {isAdmin && activeTab === 'dashboard' && (
          <Dashboard
            records={records}
            currentUser={currentUser}
            standards={tieuChuanLuong}
          />
        )}

        {isAdmin && activeTab === 'salary' && (
          <TieuChuanLuongManager
            standards={tieuChuanLuong}
            currentUser={currentUser}
            onSaveStandard={handleSaveStandard}
            onDeleteStandard={handleDeleteStandard}
          />
        )}

        {isAdmin && activeTab === 'emails' && (
          <EmailViewer
            emailLogs={emailLogs}
            userEmail={currentUser.email}
            isAdmin={true}
          />
        )}

        {isAdmin && activeTab === 'users' && (
          <UserManagement currentUser={currentUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hệ thống Nhập liệu Hồ sơ Nhân sự AI &bull; Google Sheets + Gemini Vision + MailApp
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Tài khoản: {currentUser.email} &bull; Vai trò:{' '}
            <strong className={isAdmin ? 'text-purple-700' : 'text-sky-700'}>
              {isAdmin ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN TUYỂN DỤNG'}
            </strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
