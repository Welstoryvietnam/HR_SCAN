export interface MBO {
  id: string;
  employeeId: string;
  title: string; // What (Mục tiêu) / 무엇을(목표)
  what?: string; // What (Mục tiêu) / 무엇을(목표)
  how?: string; // How (Phương án thực hiện) / 어떻게(세부실천사항)
  description?: string;
  criteria?: string; // 어떤기준으로(Tiêu chí đánh giá) / 어떤기준으로(평가기준)
  target?: string;
  result?: string; // Kết quả / 결과
  completionRate?: number; // Tỷ lệ hoàn thành (%) (e.g. 90, 94, 106, 67, 100)
  selfAssessment?: number; // 0-100 (compatibility alias)
  weight: number; // Trọng số / 가중치 (e.g. 20, 20, 20, 30, 5, 5)
  score?: number; // Điểm số / 점수 (e.g. 18.0, 18.9, 20.0, 5.0)
  status: 'draft' | 'submitted' | 'approved' | 'completed';
  period: '6-months' | 'annual';
  dueDate?: string; // YYYY-MM-DD
  isPersonalDevelopment?: boolean; // Highlighted row (blue text in template)
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedBy: string; // employeeId
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  progress?: number; // 0 - 100%
  completedAt?: string;
  resultNote?: string;
  createdAt: string;
  updatedAt: string;
  googleCalendarEventId?: string;
  googleCalendarLink?: string;
}

export type NoteCategory = 'work' | 'meeting' | 'reminder' | 'idea' | 'personal';

export interface WorkNote {
  id: string;
  employeeId: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned?: boolean;
  color?: 'amber' | 'emerald' | 'sky' | 'rose' | 'purple' | 'slate';
  tags?: string[];
  relatedTaskId?: string;
  date?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type MealType = 'Bữa Sáng' | 'Bữa Trưa' | 'Bữa Tối' | 'Bữa Đêm';

export interface MealSession {
  id: string;
  mealType: MealType;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "17:00"
  location: string; // e.g. "Bắc Ninh"
  purpose: string; // e.g. "Tuyển dụng các bếp Samsung Yên Phong và các bếp Quế Võ"
  mealsCount: number; // 1
}

export interface Employee {
  employeeCode?:string;
  id: string; // e.g. "2502038104"
  name: string; // e.g. "Nguyễn Văn Hùng"
  department: string; // e.g. "HUMAN RESOURCES"
  phone?: string;
  email?: string;
  avatarColor?: string;
  notes?: string;
  password?: string; // Default password for login
  role?: 'nhan_vien_nhan_su' | 'quan_ly_nhan_su' | 'admin';
}

export interface AuthUser {
  employeeCode?:string;
  id: string;
  name: string;
  role: 'nhan_vien_nhan_su' | 'quan_ly_nhan_su' | 'admin';
  department: string;
  avatarColor?: string;
  phone?: string;
  email?: string;
}

export interface MealRecord {
  date: string; // YYYY-MM-DD
  mealsCount: number; // sum of meals for that date
  sessions?: MealSession[]; // breakdown by meal session (Bữa Trưa, Bữa Tối, Bữa Sáng, Bữa Đêm)
  note?: string; // legacy support
  location?: string; // legacy/summary support
  purpose?: string; // legacy/summary support
}

export interface EmployeeMealData {
  employeeId: string;
  // Map of YYYY-MM-DD to MealRecord
  records: Record<string, MealRecord>;
}

export interface CycleConfig {
  year: number; // e.g. 2026
  month: number; // 1-12, target month where cycle ends on day 25
  startDate: string; // YYYY-MM-26 of month - 1
  endDate: string; // YYYY-MM-25 of month
  label: string; // e.g. "Tháng 10/2026 (26/09/2026 - 25/10/2026)"
}

export interface CycleDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayNum: number; // 1-31
  monthNum: number; // 1-12
  yearNum: number;
  dayOfWeek: number; // 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7
  dayOfWeekLabel: string; // "CN", "T2", "T3", "T4", "T5", "T6", "T7"
  isWeekend: boolean;
  isToday: boolean;
  isFuture: boolean; // true if date > today (future date, cannot check-in)
}

export interface AppSettings {
  mealPrice: number; // default 40000
  companyName: string;
  departmentName: string;
  preparerName: string; // Người lập biểu
  accountantName: string; // Kế toán
  leaderName: string; // Trưởng bộ phận Tuyển dụng
  directorName: string; // Giám đốc duyệt
}

export interface PasswordResetRequest {
  id: string; // unique ID
  employeeId: string;
  employeeName: string;
  newPassword: string;
  reason?: string;
  createdAt: string; // ISO string
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AppNotification {
  id: string;
  type: 'task_progress' | 'task_result' | 'mbo_progress' | 'mbo_result' | 'system';
  title: string;
  message: string;
  employeeId: string;
  employeeName: string;
  department: string;
  targetId: string; // taskId or mboId
  targetTitle: string;
  oldStatus?: string;
  newStatus?: string;
  progress?: number;
  resultNote?: string;
  createdAt: string;
  readBy: string[]; // employeeIds who marked as read
  recipientRoles?: ('admin' | 'quan_ly_nhan_su')[];
  recipientEmails?: string[];
}

export type AppTab = 'meal' | 'mbo' | 'tasks' | 'notes' | 'employees' | 'ai-chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}
