import { OptimizedImageFile } from '../types';

/**
 * Tối ưu hóa ảnh phía Client trước khi gửi lên Gemini API:
 * - Resize chiều rộng tối đa 1024px (giữ đúng tỉ lệ khung hình)
 * - Nén sang định dạng JPEG với chất lượng 0.8 (80%)
 * - Chuyển sang Base64 chuẩn và đo lường dung lượng tiết kiệm
 */
export async function optimizeImageFile(
  file: File,
  docType: OptimizedImageFile['docType'] = 'khac',
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<OptimizedImageFile> {
  return new Promise((resolve, reject) => {
    try {
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

            // Tính toán tỉ lệ sao cho chiều rộng tối đa 1024px
            // Nếu là ảnh tài liệu khổ dọc có chiều cao quá lớn, vẫn đảm bảo chiều rộng <= 1024px
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              width = maxWidth;
              height = Math.round(height * ratio);
            }

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

            // Xuất ra định dạng JPEG chất lượng 0.8
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
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
              mimeType: 'image/jpeg',
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
