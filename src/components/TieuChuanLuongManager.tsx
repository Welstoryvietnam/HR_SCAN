import React, { useState, useMemo } from 'react';
import { TieuChuanLuongItem, UserProfile, KhoiNode, BanNode, PhongNode } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Check,
  AlertCircle,
  X,
  Briefcase,
  Search,
  Filter,
  Download,
  Coins,
  Sparkles,
  Layers,
  Eye,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Save,
  Network,
  FolderTree,
  CheckCircle2
} from 'lucide-react';
import { DEFAULT_JOB_POSITIONS } from '../data/jobPositionHierarchy';
import { DEFAULT_ORGANIZATION_HIERARCHY } from '../data/organizationHierarchy';

interface TieuChuanLuongManagerProps {
  standards: TieuChuanLuongItem[];
  currentUser: UserProfile;
  onSaveStandard: (item: Partial<TieuChuanLuongItem>) => Promise<void>;
  onDeleteStandard: (id: string) => Promise<void>;
  organizationHierarchy?: KhoiNode[];
  onSaveOrganizationHierarchy?: (newHierarchy: KhoiNode[]) => Promise<void>;
}

export const TieuChuanLuongManager: React.FC<TieuChuanLuongManagerProps> = ({
  standards,
  currentUser,
  onSaveStandard,
  onDeleteStandard,
  organizationHierarchy = DEFAULT_ORGANIZATION_HIERARCHY,
  onSaveOrganizationHierarchy,
}) => {
  // Tab chính của Admin: 1. Tiêu chuẩn lương | 2. Cơ cấu tổ chức
  const [adminSubTab, setAdminSubTab] = useState<'standards' | 'organization'>('standards');

  // =========================================================================
  // PHẦN 1: QUẢN LÝ TIÊU CHUẨN LƯƠNG & PHỤ CẤP (SHEET "TieuChuanLuong")
  // =========================================================================
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states cho từng loại phụ cấp
  const [congViec, setCongViec] = useState('Đầu Bếp');
  const [chucVu, setChucVu] = useState('');
  const [luongCoBan, setLuongCoBan] = useState<number>(5447000);
  const [phuCapChucVu, setPhuCapChucVu] = useState<number>(0);
  const [phuCapDienThoai, setPhuCapDienThoai] = useState<number>(0);
  const [troCapTayNghe, setTroCapTayNghe] = useState<number>(0);
  const [troCapGiaDinh, setTroCapGiaDinh] = useState<number>(150000);
  const [thuongChuyenCan, setThuongChuyenCan] = useState<number>(200000);
  const [thuongSangKien, setThuongSangKien] = useState<number>(200000);
  const [phuCapMoiTruong, setPhuCapMoiTruong] = useState<string>('Thủ công');
  const [phuCapXangXe, setPhuCapXangXe] = useState<string>('Thủ công');
  const [anToanVeSinhVien, setAnToanVeSinhVien] = useState<string>('Thủ công');
  const [phuCapKinhDoanh, setPhuCapKinhDoanh] = useState<string>('Thủ công');
  const [phuCapNangNhoc, setPhuCapNangNhoc] = useState<string>('Thủ công');
  const [moTa, setMoTa] = useState('');
  const [saving, setSaving] = useState(false);

  // Bộ lọc & tìm kiếm tiêu chuẩn
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');

  const isAdmin = currentUser.role === 'admin';

  // Tính toán phụ cấp cố định tự động trong Form
  const formComputedPhuCapCoDinh = useMemo(() => {
    return (
      (Number(phuCapChucVu) || 0) +
      (Number(phuCapDienThoai) || 0) +
      (Number(troCapTayNghe) || 0) +
      (Number(troCapGiaDinh) || 0) +
      (Number(thuongChuyenCan) || 0) +
      (Number(thuongSangKien) || 0)
    );
  }, [phuCapChucVu, phuCapDienThoai, troCapTayNghe, troCapGiaDinh, thuongChuyenCan, thuongSangKien]);

  const formComputedTongThuNhap = useMemo(() => {
    return (Number(luongCoBan) || 0) + formComputedPhuCapCoDinh;
  }, [luongCoBan, formComputedPhuCapCoDinh]);

  // Danh sách công việc để lọc
  const jobCategories = useMemo(() => {
    const set = new Set<string>();
    standards.forEach((s) => {
      if (s.congViec) set.add(s.congViec);
    });
    return Array.from(set).sort();
  }, [standards]);

  // Lọc dữ liệu tiêu chuẩn theo tìm kiếm & công việc
  const filteredStandards = useMemo(() => {
    return standards.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.chucVu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.congViec && item.congViec.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.moTa && item.moTa.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchJob =
        selectedJobFilter === 'ALL' || item.congViec === selectedJobFilter;

      return matchSearch && matchJob;
    });
  }, [standards, searchQuery, selectedJobFilter]);

  // Mở form chỉnh sửa tiêu chuẩn vị trí cụ thể
  const handleStartEdit = (item: TieuChuanLuongItem) => {
    if (!isAdmin) return;
    setEditingId(item.id);
    setCongViec(item.congViec || 'Công việc chuyên môn');
    setChucVu(item.chucVu);
    setLuongCoBan(item.luongCoBan);
    setPhuCapChucVu(item.phuCapChucVu || 0);
    setPhuCapDienThoai(item.phuCapDienThoai || 0);
    setTroCapTayNghe(item.troCapTayNghe || 0);
    setTroCapGiaDinh(item.troCapGiaDinh !== undefined ? item.troCapGiaDinh : 150000);
    setThuongChuyenCan(item.thuongChuyenCan !== undefined ? item.thuongChuyenCan : 200000);
    setThuongSangKien(item.thuongSangKien || 0);
    setPhuCapMoiTruong(String(item.phuCapMoiTruong || 'Thủ công'));
    setPhuCapXangXe(String(item.phuCapXangXe || 'Thủ công'));
    setAnToanVeSinhVien(String(item.anToanVeSinhVien || 'Thủ công'));
    setPhuCapKinhDoanh(String(item.phuCapKinhDoanh || 'Thủ công'));
    setPhuCapNangNhoc(String(item.phuCapNangNhoc || 'Thủ công'));
    setMoTa(item.moTa || '');
    setIsEditing(true);
  };

  const handleStartCreate = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setCongViec('Đầu Bếp');
    setChucVu('');
    setLuongCoBan(5447000);
    setPhuCapChucVu(0);
    setPhuCapDienThoai(0);
    setTroCapTayNghe(0);
    setTroCapGiaDinh(150000);
    setThuongChuyenCan(200000);
    setThuongSangKien(200000);
    setPhuCapMoiTruong('Thủ công');
    setPhuCapXangXe('Thủ công');
    setAnToanVeSinhVien('Thủ công');
    setPhuCapKinhDoanh('Thủ công');
    setPhuCapNangNhoc('Thủ công');
    setMoTa('');
    setIsEditing(true);
  };

  const handleSubmitStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chucVu.trim()) {
      alert('Vui lòng nhập tên chức vụ!');
      return;
    }

    setSaving(true);
    try {
      await onSaveStandard({
        id: editingId || undefined,
        congViec: congViec.trim(),
        chucVu: chucVu.trim(),
        luongCoBan: Number(luongCoBan) || 0,
        phuCapChucVu: Number(phuCapChucVu) || 0,
        phuCapDienThoai: Number(phuCapDienThoai) || 0,
        troCapTayNghe: Number(troCapTayNghe) || 0,
        troCapGiaDinh: Number(troCapGiaDinh) || 0,
        thuongChuyenCan: Number(thuongChuyenCan) || 0,
        thuongSangKien: Number(thuongSangKien) || 0,
        phuCapMoiTruong: (phuCapMoiTruong === 'Thủ công' ? 'Thủ công' : (Number(phuCapMoiTruong) || 'Thủ công')) as number | 'Thủ công',
        phuCapXangXe: (phuCapXangXe === 'Thủ công' ? 'Thủ công' : (Number(phuCapXangXe) || 'Thủ công')) as number | 'Thủ công',
        anToanVeSinhVien: (anToanVeSinhVien === 'Thủ công' ? 'Thủ công' : (Number(anToanVeSinhVien) || 'Thủ công')) as number | 'Thủ công',
        phuCapKinhDoanh: (phuCapKinhDoanh === 'Thủ công' ? 'Thủ công' : (Number(phuCapKinhDoanh) || 'Thủ công')) as number | 'Thủ công',
        phuCapNangNhoc: (phuCapNangNhoc === 'Thủ công' ? 'Thủ công' : (Number(phuCapNangNhoc) || 'Thủ công')) as number | 'Thủ công',
        phuCapCoDinh: formComputedPhuCapCoDinh,
        moTa: moTa.trim(),
      });
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      alert('Lỗi lưu tiêu chuẩn lương: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Xuất file CSV Sheet TieuChuanLuong
  const handleExportCSV = () => {
    const headers = [
      'Mã Vị Trí',
      'Công Việc',
      'Chức Vụ',
      'Lương Cơ Bản (VNĐ)',
      'Phụ Cấp Chức Vụ (VNĐ)',
      'Phụ Cấp Điện Thoại (VNĐ)',
      'PC Môi Trường',
      'PC Xăng Xe',
      'An Toàn Vệ Sinh Viên',
      'PC Kinh Doanh',
      'PC Nặng Nhọc',
      'Trợ Cấp Tay Nghề (VNĐ)',
      'Trợ Cấp Gia Đình (VNĐ)',
      'Thưởng Chuyên Cần (VNĐ)',
      'Thưởng Sáng Kiến (VNĐ)',
      'Tổng Phụ Cấp Cố Định (VNĐ)',
      'Tổng Thu Nhập Dự Kiến (VNĐ)',
      'Ghi Chú Hạch Toán'
    ];

    const rows = filteredStandards.map((item) => [
      item.id,
      `"${item.congViec || ''}"`,
      `"${item.chucVu}"`,
      item.luongCoBan,
      item.phuCapChucVu || 0,
      item.phuCapDienThoai || 0,
      item.phuCapMoiTruong || 'Thủ công',
      item.phuCapXangXe || 'Thủ công',
      item.anToanVeSinhVien || 'Thủ công',
      item.phuCapKinhDoanh || 'Thủ công',
      item.phuCapNangNhoc || 'Thủ công',
      item.troCapTayNghe || 0,
      item.troCapGiaDinh !== undefined ? item.troCapGiaDinh : 150000,
      item.thuongChuyenCan !== undefined ? item.thuongChuyenCan : 200000,
      item.thuongSangKien || 0,
      item.phuCapCoDinh,
      item.luongCoBan + item.phuCapCoDinh,
      `"${item.moTa || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sheet_TieuChuanLuong_TungLoaiPhuCap_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // PHẦN 2: QUẢN LÝ CƠ CẤU TỔ CHỨC: TEAM (KHỐI) / GROUP (BAN) / PART (BỘ PHẬN)
  // =========================================================================
  const [localHierarchy, setLocalHierarchy] = useState<KhoiNode[]>(organizationHierarchy);
  const [orgSearch, setOrgSearch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Đồng bộ khi prop từ ngoài thay đổi
  React.useEffect(() => {
    if (organizationHierarchy && organizationHierarchy.length > 0) {
      setLocalHierarchy(organizationHierarchy);
      // Mở rộng tất cả Team mặc định
      const map: Record<string, boolean> = {};
      organizationHierarchy.forEach((k) => (map[k.id] = true));
      setExpandedTeams(map);
    }
  }, [organizationHierarchy]);

  // Modal thêm / sửa Team, Group, Part
  const [modalType, setModalType] = useState<'add_team' | 'edit_team' | 'add_group' | 'edit_group' | 'add_part' | 'edit_part' | null>(null);
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetPartId, setTargetPartId] = useState<string>('');
  const [inputNodeName, setInputNodeName] = useState<string>('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Thống kê cơ cấu
  const orgStats = useMemo(() => {
    let totalTeams = localHierarchy.length;
    let totalGroups = 0;
    let totalParts = 0;
    localHierarchy.forEach((k) => {
      totalGroups += k.bans.length;
      k.bans.forEach((b) => {
        totalParts += b.phongs.length;
      });
    });
    return { totalTeams, totalGroups, totalParts };
  }, [localHierarchy]);

  // Lọc cơ cấu tổ chức theo ô tìm kiếm
  const filteredHierarchy = useMemo(() => {
    if (!orgSearch.trim()) return localHierarchy;
    const q = orgSearch.toLowerCase().trim();

    return localHierarchy
      .map((k) => {
        const teamMatch = k.name.toLowerCase().includes(q);
        const filteredBans = k.bans
          .map((b) => {
            const banMatch = b.name.toLowerCase().includes(q);
            const filteredPhongs = b.phongs.filter((p) => p.name.toLowerCase().includes(q));
            if (banMatch || filteredPhongs.length > 0) {
              return {
                ...b,
                phongs: banMatch ? b.phongs : filteredPhongs,
              };
            }
            return null;
          })
          .filter(Boolean) as BanNode[];

        if (teamMatch || filteredBans.length > 0) {
          return {
            ...k,
            bans: teamMatch ? k.bans : filteredBans,
          };
        }
        return null;
      })
      .filter(Boolean) as KhoiNode[];
  }, [localHierarchy, orgSearch]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Mở modal thêm Team (Khối)
  const openAddTeam = () => {
    setInputNodeName('');
    setModalType('add_team');
  };

  // Mở modal sửa tên Team (Khối)
  const openEditTeam = (k: KhoiNode) => {
    setTargetTeamId(k.id);
    setInputNodeName(k.name);
    setModalType('edit_team');
  };

  // Xóa Team (Khối)
  const handleDeleteTeam = (teamId: string, teamName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Team (Khối) "${teamName}" cùng toàn bộ Group và Part bên trong?`)) {
      return;
    }
    const updated = localHierarchy.filter((k) => k.id !== teamId);
    saveNewHierarchy(updated);
  };

  // Mở modal thêm Group (Ban)
  const openAddGroup = (teamId: string) => {
    setTargetTeamId(teamId);
    setInputNodeName('');
    setModalType('add_group');
  };

  // Mở modal sửa tên Group (Ban)
  const openEditGroup = (teamId: string, b: BanNode) => {
    setTargetTeamId(teamId);
    setTargetGroupId(b.id);
    setInputNodeName(b.name);
    setModalType('edit_group');
  };

  // Xóa Group (Ban)
  const handleDeleteGroup = (teamId: string, groupId: string, groupName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Group (Ban) "${groupName}"?`)) return;
    const updated = localHierarchy.map((k) => {
      if (k.id === teamId) {
        return {
          ...k,
          bans: k.bans.filter((b) => b.id !== groupId),
        };
      }
      return k;
    });
    saveNewHierarchy(updated);
  };

  // Mở modal thêm Part (Bộ phận)
  const openAddPart = (teamId: string, groupId: string) => {
    setTargetTeamId(teamId);
    setTargetGroupId(groupId);
    setInputNodeName('');
    setModalType('add_part');
  };

  // Mở modal sửa tên Part (Bộ phận)
  const openEditPart = (teamId: string, groupId: string, p: PhongNode) => {
    setTargetTeamId(teamId);
    setTargetGroupId(groupId);
    setTargetPartId(p.id);
    setInputNodeName(p.name);
    setModalType('edit_part');
  };

  // Xóa Part (Bộ phận)
  const handleDeletePart = (teamId: string, groupId: string, partId: string, partName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Part (Bộ phận) "${partName}"?`)) return;
    const updated = localHierarchy.map((k) => {
      if (k.id === teamId) {
        return {
          ...k,
          bans: k.bans.map((b) => {
            if (b.id === groupId) {
              return {
                ...b,
                phongs: b.phongs.filter((p) => p.id !== partId),
              };
            }
            return b;
          }),
        };
      }
      return k;
    });
    saveNewHierarchy(updated);
  };

  // Xử lý nộp form Modal Cơ Cấu Tổ Chức
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputNodeName.trim().toUpperCase();
    if (!trimmed) {
      alert('Vui lòng nhập tên!');
      return;
    }

    let updated: KhoiNode[] = [...localHierarchy];

    if (modalType === 'add_team') {
      const newTeam: KhoiNode = {
        id: `team_${Date.now()}`,
        name: trimmed,
        bans: [],
      };
      updated.push(newTeam);
      setExpandedTeams((prev) => ({ ...prev, [newTeam.id]: true }));
    } else if (modalType === 'edit_team') {
      updated = updated.map((k) => (k.id === targetTeamId ? { ...k, name: trimmed } : k));
    } else if (modalType === 'add_group') {
      updated = updated.map((k) => {
        if (k.id === targetTeamId) {
          const newBan: BanNode = {
            id: `group_${Date.now()}`,
            name: trimmed,
            phongs: [{ id: `part_${Date.now()}_default`, name: trimmed }], // mặc định tạo 1 part cùng tên
          };
          return {
            ...k,
            bans: [...k.bans, newBan],
          };
        }
        return k;
      });
      setExpandedGroups((prev) => ({ ...prev, [`group_${Date.now()}`]: true }));
    } else if (modalType === 'edit_group') {
      updated = updated.map((k) => {
        if (k.id === targetTeamId) {
          return {
            ...k,
            bans: k.bans.map((b) => (b.id === targetGroupId ? { ...b, name: trimmed } : b)),
          };
        }
        return k;
      });
    } else if (modalType === 'add_part') {
      updated = updated.map((k) => {
        if (k.id === targetTeamId) {
          return {
            ...k,
            bans: k.bans.map((b) => {
              if (b.id === targetGroupId) {
                return {
                  ...b,
                  phongs: [...b.phongs, { id: `part_${Date.now()}`, name: trimmed }],
                };
              }
              return b;
            }),
          };
        }
        return k;
      });
    } else if (modalType === 'edit_part') {
      updated = updated.map((k) => {
        if (k.id === targetTeamId) {
          return {
            ...k,
            bans: k.bans.map((b) => {
              if (b.id === targetGroupId) {
                return {
                  ...b,
                  phongs: b.phongs.map((p) => (p.id === targetPartId ? { ...p, name: trimmed } : p)),
                };
              }
              return b;
            }),
          };
        }
        return k;
      });
    }

    saveNewHierarchy(updated);
    setModalType(null);
  };

  // Lưu cơ cấu tổ chức mới lên server & state
  const saveNewHierarchy = async (newHierarchy: KhoiNode[]) => {
    setLocalHierarchy(newHierarchy);
    if (onSaveOrganizationHierarchy) {
      setIsSavingOrg(true);
      try {
        await onSaveOrganizationHierarchy(newHierarchy);
      } finally {
        setIsSavingOrg(false);
      }
    }
  };

  // Khôi phục cơ cấu mặc định
  const handleResetDefaultHierarchy = () => {
    if (confirm('Khôi phục toàn bộ cơ cấu tổ chức về cấu hình chuẩn ban đầu của FPT?')) {
      saveNewHierarchy(DEFAULT_ORGANIZATION_HIERARCHY);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SUB-TAB CHUYỂN ĐỔI: 1. TIÊU CHUẨN LƯƠNG | 2. CƠ CẤU TỔ CHỨC TEAM/GROUP/PART */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setAdminSubTab('standards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex-1 sm:flex-initial ${
              adminSubTab === 'standards'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Tiêu Chuẩn Lương &amp; Phụ Cấp (Sheet "TieuChuanLuong")</span>
            <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
              {standards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSubTab('organization')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex-1 sm:flex-initial ${
              adminSubTab === 'organization'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4 text-emerald-600" />
            <span>Cơ Cấu Tổ Chức: Team (Khối) / Group (Ban) / Part (Bộ Phận)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
              {orgStats.totalTeams} Teams
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden lg:flex items-center gap-2 px-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Quyền Quản Trị Viên (Admin): Toàn quyền Thêm / Sửa / Xóa dữ liệu tiêu chuẩn</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SHEET "TIEU CHUAN LUONG" */}
      {/* ========================================================================= */}
      {adminSubTab === 'standards' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 text-xs text-indigo-200 uppercase font-bold tracking-wider mb-1">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Sheet "TieuChuanLuong": Chi Tiết Từng Loại Phụ Cấp &amp; Định Mức</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Bảng Định Mức Lương Tiêu Chuẩn &amp; Phụ Cấp Vị Trí
                </h1>
                <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-2xl leading-relaxed">
                  Quản trị viên có thể <strong>chỉnh sửa mức lương cơ bản hoặc bất kỳ loại phụ cấp nào</strong> (Chức vụ, Điện thoại, Tay nghề, Chuyên cần, v.v.) cho bất kỳ vị trí công việc nào.
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Vị Trí Tiêu Chuẩn Mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Xuất CSV Sheet</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form Modal Thêm / Chỉnh Sửa Tiêu Chuẩn */}
          {isEditing && (
            <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        {editingId ? `Chỉnh Sửa Tiêu Chuẩn Chức Vụ: ${chucVu}` : 'Thêm Mới Vị Trí Tiêu Chuẩn Lương'}
                      </h3>
                      <span className="text-xs text-slate-500">Cập nhật trực tiếp lên Sheet "TieuChuanLuong"</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitStandard} className="space-y-4">
                  {/* Nhóm & Chức vụ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nhóm Công Việc (Job Category) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={congViec}
                        onChange={(e) => setCongViec(e.target.value)}
                        placeholder="Ví dụ: Đầu Bếp, Bán Hàng, Dinh Dưỡng Viên..."
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tên Vị Trí / Chức Vụ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={chucVu}
                        onChange={(e) => setChucVu(e.target.value)}
                        placeholder="Ví dụ: Bếp Trưởng, Cửa Hàng Trưởng, GS II..."
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  {/* Lương cơ bản & Phụ cấp chức vụ & Phụ cấp điện thoại */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        Lương Cơ Bản Tiêu Chuẩn (VNĐ) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={luongCoBan}
                        onChange={(e) => setLuongCoBan(Number(e.target.value))}
                        className="w-full text-xs font-bold text-amber-950 px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                        required
                      />
                      <span className="text-[10px] text-amber-700 mt-1 block">
                        Đóng BHXH theo mức này
                      </span>
                    </div>

                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                      <label className="block text-xs font-bold text-indigo-900 mb-1">
                        Phụ Cấp Chức Vụ (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={phuCapChucVu}
                        onChange={(e) => setPhuCapChucVu(Number(e.target.value))}
                        className="w-full text-xs font-bold text-indigo-950 px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                      <label className="block text-xs font-bold text-indigo-900 mb-1">
                        Phụ Cấp Điện Thoại (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={phuCapDienThoai}
                        onChange={(e) => setPhuCapDienThoai(Number(e.target.value))}
                        className="w-full text-xs font-bold text-indigo-950 px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Trợ cấp tay nghề, Trợ cấp gia đình, Thưởng chuyên cần, Thưởng sáng kiến */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Trợ Cấp Tay Nghề
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={troCapTayNghe}
                        onChange={(e) => setTroCapTayNghe(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Trợ Cấp Gia Đình
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={troCapGiaDinh}
                        onChange={(e) => setTroCapGiaDinh(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Thưởng Chuyên Cần
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={thuongChuyenCan}
                        onChange={(e) => setThuongChuyenCan(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Thưởng Sáng Kiến
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={thuongSangKien}
                        onChange={(e) => setThuongSangKien(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Phụ cấp thủ công: Môi trường, Xăng xe, An toàn, v.v. */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">PC Môi Trường</label>
                      <input
                        type="text"
                        value={phuCapMoiTruong}
                        onChange={(e) => setPhuCapMoiTruong(e.target.value)}
                        placeholder="Thủ công"
                        className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">PC Xăng Xe</label>
                      <input
                        type="text"
                        value={phuCapXangXe}
                        onChange={(e) => setPhuCapXangXe(e.target.value)}
                        placeholder="Thủ công"
                        className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">An Toàn Vệ Sinh</label>
                      <input
                        type="text"
                        value={anToanVeSinhVien}
                        onChange={(e) => setAnToanVeSinhVien(e.target.value)}
                        placeholder="Thủ công"
                        className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">PC Kinh Doanh</label>
                      <input
                        type="text"
                        value={phuCapKinhDoanh}
                        onChange={(e) => setPhuCapKinhDoanh(e.target.value)}
                        placeholder="Thủ công"
                        className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">PC Nặng Nhọc</label>
                      <input
                        type="text"
                        value={phuCapNangNhoc}
                        onChange={(e) => setPhuCapNangNhoc(e.target.value)}
                        placeholder="Thủ công"
                        className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  {/* TỔNG THU NHẬP TỰ ĐỘNG TÍNH */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">
                        Tổng Phụ Cấp Cố Định: {formComputedPhuCapCoDinh.toLocaleString('vi-VN')} đ/tháng
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-emerald-800">
                      Tổng Thu Nhập Dự Kiến: {formComputedTongThuNhap.toLocaleString('vi-VN')} đ/tháng
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Đang Lưu...' : 'Lưu Tiêu Chuẩn Này'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Thanh tìm kiếm & Lọc tiêu chuẩn */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm chức vụ, công việc..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 shrink-0">Lọc Công Việc:</span>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-indigo-500 w-full sm:w-auto"
              >
                <option value="ALL">Tất cả ({standards.length})</option>
                {jobCategories.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bảng Hiển Thị Chi Tiết Từng Loại Phụ Cấp Trên Sheet "TieuChuanLuong" */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Nhóm Công Việc</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Chức Vụ</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Lương Cơ Bản</th>
                    <th className="py-2.5 px-3 text-right">PC Chức Vụ</th>
                    <th className="py-2.5 px-3 text-right">PC Đ.Thoại</th>
                    <th className="py-2.5 px-3 text-right">TC Tay Nghề</th>
                    <th className="py-2.5 px-3 text-right">TC Gia Đình</th>
                    <th className="py-2.5 px-3 text-right">Thưởng C.Cần</th>
                    <th className="py-2.5 px-3 text-right">Thưởng S.Kiến</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px] text-indigo-900 bg-indigo-50/50">
                      Tổng PC Cố Định
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[120px] text-emerald-900 bg-emerald-50/50">
                      Tổng Thu Nhập
                    </th>
                    {isAdmin && (
                      <th className="py-2.5 px-3 text-center min-w-[100px]">Thao Tác</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStandards.map((item, idx) => {
                    const totalIncome = item.luongCoBan + item.phuCapCoDinh;
                    return (
                      <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.congViec}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-950">{item.chucVu}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {item.luongCoBan.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {item.phuCapChucVu ? `${item.phuCapChucVu.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {item.phuCapDienThoai ? `${item.phuCapDienThoai.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {item.troCapTayNghe ? `${item.troCapTayNghe.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {(item.troCapGiaDinh !== undefined ? item.troCapGiaDinh : 150000).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {(item.thuongChuyenCan !== undefined ? item.thuongChuyenCan : 200000).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {item.thuongSangKien ? `${item.thuongSangKien.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30">
                          {item.phuCapCoDinh.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/30">
                          {totalIncome.toLocaleString('vi-VN')} đ
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Chỉnh sửa định mức lương & phụ cấp chức vụ này"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Bạn có chắc muốn xóa tiêu chuẩn chức vụ "${item.chucVu}" khỏi Sheet "TieuChuanLuong"?`)) {
                                    onDeleteStandard(item.id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Xóa vị trí này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CƠ CẤU TỔ CHỨC: TEAM (KHỐI) / GROUP (BAN) / PART (BỘ PHẬN) */}
      {/* ========================================================================= */}
      {adminSubTab === 'organization' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 text-xs text-emerald-200 uppercase font-bold tracking-wider mb-1">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  <span>Cơ Cấu Tổ Chức Đa Tầng (3 Cấp): Team &gt; Group &gt; Part</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Quản Lý Cơ Cấu: Team (Khối) / Group (Ban) / Part (Bộ Phận)
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl leading-relaxed">
                  Dành riêng cho Quản trị viên khi công ty có biến động hoặc tái cơ cấu. Mọi thay đổi thêm/sửa/xóa ở đây sẽ <strong>tự động đồng bộ sang Bước 3</strong> của quy trình tiếp nhận hồ sơ.
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={openAddTeam}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Team (Khối) Mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultHierarchy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
                    title="Khôi phục danh mục cơ cấu chuẩn ban đầu"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Khôi Phục Mẫu Chuẩn FPT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-emerald-800/60">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <span className="text-[11px] text-emerald-200 block">Team (Khối)</span>
                <span className="text-lg font-bold text-white">{orgStats.totalTeams}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <span className="text-[11px] text-emerald-200 block">Group (Ban)</span>
                <span className="text-lg font-bold text-white">{orgStats.totalGroups}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <span className="text-[11px] text-emerald-200 block">Part (Bộ phận / Phòng)</span>
                <span className="text-lg font-bold text-white">{orgStats.totalParts}</span>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                placeholder="Tìm kiếm Team (Khối), Group (Ban), Part (Bộ phận)..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              Hiển thị {filteredHierarchy.length} / {localHierarchy.length} Team
            </span>
          </div>

          {/* Interactive Hierarchy Tree List */}
          <div className="space-y-4">
            {filteredHierarchy.map((team, tIdx) => {
              const isExpanded = expandedTeams[team.id] !== false;
              const teamGroupCount = team.bans.length;
              const teamPartCount = team.bans.reduce((acc, b) => acc + b.phongs.length, 0);

              return (
                <div
                  key={team.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition hover:border-indigo-300"
                >
                  {/* TEAM (KHỐI) HEADER */}
                  <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTeam(team.id)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {tIdx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                            TEAM (KHỐI)
                          </span>
                          <h3 className="font-bold text-sm sm:text-base text-slate-900">
                            {team.name}
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {teamGroupCount} Group (Ban) &bull; {teamPartCount} Part (Bộ phận)
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAddGroup(team.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Thêm Group (Ban) vào Team này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Thêm Group (Ban)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditTeam(team)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 transition cursor-pointer"
                          title="Đổi tên Team (Khối) này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg border border-slate-200 transition cursor-pointer"
                          title="Xóa Team (Khối) này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* GROUPS (BAN) INSIDE TEAM */}
                  {isExpanded && (
                    <div className="p-4 bg-white space-y-3">
                      {team.bans.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Chưa có Group (Ban) nào trong Team này. Hãy bấm "+ Thêm Group (Ban)" ở trên để bổ sung.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 pl-4 sm:pl-8 border-l-2 border-indigo-200">
                          {team.bans.map((group) => {
                            const isGroupExpanded = expandedGroups[group.id] !== false;

                            return (
                              <div
                                key={group.id}
                                className="bg-slate-50/60 rounded-xl border border-slate-200 overflow-hidden"
                              >
                                {/* GROUP (BAN) ROW */}
                                <div className="p-3 flex items-center justify-between gap-3 bg-slate-100/70 border-b border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleGroup(group.id)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                                    >
                                      {isGroupExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>

                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">
                                      GROUP (BAN)
                                    </span>
                                    <span className="font-bold text-xs sm:text-sm text-slate-800">
                                      {group.name}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      ({group.phongs.length} Part)
                                    </span>
                                  </div>

                                  {isAdmin && (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openAddPart(team.id, group.id)}
                                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                        title="Thêm Part (Bộ phận) vào Group này"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>+ Thêm Part</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => openEditGroup(team.id, group)}
                                        className="p-1 text-slate-400 hover:text-purple-600 rounded transition cursor-pointer"
                                        title="Đổi tên Group (Ban)"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGroup(team.id, group.id, group.name)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                        title="Xóa Group (Ban)"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* PARTS (BỘ PHẬN / PHÒNG) INSIDE GROUP */}
                                {isGroupExpanded && (
                                  <div className="p-3 pl-6 sm:pl-10 space-y-1.5 border-l-2 border-purple-200 m-2">
                                    {group.phongs.length === 0 ? (
                                      <span className="text-[11px] text-slate-400 italic">
                                        Chưa có Part nào. Bấm "+ Thêm Part" để thêm.
                                      </span>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {group.phongs.map((part) => (
                                          <div
                                            key={part.id}
                                            className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-emerald-300 transition"
                                          >
                                            <div className="flex items-center gap-1.5 truncate">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                              <span className="font-semibold text-slate-800 truncate" title={part.name}>
                                                {part.name}
                                              </span>
                                            </div>

                                            {isAdmin && (
                                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                                <button
                                                  type="button"
                                                  onClick={() => openEditPart(team.id, group.id, part)}
                                                  className="p-0.5 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                                  title="Đổi tên Part"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeletePart(team.id, group.id, part.id, part.name)}
                                                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                                  title="Xóa Part"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal Thêm / Sửa Team, Group, Part */}
          {modalType && (
            <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    {modalType === 'add_team' && '+ Thêm Team (Khối) Mới'}
                    {modalType === 'edit_team' && 'Đổi Tên Team (Khối)'}
                    {modalType === 'add_group' && '+ Thêm Group (Ban) Mới'}
                    {modalType === 'edit_group' && 'Đổi Tên Group (Ban)'}
                    {modalType === 'add_part' && '+ Thêm Part (Bộ Phận / Phòng) Mới'}
                    {modalType === 'edit_part' && 'Đổi Tên Part (Bộ Phận / Phòng)'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleModalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Đơn Vị Tổ Chức <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={inputNodeName}
                      onChange={(e) => setInputNodeName(e.target.value)}
                      placeholder="Ví dụ: FS INNOVATION, TRADING, CULINARY..."
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold uppercase"
                      autoFocus
                      required
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Tên sẽ được tự động chuẩn hóa chữ in hoa để khớp tiêu chuẩn dữ liệu.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingOrg}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingOrg ? 'Đang Lưu...' : 'Xác Nhận & Lưu'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
