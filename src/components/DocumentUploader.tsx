import React, { useState, useRef, useEffect } from 'react';
import { OptimizedImageFile, BatchEmployeeDraft } from '../types';
import { optimizeImageFile, formatBytes } from '../utils/imageOptimizer';
import { createSyntheticDocument } from '../data/sampleDocs';
import { DEFAULT_BATCH_EMPLOYEES_SAMPLE } from '../data/sampleBatchEmployees';
import {
  Upload,
  Camera,
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Eye,
  Info,
  Layers,
  X,
  Users,
  UserPlus,
  ArrowRight,
  ClipboardPaste,
  ShieldCheck,
  Check,
  FileSpreadsheet
} from 'lucide-react';

interface DocumentUploaderProps {
  images: OptimizedImageFile[];
  onImagesChange: (images: OptimizedImageFile[]) => void;
  onExtractAI: () => void;
  isProcessingAI: boolean;
  batchEmployees?: BatchEmployeeDraft[];
  onBatchEmployeesChange?: (employees: BatchEmployeeDraft[]) => void;
  onProceedToStep2WithBatch?: (employees: BatchEmployeeDraft[]) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  images,
  onImagesChange,
  onExtractAI,
  isProcessingAI,
  batchEmployees = [],
  onBatchEmployeesChange,
  onProceedToStep2WithBatch,
}) => {
  // Lựa chọn phương thức tiếp nhận hồ sơ tại Bước 1:
  // 1. Trích xuất AI qua ảnh (Đơn lẻ)
  // 2. Thêm 1 loạt thông tin nhiều nhân viên (Batch Mode)
  const [entryMode, setEntryMode] = useState<'single_ai' | 'batch_multi'>('batch_multi');

  // Danh sách nhân viên đang thêm hàng loạt ở Bước 1
  const [localBatchList, setLocalBatchList] = useState<BatchEmployeeDraft[]>(
    batchEmployees.length > 0 ? batchEmployees : DEFAULT_BATCH_EMPLOYEES_SAMPLE
  );

  // Form nhập nhanh 1 nhân viên mới vào danh sách hàng loạt
  const [draftName, setDraftName] = useState('');
  const [draftCCCD, setDraftCCCD] = useState('');
  const [draftDOB, setDraftDOB] = useState('');
  const [draftGender, setDraftGender] = useState('Nam');
  const [draftOrigin, setDraftOrigin] = useState('');
  const [draftAddress, setDraftAddress] = useState('');
  const [draftSource, setDraftSource] = useState<'VNeID' | 'CCCD'>('VNeID');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Đồng bộ lại khi batchEmployees từ ngoài thay đổi
  useEffect(() => {
    if (batchEmployees && batchEmployees.length > 0) {
      setLocalBatchList(batchEmployees);
    }
  }, [batchEmployees]);

  const updateBatch = (newList: BatchEmployeeDraft[]) => {
    setLocalBatchList(newList);
    if (onBatchEmployeesChange) {
      onBatchEmployeesChange(newList);
    }
  };

  // Thêm 1 nhân sự từ form nhanh vào danh sách
  const handleAddEmployeeToBatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftName.trim() || !draftCCCD.trim()) {
      alert('Vui lòng nhập tối thiểu Họ và tên và Số CCCD!');
      return;
    }

    const newEmp: BatchEmployeeDraft = {
      id: `batch_emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      hoVaTen: draftName.trim().toUpperCase(),
      ngaySinh: draftDOB.trim() || '01/01/1995',
      gioiTinh: draftGender,
      soCCCD: draftCCCD.trim(),
      ngayCap: '01/01/2022',
      noiCap: 'Cục Cảnh sát QLHC về TTXH',
      queQuan: draftOrigin.trim() || 'Hà Nội',
      diaChiThuongTru: draftAddress.trim() || 'Hà Nội',
      nguonDiaChi: draftSource,
      ghiChuSapNhap: draftNotes.trim() || (draftSource === 'VNeID' ? 'Đã xác thực theo VNeID' : 'Theo CCCD gắn chip'),
      soDienThoai: draftPhone.trim() || '0900000000',
      khoi: 'FS MANAGEMENT',
      ban: 'FS1',
      phong: 'FPT TOWER',
      congViecDuKien: 'Đầu Bếp',
      chucVu: 'Bếp Trưởng',
      diemLamViec: 'Hà Nội - FPT Tower',
      loaiHopDong: 'Toàn thời gian (Chính thức)',
    };

    updateBatch([...localBatchList, newEmp]);

    // Reset form
    setDraftName('');
    setDraftCCCD('');
    setDraftDOB('');
    setDraftOrigin('');
    setDraftAddress('');
    setDraftPhone('');
    setDraftNotes('');
  };

  // Nạp 4 nhân viên mẫu để test nhanh quy trình hàng loạt
  const handleLoadSampleBatch = () => {
    updateBatch(DEFAULT_BATCH_EMPLOYEES_SAMPLE);
  };

  // Xóa 1 nhân sự khỏi danh sách
  const handleRemoveBatchItem = (id: string) => {
    updateBatch(localBatchList.filter((e) => e.id !== id));
  };

  // Xử lý dán nhiều dòng từ Excel hoặc bảng
  const handleParsePastedText = () => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: BatchEmployeeDraft[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/\t|,|\|/).map((p) => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          id: `batch_pasted_${Date.now()}_${idx}`,
          hoVaTen: parts[0]?.toUpperCase() || `NHÂN VIÊN ${idx + 1}`,
          soCCCD: parts[1] || '001099000000',
          ngaySinh: parts[2] || '01/01/1996',
          gioiTinh: parts[3] || 'Nam',
          queQuan: parts[4] || 'Hà Nội',
          diaChiThuongTru: parts[5] || 'Hà Nội',
          soDienThoai: parts[6] || '0912000000',
          nguonDiaChi: 'VNeID',
          ghiChuSapNhap: 'Nhập nhanh từ danh sách',
          khoi: 'FS MANAGEMENT',
          ban: 'FS1',
          phong: 'FPT TOWER',
          congViecDuKien: 'Đầu Bếp',
          chucVu: 'Bếp Trưởng',
          diemLamViec: 'Hà Nội - FPT Tower',
          loaiHopDong: 'Toàn thời gian (Chính thức)',
        });
      }
    });

    if (parsed.length > 0) {
      updateBatch([...localBatchList, ...parsed]);
      setShowPasteModal(false);
      setPasteRawText('');
    } else {
      alert('Không nhận diện được định dạng dòng. Định dạng gợi ý: Họ tên [TAB] CCCD [TAB] Ngày sinh [TAB] Giới tính');
    }
  };

  // Nút hành động chuyển sang Bước 2
  const handleProceedToStep2 = () => {
    if (localBatchList.length === 0) {
      alert('Vui lòng thêm ít nhất 1 nhân viên vào danh sách hoặc bấm "Nạp 4 nhân sự mẫu" để tiếp tục.');
      return;
    }
    if (onProceedToStep2WithBatch) {
      onProceedToStep2WithBatch(localBatchList);
    }
  };

  const [isCompressing, setIsCompressing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<OptimizedImageFile['docType']>('cccd_truoc');
  const [previewImage, setPreviewImage] = useState<OptimizedImageFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Tính tổng dung lượng gốc vs sau nén
  const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalCompressed = images.reduce((sum, img) => sum + img.compressedSize, 0);
  const percentSaved = totalOriginal > 0 ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100) : 0;

  // Xử lý nén các file được chọn
  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);

    try {
      const newImages: OptimizedImageFile[] = [...images];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        // Xác định loại tài liệu thông minh theo tên file
        let detectedType: OptimizedImageFile['docType'] = selectedDocType;
        const nameLower = file.name.toLowerCase();
        if (nameLower.includes('vneid') || nameLower.includes('vne_id') || nameLower.includes('vn_eid') || nameLower.includes('dinh_danh')) {
          detectedType = 'vneid_cu_tru';
        } else if (nameLower.includes('sau') || nameLower.includes('back')) {
          detectedType = 'cccd_sau';
        } else if (nameLower.includes('truoc') || nameLower.includes('front') || nameLower.includes('cccd')) {
          detectedType = 'cccd_truoc';
        } else if (nameLower.includes('so_yeu') || nameLower.includes('ly_lich') || nameLower.includes('cv')) {
          detectedType = 'so_yeu_ly_lich';
        } else if (nameLower.includes('cu_tru') || nameLower.includes('tam_tru') || nameLower.includes('ho_khau')) {
          detectedType = 'xac_nhan_cu_tru';
        }

        // Tối ưu hóa ảnh phía Client: Max Width 1024px, JPEG 0.8
        const optimized = await optimizeImageFile(file, detectedType, 1024, 0.8);
        newImages.push(optimized);
      }

      onImagesChange(newImages);
    } catch (err) {
      console.error('Lỗi nén ảnh:', err);
      alert('Không thể nén hình ảnh: ' + (err as Error).message);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Khởi động Camera
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Ưu tiên camera sau trên điện thoại
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Lỗi mở camera:', err);
      setCameraError('Không thể truy cập Camera. Vui lòng cấp quyền trong trình duyệt hoặc sử dụng nút tải ảnh.');
    }
  };

  // Dừng Camera
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Chụp ảnh từ Camera và nén ngay lập tức
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;

    // Giới hạn max width 1024px
    if (width > 1024) {
      const ratio = 1024 / width;
      width = 1024;
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const compressedSize = Math.round((base64Data.length * 3) / 4);

    const capturedItem: OptimizedImageFile = {
      id: 'snap_' + Date.now(),
      fileName: `Chup_Camera_${selectedDocType}_${Date.now().toString().slice(-4)}.jpg`,
      originalSize: compressedSize * 4, // ước lượng dung lượng gốc nếu chưa nén
      compressedSize: compressedSize,
      width,
      height,
      mimeType: 'image/jpeg',
      base64Data,
      dataUrl,
      docType: selectedDocType,
    };

    onImagesChange([...images, capturedItem]);
    stopCamera();
  };

  // Nạp tài liệu mẫu synthetic demo (CCCD + Sơ yếu lý lịch)
  const loadDemoSamples = () => {
    const doc1 = createSyntheticDocument('cccd_truoc');
    const doc2 = createSyntheticDocument('cccd_sau');
    const doc3 = createSyntheticDocument('so_yeu_ly_lich');

    const demoImages: OptimizedImageFile[] = [
      {
        id: 'demo_1_' + Date.now(),
        fileName: doc1.fileName,
        originalSize: 2450000,
        compressedSize: Math.round((doc1.base64Data.length * 3) / 4),
        width: 1000,
        height: 630,
        mimeType: 'image/jpeg',
        base64Data: doc1.base64Data,
        dataUrl: doc1.dataUrl,
        docType: 'cccd_truoc',
      },
      {
        id: 'demo_2_' + Date.now(),
        fileName: doc2.fileName,
        originalSize: 2180000,
        compressedSize: Math.round((doc2.base64Data.length * 3) / 4),
        width: 1000,
        height: 630,
        mimeType: 'image/jpeg',
        base64Data: doc2.base64Data,
        dataUrl: doc2.dataUrl,
        docType: 'cccd_sau',
      },
      {
        id: 'demo_3_' + Date.now(),
        fileName: doc3.fileName,
        originalSize: 3120000,
        compressedSize: Math.round((doc3.base64Data.length * 3) / 4),
        width: 800,
        height: 1100,
        mimeType: 'image/jpeg',
        base64Data: doc3.base64Data,
        dataUrl: doc3.dataUrl,
        docType: 'so_yeu_ly_lich',
      },
    ];

    onImagesChange(demoImages);
  };

  // Nạp tài liệu mẫu có kèm ảnh màn hình VNeID (Kiểm thử cơ chế ưu tiên địa chỉ sau sáp nhập)
  const loadDemoSamplesWithVNeID = () => {
    const vneidDoc = createSyntheticDocument('vneid_cu_tru');
    const cccdFront = createSyntheticDocument('cccd_truoc');
    const cccdBack = createSyntheticDocument('cccd_sau');
    const cvDoc = createSyntheticDocument('so_yeu_ly_lich');

    const demoImages: OptimizedImageFile[] = [
      {
        id: 'demo_vneid_' + Date.now(),
        fileName: vneidDoc.fileName,
        originalSize: 2800000,
        compressedSize: Math.round((vneidDoc.base64Data.length * 3) / 4),
        width: 720,
        height: 1280,
        mimeType: 'image/jpeg',
        base64Data: vneidDoc.base64Data,
        dataUrl: vneidDoc.dataUrl,
        docType: 'vneid_cu_tru',
      },
      {
        id: 'demo_cccd1_' + Date.now(),
        fileName: cccdFront.fileName,
        originalSize: 2450000,
        compressedSize: Math.round((cccdFront.base64Data.length * 3) / 4),
        width: 1000,
        height: 630,
        mimeType: 'image/jpeg',
        base64Data: cccdFront.base64Data,
        dataUrl: cccdFront.dataUrl,
        docType: 'cccd_truoc',
      },
      {
        id: 'demo_cccd2_' + Date.now(),
        fileName: cccdBack.fileName,
        originalSize: 2180000,
        compressedSize: Math.round((cccdBack.base64Data.length * 3) / 4),
        width: 1000,
        height: 630,
        mimeType: 'image/jpeg',
        base64Data: cccdBack.base64Data,
        dataUrl: cccdBack.dataUrl,
        docType: 'cccd_sau',
      },
      {
        id: 'demo_cv_' + Date.now(),
        fileName: cvDoc.fileName,
        originalSize: 3120000,
        compressedSize: Math.round((cvDoc.base64Data.length * 3) / 4),
        width: 800,
        height: 1100,
        mimeType: 'image/jpeg',
        base64Data: cvDoc.base64Data,
        dataUrl: cvDoc.dataUrl,
        docType: 'so_yeu_ly_lich',
      },
    ];

    onImagesChange(demoImages);
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const updateDocType = (id: string, newType: OptimizedImageFile['docType']) => {
    onImagesChange(
      images.map((img) => (img.id === id ? { ...img, docType: newType } : img))
    );
  };

  const docTypeLabels: Record<OptimizedImageFile['docType'], string> = {
    vneid_cu_tru: '⭐ VNeID (Cư trú / Quê quán)',
    cccd_truoc: 'CCCD Mặt trước',
    cccd_sau: 'CCCD Mặt sau',
    so_yeu_ly_lich: 'Sơ yếu lý lịch',
    xac_nhan_cu_tru: 'Giấy cư trú',
    khac: 'Tài liệu khác',
  };

  const hasVneidDoc = images.some((img) => img.docType === 'vneid_cu_tru');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
              BƯỚC 1
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Tiếp Nhận Thông Tin &amp; Hồ Sơ Nhân Sự Đầu Vào
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full hidden sm:inline-block">
              Hỗ Trợ Hàng Loạt
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chọn thêm 1 loạt nhiều nhân viên cùng lúc hoặc Scan/Trích xuất AI từng ảnh CCCD 2 mặt &amp; màn hình VNeID cư trú sau sáp nhập.
          </p>
        </div>

        {/* Chuyển đổi phương thức: Thêm Hàng Loạt vs Scan AI Đơn lẻ */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setEntryMode('batch_multi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              entryMode === 'batch_multi'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thêm Hàng Loạt ({localBatchList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('single_ai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              entryMode === 'single_ai'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan AI Qua Ảnh</span>
          </button>
        </div>
      </div>

      {/* ===================== CHẾ ĐỘ 1: THÊM 1 LOẠT NHIỀU NHÂN VIÊN (BATCH MODE) ===================== */}
      {entryMode === 'batch_multi' && (
        <div className="space-y-5">
          {/* Top Banner & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Users className="w-4 h-4 text-blue-700" />
                <span>Tiếp nhận danh sách nhiều nhân sự cùng lúc (Batch Mode)</span>
              </div>
              <p className="text-xs text-blue-700 mt-0.5">
                Thêm danh sách nhân viên ở Bước 1 &rarr; Chuẩn hóa ở Bước 2 &rarr; <strong>Điền công việc, chức vụ của nhiều người cùng lúc ở Bước 3</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleBatch}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                title="Nạp ngay 4 nhân sự mẫu thực tế với CCCD và địa chỉ VNeID đã chuẩn hóa"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Nạp Nhanh 4 Nhân Sự Mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                title="Dán nhiều dòng từ Excel hoặc bảng tính"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dán từ Excel</span>
              </button>

              {localBatchList.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateBatch([])}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                >
                  Xóa hết
                </button>
              )}
            </div>
          </div>

          {/* Form thêm nhanh nhân viên mới */}
          <form
            onSubmit={handleAddEmployeeToBatch}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Thêm Nhanh Nhân Sự Vào Danh Sách Tiếp Nhận:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal italic">
                (Điền các thông tin cơ bản, vị trí công việc &amp; chức vụ sẽ gán đồng loạt ở Bước 3)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: NGUYỄN VĂN AN"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Số CCCD (12 số) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="Vd: 001095012345"
                  value={draftCCCD}
                  onChange={(e) => setDraftCCCD(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ngày sinh (DD/MM/YYYY)</label>
                <input
                  type="text"
                  placeholder="15/04/1995"
                  value={draftDOB}
                  onChange={(e) => setDraftDOB(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giới tính</label>
                  <select
                    value={draftGender}
                    onChange={(e) => setDraftGender(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nguồn địa chỉ</label>
                  <select
                    value={draftSource}
                    onChange={(e) => setDraftSource(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold text-emerald-800"
                  >
                    <option value="VNeID">⭐ VNeID</option>
                    <option value="CCCD">CCCD</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Quê quán</label>
                <input
                  type="text"
                  placeholder="Xã Kim Chung, Huyện Hoài Đức, TP Hà Nội"
                  value={draftOrigin}
                  onChange={(e) => setDraftOrigin(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  placeholder="Số 28, Ngõ 195 Cầu Giấy, Phường Dịch Vọng, Cầu Giấy, Hà Nội"
                  value={draftAddress}
                  onChange={(e) => setDraftAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  placeholder="0912345678"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-slate-600 font-semibold mb-1">Ghi chú sáp nhập địa giới</label>
                  <input
                    type="text"
                    placeholder="Đã xác thực theo ứng dụng VNeID mới nhất"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0 h-[32px] cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Thêm Vào Danh Sách</span>
                </button>
              </div>
            </div>
          </form>

          {/* Bảng danh sách các nhân viên đang tiếp nhận */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
                <span className="text-xs font-bold text-slate-800">
                  Danh Sách Nhân Sự Tiếp Nhận Đợt Này ({localBatchList.length} nhân viên)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Bước 1 &rarr; Chọn danh sách &rarr; Chuyển sang Bước 2
              </span>
            </div>

            {localBatchList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Chưa có nhân viên nào trong danh sách</p>
                <p className="text-xs text-slate-400 mt-1">
                  Hãy điền thông tin phía trên hoặc bấm <strong>"⚡ Nạp Nhanh 4 Nhân Sự Mẫu"</strong> để thử nghiệm ngay lập tức.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200 font-bold z-10">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">STT</th>
                      <th className="py-2 px-3">Họ và Tên</th>
                      <th className="py-2 px-3">Số CCCD</th>
                      <th className="py-2 px-3">Ngày Sinh</th>
                      <th className="py-2 px-3">Giới Tính</th>
                      <th className="py-2 px-3">Nguồn Địa Chỉ</th>
                      <th className="py-2 px-3">Địa Chỉ Thường Trú</th>
                      <th className="py-2 px-3">SĐT</th>
                      <th className="py-2 px-3 text-center w-16">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {localBatchList.map((emp, idx) => (
                      <tr key={emp.id} className="hover:bg-blue-50/40 transition">
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{emp.hoVaTen}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-blue-900">{emp.soCCCD}</td>
                        <td className="py-2 px-3 text-slate-600">{emp.ngaySinh}</td>
                        <td className="py-2 px-3 text-slate-600">{emp.gioiTinh}</td>
                        <td className="py-2 px-3">
                          {emp.nguonDiaChi === 'VNeID' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ⭐ VNeID
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              CCCD
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={emp.diaChiThuongTru}>
                          {emp.diaChiThuongTru}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{emp.soDienThoai}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBatchItem(emp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Xóa nhân sự này khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* HÀNG ĐỘNG CHÍNH CHUYỂN SANG BƯỚC 2 THEO YÊU CẦU CỦA NGƯỜI DÙNG */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {localBatchList.length === 0
                  ? 'Vui lòng thêm ít nhất 1 nhân viên hoặc nạp mẫu để chuyển sang Bước 2.'
                  : `Đã có ${localBatchList.length} nhân viên trong danh sách. Bấm nút bên phải để lựa chọn và chuyển sang Bước 2.`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleProceedToStep2}
              disabled={localBatchList.length === 0}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Lựa Chọn {localBatchList.length} Nhân Viên Này &amp; Chuyển Sang Bước 2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== CHẾ ĐỘ 2: TRÍCH XUẤT AI QUA ẢNH (SINGLE AI) ===================== */}
      {entryMode === 'single_ai' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-600">
              Trích xuất tự động qua ảnh CCCD 2 mặt &amp; VNeID bằng Gemini AI Multimodal Vision.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDemoSamplesWithVNeID}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-xs transition"
                title="Thử nghiệm cơ chế ưu tiên địa chỉ sau sáp nhập từ màn hình VNeID"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp Mẫu VNeID + CCCD (Test Ưu Tiên)</span>
              </button>
              <button
                type="button"
                onClick={loadDemoSamples}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
                title="Tải bộ ảnh mẫu mô phỏng CCCD 2 mặt & Sơ yếu lý lịch"
              >
                <span>Mẫu CCCD Thường</span>
              </button>
            </div>
          </div>

      {/* VNeID Priority Highlight Banner */}
      {hasVneidDoc && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
          <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">⭐ ĐÃ PHÁT HIỆN ẢNH CHỤP MÀN HÌNH VNeID:</span>
            <p className="mt-0.5 text-amber-800">
              Hệ thống đã kích hoạt <strong>quy tắc ƯU TIÊN VNeID</strong>. Khi trích xuất, AI sẽ tự động lấy địa chỉ thường trú &amp; quê quán từ màn hình VNeID (đã cập nhật đơn vị hành chính mới nhất sau đợt sáp nhập cấp tỉnh/huyện/xã) thay vì đọc trên mặt thẻ CCCD.
            </p>
          </div>
        </div>
      )}

      {/* Upload & Camera Buttons Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/30 transition flex flex-col items-center justify-center min-h-[160px] cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
            accept="image/*"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Nhấn để tải hoặc Kéo thả nhiều ảnh cùng lúc
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Hỗ trợ JPG, PNG, WEBP (CCCD mặt trước/sau, Sơ yếu lý lịch, Giấy cư trú)
          </p>
        </div>

        {/* Camera Live Capture */}
        <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-slate-50 to-blue-50/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">Chụp Trực Tiếp Bằng Camera</h3>
              </div>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Mobile & Desktop</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Tiện lợi khi nhân viên sử dụng điện thoại chụp CCCD và giấy tờ để nộp hồ sơ ngay tại chỗ.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 focus:outline-blue-600"
            >
              <option value="vneid_cu_tru">⭐ VNeID (Cư trú / Quê quán)</option>
              <option value="cccd_truoc">CCCD Mặt trước</option>
              <option value="cccd_sau">CCCD Mặt sau</option>
              <option value="so_yeu_ly_lich">Sơ yếu lý lịch</option>
              <option value="xac_nhan_cu_tru">Giấy cư trú</option>
              <option value="khac">Tài liệu khác</option>
            </select>

            <button
              onClick={startCamera}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Mở Camera Chụp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Live Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-sm">
                  Chụp tài liệu: {docTypeLabels[selectedDocType]}
                </span>
              </div>
              <button
                onClick={stopCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-rose-300 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
                  {cameraError}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Khung hướng dẫn căn chỉnh CCCD */}
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="bg-black/60 text-emerald-300 text-xs px-3 py-1 rounded-full">
                      Căn giấy tờ vuông vắn trong khung
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Ảnh chụp sẽ được nén về 1024px JPEG 0.8
              </span>
              <div className="flex gap-2">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={captureSnapshot}
                  disabled={!!cameraError}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator when compressing */}
      {isCompressing && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Đang thực hiện Resize 1024px và nén JPEG 0.8 phía Client...</span>
        </div>
      )}

      {/* Token & Bandwidth Savings Statistics Bar */}
      {images.length > 0 && (
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-emerald-900">
              Hiệu Quả Tối Ưu Hóa Token Thị Giác (Vision Tokens):
            </span>
            <span className="text-emerald-700">
              {formatBytes(totalOriginal)} (gốc) &rarr;{' '}
              <strong className="text-emerald-900">{formatBytes(totalCompressed)}</strong> (sau nén 1024px)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded-full text-[11px]">
              Tiết kiệm {percentSaved}% dung lượng & tokens
            </span>
            <span className="text-slate-500 hidden sm:inline">
              ({images.length} tài liệu sẵn sàng)
            </span>
          </div>
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách tài liệu đã chuẩn bị ({images.length})
            </h3>
            <button
              onClick={() => onImagesChange([])}
              className="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative border border-slate-200 rounded-xl p-2.5 bg-slate-50/40 hover:bg-white hover:border-blue-400 hover:shadow-xs transition"
              >
                <div className="relative aspect-16/10 rounded-lg overflow-hidden bg-slate-200">
                  <img
                    src={img.dataUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <span className="bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-xs">
                      {img.width} &times; {img.height}px
                    </span>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button
                      onClick={() => setPreviewImage(img)}
                      className="p-1 bg-white/90 hover:bg-white text-slate-700 rounded-md shadow text-xs"
                      title="Xem phóng to"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md shadow text-xs"
                      title="Xóa tài liệu này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={img.fileName}>
                      {img.fileName}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">
                      {formatBytes(img.compressedSize)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={img.docType}
                      onChange={(e) => updateDocType(img.id, e.target.value as any)}
                      className="text-[11px] border border-slate-300 rounded px-1.5 py-1 bg-white text-slate-700 w-full"
                    >
                      <option value="vneid_cu_tru">⭐ VNeID (Cư trú / Quê quán)</option>
                      <option value="cccd_truoc">CCCD Mặt trước</option>
                      <option value="cccd_sau">CCCD Mặt sau</option>
                      <option value="so_yeu_ly_lich">Sơ yếu lý lịch</option>
                      <option value="xac_nhan_cu_tru">Giấy cư trú</option>
                      <option value="khac">Tài liệu khác</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Trigger AI Extract */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            {images.length === 0
              ? 'Vui lòng chọn ít nhất 1 ảnh hoặc bấm "Nạp Mẫu CCCD & Sơ Yếu Lý Lịch" để bắt đầu.'
              : `Đã sẵn sàng truyền ${images.length} tài liệu đã tối ưu lên Gemini Vision AI (Hỗ trợ tự động dự phòng & chống quá tải).`}
          </span>
        </div>

        <button
          onClick={onExtractAI}
          disabled={images.length === 0 || isProcessingAI}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isProcessingAI ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang phân tích với Gemini Vision...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Chạy AI Vision Trích Xuất Hồ Sơ</span>
            </>
          )}
        </button>
      </div>
      </div>
      )}

      {/* Modal dán nhiều dòng từ Excel */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                <span>Dán Nhanh Danh Sách Nhân Viên Từ Excel / Bảng Tính</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Copy các dòng từ file Excel hoặc Google Sheets (cột cách nhau bằng tab hoặc dấu phẩy) rồi dán vào khung dưới đây. Định dạng các cột gợi ý:
              <br />
              <code className="text-indigo-700 font-mono font-bold bg-indigo-50 px-1 py-0.5 rounded">
                Họ và tên [TAB] Số CCCD [TAB] Ngày sinh [TAB] Giới tính [TAB] Quê quán [TAB] Thường trú [TAB] SĐT
              </code>
            </p>

            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="NGUYỄN VĂN AN	001095012345	15/04/1995	Nam	Hà Nội	Hà Nội	0912345678&#10;TRẦN THỊ MAI	038198004567	20/08/1998	Nữ	Ninh Bình	Hà Nội	0987654321"
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Nạp Dữ Liệu Vào Danh Sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="text-sm font-bold text-slate-800 truncate mr-4">
                {previewImage.fileName} ({docTypeLabels[previewImage.docType]})
              </div>
              <button onClick={() => setPreviewImage(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-900 rounded-lg p-2">
              <img src={previewImage.dataUrl} alt="Preview" className="max-h-[65vh] object-contain rounded" />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-slate-500">
              <span>Độ phân giải: {previewImage.width} &times; {previewImage.height}px</span>
              <span>Dung lượng nén: {formatBytes(previewImage.compressedSize)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
