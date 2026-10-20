import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {parseOCRProfile,type OCRDocument} from '../backend/ocrProfile.js';
import {recognizeImage,validateOCRImage} from '../backend/ocrService.js';
import {personnelFields} from '../backend/recordStore.js';
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

test('employee ethnicity is read separately from household members and survives record filtering',()=>{
  const profile=parseOCRProfile([document(identity+'\nDân tộc: Kinh\nTôn giáo: Không'),document('VNeID - Hộ gia đình\nHọ và tên: TRẦN THỊ MẪU\nQuan hệ với chủ hộ: Vợ\nDân tộc: Tày')]);
  assert.equal(profile.danToc,'Kinh');
  assert.equal(profile.thanhVienHoGiaDinh?.[0].danToc,'Tày');
  assert.equal(personnelFields({danToc:profile.danToc}).danToc,'Kinh');
  assert.equal(parseOCRProfile([document(identity)]).danToc,'');
});

test('legacy Gemini SOP keeps VNeID hometown priority and only explicit unlimited card expiry',()=>{
  const newer=document('VNeID - Thông tin định danh\nQuê quán: Phường Mới, Tỉnh Mẫu\nNơi thường trú: Địa chỉ mới, Tỉnh Mẫu');
  const fields=parseOCRProfile([document(identity),newer]);
  assert.equal(fields.queQuan,'Phường Mới, Tỉnh Mẫu');assert.equal(fields.diaChiThuongTru,'Địa chỉ mới, Tỉnh Mẫu');
  assert.equal(parseOCRProfile([document(identity.replace('15/06/2035','Không thời hạn'))]).ngayHetHanCCCD,'Không thời hạn');
  assert.equal(parseOCRProfile([document(identity.replace('15/06/2035','Không thời hạn do tự tính tuổi'))]).ngayHetHanCCCD,'');
});

test('a relatives VNeID member-card address never replaces the employees residence',()=>{
  const relative=document('VNeID\nHọ và tên: TRẦN THỊ MẪU\nQuan hệ với chủ hộ: Vợ\nNơi thường trú: Địa chỉ người thân');
  assert.equal(parseOCRProfile([document(identity),relative]).diaChiThuongTru,'Địa chỉ cũ, Tỉnh Kiểm Thử');
});

test('wrapped addresses discard detached label noise and preserve source commas',()=>{
  const text=identity.replace('Thường trú: Địa chỉ cũ, Tỉnh Kiểm Thử','Nơi thường trú:                 à\nKhu Mẫu, Phường Kiểm Thử, Thành\nphổ Hà Nội\nNơi tạm trú:');
  const profile=parseOCRProfile([document(text)]);
  assert.equal(profile.diaChiThuongTru,'Khu Mẫu, Phường Kiểm Thử, Thành phố Hà Nội');
  assert.equal(parseOCRProfile([document(identity.replace('Thường trú: Địa chỉ cũ, Tỉnh Kiểm Thử','Thường trú: A\nĐường Mẫu, Thành phố Hà Nội\nNơi tạm trú:'))]).diaChiThuongTru,'A Đường Mẫu, Thành phố Hà Nội');
  assert.equal(parseOCRProfile([document(identity.replace('Thường trú: Địa chỉ cũ, Tỉnh Kiểm Thử','Thường trú: Số 5, Đường Mẫu, Thành phố Hà Nội'))]).diaChiThuongTru,'Số 5, Đường Mẫu, Thành phố Hà Nội');
});

test('printed VNeID card recovers unlabeled ID, noisy name and damaged birth label',()=>{
  // Synthetic transcription reproduces layout defects; no real personnel data.
  const profile=parseOCRProfile([document(`Căn cước điện tử
000000001234
Họ, chứ đệm và tên Full name:
NGUYỄN VĂN MẪU             ị
Ngày, tháng, adm sinh / Date of bith:
15/06/1995 yu
Quốc tịch / Nationality: Việt Nam
Ngày cấp Căn cước công dân gần nhất: 01/02/2022
Cập nhật lần cuối    11:08 17-07-2026`)]);
  assert.equal(profile.hoVaTen,'NGUYỄN VĂN MẪU');
  assert.equal(profile.soCCCD,'000000001234');
  assert.equal(profile.ngaySinh,'15/06/1995');
  assert.equal(profile.ngayCap,'01/02/2022');
});

test('damaged bilingual name label and terminal print punctuation retain cardholder context',()=>{
  const profile=parseOCRProfile([document(`CĂN CƯỚC ĐIỆN TỬ
S6 8nh danh cá nhận Porson
000000001234
Ho, chữ đệm và lên /Fl name:
NGUYỄN THỊ MẪU .
Ngày, tháng, narn sinh / Date of birth:
15 / 06 / 1995
Quốc tịch: Việt Nam
Dân tộc: Kinh                 Tôn giáo: Không
Ngày cấp Căn cước công dân gần nhất: 01/02/2022.
Cập nhật lần cuối: 04:09 17-07-2026`)]);
  assert.equal(profile.hoVaTen,'NGUYỄN THỊ MẪU');
  assert.equal(profile.soCCCD,'000000001234');
  assert.equal(profile.ngaySinh,'15/06/1995');
  assert.equal(profile.ngayCap,'01/02/2022');
  assert.equal(profile.danToc,'Kinh');
  assert.equal(profile.ngayHetHanCCCD,'');
  const split=identity.replace('Họ và tên: NGUYỄN VĂN MẪU','Họ, chữ đệm và lên\n/Flname:\nNGUYỄN VĂN A.');
  assert.equal(parseOCRProfile([document(split)]).hoVaTen,'NGUYỄN VĂN A');
});

test('fuzzy birth labels never infer dates missing from OCR or use update timestamps',()=>{
  const noBirth=identity.replace('Ngày sinh: 15/06/1995','Ngày, tháng, narn sinh:\nQuốc tịch: Việt Nam')+'\nCập nhật lần cuối: 17/07/2026';
  assert.equal(parseOCRProfile([document(noBirth)]).ngaySinh,'');
  const unknownLabel=identity.replace('Ngày sinh: 15/06/1995','Ngày đăng ký khai sinh: 15/06/1995');
  assert.equal(parseOCRProfile([document(unknownLabel)]).ngaySinh,'');
  assert.equal(parseOCRProfile([document(identity.replace('15/06/1995','15/06/I995'))]).ngaySinh,'');
});

test('damaged card headers require bilingual name and nearby standalone birth date',()=>{
  const text=identity.replace('Họ và tên: NGUYỄN VĂN MẪU','Hạ, chữ đệm và Wn /Full name:\nNGUYỄN VĂN MẪU .')
    .replace('Ngày sinh: 15/06/1995','Ngày, tháng, năm. Uh ce\n15/06/1995');
  const profile=parseOCRProfile([document(text)]);
  assert.equal(profile.hoVaTen,'NGUYỄN VĂN MẪU');assert.equal(profile.ngaySinh,'15/06/1995');
  assert.equal(parseOCRProfile([document(text.replace('15/06/1995','15/06/1995     _„'))]).ngaySinh,'15/06/1995');
  assert.equal(parseOCRProfile([document(text.replace('Ngày, tháng, năm. Uh ce','Ngày, tháng, năm đăng ký'))]).ngaySinh,'');
  assert.equal(parseOCRProfile([document(text.replace('Ngày, tháng, năm. Uh ce','Ngày, tháng, năm cấp'))]).ngaySinh,'');
  assert.equal(parseOCRProfile([document(text.replace('15/06/1995','31/02/1995'))]).ngaySinh,'');
  assert.equal(parseOCRProfile([document(text.replace('15/06/1995','Cập nhật: 15/06/1995'))]).ngaySinh,'');
  assert.equal(parseOCRProfile([document(text.replace('CĂN CƯỚC CÔNG DÂN','HỒ SƠ MẪU'))]).ngaySinh,'');
  assert.equal(parseOCRProfile([document(text.replace('Hạ, chữ đệm và Wn /Full name:','Hạ, chữ đệm và Wn:'))]).hoVaTen,'');
});

test('dates with spaces, card No label and adjacent fields are extracted',()=>{
  const text=identity.replace('Số CCCD:','Số / No.:').replace('15/06/1995','15 / 06 / 1995');
  assert.equal(parseOCRProfile([document(text)]).soCCCD,'000000001234');
  assert.equal(parseOCRProfile([document(text)]).ngaySinh,'15/06/1995');
  const combined=identity.replace('Số CCCD: 000000001234\n','').replace('Ngày sinh: 15/06/1995','Ngày sinh: 15/06/1995    Số CCCD: 000000001234');
  assert.equal(parseOCRProfile([document(combined)]).soCCCD,'000000001234');
});

test('update timestamps never supply missing issue dates',()=>{
  const text=identity.replace('Ngày cấp: 01/02/2022','Ngày cấp:\nCập nhật lần cuối: 17/07/2026');
  assert.equal(parseOCRProfile([document(text)]).ngayCap,'');
  assert.equal(parseOCRProfile([document(identity.replace('Ngày cấp: 01/02/2022','Cập nhật lần cuối: 17/07/2026'))]).ngayCap,'');
});

test('VNeID mobile subscriber section supplies the contact number',()=>{
  const text=identity+'\nSố thuê bao di động:\nBiê\n. Đăng ký tài khoản định danh: 090 123 4567\n. Khác: ---\nĐịa chỉ thư điện tử:\n---';
  assert.equal(parseOCRProfile([document(text)]).soDienThoai,'0901234567');
  assert.equal(parseOCRProfile([document(identity+'\nSố thuê bao di động: +84 901 234 567')]).soDienThoai,'+84901234567');
  assert.equal(parseOCRProfile([document(identity+'\nSố điện thoại: 0901234567')]).soDienThoai,'0901234567');
});

test('mobile extraction does not consume unrelated or conflicting numbers',()=>{
  assert.equal(parseOCRProfile([document(identity+'\nSố thuê bao di động:\nĐịa chỉ thư điện tử:\nĐăng ký tài khoản định danh: 0901234567')]).soDienThoai,'');
  assert.equal(parseOCRProfile([document(identity+'\nSố thuê bao di động: 000000001234')]).soDienThoai,'');
  const conflict=parseOCRProfile([document(identity+'\nSố điện thoại: 0901234567\nSố thuê bao di động: 0912345678')]);
  assert.equal(conflict.soDienThoai,'');assert.match(conflict.cauHoiLamRo!.join(' '),/nhiều số điện thoại/);
});

test('numeric fallbacks require cardholder context and never repair ambiguous digits',()=>{
  const text=identity.replace('Số CCCD: 000000001234','Số CCCD: OO0000001234');
  assert.equal(parseOCRProfile([document(text)]).soCCCD,'');
  const unrelated=identity.replace('Số CCCD: 000000001234','Mã tài liệu: 000000001234');
  assert.equal(parseOCRProfile([document(unrelated)]).soCCCD,'');
  assert.equal(parseOCRProfile([document(identity.replace('NGUYỄN VĂN MẪU','NGUYỄN VĂN A'))]).hoVaTen,'NGUYỄN VĂN A');
  assert.equal(parseOCRProfile([document(identity.replace('NGUYỄN VĂN MẪU','NGUYỄN VĂN MẪU |'))]).hoVaTen,'NGUYỄN VĂN MẪU');
  for(const label of ['Số CMND cũ:','Số CMT:','Số điện thoại:','Mã hồ sơ:']) {
    const unrelatedCard=identity.replace('Số CCCD: 000000001234',`${label}\n000000001234`);
    assert.equal(parseOCRProfile([document(unrelatedCard)]).soCCCD,'',label);
  }
  assert.equal(parseOCRProfile([document(identity.replace('Số CCCD:','Số CMT:'))]).soCCCD,'');
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

test('internal orientation scoring can read reverse-side fields while public extraction stays strict',()=>{
  const back=document('CĂN CƯỚC CÔNG DÂN\nNgày cấp: 01/02/2022\nNơi cấp: Cục Kiểm Thử\nThường trú: Phường Mẫu, Thành phố Kiểm Thử','cccd_sau');
  assert.throws(()=>parseOCRProfile([back]),{status:422});
  const internal=parseOCRProfile([back],{allowIncomplete:true});
  assert.equal(internal.ngayCap,'01/02/2022');assert.equal(internal.noiCap,'Cục Kiểm Thử');
  assert.equal(internal.diaChiThuongTru,'Phường Mẫu, Thành phố Kiểm Thử');
  assert.equal(internal.hoVaTen,'');assert.equal(internal.soCCCD,'');assert.equal(internal.ngaySinh,'');
  assert.throws(()=>parseOCRProfile([document('x'.repeat(100001))],{allowIncomplete:true}),{status:400});
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
