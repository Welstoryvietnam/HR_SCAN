export type HealthCheckItemKey =
  | 'khamLamSangTongQuat'
  | 'xetNghiemMau'
  | 'xetNghiemNuocTieu'
  | 'chuanDoanHinhAnh'
  | 'viemGanA'
  | 'viemGanE'
  | 'soiPhan'
  | 'xetNghiemPhan'
  | 'khamPhuKhoa'
  | 'tamSoatTuyenVu'
  | 'tamSoatUngThuCoTuCung'
  | 'viemGanB'
  | 'viemGanC'
  | 'hpDaDay'
  | 'hiv'
  | 'maTuy4Chan'
  | 'nongDoConHoiTho'
  | 'chatGayNghien5Trong1'
  | 'sieuAmOBung'
  | 'nhomMauRh'
  | 'nhomMauABO';

export interface HealthCheckColumnDef {
  key: HealthCheckItemKey;
  index: number;
  colLetter: string;
  label: string;
  shortLabel: string;
  description: string;
  group: 'lam_sang' | 'huyet_hoc' | 'vi_sinh' | 'phu_khoa' | 'doc_chat';
}

export const HEALTH_CHECK_ITEMS: HealthCheckColumnDef[] = [
  {
    key: 'khamLamSangTongQuat',
    index: 1,
    colLetter: 'G',
    label: 'Khám lâm sàng tổng quát',
    shortLabel: 'Lâm sàng TQ',
    description: 'Đo chỉ số sinh tồn, khám Nội, Ngoại, Da liễu, Tai-Mũi-Họng, Răng-Hàm-Mặt, Mắt',
    group: 'lam_sang',
  },
  {
    key: 'xetNghiemMau',
    index: 2,
    colLetter: 'H',
    label: 'Xét nghiệm máu',
    shortLabel: 'XN Máu',
    description: 'Tổng phân tích tế bào máu, đường huyết (Glucose), Ure, Creatinin, men gan GOT, GPT',
    group: 'huyet_hoc',
  },
  {
    key: 'xetNghiemNuocTieu',
    index: 3,
    colLetter: 'I',
    label: 'Xét nghiệm nước tiểu',
    shortLabel: 'Nước tiểu',
    description: 'Tổng phân tích 10 thông số nước tiểu',
    group: 'huyet_hoc',
  },
  {
    key: 'chuanDoanHinhAnh',
    index: 4,
    colLetter: 'J',
    label: 'Chuẩn đoán hình ảnh',
    shortLabel: 'X-Quang phổi',
    description: 'Chụp X-Quang tim phổi thẳng kỹ thuật số',
    group: 'lam_sang',
  },
  {
    key: 'viemGanA',
    index: 5,
    colLetter: 'K',
    label: 'Xét nghiệm viêm gan A',
    shortLabel: 'Viêm gan A',
    description: 'Xét nghiệm kháng thể Anti-HAV (An toàn vệ sinh thực phẩm)',
    group: 'vi_sinh',
  },
  {
    key: 'viemGanE',
    index: 6,
    colLetter: 'L',
    label: 'Xét nghiệm viêm gan E',
    shortLabel: 'Viêm gan E',
    description: 'Xét nghiệm kháng thể Anti-HEV (An toàn vệ sinh thực phẩm)',
    group: 'vi_sinh',
  },
  {
    key: 'soiPhan',
    index: 7,
    colLetter: 'M',
    label: 'Soi phân',
    shortLabel: 'Soi phân',
    description: 'Soi tươi tìm ký sinh trùng đường ruột, hồng cầu, bạch cầu trong phân',
    group: 'vi_sinh',
  },
  {
    key: 'xetNghiemPhan',
    index: 8,
    colLetter: 'N',
    label: 'Xét nghiệm phân',
    shortLabel: 'Cấy phân',
    description: 'Nuôi cấy phân tìm vi khuẩn đường ruột (Tả, Lỵ, Thương hàn - bắt buộc khối Bếp)',
    group: 'vi_sinh',
  },
  {
    key: 'khamPhuKhoa',
    index: 9,
    colLetter: 'O',
    label: 'Khám và tư vấn khám phụ khoa',
    shortLabel: 'Khám phụ khoa',
    description: 'Khám lâm sàng và tư vấn chuyên khoa phụ sản dành cho lao động nữ',
    group: 'phu_khoa',
  },
  {
    key: 'tamSoatTuyenVu',
    index: 10,
    colLetter: 'P',
    label: 'Tầm soát tuyến vú',
    shortLabel: 'Tuyến vú',
    description: 'Khám lâm sàng tầm soát bệnh lý tuyến vú',
    group: 'phu_khoa',
  },
  {
    key: 'tamSoatUngThuCoTuCung',
    index: 11,
    colLetter: 'Q',
    label: 'Tầm soát ung thư cổ tử cung',
    shortLabel: 'UT Cổ tử cung',
    description: 'Sàng lọc sớm ung thư cổ tử cung (nghiệm pháp VIA / Pap smear)',
    group: 'phu_khoa',
  },
  {
    key: 'viemGanB',
    index: 12,
    colLetter: 'R',
    label: 'Xét nghiệm viêm gan B',
    shortLabel: 'Viêm gan B',
    description: 'Xét nghiệm kháng nguyên bề mặt HBsAg',
    group: 'vi_sinh',
  },
  {
    key: 'viemGanC',
    index: 13,
    colLetter: 'S',
    label: 'Xét nghiệm viêm gan C',
    shortLabel: 'Viêm gan C',
    description: 'Xét nghiệm kháng thể Anti-HCV',
    group: 'vi_sinh',
  },
  {
    key: 'hpDaDay',
    index: 14,
    colLetter: 'T',
    label: 'Xét nghiệm HP dạ dày',
    shortLabel: 'HP Dạ dày',
    description: 'Xét nghiệm tìm vi khuẩn Helicobacter Pylori dạ dày',
    group: 'vi_sinh',
  },
  {
    key: 'hiv',
    index: 15,
    colLetter: 'U',
    label: 'Xét nghiệm HIV',
    shortLabel: 'XN HIV',
    description: 'Xét nghiệm sàng lọc kháng thể HIV 1/2',
    group: 'vi_sinh',
  },
  {
    key: 'maTuy4Chan',
    index: 16,
    colLetter: 'V',
    label: 'Xét nghiệm ma túy 4 chân',
    shortLabel: 'Ma túy 4 chân',
    description: 'Test nhanh sàng lọc 4 chất ma túy trong nước tiểu (MOP, MET, THC, MDMA)',
    group: 'doc_chat',
  },
  {
    key: 'nongDoConHoiTho',
    index: 17,
    colLetter: 'W',
    label: 'Xét nghiệm nồng độ cồn trong hơi thở',
    shortLabel: 'Nồng độ cồn',
    description: 'Đo nồng độ cồn qua hơi thở hoặc định lượng Ethanol',
    group: 'doc_chat',
  },
  {
    key: 'chatGayNghien5Trong1',
    index: 18,
    colLetter: 'X',
    label: 'Xét nghiệm chất gây nghiện (5 trong 1)',
    shortLabel: 'Chất GN 5in1',
    description: 'Test nhanh tổng hợp 5 chất gây nghiện trong nước tiểu',
    group: 'doc_chat',
  },
  {
    key: 'sieuAmOBung',
    index: 19,
    colLetter: 'Y',
    label: 'Siêu âm ổ bụng',
    shortLabel: 'Siêu âm bụng',
    description: 'Siêu âm tổng quát ổ bụng (Gan, mật, tụy, lách, thận, bàng quang)',
    group: 'lam_sang',
  },
  {
    key: 'nhomMauRh',
    index: 20,
    colLetter: 'Z',
    label: 'Định lượng nhóm máu hệ Rh(D)',
    shortLabel: 'Nhóm máu Rh',
    description: 'Xác định yếu tố nhóm máu Rh(D) âm/dương',
    group: 'huyet_hoc',
  },
  {
    key: 'nhomMauABO',
    index: 21,
    colLetter: 'AA',
    label: 'Định Lượng nhóm máu hệ ABO',
    shortLabel: 'Nhóm máu ABO',
    description: 'Định nhóm máu hệ ABO (A, B, AB, O)',
    group: 'huyet_hoc',
  },
];

export const HEALTH_CHECK_GROUP_LABELS: Record<HealthCheckColumnDef['group'], string> = {
  lam_sang: 'Khám Lâm Sàng & Chẩn Đoán Hình Ảnh',
  huyet_hoc: 'Xét Nghiệm Huyết Học & Nước Tiểu',
  vi_sinh: 'Vi Sinh, Truyền Nhiễm & An Toàn Thực Phẩm',
  phu_khoa: 'Khám Chuyên Khoa Nữ & Tầm Soát',
  doc_chat: 'Sàng Lọc Chất Gây Nghiện & Nồng Độ Cồn',
};

export interface HealthCheckStandardItem {
  id: string;
  stt: number;
  phong: string; // Col C: Tên Phòng / Điểm bếp / Đơn vị
  thoiHan: string; // Col D: 6 tháng | 12 tháng | 6 tháng (bếp chính)-12 tháng (bếp phụ)
  phanLoai: string; // Col E: Bếp Samsung | Bếp ngoài | OFFICE
  mucDichKham: string; // Col F: ĐK | ĐK VP | ĐK 4C | ĐK & GPLĐ | TD & GPLĐ
  nhaCungCap: string; // Col AC: Hữu Phúc | Âu Cơ | Huệ Linh | Đông Âu | Medlatec...
  ghiChu: string; // Col AD: Note / Ghi chú đặc biệt
  khuVuc: string; // Col AE: Bắc Ninh | Thái Nguyên | Hà Nội | Ninh Bình | Phú Thọ | Hải Phòng | Nghệ An | TP.HCM
  items: Record<HealthCheckItemKey, boolean>; // Col G -> AA ('X' = true)
  capNhatLuc?: string;
}

export function createHealthItemsMap(activeKeys: HealthCheckItemKey[]): Record<HealthCheckItemKey, boolean> {
  const set = new Set<HealthCheckItemKey>(activeKeys);
  return {
    khamLamSangTongQuat: set.has('khamLamSangTongQuat'),
    xetNghiemMau: set.has('xetNghiemMau'),
    xetNghiemNuocTieu: set.has('xetNghiemNuocTieu'),
    chuanDoanHinhAnh: set.has('chuanDoanHinhAnh'),
    viemGanA: set.has('viemGanA'),
    viemGanE: set.has('viemGanE'),
    soiPhan: set.has('soiPhan'),
    xetNghiemPhan: set.has('xetNghiemPhan'),
    khamPhuKhoa: set.has('khamPhuKhoa'),
    tamSoatTuyenVu: set.has('tamSoatTuyenVu'),
    tamSoatUngThuCoTuCung: set.has('tamSoatUngThuCoTuCung'),
    viemGanB: set.has('viemGanB'),
    viemGanC: set.has('viemGanC'),
    hpDaDay: set.has('hpDaDay'),
    hiv: set.has('hiv'),
    maTuy4Chan: set.has('maTuy4Chan'),
    nongDoConHoiTho: set.has('nongDoConHoiTho'),
    chatGayNghien5Trong1: set.has('chatGayNghien5Trong1'),
    sieuAmOBung: set.has('sieuAmOBung'),
    nhomMauRh: set.has('nhomMauRh'),
    nhomMauABO: set.has('nhomMauABO'),
  };
}

// Các bộ mẫu tiêu chuẩn nhanh (Presets)
export const HEALTH_PRESET_TEMPLATES: Record<
  string,
  { name: string; description: string; keys: HealthCheckItemKey[] }
> = {
  bep_samsung: {
    name: 'Mẫu Bếp Samsung (SEV / SEVT / SDV / SDI)',
    description: 'Đầy đủ lâm sàng, XN máu, nước tiểu, X-quang, Viêm gan A/E, Nuôi cấy phân, Phụ khoa & Siêu âm',
    keys: [
      'khamLamSangTongQuat',
      'xetNghiemMau',
      'xetNghiemNuocTieu',
      'chuanDoanHinhAnh',
      'viemGanA',
      'viemGanE',
      'soiPhan',
      'xetNghiemPhan',
      'khamPhuKhoa',
      'tamSoatTuyenVu',
      'tamSoatUngThuCoTuCung',
      'sieuAmOBung',
    ],
  },
  bep_ngoai_4c: {
    name: 'Mẫu Bếp Ngoài + Ma túy 4 chân (ĐK 4C)',
    description: 'Tiêu chuẩn bếp công nghiệp kèm cấy phân, HAV/HEV và test nhanh ma túy 4 chân',
    keys: [
      'khamLamSangTongQuat',
      'xetNghiemMau',
      'xetNghiemNuocTieu',
      'chuanDoanHinhAnh',
      'viemGanA',
      'viemGanE',
      'xetNghiemPhan',
      'khamPhuKhoa',
      'maTuy4Chan',
      'sieuAmOBung',
    ],
  },
  bep_ngoai_co_ban: {
    name: 'Mẫu Bếp Ngoài Cơ Bản (ĐK ATTP)',
    description: 'Khám tổng quát, máu, nước tiểu, X-quang, Viêm gan A/E và Nuôi cấy phân ATTP',
    keys: [
      'khamLamSangTongQuat',
      'xetNghiemMau',
      'xetNghiemNuocTieu',
      'chuanDoanHinhAnh',
      'viemGanA',
      'viemGanE',
      'soiPhan',
      'xetNghiemPhan',
      'khamPhuKhoa',
    ],
  },
  office_vp: {
    name: 'Mẫu Khối Văn Phòng (OFFICE - ĐK VP)',
    description: 'Khám định kỳ khối văn phòng: Lâm sàng, máu, nước tiểu, X-quang, siêu âm ổ bụng, tầm soát nữ',
    keys: [
      'khamLamSangTongQuat',
      'xetNghiemMau',
      'xetNghiemNuocTieu',
      'chuanDoanHinhAnh',
      'khamPhuKhoa',
      'tamSoatTuyenVu',
      'tamSoatUngThuCoTuCung',
      'viemGanB',
      'sieuAmOBung',
    ],
  },
  gpld_nuoc_ngoai: {
    name: 'Mẫu Người Nước Ngoài (ĐK & GPLĐ)',
    description: 'Hồ sơ khám cấp Giấy phép lao động: Đầy đủ lâm sàng, HIV, Viêm gan B/C, Nhóm máu ABO/Rh, Cồn & Ma túy',
    keys: [
      'khamLamSangTongQuat',
      'xetNghiemMau',
      'xetNghiemNuocTieu',
      'chuanDoanHinhAnh',
      'viemGanA',
      'viemGanB',
      'viemGanC',
      'hiv',
      'nongDoConHoiTho',
      'chatGayNghien5Trong1',
      'sieuAmOBung',
      'nhomMauRh',
      'nhomMauABO',
    ],
  },
};

export const DEFAULT_HEALTH_CHECK_STANDARDS: HealthCheckStandardItem[] = [
  {
    id: 'ksk_01',
    stt: 1,
    phong: 'SEV1',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Hữu Phúc',
    ghiChu: 'XN nuôi cấy phân bắt buộc; bỏ VGB, HIV từ 10/7/2023',
    khuVuc: 'Bắc Ninh',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_samsung.keys),
    capNhatLuc: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'ksk_02',
    stt: 2,
    phong: 'SEV2',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Hữu Phúc',
    ghiChu: 'XN nuôi cấy phân; khám phụ khoa + VIA cho nữ',
    khuVuc: 'Bắc Ninh',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_samsung.keys),
    capNhatLuc: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'ksk_03',
    stt: 3,
    phong: 'SDV',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Hữu Phúc',
    ghiChu: 'Áp dụng cho toàn bộ nhân sự bếp chính & столовая Samsung Display',
    khuVuc: 'Bắc Ninh',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_samsung.keys,
      'hpDaDay',
    ]),
    capNhatLuc: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'ksk_04',
    stt: 4,
    phong: 'SDI',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK 4C',
    nhaCungCap: 'Hữu Phúc',
    ghiChu: 'Bổ sung test nhanh ma túy 4 chân theo yêu cầu nhà máy SDI',
    khuVuc: 'Bắc Ninh',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_samsung.keys,
      'maTuy4Chan',
    ]),
    capNhatLuc: '2026-10-02T08:00:00.000Z',
  },
  {
    id: 'ksk_05',
    stt: 5,
    phong: 'SEVT2',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Huệ Linh',
    ghiChu: 'XN nuôi cấy phân (Tả, lỵ, thương hàn) + HAV, HEV',
    khuVuc: 'Thái Nguyên',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_samsung.keys),
    capNhatLuc: '2026-10-02T08:00:00.000Z',
  },
  {
    id: 'ksk_06',
    stt: 6,
    phong: 'SEVT4',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Huệ Linh',
    ghiChu: 'Khám tại nhà máy SEVT Phổ Yên; kèm siêu âm ổ bụng',
    khuVuc: 'Thái Nguyên',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_samsung.keys),
    capNhatLuc: '2026-10-03T08:00:00.000Z',
  },
  {
    id: 'ksk_07',
    stt: 7,
    phong: 'HANSOL',
    thoiHan: '6 tháng (bếp chính)-12 tháng (bếp phụ)',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK 4C',
    nhaCungCap: 'Huệ Linh',
    ghiChu: 'Bếp chính khám 6 tháng/lần, bếp phụ 12 tháng/lần; có test ma túy 4 chân',
    khuVuc: 'Thái Nguyên',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_4c.keys),
    capNhatLuc: '2026-10-04T08:00:00.000Z',
  },
  {
    id: 'ksk_08',
    stt: 8,
    phong: 'TCE',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Đông Âu',
    ghiChu: 'XN nuôi cấy phân + Viêm gan A, E theo hồ sơ ATTP',
    khuVuc: 'Ninh Bình',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys,
      'viemGanB',
      'sieuAmOBung',
    ]),
    capNhatLuc: '2026-10-05T08:00:00.000Z',
  },
  {
    id: 'ksk_09',
    stt: 9,
    phong: 'REGENT2(CANTEEN2)',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Âu Cơ',
    ghiChu: 'XN nuôi cấy phân + khám phụ khoa định kỳ',
    khuVuc: 'Hải Phòng',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys,
      'tamSoatTuyenVu',
      'sieuAmOBung',
    ]),
    capNhatLuc: '2026-10-05T08:00:00.000Z',
  },
  {
    id: 'ksk_10',
    stt: 10,
    phong: 'REGENT 5',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK 4C',
    nhaCungCap: 'Âu Cơ',
    ghiChu: 'Yêu cầu XN ma túy 4 chân và cấy phân định kỳ 6 tháng',
    khuVuc: 'Hải Phòng',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_4c.keys),
    capNhatLuc: '2026-10-06T08:00:00.000Z',
  },
  {
    id: 'ksk_11',
    stt: 11,
    phong: 'OFFICE',
    thoiHan: '12 tháng',
    phanLoai: 'OFFICE',
    mucDichKham: 'ĐK VP',
    nhaCungCap: 'Medlatec',
    ghiChu: 'Khám sức khỏe tổng quát định kỳ khối Văn phòng Hà Nội & các chi nhánh',
    khuVuc: 'Hà Nội',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.office_vp.keys),
    capNhatLuc: '2026-10-06T08:00:00.000Z',
  },
  {
    id: 'ksk_12',
    stt: 12,
    phong: 'Người nước ngoài',
    thoiHan: '12 tháng',
    phanLoai: 'OFFICE',
    mucDichKham: 'ĐK & GPLĐ',
    nhaCungCap: 'Hồng Ngọc',
    ghiChu: 'Khám theo chuẩn Thông tư Bộ Y tế cấp Giấy phép lao động (Work Permit)',
    khuVuc: 'Hà Nội',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.gpld_nuoc_ngoai.keys),
    capNhatLuc: '2026-10-07T08:00:00.000Z',
  },
  {
    id: 'ksk_13',
    stt: 13,
    phong: 'FPT TOWER',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Medlatec',
    ghiChu: 'Tiêu chuẩn Canteen tòa nhà FPT Tower Cầu Giấy; bắt buộc cấy phân & HAV/HEV',
    khuVuc: 'Hà Nội',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys,
      'sieuAmOBung',
      'hpDaDay',
    ]),
    capNhatLuc: '2026-10-08T08:00:00.000Z',
  },
  {
    id: 'ksk_14',
    stt: 14,
    phong: 'LOTTE-HOTEL',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Medlatec',
    ghiChu: 'Tiêu chuẩn khách sạn 5 sao: Cấy phân, Viêm gan A/B/C/E, HP dạ dày',
    khuVuc: 'Hà Nội',
    items: createHealthItemsMap([
      'khamLamSangTongQuat',
      'xetNghiemMau',
      'xetNghiemNuocTieu',
      'chuanDoanHinhAnh',
      'viemGanA',
      'viemGanE',
      'soiPhan',
      'xetNghiemPhan',
      'khamPhuKhoa',
      'viemGanB',
      'viemGanC',
      'hpDaDay',
      'sieuAmOBung',
    ]),
    capNhatLuc: '2026-10-08T08:00:00.000Z',
  },
  {
    id: 'ksk_15',
    stt: 15,
    phong: 'DREAMTECH1',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK 4C',
    nhaCungCap: 'Hữu Phúc',
    ghiChu: 'XN nuôi cấy phân + Test ma túy 4 chân theo tiêu chuẩn vendor',
    khuVuc: 'Bắc Ninh',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_4c.keys),
    capNhatLuc: '2026-10-09T08:00:00.000Z',
  },
  {
    id: 'ksk_16',
    stt: 16,
    phong: 'ORION',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Hữu Phúc',
    ghiChu: 'Kiểm soát nghiêm ngặt truyền nhiễm đường tiêu hóa (HAV, HEV, Cấy phân)',
    khuVuc: 'Bắc Ninh',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys,
      'viemGanB',
      'sieuAmOBung',
    ]),
    capNhatLuc: '2026-10-09T08:00:00.000Z',
  },
  {
    id: 'ksk_17',
    stt: 17,
    phong: 'CAMMSYS',
    thoiHan: '6 tháng (bếp chính)-12 tháng (bếp phụ)',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Âu Cơ',
    ghiChu: 'Khám định kỳ tại Vĩnh Phúc / Phú Thọ; cấy phân bắt buộc',
    khuVuc: 'Phú Thọ',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys),
    capNhatLuc: '2026-10-10T08:00:00.000Z',
  },
  {
    id: 'ksk_18',
    stt: 18,
    phong: 'SHINWON',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Âu Cơ',
    ghiChu: 'XN nuôi cấy phân + Khám phụ khoa',
    khuVuc: 'Phú Thọ',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys),
    capNhatLuc: '2026-10-10T08:00:00.000Z',
  },
  {
    id: 'ksk_19',
    stt: 19,
    phong: 'KIDO VINH',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK 4C',
    nhaCungCap: 'Đông Âu',
    ghiChu: 'Cấy phân + Ma túy 4 chân + Siêu âm ổ bụng',
    khuVuc: 'Nghệ An',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_ngoai_4c.keys),
    capNhatLuc: '2026-10-11T08:00:00.000Z',
  },
  {
    id: 'ksk_20',
    stt: 20,
    phong: 'SUNNY NGHE AN',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK 5in1',
    nhaCungCap: 'Đông Âu',
    ghiChu: 'Yêu cầu XN chất gây nghiện 5 trong 1 & nồng độ cồn hơi thở khi tuyển dụng/định kỳ',
    khuVuc: 'Nghệ An',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys,
      'nongDoConHoiTho',
      'chatGayNghien5Trong1',
      'sieuAmOBung',
    ]),
    capNhatLuc: '2026-10-11T08:00:00.000Z',
  },
  {
    id: 'ksk_21',
    stt: 21,
    phong: 'HANSOL HCM',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp ngoài',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Hoàn Mỹ',
    ghiChu: 'Khu vực TP.HCM: Khám tổng quát, cấy phân, HAV/HEV, siêu âm bụng',
    khuVuc: 'TP.HCM',
    items: createHealthItemsMap([
      ...HEALTH_PRESET_TEMPLATES.bep_ngoai_co_ban.keys,
      'sieuAmOBung',
    ]),
    capNhatLuc: '2026-10-12T08:00:00.000Z',
  },
  {
    id: 'ksk_22',
    stt: 22,
    phong: 'SEHC2',
    thoiHan: '6 tháng',
    phanLoai: 'Bếp Samsung',
    mucDichKham: 'ĐK',
    nhaCungCap: 'Hoàn Mỹ',
    ghiChu: 'Bếp Samsung Khu Công Nghệ Cao Quận 9 TP.HCM',
    khuVuc: 'TP.HCM',
    items: createHealthItemsMap(HEALTH_PRESET_TEMPLATES.bep_samsung.keys),
    capNhatLuc: '2026-10-12T08:00:00.000Z',
  },
];

// Mã nguồn Google Apps Script (Code.gs + Index.html) bàn giao theo Deliverable Request
export const HEALTH_STANDARD_GAS_CODE_GS = `/**
 * HỆ THỐNG QUẢN LÝ TIÊU CHUẨN KHÁM SỨC KHỎE ĐỊNH KỲ
 * Backend Google Apps Script (Code.gs) - Kết nối trực tiếp Sheet "Tiêu chuẩn"
 * Dòng tiêu đề: Dòng 3 | Dữ liệu: Từ Dòng 4 trở đi (Cột B -> Cột AE)
 */

const SHEET_NAME = 'Tiêu chuẩn';
const HEADER_ROW = 3;
const DATA_START_ROW = 4;
const CACHE_KEY = 'HEALTH_STANDARDS_CACHE_V1';
const CACHE_TTL_SECONDS = 300; // 5 phút

const ITEM_KEYS = [
  'khamLamSangTongQuat',      // Col G (7)
  'xetNghiemMau',             // Col H (8)
  'xetNghiemNuocTieu',        // Col I (9)
  'chuanDoanHinhAnh',         // Col J (10)
  'viemGanA',                 // Col K (11)
  'viemGanE',                 // Col L (12)
  'soiPhan',                  // Col M (13)
  'xetNghiemPhan',            // Col N (14)
  'khamPhuKhoa',              // Col O (15)
  'tamSoatTuyenVu',           // Col P (16)
  'tamSoatUngThuCoTuCung',    // Col Q (17)
  'viemGanB',                 // Col R (18)
  'viemGanC',                 // Col S (19)
  'hpDaDay',                  // Col T (20)
  'hiv',                      // Col U (21)
  'maTuy4Chan',               // Col V (22)
  'nongDoConHoiTho',          // Col W (23)
  'chatGayNghien5Trong1',     // Col X (24)
  'sieuAmOBung',              // Col Y (25)
  'nhomMauRh',                // Col Z (26)
  'nhomMauABO'                // Col AA (27)
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Hệ Thống Quản Lý Tiêu Chuẩn Khám Sức Khỏe Định Kỳ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initSheetHeaders_(sheet);
  }
  return sheet;
}

function initSheetHeaders_(sheet) {
  const headers = [
    '', 'STT', 'Phòng', 'Thời hạn', 'Phân loại', 'Mục đích khám',
    'Khám lâm sàng tổng quát', 'Xét nghiệm máu', 'Xét nghiệm nước tiểu',
    'Chuẩn đoán hình ảnh', 'Xét nghiệm viên gan A', 'Xét nghiệm viêm gan E',
    'Soi phân', 'Xét nghiệm phân', 'Khám và tư vấn khám phụ khoa',
    'Tầm soát tuyến vú', 'Tầm soát ung thư cổ tử cung', 'Xét nghiệm viêm gan B',
    'Xét nghiệm viêm gan C', 'Xét nghiệm HP dạ dày', 'Xét nghiệm HIV',
    'Xét nghiệm ma túy 4 chân', 'Xét nghiệm nồng độ cồn trong hơi thở',
    'Xét nghiệm chất gây nghiện (5 trong 1)', 'Siêu âm ổ bụng',
    'Định lượng nhóm máu hệ Rh(D)', 'Định Lượng nhóm máu hệ ABO',
    '', 'Nhà cung cấp', 'Note / Ghi chú', 'Khu vực'
  ];
  sheet.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers]);
}

function getAllHealthStandards(forceRefresh) {
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];

  const values = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 31).getValues();
  const records = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const phong = String(row[2] || '').trim(); // Col C (index 2)
    if (!phong) continue;

    const items = {};
    for (let k = 0; k < ITEM_KEYS.length; k++) {
      const cellVal = String(row[6 + k] || '').trim().toUpperCase();
      items[ITEM_KEYS[k]] = cellVal === 'X';
    }

    records.push({
      rowNumber: DATA_START_ROW + i,
      stt: Number(row[1]) || records.length + 1, // Col B
      phong: phong,                              // Col C
      thoiHan: String(row[3] || '').trim(),      // Col D
      phanLoai: String(row[4] || '').trim(),     // Col E
      mucDichKham: String(row[5] || '').trim(),  // Col F
      items: items,                              // Col G -> AA
      nhaCungCap: String(row[28] || '').trim(),  // Col AC (index 28)
      ghiChu: String(row[29] || '').trim(),      // Col AD (index 29)
      khuVuc: String(row[30] || '').trim()       // Col AE (index 30)
    });
  }

  try {
    cache.put(CACHE_KEY, JSON.stringify(records), CACHE_TTL_SECONDS);
  } catch (e) {}

  return records;
}

function addNewRoom(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const existing = getAllHealthStandards(true);
    const cleanName = String(payload.phong || '').trim();
    if (!cleanName) throw new Error('Tên Phòng / Điểm bếp không được để trống.');

    const dup = existing.find(r => r.phong.toLowerCase() === cleanName.toLowerCase());
    if (dup) throw new Error('Phòng "' + cleanName + '" đã tồn tại ở dòng ' + dup.rowNumber);

    const nextStt = existing.length > 0 ? Math.max.apply(null, existing.map(r => r.stt)) + 1 : 1;
    const targetRow = Math.max(sheet.getLastRow() + 1, DATA_START_ROW);

    const rowData = new Array(31).fill('');
    rowData[1] = nextStt;
    rowData[2] = cleanName;
    rowData[3] = payload.thoiHan || '6 tháng';
    rowData[4] = payload.phanLoai || 'Bếp ngoài';
    rowData[5] = payload.mucDichKham || 'ĐK';

    for (let k = 0; k < ITEM_KEYS.length; k++) {
      rowData[6 + k] = payload.items && payload.items[ITEM_KEYS[k]] ? 'X' : '';
    }

    rowData[28] = payload.nhaCungCap || '';
    rowData[29] = payload.ghiChu || '';
    rowData[30] = payload.khuVuc || '';

    sheet.getRange(targetRow, 1, 1, 31).setValues([rowData]);
    CacheService.getScriptCache().remove(CACHE_KEY);
    return getAllHealthStandards(true);
  } finally {
    lock.releaseLock();
  }
}

function updateRoom(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const rowNumber = Number(payload.rowNumber);
    if (!rowNumber || rowNumber < DATA_START_ROW) {
      throw new Error('Số dòng cập nhật không hợp lệ.');
    }

    const rowData = sheet.getRange(rowNumber, 1, 1, 31).getValues()[0];
    rowData[2] = String(payload.phong || '').trim();
    rowData[3] = payload.thoiHan || '';
    rowData[4] = payload.phanLoai || '';
    rowData[5] = payload.mucDichKham || '';

    for (let k = 0; k < ITEM_KEYS.length; k++) {
      rowData[6 + k] = payload.items && payload.items[ITEM_KEYS[k]] ? 'X' : '';
    }

    rowData[28] = payload.nhaCungCap || '';
    rowData[29] = payload.ghiChu || '';
    rowData[30] = payload.khuVuc || '';

    sheet.getRange(rowNumber, 1, 1, 31).setValues([rowData]);
    CacheService.getScriptCache().remove(CACHE_KEY);
    return getAllHealthStandards(true);
  } finally {
    lock.releaseLock();
  }
}
`;
