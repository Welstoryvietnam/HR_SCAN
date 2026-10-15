import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, ArrowRight, FileText, Camera } from 'lucide-react';
import { BatchEmployeeDraft, EmployeeDocumentGroup, GeminiExtractionResult, OptimizedImageFile } from '../types';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { safeFetchJson } from '../utils/apiHelper';

interface Props {
  groups: EmployeeDocumentGroup[];
  onChange: (groups: EmployeeDocumentGroup[]) => void;
  onProceed: (employees: BatchEmployeeDraft[]) => void;
  onBusyChange: (busy: boolean) => void;
  employees: BatchEmployeeDraft[];
  onDraftsChange?: (employees: BatchEmployeeDraft[]) => void;
}

export function BatchDocumentUploader({ groups, onChange, onProceed, onBusyChange, employees: previousEmployees, onDraftsChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const addGroup = () => onChange([...groups, {id:crypto.randomUUID(),label:'',documents:[]}]);
  const upload = async (id: string, files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      const documents: OptimizedImageFile[] = [];
      for (const file of Array.from(files)) {
        if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) throw new Error('Chỉ hỗ trợ JPG, PNG, WEBP hoặc PDF.');
        documents.push(await optimizeImageFile(file));
      }
      onChange(groups.map(group => group.id === id ? {...group,documents:[...group.documents,...documents]} : group));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); onBusyChange(false); }
  };
  const proceed = async (useAI: boolean) => {
    setBusy(true);
    onBusyChange(true);
    setError('');
    const employees: BatchEmployeeDraft[] = [];
    const failures: string[] = [];
    try {
      for (let index = 0; index < groups.length; index++) {
        const group = groups[index];
        const previous = previousEmployees.find(employee => employee.id === group.id);
        const draft: BatchEmployeeDraft = {...(previous || {id:group.id,hoVaTen:'',ngaySinh:'',gioiTinh:'',soCCCD:'',queQuan:'',diaChiThuongTru:'',soDienThoai:''}),hoVaTen:group.label.toUpperCase() || previous?.hoVaTen || '',soTaiLieuDinhKem:group.documents.length};
        if (useAI && group.documents.length) {
          setStatus(`Đang trích xuất nhân viên ${index + 1} / ${groups.length}…`);
          const result = await safeFetchJson<{success:boolean;data?:GeminiExtractionResult;error?:string}>('/api/ai/extract-documents', {
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({images:group.documents.map(({fileName,docType,mimeType,base64Data}) => ({fileName,docType,mimeType,base64Data}))}),
          });
          if (result.ok && result.data?.success && result.data.data) {
            const data = result.data.data;
            Object.assign(draft,data,{id:group.id,hoVaTen:data.hoVaTen || draft.hoVaTen,soTaiLieuDinhKem:group.documents.length});
          } else {
            const message = result.data?.error || result.error || 'Không nhận được kết quả AI.';
            failures.push(`Nhân viên ${index + 1}: ${message}`);
            draft.cauHoiLamRo = [message];
          }
        }
        employees.push(draft);
      }
      onDraftsChange?.(employees);
      if (failures.length) {
        setError(failures.join('\n'));
      } else {
        onProceed(employees);
      }
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); onBusyChange(false); setStatus(''); }
  };
  return <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4" aria-label="Nhập tài liệu nhiều nhân viên">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Tài liệu theo từng nhân viên</h3><p className="mt-1 text-xs text-slate-600">Gom CCCD, VNeID, sơ yếu lý lịch của cùng một người vào một ô. AI xử lý riêng từng người để tránh trộn thông tin.</p></div><button type="button" disabled={busy} onClick={addGroup} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 border border-blue-200 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm nhân viên</button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{groups.map((group,index) => <div key={group.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between"><span className="text-xs font-bold text-blue-700">Nhân viên {index + 1}</span><button type="button" disabled={busy} aria-label={`Bỏ nhóm nhân viên ${index + 1}`} onClick={() => onChange(groups.filter(item => item.id !== group.id))} className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
      <input aria-label={`Tên nhóm nhân viên ${index + 1}`} placeholder="Tên nhân viên (có thể bổ sung sau)" disabled={busy} value={group.label} onChange={event => onChange(groups.map(item => item.id === group.id ? {...item,label:event.target.value} : item))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
      <label className="block rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-3 text-xs text-blue-700"><span className="mb-2 block font-semibold">Thêm ảnh / PDF cho nhân viên {index + 1}</span><input aria-label={`Tài liệu nhân viên ${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple disabled={busy} onChange={event => { const input=event.currentTarget; void upload(group.id,input.files); input.value=''; }} className="w-full text-[11px] file:mr-2 file:rounded file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-blue-700" /></label>
      <ul className="space-y-1">{group.documents.map(document => <li key={document.id} className="flex items-center gap-1 text-xs text-slate-600"><FileText className="h-3 w-3 shrink-0" /><span className="truncate flex-1">{document.fileName}</span><button type="button" disabled={busy} aria-label={`Bỏ ${document.fileName} của nhân viên ${index + 1}`} onClick={() => onChange(groups.map(item => item.id === group.id ? {...item,documents:item.documents.filter(file => file.id !== document.id)} : item))} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button></li>)}</ul>
      <label className={`inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 ${busy ? 'opacity-50' : 'cursor-pointer hover:bg-blue-50'}`}><Camera className="h-3.5 w-3.5" />Chụp ảnh / chọn ảnh<input className="sr-only" aria-label={`Chụp ảnh cho nhân viên ${index + 1}`} type="file" accept="image/*" capture="environment" disabled={busy} onChange={event => {const input=event.currentTarget; void upload(group.id,input.files); input.value='';}} /></label>
      <p className="text-[11px] text-slate-400">{group.documents.length} tài liệu • 1 nhân viên</p>
    </div>)}</div>
    {!groups.length && <p className="py-6 text-center text-sm text-slate-500">Bấm “Thêm nhân viên” để bắt đầu danh sách.</p>}
    {error && <p role="alert" className="whitespace-pre-wrap text-xs text-rose-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-3">
      <p role="status" className="text-xs text-slate-500">{busy ? status || 'Đang tải tài liệu…' : `${groups.length} nhân viên • ${groups.reduce((sum,group) => sum + group.documents.length,0)} tài liệu`}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !groups.length} onClick={() => void proceed(false)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">Nhập thủ công tại Bước 2<ArrowRight className="h-3 w-3" /></button><button type="button" disabled={busy || !groups.some(group => group.documents.length)} onClick={() => void proceed(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy ? 'Đang xử lý…' : `Trích xuất AI & mở bảng ${groups.length} người`}</button></div>
    </div>
  </section>;
}
