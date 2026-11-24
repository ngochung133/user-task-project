import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CompanyResponseDTO, RoleResponseDTO, UserResponseDTO } from '../../types/hr';

export interface CompanyHeadcountBlockProps {
  companies: CompanyResponseDTO[];
  roleFilteredUsers: UserResponseDTO[];
  roles: RoleResponseDTO[];
  selectedCompanyId: string;
  onToggleCompany: (companyId: number) => void;
  onManageCompanies: () => void;
}

export function CompanyHeadcountBlock({
  companies,
  roleFilteredUsers,
  roles,
  selectedCompanyId,
  onToggleCompany,
  onManageCompanies,
}: CompanyHeadcountBlockProps) {
  const [hoveredCompanyId, setHoveredCompanyId] = useState<number | null>(null);

  const companyStats = companies.map((company) => {
    const members = roleFilteredUsers.filter((u) => u.companyInfo?.id === company.id);
    return { company, count: members.length, members };
  });

  const maxCount = Math.max(1, ...companyStats.map((s) => s.count));
  const totalRoleFiltered = Math.max(1, roleFilteredUsers.length);
  const unassignedCount = roleFilteredUsers.filter((u) => u.companyInfo === null).length;

  const activeDetailId =
    hoveredCompanyId ?? (selectedCompanyId ? Number(selectedCompanyId) : null);
  const activeStat = activeDetailId
    ? companyStats.find((s) => s.company.id === activeDetailId) ?? null
    : null;

  const activeRoleSummary = activeStat
    ? roles
        .map((r) => ({
          name: r.name,
          count: activeStat.members.filter((u) => u.roleInfo.some((ur) => ur.id === r.id)).length,
        }))
        .filter((x) => x.count > 0)
        .map((x) => `${x.count} ${x.name}`)
        .join(', ') || 'Chưa có nhân sự trong bộ lọc'
    : '';

  return (
    <section className="color-block bg-block-lime p-6 lg:col-span-7 flex flex-col justify-between space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Phân bổ nhân sự theo Công ty
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Nhấn vào một thanh công ty để lọc chéo toàn dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={onManageCompanies}
          className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer self-start sm:self-auto shrink-0"
        >
          Quản lý công ty
        </button>
      </div>

      {companyStats.length > 0 ? (
        <div className="space-y-2.5">
          {companyStats.map((item, idx) => {
            const isSelected = selectedCompanyId === String(item.company.id);
            const pct = Math.round((item.count / totalRoleFiltered) * 100);
            const scaleX = item.count === 0 ? 0 : Math.max(0.08, item.count / maxCount);

            return (
              <button
                key={item.company.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleCompany(item.company.id)}
                onMouseEnter={() => setHoveredCompanyId(item.company.id)}
                onFocus={() => setHoveredCompanyId(item.company.id)}
                onMouseLeave={() => setHoveredCompanyId(null)}
                onBlur={() => setHoveredCompanyId(null)}
                className={`w-full text-left rounded-xl p-3 border transition-colors focus-ring cursor-pointer ${
                  isSelected
                    ? 'bg-inverse border-transparent'
                    : 'bg-canvas border-hairline hover:bg-soft'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold truncate">{item.company.name}</span>
                  <span className="text-xs font-mono tabular-nums shrink-0">
                    {item.count} người ({pct}%)
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'var(--fg-hairline-soft)',
                  }}
                >
                  <div
                    className="bar-fill-x bar-animate-x rounded-full"
                    style={
                      {
                        '--bar-scale': scaleX.toFixed(3),
                        '--stagger': `${Math.min(idx * 35, 140)}ms`,
                        backgroundColor: isSelected ? '#dceeb1' : '#000000',
                      } as CSSProperties
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-canvas p-4 text-xs text-ink-soft border border-hairline">
          Chưa có dữ liệu công ty để hiển thị phân bổ nhân sự.
        </div>
      )}

      <div className="rounded-xl bg-canvas p-3 text-xs text-ink border border-hairline flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          {activeStat ? (
            <>
              <span className="font-semibold">{activeStat.company.name}:</span> {activeRoleSummary}
            </>
          ) : (
            'Di chuột hoặc chọn một công ty để xem cơ cấu vai trò bên trong.'
          )}
        </span>
        {unassignedCount > 0 && (
          <span className="font-mono text-xs text-ink-soft shrink-0">
            {unassignedCount} chưa gắn công ty
          </span>
        )}
      </div>
    </section>
  );
}
