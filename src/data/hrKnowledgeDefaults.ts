import {
  HrSopItem,
  HrSopRegistrationItem,
  LaborLawDocumentItem,
} from '../types';

export const DEFAULT_HR_SOP_LIST: HrSopItem[] = [
  {
    id: 'SOP_HR_TD_01',
    maSop: 'SOP-HR-TD-01',
    tenSop: 'Quy trình Tuyển dụng & Tiếp nhận Nhân viên mới (Onboarding)',
    phienBan: 'v2.1',
    nhomNghiepVu: 'tuyen_dung',
    boPhanBanHanh: 'Phòng Nhân sự – Nhóm Tuyển dụng',
    doiTuongApDung: 'Toàn bộ các Khối, Ban, Bếp Samsung, Bếp ngoài & Khối Văn phòng',
    ngayHieuLuc: '2026-01-01',
    ngayRaSoatTiepTheo: '2027-01-01',
    mucDich:
      'Chuẩn hóa quy trình tuyển chọn, khám sức khỏe đầu vào, tiếp nhận hồ sơ và ký kết hợp đồng thử việc/chính thức cho nhân viên mới.',
    noiDungTomTat:
      'Bao gồm 5 giai đoạn: Tiếp nhận yêu cầu tuyển dụng -> Sàng lọc & Phỏng vấn -> Đăng ký KSK tuyển dụng -> Thu thập hồ sơ & Scan AI -> Bàn giao điểm làm việc & Ký HĐLĐ.',
    cacBuocThucHien:
      'Bước 1: Đơn vị gửi Phiếu yêu cầu tuyển dụng (BM-TD-01) được Trưởng Ban phê duyệt.\nBước 2: Nhóm Tuyển dụng đăng tin, sàng lọc hồ sơ và phối hợp Trưởng điểm phỏng vấn.\nBước 3: Ứng viên đạt phỏng vấn được đăng ký KSK tuyển dụng theo đúng tiêu chuẩn 15 hạng mục của điểm bếp/văn phòng.\nBước 4: Sau khi có kết quả KSK Đạt, Tuyển dụng hướng dẫn nộp hồ sơ, scan CCCD/giấy tờ lên hệ thống HR_SCAN và chọn tiêu chuẩn lương.\nBước 5: Đào tạo hội nhập ngày đầu, cấp phát đồng phục/thẻ ra vào và bàn giao cho Quản lý trực tiếp.',
    bieuMauDinhKem: 'BM-TD-01 (Phiếu yêu cầu TD), BM-TD-02 (Phiếu đánh giá PV), BM-TD-03 (Checklist hồ sơ NVM)',
    trangThai: 'dang_ap_dung',
    nguoiBienSoan: 'Trưởng nhóm Tuyển dụng',
    nguoiPheDuyet: 'Giám đốc Nhân sự',
    ghiChu: 'Đã cập nhật quy định bắt buộc nhập Quê quán & Địa chỉ thường trú trên hệ thống.',
    capNhatLuc: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'SOP_HR_YT_02',
    maSop: 'SOP-HR-YT-02',
    tenSop: 'Quy trình Khám sức khỏe Tuyển dụng & Khám sức khỏe Định kỳ',
    phienBan: 'v1.5',
    nhomNghiepVu: 'y_te_an_toan',
    boPhanBanHanh: 'Bộ phận Y tế – An toàn Lao động',
    doiTuongApDung: 'Nhân viên Bếp Samsung, Bếp ngoài (6 tháng/lần) và Văn phòng (12 tháng/lần)',
    ngayHieuLuc: '2026-01-10',
    ngayRaSoatTiepTheo: '2027-01-10',
    mucDich:
      'Đảm bảo 100% nhân sự trực tiếp chế biến thực phẩm và vận hành đạt tiêu chuẩn sức khỏe theo Thông tư 32/2023/TT-BYT và yêu cầu khách hàng Samsung.',
    noiDungTomTat:
      'Quy định danh mục xét nghiệm bắt buộc (15 mục tuyển dụng / 21 mục định kỳ), điều phối nhà cung cấp bệnh viện/phòng khám và lưu trữ hồ sơ sức khỏe.',
    cacBuocThucHien:
      'Bước 1: Tuyển dụng lập danh sách đăng ký KSK trên hệ thống (Bước 1) trước ngày khám tối thiểu 01 ngày.\nBước 2: Nhân viên Y tế xác nhận lịch hẹn với Nhà cung cấp KSK (Hữu Phúc, Medlatec, Hoàn Mỹ...) và theo dõi tình trạng đi khám (Bước 2).\nBước 3: Nhận kết quả khám, kiểm tra các chỉ số truyền nhiễm (Viêm gan A/E, HBsAg, Cấy phân, X-quang phổi).\nBước 4: Phản hồi kết quả Đạt/Không đạt lên hệ thống để Tuyển dụng điều phối tiếp nhận (Bước 3).\nBước 5: Đối với KSK định kỳ, lập kế hoạch khám nhắc lịch trước 30 ngày so với chu kỳ 6T hoặc 12T.',
    bieuMauDinhKem: 'BM-YT-01 (Bảng tiêu chuẩn 21 mục KSK), BM-YT-02 (Danh sách điều phối NCC)',
    trangThai: 'dang_ap_dung',
    nguoiBienSoan: 'Phụ trách Y tế Công ty',
    nguoiPheDuyet: 'Giám đốc Nhân sự',
    ghiChu: 'Áp dụng đồng bộ 162 điểm bếp/văn phòng trên toàn quốc.',
    capNhatLuc: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'SOP_HR_CB_03',
    maSop: 'SOP-HR-CB-03',
    tenSop: 'Quy trình Chấm công, Tính lương & Chi trả Phúc lợi hàng tháng',
    phienBan: 'v3.0',
    nhomNghiepVu: 'cnb_luong_thuong',
    boPhanBanHanh: 'Phòng Nhân sự – Nhóm C&B',
    doiTuongApDung: 'Toàn thể CBNV có HĐLĐ và nhân viên thử việc',
    ngayHieuLuc: '2026-01-01',
    ngayRaSoatTiepTheo: '2027-01-01',
    mucDich:
      'Đảm bảo tính chính xác, minh bạch và đúng thời hạn trong công tác tổng hợp công, tính lương, phụ cấp, tăng ca và chuyển khoản lương.',
    noiDungTomTat:
      'Chốt công ngày 01 hàng tháng, đối chiếu sai sót đến ngày 03, phê duyệt bảng lương ngày 06 và chi trả lương chậm nhất ngày 10 hàng tháng.',
    cacBuocThucHien:
      'Bước 1: Quản lý điểm/bếp gửi bảng chấm công, đơn tăng ca, đơn nghỉ phép đã duyệt về C&B trước 12h00 ngày 02 hàng tháng.\nBước 2: C&B đối chiếu dữ liệu máy chấm công, phụ cấp tiêu chuẩn (chức vụ, tay nghề, chuyên cần, gia đình) và các khoản thưởng/hỗ trợ.\nBước 3: Gửi bảng công xác nhận (Timesheet) cho từng điểm kiểm tra và phản hồi sai lệch trong vòng 24 giờ.\nBước 4: Lập bảng lương tổng hợp, trích BHXH/BHYT/BHTN/Thuế TNCN và trình Giám đốc Nhân sự, Kế toán trưởng, Tổng Giám đốc duyệt.\nBước 5: Chuyển khoản lương qua ngân hàng và gửi Phiếu lương (Payslip) bảo mật cho từng nhân viên.',
    bieuMauDinhKem: 'BM-CB-01 (Bảng chấm công chuẩn), BM-CB-02 (Phiếu đề nghị điều chỉnh công), BM-CB-03 (Bảng tiêu chuẩn lương)',
    trangThai: 'dang_ap_dung',
    nguoiBienSoan: 'Trưởng nhóm C&B',
    nguoiPheDuyet: 'Tổng Giám đốc',
    ghiChu: 'Kỳ tính công từ ngày 01 đến hết ngày cuối cùng của tháng dương lịch.',
    capNhatLuc: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'SOP_HR_CB_04',
    maSop: 'SOP-HR-CB-04',
    tenSop: 'Quy trình Xét duyệt Thưởng giới thiệu, Người cũ quay lại & Hỗ trợ nhà trọ',
    phienBan: 'v1.2',
    nhomNghiepVu: 'cnb_luong_thuong',
    boPhanBanHanh: 'Nhóm Tuyển dụng & Nhóm C&B',
    doiTuongApDung: 'CBNV giới thiệu ứng viên, Cựu nhân viên tái gia nhập và NVM thuê trọ ngoài tỉnh',
    ngayHieuLuc: '2026-02-01',
    ngayRaSoatTiepTheo: '2027-02-01',
    mucDich:
      'Minh bạch hóa quy trình ghi nhận, thẩm định điều kiện thâm niên/ngày công và chi trả đúng hạn các gói phúc lợi thu hút nhân sự.',
    noiDungTomTat:
      'Ghi nhận trên module Chính sách & Phúc lợi TD, tự động đối chiếu ngày công 30 ngày / 60 ngày và tổng hợp chi trả cùng kỳ lương tháng.',
    cacBuocThucHien:
      'Bước 1: CBNV/NVM đăng ký thông tin giới thiệu, hồ sơ quay lại hoặc hợp đồng thuê trọ với Nhóm Tuyển dụng trước hoặc ngay khi nhận việc.\nBước 2: Tuyển dụng nhập hồ sơ lên phân hệ Chính sách & Phúc lợi TD với trạng thái "Chờ duyệt".\nBước 3: Đến kỳ chốt công, C&B kiểm tra điều kiện thực tế (đủ 30 ngày công, không vi phạm kỷ luật, có xác nhận tạm trú).\nBước 4: Chuyển trạng thái sang "Đủ điều kiện" -> Trình duyệt chi trả -> Cập nhật "Đã chi trả" sau khi thanh toán cùng bảng lương.',
    bieuMauDinhKem: 'BM-PL-01 (Phiếu giới thiệu ứng viên), BM-PL-02 (Đơn đề nghị hỗ trợ nhà trọ)',
    trangThai: 'dang_ap_dung',
    nguoiBienSoan: 'Trưởng nhóm Tuyển dụng',
    nguoiPheDuyet: 'Giám đốc Nhân sự',
    ghiChu: 'Liên kết trực tiếp với 4 danh mục chính sách tại phân hệ Chính sách & Phúc lợi TD.',
    capNhatLuc: '2026-02-15T08:00:00.000Z',
  },
  {
    id: 'SOP_HR_QL_05',
    maSop: 'SOP-HR-QL-05',
    tenSop: 'Quy trình Xử lý Kỷ luật Lao động & Giải quyết Khiếu nại nội bộ',
    phienBan: 'v2.0',
    nhomNghiepVu: 'quan_he_lao_dong',
    boPhanBanHanh: 'Phòng Nhân sự – Quan hệ Lao động',
    doiTuongApDung: 'Toàn thể CBNV và Cấp quản lý các đơn vị',
    ngayHieuLuc: '2026-01-01',
    ngayRaSoatTiepTheo: '2027-01-01',
    mucDich:
      'Đảm bảo việc xử lý vi phạm Nội quy lao động tuân thủ đúng trình tự, thời hiệu và nguyên tắc quy định tại Điều 122 Bộ luật Lao động 2019.',
    noiDungTomTat:
      'Lập biên bản sự việc -> Thu thập bản tường trình & chứng cứ -> Gửi thông báo họp trước ít nhất 05 ngày làm việc -> Họp Hội đồng kỷ luật có đại diện Công đoàn -> Ban hành Quyết định.',
    cacBuocThucHien:
      'Bước 1: Khi phát hiện vi phạm, Quản lý trực tiếp lập Biên bản ghi nhận sự việc ngay tại thời điểm xảy ra (có chữ ký người làm chứng).\nBước 2: Yêu cầu người lao động viết Bản tường trình trong vòng 24 giờ và chuyển hồ sơ về Phòng Nhân sự.\nBước 3: Phòng Nhân sự đối chiếu Nội quy lao động, gửi Thông báo họp xử lý kỷ luật trước ít nhất 05 ngày làm việc cho các thành phần tham dự (NLĐ, Công đoàn cơ sở, Quản lý).\nBước 4: Tổ chức họp xử lý kỷ luật, lập Biên bản cuộc họp có chữ ký các bên.\nBước 5: Ban hành Quyết định xử lý kỷ luật (Khiển trách / Kéo dài thời hạn nâng lương / Cách chức / Sa thải) trong thời hiệu 06 tháng (hoặc 12 tháng với vi phạm tài chính/bí mật).',
    bieuMauDinhKem: 'BM-QL-01 (Biên bản sự việc), BM-QL-02 (Thông báo họp kỷ luật), BM-QL-03 (Quyết định kỷ luật)',
    trangThai: 'dang_ap_dung',
    nguoiBienSoan: 'Chuyên viên Quan hệ Lao động',
    nguoiPheDuyet: 'Tổng Giám đốc',
    ghiChu: 'Tuyệt đối không xử lý kỷ luật NLĐ đang nghỉ ốm, nghỉ thai sản hoặc nuôi con dưới 12 tháng tuổi.',
    capNhatLuc: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'SOP_HR_NV_06',
    maSop: 'SOP-HR-NV-06',
    tenSop: 'Quy trình Nghỉ việc, Bàn giao Công việc & Thanh lý Hợp đồng Lao động',
    phienBan: 'v1.8',
    nhomNghiepVu: 'hanh_chinh_nhan_su',
    boPhanBanHanh: 'Phòng Nhân sự – Hành chính Nhân sự',
    doiTuongApDung: 'Toàn thể CBNV khi chấm dứt HĐLĐ',
    ngayHieuLuc: '2026-01-01',
    ngayRaSoatTiepTheo: '2026-12-31',
    mucDich:
      'Đảm bảo quá trình bàn giao tài sản, công việc suôn sẻ và thanh toán đầy đủ quyền lợi (lương, phép tồn, chốt sổ BHXH) cho người lao động trong thời hạn luật định.',
    noiDungTomTat:
      'Nộp đơn báo trước đúng luật (45/30/3 ngày) -> Bàn giao công việc & đồng phục/thẻ -> Phỏng vấn nghỉ việc -> Quyết toán lương & Chốt sổ BHXH trong vòng 14 ngày làm việc.',
    cacBuocThucHien:
      'Bước 1: Người lao động gửi Đơn xin nghỉ việc theo thời hạn báo trước (45 ngày với HĐ không xác định thời hạn, 30 ngày với HĐ xác định thời hạn, 03 ngày trong thời gian thử việc).\nBước 2: Quản lý trực tiếp phê duyệt, phân công người nhận bàn giao và thông báo Nhân sự.\nBước 3: Trước ngày làm việc cuối cùng 02 ngày, NLĐ hoàn tất Phiếu bàn giao công việc, hoàn trả đồng phục, thẻ nhân viên, công cụ dụng cụ.\nBước 4: Nhân sự ban hành Quyết định chấm dứt HĐLĐ, chốt công, thanh toán lương + phép năm chưa nghỉ trong vòng 14 ngày làm việc.\nBước 5: Thực hiện báo giảm và trả sổ BHXH đã chốt quá trình đóng cho người lao động.',
    bieuMauDinhKem: 'BM-NV-01 (Đơn xin nghỉ việc), BM-NV-02 (Biên bản bàn giao tài sản & công việc)',
    trangThai: 'dang_ra_soat',
    nguoiBienSoan: 'Nhân viên Quản lý Hồ sơ',
    nguoiPheDuyet: 'Giám đốc Nhân sự',
    ghiChu: 'Đang rà soát bổ sung quy trình thu hồi tài khoản phần mềm & thẻ ra vào khu công nghiệp Samsung.',
    capNhatLuc: '2026-03-01T08:00:00.000Z',
  },
];

export const DEFAULT_HR_SOP_REGISTRATIONS: HrSopRegistrationItem[] = [
  {
    id: 'REQ_SOP_001',
    maYeuCau: 'DK-SOP-2026-001',
    loaiDeXuat: 'sua_doi',
    maSopLienQuan: 'SOP-HR-TD-01',
    tenSopDeXuat: 'Cập nhật quy trình xác minh thông tin Quê quán & CCCD trên hệ thống HR_SCAN',
    nhomNghiepVu: 'tuyen_dung',
    donViDeXuat: 'Nhóm Tuyển dụng',
    nguoiDeXuat: 'Trưởng nhóm Tuyển dụng',
    ngayDeXuat: '2026-11-18',
    ngayMongMuonApDung: '2026-12-01',
    mucDoUuTien: 'gap',
    lyDoDeXuat: 'Giảm tỷ lệ sai lệch thông tin hộ khẩu và địa chỉ thường trú khi làm hồ sơ BHXH và hợp đồng lao động.',
    noiDungDeXuat:
      'Bổ sung bước bắt buộc kiểm tra đối chiếu Quê quán và Địa chỉ thường trú tại Bước 1/3 khai báo NVM trước khi chuyển sang Bước 2 chọn đơn vị & chức vụ.',
    trangThai: 'dang_tham_dinh',
    nguoiDuyet: 'Giám đốc Nhân sự',
    phanHoiDuyet: 'Đã thống nhất về mặt nghiệp vụ, đang chờ hoàn thiện phụ lục biểu mẫu.',
    capNhatLuc: '2026-11-19T09:00:00.000Z',
  },
  {
    id: 'REQ_SOP_002',
    maYeuCau: 'DK-SOP-2026-002',
    loaiDeXuat: 'ban_hanh_moi',
    maSopLienQuan: '',
    tenSopDeXuat: 'Quy trình Đánh giá thử việc & Gia hạn Hợp đồng Lao động trực tuyến',
    nhomNghiepVu: 'quan_he_lao_dong',
    donViDeXuat: 'Nhóm C&B & Quan hệ Lao động',
    nguoiDeXuat: 'Trưởng nhóm C&B',
    ngayDeXuat: '2026-11-20',
    ngayMongMuonApDung: '2027-01-01',
    mucDoUuTien: 'binh_thuong',
    lyDoDeXuat: 'Chuẩn hóa thời hạn nhắc lịch đánh giá trước 15 ngày hết hạn thử việc/HĐLĐ, tránh tình trạng ký trễ hạn.',
    noiDungDeXuat:
      'Thiết lập quy trình 4 bước: Hệ thống cảnh báo trước 15 ngày -> Quản lý điểm chấm điểm thử việc -> Nhân sự kiểm tra -> Ban hành Thông báo kết quả & Ký HĐLĐ chính thức.',
    trangThai: 'cho_duyet',
    nguoiDuyet: '',
    phanHoiDuyet: '',
    capNhatLuc: '2026-11-20T10:30:00.000Z',
  },
];

export const DEFAULT_LABOR_LAW_ITEMS: LaborLawDocumentItem[] = [
  {
    id: 'LAW_BLLD_D20',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 20 – BLLĐ 2019',
    tieuDe: 'Các loại Hợp đồng lao động',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'hop_dong_lao_dong',
    tomTatCotLoi:
      'Chỉ còn 02 loại HĐLĐ: (1) HĐLĐ không xác định thời hạn; (2) HĐLĐ xác định thời hạn (thời hạn không quá 36 tháng). Chỉ được ký tối đa 02 lần HĐLĐ xác định thời hạn.',
    noiDungChiTiet:
      '1. Hợp đồng lao động phải được giao kết theo một trong các loại sau đây:\na) Hợp đồng lao động không xác định thời hạn là hợp đồng mà trong đó hai bên không xác định thời hạn, thời điểm chấm dứt hiệu lực của hợp đồng;\nb) Hợp đồng lao động xác định thời hạn là hợp đồng mà trong đó hai bên xác định thời hạn, thời điểm chấm dứt hiệu lực của hợp đồng trong thời gian không quá 36 tháng kể từ thời điểm có hiệu lực của hợp đồng.\n2. Khi HĐLĐ xác định thời hạn hết hạn mà người lao động vẫn tiếp tục làm việc thì trong thời hạn 30 ngày hai bên phải ký HĐLĐ mới; nếu không ký mới thì trở thành HĐLĐ không xác định thời hạn. Trường hợp ký mới là HĐLĐ xác định thời hạn thì chỉ được ký thêm 01 lần, sau đó nếu tiếp tục làm việc phải ký HĐLĐ không xác định thời hạn (trừ một số trường hợp đặc biệt như người cao tuổi, lao động nước ngoài...).',
    luuYApDungThucTe:
      'C&B cần rà soát danh sách hết hạn HĐLĐ trước 30 ngày. Sau 2 lần ký HĐ xác định thời hạn (VD: 12 tháng + 24 tháng), lần thứ 3 bắt buộc chuyển sang HĐ không xác định thời hạn.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'hợp đồng lao động, xác định thời hạn, 36 tháng, ký 2 lần, vô thời hạn',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D25_D27',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 25, 26, 27 – BLLĐ 2019',
    tieuDe: 'Thời gian thử việc, Tiền lương thử việc & Kết thúc thời gian thử việc',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'hop_dong_lao_dong',
    tomTatCotLoi:
      'Chỉ thử việc 01 lần cho 01 công việc: tối đa 180 ngày (Quản lý DN), 60 ngày (Cao đẳng trở lên), 30 ngày (Trung cấp/Công nhân kỹ thuật), 06 ngày làm việc (Công việc khác). Lương thử việc ≥ 85%.',
    noiDungChiTiet:
      '1. Thời gian thử việc do hai bên thỏa thuận căn cứ vào tính chất và mức độ phức tạp của công việc nhưng chỉ được thử việc một lần đối với một công việc và bảo đảm điều kiện:\n- Không quá 180 ngày đối với công việc của người quản lý doanh nghiệp;\n- Không quá 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn, kỹ thuật từ cao đẳng trở lên;\n- Không quá 30 ngày đối với công việc có chức danh nghề nghiệp cần trình độ trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ;\n- Không quá 06 ngày làm việc đối với công việc khác (như phụ bếp phổ thông, tạp vụ...).\n2. Tiền lương của người lao động trong thời gian thử việc do hai bên thỏa thuận nhưng ít nhất phải bằng 85% mức lương của công việc đó.\n3. Trong thời gian thử việc, mỗi bên có quyền hủy bỏ hợp đồng thử việc mà không cần báo trước và không phải bồi thường.',
    luuYApDungThucTe:
      'Không áp dụng thử việc đối với HĐLĐ có thời hạn dưới 01 tháng. Nhóm Tuyển dụng lưu ý chọn đúng khung 6 ngày / 30 ngày / 60 ngày theo đúng vị trí chức danh.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'thử việc, 6 ngày, 30 ngày, 60 ngày, 85% lương, hủy thử việc',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D35',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 35 – BLLĐ 2019',
    tieuDe: 'Quyền đơn phương chấm dứt HĐLĐ của Người lao động',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'nghi_phep_nghi_viec',
    tomTatCotLoi:
      'Người lao động có quyền đơn phương chấm dứt HĐLĐ không cần lý do nhưng phải báo trước: 45 ngày (HĐ không xác định thời hạn), 30 ngày (HĐ 12–36 tháng), 03 ngày làm việc (HĐ dưới 12 tháng).',
    noiDungChiTiet:
      '1. Người lao động có quyền đơn phương chấm dứt hợp đồng lao động nhưng phải báo trước cho người sử dụng lao động như sau:\na) Ít nhất 45 ngày nếu làm việc theo hợp đồng lao động không xác định thời hạn;\nb) Ít nhất 30 ngày nếu làm việc theo hợp đồng lao động xác định thời hạn có thời hạn từ 12 tháng đến 36 tháng;\nc) Ít nhất 03 ngày làm việc nếu làm việc theo hợp đồng lao động xác định thời hạn có thời hạn dưới 12 tháng.\n2. Người lao động có quyền đơn phương chấm dứt hợp đồng lao động không cần báo trước trong trường hợp: không được bố trí đúng công việc/địa điểm, không được trả đủ lương đúng hạn, bị ngược đãi/quấy rối, lao động nữ mang thai có chỉ định của cơ sở khám chữa bệnh...',
    luuYApDungThucTe:
      'Nếu NLĐ nghỉ ngang không báo trước đúng thời hạn (đơn phương chấm dứt trái luật), NLĐ không được trợ cấp thôi việc và phải bồi thường nửa tháng tiền lương + khoản tiền tương ứng những ngày không báo trước.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'nghỉ việc, đơn phương chấm dứt, báo trước, 45 ngày, 30 ngày, nghỉ ngang',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D98',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 98 – BLLĐ 2019',
    tieuDe: 'Tiền lương làm thêm giờ (OT) và làm việc vào ban đêm',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'tien_luong_thuong',
    tomTatCotLoi:
      'OT ngày thường ≥ 150%; Ngày nghỉ hằng tuần ≥ 200%; Ngày lễ, Tết ≥ 300% (chưa kể lương ngày lễ). Làm ban đêm (22h–06h) cộng thêm ≥ 30%; OT ban đêm cộng thêm 20% nữa.',
    noiDungChiTiet:
      '1. Người lao động làm thêm giờ được trả lương tính theo đơn giá tiền lương hoặc tiền lương thực trả theo công việc đang làm như sau:\na) Vào ngày thường, ít nhất bằng 150%;\nb) Vào ngày nghỉ hằng tuần, ít nhất bằng 200%;\nc) Vào ngày nghỉ lễ, tết, ngày nghỉ có hưởng lương, ít nhất bằng 300% chưa kể tiền lương ngày lễ, tết, ngày nghỉ có hưởng lương đối với người lao động hưởng lương ngày.\n2. Người lao động làm việc vào ban đêm (từ 22 giờ đến 06 giờ sáng hôm sau) thì được trả thêm ít nhất bằng 30% tiền lương tính theo đơn giá tiền lương hoặc tiền lương thực trả theo công việc của ngày làm việc bình thường.\n3. Người lao động làm thêm giờ vào ban đêm thì ngoài các khoản trên còn được trả thêm 20% tiền lương tính theo đơn giá tiền lương hoặc tiền lương theo công việc làm vào ban ngày của ngày làm việc bình thường hoặc ngày nghỉ hằng tuần hoặc ngày nghỉ lễ, tết.',
    luuYApDungThucTe:
      'Tỷ lệ thực tế khi OT ban đêm: Ngày thường = 200% (nếu không làm ngày) hoặc 210% (nếu có làm ngày); Ngày nghỉ tuần = 270%; Ngày Lễ/Tết = 390%.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'tăng ca, OT, làm thêm giờ, 150%, 200%, 300%, làm đêm, ca đêm',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D107',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 107 – BLLĐ 2019 & NQ 17/2022',
    tieuDe: 'Giới hạn số giờ làm thêm (OT) tối đa',
    nguonVanBan: 'Bộ luật Lao động 2019 & Nghị quyết 17/2022/UBTVQH15',
    chuyenDe: 'thoi_gio_lam_viec',
    tomTatCotLoi:
      'Làm thêm không quá 50% số giờ làm việc bình thường trong 01 ngày (tổng không quá 12 giờ/ngày), không quá 40 giờ/tháng (hoặc 60 giờ/tháng nếu thuộc diện đặc thù) và không quá 200 giờ/năm (tối đa 300 giờ/năm ở một số ngành).',
    noiDungChiTiet:
      '1. Người sử dụng lao động được sử dụng người lao động làm thêm giờ khi đáp ứng đầy đủ các yêu cầu sau:\na) Phải được sự đồng ý của người lao động;\nb) Bảo đảm số giờ làm thêm không quá 50% số giờ làm việc bình thường trong 01 ngày; trường hợp áp dụng quy định thời giờ làm việc bình thường theo tuần thì tổng số giờ làm việc bình thường và số giờ làm thêm không quá 12 giờ trong 01 ngày; không quá 40 giờ trong 01 tháng;\nc) Bảo đảm số giờ làm thêm không quá 200 giờ trong 01 năm, trừ một số trường hợp đặc thù (dệt may, da giày, chế biến nông lâm thủy sản, cung cấp dịch vụ ăn uống theo thời vụ/đơn hàng gấp...) được làm thêm không quá 300 giờ/năm và phải thông báo bằng văn bản cho Sở LĐ-TB&XH.',
    luuYApDungThucTe:
      'Quản lý các điểm bếp Samsung lưu ý phân bổ ca kíp hợp lý để không vượt trần 40 giờ OT/tháng/nhân sự và luôn có chữ ký đồng ý tăng ca.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'giới hạn tăng ca, 40 giờ, 200 giờ, 300 giờ, 12 giờ ngày',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D113',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 113 & 114 – BLLĐ 2019',
    tieuDe: 'Nghỉ hằng năm (Phép năm) & Phép thâm niên',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'nghi_phep_nghi_viec',
    tomTatCotLoi:
      'Làm đủ 12 tháng được nghỉ 12 ngày phép/năm (điều kiện bình thường), 14 ngày (nặng nhọc/độc hại), 16 ngày (đặc biệt nặng nhọc). Cứ đủ 05 năm làm việc tăng thêm 01 ngày phép.',
    noiDungChiTiet:
      '1. Người lao động làm việc đủ 12 tháng cho một người sử dụng lao động thì được nghỉ hằng năm, hưởng nguyên lương theo HĐLĐ như sau:\na) 12 ngày làm việc đối với người làm công việc trong điều kiện bình thường;\nb) 14 ngày làm việc đối với người làm công việc nặng nhọc, độc hại, nguy hiểm;\nc) 16 ngày làm việc đối với người làm công việc đặc biệt nặng nhọc, độc hại, nguy hiểm.\n2. Người lao động làm việc chưa đủ 12 tháng thì số ngày nghỉ hằng năm theo tỷ lệ tương ứng với số tháng làm việc (mỗi tháng 01 ngày).\n3. Trường hợp do thôi việc, bị mất việc làm mà chưa nghỉ hằng năm hoặc chưa nghỉ hết số ngày nghỉ hằng năm thì được người sử dụng lao động thanh toán tiền lương cho những ngày chưa nghỉ.\n4. Điều 114: Cứ đủ 05 năm làm việc cho một người sử dụng lao động thì số ngày nghỉ hằng năm được tăng thêm tương ứng 01 ngày.',
    luuYApDungThucTe:
      'Chỉ thanh toán tiền phép năm chưa nghỉ khi NLĐ thôi việc/mất việc. Trong năm, khuyến khích NLĐ đăng ký nghỉ hết phép năm theo lịch định kỳ.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'phép năm, nghỉ hằng năm, 12 ngày, thâm niên 5 năm, thanh toán phép tồn',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D115',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 115 – BLLĐ 2019',
    tieuDe: 'Nghỉ việc riêng có hưởng lương & Nghỉ không hưởng lương',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'nghi_phep_nghi_viec',
    tomTatCotLoi:
      'Nghỉ hưởng nguyên lương: Kết hôn (03 ngày); Con đẻ/con nuôi kết hôn (01 ngày); Cha/mẹ đẻ, cha/mẹ nuôi, cha/mẹ vợ/chồng, vợ/chồng, con mất (03 ngày). Ông bà/anh chị em mất: nghỉ không lương 01 ngày.',
    noiDungChiTiet:
      '1. Người lao động được nghỉ việc riêng mà vẫn hưởng nguyên lương và phải thông báo với người sử dụng lao động trong trường hợp sau đây:\na) Kết hôn: nghỉ 03 ngày;\nb) Con đẻ, con nuôi kết hôn: nghỉ 01 ngày;\nc) Cha đẻ, mẹ đẻ, cha nuôi, mẹ nuôi; cha đẻ, mẹ đẻ, cha nuôi, mẹ nuôi của vợ hoặc chồng; vợ hoặc chồng; con đẻ, con nuôi chết: nghỉ 03 ngày.\n2. Người lao động được nghỉ không hưởng lương 01 ngày và phải thông báo khi ông nội, bà nội, ông ngoại, bà ngoại, anh, chị, em ruột chết; cha hoặc mẹ kết hôn; anh, chị, em ruột kết hôn.\n3. Ngoài quy định trên, người lao động có thể thỏa thuận với người sử dụng lao động để nghỉ không hưởng lương.',
    luuYApDungThucTe:
      'Nhân sự yêu cầu NLĐ nộp giấy tờ chứng minh (ảnh thiệp cưới/giấy chứng tử/giấy đăng ký kết hôn) kèm đơn nghỉ việc riêng để C&B chấm công hưởng 100% lương.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'nghỉ việc riêng, kết hôn, cưới hỏi, tang chế, ma chay, nghỉ không lương',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BLLD_D125',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 125 – BLLĐ 2019',
    tieuDe: 'Các trường hợp áp dụng hình thức xử lý kỷ luật Sa thải',
    nguonVanBan: 'Bộ luật Lao động số 45/2019/QH14',
    chuyenDe: 'ky_luat_lao_dong',
    tomTatCotLoi:
      'Sa thải khi: Trộm cắp, tham ô, đánh bạc, cố ý gây thương tích, sử dụng ma túy tại nơi làm việc; Tiết lộ bí mật kinh doanh; Quấy rối tình dục; Tự ý bỏ việc 05 ngày cộng dồn trong 30 ngày hoặc 20 ngày trong 365 ngày.',
    noiDungChiTiet:
      'Hình thức xử lý kỷ luật sa thải được người sử dụng lao động áp dụng trong trường hợp sau đây:\n1. Người lao động có hành vi trộm cắp, tham ô, đánh bạc, cố ý gây thương tích, sử dụng ma túy tại nơi làm việc;\n2. Người lao động có hành vi tiết lộ bí mật kinh doanh, bí mật công nghệ, xâm phạm quyền sở hữu trí tuệ, gây thiệt hại nghiêm trọng hoặc quấy rối tình dục tại nơi làm việc được quy định trong nội quy lao động;\n3. Người lao động bị xử lý kỷ luật kéo dài thời hạn nâng lương hoặc cách chức mà tái phạm trong thời gian chưa xóa kỷ luật;\n4. Người lao động tự ý bỏ việc 05 ngày cộng dồn trong thời hạn 30 ngày hoặc 20 ngày cộng dồn trong thời hạn 365 ngày tính từ ngày đầu tiên tự ý bỏ việc mà không có lý do chính đáng.',
    luuYApDungThucTe:
      'Khi xử lý sa thải do tự ý bỏ việc 5 ngày cộng dồn, Nhân sự bắt buộc phải gửi thông báo mời họp kỷ luật bằng văn bản (có xác nhận bưu điện/Zalo/Email) trước ít nhất 05 ngày làm việc.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'sa thải, kỷ luật, trộm cắp, tự ý bỏ việc, 5 ngày cộng dồn, 20 ngày',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_BHXH_TS',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 137 & 139 – BLLĐ 2019',
    tieuDe: 'Bảo vệ thai sản & Chế độ nghỉ thai sản',
    nguonVanBan: 'Bộ luật Lao động 2019 & Luật BHXH',
    chuyenDe: 'bhxh_thai_san',
    tomTatCotLoi:
      'Lao động nữ nghỉ thai sản 06 tháng (sinh đôi thêm 01 tháng/con). Không sử dụng làm đêm/OT khi mang thai từ tháng thứ 7 hoặc nuôi con dưới 12 tháng. Nuôi con dưới 12 tháng được nghỉ 60 phút/ngày hưởng nguyên lương.',
    noiDungChiTiet:
      '1. Người sử dụng lao động không được sử dụng người lao động làm việc ban đêm, làm thêm giờ và đi công tác xa trong trường hợp: Mang thai từ tháng thứ 07 (hoặc từ tháng thứ 06 nếu làm công việc nặng nhọc, độc hại); Đang nuôi con dưới 12 tháng tuổi (trừ khi NLĐ đồng ý).\n2. Lao động nữ làm nghề, công việc nặng nhọc/độc hại khi mang thai được chuyển sang công việc nhẹ hơn hoặc giảm bớt 01 giờ làm việc hằng ngày mà không bị cắt giảm tiền lương.\n3. Lao động nữ trong thời gian nuôi con dưới 12 tháng tuổi được nghỉ mỗi ngày 60 phút trong thời gian làm việc mà vẫn hưởng đủ tiền lương.\n4. Lao động nữ được nghỉ thai sản trước và sau khi sinh con là 06 tháng.',
    luuYApDungThucTe:
      'Tại các điểm bếp, Quản lý điểm cần báo ngay cho C&B và Y tế khi nhân viên có giấy khám thai để bố trí ca hành chính, tránh bưng bê nặng và áp dụng chế độ nghỉ 60 phút/ngày sau khi đi làm lại.',
    ngayHieuLuc: '2021-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'thai sản, mang thai, 6 tháng, 60 phút, nuôi con nhỏ, không tăng ca',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_ND145_D7_D8',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 7 & 8 – NĐ 145/2020/NĐ-CP',
    tieuDe: 'Thời hạn báo trước ngành đặc thù & Cách tính Trợ cấp thôi việc, mất việc làm',
    nguonVanBan: 'Nghị định 145/2020/NĐ-CP (Hướng dẫn BLLĐ 2019)',
    chuyenDe: 'nghi_phep_nghi_viec',
    tomTatCotLoi:
      'Quy định thời hạn báo trước ít nhất 120 ngày (HĐ từ 12 tháng trở lên) đối với người quản lý DN/ngành đặc thù; hướng dẫn chi tiết cách tính thời gian làm việc để chi trả trợ cấp thôi việc (làm tròn từ đủ 1 đến dưới 6 tháng tính 1/2 năm; từ đủ 6 tháng tính 1 năm).',
    noiDungChiTiet:
      '1. Điều 7 (Ngành, nghề, công việc đặc thù): Đối với người quản lý doanh nghiệp theo Luật Doanh nghiệp, thành viên tổ lái, nhân viên điều độ bay... thời hạn báo trước khi đơn phương chấm dứt HĐLĐ là ít nhất 120 ngày (đối với HĐ không xác định thời hạn hoặc từ 12 tháng trở lên) hoặc ít nhất bằng 1/4 thời hạn HĐLĐ (đối với HĐ dưới 12 tháng).\n2. Điều 8 (Trợ cấp thôi việc, trợ cấp mất việc làm):\n- Thời gian làm việc để tính trợ cấp = Tổng thời gian NLĐ đã làm việc thực tế trừ đi thời gian đã tham gia BHTN và thời gian đã được chi trả trợ cấp trước đó.\n- Cách làm tròn thời gian có tháng lẻ: Từ đủ 01 tháng đến dưới 06 tháng được tính bằng 1/2 năm; từ đủ 06 tháng trở lên được tính bằng 01 năm làm việc.\n- Tiền lương để tính trợ cấp là tiền lương bình quân theo HĐLĐ của 06 tháng liền kề trước khi NLĐ thôi việc hoặc mất việc làm.',
    luuYApDungThucTe:
      'C&B cần kiểm tra giai đoạn thử việc trước 2009 hoặc các giai đoạn nghỉ thai sản/nghỉ ốm không đóng BHTN để xác định chính xác thời gian chi trả trợ cấp thôi việc theo Điều 8 NĐ 145/2020/NĐ-CP.',
    ngayHieuLuc: '2021-02-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, trợ cấp thôi việc, trợ cấp mất việc, báo trước 120 ngày, làm tròn tháng lẻ',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_ND145_D55_D57',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 55, 56, 57 – NĐ 145/2020/NĐ-CP',
    tieuDe: 'Công thức tính Tiền lương làm thêm giờ (OT), Làm đêm & OT ban đêm',
    nguonVanBan: 'Nghị định 145/2020/NĐ-CP (Hướng dẫn BLLĐ 2019)',
    chuyenDe: 'tien_luong_thuong',
    tomTatCotLoi:
      'Hướng dẫn công thức chi tiết tính lương giờ thực trả (không bao gồm tiền thưởng, tiền ăn giữa ca, hỗ trợ xăng xe/điện thoại/nhà ở) để nhân hệ số OT 150% / 200% / 300%, phụ cấp làm đêm +30% và OT ban đêm +20%.',
    noiDungChiTiet:
      '1. Điều 55 (Tiền lương làm thêm giờ): Tiền lương làm thêm giờ = Tiền lương giờ thực trả của công việc đang làm vào ngày làm việc bình thường × Mức ít nhất 150% (ngày thường) hoặc 200% (ngày nghỉ hằng tuần) hoặc 300% (ngày lễ, Tết) × Số giờ làm thêm.\n- Tiền lương giờ thực trả được xác định trên cơ sở tiền lương thực trả theo công việc đang làm của tháng/tuần/ngày chia cho tổng số giờ thực tế làm việc tương ứng (không quá số ngày làm việc bình thường trong tháng và số giờ làm việc bình thường trong ngày).\n2. Điều 56 (Tiền lương làm việc vào ban đêm): Được trả thêm ít nhất 30% so với tiền lương giờ thực trả ban ngày (khung giờ đêm từ 22h00 đến 06h00 sáng hôm sau).\n3. Điều 57 (Tiền lương OT ban đêm): Ngoài tiền lương OT và phụ cấp 30% làm đêm, NLĐ còn được trả thêm 20% tiền lương giờ của công việc làm vào ban ngày tương ứng (ngày thường / ngày nghỉ tuần / ngày lễ).',
    luuYApDungThucTe:
      'Khi tính lương ca đêm tại các bếp Samsung hoạt động 24/7, C&B áp dụng đúng công thức Điều 55–57 NĐ 145/2020/NĐ-CP: không tính các khoản hỗ trợ nhà trọ, thưởng chuyên cần, thưởng sáng kiến vào đơn giá lương giờ OT.',
    ngayHieuLuc: '2021-02-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, công thức OT, tiền lương giờ thực trả, làm đêm 30%, OT ban đêm 20%',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_ND145_D58_D66',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 58, 59, 60, 66 – NĐ 145/2020/NĐ-CP',
    tieuDe: 'Thời giờ làm việc có hưởng lương, Điều kiện OT & Cách tính Phép năm',
    nguonVanBan: 'Nghị định 145/2020/NĐ-CP (Hướng dẫn BLLĐ 2019)',
    chuyenDe: 'thoi_gio_lam_viec',
    tomTatCotLoi:
      'Làm rõ các thời gian được tính vào giờ làm việc hưởng lương (nghỉ giữa ca đêm 45 phút, nghỉ 60 phút nuôi con nhỏ, huấn luyện ATVSLĐ); điều kiện lấy chữ ký đồng ý OT của NLĐ; và quy tắc tính phép năm khi làm việc ≥ 50% số ngày làm việc trong tháng.',
    noiDungChiTiet:
      '1. Điều 58: Thời gian được tính vào thời giờ làm việc được hưởng lương gồm: thời gian nghỉ trong giờ làm việc (tối thiểu 30 phút ca ngày / 45 phút ca đêm liên tục từ 6 giờ trở lên), thời gian nghỉ theo tính chất công việc, thời gian học tập/huấn luyện ATVSLĐ, thời gian nghỉ 30 phút hành kinh & 60 phút nuôi con dưới 12 tháng tuổi của lao động nữ.\n2. Điều 59 & 60 (Làm thêm giờ): Phải có sự đồng ý của NLĐ về thời gian, địa điểm, công việc làm thêm (trừ trường hợp đặc biệt theo Điều 108 BLLĐ). Tổng số giờ làm việc bình thường + OT không quá 12 giờ/ngày.\n3. Điều 66 (Tính ngày nghỉ hằng năm): Trường hợp tổng số ngày làm việc và ngày nghỉ có hưởng lương chiếm từ 50% số ngày làm việc bình thường trong tháng trở lên thì tháng đó được tính là 01 tháng làm việc để tính ngày nghỉ phép năm.',
    luuYApDungThucTe:
      'Áp dụng trực tiếp cho bảng chấm công tháng: nhân viên mới vào làm từ ngày 15 trở về trước (đủ ≥ 50% công chuẩn tháng) được tính cộng 01 ngày phép năm cho tháng đó.',
    ngayHieuLuc: '2021-02-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, phép năm 50%, đồng ý OT, nghỉ giữa ca 45 phút, thời giờ làm việc',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_ND145_D69_D70',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 69 & 70 – NĐ 145/2020/NĐ-CP',
    tieuDe: 'Nội dung bắt buộc của Nội quy lao động & Trình tự xử lý Kỷ luật lao động',
    nguonVanBan: 'Nghị định 145/2020/NĐ-CP (Hướng dẫn BLLĐ 2019)',
    chuyenDe: 'ky_luat_lao_dong',
    tomTatCotLoi:
      'Quy định 09 nội dung bắt buộc trong Nội quy lao động (đặc biệt bổ sung phòng, chống quấy rối tình dục và người có thẩm quyền xử lý kỷ luật) cùng trình tự 4 bước họp xử lý kỷ luật hợp pháp (thông báo trước ít nhất 05 ngày làm việc).',
    noiDungChiTiet:
      '1. Điều 69 (Nội quy lao động): Doanh nghiệp sử dụng từ 10 NLĐ trở lên phải ban hành Nội quy lao động bằng văn bản và đăng ký tại Sở LĐ-TB&XH trong 10 ngày. Nội quy bắt buộc có 09 nội dung: (1) Thời giờ làm việc/nghỉ ngơi; (2) Trật tự nơi làm việc; (3) ATVSLĐ; (4) Phòng, chống quấy rối tình dục; (5) Bảo vệ tài sản, bí mật kinh doanh/công nghệ; (6) Tạm chuyển NLĐ làm việc khác HĐLĐ; (7) Hành vi vi phạm & hình thức kỷ luật; (8) Trách nhiệm vật chất; (9) Người có thẩm quyền xử lý kỷ luật.\n2. Điều 70 (Trình tự xử lý kỷ luật):\n- Lập biên bản vi phạm và thông báo cho tổ chức đại diện NLĐ tại cơ sở.\n- Thông báo nội dung, thời gian, địa điểm họp xử lý kỷ luật trước ít nhất 05 ngày làm việc đến tất cả thành phần bắt buộc tham dự.\n- Tiến hành họp xử lý kỷ luật, lập biên bản họp có chữ ký các bên (nếu có người không ký phải ghi rõ lý do).\n- Ban hành Quyết định xử lý kỷ luật trong thời hiệu và gửi cho các thành phần tham dự.',
    luuYApDungThucTe:
      'Mọi hồ sơ kỷ luật (đặc biệt Sa thải) nếu thiếu thông báo trước 05 ngày làm việc hoặc thiếu biên bản họp theo Điều 70 NĐ 145/2020/NĐ-CP sẽ bị Tòa án/Thanh tra tuyên vô hiệu.',
    ngayHieuLuc: '2021-02-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, nội quy lao động, 9 nội dung bắt buộc, trình tự kỷ luật, thông báo 5 ngày',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'LAW_ND145_D80',
    loaiVanBan: 'luat_lao_dong',
    soDieu: 'Điều 80 – NĐ 145/2020/NĐ-CP',
    tieuDe: 'Chính sách nghỉ trong thời gian hành kinh & nuôi con dưới 12 tháng tuổi',
    nguonVanBan: 'Nghị định 145/2020/NĐ-CP (Hướng dẫn BLLĐ 2019)',
    chuyenDe: 'bhxh_thai_san',
    tomTatCotLoi:
      'Lao động nữ trong thời gian hành kinh được nghỉ 30 phút/ngày (tối thiểu 03 ngày/tháng) hưởng nguyên lương; nuôi con dưới 12 tháng tuổi nghỉ 60 phút/ngày. Nếu không có nhu cầu nghỉ và được NSDLĐ đồng ý làm việc thì được trả thêm tiền lương tương ứng.',
    noiDungChiTiet:
      '1. Nghỉ trong thời gian hành kinh:\n- Lao động nữ được nghỉ mỗi ngày 30 phút tính vào thời giờ làm việc và vẫn được hưởng đủ tiền lương theo HĐLĐ. Số ngày nghỉ do hai bên thỏa thuận nhưng tối thiểu là 03 ngày làm việc trong một tháng.\n- Trường hợp lao động nữ không có nhu cầu nghỉ và được người sử dụng lao động đồng ý để làm việc thì ngoài tiền lương được hưởng, NLĐ được trả thêm tiền lương theo công việc mà NLĐ đã làm trong thời gian được nghỉ (không tính vào thời giờ làm thêm).\n2. Nghỉ trong thời gian nuôi con dưới 12 tháng tuổi:\n- Được nghỉ mỗi ngày 60 phút trong thời gian làm việc để cho con bú, vắt, trữ sữa, nghỉ ngơi mà vẫn hưởng đủ tiền lương.\n- Nếu NLĐ không có nhu cầu nghỉ và được NSDLĐ đồng ý làm việc thì được trả thêm tiền lương tương ứng với thời gian 60 phút/ngày đó.',
    luuYApDungThucTe:
      'Rất quan trọng tại các điểm Bếp có tỷ lệ lao động nữ cao: C&B cần cấu hình phụ cấp/khoản trả thêm 1,5 giờ/tháng (chế độ hành kinh) hoặc 60 phút/ngày (nuôi con nhỏ) nếu NLĐ đăng ký không nghỉ mà làm trọn ca.',
    ngayHieuLuc: '2021-02-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, lao động nữ, hành kinh 30 phút, 3 ngày tháng, nuôi con nhỏ 60 phút, trả thêm lương',
    nguoiCapNhat: 'Ban Pháp chế & Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
];

export const DEFAULT_INTERNAL_REGULATION_ITEMS: LaborLawDocumentItem[] = [
  {
    id: 'NQLD_CH2',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương II (Điều 4–8)',
    tieuDe: 'Thời giờ làm việc, Ca kíp vận hành & Quy định Chấm công',
    nguonVanBan: 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'thoi_gio_lam_viec',
    tomTatCotLoi:
      'Khối Văn phòng: 08h00–17h00 (T2–T6, nghỉ trưa 60 phút). Khối Bếp/Vận hành: Làm theo phân ca 8 tiếng/ngày (Ca sáng, Ca chiều, Ca đêm), nghỉ luân phiên 01 ngày/tuần. Nghiêm cấm chấm công hộ.',
    noiDungChiTiet:
      '1. Thời giờ làm việc bình thường không quá 08 giờ/ngày và 48 giờ/tuần.\n2. Khối Văn phòng làm việc từ Thứ 2 đến Thứ 6 (08:00–17:00), nghỉ Thứ 7 & Chủ nhật.\n3. Khối Bếp Samsung và Bếp ngoài làm việc theo lịch phân ca của Quản lý điểm (Ca 1: 05:30–14:00, Ca 2: 13:30–22:00, Ca đêm: 22:00–06:00), bao gồm thời gian nghỉ giữa ca theo quy định.\n4. Tất cả CBNV bắt buộc chấm công bằng vân tay/khuôn mặt khi đến và khi về. Trường hợp quên chấm công phải lập phiếu xác nhận có chữ ký Quản lý trực tiếp trong vòng 48 giờ.\n5. Nghiêm cấm tuyệt đối hành vi chấm công hộ hoặc nhờ người khác chấm công hộ.',
    luuYApDungThucTe:
      'Đi muộn hoặc về sớm không phép trên 15 phút quá 03 lần/tháng sẽ bị trừ thưởng chuyên cần và lập biên bản nhắc nhở.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'giờ làm việc, ca kíp, chấm công, chấm công hộ, đi muộn, văn phòng, bếp',
    nguoiCapNhat: 'Phòng Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_CH3',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương III (Điều 9–14)',
    tieuDe: 'Trật tự nơi làm việc, Đồng phục & Tiêu chuẩn ATVSTP',
    nguonVanBan: 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'quy_dinh_chung',
    tomTatCotLoi:
      'Nhân viên khu vực bếp bắt buộc mặc đủ bảo hộ (mũ lưới trùm tóc, khẩu trang, tạp dề, ủng), cắt ngắn móng tay, không đeo trang sức và không mang điện thoại cá nhân vào khu chế biến.',
    noiDungChiTiet:
      '1. CBNV phải đeo thẻ nhân viên và mặc đồng phục gọn gàng, sạch sẽ trong suốt thời gian làm việc.\n2. Đối với nhân sự tại các điểm Bếp ăn công nghiệp:\n- Bắt buộc mặc đầy đủ đồ bảo hộ ATVSTP: mũ trùm kín tóc, khẩu trang y tế, áo/quần đồng phục, tạp dề đúng màu phân khu (sống/chín), giày/ủng chống trượt.\n- Không đeo nhẫn, đồng hồ, vòng tay, khuyên tai; móng tay cắt ngắn, không sơn móng tay.\n- Rửa tay sát khuẩn đúng quy trình 6 bước trước khi vào bếp và sau khi đi vệ sinh.\n- Không mang điện thoại di động, tiền bạc, đồ ăn cá nhân vào khu vực sơ chế/chế biến.\n3. Cấm hút thuốc lá, uống rượu bia hoặc sử dụng chất kích thích trước và trong giờ làm việc.',
    luuYApDungThucTe:
      'Các điểm Bếp Samsung áp dụng kiểm tra an ninh và ATVSTP nghiêm ngặt hàng ngày; vi phạm mang điện thoại hoặc thiếu bảo hộ sẽ bị trừ điểm KPI điểm bếp.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'đồng phục, ATVSTP, bảo hộ, trang sức, điện thoại, vệ sinh thực phẩm',
    nguoiCapNhat: 'Phòng Nhân sự & QA',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_CH4',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương IV (Điều 15–19)',
    tieuDe: 'An toàn Vệ sinh Lao động, PCCC & Khám sức khỏe bắt buộc',
    nguonVanBan: 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'an_toan_vsld',
    tomTatCotLoi:
      '100% nhân viên phải tham gia huấn luyện ATVSLĐ, PCCC và hoàn thành KSK tuyển dụng / KSK định kỳ 6–12 tháng theo đúng tiêu chuẩn điểm làm việc.',
    noiDungChiTiet:
      '1. CBNV có trách nhiệm tuân thủ nghiêm quy trình vận hành thiết bị bếp công nghiệp (tủ cơm, bếp gas công nghiệp, máy thái thịt, kho lạnh) và quy định PCCC.\n2. Khi phát hiện rò rỉ gas, chập điện hoặc sự cố mất an toàn phải báo ngay cho Quản lý điểm và bộ phận Kỹ thuật.\n3. Nhân viên thuộc khối Bếp bắt buộc hoàn thành khám sức khỏe định kỳ 06 tháng/lần (hoặc 12 tháng/lần tùy điểm) theo danh mục 21 hạng mục của Công ty. Trường hợp mắc bệnh truyền nhiễm cấp tính (tiêu chảy, viêm gan A/E, bệnh ngoài da lở loét...) phải báo ngay cho Y tế để tạm ngừng tiếp xúc thực phẩm và điều trị.',
    luuYApDungThucTe:
      'Từ chối tham gia KSK định kỳ không có lý do chính đáng sẽ bị tạm đình chỉ bố trí ca làm việc tại khu vực chế biến.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'an toàn lao động, PCCC, khám sức khỏe định kỳ, bệnh truyền nhiễm, thiết bị bếp',
    nguoiCapNhat: 'Bộ phận Y tế & HSE',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_CH5',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương V (Điều 20–24)',
    tieuDe: 'Bảo vệ tài sản Công ty & Bảo mật thông tin',
    nguonVanBan: 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'quy_dinh_chung',
    tomTatCotLoi:
      'Nghiêm cấm mang thực phẩm, nguyên liệu, tài sản công ty ra ngoài trái phép. Nghiêm cấm tiết lộ bảng lương, công thức chế biến, giá thầu và dữ liệu khách hàng (đặc biệt khu vực Samsung).',
    noiDungChiTiet:
      '1. Mọi tài sản, trang thiết bị, nguyên vật liệu, thực phẩm tại điểm bếp và văn phòng thuộc quyền quản lý của Công ty. Nghiêm cấm hành vi mang ra khỏi cổng nhà máy/điểm bếp khi chưa có phiếu xuất hợp lệ.\n2. Quy định bảo mật thông tin:\n- Không quay phim, chụp ảnh trái phép trong khuôn viên nhà máy khách hàng (Samsung và các đối tác KCN).\n- Không tiết lộ thông tin bảng lương, thu nhập cá nhân, dữ liệu nhân sự, hợp đồng cung cấp suất ăn, đơn giá nguyên liệu cho bên thứ ba.\n3. Sử dụng tài nguyên công ty (điện, nước, máy tính, nguyên liệu) tiết kiệm, đúng mục đích.',
    luuYApDungThucTe:
      'Hành vi quay phim/chụp ảnh trong nhà máy Samsung hoặc mang thực phẩm ra ngoài không phép được xếp vào nhóm vi phạm nghiêm trọng có thể bị xử lý sa thải.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'bảo mật, tài sản, mang thực phẩm, chụp ảnh, Samsung, bí mật kinh doanh',
    nguoiCapNhat: 'Phòng Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_CH6',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương VI (Điều 25–30)',
    tieuDe: 'Phân loại Hành vi Vi phạm & Khung Xử lý Kỷ luật Lao động',
    nguonVanBan: 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'ky_luat_lao_dong',
    tomTatCotLoi:
      '4 mức kỷ luật chính thức: (1) Khiển trách (xóa sau 3 tháng); (2) Kéo dài thời hạn nâng lương không quá 06 tháng; (3) Cách chức; (4) Sa thải (theo Điều 125 BLLĐ).',
    noiDungChiTiet:
      '1. Khiển trách bằng văn bản (thời hạn xóa kỷ luật 03 tháng): Đi muộn/về sớm quá 3 lần/tháng; không mặc đúng đồng phục/bảo hộ sau khi đã nhắc nhở; nghỉ không phép 01 ngày; không tuân thủ phân công hợp lý.\n2. Kéo dài thời hạn nâng lương không quá 06 tháng (hoặc Cách chức đối với cấp quản lý): Tái phạm lỗi đã bị khiển trách; chấm công hộ; nghỉ không phép từ 02–04 ngày/tháng; gây thiệt hại tài sản công ty từ 5 triệu đến dưới 20 triệu đồng; vi phạm quy trình ATVSTP gây phản ánh từ khách hàng.\n3. Sa thải: Trộm cắp thực phẩm/tài sản; đánh nhau/gây thương tích; uống rượu bia say xỉn gây rối hoặc sử dụng ma túy tại nơi làm việc; tiết lộ bí mật kinh doanh; quấy rối tình dục; tự ý bỏ việc 05 ngày cộng dồn trong 30 ngày hoặc 20 ngày trong 365 ngày.',
    luuYApDungThucTe:
      'Mọi quyết định kỷ luật phải tuân thủ đúng SOP-HR-QL-05 và không được phạt tiền, cắt lương thay cho việc xử lý kỷ luật lao động.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'kỷ luật, khiển trách, nâng lương, cách chức, sa thải, khung xử lý, vi phạm',
    nguoiCapNhat: 'Phòng Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_CH7',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương VII (Điều 31–35)',
    tieuDe: 'Thủ tục Xin nghỉ phép, Nghỉ đột xuất & Bồi thường Trách nhiệm Vật chất',
    nguonVanBan: 'Nội quy Lao động Công ty (Bản đăng ký 2026)',
    chuyenDe: 'nghi_phep_nghi_viec',
    tomTatCotLoi:
      'Nghỉ phép từ 1–2 ngày báo trước ít nhất 02 ngày; từ 03 ngày trở lên báo trước ít nhất 05 ngày. Nghỉ ốm đột xuất phải báo Quản lý điểm trước giờ vào ca tối thiểu 02 tiếng và nộp Giấy chứng nhận nghỉ hưởng BHXH.',
    noiDungChiTiet:
      '1. Thủ tục xin nghỉ phép năm / nghỉ không lương:\n- Nghỉ từ 01 đến 02 ngày: Gửi đơn xin nghỉ trước ít nhất 02 ngày làm việc.\n- Nghỉ từ 03 ngày trở lên: Gửi đơn xin nghỉ trước ít nhất 05 ngày làm việc để Quản lý điểm sắp xếp nhân sự thay thế.\n2. Trường hợp ốm đau, tai nạn, việc khẩn cấp đột xuất: Phải gọi điện hoặc nhắn tin báo trực tiếp cho Quản lý điểm trước giờ vào ca ít nhất 02 giờ, sau đó bổ sung đơn nghỉ phép / giấy ra viện / giấy nghỉ hưởng BHXH ngay ngày đầu đi làm lại.\n3. Trách nhiệm vật chất: Người lao động làm hư hỏng dụng cụ, thiết bị do sơ suất gây thiệt hại không nghiêm trọng (dưới 10 tháng lương tối thiểu vùng) phải bồi thường tối đa 03 tháng tiền lương và được khấu trừ hằng tháng không quá 30% tiền lương thực trả sau khi đóng BHXH/thuế.',
    luuYApDungThucTe:
      'Nghỉ không báo trước hoặc không có sự đồng ý của Quản lý điểm (trừ lý do bất khả kháng có chứng từ) được tính là nghỉ không phép.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: 'xin nghỉ phép, nghỉ đột xuất, nghỉ ốm, trách nhiệm vật chất, bồi thường, 30% lương',
    nguoiCapNhat: 'Phòng Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_ND145_QRTD',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương VIII (Theo Điều 84–86 NĐ 145/2020/NĐ-CP)',
    tieuDe: 'Phòng, chống Quấy rối tình dục tại nơi làm việc',
    nguonVanBan: 'Nội quy Lao động Công ty (Cập nhật theo NĐ 145/2020/NĐ-CP)',
    chuyenDe: 'ky_luat_lao_dong',
    tomTatCotLoi:
      'Nội dung bắt buộc trong NQLĐ theo NĐ 145/2020/NĐ-CP: Nghiêm cấm mọi hành vi quấy rối tình dục (thể chất, lời nói, phi lời nói) tại văn phòng, điểm bếp, KTX hoặc xe đưa đón; quy định kênh tố cáo bảo mật và xử lý kỷ luật đến mức Sa thải.',
    noiDungChiTiet:
      '1. Các hành vi bị nghiêm cấm (theo Điều 84 NĐ 145/2020/NĐ-CP):\n- Quấy rối mang tính thể chất: tiếp xúc, cố tình đụng chạm cơ thể không mong muốn.\n- Quấy rối bằng lời nói: nhận xét khiếm nhã, gạ gẫm, đề nghị liên quan đến tình dục.\n- Quấy rối phi lời nói: ngôn ngữ cơ thể không đứng đắn, gửi hình ảnh/tin nhắn/video nhạy cảm qua Zalo, Email hoặc trưng bày tài liệu khiêu dâm tại nơi làm việc.\n2. Phạm vi nơi làm việc: Bao gồm văn phòng, các điểm bếp Samsung/Bếp ngoài, nhà kho, ký túc xá công ty, khu vực ăn ca, xe đưa đón và các chuyến công tác/sự kiện công ty.\n3. Trình tự khiếu nại & bảo vệ nạn nhân: Người bị hại hoặc người chứng kiến báo ngay cho Giám đốc Nhân sự / Công đoàn cơ sở. Công ty cam kết giữ bí mật tuyệt đối danh tính, điều tra độc lập trong vòng 07 ngày làm việc và không để xảy ra hành vi trả đũa.\n4. Chế tài xử lý: Hành vi quấy rối tình dục tại nơi làm việc bị áp dụng hình thức kỷ luật cao nhất là Sa thải (Điều 125 BLLĐ 2019).',
    luuYApDungThucTe:
      'Bắt buộc phổ biến trong buổi đào tạo hội nhập cho 100% nhân viên mới và niêm yết công khai tại bảng tin các điểm bếp theo quy định của Nghị định 145/2020/NĐ-CP.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, quấy rối tình dục, phòng chống, khiếu nại, bảo mật, sa thải',
    nguoiCapNhat: 'Phòng Nhân sự & Công đoàn',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_ND145_THAMQUYEN_KL',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Chương IX (Theo Điều 69–70 NĐ 145/2020/NĐ-CP)',
    tieuDe: 'Người có thẩm quyền xử lý Kỷ luật, Trình tự họp & Tạm đình chỉ công việc',
    nguonVanBan: 'Nội quy Lao động Công ty (Cập nhật theo NĐ 145/2020/NĐ-CP)',
    chuyenDe: 'ky_luat_lao_dong',
    tomTatCotLoi:
      'Quy định người có thẩm quyền ký quyết định kỷ luật (Tổng Giám đốc / Giám đốc Nhân sự được ủy quyền); bắt buộc gửi thông báo họp trước ≥ 05 ngày làm việc và quy định tạm đình chỉ công việc tối đa 15 ngày (tạm ứng 50% lương).',
    noiDungChiTiet:
      '1. Người có thẩm quyền xử lý kỷ luật lao động (Khoản 2 Điều 69 NĐ 145/2020/NĐ-CP): Là Người đại diện theo pháp luật của Công ty (Tổng Giám đốc) hoặc Người được ủy quyền bằng văn bản giao kết HĐLĐ (Giám đốc Nhân sự).\n2. Trình tự họp xử lý kỷ luật bắt buộc (Điều 70 NĐ 145/2020/NĐ-CP):\n- Bước 1: Lập biên bản vi phạm tại thời điểm phát hiện (có người làm chứng).\n- Bước 2: Gửi Thông báo họp xử lý kỷ luật trước ít nhất 05 ngày làm việc đến NLĐ, đại diện Công đoàn cơ sở và Quản lý đơn vị.\n- Bước 3: Tổ chức họp, ghi Biên bản cuộc họp đầy đủ ý kiến bào chữa của NLĐ và đại diện Công đoàn.\n- Bước 4: Ban hành Quyết định xử lý kỷ luật đúng thời hiệu và gửi trực tiếp cho các bên.\n3. Tạm đình chỉ công việc: Chỉ áp dụng khi vụ việc có tình tiết phức tạp nếu để NLĐ tiếp tục làm việc sẽ gây khó khăn cho việc xác minh; phải tham khảo ý kiến Công đoàn; thời hạn không quá 15 ngày (trường hợp đặc biệt không quá 90 ngày) và Công ty tạm ứng 50% tiền lương trước khi đình chỉ.',
    luuYApDungThucTe:
      'Quản lý điểm bếp KHÔNG có thẩm quyền tự ra quyết định sa thải hoặc đình chỉ nhân viên; mọi sự việc phải lập biên bản và chuyển ngay về Phòng Nhân sự xử lý đúng Điều 70 NĐ 145/2020/NĐ-CP.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, thẩm quyền kỷ luật, tạm đình chỉ, 15 ngày, 50% lương, thông báo 5 ngày',
    nguoiCapNhat: 'Phòng Nhân sự',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'NQLD_ND145_LDNU',
    loaiVanBan: 'noi_quy_lao_dong',
    soDieu: 'NQLĐ – Phụ lục I (Theo Điều 80 NĐ 145/2020/NĐ-CP)',
    tieuDe: 'Chế độ Lao động nữ (Nghỉ 30 phút hành kinh & 60 phút nuôi con nhỏ)',
    nguonVanBan: 'Nội quy Lao động Công ty (Cập nhật theo NĐ 145/2020/NĐ-CP)',
    chuyenDe: 'bhxh_thai_san',
    tomTatCotLoi:
      'Áp dụng thống nhất toàn Công ty: Lao động nữ được nghỉ 30 phút/ngày × 03 ngày/tháng trong thời kỳ hành kinh và 60 phút/ngày khi nuôi con dưới 12 tháng tuổi; nếu đăng ký không nghỉ sẽ được thanh toán thêm tiền lương vào kỳ lương tháng.',
    noiDungChiTiet:
      '1. Chế độ nghỉ hành kinh (Khoản 3 Điều 80 NĐ 145/2020/NĐ-CP): Mỗi tháng lao động nữ được nghỉ 30 phút/ngày trong 03 ngày làm việc (tổng 1,5 giờ/tháng) hưởng nguyên lương. Nếu nhân viên có nguyện vọng làm việc bình thường không nghỉ và được Quản lý điểm đồng ý, C&B sẽ tự động chi trả thêm tiền lương tương ứng 1,5 giờ làm việc vào bảng lương tháng.\n2. Chế độ nuôi con dưới 12 tháng tuổi (Khoản 4 Điều 80 NĐ 145/2020/NĐ-CP): Lao động nữ nộp bản sao Giấy khai sinh của con cho Nhân sự để hưởng chế độ nghỉ 60 phút/ngày (đến muộn 60 phút, về sớm 60 phút hoặc nghỉ giữa ca) mà vẫn hưởng đủ 100% lương. Trường hợp tự nguyện làm đủ 8 giờ/ngày sẽ được trả thêm tiền lương cho 60 phút đó.\n3. Bố trí phòng vắt/trữ sữa hoặc khu vực nghỉ ngơi sạch sẽ tại các điểm có đông lao động nữ.',
    luuYApDungThucTe:
      'Quản lý điểm bếp nhắc nhở nhân viên nữ sau khi sinh đi làm lại nộp ngay Giấy khai sinh cho C&B để không bị thiệt quyền lợi 60 phút/ngày theo NĐ 145/2020/NĐ-CP.',
    ngayHieuLuc: '2026-01-01',
    trangThai: 'dang_hieu_luc',
    tuKhoa: '145/2020/NĐ-CP, lao động nữ, hành kinh, 30 phút, 60 phút, nuôi con dưới 12 tháng',
    nguoiCapNhat: 'Phòng Nhân sự & C&B',
    capNhatLuc: '2026-01-01T08:00:00.000Z',
  },
];
