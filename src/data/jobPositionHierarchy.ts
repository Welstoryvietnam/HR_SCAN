import { CongViecNode } from '../types';

/**
 * Danh mục chuẩn Hệ thống Công việc và Chức vụ tương ứng theo dữ liệu hình ảnh:
 * Công việc -> Danh sách Chức vụ
 */
export const DEFAULT_JOB_POSITIONS: CongViecNode[] = [
  {
    id: 'cv_ban_hang',
    name: 'Bán Hàng',
    chucVus: [
      'Cửa Hàng Trưởng',
      'Nhân Viên',
    ],
  },
  {
    id: 'cv_bep_phu',
    name: 'Bếp Phụ',
    chucVus: [
      'Bếp Phụ',
    ],
  },
  {
    id: 'cv_coffee_shop',
    name: 'Coffee Shop',
    chucVus: [
      'Cửa Hàng Trưởng',
      'Nhân Viên',
    ],
  },
  {
    id: 'cv_dau_bep',
    name: 'Đầu Bếp',
    chucVus: [
      'Bếp Chính',
      'Bếp Chính Âu',
      'Bếp Chính Hàn',
      'Bếp Chính Trung',
      'Bếp Trưởng',
      'Bếp Trưởng Hàn',
      'Phó Bếp Trưởng',
      'Phó Bếp Trưởng Âu',
      'Phó Bếp Trưởng Hàn',
      'Phó Bếp Trưởng Trung',
    ],
  },
  {
    id: 'cv_dinh_duong_vien',
    name: 'Dinh Dưỡng Viên',
    chucVus: [
      'DDV I',
      'DDV II',
      'DDV III',
      'DDV IV',
    ],
  },
  {
    id: 'cv_giam_sat_bep',
    name: 'Giám Sát Bếp',
    chucVus: [
      'GS II',
      'GS III',
      'GS IV',
    ],
  },
  {
    id: 'cv_quan_ly',
    name: 'Quản Lý & Điều Hành',
    chucVus: [
      'Trưởng phòng',
      'Giám đốc',
      'Phó Tổng Giám đốc',
      'Quản lý vùng',
    ],
  },
];

/**
 * Tìm kiếm công việc dựa theo tên chức vụ (để hỗ trợ tự động điền khi AI trích xuất chức vụ)
 */
export function findJobByPosition(chucVuName: string): string | undefined {
  if (!chucVuName) return undefined;
  const clean = chucVuName.trim().toLowerCase();
  for (const job of DEFAULT_JOB_POSITIONS) {
    if (job.chucVus.some((cv) => cv.toLowerCase() === clean || clean.includes(cv.toLowerCase()))) {
      return job.name;
    }
  }
  return undefined;
}
