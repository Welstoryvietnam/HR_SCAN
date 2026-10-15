import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  X,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { OptimizedImageFile, BatchEmployeeDraft, EmployeeDocumentGroup } from '../types';
import { BatchDocumentUploader } from './BatchDocumentUploader';
import { formatBytes, optimizeImageFile } from '../utils/imageOptimizer';

interface DocumentUploaderProps {
  images: OptimizedImageFile[];
  onImagesChange: (images: OptimizedImageFile[]) => void;
  onExtractAI: () => void;
  isProcessingAI: boolean;
  onProceedToStep2Direct?: () => void;
  batchEmployees?: BatchEmployeeDraft[];
  onBatchEmployeesChange?: (employees: BatchEmployeeDraft[]) => void;
  onProceedToStep2WithBatch?: (employees: BatchEmployeeDraft[]) => void;
  employeeGroups: EmployeeDocumentGroup[];
  onEmployeeGroupsChange: (groups: EmployeeDocumentGroup[]) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  images,
  onImagesChange,
  onExtractAI,
  isProcessingAI,
  onProceedToStep2Direct,
  batchEmployees,
  onBatchEmployeesChange,
  onProceedToStep2WithBatch,
  employeeGroups,
  onEmployeeGroupsChange,
}) => {
  const [batchMode, setBatchMode] = useState(employeeGroups.length > 0);
  const [batchBusy, setBatchBusy] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<OptimizedImageFile | null>(null);
  const [justSnapped, setJustSnapped] = useState(false);
  const [snappedCountInSession, setSnappedCountInSession] = useState(0);

  // Trạng thái tải file từ máy tính/điện thoại
  const [isOptimizingFiles, setIsOptimizingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Xử lý khi người dùng chọn file ảnh hoặc PDF từ máy tính / điện thoại
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsOptimizingFiles(true);
    try {
      const filesArray = Array.from(fileList);
      const newItems: OptimizedImageFile[] = [];

      for (const file of filesArray) {
        // Tối ưu hóa ảnh (resize 1024px, nén jpeg) hoặc nạp file PDF
        const optimized = await optimizeImageFile(file, 'khac');
        newItems.push(optimized);
      }

      onImagesChange([...images, ...newItems]);
    } catch (err) {
      console.error('Lỗi tải tệp ảnh/PDF:', err);
    } finally {
      setIsOptimizingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Khởi động Camera
  const startCamera = async () => {
    setCameraError(null);
    setSnappedCountInSession(0);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Ưu tiên camera sau trên thiết bị di động
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
      setCameraError('Không thể truy cập Camera. Vui lòng cấp quyền truy cập Camera trong trình duyệt để chụp ảnh.');
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
    setSnappedCountInSession(0);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Chụp ảnh từ Camera (Hỗ trợ chụp liên tiếp nhiều ảnh không cần đóng camera)
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;

    // Giới hạn max width 1024px để tối ưu token & tốc độ xử lý
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
    const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const base64Data = rawBase64.replace(/[\r\n\s]+/g, '');
    const compressedSize = Math.round((base64Data.length * 3) / 4);

    const nextIndex = images.length + 1;
    const capturedItem: OptimizedImageFile = {
      id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      fileName: `Anh_Ho_So_${String(nextIndex).padStart(2, '0')}.jpg`,
      originalSize: compressedSize * 4,
      compressedSize: compressedSize,
      width,
      height,
      mimeType: 'image/jpeg',
      base64Data,
      dataUrl,
      docType: 'khac',
    };

    onImagesChange([...images, capturedItem]);
    setSnappedCountInSession((prev) => prev + 1);
    setJustSnapped(true);
    setTimeout(() => setJustSnapped(false), 500);
  };

  // Xóa 1 tài liệu
  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  // Thống kê số ảnh và số file PDF
  const pdfCount = images.filter((img) => img.mimeType === 'application/pdf' || img.fileName.toLowerCase().endsWith('.pdf')).length;
  const imageCount = images.length - pdfCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Chế độ nhập hồ sơ">
        <button type="button" disabled={isProcessingAI || batchBusy} aria-pressed={!batchMode} onClick={() => setBatchMode(false)} className={`rounded-lg px-4 py-2 text-xs font-bold ${!batchMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Một nhân viên</button>
        <button type="button" disabled={isProcessingAI || batchBusy} aria-pressed={batchMode} onClick={() => { stopCamera(); setBatchMode(true); if (!employeeGroups.length) onEmployeeGroupsChange([{id:crypto.randomUUID(),label:'',documents:[]}]); }} className={`rounded-lg px-4 py-2 text-xs font-bold ${batchMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Nhiều nhân viên</button>
      </div>
      {batchMode && onProceedToStep2WithBatch ? <BatchDocumentUploader groups={employeeGroups} employees={batchEmployees || []} onChange={onEmployeeGroupsChange} onProceed={onProceedToStep2WithBatch} onBusyChange={setBatchBusy} onDraftsChange={onBatchEmployeesChange} /> : <>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Tiếp Nhận &amp; Đính Kèm Tài Liệu Hồ Sơ
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chọn 1 trong 2 phương thức: <strong>Tải lên file Ảnh / PDF</strong> hoặc <strong>Chụp ảnh trực tiếp bằng Camera</strong>.
          </p>
        </div>
      </div>

      {/* 2 LỰA CHỌN RÕ RÀNG THEO YÊU CẦU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* ========================================================================= */}
        {/* LỰA CHỌN 1: TẢI LÊN FILE ẢNH HOẶC PDF */}
        {/* ========================================================================= */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center flex flex-col items-center justify-between transition relative ${
            dragOver
              ? 'border-blue-500 bg-blue-50/70'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-blue-400'
          }`}
        >
          <div className="w-full flex flex-col items-center">
            <span className="inline-block text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full mb-3 uppercase tracking-wider">
              Lựa Chọn 1
            </span>
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-3 ring-4 ring-blue-100">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Tải Lên File Ảnh Hoặc PDF
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-xs leading-relaxed">
              Kéo thả hoặc chọn tệp <strong>Ảnh (JPG, PNG, WEBP)</strong> hoặc <strong>Tệp PDF</strong> từ máy tính, điện thoại.
            </p>
          </div>

          <div className="mt-5 w-full max-w-xs">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              disabled={isOptimizingFiles}
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-600 rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
            >
              {isOptimizingFiles ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Đang xử lý tệp...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Chọn File Ảnh hoặc PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LỰA CHỌN 2: CHỤP ẢNH TÀI LIỆU BẰNG CAMERA */}
        {/* ========================================================================= */}
        <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 rounded-2xl p-6 sm:p-7 text-center flex flex-col items-center justify-between shadow-xs">
          <div className="w-full flex flex-col items-center">
            <span className="inline-block text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full mb-3 uppercase tracking-wider">
              Lựa Chọn 2
            </span>
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-3 ring-4 ring-indigo-100">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Chụp Ảnh Tài Liệu Bằng Camera
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-xs leading-relaxed">
              Mở camera để chụp trực tiếp CCCD, Sơ yếu lý lịch. Hỗ trợ chụp liên tiếp nhiều trang không cần thoát.
            </p>
          </div>

          <div className="mt-5 w-full max-w-xs">
            <button
              type="button"
              onClick={startCamera}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>Mở Camera Chụp Ảnh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Live Modal with Continuous Batch Capture */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm">
                  Chụp ảnh hồ sơ nhân sự ({images.length} ảnh đã chụp)
                </span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                title="Đóng camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport with Guide Frame */}
            <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-rose-300 text-xs sm:text-sm">
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

                  {/* Flash effect when snapping */}
                  {justSnapped && (
                    <div className="absolute inset-0 bg-white/70 animate-ping pointer-events-none" />
                  )}

                  {/* Guide Frame */}
                  <div className="absolute inset-6 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
                    <span className="bg-black/60 text-emerald-300 text-[11px] font-medium px-3 py-1 rounded-full backdrop-blur-xs">
                      Căn tài liệu / giấy tờ ngay ngắn trong khung
                    </span>
                    {snappedCountInSession > 0 && (
                      <span className="bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã chụp {snappedCountInSession} ảnh trong phiên này!</span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Controls */}
            <div className="p-3.5 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 text-center sm:text-left">
                💡 Bấm <strong>"📸 Chụp Ảnh"</strong> liên tiếp để chụp nhiều trang. Xong bấm <strong>"Hoàn Tất"</strong>.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hoàn Tất ({images.length} Tài Liệu)
                </button>

                <button
                  type="button"
                  onClick={captureSnapshot}
                  disabled={!!cameraError}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Chụp Ảnh ({images.length + 1})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner thông báo khi đã nạp hồ sơ của nhiều người */}
      {batchEmployees && batchEmployees.length > 1 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Đã nạp hồ sơ của <strong>{batchEmployees.length} nhân sự khác nhau</strong>:{' '}
              {batchEmployees.map((b, i) => `#${i + 1} ${b.hoVaTen}`).join(' | ')}.
            </span>
          </div>
          {onProceedToStep2WithBatch && (
            <button
              type="button"
              onClick={() => onProceedToStep2WithBatch(batchEmployees)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Vào Bước 2 duyệt cả {batchEmployees.length} người</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Gallery danh sách tài liệu đã đính kèm (Ảnh & PDF) */}
      {images.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Danh sách tài liệu đã đính kèm ({images.length} tài liệu: {imageCount} ảnh, {pdfCount} file PDF)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                onImagesChange([]);
                if (onBatchEmployeesChange) onBatchEmployeesChange([]);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img, idx) => {
              const isPdf = img.mimeType === 'application/pdf' || img.fileName.toLowerCase().endsWith('.pdf');
              const personTag = img.fileName.includes('NguyenVanAn')
                ? { name: 'Người #1: Nguyễn Văn An', color: 'bg-blue-100 text-blue-800 border-blue-200' }
                : img.fileName.includes('Mai_Hoa')
                ? { name: 'Người #2: Trần Thị Mai Hoa', color: 'bg-pink-100 text-pink-800 border-pink-200' }
                : img.fileName.includes('Hoang_Nam')
                ? { name: 'Người #3: Lê Hoàng Nam', color: 'bg-purple-100 text-purple-800 border-purple-200' }
                : null;

              return (
                <div
                  key={img.id}
                  className="group relative border border-slate-200 rounded-xl p-2 bg-slate-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-xs transition"
                >
                  <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
                    {isPdf ? (
                      /* Hiển thị card đặc trưng cho file PDF */
                      <div className="w-full h-full bg-rose-50 flex flex-col items-center justify-center p-3 text-center">
                        <FileText className="w-10 h-10 text-rose-500 mb-1" />
                        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                          TỆP PDF
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-full px-2">
                          {img.fileName}
                        </span>
                      </div>
                    ) : (
                      /* Hiển thị ảnh thu nhỏ */
                      <img
                        src={img.dataUrl}
                        alt={img.fileName}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <div className="absolute top-1 left-1">
                      <span className={`text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs ${
                        isPdf ? 'bg-rose-600/90' : 'bg-slate-900/80'
                      }`}>
                        #{idx + 1} {isPdf && 'PDF'}
                      </span>
                    </div>

                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(img)}
                        className="p-1 bg-white/90 hover:bg-white text-slate-700 rounded-md shadow text-xs cursor-pointer"
                        title="Xem trước"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow text-xs cursor-pointer"
                        title="Xóa tài liệu này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate max-w-[110px]" title={img.fileName}>
                        {img.fileName}
                      </span>
                      <span className="font-mono text-emerald-700 font-medium">
                        {formatBytes(img.compressedSize)}
                      </span>
                    </div>

                    {personTag && (
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none truncate ${personTag.color}`}>
                        {personTag.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Modal (Hỗ trợ cả File PDF lẫn Ảnh) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 max-h-[90vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                {previewImage.mimeType === 'application/pdf' ? (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-xs rounded">
                    PDF
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded">
                    ẢNH
                  </span>
                )}
                <span className="font-bold text-sm text-slate-900 truncate max-w-md">
                  {previewImage.fileName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-[70vh]">
              {previewImage.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewImage.dataUrl}
                  title={previewImage.fileName}
                  className="w-full h-[70vh] bg-white rounded-xl border border-slate-200"
                />
              ) : (
                <img
                  src={previewImage.dataUrl}
                  alt={previewImage.fileName}
                  className="max-h-[70vh] object-contain"
                />
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Định dạng: {previewImage.mimeType}</span>
              <span>Dung lượng: {formatBytes(previewImage.compressedSize)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Area: Proceed to AI Extraction or Direct Step 2 */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            {images.length === 0
              ? 'Vui lòng chọn Tải file Ảnh/PDF hoặc Chụp ảnh bằng Camera để tiếp tục.'
              : `Đã sẵn sàng ${images.length} tài liệu (${imageCount} ảnh, ${pdfCount} file PDF).`}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          {onProceedToStep2Direct && (
            <button
              type="button"
              onClick={onProceedToStep2Direct}
              disabled={images.length === 0 || isProcessingAI}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Chuyển thẳng sang Bước 2 để đối chiếu tài liệu trực tiếp song song với biểu mẫu"
            >
              <span>Vào Thẳng Bước 2 (Đối Chiếu)</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
          )}

          <button
            onClick={onExtractAI}
            disabled={images.length === 0 || isProcessingAI}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      </>}
    </div>
  );
};
