import { createSign } from 'node:crypto';

export type EmployeeRecord = Record<string, any>;
type FirestoreValue = Record<string, any>;

// Only completed personnel fields are persisted. Uploads and AI source material
// must never enter Firestore, even if a client includes extra request fields.
const RECORD_FIELDS = new Set(`id timestamp userEmail hoVaTen ngaySinh gioiTinh soCCCD ngayCap noiCap queQuan diaChiThuongTru nguonDiaChi ghiChuSapNhap diemLamViec loaiHopDong ngayVaoLam diaChiTamTru emailCaNhan tinhTrangHoSo soDienThoai khoi ban phong congViecDuKien chucVu isManualSalary thongTinGiaDinh luongCoBan phuCapChucVu phuCapDienThoai troCapTayNghe troCapGiaDinh thuongChuyenCan thuongSangKien phuCapMoiTruong phuCapXangXe anToanVeSinhVien phuCapKinhDoanh phuCapNangNhoc troCapDacThuFPT thuongNangLucAM phuCapLuuDong phuCapCoDinh phuCapPhatSinh tongPhuCap tongThuNhapDuKien luongDongBHXH maNhanVien tinhTrangHonNhan trinhDoHocVan ghiChu soTaiLieuDinhKem trangThaiEmail thoiGianGuiEmail capNhatLuc`.split(' '));

export class StorageError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export function firebaseCredentials() {
  try {
    const value = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId || value.project_id !== projectId || !value.client_email || !value.private_key) throw new Error();
    return { projectId, email: String(value.client_email), privateKey: String(value.private_key).replace(/\\n/g, '\n') };
  } catch {
    throw new StorageError('Chưa cấu hình Firestore. Vui lòng kiểm tra FIREBASE_PROJECT_ID và FIREBASE_SERVICE_ACCOUNT_JSON trên Vercel.');
  }
}

export function firestoreConfigured() {
  try { firebaseCredentials(); return true; } catch { return false; }
}

export function personnelFields(record: EmployeeRecord): EmployeeRecord {
  const filtered = Object.fromEntries(Object.entries(record).filter(([key, value]) => RECORD_FIELDS.has(key) && value !== undefined));
  if ('thongTinGiaDinh' in filtered) filtered.thongTinGiaDinh = Array.isArray(filtered.thongTinGiaDinh)
    ? filtered.thongTinGiaDinh.map((member: any) => Object.fromEntries(['quanHe','hoTen','namSinh','ngheNghiep'].filter(key => member?.[key] !== undefined).map(key => [key,String(member[key])]))) : [];
  return filtered;
}

function encode(value: any): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new StorageError('Số tiền hoặc giá trị số không hợp lệ.',400);
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}
function encodeFields(value: EmployeeRecord) { return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,encode(item)])); }
function decode(value: FirestoreValue): any {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return value.stringValue ?? value.timestampValue ?? '';
}
function decodeFields(value: Record<string,FirestoreValue>): EmployeeRecord { return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,decode(item)])); }

export class FirestoreRecordStore {
  private token?: { value: string; expires: number; identity: string };
  private async accessToken() {
    const credentials = firebaseCredentials();
    if (this.token && this.token.expires > Date.now() + 60_000 && this.token.identity === credentials.email) return this.token.value;
    const now = Math.floor(Date.now()/1000);
    const header = Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
    const claims = Buffer.from(JSON.stringify({iss:credentials.email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})).toString('base64url');
    const unsigned = `${header}.${claims}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(credentials.privateKey,'base64url');
    const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${signature}`}),signal:AbortSignal.timeout(15_000)});
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new StorageError('Không xác thực được Firestore. Vui lòng kiểm tra khóa Service Account trên Vercel.');
    this.token = {value:body.access_token,expires:Date.now()+Number(body.expires_in||3600)*1000,identity:credentials.email};
    return this.token.value;
  }
  private root() { return `projects/${firebaseCredentials().projectId}/databases/(default)/documents`; }
  private document(id: string) {
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) throw new StorageError('Mã hồ sơ không hợp lệ.',400);
    return `${this.root()}/personnel/${id}`;
  }
  private async request(path: string, method = 'GET', body?: any) {
    try {
    const response = await fetch(`https://firestore.googleapis.com/v1/${path}`,{method,headers:{Authorization:`Bearer ${await this.accessToken()}`,'Content-Type':'application/json'},...(body === undefined ? {} : {body:JSON.stringify(body)}),signal:AbortSignal.timeout(20_000)});
    const data = await response.json();
    if (!response.ok) {
      // Streaming REST methods such as runQuery can wrap errors in an array.
      const upstreamError = Array.isArray(data) ? data.find(item => item.error)?.error : data.error;
      if (response.status === 409 || upstreamError?.status === 'FAILED_PRECONDITION') throw new StorageError('Hồ sơ đã thay đổi. Vui lòng tải lại danh sách trước khi lưu.',409);
      if (response.status === 404 && method === 'GET') throw new StorageError('Không tìm thấy hồ sơ.',404);
      if (response.status === 404) throw new StorageError('Chưa tìm thấy Firestore database (default) trong project ' + firebaseCredentials().projectId + '. Vui lòng tạo database với ID (default).');
      const serviceDisabled = upstreamError?.details?.some((detail: any) => detail.reason === 'SERVICE_DISABLED') || /has not been used|is disabled/i.test(upstreamError?.message || '');
      if (response.status === 403 && serviceDisabled) throw new StorageError('Chưa bật Cloud Firestore API cho project ' + firebaseCredentials().projectId + '. Vui lòng bật API và tạo Firestore database (default).');
      if (response.status === 403) throw new StorageError('Service Account chưa có quyền truy cập Firestore trong project ' + firebaseCredentials().projectId + '. Vui lòng cấp vai trò Cloud Datastore User (roles/datastore.user) trong Google Cloud IAM.');
      throw new StorageError(response.status === 429 ? 'Firestore đạt hạn mức sử dụng. Vui lòng thử lại sau.' : 'Không truy cập được Firestore. Vui lòng kiểm tra database (default) và quyền Service Account.');
    }
    return data;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Không kết nối được Firestore. Vui lòng kiểm tra Service Account và thử lại.');
    }
  }
  async list(email?: string) {
    const results = await this.request(`${this.root()}:runQuery`,'POST',{structuredQuery:{from:[{collectionId:'personnel'}],...(email ? {where:{fieldFilter:{field:{fieldPath:'userEmail'},op:'EQUAL',value:{stringValue:email}}}} : {})}});
    return results.filter((item: any) => item.document).map((item: any) => decodeFields(item.document.fields || {})).sort((a: EmployeeRecord,b: EmployeeRecord) => String(b.timestamp).localeCompare(String(a.timestamp)));
  }
  async get(id: string) {
    const document = await this.request(this.document(id));
    return { record:decodeFields(document.fields || {}), version:document.updateTime as string };
  }
  async create(records: EmployeeRecord[]) {
    if (!records.length || records.length > 400) throw new StorageError('Mỗi lần lưu từ 1 đến 400 hồ sơ.',400);
    // Atomic commit: no partial success or overwriting another submission.
    await this.request(`${this.root()}:commit`,'POST',{writes:records.map(record => ({update:{name:this.document(record.id),fields:encodeFields(personnelFields(record))},currentDocument:{exists:false}}))});
  }
  async update(id: string, record: EmployeeRecord, version: string) {
    await this.request(`${this.root()}:commit`,'POST',{writes:[{update:{name:this.document(id),fields:encodeFields(personnelFields(record))},currentDocument:{updateTime:version}}]});
  }
  async delete(id: string) {
    await this.request(`${this.root()}:commit`,'POST',{writes:[{delete:this.document(id)}]});
  }
}

export const recordStore = new FirestoreRecordStore();
