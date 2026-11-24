import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { ApiError } from '../api/client';
import {
  companiesApi,
  dashboardApi,
  permissionsApi,
  rolesApi,
  usersApi,
} from '../api/hrService';
import { CompanyHeadcountBlock } from '../components/dashboard/CompanyHeadcountBlock';
import { DemographicsCard } from '../components/dashboard/DemographicsCard';
import { DotPlotRankFlip } from '../components/dashboard/DotPlotRankFlip';
import { EndpointExplorerCard } from '../components/dashboard/EndpointExplorerCard';
import { RbacSimulatorBlock } from '../components/dashboard/RbacSimulatorBlock';
import { RoleCoverageMatrixCard } from '../components/dashboard/RoleCoverageMatrixCard';
import { useApp } from '../context/AppContext';
import {
  HR_MODULES,
  type CompanyResponseDTO,
  type DashboardResponse,
  type PageResponseDTO,
  type PermissionFilterPreset,
  type PermissionResponseDTO,
  type RoleResponseDTO,
  type UserFilterPreset,
  type UserResponseDTO,
} from '../types/hr';
import { collectPermissionModules } from '../utils/format';

const DASHBOARD_FETCH_SIZE = 100;
const MAX_FETCH_PAGES = 5;

async function fetchAllPages<T>(
  fetcher: (params: { page: number; size: number }) => Promise<PageResponseDTO<T>>,
): Promise<PageResponseDTO<T>> {
  const first = await fetcher({ page: 1, size: DASHBOARD_FETCH_SIZE });
  const items = [...first.content];
  let current = first;
  let nextPage = 2;

  while (current.hasNext && nextPage <= Math.min(current.totalPages, MAX_FETCH_PAGES)) {
    current = await fetcher({ page: nextPage, size: DASHBOARD_FETCH_SIZE });
    items.push(...current.content);
    nextPage += 1;
  }

  return {
    ...first,
    content: items,
  };
}

export function DashboardPage() {
  const {
    counts,
    dataMode,
    authSession,
    refreshTick,
    navigate,
    switchDataMode,
  } = useApp();

  const [summary, setSummary] = useState<DashboardResponse | null>(null);
  const [users, setUsers] = useState<UserResponseDTO[]>([]);
  const [companies, setCompanies] = useState<CompanyResponseDTO[]>([]);
  const [roles, setRoles] = useState<RoleResponseDTO[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponseDTO[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<{ statusCode: number; message: string } | null>(
    null,
  );
  const [restrictedItems, setRestrictedItems] = useState<string[]>([]);
  const [localReloadTick, setLocalReloadTick] = useState<number>(0);

  const [companyIdFilter, setCompanyIdFilter] = useState<string>('');
  const [roleIdFilter, setRoleIdFilter] = useState<string>('');

  const reloadDashboard = useCallback(() => {
    setLocalReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setRestrictedItems([]);

    const load = async () => {
      try {
        const summaryRes = await dashboardApi.getSummary();
        if (cancelled) return;
        setSummary(summaryRes);

        const [usersRes, companiesRes, rolesRes, permsRes] = await Promise.allSettled([
          fetchAllPages((params) => usersApi.list(params)),
          fetchAllPages((params) => companiesApi.list(params)),
          fetchAllPages((params) => rolesApi.list(params)),
          fetchAllPages((params) => permissionsApi.list(params)),
        ]);
        if (cancelled) return;

        const nextRestricted: string[] = [];
        let firstFailure: { statusCode: number; message: string } | null = null;

        const applyListResult = <T,>(
          label: string,
          result: PromiseSettledResult<PageResponseDTO<T>>,
          setter: (items: T[]) => void,
        ) => {
          if (result.status === 'fulfilled') {
            setter(result.value.content);
            return;
          }
          setter([]);
          const err = result.reason;
          if (err instanceof ApiError) {
            if (err.statusCode === 403) {
              nextRestricted.push(label);
            } else if (!firstFailure) {
              firstFailure = { statusCode: err.statusCode, message: err.fullMessage };
            }
          } else if (!firstFailure) {
            firstFailure = {
              statusCode: 0,
              message: `Không thể tải ${label} từ API.`,
            };
          }
        };

        applyListResult('Nhân sự (GET /api/v1/users)', usersRes, setUsers);
        applyListResult('Công ty (GET /api/v1/companies)', companiesRes, setCompanies);
        applyListResult('Vai trò (GET /api/v1/roles)', rolesRes, setRoles);
        applyListResult('Quyền hạn API (GET /api/v1/permissions)', permsRes, setPermissions);

        setRestrictedItems(nextRestricted);
        if (firstFailure) {
          setLoadError(firstFailure);
        }
      } catch (err) {
        if (cancelled) return;
        setSummary(null);
        setUsers([]);
        setCompanies([]);
        setRoles([]);
        setPermissions([]);
        setRestrictedItems([]);
        if (err instanceof ApiError) {
          setLoadError({ statusCode: err.statusCode, message: err.fullMessage });
        } else {
          setLoadError({
            statusCode: 0,
            message: 'Không thể tải dữ liệu Dashboard từ API.',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [dataMode, refreshTick, authSession.loggedIn, localReloadTick]);

  // Clear stale cross-filter selections if data refreshes without matching IDs
  useEffect(() => {
    if (
      companyIdFilter &&
      companies.length > 0 &&
      !companies.some((c) => String(c.id) === companyIdFilter)
    ) {
      setCompanyIdFilter('');
    }
  }, [companies, companyIdFilter]);

  useEffect(() => {
    if (roleIdFilter && roles.length > 0 && !roles.some((r) => String(r.id) === roleIdFilter)) {
      setRoleIdFilter('');
    }
  }, [roles, roleIdFilter]);

  const hasCrossFilter = Boolean(companyIdFilter || roleIdFilter);

  const roleFilteredUsers = useMemo(() => {
    if (!roleIdFilter) return users;
    const targetRoleId = Number(roleIdFilter);
    return users.filter((u) => u.roleInfo.some((r) => r.id === targetRoleId));
  }, [users, roleIdFilter]);

  const filteredUsers = useMemo(() => {
    return roleFilteredUsers.filter((u) => {
      if (companyIdFilter && String(u.companyInfo?.id ?? '') !== companyIdFilter) {
        return false;
      }
      return true;
    });
  }, [roleFilteredUsers, companyIdFilter]);

  const activeCompanyCountInScope = useMemo(() => {
    const activeIds = new Set<number>();
    roleFilteredUsers.forEach((u) => {
      if (u.companyInfo?.id !== undefined) {
        activeIds.add(u.companyInfo.id);
      }
    });
    return activeIds.size;
  }, [roleFilteredUsers]);

  const totalUsersCount = summary?.totalUsers ?? (users.length || counts.totalUsers);
  const totalCompaniesCount =
    summary?.totalCompanies ?? (companies.length || counts.totalCompanies);
  const totalRolesCount = summary?.totalRoles ?? (roles.length || counts.totalRoles);
  const totalPermissionsCount =
    summary?.totalPermissions ?? (permissions.length || counts.totalPermissions);

  const toggleCompanyFilter = useCallback((companyId: number) => {
    const next = String(companyId);
    setCompanyIdFilter((prev) => (prev === next ? '' : next));
  }, []);

  const resetFilters = useCallback(() => {
    setCompanyIdFilter('');
    setRoleIdFilter('');
  }, []);

  const buildCrossFilterPreset = useCallback(
    (extra: UserFilterPreset = {}): UserFilterPreset => ({
      ...(companyIdFilter ? { companyId: Number(companyIdFilter) } : {}),
      ...(roleIdFilter ? { roleId: Number(roleIdFilter) } : {}),
      ...extra,
    }),
    [companyIdFilter, roleIdFilter],
  );

  const handleDrillToUsers = useCallback(
    (preset: UserFilterPreset) => {
      navigate('users', { userFilter: buildCrossFilterPreset(preset) });
    },
    [navigate, buildCrossFilterPreset],
  );

  const handleDrillToPermissions = useCallback(
    (preset: PermissionFilterPreset) => {
      navigate('permissions', { permissionFilter: preset });
    },
    [navigate],
  );

  const handleOpenRoleMatrix = useCallback(
    (roleId: number) => {
      navigate('roles', { roleId });
    },
    [navigate],
  );

  const moduleCount = useMemo(
    () => collectPermissionModules(permissions).length,
    [permissions],
  );
  const usersRestricted = restrictedItems.some((item) => item.includes('/users'));
  const companiesRestricted = restrictedItems.some((item) => item.includes('/companies'));
  const rolesRestricted = restrictedItems.some((item) => item.includes('/roles'));
  const permsRestricted = restrictedItems.some((item) => item.includes('/permissions'));

  const kpiCards = [
    {
      label: 'Nhân sự',
      value: hasCrossFilter ? `${filteredUsers.length}/${totalUsersCount}` : String(totalUsersCount),
      code: 'totalUsers',
      hint: usersRestricted
        ? 'Giới hạn quyền xem danh sách (403)'
        : `${filteredUsers.filter((u) => u.companyInfo !== null).length} đã gắn công ty`,
      onClick: () =>
        navigate('users', {
          userFilter: hasCrossFilter ? buildCrossFilterPreset() : null,
        }),
    },
    {
      label: 'Công ty',
      value: String(totalCompaniesCount),
      code: 'totalCompanies',
      hint: companiesRestricted
        ? 'Giới hạn quyền xem danh sách (403)'
        : `${activeCompanyCountInScope} công ty có nhân sự`,
      onClick: () => navigate('companies'),
    },
    {
      label: 'Vai trò',
      value: String(totalRolesCount),
      code: 'totalRoles',
      hint: rolesRestricted ? 'Giới hạn quyền xem danh sách (403)' : 'Xem ma trận RBAC',
      onClick: () =>
        navigate('roles', roleIdFilter ? { roleId: Number(roleIdFilter) } : undefined),
    },
    {
      label: 'Quyền hạn',
      value: String(totalPermissionsCount),
      code: 'totalPermissions',
      hint: permsRestricted
        ? 'Giới hạn quyền xem danh sách (403)'
        : `${permissions.length > 0 ? moduleCount : HR_MODULES.length} module chuẩn hóa`,
      onClick: () => navigate('permissions', { permissionFilter: null }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Editorial Header + Secondary / Primary Pill Pair */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl heading-display text-ink">
            Interactive Dashboard nhân sự
          </h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Dữ liệu đồng bộ từ <span className="font-mono text-xs">/api/v1/dashboard</span>, lọc
            chéo theo công ty, vai trò và kiểm thử quyền RBAC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('companies')}
            className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5 focus-ring cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quản lý công ty</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('users', { userFilter: null })}
            className="btn-primary px-5 py-2 text-sm flex items-center gap-1.5 focus-ring cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quản lý nhân sự</span>
          </button>
        </div>
      </div>

      {/* Live API Connection / Auth Notice Banner */}
      {loadError && !(dataMode === 'live' && !authSession.loggedIn && loadError.statusCode === 401) && (
        <div className="card-hairline-md bg-block-cream p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold text-ink">
              {loadError.statusCode === 401
                ? 'Cần đăng nhập Live JWT để tải đầy đủ Dashboard'
                : 'Không thể tải đầy đủ dữ liệu Live API'}
            </p>
            <p className="text-xs text-ink-soft">{loadError.message}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {loadError.statusCode === 401 && (
              <button
                type="button"
                onClick={() => navigate('auth')}
                className="btn-primary px-4 py-2 text-xs focus-ring cursor-pointer"
              >
                Đăng nhập Live
              </button>
            )}
            <button
              type="button"
              onClick={reloadDashboard}
              className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
            {dataMode === 'live' && (
              <button
                type="button"
                onClick={() => switchDataMode('demo')}
                className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
              >
                Chuyển về Demo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Non-admin RBAC Partial 403 Notice */}
      {restrictedItems.length > 0 && (
        <div
          role="status"
          className="card-hairline-md bg-block-cream p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold badge-lilac">
                RBAC 403
              </span>
              <p className="text-sm font-semibold text-ink">
                Một số khối dữ liệu bị giới hạn theo quyền vai trò hiện tại
              </p>
            </div>
            <p className="text-xs text-ink-soft">
              Tổng KPI từ <span className="font-mono">/api/v1/dashboard</span> và các danh sách
              được cấp quyền vẫn hiển thị bình thường. Tài khoản hiện tại chưa được cấp quyền
              đọc: <span className="font-mono text-ink">{restrictedItems.join(', ')}</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('auth')}
              className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              Đổi tài khoản
            </button>
            <button
              type="button"
              onClick={reloadDashboard}
              className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Cross-Filter Bar on White Canvas */}
      <div className="card-hairline-md p-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[240px]">
          <div className="w-full sm:w-56">
            <label
              htmlFor="db-filter-company"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Công ty
            </label>
            <select
              id="db-filter-company"
              value={companyIdFilter}
              onChange={(e) => setCompanyIdFilter(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">Tất cả công ty ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-52">
            <label
              htmlFor="db-filter-role"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Vai trò
            </label>
            <select
              id="db-filter-role"
              value={roleIdFilter}
              onChange={(e) => setRoleIdFilter(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">Tất cả vai trò ({roles.length})</option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <span
            className={`px-3.5 py-2 text-xs font-medium tabular-nums ${
              hasCrossFilter ? 'badge-lime' : 'badge-soft'
            }`}
          >
            {loading
              ? 'Đang đồng bộ dữ liệu...'
              : `Hiển thị ${filteredUsers.length} / ${users.length} nhân sự`}
          </span>
          {hasCrossFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* 4 Core KPI Stat Tiles from DashboardResponse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpiCards.map((card) => (
          <button
            key={card.code}
            type="button"
            onClick={card.onClick}
            className="stat-card p-4 text-left focus-ring cursor-pointer"
          >
            <div className="stat-inner flex flex-col justify-between gap-2">
              <span className="text-xs font-medium text-ink-soft truncate">{card.label}</span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums text-ink">{card.value}</span>
                <span className="hidden sm:inline font-mono text-xs text-ink-soft uppercase truncate">
                  {card.code}
                </span>
              </div>
              <span className="text-xs text-ink-soft truncate">{card.hint}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Row 2: Signature Figma Lime Color-Block + Monochrome Demographics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <CompanyHeadcountBlock
          companies={companies}
          roleFilteredUsers={roleFilteredUsers}
          roles={roles}
          selectedCompanyId={companyIdFilter}
          onToggleCompany={toggleCompanyFilter}
          onManageCompanies={() => navigate('companies')}
        />
        <DemographicsCard
          filteredUsers={filteredUsers}
          onDrillToUsers={handleDrillToUsers}
        />
      </div>

      {/* Row 3: API Endpoint Explorer + Figma Deep Navy Live RBAC Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <EndpointExplorerCard
          permissions={permissions}
          roles={roles}
          onDrillToPermissions={handleDrillToPermissions}
        />
        <RbacSimulatorBlock
          users={users}
          roles={roles}
          permissions={permissions}
          onInspectUser={(email) => navigate('users', { userFilter: { email } })}
          onOpenRoleMatrix={handleOpenRoleMatrix}
        />
      </div>

      {/* Row 3b: DPR-aware Canvas Dot Plot Rank Flip */}
      <DotPlotRankFlip users={users} />

      {/* Row 4: Soft Surface Filtered Employees + Hairline Role Coverage Matrix */}
      <RoleCoverageMatrixCard
        filteredUsers={filteredUsers}
        roles={roles}
        permissions={permissions}
        activeRoleFilterId={roleIdFilter}
        onSelectUser={(email) => navigate('users', { userFilter: { email } })}
        onViewAllUsers={() =>
          navigate('users', {
            userFilter: hasCrossFilter ? buildCrossFilterPreset() : null,
          })
        }
        onSelectRole={handleOpenRoleMatrix}
      />
    </div>
  );
}

export default DashboardPage;
