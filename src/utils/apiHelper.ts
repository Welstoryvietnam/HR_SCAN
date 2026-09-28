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

    // Nếu server/proxy trả về text hoặc HTML (ví dụ: lỗi Cloud Run, Nginx, hoặc 404/502)
    const text = await res.text();
    return {
      ok: res.ok,
      error: res.ok ? undefined : (text.slice(0, 150) || `Lỗi máy chủ HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message || 'Không thể kết nối đến máy chủ.',
    };
  }
}
