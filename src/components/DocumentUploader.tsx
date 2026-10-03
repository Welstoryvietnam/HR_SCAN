import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  X,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { OptimizedImageFile, BatchEmployeeDraft } from '../types';
import { formatBytes } from '../utils/imageOptimizer';
import { createSyntheticDocument } from '../data/sampleDocs';

interface DocumentUploaderProps {
  images: OptimizedImageFile[];
  onImagesChange: (images: OptimizedImageFile[]) => void;
  onExtractAI: () => void;
  isProcessingAI: boolean;
  onProceedToStep2Direct?: () => void;
  batchEmployees?: BatchEmployeeDraft[];
  onBatchEmployeesChange?: (employees: BatchEmployeeDraft[]) => void;
  onProceedToStep2WithBatch?: (employees: BatchEmployeeDraft[]) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  images,
  onImagesChange,
  onExtractAI,
  isProcessingAI,
  onProceedToStep2Direct,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<OptimizedImageFile | null>(null);
  const [justSnapped, setJustSnapped] = useState(false);
  const [snappedCountInSession, setSnappedCountInSession] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  // Nạp 4 tài liệu mẫu để test nhanh quy trình mà không cần quét thực tế
  const loadDemoSamples = () => {
    const doc1 = createSyntheticDocument('cccd_truoc');
    const doc2 = createSyntheticDocument('cccd_sau');
    const doc3 = createSyntheticDocument('so_yeu_ly_lich');
    const doc4 = createSyntheticDocument('vneid_cu_tru');

    const demoImages: OptimizedImageFile[] = [
      {
        id: 'demo_1_' + Date.now(),
        fileName: 'CCCD_MatTruoc_NguyenVanAn.jpg',
        originalSize: 2450000,
        compressedSize: Math.round((doc1.base64Data.length * 3) / 4),
        width: 1000,
        height: 630,
        mimeType: 'image/jpeg',
        base64Data: doc1.base64Data,
        dataUrl: doc1.dataUrl,
        docType: 'khac',
      },
      {
        id: 'demo_2_' + Date.now(),
        fileName: 'CCCD_MatSau_NguyenVanAn.jpg',
        originalSize: 2280000,
        compressedSize: Math.round((doc2.base64Data.length * 3) / 4),
        width: 1000,
        height: 630,
        mimeType: 'image/jpeg',
        base64Data: doc2.base64Data,
        dataUrl: doc2.dataUrl,
        docType: 'khac',
      },
      {
        id: 'demo_3_' + Date.now(),
        fileName: 'SoYeuLyLich_NguyenVanAn.jpg',
        originalSize: 3100000,
        compressedSize: Math.round((doc3.base64Data.length * 3) / 4),
        width: 800,
        height: 1100,
        mimeType: 'image/jpeg',
        base64Data: doc3.base64Data,
        dataUrl: doc3.dataUrl,
        docType: 'khac',
      },
      {
        id: 'demo_4_' + Date.now(),
        fileName: 'VNeID_CuTru_NguyenVanAn.jpg',
        originalSize: 2100000,
        compressedSize: Math.round((doc4.base64Data.length * 3) / 4),
        width: 800,
        height: 1000,
        mimeType: 'image/jpeg',
        base64Data: doc4.base64Data,
        dataUrl: doc4.dataUrl,
        docType: 'khac',
      },
    ];

    onImagesChange([...images, ...demoImages]);
  };

  // Xóa 1 ảnh
  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
      {/* Top Header & Fast Demo Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Tiếp Nhận Hồ Sơ Bằng Camera
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chụp ảnh trực tiếp tài liệu hồ sơ nhân sự (CCCD, Sơ yếu lý lịch, Giấy xác nhận cư trú, VNeID...) qua camera.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDemoSamples}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
          title="Nạp nhanh 4 ảnh mẫu mô phỏng để kiểm tra quy trình"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ Nạp 4 Ảnh Mẫu (Test Nhanh)</span>
        </button>
      </div>

      {/* KHU VỰC DUY NHẤT: NÚT BẤM CHỤP ẢNH HỒ SƠ NHÂN SỰ */}
      <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50/80 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-4 ring-4 ring-indigo-100">
          <Camera className="w-8 h-8" />
        </div>

        <h3 className="font-bold text-slate-900 text-base sm:text-lg">
          Chụp Ảnh Hồ Sơ Nhân Sự Bằng Camera
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
          Bấm nút bên dưới để mở camera. Bạn có thể chụp liên tiếp nhiều trang hoặc nhiều hồ sơ mà không cần đóng camera.
        </p>

        {/* NÚT BẤM DUY NHẤT THEO YÊU CẦU */}
        <div className="mt-5 w-full max-w-sm">
          <button
            type="button"
            onClick={startCamera}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-98"
          >
            <Camera className="w-5 h-5" />
            <span>Chụp ảnh hồ sơ nhân sự</span>
          </button>
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
                  Hoàn Tất ({images.length} Ảnh)
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

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Danh sách tài liệu đã chụp ({images.length} ảnh)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onImagesChange([])}
              className="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative border border-slate-200 rounded-xl p-2 bg-slate-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-xs transition"
              >
                <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-slate-200">
                  <img
                    src={img.dataUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1">
                    <span className="bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="p-1 bg-white/90 hover:bg-white text-slate-700 rounded-md shadow text-xs cursor-pointer"
                      title="Xem phóng to"
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

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800 truncate max-w-[110px]" title={img.fileName}>
                    {img.fileName}
                  </span>
                  <span className="font-mono text-emerald-700 font-medium">
                    {formatBytes(img.compressedSize)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full p-4 max-h-[90vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-900 truncate">
                {previewImage.fileName}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImage.dataUrl}
                alt={previewImage.fileName}
                className="max-h-[70vh] object-contain"
              />
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Kích thước: {previewImage.width} &times; {previewImage.height}px</span>
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
              ? 'Vui lòng bấm "Chụp ảnh hồ sơ nhân sự" để tiếp tục.'
              : `Đã sẵn sàng ${images.length} tài liệu ảnh chụp.`}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          {onProceedToStep2Direct && (
            <button
              type="button"
              onClick={onProceedToStep2Direct}
              disabled={images.length === 0 || isProcessingAI}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Chuyển thẳng sang Bước 2 để đối chiếu ảnh trực tiếp song song với biểu mẫu"
            >
              <span>Vào Thẳng Bước 2 (Đối Chiếu Ảnh)</span>
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
    </div>
  );
};
