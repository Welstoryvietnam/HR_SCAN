import { createHash } from 'node:crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import sharp from 'sharp';
import { OCRError, type OCRPage } from './ocrService.js';
import type { DocumentExtractionResult, ThanhVienGiaDinh, ThanhVienHoGiaDinh } from '../src/types.js';

interface FastDocumentInput {
  id?: string;
  fileName?: string;
  docType?: string;
  mimeType: string;
  base64Data: string;
}

// Memory cache for fast OCR calls (TTL 10 mins)
const fastCache = new Map<string, { until: number; result: DocumentExtractionResult; pages: OCRPage[] }>();

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const FAST_SYSTEM_INSTRUCTION = `Bạn là chuyên gia số hóa hồ sơ nhân sự (HR Data Extraction Specialist) tốc độ cao. Nhiệm vụ của bạn là bóc tách và chuẩn hóa thông tin nhân viên mới từ ảnh Căn cước công dân (CCCD), Căn cước điện tử (VNeID) và Sơ yếu lý lịch và trả về định dạng JSON thuần.

🏛️ PHẦN 1: QUY TẮC XÁC ĐỊNH CHỦ THỂ (TRÁNH NHẦM LẪN THÂN NHÂN)
1. Chỉ bắt thông tin nhân viên mới từ Căn cước công dân (CCCD 12 số) hoặc Căn cước điện tử (VNeID 12 số) hoặc CV. KHÔNG lấy thông tin cá nhân của nhân viên mới từ Sơ yếu lý lịch (SYLL).
2. Tuyệt đối BỎ QUA các khối văn bản chứa nhãn: Cha, Mẹ, Bố, Vợ, Chồng, Con đẻ, Người giám hộ khi xác định Họ tên, Ngày sinh, Số CCCD của nhân viên mới.
3. Trường thông tin nhân viên:
   - hoVaTen / hoTen: Lấy chữ IN HOA trên mặt trước CCCD ("Họ và tên" / "Full name") hoặc VNeID ("Họ, chữ đệm và tên"). Tên nhân viên thường in cỡ chữ RẤT LỚN và NỔI BẬT. Nếu tên ngắt thành 2 dòng (ví dụ "NGUYỄN VĂN" ở dòng 1 và "AN" ở dòng 2), hãy ghép lại đầy đủ thành "NGUYỄN VĂN AN". KHÔNG ĐƯỢC bỏ qua tên in chữ hoa nổi bật.
   - soCCCD: Chuỗi 12 số CCCD / VNeID liền mạch. Không dùng CMND 9 số làm tiêu chuẩn chính.
   - queQuan: Lấy trên CCCD với tiêu đề "Quê quán".
   - diaChiThuongTru / noiThuongTru: Lấy trên VNeID với tiêu đề bắt đầu là "Nơi thường trú" (hoặc CCCD).
   - diaChiTamTru: Mặc định theo Nơi thường trú nếu không ghi riêng.
   - ngayCap / ngayCapCCCD: Lấy trên VNeID ("Ngày cấp căn cước công dân gần nhất") hoặc CCCD.
   - ngayHetHanCCCD: Lấy trên CCCD ("Có giá trị đến") hoặc mặt sau ("Ngày, tháng, năm hết hạn / Date of expiry").
   - soDienThoai: Lấy trên VNeID ("Số thuê bao di động: Đăng ký tài khoản định danh").

👨‍👩‍👧‍👦 QUY TẮC THÀNH VIÊN GIA ĐÌNH (thanhVienHoGiaDinh / HouseholdMember):
1. Lấy thông tin chủ hộ trên VNeID ("Thông tin cư trú" -> "Thông tin chủ hộ thường trú").
2. Nếu Chủ hộ thường trú chính là Nhân viên mới -> Vẫn lấy thông tin vào thanhVienHoGiaDinh với vai trò Chủ hộ.
3. Nếu Chủ hộ thường trú khác với Nhân viên mới -> Đưa CẢ Nhân viên mới VÀ Chủ hộ thường trú (cùng các thành viên khác nếu có) vào mảng thanhVienHoGiaDinh.

📐 PHẦN 2 & 3: QUY TẮC CHUẨN HÓA DỮ LIỆU ĐẦU RA (SOP & DATA INTEGRITY)
1. Tính trung thực: Không suy diễn, không tự bịa dữ liệu nếu giấy tờ không thể hiện rõ. Nếu mờ/thiếu -> điền null hoặc "", đẩy vào thongTinChuaRo & cauHoiLamRo.
2. Số CCCD: .replace(/\\D/g, ''). Định dạng thẻ mới phải đúng 12 chữ số. Nếu khác 12 số -> đánh dấu CHUA_RO.
3. Ngày tháng: YYYY-MM-DD (hoặc DD/MM/YYYY). Nếu chỉ có năm sinh -> giữ YYYY, không tự đoán ngày/tháng.
4. Đối soát chéo (Cross-check): So sánh đối chiếu chéo CCCD mặt trước, mặt sau, VNeID. Nếu sai lệch họ tên, ngày sinh, số CCCD -> tự động sinh cảnh báo chi tiết vào canh_bao_sai_lech.
5. Sáp nhập địa giới: Ưu tiên địa chỉ cư trú mới nhất trên VNeID sau khi sáp nhập. Ghi chú đơn vị hành chính mới vào ghiChuSapNhap.

Trả về đúng JSON thuần với cấu trúc các trường sau:
{
  "hoTen": "NGUYỄN VĂN AN",
  "hoVaTen": "NGUYỄN VĂN AN",
  "soCCCD": "038096011223",
  "loaiGiayTo": "CCCD_12",
  "ngaySinh": "YYYY-MM-DD hoặc YYYY",
  "gioiTinh": "Nam hoặc Nữ hoặc Khác",
  "queQuan": "Xã Hoằng Lộc, Huyện Hoằng Hóa, Tỉnh Thanh Hóa",
  "noiThuongTru": "Phường Đông Hương, TP. Thanh Hóa, Tỉnh Thanh Hóa",
  "diaChiThuongTru": "Phường Đông Hương, TP. Thanh Hóa, Tỉnh Thanh Hóa",
  "diaChiTamTru": "Phường Đông Hương, TP. Thanh Hóa, Tỉnh Thanh Hóa",
  "ngayCapCCCD": "YYYY-MM-DD",
  "ngayCap": "YYYY-MM-DD",
  "noiCapCCCD": "Cục Cảnh sát QLHC về TTXH",
  "noiCap": "Cục Cảnh sát QLHC về TTXH",
  "ngayHetHanCCCD": "YYYY-MM-DD hoặc Không thời hạn",
  "soDienThoai": "0912345678",
  "emailCaNhan": "",
  "danToc": "Kinh",
  "tonGiao": "Không",
  "tinhTrangHonNhan": "Độc thân",
  "hoTenChuHo": "NGUYỄN VĂN BÌNH",
  "quanHeChuHo": "Con đẻ",
  "ghiChuSapNhap": "Cập nhật theo VNeID: Phường Đông Hương, TP. Thanh Hóa",
  "canh_bao_sai_lech": "",
  "thongTinChuaRo": [],
  "cauHoiLamRo": [],
  "thongTinGiaDinh": [
    { "quanHe": "Bố đẻ", "hoTen": "NGUYỄN VĂN BÌNH", "namSinh": "1968", "ngheNghiep": "Nông dân" }
  ],
  "thanhVienHoGiaDinh": [
    { "hoTen": "NGUYỄN VĂN BÌNH", "quanHeVoiChuHo": "Bố đẻ", "ngaySinh": "1968", "gioiTinh": "Nam", "diaChiThuongTru": "...", "quocTich": "Việt Nam", "danToc": "Kinh" },
    { "hoTen": "NGUYỄN VĂN AN", "quanHeVoiChuHo": "Con đẻ", "ngaySinh": "1996-09-24", "gioiTinh": "Nam", "diaChiThuongTru": "...", "quocTich": "Việt Nam", "danToc": "Kinh" }
  ],
  "doTinCayOCR": 98,
  "text": "Nguyên văn tóm tắt toàn bộ nội dung đọc được trên tài liệu"
}`;

// Normalize date string into YYYY-MM-DD or YYYY if valid
export function normalizeDateToISO(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Only year YYYY
  if (/^\d{4}$/.test(clean)) return clean;
  return clean;
}

// Convert YYYY-MM-DD to DD/MM/YYYY for user displays that expect Vietnamese format
export function formatISOToDisplayDate(val: string): string {
  if (!val) return '';
  const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return val;
}

export async function extractEmployeeWithGeminiVision(
  documents: FastDocumentInput[],
  label?: string
): Promise<{ result: DocumentExtractionResult; pages: Record<string, OCRPage> }> {
  const ai = getGenAIClient();
  if (!ai) {
    throw new OCRError('Khóa GEMINI_API_KEY chưa được cấu hình trên máy chủ.', 503);
  }

  if (!documents.length) {
    throw new OCRError('Không có tài liệu nào để xử lý.', 400);
  }

  // Calculate hash for caching
  const hash = createHash('sha256');
  for (const doc of documents) {
    hash.update(doc.mimeType || '').update('\0').update(doc.base64Data || '').update('\0');
  }
  const cacheKey = hash.digest('hex');

  const cached = fastCache.get(cacheKey);
  if (cached && cached.until > Date.now()) {
    return {
      result: cached.result,
      pages: Object.fromEntries(cached.pages.map((p, idx) => [documents[idx]?.id || `doc_${idx}`, p])),
    };
  }

  // Build multimodal parts: optimize images with sharp (2800px limit, EXIF auto-rotate, quality 88)
  const parts: any[] = [];
  for (const doc of documents) {
    let base64ToSend = doc.base64Data;
    let mimeToSend = doc.mimeType || 'image/jpeg';

    if (doc.base64Data && !doc.mimeType?.includes('pdf')) {
      try {
        const buffer = Buffer.from(doc.base64Data, 'base64');
        const resized = await sharp(buffer)
          .rotate() // Auto-rotate reading EXIF orientation tags from phone cameras
          .resize({ width: 2800, height: 2800, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
        base64ToSend = resized.toString('base64');
        mimeToSend = 'image/jpeg';
      } catch {
        base64ToSend = doc.base64Data;
      }
    }

    parts.push({
      inlineData: {
        mimeType: mimeToSend,
        data: base64ToSend,
      },
    });
  }

  parts.push({
    text: `Vui lòng bóc tách toàn bộ thông tin nhân sự từ các ảnh tài liệu đính kèm (CCCD 12 số, Căn cước điện tử VNeID, Sơ yếu lý lịch). ${
      label ? `Họ tên gợi ý ban đầu: "${label}". ` : ''
    }Thực hiện kiểm tra chéo (Cross-check) thông tin giữa CCCD và Sơ yếu lý lịch và cảnh báo nếu có mâu thuẫn vào "canh_bao_sai_lech". Chỉ bắt thông tin nhân viên từ CCCD/VNeID/CV, BỎ QUA tên thân nhân (Bố/Mẹ/Vợ/Chồng). Bắt thông tin chủ hộ thường trú trên VNeID và thêm vào thanhVienHoGiaDinh.`,
  });

  // Call gemini-4-hydrogen with ThinkingLevel.LOW for fast, accurate multimodal extraction
  let response: any;
  const geminiModel = process.env.GEMINI_OCR_MODEL || 'gemini-4-hydrogen';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: geminiModel,
        contents: {
          parts,
        },
        config: {
          systemInstruction: FAST_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      });
      break;
    } catch (err: any) {
      if (attempt === 0 && (err?.status === 503 || err?.status === 429 || String(err?.message).includes('high demand'))) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      throw err;
    }
  }

  let rawText = response?.text?.trim() || '{}';
  if (rawText.startsWith('```json')) {
    rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  } else if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new OCRError('Gemini Vision không trả về định dạng JSON hợp lệ.', 500);
  }

  // Format and normalize extracted fields
  const rawName = (parsed.hoVaTen || parsed.hoTen || label || '').toString();
  const hoVaTen = rawName
    .normalize('NFC')
    .replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '')
    .replace(/\s*[:;/\\|¦_+=*~`"'()\[\]{}]+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
  const soCCCD = (parsed.soCCCD || '').toString().replace(/\D/g, '');
  const ngaySinh = normalizeDateToISO(parsed.ngaySinh || '');
  const ngayCap = normalizeDateToISO(parsed.ngayCap || parsed.ngayCapCCCD || '');
  const ngayHetHanCCCD = parsed.ngayHetHanCCCD === 'Không thời hạn'
    ? 'Không thời hạn'
    : normalizeDateToISO(parsed.ngayHetHanCCCD || '');

  const noiThuongTru = (parsed.noiThuongTru || parsed.diaChiThuongTru || '').toString().trim();
  const diaChiThuongTru = noiThuongTru;
  const diaChiTamTru = (parsed.diaChiTamTru || noiThuongTru).toString().trim();

  const cauHoiLamRo: string[] = Array.isArray(parsed.cauHoiLamRo) ? [...parsed.cauHoiLamRo] : [];
  const thongTinChuaRo: string[] = Array.isArray(parsed.thongTinChuaRo) ? [...parsed.thongTinChuaRo] : [];

  if (soCCCD.length !== 12) {
    thongTinChuaRo.push('Số CCCD (cần đúng 12 chữ số)');
    cauHoiLamRo.push('Số CCCD chưa đọc đủ 12 chữ số theo tiêu chuẩn thẻ mới. Vui lòng đối chiếu lại.');
  }

  if (parsed.canh_bao_sai_lech) {
    cauHoiLamRo.unshift(`⚠️ Cảnh báo đối soát chéo: ${parsed.canh_bao_sai_lech}`);
  }

  const result: DocumentExtractionResult = {
    extractionMethod: 'vision',
    aiVisionExtracted: true,
    hoVaTen,
    hoTen: hoVaTen,
    ngaySinh,
    gioiTinh: parsed.gioiTinh === 'Nữ' ? 'Nữ' : parsed.gioiTinh === 'Khác' ? 'Khác' : 'Nam',
    soCCCD,
    loaiGiayTo: parsed.loaiGiayTo || (soCCCD.length === 12 ? 'CCCD_12' : 'CHUA_RO'),
    ngayCap,
    ngayCapCCCD: ngayCap,
    ngayHetHanCCCD,
    noiCap: (parsed.noiCap || parsed.noiCapCCCD || '').toString().trim(),
    noiCapCCCD: (parsed.noiCapCCCD || parsed.noiCap || '').toString().trim(),
    queQuan: (parsed.queQuan || '').toString().trim(),
    diaChiThuongTru,
    noiThuongTru,
    diaChiTamTru,
    nguonDiaChi: 'VNeID',
    soDienThoai: (parsed.soDienThoai || '').toString().trim(),
    emailCaNhan: (parsed.emailCaNhan || '').toString().trim(),
    danToc: (parsed.danToc || '').toString().trim(),
    tonGiao: (parsed.tonGiao || '').toString().trim(),
    tinhTrangHonNhan: (parsed.tinhTrangHonNhan || '').toString().trim(),
    hoTenChuHo: (parsed.hoTenChuHo || '').toString().trim(),
    quanHeChuHo: (parsed.quanHeChuHo || '').toString().trim(),
    ghiChuSapNhap: (parsed.ghiChuSapNhap || '').toString().trim(),
    congViecDuKien: '',
    chucVu: '',
    thongTinGiaDinh: Array.isArray(parsed.thongTinGiaDinh) ? parsed.thongTinGiaDinh : [],
    thanhVienHoGiaDinh: Array.isArray(parsed.thanhVienHoGiaDinh) ? parsed.thanhVienHoGiaDinh : [],
    thongTinChuaRo,
    cauHoiLamRo,
    canh_bao_sai_lech: parsed.canh_bao_sai_lech || '',
    mucDoTinCay: soCCCD.length === 12 && !parsed.canh_bao_sai_lech ? 'CAO' : 'CAN_XAC_NHAN',
    doTinCayOCR: typeof parsed.doTinCayOCR === 'number' ? parsed.doTinCayOCR : 98,
    rawJson: rawText,
    ghiChu: parsed.text ? `[AI Siêu Tốc] ${parsed.text.slice(0, 300)}...` : '',
  };

  // Build OCRPages so client has page-level text representation
  const pages: Record<string, OCRPage> = {};
  const pageList: OCRPage[] = [];
  documents.forEach((doc, idx) => {
    const page: OCRPage = {
      page: 1,
      text: parsed.text || `Họ và tên: ${hoVaTen}\nSố CCCD: ${soCCCD}\nNgày sinh: ${ngaySinh}`,
      confidence: 98,
      lines: [],
      engine: 'gemini',
      assistance: { status: 'used' },
    };
    pageList.push(page);
    pages[doc.id || `doc_${idx}`] = page;
  });

  // Save in cache for 10 minutes
  fastCache.set(cacheKey, {
    until: Date.now() + 600_000,
    result,
    pages: pageList,
  });

  return { result, pages };
}
