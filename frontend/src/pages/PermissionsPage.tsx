import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ApiError } from '../api/client';
import { permissionsApi } from '../api/hrService';
import { ConfirmDialog } from '../components/rbac/ConfirmDialog';
import { PermissionFormDrawer } from '../components/rbac/PermissionFormDrawer';
import { MethodBadge } from '../components/ui/Badges';
import { Pagination } from '../components/ui/Pagination';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  HTTP_METHODS,
  type PageResponseDTO,
  type PermissionResponseDTO,
} from '../types/hr';
import { collectPermissionModules, normalizeModuleName } from '../utils/format';

interface PermissionFilterState {
  name: string;
  method: string;
  module: string;
  page: number;
  size: number;
}

export function PermissionsPage() {
  const {
    dataMode,
    refreshTick,
    permissionFilterPreset,
    clearPermissionFilterPreset,
    triggerRefresh,
  } = useApp();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<PermissionFilterState>(() => ({
    name: permissionFilterPreset?.name ?? '',
    method: permissionFilterPreset?.method ?? '',
    module: permissionFilterPreset?.module ?? '',
    page: 1,
    size: 8,
  }));

  const [debouncedName, setDebouncedName] = useState(filter.name);

  const [pageData, setPageData] = useState<PageResponseDTO<PermissionResponseDTO>>({
    content: [],
    page: 1,
    size: 8,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [observedModules, setObservedModules] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<PermissionResponseDTO | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PermissionResponseDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fetchSeqRef = useRef(0);

  // Consume one-shot Dashboard drill-down preset
  useEffect(() => {
    if (!permissionFilterPreset) return;
    const nextName = permissionFilterPreset.name ?? '';
    setFilter((prev) => ({
      ...prev,
      name: nextName,
      method: permissionFilterPreset.method ?? '',
      module: permissionFilterPreset.module ?? '',
      page: 1,
    }));
    setDebouncedName(nextName);
    clearPermissionFilterPreset();
  }, [permissionFilterPreset, clearPermissionFilterPreset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedName(filter.name);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [filter.name]);

  const loadPermissions = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await permissionsApi.list({
        name: debouncedName.trim() || undefined,
        method: filter.method || undefined,
        module: filter.module || undefined,
        page: filter.page,
        size: filter.size,
      });
      if (seq !== fetchSeqRef.current) return;
      setPageData(res);
      setObservedModules((prev) => collectPermissionModules(res.content, prev));
      if (res.page !== filter.page && res.totalPages >= 1) {
        setFilter((prev) => ({ ...prev, page: res.page }));
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      const msg =
        err instanceof ApiError
          ? err.fullMessage
          : 'Không thể tải danh sách quyền hạn API.';
      setLoadError(msg);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedName, filter.method, filter.module, filter.page, filter.size]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions, dataMode, refreshTick]);

  const hasFilters = Boolean(filter.name.trim() || filter.method || filter.module);

  const moduleOptions = useMemo(
    () => collectPermissionModules(pageData.content, [...observedModules, filter.module]),
    [pageData.content, observedModules, filter.module],
  );

  const clearFilters = () => {
    setFilter((prev) => ({
      ...prev,
      name: '',
      method: '',
      module: '',
      page: 1,
    }));
    setDebouncedName('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await permissionsApi.remove(deleteTarget.id);
      const removedLabel = `${deleteTarget.method} ${deleteTarget.apiPath}`;
      setDeleteTarget(null);
      if (pageData.content.length === 1 && filter.page > 1) {
        setFilter((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        await loadPermissions();
      }
      triggerRefresh();
      showToast(`Đã xóa quyền hạn ${removedLabel}.`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.fullMessage
          : 'Không thể xóa quyền hạn (có thể quyền đang được gán cho vai trò).';
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
            Danh mục quyền hạn API
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Định nghĩa endpoint <span className="font-mono text-xs">apiPath</span>, HTTP{' '}
            <span className="font-mono text-xs">method</span> và nhóm{' '}
            <span className="font-mono text-xs">module</span> theo{' '}
            <span className="font-mono text-xs">PermissionFilterDTO</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingPerm(null);
            setDrawerOpen(true);
          }}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5 self-start sm:self-auto focus-ring cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm quyền API</span>
        </button>
      </div>

      {/* Filter Bar matching PermissionFilterDTO */}
      <div className="card-hairline-md p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="perm-filter-name"
            className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
          >
            Tên quyền{dataMode === 'demo' ? ' hoặc apiPath' : ''}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="perm-filter-name"
              type="text"
              value={filter.name}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, name: e.target.value, page: 1 }))
              }
              placeholder={
                dataMode === 'demo'
                  ? 'Tìm /api/v1/users hoặc tên quyền...'
                  : 'Tìm theo tên quyền...'
              }
              className="input-field w-full pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="w-40">
          <label
            htmlFor="perm-filter-method"
            className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
          >
            Method
          </label>
          <select
            id="perm-filter-method"
            value={filter.method}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                method: e.target.value,
                page: 1,
              }))
            }
            className="input-field w-full px-3 py-2 text-sm font-mono"
          >
            <option value="">Tất cả</option>
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <label
            htmlFor="perm-filter-module"
            className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
          >
            Module
          </label>
          <select
            id="perm-filter-module"
            value={filter.module}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                module: e.target.value,
                page: 1,
              }))
            }
            className="input-field w-full px-3 py-2 text-sm font-mono"
          >
            <option value="">Tất cả</option>
            {moduleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Error Banner */}
      {loadError && (
        <div
          role="alert"
          className="card-hairline-md p-4 bg-block-pink border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="text-xs text-ink font-medium">{loadError}</div>
          <button
            type="button"
            onClick={() => void loadPermissions()}
            className="btn-secondary px-4 py-1.5 text-xs focus-ring cursor-pointer self-start sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Permissions Table */}
      <div className="card-hairline-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline bg-soft text-xs font-mono uppercase tracking-wider text-ink-soft">
                <th className="py-3 px-4 font-medium w-16">ID</th>
                <th className="py-3 px-4 font-medium">Tên quyền</th>
                <th className="py-3 px-4 font-medium">API Path</th>
                <th className="py-3 px-4 font-medium">Method</th>
                <th className="py-3 px-4 font-medium">Module</th>
                <th className="py-3 px-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && pageData.content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-xs text-ink-soft">
                    Đang tải danh mục quyền hạn API...
                  </td>
                </tr>
              ) : pageData.content.length > 0 ? (
                pageData.content.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-ink-soft">
                      #{p.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-ink">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-ink">{p.apiPath}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <MethodBadge method={p.method} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 font-mono text-xs badge-soft">
                        {normalizeModuleName(p.module)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPerm(p);
                            setDrawerOpen(true);
                          }}
                          className="btn-secondary px-3.5 py-1.5 text-xs focus-ring cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(p);
                          }}
                          className="px-3.5 py-1.5 text-xs font-medium badge-pink border border-ink hover:opacity-85 focus-ring cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center space-y-2">
                    <p className="text-sm font-medium text-ink">
                      Không tìm thấy quyền hạn API phù hợp
                    </p>
                    <p className="text-xs text-ink-soft">
                      Thử chọn lại Method, Module hoặc xóa từ khóa tìm kiếm để xem toàn bộ danh
                      sách.
                    </p>
                    {hasFilters && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="btn-secondary px-4 py-1.5 text-xs focus-ring cursor-pointer"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pageData.page}
          size={pageData.size}
          totalElements={pageData.totalElements}
          totalPages={pageData.totalPages}
          hasNext={pageData.hasNext}
          hasPrevious={pageData.hasPrevious}
          onPageChange={(nextPage) => setFilter((prev) => ({ ...prev, page: nextPage }))}
          onSizeChange={(nextSize) =>
            setFilter((prev) => ({ ...prev, size: nextSize, page: 1 }))
          }
        />
      </div>

      {/* Create / Edit Permission Slide-Over Drawer */}
      <PermissionFormDrawer
        open={drawerOpen}
        permission={editingPerm}
        onClose={() => setDrawerOpen(false)}
        onSaved={(saved, isCreate) => {
          setDrawerOpen(false);
          void loadPermissions();
          triggerRefresh();
          showToast(
            isCreate
              ? `Đã thêm quyền ${saved.method} ${saved.apiPath}.`
              : `Đã cập nhật quyền ${saved.name}.`,
          );
        }}
      />

      {/* Delete Permission Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Xóa quyền #${deleteTarget?.id ?? ''}?`}
        description={
          deleteTarget
            ? `Xác nhận xóa quyền "${deleteTarget.name}" (${deleteTarget.method} ${deleteTarget.apiPath}) khỏi hệ thống RBAC?`
            : ''
        }
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
    </div>
  );
}

export default PermissionsPage;
