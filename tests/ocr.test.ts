import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {parseOCRProfile,type OCRDocument} from '../backend/ocrProfile.js';
import {recognizeImage,validateOCRImage} from '../backend/ocrService.js';
const document=(text:string,docType='khac'):OCRDocument=>({id:'test',docType,pages:[{page:1,text,confidence:90,lines:[]}]});
const identity=`CĂN CƯỚC CÔNG DÂN
Số CCCD: 000000001234
Họ và tên: NGUYỄN VĂN MẪU
Ngày sinh: 15/06/1995
Giới tính: Nam
Quê quán: Phường Mẫu, Tỉnh Kiểm Thử
Thường trú: Địa chỉ cũ, Tỉnh Kiểm Thử
Ngày cấp: 01/02/2022
Có giá trị đến: 15/06/2035
Nơi cấp: Cục Kiểm Thử
Email: mau@example.com`;
test('OCR rules extract labeled Vietnamese identity fields without any AI client',()=>{
  const profile=parseOCRProfile([document(identity)]);
  assert.equal(profile.hoVaTen,'NGUYỄN VĂN MẪU');assert.equal(profile.soCCCD,'000000001234');
  assert.equal(profile.ngaySinh,'15/06/1995');assert.equal(profile.ngayCap,'01/02/2022');assert.equal(profile.ngayHetHanCCCD,'15/06/2035');
  assert.equal(profile.emailCaNhan,'mau@example.com');assert.equal(profile.gioiTinh,'Nam');assert.equal(profile.aiVisionExtracted,false);assert.equal(profile.extractionMethod,'ocr');
});
test('VNeID permanent address takes priority; household members remain separate from SYLL',()=>{
  const vneid=`VNeID - Thông tin cư trú
Địa chỉ thường trú: Địa chỉ mới, Phường Mẫu
Hộ gia đình
Họ và tên: TRẦN THỊ MẪU
Ngày sinh: 20/07/1998
Quan hệ với chủ hộ: Vợ
Giới tính: Nữ`;
  const syll=`Sơ yếu lý lịch
Họ và tên: NGUYỄN VĂN MẪU
Tình trạng hôn nhân: Đã kết hôn
Quan hệ gia đình
Họ và tên: NGUYỄN VĂN CHA
Quan hệ: Cha`;
  const profile=parseOCRProfile([document(identity),document(vneid),document(syll)]);
  assert.equal(profile.diaChiThuongTru,'Địa chỉ mới, Phường Mẫu');assert.equal(profile.nguonDiaChi,'VNeID');assert.equal(profile.tinhTrangHonNhan,'Đã kết hôn');
  assert.equal(profile.thanhVienHoGiaDinh?.length,1);assert.equal(profile.thanhVienHoGiaDinh?.[0].hoTen,'TRẦN THỊ MẪU');
  assert.equal(profile.thanhVienHoGiaDinh?.[0].quocTich,'');assert.equal(profile.thanhVienHoGiaDinh?.[0].danToc,'');assert.equal(profile.thongTinGiaDinh.length,0);
});
test('conflicting identities are left blank and flagged rather than merged',()=>{
  const profile=parseOCRProfile([document(identity),document(identity.replace('NGUYỄN VĂN MẪU','TRẦN VĂN KHÁC').replace('000000001234','000000009999'))]);
  assert.equal(profile.soCCCD,'');assert.equal(profile.hoVaTen,'');assert.match(profile.cauHoiLamRo!.join(' '),/nhiều tên/);
});
test('invalid dates and ambiguous household lists are never invented',()=>{
  const profile=parseOCRProfile([document(identity.replace('15/06/1995','31/02/1995')),document('VNeID - Hộ gia đình\nTRẦN THỊ MẪU\n20/07/1998')]);
  assert.equal(profile.ngaySinh,'');assert.equal(profile.thanhVienHoGiaDinh?.length,0);assert.ok(profile.thongTinChuaRo?.includes('Ngày sinh'));
});
test('page-level classification keeps SYLL relatives out of a mixed VNeID PDF',()=>{
  const mixed=document('VNeID - Hộ gia đình\nHọ và tên: TRẦN THỊ MẪU\nQuan hệ với chủ hộ: Vợ');
  mixed.pages.push({page:2,text:identity,confidence:100,lines:[]});
  const profile=parseOCRProfile([mixed]);assert.equal(profile.hoVaTen,'NGUYỄN VĂN MẪU');assert.equal(profile.thanhVienHoGiaDinh?.length,1);
});
test('empty profiles and unbounded OCR input fail explicitly',()=>{
  assert.throws(()=>parseOCRProfile([document('Một dòng không có thông tin nhận dạng')]),{status:422});
  assert.throws(()=>parseOCRProfile([document('x'.repeat(100001))]),{status:400});
  assert.throws(()=>parseOCRProfile(null as any),{status:400});
});
test('OCR image endpoint accepts only bounded actual image headers, never URLs or PDFs',()=>{
  for(const input of [{mimeType:'application/pdf',base64Data:'YWJjZA=='},{mimeType:'image/png',base64Data:'https://example.com/private.png'},{mimeType:'image/png',base64Data:'YWJjZA=='}]) assert.throws(()=>validateOCRImage(input),{status:400});
  const huge=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(huge);huge.write('IHDR',12);huge.writeUInt32BE(9000,16);huge.writeUInt32BE(9000,20);
  assert.throws(()=>validateOCRImage({mimeType:'image/png',base64Data:huge.toString('base64')}),{status:400});
});
test('real Vietnamese OCR reads a synthetic image locally and bounds concurrent work',async()=>{
  const input={mimeType:'image/png',base64Data:(await readFile(new URL('./fixtures/ocr-identity.png',import.meta.url))).toString('base64')};
  const first=recognizeImage(input);
  await assert.rejects(recognizeImage(input),{status:429,retryable:true});
  const page=await first;assert.ok(page.confidence>60);assert.ok(page.lines.length>0);
  const profile=parseOCRProfile([{id:'sample',docType:'cccd_truoc',pages:[page]}]);
  assert.equal(profile.soCCCD,'000000001234');assert.equal(profile.ngaySinh,'15/06/1995');assert.equal(profile.ngayHetHanCCCD,'15/06/2035');assert.equal(profile.emailCaNhan,'mau@example.com');assert.equal(profile.aiVisionExtracted,false);
});
