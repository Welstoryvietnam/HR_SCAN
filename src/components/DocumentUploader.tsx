import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BatchEmployeeDraft,
  EmployeeDocumentGroup,
  NhanSuRecord,
  OptimizedImageFile,
} from '../types';
import type { RecruitmentHealthRegItem } from './HealthCheckStandardsManager';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { extractOCRGroup } from '../utils/ocrClient';
import { checkGroupDuplicateCCCD, normalizeCCCD } from '../utils/duplicateCheck';
import { applyVneidHouseholdRule } from '../utils/household';
import {
  DOC_TYPE_OPTIONS,
  Step1ComparisonPanel,
  Step1EmployeeForm,
  createInitialStep1FormState,
  draftToStep1Form,
  normalizeDateForInput,
  pickDefaultPreviewDoc,
  step1FormToDraft,
} from './Step1ComparisonPanel';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns2,
  Database,
  Eye,
  FileText,
  Hospital,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  X,
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

const isPassedHealthCheck = (reg: RecruitmentHealthRegItem): boolean => {
  const st = (reg.trangThai || '').trim();
  return st === 'Đã khám (Đạt)' || st === 'Đã khám - Đạt';
};

const isAcceptedOffer = (reg: RecruitmentHealthRegItem): boolean => {
  return (reg.trangThaiNhanViec || '').trim() === 'Đã nhận việc';
};

const isGroupBlankSlot = (group: EmployeeDocumentGroup, form?: Step1EmployeeForm): boolean => {
  if (group.documents.length > 0) return false;
  if (!form) return true;
  return (
    !form.hoVaTen.trim() &&
    !form.soCCCD.trim() &&
    !form.soDienThoai.trim() &&
    !form.trangThaiKSK.trim()
  );
};

const kskCandidateToForm = (reg: RecruitmentHealthRegItem): Step1EmployeeForm => {
  const form = createInitialStep1FormState();
  const locked: string[] = [];

  const setIfVal = (key: keyof Step1EmployeeForm, val?: string) => {
    const clean = (val || '').trim();
    if (clean) {
      (form as any)[key] = clean;
      locked.push(key);
    }
  };

  setIfVal('hoVaTen', (reg.hoVaTen || '').toUpperCase());
  setIfVal('soCCCD', normalizeCCCD(reg.soCCCD) || reg.soCCCD);
  const dob = normalizeDateForInput(reg.ngaySinh) || (reg.ngaySinh || '').trim();
  if (dob) {
    form.ngaySinh = dob;
    locked.push('ngaySinh');
  }
  setIfVal('gioiTinh', reg.gioiTinh);
  setIfVal('soDienThoai', reg.soDienThoai);
  setIfVal('khoi', reg.khoi || reg.phongBanKhoi);
  setIfVal('ban', reg.ban);
  setIfVal('phong', reg.phong);
  setIfVal('congViecDuKien', reg.congViec || reg.viTriViecLam);
  setIfVal('chucVu', reg.chucVu);

  form.trangThaiKSK = `${reg.trangThai || 'Đã khám (Đạt)'}${
    reg.trangThaiNhanViec === 'Đã nhận việc' ? ' · Đã nhận việc' : ''
  }`;
  form.ghiChu = reg.nhaCungCap
    ? `Đồng bộ từ Quản lý KSK (NCC: ${reg.nhaCungCap})`
    : 'Đồng bộ từ Quản lý KSK tuyển dụng';
  form.kskLockedFields = locked;
  return form;
};

const normalizeTextCompare = (v: string): string =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

export function DocumentUploader({
  batchEmployees = [],
  onBatchEmployeesChange,
  onCheckpoint,
  onProceedToStep2WithBatch,
  employeeGroups,
  onEmployeeGroupsChange,
  existingRecords = [],
  onBusyChange,
  transferredCandidate,
  onClearTransferredCandidate,
}: DocumentUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [scanningGroupIds, setScanningGroupIds] = useState<Record<string, boolean>>({});
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const [selectedPreviewDocByGroupId, setSelectedPreviewDocByGroupId] = useState<
    Record<string, string | null>
  >({});
  const [statusByGroupId, setStatusByGroupId] = useState<
    Record<string, { type: 'info' | 'success' | 'error'; message: string }>
  >({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // KSK Multi-Picker Modal State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [recruitmentList, setRecruitmentList] = useState<RecruitmentHealthRegItem[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([]);
  const [pickerIncludePendingOffer, setPickerIncludePendingOffer] = useState(false);

  // Split-view & Upload Tray UI Controls
  const [splitViewMode, setSplitViewMode] = useState<'split' | 'image' | 'form'>('split');
  const [isUploadTrayCollapsed, setIsUploadTrayCollapsed] = useState(false);

  // Active employee group ID
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return employeeGroups[0]?.id || crypto.randomUUID();
  });

  // Form states indexed by groupId
  const [formsByGroupId, setFormsByGroupId] = useState<Record<string, Step1EmployeeForm>>(() => {
    if (employeeGroups.length > 0) {
      const map: Record<string, Step1EmployeeForm> = {};
      for (const g of employeeGroups) {
        const matched = batchEmployees.find((b) => b.id === g.id);
        map[g.id] = matched ? draftToStep1Form(matched) : createInitialStep1FormState();
      }
      return map;
    }
    if (batchEmployees.length > 0) {
      const map: Record<string, Step1EmployeeForm> = {};
      for (const b of batchEmployees) {
        map[b.id] = draftToStep1Form(b);
      }
      return map;
    }
    return { [activeGroupId]: createInitialStep1FormState() };
  });

  const groups: EmployeeDocumentGroup[] = useMemo(() => {
    if (employeeGroups.length > 0) return employeeGroups;
    if (batchEmployees.length > 0) {
      return batchEmployees.map((b, i) => ({
        id: b.id,
        label: b.hoVaTen || `Nhân viên #${i + 1}`,
        documents: [],
      }));
    }
    return [{ id: activeGroupId, label: 'Nhân viên #1', documents: [] }];
  }, [employeeGroups, batchEmployees, activeGroupId]);

  const latestGroupsRef = useRef<EmployeeDocumentGroup[]>(groups);
  const latestFormsRef = useRef<Record<string, Step1EmployeeForm>>(formsByGroupId);
  const latestBatchRef = useRef<BatchEmployeeDraft[]>(batchEmployees);

  useEffect(() => {
    latestGroupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    latestFormsRef.current = formsByGroupId;
  }, [formsByGroupId]);

  useEffect(() => {
    latestBatchRef.current = batchEmployees;
  }, [batchEmployees]);

  // Ensure parent employeeGroups is initialized when empty
  useEffect(() => {
    if (employeeGroups.length === 0) {
      if (batchEmployees.length > 0) {
        const initGroups = batchEmployees.map((b, i) => ({
          id: b.id,
          label: b.hoVaTen || `Nhân viên #${i + 1}`,
          documents: [],
        }));
        onEmployeeGroupsChange(initGroups);
        setActiveGroupId(initGroups[0].id);
      } else {
        onEmployeeGroupsChange([{ id: activeGroupId, label: 'Nhân viên #1', documents: [] }]);
      }
    } else if (!employeeGroups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(employeeGroups[0].id);
    }
  }, [employeeGroups, batchEmployees, activeGroupId, onEmployeeGroupsChange]);

  // Hydrate missing form entries whenever groups or batchEmployees update externally (drafts, back navigation)
  useEffect(() => {
    setFormsByGroupId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const g of groups) {
        const matched = batchEmployees.find((b) => b.id === g.id);
        if (!next[g.id]) {
          next[g.id] = matched ? draftToStep1Form(matched) : createInitialStep1FormState();
          changed = true;
        } else if (
          matched &&
          !next[g.id].hoVaTen &&
          !next[g.id].soCCCD &&
          (matched.hoVaTen || matched.soCCCD)
        ) {
          next[g.id] = draftToStep1Form(matched);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groups, batchEmployees]);

  // Pre-fill when a single candidate is pushed via HealthCheckStandardsManager "Nhận việc / Chuyển sang Đăng ký"
  useEffect(() => {
    if (!transferredCandidate) return;
    const candidateForm = kskCandidateToForm(transferredCandidate);
    const cleanCCCD = normalizeCCCD(transferredCandidate.soCCCD);
    const currentGroups = latestGroupsRef.current;
    const currentForms = latestFormsRef.current;

    const existingSame = cleanCCCD
      ? currentGroups.find((g) => normalizeCCCD(currentForms[g.id]?.soCCCD) === cleanCCCD)
      : undefined;

    if (existingSame) {
      const nextForms = { ...currentForms, [existingSame.id]: candidateForm };
      latestFormsRef.current = nextForms;
      setActiveGroupId(existingSame.id);
      setFormsByGroupId(nextForms);
      onBatchEmployeesChange?.(
        currentGroups.map((g) =>
          step1FormToDraft(g, nextForms[g.id] || createInitialStep1FormState(), latestBatchRef.current.find((b) => b.id === g.id))
        )
      );
    } else if (
      currentGroups.length === 1 &&
      isGroupBlankSlot(currentGroups[0], currentForms[currentGroups[0].id])
    ) {
      const targetId = currentGroups[0].id;
      const updatedGroups = [
        { ...currentGroups[0], label: candidateForm.hoVaTen || 'Ứng viên KSK' },
      ];
      const nextForms = { ...currentForms, [targetId]: candidateForm };
      latestGroupsRef.current = updatedGroups;
      latestFormsRef.current = nextForms;
      setFormsByGroupId(nextForms);
      onEmployeeGroupsChange(updatedGroups);
      setActiveGroupId(targetId);
      onBatchEmployeesChange?.(
        updatedGroups.map((g) =>
          step1FormToDraft(g, nextForms[g.id] || createInitialStep1FormState(), latestBatchRef.current.find((b) => b.id === g.id))
        )
      );
    } else {
      const newId = crypto.randomUUID();
      const newGroup: EmployeeDocumentGroup = {
        id: newId,
        label: candidateForm.hoVaTen || 'Ứng viên KSK',
        documents: [],
      };
      const updatedGroups = [...currentGroups, newGroup];
      const nextForms = { ...currentForms, [newId]: candidateForm };
      latestGroupsRef.current = updatedGroups;
      latestFormsRef.current = nextForms;
      setFormsByGroupId(nextForms);
      onEmployeeGroupsChange(updatedGroups);
      setActiveGroupId(newId);
      onBatchEmployeesChange?.(
        updatedGroups.map((g) =>
          step1FormToDraft(g, nextForms[g.id] || createInitialStep1FormState(), latestBatchRef.current.find((b) => b.id === g.id))
        )
      );
    }

    onClearTransferredCandidate?.();
  }, [transferredCandidate, onEmployeeGroupsChange, onClearTransferredCandidate, onBatchEmployeesChange]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load KSK recruitment candidates when component mounts or when modal opens
  const loadRecruitmentCandidates = () => {
    try {
      const cached = localStorage.getItem('hr_recruitment_health_regs');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setRecruitmentList(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    loadRecruitmentCandidates();
  }, []);

  const openKskPickerModal = () => {
    loadRecruitmentCandidates();
    setPickerSearch('');
    setPickerSelectedIds([]);
    setPickerIncludePendingOffer(false);
    setIsPickerOpen(true);
  };

  // Filtered KSK candidates in Picker Modal
  const eligiblePickerCandidates = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return recruitmentList.filter((reg) => {
      if (!isPassedHealthCheck(reg)) return false;
      if (!pickerIncludePendingOffer && !isAcceptedOffer(reg)) return false;
      if (!q) return true;
      return `${reg.hoVaTen} ${reg.soCCCD} ${reg.soDienThoai || ''} ${reg.congViec || ''} ${reg.chucVu || ''} ${reg.phong || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [recruitmentList, pickerSearch, pickerIncludePendingOffer]);

  const alreadyLoadedCCCDSet = useMemo(() => {
    const set = new Set<string>();
    Object.values(formsByGroupId).forEach((f) => {
      const clean = normalizeCCCD(f.soCCCD);
      if (clean) set.add(clean);
    });
    return set;
  }, [formsByGroupId]);

  const togglePickerCandidate = (id: string) => {
    setPickerSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllPicker = () => {
    const selectableIds = eligiblePickerCandidates.map((c) => c.id);
    if (selectableIds.length === 0) return;
    const allSelected = selectableIds.every((id) => pickerSelectedIds.includes(id));
    setPickerSelectedIds(allSelected ? [] : selectableIds);
  };

  const handleConfirmImportKskCandidates = () => {
    const chosen = recruitmentList.filter((reg) => pickerSelectedIds.includes(reg.id));
    if (chosen.length === 0) return;

    const currentGroups = latestGroupsRef.current;
    const currentForms = latestFormsRef.current;

    // If current workspace has just 1 empty untouched slot, replace it cleanly
    const canReplaceSingleBlank =
      currentGroups.length === 1 &&
      isGroupBlankSlot(currentGroups[0], currentForms[currentGroups[0].id]);

    const nextGroups: EmployeeDocumentGroup[] = canReplaceSingleBlank ? [] : [...currentGroups];
    const nextForms: Record<string, Step1EmployeeForm> = canReplaceSingleBlank
      ? {}
      : { ...currentForms };
    const nextStatuses: Record<string, { type: 'info' | 'success' | 'error'; message: string }> = {
      ...statusByGroupId,
    };

    let firstImportedId = '';

    chosen.forEach((reg) => {
      const clean = normalizeCCCD(reg.soCCCD);
      const existingSlot = clean
        ? nextGroups.find((g) => normalizeCCCD(nextForms[g.id]?.soCCCD) === clean)
        : undefined;

      const importedForm = kskCandidateToForm(reg);
      if (existingSlot) {
        nextForms[existingSlot.id] = {
          ...nextForms[existingSlot.id],
          ...importedForm,
          kskLockedFields: importedForm.kskLockedFields,
        };
        if (!firstImportedId) firstImportedId = existingSlot.id;
        nextStatuses[existingSlot.id] = {
          type: 'success',
          message: 'Đã cập nhật thông tin từ Quản lý KSK. Mời nạp thêm ảnh CCCD/VNeID/CV.',
        };
      } else {
        const newId = crypto.randomUUID();
        nextGroups.push({
          id: newId,
          label: importedForm.hoVaTen || reg.hoVaTen,
          documents: [],
        });
        nextForms[newId] = importedForm;
        nextStatuses[newId] = {
          type: 'info',
          message: 'Đã lấy dữ liệu KSK. Tải ảnh để AI điền bù thông tin còn thiếu.',
        };
        if (!firstImportedId) firstImportedId = newId;
      }
    });

    onEmployeeGroupsChange(nextGroups);
    latestGroupsRef.current = nextGroups;
    setFormsByGroupId(nextForms);
    latestFormsRef.current = nextForms;
    setStatusByGroupId(nextStatuses);

    if (firstImportedId) {
      setActiveGroupId(firstImportedId);
    }

    const updatedDrafts = nextGroups.map((g) =>
      step1FormToDraft(
        g,
        nextForms[g.id] || createInitialStep1FormState(),
        latestBatchRef.current.find((b) => b.id === g.id)
      )
    );
    onBatchEmployeesChange?.(updatedDrafts);
    setGlobalError(null);
    setIsPickerOpen(false);
  };

  // Update active candidate form & sync parent draft array cleanly
  const updateFormById = (groupId: string, patch: Partial<Step1EmployeeForm>) => {
    setGlobalError(null);
    const prevForms = latestFormsRef.current;
    const current = prevForms[groupId] || createInitialStep1FormState();
    const updatedForm = { ...current, ...patch };
    const nextForms = { ...prevForms, [groupId]: updatedForm };
    latestFormsRef.current = nextForms;
    setFormsByGroupId(nextForms);

    let updatedGroups = latestGroupsRef.current;
    if (patch.hoVaTen !== undefined) {
      const trimmedName = patch.hoVaTen.trim();
      updatedGroups = latestGroupsRef.current.map((g, i) =>
        g.id === groupId ? { ...g, label: trimmedName || `Nhân viên #${i + 1}` } : g
      );
      latestGroupsRef.current = updatedGroups;
      onEmployeeGroupsChange(updatedGroups);
    }

    onBatchEmployeesChange?.(
      updatedGroups.map((g) =>
        step1FormToDraft(
          g,
          nextForms[g.id] || createInitialStep1FormState(),
          latestBatchRef.current.find((b) => b.id === g.id)
        )
      )
    );
  };

  // Run OCR for a single group using strict Fill-Missing-Only rule against KSK / existing values
  const runOcrForGroup = async (targetGroup: EmployeeDocumentGroup) => {
    if (!targetGroup || targetGroup.documents.length === 0) {
      setStatusByGroupId((prev) => ({
        ...prev,
        [targetGroup.id]: {
          type: 'error',
          message: 'Chưa có ảnh/tài liệu. Vui lòng tải CCCD, VNeID hoặc CV trước khi quét AI.',
        },
      }));
      return;
    }

    setScanningGroupIds((prev) => ({ ...prev, [targetGroup.id]: true }));
    setStatusByGroupId((prev) => ({
      ...prev,
      [targetGroup.id]: {
        type: 'info',
        message: `Đang phân tích ${targetGroup.documents.length} tài liệu bằng AI OCR...`,
      },
    }));

    try {
      const reply = await extractOCRGroup(
        targetGroup,
        (doc) => {
          const base = latestGroupsRef.current;
          const updated = base.map((g) =>
            g.id === targetGroup.id
              ? { ...g, documents: g.documents.map((d) => (d.id === doc.id ? doc : d)) }
              : g
          );
          latestGroupsRef.current = updated;
          onEmployeeGroupsChange(updated);
        },
        (msg) => {
          if (msg) {
            setStatusByGroupId((prev) => ({
              ...prev,
              [targetGroup.id]: { type: 'info', message: msg },
            }));
          }
        },
        'ai'
      );

      if (reply.ok && reply.data?.success && reply.data.data) {
        const d = reply.data.data;
        const ocrName = (d.hoVaTen || d.hoTen || '').trim().toUpperCase();
        const ocrCCCD = normalizeCCCD(d.soCCCD) || (d.soCCCD || '').trim();
        const ocrDob = normalizeDateForInput(d.ngaySinh);
        const ocrCap = normalizeDateForInput(d.ngayCap || d.ngayCapCCCD);
        const ocrHetHan =
          d.ngayHetHanCCCD === 'Không thời hạn'
            ? 'Không thời hạn'
            : normalizeDateForInput(d.ngayHetHanCCCD);

        let resolvedNameForLabel = '';

        setFormsByGroupId((prev) => {
          const cur = prev[targetGroup.id] || createInitialStep1FormState();
          const locked = new Set(cur.kskLockedFields || []);

          // Fill-Missing-Only rule: preserve anything already populated from KSK OR already non-empty
          const fillMissing = (fieldKey: string, currentVal: string, ocrVal?: string): string => {
            const cleanCur = (currentVal || '').trim();
            const cleanOcr = (ocrVal || '').trim();
            if (locked.has(fieldKey) && cleanCur) return currentVal;
            if (cleanCur) return currentVal;
            return cleanOcr;
          };

          // Cross-check KSK pre-filled values against OCR without overwriting KSK
          const kskConflicts: string[] = [];
          if (
            locked.has('hoVaTen') &&
            cur.hoVaTen.trim() &&
            ocrName &&
            normalizeTextCompare(cur.hoVaTen) !== normalizeTextCompare(ocrName)
          ) {
            kskConflicts.push(
              `Họ tên KSK ("${cur.hoVaTen}") khác với ảnh OCR ("${ocrName}") — đã giữ nguyên tên KSK.`
            );
          }
          if (
            locked.has('soCCCD') &&
            cur.soCCCD.trim() &&
            ocrCCCD.length === 12 &&
            normalizeCCCD(cur.soCCCD) !== ocrCCCD
          ) {
            kskConflicts.push(
              `Số CCCD KSK ("${cur.soCCCD}") khác với ảnh OCR ("${ocrCCCD}") — đã giữ nguyên số KSK.`
            );
          }
          if (
            locked.has('ngaySinh') &&
            cur.ngaySinh.trim() &&
            ocrDob &&
            normalizeDateForInput(cur.ngaySinh) !== ocrDob
          ) {
            kskConflicts.push(
              `Ngày sinh KSK ("${cur.ngaySinh}") khác với ảnh OCR ("${ocrDob}") — đã giữ nguyên ngày KSK.`
            );
          }

          const combinedSaiLech = [
            cur.canh_bao_sai_lech,
            d.canh_bao_sai_lech,
            ...kskConflicts,
          ]
            .filter((s) => Boolean(s && s.trim()))
            .filter((v, idx, arr) => arr.indexOf(v) === idx)
            .join('\n');

          const mergedHoVaTen = fillMissing('hoVaTen', cur.hoVaTen, ocrName);
          const mergedNgaySinh = fillMissing('ngaySinh', cur.ngaySinh, ocrDob);
          const mergedGioiTinh = fillMissing('gioiTinh', cur.gioiTinh, d.gioiTinh);
          const mergedDanToc = fillMissing('danToc', cur.danToc, d.danToc);
          const mergedDiaChiThuongTru = fillMissing(
            'diaChiThuongTru',
            cur.diaChiThuongTru,
            d.diaChiThuongTru || d.noiThuongTru
          );

          const hasVneidInGroup =
            targetGroup.documents.some(
              (doc) => doc.docType === 'vneid_cu_tru' || doc.docType === 'xac_nhan_cu_tru'
            ) ||
            Boolean(d.hoTenChuHo || d.quanHeChuHo || d.thanhVienHoGiaDinh?.length);

          const nextHousehold =
            cur.thanhVienHoGiaDinh.length > 0
              ? cur.thanhVienHoGiaDinh
              : applyVneidHouseholdRule({
                  members: d.thanhVienHoGiaDinh,
                  employee: {
                    hoVaTen: mergedHoVaTen,
                    ngaySinh: mergedNgaySinh,
                    gioiTinh: mergedGioiTinh,
                    diaChiThuongTru: mergedDiaChiThuongTru,
                    danToc: mergedDanToc,
                    quocTich: 'Việt Nam',
                  },
                  hoTenChuHo: d.hoTenChuHo,
                  quanHeChuHo: d.quanHeChuHo,
                  chuHoInfo: d.chuHoInfo,
                  hasVneidContext: hasVneidInGroup,
                });

          const merged: Step1EmployeeForm = {
            ...cur,
            hoVaTen: mergedHoVaTen,
            soCCCD: fillMissing('soCCCD', cur.soCCCD, ocrCCCD),
            ngaySinh: mergedNgaySinh,
            gioiTinh: mergedGioiTinh,
            danToc: mergedDanToc,
            tinhTrangHonNhan: fillMissing('tinhTrangHonNhan', cur.tinhTrangHonNhan, d.tinhTrangHonNhan),
            ngayCap: fillMissing('ngayCap', cur.ngayCap, ocrCap),
            ngayHetHanCCCD: fillMissing('ngayHetHanCCCD', cur.ngayHetHanCCCD, ocrHetHan),
            noiCap: fillMissing('noiCap', cur.noiCap, d.noiCap || d.noiCapCCCD),
            queQuan: fillMissing('queQuan', cur.queQuan, d.queQuan),
            diaChiThuongTru: mergedDiaChiThuongTru,
            nguonDiaChi: cur.nguonDiaChi || d.nguonDiaChi,
            ghiChuSapNhap: fillMissing('ghiChuSapNhap', cur.ghiChuSapNhap, d.ghiChuSapNhap),
            soDienThoai: fillMissing('soDienThoai', cur.soDienThoai, d.soDienThoai),
            emailCaNhan: fillMissing('emailCaNhan', cur.emailCaNhan, d.emailCaNhan),
            diaChiTamTru: fillMissing(
              'diaChiTamTru',
              cur.diaChiTamTru,
              d.diaChiTamTru || d.diaChiThuongTru
            ),
            hocVan: fillMissing('hocVan', cur.hocVan, d.hocVan),
            tenTruong: fillMissing('tenTruong', cur.tenTruong, d.tenTruong),
            nganhHoc: fillMissing('nganhHoc', cur.nganhHoc, d.nganhHoc),
            namHoc: fillMissing('namHoc', cur.namHoc, d.namHoc),
            thanhVienHoGiaDinh: nextHousehold,
            thongTinGiaDinh:
              cur.thongTinGiaDinh.length > 0
                ? cur.thongTinGiaDinh
                : Array.isArray(d.thongTinGiaDinh)
                ? d.thongTinGiaDinh
                : [],
            thongTinChuaRo: Array.isArray(d.thongTinChuaRo) ? d.thongTinChuaRo : cur.thongTinChuaRo,
            cauHoiLamRo: Array.from(
              new Set([
                ...(Array.isArray(d.cauHoiLamRo) ? d.cauHoiLamRo : []),
                ...kskConflicts,
              ])
            ),
            canh_bao_sai_lech: combinedSaiLech,
            aiVisionExtracted: d.aiVisionExtracted ?? cur.aiVisionExtracted,
            extractionMethod: d.extractionMethod ?? cur.extractionMethod,
          };

          resolvedNameForLabel = merged.hoVaTen;
          const nextForms = { ...prev, [targetGroup.id]: merged };
          latestFormsRef.current = nextForms;
          return nextForms;
        });

        if (resolvedNameForLabel) {
          const updatedLabelGroups = latestGroupsRef.current.map((g) =>
            g.id === targetGroup.id ? { ...g, label: resolvedNameForLabel } : g
          );
          latestGroupsRef.current = updatedLabelGroups;
          onEmployeeGroupsChange(updatedLabelGroups);
        }

        const nextDrafts = latestGroupsRef.current.map((g) =>
          step1FormToDraft(
            g,
            latestFormsRef.current[g.id] || createInitialStep1FormState(),
            latestBatchRef.current.find((b) => b.id === g.id)
          )
        );
        onBatchEmployeesChange?.(nextDrafts);
        if (onCheckpoint) {
          void onCheckpoint(nextDrafts, latestGroupsRef.current).catch(() => {});
        }

        setStatusByGroupId((prev) => ({
          ...prev,
          [targetGroup.id]: {
            type: 'success',
            message: resolvedNameForLabel
              ? `Đã trích xuất xong hồ sơ ${resolvedNameForLabel} (chỉ điền phần còn thiếu).`
              : 'Đã quét AI xong. Vui lòng kiểm tra thông tin đối chiếu ở cột phải.',
          },
        }));
      } else {
        setStatusByGroupId((prev) => ({
          ...prev,
          [targetGroup.id]: {
            type: 'error',
            message:
              reply.data?.error ||
              reply.error ||
              'Chưa trích xuất được thông tin rõ ràng. Hãy thử ảnh rõ hơn hoặc nhập tay.',
          },
        }));
      }
    } catch (err) {
      setStatusByGroupId((prev) => ({
        ...prev,
        [targetGroup.id]: {
          type: 'error',
          message: `Lỗi quét AI / OCR: ${(err as Error).message}`,
        },
      }));
    } finally {
      setScanningGroupIds((prev) => ({ ...prev, [targetGroup.id]: false }));
    }
  };

  const processSelectedFilesForGroup = async (
    groupId: string,
    fileList: File[],
    autoScan = true
  ) => {
    if (!fileList.length) return;
    const docType: OptimizedImageFile['docType'] = 'cccd_truoc';
    setActiveGroupId(groupId);
    setGlobalError(null);
    setBusy(true);
    onBusyChange?.(true);
    setStatusByGroupId((prev) => ({
      ...prev,
      [groupId]: {
        type: 'info',
        message: `Đang nén tối ưu ${fileList.length} tệp tài liệu...`,
      },
    }));

    try {
      const optimizedDocs = await Promise.all(
        fileList.map((f) => optimizeImageFile(f, docType))
      );
      const currentList = latestGroupsRef.current;
      const targetIndex = currentList.findIndex((g) => g.id === groupId);
      let targetGroup: EmployeeDocumentGroup;
      let nextGroups: EmployeeDocumentGroup[];

      if (targetIndex >= 0) {
        const existing = currentList[targetIndex];
        targetGroup = { ...existing, documents: [...existing.documents, ...optimizedDocs] };
        nextGroups = currentList.map((g) => (g.id === groupId ? targetGroup : g));
      } else {
        targetGroup = { id: groupId, label: 'Nhân viên #1', documents: optimizedDocs };
        nextGroups = [...currentList, targetGroup];
      }

      onEmployeeGroupsChange(nextGroups);
      latestGroupsRef.current = nextGroups;
      if (optimizedDocs[0]) {
        setSelectedPreviewDocByGroupId((prev) => ({ ...prev, [groupId]: optimizedDocs[0].id }));
      }

      if (autoScan) {
        await runOcrForGroup(targetGroup);
      }
    } catch (err) {
      setStatusByGroupId((prev) => ({
        ...prev,
        [groupId]: {
          type: 'error',
          message: `Không thể xử lý tệp tải lên: ${(err as Error).message}`,
        },
      }));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const handleUpdateDocType = (
    groupId: string,
    docId: string,
    docType: OptimizedImageFile['docType']
  ) => {
    const nextGroups = groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            documents: g.documents.map((d) => (d.id === docId ? { ...d, docType } : d)),
          }
        : g
    );
    latestGroupsRef.current = nextGroups;
    onEmployeeGroupsChange(nextGroups);
  };

  const handleAddEmployeeSlot = () => {
    const newId = crypto.randomUUID();
    const newIndex = groups.length + 1;
    const nextGroups = [...groups, { id: newId, label: `Nhân viên #${newIndex}`, documents: [] }];
    onEmployeeGroupsChange(nextGroups);
    setFormsByGroupId((prev) => ({ ...prev, [newId]: createInitialStep1FormState() }));
    setActiveGroupId(newId);
  };

  const handleRemoveEmployeeSlot = (groupId: string) => {
    if (groups.length <= 1) return;
    const nextGroups = groups.filter((g) => g.id !== groupId);
    const nextForms = { ...latestFormsRef.current };
    delete nextForms[groupId];
    latestGroupsRef.current = nextGroups;
    latestFormsRef.current = nextForms;
    onEmployeeGroupsChange(nextGroups);
    setFormsByGroupId(nextForms);
    setStatusByGroupId((prev) => {
      const copy = { ...prev };
      delete copy[groupId];
      return copy;
    });
    onBatchEmployeesChange?.(
      nextGroups.map((g) =>
        step1FormToDraft(
          g,
          nextForms[g.id] || createInitialStep1FormState(),
          latestBatchRef.current.find((b) => b.id === g.id)
        )
      )
    );
    if (activeGroupId === groupId && nextGroups.length > 0) {
      setActiveGroupId(nextGroups[0].id);
    }
  };

  const handleRemoveUploadedDoc = (groupId: string, docId: string) => {
    const nextGroups = groups.map((g) =>
      g.id === groupId ? { ...g, documents: g.documents.filter((d) => d.id !== docId) } : g
    );
    onEmployeeGroupsChange(nextGroups);
    if (selectedPreviewDocByGroupId[groupId] === docId) {
      const remaining = nextGroups.find((g) => g.id === groupId)?.documents || [];
      setSelectedPreviewDocByGroupId((prev) => ({
        ...prev,
        [groupId]: remaining[0]?.id || null,
      }));
    }
    const remainingCount = nextGroups.find((g) => g.id === groupId)?.documents.length || 0;
    if (remainingCount === 0) {
      setStatusByGroupId((prev) => {
        const copy = { ...prev };
        delete copy[groupId];
        return copy;
      });
    }
  };

  const handleScanAllParallel = async () => {
    const groupsWithDocs = groups.filter((g) => g.documents.length > 0);
    if (groupsWithDocs.length === 0) {
      setGlobalError('Vui lòng tải lên ít nhất một ảnh tài liệu cho nhân viên trước khi quét AI OCR.');
      return;
    }
    setGlobalError(null);
    setBusy(true);
    onBusyChange?.(true);
    try {
      await runWithConcurrency(groupsWithDocs, 3, async (g) => {
        await runOcrForGroup(g);
      });
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const allDrafts: BatchEmployeeDraft[] = useMemo(
    () =>
      groups.map((g) =>
        step1FormToDraft(
          g,
          formsByGroupId[g.id] || createInitialStep1FormState(),
          batchEmployees.find((b) => b.id === g.id)
        )
      ),
    [groups, formsByGroupId, batchEmployees]
  );

  const handleProceedNextStep = () => {
    const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
    const currentForm = formsByGroupId[activeGroup.id] || createInitialStep1FormState();

    const incompleteNonBlank = groups.find((g) => {
      const f = formsByGroupId[g.id];
      const hasAnyData =
        g.documents.length > 0 ||
        Boolean(f?.hoVaTen.trim()) ||
        Boolean(f?.soCCCD.trim()) ||
        Boolean(f?.ngaySinh.trim());
      return (
        hasAnyData &&
        (!f?.hoVaTen.trim() ||
          !f?.soCCCD.trim() ||
          !f?.ngaySinh.trim() ||
          !f?.gioiTinh.trim() ||
          !f?.ngayCap.trim() ||
          !f?.ngayHetHanCCCD.trim() ||
          !f?.noiCap.trim())
      );
    });

    if (incompleteNonBlank) {
      const idx = groups.findIndex((g) => g.id === incompleteNonBlank.id);
      setActiveGroupId(incompleteNonBlank.id);
      setGlobalError(
        `Nhân viên #${idx + 1} đang thiếu các trường bắt buộc (Họ tên, Số CCCD, Ngày sinh, Giới tính, Ngày cấp, Ngày hết hạn, Nơi cấp). Vui lòng kiểm tra trước khi sang Bước 2.`
      );
      return;
    }

    const completedDrafts = allDrafts.filter(
      (d) =>
        d.hoVaTen.trim() &&
        d.soCCCD.trim() &&
        d.ngaySinh.trim() &&
        d.gioiTinh.trim() &&
        d.ngayCap.trim() &&
        d.ngayHetHanCCCD.trim() &&
        d.noiCap.trim()
    );
    if (completedDrafts.length === 0) {
      setGlobalError(
        'Vui lòng nhập đầy đủ các trường bắt buộc (Họ tên, Số CCCD, Ngày sinh, Giới tính, Ngày cấp, Ngày hết hạn, Nơi cấp) ít nhất cho 1 nhân viên để tiếp tục sang Bước 2.'
      );
      return;
    }

    setGlobalError(null);
    if (onCheckpoint) {
      void onCheckpoint(completedDrafts, latestGroupsRef.current).catch(() => {});
    }
    onProceedToStep2WithBatch(completedDrafts);
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const activeIndex = Math.max(0, groups.findIndex((g) => g.id === activeGroupId));
  const activeForm = formsByGroupId[activeGroup.id] || createInitialStep1FormState();
  const activeDefaultDoc = pickDefaultPreviewDoc(
    activeGroup.documents,
    selectedPreviewDocByGroupId[activeGroup.id]
  );
  const activeSelectedDocId = activeDefaultDoc?.id || null;
  const anyScanning = Object.values(scanningGroupIds).some(Boolean);
  const totalUploadedFiles = groups.reduce((acc, g) => acc + g.documents.length, 0);
  const kskPreFilledCount = groups.filter(
    (g) => (formsByGroupId[g.id]?.kskLockedFields.length || 0) > 0
  ).length;

  return (
    <div className="space-y-5">
      {/* KHỐI TRÊN: LẤY DỮ LIỆU KSK HÀNG LOẠT & KHUNG UPLOAD RIÊNG CHO TỪNG NHÂN VIÊN */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#1a73e8] text-white text-[11px] font-bold px-2 py-0.5 rounded">
                BƯỚC 1 / 3
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Khai báo thông tin NVM
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openKskPickerModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Lấy từ DS Khám SK</span>
            </button>

            <button
              type="button"
              onClick={handleAddEmployeeSlot}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Thêm nhân viên</span>
            </button>

            <button
              type="button"
              onClick={() => void handleScanAllParallel()}
              disabled={anyScanning || busy || totalUploadedFiles === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {anyScanning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {anyScanning
                  ? 'Đang quét AI song song...'
                  : `Quét AI Tất Cả (${totalUploadedFiles} tệp)`}
              </span>
            </button>
          </div>
        </div>

        {/* Summary strip + Upload tray collapse toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
          <div>
            Đang xử lý <strong>{groups.length}</strong> hồ sơ &middot;{' '}
            <strong>{kskPreFilledCount}</strong> lấy từ KSK (giữ nguyên khi quét OCR) &middot;{' '}
            <strong>{totalUploadedFiles}</strong> tài liệu đã tải
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Chọn khung nhân viên để xem đối chiếu 2 cột song song bên dưới.
            </span>
            <button
              type="button"
              onClick={() => setIsUploadTrayCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer transition"
            >
              {isUploadTrayCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Mở khay tải ảnh ({groups.length})</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thu gọn khay tải ảnh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {globalError && (
          <div
            role="alert"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{globalError}</span>
          </div>
        )}

        {/* Per-employee isolated upload cards */}
        {!isUploadTrayCollapsed && (
        <div
          className={`grid gap-3 ${
            groups.length === 1
              ? 'grid-cols-1'
              : groups.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}
        >
          {groups.map((group, idx) => {
            const isSelected = group.id === activeGroup.id;
            const slotForm = formsByGroupId[group.id] || createInitialStep1FormState();
            const slotStatus = statusByGroupId[group.id];
            const isSlotScanning = Boolean(scanningGroupIds[group.id]);
            const displayName = slotForm.hoVaTen.trim();
            const isKskLinked = slotForm.kskLockedFields.length > 0;

            const draftForCheck = allDrafts.find((d) => d.id === group.id);
            const dupResult = checkGroupDuplicateCCCD(
              group,
              draftForCheck,
              existingRecords,
              groups,
              allDrafts
            );

            return (
              <div
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`rounded-xl p-3.5 transition flex flex-col justify-between gap-2.5 border cursor-pointer ${
                  isSelected
                    ? 'border-[#1a73e8] bg-blue-50/25 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Header khung nhân viên */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          isSelected
                            ? 'bg-[#1a73e8] text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        NV #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {displayName || 'Chưa có họ tên'}
                      </span>
                      {isKskLinked && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-teal-700">
                          <Lock className="w-2.5 h-2.5" />
                          Từ KSK
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                      {slotForm.soCCCD ? `CCCD: ${slotForm.soCCCD}` : 'Chưa có số CCCD'}
                      {slotForm.congViecDuKien ? ` · ${slotForm.congViecDuKien}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {group.documents.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGroupId(group.id);
                          void runOcrForGroup(group);
                        }}
                        disabled={isSlotScanning || busy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-[#1a73e8] text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                        title="Quét AI hồ sơ này"
                      >
                        {isSlotScanning ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>Quét AI</span>
                      </button>
                    )}

                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEmployeeSlot(group.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Xóa khung nhân viên này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Duplicate CCCD quick indicator */}
                {dupResult && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{dupResult.message}</span>
                  </div>
                )}

                {/* Document Type Selector + Compact Dropzone */}
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>


                  <div
                    onClick={() => {
                      setActiveGroupId(group.id);
                      fileInputRefs.current[group.id]?.click();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverGroupId(group.id);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverGroupId((prev) => (prev === group.id ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverGroupId(null);
                      if (e.dataTransfer.files?.length) {
                        void processSelectedFilesForGroup(group.id, Array.from(e.dataTransfer.files));
                      }
                    }}
                    className={`border border-dashed rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 transition cursor-pointer ${
                      dragOverGroupId === group.id
                        ? 'border-[#1a73e8] bg-blue-50'
                        : 'border-slate-300 bg-slate-50/70 hover:border-[#1a73e8]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-[140px] flex-1">
                      <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-700 font-medium">
                        Kéo thả / Chọn ảnh (CCCD, VNeID, CV, Cư trú)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => cameraInputRefs.current[group.id]?.click()}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        title="Chụp ảnh trực tiếp"
                      >
                        <Camera className="w-3 h-3" />
                        <span className="hidden sm:inline">Chụp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[group.id]?.click()}
                        disabled={busy}
                        className="px-2.5 py-1 rounded bg-[#1a73e8] hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Chọn tệp
                      </button>
                    </div>

                    <input
                      ref={(el) => {
                        fileInputRefs.current[group.id] = el;
                      }}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        e.target.value = '';
                        if (files.length) void processSelectedFilesForGroup(group.id, files);
                      }}
                      className="hidden"
                    />
                    <input
                      ref={(el) => {
                        cameraInputRefs.current[group.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        e.target.value = '';
                        if (files.length) void processSelectedFilesForGroup(group.id, files);
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Slot OCR status */}
                {(isSlotScanning || slotStatus) && (
                  <div
                    className={`flex items-center gap-1.5 text-[11px] truncate ${
                      isSlotScanning
                        ? 'text-blue-700'
                        : slotStatus?.type === 'success'
                        ? 'text-emerald-700'
                        : slotStatus?.type === 'error'
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {isSlotScanning ? (
                      <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                    ) : slotStatus?.type === 'success' ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : slotStatus?.type === 'error' ? (
                      <AlertCircle className="w-3 h-3 shrink-0" />
                    ) : null}
                    <span className="truncate">
                      {isSlotScanning ? 'Đang trích xuất AI OCR...' : slotStatus?.message}
                    </span>
                  </div>
                )}

                {/* Uploaded files list for this person */}
                {group.documents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                    {group.documents.map((doc) => {
                      const typeLabel =
                        DOC_TYPE_OPTIONS.find((t) => t.value === doc.docType)?.shortLabel || 'Khác';
                      return (
                        <div
                          key={doc.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGroupId(group.id);
                            setSelectedPreviewDocByGroupId((prev) => ({
                              ...prev,
                              [group.id]: doc.id,
                            }));
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-[11px] text-slate-700 cursor-pointer"
                        >
                          <span className="font-bold text-[#1a73e8]">{typeLabel}</span>
                          <span className="truncate max-w-[110px] font-mono">{doc.fileName}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveUploadedDoc(group.id, doc.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa tệp"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* KHỐI DƯỚI: THANH CHUYỂN HỒ SƠ & CHẾ ĐỘ ĐỐI CHIẾU 2 CỘT SONG SONG (SPLIT-VIEW) */}
      <div className="space-y-3.5">
        {groups.length > 1 && (
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {groups.map((g, idx) => {
                const slotForm = formsByGroupId[g.id];
                const slotName = slotForm?.hoVaTen?.trim();
                const isActive = g.id === activeGroup.id;
                const missingReq = !slotForm?.hoVaTen.trim() || !slotForm?.soCCCD.trim();
                const hasAlerts =
                  Boolean(slotForm?.canh_bao_sai_lech.trim()) ||
                  (slotForm?.cauHoiLamRo.length || 0) > 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroupId(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>
                      NV #{idx + 1}
                      {slotName ? `: ${slotName}` : ''}
                    </span>
                    {!missingReq && !hasAlerts && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-600'}`}
                      />
                    )}
                    {hasAlerts && (
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${isActive ? 'text-amber-200' : 'text-amber-600'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-500">
              Đang đối chiếu Nhân viên #{activeIndex + 1} / {groups.length}
            </span>
          </div>
        )}

        {/* Thanh điều khiển Split-View (Chế độ đối chiếu 2 cột song song & Chuyển nhanh CCCD / VNeID) */}
        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Columns2 className="w-4 h-4 text-[#1a73e8] shrink-0" />
              <span>Đối Chiếu 2 Cột Song Song (Split-View)</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-xs font-semibold text-slate-700 truncate">
              NV #{activeIndex + 1}
              {activeForm.hoVaTen.trim() ? `: ${activeForm.hoVaTen.trim()}` : ''}
            </span>
            {activeGroup.documents.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {activeGroup.documents.map((doc) => {
                  const shortLabel =
                    DOC_TYPE_OPTIONS.find((opt) => opt.value === doc.docType)?.shortLabel || 'Tệp';
                  const isDocActive = activeSelectedDocId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreviewDocByGroupId((prev) => ({
                          ...prev,
                          [activeGroup.id]: doc.id,
                        }));
                        if (splitViewMode === 'form') setSplitViewMode('split');
                      }}
                      className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition cursor-pointer ${
                        isDocActive
                          ? 'bg-blue-50 text-[#1a73e8] border-[#1a73e8]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={`Xem ảnh ${shortLabel}: ${doc.fileName}`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
            <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer">
              <Upload className="w-3 h-3 text-[#1a73e8]" />
              <span>Thêm ảnh</span>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  e.target.value = '';
                  if (files.length) void processSelectedFilesForGroup(activeGroup.id, files);
                }}
              />
            </label>

            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSplitViewMode('split')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                  splitViewMode === 'split'
                    ? 'bg-white text-[#1a73e8] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns2 className="w-3 h-3" />
                <span>2 Cột</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitViewMode('image')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                  splitViewMode === 'image'
                    ? 'bg-white text-[#1a73e8] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Chỉ Ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitViewMode('form')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                  splitViewMode === 'form'
                    ? 'bg-white text-[#1a73e8] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Chỉ Form</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Side-by-Side Comparison Panel */}
        <Step1ComparisonPanel
          activeGroup={activeGroup}
          activeIndex={activeIndex}
          activeForm={activeForm}
          selectedDocId={activeSelectedDocId}
          onSelectDocId={(docId) =>
            setSelectedPreviewDocByGroupId((prev) => ({ ...prev, [activeGroup.id]: docId }))
          }
          onUpdateDocType={handleUpdateDocType}
          onUpdateForm={(patch) => updateFormById(activeGroup.id, patch)}
          allDrafts={allDrafts}
          existingRecords={existingRecords}
          splitViewMode={splitViewMode}
          onQuickUploadFiles={(files) => void processSelectedFilesForGroup(activeGroup.id, files)}
        />

        {/* Primary Action Footer */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-xs text-slate-600">
            Sẵn sàng chuyển{' '}
            <strong className="text-slate-900">
              {allDrafts.filter((d) => d.hoVaTen.trim() && d.soCCCD.trim()).length} / {groups.length}
            </strong>{' '}
            hồ sơ hợp lệ sang Bước 2 (Chọn Đơn Vị &amp; Chức Vụ).
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => updateFormById(activeGroup.id, createInitialStep1FormState())}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Xóa trắng hồ sơ đang xem
            </button>

            <button
              type="button"
              onClick={handleProceedNextStep}
              disabled={anyScanning || busy}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <span>Lưu và sang Bước 2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHỌN NHIỀU ỨNG VIÊN TỪ QUẢN LÝ KSK TUYỂN DỤNG */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-start gap-2.5">
                <Hospital className="w-5 h-5 text-[#1a73e8] mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Chọn Nhiều Ứng Viên Từ Quản Lý KSK Tuyển Dụng
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mặc định lọc ứng viên <strong>Đã khám (Đạt)</strong> và <strong>Đã nhận việc</strong>. Hệ thống sẽ tạo khung tải ảnh riêng cho từng người được chọn.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Select All toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Tìm theo Họ tên, Số CCCD, SĐT, Vị trí..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleSelectAllPicker}
                  disabled={eligiblePickerCandidates.length === 0}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  {eligiblePickerCandidates.length > 0 &&
                  eligiblePickerCandidates.every((c) => pickerSelectedIds.includes(c.id))
                    ? 'Bỏ chọn tất cả'
                    : `Chọn tất cả (${eligiblePickerCandidates.length})`}
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pickerIncludePendingOffer}
                onChange={(e) => setPickerIncludePendingOffer(e.target.checked)}
                className="rounded text-[#1a73e8]"
              />
              <span>Hiển thị thêm ứng viên Đã khám (Đạt) chưa đánh dấu Nhận việc</span>
            </label>

            {/* Candidate list */}
            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
              {eligiblePickerCandidates.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  Không có ứng viên nào thuộc nhóm{' '}
                  <strong>Đã khám (Đạt) và Đã nhận việc</strong> phù hợp.
                  <br />
                  Hãy kiểm tra trạng thái tại module <strong>Quản lý KSK tuyển dụng</strong>.
                </div>
              ) : (
                eligiblePickerCandidates.map((reg) => {
                  const isChecked = pickerSelectedIds.includes(reg.id);
                  const alreadyInWorkspace = alreadyLoadedCCCDSet.has(normalizeCCCD(reg.soCCCD));
                  return (
                    <label
                      key={reg.id}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        isChecked
                          ? 'border-[#1a73e8] bg-blue-50/60'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-[#1a73e8] border-[#1a73e8] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePickerCandidate(reg.id)}
                          className="sr-only"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm uppercase">
                              {reg.hoVaTen}
                            </span>
                            {alreadyInWorkspace && (
                              <span className="text-[10px] font-semibold text-teal-700">
                                · Đã có trong đợt nhập
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 mt-0.5 font-mono text-[11px] tabular-nums">
                            CCCD: {reg.soCCCD} &middot; SĐT: {reg.soDienThoai || '---'} &middot;{' '}
                            {[reg.congViec || reg.viTriViecLam, reg.chucVu]
                              .filter(Boolean)
                              .join(' - ')}
                          </div>
                          {(reg.khoi || reg.phongBanKhoi) && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Đơn vị dự kiến:{' '}
                              {[reg.khoi || reg.phongBanKhoi, reg.ban, reg.phong]
                                .filter(Boolean)
                                .join(' → ')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-bold text-emerald-700">
                          {reg.trangThai || 'Đã khám (Đạt)'}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-700">
                          {reg.trangThaiNhanViec || 'Chưa xử lý'}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-600">
                Đã chọn <strong className="text-[#1a73e8]">{pickerSelectedIds.length}</strong> ứng
                viên
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImportKskCandidates}
                  disabled={pickerSelectedIds.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lấy {pickerSelectedIds.length} Ứng Viên Sang Bước 1</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
