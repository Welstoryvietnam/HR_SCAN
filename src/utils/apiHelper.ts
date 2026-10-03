/**
 * Tiện ích gọi API an toàn, chống crash khi server hoặc proxy trả về HTML thay vì JSON
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
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
      } else if (text.trim().startsWith('<') || text.includes('<html')) {
        sanitizedError = `Máy chủ trả về trang HTML thay vì JSON (HTTP ${res.status}).`;
      } else if (text.includes('did not match the expected pattern') || text.includes('pattern')) {
        sanitizedError = 'Dữ liệu phản hồi hoặc ảnh chưa đúng định dạng chuẩn.';
      } else if (text.trim().length > 0 && text.trim().length < 200) {
        sanitizedError = text.trim();
      }

      return {
        ok: res.ok,
        error: res.ok ? undefined : sanitizedError,
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
