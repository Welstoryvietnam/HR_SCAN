import React, { useState } from 'react';
import { gasCodeGs, gasIndexHtml } from '../data/gasCodeTemplate';
import { Code2, Copy, Check, ExternalLink, Sparkles, BookOpen, Layers } from 'lucide-react';

export const AppsScriptView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'Code.gs' | 'Index.html'>('Code.gs');
  const [copied, setCopied] = useState(false);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentContent = activeFile === 'Code.gs' ? gasCodeGs : gasIndexHtml;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Trọn Bộ Mã Nguồn Google Apps Script (Code.gs & Index.html)
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Sẵn Sàng Triển Khai 1-Click
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Được đóng gói chuẩn mực với <code className="text-blue-700 font-mono">Session.getActiveUser().getEmail()</code>, <code className="text-blue-700 font-mono">SpreadsheetApp</code>, <code className="text-blue-700 font-mono">MailApp</code>, và nén ảnh 1024px JPEG 0.8.
          </p>
        </div>

        <button
          onClick={() => handleCopy(currentContent)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition self-start sm:self-auto"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Đã sao chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Sao chép {activeFile}</span>
            </>
          )}
        </button>
      </div>

      {/* Deployment Quick Guide Steps */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200 text-xs space-y-3">
        <h3 className="font-bold text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
          <BookOpen className="w-4 h-4 text-blue-700" />
          <span>Hướng dẫn 4 bước triển khai lên Google Sheets của bạn:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-700">
          <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
            <span className="font-bold text-blue-800 block mb-1">Bước 1: Mở Apps Script</span>
            Mở Google Sheets của bạn &rarr; chọn <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; chọn <strong>Apps Script</strong>.
          </div>

          <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
            <span className="font-bold text-blue-800 block mb-1">Bước 2: Dán Code.gs</span>
            Dán toàn bộ mã nguồn tab <strong>Code.gs</strong> vào tệp <code className="font-mono text-blue-700">Mã.gs</code> (hoặc Code.gs).
          </div>

          <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
            <span className="font-bold text-blue-800 block mb-1">Bước 3: Tạo tệp Index.html</span>
            Bấm dấu <strong>+</strong> &rarr; chọn <strong>HTML</strong> &rarr; đặt tên là <code className="font-mono text-blue-700">Index</code> &rarr; dán mã nguồn tab <strong>Index.html</strong> vào.
          </div>

          <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
            <span className="font-bold text-blue-800 block mb-1">Bước 4: Triển khai Web App</span>
            Bấm <strong>Triển khai (Deploy)</strong> &rarr; <strong>Tùy chọn triển khai mới</strong> &rarr; Chọn loại <strong>Ứng dụng web (Web app)</strong>.
          </div>
        </div>
      </div>

      {/* Tabs Code.gs vs Index.html */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveFile('Code.gs')}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              activeFile === 'Code.gs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📄 Code.gs (Backend Google Apps Script)
          </button>
          <button
            onClick={() => setActiveFile('Index.html')}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              activeFile === 'Index.html'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🌐 Index.html (Giao diện nén 1024px + Web App)
          </button>
        </div>

        {/* Code View Block */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-200">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
            <span className="font-mono text-slate-400">{activeFile}</span>
            <button
              onClick={() => handleCopy(currentContent)}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed select-all">
            {currentContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
