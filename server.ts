import express from "express";
import {accountStore,verifyPassword,createAccountRouter,type Account} from './backend/accountStore.js';
import { createHrmRouter } from './backend/hrm.js';
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { recognizeImage, OCRError } from "./backend/ocrService.js";
import { parseOCRProfile } from "./backend/ocrProfile.js";
import {assistGeminiOCR,geminiOCRCapabilities} from './backend/geminiOCR.js';
import { recordStore, personnelFields, firestoreConfigured, StorageError } from "./backend/recordStore.js";
import { draftStore } from './backend/draftStore.js';
import { normalizeHouseholdMembers } from './src/utils/household.js';
import { createSession, readSession } from "./backend/session.js";
import { DEFAULT_ORGANIZATION_HIERARCHY } from "./src/data/organizationHierarchy.js";

dotenv.config();
if (!process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS = '1';
}

const app = express();
function getListenPort(): number {
  const portArgIdx = process.argv.indexOf("--port");
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const p = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(p) && p > 0) return p;
  }
  return 3000;
}
const PORT = getListenPort();

app.get("/api/health", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ success: true, service: "hr-scan-api", ocrEngine: "tesseract", ocrLanguages: ["vie","eng"] });
});

app.get("/api/storage/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({provider:"firestore",configured:firestoreConfigured(),attachmentsStored:false});
});

// Middleware for parsing large JSON (needed for multimodal Base64 images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Chống lưu cache trên trình duyệt cho tất cả các API route
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
  }
  next();
});

// -------------------------------------------------------------
// DỮ LIỆU BẢNG TÍNH MÔ PHỎNG (SHEETS IN-MEMORY DATABASE)
// -------------------------------------------------------------

// Danh sách Email Quản trị viên mặc định
const adminEmails = new Set<string>([
  "Happyendpu@gmail.com".toLowerCase(),
  "admin@congty.com",
  "hr.manager@workspace.vn",
  "tranvanthang@gmail.com".toLowerCase(),
  "tranvanthang@congty.com".toLowerCase(),
  "thangtv@congty.com".toLowerCase(),
  "thang.tran@congty.com".toLowerCase(),
]);

// Cấu trúc tài khoản hệ thống (Admin & Nhân viên tuyển dụng)
interface SystemAccount extends Account {
  id: string;
  username: string;
  password?: string;
  email: string;
  fullName: string;
  role: "admin" | "employee";
  status: "active" | "locked";
  createdAt: string;
  lastLogin?: string;
}

// Cơ sở dữ liệu tài khoản người dùng được khởi tạo và lưu trữ trên hệ thống
let userAccounts: SystemAccount[] = [
  {
    id: "usr_admin_01",
    username: "admin",
    password: "admin123",
    email: "Happyendpu@gmail.com".toLowerCase(),
    fullName: "Quản Trị Viên Hệ Thống",
    role: "admin",
    status: "active",
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "usr_admin_thang",
    username: "tranvanthang",
    password: "admin123",
    email: "tranvanthang@congty.com".toLowerCase(),
    fullName: "Trần Văn Thắng (Quản Trị Viên)",
    role: "admin",
    status: "active",
    createdAt: "2026-09-05T08:00:00.000Z",
  },
  {
    id: "usr_recruiter_01",
    username: "tuyendung",
    password: "tuyendung123",
    email: "tuyendung@congty.com".toLowerCase(),
    fullName: "Nguyễn Thu Hà (Tuyển Dụng)",
    role: "employee",
    status: "active",
    createdAt: "2026-09-10T08:00:00.000Z",
  },
  {
    id: "usr_recruiter_02",
    username: "hr_mai",
    password: "123456",
    email: "mai.tran@congty.com".toLowerCase(),
    fullName: "Trần Thị Mai (Chuyên viên Nhân sự)",
    role: "employee",
    status: "active",
    createdAt: "2026-09-15T08:00:00.000Z",
  },
];
let cloudAccountsEnabled=false;
const syncAccounts=async()=>{
  const loaded=await accountStore.load(userAccounts);userAccounts=loaded.accounts.map(a=>({...a}));cloudAccountsEnabled=loaded.enabled;
  if(cloudAccountsEnabled){adminEmails.clear();for(const user of userAccounts)if(user.role==='admin'&&user.status==='active')adminEmails.add(user.email.toLowerCase());}
};

// Bộ nhớ đệm lưu mã đặt lại mật khẩu gửi qua email: email -> { code, expires }
const resetPasswordTokens = new Map<string, { code: string; expires: number }>();

// Danh mục chuẩn Công việc và Chức vụ theo dữ liệu hình ảnh
const jobPositionsHierarchy = [
  {
    id: "cv_ban_hang",
    name: "Bán Hàng",
    chucVus: ["Cửa Hàng Trưởng", "Nhân Viên"],
  },
  {
    id: "cv_bep_phu",
    name: "Bếp Phụ",
    chucVus: ["Bếp Phụ"],
  },
  {
    id: "cv_coffee_shop",
    name: "Coffee Shop",
    chucVus: ["Cửa Hàng Trưởng", "Nhân Viên"],
  },
  {
    id: "cv_dau_bep",
    name: "Đầu Bếp",
    chucVus: [
      "Bếp Chính",
      "Bếp Chính Âu",
      "Bếp Chính Hàn",
      "Bếp Chính Trung",
      "Bếp Trưởng",
      "Bếp Trưởng Hàn",
      "Phó Bếp Trưởng",
      "Phó Bếp Trưởng Âu",
      "Phó Bếp Trưởng Hàn",
      "Phó Bếp Trưởng Trung",
    ],
  },
  {
    id: "cv_dinh_duong_vien",
    name: "Dinh Dưỡng Viên",
    chucVus: ["DDV I", "DDV II", "DDV III", "DDV IV"],
  },
  {
    id: "cv_giam_sat_bep",
    name: "Giám Sát Bếp",
    chucVus: ["GS II", "GS III", "GS IV"],
  },
];

// Cơ cấu tổ chức Team (Khối) / Group (Ban) / Part (Bộ phận)
let organizationHierarchy = JSON.parse(JSON.stringify(DEFAULT_ORGANIZATION_HIERARCHY));

// Sheet: TieuChuanLuong - Danh mục tiêu chuẩn theo đúng dữ liệu người dùng cung cấp
let tieuChuanLuong = [
  // 1. Bán Hàng
  {
    id: "TCL_BH_01",
    congViec: "Bán Hàng",
    chucVu: "Cửa Hàng Trưởng",
    luongCoBan: 5895000,
    phuCapChucVu: 500000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 1050000,
    moTa: "Quản lý điểm bán hàng và nhân sự bán hàng",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_BH_02",
    congViec: "Bán Hàng",
    chucVu: "Nhân Viên",
    luongCoBan: 5447000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 500000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 0,
    phuCapCoDinh: 850000,
    moTa: "Nhân viên bán hàng trực tiếp tại điểm bán",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },

  // 2. Bếp Phụ
  {
    id: "TCL_BP_01",
    congViec: "Bếp Phụ",
    chucVu: "Bếp Phụ",
    luongCoBan: 4962000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 0,
    phuCapCoDinh: 350000,
    moTa: "Sơ chế nguyên liệu và hỗ trợ công tác bếp",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },

  // 3. Coffee Shop
  {
    id: "TCL_CF_01",
    congViec: "Coffee Shop",
    chucVu: "Cửa Hàng Trưởng",
    luongCoBan: 5895000,
    phuCapChucVu: 500000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 500000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 1550000,
    moTa: "Quản lý cửa hàng cà phê và barista",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_CF_02",
    congViec: "Coffee Shop",
    chucVu: "Nhân Viên",
    luongCoBan: 5447000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 500000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 0,
    phuCapCoDinh: 850000,
    moTa: "Nhân viên phục vụ và pha chế cà phê",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },

  // 4. Đầu Bếp
  {
    id: "TCL_DB_01",
    congViec: "Đầu Bếp",
    chucVu: "Bếp Chính",
    luongCoBan: 5447000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Chế biến và nấu món chính",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_02",
    congViec: "Đầu Bếp",
    chucVu: "Bếp Chính Âu",
    luongCoBan: 5447000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 1750000,
    moTa: "Bếp chính món Âu",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_03",
    congViec: "Đầu Bếp",
    chucVu: "Bếp Chính Hàn",
    luongCoBan: 5447000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 1750000,
    moTa: "Bếp chính món Hàn Quốc",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_04",
    congViec: "Đầu Bếp",
    chucVu: "Bếp Chính Trung",
    luongCoBan: 5447000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 1750000,
    moTa: "Bếp chính món Trung Hoa",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_05",
    congViec: "Đầu Bếp",
    chucVu: "Bếp Trưởng",
    luongCoBan: 7683000,
    phuCapChucVu: 1500000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 500000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 2550000,
    moTa: "Bếp trưởng điều hành hoạt động ẩm thực",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_06",
    congViec: "Đầu Bếp",
    chucVu: "Bếp Trưởng Hàn",
    luongCoBan: 7683000,
    phuCapChucVu: 1500000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 3250000,
    moTa: "Bếp trưởng chuyên sâu món Hàn Quốc",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_07",
    congViec: "Đầu Bếp",
    chucVu: "Phó Bếp Trưởng",
    luongCoBan: 5895000,
    phuCapChucVu: 1000000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 500000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 2050000,
    moTa: "Phó bếp trưởng vận hành bếp",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_08",
    congViec: "Đầu Bếp",
    chucVu: "Phó Bếp Trưởng Âu",
    luongCoBan: 5895000,
    phuCapChucVu: 1000000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 2750000,
    moTa: "Phó bếp trưởng phụ trách món Âu",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_09",
    congViec: "Đầu Bếp",
    chucVu: "Phó Bếp Trưởng Hàn",
    luongCoBan: 5895000,
    phuCapChucVu: 1000000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 2750000,
    moTa: "Phó bếp trưởng phụ trách món Hàn",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DB_10",
    congViec: "Đầu Bếp",
    chucVu: "Phó Bếp Trưởng Trung",
    luongCoBan: 5895000,
    phuCapChucVu: 1000000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 1200000,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 2750000,
    moTa: "Phó bếp trưởng phụ trách món Trung Hoa",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },

  // 5. Dinh Dưỡng Viên
  {
    id: "TCL_DDV_01",
    congViec: "Dinh Dưỡng Viên",
    chucVu: "DDV I",
    luongCoBan: 5895000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Chuyên viên dinh dưỡng bậc I",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DDV_02",
    congViec: "Dinh Dưỡng Viên",
    chucVu: "DDV II",
    luongCoBan: 6389000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Chuyên viên dinh dưỡng bậc II",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DDV_03",
    congViec: "Dinh Dưỡng Viên",
    chucVu: "DDV III",
    luongCoBan: 7166000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Chuyên viên dinh dưỡng bậc III",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_DDV_04",
    congViec: "Dinh Dưỡng Viên",
    chucVu: "DDV IV",
    luongCoBan: 7683000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Chuyên gia dinh dưỡng cao cấp bậc IV",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },

  // 6. Giám Sát Bếp
  {
    id: "TCL_GSB_01",
    congViec: "Giám Sát Bếp",
    chucVu: "GS II",
    luongCoBan: 6389000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Giám sát vận hành bếp bậc II",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_GSB_02",
    congViec: "Giám Sát Bếp",
    chucVu: "GS III",
    luongCoBan: 7166000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Giám sát vận hành bếp bậc III",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_GSB_03",
    congViec: "Giám Sát Bếp",
    chucVu: "GS IV",
    luongCoBan: 7683000,
    phuCapChucVu: 0,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 550000,
    moTa: "Giám sát vận hành bếp bậc IV",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  // 7. Quản Lý & Điều Hành
  {
    id: "TCL_QL_01",
    congViec: "Quản Lý & Điều Hành",
    chucVu: "Trưởng phòng",
    luongCoBan: 20000000,
    phuCapChucVu: 4000000,
    phuCapDienThoai: 500000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 5050000,
    moTa: "Trưởng phòng phụ trách bộ phận/phòng ban nghiệp vụ",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_QL_02",
    congViec: "Quản Lý & Điều Hành",
    chucVu: "Giám đốc",
    luongCoBan: 30000000,
    phuCapChucVu: 5000000,
    phuCapDienThoai: 600000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 6150000,
    moTa: "Giám đốc phụ trách điều hành khối/trung tâm",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_QL_03",
    congViec: "Quản Lý & Điều Hành",
    chucVu: "Phó Tổng Giám đốc",
    luongCoBan: 45000000,
    phuCapChucVu: 6000000,
    phuCapDienThoai: 700000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 7250000,
    moTa: "Phó Tổng Giám đốc điều hành ban lãnh đạo công ty",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "TCL_QL_04",
    congViec: "Quản Lý & Điều Hành",
    chucVu: "Quản lý vùng",
    luongCoBan: 16000000,
    phuCapChucVu: 0,
    phuCapDienThoai: 500000,
    phuCapMoiTruong: "Thủ công",
    phuCapXangXe: "Thủ công",
    anToanVeSinhVien: "Thủ công",
    phuCapKinhDoanh: "Thủ công",
    phuCapNangNhoc: "Thủ công",
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 200000,
    phuCapCoDinh: 1050000,
    moTa: "Quản lý vận hành các đơn vị điểm kinh doanh theo phân vùng",
    capNhatLuc: "2026-09-15T08:00:00.000Z",
  },
];

// Personnel records are stored only in Firestore; no seeded production profiles.
let emailLogs: Array<{
  id: string;
  timestamp: string;
  toEmail: string;
  subject: string;
  htmlContent: string;
  status: "Thành công" | "Thất bại";
}> = [
  {
    id: "mail_init_1",
    timestamp: "2026-09-10T10:00:45.000Z",
    toEmail: "Happyendpu@gmail.com",
    subject: "Xác nhận tiếp nhận hồ sơ nhân sự - LÊ HOÀNG MINH",
    htmlContent: "Thông tin hồ sơ nhân sự của bạn đã được ghi nhận vào hệ thống với Tổng thu nhập dự kiến: 32.000.000 VNĐ.",
    status: "Thành công"
  }
];

// Hàm tìm lương tiêu chuẩn theo chức vụ và công việc
function timLuongTheoChucVu(chucVu: string, congViec?: string) {
  const normalizedPos = (chucVu || "").toLowerCase().trim();
  const normalizedJob = (congViec || "").toLowerCase().trim();

  // Ưu tiên khớp cả công việc và chức vụ
  let match = tieuChuanLuong.find((t) => {
    const jobMatch = !normalizedJob || t.congViec.toLowerCase() === normalizedJob || normalizedJob.includes(t.congViec.toLowerCase());
    const posMatch = t.chucVu.toLowerCase() === normalizedPos;
    return jobMatch && posMatch;
  });

  if (!match) {
    match = tieuChuanLuong.find(
      (t) =>
        t.chucVu.toLowerCase() === normalizedPos ||
        normalizedPos.includes(t.chucVu.toLowerCase()) ||
        t.chucVu.toLowerCase().includes(normalizedPos)
    );
  }

  if (match) {
    return {
      isStandard: true,
      luongCoBan: match.luongCoBan,
      phuCapCoDinh: match.phuCapCoDinh,
      phuCapChucVu: match.phuCapChucVu || 0,
      phuCapDienThoai: match.phuCapDienThoai || 0,
      troCapTayNghe: match.troCapTayNghe || 0,
      troCapGiaDinh: match.troCapGiaDinh || 150000,
      thuongChuyenCan: match.thuongChuyenCan || 200000,
      thuongSangKien: match.thuongSangKien || 0,
      matchedChucVu: match.chucVu,
      matchedCongViec: match.congViec,
    };
  }

  // Nếu không thuộc danh mục tiêu chuẩn, áp dụng mặc định nhập thủ công
  return {
    isStandard: false,
    luongCoBan: 11000000,
    phuCapCoDinh: 2000000,
    phuCapChucVu: 0,
    phuCapDienThoai: 0,
    troCapTayNghe: 0,
    troCapGiaDinh: 150000,
    thuongChuyenCan: 200000,
    thuongSangKien: 0,
    matchedChucVu: chucVu || "Vị trí nhập thủ công",
    matchedCongViec: congViec || "Công việc khác",
  };
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Persistent personnel data requires a server-verified login, never a client email alone.
const requirePersonnelSession: express.RequestHandler = async (req,res,next) => {
  const token = req.headers.authorization?.replace(/^Bearer /,'') || '';
  const user = readSession(token);
  if(!user){res.status(401).json({success:false,error:'Phiên đăng nhập hết hạn. Vui lòng đăng xuất và đăng nhập lại.'});return;}
  try {await syncAccounts();}catch(error){res.status(error instanceof StorageError?error.status:503).json({success:false,error:error instanceof StorageError?error.message:'Không thể xác thực tài khoản từ cloud. Vui lòng thử lại.'});return;}
  const account = userAccounts.find(item => item.id === user?.id);
  if (!user || !account || account.status !== 'active' || account.email.toLowerCase() !== user.email || account.role !== user.role) {
    res.status(401).json({success:false,error:"Phiên đăng nhập hết hạn. Vui lòng đăng xuất và đăng nhập lại để truy cập hồ sơ."});
    return;
  }
  res.locals.personnelUser = user;
  req.headers['x-user-email'] = user.email;
  next();
};
interface MemoryDraft {
  id: string;
  userEmail: string;
  title: string;
  step: number;
  employeeCount: number;
  documentCount: number;
  timestamp: string;
  version: string;
  revision?: string;
  chunkCount?: number;
  byteLength?: number;
  deleting?: boolean;
  parts: Map<string, string>;
}
const inMemoryDrafts = new Map<string, MemoryDraft>();

const memoryDraftStore = {
  async summaries(email: string) {
    return Array.from(inMemoryDrafts.values())
      .filter(d => d.userEmail === email)
      .map(d => ({
        id: d.id,
        title: d.deleting ? 'Đã đóng bản nháp — cần dọn tài liệu tạm' : d.title || 'Bản nháp tải lên chưa hoàn tất',
        step: d.step || 1,
        employeeCount: d.employeeCount || 0,
        documentCount: d.documentCount || 0,
        timestamp: d.timestamp,
        version: d.version,
        ready: Boolean(d.revision) && !d.deleting,
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  async stage(email: string, input: any) {
    const count = input.chunkCount;
    if (!Number.isInteger(count) || count < 1 || count > 128 || !Number.isInteger(input.byteLength) || input.byteLength < 1 || input.byteLength > 16 * 1024 * 1024) {
      throw new StorageError('Bản nháp vượt giới hạn 16 MB. Hãy giảm dung lượng hoặc chia nhỏ đợt nhập.', 400);
    }
    const revision = randomUUID();
    const id = input.id || `draft_${randomUUID()}`;
    let draft = inMemoryDrafts.get(id);
    if (draft) {
      if (input.version && draft.version !== input.version) {
        throw new StorageError('Bản nháp đã thay đổi trên thiết bị khác. Hãy mở lại bản nháp trước khi lưu tiếp.', 409);
      }
    } else {
      draft = {
        id,
        userEmail: email,
        title: 'Bản nháp tải lên chưa hoàn tất',
        step: 1,
        employeeCount: 0,
        documentCount: 0,
        timestamp: new Date().toISOString(),
        version: new Date().toISOString(),
        parts: new Map(),
      };
      inMemoryDrafts.set(id, draft);
    }
    draft.revision = revision;
    draft.chunkCount = count;
    draft.byteLength = input.byteLength;
    return { id, revision, version: draft.version, chunkCount: count, byteLength: input.byteLength };
  },
  async putPart(email: string, id: string, revision: string, index: number, content: string) {
    const draft = inMemoryDrafts.get(id);
    if (!draft || draft.userEmail !== email) throw new StorageError('Không tìm thấy bản nháp của tài khoản này.', 404);
    if (draft.revision !== revision) throw new StorageError('Phần tải lên không thuộc phiên bản đang xử lý.', 409);
    const key = `${revision}_${index}`;
    const existing = draft.parts.get(key);
    if (existing && existing !== content) throw new StorageError('Phần bản nháp đã tồn tại với nội dung khác.', 409);
    draft.parts.set(key, content);
    return { index, revision };
  },
  async finish(email: string, id: string, revision: string, version?: string) {
    const draft = inMemoryDrafts.get(id);
    if (!draft || draft.userEmail !== email) throw new StorageError('Không tìm thấy bản nháp của tài khoản này.', 404);
    if (version && draft.version !== version) throw new StorageError('Bản nháp đã thay đổi trên thiết bị khác. Hãy mở lại bản nháp trước khi lưu tiếp.', 409);
    if (draft.revision !== revision) throw new StorageError('Bản nháp đã thay đổi trên thiết bị khác.', 409);
    let fullContent = '';
    for (let i = 0; i < (draft.chunkCount || 0); i++) {
      const part = draft.parts.get(`${draft.revision}_${i}`);
      if (part === undefined) throw new StorageError('Thiếu phần bản nháp.', 400);
      fullContent += part;
    }
    try {
      const snapshot = JSON.parse(fullContent);
      draft.title = snapshot.employees?.[0]?.hoVaTen || 'Bản nháp tiếp nhận';
      draft.step = snapshot.step || 1;
      draft.employeeCount = snapshot.employees?.length || 0;
      draft.documentCount = snapshot.groups?.reduce((sum: number, g: any) => sum + (g.documents?.length || 0), 0) || 0;
    } catch {
      draft.title = 'Bản nháp tiếp nhận';
    }
    draft.timestamp = new Date().toISOString();
    draft.version = new Date().toISOString();
    return { id, title: draft.title, step: draft.step, employeeCount: draft.employeeCount, documentCount: draft.documentCount, timestamp: draft.timestamp, version: draft.version, chunkCount: draft.chunkCount, byteLength: draft.byteLength, revision: draft.revision };
  },
  async open(email: string, id: string) {
    const draft = inMemoryDrafts.get(id);
    if (!draft || draft.userEmail !== email) throw new StorageError('Không tìm thấy bản nháp của tài khoản này.', 404);
    return { id, title: draft.title, step: draft.step, employeeCount: draft.employeeCount, documentCount: draft.documentCount, timestamp: draft.timestamp, version: draft.version, chunkCount: draft.chunkCount, byteLength: draft.byteLength, revision: draft.revision };
  },
  async part(email: string, id: string, revision: string, index: number) {
    const draft = inMemoryDrafts.get(id);
    if (!draft || draft.userEmail !== email) throw new StorageError('Không tìm thấy bản nháp của tài khoản này.', 404);
    const part = draft.parts.get(`${revision}_${index}`);
    if (part === undefined) throw new StorageError('Không tìm thấy phần bản nháp.', 404);
    return part;
  },
  async discard(email: string, id: string, _version?: string) {
    const draft = inMemoryDrafts.get(id);
    if (!draft || draft.userEmail !== email) throw new StorageError('Không tìm thấy bản nháp của tài khoản này.', 404);
    inMemoryDrafts.delete(id);
    return { success: true };
  }
};

const getDraftStore = () => firestoreConfigured() ? draftStore : memoryDraftStore;

app.use('/api/hrm',requirePersonnelSession,createHrmRouter(()=>userAccounts));
app.use('/api/drafts',requirePersonnelSession,(_req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  next();
});
const draftRoute = (handler: (req: express.Request,email: string) => Promise<any>): express.RequestHandler => async (req,res) => {
  try { res.json({success:true,data:await handler(req,res.locals.personnelUser.email)}); }
  catch (error) { res.status(error instanceof StorageError ? error.status : 500).json({success:false,error:error instanceof StorageError ? error.message : 'Không thể đồng bộ bản nháp. Vui lòng thử lại.'}); }
};
app.get('/api/drafts',draftRoute((_req,email) => getDraftStore().summaries(email)));
app.post('/api/drafts/stage',draftRoute((req,email) => getDraftStore().stage(email,req.body)));
app.put('/api/drafts/:id/parts/:revision/:index',draftRoute((req,email) => getDraftStore().putPart(email,String(req.params.id),String(req.params.revision),Number(req.params.index),req.body.content)));
app.post('/api/drafts/:id/finish',draftRoute((req,email) => getDraftStore().finish(email,String(req.params.id),req.body.revision,req.body.version)));
app.get('/api/drafts/:id',draftRoute((req,email) => getDraftStore().open(email,String(req.params.id))));
app.get('/api/drafts/:id/parts/:revision/:index',draftRoute((req,email) => getDraftStore().part(email,String(req.params.id),String(req.params.revision),Number(req.params.index))));
app.delete('/api/drafts/:id',draftRoute((req,email) => getDraftStore().discard(email,String(req.params.id),req.body.version)));
app.use(['/api/admin','/api/settings'],requirePersonnelSession,(_req,res,next) => {
  if (res.locals.personnelUser.role !== 'admin') {res.status(403).json({success:false,error:'Chỉ Quản trị viên mới có quyền thực hiện thao tác này.'});return;}
  next();
});

const cloudAccountRouter=createAccountRouter(()=>userAccounts);
app.use('/api/admin/users',(req,res,next)=>cloudAccountsEnabled?cloudAccountRouter(req,res,next):next());

// Kiểm tra thông tin người dùng và phân quyền
app.get("/api/auth/me", requirePersonnelSession, async (req, res) => {
  try {await syncAccounts();}catch{res.status(503).json({error:'Không tải được tài khoản.'});return;}
  const clientEmail = ((req.headers["x-user-email"] as string) || "Happyendpu@gmail.com").toLowerCase().trim();
  const matchedUser = userAccounts.find(
    (u) => u.email.toLowerCase() === clientEmail || u.username.toLowerCase() === clientEmail
  );

  const isAdmin = matchedUser ? matchedUser.role === "admin" : adminEmails.has(clientEmail);

  res.json({
    id: matchedUser?.id || "usr_default",
    username: matchedUser?.username || clientEmail.split("@")[0],
    email: matchedUser?.email || clientEmail,
    name: matchedUser?.fullName || clientEmail.split("@")[0].toUpperCase(),
    role: isAdmin ? "admin" : "employee",
    displayName: isAdmin ? "Quản trị viên (Toàn quyền)" : "Nhân viên tuyển dụng",
    isAdmin,
  });
});

// Đăng nhập hệ thống bằng Tên Đăng Nhập hoặc Email và Mật Khẩu
app.post("/api/auth/login", async (req, res) => {
  try {
    await syncAccounts();
    const { username, email, password } = req.body;
    const loginIdentifier = (username || email || "").toString().trim().toLowerCase();

    if (!loginIdentifier) {
      return res.status(400).json({ error: "Vui lòng nhập Tên đăng nhập hoặc Email." });
    }
    if (!password) {
      return res.status(400).json({ error: "Vui lòng nhập Mật khẩu đã được cấp." });
    }

    // Tra cứu tài khoản theo username hoặc email
    const account = userAccounts.find(
      (u) =>
        u.username.toLowerCase() === loginIdentifier ||
        u.email.toLowerCase() === loginIdentifier || u.contactEmail?.toLowerCase() === loginIdentifier
    );

    if (!account) {
      return res.status(401).json({
        error: `Tài khoản "${loginIdentifier}" không tồn tại. Vui lòng liên hệ Quản trị viên (Admin) để được tạo và cấp quyền tài khoản.`,
      });
    }

    if (account.status === "locked") {
      return res.status(403).json({
        error: "Tài khoản này đang bị khóa tạm thời. Vui lòng liên hệ Quản trị viên để mở khóa.",
      });
    }

    if (!verifyPassword(account,String(password))) {
      return res.status(401).json({
        error: "Mật khẩu không chính xác. Nếu quên mật khẩu, vui lòng sử dụng chức năng 'Quên mật khẩu' để đổi mật khẩu qua email.",
      });
    }

    // Đăng nhập thành công -> Cập nhật thời điểm đăng nhập gần nhất
    account.lastLogin = new Date().toISOString();
    const isAdmin = account.role === "admin" || adminEmails.has(account.email.toLowerCase());

    const user = {
      id: account.id,
      username: account.username,
      email: account.email,
      name: account.fullName,
      role: account.role,
      displayName: isAdmin ? "Quản trị viên (Toàn quyền)" : "Nhân viên tuyển dụng",
      employeeCode:account.employeeCode,
      department:account.department,
      hrmRole:account.hrmRole,
      contactEmail:account.contactEmail,
      sessionToken: createSession({id:account.id,email:account.email,role:account.role}),
    };

    res.json({
      success: true,
      message: `Đăng nhập thành công với vai trò ${user.displayName}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Yêu cầu đặt lại mật khẩu khi quên mật khẩu qua Email (Mô phỏng gửi qua MailApp)
app.post("/api/auth/forgot-password", (req, res) => {
  if (firestoreConfigured()) {
    res.status(503).json({success:false,error:'Gửi mã đổi mật khẩu qua email chưa được cấu hình. Vui lòng liên hệ Quản trị viên.'});
    return;
  }
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Vui lòng nhập địa chỉ Email đăng ký tài khoản." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const account = userAccounts.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!account) {
      return res.status(404).json({
        error: `Không tìm thấy tài khoản nhân viên nào liên kết với email "${cleanEmail}". Vui lòng kiểm tra lại hoặc liên hệ Quản trị viên.`,
      });
    }

    // Tạo mã xác nhận 6 số ngẫu nhiên
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    resetPasswordTokens.set(cleanEmail, {
      code: resetCode,
      expires: Date.now() + 15 * 60 * 1000, // Hiệu lực 15 phút
    });

    // Tạo bản ghi email trong hộp thư MailApp
    const timestamp = new Date().toISOString();
    const subject = `[HR Automator] Mã xác nhận đặt lại mật khẩu cho tài khoản ${account.username}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #1e3a8a; margin-top: 0;">YÊU CẦU ĐẶT LẠI MẬT KHẨU TÀI KHOẢN</h3>
        <p>Kính gửi <strong>${account.fullName}</strong>,</p>
        <p>Bạn (hoặc ai đó) vừa yêu cầu cấp lại mật khẩu cho tài khoản có Tên đăng nhập: <strong>${account.username}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; text-align: center; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">MÃ XÁC NHẬN BẢO MẬT (6 CHỮ SỐ):</p>
          <p style="margin: 8px 0; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${resetCode}</p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">Mã có hiệu lực trong 15 phút. Tuyệt đối không cung cấp mã này cho người khác.</p>
        </div>
        <p style="font-size: 12px; color: #64748b;">Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email.</p>
      </div>
    `;

    emailLogs.unshift({
      id: `mail_reset_${Date.now()}`,
      timestamp,
      toEmail: cleanEmail,
      subject,
      htmlContent,
      status: "Thành công",
    });

    res.json({
      success: true,
      message: `Đã gửi mã xác nhận 6 số đến email ${cleanEmail}. Vui lòng kiểm tra hộp thư email để lấy mã xác nhận.`,
      simulatedCode: resetCode, // Tiện ích hỗ trợ người dùng test ngay nếu không mở hòm thư
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Xác nhận đặt lại mật khẩu mới
app.post("/api/auth/reset-password", (req, res) => {
  if (firestoreConfigured()) {
    res.status(503).json({success:false,error:'Gửi mã đổi mật khẩu qua email chưa được cấu hình. Vui lòng liên hệ Quản trị viên.'});
    return;
  }
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ Email, Mã xác nhận và Mật khẩu mới." });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const tokenInfo = resetPasswordTokens.get(cleanEmail);

    if (!tokenInfo) {
      return res.status(400).json({ error: "Chưa có yêu cầu đặt lại mật khẩu cho email này, hoặc mã đã hết hạn. Vui lòng yêu cầu lại." });
    }

    if (Date.now() > tokenInfo.expires) {
      resetPasswordTokens.delete(cleanEmail);
      return res.status(400).json({ error: "Mã xác nhận đã hết hạn (quá 15 phút). Vui lòng gửi lại yêu cầu mới." });
    }

    if (tokenInfo.code !== String(code).trim()) {
      return res.status(400).json({ error: "Mã xác nhận không chính xác. Vui lòng kiểm tra lại trong email." });
    }

    const account = userAccounts.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!account) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản nhân viên tương ứng." });
    }

    account.password = String(newPassword);
    resetPasswordTokens.delete(cleanEmail);

    res.json({
      success: true,
      message: `Đặt lại mật khẩu thành công cho tài khoản "${account.username}"! Bạn có thể dùng mật khẩu mới để đăng nhập ngay bây giờ.`,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -------------------------------------------------------------
// QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG BỞI QUẢN TRỊ VIÊN (ADMIN)
// -------------------------------------------------------------

// Lấy danh sách toàn bộ tài khoản hệ thống (Dành cho Admin)
app.get("/api/admin/users", (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    if (!adminEmails.has(userEmail)) {
      return res.status(403).json({ error: "Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem danh sách tài khoản." });
    }

    // Trả về danh sách tài khoản với mật khẩu hiển thị tiện cho Admin quản trị
    const safeAccounts = userAccounts.map((u) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }));

    res.json({ success: true, users: safeAccounts });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Quản trị viên tạo tài khoản mới cho nhân viên
app.post("/api/admin/users", (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    if (!adminEmails.has(userEmail)) {
      return res.status(403).json({ error: "Từ chối truy cập: Chỉ Quản trị viên mới có quyền tạo tài khoản cho nhân viên." });
    }

    const { username, password, email, fullName, role = "employee" } = req.body;

    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ: Tên đăng nhập, Mật khẩu, Email và Họ tên nhân viên." });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Tên đăng nhập phải có ít nhất 3 ký tự." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return res.status(400).json({ error: "Địa chỉ Email không đúng định dạng." });
    }

    // Kiểm tra trùng lặp Tên đăng nhập
    if (userAccounts.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: `Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên khác.` });
    }

    // Kiểm tra trùng lặp Email
    if (userAccounts.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: `Email "${cleanEmail}" đã được liên kết với một tài khoản khác.` });
    }

    const newAccount: SystemAccount = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      password: String(password),
      email: cleanEmail,
      fullName: String(fullName).trim(),
      role: role === "admin" ? "admin" : "employee",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    userAccounts.push(newAccount);

    if (newAccount.role === "admin") {
      adminEmails.add(cleanEmail);
    }

    // Gửi email thông báo cấp tài khoản qua MailApp
    const emailSubject = `[HR Document AI] Bạn đã được cấp tài khoản hệ thống`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #1e3a8a; margin-top: 0;">THÔNG BÁO CẤP TÀI KHOẢN NHÂN SỰ</h3>
        <p>Kính gửi <strong>${newAccount.fullName}</strong>,</p>
        <p>Quản trị viên đã phê duyệt và cấp phát tài khoản sử dụng Hệ thống Tự động hóa Tuyển dụng & Quản trị Nhân sự AI:</p>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;">Tên đăng nhập: <strong style="color: #1e40af;">${newAccount.username}</strong></p>
          <p style="margin: 4px 0;">Mật khẩu khởi tạo: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${newAccount.password}</code></p>
          <p style="margin: 4px 0;">Email đăng ký: <strong>${newAccount.email}</strong></p>
          <p style="margin: 4px 0;">Vai trò: <strong>${newAccount.role === "admin" ? "Quản trị viên" : "Nhân viên tuyển dụng"}</strong></p>
        </div>
        <p style="font-size: 13px; color: #64748b;">Bạn có thể dùng Tên đăng nhập và Mật khẩu này để đăng nhập vào hệ thống. Trong trường hợp quên mật khẩu, bạn có thể tự đổi mật khẩu qua Email đăng ký.</p>
      </div>
    `;

    emailLogs.unshift({
      id: `mail_acc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      toEmail: cleanEmail,
      subject: emailSubject,
      htmlContent: emailHtml,
      status: "Thành công",
    });

    res.json({
      success: true,
      message: `Đã tạo và cấp tài khoản thành công cho nhân viên ${newAccount.fullName}.`,
      user: newAccount,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Quản trị viên cập nhật tài khoản (sửa mật khẩu, vai trò, trạng thái khóa)
app.put("/api/admin/users/:id", (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    if (!adminEmails.has(userEmail)) {
      return res.status(403).json({ error: "Từ chối truy cập: Chỉ Quản trị viên mới có quyền chỉnh sửa tài khoản." });
    }

    const { id } = req.params;
    const account = userAccounts.find((u) => u.id === id);

    if (!account) {
      return res.status(404).json({ error: `Không tìm thấy tài khoản với mã: ${id}` });
    }

    const { fullName, email, password, role, status } = req.body;

    if (fullName) account.fullName = String(fullName).trim();
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      // Kiểm tra trùng email với tài khoản khác
      if (userAccounts.some((u) => u.id !== id && u.email.toLowerCase() === cleanEmail)) {
        return res.status(400).json({ error: `Email "${cleanEmail}" đã được sử dụng bởi tài khoản khác.` });
      }
      account.email = cleanEmail;
    }

    if (password && String(password).length >= 6) {
      account.password = String(password);
    }

    if (role === "admin" || role === "employee") {
      account.role = role;
      if (role === "admin") {
        adminEmails.add(account.email.toLowerCase());
      } else {
        // Chỉ xóa khỏi adminEmails nếu không phải email cố định
        if (account.email.toLowerCase() !== "happyendpu@gmail.com") {
          adminEmails.delete(account.email.toLowerCase());
        }
      }
    }

    if (status === "active" || status === "locked") {
      account.status = status;
    }

    res.json({
      success: true,
      message: `Cập nhật tài khoản "${account.username}" thành công.`,
      user: account,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Quản trị viên xóa tài khoản
app.delete("/api/admin/users/:id", (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    if (!adminEmails.has(userEmail)) {
      return res.status(403).json({ error: "Từ chối truy cập: Chỉ Quản trị viên mới có quyền xóa tài khoản." });
    }

    const { id } = req.params;
    const account = userAccounts.find((u) => u.id === id);

    if (!account) {
      return res.status(404).json({ error: `Không tìm thấy tài khoản với mã: ${id}` });
    }

    // Không cho phép xóa tài khoản của chính mình đang đăng nhập
    if (account.email.toLowerCase() === userEmail) {
      return res.status(400).json({ error: "Không thể tự xóa tài khoản của chính bạn đang đăng nhập." });
    }

    userAccounts = userAccounts.filter((u) => u.id !== id);
    if (account.role === "admin") {
      adminEmails.delete(account.email.toLowerCase());
    }

    res.json({
      success: true,
      message: `Đã xóa tài khoản "${account.username}" thành công.`,
      remaining: userAccounts.length,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Lấy danh sách quản trị viên
app.get("/api/settings/admins", (req, res) => {
  res.json({
    admins: Array.from(adminEmails),
  });
});

// Cấu trúc phân cấp phòng ban: Khối > Ban > Phòng theo dữ liệu hình ảnh thực tế
app.get("/api/organization/hierarchy", (req, res) => {
  const hierarchy = [
    {
      id: "khoi_fd_management",
      name: "FD MANAGEMENT",
      bans: [
        {
          id: "ban_fd_sales_marketing",
          name: "FD SALES & MARKETING",
          phongs: [{ id: "p_fd_sales_mkt", name: "FD SALES & MARKETING" }],
        },
        {
          id: "ban_fd_support",
          name: "FD SUPPORT",
          phongs: [{ id: "p_fd_support", name: "FD SUPPORT" }],
        },
        {
          id: "ban_global_trading",
          name: "GLOBAL TRADING",
          phongs: [{ id: "p_trading", name: "TRADING" }],
        },
        {
          id: "ban_logistics",
          name: "LOGISTICS",
          phongs: [{ id: "p_logistics", name: "LOGISTICS" }],
        },
        {
          id: "ban_purchase",
          name: "PURCHASE",
          phongs: [
            { id: "p_purchasing1", name: "PURCHASING1" },
            { id: "p_purchasing2", name: "PURCHASING2" },
          ],
        },
        {
          id: "ban_qa",
          name: "QA",
          phongs: [{ id: "p_qa", name: "QA" }],
        },
      ],
    },
    {
      id: "khoi_fs_business_support",
      name: "FS BUSINESS SUPPORT",
      bans: [
        {
          id: "ban_business_planning",
          name: "BUSINESS PLANNING",
          phongs: [{ id: "p_business_planning", name: "BUSINESS PLANNING" }],
        },
        {
          id: "ban_hygienics_safety",
          name: "HYGIENICS & SAFETY",
          phongs: [{ id: "p_hygienics_safety", name: "HYGIENICS & SAFETY" }],
        },
        {
          id: "ban_infra_innovation",
          name: "INFRA INNOVATION",
          phongs: [
            { id: "p_design", name: "DESIGN" },
            { id: "p_infra", name: "INFRA" },
          ],
        },
        {
          id: "ban_operation_support",
          name: "OPERATION SUPPORT",
          phongs: [{ id: "p_operation_support", name: "OPERATION SUPPORT" }],
        },
        {
          id: "ban_product_planning",
          name: "PRODUCT PLANNING",
          phongs: [
            { id: "p_bmi", name: "BMI" },
            { id: "p_culinary_academy", name: "CULINARY ACADEMY" },
            { id: "p_korean_menu", name: "KOREAN MENU" },
            { id: "p_logistics_canteen", name: "LOGISTICS CANTEEN" },
            { id: "p_mc_bacninh", name: "MC-BACNINH" },
            { id: "p_offering_innovation", name: "OFFERING INNOVATION" },
          ],
        },
      ],
    },
    {
      id: "khoi_fs_management",
      name: "FS MANAGEMENT",
      bans: [
        {
          id: "ban_customer_experience",
          name: "CUSTOMER EXPERIENCE",
          phongs: [{ id: "p_customer_experience", name: "CUSTOMER EXPERIENCE" }],
        },
        {
          id: "ban_fs_management",
          name: "FS MANAGEMENT",
          phongs: [{ id: "p_fs_management", name: "FS MANAGEMENT" }],
        },
        {
          id: "ban_fs1",
          name: "FS1",
          phongs: [
            { id: "p_cafe_semv", name: "CAFE_SEMV" },
            { id: "p_cafe_sev1", name: "CAFE_SEV1" },
            { id: "p_cafe_sev2", name: "CAFE_SEV2" },
            { id: "p_cafe_sevt2", name: "CAFE_SEVT2" },
            { id: "p_cafe_sevt4", name: "CAFE_SEVT4" },
            { id: "p_fs1", name: "FS1" },
            { id: "p_qh_sdi", name: "QH_SDI" },
            { id: "p_qh_sdv", name: "QH_SDV" },
            { id: "p_qh_sev1", name: "QH_SEV1" },
            { id: "p_qh_sev2", name: "QH_SEV2" },
            { id: "p_qh_sevt2", name: "QH_SEVT2" },
            { id: "p_qh_sevt4", name: "QH_SEVT4" },
            { id: "p_rd_hanoi", name: "R&D HANOI" },
            { id: "p_sdi", name: "SDI" },
            { id: "p_sdv", name: "SDV" },
            { id: "p_sdv_v3", name: "SDV V3" },
            { id: "p_semv", name: "SEMV" },
            { id: "p_sev1", name: "SEV1" },
            { id: "p_sev2", name: "SEV2" },
            { id: "p_sevt2", name: "SEVT2" },
            { id: "p_sevt4", name: "SEVT4" },
          ],
        },
        {
          id: "ban_fs2",
          name: "FS2",
          phongs: [
            { id: "p_cresyn", name: "CRESYN" },
            { id: "p_dreamtech1", name: "DREAMTECH1" },
            { id: "p_dreamtech2", name: "DREAMTECH2" },
            { id: "p_fs2", name: "FS2" },
            { id: "p_jaeyoung_vina", name: "JAEYOUNG VINA" },
            { id: "p_jinsung_hitec", name: "JINSUNG HITEC" },
            { id: "p_kefico", name: "KEFICO" },
            { id: "p_landmark_brico", name: "LANDMARK BRICO" },
            { id: "p_lotte_hotel", name: "LOTTE-HOTEL" },
            { id: "p_lotte_shopping_mall", name: "LOTTE-SHOPPING MALL" },
            { id: "p_nexcon", name: "NEXCON" },
            { id: "p_qh_cresyn", name: "QH_CRESYN" },
            { id: "p_qh_dreamtech2", name: "QH_DREAMTECH2" },
            { id: "p_qh_dreamtech3", name: "QH_DREAMTECH3" },
            { id: "p_regent2_canteen2", name: "REGENT2(CANTEEN2)" },
            { id: "p_regent2_canteen3", name: "REGENT2(CANTEEN3)" },
            { id: "p_star_fashion_2", name: "STAR FASHION 2" },
            { id: "p_taixin2", name: "TAIXIN2" },
            { id: "p_valueplus", name: "VALUEPLUS" },
            { id: "p_wisol_hanoi", name: "WISOL HANOI" },
          ],
        },
        {
          id: "ban_fs3",
          name: "FS3",
          phongs: [
            { id: "p_almus_tech", name: "ALMUS TECH" },
            { id: "p_cafe_hansol", name: "CAFE_HANSOL" },
            { id: "p_fpt_duytan", name: "FPT DUYTAN" },
            { id: "p_fpt_fv3", name: "FPT FV3" },
            { id: "p_fpt_hanoi", name: "FPT HANOI" },
            { id: "p_fpt_tower", name: "FPT TOWER" },
            { id: "p_fs3", name: "FS3" },
            { id: "p_hansol", name: "HANSOL" },
            { id: "p_itm", name: "ITM" },
            { id: "p_kespion", name: "KESPION" },
            { id: "p_kyocera_avx2", name: "KYOCERA AVX2" },
            { id: "p_lotte_residence", name: "LOTTE RESIDENCE" },
            { id: "p_mc_electronics_vina", name: "M&C ELECTRONICS VINA" },
            { id: "p_magtron", name: "MAGTRON" },
            { id: "p_mobase", name: "MOBASE" },
            { id: "p_mobase2", name: "MOBASE2" },
            { id: "p_orion", name: "ORION" },
            { id: "p_qh_almus_tech", name: "QH_ALMUS TECH" },
            { id: "p_qh_hansol", name: "QH_HANSOL" },
            { id: "p_qh_itm_2", name: "QH_ITM 2" },
            { id: "p_qh_sj_tech", name: "QH_SJ TECH" },
            { id: "p_shinwoo_global", name: "SHINWOO GLOBAL" },
            { id: "p_sj_tech", name: "SJ TECH" },
          ],
        },
        {
          id: "ban_fs4",
          name: "FS4",
          phongs: [
            { id: "p_cammsys", name: "CAMMSYS" },
            { id: "p_fs4", name: "FS4" },
            { id: "p_hyunwoo_vina", name: "HYUNWOO VINA" },
            { id: "p_isc_vina", name: "ISC VINA" },
            { id: "p_kci", name: "KCI" },
            { id: "p_ls_electric", name: "LS ELECTRIC" },
            { id: "p_namuga", name: "NAMUGA" },
            { id: "p_newflex", name: "NEWFLEX" },
            { id: "p_qh_cammsys", name: "QH_CAMMSYS" },
            { id: "p_qh_namuga", name: "QH_NAMUGA" },
            { id: "p_qh_newflex", name: "QH_NEWFLEX" },
            { id: "p_qh_shinwon", name: "QH_SHINWON" },
            { id: "p_qh_uil_b", name: "QH_UIL B" },
            { id: "p_segi", name: "SEGI" },
            { id: "p_shinwon", name: "SHINWON" },
            { id: "p_sunny_optics", name: "SUNNY OPTICS" },
            { id: "p_uil", name: "UIL" },
            { id: "p_uil_b", name: "UIL B" },
          ],
        },
        {
          id: "ban_fs5",
          name: "FS5",
          phongs: [
            { id: "p_aab_plastic", name: "AAB PLASTIC" },
            { id: "p_autonics_vnm", name: "AUTONICS VNM" },
            { id: "p_cu_tech", name: "CU TECH" },
            { id: "p_deli", name: "DELI" },
            { id: "p_fs5", name: "FS5" },
            { id: "p_fusion", name: "FUSION" },
            { id: "p_goldsun", name: "GOLDSUN" },
            { id: "p_kido_vinh", name: "KIDO VINH" },
            { id: "p_komelon", name: "KOMELON" },
            { id: "p_komos", name: "KOMOS" },
            { id: "p_kortek_vina", name: "KORTEK VINA" },
            { id: "p_kyungshin", name: "KYUNGSHIN" },
            { id: "p_neo_silicon", name: "NEO SILICON" },
            { id: "p_qh_kido_vinh", name: "QH_KIDO VINH" },
            { id: "p_qisda", name: "QISDA" },
            { id: "p_regent_5", name: "REGENT 5" },
            { id: "p_sangwoo", name: "SANGWOO" },
            { id: "p_spica", name: "SPICA" },
            { id: "p_sunny_nghe_an", name: "SUNNY NGHE AN" },
            { id: "p_tce", name: "TCE" },
            { id: "p_tce_jeans", name: "TCE JEANS" },
          ],
        },
        {
          id: "ban_hcm_regional_office",
          name: "HCM REGIONAL OFFICE",
          phongs: [
            { id: "p_hansol_hcm", name: "HANSOL HCM" },
            { id: "p_hcm_fs", name: "HCM FS" },
            { id: "p_henkel", name: "HENKEL" },
            { id: "p_orion_hcm", name: "ORION HCM" },
            { id: "p_qh_hansol_hcm", name: "QH_HANSOL HCM" },
            { id: "p_sehc2", name: "SEHC2" },
            { id: "p_tantien_hcm", name: "TANTIEN HCM" },
          ],
        },
      ],
    },
    {
      id: "khoi_general_director",
      name: "GENERAL DIRECTOR",
      bans: [
        {
          id: "ban_management_advisory",
          name: "MANAGEMENT ADVISORY",
          phongs: [{ id: "p_management_advisory", name: "MANAGEMENT ADVISORY" }],
        },
        {
          id: "ban_sales_marketing_1",
          name: "SALES & MARKETING1",
          phongs: [{ id: "p_sales_mkt_1", name: "SALES & MARKETING1" }],
        },
        {
          id: "ban_sales_marketing_2",
          name: "SALES & MARKETING2",
          phongs: [{ id: "p_sales_mkt_2", name: "SALES & MARKETING2" }],
        },
        {
          id: "ban_strategic_planning",
          name: "STRATEGIC PLANNING",
          phongs: [{ id: "p_strategic_planning", name: "STRATEGIC PLANNING" }],
        },
      ],
    },
    {
      id: "khoi_hr_ga",
      name: "HR & GA",
      bans: [
        {
          id: "ban_general_affairs",
          name: "GENERAL AFFAIRS",
          phongs: [{ id: "p_general_affairs", name: "GENERAL AFFAIRS" }],
        },
        {
          id: "ban_human_resources",
          name: "HUMAN RESOURCES",
          phongs: [{ id: "p_human_resources", name: "HUMAN RESOURCES" }],
        },
      ],
    },
    {
      id: "khoi_management_support",
      name: "MANAGEMENT & SUPPORT",
      bans: [
        {
          id: "ban_business_innovation",
          name: "BUSINESS INNOVATION",
          phongs: [{ id: "p_business_innovation", name: "BUSINESS INNOVATION" }],
        },
        {
          id: "ban_financial_management",
          name: "FINANCIAL MANAGEMENT",
          phongs: [{ id: "p_financial_management", name: "FINANCIAL MANAGEMENT" }],
        },
        {
          id: "ban_food_safety_lab",
          name: "FOOD SAFETY LAB",
          phongs: [{ id: "p_food_safety_lab", name: "FOOD SAFETY LAB" }],
        },
      ],
    },
  ];
  res.json({ success: true, hierarchy });
});

// Lấy danh mục chuẩn Công việc và Chức vụ tương ứng
app.get("/api/jobs-positions", (req, res) => {
  res.json({
    success: true,
    data: jobPositionsHierarchy,
  });
});

// Thêm/Xóa quản trị viên
app.post("/api/settings/admins", (req, res) => {
  try {
    const { email, action } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email không được để trống" });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    if (action === "add") {
      adminEmails.add(cleanEmail);
    } else if (action === "remove") {
      // Giữ lại ít nhất 1 admin
      if (adminEmails.size <= 1) {
        return res.status(400).json({ error: "Phải duy trì ít nhất một Quản trị viên" });
      }
      adminEmails.delete(cleanEmail);
    }
    res.json({ success: true, admins: Array.from(adminEmails) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Authenticated local OCR, with separately configured Gemini assistance.
app.use('/api/ocr',requirePersonnelSession);
app.get('/api/ocr/capabilities',(_req,res)=>{
  res.set('Cache-Control','no-store');
  res.json({success:true,data:geminiOCRCapabilities()});
});
app.post('/api/ocr/gemini-assist',async(req,res)=>{
  const requestId=randomUUID(),start=Date.now();
  try {
    const data=await assistGeminiOCR(req.body,res.locals.personnelUser.email);
    console.info('[OCR assist]',JSON.stringify({requestId,status:200,result:data.assistance?.status,durationMs:Date.now()-start}));
    res.json({success:true,data,requestId});
  } catch(error) {
    const failure=error instanceof OCRError ? error : new OCRError('Không xử lý được yêu cầu hỗ trợ OCR.',400);
    res.status(failure.status).json({success:false,error:failure.message,retryable:false,requestId});
  }
});
app.post('/api/ocr/recognize',async(req,res)=>{
  const requestId=randomUUID();const start=Date.now();
  try {
    const data=await recognizeImage(req.body);
    console.info('[OCR]',JSON.stringify({requestId,status:200,durationMs:Date.now()-start}));
    res.json({success:true,data,engine:'tesseract',requestId});
  } catch(error) {
    const failure=error instanceof OCRError ? error : new OCRError('OCR tạm thời không khả dụng.',503,true);
    console.info('[OCR]',JSON.stringify({requestId,status:failure.status,durationMs:Date.now()-start}));
    if(failure.retryable) res.set('Retry-After','2');
    res.status(failure.status).json({success:false,error:failure.message,status:failure.status,retryable:failure.retryable,retryAfterSeconds:failure.retryable ? 2 : 0,requestId});
  }
});
app.post('/api/ocr/extract-profile',(req,res)=>{
  try {
    const data=parseOCRProfile(req.body?.documents);
    const salary=timLuongTheoChucVu(data.chucVu || data.congViecDuKien || '');
    res.json({success:true,data:{...data,suggestedLuongCoBan:salary.luongCoBan,suggestedPhuCapCoDinh:salary.phuCapCoDinh,matchedChucVu:salary.matchedChucVu},engine:'ocr-rules'});
  } catch(error) {
    const failure=error instanceof OCRError ? error : new OCRError('Không tách được thông tin từ văn bản OCR.',422);
    res.status(failure.status).json({success:false,error:failure.message,retryable:false});
  }
});
// Old browser builds must refresh; do not silently fall back to Gemini.
app.post('/api/ai/extract-documents',(_req,res)=>res.status(410).json({success:false,error:'Ứng dụng đã chuyển sang OCR độc lập. Hãy tải lại trang rồi thử lại.',retryable:false}));

// 2. SHEET: TIEUCHUANLUONG (Lấy danh sách)
app.get("/api/sheets/tieu-chuan-luong", (req, res) => {
  res.json({ success: true, data: tieuChuanLuong });
});

// SHEET: TIEUCHUANLUONG (Thêm/Sửa - Dành cho Admin)
app.post("/api/sheets/tieu-chuan-luong", (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    const isAdmin = adminEmails.has(userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        error: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền sửa đổi Sheet 'TieuChuanLuong'.",
      });
    }

    const {
      id,
      congViec,
      chucVu,
      luongCoBan,
      phuCapChucVu,
      phuCapDienThoai,
      phuCapMoiTruong,
      phuCapXangXe,
      anToanVeSinhVien,
      phuCapKinhDoanh,
      phuCapNangNhoc,
      troCapTayNghe,
      troCapGiaDinh,
      thuongChuyenCan,
      thuongSangKien,
      phuCapCoDinh,
      moTa,
    } = req.body;
    if (!chucVu || luongCoBan === undefined) {
      return res.status(400).json({ error: "Tên chức vụ và lương cơ bản là bắt buộc." });
    }

    const existingIndex = tieuChuanLuong.findIndex((t) => t.id === id || t.chucVu.toLowerCase() === chucVu.toLowerCase());
    const existing = existingIndex >= 0 ? tieuChuanLuong[existingIndex] : null;

    const computedPhuCapCoDinh = phuCapCoDinh !== undefined
      ? Number(phuCapCoDinh) || 0
      : ((Number(phuCapChucVu) || 0) + (Number(phuCapDienThoai) || 0) + (Number(troCapTayNghe) || 0) + (Number(troCapGiaDinh) || 150000) + (Number(thuongChuyenCan) || 200000) + (Number(thuongSangKien) || 0));

    const item = {
      id: id || existing?.id || `TCL_${Date.now()}`,
      congViec: congViec || existing?.congViec || "Công việc chuyên môn",
      chucVu: chucVu.trim(),
      luongCoBan: Number(luongCoBan) || 0,
      phuCapChucVu: phuCapChucVu !== undefined ? Number(phuCapChucVu) || 0 : (existing?.phuCapChucVu || 0),
      phuCapDienThoai: phuCapDienThoai !== undefined ? Number(phuCapDienThoai) || 0 : (existing?.phuCapDienThoai || 0),
      phuCapMoiTruong: phuCapMoiTruong || existing?.phuCapMoiTruong || "Thủ công",
      phuCapXangXe: phuCapXangXe || existing?.phuCapXangXe || "Thủ công",
      anToanVeSinhVien: anToanVeSinhVien || existing?.anToanVeSinhVien || "Thủ công",
      phuCapKinhDoanh: phuCapKinhDoanh || existing?.phuCapKinhDoanh || "Thủ công",
      phuCapNangNhoc: phuCapNangNhoc || existing?.phuCapNangNhoc || "Thủ công",
      troCapTayNghe: troCapTayNghe !== undefined ? Number(troCapTayNghe) || 0 : (existing?.troCapTayNghe || 0),
      troCapGiaDinh: troCapGiaDinh !== undefined ? Number(troCapGiaDinh) || 0 : (existing?.troCapGiaDinh || 150000),
      thuongChuyenCan: thuongChuyenCan !== undefined ? Number(thuongChuyenCan) || 0 : (existing?.thuongChuyenCan || 200000),
      thuongSangKien: thuongSangKien !== undefined ? Number(thuongSangKien) || 0 : (existing?.thuongSangKien || 0),
      phuCapCoDinh: computedPhuCapCoDinh,
      moTa: moTa || existing?.moTa || "",
      capNhatLuc: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      tieuChuanLuong[existingIndex] = item;
    } else {
      tieuChuanLuong.push(item);
    }

    res.json({ success: true, data: item, list: tieuChuanLuong });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// SHEET: TIEUCHUANLUONG (Đồng bộ hàng loạt từ Google Sheets - Admin)
app.post("/api/sheets/tieu-chuan-luong/batch", (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    const isAdmin = adminEmails.has(userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        error: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền đồng bộ dữ liệu vào Sheet 'TieuChuanLuong'.",
      });
    }

    const { items, mode = 'merge' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Danh sách tiêu chuẩn lương không được để trống." });
    }

    const sanitizedItems = items.map((raw: any, index: number) => {
      const chucVu = String(raw.chucVu || '').trim();
      const luongCoBan = Number(raw.luongCoBan) || 0;
      const phuCapChucVu = Number(raw.phuCapChucVu) || 0;
      const phuCapDienThoai = Number(raw.phuCapDienThoai) || 0;
      const troCapTayNghe = Number(raw.troCapTayNghe) || 0;
      const troCapGiaDinh = raw.troCapGiaDinh !== undefined ? Number(raw.troCapGiaDinh) || 0 : 150000;
      const thuongChuyenCan = raw.thuongChuyenCan !== undefined ? Number(raw.thuongChuyenCan) || 0 : 200000;
      const thuongSangKien = Number(raw.thuongSangKien) || 0;
      const computedPhuCapCoDinh = raw.phuCapCoDinh !== undefined
        ? Number(raw.phuCapCoDinh) || 0
        : (phuCapChucVu + phuCapDienThoai + troCapTayNghe + troCapGiaDinh + thuongChuyenCan + thuongSangKien);

      return {
        id: raw.id || `TCL_SYNC_${Date.now()}_${index}`,
        congViec: String(raw.congViec || 'Khác').trim(),
        chucVu,
        luongCoBan,
        phuCapChucVu,
        phuCapDienThoai,
        phuCapMoiTruong: raw.phuCapMoiTruong || 'Thủ công',
        phuCapXangXe: raw.phuCapXangXe || 'Thủ công',
        anToanVeSinhVien: raw.anToanVeSinhVien || 'Thủ công',
        phuCapKinhDoanh: raw.phuCapKinhDoanh || 'Thủ công',
        phuCapNangNhoc: raw.phuCapNangNhoc || 'Thủ công',
        troCapTayNghe,
        troCapGiaDinh,
        thuongChuyenCan,
        thuongSangKien,
        phuCapCoDinh: computedPhuCapCoDinh,
        moTa: raw.moTa || `Tiêu chuẩn lương cho ${chucVu}`,
        capNhatLuc: new Date().toISOString(),
      };
    }).filter(item => Boolean(item.chucVu));

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ error: "Không tìm thấy dòng tiêu chuẩn có chức danh hợp lệ." });
    }

    if (mode === 'replace') {
      tieuChuanLuong = sanitizedItems;
    } else {
      // Merge mode: update if exists (by chucVu or id), append if not
      for (const item of sanitizedItems) {
        const idx = tieuChuanLuong.findIndex(
          t => t.id === item.id || t.chucVu.toLowerCase() === item.chucVu.toLowerCase()
        );
        if (idx >= 0) {
          tieuChuanLuong[idx] = { ...tieuChuanLuong[idx], ...item };
        } else {
          tieuChuanLuong.push(item);
        }
      }
    }

    res.json({
      success: true,
      message: `Đã đồng bộ ${sanitizedItems.length} tiêu chuẩn lương thành công (chế độ: ${mode === 'replace' ? 'Ghi đè' : 'Gộp/Cập nhật'}).`,
      totalCount: tieuChuanLuong.length,
      list: tieuChuanLuong,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Xóa tiêu chuẩn lương (Admin)
app.delete("/api/sheets/tieu-chuan-luong/:id", (req, res) => {
  const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
  if (!adminEmails.has(userEmail)) {
    return res.status(403).json({ error: "Chỉ Quản trị viên mới có quyền xóa dữ liệu tiêu chuẩn lương." });
  }

  const { id } = req.params;
  tieuChuanLuong = tieuChuanLuong.filter((t) => t.id !== id);
  res.json({ success: true, list: tieuChuanLuong });
});

// CƠ CẤU TỔ CHỨC: TEAM (KHỐI) / GROUP (BAN) / PART (BỘ PHẬN)
app.get("/api/organization-hierarchy", (req, res) => {
  res.json({ success: true, data: organizationHierarchy });
});

app.post("/api/organization-hierarchy", (req, res) => {
  const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
  if (!adminEmails.has(userEmail)) {
    return res.status(403).json({ error: "Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa cơ cấu tổ chức." });
  }

  const { hierarchy } = req.body;
  if (!Array.isArray(hierarchy)) {
    return res.status(400).json({ error: "Cơ cấu tổ chức phải là một mảng dữ liệu hợp lệ." });
  }

  organizationHierarchy = hierarchy;
  res.json({ success: true, data: organizationHierarchy });
});

let inMemoryPersonnelRecords: any[] = [];

// 3. SHEET: DANHSACHNHANSU (Lấy danh sách theo phân quyền tài khoản Google)
app.use('/api/sheets/danh-sach-nhan-su',requirePersonnelSession);
app.use('/api/export/csv',requirePersonnelSession);

app.get("/api/sheets/danh-sach-nhan-su", async (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "Happyendpu@gmail.com").toLowerCase().trim();
    const isAdmin = res.locals.personnelUser.role === 'admin';

    // Phân quyền thông minh:
    // - Admin: xem toàn bộ hồ sơ của tất cả nhân viên
    // - Nhân viên: chỉ xem lịch sử các hồ sơ do chính tài khoản của họ gửi lên
    const filtered = firestoreConfigured()
      ? await recordStore.list(isAdmin ? undefined : userEmail)
      : inMemoryPersonnelRecords.filter(r => isAdmin || r.userEmail === userEmail);

    // Sắp xếp mới nhất lên đầu
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      success: true,
      isAdmin,
      userEmail,
      totalRecords: sorted.length,
      data: sorted.map(record => ({...record,nguoiNhap:record.nguoiNhap || userAccounts.find(account => account.email.toLowerCase() === String(record.userEmail).toLowerCase())?.fullName || record.userEmail})),
    });
  } catch (error) {
    res.status(error instanceof StorageError ? error.status : 503).json({ success:false,error:"Không tải được hồ sơ từ Firestore. " + (error instanceof StorageError ? error.message : "Vui lòng thử lại.") });
  }
});

// Hàm nghiệp vụ chuẩn hóa, lưu trữ hồ sơ và tạo email xác nhận (Hỗ trợ cả đơn lẻ & hàng loạt)
function buildPersonnelRecord(body: any, userEmail: string) {
  const {
    hoVaTen,
    ngaySinh,
    gioiTinh,
    soCCCD,
    ngayCap,
    ngayHetHanCCCD = "",
    noiCap,
    queQuan,
    diaChiThuongTru,
    nguonDiaChi = "VNeID",
    ghiChuSapNhap = "",
    diemLamViec = "",
    loaiHopDong = "Toàn thời gian (Chính thức)",
    ngayVaoLam = "",
    diaChiTamTru = "",
    emailCaNhan = "",
    tinhTrangHoSo = "",
    soDienThoai,
    khoi = "",
    ban = "",
    phong = "",
    congViecDuKien,
    chucVu,
    thongTinGiaDinh,
    phuCapPhatSinh = 0,
    troCapDacThuFPT = 0,
    thuongNangLucAM = 0,
    phuCapNangLuc = 0,
    phuCapLuuDong = 0,
    luongDongBHXH,
    maNhanVien = "",
    tinhTrangHonNhan = "",
    thamQuyen = "",
    trinhDoHocVan = "Trung cấp / Cao đẳng / Đại học",
    ghiChu = "",
    soTaiLieuDinhKem = 0,
  } = body;

  if (!hoVaTen || !soCCCD) {
    throw new Error("Họ và tên và Số CCCD là các trường bắt buộc.");
  }
  if (thamQuyen && !['Trưởng địa điểm','Dinh dưỡng viên trưởng','Giám sát trưởng'].includes(thamQuyen)) throw new Error('Thẩm quyền không hợp lệ.');
  if (String(emailCaNhan || "").trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailCaNhan).trim())) {
    throw new Error("Email cá nhân chưa đúng định dạng.");
  }

  // Tra cứu Sheet "TieuChuanLuong" dựa theo chức vụ/công việc
  const salaryLookup = timLuongTheoChucVu(chucVu || "", congViecDuKien || "");
  
  // Quy định: Nếu vị trí không nằm trong bảng tiêu chuẩn, hoặc client đánh dấu nhập thủ công
  const isManualSalary = body.isManualSalary !== undefined 
    ? Boolean(body.isManualSalary) 
    : !salaryLookup.isStandard;

  const luongCoBan = body.luongCoBan !== undefined 
    ? Number(body.luongCoBan) 
    : salaryLookup.luongCoBan;

  const phuCapChucVu = body.phuCapChucVu !== undefined 
    ? Number(body.phuCapChucVu) 
    : salaryLookup.phuCapChucVu;

  const phuCapDienThoai = body.phuCapDienThoai !== undefined 
    ? Number(body.phuCapDienThoai) 
    : (salaryLookup.phuCapDienThoai || 0);

  const troCapTayNghe = body.troCapTayNghe !== undefined 
    ? Number(body.troCapTayNghe) 
    : salaryLookup.troCapTayNghe;

  const troCapGiaDinh = body.troCapGiaDinh !== undefined 
    ? Number(body.troCapGiaDinh) 
    : salaryLookup.troCapGiaDinh;

  const thuongChuyenCan = body.thuongChuyenCan !== undefined 
    ? Number(body.thuongChuyenCan) 
    : salaryLookup.thuongChuyenCan;

  const thuongSangKien = body.thuongSangKien !== undefined 
    ? Number(body.thuongSangKien) 
    : salaryLookup.thuongSangKien;

  // Các khoản phụ cấp thủ công theo bảng tiêu chuẩn (Môi trường, Xăng xe, ATVSV, Kinh doanh, Nặng nhọc)
  const phuCapMoiTruong = Number(body.phuCapMoiTruong) || 0;
  const phuCapXangXe = Number(body.phuCapXangXe) || 0;
  const anToanVeSinhVien = Number(body.anToanVeSinhVien) || 0;
  const phuCapKinhDoanh = Number(body.phuCapKinhDoanh) || 0;
  const phuCapNangNhoc = Number(body.phuCapNangNhoc) || 0;
  const phuCapPhatSinhNum = Number(phuCapPhatSinh) || 0;
  const troCapDacThuFPTNum = Number(troCapDacThuFPT) || 0;
  const thuongNangLucAMNum = Number(thuongNangLucAM) || 0;
  const phuCapNangLucNum = Number(phuCapNangLuc);
  if (!Number.isFinite(phuCapNangLucNum) || phuCapNangLucNum < 0) throw new Error('Phụ cấp năng lực phải là số không âm.');
  const phuCapLuuDongNum = Number(phuCapLuuDong) || 0;

  // Phụ cấp cố định: lấy từ client nếu có, hoặc tính tổng các khoản phụ cấp chuẩn
  const phuCapCoDinh = body.phuCapCoDinh !== undefined 
    ? Number(body.phuCapCoDinh) 
    : (phuCapChucVu + phuCapDienThoai + troCapTayNghe + troCapGiaDinh + thuongChuyenCan + thuongSangKien);

  // Mức đóng BHXH
  const finalLuongDongBHXH = luongDongBHXH !== undefined 
    ? Number(luongDongBHXH) 
    : (luongCoBan + phuCapChucVu);

  // Tự động tính toán: Tổng thu nhập dự kiến = Lương cơ bản + tất cả các khoản phụ cấp
  const tongPhuCapAll = phuCapCoDinh + phuCapMoiTruong + phuCapXangXe + anToanVeSinhVien + phuCapKinhDoanh + phuCapNangNhoc + troCapDacThuFPTNum + thuongNangLucAMNum + phuCapNangLucNum + phuCapLuuDongNum + phuCapPhatSinhNum;
  const tongThuNhapDuKien = luongCoBan + tongPhuCapAll;

  const timestamp = new Date().toISOString();
  const newRecord = {
    id: `NS_${randomUUID()}`,
    timestamp,
    userEmail,
    nguoiNhap:userAccounts.find(account => account.email.toLowerCase() === userEmail)?.fullName || userEmail,
    aiVisionExtracted:body.aiVisionExtracted === true && body.extractionMethod!=='ocr',
    extractionMethod:body.extractionMethod==='ocr' ? 'ocr' : body.extractionMethod==='vision' ? 'vision' : 'manual',
    hoVaTen: String(hoVaTen).toUpperCase().trim(),
    ngaySinh: ngaySinh || "",
    gioiTinh: gioiTinh || "Nam",
    soCCCD: String(soCCCD).trim(),
    ngayCap: ngayCap || "",
    ngayHetHanCCCD: String(ngayHetHanCCCD || '').trim(),
    noiCap: noiCap || "",
    queQuan: queQuan || "",
    diaChiThuongTru: diaChiThuongTru || "",
    nguonDiaChi: nguonDiaChi || "VNeID",
    ghiChuSapNhap: ghiChuSapNhap || "",
    diemLamViec: diemLamViec || "",
    loaiHopDong: loaiHopDong || "Toàn thời gian (Chính thức)",
    ngayVaoLam: String(ngayVaoLam || "").trim(),
    diaChiTamTru: String(diaChiTamTru || "").trim(),
    emailCaNhan: String(emailCaNhan || "").trim(),
    tinhTrangHoSo: String(tinhTrangHoSo || "").trim(),
    soDienThoai: soDienThoai || "",
    khoi: khoi || "",
    ban: ban || "",
    phong: phong || "",
    congViecDuKien: congViecDuKien || "",
    chucVu: chucVu || salaryLookup.matchedChucVu,
    isManualSalary,
    thongTinGiaDinh: Array.isArray(thongTinGiaDinh) ? thongTinGiaDinh : [],
    thanhVienHoGiaDinh:normalizeHouseholdMembers(body.thanhVienHoGiaDinh),
    luongCoBan,
    phuCapChucVu,
    phuCapDienThoai,
    troCapTayNghe,
    troCapGiaDinh,
    thuongChuyenCan,
    thuongSangKien,
    phuCapMoiTruong,
    phuCapXangXe,
    anToanVeSinhVien,
    phuCapKinhDoanh,
    phuCapNangNhoc,
    troCapDacThuFPT: troCapDacThuFPTNum,
    thuongNangLucAM: thuongNangLucAMNum,
    phuCapNangLuc: phuCapNangLucNum,
    phuCapLuuDong: phuCapLuuDongNum,
    phuCapCoDinh,
    phuCapPhatSinh: phuCapPhatSinhNum,
    tongPhuCap: tongPhuCapAll,
    tongThuNhapDuKien,
    luongDongBHXH: finalLuongDongBHXH,
    maNhanVien: maNhanVien || "",
    tinhTrangHonNhan: String(tinhTrangHonNhan || '').trim(),
    thamQuyen,
    trinhDoHocVan: trinhDoHocVan || "Trung cấp / Cao đẳng / Đại học",
    ghiChu: ghiChu || "",
    soTaiLieuDinhKem: Math.max(0,Number(soTaiLieuDinhKem) || 0),
    trangThaiEmail: "Chờ gửi" as const,
  };

  return newRecord;
}

// LƯU 1 HỒ SƠ NHÂN SỰ VÀO SHEET "DANHSACHNHANSU"
app.post("/api/sheets/danh-sach-nhan-su", async (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || req.body.userEmail || "nhanvien@congty.com").toLowerCase().trim();
    const newRecord = buildPersonnelRecord(req.body, userEmail);
    let draftCleanupPending = false;
    if (firestoreConfigured()) {
      draftCleanupPending = req.body.draftId
        ? await draftStore.complete(userEmail,req.body.draftId,req.body.draftVersion,[newRecord])
        : (await recordStore.create([newRecord]),false);
    } else {
      inMemoryPersonnelRecords.unshift(newRecord);
      if (req.body.draftId) inMemoryDrafts.delete(req.body.draftId);
    }

    res.json({
      success: true,
      message: firestoreConfigured() ? "Đã lưu hồ sơ vào Firestore." : "Đã lưu hồ sơ (Bộ nhớ tạm).",
      record: newRecord,
      draftCleanupPending,
      emailSent: false,
    });
  } catch (error) {
    console.error("Lỗi khi lưu hồ sơ:", error);
    res.status(error instanceof StorageError ? error.status : 400).json({success:false,error:error instanceof StorageError ? error.message : "Dữ liệu hồ sơ không hợp lệ. Vui lòng kiểm tra họ tên, CCCD, email và các khoản lương."});
  }
});

// LƯU HÀNG LOẠT NHIỀU HỒ SƠ NHÂN SỰ VÀO SHEET "DANHSACHNHANSU"
app.post("/api/sheets/danh-sach-nhan-su/batch", async (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || req.body.userEmail || "nhanvien@congty.com").toLowerCase().trim();
    const rawList = req.body.records || req.body.employees || req.body;
    const batchList = Array.isArray(rawList) ? rawList : [];

    if (batchList.length === 0) {
      return res.status(400).json({ error: "Danh sách hồ sơ rỗng hoặc không đúng định dạng mảng." });
    }

    const savedRecords = batchList.map(item => buildPersonnelRecord(item,userEmail));
    let draftCleanupPending = false;
    if (firestoreConfigured()) {
      draftCleanupPending = req.body.draftId
        ? await draftStore.complete(userEmail,req.body.draftId,req.body.draftVersion,savedRecords)
        : (await recordStore.create(savedRecords),false);
    } else {
      inMemoryPersonnelRecords.unshift(...savedRecords);
      if (req.body.draftId) inMemoryDrafts.delete(req.body.draftId);
    }

    res.json({
      success: true,
      message: firestoreConfigured() ? `Đã lưu ${savedRecords.length} hồ sơ vào Firestore.` : `Đã lưu ${savedRecords.length} hồ sơ (Bộ nhớ tạm).`,
      count: savedRecords.length,
      records: savedRecords,
      draftCleanupPending,
    });
  } catch (error) {
    console.error("Lỗi khi lưu hàng loạt hồ sơ:", error);
    res.status(error instanceof StorageError ? error.status : 400).json({success:false,error:error instanceof StorageError ? error.message : "Danh sách có hồ sơ không hợp lệ. Chưa lưu hồ sơ nào; vui lòng kiểm tra dữ liệu và thử lại."});
  }
});

// Chỉnh sửa toàn bộ thông tin hồ sơ nhân sự (Dành riêng cho Quản trị viên - Admin)
app.put("/api/sheets/danh-sach-nhan-su/:id", async (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    if (res.locals.personnelUser.role !== 'admin') {
      return res.status(403).json({
        error: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa toàn bộ thông tin hồ sơ nhân sự.",
      });
    }

    const { id } = req.params;
    let existing: any, version: string | undefined;
    if (firestoreConfigured()) {
      const snap = await recordStore.get(id);
      existing = snap.record;
      version = snap.version;
    } else {
      existing = inMemoryPersonnelRecords.find(r => r.id === id);
      if (!existing) throw new StorageError('Không tìm thấy hồ sơ.', 404);
      version = existing.capNhatLuc || existing.timestamp;
    }
    const body = personnelFields(req.body);
    if (body.thamQuyen && !['Trưởng địa điểm','Dinh dưỡng viên trưởng','Giám sát trưởng'].includes(body.thamQuyen)) throw new StorageError('Thẩm quyền không hợp lệ.',400);

    // Tính toán lại các khoản phụ cấp và tổng thu nhập nếu có chỉnh sửa số tiền
    const luongCoBan = body.luongCoBan !== undefined ? Number(body.luongCoBan) : existing.luongCoBan;
    const phuCapChucVu = body.phuCapChucVu !== undefined ? Number(body.phuCapChucVu) : (existing.phuCapChucVu || 0);
    const phuCapDienThoai = body.phuCapDienThoai !== undefined ? Number(body.phuCapDienThoai) : (existing.phuCapDienThoai || 0);
    const troCapTayNghe = body.troCapTayNghe !== undefined ? Number(body.troCapTayNghe) : (existing.troCapTayNghe || 0);
    const troCapGiaDinh = body.troCapGiaDinh !== undefined ? Number(body.troCapGiaDinh) : (existing.troCapGiaDinh || 0);
    const thuongChuyenCan = body.thuongChuyenCan !== undefined ? Number(body.thuongChuyenCan) : (existing.thuongChuyenCan || 0);
    const thuongSangKien = body.thuongSangKien !== undefined ? Number(body.thuongSangKien) : (existing.thuongSangKien || 0);

    const phuCapMoiTruong = body.phuCapMoiTruong !== undefined ? Number(body.phuCapMoiTruong) : (existing.phuCapMoiTruong || 0);
    const phuCapXangXe = body.phuCapXangXe !== undefined ? Number(body.phuCapXangXe) : (existing.phuCapXangXe || 0);
    const anToanVeSinhVien = body.anToanVeSinhVien !== undefined ? Number(body.anToanVeSinhVien) : (existing.anToanVeSinhVien || 0);
    const phuCapKinhDoanh = body.phuCapKinhDoanh !== undefined ? Number(body.phuCapKinhDoanh) : (existing.phuCapKinhDoanh || 0);
    const phuCapNangNhoc = body.phuCapNangNhoc !== undefined ? Number(body.phuCapNangNhoc) : (existing.phuCapNangNhoc || 0);
    const phuCapPhatSinh = body.phuCapPhatSinh !== undefined ? Number(body.phuCapPhatSinh) : (existing.phuCapPhatSinh || 0);
    const troCapDacThuFPT = Number(body.troCapDacThuFPT ?? existing.troCapDacThuFPT) || 0;
    const thuongNangLucAM = Number(body.thuongNangLucAM ?? existing.thuongNangLucAM) || 0;
    const phuCapNangLuc = Number(body.phuCapNangLuc ?? existing.phuCapNangLuc ?? 0);
    if (!Number.isFinite(phuCapNangLuc) || phuCapNangLuc < 0) throw new StorageError('Phụ cấp năng lực phải là số không âm.',400);
    const phuCapLuuDong = Number(body.phuCapLuuDong ?? existing.phuCapLuuDong) || 0;

    const phuCapCoDinh = body.phuCapCoDinh !== undefined
      ? Number(body.phuCapCoDinh)
      : (phuCapChucVu + phuCapDienThoai + troCapTayNghe + troCapGiaDinh + thuongChuyenCan + thuongSangKien);

    const tongPhuCap = phuCapCoDinh + phuCapMoiTruong + phuCapXangXe + anToanVeSinhVien + phuCapKinhDoanh + phuCapNangNhoc + troCapDacThuFPT + thuongNangLucAM + phuCapNangLuc + phuCapLuuDong + phuCapPhatSinh;
    
    const tongThuNhapDuKien = luongCoBan + tongPhuCap;

    const luongDongBHXH = body.luongDongBHXH !== undefined
      ? Number(body.luongDongBHXH)
      : (luongCoBan + phuCapChucVu);

    const updatedRecord: Record<string,any> = {
      ...existing,
      ...body,
      id, // Bảo toàn ID hồ sơ
      timestamp: existing.timestamp,
      nguoiNhap:existing.nguoiNhap,
      aiVisionExtracted:existing.aiVisionExtracted,
      extractionMethod:existing.extractionMethod,
      userEmail: existing.userEmail,
      troCapDacThuFPT,
      thuongNangLucAM,
      phuCapNangLuc,
      phuCapLuuDong,
      luongCoBan,
      phuCapChucVu,
      phuCapDienThoai,
      troCapTayNghe,
      troCapGiaDinh,
      thuongChuyenCan,
      thuongSangKien,
      phuCapMoiTruong,
      phuCapXangXe,
      anToanVeSinhVien,
      phuCapKinhDoanh,
      phuCapNangNhoc,
      phuCapPhatSinh,
      phuCapCoDinh,
      tongPhuCap,
      tongThuNhapDuKien,
      luongDongBHXH,
      capNhatLuc: new Date().toISOString(),
    };

    if (firestoreConfigured()) {
      await recordStore.update(id,updatedRecord,version);
    } else {
      const idx = inMemoryPersonnelRecords.findIndex(r => r.id === id);
      if (idx >= 0) inMemoryPersonnelRecords[idx] = updatedRecord;
    }

    res.json({
      success: true,
      message: `Đã cập nhật thành công hồ sơ của ${updatedRecord.hoVaTen}.`,
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật hồ sơ:", error);
    res.status(error instanceof StorageError ? error.status : 503).json({success:false,error:error instanceof StorageError ? error.message : "Không cập nhật được hồ sơ. Vui lòng thử lại."});
  }
});

// Xóa hồ sơ (Dành cho Admin)
app.delete("/api/sheets/danh-sach-nhan-su/:id", async (req, res) => {
  const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
  if (res.locals.personnelUser.role !== 'admin') {
    return res.status(403).json({ error: "Chỉ Quản trị viên mới có quyền xóa hồ sơ nhân sự." });
  }

  const { id } = req.params;
  try {
    if (firestoreConfigured()) {
      await recordStore.delete(id);
    } else {
      inMemoryPersonnelRecords = inMemoryPersonnelRecords.filter(r => r.id !== id);
    }
    res.json({success:true});
  } catch (error) {
    res.status(error instanceof StorageError ? error.status : 503).json({success:false,error:error instanceof StorageError ? error.message : "Không xóa được hồ sơ. Vui lòng thử lại."});
  }
});

// 4. XUẤT FILE CSV "Bang_Tong_Hop_Nhan_Su.csv" (Chỉ Quản trị viên - Admin)
app.get("/api/export/csv", async (req, res) => {
  try {
    const userEmail = ((req.headers["x-user-email"] as string) || "Happyendpu@gmail.com").toLowerCase().trim();
    const isAdmin = res.locals.personnelUser.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        error: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền tải xuống Bảng tổng hợp nhân sự.",
      });
    }

    // Tiêu đề cột CSV theo chuẩn nghiệp vụ HR (bao gồm Khối > Ban > Phòng và chi tiết phụ cấp / loại vị trí)
    const headers = [
      "Mã Hồ Sơ",
      "Thời Gian Nộp",
      "Email Người Gửi",
      "Họ Và Tên",
      "Ngày Sinh",
      "Giới Tính",
      "Số CCCD",
      "Ngày Cấp",
      "Nơi Cấp",
      "Quê Quán",
      "Địa Chỉ Thường Trú",
      "Số Điện Thoại",
      "Khối",
      "Ban",
      "Phòng",
      "Công Việc",
      "Chức Vụ",
      "Chế Độ Lương",
      "Lương Cơ Bản (VNĐ)",
      "Phụ Cấp Chức Vụ (VNĐ)",
      "Phụ Cấp Điện Thoại (VNĐ)",
      "Trợ Cấp Tay Nghề (VNĐ)",
      "Trợ Cấp Gia Đình (VNĐ)",
      "Thưởng Chuyên Cần (VNĐ)",
      "Thưởng Sáng Kiến (VNĐ)",
      "PC Môi Trường (VNĐ)",
      "Phụ Cấp Xăng Xe (VNĐ)",
      "An Toàn Vệ Sinh Viên (VNĐ)",
      "PC Kinh Doanh (VNĐ)",
      "PC Nặng Nhọc (VNĐ)",
      "Phụ Cấp Cố Định (VNĐ)",
      "Phụ Cấp Phát Sinh (VNĐ)",
      "Tổng Thu Nhập Dự Kiến (VNĐ)",
      "Thông Tin Gia Đình",
      "Ghi Chú",
      "Trạng Thái Email",
      "Tình Trạng Hôn Nhân", "Ngày Hết Hạn CCCD", "Thẩm Quyền", "Phụ Cấp Năng Lực (VNĐ)",
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rawRows = firestoreConfigured() ? await recordStore.list() : inMemoryPersonnelRecords;
    const rows = rawRows.map((ns) => {
      const familyStr = Array.isArray(ns.thongTinGiaDinh)
        ? ns.thongTinGiaDinh.map((f) => `${f.quanHe}: ${f.hoTen} (${f.namSinh || "?"}) - ${f.ngheNghiep || ""}`).join("; ")
        : "";

      return [
        escapeCsv(ns.id),
        escapeCsv(new Date(ns.timestamp).toLocaleString("vi-VN")),
        escapeCsv(ns.userEmail),
        escapeCsv(ns.hoVaTen),
        escapeCsv(ns.ngaySinh),
        escapeCsv(ns.gioiTinh),
        escapeCsv(ns.soCCCD),
        escapeCsv(ns.ngayCap),
        escapeCsv(ns.noiCap),
        escapeCsv(ns.queQuan),
        escapeCsv(ns.diaChiThuongTru),
        escapeCsv(ns.soDienThoai),
        escapeCsv(ns.khoi || ""),
        escapeCsv(ns.ban || ""),
        escapeCsv(ns.phong || ""),
        escapeCsv(ns.congViecDuKien || ""),
        escapeCsv(ns.chucVu),
        escapeCsv(ns.isManualSalary ? "Nhập thủ công" : "Tiêu chuẩn"),
        escapeCsv(ns.luongCoBan),
        escapeCsv(ns.phuCapChucVu || 0),
        escapeCsv(ns.phuCapDienThoai || 0),
        escapeCsv(ns.troCapTayNghe || 0),
        escapeCsv(ns.troCapGiaDinh || 0),
        escapeCsv(ns.thuongChuyenCan || 0),
        escapeCsv(ns.thuongSangKien || 0),
        escapeCsv(ns.phuCapMoiTruong || 0),
        escapeCsv(ns.phuCapXangXe || 0),
        escapeCsv(ns.anToanVeSinhVien || 0),
        escapeCsv(ns.phuCapKinhDoanh || 0),
        escapeCsv(ns.phuCapNangNhoc || 0),
        escapeCsv(ns.phuCapCoDinh),
        escapeCsv(ns.phuCapPhatSinh),
        escapeCsv(ns.tongThuNhapDuKien),
        escapeCsv(familyStr),
        escapeCsv(ns.ghiChu),
        escapeCsv(ns.trangThaiEmail),
        escapeCsv(ns.tinhTrangHonNhan), escapeCsv(ns.ngayHetHanCCCD), escapeCsv(ns.thamQuyen), escapeCsv(ns.phuCapNangLuc || 0),
      ].join(",");
    });

    // Thêm UTF-8 BOM (\uFEFF) để Excel hiển thị đúng dấu tiếng Việt không bị lỗi font
    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="Bang_Tong_Hop_Nhan_Su.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Xuất CSV Sheet TieuChuanLuong với từng loại phụ cấp
app.get("/api/export/tieu-chuan-luong/csv", (req, res) => {
  try {
    const headers = [
      "Mã Vị Trí",
      "Công Việc",
      "Chức Vụ",
      "Lương Cơ Bản (VNĐ)",
      "Phụ Cấp Chức Vụ (VNĐ)",
      "Phụ Cấp Điện Thoại (VNĐ)",
      "PC Môi Trường",
      "PC Xăng Xe",
      "An Toàn Vệ Sinh Viên",
      "PC Kinh Doanh",
      "PC Nặng Nhọc",
      "Trợ Cấp Tay Nghề (VNĐ)",
      "Trợ Cấp Gia Đình (VNĐ)",
      "Thưởng Chuyên Cần (VNĐ)",
      "Thưởng Sáng Kiến (VNĐ)",
      "Tổng Phụ Cấp Cố Định (VNĐ)",
      "Tổng Định Mức (Lương CB + PC Cố Định)",
      "Mô Tả / Ghi Chú",
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = tieuChuanLuong.map((item) => [
      escapeCsv(item.id),
      escapeCsv(item.congViec),
      escapeCsv(item.chucVu),
      escapeCsv(item.luongCoBan),
      escapeCsv(item.phuCapChucVu || 0),
      escapeCsv(item.phuCapDienThoai || 0),
      escapeCsv(item.phuCapMoiTruong || "Thủ công"),
      escapeCsv(item.phuCapXangXe || "Thủ công"),
      escapeCsv(item.anToanVeSinhVien || "Thủ công"),
      escapeCsv(item.phuCapKinhDoanh || "Thủ công"),
      escapeCsv(item.phuCapNangNhoc || "Thủ công"),
      escapeCsv(item.troCapTayNghe || 0),
      escapeCsv(item.troCapGiaDinh || 0),
      escapeCsv(item.thuongChuyenCan || 0),
      escapeCsv(item.thuongSangKien || 0),
      escapeCsv(item.phuCapCoDinh),
      escapeCsv(item.luongCoBan + item.phuCapCoDinh),
      escapeCsv(item.moTa || ""),
    ].join(","));

    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="Sheet_TieuChuanLuong_TungLoaiPhuCap.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Lấy danh sách Email logs (mô phỏng MailApp)
app.get("/api/email-logs", (req, res) => {
  const userEmail = ((req.headers["x-user-email"] as string) || "Happyendpu@gmail.com").toLowerCase().trim();
  const isAdmin = adminEmails.has(userEmail);

  if (isAdmin) {
    res.json({ logs: emailLogs });
  } else {
    res.json({ logs: emailLogs.filter((l) => l.toEmail.toLowerCase() === userEmail) });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "Không tìm thấy API được yêu cầu." });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error?.status === 413 ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ success: false, error: status === 413 ? "Tài liệu vượt giới hạn dung lượng máy chủ." : status === 400 ? "Dữ liệu JSON không hợp lệ." : "Máy chủ gặp lỗi khi xử lý yêu cầu." });
});

export default app;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback đảm bảo không bị 404 cho Single Page Application (SPA)
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`HR Document AI Web App running on http://localhost:${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${PORT} in use, retrying in 1 second...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, "0.0.0.0");
      }, 1000);
    } else {
      console.error("Server listen error:", err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}

if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
