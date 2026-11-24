import { useMemo } from 'react';
import {
  type PermissionResponseDTO,
  type RoleResponseDTO,
  type UserResponseDTO,
} from '../../types/hr';
import { collectPermissionModules, normalizeModuleName } from '../../utils/format';
import { UserAvatar } from '../ui/Badges';

export interface RoleCoverageMatrixCardProps {
  filteredUsers: UserResponseDTO[];
  roles: RoleResponseDTO[];
  permissions: PermissionResponseDTO[];
  activeRoleFilterId: string;
  onSelectUser: (email: string) => void;
  onViewAllUsers: () => void;
  onSelectRole: (roleId: number) => void;
}

export function RoleCoverageMatrixCard({
  filteredUsers,
  roles,
  permissions,
  activeRoleFilterId,
  onSelectUser,
  onViewAllUsers,
  onSelectRole,
}: RoleCoverageMatrixCardProps) {
  const previewUsers = filteredUsers.slice(-5).reverse();
  const matrixModules = useMemo(
    () =>
      collectPermissionModules(
        permissions,
        roles.flatMap((r) => r.permissions.map((p) => p.module)),
      ),
    [permissions, roles],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Filtered Employees Preview */}
      <section className="color-block bg-soft border border-hairline p-6 lg:col-span-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Nhân sự trong phạm vi lọc
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Nhấn vào nhân sự để mở chi tiết trong quản lý Nhân sự.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAllUsers}
            className="btn-secondary px-3.5 py-2 text-xs focus-ring cursor-pointer shrink-0"
          >
            Xem tất cả
          </button>
        </div>

        {previewUsers.length > 0 ? (
          <div className="divide-y divide-hairline">
            {previewUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectUser(u.email)}
                className="w-full p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left hover:bg-canvas rounded-xl transition-colors focus-ring cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <UserAvatar id={u.id} name={u.name} avatar={u.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{u.name}</p>
                    <p className="text-xs text-ink-soft truncate">
                      {u.companyInfo ? u.companyInfo.name : 'Chưa gán công ty'} · {u.age ?? '-'}{' '}
                      tuổi
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-12 sm:pl-0 sm:justify-end sm:max-w-[44%]">
                  {u.roleInfo.map((role) => (
                    <span
                      key={role.id}
                      className="px-2.5 py-2 text-xs font-mono font-medium badge-cream whitespace-nowrap"
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-canvas border border-hairline p-6 text-center text-xs text-ink-soft">
            Không có nhân sự nào khớp bộ lọc công ty/vai trò hiện tại.
          </div>
        )}
      </section>

      {/* Role Coverage Matrix across all modules */}
      <section className="card-hairline p-6 lg:col-span-7 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Độ phủ quyền hạn theo Vai trò
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Nhấn vào một vai trò để chỉnh sửa ma trận quyền theo {matrixModules.length} module
              chuẩn hóa &amp; động.
            </p>
          </div>
          <span className="text-xs font-mono uppercase text-ink-soft shrink-0">
            role_permission
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-hairline text-ink-soft">
                <th className="py-2.5 pr-4 font-medium whitespace-nowrap">Vai trò</th>
                {matrixModules.map((mod) => (
                  <th
                    key={mod}
                    className="py-2.5 px-2 font-mono font-medium text-center whitespace-nowrap"
                  >
                    {mod}
                  </th>
                ))}
                <th className="py-2.5 pl-3 font-medium text-right whitespace-nowrap">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {roles.length > 0 ? (
                roles.map((role) => {
                  const isHighlighted = activeRoleFilterId === String(role.id);
                  return (
                    <tr
                      key={role.id}
                      onClick={() => onSelectRole(role.id)}
                      className={`table-row cursor-pointer ${
                        isHighlighted ? 'bg-block-cream' : ''
                      }`}
                    >
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRole(role.id);
                          }}
                          className="font-mono font-semibold text-ink hover:underline focus-ring rounded cursor-pointer text-left"
                        >
                          {role.name}
                        </button>
                      </td>
                      {matrixModules.map((mod) => {
                        const modTotal = permissions.filter(
                          (p) => normalizeModuleName(p.module) === mod,
                        ).length;
                        const activeCount = role.permissions.filter(
                          (p) => normalizeModuleName(p.module) === mod,
                        ).length;
                        const badgeClass =
                          activeCount === 0
                            ? 'badge-soft'
                            : modTotal > 0 && activeCount >= modTotal
                              ? 'badge-mint'
                              : 'badge-cream';

                        return (
                          <td key={mod} className="py-2 px-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-2 font-mono tabular-nums ${badgeClass}`}
                            >
                              {activeCount}/{modTotal}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-ink">
                        {role.permissions.length}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={matrixModules.length + 2}
                    className="py-6 text-center text-xs text-ink-soft"
                  >
                    Chưa có vai trò nào được tải.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
