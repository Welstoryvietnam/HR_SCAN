import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {scoreOCRPage,recognizeImage} from '../backend/ocrService.js';
import {parseOCRProfile} from '../backend/ocrProfile.js';
const require=createRequire(import.meta.url);
const {candidateQuality,shouldRetryOrientations,chooseCandidate}=require('../backend/ocrWorker.cjs');
const page=(text:string,confidence=85,rotation:0|90|180|270=0)=>({page:1,text,confidence,lines:[],rotation});
const readable=page(`CĂN CƯỚC CÔNG DÂN\nSố: 000000001234\nHọ và tên: NGUYỄN VĂN MẪU\nNgày sinh: 15/06/1995\nGiới tính: Nam\nQuốc tịch: Việt Nam`,85,90);

test('orientation scoring prefers identity evidence over confidently read noise',()=>{
  const noise=page('WWW III AN AN 17/79/9999',99);
  assert.ok(candidateQuality(readable).score>candidateQuality(noise).score);
  assert.equal(chooseCandidate(noise,readable),readable);
  assert.equal(chooseCandidate(readable,noise),readable);
});

test('damaged bilingual name labels still count as orientation evidence',()=>{
  const damaged=page(readable.text.replace('Họ và tên','Họ,chữ đệm và lên /Flname'));
  assert.equal(candidateQuality(damaged).complete,true);
  assert.equal(shouldRetryOrientations(damaged),false);
});

test('birth labels without readable birth values do not borrow unrelated dates',()=>{
  const damaged=page('000000001234\nNgày, tháng, năm sinh:\n???\nQuốc tịch: Việt Nam\nNgày cấp: 01/02/2022\nCập nhật: 17/07/2026',95);
  assert.equal(candidateQuality(damaged).complete,false);
  assert.ok(candidateQuality(readable).score>candidateQuality(damaged).score);
});

test('upright identity skips rotations even when recognition confidence is low',()=>{
  assert.equal(shouldRetryOrientations(readable),false);
  assert.equal(shouldRetryOrientations({...readable,confidence:56}),false);
  assert.equal(shouldRetryOrientations(page('CĂN CƯỚC\nWWW III',95)),true);
  assert.equal(shouldRetryOrientations(page('Ngày sinh: 31/02/1995\nHọ và tên: NGUYỄN VĂN MẪU\n000000001234',95)),false);
});

test('missing birth or expiry fields never force an otherwise upright card to rotate',()=>{
  const incomplete=page('CĂN CƯỚC CÔNG DÂN\nSố CCCD: 000000001234\nHọ và tên: NGUYỄN VĂN MẪU\nNgày sinh: ???\nGiới tính: Nữ\nQuốc tịch: Việt Nam\nCó giá trị đến: ???',84);
  assert.equal(candidateQuality(incomplete).complete,false);
  assert.equal(shouldRetryOrientations(incomplete),false);
  const damagedName=page('CĂN CƯỚC CÔNG DÂN\n000000001234\nHạ, chữ đệm và Wn /Full name:\nNGUYỄN VĂN MẪU\nQuốc tịch: Việt Nam\nNơi thường trú: Địa chỉ mẫu',85);
  assert.equal(shouldRetryOrientations(damagedName),false);
});

test('selection keeps exactly one orientation and never joins competing identities',()=>{
  const alternate=page('000000009999\nTRẦN THỊ MẪU',92,270);
  const selected=chooseCandidate(readable,alternate);
  assert.equal(selected,readable);
  assert.equal(selected.rotation,90);
  assert.ok(!selected.text.includes('000000009999'));
  assert.equal(chooseCandidate(readable,page('',100,180)),readable);
});

test('well-read long non-identity letters avoid unnecessary orientation passes',()=>{
  assert.equal(shouldRetryOrientations(page('Đây là văn bản thử nghiệm rõ nét. '.repeat(40),90)),false);
  assert.equal(shouldRetryOrientations(page('Đây là văn bản ngắn',95)),true);
});

test('well-read identity back pages skip rotations although no front fields appear',()=>{
  const back=page('Căn cước công dân\nQuê quán: Phường Mẫu, Tỉnh Kiểm Thử\nNơi thường trú: Địa chỉ mẫu, Thành phố Mẫu\nNgày cấp: 01/02/2022\n'+ 'Nội dung tài liệu rõ nét. '.repeat(12),88);
  assert.equal(shouldRetryOrientations(back),false);
  assert.equal(shouldRetryOrientations({...back,confidence:49}),false);
  assert.equal(shouldRetryOrientations(page('WWW III AN AN',49)),true);
});

test('actual parser field score beats convincing labels with unreadable values',()=>{
  const noise=page('Căn cước công dân\nHạ,chữ đệm và Ma Ful name\n???\nNgày, tháng, năm sinh:\n???\nQuốc tịch: Việt Nam\nNgày cấp: 01/02/2022',95);
  assert.ok(scoreOCRPage(readable)>scoreOCRPage(noise));
  const damaged=page(readable.text.replace('Họ và tên','Họ,chữ đệm và lên /Flname').replace('NGUYỄN VĂN MẪU','NGUYỄN VĂN MẪU.'),84);
  assert.ok(scoreOCRPage(damaged)>100);
});

test('back-only fields contribute to candidate scoring without any front fields',()=>{
  const back=page('Căn cước công dân\nQuê quán: Phường Mẫu, Tỉnh Kiểm Thử\nNơi thường trú: Địa chỉ mẫu, Thành phố Mẫu\nNgày cấp: 01/02/2022\nDân tộc: Kinh',65);
  const confidentNoise=page('WWW III AN AN',99);
  assert.ok(scoreOCRPage(back)>=20);
  assert.ok(scoreOCRPage(back)>scoreOCRPage(confidentNoise));
});

test('real upright incomplete card keeps its original direction',async()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="650"><rect width="100%" height="100%" fill="white"/><g fill="black" font-family="Arial" font-size="52"><text x="70" y="100">CAN CUOC CONG DAN</text><text x="70" y="220">So CCCD: 000000001234</text><text x="70" y="340">Ho va ten: NGUYEN VAN MAU</text><text x="70" y="460">Gioi tinh: Nam</text><text x="70" y="580">Quoc tich: Viet Nam</text></g></svg>';
  const image=await sharp(Buffer.from(svg)).png().toBuffer();
  const result=await recognizeImage({mimeType:'image/png',base64Data:image.toString('base64')});
  assert.equal(result.rotation,0);
  assert.ok((result.processing?.passes || 0)<=3,'upright card only needs unchanged-image recognition passes');
  const fields=parseOCRProfile([{id:'upright',pages:[result]}]);
  assert.equal(fields.soCCCD,'000000001234');assert.equal(fields.ngaySinh,'');
});

test('real sideways card remains readable without forcing an unnecessary quarter-turn',async()=>{
  const source=await readFile(new URL('./fixtures/ocr-identity.png',import.meta.url));
  const image=await sharp(source).rotate(90).png().toBuffer();
  const result=await recognizeImage({mimeType:'image/png',base64Data:image.toString('base64')});
  // Tesseract can already read this clean sideways fixture through its layout
  // analysis. Either no transform or the correcting quarter-turn is valid;
  // readable fields, rather than an imposed angle, are the required outcome.
  assert.ok([0,270].includes(result.rotation!));
  const fields=parseOCRProfile([{id:'sideways',pages:[result]}]);
  assert.equal(fields.soCCCD,'000000001234');assert.equal(fields.ngaySinh,'15/06/1995');
});
