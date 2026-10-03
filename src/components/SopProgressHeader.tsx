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
      title: 'AI Trích Xuất Form',
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
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-xs mb-4">
      {/* 4 Steps Grid - Chỉ giữ tên bước, bỏ phần mô tả */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((s) => {
          const Icon = s.icon;
          const isCurrent = currentStep === s.id;
          const isCompleted = s.status === 'completed';

          return (
            <div
              key={s.id}
              onClick={() => onSelectStep && onSelectStep(s.id)}
              className={`p-2.5 rounded-xl border transition relative cursor-pointer text-left flex items-center justify-between gap-2 ${
                isCurrent
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-200 shadow-2xs'
                  : isCompleted
                  ? 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-50'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60 opacity-80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>

                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isCurrent
                        ? 'text-blue-700'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.name}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate block leading-snug">
                    {s.title}
                  </span>
                </div>
              </div>

              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isCurrent
                    ? 'text-blue-600'
                    : isCompleted
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
