import type {DocumentExtractionResult,ThanhVienHoGiaDinh} from '../src/types.js';
import {OCRError,type OCRPage} from './ocrService.js';
export interface OCRDocument {id:string;fileName?:string;docType?:string;pages:OCRPage[];}
const fold=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const labels={
  hoVaTen:'ho va ten|ho ten|ho, chu dem va ten(?: khai sinh)?|full name',ngaySinh:'ngay thang nam sinh|ngay sinh|date of birth',
  soCCCD:'so dinh danh ca nhan|so can cuoc(?: cong dan)?|so cccd|so cmt|personal identification number|so(?=\s*[:/])',
  gioiTinh:'gioi tinh|sex|gender',ngayCap:'ngay cap|date of issue',ngayHetHanCCCD:'ngay het han|co gia tri den|date of expiry',
  noiCap:'noi cap|co quan cap|place of issue',queQuan:'que quan|place of origin',
  diaChiThuongTru:'dia chi thuong tru|noi thuong tru|thuong tru|place of residence',
  tinhTrangHonNhan:'tinh trang hon nhan|hon nhan',soDienThoai:'so dien thoai|dien thoai|di dong|phone|mobile',
  emailCaNhan:'email ca nhan|email|e-mail',quanHeVoiChuHo:'moi quan he voi chu ho|quan he voi chu ho|quan he chu ho',
  quocTich:'quoc tich|nationality',danToc:'dan toc|ethnicity',
};
const anyLabel=new RegExp(`^(?:${Object.values(labels).join('|')}|ngay dang ky|noi o hien tai|dia chi tam tru|noi tam tru|nghe nghiep|ton giao|noi sinh|so thu tu|stt|vneid|thong tin|ho gia dinh|so yeu ly lich|can cuoc|identity card|cong hoa|doc lap|quan he gia dinh|hoan canh gia dinh)\\b`,'i');
function labeled(text:string,pattern:string,maxLines=1) {
  const lines=text.normalize('NFC').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const matchLabel=new RegExp(`^(?:\\d+[.)]\\s*)?(?:${pattern})\\b(?:\\s*/\\s*(?:full name|date of birth|date of issue|date of expiry|place of origin|place of residence|personal identification number|nationality|sex|no\\.?))?\\s*[:：.-]?\\s*`,'i');
  const result:string[]=[];
  for(let index=0;index<lines.length;index++) {
    const match=fold(lines[index]).match(matchLabel);
    if(!match) continue;
    const values:string[]=[];
    const sameLine=lines[index].slice(match[0].length).replace(/^\s*[/：:.\-]+\s*$/,'').trim();
    if(sameLine && !anyLabel.test(fold(sameLine))) values.push(sameLine);
    for(let next=index+1;next<lines.length && values.length<maxLines;next++) {
      const line=lines[next];
      // Skip bilingual label-only continuations printed on identity cards.
      if(/^(full name|date of birth|sex|nationality|place of origin|place of residence|date of expiry)$/i.test(line)) continue;
      if(anyLabel.test(fold(line))) break;
      values.push(line);
    }
    if(values.length) result.push(values.join(', '));
  }
  return result;
}
function date(value:string) {
  const match=value.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/);
  if(!match) return '';
  const [day,month,year]=match.slice(1).map(Number);const actual=new Date(Date.UTC(year,month-1,day));
  return year>=1900 && year<=2200 && actual.getUTCDate()===day && actual.getUTCMonth()===month-1 ? `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}` : '';
}
const first=(values:string[])=>values.find(Boolean) || '';
const gender=(value:string)=>/^(nu|female)\b/.test(fold(value)) ? 'Nữ' : /^(nam|male)\b/.test(fold(value)) ? 'Nam' : /^khac\b/.test(fold(value)) ? 'Khác' : '';
const validName=(value:string)=>!/[\d:]/.test(value) && value.trim().split(/\s+/).length>=2 && value.length<=100 && !anyLabel.test(fold(value)) ? value.toUpperCase().trim() : '';
const unique=(values:string[])=>[...new Set(values.filter(Boolean))];
function source(doc:OCRDocument,text:string) {
  if(doc.docType==='vneid_cu_tru' || /vneid|thong tin cu tru|quan he voi chu ho|ho gia dinh/.test(fold(text))) return 'vneid';
  if(doc.docType?.startsWith('cccd') || /can cuoc|identity card|personal identification/.test(fold(text))) return 'cccd';
  return 'other';
}
function household(text:string):ThanhVienHoGiaDinh[] {
  const result:ThanhVienHoGiaDinh[]=[];
  // VNeID member cards have explicit labels. Never infer a relationship from
  // an unlabeled list or reuse SYLL family members as household members.
  const blocks=text.split(/(?=^(?:Họ và tên|Họ tên|Ho va ten|Ho ten|Họ, chữ đệm và tên(?: khai sinh)?)\b)/gim);
  for(const block of blocks) {
    const relation=first(labeled(block,labels.quanHeVoiChuHo));
    const name=first(labeled(block,labels.hoVaTen).map(validName));
    if(name && relation) result.push({hoTen:name,ngaySinh:first(labeled(block,labels.ngaySinh).map(date)),quanHeVoiChuHo:relation,gioiTinh:gender(first(labeled(block,labels.gioiTinh))),diaChiThuongTru:first(labeled(block,labels.diaChiThuongTru,3)),quocTich:first(labeled(block,labels.quocTich)),danToc:first(labeled(block,labels.danToc))});
  }
  // Explicit table delimiters only: uncertain scanned tables stay for review.
  const lines=text.split(/\r?\n/);
  for(let index=0;index<lines.length;index++) {
    const columns=lines[index].split(/\t+|\s{2,}|\|/).map(value=>value.trim()).filter(Boolean);
    const keys=columns.map(column=>{
      const label=fold(column);return Object.entries(labels).find(([,pattern])=>new RegExp(`^(?:${pattern})$`).test(label))?.[0] || '';
    });
    if(!keys.includes('hoVaTen') || !keys.includes('quanHeVoiChuHo')) continue;
    for(let row=index+1;row<lines.length;row++) {
      const values=lines[row].split(/\t+|\s{2,}|\|/).map(value=>value.trim()).filter(Boolean);
      if(values.length!==columns.length) break;
      const data=Object.fromEntries(keys.map((key,column)=>[key,values[column]]));
      const name=validName(data.hoVaTen || '');
      if(name && data.quanHeVoiChuHo) result.push({hoTen:name,ngaySinh:date(data.ngaySinh || ''),quanHeVoiChuHo:data.quanHeVoiChuHo,gioiTinh:gender(data.gioiTinh || ''),diaChiThuongTru:data.diaChiThuongTru || '',quocTich:data.quocTich || '',danToc:data.danToc || ''});
    }
  }
  return result.filter((member,index,all)=>all.findIndex(other=>other.hoTen===member.hoTen && other.ngaySinh===member.ngaySinh && other.quanHeVoiChuHo===member.quanHeVoiChuHo)===index);
}
export function parseOCRProfile(documents:OCRDocument[]):DocumentExtractionResult {
  if(!Array.isArray(documents) || !documents.length || documents.length>100) throw new OCRError('Danh sách văn bản OCR không hợp lệ.');
  const docs=documents.flatMap(doc=>{
    if(!doc || !Array.isArray(doc.pages) || !doc.pages.length || doc.pages.length>30 || doc.pages.some(page=>!page || typeof page.text!=='string' || page.text.length>100_000 || typeof page.confidence!=='number' || !Number.isFinite(page.confidence))) throw new OCRError('Trang OCR không hợp lệ.');
    return doc.pages.map(page=>({text:page.text,kind:source(doc,page.text),pages:[page]}));
  });
  if(docs.reduce((sum,doc)=>sum+doc.text.length,0)>300_000) throw new OCRError('Văn bản OCR quá dài. Hãy chia nhỏ hồ sơ.');
  const ordered=[...docs.filter(doc=>doc.kind==='cccd'),...docs.filter(doc=>doc.kind==='other'),...docs.filter(doc=>doc.kind==='vneid')];
  const identity=ordered.filter(doc=>!/quan he voi chu ho|ho gia dinh/.test(fold(doc.text)) || doc.kind==='cccd').map(doc=>doc.text.split(/(?:quan hệ gia đình|hoàn cảnh gia đình|thông tin gia đình)/i)[0]);
  const read=(key:keyof typeof labels,maxLines=1)=>first(identity.flatMap(text=>labeled(text,labels[key],maxLines)));
  const ids=unique(identity.flatMap(text=>labeled(text,labels.soCCCD)).map(value=>value.replace(/[\s.-]/g,'').match(/^\d{12}\b/)?.[0] || ''));
  const names=unique(identity.flatMap(text=>labeled(text,labels.hoVaTen)).map(validName));
  const residence=docs.filter(doc=>doc.kind==='vneid').flatMap(doc=>labeled(doc.text,labels.diaChiThuongTru,3));
  const result:DocumentExtractionResult={
    extractionMethod:'ocr',aiVisionExtracted:false,hoVaTen:names.length===1 ? names[0] : '',soCCCD:ids.length===1 ? ids[0] : '',
    ngaySinh:date(read('ngaySinh')),gioiTinh:gender(read('gioiTinh')),ngayCap:date(read('ngayCap')),ngayHetHanCCCD:date(read('ngayHetHanCCCD')),noiCap:read('noiCap'),queQuan:read('queQuan',2),
    diaChiThuongTru:first(residence) || read('diaChiThuongTru',3),...(residence.length ? {nguonDiaChi:'VNeID' as const} : docs.some(doc=>doc.kind==='cccd') ? {nguonDiaChi:'CCCD' as const} : {}),
    tinhTrangHonNhan:read('tinhTrangHonNhan'),soDienThoai:read('soDienThoai').replace(/[\s().-]/g,'').match(/^(?:0\d{9}|\+84\d{9})(?!\d)/)?.[0] || '',
    emailCaNhan:first(docs.flatMap(doc=>doc.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])),
    congViecDuKien:'',chucVu:'',thongTinGiaDinh:[],thanhVienHoGiaDinh:docs.filter(doc=>doc.kind==='vneid').flatMap(doc=>household(doc.text)),
    mucDoTinCay:'CAN_XAC_NHAN',thongTinChuaRo:[],cauHoiLamRo:['Dữ liệu được đọc bằng OCR và tách theo nhãn. Vui lòng đối chiếu lại họ tên, dấu tiếng Việt và số định danh với tài liệu gốc.'],
    ghiChu:'',
  };
  for(const [key,label] of Object.entries({hoVaTen:'Họ và tên',soCCCD:'Số CCCD',ngaySinh:'Ngày sinh',diaChiThuongTru:'Địa chỉ thường trú',ngayCap:'Ngày cấp CCCD',ngayHetHanCCCD:'Ngày hết hạn CCCD',noiCap:'Nơi cấp CCCD'})) {
    if(!result[key]) {result.thongTinChuaRo!.push(label);result.cauHoiLamRo!.push(`Chưa đọc chắc chắn ${label.toLowerCase()}; vui lòng kiểm tra hoặc nhập tay.`);}
  }
  if(names.length>1 || ids.length>1) result.cauHoiLamRo!.push('Phát hiện nhiều tên hoặc số CCCD khác nhau. Hãy kiểm tra các tài liệu có cùng thuộc một người không.');
  if(docs.some(doc=>doc.pages.some(page=>page.confidence<70))) result.cauHoiLamRo!.push('Có trang OCR độ tin cậy thấp; cần đối chiếu kỹ chữ và chữ số.');
  if(docs.some(doc=>/so yeu ly lich|hoan canh gia dinh/.test(fold(doc.text)))) result.cauHoiLamRo!.push('Thông tin người thân trong sơ yếu lý lịch cần kiểm tra và bổ sung thủ công.');
  if(docs.some(doc=>doc.kind==='vneid') && !result.thanhVienHoGiaDinh!.length) result.cauHoiLamRo!.push('Chưa đọc chắc chắn thành viên hộ gia đình VNeID; hãy bổ sung ở bảng hộ gia đình.');
  if(![result.hoVaTen,result.soCCCD,result.ngaySinh,result.emailCaNhan,result.soDienThoai].some(Boolean)) throw new OCRError('OCR đã đọc chữ nhưng chưa xác định được trường thông tin cá nhân. Hãy kiểm tra tài liệu hoặc nhập thủ công tại Bước 2.',422);
  return result;
}
