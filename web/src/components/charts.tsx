import { useEffect, useRef, useState } from 'react';
import type { CaseStatus } from '../lib/api';
import { inr } from '../lib/hooks';

/* Charts shared by the back-office dashboard and the partner dashboard. */

/* Status colours: validated as a set (CVD + contrast) in this exact order; always shown with their label. */
export const STATUS_ORDER: CaseStatus[] = ['Completed', 'In Progress', 'Pending', 'On Hold'];
export const STATUS_COLOR: Record<CaseStatus, string> = { Completed: '#1E7E39', 'In Progress': '#0A66C2', Pending: '#D97706', 'On Hold': '#B91C1C' };

export const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
export const compact = (n: number) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));
const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= v) ?? 10;
  return m * p;
};

export const Skeleton = () => <div className="adm-skel" />;

/* One horizontal 100% bar split by status, with a labelled legend underneath (identity never by colour alone). */
export function StatusStack({ counts }: { counts: Record<CaseStatus, number> }) {
  const total = STATUS_ORDER.reduce((n, k) => n + counts[k], 0);
  return (
    <div className="adm-status">
      <div className="adm-stack" role="img" aria-label={STATUS_ORDER.map((k) => `${k}: ${counts[k]}`).join(', ')}>
        {total ? STATUS_ORDER.filter((k) => counts[k]).map((k) => (
          <span key={k} style={{ flexGrow: counts[k], background: STATUS_COLOR[k] }} title={`${k}: ${counts[k]}`}></span>
        )) : <span style={{ flexGrow: 1, background: 'var(--line)' }}></span>}
      </div>
      <ul className="adm-legend">
        {STATUS_ORDER.map((k) => (
          <li key={k}>
            <span className="sw" style={{ background: STATUS_COLOR[k] }}></span>
            <span className="adm-legend-l">{k}</span>
            <b>{counts[k]}</b>
            <span className="adm-legend-p">{total ? `${Math.round((counts[k] / total) * 100)}%` : '–'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Single-series column chart: 24px columns, 4px rounded tops, hairline grid, hover tooltip. */
export function Columns({ data, color, unit = '', money = false, period = 'over 6 months', lastNote = 'so far', labelEvery = 1 }: {
  data: { label: string; value: number }[]; color: string; unit?: string; money?: boolean; period?: string; lastNote?: string; labelEvery?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // draw at the real pixel width so axis text stays 11px on phones
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(520);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 210, L = 44, R = 8, T = 14, B = 26;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const band = (W - L - R) / data.length;
  const bw = Math.min(24, band * 0.5);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const fmt = (v: number) => (money ? `₹${compact(v)}` : compact(v));
  const total = data.reduce((n, d) => n + d.value, 0);
  const last = data[data.length - 1];

  return (
    <div className="adm-chart">
      <div className="adm-chart-head">
        <b>{money ? inr(last.value) : last.value}</b>
        <span>{last.label} {lastNote} · {money ? inr(total) : `${total} ${unit}`} {period}</span>
      </div>
      <div className="adm-chart-box" ref={boxRef}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map((d) => `${d.label}: ${money ? inr(d.value) : d.value}`).join(', ')}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="adm-axis">{fmt(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = L + band * i + band / 2;
            const top = y(d.value);
            const h = H - B - top;
            const r = Math.min(4, h);
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={L + band * i} y={T} width={band} height={H - T - B} fill={hover === i ? 'rgba(10,102,194,.05)' : 'transparent'} />
                {d.value > 0 ? (
                  <path d={`M${cx - bw / 2},${H - B} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${H - B} Z`}
                    fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                ) : null}
                {(data.length - 1 - i) % labelEvery === 0 ? <text x={cx} y={H - 8} textAnchor="middle" className="adm-axis">{d.label}</text> : null}
              </g>
            );
          })}
        </svg>
        {hover !== null ? (
          <div className="adm-tip" style={{ left: `${((L + band * hover + band / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
            <b>{money ? inr(data[hover].value) : `${data[hover].value} ${unit}`}</b><span>{data[hover].label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* Ranked horizontal bars for a category breakdown: one hue, value at the bar end. */
export function Ranked({ rows, empty = 'No cases yet.' }: { rows: { key: string; name: string; count: number }[]; empty?: string }) {
  if (!rows.length) return <p className="adm-meta">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="adm-ranked">
      {rows.map((r) => (
        <li key={r.key} title={`${r.name}: ${r.count}`}>
          <span className="adm-ranked-l">{r.name}</span>
          <span className="adm-ranked-bar"><i style={{ width: `${(r.count / max) * 100}%` }}></i></span>
          <b>{r.count}</b>
        </li>
      ))}
    </ul>
  );
}

