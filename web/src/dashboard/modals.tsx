import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Svg } from '../components/site';
import { DESTINATIONS, serviceName } from '../data/services';
import { SITE, visibleServices } from '../lib/content';
import { api } from '../lib/api';
import type { Agent, Case, Commissions, Menu, Message, Perm, Student, TeamMember, Wallet } from '../lib/api';
import { avatarUrl } from '../lib/api';
import { fileSize, fmtDate, fmtTime, inr, initials, statusClass, useInterval } from '../lib/hooks';
import { useToast } from '../lib/toast';

/* ---------- modal shell ---------- */
export function Modal({ open, onClose, children, className = '' }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  return (
    <div className={`modal-veil${open ? ' open' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`.trim()}>{open ? children : null}</div>
    </div>
  );
}

export const Hero = ({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children?: ReactNode }) => (
  <div className="modal-hero">
    <button className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
    {children ?? (
      <>
        <h3 style={{ position: 'relative', zIndex: 1 }}>{title}</h3>
        {sub ? <p style={{ position: 'relative', zIndex: 1 }}>{sub}</p> : null}
      </>
    )}
  </div>
);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

/* ---------- refer a student ---------- */
export function ReferModal({ open, presetService, onClose, onDone }: {
  open: boolean; presetService?: string; onClose: () => void; onDone: (c: Case) => void;
}) {
  const toast = useToast();
  const empty = { name: '', email: '', phone: '', country: '', service: '', note: '' };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF({ ...empty, service: presetService ?? '' }); setError(''); } }, [open, presetService]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !f.country || !f.service) return setError('Fill in all required fields');
    setBusy(true);
    try {
      const c = await api.refer(f);
      toast(`${c.ref} opened for ${c.student.name} (${c.serviceName}).`);
      onDone(c);
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Refer a student" sub="Only you and your team can see this student. Other consultants never will." onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="sName">Student name *</label><input id="sName" placeholder="e.g. Riya Shah" value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="field"><label htmlFor="sEmail">Student email *</label><input id="sEmail" type="email" placeholder="student@gmail.com" value={f.email} onChange={set('email')} /></div>
          <div className="field"><label htmlFor="sPhone">Phone *</label><input id="sPhone" type="tel" placeholder="+91 98XXX XXXXX" value={f.phone} onChange={set('phone')} /></div>
          <div className="field">
            <label htmlFor="sCountry">Destination *</label>
            <select id="sCountry" value={f.country} onChange={set('country')}>
              <option value="">Select destination</option>
              {DESTINATIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="sService">Service required *</label>
            <select id="sService" value={f.service} onChange={set('service')}>
              <option value="">Select service</option>
              {visibleServices().map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="sNote">Notes for the service desk <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>(optional)</span></label>
            <input id="sNote" placeholder="e.g. Visa interview on 18 Oct, needs GIC before 10 Oct" value={f.note} onChange={set('note')} />
          </div>
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta" style={{ marginTop: '.4rem' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Submitting…' : 'Submit Referral'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ---------- withdraw ---------- */
export function WithdrawModal({ open, wallet, isOwner, onClose, onDone, onAddMethod }: {
  open: boolean; wallet: Wallet | null; isOwner: boolean; onClose: () => void; onDone: () => void; onAddMethod: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) { setAmount(''); setError(''); setMethodId(wallet?.methods.find((m) => m.isDefault)?.id ?? wallet?.methods[0]?.id ?? ''); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!wallet) return null;
  const { balance, minWithdrawal } = wallet;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseInt(amount, 10);
    if (!amt || amt < minWithdrawal) return setError(`Minimum withdrawal is ${inr(minWithdrawal)}`);
    if (amt > balance) return setError(`You can withdraw up to ${inr(balance)}`);
    if (!methodId) return setError('Choose where to receive the money');
    setBusy(true);
    try {
      await api.withdraw(amt, methodId);
      toast(`Withdrawal of ${inr(amt)} requested. You'll get a notification when it's paid.`);
      onDone();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Withdraw funds" sub={wallet.instantPayouts ? 'Sent by UPI or IMPS once approved, usually within minutes.' : 'Checked and paid within one working day.'} onClose={onClose} />
      <div className="modal-body">
        {wallet.methods.length ? (
          <form onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="wdAmount">Amount (₹) *</label><input id="wdAmount" type="number" min={minWithdrawal} step={100} placeholder={`Minimum ₹${minWithdrawal}`} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
            <p style={{ fontSize: '.8rem', color: 'var(--ink-soft)', margin: '-.3rem 0 1rem' }}>
              Available: <b style={{ color: 'var(--navy)' }}>{inr(balance)}</b>
              {balance >= minWithdrawal ? <> · <a href="#" onClick={(e) => { e.preventDefault(); setAmount(String(balance)); }}>Withdraw all</a></> : null}
            </p>
            <div className="field">
              <label>Send to *</label>
              <div className="pm-pick">
                {wallet.methods.map((m) => (
                  <label key={m.id} className={`pm-opt${methodId === m.id ? ' on' : ''}`}>
                    <input type="radio" name="wdMethod" checked={methodId === m.id} onChange={() => setMethodId(m.id)} />
                    <span><b>{m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`}</b><small>{m.type === 'upi' ? 'UPI' : `${m.holder} · ${m.ifsc}`}</small></span>
                  </label>
                ))}
              </div>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta">
              <button type="submit" className="btn btn-green btn-lg" disabled={busy}>{busy ? 'Requesting…' : 'Request withdrawal'}</button>
              <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <p style={{ fontSize: '.92rem' }}>{isOwner ? 'Add a UPI ID or bank account to receive your money. You only do this once.' : 'Ask your account owner to add a UPI ID or bank account.'}</p>
            <div className="m-cta">
              {isOwner ? <button className="btn btn-primary" onClick={() => { onClose(); onAddMethod(); }}>Add UPI or bank account</button> : null}
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/* Add a UPI ID or a bank account. The IFSC code fills in the bank and branch. */
export function PayoutMethodModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<'upi' | 'bank'>('upi');
  const [upi, setUpi] = useState('');
  const [b, setB] = useState({ holder: '', account: '', confirm: '', ifsc: '' });
  const [bank, setBank] = useState<{ bank: string; branch: string } | null>(null);
  const [ifscError, setIfscError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setKind('upi'); setUpi(''); setB({ holder: '', account: '', confirm: '', ifsc: '' }); setError(''); } }, [open]);
  const ifsc = b.ifsc.trim().toUpperCase();
  useEffect(() => {
    setBank(null);
    setIfscError('');
    if (!IFSC_RE.test(ifsc)) return;
    let live = true;
    api.lookupIfsc(ifsc).then((r) => { if (live) setBank(r.bank ? r : null); }).catch((e) => { if (live) setIfscError(errMsg(e)); });
    return () => { live = false; };
  }, [ifsc]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const account = b.account.replace(/\s+/g, '');
    if (kind === 'upi' && !UPI_RE.test(upi.trim())) return setError('Enter a valid UPI ID, like name@okaxis');
    if (kind === 'bank') {
      if (b.holder.trim().length < 3) return setError('Enter the account holder name');
      if (!/^\d{9,18}$/.test(account)) return setError('Account number should be 9 to 18 digits');
      if (b.confirm.replace(/\s+/g, '') !== account) return setError("The account numbers don't match");
      if (!IFSC_RE.test(ifsc)) return setError('Enter a valid IFSC code, like HDFC0001234');
    }
    setBusy(true);
    try {
      await api.addPayoutMethod(kind === 'upi' ? { type: 'upi', upi: upi.trim() } : { type: 'bank', holder: b.holder.trim(), accountNumber: account, ifsc });
      toast(kind === 'upi' ? 'UPI ID saved.' : 'Bank account saved.');
      onDone();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Add payout method" sub="Where your withdrawals are paid. Only you can add or remove these." onClose={onClose} />
      <div className="modal-body">
        <div className="svc-filters" style={{ marginBottom: '1rem' }}>
          <button type="button" className={`chip-btn${kind === 'upi' ? ' active' : ''}`} onClick={() => setKind('upi')}>UPI ID</button>
          <button type="button" className={`chip-btn${kind === 'bank' ? ' active' : ''}`} onClick={() => setKind('bank')}>Bank account</button>
        </div>
        <form className="form-grid" onSubmit={submit} noValidate>
          {kind === 'upi' ? (
            <div className="field full"><label htmlFor="pmUpi">UPI ID *</label><input id="pmUpi" placeholder="yourname@okaxis" value={upi} onChange={(e) => setUpi(e.target.value)} autoFocus /></div>
          ) : (
            <>
              <div className="field full"><label htmlFor="pmHolder">Account holder name *</label><input id="pmHolder" placeholder="As printed on the passbook" value={b.holder} onChange={(e) => setB({ ...b, holder: e.target.value })} autoFocus /></div>
              <div className="field"><label htmlFor="pmAcc">Account number *</label><input id="pmAcc" type="password" inputMode="numeric" autoComplete="off" value={b.account} onChange={(e) => setB({ ...b, account: e.target.value.replace(/[^\d ]/g, '') })} /></div>
              <div className="field"><label htmlFor="pmAcc2">Confirm account number *</label><input id="pmAcc2" inputMode="numeric" autoComplete="off" value={b.confirm} onChange={(e) => setB({ ...b, confirm: e.target.value.replace(/[^\d ]/g, '') })} /></div>
              <div className="field full">
                <label htmlFor="pmIfsc">IFSC code *</label>
                <input id="pmIfsc" maxLength={11} placeholder="HDFC0001234" value={b.ifsc} onChange={(e) => setB({ ...b, ifsc: e.target.value.toUpperCase() })} />
                {bank ? <small className="pm-bank">✓ {bank.bank} · {bank.branch}</small> : ifscError ? <small className="form-error">{ifscError}</small> : null}
              </div>
            </>
          )}
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ---------- chat bubbles (case chat + RM drawer) ---------- */
export function Bubbles({ msgs, them, me, mine = 'agent' }: {
  msgs: Message[]; them: string;
  /** decides which partner-side messages count as "You": '' means the owner */
  me?: { name: string; isOwner: boolean; ownerName: string };
  /** whose messages sit on the right: the partner's (portal) or ours (back office) */
  mine?: 'agent' | 'staff';
}) {
  const partnerLabel = (m: Message) => {
    if (!me) return m.author || 'Partner';
    if (m.author) return m.author === me.name && !me.isOwner ? 'You' : m.author;
    return me.isOwner ? 'You' : me.ownerName;
  };
  return (
    <>
      {msgs.map((m) => {
        if (m.from === 'system') return <div className="csys" key={m.id}>{m.text}</div>;
        const fromPartner = m.from === 'agent';
        const right = mine === 'agent' ? fromPartner : !fromPartner;
        const who = fromPartner ? partnerLabel(m) : m.author || them;
        return (
          <div className={`cmsg ${right ? 'you' : 'them'}`} key={m.id}>
            {m.text}<span>{who} · {fmtTime(m.createdAt)}</span>
          </div>
        );
      })}
    </>
  );
}
export const useAutoScroll = (dep: unknown) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [dep]);
  return ref;
};

export const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
export const DOC_LABEL = { verified: ['done', 'Verified'], review: ['prog', 'Under review'], missing: ['pend', 'Action needed'] } as const;
const DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const CLIP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

/* ---------- case dialog: documents + chat + RM ---------- */
export function CaseModal({ caseId, agent, myName, isOwner, canChat, canUpload, onClose, onChanged, onOpenRm }: {
  caseId: string | null; agent: Agent; myName: string; isOwner: boolean; canChat: boolean; canUpload: boolean;
  onClose: () => void; onChanged: () => void; onOpenRm: () => void;
}) {
  const toast = useToast();
  const [c, setC] = useState<Case | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<string | undefined>(undefined);
  const chatRef = useAutoScroll(msgs.length);

  useEffect(() => {
    setC(null); setMsgs([]); setText('');
    if (!caseId) return;
    api.case(caseId).then(setC).catch(() => {});
    api.caseMessages(caseId).then(setMsgs).catch(() => {});
  }, [caseId]);
  useInterval(() => { if (caseId) api.caseMessages(caseId).then(setMsgs).catch(() => {}); }, caseId ? 3000 : null);

  const send = async () => {
    const t = text.trim();
    if (!t || !caseId) return;
    setText('');
    try {
      const m = await api.sendCaseMessage(caseId, t);
      setMsgs((xs) => [...xs, m]);
    } catch (err) {
      setText(t);
      toast(errMsg(err));
    }
  };
  const pick = (slotId?: string) => { slotRef.current = slotId; fileRef.current?.click(); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !caseId) return;
    setUploading(true);
    try {
      setC(await api.uploadDoc(caseId, file, slotRef.current));
      setMsgs(await api.caseMessages(caseId));
      toast(`“${file.name}” uploaded. The desk will review it.`);
      onChanged();
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={!!caseId} onClose={onClose}>
      <Hero title="" onClose={onClose}>
        <div className="req-head-row">
          <div>
            <h3 style={{ position: 'relative', zIndex: 1 }}>{c ? `${c.student.name}: ${c.serviceName}` : 'Loading…'}</h3>
            {c ? <p style={{ position: 'relative', zIndex: 1 }}>{c.ref} · {c.student.country} · Referred {fmtDate(c.createdAt)}</p> : null}
          </div>
          {c ? <span className={`status ${statusClass(c.status)}`}>{c.status}</span> : null}
        </div>
        {c ? (
          <div className="reqprog">
            <div className="prog-track"><div className="prog-fill" style={{ width: `${c.progress}%` }}></div></div>
            <span style={{ color: '#B9CBE0' }}>{c.progress}%</span>
          </div>
        ) : null}
      </Hero>
      <div className="modal-body">
        <div className="m-sec">
          <h4>Documents <span className="hint">the desk reviews every upload</span></h4>
          <div className="docs-grid">
            {c?.docs.map((d) => {
              const [cls, label] = DOC_LABEL[d.status];
              const canPick = canUpload && d.status === 'missing';
              return (
                <div className="doc-card" key={d.id} style={canPick ? { cursor: 'pointer' } : undefined}
                  onClick={canPick ? () => pick(d.id) : undefined} title={canPick ? 'Click to upload' : d.name}>
                  <span className="doc-ic"><Svg html={DOC_ICON} /></span>
                  <span className="dn"><b title={d.name}>{d.name}</b><i>{d.size ? fileSize(d.size) : 'Not uploaded yet'}</i></span>
                  {d.hasFile ? (
                    <button type="button" className="doc-dl" aria-label={`Download ${d.name}`} title="Download"
                      onClick={(e) => { e.stopPropagation(); api.downloadDoc(c.id, d.id, d.name).catch((err) => toast(errMsg(err))); }}>
                      <Svg html={DOWNLOAD} />
                    </button>
                  ) : null}
                  <span className={`status ${cls}`}>{label}</span>
                </div>
              );
            })}
            {canUpload ? (
              <button className="doc-add" type="button" onClick={() => pick()} disabled={uploading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {uploading ? 'Uploading…' : 'Upload a document'}
              </button>
            ) : null}
          </div>
          <input type="file" ref={fileRef} hidden accept=".pdf,image/*,.doc,.docx" onChange={onFile} />
        </div>
        <div className="m-sec">
          <h4>Case chat <span className="hint">history specific to this request</span></h4>
          <div className="chat-scroll" ref={chatRef}>
            <Bubbles msgs={msgs} them="Service desk" me={{ name: myName, isOwner, ownerName: agent.name }} />
          </div>
          {canChat ? (
            <div className="composer">
              <input placeholder="Write a message…" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              {canUpload ? <button className="icon-btn" aria-label="Attach a file" onClick={() => pick()}><Svg html={CLIP} /></button> : null}
              <button className="btn btn-primary btn-sm" onClick={send} disabled={!text.trim()}>Send</button>
            </div>
          ) : <p className="hint" style={{ marginTop: '.6rem', fontSize: '.78rem' }}>You can read this conversation. Ask your account owner if you need to reply.</p>}
        </div>
        <div className="rm-cta">
          <span className="av">{initials(agent.rm.name)}</span>
          <div><b>{agent.rm.name}</b><span>Your relationship manager · replies within a business day</span></div>
          <button className="btn btn-green btn-sm" onClick={() => { onClose(); onOpenRm(); }}>Chat with RM</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- commission structure detail ---------- */
export function CommModal({ entry, onClose }: { entry: Commissions['history'][number] | null; onClose: () => void }) {
  return (
    <Modal open={!!entry} onClose={onClose}>
      {entry ? (
        <>
          <Hero title={entry.title} sub={`Effective: ${entry.effective} · ${entry.status}`} onClose={onClose} />
          <div className="modal-body">
            <table className="tbl">
              <thead><tr><th>Service</th><th>Payout</th></tr></thead>
              <tbody>{entry.items.map(([n, v]) => <tr key={n}><td className="t-name" style={{ fontWeight: 600 }}>{n}</td><td>{v}</td></tr>)}</tbody>
            </table>
            <button className="btn btn-ghost" onClick={onClose} style={{ alignSelf: 'flex-start' }}>Close</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

/* ---------- agreement viewer (generated from the partner's own record) ---------- */
export function AgreementModal({ open, agent, onClose, onDownload }: { open: boolean; agent: Agent; onClose: () => void; onDownload: () => void }) {
  const a = agent.agreement;
  const signed = fmtDate(a.signedAt);
  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Channel Partner Agreement" sub={`${a.number} · Digitally signed ${signed}`} onClose={onClose} />
      <div className="modal-body">
        <div className="agree-doc">
          <h3>CHANNEL PARTNER AGREEMENT</h3>
          <p className="sub-c">Between UniVerse Pvt. Ltd. and the Partner Agency<br />Agreement No. {a.number}</p>
          <p>This Channel Partner Agreement ("Agreement") is made on <b>{signed}</b> by and between <b>UniVerse Pvt. Ltd.</b>, a company incorporated under the Companies Act, 2013, having its registered office at Ahmedabad, Gujarat (hereinafter "UniVerse"), and <b>{agent.agency || agent.name}</b>, represented by <b>{agent.name}</b>{agent.city ? <>, having its principal place of business at {agent.city}</> : null} (hereinafter the "Partner").</p>
          <h5>1. Scope of Engagement</h5>
          <p>UniVerse appoints the Partner on a non-exclusive basis to refer students requiring value added services (education loans, GIC, blocked accounts, remittance, forex cards, insurance, OSHC/OVHC, accommodation and international SIM cards) through the UniVerse partner portal.</p>
          <h5>2. Commission & Payouts</h5>
          <p>Commissions shall be payable as per the Commission Structure effective at the time of case completion (current structure effective {SITE.commissionEffective}, annexed). Payouts are credited to the Partner's in-platform wallet upon the defined payout trigger and are withdrawable to the Partner's registered bank account.</p>
          <h5>3. Data Protection & Ring-Fencing</h5>
          <p>Student records submitted by the Partner shall remain ring-fenced to the Partner's account and shall never be shared with, marketed to, or made accessible to any other partner or competing consultant on the platform. UniVerse processes such data solely for fulfilling the referred services, in line with the DPDP Act, 2023.</p>
          <h5>4. Term & Termination</h5>
          <p>This Agreement is valid until <b>{a.validTill ? fmtDate(a.validTill) : '—'}</b>{a.autoRenew ? ' and auto-renews annually unless terminated' : ''}. Either party may terminate with 30 days' written notice. Accrued commissions up to the termination date shall be honoured and settled within 15 working days.</p>
          <h5>5. Governing Law</h5>
          <p>This Agreement is governed by the laws of India. Courts at Ahmedabad, Gujarat shall have exclusive jurisdiction.</p>
          <div className="agree-sign">
            <div className="sign-box"><span className="sig">{agent.name}</span><b>{agent.name}</b><span>{agent.agency || 'Partner'} · Digitally accepted {signed}</span></div>
            <div className="sign-box"><span className="sig">UniVerse</span><b>For UniVerse Pvt. Ltd.</b><span>Partnerships team</span></div>
          </div>
        </div>
        <div className="m-cta" style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={() => { onClose(); onDownload(); }}>Request Download</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- add / edit team member ---------- */
export const MENU_LIST: [Menu, string, string][] = [
  ['overview', 'Overview', 'KPIs, recent students, service mix'],
  ['whatsnew', "What's New", 'Insights & market updates feed'],
  ['students', 'Students', 'Student records & details'],
  ['requests', 'Requests', 'Service requests, case chats & documents'],
  ['services', 'Services marketplace', 'Browse & refer into services'],
  ['wallet', 'Wallet', 'Balance & transactions'],
  ['commissions', 'Commissions', 'Payout structures & history'],
];
export const PERM_LIST: [Perm, string, string][] = [
  ['create', 'Create requests', 'Raise service requests for students'],
  ['chat', 'Chat with service desk', 'Message on case threads'],
  ['upload', 'Upload documents', 'Attach files to cases'],
  ['edit', 'Edit student details', 'Modify student records'],
  ['withdraw', 'Request withdrawals', 'Initiate wallet withdrawals'],
];

export function UserModal({ open, member, onClose, onSaved }: { open: boolean; member: TeamMember | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const blank = { name: '', email: '', password: '', role: 'Staff' as TeamMember['role'], menus: ['overview', 'whatsnew', 'students', 'requests', 'services'] as Menu[], perms: ['create', 'chat', 'upload'] as Perm[] };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setF(member ? { name: member.name, email: member.email, password: '', role: member.role, menus: member.menus, perms: member.perms } : blank);
  }, [open, member]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.email.trim()) return setError('Name and work email are required');
    if (!member && f.password.length < 8) return setError('Set a temporary password of at least 8 characters');
    if (member && f.password && f.password.length < 8) return setError('The new password needs at least 8 characters');
    setBusy(true);
    try {
      const { password, ...rest } = f;
      if (member) {
        await api.updateMember(member.id, password ? f : rest);
        toast(password ? `${f.name}'s access and password updated.` : `${f.name}'s access updated.`);
      } else {
        await api.addMember(f);
        toast(`${f.name} can now sign in with ${f.email.trim()} and the password you set.`);
      }
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
      <Hero title={member ? `Edit ${member.name}` : 'Add team member'} sub="Choose what this person can see and do on your account." onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="uName">Full name *</label><input id="uName" placeholder="e.g. Kiran Desai" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="field"><label htmlFor="uEmail">Work email *</label><input id="uEmail" type="email" placeholder="name@agency.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="uRole">Role *</label>
            <select id="uRole" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as TeamMember['role'] })}>
              <option value="Manager">Manager</option>
              <option value="Staff">Counsellor / staff</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="uPassword">{member ? 'New password' : 'Temporary password *'}</label>
            <input id="uPassword" type="text" autoComplete="new-password" placeholder={member ? 'Leave blank to keep the current one' : 'At least 8 characters'}
              value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
          <p className="full hint" style={{ fontSize: '.76rem', margin: '-.4rem 0 .6rem' }}>
            Share the password with them yourself. They can change it after signing in.
          </p>
          <div className="field full">
            <label style={{ marginBottom: '.2rem' }}>Menu access</label>
            <div className="switches">
              {MENU_LIST.map(([k, l, d]) => (
                <div className="sw-row" key={k}>
                  <div><b>{l}</b><span>{d}</span></div>
                  <label className="sw"><input type="checkbox" checked={f.menus.includes(k)} onChange={() => setF({ ...f, menus: toggle(f.menus, k) })} /><i></i></label>
                </div>
              ))}
            </div>
          </div>
          <div className="field full">
            <label style={{ marginBottom: '.2rem' }}>Actions on service requests</label>
            <div className="switches">
              {PERM_LIST.map(([k, l, d]) => (
                <div className="sw-row" key={k}>
                  <div><b>{l}</b><span>{d}</span></div>
                  <label className="sw"><input type="checkbox" checked={f.perms.includes(k)} onChange={() => setF({ ...f, perms: toggle(f.perms, k) })} /><i></i></label>
                </div>
              ))}
            </div>
          </div>
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta" style={{ marginTop: '.4rem' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : member ? 'Save Changes' : 'Create Member'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ---------- student record: edit + raise services ---------- */
export function StudentModal({ student, canEdit, canCreate, onClose, onChanged }: {
  student: Student | null; canEdit: boolean; canCreate: boolean; onClose: () => void; onChanged: (s: Student) => void;
}) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', phone: '', country: '' });
  const [saved, setSaved] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!student) return;
    setF({ name: student.name, email: student.email, phone: student.phone, country: student.country });
    setSaved(false); setPick([]); setError('');
  }, [student?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!student) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const active = student.requests.filter((r) => r.status !== 'Completed');
  const taken = new Set(active.map((r) => r.service));
  const latest = student.requests[student.requests.length - 1];

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const s = await api.updateStudent(student.id, f);
      setSaved(true);
      onChanged(s);
      toast(`${s.name}'s record updated.`);
    } catch (err) {
      setError(errMsg(err));
    }
  };
  const raise = async () => {
    setBusy(true);
    try {
      const s = await api.raiseRequests(student.id, pick);
      toast(`${pick.map(serviceName).join(', ')} raised for ${s.name}. You'll find ${pick.length > 1 ? 'them' : 'it'} under Requests.`);
      setPick([]);
      onChanged(s);
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose}>
      <Hero title="" onClose={onClose}>
        <div className="req-head-row">
          <div>
            <h3 style={{ position: 'relative', zIndex: 1 }}>{student.name}</h3>
            <p style={{ position: 'relative', zIndex: 1 }}>{student.code} · {student.country} · Added {fmtDate(student.createdAt)}</p>
          </div>
          {latest ? <span className={`status ${statusClass(latest.status)}`}>{latest.status}</span> : null}
        </div>
      </Hero>
      <div className="modal-body">
        <div className="m-sec">
          <h4>Student details {canEdit ? <span className="hint">edit and save to update the record</span> : null}</h4>
          <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <form className="form-grid" onSubmit={save} noValidate>
            <div className="field"><label htmlFor="stName">Name *</label><input id="stName" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="stEmail">Email</label><input id="stEmail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="field"><label htmlFor="stPhone">Phone *</label><input id="stPhone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div className="field">
              <label htmlFor="stCountry">Destination *</label>
              <select id="stCountry" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{DESTINATIONS.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
            {error ? <p className="form-error full">{error}</p> : null}
            {canEdit ? (
              <div className="full" style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginTop: '.2rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">Save changes</button>
                {saved ? <span style={{ fontSize: '.78rem', color: 'var(--green-deep)', fontWeight: 600 }}>Saved</span> : null}
              </div>
            ) : null}
          </form>
          </fieldset>
        </div>
        <div className="m-sec">
          <h4>Active services <span className="hint">raised for this student</span></h4>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.9rem' }}>
            {student.requests.length
              ? student.requests.map((r) => <span className="pill ctry" key={r.id}>{serviceName(r.service)} <em style={{ fontStyle: 'normal', opacity: 0.7 }}>· {r.ref} · {r.status}</em></span>)
              : <span className="pill">No services yet</span>}
          </div>
          {canCreate ? <>
          <h4>Raise a service request <span className="hint">tick as many as you need</span></h4>
          <div className="stu-svc-pick">
            {visibleServices().map((s) => {
              const isTaken = taken.has(s.key);
              const on = pick.includes(s.key);
              return (
                <label key={s.key} className={`pick-chip${isTaken ? ' done' : on ? ' on' : ''}`}>
                  <input type="checkbox" disabled={isTaken} checked={on} onChange={() => setPick(on ? pick.filter((k) => k !== s.key) : [...pick, s.key])} />
                  {s.name}{isTaken ? <em>active</em> : null}
                </label>
              );
            })}
          </div>
          <button className="btn btn-green" disabled={!pick.length || busy} onClick={raise}>
            {busy ? 'Raising…' : pick.length ? `Raise ${pick.length} request${pick.length > 1 ? 's' : ''}` : 'Raise selected requests'}
          </button>
          </> : null}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- profile photo (or initials when there is none) ---------- */
export function Avatar({ name, photo, size = 32, radius = '50%', className = 'av' }: { name: string; photo?: string; size?: number; radius?: string; className?: string }) {
  const style = { width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.38) };
  return photo
    ? <img className={`${className} av-photo`} src={avatarUrl(photo)} alt={name} style={{ ...style, objectFit: 'cover' }} />
    : <span className={className} style={style}>{initials(name)}</span>;
}

export function PhotoModal({ open, name, photo, onClose, onSaved }: {
  open: boolean; name: string; photo: string; onClose: () => void; onSaved: (a: Agent) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) setError(''); }, [open]);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Choose a JPG, PNG or WebP photo');
    if (file.size > 2 * 1024 * 1024) return setError('The photo must be 2 MB or smaller');
    setBusy(true);
    setError('');
    try {
      onSaved(await api.uploadAvatar(file));
      toast('Profile photo updated.');
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      onSaved(await api.removeAvatar());
      toast('Profile photo removed.');
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Profile photo" sub="Shown on your dashboard, in the app and to your UniVerse team." onClose={onClose} />
      <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Avatar name={name} photo={photo} size={112} className="photo-preview" />
        <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pick} />
        {error ? <p className="form-error">{error}</p> : null}
        <p style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>JPG, PNG or WebP, up to 2 MB. A square photo of your face works best.</p>
        <div className="m-cta" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Saving…' : photo ? 'Choose another photo' : 'Upload a photo'}</button>
          {photo ? <button className="btn btn-ghost" disabled={busy} onClick={remove}>Remove photo</button> : null}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- edit profile (incl. bank account for payouts) ---------- */
export function ProfileModal({ open, agent, onClose, onSaved }: { open: boolean; agent: Agent; onClose: () => void; onSaved: (a: Agent) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', agency: '', phone: '', city: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setF({ name: agent.name, agency: agent.agency, phone: agent.phone, city: agent.city }); setError(''); }
  }, [open, agent]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const a = await api.updateMe(f);
      onSaved(a);
      toast('Profile updated.');
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Edit profile" sub="These details appear on your partner record and payouts." onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="pName">Your name *</label><input id="pName" value={f.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="pAgency">Agency</label><input id="pAgency" value={f.agency} onChange={set('agency')} /></div>
          <div className="field"><label htmlFor="pPhone">Phone</label><input id="pPhone" type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label htmlFor="pCity">City</label><input id="pCity" value={f.city} onChange={set('city')} /></div>
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ---------- floating RM chat drawer ---------- */
const PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';

export function RmDrawer({ open, agent, myName, isOwner, canChat, onClose }: {
  open: boolean; agent: Agent; myName: string; isOwner: boolean; canChat: boolean; onClose: () => void;
}) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const bodyRef = useAutoScroll(msgs.length + (open ? 1 : 0));
  useEffect(() => { if (open) api.rmMessages().then(setMsgs).catch(() => {}); }, [open]);
  useInterval(() => { api.rmMessages().then(setMsgs).catch(() => {}); }, open ? 3000 : null);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      const m = await api.sendRmMessage(t);
      setMsgs((xs) => [...xs, m]);
    } catch (err) {
      setText(t);
      toast(errMsg(err));
    }
  };
  const first = agent.rm.name.split(' ')[0];

  return (
    <div className={`rm-drawer${open ? ' open' : ''}`} role="dialog" aria-modal="false" aria-label="Chat with Relationship Manager" inert={!open}>
      <div className="rm-head">
        <span className="av">{initials(agent.rm.name)}</span>
        <div>
          <b>{agent.rm.name}</b><i>Relationship manager</i>
          <div className="rm-contact">
            <a href={`tel:${agent.rm.phone.replace(/\s/g, '')}`}><Svg html={PHONE} />{agent.rm.phone}</a>
            <a href={`mailto:${agent.rm.email}`}><Svg html={MAIL} />{agent.rm.email}</a>
          </div>
        </div>
        <button className="x" aria-label="Close chat" onClick={onClose}>✕</button>
      </div>
      <div className="rm-body" ref={bodyRef}>
        {msgs.length
          ? <Bubbles msgs={msgs} them={first} me={{ name: myName, isOwner, ownerName: agent.name }} />
          : <div className="csys">{first} usually replies within one business day.</div>}
      </div>
      {canChat ? (
        <div className="rm-foot">
          <input placeholder={`Message ${first}…`} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button className="btn btn-primary btn-sm" onClick={send} disabled={!text.trim()}>Send</button>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- change your own password ---------- */
export function PasswordModal({ open, onClose, save = api.changePassword, min = 8 }: {
  open: boolean; onClose: () => void; save?: (current: string, next: string) => Promise<unknown>; min?: number;
}) {
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF({ current: '', next: '', confirm: '' }); setError(''); } }, [open]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.current) return setError('Enter your current password');
    if (f.next.length < min) return setError(`The new password needs at least ${min} characters`);
    if (f.next !== f.confirm) return setError("The new passwords don't match");
    setBusy(true);
    try {
      await save(f.current, f.next);
      toast('Password changed.');
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Change password" onClose={onClose} />
      <div className="modal-body">
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="pwCurrent">Current password</label><input id="pwCurrent" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoFocus /></div>
          <div className="field"><label htmlFor="pwNext">New password</label><input id="pwNext" type="password" autoComplete="new-password" placeholder={`At least ${min} characters`} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></div>
          <div className="field"><label htmlFor="pwConfirm">Repeat new password</label><input id="pwConfirm" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
