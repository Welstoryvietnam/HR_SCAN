import React, { useState, useMemo } from 'react';
import { UserProfile, KhoiNode, BanNode, PhongNode } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  FolderTree,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Layers,
  Users,
  Network,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_ORGANIZATION_HIERARCHY } from '../data/organizationHierarchy';
import { OrgGoogleSheetSyncModal } from './OrgGoogleSheetSyncModal';

interface OrganizationHierarchyManagerProps {
  currentUser: UserProfile;
  organizationHierarchy?: KhoiNode[];
  onSaveOrganizationHierarchy?: (newHierarchy: KhoiNode[]) => Promise<void>;
}

export const OrganizationHierarchyManager: React.FC<OrganizationHierarchyManagerProps> = ({
  currentUser,
  organizationHierarchy = DEFAULT_ORGANIZATION_HIERARCHY,
  onSaveOrganizationHierarchy,
}) => {
  const [isOrgGoogleSheetModalOpen, setIsOrgGoogleSheetModalOpen] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const [localHierarchy, setLocalHierarchy] = useState<KhoiNode[]>(organizationHierarchy);
  const [orgSearch, setOrgSearch] = useState('');

  React.useEffect(() => {
    if (organizationHierarchy && organizationHierarchy.length > 0) {
      setLocalHierarchy(organizationHierarchy);
    }
  }, [organizationHierarchy]);

  const [modalType, setModalType] = useState<
    'add_team' | 'edit_team' | 'add_group' | 'edit_group' | 'add_part' | 'edit_part' | null
  >(null);
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetPartId, setTargetPartId] = useState<string>('');
  const [inputNodeName, setInputNodeName] = useState<string>('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);

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

  const openAddTeam = () => {
    setInputNodeName('');
    setModalType('add_team');
  };

  const openEditTeam = (k: KhoiNode) => {
    setTargetTeamId(k.id);
    setInputNodeName(k.name);
    setModalType('edit_team');
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Team (Khối) "${teamName}" cùng toàn bộ Group và Part bên trong?`)) {
      return;
    }
    const updated = localHierarchy.filter((k) => k.id !== teamId);
    setLocalHierarchy(updated);
    void saveNewHierarchy(updated);
  };

  const openAddGroup = (teamId: string) => {
    setTargetTeamId(teamId);
    setInputNodeName('');
    setModalType('add_group');
  };

  const openEditGroup = (teamId: string, b: BanNode) => {
    setTargetTeamId(teamId);
    setTargetGroupId(b.id);
    setInputNodeName(b.name);
    setModalType('edit_group');
  };

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
    setLocalHierarchy(updated);
    void saveNewHierarchy(updated);
  };

  const openAddPart = (teamId: string, groupId: string) => {
    setTargetTeamId(teamId);
    setTargetGroupId(groupId);
    setInputNodeName('');
    setModalType('add_part');
  };

  const openEditPart = (teamId: string, groupId: string, p: PhongNode) => {
    setTargetTeamId(teamId);
    setTargetGroupId(groupId);
    setTargetPartId(p.id);
    setInputNodeName(p.name);
    setModalType('edit_part');
  };

  const handleDeletePart = (teamId: string, groupId: string, partId: string, partName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Part (Bộ phận) "${partName}"?`)) return;
    try {
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
      setLocalHierarchy(updated);
      void saveNewHierarchy(updated);
    } catch (err) {
      alert('Không thể xóa bộ phận: ' + (err as Error).message);
    }
  };

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
    } else if (modalType === 'edit_team') {
      updated = updated.map((k) => (k.id === targetTeamId ? { ...k, name: trimmed } : k));
    } else if (modalType === 'add_group') {
      updated = updated.map((k) => {
        if (k.id === targetTeamId) {
          const newBan: BanNode = {
            id: `group_${Date.now()}`,
            name: trimmed,
            phongs: [{ id: `part_${Date.now()}_default`, name: trimmed }],
          };
          return {
            ...k,
            bans: [...k.bans, newBan],
          };
        }
        return k;
      });
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

    void saveNewHierarchy(updated);
    setModalType(null);
  };

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

  const handleResetDefaultHierarchy = () => {
    if (confirm('Khôi phục toàn bộ cơ cấu tổ chức về cấu hình chuẩn ban đầu?')) {
      void saveNewHierarchy(DEFAULT_ORGANIZATION_HIERARCHY);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Cài đặt tiêu chuẩn chung</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Quản Lý Cơ Cấu Tổ Chức
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Hệ thống quản lý phân cấp trực quan Team (Khối) → Group (Ban) → Part (Bộ phận).
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsOrgGoogleSheetModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Đồng Bộ Từ Google Sheets</span>
              </button>

              <button
                type="button"
                onClick={openAddTeam}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Team Mới</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaultHierarchy}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
                title="Khôi phục danh mục cơ cấu chuẩn ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi Phục Mẫu</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-emerald-800/60 relative z-10">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-white/10">
            <span className="text-xs text-emerald-200 font-medium">Team (Khối)</span>
            <span className="text-xl sm:text-2xl font-black text-white">{orgStats.totalTeams}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-white/10">
            <span className="text-xs text-emerald-200 font-medium">Group (Ban)</span>
            <span className="text-xl sm:text-2xl font-black text-white">{orgStats.totalGroups}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-white/10">
            <span className="text-xs text-emerald-200 font-medium">Part (Bộ Phận)</span>
            <span className="text-xl sm:text-2xl font-black text-white">{orgStats.totalParts}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={orgSearch}
            onChange={(e) => setOrgSearch(e.target.value)}
            placeholder="Tìm kiếm nhanh Team, Ban, Bộ phận..."
            className="w-full text-xs pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-medium text-slate-800 outline-none"
          />
          {orgSearch && (
            <button
              type="button"
              onClick={() => setOrgSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 self-end sm:self-auto">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            Hiển thị: {filteredHierarchy.length} / {localHierarchy.length} Khối
          </span>
        </div>
      </div>

      {/* Grid Card Layout for Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHierarchy.map((team) => {
          const groupCount = team.bans.length;
          const partCount = team.bans.reduce((acc, b) => acc + b.phongs.length, 0);

          return (
            <div
              key={team.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              {/* Team Header */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      Team (Khối)
                    </span>
                  </div>
                  <h3 className="text-base font-black truncate mt-1 text-white tracking-wide">
                    {team.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-white/10 font-semibold">{groupCount} Ban</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 font-semibold">{partCount} Bộ phận</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0 bg-white/10 p-1 rounded-xl backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openAddGroup(team.id); }}
                      className="p-1.5 text-emerald-300 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
                      title="Thêm Ban mới vào Khối này"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEditTeam(team); }}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
                      title="Sửa tên Khối"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id, team.name); }}
                      className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-500/50 rounded-lg transition cursor-pointer"
                      title="Xóa Khối"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Groups & Parts List inside Team */}
              <div className="p-4 space-y-3 flex-1 bg-slate-50/40">
                {team.bans.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Chưa có Ban nào trong Khối này. Nhấn [+] để thêm Ban.
                  </div>
                ) : (
                  team.bans.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs space-y-2"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {group.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({group.phongs.length} phòng)
                          </span>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openAddPart(team.id, group.id); }}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                              title="Thêm Bộ phận / Phòng vào Ban này"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditGroup(team.id, group); }}
                              className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer"
                              title="Sửa tên Ban"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteGroup(team.id, group.id, group.name); }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Xóa Ban"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Parts (Bộ phận / Phòng) Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {group.phongs.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Chưa có phòng ban</span>
                        ) : (
                          group.phongs.map((part) => (
                            <div
                              key={part.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition"
                            >
                              <span className="truncate max-w-[130px]">{part.name}</span>
                              {isAdmin && (
                                <div className="inline-flex items-center gap-1 ml-1 pl-1 border-l border-slate-200">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openEditPart(team.id, group.id, part); }}
                                    className="text-slate-400 hover:text-emerald-700 p-0.5 cursor-pointer"
                                    title="Sửa phòng"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeletePart(team.id, group.id, part.id, part.name); }}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                    title="Xóa phòng"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm / Sửa Team, Group, Part */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FolderTree className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {modalType === 'add_team' && 'Thêm Team (Khối) Mới'}
                  {modalType === 'edit_team' && 'Đổi Tên Team (Khối)'}
                  {modalType === 'add_group' && 'Thêm Group (Ban) Mới'}
                  {modalType === 'edit_group' && 'Đổi Tên Group (Ban)'}
                  {modalType === 'add_part' && 'Thêm Part (Bộ Phận / Phòng) Mới'}
                  {modalType === 'edit_part' && 'Đổi Tên Part (Bộ Phận / Phòng)'}
                </h3>
              </div>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên Đơn Vị Tổ Chức <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputNodeName}
                  onChange={(e) => setInputNodeName(e.target.value)}
                  placeholder="Ví dụ: FS INNOVATION, TRADING, CULINARY..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold uppercase text-slate-900 bg-slate-50/50"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingOrg}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingOrg ? 'Đang Lưu...' : 'Xác Nhận & Lưu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kết nối Google Sheets đồng bộ Cơ Cấu Tổ Chức */}
      <OrgGoogleSheetSyncModal
        isOpen={isOrgGoogleSheetModalOpen}
        onClose={() => setIsOrgGoogleSheetModalOpen(false)}
        currentUser={currentUser}
        currentHierarchy={localHierarchy}
        onHierarchyUpdated={async (updatedHierarchy) => {
          await saveNewHierarchy(updatedHierarchy);
        }}
      />
    </div>
  );
};
