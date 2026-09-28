/**
 * Tiện ích gọi API an toàn, chống crash khi server hoặc proxy trả về HTML thay vì JSON
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, data, error: data?.error };
    }

    // Nếu server/proxy trả về text hoặc HTML (ví dụ: lỗi Cloud Run, Vercel Edge, Nginx, hoặc 404/502)
    const text = await res.text();
    let sanitizedError = `Lỗi phản hồi từ máy chủ (HTTP ${res.status})`;
    if (!res.ok) {
      if (text.includes('NOT_FOUND') || text.includes('The page could not be found') || text.includes('hkg1::')) {
        sanitizedError = 'Không tìm thấy máy chủ API trên môi trường mạng hiện tại (404 Not Found). Đang kích hoạt chế độ dự phòng ngoại tuyến.';
      } else if (text.trim().startsWith('<') || text.includes('<html')) {
        sanitizedError = `Máy chủ trả về trang HTML thay vì JSON (HTTP ${res.status}).`;
      } else if (text.trim().length > 0 && text.trim().length < 200) {
        sanitizedError = text.trim();
      }
    }

    return {
      ok: res.ok,
      error: res.ok ? undefined : sanitizedError,
    };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message || 'Không thể kết nối đến máy chủ.',
    };
  }
}
