import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BlogItem, Svg } from '../components/site';
import { BLOGS, fmtBlogDate } from '../data/blogs';
import { serviceByKey, serviceName } from '../data/services';
import { SITE, visibleServices } from '../lib/content';
import { api } from '../lib/api';
import type { Case, Commissions, Menu, Notification, Perm, Student, TeamMember } from '../lib/api';
import { Columns, monthLabel } from '../components/charts';
import { useAuth } from '../lib/auth';
import { fmtDate, fmtTime, inr, initials, statusClass, useApi, useInterval } from '../lib/hooks';
import { useToast } from '../lib/toast';
import {
  AgreementModal, Avatar, CaseModal, CommModal, MENU_LIST, PasswordModal, PayoutMethodModal, PERM_LIST, PhotoModal, ProfileModal, ReferModal, RmDrawer, StudentModal, UserModal, WithdrawModal,
} from './modals';
import { buildTimeline } from './timeline';
import { AddStudentModal, ImportStudentsModal } from './StudentImport';

/* ---------- icons ---------- */
const I = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  whatsnew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>',
  students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  requests: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  services: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
  commissions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  chat: '<svg class="chat-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

type View = 'overview' | 'whatsnew' | 'students' | 'requests' | 'services' | 'wallet' | 'commissions' | 'profile' | 'users';
const TITLES: Record<View, string> = {
  overview: 'Overview', whatsnew: "What's New", students: 'Students', requests: 'Service Requests', services: 'Marketplace Services',
  wallet: 'My Wallet', commissions: 'Commissions', profile: 'Agent Profile', users: 'User Management',
};
const NAV: [string, View[]][] = [
  ['Workspace', ['overview', 'whatsnew', 'students', 'requests']],
  ['Marketplace', ['services']],
  ['Money', ['wallet', 'commissions']],
  ['Account', ['profile', 'users']],
];
const NAV_LABEL: Partial<Record<View, string>> = { requests: 'Requests', services: 'Services', wallet: 'Wallet', profile: 'Profile' };

const buildFeed = () => Object.entries(BLOGS)
  .flatMap(([k, list]) => list.map((b) => ({ ...b, svc: k, svcName: serviceName(k) })))
  .sort((a, b) => b.d.localeCompare(a.d));
const isFresh = (iso: string, days: number) => Date.now() - new Date(iso + 'T00:00:00').getTime() < days * 864e5;
const OWNER_ONLY: View[] = ['profile', 'users'];

const NOTIF_LABEL: Record<Notification['category'], string> = {
  case: 'Case', document: 'Document', message: 'Message', payment: 'Payment', account: 'Account', announcement: 'News',
};

export default function Dashboard() {
  const { view: viewParam } = useParams();
  const navigate = useNavigate();
  const { agent, ready, signOut, setAgent } = useAuth();
  const toast = useToast();

  /* ---------- who is signed in: the owner, or a team member with limited access ---------- */
  const member = agent?.member ?? null;
  const isOwner = !member;
  const sees = (v: View) => !member || (!OWNER_ONLY.includes(v) && member.menus.includes(v as Menu));
  const can = (p: Perm) => !member || member.perms.includes(p);
  const allowed = (Object.keys(TITLES) as View[]).filter(sees);
  const requested: View = viewParam && viewParam in TITLES ? (viewParam as View) : 'overview';
  const view: View = sees(requested) ? requested : allowed[0] ?? 'whatsnew';
  const myName = member?.name ?? agent?.name ?? '';

  /* ---------- data ---------- */
  const on = !!agent; // only fetch while signed in
  const key = [agent?.id, member?.id];
  const dash = useApi(api.dashboard, key, on && sees('overview'));
  const cases = useApi(api.cases, key, on);
  const students = useApi(api.students, key, on && sees('students'));
  const wallet = useApi(api.wallet, key, on && sees('wallet'));
  const comms = useApi(api.commissions, key, on && sees('commissions'));
  const team = useApi(api.team, key, on && isOwner);
  const analytics = useApi(api.analytics, key, on && sees('overview'));
  const refreshCases = useCallback(() => { dash.reload(); cases.reload(); students.reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- ui state ---------- */
  const [sideOpen, setSideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [refer, setRefer] = useState<{ open: boolean; svc?: string }>({ open: false });
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [commEntry, setCommEntry] = useState<Commissions['history'][number] | null>(null);
  const [agrOpen, setAgrOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userModal, setUserModal] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });
  const [studentId, setStudentId] = useState<string | null>(null);
  const [rmOpen, setRmOpen] = useState(false);
  const [wnFilter, setWnFilter] = useState('all');
  const [pwOpen, setPwOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const loadNotifs = useCallback(() => {
    if (agent) api.notifications().then((p) => { setNotifs(p.items); setUnread(p.unread); }).catch(() => {});
  }, [agent]);
  useEffect(loadNotifs, [loadNotifs]);
  useInterval(loadNotifs, agent ? 20000 : null);
  const markRead = (ids: string[] | 'all') => {
    setNotifs((list) => list.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n)));
    api.markNotificationsRead(ids).then((r) => setUnread(r.unread)).catch(() => {});
  };

  useEffect(() => { document.title = `${TITLES[view]} | UniVerse Partner Portal`; setSideOpen(false); window.scrollTo({ top: 0 }); }, [view]);
  useEffect(() => { if (agent) api.trackView(`/dashboard/${view}`); }, [view, agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const close = () => { setMenuOpen(false); setNotifOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const go = (v: View) => navigate(`/dashboard/${v}`);
  const caseList = cases.data ?? [];
  const studentList = students.data ?? [];
  const panelCase = caseList.find((c) => c.id === panelId) ?? caseList[0];

  const term = search.trim().toLowerCase();
  const filteredStudents = useMemo(() => studentList.filter((s) => {
    const latest = s.requests[s.requests.length - 1];
    if (statusF && latest?.status !== statusF) return false;
    if (!term) return true;
    return [s.name, s.code, s.country, s.email, ...s.requests.map((r) => serviceName(r.service))].join(' ').toLowerCase().includes(term);
  }), [studentList, statusF, term]);
  const filteredCases = useMemo(() => caseList.filter((c) => !term ||
    [c.ref, c.student.name, c.serviceName, c.student.country].join(' ').toLowerCase().includes(term)), [caseList, term]);

  if (!ready) return <div className="loading-screen">Loading…</div>;
  if (!agent) return <Navigate to="/partner-login" replace />;
  if (viewParam && viewParam !== view) return <Navigate to={`/dashboard/${view}`} replace />;

  const FEED = buildFeed();
  const freshCount = FEED.filter((b) => isFresh(b.d, 30)).length;
  const month = new Date().toLocaleDateString('en-GB', { month: 'short' });
  const stats = dash.data?.stats;

  const toggleNotifs = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setNotifOpen(!notifOpen);
    if (!notifOpen) loadNotifs();
  };
  const openNotif = (n: Notification) => {
    setNotifOpen(false);
    if (!n.read) markRead([n.id]);
    const l = n.link;
    if (l.kind === 'case' && l.id) setCaseId(l.id);
    else if (l.kind === 'rm') setRmOpen(true);
    else if (l.kind === 'wallet') go('wallet');
    else if (l.kind === 'profile' && isOwner) go('profile');
    else if (l.kind === 'whatsnew') go('whatsnew');
  };
  const agreementAction = async (type: 'download' | 'discussion' | 'termination') => {
    try {
      await api.agreementRequest(type);
      toast(type === 'termination'
        ? `Termination request sent. ${agent.rm.name} will call you before anything changes.`
        : `Request sent to ${agent.rm.name}. You'll hear back within one business day.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Request failed');
    }
  };
  const removeMember = async (m: TeamMember) => {
    if (!confirm(`Remove ${m.name} from your team?`)) return;
    try {
      await api.removeMember(m.id);
      toast(`${m.name} can no longer sign in to your account.`);
      team.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove member');
    }
  };
  const openCase = (c: Case) => { setPanelId(c.id); setCaseId(c.id); };

  return (
    <>
      <div className="dash pt" id="dashRoot">
        {/* ===== SIDEBAR ===== */}
        <aside className={`dash-side${sideOpen ? ' open' : ''}`} id="dashSide">
          <div className="s-brand">
            <Link to="/"><img src="/img/universe-logo.png" alt="UniVerse" /><span className="portal-tag">Partner Portal</span></Link>
          </div>
          <nav className="s-nav">
            {NAV.map(([label, items]) => (
              <div key={label} style={{ display: 'contents' }}>
                {items.some(sees) ? <span className="lbl">{label}</span> : null}
                {items.filter(sees).map((v) => (
                  <button key={v} className={`s-link${view === v ? ' active' : ''}`} onClick={() => go(v)}>
                    <Svg html={I[v]} />{NAV_LABEL[v] ?? TITLES[v]}
                    {v === 'whatsnew' && freshCount ? <span className="wn-badge">{freshCount}</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="s-foot">
            <button className="s-rm" type="button" aria-label="Chat with your Relationship Manager" onClick={() => setRmOpen(true)}>
              <span className="av">{initials(agent.rm.name)}</span>
              <div><b>{agent.rm.name}</b><span>Relationship Manager · Chat</span></div>
              <Svg html={I.chat} />
            </button>
          </div>
        </aside>

        {/* ===== TOPBAR ===== */}
        <header className="dash-top">
          <button className="icon-btn menu-fab" aria-label="Menu" onClick={() => setSideOpen(!sideOpen)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="page-ttl-wrap"><span className="page-ttl">{TITLES[view]}</span><span className="page-date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          <span className="sp"></span>
          <div className="dash-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="search" placeholder="Search students…" aria-label="Search students" value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value && view !== 'students' && view !== 'requests') go('students'); }} />
          </div>
          {can('create') && view !== 'overview' ? <button className="btn btn-primary btn-sm top-cta" onClick={() => setRefer({ open: true })}>+ Request a service</button> : null}
          <button className="icon-btn" aria-label="Notifications" aria-expanded={notifOpen} onClick={toggleNotifs}><Svg html={I.bell} />{unread ? <span className="count-n">{unread > 9 ? '9+' : unread}</span> : null}</button>
          <div className="user-chip" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setNotifOpen(false); setMenuOpen(!menuOpen); }}>
            <Avatar name={myName} photo={member ? member.avatar : agent.avatar} /><b>{myName}</b>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </header>
        <div className={`user-menu notif-menu${notifOpen ? ' open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="nm-head nm-row">
            <div><b>Notifications</b><span>{unread ? `${unread} unread` : 'All caught up'}</span></div>
            {unread ? <button type="button" className="nm-all" onClick={() => markRead('all')}>Mark all read</button> : null}
          </div>
          {notifs.length ? notifs.map((n) => (
            <button key={n.id} className={n.read ? '' : 'fresh'} onClick={() => openNotif(n)}>
              <span className="nm-who">{NOTIF_LABEL[n.category] ?? 'Update'} · {fmtTime(n.createdAt)}</span>
              <span className="nm-title">{n.title}</span>
              <span className="nm-text">{n.body}</span>
            </button>
          )) : <p className="nm-empty">No notifications yet. Case updates, replies and payments will show up here.</p>}
          {isOwner ? <button type="button" className="nm-foot" onClick={() => { setNotifOpen(false); go('profile'); }}>Notification settings</button> : null}
        </div>
        <div className={`user-menu${menuOpen ? ' open' : ''}`}>
          {member ? <div className="nm-head"><b>{member.name}</b><span>{member.role} · {agent.agency || agent.name}</span></div> : null}
          {isOwner ? <button onClick={() => go('profile')}><Svg html={I.profile} />My profile</button> : null}
          {sees('wallet') ? <button onClick={() => go('wallet')}><Svg html={I.wallet} />My wallet</button> : null}
          <button onClick={() => setPhotoOpen(true)}><Svg html={I.profile} />Profile photo</button>
          <button onClick={() => setPwOpen(true)}><Svg html={I.key} />Change password</button>
          <button onClick={() => { signOut(); toast("You've been signed out."); navigate('/partner-login'); }}><Svg html={I.logout} />Log out</button>
        </div>

        {/* ===== MAIN ===== */}
        <main className="dash-main">
          {view === 'overview' && (
            <section className="view active ov">
              <div className="ov-hello">
                <div>
                  <h1>{greeting()}, {myName.split(' ')[0]}</h1>
                  <p>{stats ? `${stats.activeCases} case${stats.activeCases === 1 ? '' : 's'} in progress${analytics.data?.totals.docsNeeded ? ` · ${analytics.data.totals.docsNeeded} document${analytics.data.totals.docsNeeded === 1 ? '' : 's'} waiting on you` : ''}` : 'Loading your figures…'}</p>
                </div>
                <div className="ov-actions">
                  {can('create') && sees('students') ? <button className="btn btn-ghost" onClick={() => setAddStudentOpen(true)}>Add student</button> : null}
                  {can('create') ? <button className="btn btn-primary" onClick={() => setRefer({ open: true })}>Request a service</button> : null}
                </div>
              </div>

              <div className="ov-hero">
                {sees('wallet') ? (
                  <div className="ov-wallet">
                    <svg className="ov-orbit" viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
                      <defs><radialGradient id="ovGlow" cx="100%" cy="0%" r="90%"><stop offset="0" stopColor="#13BBF9" stopOpacity=".55" /><stop offset="1" stopColor="#13BBF9" stopOpacity="0" /></radialGradient></defs>
                      <rect width="300" height="200" fill="url(#ovGlow)" />
                      <circle cx="290" cy="-20" r="110" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="20" />
                      <circle cx="290" cy="-20" r="160" fill="none" stroke="#13BBF9" strokeOpacity=".7" strokeWidth="1.2" />
                    </svg>
                    <span className="ov-k">Wallet balance</span>
                    <b className="ov-v">{stats ? inr(stats.balance ?? 0) : '–'}</b>
                    <div className="ov-split">
                      <div><span>Earned in {month}</span><b>{stats ? inr(stats.monthEarnings ?? 0) : '–'}</b></div>
                      <div><span>Clearing</span><b>{wallet.data ? inr(wallet.data.pending) : '–'}</b></div>
                    </div>
                    {wallet.data ? (
                      <span className="ov-payto">
                        <Svg html={I.wallet} />
                        {wallet.data.methods.find((m) => m.isDefault) ? `Payouts go to ${wallet.data.methods.find((m) => m.isDefault)!.label}` : 'Add a UPI ID or bank account in the wallet to withdraw'}
                      </span>
                    ) : null}
                    <div className="ov-btns">
                      {can('withdraw') ? <button className="ov-btn light" onClick={() => setWithdrawOpen(true)}>Withdraw</button> : null}
                      <button className="ov-btn" onClick={() => go('wallet')}>View wallet</button>
                    </div>
                  </div>
                ) : null}

                <div className="ov-card">
                  <div className="ov-card-h"><span>Case pipeline</span>{sees('requests') ? <button className="link-btn" onClick={() => go('requests')}>All cases</button> : null}</div>
                  <b className="ov-big">{analytics.data?.totals.open ?? stats?.activeCases ?? '–'}<small> open</small></b>
                  {analytics.data ? (
                    <>
                      <div className="ov-pipe" role="img" aria-label={PIPE.map((x) => `${x.label}: ${analytics.data!.byStatus[x.key]}`).join(', ')}>
                        {PIPE.filter((x) => analytics.data!.byStatus[x.key]).map((x) => <span key={x.key} style={{ flex: analytics.data!.byStatus[x.key], background: x.color }} />)}
                        {!analytics.data.totals.cases ? <span style={{ flex: 1, background: 'var(--line)' }} /> : null}
                      </div>
                      <ul className="ov-legend">
                        {PIPE.map((x) => <li key={x.key}><i style={{ background: x.color }} />{x.label}<b>{analytics.data!.byStatus[x.key]}</b></li>)}
                      </ul>
                    </>
                  ) : <div className="adm-skel" style={{ height: 70 }} />}
                </div>

                <div className="ov-card">
                  <div className="ov-card-h"><span>Needs your attention</span></div>
                  <ul className="ov-todo">
                    <li onClick={() => sees('requests') && go('requests')}>
                      <i className="t-amber"><Svg html={I.doc} /></i>
                      <div><b>{analytics.data?.totals.docsNeeded ?? '–'} documents to upload</b><span>Cases can't move until these are in</span></div>
                    </li>
                    <li onClick={() => sees('requests') && go('requests')}>
                      <i className="t-red"><Svg html={I.requests} /></i>
                      <div><b>{analytics.data?.byStatus['On Hold'] ?? '–'} cases on hold</b><span>Check the case chat for what's needed</span></div>
                    </li>
                    <li onClick={(e) => toggleNotifs(e)}>
                      <i className="t-blue"><Svg html={I.bell} /></i>
                      <div><b>{unread} unread notification{unread === 1 ? '' : 's'}</b><span>Replies, payments and updates</span></div>
                    </li>
                  </ul>
                </div>
              </div>

              {analytics.data ? (
                <div className="ov-kpis">
                  <Kpi label="Completion rate" value={analytics.data.totals.completionRate === null ? '–' : `${Math.round(analytics.data.totals.completionRate * 100)}%`} hint={`${analytics.data.totals.completed} of ${analytics.data.totals.cases} cases done`} />
                  <Kpi label="Average time to complete" value={analytics.data.totals.avgDaysToComplete === null ? '–' : analytics.data.totals.avgDaysToComplete < 1 ? 'Under a day' : `${Math.round(analytics.data.totals.avgDaysToComplete)} days`} hint="From request to payout step" />
                  <Kpi label="Students" value={String(analytics.data.totals.students)} hint={`${analytics.data.monthly[analytics.data.monthly.length - 1]?.count ?? 0} new requests in ${month}`} />
                  {sees('wallet') && analytics.data.money ? <Kpi label="Earned so far" value={inr(analytics.data.money.lifetime)} hint="Cleared commissions" /> : <Kpi label="Documents in review" value={String(analytics.data.totals.docsInReview)} hint="Being checked by the desk" />}
                </div>
              ) : null}

              {analytics.data ? (
                <div className="d-grid pa-grid">
                  <div className="panel">
                    <div className="panel-h"><h3>Requests per month</h3><span className="t-sub">Last 6 months</span></div>
                    <div className="panel-b"><Columns data={analytics.data.monthly.map((m) => ({ label: monthLabel(m.month), value: m.count }))} color="#0A66C2" unit="cases" /></div>
                  </div>
                  {sees('wallet') && analytics.data.money ? (
                    <div className="panel">
                      <div className="panel-h"><h3>Earnings per month</h3><span className="t-sub">Last 6 months</span></div>
                      <div className="panel-b"><Columns data={analytics.data.money.monthly.map((m) => ({ label: monthLabel(m.month), value: m.amount }))} color="#13BBF9" money /></div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="d-grid ov-grid">
                <div className="panel">
                  <div className="panel-h"><h3>Recent cases</h3>{sees('requests') ? <button className="btn btn-ghost btn-sm" onClick={() => go('requests')}>View all</button> : null}</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                      <thead><tr><th>Case</th><th>Student</th><th>Service</th><th>Progress</th><th>Status</th></tr></thead>
                      <tbody>
                        {caseList.slice(0, 6).map((c) => (
                          <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openCase(c)}>
                            <td className="t-mono">{c.ref}</td>
                            <td><div className="t-name">{c.student.name}</div><div className="t-sub">{c.student.country}</div></td>
                            <td>{c.serviceName}</td>
                            <td><Prog v={c.progress} /></td>
                            <td><span className={`status ${statusClass(c.status)}`}>{c.status}</span></td>
                          </tr>
                        ))}
                        {cases.data && !caseList.length ? <tr><td colSpan={5} className="empty-row">No cases yet. Request a service for a student to get started.</td></tr> : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-h"><h3>Service mix</h3><span className="t-sub">All cases</span></div>
                  <Donut mix={dash.data?.mix ?? []} />
                </div>
              </div>

              {can('create') && sees('services') ? (
                <div className="panel">
                  <div className="panel-h"><h3>Services you can offer</h3><button className="btn btn-ghost btn-sm" onClick={() => go('services')}>Details</button></div>
                  <div className="ov-svcs">
                    {visibleServices().map((sv) => {
                      const rate = comms.data?.rates.find((r) => r.key === sv.key);
                      return (
                        <button key={sv.key} className="ov-svc" onClick={() => setRefer({ open: true, svc: sv.key })}>
                          <span className="ov-svc-ic"><Svg html={sv.icon} /></span>
                          <span className="ov-svc-t"><b>{sv.name}</b><small>{rate ? `Earn ${rate.amount}` : sv.tat}</small></span>
                          <span className="ov-svc-go">Request →</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {view === 'whatsnew' && (
            <section className="view active" id="view-whatsnew">
              <div className="sec-head" style={{ textAlign: 'left', marginBottom: '1.4rem' }}>
                <span className="eyebrow">Insights</span>
                <h2 style={{ fontSize: '1.5rem' }}>What's New at UniVerse</h2>
                <p style={{ marginTop: '.4rem' }}>Guides, rate changes and market notes from our specialist desks. Share them with your students.</p>
              </div>
              <div className="wn-toolbar">
                {['all', ...new Set(FEED.map((b) => b.svc))].map((c) => (
                  <button key={c} className={`chip-btn${wnFilter === c ? ' active' : ''}`} onClick={() => setWnFilter(c)}>{c === 'all' ? 'All services' : serviceName(c)}</button>
                ))}
              </div>
              <div className="blog-list">
                {FEED.filter((b) => wnFilter === 'all' || b.svc === wnFilter).map((b, i) => (
                  <BlogItem key={b.t} tag={b.svcName} date={fmtBlogDate(b.d)} mins={b.mins} title={b.t} teaser={b.teaser} body={b.body} open={i === 0} isNew={isFresh(b.d, 14)} />
                ))}
              </div>
            </section>
          )}

          {view === 'students' && (
            <section className="view active">
              <div className="panel">
                <div className="panel-h" style={{ flexWrap: 'wrap', gap: '.8rem' }}>
                  <h3>All students</h3>
                  <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ font: '500 .84rem var(--font)', padding: '.55rem .8rem', border: '1px solid var(--line-strong)', borderRadius: 999, background: 'var(--surface)', color: 'var(--navy)' }}>
                      <option value="">All statuses</option><option>In Progress</option><option>Pending</option><option>Completed</option><option>On Hold</option>
                    </select>
                    {can('create') ? <button className="btn btn-ghost btn-sm" onClick={() => setImportOpen(true)}>Import from Excel</button> : null}
                    {can('create') ? <button className="btn btn-primary btn-sm" onClick={() => setAddStudentOpen(true)}>+ Add student</button> : null}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>ID</th><th>Student</th><th>Country</th><th>Service</th><th>Status</th><th>Progress</th><th>Referred</th></tr></thead>
                    <tbody>
                      {filteredStudents.map((s) => {
                        const latest = s.requests[s.requests.length - 1];
                        return (
                          <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setStudentId(s.id)} title={`Open ${s.name}'s record`}>
                            <td>{s.code}</td>
                            <td><div className="t-name">{s.name}</div><div className="t-sub">{s.phone}</div></td>
                            <td>{s.country}</td>
                            <td>{latest ? serviceName(latest.service) : <span className="t-sub">No services yet</span>}{s.requests.length > 1 ? <span className="t-sub"> +{s.requests.length - 1} more</span> : null}</td>
                            <td>{latest ? <span className={`status ${statusClass(latest.status)}`}>{latest.status}</span> : null}</td>
                            <td>{latest ? <Prog v={latest.progress} /> : null}</td>
                            <td>{fmtDate(s.createdAt)}</td>
                          </tr>
                        );
                      })}
                      {students.data && !filteredStudents.length ? (
                        <tr><td colSpan={7} className="empty-row">{studentList.length ? 'No students match your filters.' : 'No students yet. Add one, or import your list from Excel.'}</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {view === 'requests' && (
            <section className="view active">
              <div className="d-grid" style={{ gridTemplateColumns: '1.15fr .85fr' }}>
                <div className="panel">
                  <div className="panel-h"><h3>Service requests</h3></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                      <thead><tr><th>Ref</th><th>Student</th><th>Service</th><th>Status</th><th>Progress</th><th></th></tr></thead>
                      <tbody>
                        {filteredCases.map((c) => (
                          <tr key={c.id} data-idx={c.id} onClick={() => openCase(c)}>
                            <td>{c.ref}</td>
                            <td className="t-name" style={{ fontWeight: 600 }}>{c.student.name}</td>
                            <td>{c.serviceName}</td>
                            <td><span className={`status ${statusClass(c.status)}`}>{c.status}</span></td>
                            <td><Prog v={c.progress} /></td>
                            <td><button className="open-btn">Open</button></td>
                          </tr>
                        ))}
                        {cases.data && !filteredCases.length ? (
                          <tr><td colSpan={6} className="empty-row">{caseList.length ? 'No requests match your search.' : 'No service requests yet.'}</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="panel" id="latestCase">
                  {panelCase ? (
                    <>
                      <div className="panel-h"><h3>{panelCase.id === caseList[0]?.id ? 'Latest case' : 'Case'} · {panelCase.ref}</h3><span className={`status ${statusClass(panelCase.status)}`}>{panelCase.status}</span></div>
                      <div className="panel-b">
                        <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', marginBottom: '1.2rem' }}>
                          {panelCase.serviceName} · <b style={{ color: 'var(--navy)' }}>{panelCase.student.name}</b> · {panelCase.student.country}
                        </p>
                        <div className="req-timeline">
                          {buildTimeline(panelCase).map((st) => (
                            <div key={st.title} className={`tl-item${st.done ? ' done' : ''}${st.now ? ' now' : ''}`}>
                              <span className="tl-dot">{st.done ? <Svg html={I.check} /> : st.now ? '…' : ''}</span>
                              <div><b>{st.title}</b><span>{st.sub}</span></div>
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-primary btn-sm case-panel-cta" onClick={() => setCaseId(panelCase.id)}>Open case: chat &amp; documents</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="panel-h"><h3>Latest case</h3></div>
                      <div className="empty-state">Your case timeline appears here once you refer a student.<br /><br />
                        {can('create') ? <button className="btn btn-primary btn-sm" onClick={() => setRefer({ open: true })}>+ Refer a student</button> : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'services' && (
            <section className="view active">
              <div className="sec-head" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                <span className="eyebrow">Marketplace</span>
                <h2 style={{ fontSize: '1.5rem' }}>Refer into any service</h2>
                <p style={{ marginTop: '.4rem' }}>Pick a service, submit the student's basics and our specialist desks take over.</p>
              </div>
              <div className="comm-grid">{visibleServices().map((s) => <SvcTile key={s.key} k={s.key} label="Refer a student" onRefer={can('create') ? (svc) => setRefer({ open: true, svc }) : undefined} />)}</div>
            </section>
          )}

          {view === 'wallet' && (
            <section className="view active">
              <div className="wallet-hero">
                <div>
                  <div className="wh-lbl">Available Balance</div>
                  <div className="wh-amt">{wallet.data ? inr(wallet.data.balance) : '–'}</div>
                </div>
                <div className="wh-meta">
                  <div className="wh-m"><b>{wallet.data ? inr(wallet.data.pending) : '–'}</b><span>Pending clearance</span></div>
                  <div className="wh-m"><b>{wallet.data ? inr(wallet.data.lifetime) : '–'}</b><span>Lifetime earnings</span></div>
                </div>
                {can('withdraw') ? <button className="btn btn-green btn-lg" onClick={() => setWithdrawOpen(true)}>Withdraw Funds</button> : null}
              </div>
              <div className="panel" style={{ marginBottom: '1.4rem' }}>
                <div className="panel-h">
                  <h3>Receive money to</h3>
                  {isOwner && (wallet.data?.methods.length ?? 0) < 5 ? <button className="btn btn-ghost btn-sm" onClick={() => setMethodOpen(true)}>+ Add UPI or bank</button> : null}
                </div>
                <div className="panel-b">
                  {wallet.data?.methods.length ? (
                    <div className="pm-list">
                      {wallet.data.methods.map((m) => (
                        <div key={m.id} className="pm-card">
                          <div>
                            <b>{m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`}</b>
                            <small>{m.type === 'upi' ? 'UPI' : `${m.holder} · ${m.ifsc}${m.branch ? ` · ${m.branch}` : ''}`}</small>
                          </div>
                          {m.isDefault ? <span className="status done">Default</span> : isOwner ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => api.setDefaultPayoutMethod(m.id).then(wallet.reload).catch((e) => toast(e.message))}>Make default</button>
                          ) : null}
                          {isOwner ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              if (window.confirm('Remove this payout method?')) api.removePayoutMethod(m.id).then(wallet.reload).catch((e) => toast(e.message));
                            }}>Remove</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : <p className="adm-meta">{isOwner ? 'Add a UPI ID or bank account to receive withdrawals.' : 'Your account owner can add a UPI ID or bank account for withdrawals.'}</p>}
                </div>
              </div>
              <div className="panel">
                <div className="panel-h"><h3>Transaction history</h3></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {wallet.data?.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{fmtDate(t.date)}</td>
                          <td>
                            <div className="t-name" style={{ fontWeight: 500 }}>{t.type === 'Debit' ? `Withdrawal to ${t.method?.label ?? 'your account'}` : t.description}</div>
                            {t.payout?.utr ? <div className="t-sub">Bank reference {t.payout.utr}</div> : t.payout?.reason ? <div className="t-sub">{t.payout.reason}</div> : null}
                          </td>
                          <td><span className={`pill${t.type === 'Credit' ? ' ctry' : ''}`}>{t.type}</span></td>
                          <td style={{ fontWeight: 700, color: t.type === 'Credit' ? 'var(--green-deep)' : 'var(--ink)' }}>{t.type === 'Credit' ? '+' : '−'} {inr(t.amount)}</td>
                          <td><span className={`status ${statusClass(t.status)}`}>{t.type === 'Debit'
                            ? (t.status === 'Completed' ? 'Paid' : t.status === 'Rejected' ? 'Failed' : t.payout?.state === 'processing' ? 'On its way' : 'Requested')
                            : (t.status === 'Pending' ? 'Clearing' : t.status === 'Rejected' ? 'Cancelled' : t.kind === 'adjustment' ? 'Correction' : 'Credited')}</span></td>
                        </tr>
                      ))}
                      {wallet.data && !wallet.data.transactions.length ? (
                        <tr><td colSpan={5} className="empty-row">No transactions yet. Commissions show up here when a case reaches its payout step.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {view === 'commissions' && (
            <section className="view active">
              <div className="sec-head" style={{ textAlign: 'left', marginBottom: '1.6rem' }}>
                <span className="eyebrow">Payouts</span>
                <h2 style={{ fontSize: '1.5rem' }}>Commission structure, effective {SITE.commissionEffective}</h2>
                <p style={{ marginTop: '.4rem' }}>Credited to your wallet when a case reaches its payout step.</p>
              </div>
              <div className="comm-grid">
                {comms.data?.rates.map((r) => (
                  <div className="comm-card" key={r.key}>
                    <div className="cc-top"><span className="cc-ic"><Svg html={serviceByKey(r.key)?.icon ?? ''} /></span><h3 style={{ fontSize: '.95rem' }}>{r.name}</h3></div>
                    <b className="cc-amt">{r.amount}</b>
                    <span className="cc-note">{r.note}</span>
                  </div>
                ))}
              </div>
              <div className="panel" style={{ marginTop: '1.4rem' }}>
                <div className="panel-h"><h3>Commission Structure History</h3><span className="link" style={{ fontSize: '.8rem', color: 'var(--ink-soft)' }}>Current vs previous</span></div>
                <div className="panel-b comm-history">
                  {comms.data?.history.map((h) => (
                    <article className={`ch-card ${h.id}`} key={h.id}>
                      <div className="ch-top">
                        <h4>{h.id === 'current' ? 'Current Commission Structure' : 'Previous Commission Structure'}</h4>
                        <span className="ch-meta">Effective: {h.effective} <span className={`status ${h.status === 'Active' ? 'done' : 'hold'}`}>{h.status}</span></span>
                      </div>
                      <ul className="ch-list">{h.items.slice(0, 5).map(([n, v]) => <li key={n}><span className="svc">{n}</span><b>{v}</b></li>)}</ul>
                      <button className="btn btn-ghost btn-sm" onClick={() => setCommEntry({ ...h, title: h.id === 'current' ? 'Current Commission Structure' : 'Previous Commission Structure' })}>View Details</button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {view === 'profile' && (
            <section className="view active">
              <div className="d-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="panel">
                  <div className="panel-h"><h3>Agent profile</h3><button className="btn btn-ghost btn-sm" onClick={() => setProfileOpen(true)}>Edit</button></div>
                  <div className="panel-b">
                    <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'center', marginBottom: '1.4rem' }}>
                      <button type="button" className="photo-btn" onClick={() => setPhotoOpen(true)} title="Change profile photo" aria-label="Change profile photo">
                        <Avatar name={agent.name} photo={agent.avatar} size={58} radius="16px" className="profile-av" />
                        <span className="photo-edit">Edit</span>
                      </button>
                      <div>
                        <h3 style={{ fontSize: '1.2rem' }}>{agent.name}</h3>
                        <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)' }}>
                          Partner since {new Date(agent.partnerSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} ·{' '}
                          <span className={`status ${agent.verified ? 'done' : 'pend'}`}>{agent.verified ? 'Verified' : 'Verification pending'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="form-grid" style={{ gap: '.9rem 1.2rem' }}>
                      <ProfileField label="Agency" value={agent.agency} />
                      <ProfileField label="Zone" value={`${agent.zone[0]}${agent.zone.slice(1).toLowerCase()}${agent.city ? `, ${agent.city}` : ''}`} />
                      <ProfileField label="Email" value={agent.email} />
                      <ProfileField label="Phone" value={agent.phone} />
                      <ProfileField label="Payouts go to" value={wallet.data?.methods.find((m) => m.isDefault)?.label ?? 'Not added yet (Wallet)'} />
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-h"><h3>Data protection</h3></div>
                  <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <ProtectRow ic="g" icon={I.lock} title="Ring-fenced records" text="Your student data is visible only to you, your team and the desk working the case. Other consultants never see it." />
                    <ProtectRow ic="b" icon={I.shield} title="Bank-grade encryption" text="AES-256 at rest, TLS 1.3 in transit, with full audit trails on every record access." />
                    <ProtectRow ic="n" icon={I.profile} title="Dedicated RM" text={`${agent.rm.name} · ${agent.rm.email} · ${agent.rm.phone}. Replies within one business day.`} />
                  </div>
                </div>
              </div>

              <NotificationSettings />

              <div className="panel" style={{ marginTop: '1.4rem' }}>
                <div className="panel-h"><h3>Partner agreement</h3><span className="status done">Active</span></div>
                <div className="panel-b">
                  <div className="agree-card" style={{ position: 'relative' }}>
                    <span className="agree-stamp">SIGNED</span>
                    <span className="agree-ic"><Svg html={I.doc} /></span>
                    <div style={{ flex: 1 }}>
                      <h4>Channel Partner Agreement: {agent.agency || agent.name}</h4>
                      <div className="agree-meta">
                        <span>Agreement No. <b>{agent.agreement.number || '—'}</b></span>
                        <span>Signed on <b>{fmtDate(agent.agreement.signedAt)}</b></span>
                        <span>Valid till <b>{agent.agreement.validTill ? fmtDate(agent.agreement.validTill) : '—'}</b></span>
                        <span>Auto-renewal <b>{agent.agreement.autoRenew ? 'On' : 'Off'}</b></span>
                      </div>
                      <div className="agree-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => setAgrOpen(true)}>View Signed Copy</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => agreementAction('download')}>Request Download</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => agreementAction('discussion')}>Request Discussion</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#C0392B', borderColor: 'rgba(192,57,59,.4)' }}
                          onClick={() => confirm('Send a termination request to UniVerse? A senior manager will contact you before anything changes.') && agreementAction('termination')}>Request Termination</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === 'users' && (
            <section className="view active">
              <div className="sec-head" style={{ textAlign: 'left', marginBottom: '1.4rem' }}>
                <span className="eyebrow">Team Access</span>
                <h2 style={{ fontSize: '1.5rem' }}>User Management</h2>
                <p style={{ marginTop: '.4rem' }}>Create logins for your team and control exactly what each member can see and do on this account.</p>
              </div>
              <div className="panel">
                <div className="panel-h"><h3>Team members</h3><button className="btn btn-primary btn-sm" onClick={() => setUserModal({ open: true, member: null })}>+ Add Team Member</button></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Member</th><th>Role</th><th>Menu access</th><th>Case permissions</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      <TeamRow name={agent.name} email={agent.email} role="Owner" status="Active" menus={MENU_LIST.map((m) => m[0])} perms={PERM_LIST.map((p) => p[0])} owner />
                      {team.data?.map((m) => (
                        <TeamRow key={m.id} {...m} onEdit={() => setUserModal({ open: true, member: m })} onRemove={() => removeMember(m)} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ padding: '0 1.2rem 1.1rem', fontSize: '.76rem', color: 'var(--ink-soft)' }}>
                  Only you, the account owner, can add members or change what they can do. Members sign in at the partner login with their work email and the password you set, and show as <b>Pending</b> until their first sign-in.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ===== DIALOGS ===== */}
      <ReferModal open={refer.open} presetService={refer.svc} onClose={() => setRefer({ open: false })} onDone={(c) => { refreshCases(); setPanelId(c.id); }} />
      <WithdrawModal open={withdrawOpen} wallet={wallet.data} isOwner={isOwner}
        onClose={() => setWithdrawOpen(false)} onDone={() => { wallet.reload(); dash.reload(); }} onAddMethod={() => setMethodOpen(true)} />
      <PayoutMethodModal open={methodOpen} onClose={() => setMethodOpen(false)} onDone={wallet.reload} />
      <AddStudentModal open={addStudentOpen} onClose={() => setAddStudentOpen(false)} onDone={() => { students.reload(); dash.reload(); }} />
      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => { students.reload(); dash.reload(); }} />
      <CaseModal caseId={caseId} agent={agent} myName={myName} isOwner={isOwner} canChat={can('chat')} canUpload={can('upload')} onClose={() => setCaseId(null)} onChanged={refreshCases} onOpenRm={() => setRmOpen(true)} />
      <CommModal entry={commEntry} onClose={() => setCommEntry(null)} />
      <AgreementModal open={agrOpen} agent={agent} onClose={() => setAgrOpen(false)} onDownload={() => agreementAction('download')} />
      <ProfileModal open={profileOpen} agent={agent} onClose={() => setProfileOpen(false)} onSaved={setAgent} />
      <UserModal open={userModal.open} member={userModal.member} onClose={() => setUserModal({ open: false, member: null })} onSaved={team.reload} />
      <StudentModal student={studentList.find((s) => s.id === studentId) ?? null} canEdit={can('edit')} canCreate={can('create')} onClose={() => setStudentId(null)}
        onChanged={(s: Student) => { students.setData((list) => (list ?? []).map((x) => (x.id === s.id ? s : x))); refreshCases(); }} />
      <RmDrawer open={rmOpen} agent={agent} myName={myName} isOwner={isOwner} canChat={can('chat')} onClose={() => { setRmOpen(false); loadNotifs(); }} />
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <PhotoModal open={photoOpen} name={myName} photo={(member ? member.avatar : agent.avatar) ?? ''} onClose={() => setPhotoOpen(false)} onSaved={setAgent} />
    </>
  );
}

/* ---------- small pieces ---------- */
/* Case status colours, the same set as the app (always shown with their label) */
const PIPE = [
  { key: 'In Progress', label: 'In progress', color: '#13BBF9' },
  { key: 'Pending', label: 'Pending', color: '#F59E0B' },
  { key: 'On Hold', label: 'On hold', color: '#EF4444' },
  { key: 'Completed', label: 'Done', color: '#22C55E' },
] as const;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const Kpi = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <div className="ov-kpi"><span>{label}</span><b>{value}</b><small>{hint}</small></div>
);

const Prog = ({ v }: { v: number }) => (
  <div className="prog-wrap"><div className="prog-track"><div className="prog-fill" style={{ width: `${v}%` }}></div></div><span>{v}%</span></div>
);

function SvcTile({ k, label, onRefer }: { k: string; label: string; onRefer?: (k: string) => void }) {
  const s = serviceByKey(k);
  if (!s) return null;
  const partnerLine = s.partners.slice(0, 3).join(' · ') + (s.partners.length > 3 ? ` +${s.partners.length - 3} more` : '');
  return (
    <article className="comm-card svc-tile">
      <div className="cc-top"><span className="cc-ic"><Svg html={s.icon} /></span><h3 style={{ fontSize: '.95rem' }}>{s.name}</h3></div>
      <p style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>{s.short}</p>
      <div className="mk-row">{s.kpis.map(([v, l]) => <span className="mk" key={l}>{v} · {l}</span>)}</div>
      <ul className="ft-mini">{s.feats.slice(0, 2).map((f) => <li key={f}>{f}</li>)}</ul>
      <div className="svc-meta"><span className="pill tat">{s.tat}</span><span className="pill ctry">{s.countries}</span></div>
      <p className="pt-line"><b>Partners:</b> {partnerLine}</p>
      {onRefer ? <button className="btn btn-primary btn-sm" style={{ marginTop: '.35rem' }} onClick={() => onRefer(k)}>{label}</button> : null}
    </article>
  );
}

const DONUT_COLORS = ['#0A66C2', '#2FA84F', '#0B2440', '#13BBF9', '#7BD795', '#F59E0B', '#5B6E84', '#B09DFF', '#0FA3B1'];
function Donut({ mix }: { mix: { key: string; name: string; count: number }[] }) {
  const total = mix.reduce((n, m) => n + m.count, 0);
  const C = 2 * Math.PI * 15.9155;
  let off = 0;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg width="168" height="168" viewBox="0 0 42 42">
          {total ? mix.map((m, i) => {
            const frac = m.count / total;
            const seg = (
              <circle key={m.key} r="15.9155" cx="21" cy="21" fill="transparent" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="5.2"
                strokeDasharray={`${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`} strokeDashoffset={(-off * C).toFixed(2)} strokeLinecap="round">
                <title>{m.name}: {m.count}</title>
              </circle>
            );
            off += frac;
            return seg;
          }) : <circle r="15.9155" cx="21" cy="21" fill="transparent" stroke="var(--line)" strokeWidth="5.2" />}
        </svg>
        <div className="hole"><div><b>{total}</b><br /><span>cases</span></div></div>
      </div>
      <div className="legend">
        {mix.length ? mix.map((m, i) => (
          <div className="lg" key={m.key}><span className="sw" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>{m.name}<b>{m.count}</b></div>
        )) : <div className="lg" style={{ color: 'var(--ink-soft)' }}>Your service mix appears here once you have cases.</div>}
      </div>
    </div>
  );
}

const ProfileField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={{ font: '700 .7rem var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</div>
    <p style={{ fontWeight: 600, color: 'var(--navy)', wordBreak: 'break-word' }}>{value || '—'}</p>
  </div>
);

const ProtectRow = ({ ic, icon, title, text }: { ic: string; icon: string; title: string; text: string }) => (
  <div style={{ display: 'flex', gap: '.9rem' }}>
    <span className={`dc-ic ${ic}`} style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}><Svg html={icon} /></span>
    <div><b style={{ color: 'var(--navy)' }}>{title}</b><p style={{ fontSize: '.85rem', color: 'var(--ink-soft)' }}>{text}</p></div>
  </div>
);

function TeamRow({ name, email, role, status, menus, perms, owner, lastLoginAt, onEdit, onRemove }: {
  name: string; email: string; role: string; status: string; menus: string[]; perms: string[]; owner?: boolean; lastLoginAt?: string | null; onEdit?: () => void; onRemove?: () => void;
}) {
  const MENU_SHORT: Record<string, string> = { overview: 'Overview', whatsnew: "What's New", students: 'Students', requests: 'Requests', services: 'Services', wallet: 'Wallet', commissions: 'Commissions' };
  const PERM_SHORT: Record<string, string> = { create: 'Create requests', chat: 'Chat with desk', upload: 'Upload documents', edit: 'Edit students', withdraw: 'Withdrawals' };
  return (
    <tr>
      <td><div className="t-name">{name}{owner ? <> <span className="pill ctry" style={{ fontSize: '.62rem', verticalAlign: 'middle' }}>You</span></> : null}</div><div className="t-sub">{email}</div></td>
      <td><span className={`role-pill role-${role.toLowerCase()}`}>{role}</span></td>
      <td><div className="perm-chips">{Object.entries(MENU_SHORT).map(([k, l]) => <span key={k} className={`pill ${menus.includes(k) ? 'ctry' : 'off'}`}>{l}</span>)}</div></td>
      <td><div className="perm-chips" style={{ maxWidth: 220 }}>{perms.length ? perms.map((k) => <span key={k} className="pill tat">{PERM_SHORT[k]}</span>) : <span className="pill off">None</span>}</div></td>
      <td>
        <span className={`status ${status === 'Active' ? 'done' : 'pend'}`}>{status}</span>
        {lastLoginAt ? <div className="t-sub" style={{ marginTop: '.3rem' }}>Last sign-in {fmtDate(lastLoginAt)}</div> : null}
      </td>
      <td>
        {owner ? <span className="hint" style={{ fontSize: '.72rem' }}>Full access</span> : (
          <div className="um-actions">
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="btn btn-ghost btn-sm" style={{ color: '#C0392B' }} onClick={onRemove}>Remove</button>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ---------- push and email per category (in-app is always on) ---------- */
function NotificationSettings() {
  const prefs = useApi(api.notificationPrefs, []);
  const [list, setList] = useState<import('../lib/api').NotificationPref[] | null>(null);
  const rows = list ?? prefs.data;
  const toggle = async (key: Notification['category'], channel: 'push' | 'email', value: boolean) => {
    if (!rows) return;
    const before = rows;
    setList(rows.map((p) => (p.key === key ? { ...p, [channel]: value } : p)));
    try { setList(await api.saveNotificationPrefs({ [key]: { [channel]: value } })); } catch { setList(before); }
  };
  return (
    <div className="panel" style={{ marginTop: '1.4rem' }}>
      <div className="panel-h"><h3>Notifications</h3><span className="t-sub">Every notification shows in the portal and the app</span></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl notif-prefs">
          <thead><tr><th>Kind</th><th>Phone (app)</th><th>Email</th></tr></thead>
          <tbody>
            {rows?.map((p) => (
              <tr key={p.key}>
                <td><div className="t-name">{p.label}</div><div className="t-sub">{p.description}</div></td>
                <td><input type="checkbox" className="switch" checked={p.push} onChange={(e) => toggle(p.key, 'push', e.target.checked)} aria-label={`${p.label} on phone`} /></td>
                <td><input type="checkbox" className="switch" checked={p.email} onChange={(e) => toggle(p.key, 'email', e.target.checked)} aria-label={`${p.label} by email`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
