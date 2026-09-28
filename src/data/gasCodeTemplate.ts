/**
 * Trọn bộ mã nguồn Google Apps Script (Code.gs & Index.html)
 * Chuẩn bị sẵn để triển khai trực tiếp lên Google Sheets (Extensions > Apps Script > Web App)
 */

export const gasCodeGs = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: HỆ THỐNG NHẬP LIỆU HỒ SƠ NHÂN SỰ TỰ ĐỘNG BẰNG AI
 * Tích hợp Google Sheets, Gemini Vision API và MailApp
 * =========================================================================
 */

// Cấu hình danh sách Quản trị viên (Admin)
const ADMIN_EMAILS = [
  "happyendpu@gmail.com",
  "admin@congty.com"
];

// Tên các bảng tính
const SHEET_DANH_SACH = "DanhSachNhanSu";
const SHEET_TIEU_CHUAN = "TieuChuanLuong";

/**
 * Khởi chạy Web App
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Nhập Liệu Hồ Sơ Nhân Sự AI - Google Sheets")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Lấy thông tin tài khoản đang đăng nhập
 */
function getCurrentUser() {
  const email = (Session.getActiveUser().getEmail() || "guest@congty.com").toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(email);
  return {
    email: email,
    isAdmin: isAdmin,
    role: isAdmin ? "admin" : "employee"
  };
}

/**
 * Lấy danh sách Tiêu chuẩn lương từ Sheet
 */
function getTieuChuanLuong() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TIEU_CHUAN);
  if (!sheet) {
    khoiTaoSheets();
    sheet = ss.getSheetByName(SHEET_TIEU_CHUAN);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const list = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    list.push({
      id: row[0],
      congViec: row[1],
      chucVu: row[2],
      luongCoBan: Number(row[3]) || 0,
      phuCapChucVu: Number(row[4]) || 0,
      phuCapMoiTruong: row[5] || "Thủ công",
      phuCapXangXe: row[6] || "Thủ công",
      anToanVeSinhVien: row[7] || "Thủ công",
      phuCapKinhDoanh: row[8] || "Thủ công",
      phuCapNangNhoc: row[9] || "Thủ công",
      troCapTayNghe: Number(row[10]) || 0,
      troCapGiaDinh: Number(row[11]) || 0,
      thuongChuyenCan: Number(row[12]) || 0,
      thuongSangKien: Number(row[13]) || 0,
      phuCapCoDinh: Number(row[14]) || 0,
      tongDinhMuc: Number(row[15]) || 0,
      moTa: row[16] || ""
    });
  }
  return list;
}

/**
 * Cập nhật hoặc thêm mới Tiêu chuẩn lương với từng loại phụ cấp (Chỉ Quản trị viên)
 */
function saveTieuChuanLuong(item) {
  const user = getCurrentUser();
  if (!user.isAdmin) {
    throw new Error("Từ chối truy cập: Chỉ Quản trị viên mới có quyền sửa Tiêu chuẩn lương.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TIEU_CHUAN);
  const values = sheet.getDataRange().getValues();
  let found = false;

  const phuCapCD = (Number(item.phuCapChucVu) || 0) +
    (Number(item.troCapTayNghe) || 0) +
    (Number(item.troCapGiaDinh) || 0) +
    (Number(item.thuongChuyenCan) || 0) +
    (Number(item.thuongSangKien) || 0);

  const tongDinhMuc = (Number(item.luongCoBan) || 0) + phuCapCD;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][2]).toLowerCase().trim() === String(item.chucVu).toLowerCase().trim()) {
      sheet.getRange(i + 1, 2).setValue(item.congViec || values[i][1]);
      sheet.getRange(i + 1, 4).setValue(item.luongCoBan);
      sheet.getRange(i + 1, 5).setValue(item.phuCapChucVu || 0);
      sheet.getRange(i + 1, 6).setValue(item.phuCapMoiTruong || "Thủ công");
      sheet.getRange(i + 1, 7).setValue(item.phuCapXangXe || "Thủ công");
      sheet.getRange(i + 1, 8).setValue(item.anToanVeSinhVien || "Thủ công");
      sheet.getRange(i + 1, 9).setValue(item.phuCapKinhDoanh || "Thủ công");
      sheet.getRange(i + 1, 10).setValue(item.phuCapNangNhoc || "Thủ công");
      sheet.getRange(i + 1, 11).setValue(item.troCapTayNghe || 0);
      sheet.getRange(i + 1, 12).setValue(item.troCapGiaDinh || 0);
      sheet.getRange(i + 1, 13).setValue(item.thuongChuyenCan || 0);
      sheet.getRange(i + 1, 14).setValue(item.thuongSangKien || 0);
      sheet.getRange(i + 1, 15).setValue(phuCapCD);
      sheet.getRange(i + 1, 16).setValue(tongDinhMuc);
      sheet.getRange(i + 1, 17).setValue(item.moTa || "");
      found = true;
      break;
    }
  }

  if (!found) {
    const ma = item.id || ("TCL_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss"));
    sheet.appendRow([
      ma,
      item.congViec || "Chuyên môn",
      item.chucVu,
      Number(item.luongCoBan) || 0,
      Number(item.phuCapChucVu) || 0,
      item.phuCapMoiTruong || "Thủ công",
      item.phuCapXangXe || "Thủ công",
      item.anToanVeSinhVien || "Thủ công",
      item.phuCapKinhDoanh || "Thủ công",
      item.phuCapNangNhoc || "Thủ công",
      Number(item.troCapTayNghe) || 0,
      Number(item.troCapGiaDinh) || 0,
      Number(item.thuongChuyenCan) || 0,
      Number(item.thuongSangKien) || 0,
      phuCapCD,
      tongDinhMuc,
      item.moTa || ""
    ]);
  }

  return { success: true };
}

/**
 * Lấy danh sách hồ sơ nhân sự (Phân quyền theo email)
 */
function getDanhSachNhanSu() {
  const user = getCurrentUser();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_DANH_SACH);
  if (!sheet) {
    khoiTaoSheets();
    sheet = ss.getSheetByName(SHEET_DANH_SACH);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const list = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const emailNguoiGui = String(row[2]).toLowerCase().trim();

    // Phân quyền: Admin xem tất cả, Nhân viên chỉ xem của mình
    if (user.isAdmin || emailNguoiGui === user.email) {
      list.push({
        id: row[0],
        timestamp: row[1],
        userEmail: row[2],
        hoVaTen: row[3],
        ngaySinh: row[4],
        gioiTinh: row[5],
        soCCCD: row[6],
        ngayCap: row[7],
        noiCap: row[8],
        queQuan: row[9],
        diaChiThuongTru: row[10],
        soDienThoai: row[11],
        khoi: row[12] || "",
        ban: row[13] || "",
        phong: row[14] || "",
        chucVu: row[15] || "",
        luongCoBan: row[16] || 0,
        phuCapCoDinh: row[17] || 0,
        phuCapPhatSinh: row[18] || 0,
        tongThuNhapDuKien: row[19] || 0,
        thongTinGiaDinh: row[20] || "",
        ghiChu: row[21] || "",
        trangThaiEmail: row[22] || "Đã gửi"
      });
    }
  }

  return list.reverse();
}

/**
 * Gọi Gemini Multimodal API trích xuất tài liệu (Có cơ chế tự động Fallback các model)
 */
function callGeminiVision(imagesBase64Array, apiKey) {
  try {
    const key = apiKey || PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!key) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY trong Script Properties.");
    }

    const parts = [];
    imagesBase64Array.forEach(function(img) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: img.base64Data
        }
      });
    });

    const schemaExample = {
      hoVaTen: "HỌ TÊN VIẾT HOA",
      ngaySinh: "DD/MM/YYYY",
      gioiTinh: "Nam/Nữ",
      soCCCD: "12 số",
      ngayCap: "DD/MM/YYYY",
      noiCap: "",
      queQuan: "",
      diaChiThuongTru: "",
      soDienThoai: "",
      khoi: "",
      ban: "",
      phong: "",
      congViecDuKien: "",
      chucVu: "",
      thongTinGiaDinh: [{ quanHe: "", hoTen: "", namSinh: "", ngheNghiep: "" }],
      thongTinChuaRo: []
    };

    const promptText = "Trích xuất thông tin hồ sơ nhân sự từ tài liệu ảnh (CCCD, Sơ yếu lý lịch, Giấy cư trú). " +
      "Chỉ xuất duy nhất chuỗi JSON theo đúng mẫu sau, không kèm bất kỳ giải thích nào: " +
      JSON.stringify(schemaExample);

    parts.push({ text: promptText });

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // Danh sách model ưu tiên theo độ ổn định
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError = null;

    for (let m = 0; m < candidateModels.length; m++) {
      const modelName = candidateModels[m];
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key;
      try {
        const response = UrlFetchApp.fetch(url, options);
        const json = JSON.parse(response.getContentText());
        if (json.error) {
          lastError = new Error(json.error.message);
          continue;
        }
        if (json.candidates && json.candidates.length > 0 && json.candidates[0].content) {
          const textOut = json.candidates[0].content.parts[0].text;
          var cleanJson = textOut;
          var tripleTicks = String.fromCharCode(96, 96, 96);
          if (cleanJson.indexOf(tripleTicks) !== -1) {
            var textSegments = cleanJson.split(tripleTicks);
            cleanJson = textSegments.length > 1 ? textSegments[1] : cleanJson;
            if (cleanJson.toLowerCase().indexOf("json") === 0) {
              cleanJson = cleanJson.substring(4);
            }
          }
          return JSON.parse(cleanJson.trim());
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error("Không thể trích xuất tài liệu sau khi thử các model Gemini.");
  } catch (err) {
    throw new Error("Lỗi gọi Gemini Vision: " + err.message);
  }
}

/**
 * Lưu hồ sơ nhân sự vào Sheet "DanhSachNhanSu" và gửi Email tự động
 */
function luuHoSoNhanSu(data) {
  try {
    const user = getCurrentUser();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_DANH_SACH);
    if (!sheet) {
      khoiTaoSheets();
      sheet = ss.getSheetByName(SHEET_DANH_SACH);
    }

    // Tra cứu lương theo chức vụ
    const tieuChuanList = getTieuChuanLuong();
    let luongCB = 11000000;
    let phuCapCD = 2000000;
    for (let i = 0; i < tieuChuanList.length; i++) {
      if (tieuChuanList[i].chucVu.toLowerCase() === (data.chucVu || "").toLowerCase()) {
        luongCB = tieuChuanList[i].luongCoBan;
        phuCapCD = tieuChuanList[i].phuCapCoDinh;
        break;
      }
    }

    const phuCapPS = Number(data.phuCapPhatSinh) || 0;
    const tongThuNhap = luongCB + phuCapCD + phuCapPS;
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    const maHoSo = "NS_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss");

    const giaDinhStr = Array.isArray(data.thongTinGiaDinh)
      ? data.thongTinGiaDinh.map(g => g.quanHe + ": " + g.hoTen + " (" + (g.namSinh || "") + ")").join("; ")
      : "";

    // Phân cấp phòng ban: Khối > Ban > Phòng
    const khoi = data.khoi || "FD MANAGEMENT";
    const ban = data.ban || "FD SALES & MARKETING";
    const phong = data.phong || "FD SALES & MARKETING";

    sheet.appendRow([
      maHoSo,
      timestamp,
      user.email,
      String(data.hoVaTen).toUpperCase().trim(),
      data.ngaySinh || "",
      data.gioiTinh || "Nam",
      String(data.soCCCD || ""),
      data.ngayCap || "",
      data.noiCap || "",
      data.queQuan || "",
      data.diaChiThuongTru || "",
      data.soDienThoai || "",
      khoi,
      ban,
      phong,
      data.chucVu || "",
      luongCB,
      phuCapCD,
      phuCapPS,
      tongThuNhap,
      giaDinhStr,
      data.ghiChu || "",
      "Đã gửi"
    ]);

    // Gửi email xác nhận qua MailApp
    if (user.email && user.email.indexOf("@") > 0) {
      const emailSubject = "[Xác nhận] Tiếp nhận hồ sơ nhân sự - " + String(data.hoVaTen).toUpperCase();
      const emailHtml = "<h3>Kính gửi " + data.hoVaTen + ",</h3>" +
        "<p>Hồ sơ của bạn đã được tiếp nhận thành công vào Google Sheets.</p>" +
        "<ul>" +
        "<li><strong>Cơ cấu tổ chức:</strong> " + khoi + " &gt; " + ban + " &gt; " + phong + "</li>" +
        "<li><strong>Chức vụ:</strong> " + data.chucVu + "</li>" +
        "<li><strong>Lương cơ bản:</strong> " + Number(luongCB).toLocaleString("vi-VN") + " VNĐ</li>" +
        "<li><strong>Phụ cấp cố định:</strong> " + Number(phuCapCD).toLocaleString("vi-VN") + " VNĐ</li>" +
        "<li><strong>Phụ cấp phát sinh:</strong> " + Number(phuCapPS).toLocaleString("vi-VN") + " VNĐ</li>" +
        "<li><strong>Tổng thu nhập dự kiến:</strong> <span style='color:green;font-weight:bold'>" +
        Number(tongThuNhap).toLocaleString("vi-VN") + " VNĐ/tháng</span></li>" +
        "</ul>";

      MailApp.sendEmail({
        to: user.email,
        subject: emailSubject,
        htmlBody: emailHtml
      });
    }

    return { success: true, maHoSo: maHoSo, tongThuNhap: tongThuNhap };
  } catch (err) {
    throw new Error("Lỗi khi lưu hồ sơ: " + err.message);
  }
}

/**
 * Tự động tạo Sheets nếu chưa có
 */
function khoiTaoSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(SHEET_TIEU_CHUAN)) {
    const s1 = ss.insertSheet(SHEET_TIEU_CHUAN);
    s1.appendRow([
      "Mã Vị Trí", "Công Việc", "Chức Vụ", "Lương Cơ Bản",
      "PC Chức Vụ", "PC Môi Trường", "PC Xăng Xe", "An Toàn Vệ Sinh Viên", "PC Kinh Doanh", "PC Nặng Nhọc",
      "TC Tay Nghề", "TC Gia Đình", "Thưởng Chuyên Cần", "Thưởng Sáng Kiến",
      "Tổng PC Cố Định", "Tổng Định Mức", "Mô Tả"
    ]);
    s1.appendRow(["TCL_DB_01", "Đầu Bếp", "Bếp Trưởng", 16000000, 2000000, "Thủ công", "Thủ công", "Thủ công", "Thủ công", "Thủ công", 1200000, 150000, 200000, 200000, 3750000, 19750000, "Quản lý bếp"]);
    s1.appendRow(["TCL_DB_02", "Đầu Bếp", "Bếp Chính Âu", 5447000, 0, "Thủ công", "Thủ công", "Thủ công", "Thủ công", "Thủ công", 1200000, 150000, 200000, 200000, 1750000, 7197000, "Bếp chính món Âu"]);
    s1.appendRow(["TCL_BH_01", "Bán Hàng", "Cửa Hàng Trưởng", 5895000, 500000, "Thủ công", "Thủ công", "Thủ công", "Thủ công", "Thủ công", 0, 150000, 200000, 200000, 1050000, 6945000, "Quản lý điểm bán"]);
    s1.appendRow(["TCL_BH_02", "Bán Hàng", "Nhân Viên", 5447000, 0, "Thủ công", "Thủ công", "Thủ công", "Thủ công", "Thủ công", 500000, 150000, 200000, 0, 850000, 6297000, "Bán hàng trực tiếp"]);
    s1.getRange("A1:Q1").setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
  }

  if (!ss.getSheetByName(SHEET_DANH_SACH)) {
    const s2 = ss.insertSheet(SHEET_DANH_SACH);
    s2.appendRow([
      "Mã Hồ Sơ", "Thời Gian", "Email Người Gửi", "Họ Và Tên", "Ngày Sinh", "Giới Tính",
      "Số CCCD", "Ngày Cấp", "Nơi Cấp", "Quê Quán", "Địa Chỉ Thường Trú", "Số Điện Thoại",
      "Khối", "Ban", "Phòng", "Chức Vụ", "Lương Cơ Bản", "Phụ Cấp Cố Định", "Phụ Cấp Phát Sinh", "Tổng Thu Nhập Dự Kiến",
      "Thông Tin Gia Đình", "Ghi Chú", "Trạng Thái Email"
    ]);
    s2.getRange("A1:W1").setBackground("#0f766e").setFontColor("#ffffff").setFontWeight("bold");
  }
}
`;

export const gasIndexHtml = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HR Document AI</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 p-4">
  <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
    <div class="bg-blue-900 text-white p-6">
      <h1 class="text-2xl font-bold">Hệ Thống Tự Động Hóa Nhập Liệu Hồ Sơ Nhân Sự AI</h1>
      <p class="text-blue-200 text-sm mt-1">Google Workspace + Multimodal Gemini Vision + Google Sheets</p>
    </div>

    <!-- Client-side Image Resizer & Upload -->
    <div class="p-6 space-y-6">
      <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition">
        <input type="file" id="fileInput" multiple accept="image/*" class="hidden" onchange="xuLyChonAnh(this.files)">
        <button onclick="document.getElementById('fileInput').click()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow">
          📁 Tải lên hoặc Chụp ảnh tài liệu (CCCD, Sơ yếu lý lịch)
        </button>
        <p class="text-xs text-slate-500 mt-2">Ảnh sẽ được nén tự động về max 1024px, JPEG 0.8 để tiết kiệm tối đa vision tokens.</p>
      </div>

      <div id="imageList" class="grid grid-cols-2 sm:grid-cols-4 gap-4"></div>

      <div class="flex justify-end">
        <button id="btnAi" onclick="chayTrichXuatAI()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium shadow disabled:opacity-50" disabled>
          ⚡ Chạy Gemini Vision Trích Xuất
        </button>
      </div>

      <!-- Form Kết Quả -->
      <div id="formSection" class="hidden space-y-4 pt-4 border-t border-slate-200">
        <h3 class="text-lg font-semibold text-slate-900">Thông tin trích xuất & Cơ cấu phòng ban</h3>
        
        <!-- Phân cấp phòng ban: Khối > Ban > Phòng -->
        <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
          <div class="font-bold text-emerald-900">CƠ CẤU TỔ CHỨC: KHỐI &gt; BAN &gt; PHÒNG</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label class="block font-medium text-slate-700">1. Khối:</label>
              <input id="khoi" class="w-full border p-1.5 rounded bg-white text-xs" value="FD MANAGEMENT">
            </div>
            <div>
              <label class="block font-medium text-slate-700">2. Ban:</label>
              <input id="ban" class="w-full border p-1.5 rounded bg-white text-xs" value="FD SALES & MARKETING">
            </div>
            <div>
              <label class="block font-medium text-slate-700">3. Phòng:</label>
              <input id="phong" class="w-full border p-1.5 rounded bg-white text-xs" value="FD SALES & MARKETING">
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><label class="block font-medium">Họ và tên (VIẾT HOA):</label><input id="hoVaTen" class="w-full border p-2 rounded"></div>
          <div><label class="block font-medium">Số CCCD (12 số):</label><input id="soCCCD" class="w-full border p-2 rounded"></div>
          <div><label class="block font-medium">Ngày sinh (DD/MM/YYYY):</label><input id="ngaySinh" class="w-full border p-2 rounded"></div>
          <div><label class="block font-medium">Chức vụ:</label><input id="chucVu" class="w-full border p-2 rounded"></div>
          <div><label class="block font-medium">Phụ cấp phát sinh (điền tay):</label><input id="phuCapPhatSinh" type="number" class="w-full border p-2 rounded" value="0"></div>
        </div>
        <button onclick="xacNhanLuuSheet()" class="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-bold">
          💾 Lưu vào Sheet & Gửi Email Xác Nhận
        </button>
      </div>
    </div>
  </div>

  <script>
    let danhSachAnhNen = [];

    // Nén ảnh client-side: max width 1024px, JPEG 0.8
    function nenAnhClient(file) {
      return new Promise(function(resolve) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
            let w = img.width, h = img.height;
            if (w > 1024) {
              h = Math.round(h * (1024 / w));
              w = 1024;
            }
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            resolve({
              fileName: file.name,
              dataUrl: dataUrl,
              base64Data: dataUrl.split(",")[1]
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function xuLyChonAnh(files) {
      for (let i = 0; i < files.length; i++) {
        const item = await nenAnhClient(files[i]);
        danhSachAnhNen.push(item);
      }
      hienThiAnh();
    }

    function hienThiAnh() {
      const container = document.getElementById("imageList");
      let html = "";
      for (let i = 0; i < danhSachAnhNen.length; i++) {
        const item = danhSachAnhNen[i];
        html += '<div class="relative border rounded p-1 bg-white">' +
          '<img src="' + item.dataUrl + '" class="h-28 w-full object-cover rounded">' +
          '<span class="text-[11px] truncate block mt-1">' + item.fileName + '</span>' +
          '</div>';
      }
      container.innerHTML = html;
      document.getElementById("btnAi").disabled = danhSachAnhNen.length === 0;
    }

    function chayTrichXuatAI() {
      document.getElementById("btnAi").innerText = "Đang xử lý Vision...";
      document.getElementById("btnAi").disabled = true;
      google.script.run
        .withSuccessHandler(function(res) {
          document.getElementById("formSection").classList.remove("hidden");
          document.getElementById("hoVaTen").value = res.hoVaTen || "";
          document.getElementById("soCCCD").value = res.soCCCD || "";
          document.getElementById("ngaySinh").value = res.ngaySinh || "";
          document.getElementById("chucVu").value = res.chucVu || "";
          if (res.khoi) document.getElementById("khoi").value = res.khoi;
          if (res.ban) document.getElementById("ban").value = res.ban;
          if (res.phong) document.getElementById("phong").value = res.phong;
          document.getElementById("btnAi").innerText = "⚡ Chạy Gemini Vision Trích Xuất";
          document.getElementById("btnAi").disabled = false;
        })
        .withFailureHandler(function(err) {
          alert("Lỗi: " + err.message);
          document.getElementById("btnAi").innerText = "⚡ Chạy Gemini Vision Trích Xuất";
          document.getElementById("btnAi").disabled = false;
        })
        .callGeminiVision(danhSachAnhNen);
    }

    function xacNhanLuuSheet() {
      const data = {
        hoVaTen: document.getElementById("hoVaTen").value,
        soCCCD: document.getElementById("soCCCD").value,
        ngaySinh: document.getElementById("ngaySinh").value,
        khoi: document.getElementById("khoi").value,
        ban: document.getElementById("ban").value,
        phong: document.getElementById("phong").value,
        chucVu: document.getElementById("chucVu").value,
        phuCapPhatSinh: document.getElementById("phuCapPhatSinh").value
      };
      google.script.run
        .withSuccessHandler(function(res) {
          alert("Lưu thành công! Đã gửi email xác nhận. Tổng thu nhập: " + Number(res.tongThuNhap).toLocaleString("vi-VN") + " VNĐ");
          location.reload();
        })
        .luuHoSoNhanSu(data);
    }
  </script>
</body>
</html>
`;
