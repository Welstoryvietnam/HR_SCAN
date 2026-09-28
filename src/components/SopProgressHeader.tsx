import React from 'react';
import {
  UploadCloud,
  Sparkles,
  UserCheck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface SopProgressHeaderProps {
  currentStep: number; // 1, 2, 3, 4
  onSelectStep?: (step: number) => void;
  hasImages: boolean;
  hasExtractedData: boolean;
  step2Verified?: boolean;
  step3Verified?: boolean;
}

export const SopProgressHeader: React.FC<SopProgressHeaderProps> = ({
  currentStep,
  onSelectStep,
  hasImages,
  hasExtractedData,
  step2Verified,
  step3Verified,
}) => {
  const steps = [
    {
      id: 1,
      name: 'Bước 1',
      title: 'Scan & Đính Kèm Tài Liệu',
      desc: 'Scan, chụp ảnh hoặc tải lên CCCD, Sơ yếu lý lịch',
      icon: UploadCloud,
      status: hasImages ? 'completed' : currentStep === 1 ? 'current' : 'pending',
    },
    {
      id: 2,
      name: 'Bước 2',
      title: 'AI Trích Xuất Form Chuẩn',
      desc: 'Không tự suy đoán, hỏi lại nếu thông tin chưa rõ',
      icon: Sparkles,
      status:
        step2Verified
          ? 'completed'
          : hasExtractedData
          ? currentStep === 2
            ? 'current'
            : 'ready'
          : 'pending',
    },
    {
      id: 3,
      name: 'Bước 3',
      title: 'Con Người Chọn Đơn Vị & Chức Vụ',
      desc: 'Thao tác chọn Khối, Ban, Phòng, Công việc & Chức vụ',
      icon: Building2,
      status:
        step3Verified
          ? 'completed'
          : currentStep === 3
          ? 'current'
          : hasExtractedData
          ? 'ready'
          : 'pending',
    },
    {
      id: 4,
      name: 'Bước 4',
      title: 'Bảng Danh Sách Tiêu Chuẩn',
      desc: 'Khớp bảng lương tiêu chuẩn, tạo danh sách đầy đủ',
      icon: FileSpreadsheet,
      status: currentStep === 4 ? 'current' : 'pending',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-6">
      {/* Title & Guidance Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
              Quy Trình Chuẩn (SOP)
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Quy Trình Tiếp Nhận &amp; Chuẩn Hóa Hồ Sơ Nhân Sự (4 Bước)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình chuẩn hóa nghiệp vụ: Tải tài liệu ➔ AI trích xuất (chống suy đoán) ➔ Con người phân bổ đơn vị &amp; chức danh ➔ Tạo bảng tiêu chuẩn hoàn chỉnh.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đang ở: <strong className="text-slate-800">Bước {currentStep}</strong></span>
        </div>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s) => {
          const Icon = s.icon;
          const isCurrent = currentStep === s.id;
          const isCompleted = s.status === 'completed';

          return (
            <div
              key={s.id}
              onClick={() => onSelectStep && onSelectStep(s.id)}
              className={`p-3 rounded-xl border transition relative cursor-pointer text-left ${
                isCurrent
                  ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-200'
                  : isCompleted
                  ? 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-50'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent
                        ? 'text-blue-900'
                        : isCompleted
                        ? 'text-emerald-900'
                        : 'text-slate-600'
                    }`}
                  >
                    {s.name}
                  </span>
                </div>

                <Icon
                  className={`w-4 h-4 ${
                    isCurrent
                      ? 'text-blue-600'
                      : isCompleted
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                />
              </div>

              <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                {s.title}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">
                {s.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
