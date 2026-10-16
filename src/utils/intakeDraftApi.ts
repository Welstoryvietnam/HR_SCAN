import { safeFetchJson } from './apiHelper';
import type { IntakeDraftSnapshot, IntakeDraftSummary } from '../types';

export interface ActiveDraft { id: string; version: string; }
export async function draftRequest<T>(path: string,method = 'GET',body?: unknown): Promise<T> {
  const result = await safeFetchJson<{success:boolean;data:T}>(`/api/drafts${path}`,{
    method,headers:{'Content-Type':'application/json'},...(body === undefined ? {} : {body:JSON.stringify(body)}),
  });
  if (!result.ok || !result.data?.success) throw new Error(result.error || 'Không thể đồng bộ bản nháp. Vui lòng thử lại.');
  return result.data.data;
}

export async function saveIntakeDraft(snapshot: IntakeDraftSnapshot,active: ActiveDraft | null,onStage: (draft: ActiveDraft) => void,onProgress: (message: string) => void) {
  // dataUrl duplicates the whole file; only the base64 source is synchronized.
  const content = JSON.stringify({...snapshot,groups:snapshot.groups.map(group => ({...group,documents:group.documents.map(({dataUrl,...document}) => document)}))});
  const byteLength = new TextEncoder().encode(content).byteLength;
  if (byteLength > 16*1024*1024) throw new Error('Bản nháp vượt giới hạn 16 MB. Hãy giảm dung lượng hoặc chia nhỏ đợt nhập.');
  const chunks: string[] = [];
  for (let index=0;index<content.length;index+=128*1024) chunks.push(content.slice(index,index+128*1024));
  const staged = await draftRequest<ActiveDraft & {revision:string}>('/stage','POST',{...active,chunkCount:chunks.length,byteLength});
  onStage({id:staged.id,version:staged.version});
  for (let index=0;index<chunks.length;index++) {
    onProgress(`Đang tải bản nháp ${Math.round(index/chunks.length*100)}%…`);
    await draftRequest(`/${staged.id}/parts/${staged.revision}/${index}`,'PUT',{content:chunks[index]});
  }
  onProgress('Đang xác nhận lưu trên cloud…');
  return draftRequest<IntakeDraftSummary>(`/${staged.id}/finish`,'POST',{revision:staged.revision,version:staged.version});
}

export async function openIntakeDraft(id: string,onProgress: (message:string) => void) {
  const meta = await draftRequest<ActiveDraft & {revision:string;chunkCount:number}>(`/${id}`);
  const parts: string[] = [];
  for (let index=0;index<meta.chunkCount;index++) {
    onProgress(`Đang mở bản nháp ${Math.round(index/meta.chunkCount*100)}%…`);
    parts.push(await draftRequest<string>(`/${id}/parts/${meta.revision}/${index}`));
  }
  const latest = await draftRequest<typeof meta>(`/${id}`);
  if (latest.version !== meta.version || latest.revision !== meta.revision) throw new Error('Bản nháp vừa thay đổi trên thiết bị khác. Hãy mở lại.');
  const snapshot = JSON.parse(parts.join('')) as IntakeDraftSnapshot;
  snapshot.groups = snapshot.groups.map(group => ({...group,documents:group.documents.map(document => ({...document,dataUrl:`data:${document.mimeType};base64,${document.base64Data}`}))}));
  return {active:{id:meta.id,version:meta.version},snapshot};
}
