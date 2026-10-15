# Lưu hồ sơ Bước 4 với Firestore

Project: `hrscan`. Không dùng Firebase Storage, không lưu ảnh/PDF/tệp Bước 1.
Chỉ lưu hồ sơ hoàn tất vào collection `personnel` khi người dùng bấm Lưu ở Bước 4.
Hồ sơ chưa bấm Lưu vẫn là bản nháp trong trang, không được đồng bộ.

## Thiết lập Firebase

1. Firebase Console → project `hrscan` → Build → Firestore Database → Create database.
2. Chọn Standard edition (nếu được hỏi), Database ID `(default)`, khu vực phù hợp (ví dụ Singapore), Production mode. Giữ gói Spark; không bật Storage.
3. Giữ Security Rules chặn truy cập trực tiếp từ trình duyệt, như tệp `firestore.rules`. Máy chủ sử dụng Service Account và IAM.
4. Project settings → Service accounts → Firebase Admin SDK → Generate new private key. Giữ file JSON ngoài kho mã nguồn.
5. Service Account cần quyền đọc/ghi Firestore, ví dụ `Cloud Datastore User` (`roles/datastore.user`) trên project `hrscan`. Không công khai database để khắc phục lỗi quyền.

## Thiết lập Vercel

Project hr-scan → Settings → Environment Variables, chọn Production:

- `FIREBASE_PROJECT_ID`: `hrscan`.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: toàn bộ nội dung file khóa JSON. Đặt là Secret/Sensitive, không thêm tiền tố `VITE_`.

Redeploy sau khi thêm hoặc đổi biến. Không đưa file khóa lên GitHub hoặc vào chat.
Chỉ Project ID không đủ cấp quyền kết nối cơ sở dữ liệu.

## Kiểm tra

1. `/api/storage/status` phải trả `provider: firestore`, `configured: true`, `attachmentsStored: false`. Đây là kiểm tra cấu hình; lưu/đọc hồ sơ mới xác nhận quyền thật.
2. Đăng xuất, đăng nhập lại để nhận phiên đăng nhập có chữ ký máy chủ.
3. Hoàn tất Bước 4 và bấm Lưu. Chỉ báo thành công sau khi Firestore xác nhận ghi dữ liệu.
4. Mở trình duyệt/thiết bị khác, đăng nhập cùng tài khoản, xem Hồ sơ đã lưu. Danh sách tải lại khi đăng nhập hoặc quay lại tab.
5. Admin xem toàn bộ; nhân viên chỉ xem hồ sơ thuộc tài khoản của mình. Sửa, xóa và xuất CSV đọc/ghi cùng nguồn Firestore.

Chế độ này không dùng Cloud Functions, Firebase Hosting hay Cloud Storage. Vercel tiếp tục chạy backend.
Không tự chuyển dữ liệu mẫu hoặc hồ sơ từng nằm trong RAM lên Firestore. Tài khoản, cơ cấu và tiêu chuẩn lương hiện có chưa được chuyển sang Firestore trong thay đổi này.
Email xác nhận chưa được gửi thật; lưu hồ sơ không báo email đã gửi.
Khi bật Firestore, mã đổi mật khẩu mô phỏng không còn được phát qua API. Gửi email khôi phục thật cần cấu hình riêng.

Firestore Spark có hạn mức miễn phí; xem Firebase Console để theo dõi sử dụng. Không bật billing hoặc nâng gói tự động.
