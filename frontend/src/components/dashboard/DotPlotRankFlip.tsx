import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UserResponseDTO } from '../../types/hr';
import { prefersReducedMotion } from '../../utils/format';

type DotPlotDataset = 'users' | 'modules';
type DotPlotTheme = 'verdigris' | 'navy' | 'light';

interface DotRow {
  name: string;
  val: number;
  cur: number;
  from: number;
  to: number;
  y: number;
  fy: number;
  ty: number;
}

interface ThemePalette {
  bg: string;
  acc: string;
  grid: string;
  grid0: string;
  base: string;
  halo: string;
  dim: string;
  val: string;
  ink: string;
}

interface SimEngine {
  newRound: (snapImmediate?: boolean) => void;
  syncThemeAndDraw: () => void;
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

const FALLBACK_USER_LABELS = [
  'NORTH',
  'EMBER',
  'CASCADE',
  'VERMILLION',
  'SOLSTICE',
  'HALCYON',
  'MERIDIAN',
] as const;

const MODULE_LABELS = [
  'USER',
  'COMPANY',
  'ROLE',
  'PERMISSION',
  'AUTH',
  'FILES',
  'DASHBOARD',
] as const;

const SEED_VALUES = [0.86, 0.74, 0.68, 0.59, 0.47, 0.38, 0.25] as const;

function shortUserLabel(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const picked = parts.length >= 2 ? parts.slice(-2).join(' ') : parts[0] || 'USER';
  return picked
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase();
}

function readStagePalette(stage: HTMLElement): ThemePalette {
  const cs = getComputedStyle(stage);
  return {
    bg: cs.getPropertyValue('--dprf-bg').trim() || '#0a1f24',
    acc: cs.getPropertyValue('--dprf-acc').trim() || '#5aa597',
    grid: cs.getPropertyValue('--dprf-grid').trim() || 'rgba(90,165,151,0.14)',
    grid0: cs.getPropertyValue('--dprf-grid0').trim() || 'rgba(90,165,151,0.26)',
    base: cs.getPropertyValue('--dprf-base').trim() || 'rgba(90,165,151,0.18)',
    halo: cs.getPropertyValue('--dprf-halo').trim() || 'rgba(90,165,151,0.20)',
    dim: cs.getPropertyValue('--dprf-dim').trim() || 'rgba(207,233,238,0.80)',
    val: cs.getPropertyValue('--dprf-val').trim() || 'rgba(207,233,238,0.70)',
    ink: cs.getPropertyValue('--dprf-ink').trim() || '#e6f7fa',
  };
}

export interface DotPlotRankFlipProps {
  users: UserResponseDTO[];
}

export function DotPlotRankFlip({ users }: DotPlotRankFlipProps) {
  const [dataset, setDataset] = useState<DotPlotDataset>('users');
  const [theme, setTheme] = useState<DotPlotTheme>('verdigris');
  const [paused, setPaused] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SimEngine | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const labels = useMemo<string[]>(() => {
    if (dataset === 'modules') {
      return [...MODULE_LABELS];
    }
    const next = users.slice(0, 7).map((u) => shortUserLabel(u.name));
    while (next.length < 7) {
      next.push(FALLBACK_USER_LABELS[next.length]);
    }
    return next;
  }, [dataset, users]);

  const serializedLabels = useMemo(() => JSON.stringify(labels), [labels]);

  useEffect(() => {
    const activeLabels = JSON.parse(serializedLabels) as string[];
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx = context;

    let reduce = prefersReducedMotion();
    let palette = readStagePalette(stage);

    const rows: DotRow[] = activeLabels.map((name, i) => {
      const initial = SEED_VALUES[i] ?? 0.14 + Math.random() * 0.74;
      return {
        name,
        val: initial,
        cur: initial,
        from: initial,
        to: initial,
        y: 0,
        fy: 0,
        ty: 0,
      };
    });

    const N = rows.length;
    let order = rows.map((_, i) => i).sort((a, b) => rows[b].val - rows[a].val);

    let W = 600;
    let H = 290;
    let L = 128;
    let R = 560;
    let top = 28;
    let rowH = 36;
    let dotR = 6;

    const clampPx = (a: number, b: number) => {
      const s = Math.min(W, H) / 420;
      return a + (b - a) * Math.max(0, Math.min(1, s));
    };

    const getChartFont = () => {
      const fontSize = Math.max(12, clampPx(12, 12.5)).toFixed(1);
      return `600 ${fontSize}px "figmaMono", "SF Mono", ui-monospace, Menlo, monospace`;
    };

    const fitCanvasLabel = (text: string, maxWidth: number): string => {
      if (maxWidth <= 0) return '';
      if (ctx.measureText(text).width <= maxWidth) return text;
      const ellipsis = '…';
      if (ctx.measureText(ellipsis).width > maxWidth) return '';
      let lo = 0;
      let hi = text.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const candidate = text.slice(0, mid).trimEnd() + ellipsis;
        if (ctx.measureText(candidate).width <= maxWidth) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      return lo > 0 ? text.slice(0, lo).trimEnd() + ellipsis : ellipsis;
    };

    const applyRanks = () => {
      order.forEach((idx, rank) => {
        rows[idx].ty = top + rank * rowH;
      });
    };

    let chartPad = 16;
    let labelGap = 12;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(260, stage.clientWidth || canvas.clientWidth || 600);
      H = Math.max(220, stage.clientHeight || canvas.clientHeight || 290);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      chartPad = W < 420 ? Math.max(12, Math.min(W, H) * 0.05) : Math.max(16, Math.min(W, H) * 0.07);
      labelGap = clampPx(10, 14);
      ctx.font = getChartFont();
      const maxMeasuredLabel = rows.reduce(
        (maxW, r) => Math.max(maxW, ctx.measureText(r.name).width),
        0,
      );
      const rightValSpace = clampPx(24, 34);
      const minTrackWidth = Math.max(110, W * 0.36);
      const maxBudgetLabW = Math.max(96, W - chartPad * 2 - rightValSpace - minTrackWidth);
      const desiredLabW = Math.max(96, Math.ceil(maxMeasuredLabel + labelGap));
      const labW = Math.min(maxBudgetLabW, Math.max(clampPx(96, 144), desiredLabW));

      L = chartPad + labW;
      R = W - chartPad - rightValSpace;
      rowH = (H - chartPad * 1.9) / N;
      top = chartPad * 0.95 + rowH * 0.5;
      dotR = Math.max(4, Math.min(rowH * 0.22, clampPx(5, 8)));

      applyRanks();
      rows.forEach((r) => {
        r.y = r.ty;
        r.fy = r.ty;
      });
    };

    sizeCanvas();

    let t = 0;
    const dur = 92;
    let phase: 0 | 1 = 1;
    const hold = 46;
    let raf = 0;
    let destroyed = false;

    const ease = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    const draw = () => {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.font = getChartFont();
      ctx.textBaseline = 'middle';
      const maxLabelWidth = Math.max(32, L - labelGap - chartPad);

      for (let g = 0; g <= 4; g += 1) {
        const gx = L + (R - L) * (g / 4);
        ctx.strokeStyle = g === 0 ? palette.grid0 : palette.grid;
        ctx.beginPath();
        ctx.moveTo(gx, top - rowH * 0.52);
        ctx.lineTo(gx, top + (N - 1) * rowH + rowH * 0.52);
        ctx.stroke();
      }

      rows.forEach((r) => {
        const x = L + (R - L) * r.cur;
        const y = r.y;

        ctx.strokeStyle = palette.base;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(L, y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = palette.dim;
        ctx.textAlign = 'right';
        ctx.fillText(fitCanvasLabel(r.name, maxLabelWidth), L - labelGap, y);

        ctx.fillStyle = palette.val;
        ctx.textAlign = 'left';
        ctx.fillText(String(Math.round(r.cur * 100)), Math.min(x + dotR + 7, R + 4), y);

        ctx.fillStyle = palette.halo;
        ctx.beginPath();
        ctx.arc(x, y, dotR + 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.acc;
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.ink;
        ctx.beginPath();
        ctx.arc(x - dotR * 0.28, y - dotR * 0.28, dotR * 0.34, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const stopLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const frame = () => {
      if (destroyed) return;
      const isPaused = pausedRef.current;

      if (!reduce) {
        if (phase === 0) {
          t += 1;
          const p = Math.min(1, t / dur);
          const e = ease(p);
          rows.forEach((r) => {
            r.val = r.from + (r.to - r.from) * e;
            r.cur = r.val;
            r.y = r.fy + (r.ty - r.fy) * e;
          });
          if (p >= 1) {
            phase = 1;
            t = 0;
          }
        } else if (!isPaused) {
          t += 1;
          if (t > hold) {
            newRound(false);
            return;
          }
        }
      }

      draw();

      if (!reduce && (!isPaused || phase === 0) && !document.hidden) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
      }
    };

    const startLoop = () => {
      if (!raf && !reduce && !destroyed && !document.hidden) {
        raf = requestAnimationFrame(frame);
      }
    };

    const newRound = (snapImmediate = reduce) => {
      rows.forEach((r) => {
        r.from = r.val;
        const delta = (Math.random() - 0.5) * 0.52;
        r.to = Math.max(0.08, Math.min(0.96, r.val + delta));
      });
      order = rows.map((_, i) => i).sort((a, b) => rows[b].to - rows[a].to);
      order.forEach((idx, rank) => {
        rows[idx].fy = rows[idx].y;
        rows[idx].ty = top + rank * rowH;
      });

      if (snapImmediate) {
        rows.forEach((r) => {
          r.val = r.to;
          r.cur = r.to;
          r.y = r.ty;
          r.fy = r.ty;
        });
        t = 0;
        phase = 1;
        stopLoop();
        draw();
      } else {
        t = 0;
        phase = 0;
        startLoop();
      }
    };

    const onResize = () => {
      sizeCanvas();
      draw();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (!pausedRef.current) {
        startLoop();
      }
    };

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const onMotionChange = () => {
      reduce = prefersReducedMotion();
      if (reduce) {
        stopLoop();
        rows.forEach((r) => {
          r.val = r.to;
          r.cur = r.to;
          r.y = r.ty;
          r.fy = r.ty;
        });
        phase = 1;
        t = 0;
        draw();
      } else if (!pausedRef.current) {
        startLoop();
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            onResize();
          })
        : null;

    if (resizeObserver) {
      resizeObserver.observe(stage);
    }

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    mediaQuery?.addEventListener?.('change', onMotionChange);

    engineRef.current = {
      newRound: (snap?: boolean) => newRound(snap ?? reduce),
      syncThemeAndDraw: () => {
        palette = readStagePalette(stage);
        draw();
      },
      setPaused: (nextPaused: boolean) => {
        if (nextPaused) {
          if (phase === 1) stopLoop();
        } else {
          startLoop();
        }
      },
      destroy: () => {
        destroyed = true;
        stopLoop();
      },
    };

    draw();
    if (!reduce && !pausedRef.current) {
      startLoop();
    }

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mediaQuery?.removeEventListener?.('change', onMotionChange);
    };
  }, [serializedLabels]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setAttribute('data-theme', theme);
    engineRef.current?.syncThemeAndDraw();
  }, [theme]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  const handleNewRound = useCallback(() => {
    engineRef.current?.newRound();
  }, []);

  return (
    <section className="card-hairline p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Dot Plot Rank Flip — Xếp hạng biến động
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Biểu đồ điểm trượt ngang và tự động đảo thứ hạng theo từng vòng (nhấn trực tiếp vào
            biểu đồ hoặc nút Đổi vòng).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-[50px] border border-hairline bg-canvas p-2 gap-1"
            role="group"
            aria-label="Chọn tập dữ liệu Dot Plot"
          >
            <button
              type="button"
              onClick={() => setDataset('users')}
              className={`px-3.5 py-2 text-xs focus-ring cursor-pointer ${
                dataset === 'users' ? 'tab-pill-selected' : 'tab-pill-default'
              }`}
            >
              Nhân sự (7)
            </button>
            <button
              type="button"
              onClick={() => setDataset('modules')}
              className={`px-3.5 py-2 text-xs focus-ring cursor-pointer ${
                dataset === 'modules' ? 'tab-pill-selected' : 'tab-pill-default'
              }`}
            >
              Module API (7)
            </button>
          </div>

          <div
            className="inline-flex rounded-[50px] border border-hairline bg-canvas p-2 gap-1"
            role="group"
            aria-label="Chọn bảng màu Dot Plot"
          >
            {(
              [
                { id: 'verdigris', label: 'Verdigris' },
                { id: 'navy', label: 'Navy' },
                { id: 'light', label: 'Sáng' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`px-3 py-2 text-xs focus-ring cursor-pointer ${
                  theme === opt.id ? 'tab-pill-selected' : 'tab-pill-default'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNewRound}
            className="btn-primary px-4 py-2 text-xs focus-ring cursor-pointer"
          >
            Đổi vòng
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
          >
            {paused ? 'Tiếp tục' : 'Tạm dừng'}
          </button>
        </div>
      </div>

      <div ref={stageRef} className="dprf-stage" data-theme={theme}>
        <canvas
          ref={canvasRef}
          onClick={handleNewRound}
          className="block w-full h-full cursor-pointer"
          aria-label="Biểu đồ Dot Plot Rank Flip xếp hạng theo vòng"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span className="font-mono uppercase tracking-wider">
          Dot Plot Rank Flip · DPR Canvas · Cubic Easing
        </span>
        <span>
          Dữ liệu mô phỏng chỉ số 0–100; tự tạm dừng khi chuyển tab hoặc bật Reduced Motion.
        </span>
      </div>
    </section>
  );
}
