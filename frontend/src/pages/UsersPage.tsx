import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RotateCcw, Search, X } from 'lucide-react';
import { ApiError } from '../api/client';
import { companiesApi, rolesApi, usersApi } from '../api/hrService';
import { ApiErrorAlert } from '../components/directory/ApiErrorAlert';
import { DeleteConfirmDrawer } from '../components/directory/DeleteConfirmDrawer';
import { UserFormDrawer } from '../components/directory/UserFormDrawer';
import { UserAvatar } from '../components/ui/Badges';
import { Pagination } from '../components/ui/Pagination';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  GENDERS,
  type CompanyResponseDTO,
  type GenderEnum,
  type PageResponseDTO,
  type RoleResponseDTO,
  type UserFilterDTO,
  type UserFilterPreset,
  type UserResponseDTO,
} from '../types/hr';
import { genderLabel } from '../utils/format';

interface UserFilterState {
  name: string;
  email: string;
  gender: GenderEnum | '';
  minAge: string;
  maxAge: string;
  companyId: number | null;
  roleId: number | null;
}

function buildInitialFilterState(preset: UserFilterPreset | null): UserFilterState {
  if (!preset) {
    return {
      name: '',
      email: '',
      gender: '',
      minAge: '',
      maxAge: '',
      companyId: null,
      roleId: null,
    };
  }

  const rawQuery = (preset.query ?? '').trim();
  const inferredName =
    preset.name !== undefined
      ? preset.name
      : rawQuery && !rawQuery.includes('@')
        ? rawQuery
        : '';
  const inferredEmail =
    preset.email !== undefined
      ? preset.email
      : rawQuery && rawQuery.includes('@')
        ? rawQuery
        : '';

  return {
    name: inferredName,
    email: inferredEmail,
    gender: preset.gender ?? '',
    minAge:
      preset.minAge !== undefined && preset.minAge !== '' ? String(preset.minAge) : '',
    maxAge:
      preset.maxAge !== undefined && preset.maxAge !== '' ? String(preset.maxAge) : '',
    companyId: typeof preset.companyId === 'number' ? preset.companyId : null,
    roleId: typeof preset.roleId === 'number' ? preset.roleId : null,
  };
}

function paginateClient<T>(items: T[], page: number, size: number): PageResponseDTO<T> {
  const safeSize = Math.max(1, size);
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    content: items.slice(start, start + safeSize),
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1,
  };
}

const EMPTY_PAGE: PageResponseDTO<UserResponseDTO> = {
  content: [],
  page: 1,
  size: 5,
  totalElements: 0,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

export function UsersPage() {
  const {
    dataMode,
    refreshTick,
    userFilterPreset,
    clearUserFilterPreset,
    triggerRefresh,
    navigate,
  } = useApp();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<UserFilterState>(() =>
    buildInitialFilterState(userFilterPreset),
  );
  const [debouncedTextFilters, setDebouncedTextFilters] = useState(() => ({
    name: filters.name,
    email: filters.email,
    minAge: filters.minAge,
    maxAge: filters.maxAge,
  }));

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(5);

  const [pageData, setPageData] = useState<PageResponseDTO<UserResponseDTO>>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | string | null>(null);
  const [contextTruncatedWarning, setContextTruncatedWarning] = useState(false);

  const [companies, setCompanies] = useState<CompanyResponseDTO[]>([]);
  const [roles, setRoles] = useState<RoleResponseDTO[]>([]);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponseDTO | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserResponseDTO | null>(null);

  const fetchSeqRef = useRef(0);

  // Consume userFilterPreset from AppContext (e.g. drilled down from Dashboard / Companies / Roles)
  useEffect(() => {
    if (!userFilterPreset) return;
    const next = buildInitialFilterState(userFilterPreset);
    setFilters(next);
    setDebouncedTextFilters({
      name: next.name,
      email: next.email,
      minAge: next.minAge,
      maxAge: next.maxAge,
    });
    setPage(1);
    clearUserFilterPreset();
  }, [userFilterPreset, clearUserFilterPreset]);

  // Short debounce for free-text & numeric filter inputs
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTextFilters({
        name: filters.name,
        email: filters.email,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
      });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [filters.name, filters.email, filters.minAge, filters.maxAge]);

  const loadReferences = useCallback(async () => {
    setReferenceError(null);
    const [companiesRes, rolesRes] = await Promise.allSettled([
      companiesApi.list({ page: 1, size: 100 }),
      rolesApi.list({ page: 1, size: 100 }),
    ]);

    if (companiesRes.status === 'fulfilled') {
      setCompanies(companiesRes.value.content);
    }
    if (rolesRes.status === 'fulfilled') {
      setRoles(rolesRes.value.content);
    }
    if (companiesRes.status === 'rejected' || rolesRes.status === 'rejected') {
      setReferenceError('Không thể tải đầy đủ danh mục công ty/vai trò từ API.');
    }
  }, []);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences, dataMode, refreshTick]);

  const fetchUsers = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setLoadError(null);

    const parsedMinAge = debouncedTextFilters.minAge.trim()
      ? Number(debouncedTextFilters.minAge.trim())
      : undefined;
    const parsedMaxAge = debouncedTextFilters.maxAge.trim()
      ? Number(debouncedTextFilters.maxAge.trim())
      : undefined;

    const apiFilter: UserFilterDTO = {
      name: debouncedTextFilters.name.trim() || undefined,
      email: debouncedTextFilters.email.trim() || undefined,
      gender: filters.gender || undefined,
      minAge:
        parsedMinAge !== undefined && Number.isFinite(parsedMinAge)
          ? parsedMinAge
          : undefined,
      maxAge:
        parsedMaxAge !== undefined && Number.isFinite(parsedMaxAge)
          ? parsedMaxAge
          : undefined,
    };

    const hasContextFilter = filters.companyId !== null || filters.roleId !== null;

    try {
      if (hasContextFilter) {
        const res = await usersApi.list({ ...apiFilter, page: 1, size: 100 });
        if (seq !== fetchSeqRef.current) return;

        const filtered = res.content.filter((u) => {
          if (filters.companyId !== null && u.companyInfo?.id !== filters.companyId) {
            return false;
          }
          if (
            filters.roleId !== null &&
            !u.roleInfo.some((r) => r.id === filters.roleId)
          ) {
            return false;
          }
          return true;
        });

        setContextTruncatedWarning(res.totalElements > 100);
        const paged = paginateClient(filtered, page, size);
        setPageData(paged);
        if (paged.page !== page) setPage(paged.page);
      } else {
        setContextTruncatedWarning(false);
        const res = await usersApi.list({ ...apiFilter, page, size });
        if (seq !== fetchSeqRef.current) return;

        if (res.totalPages >= 1 && page > res.totalPages) {
          setPage(res.totalPages);
          return;
        }
        setPageData(res);
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      if (err instanceof ApiError) {
        setLoadError(err);
      } else {
        setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách nhân sự.');
      }
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    debouncedTextFilters.name,
    debouncedTextFilters.email,
    debouncedTextFilters.minAge,
    debouncedTextFilters.maxAge,
    filters.gender,
    filters.companyId,
    filters.roleId,
    page,
    size,
  ]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers, dataMode, refreshTick]);

  const hasActiveFilters = Boolean(
    filters.name.trim() ||
      filters.email.trim() ||
      filters.gender ||
      filters.minAge.trim() ||
      filters.maxAge.trim() ||
      filters.companyId !== null ||
      filters.roleId !== null,
  );

  const activeCompanyName = useMemo(() => {
    if (filters.companyId === null) return null;
    const found = companies.find((c) => c.id === filters.companyId);
    if (found) return found.name;
    const fromRow = pageData.content.find(
      (u) => u.companyInfo?.id === filters.companyId,
    )?.companyInfo?.name;
    return fromRow ?? `Công ty #${filters.companyId}`;
  }, [filters.companyId, companies, pageData.content]);

  const activeRoleName = useMemo(() => {
    if (filters.roleId === null) return null;
    const found = roles.find((r) => r.id === filters.roleId);
    if (found) return found.name;
    const fromRow = pageData.content
      .flatMap((u) => u.roleInfo)
      .find((r) => r.id === filters.roleId)?.name;
    return fromRow ?? `Vai trò #${filters.roleId}`;
  }, [filters.roleId, roles, pageData.content]);

  const clearAllFilters = () => {
    setFilters({
      name: '',
      email: '',
      gender: '',
      minAge: '',
      maxAge: '',
      companyId: null,
      roleId: null,
    });
    setDebouncedTextFilters({ name: '', email: '', minAge: '', maxAge: '' });
    setPage(1);
  };

  const openCreateDrawer = () => {
    setEditingUser(null);
    setFormOpen(true);
    void loadReferences();
  };

  const openEditDrawer = (user: UserResponseDTO) => {
    setEditingUser(user);
    setFormOpen(true);
    void loadReferences();
  };

  const handleUserSaved = (saved: UserResponseDTO, isEdit: boolean) => {
    setFormOpen(false);
    setEditingUser(null);
    triggerRefresh();
    showToast(
      isEdit
        ? `Đã cập nhật nhân sự ${saved.name}.`
        : `Đã tạo nhân sự mới ${saved.name} (#${saved.id}).`,
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    const target = deletingUser;
    await usersApi.remove(target.id);
    setDeletingUser(null);
    triggerRefresh();
    showToast(`Đã xóa nhân sự ${target.name}.`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl heading-display text-ink">Quản lý nhân sự</h1>
          <p className="text-sm text-ink-soft mt-1">
            Danh sách tài khoản nhân sự, gán công ty trực thuộc và đa vai trò RBAC.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDrawer}
          className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-1.5 self-start sm:self-auto focus-ring cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhân sự</span>
        </button>
      </div>

      {/* Filter Bar matching UserFilterDTO */}
      <section className="card-hairline-md p-4 space-y-3" aria-label="Bộ lọc nhân sự">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label
              htmlFor="users-filter-name"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Tên nhân sự
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="users-filter-name"
                type="text"
                value={filters.name}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, name: e.target.value }));
                  setPage(1);
                }}
                placeholder="Tìm theo tên..."
                className="input-field w-full pl-8 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="users-filter-email"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Email
            </label>
            <input
              id="users-filter-email"
              type="text"
              value={filters.email}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, email: e.target.value }));
                setPage(1);
              }}
              placeholder="Tìm theo email..."
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="users-filter-gender"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Giới tính
            </label>
            <select
              id="users-filter-gender"
              value={filters.gender}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  gender: e.target.value as GenderEnum | '',
                }));
                setPage(1);
              }}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">Tất cả</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {genderLabel(g)}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label
              htmlFor="users-filter-minage"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Tuổi từ
            </label>
            <input
              id="users-filter-minage"
              type="number"
              min={1}
              max={150}
              value={filters.minAge}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, minAge: e.target.value }));
                setPage(1);
              }}
              placeholder="18"
              className="input-field w-full px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div className="lg:col-span-1">
            <label
              htmlFor="users-filter-maxage"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Đến tuổi
            </label>
            <input
              id="users-filter-maxage"
              type="number"
              min={1}
              max={150}
              value={filters.maxAge}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, maxAge: e.target.value }));
                setPage(1);
              }}
              placeholder="65"
              className="input-field w-full px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div className="lg:col-span-2 flex items-center justify-end">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={clearAllFilters}
              className="btn-secondary w-full sm:w-auto px-4 py-2 text-xs inline-flex items-center justify-center gap-1.5 focus-ring cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        </div>

        {/* Active preset context badges (Company / Role drilled down from other views) */}
        {(filters.companyId !== null || filters.roleId !== null) && (
          <div className="pt-3 border-t border-hairline flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-soft">Ngữ cảnh đang áp dụng:</span>
            {filters.companyId !== null && (
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, companyId: null }));
                  setPage(1);
                }}
                className="badge-cream border border-ink/15 px-3.5 py-2 text-xs font-medium leading-none inline-flex items-center gap-1.5 hover:opacity-85 focus-ring cursor-pointer"
              >
                <span>Công ty: {activeCompanyName}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {filters.roleId !== null && (
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, roleId: null }));
                  setPage(1);
                }}
                className="badge-lilac border border-ink/15 px-3.5 py-2 text-xs font-medium leading-none inline-flex items-center gap-1.5 hover:opacity-85 focus-ring cursor-pointer"
              >
                <span>Vai trò: {activeRoleName}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {contextTruncatedWarning && (
              <span className="text-xs text-ink-soft">
                (Lọc ngữ cảnh áp dụng trên tối đa 100 bản ghi đầu tiên)
              </span>
            )}
          </div>
        )}
      </section>

      {/* Load Error Banner */}
      {loadError && (
        <div className="space-y-2.5">
          <ApiErrorAlert error={loadError} title="Không thể tải danh sách nhân sự" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchUsers()}
              className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              Thử lại
            </button>
            {loadError instanceof ApiError && loadError.statusCode === 401 && (
              <button
                type="button"
                onClick={() => navigate('auth')}
                className="btn-primary px-4 py-2 text-xs focus-ring cursor-pointer"
              >
                Mở trang Đăng nhập
              </button>
            )}
          </div>
        </div>
      )}

      {/* Users Table */}
      <section className="card-hairline-md overflow-hidden" aria-label="Bảng danh sách nhân sự">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline bg-soft text-xs font-mono uppercase tracking-wider text-ink-soft">
                <th className="py-3 px-4 font-medium whitespace-nowrap">Nhân sự</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Công ty</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Vai trò</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Tuổi · Giới tính</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Địa chỉ</th>
                <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && pageData.content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-sm text-ink-soft">
                    Đang tải danh sách nhân sự...
                  </td>
                </tr>
              ) : pageData.content.length > 0 ? (
                pageData.content.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-[210px]">
                        <UserAvatar
                          id={u.id}
                          name={u.name}
                          avatar={u.avatar}
                          sizeClass="w-9 h-9 text-xs"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(u)}
                            className="font-medium text-ink underline decoration-transparent hover:decoration-current truncate block text-left focus-ring rounded cursor-pointer"
                          >
                            {u.name}
                          </button>
                          <div className="text-xs text-ink-soft truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.companyInfo ? (
                        <span className="inline-flex items-center px-3 py-2 text-xs font-medium leading-none badge-cream">
                          {u.companyInfo.name}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-soft">Chưa gán</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                        {u.roleInfo.length > 0 ? (
                          u.roleInfo.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center px-3 py-2 text-xs font-mono font-medium leading-none badge-lilac whitespace-nowrap"
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink-soft">Chưa có role</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span className="px-3 py-2 text-xs font-mono tabular-nums leading-none badge-soft">
                          {u.age !== null && u.age !== undefined ? `${u.age} tuổi` : '-'}
                        </span>
                        <span className="px-3 py-2 text-xs font-mono leading-none badge-lime">
                          {u.gender ?? '-'}
                        </span>
                      </div>
                    </td>

                    <td
                      className="py-3 px-4 text-xs text-ink-soft max-w-[200px] truncate"
                      title={u.address}
                    >
                      {u.address}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(u)}
                          className="btn-secondary px-3.5 py-2 text-xs leading-none focus-ring cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingUser(u)}
                          className="badge-pink border border-ink/20 px-3.5 py-2 text-xs font-medium leading-none hover:opacity-85 focus-ring cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center">
                    <p className="text-sm font-medium text-ink">
                      Không tìm thấy nhân sự phù hợp bộ lọc
                    </p>
                    <p className="text-xs text-ink-soft mt-1">
                      Thử nới lỏng khoảng tuổi hoặc xóa điều kiện tìm kiếm để xem toàn bộ danh sách.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="btn-secondary mt-3 px-4 py-2 text-xs focus-ring cursor-pointer"
                      >
                        Xóa toàn bộ bộ lọc
                      </button>
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
          onPageChange={(nextPage) => setPage(nextPage)}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 8, 10, 20]}
        />
      </section>

      {/* Create / Edit Slide-Over Drawer */}
      <UserFormDrawer
        open={formOpen}
        editingUser={editingUser}
        companies={companies}
        roles={roles}
        referenceError={referenceError}
        onRetryReferences={() => void loadReferences()}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSuccess={handleUserSaved}
      />

      {/* Delete Confirmation Drawer */}
      <DeleteConfirmDrawer
        open={Boolean(deletingUser)}
        title={`Xóa nhân sự #${deletingUser?.id ?? ''}`}
        subtitle="DELETE /api/v1/users/{id}"
        itemName={deletingUser?.name ?? ''}
        itemMeta={deletingUser?.email}
        previewNode={
          deletingUser ? (
            <UserAvatar
              id={deletingUser.id}
              name={deletingUser.name}
              avatar={deletingUser.avatar}
              sizeClass="w-10 h-10 text-xs"
            />
          ) : null
        }
        description="Bạn có chắc chắn muốn xóa tài khoản nhân sự này? Thao tác sẽ gỡ bỏ hồ sơ khỏi danh sách nhân sự hệ thống."
        onClose={() => setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default UsersPage;
