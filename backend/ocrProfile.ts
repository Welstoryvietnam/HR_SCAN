import type {DocumentExtractionResult,ThanhVienHoGiaDinh} from '../src/types.js';
import {OCRError,type OCRPage} from './ocrService.js';
import {GEMINI_TRANSCRIPT_SEPARATOR} from './visionFormat.js';
export interface OCRDocument {id:string;fileName?:string;docType?:string;pages:OCRPage[];}
const fold=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
// Keep OCR variants narrowly tied to the complete printed field label. In
// particular, "lên" is a common recognition of "tên" on the bilingual card.
const nameLabel='ho va ten|ho ten|ho,?\\s*chu\\s*dem\\s*va\\s*(?:ten|len)(?: khai sinh)?|(?:ho|ha),?\\s*chu\\s*dem\\s*va\\s*[a-z]{1,4}\\s*/\\s*full\\s*name|full\\s*name|ful\\s*name|fl\\s*name';
const birthLabel='ngay,?\\s*thang,?\\s*(?:nam|adm|narn)\\s*sinh|ngay sinh|date of bi(?:r)?th';
const labels={
  hoVaTen:nameLabel,ngaySinh:birthLabel,
  soCCCD:'so dinh danh ca nhan|so can cuoc(?: cong dan)?|so cccd|personal identification number|so(?=\\s*[:/])',
  gioiTinh:'gioi tinh|sex|gender',ngayCap:'ngay cap(?: can cuoc(?: cong dan)?(?: gan nhat)?)?|date of issue',ngayHetHanCCCD:'ngay het han|co gia tri den|date of expiry',
  noiCap:'noi cap|co quan cap|place of issue',queQuan:'que quan|place of origin',
  diaChiThuongTru:'dia chi thuong tru|noi thuong tru|thuong tru|place of residence',
  tinhTrangHonNhan:'tinh trang hon nhan|hon nhan',soDienThoai:'so thue bao di dong|so dien thoai|dien thoai|di dong|phone|mobile',
  emailCaNhan:'dia chi thu dien tu|email ca nhan|email|e-mail',quanHeVoiChuHo:'moi quan he voi chu ho|quan he voi chu ho|quan he chu ho',
  quocTich:'quoc tich|nationality',danToc:'dan toc|ethnicity',
};
const otherLabels='cap nhat|ngay dang ky|noi o hien tai|dia chi tam tru|noi tam tru|nghe nghiep|ton giao|noi sinh|so thu tu|stt|vneid|thong tin|ho gia dinh|so yeu ly lich|can cuoc|identity card|cong hoa|doc lap|quan he gia dinh|hoan canh gia dinh|so cmnd(?: cu)?|so cmt(?: cu)?|ma tai lieu|ma ho so';
const allLabels=`${Object.values(labels).join('|')}|${otherLabels}`;
const anyLabel=new RegExp(`^(?:${allLabels})\\b`,'i');
function labeled(text:string,pattern:string,maxLines=1,address=false) {
  // Keep separate fields on the same printed line from swallowing each other.
  const inlineLabel=new RegExp(`\\s{2,}(?=(?:${allLabels})\\b)`,'gi');
  const lines=text.normalize('NFC').split(/\r?\n/).flatMap(line=>{
    const positions=[...fold(line).matchAll(inlineLabel)];
    let start=0;const parts:string[]=[];
    for(const match of positions) {parts.push(line.slice(start,match.index));start=match.index!+match[0].length;}
    parts.push(line.slice(start));return parts;
  }).map(line=>line.trim()).filter(Boolean);
  const matchLabel=new RegExp(`^(?:\\d+[.)]\\s*)?(?:${pattern})\\b(?:\\s*/?\\s*(?:full\\s*name|ful\\s*name|fl\\s*name|date of bi(?:r)?th|date of issue|date of expiry|place of origin|place of residence|personal identification number|nationality|sex|no\\.?))?\\s*[:：.-]?\\s*`,'i');
  const result:string[]=[];
  for(let index=0;index<lines.length;index++) {
    const match=fold(lines[index]).match(matchLabel);
    if(!match) continue;
    const values:string[]=[];
    const sameLine=lines[index].slice(match[0].length).replace(/^\s*[/：:.\-]+\s*$/,'').trim();
    const detachedNoise=address && /^\p{L}$/u.test(sameLine) && /[:：]\s{4,}\p{L}\s*$/u.test(lines[index]);
    if(sameLine && !detachedNoise && !anyLabel.test(fold(sameLine))) values.push(sameLine);
    else if(sameLine && anyLabel.test(fold(sameLine))) continue;
    for(let next=index+1;next<lines.length && values.length<maxLines;next++) {
      const line=lines[next];
      // Skip bilingual label-only continuations printed on identity cards.
      if(/^(?:\/?\s*)(full\s*name|ful\s*name|fl\s*name|date of birth|sex|nationality|place of origin|place of residence|date of expiry)\s*[:：]?$/i.test(line)) continue;
      if(anyLabel.test(fold(line))) break;
      values.push(line);
    }
    if(values.length) result.push(values.join(address ? ' ' : ', '));
  }
  return result;
}
function addresses(text:string,pattern:string,maxLines=3) {
  // Line wrapping is not punctuation. Keep commas printed in the source;
  // correct only this common accent confusion in the administrative prefix.
  return labeled(text,pattern,maxLines,true).map(value=>value.replace(/thành\s+phổ(?=\s)/giu,'Thành phố').replace(/\s+/g,' ').trim());
}
function date(value:string) {
  const match=value.match(/\b(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4})\b/);
  if(!match) return '';
  const [day,month,year]=match.slice(1).map(Number);const actual=new Date(Date.UTC(year,month-1,day));
  return year>=1900 && year<=2200 && actual.getUTCDate()===day && actual.getUTCMonth()===month-1 ? `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}` : '';
}
function birthDates(text:string,card:boolean) {
  const values=labeled(text,labels.ngaySinh).map(date);
  if(!card) return values;
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  for(let index=0;index<lines.length-1;index++) {
    const label=fold(lines[index]);
    // Recover a damaged final word only under a complete day/month/year
    // label beside the cardholder name, with a standalone date immediately
    // below. Do not use registration, issue, update or other generic dates.
    if(!/^ngay\s*,?\s*thang\s*,?\s*nam\b[ a-z.,/|¦-]{0,20}$/.test(label)) continue;
    if(/\b(?:dang ky|cap|het|han|cap nhat|lap|ky|ket hon|nhap|xuat|tuyen)\b/.test(label)) continue;
    if(!lines.slice(Math.max(0,index-4),index).some(line=>new RegExp(`^(?:${labels.hoVaTen})\\b`).test(fold(line)))) continue;
    if(!/^[|¦\s]*\d{1,2}\s*[/.\-]\s*\d{1,2}\s*[/.\-]\s*\d{4}[.,|¦_„“”\s]*$/.test(lines[index+1])) continue;
    values.push(date(lines[index+1]));
  }
  return values;
}
const first=(values:string[])=>values.find(Boolean) || '';
const gender=(value:string)=>/^(nu|female)\b/.test(fold(value)) ? 'Nữ' : /^(nam|male)\b/.test(fold(value)) ? 'Nam' : /^khac\b/.test(fold(value)) ? 'Khác' : '';
function validName(value:string) {
  // A distant one-letter fragment is usually card background noise. Preserve
  // normally spaced short names; never remove every one-letter name token.
  const cleaned=value.normalize('NFC').replace(/\s{3,}[\p{L}\p{M}]\s*[|¦]*$/u,'')
    .replace(/^[\s|¦]+|[\s|¦.,·]+$/g,'').replace(/\s+/g,' ').trim();
  return /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)+$/u.test(cleaned) && cleaned.length<=100 && !anyLabel.test(fold(cleaned)) ? cleaned.toUpperCase() : '';
}
function identityNumbers(text:string,card:boolean) {
  const values=labeled(text,labels.soCCCD).map(value=>value.replace(/[ .-]/g,'').match(/^\d{12}(?!\d)/)?.[0] || '');
  if(card) {
    const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    for(let i=0;i<lines.length;i++) {
      // Recover a missing number label only next to the cardholder's name.
      // Do not substitute O/I with digits or consume phone/old CMND numbers.
      const previous=fold(lines[i-1] || '');
      const unrelated=/\b(?:cmnd|cmt|dien thoai|mobile|phone|thue bao|ma ho so|ma tai lieu)\b/.test(previous);
      if(!unrelated && /^\d{12}$/.test(lines[i]) && lines.slice(i+1,i+4).some(line=>new RegExp(`^(?:${labels.hoVaTen})\\b`).test(fold(line)))) values.push(lines[i]);
    }
  }
  return values;
}
const unique=(values:string[])=>[...new Set(values.filter(Boolean))];
function mobileNumbers(text:string) {
  const number=(value:string)=>value.replace(/[\s().-]/g,'').match(/^(?:0\d{9}|\+84\d{9})(?![\d\p{L}])/u)?.[0] || '';
  const values=labeled(text,labels.soDienThoai).map(number);
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++) {
    if(!/^so thue bao di dong\b/.test(fold(lines[i]))) continue;
    // VNeID nests the registered mobile under the subscriber section. Limit
    // the search to this section so other account/identity numbers stay out.
    for(let j=i+1;j<Math.min(lines.length,i+5);j++) {
      const label=fold(lines[j]);
      const registered=label.match(/dang ky tai khoan dinh danh\s*[:：]\s*/);
      if(registered) {values.push(number(lines[j].slice(registered.index!+registered[0].length)));continue;}
      if(anyLabel.test(label) || /^[.\s]*khac\s*[:：]/.test(label)) break;
      values.push(number(lines[j]));
    }
  }
  return values;
}
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
    if(name && relation) result.push({hoTen:name,ngaySinh:first(labeled(block,labels.ngaySinh).map(date)),quanHeVoiChuHo:relation,gioiTinh:gender(first(labeled(block,labels.gioiTinh))),diaChiThuongTru:first(addresses(block,labels.diaChiThuongTru)),quocTich:first(labeled(block,labels.quocTich)),danToc:first(labeled(block,labels.danToc))});
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
export function parseOCRProfile(documents:OCRDocument[],options:{allowIncomplete?:boolean}={}):DocumentExtractionResult {
  if(!Array.isArray(documents) || !documents.length || documents.length>100) throw new OCRError('Danh sách văn bản OCR không hợp lệ.');
  const docs=documents.flatMap(doc=>{
    if(!doc || !Array.isArray(doc.pages) || !doc.pages.length || doc.pages.length>30 || doc.pages.some(page=>!page || typeof page.text!=='string' || page.text.length>100_000 || typeof page.confidence!=='number' || !Number.isFinite(page.confidence))) throw new OCRError('Trang OCR không hợp lệ.');
    return doc.pages.map(page=>({text:page.text,kind:source(doc,page.text),pages:[page],identityText:page.engine==='gemini' && page.text.includes(GEMINI_TRANSCRIPT_SEPARATOR) ? page.text.split(GEMINI_TRANSCRIPT_SEPARATOR)[0] : undefined}));
  });
  if(docs.reduce((sum,doc)=>sum+doc.text.length,0)>300_000) throw new OCRError('Văn bản OCR quá dài. Hãy chia nhỏ hồ sơ.');
  const ordered=[...docs.filter(doc=>doc.kind==='cccd'),...docs.filter(doc=>doc.kind==='other'),...docs.filter(doc=>doc.kind==='vneid')];
  const identityDocs=ordered.filter(doc=>doc.identityText!==undefined || !/quan he voi chu ho|ho gia dinh/.test(fold(doc.text)) || doc.kind==='cccd');
  const identity=identityDocs.map(doc=>doc.identityText ?? doc.text.split(/(?:quan hệ gia đình|hoàn cảnh gia đình|thông tin gia đình)/i)[0]);
  const read=(key:keyof typeof labels,maxLines=1)=>first(identity.flatMap(text=>labeled(text,labels[key],maxLines)));
  const ids=unique(identity.flatMap((text,index)=>identityNumbers(text,identityDocs[index].kind==='cccd')));
  const readDate=(key:'ngaySinh'|'ngayCap'|'ngayHetHanCCCD')=>key==='ngaySinh'
    ? first(identity.flatMap((text,index)=>birthDates(text,identityDocs[index].kind==='cccd')))
    : first(identity.flatMap(text=>labeled(text,labels[key])).map(value=>key==='ngayHetHanCCCD' && /^khong thoi han[.\s]*$/.test(fold(value)) ? 'Không thời hạn' : date(value)));
  const names=unique(identity.flatMap(text=>labeled(text,labels.hoVaTen)).map(validName));
  const vneidPersonal=docs.filter(doc=>doc.kind==='vneid').map(doc=>{
    if(doc.identityText!==undefined) return doc.identityText;
    // A residence screen can show the employee's address above a household
    // section. Keep that header, but never borrow a relative's member-card data.
    const lines=doc.text.split(/\r?\n/);
    const start=lines.findIndex(line=>/^(?:(?:thong tin )?ho gia dinh|thanh vien ho gia dinh)\b/.test(fold(line.trim())));
    const personal=(start>=0 ? lines.slice(0,start) : lines).join('\n');
    return /quan he voi chu ho/.test(fold(personal)) ? '' : personal;
  });
  const residence=vneidPersonal.flatMap(text=>addresses(text,labels.diaChiThuongTru));
  const vneidOrigin=vneidPersonal.flatMap(text=>addresses(text,labels.queQuan,2));
  const phones=unique(identity.flatMap(mobileNumbers));
  const result:DocumentExtractionResult={
    extractionMethod:'ocr',aiVisionExtracted:false,hoVaTen:names.length===1 ? names[0] : '',soCCCD:ids.length===1 ? ids[0] : '',
    ngaySinh:readDate('ngaySinh'),gioiTinh:gender(read('gioiTinh')),ngayCap:readDate('ngayCap'),ngayHetHanCCCD:readDate('ngayHetHanCCCD'),noiCap:read('noiCap'),queQuan:first(vneidOrigin) || first(identity.flatMap(text=>addresses(text,labels.queQuan,2))),
    diaChiThuongTru:first(residence) || first(identity.flatMap(text=>addresses(text,labels.diaChiThuongTru))),...(residence.length ? {nguonDiaChi:'VNeID' as const} : docs.some(doc=>doc.kind==='cccd') ? {nguonDiaChi:'CCCD' as const} : {}),
    tinhTrangHonNhan:read('tinhTrangHonNhan'),danToc:read('danToc'),soDienThoai:phones.length===1 ? phones[0] : '',
    emailCaNhan:first(identity.flatMap(text=>text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])),
    congViecDuKien:'',chucVu:'',thongTinGiaDinh:[],thanhVienHoGiaDinh:docs.filter(doc=>doc.kind==='vneid').flatMap(doc=>household(doc.text)),
    mucDoTinCay:'CAN_XAC_NHAN',thongTinChuaRo:[],cauHoiLamRo:['Dữ liệu được đọc bằng OCR và tách theo nhãn. Vui lòng đối chiếu lại họ tên, dấu tiếng Việt và số định danh với tài liệu gốc.'],
    ghiChu:'',
  };
  for(const [key,label] of Object.entries({hoVaTen:'Họ và tên',soCCCD:'Số CCCD',ngaySinh:'Ngày sinh',diaChiThuongTru:'Địa chỉ thường trú',ngayCap:'Ngày cấp CCCD',ngayHetHanCCCD:'Ngày hết hạn CCCD',noiCap:'Nơi cấp CCCD'})) {
    if(!result[key]) {result.thongTinChuaRo!.push(label);result.cauHoiLamRo!.push(`Chưa đọc chắc chắn ${label.toLowerCase()}; vui lòng kiểm tra hoặc nhập tay.`);}
  }
  if(names.length>1 || ids.length>1) result.cauHoiLamRo!.push('Phát hiện nhiều tên hoặc số CCCD khác nhau. Hãy kiểm tra các tài liệu có cùng thuộc một người không.');
  if(phones.length>1) result.cauHoiLamRo!.push('Phát hiện nhiều số điện thoại khác nhau. Vui lòng chọn số liên hệ chính.');
  if(docs.some(doc=>doc.pages.some(page=>page.confidence<70))) result.cauHoiLamRo!.push('Có trang OCR độ tin cậy thấp; cần đối chiếu kỹ chữ và chữ số.');
  if(docs.some(doc=>/so yeu ly lich|hoan canh gia dinh/.test(fold(doc.text)))) result.cauHoiLamRo!.push('Thông tin người thân trong sơ yếu lý lịch cần kiểm tra và bổ sung thủ công.');
  if(docs.some(doc=>doc.kind==='vneid') && !result.thanhVienHoGiaDinh!.length) result.cauHoiLamRo!.push('Chưa đọc chắc chắn thành viên hộ gia đình VNeID; hãy bổ sung ở bảng hộ gia đình.');
  if(docs.some(doc=>doc.pages.some(page=>page.engine==='gemini'))) {
    result.extractionMethod='vision';result.aiVisionExtracted=true;
    result.cauHoiLamRo!.push('Gemini đã hỗ trợ đọc ảnh sau OCR. Cần đối chiếu các trường trích xuất với tài liệu gốc.');
  }
  for(const doc of docs) for(const page of doc.pages) {
    if(page.assistance?.message && ['unavailable','conflict'].includes(page.assistance.status)) result.cauHoiLamRo!.push(page.assistance.message);
  }
  result.cauHoiLamRo=[...new Set(result.cauHoiLamRo)];
  // Internal orientation scoring can inspect reverse-side fields. Public API
  // callers keep the default requirement for an identifiable employee.
  if(!options.allowIncomplete && ![result.hoVaTen,result.soCCCD,result.ngaySinh,result.emailCaNhan,result.soDienThoai].some(Boolean)) throw new OCRError('OCR đã đọc chữ nhưng chưa xác định được trường thông tin cá nhân. Hãy kiểm tra tài liệu hoặc nhập thủ công tại Bước 2.',422);
  return result;
}
