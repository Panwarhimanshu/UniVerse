import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Svg } from '../components/site';
import type { CaseStatus, Message } from '../lib/api';
import { fileSize, fmtDate, fmtTime, inr, initials, statusClass, useApi, useInterval } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { Bubbles, DOC_ICON, DOC_LABEL, errMsg, Hero, Modal, PasswordModal, useAutoScroll } from '../dashboard/modals';
import { adminApi, adminToken, setAdminUnauthorized } from './api';
import type { AdminPartner, AdminTx, AgreementReq, CaseDetail, Section, StaffUser, Thread } from './api';
import { ActivityView, InsightsView, PartnerManageModal, ServicesView, SettingsView, StaffView } from './MasterViews';

const ICON = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  cases: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  partners: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  payouts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
  agreements: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="2.5"/><path d="M8 16c.8-1.8 2.2-2.6 4-2.6s3.2.8 4 2.6"/></svg>',
  services: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  insights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

type View = 'overview' | Section | 'staff' | 'services' | 'insights' | 'settings' | 'activity';
const TITLES: Record<View, string> = {
  overview: 'Overview', cases: 'Cases', partners: 'Partners', messages: 'RM messages', payouts: 'Payouts', agreements: 'Agreement requests',
  staff: 'Staff accounts', services: 'Services', insights: 'Insights', settings: 'Settings', activity: 'Activity log',
};
const DESK: View[] = ['overview', 'cases', 'partners', 'messages', 'payouts', 'agreements'];
const MASTER: View[] = ['staff', 'services', 'insights', 'settings', 'activity'];
const STATUSES: CaseStatus[] = ['Pending', 'In Progress', 'On Hold', 'Completed'];
const AGR_LABEL = { download: 'Copy of signed agreement', discussion: 'Discuss the agreement', termination: 'Terminate the agreement' } as const;

/* ---------- entry: sign-in gate ---------- */
export default function AdminApp() {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);
  const signOut = useCallback(() => { adminToken.set(null); setStaff(null); }, []);

  useEffect(() => {
    setAdminUnauthorized(signOut);
    document.title = 'Back office | UniVerse';
    if (!adminToken.get()) { setReady(true); return; }
    adminApi.me().then(setStaff).catch(signOut).finally(() => setReady(true));
  }, [signOut]);

  if (!ready) return <div className="loading-screen">Loading…</div>;
  if (!staff) return <AdminLogin onSignedIn={setStaff} />;
  return <Console staff={staff} signOut={signOut} />;
}

function AdminLogin({ onSignedIn }: { onSignedIn: (s: StaffUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await adminApi.login(email.trim(), password);
      adminToken.set(r.token, false);
      onSignedIn(r.admin);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };
  return (
    <div className="auth-page adm-login">
      <Link to="/" className="back-home">← Back to site</Link>
      <main className="auth-form-side" style={{ gridColumn: '1 / -1' }}>
        <div className="auth-card">
          <div className="top"><img src="/img/universe-logo.png" alt="UniVerse" /></div>
          <h2>Back office</h2>
          <p className="muted">For the UniVerse service desk and relationship managers</p>
          <form onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="admEmail">Work email</label><input id="admEmail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
            <div className="field"><label htmlFor="admPassword">Password</label><input id="admPassword" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* ---------- console shell ---------- */
function Console({ staff, signOut }: { staff: StaffUser; signOut: () => void }) {
  const { view: viewParam } = useParams();
  const isMaster = staff.role === 'master';
  const canUse = (v: View) => v === 'overview' || isMaster || (!MASTER.includes(v) && staff.sections.includes(v as Section));
  const view: View = viewParam && viewParam in TITLES && canUse(viewParam as View) ? (viewParam as View) : 'overview';
  const navigate = useNavigate();
  const toast = useToast();
  const overview = useApi(adminApi.overview, [view]);
  useInterval(overview.reload, 20000);
  const [sideOpen, setSideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [caseFilter, setCaseFilter] = useState<{ queue?: string; partner?: string }>({});

  useEffect(() => { document.title = `${TITLES[view]} | UniVerse back office`; setSideOpen(false); }, [view]);
  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  if (viewParam && viewParam !== view) return <Navigate to="/admin" replace />;

  const go = (v: View, filter: { queue?: string; partner?: string } = {}) => { setCaseFilter(filter); navigate(`/admin/${v}`); };
  const o = overview.data;
  const badge: Partial<Record<View, number>> = o ? {
    cases: o.casesAwaitingReply + o.docsToReview, messages: o.rmAwaitingReply, payouts: o.pendingPayouts, agreements: o.openAgreementRequests,
  } : {};

  return (
    <>
      <div className="dash adm">
        <aside className={`dash-side${sideOpen ? ' open' : ''}`}>
          <div className="s-brand"><Link to="/admin"><img src="/img/universe-logo.png" alt="UniVerse" /><span className="portal-tag">{isMaster ? 'Master admin' : 'Back office'}</span></Link></div>
          <nav className="s-nav">
            <span className="lbl">Desk</span>
            {DESK.filter(canUse).map((v) => (
              <button key={v} className={`s-link${view === v ? ' active' : ''}`} onClick={() => go(v)}>
                <Svg html={ICON[v]} />{TITLES[v]}
                {badge[v] ? <span className="wn-badge">{badge[v]}</span> : null}
              </button>
            ))}
            {isMaster ? <span className="lbl">Master admin</span> : null}
            {isMaster ? MASTER.map((v) => (
              <button key={v} className={`s-link${view === v ? ' active' : ''}`} onClick={() => go(v)}>
                <Svg html={ICON[v]} />{TITLES[v]}
              </button>
            )) : null}
          </nav>
          <div className="s-foot"><div className="s-rm" style={{ cursor: 'default' }}><span className="av">{initials(staff.name)}</span><div><b>{staff.name}</b><span>{isMaster ? 'Master admin' : 'Staff'} · {staff.email}</span></div></div></div>
        </aside>
        <header className="dash-top">
          <button className="icon-btn menu-fab" aria-label="Menu" onClick={() => setSideOpen(!sideOpen)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <span className="page-ttl">{TITLES[view]}</span>
          <span className="sp"></span>
          <div className="user-chip" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
            <span className="av">{initials(staff.name)}</span><b>{staff.name}</b>
          </div>
        </header>
        <div className={`user-menu${menuOpen ? ' open' : ''}`}>
          <button onClick={() => setPwOpen(true)}><Svg html={ICON.key} />Change password</button>
          <button onClick={() => { signOut(); toast("You've been signed out."); }}><Svg html={ICON.logout} />Log out</button>
        </div>
        <main className="dash-main">
          {view === 'overview' && <OverviewView go={go} data={o} canUse={canUse} />}
          {view === 'cases' && <CasesView initial={caseFilter} onChanged={overview.reload} />}
          {view === 'partners' && <PartnersView isMaster={isMaster} openCases={canUse('cases') ? (id) => go('cases', { partner: id }) : undefined} />}
          {view === 'messages' && <MessagesView onChanged={overview.reload} />}
          {view === 'payouts' && <PayoutsView onChanged={overview.reload} />}
          {view === 'agreements' && <AgreementsView onChanged={overview.reload} />}
          {view === 'staff' && <StaffView me={staff} />}
          {view === 'services' && <ServicesView />}
          {view === 'insights' && <InsightsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'activity' && <ActivityView />}
        </main>
      </div>
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} save={adminApi.changePassword} min={10} />
    </>
  );
}

/* ---------- overview: what needs attention ---------- */
function OverviewView({ go, data, canUse }: {
  go: (v: View, f?: { queue?: string }) => void; data: ReturnType<typeof useApi<import('./api').Overview>>['data']; canUse: (v: View) => boolean;
}) {
  const all: [View, string, number | undefined, string, () => void][] = [
    ['cases', 'Case messages waiting for a reply', data?.casesAwaitingReply, 'b', () => go('cases', { queue: 'awaiting' })],
    ['cases', 'Documents to review', data?.docsToReview, 'a', () => go('cases', { queue: 'review' })],
    ['messages', 'RM messages waiting for a reply', data?.rmAwaitingReply, 'g', () => go('messages')],
    ['payouts', 'Payouts to settle', data?.pendingPayouts, 'n', () => go('payouts')],
    ['agreements', 'Open agreement requests', data?.openAgreementRequests, 'a', () => go('agreements')],
    ['partners', 'Partners awaiting verification', data?.unverified, 'b', () => go('partners')],
  ];
  const cards = all.filter(([v]) => canUse(v)).map(([, ...rest]) => rest);
  return (
    <section className="view active">
      <div className="d-cards adm-queue">
        {cards.map(([label, n, ic, onClick]) => (
          <button className="d-card" key={label} onClick={onClick}>
            <span className={`num${n ? '' : ' zero'}`}>{n ?? '–'}</span>
            <span className="lbl">{label}</span>
            <span className={`adm-dot ${ic}`}></span>
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-h"><h3>Network</h3></div>
        <div className="panel-b adm-facts">
          <div><b>{data?.partners ?? '–'}</b><span>Partner accounts</span></div>
          <div><b>{data?.openCases ?? '–'}</b><span>Open cases</span></div>
        </div>
      </div>
    </section>
  );
}

/* ---------- cases ---------- */
function CasesView({ initial, onChanged }: { initial: { queue?: string; partner?: string }; onChanged: () => void }) {
  const [status, setStatus] = useState('');
  const [queue, setQueue] = useState(initial.queue ?? '');
  const [partner, setPartner] = useState(initial.partner ?? '');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(q), 300); return () => clearTimeout(t); }, [q]);
  const list = useApi(() => adminApi.cases({ status, queue, q: query, partner }), [status, queue, query, partner]);
  useInterval(list.reload, 15000);
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = list.data?.find((c) => c.id === openId);

  return (
    <section className="view active">
      <div className="adm-toolbar">
        <div className="dash-search adm-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" placeholder="Ref, student, partner…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cases" />
        </div>
        <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="svc-filters">
          {[['', 'All'], ['awaiting', 'Waiting for reply'], ['review', 'Documents to review']].map(([k, l]) => (
            <button key={k} className={`chip-btn${queue === k ? ' active' : ''}`} onClick={() => setQueue(k)}>{l}</button>
          ))}
        </div>
        {partner ? <button className="chip-btn active" onClick={() => setPartner('')}>One partner ✕</button> : null}
      </div>
      <div className="adm-split">
        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Ref</th><th>Student</th><th>Partner</th><th>Service</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.data?.map((c) => (
                  <tr key={c.id} className={c.id === openId ? 'adm-sel' : ''} onClick={() => setOpenId(c.id)} style={{ cursor: 'pointer' }}>
                    <td>{c.ref}</td>
                    <td><div className="t-name">{c.student.name}</div><div className="t-sub">{c.student.country}</div></td>
                    <td><div className="t-name" style={{ fontWeight: 500 }}>{c.partner.agency || c.partner.name}</div></td>
                    <td>{c.serviceName}</td>
                    <td><span className={`status ${statusClass(c.status)}`}>{c.status}</span></td>
                    <td className="adm-flags">
                      {c.awaitingReply ? <span className="pill tat" title="The partner is waiting for a reply">Reply</span> : null}
                      {c.docsToReview ? <span className="pill ctry" title="Documents waiting for review">{c.docsToReview} doc{c.docsToReview > 1 ? 's' : ''}</span> : null}
                    </td>
                  </tr>
                ))}
                {list.data && !list.data.length ? <tr><td colSpan={6} className="empty-row">No cases match.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel adm-detail">
          {openId ? <CaseDesk key={openId} id={openId} fallbackRef={selected?.ref} onChanged={() => { list.reload(); onChanged(); }} />
            : <div className="empty-state">Pick a case to see its documents, stages and conversation.</div>}
        </div>
      </div>
    </section>
  );
}

function CaseDesk({ id, fallbackRef, onChanged }: { id: string; fallbackRef?: string; onChanged: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<CaseDetail | null>(null);
  const [reply, setReply] = useState('');
  const [extraDoc, setExtraDoc] = useState('');
  const [credit, setCredit] = useState({ amount: '', cleared: false });
  const [busy, setBusy] = useState(false);
  const chatRef = useAutoScroll(d?.messages.length);

  const load = useCallback(() => adminApi.case(id).then(setD).catch((e) => toast(errMsg(e))), [id, toast]);
  useEffect(() => { load(); }, [load]);
  useInterval(load, 10000);

  const act = async (fn: () => Promise<CaseDetail>, done?: string) => {
    setBusy(true);
    try {
      setD(await fn());
      if (done) toast(done);
      onChanged();
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!d) return <div className="empty-state">Loading {fallbackRef ?? 'case'}…</div>;
  const c = d.case;
  const p = d.partner;

  return (
    <>
      <div className="panel-h">
        <h3>{c.ref} · {c.student.name}</h3>
        <select className="adm-select" value={c.status} disabled={busy} aria-label="Case status"
          onChange={(e) => act(() => adminApi.updateCase(c.id, { status: e.target.value as CaseStatus }), 'Status updated')}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="panel-b adm-case">
        <p className="adm-meta">
          {c.serviceName} · {c.student.country} · opened {fmtDate(c.createdAt)}<br />
          Student: {c.student.phone}{c.student.email ? ` · ${c.student.email}` : ''}<br />
          Partner: <b>{p?.agency || p?.name}</b>{p ? ` · ${p.name} · ${p.phone || p.email}` : ''}
        </p>
        {c.note ? <p className="adm-note"><b>Partner's note:</b> {c.note}</p> : null}

        <h4 className="adm-h">Stage</h4>
        <div className="adm-stages">
          {c.timeline.map((s, i) => (
            <button key={s.title} disabled={busy} className={`adm-stage${s.done ? ' done' : ''}${s.now ? ' now' : ''}`}
              onClick={() => i !== c.step && act(() => adminApi.updateCase(c.id, { step: i }), `Moved to “${s.title}”`)}
              title={i === c.step ? 'Current stage' : `Set the case to “${s.title}”`}>
              <span className="tl-dot">{s.done ? <Svg html={ICON.check} /> : i + 1}</span>
              <span><b>{s.title}</b><i>{s.at ? fmtDate(s.at) : s.sub}</i></span>
            </button>
          ))}
        </div>

        <h4 className="adm-h">Documents</h4>
        <div className="adm-docs">
          {c.docs.map((doc) => {
            const [cls, label] = DOC_LABEL[doc.status];
            return (
              <div className="doc-card" key={doc.id}>
                <span className="doc-ic"><Svg html={DOC_ICON} /></span>
                <span className="dn"><b title={doc.name}>{doc.name}</b><i>{doc.size ? fileSize(doc.size) : 'Not uploaded'}</i></span>
                <span className={`status ${cls}`}>{label}</span>
                {doc.hasFile ? (
                  <span className="adm-doc-actions">
                    <button className="doc-dl" title="Download" aria-label={`Download ${doc.name}`} onClick={() => adminApi.downloadDoc(c.id, doc.id, doc.name).catch((e) => toast(errMsg(e)))}><Svg html={ICON.download} /></button>
                    {doc.status !== 'verified' ? <button className="btn btn-green btn-sm" disabled={busy} onClick={() => act(() => adminApi.reviewDoc(c.id, doc.id, 'verified'), `${doc.name} verified`)}>Verify</button> : null}
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => {
                      const reason = prompt(`Why is “${doc.name}” being returned? The partner will see this.`);
                      if (reason !== null) act(() => adminApi.reviewDoc(c.id, doc.id, 'missing', reason), 'Sent back to the partner');
                    }}>Return</button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <form className="adm-inline" onSubmit={async (e) => { e.preventDefault(); if (extraDoc.trim() && await act(() => adminApi.requestDoc(c.id, extraDoc.trim()), 'Document requested')) setExtraDoc(''); }}>
          <input placeholder="Ask for another document, e.g. Bank statement" value={extraDoc} onChange={(e) => setExtraDoc(e.target.value)} />
          <button className="btn btn-ghost btn-sm" disabled={!extraDoc.trim() || busy}>Request</button>
        </form>

        <h4 className="adm-h">Conversation with the partner</h4>
        <div className="chat-scroll" ref={chatRef}><Bubbles msgs={d.messages} them="Service desk" mine="staff" /></div>
        <form className="composer" onSubmit={async (e) => { e.preventDefault(); const t = reply.trim(); if (t && await act(() => adminApi.reply(c.id, t))) setReply(''); }}>
          <input placeholder="Reply as the service desk…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={!reply.trim() || busy}>Send</button>
        </form>

        <h4 className="adm-h">Commission</h4>
        {d.credits.length ? (
          <ul className="adm-credits">
            {d.credits.map((t) => <li key={t.id}><span>{fmtDate(t.date)} · {inr(t.amount)}</span><span className={`status ${statusClass(t.status)}`}>{t.status}</span></li>)}
          </ul>
        ) : <p className="adm-meta">Nothing credited for this case yet.</p>}
        <form className="adm-inline" onSubmit={async (e) => {
          e.preventDefault();
          const amount = Math.round(Number(credit.amount));
          if (!(amount > 0)) return toast('Enter the commission in rupees');
          if (!confirm(`Credit ${inr(amount)} to ${p?.agency || p?.name}${credit.cleared ? ' as available balance' : ' as pending clearance'}?`)) return;
          if (await act(() => adminApi.credit(c.id, amount, credit.cleared), 'Commission credited')) setCredit({ amount: '', cleared: false });
        }}>
          <input type="number" min={1} placeholder="Amount (₹)" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} />
          <label className="remember"><input type="checkbox" checked={credit.cleared} onChange={(e) => setCredit({ ...credit, cleared: e.target.checked })} /> Available now</label>
          <button className="btn btn-green btn-sm" disabled={!credit.amount || busy}>Credit</button>
        </form>
      </div>
    </>
  );
}

/* ---------- partners ---------- */
function PartnersView({ openCases, isMaster }: { openCases?: (id: string) => void; isMaster: boolean }) {
  const toast = useToast();
  const list = useApi(adminApi.partners, []);
  const [q, setQ] = useState('');
  const [rmFor, setRmFor] = useState<AdminPartner | null>(null);
  const [manage, setManage] = useState<string | null>(null);
  const [temp, setTemp] = useState<{ name: string; email: string; password: string } | null>(null);
  const term = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((p) => !term || [p.name, p.agency, p.email, p.city].join(' ').toLowerCase().includes(term));

  const verify = async (p: AdminPartner) => {
    try {
      await adminApi.updatePartner(p.id, { verified: !p.verified });
      toast(p.verified ? `${p.agency || p.name} marked unverified` : `${p.agency || p.name} verified`);
      list.reload();
    } catch (e) { toast(errMsg(e)); }
  };
  const reset = async (p: AdminPartner) => {
    if (!confirm(`Set a new temporary password for ${p.name}? Their current password stops working.`)) return;
    try {
      const r = await adminApi.resetPassword(p.id);
      setTemp({ name: p.name, email: p.email, password: r.password });
    } catch (e) { toast(errMsg(e)); }
  };

  return (
    <section className="view active">
      <div className="adm-toolbar">
        <div className="dash-search adm-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" placeholder="Name, agency, email, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search partners" />
        </div>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Partner</th><th>Zone</th><th>Cases</th><th>Wallet</th><th>RM</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><div className="t-name">{p.agency || p.name}</div><div className="t-sub">{p.name} · {p.email} · {p.phone}</div><div className="t-sub">Joined {fmtDate(p.partnerSince)}{p.teamSize ? ` · ${p.teamSize} team member${p.teamSize > 1 ? 's' : ''}` : ''}</div></td>
                  <td>{p.zone[0]}{p.zone.slice(1).toLowerCase()}{p.city ? <div className="t-sub">{p.city}</div> : null}</td>
                  <td>{openCases ? <button className="open-btn" onClick={() => openCases(p.id)}>{p.openCases} open / {p.cases}</button> : `${p.openCases} open / ${p.cases}`}</td>
                  <td>{inr(p.wallet?.balance ?? 0)}{p.wallet?.pending ? <div className="t-sub">{inr(p.wallet.pending)} pending</div> : null}</td>
                  <td><button className="open-btn" onClick={() => setRmFor(p)}>{p.rm.name}</button></td>
                  <td>{p.suspended ? <span className="status hold">Suspended</span> : <span className={`status ${p.verified ? 'done' : 'pend'}`}>{p.verified ? 'Verified' : 'Not verified'}</span>}</td>
                  <td>
                    <div className="um-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => verify(p)}>{p.verified ? 'Unverify' : 'Verify'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => reset(p)}>Reset password</button>
                      {isMaster ? <button className="btn btn-primary btn-sm" onClick={() => setManage(p.id)}>Manage</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {list.data && !rows.length ? <tr><td colSpan={7} className="empty-row">{list.data.length ? 'No partners match.' : 'No partners have signed up yet.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <RmModal partner={rmFor} onClose={() => setRmFor(null)} onSaved={list.reload} />
      <PartnerManageModal id={manage} onClose={() => setManage(null)} onChanged={list.reload} />
      <Modal open={!!temp} onClose={() => setTemp(null)}>
        {temp ? (
          <>
            <Hero title="Temporary password" sub={`For ${temp.name} (${temp.email})`} onClose={() => setTemp(null)} />
            <div className="modal-body">
              <p className="adm-temp">{temp.password}</p>
              <p style={{ fontSize: '.88rem' }}>Share it with the partner over the phone or from a verified email. It won't be shown again. They can change it from their account menu after signing in.</p>
              <div className="m-cta">
                <button className="btn btn-primary" onClick={() => { navigator.clipboard?.writeText(temp.password); toast('Copied'); }}>Copy</button>
                <button className="btn btn-ghost" onClick={() => setTemp(null)}>Done</button>
              </div>
            </div>
          </>
        ) : null}
      </Modal>
    </section>
  );
}

function RmModal({ partner, onClose, onSaved }: { partner: AdminPartner | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  useEffect(() => { if (partner) setF({ ...partner.rm }); }, [partner]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!partner) return;
    try {
      await adminApi.updatePartner(partner.id, { rm: f });
      toast('Relationship manager updated');
      onSaved();
      onClose();
    } catch (err) { toast(errMsg(err)); }
  };
  return (
    <Modal open={!!partner} onClose={onClose}>
      <Hero title="Relationship manager" sub={partner ? `Shown to ${partner.agency || partner.name} on their dashboard` : ''} onClose={onClose} />
      <div className="modal-body">
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="rmName">Name</label><input id="rmName" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="field"><label htmlFor="rmEmail">Email</label><input id="rmEmail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="rmPhone">Phone</label><input id="rmPhone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="m-cta"><button className="btn btn-primary">Save</button><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
        </form>
      </div>
    </Modal>
  );
}

/* ---------- RM inbox ---------- */
function MessagesView({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const inbox = useApi(adminApi.inbox, []);
  useInterval(inbox.reload, 15000);
  const [sel, setSel] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const ref = useAutoScroll(msgs.length);
  const loadThread = useCallback(() => { if (sel) adminApi.thread(sel.partnerId).then(setMsgs).catch(() => {}); }, [sel]);
  useEffect(loadThread, [loadThread]);
  useInterval(loadThread, sel ? 8000 : null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !sel) return;
    try {
      const m = await adminApi.sendRm(sel.partnerId, t);
      setMsgs((xs) => [...xs, m]);
      setText('');
      inbox.reload();
      onChanged();
    } catch (err) { toast(errMsg(err)); }
  };

  return (
    <section className="view active">
      <div className="adm-split">
        <div className="panel">
          <div className="panel-h"><h3>Conversations</h3></div>
          <div className="adm-threads">
            {inbox.data?.map((t) => (
              <button key={t.partnerId} className={`adm-thread${sel?.partnerId === t.partnerId ? ' on' : ''}`} onClick={() => setSel(t)}>
                <span className="adm-thread-top"><b>{t.agency || t.name}</b><i>{fmtTime(t.last.createdAt)}</i></span>
                <span className="adm-thread-text">{t.last.from === 'agent' ? '' : t.last.from === 'system' ? '· ' : 'You: '}{t.last.text}</span>
                {t.awaitingReply ? <span className="pill tat">Waiting for reply</span> : null}
              </button>
            ))}
            {inbox.data && !inbox.data.length ? <div className="empty-state">No conversations yet.</div> : null}
          </div>
        </div>
        <div className="panel adm-detail">
          {sel ? (
            <>
              <div className="panel-h"><h3>{sel.agency || sel.name}</h3><span className="t-sub">RM on record: {sel.rm}</span></div>
              <div className="panel-b">
                <div className="chat-scroll adm-chat" ref={ref}><Bubbles msgs={msgs} them={sel.rm} mine="staff" /></div>
                <form className="composer" onSubmit={send}>
                  <input placeholder={`Reply as ${sel.rm}…`} value={text} onChange={(e) => setText(e.target.value)} />
                  <button className="btn btn-primary btn-sm" disabled={!text.trim()}>Send</button>
                </form>
              </div>
            </>
          ) : <div className="empty-state">Pick a conversation.</div>}
        </div>
      </div>
    </section>
  );
}

/* ---------- payouts ---------- */
function PayoutsView({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState('Pending');
  const list = useApi(() => adminApi.transactions(status), [status]);
  const settle = async (t: AdminTx, action: 'clear' | 'pay' | 'reject') => {
    let reason: string | undefined;
    if (action === 'reject') {
      const r = prompt(t.type === 'Debit' ? 'Why is this withdrawal being rejected? The partner will see this.' : 'Reject this pending commission?', '');
      if (r === null) return;
      reason = r;
    } else if (action === 'pay' && !confirm(`Confirm ${inr(t.amount)} has been sent to ${t.partner.bankAccount || 'the partner’s bank account'}?`)) {
      return;
    }
    try {
      await adminApi.settle(t.id, action, reason);
      toast(action === 'clear' ? 'Moved to available balance' : action === 'pay' ? 'Marked as paid' : 'Rejected');
      list.reload();
      onChanged();
    } catch (e) { toast(errMsg(e)); }
  };
  return (
    <section className="view active">
      <div className="adm-toolbar">
        <div className="svc-filters">
          {['Pending', 'Completed', 'Rejected', 'all'].map((s) => <button key={s} className={`chip-btn${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : s}</button>)}
        </div>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Partner</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.data?.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.date)}</td>
                  <td><div className="t-name">{t.partner.agency || t.partner.name}</div>{t.type === 'Debit' ? <div className="t-sub">{t.partner.bankAccount || 'No bank account on file'}</div> : null}</td>
                  <td>{t.description}</td>
                  <td style={{ fontWeight: 700, color: t.type === 'Credit' ? 'var(--green-deep)' : 'var(--ink)' }}>{t.type === 'Credit' ? '+' : '−'} {inr(t.amount)}</td>
                  <td><span className={`status ${statusClass(t.status)}`}>{t.status}</span></td>
                  <td>
                    {t.status === 'Pending' ? (
                      <div className="um-actions">
                        {t.type === 'Debit'
                          ? <button className="btn btn-green btn-sm" onClick={() => settle(t, 'pay')}>Mark paid</button>
                          : <button className="btn btn-green btn-sm" onClick={() => settle(t, 'clear')}>Clear</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => settle(t, 'reject')}>Reject</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {list.data && !list.data.length ? <tr><td colSpan={6} className="empty-row">Nothing here.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------- agreement requests ---------- */
function AgreementsView({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState('Open');
  const list = useApi(() => adminApi.agreementRequests(status), [status]);
  const toggle = async (r: AgreementReq) => {
    try {
      await adminApi.closeAgreementRequest(r.id, r.status === 'Open' ? 'Closed' : 'Open');
      list.reload();
      onChanged();
    } catch (e) { toast(errMsg(e)); }
  };
  return (
    <section className="view active">
      <div className="adm-toolbar">
        <div className="svc-filters">
          {['Open', 'Closed', 'all'].map((s) => <button key={s} className={`chip-btn${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : s}</button>)}
        </div>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Received</th><th>Partner</th><th>Request</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.data?.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td><div className="t-name">{r.partner?.agency || r.partner?.name}</div><div className="t-sub">{r.partner?.email} · {r.partner?.phone}</div></td>
                  <td>{r.type === 'termination' ? <b style={{ color: '#B91C1C' }}>{AGR_LABEL[r.type]}</b> : AGR_LABEL[r.type]}</td>
                  <td><span className={`status ${r.status === 'Open' ? 'pend' : 'done'}`}>{r.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => toggle(r)}>{r.status === 'Open' ? 'Mark handled' : 'Reopen'}</button></td>
                </tr>
              ))}
              {list.data && !list.data.length ? <tr><td colSpan={5} className="empty-row">Nothing here.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
