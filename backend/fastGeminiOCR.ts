import { createHash } from 'node:crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import sharp from 'sharp';
import { OCRError, type OCRPage } from './ocrService.js';
import type { DocumentExtractionResult, ThanhVienGiaDinh, ThanhVienHoGiaDinh } from '../src/types.js';
import { applyVneidHouseholdRule } from '../src/utils/household.js';

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

const FAST_SYSTEM_INSTRUCTION = `Bạn là chuyên gia số hóa hồ sơ nhân sự (HR Data Extraction Specialist) tốc độ cao. Nhiệm vụ của bạn là bóc tách và chuẩn hóa thông tin nhân viên mới từ ảnh Căn cước công dân (CCCD), Căn cước điện tử (VNeID), CV xin việc, Xác nhận cư trú và Sơ yếu lý lịch và trả về định dạng JSON thuần.

🏛️ PHẦN 1: QUY TẮC XÁC ĐỊNH CHỦ THỂ (TRÁNH NHẦM LẪN THÂN NHÂN)
1. Lấy thông tin nhân thân từ Căn cước công dân (CCCD 12 số) hoặc Căn cước điện tử (VNeID 12 số) hoặc Xác nhận cư trú; lấy thêm SĐT, Email và thông tin Học vấn (Trình độ, Trường, Ngành học, Năm học/Tốt nghiệp) từ CV. KHÔNG lấy thông tin cá nhân của nhân viên mới từ mục quan hệ gia đình trong Sơ yếu lý lịch (SYLL).
2. Tuyệt đối BỎ QUA các khối văn bản chứa nhãn: Cha, Mẹ, Bố, Vợ, Chồng, Con đẻ, Người giám hộ khi xác định Họ tên, Ngày sinh, Số CCCD của nhân viên mới.
3. Trường thông tin nhân viên:
   - hoVaTen / hoTen: Lấy chữ IN HOA trên mặt trước CCCD ("Họ và tên" / "Full name") hoặc VNeID ("Họ, chữ đệm và tên"). Tên nhân viên thường in cỡ chữ RẤT LỚN và NỔI BẬT. Nếu tên ngắt thành 2 dòng (ví dụ "NGUYỄN VĂN" ở dòng 1 và "AN" ở dòng 2), hãy ghép lại đầy đủ thành "NGUYỄN VĂN AN". KHÔNG ĐƯỢC bỏ qua tên in chữ hoa nổi bật.
   - soCCCD: Chuỗi 12 số CCCD / VNeID liền mạch. Không dùng CMND 9 số làm tiêu chuẩn chính.
   - queQuan: Lấy trên CCCD với tiêu đề "Quê quán".
   - diaChiThuongTru / noiThuongTru: Lấy trên VNeID với tiêu đề bắt đầu là "Nơi thường trú" (hoặc Xác nhận cư trú / CCCD).
   - diaChiTamTru: Mặc định theo Nơi thường trú nếu không ghi riêng.
   - ngayCap / ngayCapCCCD: Lấy trên VNeID ("Ngày cấp căn cước công dân gần nhất") hoặc CCCD.
   - ngayHetHanCCCD: Lấy trên CCCD ("Có giá trị đến") hoặc mặt sau ("Ngày, tháng, năm hết hạn / Date of expiry").
   - soDienThoai: Lấy trên VNeID ("Số thuê bao di động: Đăng ký tài khoản định danh") hoặc CV.
   - emailCaNhan: Lấy từ CV hoặc VNeID nếu có.
   - hocVan, tenTruong, nganhHoc, namHoc: Bóc tách từ CV nếu có thông tin trình độ học vấn (VD: "Đại học", "Cao đẳng", "Trung cấp", "THPT"), tên trường đào tạo, chuyên ngành, niên khóa / năm tốt nghiệp. Nếu không có trong tài liệu -> để "".

👨‍👩‍👧‍👦 QUY TẮC THÀNH VIÊN HỘ GIA ĐÌNH (thanhVienHoGiaDinh / HouseholdMember):
1. Đọc thông tin chủ hộ trên VNeID theo đúng phân mục "Thông tin cư trú" -> trường thông tin con "Thông tin chủ hộ thường trú" (gồm Họ và tên chủ hộ, Ngày sinh, Giới tính, Dân tộc, Quốc tịch, Nơi thường trú nếu hiển thị) và "Mối quan hệ với chủ hộ" của nhân viên mới (hoặc Giấy xác nhận thông tin về cư trú). Đưa tên chủ hộ vào "hoTenChuHo", mối quan hệ của nhân viên mới với chủ hộ vào "quanHeChuHo", và các thông tin chi tiết của chủ hộ (nếu thấy rõ trên ảnh) vào "chuHoInfo".
2. Trường hợp 1 — Chủ hộ thường trú CŨNG CHÍNH LÀ nhân viên mới (đương sự): Vẫn PHẢI lấy thông tin nhân viên mới vào mảng thanhVienHoGiaDinh với tư cách Chủ hộ (quanHeVoiChuHo = "Chủ hộ").
3. Trường hợp 2 — Chủ hộ thường trú KHÁC với nhân viên mới (đương sự): PHẢI lấy vào mảng thanhVienHoGiaDinh BAO GỒM CẢ:
   - Thông tin "Thông tin chủ hộ thường trú" (với quanHeVoiChuHo = "Chủ hộ"), VÀ
   - Thông tin của chính nhân viên mới / đương sự (với quanHeVoiChuHo đúng theo "Mối quan hệ với chủ hộ" trên VNeID, VD: "Con đẻ", "Vợ", "Chồng"...),
   - Kèm các thành viên khác trong hộ nếu VNeID có hiển thị.

📐 PHẦN 2 & 3: QUY TẮC CHUẨN HÓA DỮ LIỆU ĐẦU RA (SOP & DATA INTEGRITY - CHỐNG SUY ĐOÁN)
1. Tính trung thực tuyệt đối: Không suy diễn, không tự bịa dữ liệu nếu giấy tờ không thể hiện rõ. Nếu mờ/thiếu -> điền "", đẩy tên trường vào thongTinChuaRo & sinh câu hỏi vào cauHoiLamRo.
2. Số CCCD: .replace(/\\D/g, ''). Định dạng thẻ mới phải đúng 12 chữ số. Nếu khác 12 số -> đánh dấu CHUA_RO.
3. Ngày tháng: YYYY-MM-DD (hoặc YYYY). Nếu chỉ có năm sinh -> giữ YYYY, không tự đoán ngày/tháng.
4. Đối soát chéo (Cross-check): So sánh đối chiếu chéo CCCD mặt trước, mặt sau, VNeID, CV, Xác nhận cư trú. Nếu sai lệch họ tên, ngày sinh, số CCCD -> tự động sinh cảnh báo chi tiết vào canh_bao_sai_lech.
5. Sáp nhập địa giới: Ưu tiên địa chỉ cư trú mới nhất trên VNeID/Xác nhận cư trú sau khi sáp nhập. Ghi chú đơn vị hành chính mới vào ghiChuSapNhap.

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
  "hocVan": "Đại học",
  "tenTruong": "Đại học Bách Khoa Hà Nội",
  "nganhHoc": "Công nghệ thực phẩm",
  "namHoc": "2018 - 2022",
  "danToc": "Kinh",
  "tonGiao": "Không",
  "tinhTrangHonNhan": "Độc thân",
  "hoTenChuHo": "NGUYỄN VĂN BÌNH",
  "quanHeChuHo": "Con đẻ",
  "chuHoInfo": {
    "hoTen": "NGUYỄN VĂN BÌNH",
    "ngaySinh": "YYYY-MM-DD hoặc DD/MM/YYYY nếu có trên ảnh, không có thì để rỗng",
    "gioiTinh": "Nam hoặc Nữ hoặc rỗng",
    "diaChiThuongTru": "Nơi thường trú nếu có",
    "quocTich": "Việt Nam",
    "danToc": ""
  },
  "ghiChuSapNhap": "Cập nhật theo VNeID: Phường Đông Hương, TP. Thanh Hóa",
  "canh_bao_sai_lech": "",
  "thongTinChuaRo": [],
  "cauHoiLamRo": [],
  "thongTinGiaDinh": [
    { "quanHe": "Bố đẻ", "hoTen": "NGUYỄN VĂN BÌNH", "namSinh": "1968", "ngheNghiep": "Nông dân" }
  ],
  "thanhVienHoGiaDinh": [
    { "hoTen": "NGUYỄN VĂN BÌNH", "quanHeVoiChuHo": "Chủ hộ", "ngaySinh": "1968", "gioiTinh": "Nam", "diaChiThuongTru": "...", "quocTich": "Việt Nam", "danToc": "Kinh" },
    { "hoTen": "NGUYỄN VĂN AN", "quanHeVoiChuHo": "Con đẻ", "ngaySinh": "24/09/1996", "gioiTinh": "Nam", "diaChiThuongTru": "...", "quocTich": "Việt Nam", "danToc": "Kinh" }
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

  const docLabelsList = documents
    .map((doc, i) => `Tài liệu #${i + 1}: ${doc.docType || 'khac'} (${doc.fileName || 'unknown'})`)
    .join('; ');

  parts.push({
    text: `Vui lòng bóc tách toàn bộ thông tin nhân sự từ các tài liệu đính kèm (${docLabelsList}). ${
      label ? `Họ tên gợi ý ban đầu: "${label}". ` : ''
    }Thực hiện kiểm tra chéo (Cross-check) thông tin giữa CCCD, VNeID, Xác nhận cư trú và CV; cảnh báo nếu có mâu thuẫn vào "canh_bao_sai_lech". Không tự suy đoán thông tin mờ/thiếu: đưa vào "thongTinChuaRo" và "cauHoiLamRo". Lấy học vấn (hocVan, tenTruong, nganhHoc, namHoc), emailCaNhan, SĐT từ CV nếu có. Với VNeID, đọc mục "Thông tin cư trú" -> "Thông tin chủ hộ thường trú" vào hoTenChuHo, quanHeChuHo, chuHoInfo và lập thanhVienHoGiaDinh đúng quy tắc: nếu chủ hộ là đương sự thì giữ đương sự làm Chủ hộ; nếu khác thì bao gồm cả chủ hộ thường trú và đương sự.`,
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

  const gioiTinhNormalized = parsed.gioiTinh === 'Nữ' ? 'Nữ' : parsed.gioiTinh === 'Khác' ? 'Khác' : 'Nam';
  const danTocClean = (parsed.danToc || '').toString().trim();
  const hoTenChuHoClean = (parsed.hoTenChuHo || parsed.chuHoInfo?.hoTen || '').toString().trim().toUpperCase();
  const quanHeChuHoClean = (parsed.quanHeChuHo || '').toString().trim();
  const chuHoInfoClean =
    parsed.chuHoInfo && typeof parsed.chuHoInfo === 'object'
      ? {
          hoTen: (parsed.chuHoInfo.hoTen || hoTenChuHoClean).toString().trim().toUpperCase(),
          ngaySinh: normalizeDateToISO((parsed.chuHoInfo.ngaySinh || '').toString()),
          gioiTinh: (parsed.chuHoInfo.gioiTinh || '').toString().trim(),
          diaChiThuongTru: (parsed.chuHoInfo.diaChiThuongTru || '').toString().trim(),
          quocTich: (parsed.chuHoInfo.quocTich || '').toString().trim(),
          danToc: (parsed.chuHoInfo.danToc || '').toString().trim(),
        }
      : undefined;

  const hasVneidContext =
    documents.some((doc) => doc.docType === 'vneid_cu_tru' || doc.docType === 'xac_nhan_cu_tru') ||
    Boolean(hoTenChuHoClean || quanHeChuHoClean || (Array.isArray(parsed.thanhVienHoGiaDinh) && parsed.thanhVienHoGiaDinh.length > 0));

  const thanhVienHoGiaDinh = applyVneidHouseholdRule({
    members: parsed.thanhVienHoGiaDinh,
    employee: {
      hoVaTen,
      ngaySinh,
      gioiTinh: gioiTinhNormalized,
      diaChiThuongTru,
      danToc: danTocClean,
      quocTich: 'Việt Nam',
    },
    hoTenChuHo: hoTenChuHoClean,
    quanHeChuHo: quanHeChuHoClean,
    chuHoInfo: chuHoInfoClean,
    hasVneidContext,
  });

  const result: DocumentExtractionResult = {
    extractionMethod: 'vision',
    aiVisionExtracted: true,
    hoVaTen,
    hoTen: hoVaTen,
    ngaySinh,
    gioiTinh: gioiTinhNormalized,
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
    hocVan: (parsed.hocVan || '').toString().trim(),
    tenTruong: (parsed.tenTruong || '').toString().trim(),
    nganhHoc: (parsed.nganhHoc || '').toString().trim(),
    namHoc: (parsed.namHoc || '').toString().trim(),
    danToc: danTocClean,
    tonGiao: (parsed.tonGiao || '').toString().trim(),
    tinhTrangHonNhan: (parsed.tinhTrangHonNhan || '').toString().trim(),
    hoTenChuHo: hoTenChuHoClean,
    quanHeChuHo: quanHeChuHoClean,
    chuHoInfo: chuHoInfoClean,
    ghiChuSapNhap: (parsed.ghiChuSapNhap || '').toString().trim(),
    congViecDuKien: '',
    chucVu: '',
    thongTinGiaDinh: Array.isArray(parsed.thongTinGiaDinh) ? parsed.thongTinGiaDinh : [],
    thanhVienHoGiaDinh,
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
