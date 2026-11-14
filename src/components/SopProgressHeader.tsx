import React from 'react';
import {
  UploadCloud,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

interface SopProgressHeaderProps {
  currentStep: number; // 1, 2, 3 (or 4 when completed)
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
      title: 'Quét',
      icon: UploadCloud,
      status:
        currentStep === 1
          ? 'current'
          : currentStep > 1 || step2Verified
          ? 'completed'
          : hasImages || hasExtractedData
          ? 'ready'
          : 'pending',
    },
    {
      id: 2,
      name: 'Bước 2',
      title: 'Đơn vị & Chức vụ',
      icon: Building2,
      status:
        currentStep === 2
          ? 'current'
          : currentStep > 2 || step3Verified
          ? 'completed'
          : hasExtractedData
          ? 'ready'
          : 'pending',
    },
    {
      id: 3,
      name: 'Bước 3',
      title: 'Hoàn thiện thông tin lương',
      icon: FileSpreadsheet,
      status:
        currentStep > 3 || step3Verified
          ? 'completed'
          : currentStep === 3
          ? 'current'
          : 'pending',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-xs mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {steps.map((s) => {
          const Icon = s.icon;
          const isCurrent = s.status === 'current';
          const isCompleted = s.status === 'completed';

          return (
            <button
              type="button"
              key={s.id}
              onClick={() => onSelectStep && onSelectStep(s.id)}
              className={`p-2.5 rounded-xl border transition text-left flex items-center justify-between gap-2 cursor-pointer ${
                isCurrent
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-100'
                  : isCompleted
                  ? 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-50'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
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
            </button>
          );
        })}
      </div>
    </div>
  );
};

