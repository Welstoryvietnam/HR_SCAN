import React, { useEffect, useState } from 'react';
import type {
  BatchEmployeeDraft,
  EmployeeDocumentGroup,
  NhanSuRecord,
  OptimizedImageFile,
  ThanhVienGiaDinh,
  ThanhVienHoGiaDinh,
} from '../types';
import {
  findBatchDuplicateCCCD,
  findSystemDuplicateCCCD,
  normalizeCCCD,
} from '../utils/duplicateCheck';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Lock,
  Plus,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export const DOC_TYPE_OPTIONS: {
  value: OptimizedImageFile['docType'];
  label: string;
  shortLabel: string;
}[] = [
  { value: 'cccd_truoc', label: 'CCCD mặt trước', shortLabel: 'CCCD trước' },
  { value: 'cccd_sau', label: 'CCCD mặt sau', shortLabel: 'CCCD sau' },
  { value: 'vneid_cu_tru', label: 'VNeID cư trú', shortLabel: 'VNeID' },
  { value: 'cv', label: 'CV ứng viên', shortLabel: 'CV' },
  { value: 'xac_nhan_cu_tru', label: 'Xác nhận cư trú', shortLabel: 'Cư trú' },
  { value: 'so_yeu_ly_lich', label: 'Sơ yếu lý lịch', shortLabel: 'SYLL' },
  { value: 'khac', label: 'Tài liệu khác', shortLabel: 'Khác' },
];

export interface Step1EmployeeForm {
  hoVaTen: string;
  ngaySinh: string;
  gioiTinh: string;
  danToc: string;
  tinhTrangHonNhan: string;
  soCCCD: string;
  ngayCap: string;
  ngayHetHanCCCD: string;
  noiCap: string;
  queQuan: string;
  diaChiThuongTru: string;
  nguonDiaChi?: 'VNeID' | 'CCCD';
  ghiChuSapNhap: string;
  soDienThoai: string;
  emailCaNhan: string;
  diaChiTamTru: string;
  hocVan: string;
  tenTruong: string;
  nganhHoc: string;
  namHoc: string;
  khoi: string;
  ban: string;
  phong: string;
  congViecDuKien: string;
  chucVu: string;
  ngayVaoLam: string;
  tinhTrangHoSo: string;
  thamQuyen: '' | 'Trưởng địa điểm' | 'Dinh dưỡng viên trưởng' | 'Giám sát trưởng';
  diemLamViec: string;
  loaiHopDong: string;
  thanhVienHoGiaDinh: ThanhVienHoGiaDinh[];
  thongTinGiaDinh: ThanhVienGiaDinh[];
  thongTinChuaRo: string[];
  cauHoiLamRo: string[];
  canh_bao_sai_lech: string;
  ghiChu: string;
  trangThaiKSK: string;
  kskLockedFields: string[];
  aiVisionExtracted?: boolean;
  extractionMethod?: 'ocr' | 'vision' | 'manual';
  luongCoBan?: number;
  phuCapCoDinh?: number;
  phuCapPhatSinh?: number;
  tongThuNhapDuKien?: number;
}

export const normalizeDateForInput = (raw?: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return trimmed;
};

export const createInitialStep1FormState = (): Step1EmployeeForm => ({
  hoVaTen: '',
  ngaySinh: '',
  gioiTinh: '',
  danToc: '',
  tinhTrangHonNhan: '',
  soCCCD: '',
  ngayCap: '',
  ngayHetHanCCCD: '',
  noiCap: '',
  queQuan: '',
  diaChiThuongTru: '',
  nguonDiaChi: undefined,
  ghiChuSapNhap: '',
  soDienThoai: '',
  emailCaNhan: '',
  diaChiTamTru: '',
  hocVan: '',
  tenTruong: '',
  nganhHoc: '',
  namHoc: '',
  khoi: '',
  ban: '',
  phong: '',
  congViecDuKien: '',
  chucVu: '',
  ngayVaoLam: '',
  tinhTrangHoSo: 'Đủ hồ sơ',
  thamQuyen: '',
  diemLamViec: '',
  loaiHopDong: '',
  thanhVienHoGiaDinh: [],
  thongTinGiaDinh: [],
  thongTinChuaRo: [],
  cauHoiLamRo: [],
  canh_bao_sai_lech: '',
  ghiChu: '',
  trangThaiKSK: '',
  kskLockedFields: [],
});

export const draftToStep1Form = (draft: BatchEmployeeDraft): Step1EmployeeForm => ({
  ...createInitialStep1FormState(),
  hoVaTen: draft.hoVaTen || '',
  ngaySinh: normalizeDateForInput(draft.ngaySinh),
  gioiTinh: draft.gioiTinh || '',
  danToc: draft.danToc || '',
  tinhTrangHonNhan: draft.tinhTrangHonNhan || '',
  soCCCD: draft.soCCCD || '',
  ngayCap: normalizeDateForInput(draft.ngayCap),
  ngayHetHanCCCD: draft.ngayHetHanCCCD === 'Không thời hạn' ? 'Không thời hạn' : normalizeDateForInput(draft.ngayHetHanCCCD),
  noiCap: draft.noiCap || '',
  queQuan: draft.queQuan || '',
  diaChiThuongTru: draft.diaChiThuongTru || '',
  nguonDiaChi: draft.nguonDiaChi,
  ghiChuSapNhap: draft.ghiChuSapNhap || '',
  soDienThoai: draft.soDienThoai || '',
  emailCaNhan: draft.emailCaNhan || '',
  diaChiTamTru: draft.diaChiTamTru || '',
  hocVan: draft.hocVan || '',
  tenTruong: draft.tenTruong || '',
  nganhHoc: draft.nganhHoc || '',
  namHoc: draft.namHoc || '',
  khoi: draft.khoi || '',
  ban: draft.ban || '',
  phong: draft.phong || '',
  congViecDuKien: draft.congViecDuKien || '',
  chucVu: draft.chucVu || '',
  ngayVaoLam: normalizeDateForInput(draft.ngayVaoLam),
  tinhTrangHoSo: draft.tinhTrangHoSo || 'Đủ hồ sơ',
  thamQuyen: draft.thamQuyen || '',
  diemLamViec: draft.diemLamViec || '',
  loaiHopDong: draft.loaiHopDong || '',
  thanhVienHoGiaDinh: Array.isArray(draft.thanhVienHoGiaDinh) ? draft.thanhVienHoGiaDinh : [],
  thongTinGiaDinh: Array.isArray(draft.thongTinGiaDinh) ? draft.thongTinGiaDinh : [],
  thongTinChuaRo: Array.isArray(draft.thongTinChuaRo) ? draft.thongTinChuaRo : [],
  cauHoiLamRo: Array.isArray(draft.cauHoiLamRo) ? draft.cauHoiLamRo : [],
  canh_bao_sai_lech: draft.canh_bao_sai_lech || '',
  ghiChu: draft.ghiChu || '',
  trangThaiKSK: draft.trangThaiKSK || '',
  kskLockedFields: Array.isArray(draft.kskLockedFields) ? draft.kskLockedFields : [],
  aiVisionExtracted: draft.aiVisionExtracted,
  extractionMethod: draft.extractionMethod,
  luongCoBan: draft.luongCoBan,
  phuCapCoDinh: draft.phuCapCoDinh,
  phuCapPhatSinh: draft.phuCapPhatSinh,
  tongThuNhapDuKien: draft.tongThuNhapDuKien,
});

export const step1FormToDraft = (
  group: EmployeeDocumentGroup,
  form: Step1EmployeeForm,
  existingDraft?: BatchEmployeeDraft
): BatchEmployeeDraft => ({
  ...(existingDraft || {}),
  id: group.id,
  hoVaTen: form.hoVaTen.trim().toUpperCase(),
  soCCCD: normalizeCCCD(form.soCCCD) || form.soCCCD.trim(),
  ngaySinh: form.ngaySinh.trim(),
  gioiTinh: form.gioiTinh || 'Nam',
  danToc: form.danToc.trim(),
  tinhTrangHonNhan: form.tinhTrangHonNhan.trim(),
  ngayCap: form.ngayCap.trim(),
  ngayHetHanCCCD: form.ngayHetHanCCCD.trim(),
  noiCap: form.noiCap.trim(),
  queQuan: form.queQuan.trim(),
  diaChiThuongTru: form.diaChiThuongTru.trim(),
  nguonDiaChi: form.nguonDiaChi,
  ghiChuSapNhap: form.ghiChuSapNhap.trim(),
  soDienThoai: form.soDienThoai.trim(),
  emailCaNhan: form.emailCaNhan.trim(),
  diaChiTamTru: form.diaChiTamTru.trim(),
  hocVan: form.hocVan.trim(),
  tenTruong: form.tenTruong.trim(),
  nganhHoc: form.nganhHoc.trim(),
  namHoc: form.namHoc.trim(),
  khoi: form.khoi.trim() || existingDraft?.khoi || '',
  ban: form.ban.trim() || existingDraft?.ban || '',
  phong: form.phong.trim() || existingDraft?.phong || '',
  congViecDuKien: form.congViecDuKien.trim() || existingDraft?.congViecDuKien || '',
  chucVu: form.chucVu.trim() || existingDraft?.chucVu || '',
  ngayVaoLam: form.ngayVaoLam || existingDraft?.ngayVaoLam || '',
  tinhTrangHoSo: form.tinhTrangHoSo || existingDraft?.tinhTrangHoSo || 'Đủ hồ sơ',
  thamQuyen: form.thamQuyen || existingDraft?.thamQuyen || '',
  diemLamViec: form.diemLamViec || existingDraft?.diemLamViec || '',
  loaiHopDong: form.loaiHopDong || existingDraft?.loaiHopDong || '',
  thanhVienHoGiaDinh: form.thanhVienHoGiaDinh,
  thongTinGiaDinh: form.thongTinGiaDinh,
  thongTinChuaRo: form.thongTinChuaRo,
  cauHoiLamRo: form.cauHoiLamRo,
  canh_bao_sai_lech: form.canh_bao_sai_lech.trim(),
  ghiChu: form.ghiChu.trim(),
  trangThaiKSK: form.trangThaiKSK.trim(),
  kskLockedFields: form.kskLockedFields,
  aiVisionExtracted: form.aiVisionExtracted,
  extractionMethod: form.extractionMethod,
  soTaiLieuDinhKem: group.documents.length,
  luongCoBan: existingDraft?.luongCoBan ?? form.luongCoBan,
  phuCapCoDinh: existingDraft?.phuCapCoDinh ?? form.phuCapCoDinh,
  phuCapPhatSinh: existingDraft?.phuCapPhatSinh ?? form.phuCapPhatSinh,
  tongThuNhapDuKien: existingDraft?.tongThuNhapDuKien ?? form.tongThuNhapDuKien,
});

interface Step1ComparisonPanelProps {
  activeGroup: EmployeeDocumentGroup;
  activeIndex: number;
  activeForm: Step1EmployeeForm;
  selectedDocId: string | null;
  onSelectDocId: (docId: string | null) => void;
  onUpdateDocType: (groupId: string, docId: string, docType: OptimizedImageFile['docType']) => void;
  onUpdateForm: (patch: Partial<Step1EmployeeForm>) => void;
  allDrafts: BatchEmployeeDraft[];
  existingRecords: NhanSuRecord[];
  splitViewMode?: 'split' | 'image' | 'form';
  onQuickUploadFiles?: (files: File[]) => void;
}

const DOC_PREVIEW_PRIORITY: OptimizedImageFile['docType'][] = [
  'cccd_truoc',
  'vneid_cu_tru',
  'cccd_sau',
  'xac_nhan_cu_tru',
  'cv',
  'so_yeu_ly_lich',
  'khac',
];

export const pickDefaultPreviewDoc = (
  docs: OptimizedImageFile[],
  preferredDocId?: string | null
): OptimizedImageFile | null => {
  if (!docs || docs.length === 0) return null;
  if (preferredDocId) {
    const matched = docs.find((d) => d.id === preferredDocId);
    if (matched) return matched;
  }
  for (const docType of DOC_PREVIEW_PRIORITY) {
    const found = docs.find((d) => d.docType === docType);
    if (found) return found;
  }
  return docs[0] || null;
};

export const Step1ComparisonPanel: React.FC<Step1ComparisonPanelProps> = ({
  activeGroup,
  activeIndex,
  activeForm,
  selectedDocId,
  onSelectDocId,
  onUpdateDocType,
  onUpdateForm,
  allDrafts,
  existingRecords,
  splitViewMode = 'split',
  onQuickUploadFiles,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const docs = activeGroup.documents || [];
  const activeDoc = pickDefaultPreviewDoc(docs, selectedDocId);
  const activeDocIdx = activeDoc ? docs.findIndex((d) => d.id === activeDoc.id) : -1;
  const activeDocTypeLabel =
    DOC_TYPE_OPTIONS.find((opt) => opt.value === activeDoc?.docType)?.shortLabel || 'Tài liệu';

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [activeDoc?.id, activeGroup.id]);

  const handleStepDoc = (delta: -1 | 1) => {
    if (docs.length <= 1 || activeDocIdx < 0) return;
    const nextIdx = (activeDocIdx + delta + docs.length) % docs.length;
    onSelectDocId(docs[nextIdx].id);
  };

  const jumpToDocTypes = (types: OptimizedImageFile['docType'][]) => {
    for (const t of types) {
      const found = docs.find((d) => d.docType === t);
      if (found) {
        onSelectDocId(found.id);
        return;
      }
    }
  };

  const findDocByType = (t: OptimizedImageFile['docType']) => docs.find((d) => d.docType === t);

  // Anti-hallucination & duplicate checks
  const cleanCCCD = normalizeCCCD(activeForm.soCCCD);
  const systemDup = cleanCCCD.length >= 9 ? findSystemDuplicateCCCD(cleanCCCD, existingRecords) : undefined;
  const batchDup =
    cleanCCCD.length >= 9 ? findBatchDuplicateCCCD(cleanCCCD, activeGroup.id, allDrafts) : undefined;

  const isFieldFlagged = (keywords: string[], currentValue: string): boolean => {
    const normalizedKeywords = keywords.map((k) => k.toLowerCase());
    const inChuaRo = activeForm.thongTinChuaRo.some((item) =>
      normalizedKeywords.some((k) => item.toLowerCase().includes(k))
    );
    if (inChuaRo) return true;
    return false;
  };

  const isKskOrigin = (fieldKey: string) =>
    activeForm.kskLockedFields.includes(fieldKey) && Boolean((activeForm as any)[fieldKey]);

  const inputClass = (flagged: boolean, extra = '') =>
    `w-full px-3 py-2 rounded-lg border text-xs outline-none transition ${
      flagged
        ? 'border-amber-400 bg-amber-50/40 text-slate-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-100'
        : 'border-slate-300 bg-white text-slate-900 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100'
    } ${extra}`;

  const renderFieldLabel = (label: string, fieldKey: string, required = false, keywords: string[] = [], val = '') => {
    const ksk = isKskOrigin(fieldKey);
    const flagged = isFieldFlagged(keywords, val);
    return (
      <div className="flex items-center justify-between gap-1 mb-1">
        <label className="block font-semibold text-slate-700 text-[11px]">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          {ksk && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-teal-700"
              title="Dữ liệu đồng bộ từ KSK (AI OCR không tự ghi đè)"
            >
              <Lock className="w-2.5 h-2.5" />
              KSK
            </span>
          )}
          {flagged && (
            <span className="text-[10px] font-semibold text-amber-700">Cần kiểm tra</span>
          )}
        </div>
      </div>
    );
  };

  const addHouseholdMember = () => {
    onUpdateForm({
      thanhVienHoGiaDinh: [
        ...activeForm.thanhVienHoGiaDinh,
        {
          hoTen: '',
          ngaySinh: '',
          quanHeVoiChuHo: '',
          gioiTinh: 'Nam',
          diaChiThuongTru: activeForm.diaChiThuongTru || '',
          quocTich: 'Việt Nam',
          danToc: activeForm.danToc || 'Kinh',
        },
      ],
    });
  };

  const updateHouseholdMember = (
    idx: number,
    key: keyof ThanhVienHoGiaDinh,
    value: string
  ) => {
    const next = [...activeForm.thanhVienHoGiaDinh];
    next[idx] = { ...next[idx], [key]: key === 'hoTen' ? value.toUpperCase() : value };
    onUpdateForm({ thanhVienHoGiaDinh: next });
  };

  const removeHouseholdMember = (idx: number) => {
    onUpdateForm({
      thanhVienHoGiaDinh: activeForm.thanhVienHoGiaDinh.filter((_, i) => i !== idx),
    });
  };

  const dismissClarificationQuestion = (qIdx: number) => {
    onUpdateForm({
      cauHoiLamRo: activeForm.cauHoiLamRo.filter((_, i) => i !== qIdx),
    });
  };

  const hasAlerts =
    Boolean(systemDup) ||
    Boolean(batchDup) ||
    Boolean(activeForm.canh_bao_sai_lech.trim()) ||
    activeForm.thongTinChuaRo.length > 0 ||
    activeForm.cauHoiLamRo.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-start">
      {/* CỘT TRÁI: TRÌNH XEM ẢNH GỐC ĐỐI CHIẾU (ZOOM & CUỘN ĐỘC LẬP) */}
      {splitViewMode !== 'form' && (
        <div
          className={`${
            splitViewMode === 'image' ? 'md:col-span-12' : 'md:col-span-5'
          } min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs ${
            splitViewMode === 'split'
              ? 'md:sticky md:top-3 md:h-[calc(100vh-11rem)] md:min-h-[500px] md:max-h-[780px]'
              : 'min-h-[460px] md:h-[75vh]'
          }`}
        >
          <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="w-4 h-4 text-[#1a73e8] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Ảnh Gốc Đối Chiếu — NV #{activeIndex + 1}
                  </h4>
                  {activeDoc && (
                    <span className="text-[10px] font-bold text-[#1a73e8] bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                      {activeDocTypeLabel}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeDoc
                    ? `${activeDocIdx + 1}/${docs.length} · ${activeDoc.fileName}`
                    : 'Chưa tải ảnh tài liệu'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {docs.length > 1 && (
                <div className="flex items-center gap-0.5 mr-1">
                  <button
                    type="button"
                    onClick={() => handleStepDoc(-1)}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Tài liệu trước"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepDoc(1)}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Tài liệu tiếp theo"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {activeDoc && activeDoc.mimeType !== 'application/pdf' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="text-[11px] font-mono font-semibold text-slate-700 hover:text-[#1a73e8] px-1 min-w-[42px] text-center tabular-nums cursor-pointer"
                    title="Nhấp để đưa về 100%"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Xoay ảnh 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Đặt lại góc nhìn"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Viewport ảnh/PDF có thanh cuộn ngang & dọc độc lập */}
          <div className="flex-1 min-h-[280px] max-h-[58vh] md:max-h-none overflow-auto bg-slate-100/80 p-3">
            {!activeDoc ? (
              <div className="h-full min-h-[260px] flex items-center justify-center">
                <div className="text-center max-w-xs space-y-2.5 py-6">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Chưa có ảnh gốc cho hồ sơ này
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tải lên CCCD mặt trước/sau, VNeID cư trú, CV hoặc Xác nhận cư trú để đối chiếu song song 2 cột.
                  </p>
                  {onQuickUploadFiles && (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh đối chiếu ngay</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          e.target.value = '';
                          if (files.length) onQuickUploadFiles(files);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ) : activeDoc.mimeType === 'application/pdf' ? (
              <iframe
                src={activeDoc.dataUrl}
                title={activeDoc.fileName}
                className="w-full h-full min-h-[420px] rounded-lg border border-slate-200 bg-white"
              />
            ) : (
              <div className="min-w-full min-h-full flex items-center justify-center">
                <img
                  src={activeDoc.dataUrl}
                  alt={activeDoc.fileName}
                  style={{
                    width: zoom > 1 ? `${Math.round(zoom * 100)}%` : undefined,
                    transform: `${zoom < 1 ? `scale(${zoom}) ` : ''}rotate(${rotation}deg)`.trim(),
                    transformOrigin: 'center center',
                    transition: 'transform 150ms ease, width 150ms ease',
                  }}
                  className={`${
                    zoom > 1 ? 'max-w-none' : 'max-w-full max-h-[520px]'
                  } object-contain rounded-lg shadow-xs bg-white`}
                />
              </div>
            )}
          </div>

          {/* Thanh chọn tài liệu */}
          {docs.length > 0 && (
            <div className="p-2.5 border-t border-slate-200 bg-white space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">
                  Tài liệu ({docs.length})
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {docs.map((doc) => {
                  const isSelected = activeDoc?.id === doc.id;
                  const typeLabel =
                    DOC_TYPE_OPTIONS.find((t) => t.value === doc.docType)?.shortLabel || 'Khác';
                  return (
                    <button
                      type="button"
                      key={doc.id}
                      onClick={() => onSelectDocId(doc.id)}
                      className={`shrink-0 w-24 rounded-lg border p-1.5 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-[#1a73e8] bg-blue-50/70 ring-1 ring-blue-200'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="h-11 w-full rounded bg-white border border-slate-200 overflow-hidden flex items-center justify-center mb-1">
                        {doc.mimeType === 'application/pdf' ? (
                          <FileText className="w-5 h-5 text-rose-500" />
                        ) : (
                          <img
                            src={doc.dataUrl}
                            alt={doc.fileName}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-slate-800 truncate">{typeLabel}</div>
                      <div className="text-[10px] text-slate-500 truncate">{doc.fileName}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CỘT PHẢI: THÔNG TIN TRẢ RA KIỂM TRA CHIẾU (CUỘN ĐỘC LẬP SONG SONG) */}
      {splitViewMode !== 'image' && (
        <div
          className={`${
            splitViewMode === 'form' ? 'md:col-span-12' : 'md:col-span-7'
          } min-w-0 space-y-4 ${
            splitViewMode === 'split'
              ? 'md:max-h-[calc(100vh-11rem)] md:min-h-[500px] md:overflow-y-auto md:pr-1'
              : ''
          }`}
        >
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Thông Tin Trả Ra Kiểm Tra Chiếu — NV #{activeIndex + 1}
              </h4>
              <p className="text-[11px] text-slate-500">
                Đối chiếu trực tiếp từng trường với ảnh gốc bên trái và chỉnh sửa nếu cần
              </p>
            </div>
          </div>
          {activeForm.extractionMethod && (
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              {activeForm.aiVisionExtracted ? 'AI Vision OCR' : 'OCR Chuẩn'}
            </span>
          )}
        </div>

        {/* Khối cảnh báo chống suy đoán & trùng CCCD */}
        {hasAlerts ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Kiểm soát chống suy đoán &amp; đối soát chéo</span>
            </div>

            {systemDup && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                <strong>Trùng CCCD trong hệ thống:</strong> Số CCCD{' '}
                <span className="font-mono font-bold">{cleanCCCD}</span> đã tồn tại ở nhân viên{' '}
                <strong>{systemDup.hoVaTen}</strong> ({systemDup.chucVu || 'Chưa rõ'} — Mã:{' '}
                {systemDup.id}).
              </div>
            )}

            {batchDup && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                <strong>Trùng CCCD trong đợt nhập này:</strong> Số CCCD{' '}
                <span className="font-mono font-bold">{cleanCCCD}</span> trùng với Nhân viên #
                {batchDup.index + 1} ({batchDup.employee.hoVaTen || 'Chưa đặt tên'}).
              </div>
            )}

            {activeForm.canh_bao_sai_lech && (
              <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-amber-950">
                <div className="font-bold text-amber-800 mb-0.5">Cảnh báo sai lệch đối soát:</div>
                <p className="whitespace-pre-line">{activeForm.canh_bao_sai_lech}</p>
              </div>
            )}

            {activeForm.thongTinChuaRo.length > 0 && (
              <div className="text-[11px] text-amber-950">
                <span className="font-bold">Trường chưa rõ / cần kiểm tra: </span>
                <span>{activeForm.thongTinChuaRo.join(' · ')}</span>
              </div>
            )}

            {activeForm.cauHoiLamRo.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-amber-200/80">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Câu hỏi cần nhân sự xác nhận ({activeForm.cauHoiLamRo.length}):</span>
                </div>
                <ul className="space-y-1">
                  {activeForm.cauHoiLamRo.map((q, qIdx) => (
                    <li
                      key={qIdx}
                      className="flex items-start justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 text-[11px] text-slate-800"
                    >
                      <span>{q}</span>
                      <button
                        type="button"
                        onClick={() => dismissClarificationQuestion(qIdx)}
                        className="text-[10px] font-semibold text-emerald-700 hover:underline shrink-0 cursor-pointer"
                      >
                        Đã xác nhận
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          cleanCCCD.length === 12 &&
          activeForm.hoVaTen.trim() && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Hồ sơ đã có Họ tên, CCCD 12 số hợp lệ và không phát hiện trùng lặp hay sai lệch.
              </span>
            </div>
          )
        )}

        {/* Khối 1: Thông tin định danh & Cư trú */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Thông tin định danh, CCCD &amp; cư trú
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              {findDocByType('cccd_truoc') && (
                <button
                  type="button"
                  onClick={() => jumpToDocTypes(['cccd_truoc'])}
                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition ${
                    activeDoc?.docType === 'cccd_truoc'
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                  }`}
                >
                  Xem CCCD trước
                </button>
              )}
              {findDocByType('cccd_sau') && (
                <button
                  type="button"
                  onClick={() => jumpToDocTypes(['cccd_sau'])}
                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition ${
                    activeDoc?.docType === 'cccd_sau'
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                  }`}
                >
                  CCCD sau
                </button>
              )}
              {(findDocByType('vneid_cu_tru') || findDocByType('xac_nhan_cu_tru')) && (
                <button
                  type="button"
                  onClick={() => jumpToDocTypes(['vneid_cu_tru', 'xac_nhan_cu_tru'])}
                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition ${
                    activeDoc?.docType === 'vneid_cu_tru' || activeDoc?.docType === 'xac_nhan_cu_tru'
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                  }`}
                >
                  Xem VNeID
                </button>
              )}
              {activeForm.trangThaiKSK && (
                <span className="font-semibold text-teal-700">
                  KSK: {activeForm.trangThaiKSK}
                </span>
              )}
              {activeForm.nguonDiaChi && (
                <span className="font-semibold text-blue-700">
                  · Nguồn địa chỉ: {activeForm.nguonDiaChi}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2 xl:col-span-1">
              {renderFieldLabel('Họ và tên', 'hoVaTen', true, ['họ tên', 'họ và tên'], activeForm.hoVaTen)}
              <input
                type="text"
                value={activeForm.hoVaTen}
                onChange={(e) => onUpdateForm({ hoVaTen: e.target.value.toUpperCase() })}
                placeholder="VD: NGUYỄN VĂN AN"
                className={inputClass(isFieldFlagged(['họ tên', 'họ và tên'], activeForm.hoVaTen), 'font-semibold uppercase')}
              />
            </div>

            <div>
              {renderFieldLabel('Ngày sinh', 'ngaySinh', true, ['ngày sinh'], activeForm.ngaySinh)}
              <input
                type="date"
                value={normalizeDateForInput(activeForm.ngaySinh)}
                onChange={(e) => onUpdateForm({ ngaySinh: e.target.value })}
                className={inputClass(isFieldFlagged(['ngày sinh'], activeForm.ngaySinh), 'font-mono tabular-nums')}
              />
            </div>

            <div>
              {renderFieldLabel('Giới tính', 'gioiTinh', true, ['giới tính'], activeForm.gioiTinh)}
              <select
                value={activeForm.gioiTinh || 'Nam'}
                onChange={(e) => onUpdateForm({ gioiTinh: e.target.value })}
                className={inputClass(false)}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              {renderFieldLabel('Số CCCD (12 số)', 'soCCCD', true, ['cccd', 'định danh'], activeForm.soCCCD)}
              <input
                type="text"
                value={activeForm.soCCCD}
                onChange={(e) => onUpdateForm({ soCCCD: e.target.value })}
                placeholder="038096xxxxxx"
                className={inputClass(
                  Boolean(systemDup || batchDup) || isFieldFlagged(['cccd'], activeForm.soCCCD),
                  'font-mono tabular-nums'
                )}
              />
            </div>

            <div>
              {renderFieldLabel('Ngày cấp CCCD', 'ngayCap', true, ['ngày cấp'], activeForm.ngayCap)}
              <input
                type="date"
                value={normalizeDateForInput(activeForm.ngayCap)}
                onChange={(e) => onUpdateForm({ ngayCap: e.target.value })}
                className={inputClass(isFieldFlagged(['ngày cấp'], activeForm.ngayCap), 'font-mono tabular-nums')}
              />
            </div>

            <div>
              {renderFieldLabel('Ngày hết hạn', 'ngayHetHanCCCD', true, ['hết hạn'], activeForm.ngayHetHanCCCD)}
              <input
                type="text"
                value={activeForm.ngayHetHanCCCD}
                onChange={(e) => onUpdateForm({ ngayHetHanCCCD: e.target.value })}
                placeholder="YYYY-MM-DD hoặc Không thời hạn"
                className={inputClass(isFieldFlagged(['hết hạn'], activeForm.ngayHetHanCCCD), 'font-mono tabular-nums')}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              {renderFieldLabel('Nơi cấp CCCD', 'noiCap', true, ['nơi cấp'], activeForm.noiCap)}
              <input
                type="text"
                value={activeForm.noiCap}
                onChange={(e) => onUpdateForm({ noiCap: e.target.value })}
                placeholder="Cục Cảnh sát QLHC về TTXH"
                className={inputClass(isFieldFlagged(['nơi cấp'], activeForm.noiCap))}
              />
            </div>

            <div>
              {renderFieldLabel('Dân tộc', 'danToc', false, ['dân tộc'], activeForm.danToc)}
              <input
                type="text"
                value={activeForm.danToc}
                onChange={(e) => onUpdateForm({ danToc: e.target.value })}
                placeholder="VD: Kinh"
                className={inputClass(isFieldFlagged(['dân tộc'], activeForm.danToc))}
              />
            </div>

            <div>
              {renderFieldLabel('Số điện thoại', 'soDienThoai', false, ['điện thoại', 'sđt'], activeForm.soDienThoai)}
              <input
                type="text"
                value={activeForm.soDienThoai}
                onChange={(e) => onUpdateForm({ soDienThoai: e.target.value })}
                placeholder="09xxxxxxxx"
                className={inputClass(isFieldFlagged(['điện thoại'], activeForm.soDienThoai), 'font-mono tabular-nums')}
              />
            </div>

            <div>
              {renderFieldLabel('Email cá nhân', 'emailCaNhan', false, ['email'], activeForm.emailCaNhan)}
              <input
                type="email"
                value={activeForm.emailCaNhan}
                onChange={(e) => onUpdateForm({ emailCaNhan: e.target.value })}
                placeholder="ten@example.com"
                className={inputClass(false)}
              />
            </div>

            <div>
              {renderFieldLabel('Tình trạng hôn nhân', 'tinhTrangHonNhan', false, [], activeForm.tinhTrangHonNhan)}
              <select
                value={activeForm.tinhTrangHonNhan}
                onChange={(e) => onUpdateForm({ tinhTrangHonNhan: e.target.value })}
                className={inputClass(false)}
              >
                <option value="">Chưa xác định</option>
                <option value="Độc thân">Độc thân</option>
                <option value="Chưa kết hôn">Chưa kết hôn</option>
                <option value="Đã kết hôn">Đã kết hôn</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              {renderFieldLabel('Quê quán', 'queQuan', false, ['quê quán'], activeForm.queQuan)}
              <textarea
                rows={2}
                value={activeForm.queQuan}
                onChange={(e) => onUpdateForm({ queQuan: e.target.value })}
                placeholder="Xã/Phường, Huyện/Quận, Tỉnh/TP..."
                className={inputClass(isFieldFlagged(['quê quán'], activeForm.queQuan))}
              />
            </div>

            <div>
              {renderFieldLabel('Địa chỉ thường trú (Ưu tiên VNeID)', 'diaChiThuongTru', false, ['thường trú'], activeForm.diaChiThuongTru)}
              <textarea
                rows={2}
                value={activeForm.diaChiThuongTru}
                onChange={(e) => onUpdateForm({ diaChiThuongTru: e.target.value })}
                placeholder="Số nhà, đường, phường/xã mới nhất..."
                className={inputClass(isFieldFlagged(['thường trú'], activeForm.diaChiThuongTru))}
              />
            </div>
          </div>

          {(activeForm.ghiChuSapNhap || activeForm.ghiChu) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                  Ghi chú sáp nhập địa giới
                </label>
                <input
                  type="text"
                  value={activeForm.ghiChuSapNhap}
                  onChange={(e) => onUpdateForm({ ghiChuSapNhap: e.target.value })}
                  placeholder="Ghi chú đơn vị hành chính mới..."
                  className={inputClass(false)}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                  Ghi chú hồ sơ
                </label>
                <input
                  type="text"
                  value={activeForm.ghiChu}
                  onChange={(e) => onUpdateForm({ ghiChu: e.target.value })}
                  placeholder="Ghi chú bổ sung..."
                  className={inputClass(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Khối 2: Học vấn (Trích xuất từ CV hoặc nhập bổ sung) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#1a73e8]" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Học vấn (từ CV / nhập bổ sung)
              </h4>
            </div>
            {(findDocByType('cv') || findDocByType('so_yeu_ly_lich')) && (
              <button
                type="button"
                onClick={() => jumpToDocTypes(['cv', 'so_yeu_ly_lich'])}
                className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition ${
                  activeDoc?.docType === 'cv' || activeDoc?.docType === 'so_yeu_ly_lich'
                    ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                }`}
              >
                Xem ảnh CV / SYLL
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                Trình độ học vấn
              </label>
              <input
                type="text"
                value={activeForm.hocVan}
                onChange={(e) => onUpdateForm({ hocVan: e.target.value })}
                placeholder="VD: Đại học / Cao đẳng"
                className={inputClass(false)}
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                Tên trường
              </label>
              <input
                type="text"
                value={activeForm.tenTruong}
                onChange={(e) => onUpdateForm({ tenTruong: e.target.value })}
                placeholder="VD: ĐH Công nghiệp"
                className={inputClass(false)}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                Ngành học
              </label>
              <input
                type="text"
                value={activeForm.nganhHoc}
                onChange={(e) => onUpdateForm({ nganhHoc: e.target.value })}
                placeholder="VD: Kỹ thuật chế biến"
                className={inputClass(false)}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                Năm học / Tốt nghiệp
              </label>
              <input
                type="text"
                value={activeForm.namHoc}
                onChange={(e) => onUpdateForm({ namHoc: e.target.value })}
                placeholder="VD: 2019 - 2023"
                className={inputClass(false, 'font-mono tabular-nums')}
              />
            </div>
          </div>
        </div>

        {/* Khối 3: Thành viên hộ gia đình (từ VNeID) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1a73e8]" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Thành viên hộ gia đình ({activeForm.thanhVienHoGiaDinh.length})
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(findDocByType('vneid_cu_tru') || findDocByType('xac_nhan_cu_tru')) && (
                <button
                  type="button"
                  onClick={() => jumpToDocTypes(['vneid_cu_tru', 'xac_nhan_cu_tru'])}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer transition ${
                    activeDoc?.docType === 'vneid_cu_tru' || activeDoc?.docType === 'xac_nhan_cu_tru'
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                  }`}
                >
                  Đối chiếu VNeID cư trú
                </button>
              )}
              <button
                type="button"
                onClick={addHouseholdMember}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thành viên</span>
              </button>
            </div>
          </div>

          {activeForm.thanhVienHoGiaDinh.length === 0 ? (
            <p className="text-xs text-slate-500 py-2 leading-relaxed">
              Chưa có dữ liệu thành viên hộ gia đình. Tải ảnh VNeID cư trú để hệ thống tự trích xuất mục <strong>Thông tin cư trú → Thông tin chủ hộ thường trú</strong> (tự đưa đương sự với vai trò Chủ hộ nếu trùng, hoặc đưa cả Chủ hộ thường trú và đương sự nếu khác nhau), hoặc nhấn &ldquo;Thêm thành viên&rdquo; để nhập tay.
            </p>
          ) : (
            <>
              {/* Hiển thị dạng thẻ đầy đủ mọi trường trên màn hình nhỏ / vừa để không bị khuất cột */}
              <div className="xl:hidden space-y-3">
                {activeForm.thanhVienHoGiaDinh.map((member, mIdx) => (
                  <div
                    key={mIdx}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        Thành viên #{mIdx + 1}
                        {member.quanHeVoiChuHo ? ` — ${member.quanHeVoiChuHo}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeHouseholdMember(mIdx)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa thành viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Họ và tên
                        </label>
                        <input
                          type="text"
                          value={member.hoTen}
                          onChange={(e) => updateHouseholdMember(mIdx, 'hoTen', e.target.value)}
                          placeholder="Họ và tên"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs uppercase font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Mối quan hệ với chủ hộ
                        </label>
                        <input
                          type="text"
                          value={member.quanHeVoiChuHo}
                          onChange={(e) => updateHouseholdMember(mIdx, 'quanHeVoiChuHo', e.target.value)}
                          placeholder="Chủ hộ / Con đẻ / Vợ..."
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Ngày sinh
                        </label>
                        <input
                          type="text"
                          value={member.ngaySinh}
                          onChange={(e) => updateHouseholdMember(mIdx, 'ngaySinh', e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Giới tính
                        </label>
                        <select
                          value={member.gioiTinh || 'Nam'}
                          onChange={(e) => updateHouseholdMember(mIdx, 'gioiTinh', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Địa chỉ thường trú
                        </label>
                        <input
                          type="text"
                          value={member.diaChiThuongTru}
                          onChange={(e) => updateHouseholdMember(mIdx, 'diaChiThuongTru', e.target.value)}
                          placeholder="Địa chỉ thường trú"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Quốc tịch
                        </label>
                        <input
                          type="text"
                          value={member.quocTich}
                          onChange={(e) => updateHouseholdMember(mIdx, 'quocTich', e.target.value)}
                          placeholder="Việt Nam"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          Dân tộc
                        </label>
                        <input
                          type="text"
                          value={member.danToc}
                          onChange={(e) => updateHouseholdMember(mIdx, 'danToc', e.target.value)}
                          placeholder="Kinh"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hiển thị dạng bảng đầy đủ trên màn hình rộng (xl+) */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="px-2 py-2 font-semibold">Họ và tên</th>
                      <th className="px-2 py-2 font-semibold">Ngày sinh</th>
                      <th className="px-2 py-2 font-semibold">Quan hệ chủ hộ</th>
                      <th className="px-2 py-2 font-semibold">Giới tính</th>
                      <th className="px-2 py-2 font-semibold">Địa chỉ thường trú</th>
                      <th className="px-2 py-2 font-semibold">Quốc tịch</th>
                      <th className="px-2 py-2 font-semibold">Dân tộc</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeForm.thanhVienHoGiaDinh.map((member, mIdx) => (
                      <tr key={mIdx}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={member.hoTen}
                            onChange={(e) => updateHouseholdMember(mIdx, 'hoTen', e.target.value)}
                            placeholder="Họ tên"
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs uppercase"
                          />
                        </td>
                        <td className="p-1.5 w-24">
                          <input
                            type="text"
                            value={member.ngaySinh}
                            onChange={(e) => updateHouseholdMember(mIdx, 'ngaySinh', e.target.value)}
                            placeholder="DD/MM/YYYY"
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                          />
                        </td>
                        <td className="p-1.5 w-28">
                          <input
                            type="text"
                            value={member.quanHeVoiChuHo}
                            onChange={(e) => updateHouseholdMember(mIdx, 'quanHeVoiChuHo', e.target.value)}
                            placeholder="Chủ hộ / Con"
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                          />
                        </td>
                        <td className="p-1.5 w-20">
                          <select
                            value={member.gioiTinh || 'Nam'}
                            onChange={(e) => updateHouseholdMember(mIdx, 'gioiTinh', e.target.value)}
                            className="w-full px-1.5 py-1 rounded border border-slate-300 text-xs bg-white"
                          >
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                          </select>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={member.diaChiThuongTru}
                            onChange={(e) => updateHouseholdMember(mIdx, 'diaChiThuongTru', e.target.value)}
                            placeholder="Địa chỉ thường trú"
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                          />
                        </td>
                        <td className="p-1.5 w-24">
                          <input
                            type="text"
                            value={member.quocTich}
                            onChange={(e) => updateHouseholdMember(mIdx, 'quocTich', e.target.value)}
                            placeholder="Việt Nam"
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                          />
                        </td>
                        <td className="p-1.5 w-20">
                          <input
                            type="text"
                            value={member.danToc}
                            onChange={(e) => updateHouseholdMember(mIdx, 'danToc', e.target.value)}
                            placeholder="Kinh"
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeHouseholdMember(mIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa thành viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </div>
      )}
    </div>
  );
};
