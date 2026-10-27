import { createHash } from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
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

const FAST_SYSTEM_INSTRUCTION = `Bạn là chuyên gia số hóa hồ sơ nhân sự (HR Data Extraction Specialist). Nhiệm vụ của bạn là bóc tách thông tin từ ảnh chụp/bản scan Căn cước công dân (CCCD) và Sơ yếu lý lịch (bao gồm cả chữ viết tay và chữ in).

Quy tắc xử lý bắt buộc:
1. Tính trung thực và nguyên bản: Tuyệt đối không tự suy đoán hay bịa thông tin. Nếu chữ viết tay quá mờ, bị gạch xóa hoặc rách không đọc được, hãy điền giá trị null hoặc chuỗi rỗng "".
2. Chuẩn hóa ngày tháng: Mọi trường ngày tháng phải chuyển về định dạng chuẩn YYYY-MM-DD. Nếu chỉ có năm, ghi rõ YYYY.
3. Chuẩn hóa CCCD: Số CCCD phải là chuỗi số liền mạch (12 số với thẻ căn cước mới, 9 số với CMND cũ), loại bỏ khoảng trắng hoặc ký tự đặc biệt.
4. Đối soát chéo (Cross-check): So sánh thông tin giữa CCCD và Sơ yếu lý lịch. Nếu phát hiện sai lệch về họ tên, ngày sinh hoặc số định danh giữa 2 nguồn tài liệu, phải ghi rõ cảnh báo vào trường "canh_bao_sai_lech".
5. Trả về đúng cấu trúc JSON được chỉ định, không thêm bất kỳ văn bản giải thích nào ngoài JSON.`;

const FAST_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hoVaTen: { type: Type.STRING, description: 'Họ và tên viết hoa có dấu của nhân viên' },
    ngaySinh: { type: Type.STRING, description: 'Ngày sinh định dạng YYYY-MM-DD hoặc YYYY' },
    gioiTinh: { type: Type.STRING, description: 'Nam hoặc Nữ hoặc Khác' },
    soCCCD: { type: Type.STRING, description: 'Số CCCD liền mạch 12 số hoặc 9 số CMND cũ' },
    ngayCap: { type: Type.STRING, description: 'Ngày cấp CCCD YYYY-MM-DD' },
    ngayHetHanCCCD: { type: Type.STRING, description: 'Ngày hết hạn CCCD YYYY-MM-DD hoặc Không thời hạn' },
    noiCap: { type: Type.STRING, description: 'Nơi cấp CCCD' },
    queQuan: { type: Type.STRING, description: 'Quê quán' },
    diaChiThuongTru: { type: Type.STRING, description: 'Địa chỉ thường trú' },
    diaChiTamTru: { type: Type.STRING, description: 'Địa chỉ tạm trú nếu có trong hồ sơ' },
    soDienThoai: { type: Type.STRING, description: 'Số điện thoại di động liên hệ của nhân viên' },
    emailCaNhan: { type: Type.STRING, description: 'Email cá nhân của nhân viên' },
    danToc: { type: Type.STRING, description: 'Dân tộc (ví dụ Kinh, Tày, Nùng...)' },
    tonGiao: { type: Type.STRING, description: 'Tôn giáo' },
    tinhTrangHonNhan: { type: Type.STRING, description: 'Tình trạng hôn nhân (Độc thân, Đã kết hôn...)' },
    nguyenQuan: { type: Type.STRING, description: 'Nguyên quán' },
    noiSinh: { type: Type.STRING, description: 'Nơi sinh' },
    hocVan: { type: Type.STRING, description: 'Trình độ học vấn' },
    canh_bao_sai_lech: { type: Type.STRING, description: 'Cảnh báo đối soát chéo nếu có sai lệch về họ tên, ngày sinh, CCCD giữa các tài liệu' },
    thongTinChuaRo: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Danh sách các trường bị mờ, rách hoặc không đọc được trên tài liệu',
    },
    cauHoiLamRo: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Lưu ý hoặc câu hỏi cần người dùng kiểm tra lại',
    },
    thongTinGiaDinh: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quanHe: { type: Type.STRING },
          hoTen: { type: Type.STRING },
          namSinh: { type: Type.STRING },
          ngheNghiep: { type: Type.STRING },
        },
      },
      description: 'Thông tin gia đình (Bố, Mẹ, Vợ/Chồng, Con...) trong Sơ yếu lý lịch',
    },
    thanhVienHoGiaDinh: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hoTen: { type: Type.STRING },
          ngaySinh: { type: Type.STRING },
          quanHeVoiChuHo: { type: Type.STRING },
          gioiTinh: { type: Type.STRING },
          diaChiThuongTru: { type: Type.STRING },
          quocTich: { type: Type.STRING },
          danToc: { type: Type.STRING },
        },
      },
      description: 'Thành viên hộ gia đình nếu có văn bản VNeID cư trú',
    },
    text: { type: Type.STRING, description: 'Nguyên văn tóm tắt toàn bộ nội dung đọc được' },
  },
  required: [
    'hoVaTen',
    'ngaySinh',
    'gioiTinh',
    'soCCCD',
    'ngayCap',
    'ngayHetHanCCCD',
    'noiCap',
    'queQuan',
    'diaChiThuongTru',
    'soDienThoai',
    'text',
  ],
};

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

  // Build multimodal parts: one inlineData part per image + instruction text
  const parts: any[] = [];
  for (const doc of documents) {
    parts.push({
      inlineData: {
        mimeType: doc.mimeType || 'image/jpeg',
        data: doc.base64Data,
      },
    });
  }

  parts.push({
    text: `Vui lòng bóc tách toàn bộ thông tin nhân sự từ các ảnh tài liệu đính kèm (CCCD, Sơ yếu lý lịch, v.v.). ${
      label ? `Họ tên gợi ý ban đầu: "${label}". ` : ''
    }Thực hiện kiểm tra chéo (Cross-check) thông tin giữa CCCD và Sơ yếu lý lịch và cảnh báo nếu có mâu thuẫn. Chuẩn hóa ngày tháng theo YYYY-MM-DD và CCCD theo chuỗi số liền mạch.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: {
      parts,
    },
    config: {
      systemInstruction: FAST_SYSTEM_INSTRUCTION,
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: FAST_RESPONSE_SCHEMA,
    },
  });

  const rawText = response.text?.trim() || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new OCRError('Gemini Vision không trả về định dạng JSON hợp lệ.', 500);
  }

  // Format and normalize extracted fields
  const hoVaTen = (parsed.hoVaTen || label || '').toString().toUpperCase().trim();
  const soCCCD = (parsed.soCCCD || '').toString().replace(/\D/g, '');
  const ngaySinh = normalizeDateToISO(parsed.ngaySinh || '');
  const ngayCap = normalizeDateToISO(parsed.ngayCap || '');
  const ngayHetHanCCCD = parsed.ngayHetHanCCCD === 'Không thời hạn'
    ? 'Không thời hạn'
    : normalizeDateToISO(parsed.ngayHetHanCCCD || '');

  const cauHoiLamRo: string[] = Array.isArray(parsed.cauHoiLamRo) ? [...parsed.cauHoiLamRo] : [];
  const thongTinChuaRo: string[] = Array.isArray(parsed.thongTinChuaRo) ? [...parsed.thongTinChuaRo] : [];

  if (parsed.canh_bao_sai_lech) {
    cauHoiLamRo.unshift(`⚠️ Cảnh báo đối soát chéo: ${parsed.canh_bao_sai_lech}`);
  }

  const result: DocumentExtractionResult = {
    extractionMethod: 'vision',
    aiVisionExtracted: true,
    hoVaTen,
    ngaySinh,
    gioiTinh: parsed.gioiTinh === 'Nữ' ? 'Nữ' : parsed.gioiTinh === 'Khác' ? 'Khác' : 'Nam',
    soCCCD,
    ngayCap,
    ngayHetHanCCCD,
    noiCap: (parsed.noiCap || '').toString().trim(),
    queQuan: (parsed.queQuan || '').toString().trim(),
    diaChiThuongTru: (parsed.diaChiThuongTru || '').toString().trim(),
    nguonDiaChi: 'CCCD',
    soDienThoai: (parsed.soDienThoai || '').toString().trim(),
    emailCaNhan: (parsed.emailCaNhan || '').toString().trim(),
    danToc: (parsed.danToc || '').toString().trim(),
    tinhTrangHonNhan: (parsed.tinhTrangHonNhan || '').toString().trim(),
    congViecDuKien: '',
    chucVu: '',
    thongTinGiaDinh: Array.isArray(parsed.thongTinGiaDinh) ? parsed.thongTinGiaDinh : [],
    thanhVienHoGiaDinh: Array.isArray(parsed.thanhVienHoGiaDinh) ? parsed.thanhVienHoGiaDinh : [],
    thongTinChuaRo,
    cauHoiLamRo,
    canh_bao_sai_lech: parsed.canh_bao_sai_lech || '',
    mucDoTinCay: parsed.canh_bao_sai_lech ? 'CAN_XAC_NHAN' : 'CAO',
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
