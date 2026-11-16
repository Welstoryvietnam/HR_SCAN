import type { HealthCheckNotificationItem, UserProfile } from '../types';
import { safeFetchJson } from './apiHelper';

export const HEALTH_NOTIFICATIONS_STORAGE_KEY = 'hr_health_check_notifications';
export const HEALTH_NOTIFICATIONS_PUSHED_IDS_KEY = 'hr_health_pushed_notif_ids';
export const HEALTH_NOTIFICATION_EVENT = 'hr-health-notifications-updated';
export const HEALTH_REGISTRATIONS_CLOUD_EVENT = 'hr-health-registrations-cloud-synced';

export function getStoredHealthNotifications(): HealthCheckNotificationItem[] {
  try {
    const raw = localStorage.getItem(HEALTH_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredHealthNotifications(items: HealthCheckNotificationItem[]): void {
  try {
    localStorage.setItem(HEALTH_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items.slice(0, 60)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(HEALTH_NOTIFICATION_EVENT, { detail: items }));
    }
  } catch {
    // ignore storage errors
  }
}

export function getPushedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HEALTH_NOTIFICATIONS_PUSHED_IDS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function markNotificationIdPushed(id: string): void {
  try {
    const set = getPushedNotificationIds();
    set.add(id);
    const arr = Array.from(set).slice(-100);
    localStorage.setItem(HEALTH_NOTIFICATIONS_PUSHED_IDS_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function isNotificationReadByUser(
  item: HealthCheckNotificationItem,
  user: UserProfile | null
): boolean {
  if (!user) return false;
  const readList = Array.isArray(item.readBy) ? item.readBy.map(s => s.toLowerCase()) : [];
  const emailKey = (user.email || '').toLowerCase();
  const idKey = (user.id || '').toLowerCase();
  const usernameKey = (user.username || '').toLowerCase();
  return (
    (emailKey !== '' && readList.includes(emailKey)) ||
    (idKey !== '' && readList.includes(idKey)) ||
    (usernameKey !== '' && readList.includes(usernameKey))
  );
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.12); // A5
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);
  } catch {
    // AudioContext may be blocked if user hasn't interacted yet
  }
}

export function triggerBrowserPushNotification(
  item: HealthCheckNotificationItem,
  onClickNavigate?: () => void
): boolean {
  playNotificationChime();
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notif = new Notification(item.title, {
      body: item.message,
      icon: '/assets/aistudio/______________Vietnam_CMYK__439d9ecc.png',
      badge: '/assets/aistudio/______________Vietnam_CMYK__439d9ecc.png',
      tag: item.id,
    });
    notif.onclick = () => {
      try {
        window.focus();
        onClickNavigate?.();
        notif.close();
      } catch {
        // ignore
      }
    };
    return true;
  } catch {
    return false;
  }
}

export async function notifyNewHealthCheckRegistrations(
  candidates: Array<{
    hoVaTen: string;
    phong?: string;
    nhaCungCap?: string;
    ngayHenKham?: string;
  }>,
  currentUser: UserProfile,
  allRegistrations?: any[]
): Promise<HealthCheckNotificationItem | null> {
  if (!candidates || candidates.length === 0) return null;

  const candidateNames = candidates.map(c => (c.hoVaTen || '').trim()).filter(Boolean);
  const candidateCount = candidateNames.length || candidates.length;
  const first = candidates[0];
  const createdBy = currentUser.name || currentUser.employeeCode || currentUser.email || 'Tuyển dụng';

  const localNotif: HealthCheckNotificationItem = {
    id: `notif_ksk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title:
      candidateCount === 1 && candidateNames[0]
        ? `Ứng viên mới đăng ký KSK: ${candidateNames[0]}`
        : `Có ${candidateCount} ứng viên mới đăng ký KSK tuyển dụng`,
    message: `${createdBy} vừa đăng ký khám sức khỏe cho ${
      candidateNames.length > 0
        ? candidateNames.slice(0, 3).join(', ') +
          (candidateNames.length > 3 ? ` (+${candidateNames.length - 3})` : '')
        : `${candidateCount} ứng viên`
    }${first?.phong ? ` — Bộ phận: ${first.phong}` : ''}${
      first?.ngayHenKham ? ` — Ngày hẹn khám: ${first.ngayHenKham}` : ''
    }.`,
    candidateNames,
    candidateCount,
    phong: first?.phong,
    nhaCungCap: first?.nhaCungCap,
    ngayHenKham: first?.ngayHenKham,
    createdBy,
    createdByEmail: currentUser.email,
    createdAt: new Date().toISOString(),
    readBy: [],
    targetRole: 'nhan_vien_y_te',
  };

  // Lưu ngay vào localStorage để phản hồi tức thì
  const currentLocal = getStoredHealthNotifications();
  const nextLocal = [localNotif, ...currentLocal.filter(n => n.id !== localNotif.id)];
  saveStoredHealthNotifications(nextLocal);

  // Đồng bộ lên Cloud Firestore để Nhân viên y tế trên thiết bị/môi trường khác nhận tức thì
  const res = await safeFetchJson<{
    success: boolean;
    provider?: 'firestore' | 'local';
    notification?: HealthCheckNotificationItem;
    notifications?: HealthCheckNotificationItem[];
  }>('/api/health-check/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...localNotif,
      registrations: allRegistrations,
    }),
  });

  if (res.ok && res.data?.success && Array.isArray(res.data.notifications)) {
    saveStoredHealthNotifications(res.data.notifications);
    return res.data.notification || localNotif;
  }

  return localNotif;
}

export async function syncHealthRegistrationsToCloud(registrations: any[]): Promise<void> {
  if (!Array.isArray(registrations)) return;
  try {
    await safeFetchJson('/api/health-check/registrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrations }),
    });
  } catch {
    // ignore background sync error
  }
}

export async function fetchHealthRegistrationsFromCloud(): Promise<any[] | null> {
  const res = await safeFetchJson<{
    success: boolean;
    registrations?: any[] | null;
  }>('/api/health-check/registrations', { method: 'GET' });
  if (res.ok && res.data?.success && Array.isArray(res.data.registrations)) {
    try {
      localStorage.setItem('hr_recruitment_health_regs', JSON.stringify(res.data.registrations));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(HEALTH_REGISTRATIONS_CLOUD_EVENT, { detail: res.data.registrations })
        );
      }
    } catch {
      // ignore
    }
    return res.data.registrations;
  }
  return null;
}
