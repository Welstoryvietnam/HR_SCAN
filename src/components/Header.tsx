import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, HealthCheckNotificationItem } from '../types';
import { safeFetchJson } from '../utils/apiHelper';
import {
  getStoredHealthNotifications,
  saveStoredHealthNotifications,
  getPushedNotificationIds,
  markNotificationIdPushed,
  isNotificationReadByUser,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  triggerBrowserPushNotification,
  fetchHealthRegistrationsFromCloud,
  HEALTH_NOTIFICATION_EVENT,
} from '../utils/healthNotificationService';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Calendar,
  Building2,
  ExternalLink,
  RefreshCw,
  Volume2,
  Sparkles,
  Cloud
} from 'lucide-react';

export type AppTab = 'upload' | 'records' | 'health' | 'benefits' | 'sop' | 'labor_law' | 'organization' | 'salary' | 'users';

interface HeaderProps {
  currentUser: UserProfile;
  onLogout: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNavigateToHealthTracking?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  sidebarCollapsed,
  onToggleSidebar,
  onNavigateToHealthTracking,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isMedicalStaff = !isAdmin && currentUser.hrmRole === 'nhan_vien_y_te';
  const shouldReceiveMedicalPush = isMedicalStaff || isAdmin;

  const [notifications, setNotifications] = useState<HealthCheckNotificationItem[]>(() =>
    getStoredHealthNotifications()
  );
  const [bellOpen, setBellOpen] = useState(false);
  const [syncingNotifs, setSyncingNotifs] = useState(false);
  const [syncProvider, setSyncProvider] = useState<'firestore' | 'local'>('firestore');
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserNotificationPermission()
  );
  const [livePopupAlert, setLivePopupAlert] = useState<HealthCheckNotificationItem | null>(null);

  const bellDropdownRef = useRef<HTMLDivElement>(null);
  const lastRegUpdatedAtRef = useRef<string>('');
  const initialSyncDoneRef = useRef<boolean>(false);

  const unreadNotifications = notifications.filter(
    n => !isNotificationReadByUser(n, currentUser)
  );
  const unreadCount = unreadNotifications.length;

  const syncNotificationsFromCloud = useCallback(
    async (silent = true) => {
      if (!silent) setSyncingNotifs(true);
      try {
        const res = await safeFetchJson<{
          success: boolean;
          provider?: 'firestore' | 'local';
          notifications?: HealthCheckNotificationItem[];
          registrationsUpdatedAt?: string;
        }>('/api/health-check/notifications', { method: 'GET' });

        if (res.ok && res.data?.success && Array.isArray(res.data.notifications)) {
          const remoteList = res.data.notifications;
          if (res.data.provider) {
            setSyncProvider(res.data.provider);
          }

          // Nếu danh sách đăng ký KSK trên Cloud có bản cập nhật mới, tự động đồng bộ về máy
          if (
            res.data.registrationsUpdatedAt &&
            res.data.registrationsUpdatedAt !== lastRegUpdatedAtRef.current
          ) {
            lastRegUpdatedAtRef.current = res.data.registrationsUpdatedAt;
            void fetchHealthRegistrationsFromCloud();
          }

          // Kiểm tra thông báo mới chưa từng bắn Web Push cho Nhân viên y tế / Admin
          const pushedIds = getPushedNotificationIds();
          if (!initialSyncDoneRef.current) {
            // Lần tải đầu tiên: ghi nhận các thông báo cũ hơn 2 phút để không bắn lại hàng loạt
            const twoMinsAgo = Date.now() - 2 * 60 * 1000;
            for (const item of remoteList) {
              const createdMs = Date.parse(item.createdAt || '') || 0;
              if (createdMs < twoMinsAgo || isNotificationReadByUser(item, currentUser)) {
                markNotificationIdPushed(item.id);
              }
            }
            initialSyncDoneRef.current = true;
          }

          const updatedPushedIds = getPushedNotificationIds();
          const newlyArrived = remoteList.filter(
            item =>
              !updatedPushedIds.has(item.id) &&
              !isNotificationReadByUser(item, currentUser)
          );

          if (newlyArrived.length > 0 && shouldReceiveMedicalPush) {
            const latest = newlyArrived[0];
            for (const item of newlyArrived) {
              markNotificationIdPushed(item.id);
            }
            setLivePopupAlert(latest);
            triggerBrowserPushNotification(latest, () => {
              onNavigateToHealthTracking?.();
            });
          }

          setNotifications(remoteList);
          saveStoredHealthNotifications(remoteList);
        }
      } catch {
        // ignore transient network errors
      } finally {
        if (!silent) setSyncingNotifs(false);
      }
    },
    [currentUser, shouldReceiveMedicalPush, onNavigateToHealthTracking]
  );

  // Đồng bộ định kỳ mỗi 8 giây với Cloud Firestore và khi người dùng quay lại tab
  useEffect(() => {
    void syncNotificationsFromCloud(true);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncNotificationsFromCloud(true);
      }
    }, 8000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncNotificationsFromCloud(true);
      }
    };

    const handleLocalUpdate = () => {
      const latest = getStoredHealthNotifications();
      setNotifications(latest);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener(HEALTH_NOTIFICATION_EVENT, handleLocalUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener(HEALTH_NOTIFICATION_EVENT, handleLocalUpdate);
    };
  }, [syncNotificationsFromCloud]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellDropdownRef.current &&
        !bellDropdownRef.current.contains(event.target as Node)
      ) {
        setBellOpen(false);
      }
    };
    if (bellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  // Tự động ẩn popup nổi sau 8 giây
  useEffect(() => {
    if (!livePopupAlert) return;
    const timer = window.setTimeout(() => setLivePopupAlert(null), 8000);
    return () => window.clearTimeout(timer);
  }, [livePopupAlert]);

  const handleEnableBrowserPush = async () => {
    const perm = await requestBrowserNotificationPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      const sample: HealthCheckNotificationItem = {
        id: 'sample_push_' + Date.now(),
        title: 'Đã bật Thông báo đẩy Y tế (WELV HR)',
        message:
          'Từ bây giờ, khi có ứng viên mới đăng ký khám sức khỏe, trình duyệt sẽ hiển thị thông báo đẩy tức thì.',
        candidateNames: [],
        candidateCount: 0,
        createdBy: 'Hệ thống',
        createdAt: new Date().toISOString(),
        readBy: [],
        targetRole: 'nhan_vien_y_te',
      };
      triggerBrowserPushNotification(sample, () => {
        onNavigateToHealthTracking?.();
      });
    }
  };

  const handleSendTestPush = async () => {
    let perm = getBrowserNotificationPermission();
    if (perm === 'default') {
      perm = await requestBrowserNotificationPermission();
      setPushPermission(perm);
    }
    const testNotif: HealthCheckNotificationItem = {
      id: `notif_ksk_test_${Date.now()}`,
      title: 'Thông báo thử nghiệm: Ứng viên đăng ký KSK mới',
      message: `${
        currentUser.name || currentUser.email
      } vừa kiểm tra tính năng Thông báo đẩy Y tế — Đồng bộ qua Cloud Firestore.`,
      candidateNames: ['Nguyễn Văn Mẫu (Test KSK)'],
      candidateCount: 1,
      phong: 'BẾP TRUNG TÂM',
      nhaCungCap: 'Phòng khám Đa khoa Hữu Phúc',
      ngayHenKham: new Date().toISOString().slice(0, 10),
      createdBy: currentUser.name || currentUser.email,
      createdByEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      readBy: [],
      targetRole: 'nhan_vien_y_te',
    };

    markNotificationIdPushed(testNotif.id);
    triggerBrowserPushNotification(testNotif, () => {
      onNavigateToHealthTracking?.();
    });
    setLivePopupAlert(testNotif);

    const res = await safeFetchJson<{
      success: boolean;
      notifications?: HealthCheckNotificationItem[];
    }>('/api/health-check/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testNotif),
    });
    if (res.ok && res.data?.notifications) {
      setNotifications(res.data.notifications);
      saveStoredHealthNotifications(res.data.notifications);
    } else {
      const next = [testNotif, ...notifications];
      setNotifications(next);
      saveStoredHealthNotifications(next);
    }
  };

  const handleMarkAsRead = async (idOrAll: string) => {
    const userKey = (currentUser.email || currentUser.id || currentUser.username || '').toLowerCase();
    const optimistic = notifications.map(n => {
      if (idOrAll === 'ALL' || n.id === idOrAll) {
        const readBy = Array.isArray(n.readBy) ? [...n.readBy] : [];
        if (userKey && !readBy.includes(userKey)) readBy.push(userKey);
        return { ...n, readBy };
      }
      return n;
    });
    setNotifications(optimistic);
    saveStoredHealthNotifications(optimistic);

    await safeFetchJson('/api/health-check/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idOrAll, userKey }),
    });
  };

  const handleClearAllNotifications = async () => {
    setNotifications([]);
    saveStoredHealthNotifications([]);
    await safeFetchJson('/api/health-check/notifications?id=ALL', {
      method: 'DELETE',
    });
  };

  const handleClickNotificationItem = async (item: HealthCheckNotificationItem) => {
    await handleMarkAsRead(item.id);
    void fetchHealthRegistrationsFromCloud();
    setBellOpen(false);
    setLivePopupAlert(null);
    onNavigateToHealthTracking?.();
  };

  const formatTimeAgo = (iso: string) => {
    try {
      const diffSec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
      if (diffSec < 60) return 'Vừa xong';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs h-16">
      {/* Banner thông báo đẩy trực tiếp trên màn hình khi có ứng viên đăng ký KSK mới */}
      {livePopupAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-white border-2 border-teal-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                  <Stethoscope className="w-3 h-3" /> Thông báo Y tế mới
                </span>
                <button
                  type="button"
                  onClick={() => setLivePopupAlert(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                {livePopupAlert.title}
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {livePopupAlert.message}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleClickNotificationItem(livePopupAlert)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  <span>Mở Theo dõi KSK ngay</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleMarkAsRead(livePopupAlert.id);
                    setLivePopupAlert(null);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Đã xem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          <img
            src="/assets/aistudio/______________Vietnam_CMYK__439d9ecc.png"
            alt="Welstory Vietnam"
            className="h-8 w-auto shrink-0 object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                HR Workspace
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                WELV
              </span>
            </div>
          </div>
        </div>

        {/* Notification Bell, User Profile & Logout Action */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* CHUÔNG THÔNG BÁO ĐẨY KHÁM SỨC KHỎE (ĐỒNG BỘ CLOUD FIRESTORE) */}
          <div className="relative" ref={bellDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setBellOpen(prev => !prev);
                void syncNotificationsFromCloud(false);
              }}
              className={`relative p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                unreadCount > 0
                  ? 'bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Thông báo đăng ký Khám sức khỏe mới (Cloud Firestore & Web Push)"
            >
              {unreadCount > 0 ? (
                <BellRing className="w-4 h-4 text-teal-600 animate-pulse" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span className="hidden md:inline text-xs font-semibold">
                Thông báo KSK
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-extrabold text-white bg-rose-600 rounded-full shadow-2xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown danh sách thông báo */}
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header của Chuông */}
                <div className="p-3.5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-teal-200" />
                      <h3 className="text-xs sm:text-sm font-bold">
                        Thông Báo Đăng Ký Khám Sức Khỏe
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold">
                      <Cloud className="w-3 h-3" />
                      {syncProvider === 'firestore' ? 'Cloud Firestore' : 'Local Sync'}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-100 mt-1">
                    Tự động báo cho Nhân viên y tế ngay khi có ứng viên đăng ký KSK mới
                  </p>
                </div>

                {/* Thanh trạng thái & kích hoạt Web Push Notification */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {pushPermission === 'granted' ? (
                      <span className="text-emerald-700 font-semibold">
                        Thông báo đẩy trình duyệt: Đã bật
                      </span>
                    ) : pushPermission === 'denied' ? (
                      <span className="text-amber-700 font-medium">
                        Trình duyệt đang chặn popup (Vẫn có chuông báo)
                      </span>
                    ) : pushPermission === 'unsupported' ? (
                      <span className="text-slate-600">
                        Chế độ chuông thông báo trực tiếp
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleEnableBrowserPush()}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        Bật thông báo đẩy (Web Push)
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleSendTestPush()}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-semibold transition cursor-pointer"
                      title="Gửi thử 1 thông báo đẩy để kiểm tra chuông và banner"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gửi thử</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void syncNotificationsFromCloud(false)}
                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                      title="Làm mới từ Cloud Firestore"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingNotifs ? 'animate-spin text-teal-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Thanh công cụ Đánh dấu đã đọc / Xóa */}
                {notifications.length > 0 && (
                  <div className="px-3.5 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">
                      Chưa đọc: <strong className="text-rose-600">{unreadCount}</strong> / {notifications.length}
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleMarkAsRead('ALL')}
                          className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Đánh dấu đã đọc hết</span>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => void handleClearAllNotifications()}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                          title="Xóa tất cả lịch sử thông báo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Danh sách thông báo */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-10 px-4 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Bell className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        Chưa có thông báo đăng ký KSK mới
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Khi bộ phận Tuyển dụng gửi đăng ký KSK, thông báo đẩy sẽ xuất hiện tại đây và trên màn hình của Nhân viên y tế.
                      </p>
                    </div>
                  ) : (
                    notifications.map(item => {
                      const isRead = isNotificationReadByUser(item, currentUser);
                      return (
                        <div
                          key={item.id}
                          onClick={() => void handleClickNotificationItem(item)}
                          className={`p-3.5 transition cursor-pointer hover:bg-teal-50/60 flex items-start gap-3 ${
                            !isRead ? 'bg-teal-50/30' : 'bg-white'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              !isRead
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-xs leading-snug ${
                                  !isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                                }`}
                              >
                                {item.title}
                              </p>
                              {!isRead && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              {item.message}
                            </p>

                            {Array.isArray(item.candidateNames) && item.candidateNames.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.candidateNames.slice(0, 4).map((name, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-semibold"
                                  >
                                    {name}
                                  </span>
                                ))}
                                {item.candidateNames.length > 4 && (
                                  <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded-md text-[10px] font-bold">
                                    +{item.candidateNames.length - 4} ứng viên
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500">
                              {item.phong && (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  {item.phong}
                                </span>
                              )}
                              {item.ngayHenKham && (
                                <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                                  <Calendar className="w-3 h-3" />
                                  Hẹn khám: {item.ngayHenKham}
                                </span>
                              )}
                              <span>• {formatTimeAgo(item.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer chuyển nhanh sang bảng Theo dõi KSK tuyển dụng */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setBellOpen(false);
                      void fetchHealthRegistrationsFromCloud();
                      onNavigateToHealthTracking?.();
                    }}
                    className="w-full py-1.5 px-3 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Mở bảng 2. Theo dõi KSK tuyển dụng</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                isAdmin ? 'bg-purple-600' : 'bg-sky-600'
              }`}
            >
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 max-w-[150px] truncate">
                  {currentUser.employeeCode || currentUser.email}
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                ) : isMedicalStaff ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                    <Stethoscope className="w-3 h-3" /> NV Y tế
                  </span>
                ) : currentUser.hrmRole === 'nhan_vien_quan_ly_ho_so' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                    <UserCheck className="w-3 h-3" /> QL Hồ sơ
                  </span>
                ) : currentUser.hrmRole === 'truong_nhom_cnb' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                    <UserCheck className="w-3 h-3" /> Trưởng nhóm C&amp;B
                  </span>
                ) : currentUser.hrmRole === 'truong_nhom_tuyen_dung' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded">
                    <UserCheck className="w-3 h-3" /> TN Tuyển dụng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                    <UserCheck className="w-3 h-3" /> NV Tuyển dụng
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};
