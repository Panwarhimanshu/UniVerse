import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Menu, Perm, TeamMember } from '../lib/api';
import { fmtDate, fmtTime, inr, statusClass } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { Avatar, errMsg, Modal } from '../dashboard/modals';
import { adminApi } from './api';
import type { PartnerFull } from './api';

/* Master admin: a partner's whole account in one place — photo, details, RM, agreement, wallet, team and access. */

type Tab = 'overview' | 'details' | 'agreement' | 'wallet' | 'team' | 'access';
const TABS: [Tab, string][] = [
  ['overview', 'Overview'], ['details', 'Details'], ['agreement', 'Agreement'], ['wallet', 'Wallet'], ['team', 'Team'], ['access', 'Access'],
];
const MENU_LABEL: Record<Menu, string> = {
  overview: 'Overview', whatsnew: "What's new", students: 'Students', requests: 'Cases', services: 'Services', wallet: 'Wallet', commissions: 'Commissions',
};
const PERM_LABEL: Record<Perm, string> = { create: 'Create cases', chat: 'Chat', upload: 'Upload documents', edit: 'Edit students', withdraw: 'Withdraw' };
const REQ_LABEL = { download: 'Signed copy', discussion: 'Call about the agreement', termination: 'Termination' } as const;
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
const okPhoto = (f: File) => {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return 'Choose a JPG, PNG or WebP photo';
  if (f.size > 2 * 1024 * 1024) return 'The photo must be 2 MB or smaller';
  return '';
};

/** A small "Change photo" control: a hidden file input behind a button */
function PhotoButton({ label, busy, onFile }: { label: string; busy: boolean; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) onFile(f);
      }} />
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{label}</button>
    </>
  );
}

const Card = ({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) => (
  <div className="pp-card">
    <div className="pp-card-h"><h4>{title}{hint ? <span className="hint">{hint}</span> : null}</h4>{action}</div>
    {children}
  </div>
);

export function PartnerManageModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [p, setP] = useState<PartnerFull | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState<{ who: string; password: string } | null>(null);

  const load = () => {
    if (!id) return;
    adminApi.partner(id).then(setP).catch((e) => toast(errMsg(e)));
  };
  useEffect(() => { setP(null); setTab('overview'); setTemp(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** runs a change, then reloads the profile and the partner list */
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast(done);
      load();
      onChanged();
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const photo = (f: File, member?: TeamMember) => {
    const bad = okPhoto(f);
    if (bad) return toast(bad);
    run(() => adminApi.partnerPhoto(p!.id, f, member?.id), member ? `Photo updated for ${member.name}` : 'Profile photo updated');
  };

  const open = p ? (p.cases['Pending'] ?? 0) + (p.cases['In Progress'] ?? 0) + (p.cases['On Hold'] ?? 0) : 0;
  const total = p ? Object.values(p.cases).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <Modal open={!!id} onClose={onClose} className="modal-xl">
      <div className="pp-head">
        <button className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
        {p ? (
          <>
            <div className="pp-id">
              <div className="pp-photo">
                <Avatar name={p.name} photo={p.avatar} size={84} radius="24px" className="pp-av" />
              </div>
              <div className="pp-who">
                <h3>{p.agency || p.name}</h3>
                <p>{p.name} · {p.email}{p.phone ? ` · ${p.phone}` : ''}</p>
                <div className="pp-badges">
                  <span className={`status ${p.verified ? 'done' : 'pend'}`}>{p.verified ? 'Verified' : 'Not verified'}</span>
                  {p.suspended ? <span className="status hold">Suspended</span> : <span className="status done">Active</span>}
                  <span className={`status ${p.agreement.status === 'Active' ? 'done' : 'hold'}`}>Agreement {p.agreement.status.toLowerCase()}</span>
                  <span className="pp-meta">{p.zone[0]}{p.zone.slice(1).toLowerCase()}{p.city ? ` · ${p.city}` : ''} · joined {fmtDate(p.partnerSince)}</span>
                </div>
              </div>
              <div className="pp-photo-actions">
                <PhotoButton label={p.avatar ? 'Change photo' : 'Add photo'} busy={busy} onFile={(f) => photo(f)} />
                {p.avatar ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => confirm('Remove the profile photo?') && run(() => adminApi.removePartnerPhoto(p.id), 'Photo removed')}>Remove</button> : null}
              </div>
            </div>
            <div className="pp-kpis">
              <div><b>{inr(p.wallet.balance)}</b><span>Wallet balance</span></div>
              <div><b>{inr(p.wallet.pending)}</b><span>Pending</span></div>
              <div><b>{inr(p.wallet.lifetime)}</b><span>Lifetime earnings</span></div>
              <div><b>{open} / {total}</b><span>Open / all cases</span></div>
              <div><b>{p.students}</b><span>Students</span></div>
              <div><b>{p.lastSeen ? fmtTime(p.lastSeen.at) : '—'}</b><span>Last active{p.lastSeen ? ` · ${p.lastSeen.platform}` : ''}</span></div>
            </div>
            <nav className="pp-tabs" role="tablist">
              {TABS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {label}{k === 'team' && p.team.length ? <em>{p.team.length}</em> : null}
                </button>
              ))}
            </nav>
          </>
        ) : <h3 style={{ color: '#fff' }}>Loading…</h3>}
      </div>

      {p ? (
        <div className="modal-body pp-body">
          {tab === 'overview' ? <Overview p={p} go={setTab} /> : null}
          {tab === 'details' ? <Details p={p} busy={busy} run={run} /> : null}
          {tab === 'agreement' ? <Agreement p={p} busy={busy} run={run} /> : null}
          {tab === 'wallet' ? <WalletTab p={p} busy={busy} run={run} /> : null}
          {tab === 'team' ? <Team p={p} busy={busy} run={run} photo={photo} onTemp={setTemp} /> : null}
          {tab === 'access' ? <Access p={p} busy={busy} run={run} onTemp={setTemp} onDeleted={() => { onChanged(); onClose(); }} /> : null}

          {temp ? (
            <div className="pp-temp" role="alert">
              <div>
                <b>Temporary password for {temp.who}</b>
                <p className="adm-temp" style={{ margin: '.4rem 0' }}>{temp.password}</p>
                <p className="adm-meta">Share it over the phone or a verified email. It won't be shown again.</p>
              </div>
              <div className="um-actions">
                <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(temp.password); toast('Copied'); }}>Copy</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setTemp(null)}>Done</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : <div className="modal-body"><div className="empty-state">Loading…</div></div>}
    </Modal>
  );
}

type Run = (fn: () => Promise<unknown>, done: string) => Promise<boolean>;

/* ---------- overview ---------- */
function Overview({ p, go }: { p: PartnerFull; go: (t: Tab) => void }) {
  const statuses = ['Pending', 'In Progress', 'On Hold', 'Completed'] as const;
  const total = statuses.reduce((a, s) => a + (p.cases[s] ?? 0), 0);
  return (
    <div className="pp-grid">
      <Card title="Cases" hint={`${total} in total`}>
        {total ? (
          <>
            <div className="pp-bar">
              {statuses.map((s) => (p.cases[s] ? <i key={s} className={`st-${statusClass(s)}`} style={{ flex: p.cases[s] }} title={`${s}: ${p.cases[s]}`} /> : null))}
            </div>
            <ul className="pp-legend">
              {statuses.map((s) => <li key={s}><i className={`st-${statusClass(s)}`} />{s}<b>{p.cases[s] ?? 0}</b></li>)}
            </ul>
          </>
        ) : <p className="adm-meta">No cases yet.</p>}
      </Card>
      <Card title="Account">
        <dl className="pp-dl">
          <dt>Relationship manager</dt><dd>{p.rm.name}<small>{p.rm.email} · {p.rm.phone}</small></dd>
          <dt>Agreement</dt><dd>{p.agreement.number || 'No number'}<small>{p.agreement.status === 'Active' ? (p.agreement.validTill ? `Valid till ${fmtDate(p.agreement.validTill)}` : 'No end date') : `${p.agreement.status}${p.agreement.endsOn ? ` · ends ${fmtDate(p.agreement.endsOn)}` : ''}`}</small></dd>
          <dt>Payout methods</dt><dd>{p.payoutMethods.length ? p.payoutMethods.find((m) => m.isDefault)?.label ?? p.payoutMethods[0].label : 'None added'}<small>{p.payoutMethods.length > 1 ? `+${p.payoutMethods.length - 1} more` : ''}</small></dd>
          <dt>App</dt><dd>{p.devices ? `${p.devices} device${p.devices > 1 ? 's' : ''} with notifications on` : 'Not signed in on the app'}</dd>
        </dl>
      </Card>
      <Card title="Recent cases" action={null}>
        {p.recentCases.length ? (
          <ul className="pp-list">
            {p.recentCases.map((c) => (
              <li key={c.id}><span><b>{c.student || 'Student'}</b> · {c.service}<small>{c.ref} · {fmtDate(c.createdAt)}</small></span><span className={`status ${statusClass(c.status)}`}>{c.status}</span></li>
            ))}
          </ul>
        ) : <p className="adm-meta">No cases yet.</p>}
      </Card>
      <Card title="Agreement requests" action={<button className="open-btn" onClick={() => go('agreement')}>Agreement →</button>}>
        {p.agreementRequests.length ? (
          <ul className="pp-list">
            {p.agreementRequests.map((r) => (
              <li key={r.id}><span><b>{REQ_LABEL[r.type]}</b><small>{fmtDate(r.createdAt)}{r.outcome ? ` · ${r.outcome}` : ''}</small></span><span className={`status ${r.status === 'Open' ? 'pend' : 'done'}`}>{r.status === 'Open' ? 'Open' : 'Handled'}</span></li>
            ))}
          </ul>
        ) : <p className="adm-meta">No requests.</p>}
      </Card>
    </div>
  );
}

/* ---------- details + RM ---------- */
function Details({ p, busy, run }: { p: PartnerFull; busy: boolean; run: Run }) {
  const [f, setF] = useState({ name: p.name, agency: p.agency, email: p.email, phone: p.phone, city: p.city, zone: p.zone as string });
  const [rm, setRm] = useState({ ...p.rm });
  const save = (e: FormEvent) => { e.preventDefault(); run(() => adminApi.editPartner(p.id, f), 'Partner details saved'); };
  const saveRm = (e: FormEvent) => { e.preventDefault(); run(() => adminApi.editPartner(p.id, { rm }), 'Relationship manager updated'); };
  const field = (k: keyof typeof f, label: string, type = 'text') => (
    <div className="field"><label htmlFor={`pp-${k}`}>{label}</label><input id={`pp-${k}`} type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <div className="pp-stack">
      <Card title="Partner details">
        <form className="form-grid" onSubmit={save} noValidate>
          {field('name', 'Owner name')}
          {field('agency', 'Agency')}
          {field('email', 'Sign-in email', 'email')}
          {field('phone', 'Phone')}
          <div className="field">
            <label htmlFor="pp-zone">Zone</label>
            <select id="pp-zone" value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>
              {['NORTH', 'SOUTH', 'EAST', 'WEST'].map((z) => <option key={z} value={z}>{z[0] + z.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          {field('city', 'City')}
          <div className="full m-cta"><button className="btn btn-primary" disabled={busy}>Save details</button></div>
        </form>
      </Card>
      <Card title="Verification" hint="verified partners get the badge in the app and portal">
        <div className="adm-inline">
          <span className={`status ${p.verified ? 'done' : 'pend'}`}>{p.verified ? 'Verified' : 'Not verified'}</span>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => adminApi.editPartner(p.id, { verified: !p.verified }), p.verified ? 'Marked unverified' : 'Partner verified')}>
            {p.verified ? 'Mark unverified' : 'Verify partner'}
          </button>
        </div>
      </Card>
      <Card title="Relationship manager" hint="shown to the partner in the app and portal">
        <form className="form-grid" onSubmit={saveRm} noValidate>
          <div className="field"><label htmlFor="pp-rmName">Name</label><input id="pp-rmName" value={rm.name} onChange={(e) => setRm({ ...rm, name: e.target.value })} /></div>
          <div className="field"><label htmlFor="pp-rmEmail">Email</label><input id="pp-rmEmail" type="email" value={rm.email} onChange={(e) => setRm({ ...rm, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="pp-rmPhone">Phone</label><input id="pp-rmPhone" value={rm.phone} onChange={(e) => setRm({ ...rm, phone: e.target.value })} /></div>
          <div className="full m-cta"><button className="btn btn-primary" disabled={busy}>Save RM</button></div>
        </form>
      </Card>
    </div>
  );
}

/* ---------- agreement ---------- */
function Agreement({ p, busy, run }: { p: PartnerFull; busy: boolean; run: Run }) {
  const toast = useToast();
  const a = p.agreement;
  const [f, setF] = useState({ number: a.number, signedAt: day(a.signedAt), validTill: day(a.validTill), autoRenew: a.autoRenew, status: a.status, endsOn: day(a.endsOn) });
  const fileRef = useRef<HTMLInputElement>(null);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (f.status !== 'Active' && !f.endsOn) return toast('Set the date the agreement ends');
    run(() => adminApi.editPartner(p.id, {
      agreement: {
        number: f.number, signedAt: f.signedAt || undefined, validTill: f.validTill || undefined, autoRenew: f.autoRenew,
        status: f.status, endsOn: f.status === 'Active' ? undefined : f.endsOn,
      },
    }), 'Agreement saved');
  };
  return (
    <div className="pp-stack">
      <Card title="Agreement terms">
        <form className="form-grid" onSubmit={save} noValidate>
          <div className="field"><label htmlFor="pp-agNo">Agreement number</label><input id="pp-agNo" value={f.number} placeholder="UV/AGR/2026/01847" onChange={(e) => setF({ ...f, number: e.target.value })} /></div>
          <div className="field"><label htmlFor="pp-agSigned">Signed on</label><input id="pp-agSigned" type="date" value={f.signedAt} onChange={(e) => setF({ ...f, signedAt: e.target.value })} /></div>
          <div className="field"><label htmlFor="pp-agValid">Valid till</label><input id="pp-agValid" type="date" value={f.validTill} onChange={(e) => setF({ ...f, validTill: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="pp-agStatus">Status</label>
            <select id="pp-agStatus" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}>
              <option value="Active">Active</option><option value="Ending">Ending (notice period)</option><option value="Ended">Ended</option>
            </select>
          </div>
          {f.status !== 'Active' ? <div className="field"><label htmlFor="pp-agEnds">Ends on</label><input id="pp-agEnds" type="date" value={f.endsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} /></div> : null}
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label className="remember" style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}><input type="checkbox" checked={f.autoRenew} onChange={(e) => setF({ ...f, autoRenew: e.target.checked })} /> Auto-renews</label>
          </div>
          <div className="full m-cta"><button className="btn btn-primary" disabled={busy}>Save agreement</button></div>
        </form>
      </Card>
      <Card title="Signed copy" hint="the partner downloads this from Profile → Agreement">
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.type !== 'application/pdf') return toast('Choose a PDF');
          if (file.size > 4 * 1024 * 1024) return toast('The PDF must be 4 MB or smaller');
          run(() => adminApi.uploadAgreement(p.id, file), 'Signed agreement uploaded. The partner has been notified.');
        }} />
        {a.hasFile ? (
          <div className="pp-file">
            <span className="pp-file-ic">PDF</span>
            <span><b>{a.fileName || 'Signed agreement.pdf'}</b><small>On file</small></span>
            <div className="um-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => adminApi.downloadAgreement(p.id, a.fileName || 'UniVerse agreement.pdf').catch((e) => toast(errMsg(e)))}>Download</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>Replace</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => confirm('Remove the signed agreement PDF?') && run(() => adminApi.removeAgreement(p.id), 'Agreement PDF removed')}>Remove</button>
            </div>
          </div>
        ) : (
          <div className="adm-inline"><span className="adm-meta">No signed copy uploaded.</span><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>Upload PDF</button></div>
        )}
      </Card>
    </div>
  );
}

/* ---------- wallet ---------- */
function WalletTab({ p, busy, run }: { p: PartnerFull; busy: boolean; run: Run }) {
  const toast = useToast();
  const [adj, setAdj] = useState({ amount: '', note: '' });
  return (
    <div className="pp-stack">
      <Card title="Payout methods" hint="partners add these themselves; you can remove a wrong one">
        {p.payoutMethods.length ? (
          <ul className="pp-list">
            {p.payoutMethods.map((m) => (
              <li key={m.id}>
                <span><b>{m.label}</b>{m.isDefault ? <em className="pp-tag">Default</em> : null}
                  <small>{m.type === 'upi' ? 'UPI' : `${m.holder ?? ''} · ${m.ifsc ?? ''}${m.branch ? ` · ${m.branch}` : ''}`}</small></span>
                <div className="um-actions">
                  {!m.isDefault ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => adminApi.defaultMethod(p.id, m.id), 'Default payout method changed')}>Make default</button> : null}
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => confirm(`Remove ${m.label}?`) && run(() => adminApi.removeMethod(p.id, m.id), 'Payout method removed')}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="adm-meta">No UPI ID or bank account added yet.</p>}
      </Card>
      <Card title="Wallet correction" hint="use a minus sign to deduct">
        <form className="adm-inline" onSubmit={(e) => {
          e.preventDefault();
          const amount = Math.round(Number(adj.amount));
          if (!amount || !adj.note.trim()) return toast('Enter an amount and a reason');
          if (!confirm(`${amount > 0 ? 'Credit' : 'Deduct'} ${inr(Math.abs(amount))} ${amount > 0 ? 'to' : 'from'} this wallet?`)) return;
          run(() => adminApi.adjustWallet(p.id, amount, adj.note.trim()), 'Wallet updated').then((ok) => ok && setAdj({ amount: '', note: '' }));
        }}>
          <input type="number" placeholder="Amount (₹)" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
          <input placeholder="Reason the partner will see" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
          <button className="btn btn-primary btn-sm" disabled={busy}>Apply</button>
        </form>
      </Card>
      <Card title="Transactions" hint={p.transactions.length ? `latest ${p.transactions.length}` : undefined}>
        {p.transactions.length ? (
          <ul className="pp-list">
            {p.transactions.map((t) => (
              <li key={t.id}>
                <span><b className={t.type === 'Credit' ? 'pp-in' : 'pp-out'}>{t.type === 'Credit' ? '+' : '−'}{inr(t.amount)}</b> · {t.description}<small>{fmtDate(t.date)}</small></span>
                <span className={`status ${statusClass(t.status)}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        ) : <p className="adm-meta">No transactions yet.</p>}
      </Card>
    </div>
  );
}

/* ---------- team ---------- */
function Team({ p, busy, run, photo, onTemp }: {
  p: PartnerFull; busy: boolean; run: Run; photo: (f: File, m: TeamMember) => void; onTemp: (t: { who: string; password: string }) => void;
}) {
  const toast = useToast();
  const [edit, setEdit] = useState<string | null>(null);
  if (!p.team.length) return <p className="adm-meta">No team members. The partner invites them from the app or portal (Profile → Team).</p>;
  return (
    <div className="pp-stack">
      {p.team.map((m) => (
        <div key={m.id} className="pp-card">
          <div className="pp-member">
            <Avatar name={m.name} photo={m.avatar} size={48} radius="14px" />
            <span className="pp-member-who"><b>{m.name}</b><small>{m.email} · {m.role}{m.lastLoginAt ? ` · last sign-in ${fmtTime(m.lastLoginAt)}` : ' · never signed in'}</small></span>
            <span className={`status ${m.status === 'Active' ? 'done' : 'pend'}`}>{m.status}</span>
          </div>
          <div className="um-actions" style={{ marginTop: '.7rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(edit === m.id ? null : m.id)}>{edit === m.id ? 'Close' : 'Edit access'}</button>
            <PhotoButton label={m.avatar ? 'Change photo' : 'Add photo'} busy={busy} onFile={(f) => photo(f, m)} />
            {m.avatar ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => adminApi.removePartnerPhoto(p.id, m.id), 'Photo removed')}>Remove photo</button> : null}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
              if (!confirm(`Set a new temporary password for ${m.name}?`)) return;
              try { onTemp({ who: m.name, ...(await adminApi.resetMember(p.id, m.id)) }); } catch (e) { toast(errMsg(e)); }
            }}>Reset password</button>
            <button className="btn btn-ghost btn-sm pp-danger" disabled={busy} onClick={() => confirm(`Remove ${m.name} from ${p.agency || p.name}? They lose access straight away.`) && run(() => adminApi.removeMember(p.id, m.id), `${m.name} removed`)}>Remove</button>
          </div>
          {edit === m.id ? <MemberForm p={p} m={m} busy={busy} run={run} onDone={() => setEdit(null)} /> : null}
        </div>
      ))}
    </div>
  );
}

function MemberForm({ p, m, busy, run, onDone }: { p: PartnerFull; m: TeamMember; busy: boolean; run: Run; onDone: () => void }) {
  const [f, setF] = useState({ name: m.name, email: m.email, role: m.role, menus: m.menus, perms: m.perms });
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <form className="form-grid pp-member-form" noValidate onSubmit={(e) => {
      e.preventDefault();
      run(() => adminApi.editMember(p.id, m.id, f), 'Team member saved').then((ok) => ok && onDone());
    }}>
      <div className="field"><label htmlFor={`mn-${m.id}`}>Name</label><input id={`mn-${m.id}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="field"><label htmlFor={`me-${m.id}`}>Email</label><input id={`me-${m.id}`} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div className="field">
        <label htmlFor={`mr-${m.id}`}>Role</label>
        <select id={`mr-${m.id}`} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as TeamMember['role'] })}><option>Manager</option><option>Staff</option></select>
      </div>
      <div className="full">
        <label className="pp-label">Menus they can open</label>
        <div className="pp-chips">
          {(Object.keys(MENU_LABEL) as Menu[]).map((k) => (
            <label key={k} className={f.menus.includes(k) ? 'on' : ''}><input type="checkbox" checked={f.menus.includes(k)} onChange={() => setF({ ...f, menus: toggle(f.menus, k) })} />{MENU_LABEL[k]}</label>
          ))}
        </div>
      </div>
      <div className="full">
        <label className="pp-label">What they can do</label>
        <div className="pp-chips">
          {(Object.keys(PERM_LABEL) as Perm[]).map((k) => (
            <label key={k} className={f.perms.includes(k) ? 'on' : ''}><input type="checkbox" checked={f.perms.includes(k)} onChange={() => setF({ ...f, perms: toggle(f.perms, k) })} />{PERM_LABEL[k]}</label>
          ))}
        </div>
      </div>
      <div className="full m-cta"><button className="btn btn-primary btn-sm" disabled={busy}>Save member</button></div>
    </form>
  );
}

/* ---------- access ---------- */
function Access({ p, busy, run, onTemp, onDeleted }: {
  p: PartnerFull; busy: boolean; run: Run; onTemp: (t: { who: string; password: string }) => void; onDeleted: () => void;
}) {
  const toast = useToast();
  const [confirmEmail, setConfirmEmail] = useState('');
  return (
    <div className="pp-stack">
      <Card title="Password" hint="for the owner's sign-in">
        <div className="adm-inline">
          <span className="adm-meta">Sets a new temporary password. The current one stops working.</span>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
            if (!confirm(`Set a new temporary password for ${p.name}?`)) return;
            try { onTemp({ who: p.name, ...(await adminApi.resetPassword(p.id)) }); } catch (e) { toast(errMsg(e)); }
          }}>Reset password</button>
        </div>
      </Card>
      <Card title="Suspend account">
        <p className="adm-meta">Suspending signs the partner and their team out and blocks sign-in. Their data is kept.</p>
        <button className="btn btn-ghost" style={{ marginTop: '.6rem' }} disabled={busy} onClick={() => {
          if (!p.suspended && !confirm(`Suspend ${p.agency || p.name}?`)) return;
          run(() => adminApi.editPartner(p.id, { suspended: !p.suspended }), p.suspended ? 'Partner reactivated' : 'Partner suspended');
        }}>{p.suspended ? 'Reactivate account' : 'Suspend account'}</button>
      </Card>
      <Card title="Delete partner">
        <p className="adm-meta">Removes the partner, their students, cases, chats, uploads, wallet history and team for good. Type <b>{p.email}</b> to confirm.</p>
        <div className="adm-inline">
          <input placeholder={p.email} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
          <button className="btn btn-sm" style={{ background: '#B91C1C', color: '#fff' }} disabled={busy || confirmEmail.trim().toLowerCase() !== p.email}
            onClick={async () => {
              try {
                await adminApi.deletePartner(p.id, confirmEmail);
                toast('Partner deleted');
                onDeleted();
              } catch (e) { toast(errMsg(e)); }
            }}>Delete permanently</button>
        </div>
      </Card>
    </div>
  );
}
