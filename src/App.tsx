import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  UserProfile,
  OptimizedImageFile,
  DocumentExtractionResult,
  TieuChuanLuongItem,
  NhanSuRecord,
  EmailLogItem,
  BatchEmployeeDraft,
  EmployeeDocumentGroup,
  EmployeeIntakeInfo,
  IntakeDraftSummary,
  IntakeFormDraft,
  KhoiNode
} from './types';
import { DEFAULT_ORGANIZATION_HIERARCHY } from './data/organizationHierarchy';
import { Header, AppTab } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { DocumentUploader } from './components/DocumentUploader';
import { IntakeDraftBar } from './components/IntakeDraftBar';
import { draftRequest, saveIntakeDraft, openIntakeDraft, type ActiveDraft } from './utils/intakeDraftApi';
import { ExtractedForm } from './components/ExtractedForm';
import { NhanSuTable } from './components/NhanSuTable';
import { TieuChuanLuongManager } from './components/TieuChuanLuongManager';
import { HealthCheckStandardsManager } from './components/HealthCheckStandardsManager';
import { EmailViewer } from './components/EmailViewerModal';

import { UserManagement } from './components/UserManagement';
import { SopProgressHeader } from './components/SopProgressHeader';
import { safeFetchJson } from './utils/apiHelper';
import { saveOfflineBackup, loadOfflineBackup, clearOfflineBackup, type OfflineBackupData } from './utils/offlineStorage';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Edit3,
  Save,
  HardDrive
} from 'lucide-react';

export default function App() {
  // Trạng thái phiên đăng nhập & thông tin người dùng
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('hr_current_user');
      if (saved) {
        const user = JSON.parse(saved);
        return user?.sessionToken ? user : null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem('hr_current_user') || 'null')?.sessionToken);
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('upload');
  const [images, setImages] = useState<OptimizedImageFile[]>([]);
  const [extractedData, setExtractedData] = useState<DocumentExtractionResult | null>(null);
  const [batchEmployees, setBatchEmployees] = useState<BatchEmployeeDraft[]>([]);
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeDocumentGroup[]>([]);
  const [singleIntakeInfo, setSingleIntakeInfo] = useState<EmployeeIntakeInfo>({});
  const [currentSopStep, setCurrentSopStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDraft,setActiveDraft] = useState<ActiveDraft|null>(null);
  const activeDraftRef = useRef<ActiveDraft|null>(null);
  activeDraftRef.current=activeDraft;
  const [drafts,setDrafts] = useState<IntakeDraftSummary[]>([]);
  const [draftBusy,setDraftBusy] = useState(false);
  const [draftStatus,setDraftStatus] = useState('');
  const [draftError,setDraftError] = useState('');
  const [draftSavedAt,setDraftSavedAt] = useState('');
  const [draftCompleted,setDraftCompleted] = useState(false);
  const [uploaderBusy,setUploaderBusy] = useState(false);
  const [formGeneration,setFormGeneration] = useState(0);
  const [draftFormState,setDraftFormState] = useState<IntakeFormDraft|undefined>();
  const [saveNetworkError, setSaveNetworkError] = useState<{ message: string; actionType: 'single' | 'batch'; lastData?: any } | null>(null);
  const [offlineBackup, setOfflineBackup] = useState<OfflineBackupData | null>(() => loadOfflineBackup());

  const [transferredCandidate, setTransferredCandidate] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('hr_transfer_recruitment_candidate');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      if (transferredCandidate) {
        localStorage.setItem('hr_transfer_recruitment_candidate', JSON.stringify(transferredCandidate));
      } else {
        localStorage.removeItem('hr_transfer_recruitment_candidate');
      }
    } catch {}
  }, [transferredCandidate]);

  const handleTransferCandidate = (reg: any) => {
    setTransferredCandidate(reg);
    const draft: BatchEmployeeDraft = {
      id: crypto.randomUUID(),
      hoVaTen: reg.hoVaTen,
      soCCCD: reg.soCCCD,
      ngaySinh: reg.ngaySinh || '2000-01-01',
      gioiTinh: reg.gioiTinh || 'Nam',
      soDienThoai: reg.soDienThoai || '',
      khoi: reg.phongBanKhoi || '',
      chucVu: reg.chucVu || 'Nhân viên',
      congViecDuKien: reg.viTriViecLam || 'Nhân sự',
      queQuan: '',
      diaChiThuongTru: '',
      ngayCap: '',
      noiCap: '',
      thongTinGiaDinh: [],
      thanhVienHoGiaDinh: [],
      thongTinChuaRo: [],
      cauHoiLamRo: [],
      luongCoBan: 5000000,
      phuCapCoDinh: 1000000,
      phuCapPhatSinh: 0,
      tongThuNhapDuKien: 6000000,
      soTaiLieuDinhKem: 0,
    };
    setSingleIntakeInfo(draft);
    setBatchEmployees([draft]);
    setActiveTab('upload');
    setCurrentSopStep(1);
    showNotification('success', `Đã chuyển thông tin ứng viên ${reg.hoVaTen} sang Đăng ký nhân viên mới!`);
  };

  const draftReader = useRef<{read: () => IntakeFormDraft}>(null);
  const changeSopStep = (step:number) => {
    if (step === 1 && draftReader.current) setDraftFormState(draftReader.current.read());
    setCurrentSopStep(step);
  };
  const draftOwner = useRef(currentUser?.email);
  draftOwner.current = currentUser?.email;

  const refreshDrafts = async () => {
    const owner = currentUser?.email;
    setDraftBusy(true);setDraftStatus('Đang tải danh sách bản nháp…');setDraftError('');
    try {
      const list = await draftRequest<IntakeDraftSummary[]>('');
      if (draftOwner.current === owner) setDrafts(list);
    } catch (error) {if (draftOwner.current === owner) setDraftError((error as Error).message);}
    finally {if (draftOwner.current === owner) setDraftBusy(false);}
  };
  const saveDraft = async () => {
    if (draftBusy || isSaving || uploaderBusy || !currentUser || draftCompleted) return;
    const owner = currentUser.email;
    setDraftBusy(true);setDraftStatus('Đang chuẩn bị bản nháp…');setDraftError('');
    try {
      const saved = await saveIntakeDraft({step:Math.min(currentSopStep,4),employees:batchEmployees,groups:employeeGroups,form:draftReader.current?.read() || draftFormState},activeDraft,
        draft => {if (draftOwner.current === owner) {setActiveDraft(draft);setDraftSavedAt('');}},
        message => {if (draftOwner.current === owner) setDraftStatus(message);});
      if (draftOwner.current !== owner) return;
      setActiveDraft({id:saved.id,version:saved.version});setDraftSavedAt(saved.timestamp);
      setDrafts(previous => [saved,...previous.filter(item => item.id !== saved.id)]);
      showNotification('success','Đã lưu tạm cả thông tin và tài liệu lên cloud. Bạn có thể mở trên thiết bị khác.');
    } catch (error) {if (draftOwner.current === owner) setDraftError((error as Error).message);}
    finally {if (draftOwner.current === owner) setDraftBusy(false);}
  };
  const saveExtractionCheckpoint = async (employees:BatchEmployeeDraft[],groups:EmployeeDocumentGroup[]) => {
    const owner=currentUser?.email;
    if(!owner || draftCompleted || draftOwner.current!==owner) throw new Error('Phiên làm việc đã thay đổi.');
    setDraftStatus('Đang lưu kết quả quét lên cloud…');setDraftSavedAt('');setDraftError('');
    try {
      const saved=await saveIntakeDraft({step:1,employees,groups,form:draftFormState},activeDraftRef.current,
        draft=>{if(draftOwner.current===owner) {activeDraftRef.current=draft;setActiveDraft(draft);}},
        message=>{if(draftOwner.current===owner) setDraftStatus(message);});
      if(draftOwner.current!==owner) return;
      const active={id:saved.id,version:saved.version};activeDraftRef.current=active;setActiveDraft(active);
      setDraftSavedAt(saved.timestamp);setDraftStatus('Đã tự lưu tiến độ quét lên cloud.');
      setDrafts(previous=>[saved,...previous.filter(item=>item.id!==saved.id)]);
    } catch(error) {
      if(draftOwner.current===owner) setDraftError((error as Error).message);
      throw error;
    }
  };
  const openDraft = async (draft: IntakeDraftSummary) => {
    if ((batchEmployees.length || employeeGroups.some(group => group.label || group.documents.length)) && !window.confirm('Mở bản nháp sẽ thay nội dung đang nhập trên màn hình. Bạn đã lưu tạm các thay đổi cần giữ chưa?')) return;
    const owner = currentUser?.email;
    setDraftBusy(true);setDraftError('');setDraftStatus('Đang mở bản nháp…');
    try {
      const {active,snapshot} = await openIntakeDraft(draft.id,setDraftStatus);
      if (draftOwner.current !== owner) return;
      setImages(snapshot.groups.flatMap(group => group.documents));setEmployeeGroups(snapshot.groups);
      setBatchEmployees(snapshot.employees);
      setExtractedData(snapshot.employees[0] as DocumentExtractionResult || null);
      setSingleIntakeInfo(snapshot.form?.employee || {});setDraftFormState(snapshot.form);setActiveDraft(active);setDraftSavedAt(draft.timestamp);setDraftCompleted(false);
      setFormGeneration(previous => previous+1);setCurrentSopStep(snapshot.step);setActiveTab('upload');
    } catch (error) {if (draftOwner.current === owner) setDraftError((error as Error).message);}
    finally {if (draftOwner.current === owner) setDraftBusy(false);}
  };
  const discardDraft = async (draft: IntakeDraftSummary) => {
    const owner = currentUser?.email;
    setDraftBusy(true);setDraftError('');setDraftStatus('Đang xóa bản nháp và tài liệu tạm…');
    try {
      await draftRequest(`/${draft.id}`,'DELETE',{version:draft.version});
      if (draftOwner.current !== owner) return;
      setDrafts(previous => previous.filter(item => item.id !== draft.id));
      if (activeDraft?.id === draft.id) {setActiveDraft(null);setDraftSavedAt('');}
    } catch (error) {if (draftOwner.current === owner) setDraftError((error as Error).message);}
    finally {if (draftOwner.current === owner) setDraftBusy(false);}
  };
  const markDraftCompleted = (cleanupPending?: boolean) => {
    setDraftCompleted(true);setActiveDraft(null);setDraftSavedAt('');
    if (activeDraft) setDrafts(previous => previous.filter(draft => draft.id !== activeDraft.id));
    if (cleanupPending) setDraftError('Hồ sơ đã lưu thành công, nhưng chưa dọn hết tài liệu tạm. Mở Bản nháp của tôi → Làm mới → Bỏ bản nháp để thử dọn lại.');
  };

  const [tieuChuanLuong, setTieuChuanLuong] = useState<TieuChuanLuongItem[]>([]);
  const [organizationHierarchy, setOrganizationHierarchy] = useState<KhoiNode[]>(() => {
    try {
      const saved = localStorage.getItem('hr_org_hierarchy');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ORGANIZATION_HIERARCHY;
  });
  const [records, setRecords] = useState<NhanSuRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Tải dữ liệu Cơ cấu tổ chức
  const loadOrganizationHierarchy = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; data: KhoiNode[] }>(
        '/api/organization-hierarchy'
      );
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setOrganizationHierarchy(res.data.data);
        localStorage.setItem('hr_org_hierarchy', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.warn('Lỗi tải cơ cấu tổ chức:', err);
    }
  };

  // Lưu cơ cấu tổ chức (Admin)
  const handleSaveOrganizationHierarchy = async (newHierarchy: KhoiNode[]) => {
    if (!currentUser) return;
    try {
      const res = await safeFetchJson<{ success: boolean; data: KhoiNode[]; tieuChuanKksList?: any }>(
        '/api/organization-hierarchy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
          },
          body: JSON.stringify({ hierarchy: newHierarchy }),
        }
      );
      if (!res.ok || !res.data?.success) {
        throw new Error('Không thể lưu cơ cấu tổ chức lên máy chủ.');
      }
      setOrganizationHierarchy(newHierarchy);
      localStorage.setItem('hr_org_hierarchy', JSON.stringify(newHierarchy));
      if (res.data.tieuChuanKksList) {
        localStorage.setItem('hr_health_check_standards', JSON.stringify(res.data.tieuChuanKksList));
      }
      showNotification('success', 'Đã lưu cơ cấu tổ chức và tự động đồng bộ danh sách phòng khám KSK định kỳ thành công!');
    } catch (err) {
      showNotification('error', (err as Error).message);
      setOrganizationHierarchy(newHierarchy);
      localStorage.setItem('hr_org_hierarchy', JSON.stringify(newHierarchy));
    }
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
      } else {
        showNotification('error',res.error || 'Không tải được hồ sơ đã lưu. Vui lòng thử lại.');
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
      loadOrganizationHierarchy();
      loadRecords(currentUser.email);
      loadEmailLogs(currentUser.email);
    }
  }, [currentUser?.email]);

  // Refresh the saved list when returning to this device or browser tab.
  useEffect(() => {
    if (!currentUser?.email) return;
    const refresh = () => { if (document.visibilityState === 'visible') void loadRecords(currentUser.email); };
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return () => { window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh); };
  },[currentUser?.email]);

  // Xử lý khi đăng nhập thành công
  const handleLoginSuccess = (user: UserProfile) => {
    localStorage.removeItem('hr_user_accounts');
    localStorage.removeItem('hr_reset_tokens');
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('hr_current_user', JSON.stringify(user));
    const isMedical = user.role !== 'admin' && user.hrmRole === 'nhan_vien_y_te';
    setActiveTab(isMedical ? 'health' : 'upload');
    showNotification(
      'success',
      `Đăng nhập thành công: ${user.name} (${
        user.role === 'admin' ? 'Quản trị viên' : isMedical ? 'Nhân viên y tế' : 'Nhân viên tuyển dụng'
      })`
    );
  };

  // Xử lý khi đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('hr_user_accounts');
    localStorage.removeItem('hr_reset_tokens');
    localStorage.removeItem('hr_current_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setImages([]);
    setExtractedData(null);
    setBatchEmployees([]);
    setEmployeeGroups([]);
    setSingleIntakeInfo({});
    setCurrentSopStep(1);
    setActiveDraft(null);setDrafts([]);setDraftSavedAt('');setDraftError('');setDraftBusy(false);setDraftCompleted(false);setUploaderBusy(false);
    setDraftFormState(undefined);
    showNotification('success', 'Đã đăng xuất khỏi hệ thống thành công.');
  };

  // Bảo vệ tab theo phân quyền: Nhân viên tuyển dụng được truy cập upload/records/health; Nhân viên y tế được truy cập health
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      const isMedical = currentUser.hrmRole === 'nhan_vien_y_te';
      if (isMedical) {
        if (activeTab !== 'health') {
          setActiveTab('health');
        }
      } else if (activeTab === 'emails' || activeTab === 'users' || activeTab === 'organization' || activeTab === 'salary') {
        setActiveTab('upload');
      }
    }
  }, [activeTab, currentUser]);

  // Lưu hồ sơ vào Sheet "DanhSachNhanSu" và kích hoạt gửi email
  const handleSaveToSheet = async (formData: any): Promise<boolean> => {
    return handleSavePersonnel(formData);
  };

  const handleSavePersonnel = async (formData: EmployeeIntakeInfo): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSaving(true);
    setSaveNetworkError(null);
    try {
      const payload = {
        ...formData,
        userEmail: currentUser.email,
        soTaiLieuDinhKem: images.length,
        draftId:activeDraft?.id,draftVersion:activeDraft?.version,
      };

      const res = await safeFetchJson<{ success: boolean; error?: string; draftCleanupPending?: boolean }>(
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

      markDraftCompleted(res.data.draftCleanupPending);
      clearOfflineBackup();
      setOfflineBackup(null);

      showNotification(
        'success',
        `Đã lưu hồ sơ của ${formData.hoVaTen || formData.hoTen || 'nhân viên'} lên hệ thống.`
      );

      // Cập nhật lại danh sách và email logs
      await loadRecords(currentUser.email);
      await loadEmailLogs(currentUser.email);

      return true;
    } catch (err) {
      const msg = (err as Error).message;
      saveOfflineBackup({ step: currentSopStep, employees: batchEmployees, groups: employeeGroups, formState: draftReader.current?.read() || draftFormState });
      setOfflineBackup(loadOfflineBackup());
      setSaveNetworkError({ message: msg, actionType: 'single', lastData: formData });
      showNotification('error', msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Lưu danh sách nhiều hồ sơ vào Sheet "DanhSachNhanSu" (Batch Mode)
  const handleSaveBatchToSheet = async (batchList: BatchEmployeeDraft[]): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSaving(true);
    setSaveNetworkError(null);
    try {
      const res = await safeFetchJson<{ success: boolean; error?: string; draftCleanupPending?: boolean }>(
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
            draftId:activeDraft?.id,draftVersion:activeDraft?.version,
          }),
        }
      );

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || res.data?.error || 'Không thể lưu danh sách hồ sơ hàng loạt.');
      }

      markDraftCompleted(res.data.draftCleanupPending);
      clearOfflineBackup();
      setOfflineBackup(null);

      showNotification(
        'success',
        `Đã lưu thành công ${batchList.length} hồ sơ nhân sự lên hệ thống.`
      );

      // Cập nhật lại danh sách và email logs
      await loadRecords(currentUser.email);
      await loadEmailLogs(currentUser.email);

      return true;
    } catch (err) {
      const msg = (err as Error).message;
      saveOfflineBackup({ step: currentSopStep, employees: batchList, groups: employeeGroups, formState: draftReader.current?.read() || draftFormState });
      setOfflineBackup(loadOfflineBackup());
      setSaveNetworkError({ message: msg, actionType: 'batch', lastData: batchList });
      showNotification('error', msg);
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
      showNotification('success', 'Đã xóa hồ sơ khỏi hệ thống.');
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
        onTabChange={tab=>{if(uploaderBusy) {showNotification('error','Hãy tạm dừng quét trước khi chuyển màn hình.');return;}setActiveTab(tab);}}
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

      {/* Main Content Area - Tràn viền tối ưu 100% diện tích thao tác */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
        {/* BANNER NỔI BẬT: CẢNH BÁO MẤT KẾT NỐI MÁY CHỦ VÀ NÚT HÀNH ĐỘNG THỬ LẠI / NHẬP TAY */}
        {saveNetworkError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/95 p-4 shadow-md text-rose-950 space-y-3 animate-fade-in" role="alert">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm text-rose-900">
                  {saveNetworkError.message || 'Mất kết nối tới máy chủ. Hãy kiểm tra mạng rồi thử lưu lại. Giữ nguyên trang để tránh mất dữ liệu chưa lưu.'}
                </h4>
                <p className="text-xs text-rose-800">
                  ⚠️ Dữ liệu của bạn đã được <strong>tự động lưu tạm an toàn vào máy (Offline Backup)</strong>. Bạn có thể nhấn nút <strong>Thử lưu lại</strong> khi mạng ổn định hoặc nhấn <strong>Nhập tay / Chỉnh sửa thủ công</strong> để tiếp tục làm việc trực tiếp.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-rose-200">
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  if (saveNetworkError.actionType === 'batch' && saveNetworkError.lastData) {
                    await handleSaveBatchToSheet(saveNetworkError.lastData);
                  } else if (saveNetworkError.actionType === 'single' && saveNetworkError.lastData) {
                    await handleSavePersonnel(saveNetworkError.lastData);
                  } else {
                    saveDraft();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
                {isSaving ? 'Đang thử lưu lại…' : '⚡ Thử lưu lại'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentSopStep === 1) changeSopStep(2);
                  setSaveNetworkError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 transition cursor-pointer shadow-xs"
              >
                <Edit3 className="h-4 w-4 text-amber-600" />
                ✏️ Nhập tay / Mở bảng đối chiếu
              </button>

              <button
                type="button"
                onClick={() => {
                  saveOfflineBackup({
                    step: currentSopStep,
                    employees: batchEmployees,
                    groups: employeeGroups,
                    formState: draftReader.current?.read() || draftFormState
                  });
                  showNotification('success', 'Đã xác nhận sao lưu Offline dữ liệu hiện tại vào trình duyệt.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs"
              >
                <HardDrive className="h-3.5 w-3.5 text-slate-600" />
                💾 Sao lưu tạm vào máy
              </button>

              <button
                type="button"
                onClick={() => setSaveNetworkError(null)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 ml-auto"
              >
                Ẩn thông báo
              </button>
            </div>
          </div>
        )}

        {/* BANNER KHÔI PHỤC BẢN SAO LƯU OFFLINE NẾU CÓ */}
        {offlineBackup && !saveNetworkError && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Phát hiện bản sao lưu Offline trên thiết bị (Lưu lúc {new Date(offlineBackup.savedAt).toLocaleString('vi-VN')} với {offlineBackup.employees.length} nhân viên).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (offlineBackup.employees?.length) setBatchEmployees(offlineBackup.employees);
                  if (offlineBackup.groups?.length) setEmployeeGroups(offlineBackup.groups);
                  if (offlineBackup.formState) setDraftFormState(offlineBackup.formState);
                  if (offlineBackup.step) changeSopStep(offlineBackup.step);
                  showNotification('success', 'Đã khôi phục dữ liệu từ bản sao lưu Offline trên thiết bị.');
                }}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 font-bold transition cursor-pointer"
              >
                Khôi phục bản lưu máy
              </button>
              <button
                type="button"
                onClick={() => {
                  clearOfflineBackup();
                  setOfflineBackup(null);
                }}
                className="rounded-lg border border-slate-300 bg-white text-slate-700 px-2.5 py-1.5 font-medium hover:bg-slate-100 cursor-pointer"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4 animate-fade-in">
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
                      <strong>Quản trị viên (Admin):</strong> Bạn có toàn quyền xem, sửa, xóa tất cả hồ sơ, cập nhật bảng lương tiêu chuẩn.
                    </>
                  ) : (
                    <>
                      <strong>Nhân viên tuyển dụng:</strong> Bạn đang ở giao diện chuyên biệt để thực hiện tiếp nhận, quét AI, nhập và điền thông tin hồ sơ ứng viên.
                    </>
                  )}
                </span>
              </div>
            </div>

            <fieldset disabled={draftBusy || isSaving} className="min-w-0 space-y-4">
            {/* Thanh tiến trình SOP 4 Bước (Tối ưu: Chỉ giữ tên bước) */}
            {currentSopStep === 1 && <SopProgressHeader
              currentStep={currentSopStep}
              onSelectStep={(step) => {
                if(uploaderBusy) {showNotification('error','Hãy tạm dừng quét trước khi chuyển bước.');return;}
                changeSopStep(step);
              }}
              hasImages={images.length > 0}
              hasExtractedData={!!extractedData}
              step2Verified={!!extractedData && !!extractedData.hoVaTen}
              step3Verified={currentSopStep >= 4}
            />}

            {/* BƯỚC 1: Màn hình Uploader khi currentSopStep === 1 */}
            {currentSopStep === 1 && (
              <div className="space-y-4 animate-fade-in">

                <DocumentUploader
                  onBusyChange={setUploaderBusy}
                  batchEmployees={batchEmployees}
                  onBatchEmployeesChange={setBatchEmployees}
                  onCheckpoint={saveExtractionCheckpoint}
                  employeeGroups={employeeGroups}
                  onEmployeeGroupsChange={setEmployeeGroups}
                  existingRecords={records}
                  transferredCandidate={transferredCandidate}
                  onClearTransferredCandidate={() => setTransferredCandidate(null)}
                  onProceedToStep2WithBatch={(list) => {
                    setDraftFormState(undefined);
                    setImages(employeeGroups.flatMap(group => group.documents));
                    setBatchEmployees(list);
                    if (list.length > 0) {
                      const first = list[0];
                      setExtractedData({
                        hoVaTen: first.hoVaTen,
                        aiVisionExtracted:first.aiVisionExtracted,
                        extractionMethod:first.extractionMethod,
                        ngaySinh: first.ngaySinh,
                        gioiTinh: first.gioiTinh,
                        danToc: first.danToc,
                        soCCCD: first.soCCCD,
                        ngayCap: first.ngayCap,
                        ngayHetHanCCCD: first.ngayHetHanCCCD,
                        tinhTrangHonNhan: first.tinhTrangHonNhan,
                        noiCap: first.noiCap,
                        queQuan: first.queQuan,
                        diaChiThuongTru: first.diaChiThuongTru,
                        nguonDiaChi: first.nguonDiaChi,
                        ghiChuSapNhap: first.ghiChuSapNhap,
                        soDienThoai: first.soDienThoai,
                        emailCaNhan: first.emailCaNhan,
                        congViecDuKien: first.congViecDuKien || 'Đầu Bếp',
                        chucVu: first.chucVu || 'Bếp Trưởng',
                        thongTinGiaDinh: first.thongTinGiaDinh || [],
                        thanhVienHoGiaDinh:first.thanhVienHoGiaDinh || [],
                        thongTinChuaRo: first.thongTinChuaRo || [],
                        cauHoiLamRo: first.cauHoiLamRo || [],
                      });
                    }
                    setCurrentSopStep(2);
                  }}
                />
              </div>
            )}

            {/* BƯỚC 2, 3, 4: Biểu mẫu form chuẩn toàn màn hình */}
            {currentSopStep >= 2 && (
              <div className="space-y-4">
                {/* Form chi tiết hiển thị toàn màn hình */}
                <ExtractedForm
                  key={formGeneration}
                  initialDraftState={draftFormState}
                  draftReader={draftReader}
                  initialData={extractedData}
                  existingRecords={records}
                  tieuChuanLuongList={tieuChuanLuong}
                  userEmail={currentUser.email}
                  onSaveToSheet={handleSaveToSheet}
                  isSaving={isSaving}
                  onStepChange={changeSopStep}
                  currentStep={currentSopStep}
                  onBackToStep1={() => changeSopStep(1)}
                  onResetNewRecord={() => {
                    setImages([]);
                    setExtractedData(null);
                    setBatchEmployees([]);
                    setEmployeeGroups([]);
                    setSingleIntakeInfo({});
                    setActiveDraft(null);setDraftSavedAt('');setDraftCompleted(false);setDraftError('');
                    setDraftFormState(undefined);
                    setCurrentSopStep(1);
                    showNotification(
                      'success',
                      'Đã khởi tạo phiên làm việc mới. Vui lòng nạp tài liệu nhân viên mới tiếp theo.'
                    );
                  }}
                  onViewRecordsTab={() => setActiveTab('records')}
                  uploadedImagesCount={images.length}
                  batchEmployees={batchEmployees}
                  onBatchEmployeesChange={(list) => {
                    setBatchEmployees(list);
                    setEmployeeGroups(groups => groups.map(group => ({...group, label: list.find(employee => employee.id === group.id)?.hoVaTen ?? group.label})));
                  }}
                  onSaveBatchToSheet={handleSaveBatchToSheet}
                  organizationHierarchy={organizationHierarchy}
                  intakeInfo={singleIntakeInfo}
                  onIntakeInfoChange={(updates) => setSingleIntakeInfo(previous => ({...previous, ...updates}))}
                />
              </div>
            )}
            </fieldset>
            <IntakeDraftBar showIntro={currentSopStep !== 1} busy={draftBusy} disabled={isSaving || uploaderBusy} completed={draftCompleted}
              status={draftStatus} activeId={activeDraft?.id} savedAt={draftSavedAt} drafts={drafts} error={draftError}
              onSave={() => void saveDraft()} onRefresh={() => void refreshDrafts()}
              onOpen={draft => void openDraft(draft)} onDiscard={draft => void discardDraft(draft)}
              onNew={() => {
                if (!window.confirm('Tạo đợt nhập mới? Hãy lưu tạm trước nếu bạn muốn giữ nội dung đang nhập.')) return;
                setImages([]);setEmployeeGroups([]);setBatchEmployees([]);setExtractedData(null);setSingleIntakeInfo({});
                setActiveDraft(null);setDraftSavedAt('');setDraftError('');setDraftCompleted(false);setCurrentSopStep(1);
                setDraftFormState(undefined);
              }} />
          </div>
        )}

        {/* Tab Cơ cấu tổ chức (Chỉ Admin) */}
        {isAdmin && activeTab === 'organization' && (
          <div className="animate-fade-in">
            <TieuChuanLuongManager
              standards={tieuChuanLuong}
              currentUser={currentUser}
              onSaveStandard={handleSaveStandard}
              onDeleteStandard={handleDeleteStandard}
              organizationHierarchy={organizationHierarchy}
              onSaveOrganizationHierarchy={handleSaveOrganizationHierarchy}
              onStandardsUpdated={(updated) => {
                setTieuChuanLuong(updated);
                showNotification('success', `Đã đồng bộ ${updated.length} tiêu chuẩn lương từ Google Sheets vào hệ thống!`);
              }}
              initialTab="organization"
            />
          </div>
        )}

        {/* Tab Bảng hồ sơ nhân sự (Sheet DanhSachNhanSu) */}
        {activeTab === 'records' && (
          <div className="animate-fade-in">
            <NhanSuTable
              records={records}
              currentUser={currentUser}
              onRefresh={() => loadRecords(currentUser.email)}
              onDeleteRecord={isAdmin ? handleDeleteRecord : undefined}
              onEditRecord={isAdmin ? handleEditRecord : undefined}
              tieuChuanLuongList={tieuChuanLuong}
            />
          </div>
        )}

        {/* Tab Hệ thống Quản lý Tiêu chuẩn Khám sức khỏe Định kỳ (Sheet "Tiêu chuẩn") */}
        {activeTab === 'health' && (
          <div className="animate-fade-in">
            <HealthCheckStandardsManager currentUser={currentUser} onTransferToNewEmployee={handleTransferCandidate} />
          </div>
        )}

        {isAdmin && activeTab === 'salary' && (
          <div className="animate-fade-in">
            <TieuChuanLuongManager
              standards={tieuChuanLuong}
              currentUser={currentUser}
              onSaveStandard={handleSaveStandard}
              onDeleteStandard={handleDeleteStandard}
              organizationHierarchy={organizationHierarchy}
              onSaveOrganizationHierarchy={handleSaveOrganizationHierarchy}
              onStandardsUpdated={(updated) => {
                setTieuChuanLuong(updated);
                showNotification('success', `Đã đồng bộ ${updated.length} tiêu chuẩn lương từ Google Sheets vào hệ thống!`);
              }}
              initialTab="standards"
            />
          </div>
        )}

        {isAdmin && activeTab === 'emails' && (
          <div className="animate-fade-in">
            <EmailViewer
              emailLogs={emailLogs}
              userEmail={currentUser.email}
              isAdmin={true}
            />
          </div>
        )}

        {isAdmin && activeTab === 'users' && (
          <div className="animate-fade-in">
            <UserManagement currentUser={currentUser} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hệ thống Nhập liệu Hồ sơ Nhân sự AI &bull; Designed by Brian Tran
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Tài khoản: {currentUser.employeeCode || currentUser.email} &bull; Vai trò:{' '}
            <strong
              className={
                isAdmin
                  ? 'text-purple-700'
                  : currentUser.hrmRole === 'nhan_vien_y_te'
                  ? 'text-teal-700'
                  : 'text-sky-700'
              }
            >
              {isAdmin
                ? 'QUẢN TRỊ VIÊN'
                : currentUser.hrmRole === 'nhan_vien_y_te'
                ? 'NHÂN VIÊN Y TẾ'
                : 'NHÂN VIÊN TUYỂN DỤNG'}
            </strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
