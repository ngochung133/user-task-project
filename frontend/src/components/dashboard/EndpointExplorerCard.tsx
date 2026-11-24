import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  HTTP_METHODS,
  type PermissionFilterPreset,
  type PermissionResponseDTO,
  type RoleResponseDTO,
} from '../../types/hr';
import { collectPermissionModules, normalizeModuleName } from '../../utils/format';
import { MethodBadge } from '../ui/Badges';

type GroupTab = 'module' | 'method';

export interface EndpointExplorerCardProps {
  permissions: PermissionResponseDTO[];
  roles: RoleResponseDTO[];
  onDrillToPermissions: (preset: PermissionFilterPreset) => void;
}

export function EndpointExplorerCard({
  permissions,
  roles,
  onDrillToPermissions,
}: EndpointExplorerCardProps) {
  const [groupTab, setGroupTab] = useState<GroupTab>('module');
  const [moduleFilter, setModuleFilter] = useState<string>('USER');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [inspectedId, setInspectedId] = useState<number | null>(null);

  const availableModules = useMemo(
    () => collectPermissionModules(permissions, [moduleFilter]),
    [permissions, moduleFilter],
  );

  const availableMethods = useMemo(() => {
    const seen = new Set<string>(HTTP_METHODS);
    const dynamic: string[] = [];
    permissions.forEach((p) => {
      const m = String(p.method ?? '').trim().toUpperCase();
      if (m && !seen.has(m)) {
        seen.add(m);
        dynamic.push(m);
      }
    });
    dynamic.sort((a, b) => a.localeCompare(b));
    return [...HTTP_METHODS, ...dynamic];
  }, [permissions]);

  const barGroups = useMemo(() => {
    if (groupTab === 'method') {
      return availableMethods.map((m) => ({
        key: m,
        count: permissions.filter((p) => String(p.method ?? '').trim().toUpperCase() === m).length,
      }));
    }
    return availableModules.map((m) => ({
      key: m,
      count: permissions.filter((p) => normalizeModuleName(p.module) === m).length,
    }));
  }, [groupTab, permissions, availableModules, availableMethods]);

  const maxGroupCount = Math.max(1, ...barGroups.map((g) => g.count));

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (moduleFilter && normalizeModuleName(p.module) !== moduleFilter) return false;
      if (methodFilter && String(p.method ?? '').trim().toUpperCase() !== methodFilter) {
        return false;
      }
      return true;
    });
  }, [permissions, moduleFilter, methodFilter]);

  const inspectedPermission = useMemo(() => {
    if (!filteredPermissions.length) return null;
    return (
      filteredPermissions.find((p) => p.id === inspectedId) ?? filteredPermissions[0] ?? null
    );
  }, [filteredPermissions, inspectedId]);

  const grantingRoles = useMemo(() => {
    if (!inspectedPermission) return [];
    return roles.filter((r) =>
      r.permissions.some((rp) => rp.id === inspectedPermission.id),
    );
  }, [inspectedPermission, roles]);

  const handleBarSelect = (key: string) => {
    if (groupTab === 'module') {
      setModuleFilter((prev) => (prev === key ? '' : key));
    } else {
      setMethodFilter((prev) => (prev === key ? '' : key));
    }
  };

  const handleSwitchTab = (nextTab: GroupTab) => {
    setGroupTab(nextTab);
    if (nextTab === 'module' && !moduleFilter) {
      setModuleFilter('USER');
    } else if (nextTab === 'method' && !methodFilter) {
      setMethodFilter('GET');
    }
  };

  const activeGroupKey = groupTab === 'module' ? moduleFilter : methodFilter;
  const hasFilters = Boolean(moduleFilter || methodFilter);

  return (
    <section className="card-hairline p-6 lg:col-span-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Phân tích quyền hạn API
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Lọc theo Module / Method, kiểm tra hợp đồng endpoint và mở sang bảng Quyền hạn.
          </p>
        </div>

        <div
          className="inline-flex rounded-[50px] border border-hairline bg-canvas p-2 gap-1 self-start sm:self-auto shrink-0"
          role="tablist"
          aria-label="Nhóm thống kê quyền hạn API"
        >
          <button
            type="button"
            role="tab"
            aria-selected={groupTab === 'module'}
            onClick={() => handleSwitchTab('module')}
            className={`px-3.5 py-2 text-xs focus-ring cursor-pointer ${
              groupTab === 'module' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            Theo Module
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={groupTab === 'method'}
            onClick={() => handleSwitchTab('method')}
            className={`px-3.5 py-2 text-xs focus-ring cursor-pointer ${
              groupTab === 'method' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            Theo Method
          </button>
        </div>
      </div>

      {/* Horizontal GPU Bars */}
      <div className="space-y-2">
        {barGroups.map((g, idx) => {
          const isSelected = g.key === activeGroupKey;
          const scaleX = g.count === 0 ? 0 : Math.max(0.08, g.count / maxGroupCount);

          return (
            <button
              key={g.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleBarSelect(g.key)}
              className={`w-full text-left rounded-xl p-3 border transition-colors focus-ring cursor-pointer ${
                isSelected ? 'row-selected' : 'row-idle'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono font-semibold text-ink">{g.key}</span>
                <span className="font-mono tabular-nums text-ink-soft">{g.count} endpoint</span>
              </div>
              <div className="h-2 rounded-full bg-soft overflow-hidden border border-hairline">
                <div
                  className="bar-fill-x bar-animate-x rounded-full bg-inverse"
                  style={
                    {
                      '--bar-scale': scaleX.toFixed(3),
                      '--stagger': `${Math.min(idx * 30, 120)}ms`,
                    } as CSSProperties
                  }
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Combined HrModule + HttpMethod Cross-Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="ee-module-select"
            className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1"
          >
            Module
          </label>
          <select
            id="ee-module-select"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="input-field w-full px-3 py-2 text-xs font-mono"
          >
            <option value="">Tất cả Module</option>
            {availableModules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ee-method-select"
            className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1"
          >
            HTTP Method
          </label>
          <select
            id="ee-method-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="input-field w-full px-3 py-2 text-xs font-mono"
          >
            <option value="">Tất cả Method</option>
            {availableMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtered Endpoints List + Contract Inspector */}
      <div className="tile-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink">
            Endpoint khớp bộ lọc ({filteredPermissions.length})
          </span>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setModuleFilter('');
                  setMethodFilter('');
                }}
                className="btn-secondary px-3 py-2 text-xs focus-ring cursor-pointer"
              >
                Tất cả
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onDrillToPermissions({
                  module: moduleFilter,
                  method: methodFilter,
                })
              }
              className="btn-secondary px-3.5 py-2 text-xs focus-ring cursor-pointer"
            >
              Mở bảng Quyền hạn
            </button>
          </div>
        </div>

        {filteredPermissions.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredPermissions.map((perm) => {
              const isInspected = inspectedPermission?.id === perm.id;
              return (
                <button
                  key={perm.id}
                  type="button"
                  onClick={() => setInspectedId(perm.id)}
                  className={`w-full flex items-center justify-between gap-2 text-xs p-2 rounded-lg border text-left transition-colors focus-ring cursor-pointer ${
                    isInspected
                      ? 'bg-canvas border-primary'
                      : 'bg-canvas/70 border-hairline hover:bg-canvas'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MethodBadge method={perm.method} />
                    <span className="font-mono text-ink truncate">{perm.apiPath}</span>
                  </span>
                  <span className="text-ink-soft truncate max-w-[150px] shrink-0">
                    {perm.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-ink-soft py-2">
            Chưa có endpoint nào khớp bộ lọc {moduleFilter || 'tất cả module'}{' '}
            {methodFilter ? `· ${methodFilter}` : ''}.
          </p>
        )}

        {inspectedPermission && (
          <div
            key={inspectedPermission.id}
            className="inspector-reveal rounded-xl bg-canvas border border-hairline p-3 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MethodBadge method={inspectedPermission.method} />
                <span className="font-mono text-xs font-semibold text-ink truncate">
                  {inspectedPermission.apiPath}
                </span>
              </div>
              <span className="px-2.5 py-2 font-mono text-xs badge-soft">
                #{inspectedPermission.id} · {normalizeModuleName(inspectedPermission.module)}
              </span>
            </div>
            <p className="text-xs text-ink">{inspectedPermission.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
              <span>Vai trò đang cấp:</span>
              {grantingRoles.length > 0 ? (
                grantingRoles.map((role) => (
                  <span key={role.id} className="px-2.5 py-2 font-mono text-xs badge-cream">
                    {role.name}
                  </span>
                ))
              ) : (
                <span className="font-mono text-xs">Chưa gán vai trò</span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
