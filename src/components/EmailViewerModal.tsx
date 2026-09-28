import React, { useState } from 'react';
import { EmailLogItem } from '../types';
import { Mail, CheckCircle2, Clock, Send, Eye, X } from 'lucide-react';

interface EmailViewerProps {
  emailLogs: EmailLogItem[];
  userEmail: string;
  isAdmin: boolean;
}

export const EmailViewer: React.FC<EmailViewerProps> = ({
  emailLogs,
  userEmail,
  isAdmin,
}) => {
  const [selectedMail, setSelectedMail] = useState<EmailLogItem | null>(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            Hộp Thư Xác Nhận (Dịch Vụ Google Apps Script: MailApp)
          </h2>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Tự động kích hoạt
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Theo yêu cầu nghiệp vụ: Sau khi lưu hồ sơ nhân sự vào Sheet "DanhSachNhanSu", hệ thống tự động gọi <strong className="text-slate-700">MailApp.sendEmail()</strong> để gửi email thông báo chi tiết thông tin và thu nhập dự kiến cho nhân viên.
        </p>
      </div>

      <div className="space-y-3">
        {emailLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            Chưa có email nào được gửi. Khi bạn nộp hồ sơ ở tab "Nộp Hồ Sơ & AI Vision", email xác nhận sẽ xuất hiện tại đây.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {emailLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedMail(log)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{log.subject}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã gửi thành công
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Người nhận: <strong className="text-blue-700">{log.toEmail}</strong> | Thời gian: {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </div>
                </div>

                <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold self-start sm:self-auto">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem nội dung email</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal View Detail Email */}
      {selectedMail && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedMail(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Chi Tiết Email Gửi Từ MailApp</h3>
              </div>
              <button
                onClick={() => setSelectedMail(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div><span className="text-slate-500">Tiêu đề:</span> <strong>{selectedMail.subject}</strong></div>
              <div><span className="text-slate-500">Gửi đến:</span> <span className="text-blue-700 font-bold">{selectedMail.toEmail}</span></div>
              <div><span className="text-slate-500">Thời gian gửi:</span> {new Date(selectedMail.timestamp).toLocaleString('vi-VN')}</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
              <div dangerouslySetInnerHTML={{ __html: selectedMail.htmlContent }} />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
