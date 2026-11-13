import React, { useEffect, useState, useRef } from 'react';
import type { BatchEmployeeDraft, EmployeeDocumentGroup, NhanSuRecord } from '../types';
import type { RecruitmentHealthRegItem } from './HealthCheckStandardsManager';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { extractOCRGroup } from '../utils/ocrClient';
import { DEFAULT_ORGANIZATION_HIERARCHY } from '../data/organizationHierarchy';
import { DEFAULT_JOB_POSITIONS } from '../data/jobPositionHierarchy';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Database,
  X,
  Hospital,
  Camera,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

interface DocumentUploaderProps {
  onBusyChange?: (busy: boolean) => void;
  batchEmployees?: BatchEmployeeDraft[];
  onBatchEmployeesChange?: (employees: BatchEmployeeDraft[]) => void;
  onCheckpoint?: (employees: BatchEmployeeDraft[], groups: EmployeeDocumentGroup[]) => Promise<void>;
  onProceedToStep2WithBatch: (employees: BatchEmployeeDraft[]) => void;
  employeeGroups: EmployeeDocumentGroup[];
  onEmployeeGroupsChange: (groups: EmployeeDocumentGroup[]) => void;
  existingRecords?: NhanSuRecord[];
  transferredCandidate?: RecruitmentHealthRegItem | null;
  onClearTransferredCandidate?: () => void;
}

interface EmployeeFormState {
  maNhanVien: string;
  hoVaTen: string;
  ngaySinh: string;
  tinhTrangHonNhan: string;
  gioiTinh: string;
  danToc: string;
  soCCCD: string;
  ngayCap: string;
  ngayHetHanCCCD: string;
  khoi: string;
  ban: string;
  phong: string;
  congViecDuKien: string;
  chucVu: string;
  noiCap: string;
  soDienThoai: string;
  queQuan: string;
  ghiChu: string;
  trangThaiKSK: string;
}

const createInitialFormState = (): EmployeeFormState => ({
  maNhanVien: `WEL-2026-${Math.floor(100 + Math.random() * 900)}`,
  hoVaTen: '',
  ngaySinh: '',
  tinhTrangHonNhan: 'Chưa kết hôn',
  gioiTinh: 'Nam',
  danToc: 'Kinh',
  soCCCD: '',
  ngayCap: '',
  ngayHetHanCCCD: '',
  khoi: DEFAULT_ORGANIZATION_HIERARCHY[0]?.name || '',
  ban: DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.name || '',
  phong: DEFAULT_ORGANIZATION_HIERARCHY[0]?.bans[0]?.phongs[0]?.name || '',
  congViecDuKien: DEFAULT_JOB_POSITIONS[0]?.name || '',
  chucVu: DEFAULT_JOB_POSITIONS[0]?.chucVus[0] || '',
  noiCap: 'Cục Cảnh sát QLHC về TTXH',
  soDienThoai: '',
  queQuan: '',
  ghiChu: '',
  trangThaiKSK: 'Chưa đồng bộ',
});

const normalizeDateForInput = (raw?: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return '';
};

export function DocumentUploader({
  batchEmployees,
  onBatchEmployeesChange,
  onProceedToStep2WithBatch,
  employeeGroups,
  onEmployeeGroupsChange,
  onBusyChange,
  transferredCandidate,
  onClearTransferredCandidate,
}: DocumentUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [scanningGroupIds, setScanningGroupIds] = useState<Record<string, boolean>>({});
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [statusByGroupId, setStatusByGroupId] = useState<
    Record<string, { type: 'info' | 'success' | 'error'; message: string }>
  >({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [recruitmentList, setRecruitmentList] = useState<RecruitmentHealthRegItem[]>([]);

  // Ensure at least one separate employee upload slot exists
  const [activeGroupId, setActiveGroupId] = useState<string>(() => employeeGroups[0]?.id || crypto.randomUUID());
  const [formsByGroupId, setFormsByGroupId] = useState<Record<string, EmployeeFormState>>(() => {
    const initialId = employeeGroups[0]?.id || activeGroupId;
    return { [initialId]: createInitialFormState() };
  });

  const groups: EmployeeDocumentGroup[] =
    employeeGroups.length > 0
      ? employeeGroups
      : [{ id: activeGroupId, label: 'Nhân viên #1', documents: [] }];

  // Sync employeeGroups on mount if parent passed empty array
  useEffect(() => {
    if (employeeGroups.length === 0) {
      onEmployeeGroupsChange([{ id: activeGroupId, label: 'Nhân viên #1', documents: [] }]);
    } else if (!employeeGroups.some(g => g.id === activeGroupId)) {
      setActiveGroupId(employeeGroups[0].id);
    }
  }, [employeeGroups, activeGroupId, onEmployeeGroupsChange]);

  // Ensure every group has a form state entry
  useEffect(() => {
    setFormsByGroupId(prev => {
      let changed = false;
      const next = { ...prev };
      for (const g of groups) {
        if (!next[g.id]) {
          next[g.id] = createInitialFormState();
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groups]);

  const latestGroupsRef = useRef(groups);
  useEffect(() => {
    latestGroupsRef.current = groups;
  }, [groups]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load recruitment list from localStorage for the picker
  useEffect(() => {
    try {
      const cached = localStorage.getItem('hr_recruitment_health_regs');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setRecruitmentList(parsed);
      }
    } catch {}
  }, []);

  const updateActiveForm = (patch: Partial<EmployeeFormState>) => {
    setGlobalError(null);
    setFormsByGroupId(prev => ({
      ...prev,
      [activeGroupId]: { ...(prev[activeGroupId] || createInitialFormState()), ...patch },
    }));
  };

  // Pre-fill active employee if transferredCandidate is provided
  useEffect(() => {
    if (transferredCandidate) {
      setFormsByGroupId(prev => {
        const current = prev[activeGroupId] || createInitialFormState();
        return {
          ...prev,
          [activeGroupId]: {
            ...current,
            hoVaTen: transferredCandidate.hoVaTen || current.hoVaTen,
            soCCCD: transferredCandidate.soCCCD || current.soCCCD,
            ngaySinh: normalizeDateForInput(transferredCandidate.ngaySinh) || transferredCandidate.ngaySinh || current.ngaySinh,
            gioiTinh: transferredCandidate.gioiTinh || current.gioiTinh,
            khoi: transferredCandidate.khoi || current.khoi,
            ban: transferredCandidate.ban || current.ban,
            phong: transferredCandidate.phong || current.phong,
            congViecDuKien: transferredCandidate.congViec || current.congViecDuKien,
            chucVu: transferredCandidate.chucVu || current.chucVu,
            trangThaiKSK: transferredCandidate.trangThai || 'Đã khám - Đạt',
            ghiChu: `Đồng bộ từ KSK tuyển dụng - NCC: ${transferredCandidate.nhaCungCap || '---'}`,
          },
        };
      });
    }
  }, [transferredCandidate, activeGroupId]);

  const runOcrForGroup = async (targetGroup: EmployeeDocumentGroup) => {
    if (!targetGroup || targetGroup.documents.length === 0) {
      setStatusByGroupId(prev => ({
        ...prev,
        [targetGroup.id]: {
          type: 'error',
          message: 'Vui lòng tải lên ít nhất một ảnh CCCD hoặc tài liệu trước khi quét AI OCR.',
        },
      }));
      return;
    }

    setScanningGroupIds(prev => ({ ...prev, [targetGroup.id]: true }));
    setBusy(true);
    onBusyChange?.(true);
    setStatusByGroupId(prev => ({
      ...prev,
      [targetGroup.id]: {
        type: 'info',
        message: `Đang đọc ${targetGroup.documents.length} ảnh bằng Gemini AI & OCR...`,
      },
    }));

    try {
      const reply = await extractOCRGroup(
        targetGroup,
        doc => {
          const base = latestGroupsRef.current;
          const updated = base.map(g =>
            g.id === targetGroup.id
              ? { ...g, documents: g.documents.map(d => (d.id === doc.id ? doc : d)) }
              : g
          );
          onEmployeeGroupsChange(updated);
        },
        msg => {
          if (msg) {
            setStatusByGroupId(prev => ({
              ...prev,
              [targetGroup.id]: { type: 'info', message: msg },
            }));
          }
        },
        'ai'
      );

      if (reply.ok && reply.data?.success && reply.data.data) {
        const d = reply.data.data;
        const nameVal = (d.hoVaTen || d.hoTen || '').trim();
        setFormsByGroupId(prev => {
          const cur = prev[targetGroup.id] || createInitialFormState();
          const dob = normalizeDateForInput(d.ngaySinh);
          const cap = normalizeDateForInput(d.ngayCap || d.ngayCapCCCD);
          const hetHan = normalizeDateForInput(d.ngayHetHanCCCD);
          const addr = d.queQuan || d.diaChiThuongTru || d.noiThuongTru;
          let nextGhiChu = cur.ghiChu;
          if (d.canh_bao_sai_lech && !nextGhiChu.includes(d.canh_bao_sai_lech)) {
            nextGhiChu = nextGhiChu
              ? `${nextGhiChu}\nCảnh báo đối soát: ${d.canh_bao_sai_lech}`
              : `Cảnh báo đối soát: ${d.canh_bao_sai_lech}`;
          } else if (d.ghiChu && !nextGhiChu) {
            nextGhiChu = d.ghiChu;
          }
          return {
            ...prev,
            [targetGroup.id]: {
              ...cur,
              hoVaTen: nameVal || cur.hoVaTen,
              soCCCD: d.soCCCD || cur.soCCCD,
              ngaySinh: dob || cur.ngaySinh,
              gioiTinh: d.gioiTinh || cur.gioiTinh,
              danToc: d.danToc || cur.danToc,
              tinhTrangHonNhan: d.tinhTrangHonNhan || cur.tinhTrangHonNhan,
              ngayCap: cap || cur.ngayCap,
              ngayHetHanCCCD: hetHan || cur.ngayHetHanCCCD,
              noiCap: d.noiCap || d.noiCapCCCD || cur.noiCap,
              soDienThoai: d.soDienThoai || cur.soDienThoai,
              queQuan: addr || cur.queQuan,
              ghiChu: nextGhiChu,
            },
          };
        });

        if (nameVal) {
          const updatedLabelGroups = latestGroupsRef.current.map(g =>
            g.id === targetGroup.id ? { ...g, label: nameVal } : g
          );
          onEmployeeGroupsChange(updatedLabelGroups);
        }

        setStatusByGroupId(prev => ({
          ...prev,
          [targetGroup.id]: {
            type: 'success',
            message: nameVal
              ? `Đã đọc xong hồ sơ ${nameVal} bằng Gemini AI & OCR.`
              : 'Đã quét xong bằng Gemini AI & OCR. Vui lòng kiểm tra thông tin bên dưới.',
          },
        }));
      } else {
        setStatusByGroupId(prev => ({
          ...prev,
          [targetGroup.id]: {
            type: 'error',
            message:
              reply.data?.error ||
              reply.error ||
              'Chưa trích xuất được thông tin rõ ràng. Vui lòng thử ảnh rõ nét hơn hoặc nhập thủ công.',
          },
        }));
      }
    } catch (err) {
      setStatusByGroupId(prev => ({
        ...prev,
        [targetGroup.id]: {
          type: 'error',
          message: `Lỗi quét Gemini AI / OCR: ${(err as Error).message}`,
        },
      }));
    } finally {
      setScanningGroupIds(prev => ({ ...prev, [targetGroup.id]: false }));
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const processSelectedFilesForGroup = async (groupId: string, fileList: File[]) => {
    if (!fileList.length) return;
    setActiveGroupId(groupId);
    setGlobalError(null);
    setBusy(true);
    onBusyChange?.(true);
    setStatusByGroupId(prev => ({
      ...prev,
      [groupId]: {
        type: 'info',
        message: `Đang tối ưu ${fileList.length} ảnh và gửi Gemini AI + OCR...`,
      },
    }));

    try {
      const optimizedDocs = await Promise.all(fileList.map(f => optimizeImageFile(f)));
      const currentList = latestGroupsRef.current;
      const targetIndex = currentList.findIndex(g => g.id === groupId);
      let targetGroup: EmployeeDocumentGroup;
      let nextGroups: EmployeeDocumentGroup[];

      if (targetIndex >= 0) {
        const existing = currentList[targetIndex];
        targetGroup = { ...existing, documents: [...existing.documents, ...optimizedDocs] };
        nextGroups = currentList.map(g => (g.id === groupId ? targetGroup : g));
      } else {
        targetGroup = { id: groupId, label: 'Nhân viên #1', documents: optimizedDocs };
        nextGroups = [...currentList, targetGroup];
      }

      onEmployeeGroupsChange(nextGroups);
      latestGroupsRef.current = nextGroups;
      await runOcrForGroup(targetGroup);
    } catch (err) {
      setStatusByGroupId(prev => ({
        ...prev,
        [groupId]: {
          type: 'error',
          message: `Không thể xử lý tệp tải lên: ${(err as Error).message}`,
        },
      }));
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const handleAddEmployeeSlot = () => {
    const newId = crypto.randomUUID();
    const newIndex = groups.length + 1;
    const nextGroups = [
      ...groups,
      { id: newId, label: `Nhân viên #${newIndex}`, documents: [] },
    ];
    onEmployeeGroupsChange(nextGroups);
    setFormsByGroupId(prev => ({ ...prev, [newId]: createInitialFormState() }));
    setActiveGroupId(newId);
  };

  const handleRemoveEmployeeSlot = (groupId: string) => {
    if (groups.length <= 1) return;
    const nextGroups = groups.filter(g => g.id !== groupId);
    onEmployeeGroupsChange(nextGroups);
    setFormsByGroupId(prev => {
      const copy = { ...prev };
      delete copy[groupId];
      return copy;
    });
    setStatusByGroupId(prev => {
      const copy = { ...prev };
      delete copy[groupId];
      return copy;
    });
    if (activeGroupId === groupId && nextGroups.length > 0) {
      setActiveGroupId(nextGroups[0].id);
    }
  };

  const handleRemoveUploadedDoc = (groupId: string, docId: string) => {
    const nextGroups = groups.map(g =>
      g.id === groupId ? { ...g, documents: g.documents.filter(d => d.id !== docId) } : g
    );
    onEmployeeGroupsChange(nextGroups);
    const remaining = nextGroups.find(g => g.id === groupId)?.documents.length || 0;
    if (remaining === 0) {
      setStatusByGroupId(prev => {
        const copy = { ...prev };
        delete copy[groupId];
        return copy;
      });
    }
  };

  const handleScanAllOrActive = async () => {
    const groupsWithDocs = groups.filter(g => g.documents.length > 0);
    if (groupsWithDocs.length === 0) {
      setGlobalError('Vui lòng tải lên ít nhất một ảnh CCCD trước khi quét AI OCR!');
      return;
    }
    for (const g of groupsWithDocs) {
      await runOcrForGroup(g);
    }
  };

  const handleSelectRecruitmentCandidate = (reg: RecruitmentHealthRegItem) => {
    updateActiveForm({
      hoVaTen: reg.hoVaTen,
      soCCCD: reg.soCCCD,
      ngaySinh: normalizeDateForInput(reg.ngaySinh) || reg.ngaySinh || '',
      gioiTinh: reg.gioiTinh || 'Nam',
      khoi: reg.khoi || activeForm.khoi,
      ban: reg.ban || activeForm.ban,
      phong: reg.phong || activeForm.phong,
      congViecDuKien: reg.congViec || activeForm.congViecDuKien,
      chucVu: reg.chucVu || activeForm.chucVu,
      trangThaiKSK: reg.trangThai || 'Đã khám - Đạt',
      ghiChu: `Đồng bộ từ KSK tuyển dụng - NCC: ${reg.nhaCungCap}`,
    });
    setIsPickerOpen(false);
  };

  const buildDraftFromSlot = (group: EmployeeDocumentGroup, f: EmployeeFormState): BatchEmployeeDraft => ({
    id: group.id,
    hoVaTen: f.hoVaTen.trim(),
    soCCCD: f.soCCCD.trim(),
    ngaySinh: f.ngaySinh || '2000-01-01',
    gioiTinh: f.gioiTinh || 'Nam',
    tinhTrangHonNhan: f.tinhTrangHonNhan.trim(),
    danToc: f.danToc.trim() || 'Kinh',
    ngayCap: f.ngayCap || '2020-01-01',
    ngayHetHanCCCD: f.ngayHetHanCCCD || '2030-01-01',
    noiCap: f.noiCap.trim() || 'Cục Cảnh sát QLHC về TTXH',
    soDienThoai: f.soDienThoai.trim(),
    queQuan: f.queQuan.trim() || 'Hà Nội',
    diaChiThuongTru: f.queQuan.trim() || 'Hà Nội',
    khoi: f.khoi.trim(),
    ban: f.ban.trim(),
    phong: f.phong.trim(),
    congViecDuKien: f.congViecDuKien.trim() || 'Nhân sự vận hành',
    chucVu: f.chucVu.trim() || 'Nhân viên',
    ghiChu: f.ghiChu.trim(),
    thongTinGiaDinh: [],
    thanhVienHoGiaDinh: [],
    thongTinChuaRo: [],
    cauHoiLamRo: [],
    luongCoBan: 6000000,
    phuCapCoDinh: 1200000,
    phuCapPhatSinh: 0,
    tongThuNhapDuKien: 7200000,
    soTaiLieuDinhKem: group.documents.length,
  });

  const handleSaveAndProceed = (_proceedMore: boolean) => {
    const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
    const currentForm = formsByGroupId[activeGroup.id] || createInitialFormState();

    // Collect all completed slots
    const completedDrafts = groups
      .map(g => ({ group: g, form: formsByGroupId[g.id] || createInitialFormState() }))
      .filter(({ form }) => form.hoVaTen.trim() && form.soCCCD.trim())
      .map(({ group, form }) => buildDraftFromSlot(group, form));

    if (completedDrafts.length === 0) {
      setGlobalError(
        !currentForm.hoVaTen.trim() || !currentForm.soCCCD.trim()
          ? 'Vui lòng nhập đầy đủ Họ và tên và Số CCCD!'
          : 'Vui lòng hoàn thiện ít nhất 1 hồ sơ nhân viên!'
      );
      return;
    }

    setGlobalError(null);
    onBatchEmployeesChange?.([...completedDrafts, ...(batchEmployees || [])]);
    onProceedToStep2WithBatch(completedDrafts);
  };

  const handleResetForm = () => {
    setFormsByGroupId(prev => ({
      ...prev,
      [activeGroupId]: createInitialFormState(),
    }));
    setGlobalError(null);
    onClearTransferredCandidate?.();
  };

  const activeForm = formsByGroupId[activeGroupId] || createInitialFormState();
  const activeIndex = Math.max(0, groups.findIndex(g => g.id === activeGroupId));
  const anyScanning = Object.values(scanningGroupIds).some(Boolean);
  const totalUploadedFiles = groups.reduce((acc, g) => acc + g.documents.length, 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* TOP PANEL: Multi-Employee Compact Dark Document Uploaders (Matching Reference Layout) */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-4 text-slate-100 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-300">
            Tải lên ảnh CCCD từng nhân viên riêng biệt ({groups.length} nhân viên)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddEmployeeSlot}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Thêm nhân viên</span>
            </button>
            <button
              type="button"
              onClick={() => void handleScanAllOrActive()}
              disabled={anyScanning || busy || totalUploadedFiles === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{anyScanning ? 'Đang quét AI...' : 'Quét AI (OCR)'}</span>
            </button>
          </div>
        </div>

        {/* Isolated Compact Dropzone per Employee (Column Grid when multiple) */}
        <div
          className={`grid gap-3 ${
            groups.length === 1
              ? 'grid-cols-1'
              : groups.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {groups.map((group, idx) => {
            const isSelected = group.id === activeGroupId;
            const slotForm = formsByGroupId[group.id];
            const slotStatus = statusByGroupId[group.id];
            const isSlotScanning = Boolean(scanningGroupIds[group.id]);
            const displayName = slotForm?.hoVaTen?.trim();

            return (
              <div
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`rounded-xl p-2.5 transition flex flex-col justify-between gap-2 border ${
                  isSelected
                    ? 'border-blue-500/70 bg-slate-900/90'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Compact Slot Header */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Nhân viên #{idx + 1}
                    </span>
                    {displayName && (
                      <span className="text-xs font-semibold text-teal-300 truncate">
                        {displayName}
                      </span>
                    )}
                    {isSlotScanning && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 truncate">
                        <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                        <span className="truncate">Đang đọc AI &amp; OCR...</span>
                      </span>
                    )}
                    {!isSlotScanning && slotStatus && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] truncate ${
                          slotStatus.type === 'success'
                            ? 'text-emerald-400'
                            : slotStatus.type === 'error'
                            ? 'text-rose-400'
                            : 'text-blue-300'
                        }`}
                      >
                        {slotStatus.type === 'success' ? (
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                        ) : slotStatus.type === 'error' ? (
                          <AlertCircle className="w-3 h-3 shrink-0" />
                        ) : null}
                        <span className="truncate">{slotStatus.message}</span>
                      </span>
                    )}
                  </div>

                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveEmployeeSlot(group.id);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded transition cursor-pointer shrink-0"
                      title="Xóa ô nhân viên này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Exact Compact Horizontal Dropzone matching user's reference image */}
                <div
                  onClick={e => {
                    e.stopPropagation();
                    setActiveGroupId(group.id);
                    fileInputRefs.current[group.id]?.click();
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverGroupId(group.id);
                  }}
                  onDragLeave={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverGroupId(prev => (prev === group.id ? null : prev));
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverGroupId(null);
                    if (e.dataTransfer.files?.length) {
                      void processSelectedFilesForGroup(group.id, Array.from(e.dataTransfer.files));
                    }
                  }}
                  className={`border border-dashed rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer transition group ${
                    dragOverGroupId === group.id
                      ? 'border-amber-400 bg-blue-950/60'
                      : 'border-slate-700 hover:border-blue-500 bg-[#131d32]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-[160px] flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 flex items-center justify-center shrink-0 transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-slate-200 leading-snug">
                        Kéo thả ảnh CCCD hoặc chọn tệp từ máy / điện thoại
                      </div>
                      <div className="text-[10px] text-slate-400 leading-snug">
                        Hỗ trợ định dạng JPG, PNG, PDF (Tối đa 10MB)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => cameraInputRefs.current[group.id]?.click()}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                      title="Chụp ảnh CCCD"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Chụp ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[group.id]?.click()}
                      disabled={busy}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      Chọn tệp
                    </button>
                  </div>
                  <input
                    ref={el => {
                      fileInputRefs.current[group.id] = el;
                    }}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={e => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      e.target.value = '';
                      if (files.length) void processSelectedFilesForGroup(group.id, files);
                    }}
                    className="hidden"
                  />
                  <input
                    ref={el => {
                      cameraInputRefs.current[group.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      e.target.value = '';
                      if (files.length) void processSelectedFilesForGroup(group.id, files);
                    }}
                    className="hidden"
                  />
                </div>

                {/* Uploaded file chips for this employee slot */}
                {group.documents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Ảnh đã tải ({group.documents.length}):
                    </span>
                    {group.documents.map((doc, docIdx) => (
                      <span
                        key={doc.id || docIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800 text-teal-400 text-[11px] font-mono"
                      >
                        <span className="truncate max-w-[180px]">{doc.fileName}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveUploadedDoc(group.id, doc.id);
                          }}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Xóa ảnh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM PANEL: Thông tin Nhân sự Mới Form (All 17 Required Fields) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Thông Tin Nhân Sự Mới {groups.length > 1 ? `— Nhân viên #${activeIndex + 1}` : ''}
            </h3>
            <p className="text-xs text-slate-500">Kiểm tra và điền đầy đủ các thông tin bắt buộc dưới đây.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer shrink-0"
          >
            <Database className="w-4 h-4 text-teal-600" />
            <span>Lấy dữ liệu từ DS Khám SK</span>
          </button>
        </div>

        {/* Employee selector tabs when multiple employees exist */}
        {groups.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {groups.map((g, idx) => {
              const slotName = formsByGroupId[g.id]?.hoVaTen?.trim();
              const selected = g.id === activeGroupId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroupId(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    selected
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  NV #{idx + 1}
                  {slotName ? `: ${slotName}` : ''}
                </button>
              );
            })}
          </div>
        )}

        {globalError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        {/* 17 Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Mã nhân viên</label>
            <input
              type="text"
              value={activeForm.maNhanVien}
              disabled
              className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">1. Họ và tên *</label>
            <input
              type="text"
              value={activeForm.hoVaTen}
              onChange={e => updateActiveForm({ hoVaTen: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">2. Ngày sinh</label>
            <input
              type="date"
              value={activeForm.ngaySinh}
              onChange={e => updateActiveForm({ ngaySinh: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">3. Tình trạng hôn nhân</label>
            <select
              value={activeForm.tinhTrangHonNhan}
              onChange={e => updateActiveForm({ tinhTrangHonNhan: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 outline-none"
            >
              <option value="Chưa kết hôn">Chưa kết hôn</option>
              <option value="Đã kết hôn">Đã kết hôn</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">4. Giới tính</label>
            <select
              value={activeForm.gioiTinh}
              onChange={e => updateActiveForm({ gioiTinh: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 outline-none"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">5. Dân tộc</label>
            <input
              type="text"
              value={activeForm.danToc}
              onChange={e => updateActiveForm({ danToc: e.target.value })}
              placeholder="VD: Kinh"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">6. Số CCCD / CMND *</label>
            <input
              type="text"
              value={activeForm.soCCCD}
              onChange={e => updateActiveForm({ soCCCD: e.target.value })}
              placeholder="03408800xxxx"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">7. Ngày cấp CCCD</label>
            <input
              type="date"
              value={activeForm.ngayCap}
              onChange={e => updateActiveForm({ ngayCap: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">8. Ngày hết hạn CCCD</label>
            <input
              type="date"
              value={activeForm.ngayHetHanCCCD}
              onChange={e => updateActiveForm({ ngayHetHanCCCD: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">9. Khối *</label>
            <select
              value={activeForm.khoi}
              onChange={e => updateActiveForm({ khoi: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 outline-none"
            >
              {DEFAULT_ORGANIZATION_HIERARCHY.map(k => (
                <option key={k.id} value={k.name}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">10. Ban *</label>
            <input
              type="text"
              value={activeForm.ban}
              onChange={e => updateActiveForm({ ban: e.target.value })}
              placeholder="VD: FS1"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">11. Phòng *</label>
            <input
              type="text"
              value={activeForm.phong}
              onChange={e => updateActiveForm({ phong: e.target.value })}
              placeholder="VD: SEV1"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">12. Công việc *</label>
            <select
              value={activeForm.congViecDuKien}
              onChange={e => updateActiveForm({ congViecDuKien: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 outline-none"
            >
              {DEFAULT_JOB_POSITIONS.map(j => (
                <option key={j.id} value={j.name}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">13. Chức vụ *</label>
            <input
              type="text"
              value={activeForm.chucVu}
              onChange={e => updateActiveForm({ chucVu: e.target.value })}
              placeholder="VD: Bếp Chính"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">14. Nơi cấp CCCD</label>
            <input
              type="text"
              value={activeForm.noiCap}
              onChange={e => updateActiveForm({ noiCap: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">15. Số điện thoại</label>
            <input
              type="text"
              value={activeForm.soDienThoai}
              onChange={e => updateActiveForm({ soDienThoai: e.target.value })}
              placeholder="0988xxxxxx"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Trạng thái KSK</label>
            <input
              type="text"
              value={activeForm.trangThaiKSK}
              disabled
              className="w-full px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-800 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">16. Quê quán / Địa chỉ thường trú</label>
            <textarea
              rows={2}
              value={activeForm.queQuan}
              onChange={e => updateActiveForm({ queQuan: e.target.value })}
              placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">17. Ghi chú hồ sơ</label>
            <textarea
              rows={2}
              value={activeForm.ghiChu}
              onChange={e => updateActiveForm({ ghiChu: e.target.value })}
              placeholder="Ghi chú đặc biệt hoặc thông tin bổ sung..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#1a73e8]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
          >
            Làm mới
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSaveAndProceed(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Lưu &amp; Tạo Hồ Sơ
            </button>
            <button
              type="button"
              onClick={() => handleSaveAndProceed(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <span>Lưu &amp; Nhập Tiếp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RECRUITMENT CANDIDATE PICKER MODAL */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Hospital className="w-5 h-5 text-[#1a73e8]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Chọn ứng viên từ Danh sách Khám Sức Khỏe Tuyển Dụng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2">
              {recruitmentList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Chưa có hồ sơ khám sức khỏe tuyển dụng nào trong hệ thống.
                </div>
              ) : (
                recruitmentList.map(reg => (
                  <div
                    key={reg.id}
                    onClick={() => handleSelectRecruitmentCandidate(reg)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{reg.hoVaTen}</div>
                      <div className="text-slate-500 mt-0.5">
                        CCCD: {reg.soCCCD} &bull; SĐT: {reg.soDienThoai} &bull; Công việc: {reg.congViec}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                        {reg.trangThai || 'Đã khám - Đạt'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">{reg.nhaCungCap}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
