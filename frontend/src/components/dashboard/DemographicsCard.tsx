import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { GenderEnum, UserFilterPreset, UserResponseDTO } from '../../types/hr';
import { prefersReducedMotion } from '../../utils/format';

type DemographicsTab = 'gender' | 'age';

interface GenderMetaItem {
  key: GenderEnum;
  label: string;
  color: string;
  count: number;
}

interface AgeBracket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface DemographicsCardProps {
  filteredUsers: UserResponseDTO[];
  onDrillToUsers: (preset: UserFilterPreset) => void;
}

export function DemographicsCard({ filteredUsers, onDrillToUsers }: DemographicsCardProps) {
  const [tab, setTab] = useState<DemographicsTab>('gender');
  const [hoveredGender, setHoveredGender] = useState<GenderEnum | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderEnum | null>(null);
  const [hoveredBracketLabel, setHoveredBracketLabel] = useState<string | null>(null);

  const reduceMotion = prefersReducedMotion();
  const activeGender = hoveredGender ?? selectedGender;

  const genderMeta: GenderMetaItem[] = [
    {
      key: 'MALE',
      label: 'Nam (MALE)',
      color: '#000000',
      count: filteredUsers.filter((u) => u.gender === 'MALE').length,
    },
    {
      key: 'FEMALE',
      label: 'Nữ (FEMALE)',
      color: '#c5b0f4',
      count: filteredUsers.filter((u) => u.gender === 'FEMALE').length,
    },
    {
      key: 'OTHER',
      label: 'Khác (OTHER)',
      color: '#1ea64a',
      count: filteredUsers.filter((u) => u.gender === 'OTHER').length,
    },
  ];

  const totalGenderKnown = genderMeta.reduce((acc, item) => acc + item.count, 0);
  const unknownGenderCount = filteredUsers.length - totalGenderKnown;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  const donutSegments = genderMeta.map((seg) => {
    const ratio = totalGenderKnown > 0 ? seg.count / totalGenderKnown : 0;
    const dash = ratio * circumference;
    const pct = totalGenderKnown > 0 ? Math.round(ratio * 100) : 0;
    const item = { ...seg, dash, offset: -offsetAcc, pct };
    offsetAcc += dash;
    return item;
  });

  const activeSegment = activeGender
    ? donutSegments.find((seg) => seg.key === activeGender) ?? null
    : null;
  const selectedSegment = selectedGender
    ? donutSegments.find((seg) => seg.key === selectedGender) ?? null
    : null;

  const ageBrackets: AgeBracket[] = [
    {
      label: '< 26',
      min: 1,
      max: 25,
      count: filteredUsers.filter((u) => u.age !== null && u.age < 26).length,
    },
    {
      label: '26–30',
      min: 26,
      max: 30,
      count: filteredUsers.filter((u) => u.age !== null && u.age >= 26 && u.age <= 30).length,
    },
    {
      label: '31–35',
      min: 31,
      max: 35,
      count: filteredUsers.filter((u) => u.age !== null && u.age >= 31 && u.age <= 35).length,
    },
    {
      label: '> 35',
      min: 36,
      max: 150,
      count: filteredUsers.filter((u) => u.age !== null && u.age >= 36).length,
    },
  ];
  const maxAgeCount = Math.max(1, ...ageBrackets.map((b) => b.count));
  const unknownAgeCount = filteredUsers.filter((u) => u.age === null).length;

  const toggleGenderSelection = (gender: GenderEnum) => {
    setSelectedGender((prev) => (prev === gender ? null : gender));
  };

  const handleSegmentKeyDown = (e: KeyboardEvent<SVGCircleElement>, gender: GenderEnum) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleGenderSelection(gender);
    }
  };

  return (
    <section className="card-hairline p-6 lg:col-span-5 flex flex-col justify-between space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Cơ cấu nhân sự</h2>
          <p className="text-xs text-ink-soft mt-1">
            {tab === 'gender'
              ? 'Di chuột hoặc nhấn phân đoạn để nổi bật, rồi lọc sang Nhân sự.'
              : 'Nhấn vào cột độ tuổi để mở danh sách Nhân sự theo minAge / maxAge.'}
          </p>
        </div>

        <div
          className="inline-flex rounded-[50px] border border-hairline bg-canvas p-2 gap-1 shrink-0"
          role="tablist"
          aria-label="Chế độ biểu đồ cơ cấu nhân sự"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'gender'}
            onClick={() => setTab('gender')}
            className={`px-3.5 py-2 text-xs focus-ring cursor-pointer ${
              tab === 'gender' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            Giới tính
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'age'}
            onClick={() => setTab('age')}
            className={`px-3.5 py-2 text-xs focus-ring cursor-pointer ${
              tab === 'age' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            Độ tuổi
          </button>
        </div>
      </div>

      {tab === 'gender' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 160 160"
                data-active={activeGender ?? undefined}
                className="donut-svg w-32 h-32 -rotate-90"
                role="img"
                aria-label="Biểu đồ cơ cấu giới tính nhân sự"
              >
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="var(--fg-hairline-soft)"
                  strokeWidth="15"
                />
                {donutSegments.map((seg) =>
                  seg.count > 0 ? (
                    <circle
                      key={seg.key}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="15"
                      strokeDasharray={`${seg.dash.toFixed(2)} ${circumference.toFixed(2)}`}
                      strokeDashoffset={seg.offset.toFixed(2)}
                      data-seg={seg.key}
                      className="donut-seg cursor-pointer focus:outline-none"
                      tabIndex={0}
                      aria-label={`${seg.label}: ${seg.count} nhân sự (${seg.pct}%)`}
                      onMouseEnter={() => setHoveredGender(seg.key)}
                      onFocus={() => setHoveredGender(seg.key)}
                      onMouseLeave={() => setHoveredGender(null)}
                      onBlur={() => setHoveredGender(null)}
                      onClick={() => toggleGenderSelection(seg.key)}
                      onKeyDown={(e) => handleSegmentKeyDown(e, seg.key)}
                    />
                  ) : null,
                )}
              </svg>
              <div
                className="donut-center-pulse absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2"
                style={{
                  transform: !reduceMotion && activeSegment ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <span className="text-xl font-semibold tabular-nums text-ink">
                  {activeSegment ? activeSegment.count : filteredUsers.length}
                </span>
                <span className="text-xs text-ink-soft truncate max-w-[92px]">
                  {activeSegment ? `${activeSegment.key} (${activeSegment.pct}%)` : 'Nhân sự'}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full min-w-0 space-y-2">
              {donutSegments.map((seg) => {
                const isPinned = selectedGender === seg.key;
                return (
                  <button
                    key={seg.key}
                    type="button"
                    aria-pressed={isPinned}
                    onClick={() => toggleGenderSelection(seg.key)}
                    onMouseEnter={() => setHoveredGender(seg.key)}
                    onFocus={() => setHoveredGender(seg.key)}
                    onMouseLeave={() => setHoveredGender(null)}
                    onBlur={() => setHoveredGender(null)}
                    className={`w-full flex items-center justify-between gap-2 rounded-[50px] px-3 py-2 border transition-colors focus-ring cursor-pointer ${
                      isPinned
                        ? 'row-selected'
                        : 'border-hairline bg-canvas hover:bg-soft'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs font-medium text-ink whitespace-nowrap">
                        {seg.label}
                      </span>
                    </span>
                    <span className="text-xs font-mono font-semibold tabular-nums text-ink shrink-0">
                      {seg.count} ({seg.pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSegment ? (
            <div className="tile-soft inspector-reveal flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-ink">
                Đang chọn <span className="font-semibold">{selectedSegment.label}</span> ·{' '}
                <span className="font-mono tabular-nums">
                  {selectedSegment.count} nhân sự ({selectedSegment.pct}%)
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGender(null)}
                  className="btn-secondary px-3 py-2 text-xs focus-ring cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={() => onDrillToUsers({ gender: selectedSegment.key })}
                  className="btn-primary px-3.5 py-2 text-xs focus-ring cursor-pointer"
                >
                  Xem trong Nhân sự
                </button>
              </div>
            </div>
          ) : (
            unknownGenderCount > 0 && (
              <p className="text-xs text-ink-soft">
                Có {unknownGenderCount} nhân sự chưa cập nhật trường giới tính.
              </p>
            )
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 items-end h-40 pt-6 px-2 border-b border-hairline">
            {ageBrackets.map((b, idx) => {
              const scaleY = b.count === 0 ? 0.06 : Math.max(0.16, b.count / maxAgeCount);
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => onDrillToUsers({ minAge: b.min, maxAge: b.max })}
                  onMouseEnter={() => setHoveredBracketLabel(b.label)}
                  onFocus={() => setHoveredBracketLabel(b.label)}
                  onMouseLeave={() => setHoveredBracketLabel(null)}
                  onBlur={() => setHoveredBracketLabel(null)}
                  className="h-full flex flex-col items-center justify-end gap-1.5 group focus-ring rounded-md cursor-pointer p-2"
                  title={`Mở danh sách nhân sự từ ${b.min} đến ${b.max} tuổi`}
                >
                  <span className="text-xs font-mono font-semibold tabular-nums text-ink">
                    {b.count}
                  </span>
                  <span className="w-full max-w-[44px] h-24 flex items-end overflow-hidden">
                    <span
                      className="bar-fill-y bar-animate-y rounded-t-md bg-inverse group-hover:opacity-80"
                      style={
                        {
                          '--bar-scale': scaleY.toFixed(3),
                          '--stagger': `${idx * 40}ms`,
                        } as CSSProperties
                      }
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-3 px-2 text-center text-xs font-mono text-ink-soft">
            {ageBrackets.map((b) => (
              <span
                key={b.label}
                className={hoveredBracketLabel === b.label ? 'font-semibold text-ink' : ''}
              >
                {b.label}
              </span>
            ))}
          </div>

          <div className="tile-soft text-xs text-ink-soft flex flex-wrap items-center justify-between gap-2">
            <span>
              {hoveredBracketLabel
                ? `Nhóm tuổi ${hoveredBracketLabel}: nhấn cột để mở danh sách Nhân sự đã lọc.`
                : 'Nhấn vào cột tuổi để chuyển sang danh sách Nhân sự theo minAge / maxAge.'}
            </span>
            {unknownAgeCount > 0 && (
              <span className="font-mono text-xs">{unknownAgeCount} chưa có tuổi</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
