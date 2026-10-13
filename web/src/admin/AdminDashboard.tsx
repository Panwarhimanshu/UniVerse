import { useEffect, useRef, useState } from 'react';
import { Svg } from '../components/site';
import type { CaseStatus } from '../lib/api';
import { fmtTime, inr, statusClass, useApi, useInterval } from '../lib/hooks';
import { adminApi } from './api';
import type { Overview } from './api';

/* Back-office home: headline numbers, what needs attention, and how the business is moving. */

type Go = (v: string, f?: { queue?: string; partner?: string }) => void;

/* Status colours: validated as a set (CVD + contrast) in this exact order; always shown with their label. */
const STATUS_ORDER: CaseStatus[] = ['Completed', 'In Progress', 'Pending', 'On Hold'];
const STATUS_COLOR: Record<CaseStatus, string> = { Completed: '#1E7E39', 'In Progress': '#0A66C2', Pending: '#D97706', 'On Hold': '#B91C1C' };

const IC = {
  partners: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  cases: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
  students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
};

const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
const compact = (n: number) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));
const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= v) ?? 10;
  return m * p;
};

export default function AdminDashboard({ go, canUse, isMaster, name, overview }: {
  go: Go; canUse: (v: string) => boolean; isMaster: boolean; name: string; overview: Overview | null;
}) {
  const stats = useApi(adminApi.stats, []);
  useInterval(stats.reload, 60000);
  const s = stats.data;
  const o = overview;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const queue: [string, string, number | undefined, () => void][] = ([
    ['cases', 'Case messages waiting for a reply', o?.casesAwaitingReply, () => go('cases', { queue: 'awaiting' })],
    ['cases', 'Documents to review', o?.docsToReview, () => go('cases', { queue: 'review' })],
    ['messages', 'RM messages waiting for a reply', o?.rmAwaitingReply, () => go('messages')],
    ['payouts', 'Payouts to settle', o?.pendingPayouts, () => go('payouts')],
    ['agreements', 'Agreement requests', o?.openAgreementRequests, () => go('agreements')],
    ['partners', 'Partners to verify', o?.unverified, () => go('partners')],
  ] as [string, string, number | undefined, () => void][]).filter(([v]) => canUse(v));
  const waiting = queue.reduce((n, q) => n + (q[2] ?? 0), 0);

  return (
    <section className="view active adm-dash">
      <div className="adm-hello">
        <div>
          <h2>{greet}, {name.split(' ')[0]}</h2>
          <p>{o ? (waiting ? `${waiting} item${waiting > 1 ? 's' : ''} need${waiting > 1 ? '' : 's'} your attention.` : 'Nothing is waiting on you right now.') : 'Loading…'}</p>
        </div>
        <span className="adm-date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {/* ---------- headline numbers ---------- */}
      <div className="d-cards adm-kpis">
        <Kpi ic="b" icon={IC.partners} value={s ? String(s.partners.total) : '–'} label="Partners"
          note={s ? (s.partners.newThisMonth ? `+${s.partners.newThisMonth} this month` : 'None new this month') : ''} onClick={canUse('partners') ? () => go('partners') : undefined} />
        <Kpi ic="g" icon={IC.cases} value={s ? String(s.cases.total - s.cases.byStatus.Completed) : '–'} label="Open cases"
          note={s ? `${s.cases.byStatus.Completed} completed of ${s.cases.total}` : ''} onClick={canUse('cases') ? () => go('cases') : undefined} />
        {s?.money ? (
          <>
            <Kpi ic="a" icon={IC.money} value={inr(s.money.creditedThisMonth)} label="Commission this month"
              note={`${inr(s.money.paidThisMonth)} paid out`} onClick={() => go('payouts')} />
            <Kpi ic="n" icon={IC.wallet} value={inr(s.money.pendingWithdrawals)} label="Withdrawals waiting"
              note={s.money.pendingWithdrawalCount ? `${s.money.pendingWithdrawalCount} request${s.money.pendingWithdrawalCount > 1 ? 's' : ''}` : 'All settled'} onClick={() => go('payouts')} />
          </>
        ) : (
          <Kpi ic="a" icon={IC.students} value={s ? String(s.students) : '–'} label="Students referred" note="Across all partners" />
        )}
      </div>

      <div className="adm-grid">
        {/* ---------- queue ---------- */}
        <div className="panel adm-queue-panel">
          <div className="panel-h"><h3>Needs attention</h3></div>
          <div className="adm-queue-list">
            {queue.map(([, label, n, onClick]) => (
              <button key={label} className={`adm-q${n ? ' on' : ''}`} onClick={onClick}>
                <span className="adm-q-n">{n ?? '–'}</span>
                <span className="adm-q-l">{label}</span>
                <Svg html={IC.arrow} className="adm-q-go" />
              </button>
            ))}
          </div>
        </div>

        {/* ---------- cases by status ---------- */}
        <div className="panel">
          <div className="panel-h"><h3>Cases by status</h3><span className="t-sub">{s ? `${s.cases.total} in total` : ''}</span></div>
          <div className="panel-b">
            {s ? <StatusStack counts={s.cases.byStatus} /> : <Skeleton />}
            {s ? (
              <div className="adm-facts adm-mini">
                <div><b>{s.students}</b><span>Students referred</span></div>
                <div><b>{o?.unverified ?? '–'}</b><span>Partners to verify</span></div>
                <div><b>{s.partners.suspended}</b><span>Suspended partners</span></div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="adm-grid">
        <div className="panel">
          <div className="panel-h"><h3>New cases per month</h3><span className="t-sub">Last 6 months</span></div>
          <div className="panel-b">{s ? <Columns data={s.cases.monthly.map((m) => ({ label: monthLabel(m.month), value: m.count }))} color="#0A66C2" unit="cases" /> : <Skeleton />}</div>
        </div>
        {s?.money ? (
          <div className="panel">
            <div className="panel-h"><h3>Commission credited per month</h3><span className="t-sub">Last 6 months</span></div>
            <div className="panel-b"><Columns data={s.money.monthly.map((m) => ({ label: monthLabel(m.month), value: m.amount }))} color="#1E7E39" money /></div>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-h"><h3>Cases by service</h3></div>
            <div className="panel-b">{s ? <Ranked rows={s.cases.byService} /> : <Skeleton />}</div>
          </div>
        )}
      </div>

      <div className="adm-grid">
        {s?.money ? (
          <div className="panel">
            <div className="panel-h"><h3>Cases by service</h3></div>
            <div className="panel-b"><Ranked rows={s.cases.byService} /></div>
          </div>
        ) : null}
        <div className="panel">
          <div className="panel-h"><h3>Top partners</h3>{canUse('partners') ? <button className="btn btn-ghost btn-sm" onClick={() => go('partners')}>All partners</button> : null}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Partner</th><th>Cases</th><th>Open</th>{s?.money ? <th>Wallet</th> : null}</tr></thead>
              <tbody>
                {s?.topPartners.map((p) => (
                  <tr key={p.id} style={canUse('cases') ? { cursor: 'pointer' } : undefined} onClick={canUse('cases') ? () => go('cases', { partner: p.id }) : undefined}>
                    <td><div className="t-name">{p.name}</div>{p.verified ? null : <div className="t-sub">Not verified</div>}</td>
                    <td>{p.cases}</td><td>{p.open}</td>{s.money ? <td>{inr(p.balance ?? 0)}</td> : null}
                  </tr>
                ))}
                {s && !s.topPartners.length ? <tr><td colSpan={4} className="empty-row">No cases yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="adm-grid">
        <div className="panel">
          <div className="panel-h"><h3>Latest cases</h3>{canUse('cases') ? <button className="btn btn-ghost btn-sm" onClick={() => go('cases')}>All cases</button> : null}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Ref</th><th>Student</th><th>Service</th><th>Status</th></tr></thead>
              <tbody>
                {s?.recent.map((c) => (
                  <tr key={c.id}>
                    <td><div className="t-name">{c.ref}</div><div className="t-sub" style={{ whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div></td>
                    <td><div className="t-name">{c.student}</div><div className="t-sub">{c.partner}</div></td>
                    <td>{c.service}</td>
                    <td><span className={`status ${statusClass(c.status)}`}>{c.status}</span></td>
                  </tr>
                ))}
                {s && !s.recent.length ? <tr><td colSpan={4} className="empty-row">No cases yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        {isMaster ? (
          <div className="panel">
            <div className="panel-h"><h3>Recent activity</h3><button className="btn btn-ghost btn-sm" onClick={() => go('activity')}>Full log</button></div>
            <ul className="adm-feed">
              {s?.activity?.map((a) => (
                <li key={a.id}><span className="adm-feed-dot"></span><div><b>{a.name}</b> {a.action}<i>{fmtTime(a.at)}</i></div></li>
              ))}
              {s && !s.activity?.length ? <li className="empty-state">Nothing recorded yet.</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Kpi({ ic, icon, value, label, note, onClick }: { ic: string; icon: string; value: string; label: string; note: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`d-card adm-kpi${onClick ? ' click' : ''}`} onClick={onClick}>
      <div className="dc-top"><span className={`dc-ic ${ic}`}><Svg html={icon} /></span></div>
      <span className="num">{value}</span>
      <span className="lbl">{label}</span>
      {note ? <span className="adm-kpi-note">{note}</span> : null}
    </Tag>
  );
}

const Skeleton = () => <div className="adm-skel" />;

/* One horizontal 100% bar split by status, with a labelled legend underneath (identity never by colour alone). */
function StatusStack({ counts }: { counts: Record<CaseStatus, number> }) {
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
function Columns({ data, color, unit = '', money = false }: { data: { label: string; value: number }[]; color: string; unit?: string; money?: boolean }) {
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
        <span>{last.label} so far · {money ? inr(total) : `${total} ${unit}`} over 6 months</span>
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
                <text x={cx} y={H - 8} textAnchor="middle" className="adm-axis">{d.label}</text>
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
function Ranked({ rows }: { rows: { key: string; name: string; count: number }[] }) {
  if (!rows.length) return <p className="adm-meta">No cases yet.</p>;
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

