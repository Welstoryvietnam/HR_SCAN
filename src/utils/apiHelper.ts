/**
 * Tiện ích gọi API an toàn, chống crash khi server hoặc proxy trả về HTML thay vì JSON
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    if (String(input).includes('/api/ai/extract-documents') && typeof init?.body === 'string' && new TextEncoder().encode(init.body).byteLength > 4_000_000) {
      return { ok: false, error: 'Tổng dung lượng tài liệu quá lớn cho một lần trích xuất. Vui lòng giảm dung lượng hoặc số trang PDF/ảnh của nhân viên này rồi thử lại.' };
    }
    const res = await fetch(input, init);
    const text = await res.text();

    if (!text || text.trim() === '') {
      return {
        ok: false,
        error: res.ok ? undefined : `Máy chủ phản hồi rỗng (HTTP ${res.status}). Vui lòng thử lại.`,
      };
    }

    try {
      const data = JSON.parse(text);
      return { ok: res.ok, data, error: data?.error };
    } catch {
      // Nếu server/proxy trả về text hoặc HTML (ví dụ: lỗi Cloud Run, Vercel Edge, Nginx, hoặc 404/502)
      let sanitizedError = `Lỗi phản hồi từ máy chủ (HTTP ${res.status})`;
      if (text.includes('NOT_FOUND') || text.includes('The page could not be found') || text.includes('hkg1::')) {
        sanitizedError = 'Không tìm thấy máy chủ API trên môi trường mạng hiện tại (404 Not Found). Đang kích hoạt chế độ dự phòng ngoại tuyến.';
      } else if (res.status === 405) {
        sanitizedError = 'API chưa được triển khai đúng trên máy chủ (HTTP 405). Vui lòng kiểm tra cấu hình Vercel.';
      } else if (res.status === 413) {
        sanitizedError = 'Tài liệu vượt giới hạn dung lượng máy chủ (HTTP 413). Vui lòng giảm dung lượng PDF hoặc số ảnh.';
      } else if (text.trim().startsWith('<') || text.includes('<html')) {
        sanitizedError = `Máy chủ trả về trang HTML thay vì JSON (HTTP ${res.status}).`;
      } else if (text.includes('did not match the expected pattern') || text.includes('pattern')) {
        sanitizedError = 'Dữ liệu phản hồi hoặc ảnh chưa đúng định dạng chuẩn.';
      } else if (text.trim().length > 0 && text.trim().length < 200) {
        sanitizedError = text.trim();
      }

      return {
        ok: false,
        error: sanitizedError,
      };
    }
  } catch (err) {
    const rawMsg = (err as Error)?.message || '';
    let userMsg = rawMsg || 'Không thể kết nối đến máy chủ.';
    if (rawMsg.includes('did not match the expected pattern') || rawMsg.includes('pattern')) {
      userMsg = 'Định dạng dữ liệu không tương thích trên trình duyệt hiện tại. Đang chuyển sang chế độ tự động tối ưu.';
    }
    return {
      ok: false,
      error: userMsg,
    };
  }
}
