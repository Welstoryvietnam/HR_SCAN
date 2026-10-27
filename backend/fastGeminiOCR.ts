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

const FAST_SYSTEM_INSTRUCTION = `Bạn là chuyên gia số hóa hồ sơ nhân sự (HR Data Extraction Specialist) tốc độ cao. Nhiệm vụ của bạn là bóc tách thông tin từ ảnh chụp/bản scan Căn cước công dân (CCCD) và Sơ yếu lý lịch (bao gồm cả chữ viết tay và chữ in) và trả về định dạng JSON thuần.

Quy tắc xử lý bắt buộc:
1. Tính trung thực và nguyên bản: Tuyệt đối không tự suy đoán hay bịa thông tin. Nếu chữ viết tay quá mờ, bị gạch xóa hoặc rách không đọc được, hãy điền giá trị null hoặc chuỗi rỗng "".
2. Chuẩn hóa ngày tháng: Mọi trường ngày tháng phải chuyển về định dạng chuẩn YYYY-MM-DD. Nếu chỉ có năm, ghi rõ YYYY.
3. Chuẩn hóa CCCD: Số CCCD phải là chuỗi số liền mạch (12 số với thẻ căn cước mới, 9 số với CMND cũ), loại bỏ khoảng trắng hoặc ký tự đặc biệt.
4. Đối soát chéo (Cross-check): So sánh thông tin giữa CCCD và Sơ yếu lý lịch. Nếu phát hiện sai lệch về họ tên, ngày sinh hoặc số định danh giữa 2 nguồn tài liệu, phải ghi rõ cảnh báo vào trường "canh_bao_sai_lech".
5. Trả về đúng JSON thuần với cấu trúc các trường sau:
{
  "hoVaTen": "Họ và tên viết hoa có dấu của nhân viên",
  "ngaySinh": "YYYY-MM-DD hoặc YYYY",
  "gioiTinh": "Nam hoặc Nữ hoặc Khác",
  "soCCCD": "12 số CCCD hoặc 9 số CMND liền mạch",
  "ngayCap": "YYYY-MM-DD",
  "ngayHetHanCCCD": "YYYY-MM-DD hoặc Không thời hạn",
  "noiCap": "Nơi cấp CCCD",
  "queQuan": "Quê quán",
  "diaChiThuongTru": "Địa chỉ thường trú",
  "diaChiTamTru": "Địa chỉ tạm trú nếu có",
  "soDienThoai": "Số điện thoại di động",
  "emailCaNhan": "Email cá nhân nếu có",
  "danToc": "Dân tộc (ví dụ Kinh, Tày...)",
  "tonGiao": "Tôn giáo",
  "tinhTrangHonNhan": "Độc thân / Đã kết hôn",
  "nguyenQuan": "Nguyên quán",
  "noiSinh": "Nơi sinh",
  "hocVan": "Trình độ học vấn",
  "canh_bao_sai_lech": "Cảnh báo sai lệch giữa các tài liệu nếu có, hoặc chuỗi rỗng",
  "thongTinChuaRo": ["Danh sách các trường bị mờ, rách hoặc không đọc được"],
  "cauHoiLamRo": ["Lưu ý hoặc câu hỏi cần HR kiểm tra lại"],
  "thongTinGiaDinh": [
    { "quanHe": "Bố/Mẹ/Vợ/Chồng...", "hoTen": "...", "namSinh": "YYYY", "ngheNghiep": "..." }
  ],
  "thanhVienHoGiaDinh": [
    { "hoTen": "...", "ngaySinh": "YYYY-MM-DD", "quanHeVoiChuHo": "...", "gioiTinh": "Nam/Nữ", "diaChiThuongTru": "...", "quocTich": "Việt Nam", "danToc": "Kinh" }
  ],
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

  // Build multimodal parts: optimize images with sharp if oversized for instant transfer
  const parts: any[] = [];
  for (const doc of documents) {
    let base64ToSend = doc.base64Data;
    let mimeToSend = doc.mimeType || 'image/jpeg';

    if (doc.base64Data && !doc.mimeType?.includes('pdf')) {
      try {
        const buffer = Buffer.from(doc.base64Data, 'base64');
        if (buffer.length > 200_000) {
          const resized = await sharp(buffer)
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
          base64ToSend = resized.toString('base64');
          mimeToSend = 'image/jpeg';
        }
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
    text: `Vui lòng bóc tách toàn bộ thông tin nhân sự từ các ảnh tài liệu đính kèm (CCCD, Sơ yếu lý lịch, v.v.). ${
      label ? `Họ tên gợi ý ban đầu: "${label}". ` : ''
    }Thực hiện kiểm tra chéo (Cross-check) thông tin giữa CCCD và Sơ yếu lý lịch và cảnh báo nếu có mâu thuẫn. Chuẩn hóa ngày tháng theo YYYY-MM-DD và CCCD theo chuỗi số liền mạch.`,
  });

  // Call gemini-3.8-flash with ThinkingLevel.LOW and no responseSchema for maximum speed (sub-3s)
  let response: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts,
        },
        config: {
          systemInstruction: FAST_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          temperature: 0.1,
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
    diaChiTamTru: (parsed.diaChiTamTru || '').toString().trim(),
    nguonDiaChi: 'CCCD',
    soDienThoai: (parsed.soDienThoai || '').toString().trim(),
    emailCaNhan: (parsed.emailCaNhan || '').toString().trim(),
    danToc: (parsed.danToc || '').toString().trim(),
    tonGiao: (parsed.tonGiao || '').toString().trim(),
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
