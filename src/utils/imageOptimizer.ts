import { OptimizedImageFile } from '../types';

/**
 * Tối ưu hóa ảnh phía Client trước khi gửi lên API OCR:
 * - Giữ chữ nhỏ nhưng giới hạn payload di động để một hồ sơ nhiều ảnh không
 *   làm Safari/Vercel hủy request trước khi AI trả kết quả.
 * - JPEG thích ứng, giữ PNG khi PNG nhỏ hơn; PDF giữ bản gốc
 * - Chuyển sang Base64 chuẩn và đo lường dung lượng tiết kiệm
 */
export async function optimizeImageFile(
  file: File,
  docType: OptimizedImageFile['docType'] = 'khac',
  maxWidth: number = 1600,
  quality: number = 0.85
): Promise<OptimizedImageFile> {
  return new Promise((resolve, reject) => {
    try {
      // Xử lý tệp PDF trực tiếp
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Không thể đọc file PDF: ${file.name}`));
        reader.onload = async (event) => {
          try {
            const dataUrl = event.target?.result as string;
            const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            const base64Data = rawBase64.replace(/[\r\n\s]+/g, '');
            const result: OptimizedImageFile = {
              id: 'pdf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
              fileName: file.name,
              originalSize: file.size,
              compressedSize: file.size,
              width: 800,
              height: 1130,
              mimeType: 'application/pdf',
              base64Data: base64Data,
              dataUrl: dataUrl,
              docType: docType,
            };
            resolve(result);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error(`Không thể đọc file: ${file.name}`));
      };

      reader.onload = (event) => {
        const img = new Image();

        img.onerror = () => {
          reject(new Error(`Không thể giải mã hình ảnh từ: ${file.name}`));
        };

        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            // Preserve aspect ratio and enough detail for Vietnamese diacritics.
            // Bound short/long edges independently of orientation. A sideways
            // portrait must keep the same detail as an upright portrait.
            const ratio=Math.min(1,maxWidth/Math.min(width,height),2600/Math.max(width,height));
            width=Math.round(width*ratio);height=Math.round(height*ratio);

            // Tạo canvas để nén
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Trình duyệt không hỗ trợ Canvas 2D context.');
            }

            // Đổ nền trắng (phòng trường hợp ảnh PNG có alpha channel)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            // Vẽ ảnh lên canvas với kích thước mới
            ctx.drawImage(img, 0, 0, width, height);

            // Keep every mobile upload below roughly 450 KB (600k Base64
            // characters). Four images then remain comfortably below the API
            // request ceiling, while 1,400px+ documents still retain CCCD text.
            const maxBase64Length=600_000;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            // Keep small screenshots lossless when PNG is smaller than JPEG.
            if(file.type==='image/png') {
              const png=canvas.toDataURL('image/png');
              if(png.length<dataUrl.length) dataUrl=png;
            }
            // First reduce JPEG quality, then (only if still needed) reduce
            // dimensions. This is more reliable than sending four near-limit
            // images from mobile Safari in one request.
            for(let nextQuality=quality-0.08;dataUrl.length>maxBase64Length && nextQuality>=0.62;nextQuality-=0.08) dataUrl=canvas.toDataURL('image/jpeg',nextQuality);
            while(dataUrl.length>maxBase64Length && Math.max(width,height)>1400) {
              width=Math.max(1,Math.round(width*0.86));
              height=Math.max(1,Math.round(height*0.86));
              canvas.width=width;canvas.height=height;
              ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,width,height);
              ctx.drawImage(img,0,0,width,height);
              dataUrl=canvas.toDataURL('image/jpeg',0.72);
            }
            width=canvas.width;height=canvas.height;
            // Tách phần Base64 thuần túy an toàn trên mọi trình duyệt (Safari/Chrome/Firefox)
            const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            const base64Data = rawBase64.replace(/[\r\n\s]+/g, '');

            // Tính dung lượng sau nén (ước lượng xấp xỉ từ độ dài base64)
            const compressedSize = Math.round((base64Data.length * 3) / 4);

            const result: OptimizedImageFile = {
              id: 'img_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
              fileName: file.name,
              originalSize: file.size,
              compressedSize: compressedSize,
              width: width,
              height: height,
              mimeType: dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
              base64Data: base64Data,
              dataUrl: dataUrl,
              docType: docType,
            };

            resolve(result);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        };

        img.src = event.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Hàm định dạng dung lượng byte thành KB/MB dễ đọc
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
