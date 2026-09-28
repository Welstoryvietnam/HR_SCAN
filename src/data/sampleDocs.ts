/**
 * Dữ liệu tài liệu mẫu tổng hợp (Synthetic Demo Documents)
 * Giúp người dùng kiểm thử tính năng AI trích xuất ngay cả khi chưa có sẵn file CCCD cá nhân trên máy.
 */

// Tạo Canvas render mẫu tài liệu CCCD mô phỏng và sơ yếu lý lịch dạng dataUrl
export function createSyntheticDocument(type: 'cccd_truoc' | 'cccd_sau' | 'so_yeu_ly_lich' | 'vneid_cu_tru'): {
  fileName: string;
  dataUrl: string;
  base64Data: string;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;

  if (type === 'vneid_cu_tru') {
    // Ảnh chụp màn hình ứng dụng VNeID (Mục cư trú / Quê quán sau sáp nhập)
    canvas.width = 720;
    canvas.height = 1280;

    // Background điện thoại VNeID (Đỏ cờ / Đỏ bordeaux đặc trưng VNeID)
    ctx.fillStyle = '#991b1b'; // Red header
    ctx.fillRect(0, 0, 720, 180);

    // Body
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 180, 720, 1100);

    // Header VNeID
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ĐỊNH DANH ĐIỆN TỬ QUỐC GIA - VNeID', 360, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('THÔNG TIN CƯ TRÚ & QUÊ QUÁN', 360, 110);
    ctx.font = 'italic 16px Arial';
    ctx.fillText('(Dữ liệu hành chính mới nhất sau sáp nhập)', 360, 145);

    // Thẻ định danh
    ctx.fillStyle = '#ffffff';
    ctx.roundRect ? ctx.roundRect(30, 210, 660, 1000, 16) : ctx.fillRect(30, 210, 660, 1000);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    // Huy hiệu VNeID Mức 2
    ctx.fillStyle = '#059669';
    ctx.fillRect(60, 240, 260, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('✓ TÀI KHOẢN MỨC 2', 80, 268);

    // Thông tin định danh chi tiết
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('NGUYỄN VĂN AN', 60, 330);

    ctx.fillStyle = '#475569';
    ctx.font = '18px Arial';
    ctx.fillText('Số ĐDCN / CCCD: 001095012345', 60, 370);
    ctx.fillText('Ngày sinh: 15/04/1995   |   Giới tính: Nam', 60, 410);

    // Vạch ngăn cách
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 440);
    ctx.lineTo(660, 440);
    ctx.stroke();

    // VÙNG NƠI THƯỜNG TRÚ MỚI SAU SÁP NHẬP
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('📍 NƠI THƯỜNG TRÚ (ĐƠN VỊ HÀNH CHÍNH MỚI):', 60, 480);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Số 28, Ngõ 195 Cầu Giấy, Phường Dịch Vọng', 60, 520);
    ctx.font = '18px Arial';
    ctx.fillText('(Đơn vị hành chính sáp nhập mới)', 60, 555);
    ctx.fillText('Quận Cầu Giấy, Thành phố Hà Nội', 60, 590);

    // VÙNG QUÊ QUÁN
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏡 QUÊ QUÁN (THEO HỆ THỐNG DÂN CƯ QUỐC GIA):', 60, 660);
    ctx.fillStyle = '#0f172a';
    ctx.font = '18px Arial';
    ctx.fillText('Xã Kim Chung, Huyện Hoài Đức, Thành phố Hà Nội', 60, 700);

    // Nơi ở hiện tại
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('NƠI Ở HIỆN TẠI: Cùng nơi thường trú', 60, 760);

    // Khung xác thực Bộ Công An
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(60, 820, 600, 180);
    ctx.strokeStyle = '#86efac';
    ctx.strokeRect(60, 820, 600, 180);

    ctx.fillStyle = '#166534';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('HỆ THỐNG CƠ SỞ DỮ LIỆU QUỐC GIA VỀ DÂN CƯ', 80, 860);
    ctx.font = '15px Arial';
    ctx.fillText('Dữ liệu đã được Bộ Công An xác thực trực tuyến.', 80, 895);
    ctx.fillText('Thời điểm truy xuất: 22/09/2026 09:30:15', 80, 930);
    ctx.font = 'italic 14px Arial';
    ctx.fillText('Ưu tiên sử dụng thông tin cư trú VNeID trong thủ tục nhân sự', 80, 965);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return {
      fileName: 'VNeID_ManHinhCuTru_NguyenVanAn.jpg',
      dataUrl,
      base64Data: dataUrl.replace(/^data:image\/jpeg;base64,/, ''),
    };
  } else if (type === 'cccd_truoc') {
    // Mặt trước CCCD
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, 1000, 630);

    // Viền thẻ
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0284c7';
    ctx.strokeRect(10, 10, 980, 610);

    // Quốc huy / Header
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 500, 50);
    ctx.font = 'italic 18px Arial';
    ctx.fillText('Độc lập - Tự do - Hạnh phúc', 500, 80);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('CĂN CƯỚC CÔNG DÂN / CITIZEN IDENTITY CARD', 500, 130);

    // Ảnh chân dung mô phỏng
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(50, 180, 220, 290);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('ẢNH 3x4', 160, 330);

    // Thông tin chi tiết
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Số / No.: 001095012345', 310, 200);

    ctx.font = '18px Arial';
    ctx.fillText('Họ và tên / Full name: NGUYỄN VĂN AN', 310, 250);
    ctx.fillText('Ngày sinh / Date of birth: 15/04/1995', 310, 295);
    ctx.fillText('Giới tính / Sex: Nam       Quốc tịch: Việt Nam', 310, 340);
    ctx.fillText('Quê quán / Place of origin: Xã Kim Chung, Huyện Hoài Đức, Hà Nội', 310, 385);
    ctx.fillText('Nơi thường trú: Số 28, Ngõ 195 Cầu Giấy, Phường Dịch Vọng, Hà Nội', 310, 430);
    ctx.fillText('Có giá trị đến / Date of expiry: 15/04/2035', 310, 475);

    // Chíp điện tử giả lập
    ctx.fillStyle = '#eab308';
    ctx.fillRect(310, 510, 80, 60);
    ctx.fillStyle = '#713f12';
    ctx.font = '14px Arial';
    ctx.fillText('CHIP', 330, 545);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return {
      fileName: 'CCCD_MatTruoc_NguyenVanAn.jpg',
      dataUrl,
      base64Data: dataUrl.replace(/^data:image\/jpeg;base64,/, ''),
    };
  } else if (type === 'cccd_sau') {
    // Mặt sau CCCD
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1000, 630);

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(10, 10, 980, 610);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Đặc điểm nhân dạng: Nốt ruồi cách 1cm dưới sau cánh mũi trái', 60, 70);
    ctx.fillText('Ngày cấp: 20/05/2021', 60, 120);
    ctx.fillText('Nơi cấp: Cục Cảnh sát QLHC về TTXH', 60, 160);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(60, 200, 180, 220);
    ctx.fillStyle = '#475569';
    ctx.fillText('VÂN TAY NGÓN TRỎ', 70, 310);

    // Vùng mã MRZ
    ctx.fillStyle = '#1e293b';
    ctx.font = '22px monospace';
    ctx.fillText('IDVNM0010950123456<<<<<<<<<<<<<<<', 60, 500);
    ctx.fillText('9504155M3504154VNM<<<<<<<<<<<0', 60, 540);
    ctx.fillText('NGUYEN<<VAN<AN<<<<<<<<<<<<<<<<<<', 60, 580);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return {
      fileName: 'CCCD_MatSau_NguyenVanAn.jpg',
      dataUrl,
      base64Data: dataUrl.replace(/^data:image\/jpeg;base64,/, ''),
    };
  } else {
    // Sơ yếu lý lịch
    canvas.width = 800;
    canvas.height = 1100;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1100);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SƠ YẾU LÝ LỊCH TỰ THUẬT', 400, 60);

    ctx.textAlign = 'left';
    ctx.font = '16px Arial';
    ctx.fillText('Họ và tên: NGUYỄN VĂN AN (Giới tính: Nam)', 80, 120);
    ctx.fillText('Sinh ngày: 15/04/1995 tại Hà Nội', 80, 160);
    ctx.fillText('Số điện thoại: 0912345678', 80, 200);
    ctx.fillText('Công việc ứng tuyển / Vị trí: Kỹ sư phần mềm Senior', 80, 240);
    ctx.fillText('Trình độ học vấn: Kỹ sư Công nghệ Thông tin - ĐH Bách Khoa Hà Nội', 80, 280);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('THÀNH PHẦN GIA ĐÌNH:', 80, 340);

    ctx.font = '16px Arial';
    ctx.fillText('1. Bố: NGUYỄN VĂN BÌNH (Sinh năm: 1965) - Nghề nghiệp: Cán bộ hưu trí', 100, 380);
    ctx.fillText('2. Mẹ: LÊ THỊ MAI (Sinh năm: 1968) - Nghề nghiệp: Kinh doanh tự do', 100, 420);
    ctx.fillText('3. Vợ: TRẦN THU HÀ (Sinh năm: 1997) - Nghề nghiệp: Giáo viên THPT', 100, 460);

    ctx.font = 'italic 15px Arial';
    ctx.fillText('Tôi cam đoan những lời khai trên hoàn toàn đúng sự thật.', 80, 540);
    ctx.font = '16px Arial';
    ctx.fillText('Người khai: NGUYỄN VĂN AN (Đã ký)', 450, 600);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return {
      fileName: 'SoYeuLyLich_NguyenVanAn.jpg',
      dataUrl,
      base64Data: dataUrl.replace(/^data:image\/jpeg;base64,/, ''),
    };
  }
}
