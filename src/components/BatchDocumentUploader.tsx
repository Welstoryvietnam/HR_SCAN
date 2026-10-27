import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Sparkles, ArrowRight, FileText, Camera, Zap, Clock, Loader2 } from 'lucide-react';
import { BatchEmployeeDraft, EmployeeDocumentGroup, OptimizedImageFile } from '../types';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { extractOCRGroup } from '../utils/ocrClient';
import { prepareEmployees, runBatchExtraction } from '../utils/batchExtraction';
import {DocumentImageEditor} from './DocumentImageEditor';


interface Props {
  groups: EmployeeDocumentGroup[];
  onChange: (groups: EmployeeDocumentGroup[]) => void;
  onProceed: (employees: BatchEmployeeDraft[]) => void;
  onBusyChange: (busy: boolean) => void;
  employees: BatchEmployeeDraft[];
  onDraftsChange?: (employees: BatchEmployeeDraft[]) => void;
  onCheckpoint?: (employees:BatchEmployeeDraft[],groups:EmployeeDocumentGroup[]) => Promise<void>;
}

export function BatchDocumentUploader({ groups, onChange, onProceed, onBusyChange, employees: previousEmployees, onDraftsChange, onCheckpoint }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [scanMode, setScanMode] = useState<'ai' | 'local'>('ai');
  const [editing,setEditing]=useState<{groupId:string;document:OptimizedImageFile}>();
  const [progressInfo, setProgressInfo] = useState<{
    completed: number;
    total: number;
    estimatedSecondsLeft: number;
    percent: number;
  }>({ completed: 0, total: 0, estimatedSecondsLeft: 0, percent: 0 });

  const currentGroups=useRef(groups);currentGroups.current=groups;
  const paused = useRef(false);
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;paused.current=true;onBusyChange(false);};},[]);
  useEffect(()=>{
    if(!busy) return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[busy]);

  // Bộ đếm lùi thời gian ước tính mượt mà mỗi giây khi đang quét
  useEffect(() => {
    if (!busy) return;
    const interval = setInterval(() => {
      setProgressInfo(prev => {
        if (prev.estimatedSecondsLeft <= 1) {
          return { ...prev, estimatedSecondsLeft: 1 };
        }
        const nextSeconds = prev.estimatedSecondsLeft - 1;
        // Tăng dần tỷ lệ phần trăm theo thời gian ước tính trôi qua
        const dynamicPercent = Math.min(94, prev.percent + 2);
        return {
          ...prev,
          estimatedSecondsLeft: nextSeconds,
          percent: Math.max(prev.percent, dynamicPercent),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [busy]);

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
  const proceed = async (useOCR: boolean) => {
    if(locked.current) return;
    if(!useOCR) {onProceed(prepareEmployees(groups,previousEmployees));return;}
    locked.current=true;paused.current=false;
    setBusy(true);
    onBusyChange(true);
    setError('');

    const groupsWithDocs = groups.filter(g => g.documents.length > 0);
    const totalCount = groupsWithDocs.length;
    const perEmpSeconds = scanMode === 'ai' ? 2 : 18;
    const initialSeconds = Math.max(3, totalCount * perEmpSeconds);

    setProgressInfo({
      completed: 0,
      total: totalCount,
      estimatedSecondsLeft: initialSeconds,
      percent: totalCount > 0 ? 8 : 100,
    });

    try {
      let lastCheckpoint='';
      let cloudFailed=false;
      const employees=await runBatchExtraction({groups,previous:previousEmployees,cancelled:()=>paused.current,
        extract:group=>extractOCRGroup(currentGroups.current.find(item=>item.id===group.id) || group,document=>{
          currentGroups.current=currentGroups.current.map(item=>item.id===group.id ? {...item,documents:item.documents.map(previous=>previous.id===document.id ? document : previous)} : item);
          onChange(currentGroups.current);
        },message=>{if(mounted.current) setStatus(message);},scanMode),
        progress:async (list,message)=>{
          if(!mounted.current) return;
          onDraftsChange?.(list);setStatus(message);

          const completed = list.filter(employee => ['success','failed'].includes(employee.extractionStatus || '')).length;
          const remaining = Math.max(0, totalCount - completed);
          const calculatedSecLeft = Math.max(1, remaining * (scanMode === 'ai' ? 2 : 18));
          const actualPercent = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 100;

          setProgressInfo({
            completed,
            total: totalCount,
            estimatedSecondsLeft: remaining === 0 ? 0 : calculatedSecLeft,
            percent: remaining === 0 ? 100 : Math.max(12, Math.min(95, actualPercent)),
          });

          const checkpoint=list.filter(employee=>['success','failed'].includes(employee.extractionStatus || '')).map(employee=>`${employee.id}:${employee.extractionStatus}`).join('|');
          if(checkpoint && checkpoint!==lastCheckpoint && !cloudFailed && onCheckpoint) {
            lastCheckpoint=checkpoint;
            try {await onCheckpoint(list,currentGroups.current);} catch(err) {cloudFailed=true;setError(`Chưa lưu được lên cloud: ${(err as Error).message} Kết quả vẫn còn trên màn hình. Sau khi khắc phục kết nối hoặc cấu hình, bấm Lưu tạm và chờ xác nhận lưu thành công trước khi đóng trang.`);}
          }
        }});
      if(mounted.current && !paused.current && !cloudFailed && employees.every(employee=>employee.extractionStatus==='success')) {
        setProgressInfo(prev => ({ ...prev, percent: 100, estimatedSecondsLeft: 0 }));
        onProceed(employees);
      }
    } catch (err) { setError((err as Error).message); }
    finally {locked.current=false;if(mounted.current) {setBusy(false);onBusyChange(false);}}
  };
  return <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4" aria-label="Nhập tài liệu nhiều nhân viên">
    {editing && <DocumentImageEditor document={editing.document} onClose={()=>setEditing(undefined)} onSave={document=>{onChange(groups.map(group=>group.id===editing.groupId ? {...group,documents:group.documents.map(previous=>previous.id===editing.document.id ? document : previous)} : group));setEditing(undefined);}} />}
    
    {/* Bảng chọn Chế độ Quét: Quét AI Siêu Tốc vs Quét Cục Bộ */}
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span>Phương án Quét:</span>
          {scanMode === 'ai' ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              ⚡ Quét AI Siêu Tốc (Gemini Vision)
            </span>
          ) : (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              🖥️ Quét Cục Bộ (Tesseract)
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          {scanMode === 'ai'
            ? 'Tốc độ ~1.5s/ảnh • Đọc chuẩn chữ viết tay Sơ yếu lý lịch & chữ in CCCD • Tự động đối soát chéo YYYY-MM-DD'
            : 'Quét offline cục bộ bằng CPU máy chủ (mất 20–40s/ảnh, phù hợp khi mất mạng)'}
        </p>
      </div>
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
        <button
          type="button"
          disabled={busy}
          onClick={() => setScanMode('ai')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition cursor-pointer ${
            scanMode === 'ai'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
          Quét AI Siêu Tốc
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setScanMode('local')}
          className={`rounded-md px-3 py-1.5 font-medium transition cursor-pointer ${
            scanMode === 'local'
              ? 'bg-white text-slate-900 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Quét Cục Bộ (Tesseract)
        </button>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-bold text-slate-900">Tài liệu theo từng nhân viên</h3></div>
      <button type="button" disabled={busy} onClick={addGroup} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 border border-blue-200 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm nhân viên</button>
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{groups.map((group,index) => <div key={group.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between"><span className="text-xs font-bold text-blue-700">Nhân viên {index + 1}</span><button type="button" disabled={busy} aria-label={`Bỏ nhóm nhân viên ${index + 1}`} onClick={() => onChange(groups.filter(item => item.id !== group.id))} className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
      <input aria-label={`Tên nhóm nhân viên ${index + 1}`} placeholder="Họ tên nhân viên (có thể bổ sung sau)" disabled={busy} value={group.label} onChange={event => onChange(groups.map(item => item.id === group.id ? {...item,label:event.target.value} : item))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
      <label className="block rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-3 text-xs text-blue-700"><span className="mb-2 block font-semibold">Thêm ảnh / PDF cho nhân viên {index + 1}</span><input aria-label={`Tài liệu nhân viên ${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple disabled={busy} onChange={event => { const input=event.currentTarget; void upload(group.id,input.files); input.value=''; }} className="w-full text-[11px] file:mr-2 file:rounded file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-blue-700" /></label>
      <ul className="space-y-2">{group.documents.map(document => <li key={document.id} className="rounded border border-slate-100 p-2 text-xs text-slate-600"><div className="flex items-center gap-1"><FileText className="h-3 w-3 shrink-0" /><span className="truncate flex-1">{document.fileName}</span><button type="button" disabled={busy} aria-label={`Bỏ ${document.fileName} của nhân viên ${index + 1}`} onClick={() => onChange(groups.map(item => item.id === group.id ? {...item,documents:item.documents.filter(file => file.id !== document.id)} : item))} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button></div>{document.mimeType.startsWith('image/') && <button type="button" disabled={busy} onClick={()=>setEditing({groupId:group.id,document})} aria-label={`Xem, xoay hoặc cắt ảnh ${document.fileName} nhân viên ${index+1}`} className="mt-1 rounded bg-blue-50 px-2 py-1.5 font-semibold text-blue-700">Xem / Xoay / Cắt</button>}</li>)}</ul>
      <label className={`inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 ${busy ? 'opacity-50' : 'cursor-pointer hover:bg-blue-50'}`}><Camera className="h-3.5 w-3.5" />Chụp ảnh / chọn ảnh<input className="sr-only" aria-label={`Chụp ảnh cho nhân viên ${index + 1}`} type="file" accept="image/*" capture="environment" disabled={busy} onChange={event => {const input=event.currentTarget; void upload(group.id,input.files); input.value='';}} /></label>
      <p className="text-[11px] text-slate-400">{group.documents.length} tài liệu • 1 nhân viên</p>
      <p className="text-xs font-semibold text-blue-700">{({waiting:'Đang chờ',running:scanMode === 'ai' ? '⚡ Đang quét AI Siêu Tốc…' : 'Đang quét…',success:'Đã trích xuất',failed:'Cần thử lại / nhập tay'})[previousEmployees.find(employee=>employee.id===group.id)?.extractionStatus || 'waiting']}</p>
      {previousEmployees.find(employee=>employee.id===group.id)?.extractionError && <p className="text-xs text-rose-700">{previousEmployees.find(employee=>employee.id===group.id)?.extractionError}</p>}
    </div>)}</div>
    {!groups.length && <p className="py-6 text-center text-sm text-slate-500">Bấm “Thêm nhân viên” để bắt đầu danh sách.</p>}
    {error && <p role="alert" className="whitespace-pre-wrap text-xs text-rose-700">{error}</p>}
    
    {/* THANH TIẾN ĐỘ & ĐẾM NGƯỢC THỜI GIAN HOÀN THÀNH KHI ĐANG QUÉT */}
    {busy && (
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white p-4 shadow-xs space-y-3 animate-fade-in" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {scanMode === 'ai' ? '⚡ AI Đang Bóc Tách Hồ Sơ Siêu Tốc' : '🖥️ Đang Quét OCR Cục Bộ'}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {progressInfo.completed} / {progressInfo.total} hồ sơ
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate max-w-lg">
                {status || 'Đang nhận diện ký tự, đối soát CCCD & Sơ yếu lý lịch…'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-xs">
              <Clock className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>
                {progressInfo.estimatedSecondsLeft > 1
                  ? `Còn khoảng ${progressInfo.estimatedSecondsLeft} giây...`
                  : progressInfo.estimatedSecondsLeft === 1
                  ? 'Còn khoảng 1-2 giây... gần hoàn tất!'
                  : 'Đang hoàn tất...'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                paused.current = true;
                setStatus('Sẽ tạm dừng sau hồ sơ đang xử lý…');
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-xs"
            >
              Tạm dừng
            </button>
          </div>
        </div>

        {/* Dynamic Animated Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Tiến độ bóc tách thông tin</span>
            <span className="text-blue-700 font-bold">{progressInfo.percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progressInfo.percent}%` }}
            />
          </div>
        </div>
      </div>
    )}

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-3">
      <p role="status" className="text-xs text-slate-500">
        {busy
          ? `Đang xử lý ${progressInfo.completed}/${progressInfo.total} hồ sơ • ${
              progressInfo.estimatedSecondsLeft > 0
                ? `Còn khoảng ${progressInfo.estimatedSecondsLeft} giây...`
                : 'Sắp hoàn tất'
            }`
          : `${groups.length} nhân viên • ${groups.reduce((sum,group) => sum + group.documents.length,0)} tài liệu`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !groups.length} onClick={() => void proceed(false)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">Mở bảng đối chiếu Bước 2<ArrowRight className="h-3 w-3" /></button>
        <button
          type="button"
          disabled={busy || !groups.some(group => group.documents.length)}
          onClick={() => void proceed(true)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer ${
            scanMode === 'ai'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-slate-700 hover:bg-slate-800'
          }`}
        >
          {scanMode === 'ai' ? <Zap className="h-4 w-4 text-amber-300 fill-amber-300" /> : <Sparkles className="h-4 w-4" />}
          {busy
            ? `Đang xử lý (${progressInfo.percent}% • Còn ~${progressInfo.estimatedSecondsLeft}s)…`
            : previousEmployees.some(employee => employee.extractionStatus === 'success' || employee.extractionStatus === 'failed')
            ? 'Tiếp tục / thử lại hồ sơ chưa xong'
            : scanMode === 'ai'
            ? `⚡ Quét AI Siêu Tốc & Mở Bảng (${groups.length} người)`
            : `Trích xuất OCR & Mở Bảng (${groups.length} người)`}
        </button>
      </div>
    </div>
  </section>;
}

