import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SERVICES, serviceName } from '../data/services';
import { fmtBlogDate } from '../data/blogs';
import { builtInArticles, builtInService, loadSiteContent } from '../lib/content';
import type { Article, ServiceOverride } from '../lib/content';
import { fmtDate, fmtTime, inr, statusClass, useApi } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { errMsg, Hero, Modal } from '../dashboard/modals';
import { adminApi } from './api';
import type { MasterSettings, PartnerFull, Section, StaffUser } from './api';

export const SECTION_LIST: [Section, string, string][] = [
  ['cases', 'Cases', 'Stages, documents, desk replies, commissions'],
  ['partners', 'Partners', 'Verify partners, assign RMs, reset passwords'],
  ['messages', 'RM messages', 'Reply to partners as their relationship manager'],
  ['payouts', 'Payouts', 'Pay or reject withdrawals, clear commissions'],
  ['agreements', 'Agreement requests', 'Handle download, discussion and termination requests'],
];
const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

/* ================= staff accounts ================= */
export function StaffView({ me }: { me: StaffUser }) {
  const toast = useToast();
  const list = useApi(adminApi.staff, []);
  const [edit, setEdit] = useState<{ open: boolean; s: StaffUser | null }>({ open: false, s: null });

  const toggle = async (s: StaffUser) => {
    if (s.active && !confirm(`Disable ${s.name}? They are signed out and can't sign in until you enable them again.`)) return;
    try {
      await adminApi.updateStaff(s.id, { active: !s.active });
      toast(s.active ? `${s.name} disabled` : `${s.name} enabled`);
      list.reload();
    } catch (e) { toast(errMsg(e)); }
  };
  const remove = async (s: StaffUser) => {
    if (!confirm(`Delete ${s.name}'s back-office account? Their past activity stays in the log.`)) return;
    try {
      await adminApi.deleteStaff(s.id);
      toast(`${s.name} deleted`);
      list.reload();
    } catch (e) { toast(errMsg(e)); }
  };

  return (
    <section className="view active">
      <div className="sec-head" style={{ textAlign: 'left', margin: '0 0 1.2rem', maxWidth: 760 }}>
        <span className="eyebrow">Your team</span>
        <h2 style={{ fontSize: '1.5rem' }}>Back-office accounts</h2>
        <p style={{ marginTop: '.4rem' }}>Give your relationship managers and desk staff their own sign-in, and choose which sections each of them can work in.</p>
      </div>
      <div className="panel">
        <div className="panel-h"><h3>Staff</h3><button className="btn btn-primary btn-sm" onClick={() => setEdit({ open: true, s: null })}>+ Add staff</button></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Can use</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.data?.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="t-name">{s.name}{s.id === me.id ? <> <span className="pill ctry" style={{ fontSize: '.62rem' }}>You</span></> : null}</div>
                    <div className="t-sub">{s.email}</div>
                    <div className="t-sub">{s.lastLoginAt ? `Last sign-in ${fmtTime(s.lastLoginAt)}` : 'Never signed in'}</div>
                  </td>
                  <td><span className={`role-pill ${s.role === 'master' ? 'role-owner' : 'role-staff'}`}>{s.role === 'master' ? 'Master admin' : 'Staff'}</span></td>
                  <td>
                    <div className="perm-chips">
                      {s.role === 'master' ? <span className="pill tat">Everything</span>
                        : SECTION_LIST.map(([k, l]) => <span key={k} className={`pill ${s.sections.includes(k) ? 'ctry' : 'off'}`}>{l}</span>)}
                    </div>
                  </td>
                  <td><span className={`status ${s.active ? 'done' : 'hold'}`}>{s.active ? 'Active' : 'Disabled'}</span></td>
                  <td>
                    <div className="um-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ open: true, s })}>Edit</button>
                      {s.id !== me.id ? <button className="btn btn-ghost btn-sm" onClick={() => toggle(s)}>{s.active ? 'Disable' : 'Enable'}</button> : null}
                      {s.id !== me.id ? <button className="btn btn-ghost btn-sm" style={{ color: '#C0392B' }} onClick={() => remove(s)}>Delete</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <StaffModal open={edit.open} staff={edit.s} isSelf={edit.s?.id === me.id} onClose={() => setEdit({ open: false, s: null })} onSaved={list.reload} />
    </section>
  );
}

function StaffModal({ open, staff, isSelf, onClose, onSaved }: { open: boolean; staff: StaffUser | null; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const blank = { name: '', email: '', password: '', role: 'staff' as StaffUser['role'], sections: ['cases', 'messages'] as Section[] };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setF(staff ? { name: staff.name, email: staff.email, password: '', role: staff.role, sections: staff.sections } : blank);
  }, [open, staff]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.email.trim()) return setError('Name and email are required');
    if (!staff && f.password.length < 10) return setError('Set a temporary password of at least 10 characters');
    if (staff && f.password && f.password.length < 10) return setError('The new password needs at least 10 characters');
    setBusy(true);
    try {
      const { password, ...rest } = f;
      if (staff) await adminApi.updateStaff(staff.id, password ? f : rest);
      else await adminApi.addStaff(f);
      toast(staff ? `${f.name} updated` : `${f.name} can now sign in at /admin`);
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title={staff ? `Edit ${staff.name}` : 'Add staff'} sub="They sign in at the back office with this email." onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="stfName">Full name *</label><input id="stfName" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="field"><label htmlFor="stfEmail">Work email *</label><input id="stfEmail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="stfRole">Role</label>
            <select id="stfRole" value={f.role} disabled={isSelf} onChange={(e) => setF({ ...f, role: e.target.value as StaffUser['role'] })}>
              <option value="staff">Staff (chosen sections only)</option>
              <option value="master">Master admin (everything)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="stfPassword">{staff ? 'New password' : 'Temporary password *'}</label>
            <input id="stfPassword" type="text" autoComplete="new-password" placeholder={staff ? 'Leave blank to keep the current one' : 'At least 10 characters'}
              value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
          {f.role === 'staff' ? (
            <div className="field full">
              <label style={{ marginBottom: '.2rem' }}>Sections they can use</label>
              <div className="switches">
                {SECTION_LIST.map(([k, l, d]) => (
                  <div className="sw-row" key={k}>
                    <div><b>{l}</b><span>{d}</span></div>
                    <label className="sw"><input type="checkbox" checked={f.sections.includes(k)}
                      onChange={() => setF({ ...f, sections: f.sections.includes(k) ? f.sections.filter((x) => x !== k) : [...f.sections, k] })} /><i></i></label>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="full hint" style={{ fontSize: '.8rem' }}>A master admin can do everything, including managing staff, content and settings.</p>}
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : staff ? 'Save changes' : 'Create account'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ================= partner management (master) ================= */
export function PartnerManageModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [p, setP] = useState<PartnerFull | null>(null);
  const [f, setF] = useState({ name: '', agency: '', email: '', phone: '', city: '', zone: 'WEST', bankAccount: '', validTill: '', autoRenew: true });
  const [adj, setAdj] = useState({ amount: '', note: '' });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!id) return;
    adminApi.partner(id).then((x) => {
      setP(x);
      setF({
        name: x.name, agency: x.agency, email: x.email, phone: x.phone, city: x.city, zone: x.zone, bankAccount: x.bankAccount,
        validTill: x.agreement.validTill ? x.agreement.validTill.slice(0, 10) : '', autoRenew: x.agreement.autoRenew,
      });
    }).catch((e) => toast(errMsg(e)));
  };
  useEffect(() => { setP(null); setAdj({ amount: '', note: '' }); setConfirmEmail(''); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
      load();
      onChanged();
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!p) return;
    const { validTill, autoRenew, ...rest } = f;
    run(() => adminApi.editPartner(p.id, { ...rest, agreement: { validTill: validTill || undefined, autoRenew } }), 'Partner details saved');
  };

  return (
    <Modal open={!!id} onClose={onClose}>
      <Hero title={p ? p.agency || p.name : 'Loading…'} sub={p ? `${p.email} · joined ${fmtDate(p.partnerSince)}` : ''} onClose={onClose} />
      {p ? (
        <div className="modal-body">
          <div className="adm-facts" style={{ flexWrap: 'wrap' }}>
            <div><b>{inr(p.wallet.balance)}</b><span>Wallet balance</span></div>
            <div><b>{inr(p.wallet.pending)}</b><span>Pending</span></div>
            <div><b>{inr(p.wallet.lifetime)}</b><span>Lifetime earnings</span></div>
            <div><b>{p.students}</b><span>Students</span></div>
            <div><b><span className={`status ${p.suspended ? 'hold' : 'done'}`}>{p.suspended ? 'Suspended' : 'Active'}</span></b><span>Account</span></div>
          </div>

          <div className="m-sec">
            <h4>Details</h4>
            <form className="form-grid" onSubmit={save} noValidate>
              <div className="field"><label htmlFor="mpName">Owner name</label><input id="mpName" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="field"><label htmlFor="mpAgency">Agency</label><input id="mpAgency" value={f.agency} onChange={(e) => setF({ ...f, agency: e.target.value })} /></div>
              <div className="field"><label htmlFor="mpEmail">Sign-in email</label><input id="mpEmail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <div className="field"><label htmlFor="mpPhone">Phone</label><input id="mpPhone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div className="field">
                <label htmlFor="mpZone">Zone</label>
                <select id="mpZone" value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>
                  {['NORTH', 'SOUTH', 'EAST', 'WEST'].map((z) => <option key={z} value={z}>{z[0] + z.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="mpCity">City</label><input id="mpCity" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
              <div className="field"><label htmlFor="mpValid">Agreement valid till</label><input id="mpValid" type="date" value={f.validTill} onChange={(e) => setF({ ...f, validTill: e.target.value })} /></div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label className="remember" style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}><input type="checkbox" checked={f.autoRenew} onChange={(e) => setF({ ...f, autoRenew: e.target.checked })} /> Agreement auto-renews</label>
              </div>
              <div className="full m-cta"><button className="btn btn-primary" disabled={busy}>Save details</button></div>
            </form>
          </div>

          <div className="m-sec">
            <h4>Wallet correction <span className="hint">use a minus sign to deduct</span></h4>
            <form className="adm-inline" onSubmit={(e) => {
              e.preventDefault();
              const amount = Math.round(Number(adj.amount));
              if (!amount || !adj.note.trim()) return toast('Enter an amount and a reason');
              if (!confirm(`${amount > 0 ? 'Credit' : 'Deduct'} ${inr(Math.abs(amount))} ${amount > 0 ? 'to' : 'from'} this wallet?`)) return;
              run(() => adminApi.adjustWallet(p.id, amount, adj.note.trim()), 'Wallet updated').then(() => setAdj({ amount: '', note: '' }));
            }}>
              <input type="number" placeholder="Amount (₹)" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
              <input placeholder="Reason the partner will see" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
              <button className="btn btn-ghost btn-sm" disabled={busy}>Apply</button>
            </form>
            {p.transactions.length ? (
              <ul className="adm-credits" style={{ marginTop: '.7rem' }}>
                {p.transactions.slice(0, 8).map((t) => (
                  <li key={t.id}><span>{fmtDate(t.date)} · {t.description} · {t.type === 'Credit' ? '+' : '−'}{inr(t.amount)}</span><span className={`status ${statusClass(t.status)}`}>{t.status}</span></li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="m-sec">
            <h4>Team members</h4>
            {p.team.length ? (
              <ul className="adm-credits">
                {p.team.map((m) => <li key={m.id}><span>{m.name} · {m.email} · {m.role}</span><span className={`status ${m.status === 'Active' ? 'done' : 'pend'}`}>{m.status}</span></li>)}
              </ul>
            ) : <p className="adm-meta">No team members.</p>}
          </div>

          <div className="m-sec adm-danger">
            <h4>Account access</h4>
            <p className="adm-meta">Suspending signs the partner and their team out and blocks sign-in. Their data is kept.</p>
            <button className="btn btn-ghost" disabled={busy} onClick={() => {
              if (!p.suspended && !confirm(`Suspend ${p.agency || p.name}?`)) return;
              run(() => adminApi.editPartner(p.id, { suspended: !p.suspended }), p.suspended ? 'Partner reactivated' : 'Partner suspended');
            }}>{p.suspended ? 'Reactivate account' : 'Suspend account'}</button>
            <p className="adm-meta" style={{ marginTop: '1rem' }}>Deleting removes the partner, their students, cases, chats, uploads, wallet history and team for good. Type <b>{p.email}</b> to confirm.</p>
            <div className="adm-inline">
              <input placeholder={p.email} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
              <button className="btn btn-sm" style={{ background: '#B91C1C', color: '#fff' }} disabled={busy || confirmEmail.trim().toLowerCase() !== p.email}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await adminApi.deletePartner(p.id, confirmEmail);
                    toast('Partner deleted');
                    onChanged();
                    onClose();
                  } catch (e) { toast(errMsg(e)); } finally { setBusy(false); }
                }}>Delete permanently</button>
            </div>
          </div>
        </div>
      ) : <div className="modal-body"><div className="empty-state">Loading…</div></div>}
    </Modal>
  );
}

/* ================= services ================= */
type ServiceRow = ServiceOverride & { current: { commission: { amount: string; note: string }; documents: string[] } };

export function ServicesView() {
  const list = useApi(adminApi.services, []);
  const [editKey, setEditKey] = useState<string | null>(null);
  const rows = (list.data ?? []) as ServiceRow[];
  return (
    <section className="view active">
      <div className="sec-head" style={{ textAlign: 'left', margin: '0 0 1.2rem', maxWidth: 760 }}>
        <span className="eyebrow">Content</span>
        <h2 style={{ fontSize: '1.5rem' }}>Services</h2>
        <p style={{ marginTop: '.4rem' }}>Edit what partners and visitors see for each service, the commission rate, and the documents requested when a case opens. Hidden services disappear from the site and can't receive new referrals.</p>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Service</th><th>Turnaround</th><th>Commission</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {SERVICES.map((s) => {
                const r = rows.find((x) => x.key === s.key);
                const edited = r && Object.keys(r.data ?? {}).length > 0;
                return (
                  <tr key={s.key}>
                    <td><div className="t-name">{s.name}</div><div className="t-sub">{s.cardText}</div></td>
                    <td>{s.tat}</td>
                    <td>{r ? `${r.current.commission.amount} ${r.current.commission.note}` : '–'}</td>
                    <td>
                      <span className={`status ${r?.hidden ? 'hold' : 'done'}`}>{r?.hidden ? 'Hidden' : 'Live'}</span>
                      {edited ? <div className="t-sub" style={{ marginTop: '.3rem' }}>Edited</div> : null}
                    </td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setEditKey(s.key)}>Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ServiceModal row={rows.find((r) => r.key === editKey) ?? null} onClose={() => setEditKey(null)} onSaved={list.reload} />
    </section>
  );
}

function ServiceModal({ row, onClose, onSaved }: { row: ServiceRow | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const empty = {
    name: '', cardText: '', short: '', about: '', tat: '', countries: '', kpis: [['', ''], ['', ''], ['', '']] as string[][],
    feats: '', partners: '', steps: '', amount: '', note: '', documents: '', hidden: false,
  };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!row) return;
    const s = SERVICES.find((x) => x.key === row.key)!;
    const k = [...s.kpis.map((p) => [...p]), ['', ''], ['', ''], ['', '']].slice(0, 3);
    setF({
      name: s.name, cardText: s.cardText, short: s.short, about: s.about, tat: s.tat, countries: s.countries, kpis: k,
      feats: s.feats.join('\n'), partners: s.partners.join('\n'), steps: s.steps.join('\n'),
      amount: row.current.commission.amount, note: row.current.commission.note, documents: row.current.documents.join('\n'), hidden: row.hidden,
    });
  }, [row]);
  if (!row) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const base = builtInService(row.key);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.saveService(row.key, {
        name: f.name, cardText: f.cardText, short: f.short, about: f.about, tat: f.tat, countries: f.countries,
        kpis: f.kpis.filter((p) => p[0].trim() && p[1].trim()), feats: lines(f.feats), partners: lines(f.partners), steps: lines(f.steps),
        commission: { amount: f.amount, note: f.note }, documents: lines(f.documents),
      }, f.hidden);
      await loadSiteContent();
      toast(`${f.name} saved. The site shows the change straight away.`);
      onSaved();
      onClose();
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!confirm('Undo every edit to this service and go back to the original text?')) return;
    try {
      await adminApi.resetService(row.key);
      await loadSiteContent();
      toast('Back to the original text');
      onSaved();
      onClose();
    } catch (err) { toast(errMsg(err)); }
  };

  return (
    <Modal open onClose={onClose}>
      <Hero title={`Edit ${base?.name ?? row.key}`} sub="Leave a field empty to use the original text." onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={save} noValidate>
          <div className="field"><label htmlFor="svName">Name</label><input id="svName" value={f.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="svTat">Turnaround</label><input id="svTat" value={f.tat} onChange={set('tat')} /></div>
          <div className="field full"><label htmlFor="svCard">Card text (home page)</label><input id="svCard" value={f.cardText} onChange={set('cardText')} /></div>
          <div className="field full"><label htmlFor="svShort">One-line summary</label><input id="svShort" value={f.short} onChange={set('short')} /></div>
          <div className="field full"><label htmlFor="svAbout">About (service page intro)</label><textarea id="svAbout" rows={3} value={f.about} onChange={set('about')} /></div>
          <div className="field full"><label htmlFor="svCountries">Countries</label><input id="svCountries" value={f.countries} onChange={set('countries')} /></div>
          <div className="field full">
            <label>Key figures</label>
            {f.kpis.map((p, i) => (
              <div className="adm-inline" key={i} style={{ marginTop: i ? '.4rem' : 0 }}>
                <input placeholder="Value, e.g. 5–7d" value={p[0]} onChange={(e) => setF({ ...f, kpis: f.kpis.map((x, j) => (j === i ? [e.target.value, x[1]] : x)) })} />
                <input placeholder="Label, e.g. Certificate time" value={p[1]} onChange={(e) => setF({ ...f, kpis: f.kpis.map((x, j) => (j === i ? [x[0], e.target.value] : x)) })} />
              </div>
            ))}
          </div>
          <div className="field"><label htmlFor="svAmt">Commission amount</label><input id="svAmt" placeholder="e.g. ₹1,500" value={f.amount} onChange={set('amount')} /></div>
          <div className="field"><label htmlFor="svNote">Commission basis</label><input id="svNote" placeholder="e.g. per issued policy" value={f.note} onChange={set('note')} /></div>
          <div className="field full"><label htmlFor="svFeats">Features (one per line)</label><textarea id="svFeats" rows={5} value={f.feats} onChange={set('feats')} /></div>
          <div className="field"><label htmlFor="svPartners">Delivery partners (one per line)</label><textarea id="svPartners" rows={5} value={f.partners} onChange={set('partners')} /></div>
          <div className="field"><label htmlFor="svSteps">How it works steps (one per line)</label><textarea id="svSteps" rows={5} value={f.steps} onChange={set('steps')} /></div>
          <div className="field full"><label htmlFor="svDocs">Documents requested when a case opens (one per line)</label><textarea id="svDocs" rows={3} value={f.documents} onChange={set('documents')} /></div>
          <div className="field full">
            <div className="sw-row">
              <div><b>Hide this service</b><span>Removes it from the site and the partner marketplace. Open cases carry on.</span></div>
              <label className="sw"><input type="checkbox" checked={f.hidden} onChange={(e) => setF({ ...f, hidden: e.target.checked })} /><i></i></label>
            </div>
          </div>
          <div className="full m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={reset}>Reset to original</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ================= insights ================= */
export function InsightsView() {
  const toast = useToast();
  const data = useApi(adminApi.articles, []);
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<{ open: boolean; a: Article | null }>({ open: false, a: null });

  // the first visit moves the built-in articles into the database so they can be edited
  useEffect(() => {
    if (data.data && !data.data.imported) {
      adminApi.importArticles(builtInArticles()).then(() => data.reload()).catch((e) => toast(errMsg(e)));
    }
  }, [data.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = (data.data?.list ?? []).filter((a) => filter === 'all' || a.service === filter);
  const remove = async (a: Article) => {
    if (!confirm(`Delete “${a.t}”? It disappears from the site and the partner feed.`)) return;
    try {
      await adminApi.deleteArticle(a.id);
      await loadSiteContent();
      toast('Article deleted');
      data.reload();
    } catch (e) { toast(errMsg(e)); }
  };

  return (
    <section className="view active">
      <div className="sec-head" style={{ textAlign: 'left', margin: '0 0 1.2rem', maxWidth: 760 }}>
        <span className="eyebrow">Content</span>
        <h2 style={{ fontSize: '1.5rem' }}>Insights</h2>
        <p style={{ marginTop: '.4rem' }}>Articles shown on each service page and in the partners' What's New feed. Anything published in the last 14 days is marked New.</p>
      </div>
      <div className="adm-toolbar">
        <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Service">
          <option value="all">All services</option>{SERVICES.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>
        <span className="sp" style={{ flex: 1 }}></span>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({ open: true, a: null })}>+ New article</button>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Published</th><th>Title</th><th>Service</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtBlogDate(a.d)}</td>
                  <td><div className="t-name">{a.t}</div><div className="t-sub">{a.mins} min read</div></td>
                  <td>{serviceName(a.service)}</td>
                  <td><div className="um-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ open: true, a })}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#C0392B' }} onClick={() => remove(a)}>Delete</button>
                  </div></td>
                </tr>
              ))}
              {data.data?.imported && !list.length ? <tr><td colSpan={4} className="empty-row">No articles yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <ArticleModal open={edit.open} article={edit.a} defaultService={filter === 'all' ? SERVICES[0].key : filter}
        onClose={() => setEdit({ open: false, a: null })} onSaved={() => { data.reload(); loadSiteContent(); }} />
    </section>
  );
}

function ArticleModal({ open, article, defaultService, onClose, onSaved }: {
  open: boolean; article: Article | null; defaultService: string; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ service: '', t: '', d: today, mins: '4', teaser: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setF(article
      ? { service: article.service, t: article.t, d: article.d, mins: String(article.mins), teaser: article.teaser, body: article.body.join('\n\n') }
      : { service: defaultService, t: '', d: today, mins: '4', teaser: '', body: '' });
  }, [open, article]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const body = f.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (!f.t.trim() || !body.length) return setError('A title and the article text are required');
    setBusy(true);
    try {
      await adminApi.saveArticle(article?.id ?? null, { service: f.service, t: f.t.trim(), d: f.d, mins: Number(f.mins) || 3, teaser: f.teaser.trim(), body });
      toast(article ? 'Article updated' : 'Article published');
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title={article ? 'Edit article' : 'New article'} onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field full">
            <label htmlFor="arSvc">Service</label>
            <select id="arSvc" value={f.service} onChange={set('service')}>{SERVICES.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}</select>
          </div>
          <div className="field full"><label htmlFor="arTitle">Title *</label><input id="arTitle" value={f.t} onChange={set('t')} autoFocus /></div>
          <div className="field"><label htmlFor="arDate">Publish date</label><input id="arDate" type="date" value={f.d} onChange={set('d')} /></div>
          <div className="field"><label htmlFor="arMins">Reading time (minutes)</label><input id="arMins" type="number" min={1} value={f.mins} onChange={set('mins')} /></div>
          <div className="field full"><label htmlFor="arTeaser">Summary</label><textarea id="arTeaser" rows={2} value={f.teaser} onChange={set('teaser')} /></div>
          <div className="field full"><label htmlFor="arBody">Article * <span className="hint">leave a blank line between paragraphs</span></label><textarea id="arBody" rows={10} value={f.body} onChange={set('body')} /></div>
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : article ? 'Save' : 'Publish'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ================= settings ================= */
export function SettingsView() {
  const toast = useToast();
  const data = useApi(adminApi.settings, []);
  const [f, setF] = useState<MasterSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data.data) setF(data.data); }, [data.data]);
  if (!f) return <div className="empty-state">Loading…</div>;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setF(await adminApi.saveSettings(f));
      await loadSiteContent();
      toast('Settings saved');
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="view active">
      <form className="panel" onSubmit={save} noValidate>
        <div className="panel-h"><h3>Site settings</h3><button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
        <div className="panel-b form-grid">
          <div className="field"><label htmlFor="setEmail">Support email</label><input id="setEmail" type="email" value={f.supportEmail} onChange={(e) => setF({ ...f, supportEmail: e.target.value })} /></div>
          <div className="field"><label htmlFor="setPhone">Support phone</label><input id="setPhone" value={f.supportPhone} onChange={(e) => setF({ ...f, supportPhone: e.target.value })} /></div>
          <div className="field"><label htmlFor="setMin">Minimum withdrawal (₹)</label><input id="setMin" type="number" min={1} value={f.minWithdrawal} onChange={(e) => setF({ ...f, minWithdrawal: Number(e.target.value) })} /></div>
          <div className="field"><label htmlFor="setEff">Commission structure effective from</label><input id="setEff" placeholder="e.g. July 2026" value={f.commissionEffective} onChange={(e) => setF({ ...f, commissionEffective: e.target.value })} /></div>
          <p className="full adm-h" style={{ marginTop: '.4rem' }}>Relationship manager for new partners</p>
          <div className="field"><label htmlFor="setRmName">Name</label><input id="setRmName" value={f.defaultRm.name} onChange={(e) => setF({ ...f, defaultRm: { ...f.defaultRm, name: e.target.value } })} /></div>
          <div className="field"><label htmlFor="setRmEmail">Email</label><input id="setRmEmail" type="email" value={f.defaultRm.email} onChange={(e) => setF({ ...f, defaultRm: { ...f.defaultRm, email: e.target.value } })} /></div>
          <div className="field"><label htmlFor="setRmPhone">Phone</label><input id="setRmPhone" value={f.defaultRm.phone} onChange={(e) => setF({ ...f, defaultRm: { ...f.defaultRm, phone: e.target.value } })} /></div>
          <p className="full hint" style={{ fontSize: '.78rem' }}>Existing partners keep their current RM. Change it for one partner from Partners.</p>
        </div>
      </form>
    </section>
  );
}

/* ================= activity log ================= */
export function ActivityView() {
  const log = useApi(adminApi.activity, []);
  const [who, setWho] = useState('');
  const people = [...new Set((log.data ?? []).map((l) => l.name))];
  const rows = (log.data ?? []).filter((l) => !who || l.name === who);
  return (
    <section className="view active">
      <div className="adm-toolbar">
        <select className="adm-select" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Staff member">
          <option value="">Everyone</option>{people.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={log.reload}>Refresh</button>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>
              {rows.map((l) => <tr key={l.id}><td style={{ whiteSpace: 'nowrap' }}>{fmtTime(l.at)}</td><td className="t-name">{l.name}</td><td>{l.action}</td></tr>)}
              {log.data && !rows.length ? <tr><td colSpan={3} className="empty-row">Nothing recorded yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
