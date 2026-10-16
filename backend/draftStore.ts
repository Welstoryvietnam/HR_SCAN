import { randomUUID } from 'node:crypto';
import { FirestoreRecordStore, StorageError, encodeFields, decodeFields, personnelFields } from './recordStore.js';
import type { IntakeDraftSnapshot } from '../src/types.js';

const MAX_CHUNKS = 128;
const MAX_BYTES = 16 * 1024 * 1024;
const conflict = () => new StorageError('Bản nháp đã thay đổi trên thiết bị khác. Hãy mở lại bản nháp trước khi lưu tiếp.',409);

function validateSnapshot(value: any): asserts value is IntakeDraftSnapshot {
  if (!value || ![1,2,3,4].includes(value.step) || !Array.isArray(value.employees) || !Array.isArray(value.groups) || value.groups.length > 100 || value.employees.length > 100) throw new StorageError('Bản nháp không hợp lệ (tối đa 100 nhân viên).',400);
  let files = 0;
  const ids = new Set<string>();
  for (const group of value.groups) {
    if (!group || typeof group.id !== 'string' || !group.id || ids.has(group.id) || typeof group.label !== 'string' || !Array.isArray(group.documents)) throw new StorageError('Nhóm tài liệu không hợp lệ.',400);
    ids.add(group.id);
    for (const doc of group.documents) {
      files++;
      if (!doc || typeof doc.id !== 'string' || typeof doc.fileName !== 'string' || !['image/jpeg','image/png','image/webp','application/pdf'].includes(doc.mimeType) || typeof doc.base64Data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(doc.base64Data) || !doc.base64Data.length || doc.base64Data.length % 4 !== 0) throw new StorageError('Ảnh/PDF trong bản nháp không hợp lệ.',400);
    }
  }
  if (files > 100 || (value.step > 1 && !value.employees.length)) throw new StorageError('Bản nháp cần có nhân viên, tối đa 100 tài liệu.',400);
  if (value.employees.some((employee: any) => !employee || typeof employee.id !== 'string')) throw new StorageError('Dữ liệu nhân viên không hợp lệ.',400);
  if (value.form !== undefined) {
    const form = value.form;
    if (!form || typeof form.employee !== 'object' || !form.employee || !form.bulk ||
      !['khoi','ban','phong','congViec','chucVu','diemLamViec','loaiHopDong'].every(key => typeof form.bulk[key] === 'string') ||
      !Array.isArray(form.selectedIds) || form.selectedIds.length > 100 || !form.selectedIds.every((id:any) => typeof id === 'string') ||
      !Number.isInteger(form.activeIndex) || form.activeIndex < 0 || form.activeIndex > 100 ||
      typeof form.isCustomOrg !== 'boolean' || typeof form.isCustomJob !== 'boolean') throw new StorageError('Trạng thái biểu mẫu trong bản nháp không hợp lệ.',400);
    for (const [key,item] of Object.entries(form.employee)) {
      if (key === 'thongTinGiaDinh') {if (!Array.isArray(item)) throw new StorageError('Thông tin gia đình không hợp lệ.',400);}
      else if (!['string','number','boolean'].includes(typeof item)) throw new StorageError('Giá trị trong biểu mẫu không hợp lệ.',400);
    }
  }
}

export class FirestoreDraftStore extends FirestoreRecordStore {
  constructor() { super('intakeDrafts',record => record); }
  private async owned(id: string,email: string) {
    const snapshot = await this.get(id);
    if (snapshot.record.userEmail !== email) throw new StorageError('Không tìm thấy bản nháp của tài khoản này.',404);
    return snapshot;
  }
  private partPath(id: string,revision: string,index: number) {
    if (!/^[a-f0-9-]{36}$/.test(revision) || !Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) throw new StorageError('Phần tải lên không hợp lệ.',400);
    return `${this.document(id)}/parts/${revision}_${index}`;
  }
  async summaries(email: string) {
    const results = await this.request(`${this.root()}:runQuery`,'POST',{structuredQuery:{from:[{collectionId:'intakeDrafts'}],where:{fieldFilter:{field:{fieldPath:'userEmail'},op:'EQUAL',value:{stringValue:email}}}}});
    return results.filter((item:any) => item.document).map((item:any) => {
      const record = decodeFields(item.document.fields || {});
      return {id:record.id,title:record.deleting ? 'Đã đóng bản nháp — cần dọn tài liệu tạm' : record.title || 'Bản nháp tải lên chưa hoàn tất',step:record.step || 1,employeeCount:record.employeeCount || 0,documentCount:record.documentCount || 0,timestamp:record.timestamp,version:item.document.updateTime,ready:Boolean(record.revision) && !record.deleting};
    }).sort((a:any,b:any) => b.timestamp.localeCompare(a.timestamp));
  }
  async stage(email: string,input: any) {
    const count = input.chunkCount;
    if (!Number.isInteger(count) || count < 1 || count > MAX_CHUNKS || !Number.isInteger(input.byteLength) || input.byteLength < 1 || input.byteLength > MAX_BYTES) throw new StorageError('Bản nháp vượt giới hạn 16 MB. Hãy giảm dung lượng hoặc chia nhỏ đợt nhập.',400);
    const revision = randomUUID();
    const pending = {revision,count,byteLength:input.byteLength};
    let id = input.id;
    if (id) {
      const previous = await this.owned(id,email);
      if (previous.record.deleting) throw new StorageError('Bản nháp đang được dọn tài liệu tạm, không thể chỉnh sửa tiếp.',409);
      if (!input.version || input.version !== previous.version) throw conflict();
      await this.update(id,{...previous.record,pending},previous.version);
      if (previous.record.pending) await this.cleanupParts(id,previous.record.pending.revision).catch(() => {});
    } else {
      if ((await this.list(email)).length >= 20) throw new StorageError('Mỗi tài khoản lưu tối đa 20 bản nháp. Hãy hoàn tất hoặc bỏ bản nháp cũ.',400);
      id = randomUUID();
      await this.create([{id,userEmail:email,timestamp:new Date().toISOString(),pending}]);
    }
    const stored = await this.owned(id,email);
    if (stored.record.deleting) throw conflict();
    if (stored.record.pending?.revision !== revision) throw conflict();
    return {id,revision,version:stored.version};
  }
  async putPart(email: string,id: string,revision: string,index: number,content: any) {
    const {record,version} = await this.owned(id,email);
    if (record.deleting) throw conflict();
    if (record.pending?.revision !== revision) throw conflict();
    if (index >= record.pending.count || typeof content !== 'string' || !content.length || Buffer.byteLength(content) > 600_000) throw new StorageError('Phần tải lên quá lớn hoặc không hợp lệ.',400);
    const path = this.partPath(id,revision,index);
    try {
      const existing = await this.request(path);
      if (existing.fields?.content?.stringValue === content) return;
      throw conflict();
    } catch (error) {if (!(error instanceof StorageError) || error.status !== 404) throw error;}
    await this.request(`${this.root()}:commit`,'POST',{writes:[{verify:this.document(id),currentDocument:{updateTime:version}},{update:{name:path,fields:encodeFields({content})},currentDocument:{exists:false}}]});
  }
  private async readParts(id: string,revision: string,count: number) {
    const parts: string[] = [];
    // Bounded reads; each stored part stays below Firestore's document limit.
    for (let index=0;index<count;index+=4) {
      const results = await Promise.all(Array.from({length:Math.min(4,count-index)},(_,offset) => this.request(this.partPath(id,revision,index+offset))));
      parts.push(...results.map(result => result.fields?.content?.stringValue || ''));
    }
    return parts.join('');
  }
  async finish(email: string,id: string,revision: string,version: string) {
    const stored = await this.owned(id,email);
    if (stored.record.deleting) throw conflict();
    if (stored.version !== version || stored.record.pending?.revision !== revision) throw conflict();
    const pending = stored.record.pending;
    const content = await this.readParts(id,revision,pending.count);
    if (Buffer.byteLength(content) !== pending.byteLength) throw new StorageError('Tài liệu tải lên chưa đầy đủ. Vui lòng lưu tạm lại.',400);
    let snapshot: IntakeDraftSnapshot;
    try { snapshot = JSON.parse(content); } catch { throw new StorageError('Bản nháp tải lên chưa đầy đủ.',400); }
    validateSnapshot(snapshot);
    const next = {id,userEmail:email,revision,chunkCount:pending.count,step:snapshot.step,
      title:String(snapshot.groups[0]?.label || snapshot.employees[0]?.hoVaTen || 'Đợt tiếp nhận mới').slice(0,200),
      employeeCount:Math.max(snapshot.employees.length,snapshot.groups.length),
      documentCount:snapshot.groups.reduce((sum,group) => sum+group.documents.length,0),timestamp:new Date().toISOString()};
    const savedVersion = await this.update(id,next,stored.version);
    // Old revisions are removed only after the new pointer is committed.
    if (stored.record.revision) await this.cleanupParts(id,stored.record.revision).catch(() => {});
    return {...next,version:savedVersion || (await this.owned(id,email)).version};
  }
  async open(email: string,id: string) {
    const {record,version} = await this.owned(id,email);
    if (record.deleting) throw new StorageError('Hồ sơ đã hoàn tất hoặc bản nháp đang được xóa. Hãy bỏ bản nháp để dọn tài liệu còn lại.',409);
    if (!record.revision) throw new StorageError('Bản nháp chưa tải lên hoàn tất. Hãy lưu tạm lại trên thiết bị ban đầu.',409);
    return {id,version,revision:record.revision,chunkCount:record.chunkCount,step:record.step};
  }
  async part(email: string,id: string,revision: string,index: number) {
    const {record} = await this.owned(id,email);
    if (record.deleting) throw conflict();
    if (record.revision !== revision || index >= record.chunkCount) throw conflict();
    const result = await this.request(this.partPath(id,revision,index));
    return result.fields?.content?.stringValue || '';
  }
  private async cleanupParts(id: string,only?: string) {
    let pageToken: string | undefined;
    do {
      const result = await this.request(`${this.document(id)}/parts?pageSize=200${pageToken ? '&pageToken='+encodeURIComponent(pageToken) : ''}`);
      const writes = (result.documents || []).filter((doc: any) => !only || doc.name.split('/').pop().startsWith(only+'_')).map((doc: any) => ({delete:doc.name}));
      if (writes.length) await this.request(`${this.root()}:commit`,'POST',{writes});
      pageToken = result.nextPageToken;
    } while (pageToken);
  }
  async discard(email: string,id: string,version: string) {
    const stored = await this.owned(id,email);
    if (stored.version !== version) throw conflict();
    await this.update(id,{...stored.record,deleting:true},version);
    const locked = await this.owned(id,email);
    // Keep the root and its version until files have actually been removed.
    await this.cleanupParts(id);
    await this.request(`${this.root()}:commit`,'POST',{writes:[{delete:this.document(id),currentDocument:{updateTime:locked.version}}]});
  }
  async complete(email: string,id: string,version: string,records: Record<string,any>[]) {
    const stored = await this.owned(id,email);
    if (stored.version !== version || stored.record.deleting) throw conflict();
    if (!records.length || records.length > 100) throw new StorageError('Danh sách hoàn tất không hợp lệ.',400);
    // Commit records and close the draft atomically. A stale device cannot submit
    // the same draft twice, even if cleanup later needs to be retried.
    await this.request(`${this.root()}:commit`,'POST',{writes:[
      ...records.map(record => ({update:{name:`${this.root()}/personnel/${record.id}`,fields:encodeFields(personnelFields(record))},currentDocument:{exists:false}})),
      {update:{name:this.document(id),fields:encodeFields({...stored.record,deleting:true})},currentDocument:{updateTime:version}},
    ]});
    try {
      const locked = await this.owned(id,email);
      await this.discard(email,id,locked.version);
      return false;
    } catch { return true; } // Saved records remain successful; expose cleanup status.
  }
}

export const draftStore = new FirestoreDraftStore();
