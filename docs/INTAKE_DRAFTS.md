# Lưu tạm và tiếp tục trên thiết bị khác

1. Tại Bước 1–4, bấm **Lưu tạm** và chờ thông báo đã lưu trên cloud.
2. Đăng nhập cùng tài khoản trên thiết bị khác.
3. Mở **Bản nháp của tôi**, bấm **Tiếp tục**. Hệ thống khôi phục bước đang làm,
   toàn bộ nhân viên, thông tin đã nhập và tài liệu ảnh/PDF đã tải lên.
4. Sau mỗi lần sửa, bấm Lưu tạm trước khi chuyển thiết bị. Không tự động lưu.
5. Khi hoàn tất Bước 4, lưu hồ sơ chính thức. Hệ thống đóng bản nháp và xóa
   tài liệu tạm. Hồ sơ chính thức vẫn chỉ chứa dữ liệu chữ/số.

## Lưu trữ và quyền truy cập

- Dùng Firestore `(default)` hiện có, bộ sưu tập `intakeDrafts`, các phần tài liệu
  nằm trong subcollection `parts`. Không cần Firebase Cloud Storage hay secret mới.
- Bản nháp chỉ được đọc/sửa bởi email trong phiên đăng nhập đã được máy chủ xác thực.
  Quản trị viên khác cũng không được đọc bản nháp của người khác.
- Mỗi tài khoản tối đa 20 bản nháp; mỗi bản nháp tối đa 100 nhân viên, 100 tài liệu,
  16 MiB nội dung JSON (bao gồm Base64). Không lưu thêm bản sao dataUrl.
- Tài liệu được chia thành phần nhỏ để tránh giới hạn 1 MiB/document của Firestore
  và 4.5 MB/request/response của Vercel Functions.
- Chỉ công bố phiên bản mới sau khi tải đủ các phần và xác thực nội dung. Khi mất
  mạng, bản đã lưu trước đó còn nguyên. Bản tải dở được liệt kê để có thể bỏ/dọn.
- Hai thiết bị cùng sửa được kiểm tra updateTime: phiên bản cũ sẽ báo xung đột,
  không tự động ghi đè. Hãy mở lại bản nháp mới nhất rồi chỉnh sửa/lưu tiếp.
- Hoàn tất hồ sơ và đánh dấu đóng bản nháp nằm trong cùng Firestore commit, tránh
  gửi trùng từ hai thiết bị. Nếu dọn tài liệu lỗi, hồ sơ vẫn lưu thành công; bản
  nháp được khóa, hiển thị yêu cầu dọn lại bằng Bỏ bản nháp.
- Bản nháp không tự hết hạn theo thời gian. Tài liệu được giữ đến khi hoàn tất
  hoặc người dùng chọn **Bỏ bản nháp → Xác nhận bỏ**. Bỏ sẽ xóa cả tài liệu tạm.
- Lưu trữ sử dụng hạn mức Firestore hiện có; tính năng không bật billing hoặc
  mua thêm dung lượng. Xem hạn mức tại Firebase Console → Firestore → Usage.

Firestore rules vẫn deny-all với client; mọi truy cập qua API có xác thực và IAM.
