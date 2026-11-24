import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { ApiError } from '../api/client';
import { permissionsApi, rolesApi } from '../api/hrService';
import { ConfirmDialog } from '../components/rbac/ConfirmDialog';
import { RoleFormDrawer } from '../components/rbac/RoleFormDrawer';
import { MethodBadge } from '../components/ui/Badges';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  type PermissionResponseDTO,
  type RoleFilterDTO,
  type RoleResponseDTO,
} from '../types/hr';
import {
  collectPermissionModules,
  formatShortDate,
  normalizeModuleName,
} from '../utils/format';

async function fetchAllPermissions(): Promise<PermissionResponseDTO[]> {
  const firstPage = await permissionsApi.list({ page: 1, size: 100 });
  const collected = [...firstPage.content];
  for (let p = 2; p <= firstPage.totalPages; p += 1) {
    const nextPage = await permissionsApi.list({ page: p, size: 100 });
    collected.push(...nextPage.content);
  }
  return collected;
}

interface ModuleSelectAllProps {
  moduleName: string;
  checkedCount: number;
  totalCount: number;
  disabled: boolean;
  onToggleAll: (checked: boolean) => void;
}

function ModuleSelectAllCheckbox({
  moduleName,
  checkedCount,
  totalCount,
  disabled,
  onToggleAll,
}: ModuleSelectAllProps) {
  const ref = useRef<HTMLInputElement>(null);
  const allChecked = totalCount > 0 && checkedCount === totalCount;
  const isIndeterminate = checkedCount > 0 && checkedCount < totalCount;

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <label
      className={`inline-flex items-center gap-2 text-xs font-medium text-ink whitespace-nowrap shrink-0 ${
        disabled ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        checked={allChecked}
        onChange={(e) => onToggleAll(e.target.checked)}
        className="check-accent shrink-0"
      />
      <span>Chọn tất cả {moduleName}</span>
    </label>
  );
}

export function RolesPage() {
  const { dataMode, refreshTick, selectedRoleId, setSelectedRoleId, triggerRefresh } = useApp();
  const { showToast } = useToast();

  const [nameQuery, setNameQuery] = useState('');
  const [descQuery, setDescQuery] = useState('');
  const [permFilterId, setPermFilterId] = useState<number | ''>('');
  const [debouncedFilter, setDebouncedFilter] = useState<{
    name: string;
    description: string;
    permissionId: number | '';
  }>({ name: '', description: '', permissionId: '' });

  const [roles, setRoles] = useState<RoleResponseDTO[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permissionsRestrictedNote, setPermissionsRestrictedNote] = useState<string | null>(null);

  const [draftPermissionIds, setDraftPermissionIds] = useState<number[]>([]);
  const [savingMatrix, setSavingMatrix] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponseDTO | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RoleResponseDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [pendingRoleSwitchId, setPendingRoleSwitchId] = useState<number | null>(null);
  const [switchingBusy, setSwitchingBusy] = useState(false);
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilter({
        name: nameQuery,
        description: descQuery,
        permissionId: permFilterId,
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [nameQuery, descQuery, permFilterId]);

  const loadRolesAndPermissions = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setLoadError(null);
    setPermissionsRestrictedNote(null);
    try {
      const filter: RoleFilterDTO = {
        page: 1,
        size: 100,
        name: debouncedFilter.name.trim() || undefined,
        description: debouncedFilter.description.trim() || undefined,
        permissionIds:
          debouncedFilter.permissionId !== '' ? [debouncedFilter.permissionId] : undefined,
      };
      const [rolesRes, permsRes] = await Promise.allSettled([
        rolesApi.list(filter),
        fetchAllPermissions(),
      ]);
      if (seq !== fetchSeqRef.current) return;

      if (rolesRes.status === 'rejected') {
        const err = rolesRes.reason;
        const msg =
          err instanceof ApiError
            ? err.fullMessage
            : 'Không thể tải danh sách vai trò và quyền hạn.';
        setLoadError(msg);
        setRoles([]);
        setAllPermissions([]);
        return;
      }

      const loadedRoles = rolesRes.value.content;
      setRoles(loadedRoles);

      if (permsRes.status === 'fulfilled') {
        setAllPermissions(permsRes.value);
      } else {
        const permMap = new Map<number, PermissionResponseDTO>();
        loadedRoles.forEach((role) => {
          role.permissions.forEach((perm) => {
            if (!permMap.has(perm.id)) permMap.set(perm.id, perm);
          });
        });
        setAllPermissions(Array.from(permMap.values()).sort((a, b) => a.id - b.id));
        const err = permsRes.reason;
        if (err instanceof ApiError && err.statusCode === 403) {
          setPermissionsRestrictedNote(
            'Tài khoản hiện tại không có quyền đọc GET /api/v1/permissions (403 Forbidden). Đang hiển thị các quyền gắn sẵn trong từng vai trò.',
          );
        } else {
          setPermissionsRestrictedNote(
            'Không thể tải danh mục tổng hợp từ GET /api/v1/permissions; đang hiển thị các quyền gắn sẵn trong vai trò.',
          );
        }
      }
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedFilter]);

  useEffect(() => {
    void loadRolesAndPermissions();
  }, [loadRolesAndPermissions, dataMode, refreshTick]);

  const activeRole = useMemo(() => {
    if (roles.length === 0) return null;
    return roles.find((r) => r.id === selectedRoleId) ?? roles[0];
  }, [roles, selectedRoleId]);

  // Keep AppContext.selectedRoleId aligned when activeRole resolves
  useEffect(() => {
    if (!loading && activeRole && activeRole.id !== selectedRoleId) {
      setSelectedRoleId(activeRole.id);
    }
  }, [loading, activeRole, selectedRoleId, setSelectedRoleId]);

  // Reset draft permission IDs when switching or reloading the active role
  const activeRoleSyncKey = useMemo(() => {
    if (!activeRole) return 'none';
    const ids = activeRole.permissions
      .map((p) => p.id)
      .sort((a, b) => a - b)
      .join(',');
    return `${activeRole.id}:${activeRole.updatedAt ?? ''}:${ids}`;
  }, [activeRole]);

  useEffect(() => {
    if (!activeRole) {
      setDraftPermissionIds([]);
      return;
    }
    setDraftPermissionIds(activeRole.permissions.map((p) => p.id));
  }, [activeRoleSyncKey, activeRole]);

  const dirtySummary = useMemo(() => {
    if (!activeRole) {
      return { isDirty: false, added: 0, removed: 0 };
    }
    const savedSet = new Set(activeRole.permissions.map((p) => p.id));
    const draftSet = new Set(draftPermissionIds);
    let added = 0;
    let removed = 0;
    draftSet.forEach((id) => {
      if (!savedSet.has(id)) added += 1;
    });
    savedSet.forEach((id) => {
      if (!draftSet.has(id)) removed += 1;
    });
    return {
      isDirty: added > 0 || removed > 0,
      added,
      removed,
    };
  }, [activeRole, draftPermissionIds]);

  const knownPermissions = useMemo(() => {
    if (!activeRole) return allPermissions;
    const seen = new Set(allPermissions.map((p) => p.id));
    const merged = [...allPermissions];
    activeRole.permissions.forEach((p) => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    });
    return merged;
  }, [allPermissions, activeRole]);

  const permissionsByModule = useMemo(() => {
    const modules = collectPermissionModules(knownPermissions);
    return modules.map((mod) => ({
      module: mod,
      items: knownPermissions.filter((p) => normalizeModuleName(p.module) === mod),
    }));
  }, [knownPermissions]);

  const hasFilters = Boolean(nameQuery.trim() || descQuery.trim() || permFilterId !== '');

  const clearFilters = () => {
    setNameQuery('');
    setDescQuery('');
    setPermFilterId('');
  };

  const handleTogglePermission = (permId: number, checked: boolean) => {
    setDraftPermissionIds((prev) => {
      if (checked) {
        return prev.includes(permId) ? prev : [...prev, permId];
      }
      return prev.filter((id) => id !== permId);
    });
  };

  const handleToggleModule = (modPerms: PermissionResponseDTO[], checked: boolean) => {
    const modIds = modPerms.map((p) => p.id);
    setDraftPermissionIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...modIds]));
      }
      return prev.filter((id) => !modIds.includes(id));
    });
  };

  const handleSaveMatrix = async (): Promise<boolean> => {
    if (!activeRole) return false;
    setSavingMatrix(true);
    try {
      const updated = await rolesApi.update(activeRole.id, {
        name: activeRole.name,
        description: activeRole.description,
        permissionIds: Array.from(new Set(draftPermissionIds)),
      });
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setDraftPermissionIds(updated.permissions.map((p) => p.id));
      triggerRefresh();
      showToast(`Đã lưu ma trận quyền cho vai trò ${updated.name}.`);
      return true;
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.fullMessage : 'Không thể lưu ma trận quyền cho vai trò.';
      showToast(msg, 'error');
      return false;
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleSelectRole = (nextId: number) => {
    if (activeRole && activeRole.id === nextId) return;
    if (dirtySummary.isDirty) {
      setPendingRoleSwitchId(nextId);
      return;
    }
    setSelectedRoleId(nextId);
  };

  const handleConfirmSaveAndSwitch = async () => {
    if (pendingRoleSwitchId === null) return;
    setSwitchingBusy(true);
    const saved = await handleSaveMatrix();
    setSwitchingBusy(false);
    if (saved) {
      const target = pendingRoleSwitchId;
      setPendingRoleSwitchId(null);
      setSelectedRoleId(target);
    }
  };

  const handleDiscardAndSwitch = () => {
    if (pendingRoleSwitchId === null) return;
    const target = pendingRoleSwitchId;
    setPendingRoleSwitchId(null);
    setSelectedRoleId(target);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await rolesApi.remove(deleteTarget.id);
      const removedName = deleteTarget.name;
      const remaining = roles.filter((r) => r.id !== deleteTarget.id);
      setRoles(remaining);
      if (selectedRoleId === deleteTarget.id) {
        setSelectedRoleId(remaining[0]?.id ?? null);
      }
      setDeleteTarget(null);
      triggerRefresh();
      showToast(`Đã xóa vai trò ${removedName}.`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.fullMessage
          : 'Không thể xóa vai trò này (có thể đang được gán cho nhân sự).';
      setDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl heading-display text-ink">
            Vai trò &amp; Ma trận phân quyền
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Chọn vai trò bên trái để bật/tắt quyền theo từng module (
            <span className="font-mono text-xs">role_permission</span>) rồi lưu thay đổi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingRole(null);
            setDrawerOpen(true);
          }}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5 self-start sm:self-auto focus-ring cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo vai trò</span>
        </button>
      </div>

      {/* Error State */}
      {loadError && (
        <div
          role="alert"
          className="card-hairline-md p-4 bg-block-pink border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="text-xs text-ink font-medium">{loadError}</div>
          <button
            type="button"
            onClick={() => void loadRolesAndPermissions()}
            className="btn-secondary px-4 py-1.5 text-xs focus-ring cursor-pointer self-start sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loadError && permissionsRestrictedNote && (
        <div
          role="status"
          className="card-hairline-md p-4 bg-block-cream flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="text-xs text-ink font-medium">{permissionsRestrictedNote}</div>
          <button
            type="button"
            onClick={() => void loadRolesAndPermissions()}
            className="btn-secondary px-4 py-1.5 text-xs focus-ring cursor-pointer self-start sm:self-auto shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Split Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Role List Sidebar */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="card-hairline-md p-4 space-y-3">
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="role-filter-name"
                  type="text"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="Tìm theo tên vai trò (name)..."
                  className="input-field w-full pl-9 pr-3 py-2 text-sm"
                />
              </div>

              <input
                id="role-filter-desc"
                type="text"
                value={descQuery}
                onChange={(e) => setDescQuery(e.target.value)}
                placeholder="Lọc theo mô tả (description)..."
                className="input-field w-full px-3 py-2 text-sm"
              />

              <select
                id="role-filter-perm"
                aria-label="Lọc vai trò theo quyền hạn"
                value={permFilterId}
                onChange={(e) =>
                  setPermFilterId(e.target.value ? Number(e.target.value) : '')
                }
                className="input-field w-full px-3 py-2 text-xs font-mono"
              >
                <option value="">Tất cả quyền (permissionIds)</option>
                {allPermissions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.method} {p.apiPath}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs text-ink-soft tabular-nums">
                    {roles.length} vai trò khớp bộ lọc
                  </span>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="btn-secondary px-3 py-1 text-xs focus-ring cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {loading && roles.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-soft">
                  Đang tải danh sách vai trò...
                </div>
              ) : roles.length > 0 ? (
                roles.map((role) => {
                  const selected = activeRole?.id === role.id;
                  const displayCount =
                    selected && dirtySummary.isDirty
                      ? draftPermissionIds.length
                      : role.permissions.length;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role.id)}
                      className={`w-full text-left rounded-xl p-3 border transition-colors focus-ring cursor-pointer ${
                        selected ? 'row-selected' : 'row-idle'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-sm text-ink truncate">
                          {role.name}
                        </span>
                        <span
                          className={`px-2.5 py-1 text-xs font-mono tabular-nums shrink-0 ${
                            selected ? 'badge-black' : 'badge-soft'
                          }`}
                        >
                          {displayCount} quyền
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft mt-1 line-clamp-2">{role.description}</p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl p-4 bg-soft border border-hairline text-center space-y-1.5">
                  <p className="text-xs font-medium text-ink">
                    Không tìm thấy vai trò phù hợp bộ lọc.
                  </p>
                  {dataMode === 'live' && nameQuery.trim() && (
                    <p className="text-xs text-ink-soft">
                      Lưu ý Live API: <span className="font-mono">name</span> khớp chính xác tên
                      vai trò (vd: <span className="font-mono">SUPER_ADMIN</span>); dùng ô mô tả để
                      tìm gần đúng.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right RBAC Permission Matrix */}
        <section className="lg:col-span-8">
          {activeRole ? (
            <div className="card-hairline overflow-hidden">
              {/* Selected Role Header in Figma Lilac (#c5b0f4, #000000 ink) */}
              <div className="p-5 border-b border-hairline bg-block-lilac text-ink space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-mono font-semibold text-ink">
                        {activeRole.name}
                      </h2>
                      <span className="px-3 py-1 text-xs font-mono tabular-nums badge-black">
                        {draftPermissionIds.length} / {knownPermissions.length} quyền
                      </span>
                      {dirtySummary.isDirty && (
                        <span className="px-3 py-1 text-xs font-mono font-semibold badge-cream border border-ink verdict-pop">
                          Chưa lưu (+{dirtySummary.added} / -{dirtySummary.removed})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-soft leading-relaxed">
                      {activeRole.description}
                    </p>
                    <p className="text-xs font-mono text-ink-soft">
                      ID #{activeRole.id} · Cập nhật: {formatShortDate(activeRole.updatedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {dirtySummary.isDirty && (
                      <button
                        type="button"
                        disabled={savingMatrix}
                        onClick={() =>
                          setDraftPermissionIds(activeRole.permissions.map((p) => p.id))
                        }
                        className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hoàn tác</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!dirtySummary.isDirty || savingMatrix}
                      onClick={() => void handleSaveMatrix()}
                      className={`px-4 py-2 text-xs flex items-center gap-1.5 focus-ring ${
                        dirtySummary.isDirty && !savingMatrix
                          ? 'btn-primary cursor-pointer'
                          : 'rounded-full bg-canvas text-ink-soft border border-hairline font-medium cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingMatrix ? 'Đang lưu...' : 'Lưu ma trận quyền'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingRole(activeRole);
                        setDrawerOpen(true);
                      }}
                      className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(activeRole);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold badge-pink border border-ink hover:opacity-85 flex items-center gap-1.5 focus-ring cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Module-Grouped Permission Matrix (HR_MODULES + dynamic modules) */}
              <div className="p-5 space-y-4">
                {permissionsByModule.map(({ module, items }) => {
                  const checkedCount = items.filter((p) =>
                    draftPermissionIds.includes(p.id),
                  ).length;

                  return (
                    <div
                      key={module}
                      className="border border-hairline rounded-xl overflow-hidden bg-canvas"
                    >
                      <div className="px-4 py-3 border-b border-hairline flex flex-wrap items-center justify-between gap-2 bg-soft">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-ink">
                            {module}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-ink-soft">
                            ({checkedCount}/{items.length})
                          </span>
                        </div>
                        <ModuleSelectAllCheckbox
                          moduleName={module}
                          checkedCount={checkedCount}
                          totalCount={items.length}
                          disabled={items.length === 0 || savingMatrix}
                          onToggleAll={(checked) => handleToggleModule(items, checked)}
                        />
                      </div>

                      {items.length > 0 ? (
                        <div className="divide-y divide-hairline">
                          {items.map((perm) => {
                            const has = draftPermissionIds.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-soft cursor-pointer"
                              >
                                <span className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    disabled={savingMatrix}
                                    checked={has}
                                    onChange={(e) =>
                                      handleTogglePermission(perm.id, e.target.checked)
                                    }
                                    className="check-accent shrink-0"
                                  />
                                  <MethodBadge
                                    method={perm.method}
                                    className="w-16 justify-center shrink-0"
                                  />
                                  <span className="text-sm text-ink truncate">{perm.name}</span>
                                </span>
                                <span className="font-mono text-xs text-ink-soft hidden sm:inline shrink-0">
                                  {perm.apiPath}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-xs text-ink-soft">
                          Chưa có endpoint nào thuộc module <span className="font-mono">{module}</span>.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card-hairline p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-ink">Chưa có vai trò nào được chọn</p>
              <p className="text-xs text-ink-soft">
                Tạo mới một vai trò hoặc xóa bộ lọc tìm kiếm để cấu hình ma trận quyền RBAC.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Role Slide-Over Drawer */}
      <RoleFormDrawer
        open={drawerOpen}
        role={editingRole}
        initialPermissionIds={
          editingRole && activeRole && editingRole.id === activeRole.id
            ? draftPermissionIds
            : undefined
        }
        allPermissions={knownPermissions}
        onClose={() => setDrawerOpen(false)}
        onSaved={(saved, isCreate) => {
          setDrawerOpen(false);
          if (isCreate) {
            setRoles((prev) => [...prev, saved]);
            setSelectedRoleId(saved.id);
          } else {
            setRoles((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
            if (activeRole && activeRole.id === saved.id) {
              setDraftPermissionIds(saved.permissions.map((p) => p.id));
            }
          }
          triggerRefresh();
          showToast(
            isCreate
              ? `Đã tạo vai trò ${saved.name}.`
              : `Đã cập nhật vai trò ${saved.name}.`,
          );
        }}
      />

      {/* Delete Role Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Xóa vai trò ${deleteTarget?.name ?? ''}?`}
        description="Vai trò bị xóa sẽ gỡ liên kết quyền trong role_permission. Thao tác này không thể hoàn tác."
        confirmLabel="Xác nhận xóa"
        tone="danger"
        busy={deleting}
        errorMessage={deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />

      {/* Unsaved Matrix Changes Guard when Switching Roles */}
      <ConfirmDialog
        open={pendingRoleSwitchId !== null}
        title="Thay đổi ma trận quyền chưa được lưu"
        description={`Vai trò ${activeRole?.name ?? ''} đang có ${dirtySummary.added + dirtySummary.removed} thay đổi chưa lưu. Bạn muốn lưu trước khi chuyển hay bỏ qua?`}
        confirmLabel="Lưu & chuyển"
        secondaryActionLabel="Bỏ thay đổi"
        cancelLabel="Ở lại"
        tone="neutral"
        busy={switchingBusy}
        onConfirm={() => void handleConfirmSaveAndSwitch()}
        onSecondaryAction={handleDiscardAndSwitch}
        onCancel={() => setPendingRoleSwitchId(null)}
      />
    </div>
  );
}

export default RolesPage;
