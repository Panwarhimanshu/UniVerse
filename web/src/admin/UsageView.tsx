import { useState } from 'react';
import { Columns, Ranked, Skeleton } from '../components/charts';
import { fmtTime, useApi } from '../lib/hooks';
import { adminApi } from './api';

/* How partners use the app and the website. Counts people, not page loads, unless it says views. */

const ACTION_LABEL: Record<string, string> = {
  sign_in: 'Signed in', sign_up: 'Created an account', student_added: 'Added a student', referral_created: 'Referred a student', message_sent: 'Sent a message',
  document_uploaded: 'Uploaded a document', services_raised: 'Raised more services', agreement_request: 'Asked about the agreement',
  withdrawal_requested: 'Requested a withdrawal', profile_photo: 'Changed their profile photo',
};
const SCREEN_LABEL: Record<string, string> = {
  '/': 'Home', '/cases': 'Cases', '/students': 'Students', '/wallet': 'Wallet', '/more': 'More', '/profile': 'Profile',
  '/analytics': 'Analytics', '/case/:id': 'Case detail', '/student/:id': 'Student detail', '/withdraw': 'Withdraw',
  '/services': 'Services', '/team': 'Team', '/updates': 'Updates', '/whatsnew': "What's new", '/agreement': 'Agreement',
};
const screenName = (s: string) => SCREEN_LABEL[s] ?? (s.startsWith('/dashboard/') ? s.slice(11).replace(/^\w/, (c) => c.toUpperCase()) : s);
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const OS_LABEL: Record<string, string> = { android: 'Android', ios: 'iPhone', web: 'Browser', unknown: 'Unknown' };

export function UsageView() {
  const [days, setDays] = useState(30);
  const u = useApi(() => adminApi.usage(days), [days]);
  const d = u.data;
  const every = days > 30 ? 14 : 7;
  const period = `over ${days} days`;

  return (
    <section className="view active adm-dash">
      <div className="adm-toolbar">
        <select className="adm-select" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={u.reload}>Refresh</button>
      </div>

      <div className="d-cards adm-kpis">
        <Fact value={d?.activeUsers.day} label="Active today" note="People who opened the app or site" />
        <Fact value={d?.activeUsers.week} label="Active this week" note="Last 7 days" />
        <Fact value={d?.activeUsers.month} label="Active this month" note="Last 30 days" />
        <Fact value={d ? d.platforms.app ?? 0 : undefined} label="Used the app" note={d ? `${d.platforms.web ?? 0} used the website · ${days} days` : ''} />
      </div>

      <div className="d-grid pa-grid">
        <div className="panel">
          <div className="panel-h"><h3>People using the app each day</h3></div>
          <div className="panel-b">{d ? <Columns data={d.daily.map((r) => ({ label: dayLabel(r.day), value: r.app }))} color="#0A66C2" unit="daily visitors" period={period} lastNote="today" labelEvery={every} /> : <Skeleton />}</div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>People using the website each day</h3></div>
          <div className="panel-b">{d ? <Columns data={d.daily.map((r) => ({ label: dayLabel(r.day), value: r.web }))} color="#0A66C2" unit="daily visitors" period={period} lastNote="today" labelEvery={every} /> : <Skeleton />}</div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Most opened screens</h3><span className="t-sub">Views</span></div>
          <div className="panel-b">{d ? <Ranked empty="No screens viewed yet." rows={d.screens.map((s) => ({ key: s.platform + s.screen, name: `${screenName(s.screen)} · ${s.platform === 'app' ? 'App' : 'Web'}`, count: s.views }))} /> : <Skeleton />}</div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>What partners did</h3><span className="t-sub">Times</span></div>
          <div className="panel-b">{d ? <Ranked empty="Nothing recorded yet." rows={d.actions.map((a) => ({ key: a.event, name: ACTION_LABEL[a.event] ?? a.event, count: a.count }))} /> : <Skeleton />}</div>
        </div>
      </div>

      <div className="d-grid pa-grid">
        <div className="panel">
          <div className="panel-h"><h3>Most active partners</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Partner</th><th>Actions</th><th>Uses</th><th>Last seen</th></tr></thead>
              <tbody>
                {d?.topPartners.map((p) => (
                  <tr key={p.id}><td className="t-name">{p.name}</td><td>{p.events}</td><td>{p.platforms.map((x) => (x === 'app' ? 'App' : 'Web')).join(' + ')}</td><td style={{ whiteSpace: 'nowrap' }}>{fmtTime(p.lastSeen)}</td></tr>
                ))}
                {d && !d.topPartners.length ? <tr><td colSpan={4} className="empty-row">No partner activity yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Recent sign-ins</h3>{d && Object.keys(d.appOs).length ? <span className="t-sub">App: {Object.entries(d.appOs).map(([k, n]) => `${OS_LABEL[k] ?? k} ${n}`).join(' · ')}</span> : null}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Partner</th><th>From</th><th>When</th></tr></thead>
              <tbody>
                {d?.recentSignIns.map((s, i) => (
                  <tr key={i}><td className="t-name">{s.name}</td><td>{s.platform === 'app' ? `App · ${OS_LABEL[s.os] ?? s.os}` : 'Website'}</td><td style={{ whiteSpace: 'nowrap' }}>{fmtTime(s.at)}</td></tr>
                ))}
                {d && !d.recentSignIns.length ? <tr><td colSpan={3} className="empty-row">No sign-ins yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ value, label, note }: { value: number | undefined; label: string; note: string }) {
  return (
    <div className="d-card adm-kpi">
      <span className="num">{value ?? '–'}</span>
      <span className="lbl">{label}</span>
      {note ? <span className="adm-kpi-note">{note}</span> : null}
    </div>
  );
}
