import React,{useEffect,useRef,useState} from 'react';
import {RotateCcw,RotateCw,X} from 'lucide-react';
import type {OptimizedImageFile} from '../types';
import {editDocumentImage,type CropArea} from '../utils/documentImage';

export function DocumentImageEditor({document,onSave,onClose}:{document:OptimizedImageFile;onSave:(value:OptimizedImageFile)=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [preview,setPreview]=useState(document);
  const [turns,setTurns]=useState(0);
  const [crop,setCrop]=useState<CropArea>();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const drag=useRef<{x:number;y:number}|undefined>(undefined);
  useEffect(()=>{const node=dialog.current;node?.showModal();return ()=>node?.close();},[]);
  const rotate=async(delta:number)=>{setBusy(true);setError('');try{const next=turns+delta;setPreview(await editDocumentImage(document,next));setTurns(next);setCrop(undefined);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const point=(event:React.PointerEvent<HTMLDivElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};};
  const cropValue=(key:keyof CropArea,value:number)=>setCrop(previous=>{const area={...(previous || {x:0,y:0,width:1,height:1})};const amount=Math.max(0,Math.min(1,Number.isFinite(value) ? value/100 : 0));if(key==='x') {area.x=Math.min(0.95,amount);area.width=Math.min(area.width,1-area.x);}else if(key==='y') {area.y=Math.min(0.95,amount);area.height=Math.min(area.height,1-area.y);}else area[key]=Math.max(0.05,Math.min(amount,1-area[key==='width' ? 'x' : 'y']));return area;});
  const save=async()=>{setBusy(true);setError('');try{const value=await editDocumentImage(document,turns,crop);onSave(value);}catch(e){setError((e as Error).message);setBusy(false);}};
  return <dialog ref={dialog} aria-labelledby="image-editor-title" onCancel={event=>{event.preventDefault();if(!busy) onClose();}} className="fixed inset-0 m-auto max-h-[94vh] w-[min(900px,96vw)] overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-900/60">
    <div className="flex items-center justify-between gap-3"><h3 id="image-editor-title" className="font-bold text-slate-900">Xem, xoay và cắt ảnh</h3><button type="button" aria-label="Đóng chỉnh ảnh" disabled={busy} onClick={onClose} className="rounded p-2"><X className="h-5 w-5" /></button></div>
    <p className="mt-2 text-sm text-slate-600">Xoay để chữ đứng đúng chiều. Kéo khung quanh tài liệu để bỏ vùng giấy trống; giữ đủ các trường cần đọc.</p>
    <div className="my-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void rotate(-1)} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm"><RotateCcw className="h-4 w-4" />Xoay trái</button><button type="button" disabled={busy} onClick={()=>void rotate(1)} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm"><RotateCw className="h-4 w-4" />Xoay phải</button><button type="button" disabled={busy || !crop} onClick={()=>setCrop(undefined)} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Bỏ vùng cắt</button></div>
    <div className="rounded-lg bg-slate-100 p-2 text-center"><div className="relative inline-block max-w-full touch-none select-none" aria-label="Ảnh tài liệu và vùng cắt" onPointerDown={event=>{if(busy) return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current=point(event);setCrop(undefined);}} onPointerMove={event=>{if(!drag.current) return;const end=point(event),start=drag.current;setCrop({x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)});}} onPointerUp={()=>{drag.current=undefined;if(crop && (crop.width<0.02 || crop.height<0.02)) setCrop(undefined);}} onPointerCancel={()=>{drag.current=undefined;setCrop(undefined);}}>
      <img src={preview.dataUrl} alt={`Tài liệu ${document.fileName}`} draggable={false} className="block max-h-[60vh] max-w-full object-contain" />
      {crop && <div className="pointer-events-none absolute border-2 border-blue-600 bg-blue-400/10" style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.width*100}%`,height:`${crop.height*100}%`}} />}
    </div></div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['x','y','width','height'] as const).map((key,index)=><label key={key} className="text-xs text-slate-600">{['Vị trí trái (%)','Vị trí trên (%)','Chiều rộng (%)','Chiều cao (%)'][index]}<input type="number" min={key==='x'||key==='y' ? 0 : 5} max="100" step="1" disabled={busy} value={Math.round((crop?.[key] ?? (key==='width'||key==='height' ? 1 : 0))*100)} onChange={event=>cropValue(key,Number(event.target.value))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label>)}</div>
    {crop && <p className="mt-2 text-xs text-blue-700">Đã chọn vùng cắt. Bấm Áp dụng để giữ phần trong khung.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded border px-4 py-2 text-sm">Hủy</button><button type="button" disabled={busy} onClick={()=>void save()} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý ảnh…' : 'Áp dụng ảnh đã chỉnh'}</button></div>
  </dialog>;
}
