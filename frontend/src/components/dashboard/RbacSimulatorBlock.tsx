import { useEffect, useMemo, useState } from 'react';
import type { PermissionResponseDTO, RoleResponseDTO, UserResponseDTO } from '../../types/hr';

export interface RbacSimulatorBlockProps {
  users: UserResponseDTO[];
  roles: RoleResponseDTO[];
  permissions: PermissionResponseDTO[];
  onInspectUser: (email: string) => void;
  onOpenRoleMatrix: (roleId: number) => void;
}

export function RbacSimulatorBlock({
  users,
  roles,
  permissions,
  onInspectUser,
  onOpenRoleMatrix,
}: RbacSimulatorBlockProps) {
  const [simUserId, setSimUserId] = useState<number>(2);
  const [simPermId, setSimPermId] = useState<number>(8);

  useEffect(() => {
    if (users.length > 0 && !users.some((u) => u.id === simUserId)) {
      setSimUserId(users[0].id);
    }
  }, [users, simUserId]);

  useEffect(() => {
    if (permissions.length > 0 && !permissions.some((p) => p.id === simPermId)) {
      setSimPermId(permissions[0].id);
    }
  }, [permissions, simPermId]);

  const simUser = useMemo(
    () => users.find((u) => u.id === simUserId) ?? users[0] ?? null,
    [users, simUserId],
  );
  const simPerm = useMemo(
    () => permissions.find((p) => p.id === simPermId) ?? permissions[0] ?? null,
    [permissions, simPermId],
  );

  const simUserRoles = useMemo(() => {
    if (!simUser) return [];
    return simUser.roleInfo
      .map((ur) => roles.find((r) => r.id === ur.id))
      .filter((r): r is RoleResponseDTO => Boolean(r));
  }, [simUser, roles]);

  const grantingRoles = useMemo(() => {
    if (!simPerm) return [];
    return simUserRoles.filter((role) =>
      role.permissions.some(
        (p) =>
          p.id === simPerm.id ||
          (p.apiPath === simPerm.apiPath &&
            p.method.toUpperCase() === simPerm.method.toUpperCase()),
      ),
    );
  }, [simUserRoles, simPerm]);

  const simAllowed = grantingRoles.length > 0;
  const targetRoleId = grantingRoles[0]?.id ?? simUserRoles[0]?.id ?? roles[0]?.id ?? 1;

  const quickScenarios = useMemo(() => {
    const items: Array<{ label: string; userId: number; permId: number }> = [];
    const adminUser = users.find((u) =>
      u.roleInfo.some((r) => r.name.toUpperCase() === 'SUPER_ADMIN'),
    );
    const managerUser = users.find((u) =>
      u.roleInfo.some((r) => r.name.toUpperCase() === 'HR_MANAGER'),
    );
    const employeeUser = users.find((u) =>
      u.roleInfo.some((r) => r.name.toUpperCase() === 'EMPLOYEE'),
    );
    const deleteUserPerm = permissions.find(
      (p) => p.method.toUpperCase() === 'DELETE' && p.apiPath.includes('/users'),
    );
    const getUsersPerm = permissions.find(
      (p) => p.method.toUpperCase() === 'GET' && p.apiPath === '/api/v1/users',
    );

    if (managerUser && deleteUserPerm) {
      items.push({
        label: 'HR_MANAGER · DELETE /users',
        userId: managerUser.id,
        permId: deleteUserPerm.id,
      });
    }
    if (adminUser && deleteUserPerm) {
      items.push({
        label: 'SUPER_ADMIN · DELETE /users',
        userId: adminUser.id,
        permId: deleteUserPerm.id,
      });
    }
    if (employeeUser && getUsersPerm) {
      items.push({
        label: 'EMPLOYEE · GET /users',
        userId: employeeUser.id,
        permId: getUsersPerm.id,
      });
    }
    return items;
  }, [users, permissions]);

  return (
    <section className="color-block bg-block-navy p-6 lg:col-span-6 flex flex-col space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Mô phỏng kiểm tra quyền RBAC
          </h2>
          <span className="font-mono text-xs uppercase tracking-wider px-3 py-2 badge-lilac whitespace-nowrap shrink-0">
            Live Check
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          Kiểm tra nhân sự có được gọi endpoint mục tiêu dựa trên vai trò và ma trận quyền hiện
          tại hay không.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="sim-user"
            className="block text-xs font-mono uppercase tracking-wider mb-1.5"
            style={{ color: 'rgba(255, 255, 255, 0.88)' }}
          >
            Nhân sự
          </label>
          <select
            id="sim-user"
            value={simUser?.id ?? ''}
            onChange={(e) => setSimUserId(Number(e.target.value))}
            disabled={users.length === 0}
            className="input-inverse w-full px-3 py-2 text-sm"
          >
            {users.length > 0 ? (
              users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))
            ) : (
              <option value="">Chưa có nhân sự</option>
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="sim-perm"
            className="block text-xs font-mono uppercase tracking-wider mb-1.5"
            style={{ color: 'rgba(255, 255, 255, 0.88)' }}
          >
            Endpoint
          </label>
          <select
            id="sim-perm"
            value={simPerm?.id ?? ''}
            onChange={(e) => setSimPermId(Number(e.target.value))}
            disabled={permissions.length === 0}
            className="input-inverse w-full px-3 py-2 text-sm font-mono"
          >
            {permissions.length > 0 ? (
              permissions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.method} {p.apiPath}
                </option>
              ))
            ) : (
              <option value="">Chưa có endpoint</option>
            )}
          </select>
        </div>
      </div>

      {simUser && simPerm ? (
        <div
          key={`${simUser.id}-${simPerm.id}-${simAllowed ? '200' : '403'}`}
          className="verdict-pop rounded-2xl p-4 space-y-3"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`px-3.5 py-2 font-mono text-xs font-semibold ${
                simAllowed ? 'badge-mint' : 'badge-pink'
              }`}
            >
              {simAllowed ? '200 OK · ALLOWED' : '403 Forbidden · DENIED'}
            </span>
            <span
              className="text-xs font-mono uppercase"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              module: {simPerm.module}
            </span>
          </div>

          <div className="text-xs space-y-2">
            <div className="text-white flex flex-wrap items-center gap-1.5">
              <span>
                <span className="font-semibold">{simUser.name}</span> đang giữ vai trò:
              </span>
              {simUser.roleInfo.length > 0 ? (
                simUser.roleInfo.map((role) => (
                  <span
                    key={role.id}
                    className="inline-block px-2.5 py-2 badge-cream font-mono font-medium"
                  >
                    {role.name}
                  </span>
                ))
              ) : (
                <span style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Chưa gán vai trò</span>
              )}
            </div>

            <p style={{ color: 'rgba(255, 255, 255, 0.88)' }}>
              {simAllowed
                ? `Cho phép truy cập "${simPerm.name}" (${simPerm.method} ${simPerm.apiPath}) qua vai trò ${grantingRoles
                    .map((r) => `${r.name} (khớp quyền #${simPerm.id})`)
                    .join(', ')}.`
                : simUserRoles.length > 0
                  ? `Đã kiểm tra ${simUserRoles.map((r) => r.name).join(', ')}: không vai trò nào chứa quyền "${simPerm.name}" (${simPerm.method} ${simPerm.apiPath}).`
                  : `Nhân sự chưa được gán vai trò nào nên bị từ chối truy cập ${simPerm.method} ${simPerm.apiPath}.`}
            </p>

            {simUserRoles.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {simUserRoles.map((role) => {
                  const matched = grantingRoles.some((gr) => gr.id === role.id);
                  return (
                    <div
                      key={role.id}
                      className="rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                      }}
                    >
                      <span className="font-mono text-white">
                        {role.name} ({role.permissions.length} quyền)
                      </span>
                      <span
                        className={`px-2.5 py-2 font-mono text-xs font-semibold ${
                          matched ? 'badge-mint' : 'badge-soft'
                        }`}
                      >
                        {matched ? 'Khớp quyền' : 'Không khớp'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {quickScenarios.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {quickScenarios.map((scenario) => {
                const isActive =
                  simUser.id === scenario.userId && simPerm.id === scenario.permId;
                return (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => {
                      setSimUserId(scenario.userId);
                      setSimPermId(scenario.permId);
                    }}
                    className={`px-3 py-2 text-xs font-mono rounded-[50px] transition-colors focus-ring cursor-pointer ${
                      isActive
                        ? 'bg-canvas text-ink font-semibold'
                        : 'text-white border border-white/25 hover:bg-white/10'
                    }`}
                  >
                    {scenario.label}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="pt-3 flex flex-wrap items-center gap-2.5"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.18)' }}
          >
            <button
              type="button"
              onClick={() => onInspectUser(simUser.email)}
              className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              Xem hồ sơ nhân sự
            </button>
            {/* Single-shot Figma Magenta pill CTA with #000000 text for WCAG contrast */}
            <button
              type="button"
              onClick={() => onOpenRoleMatrix(targetRoleId)}
              style={{ color: '#000000' }}
              className="btn-magenta px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              Mở ma trận RBAC
            </button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 text-xs text-white"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
            border: '1px solid rgba(255, 255, 255, 0.20)',
          }}
        >
          Cần ít nhất 1 nhân sự và 1 quyền hạn API để mô phỏng kiểm tra quyền RBAC.
        </div>
      )}
    </section>
  );
}
