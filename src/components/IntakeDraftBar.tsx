import React, { useState } from 'react';
import { CloudUpload, FolderOpen, RefreshCw } from 'lucide-react';
import type { IntakeDraftSummary } from '../types';

interface Props {
  busy: boolean;
  disabled: boolean;
  completed: boolean;
  status: string;
  activeId?: string;
  savedAt?: string;
  drafts: IntakeDraftSummary[];
  error: string;
  onSave: () => void;
  onRefresh: () => void;
  onOpen: (draft: IntakeDraftSummary) => void;
  onDiscard: (draft: IntakeDraftSummary) => void;
  onNew: () => void;
}
export function IntakeDraftBar({busy,disabled,completed,status,activeId,savedAt,drafts,error,onSave,onRefresh,onOpen,onDiscard,onNew}: Props) {
  const [expanded,setExpanded] = useState(false);
  const [discardId,setDiscardId] = useState<string|null>(null);
  return <section aria-label="Lưu tạm và tiếp tục trên thiết bị khác" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-bold text-indigo-950">Lưu tạm & tiếp tục trên thiết bị khác</h3><p className="mt-1 text-xs text-slate-600">Lưu cả thông tin và ảnh/PDF vào bản nháp riêng của tài khoản. Trên thiết bị khác, đăng nhập rồi mở “Bản nháp của tôi”.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy || completed} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><CloudUpload className="h-4 w-4" />{busy ? 'Đang đồng bộ…' : 'Lưu tạm'}</button>
        <button type="button" disabled={busy} onClick={() => {setExpanded(!expanded);if (!expanded) onRefresh();}} aria-expanded={expanded} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-800 disabled:opacity-50"><FolderOpen className="h-4 w-4" />Bản nháp của tôi</button>
        {activeId && <button type="button" disabled={busy || disabled} onClick={onNew} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 disabled:opacity-50">Tạo đợt nhập mới</button>}
      </div>
    </div>
    <p role="status" className="text-xs text-indigo-800">{busy ? status : savedAt ? `Đã lưu tạm lúc ${new Date(savedAt).toLocaleString('vi-VN')}. Nếu chỉnh sửa thêm, hãy bấm Lưu tạm trước khi đổi thiết bị.` : 'Bấm Lưu tạm trước khi rời thiết bị. Bản nháp chưa phải hồ sơ đã hoàn tất.'}</p>
    <p className="text-xs text-slate-500">Tối đa 20 bản nháp/tài khoản, 16 MB/bản nháp. Ảnh/PDF tạm sẽ được xóa khi hoàn tất lưu hồ sơ hoặc khi bạn bỏ bản nháp.</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {expanded && <div className="space-y-2 border-t border-indigo-200 pt-3">
      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Bản nháp của tôi</h4><button type="button" disabled={busy} onClick={onRefresh} aria-label="Làm mới bản nháp" className="rounded p-2 text-indigo-700"><RefreshCw className="h-4 w-4" /></button></div>
      {!drafts.length && <p className="text-xs text-slate-500">Chưa có bản nháp. Bấm Làm mới nếu bạn vừa lưu trên thiết bị khác.</p>}
      {drafts.map(draft => <div key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="min-w-0"><p className="break-words text-sm font-semibold">{draft.title}{activeId === draft.id ? ' • Đang mở' : ''}</p><p className="mt-1 text-xs text-slate-500">Bước {draft.step} • {draft.employeeCount} nhân viên • {draft.documentCount} tài liệu • {new Date(draft.timestamp).toLocaleString('vi-VN')}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || disabled || draft.ready === false} onClick={() => onOpen(draft)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-50">Tiếp tục</button>
          {discardId === draft.id ? <><span className="self-center text-xs text-rose-700">Xóa bản nháp và tài liệu tạm?</span><button type="button" disabled={busy} onClick={() => {onDiscard(draft);setDiscardId(null);}} className="rounded-lg bg-rose-600 px-3 py-2 text-xs text-white">Xác nhận bỏ</button><button type="button" disabled={busy} onClick={() => setDiscardId(null)} className="px-2 text-xs">Hủy</button></> : <button type="button" disabled={busy || disabled} onClick={() => setDiscardId(draft.id)} className="rounded-lg px-3 py-2 text-xs text-rose-700">Bỏ bản nháp</button>}
        </div>
      </div>)}
    </div>}
  </section>;
}
