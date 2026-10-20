import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { GstEntity, InvoicePreview, Transaction, TxDetail, Wallet } from '../lib/api';
import { fmtDate, inr } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { SignaturePad } from '../components/onboarding';
import { errMsg, Hero, Modal } from './modals';

/* Withdraw by picking cleared commission entries. TDS (2%) is deducted on the entries withdrawn. "Without GST" goes
   straight to the payout account; "with GST" drafts a tax invoice with one line per entry, which the partner checks
   and signs, and the desk verifies before paying the entries + GST − TDS. */

type Step = 'form' | 'invoice' | 'sign';
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isCommission = (t: Transaction) => t.kind === 'commission' && t.gross == null;

export function WithdrawModal({ open, wallet, isOwner, onClose, onDone, onAddMethod, onKyc }: {
  open: boolean; wallet: Wallet | null; isOwner: boolean; onClose: () => void; onDone: () => void; onAddMethod: () => void; onKyc?: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<Step>('form');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [methodId, setMethodId] = useState('');
  const [mode, setMode] = useState<'plain' | 'gst'>('plain');
  const [entities, setEntities] = useState<GstEntity[]>([]);
  const [entityId, setEntityId] = useState('');
  const [adding, setAdding] = useState(false);
  const [ne, setNe] = useState({ gstin: '', legalName: '', address: '', isDefault: false });
  const [invNo, setInvNo] = useState('');
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [signedName, setSignedName] = useState('');
  const [sig, setSig] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const available = useMemo(() => (wallet?.transactions ?? []).filter((t) => t.type === 'Credit' && t.entryState === 'available'), [wallet]);

  useEffect(() => {
    if (!open || !wallet) return;
    setStep('form'); setError(''); setPreview(null); setSig(''); setAdding(false); setSel(new Set());
    setMethodId(wallet.methods.find((m) => m.isDefault)?.id ?? wallet.methods[0]?.id ?? '');
    setEntities(wallet.gstEntities);
    setEntityId(wallet.gstEntities.find((g) => g.isDefault)?.id ?? wallet.gstEntities[0]?.id ?? '');
    setMode('plain');
    api.nextInvoiceNumber().then((r) => setInvNo(r.suggestion)).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!wallet) return null;

  const rate = wallet.tdsRate;
  const chosen = available.filter((t) => sel.has(t.id));
  const G = chosen.reduce((x, t) => x + t.amount, 0);
  const T = Math.round((chosen.filter(isCommission).reduce((x, t) => x + t.amount, 0) * rate) / 100);
  const gstAdd = mode === 'gst' ? Math.round(G * wallet.gstRate) / 100 : 0;
  const payout = G + gstAdd - T;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = available.length > 0 && chosen.length === available.length;

  const checkForm = () => {
    if (!chosen.length) return 'Select at least one commission entry';
    if (payout < wallet.minWithdrawal) return `The minimum payout is ${inr(wallet.minWithdrawal)}. Select more entries.`;
    if (!methodId) return 'Choose where to receive the money';
    if (mode === 'gst') {
      if (!entityId) return 'Choose or add the GST registration to invoice from';
      if (!/^[A-Za-z0-9/-]{1,16}$/.test(invNo.trim())) return 'Enter your invoice number (up to 16 letters, digits, / or -)';
    }
    return '';
  };
  const ids = () => chosen.map((t) => t.id);
  const next = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const p = checkForm();
    if (p) return setError(p);
    setBusy(true);
    try {
      if (mode === 'plain') {
        await api.withdraw(ids(), methodId);
        toast(`Withdrawal requested: ${inr(payout)} after ${inr(T)} TDS. You'll get a notification when it's paid.`);
        onDone();
        onClose();
        return;
      }
      setPreview(await api.invoicePreview({ entryIds: ids(), methodId, gstEntityId: entityId, invoiceNumber: invNo.trim() }));
      setStep('invoice');
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const addEntity = async () => {
    setError('');
    const g = ne.gstin.trim().toUpperCase();
    if (!GSTIN_RE.test(g)) return setError('Enter a valid 15-character GSTIN');
    if (!ne.legalName.trim() || ne.address.trim().length < 8) return setError('Enter the legal name and address registered under this GSTIN');
    setBusy(true);
    try {
      const created = await api.addGstEntity({ gstin: g, legalName: ne.legalName.trim(), address: ne.address.trim(), isDefault: ne.isDefault });
      setEntities(await api.gstEntities());
      setEntityId(created.id);
      setAdding(false);
      setNe({ gstin: '', legalName: '', address: '', isDefault: false });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const sign = async () => {
    setError('');
    if (signedName.trim().length < 3) return setError('Type your name as the authorised signatory');
    if (!sig) return setError('Draw your signature');
    setBusy(true);
    try {
      await api.withdraw(ids(), methodId, { gstEntityId: entityId, invoiceNumber: invNo.trim(), signedName: signedName.trim(), signature: sig });
      toast(`Invoice ${invNo.trim()} signed. We'll verify it and pay ${money(preview?.payable ?? 0)}.`);
      onDone();
      onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const blocked = !wallet.canWithdraw;
  return (
    <Modal open={open} onClose={onClose} className="modal-wide">
      <Hero
        title={step === 'form' ? 'Withdraw funds' : step === 'invoice' ? 'Tax invoice: review' : 'Sign the invoice'}
        sub={step === 'form' ? `Pick the commission entries to redeem. TDS @${rate}% is applied only on the entries you select.` : `Invoice ${invNo} to UniVerse · ${chosen.length} ${chosen.length === 1 ? 'entry' : 'entries'}`}
        onClose={onClose}
      />
      <div className="modal-body">
        {blocked ? (
          <>
            <p style={{ fontSize: '.92rem' }}>{wallet.withdrawBlock}</p>
            <div className="m-cta">
              {isOwner && onKyc ? <button className="btn btn-primary" onClick={() => { onClose(); onKyc(); }}>Go to KYC & agreement</button> : null}
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </>
        ) : !wallet.methods.length ? (
          <>
            <p style={{ fontSize: '.92rem' }}>{isOwner ? 'Add a UPI ID or bank account to receive your money. You only do this once.' : 'Ask your account owner to add a UPI ID or bank account.'}</p>
            <div className="m-cta">
              {isOwner ? <button className="btn btn-primary" onClick={() => { onClose(); onAddMethod(); }}>Add UPI or bank account</button> : null}
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : step === 'form' ? (
          <form onSubmit={next} noValidate>
            <p className="form-sec-title" style={{ marginTop: 0 }}>How should this withdrawal be billed?</p>
            <div className="seg2" role="radiogroup">
              <button type="button" role="radio" aria-checked={mode === 'plain'} className={mode === 'plain' ? 'on' : ''} onClick={() => setMode('plain')}>
                <b>Without GST</b><span>Payout of the selected commissions net of TDS. No invoice needed.</span>
              </button>
              <button type="button" role="radio" aria-checked={mode === 'gst'} className={mode === 'gst' ? 'on' : ''} onClick={() => setMode('gst')}>
                <b>With GST invoice</b><span>Invoice lines built from the selected student services. Paid + {wallet.gstRate}% GST; you sign it.</span>
              </button>
            </div>

            <p className="form-sec-title">Commission entries to redeem <span className="hint">cleared and not yet withdrawn</span></p>
            {available.length ? (
              <div className="wd-entries">
                <label className="wd-erow wd-selall">
                  <input type="checkbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = chosen.length > 0 && !allOn; }} onChange={(e) => setSel(e.target.checked ? new Set(available.map((t) => t.id)) : new Set())} />
                  <div className="wd-einfo"><b>Select all cleared commissions</b><span>{available.length} {available.length === 1 ? 'entry' : 'entries'} · {inr(available.reduce((x, t) => x + t.amount, 0))}</span></div>
                  <div className="wd-eamt" />
                </label>
                {available.map((t) => (
                  <label key={t.id} className={`wd-erow${sel.has(t.id) ? ' sel' : ''}`}>
                    <input type="checkbox" checked={sel.has(t.id)} onChange={() => toggle(t.id)} />
                    <div className="wd-einfo"><b>{t.description}</b><span>{fmtDate(t.date)}</span></div>
                    <div className="wd-eamt"><b>{inr(t.amount)}</b><span>{isCommission(t) ? `TDS ${inr(Math.round(t.amount * rate / 100))} on withdrawal` : 'No TDS'}</span></div>
                  </label>
                ))}
              </div>
            ) : <p className="adm-meta" style={{ margin: '.4rem 0 1rem' }}>No cleared commission entries to withdraw yet. Pending entries are still clearing.</p>}
            <div className="wd-totals">
              {chosen.length ? (
                <>
                  <span><b>{chosen.length}</b> {chosen.length === 1 ? 'entry' : 'entries'} · Gross <b>{inr(G)}</b> · TDS ({rate}%) <b>− {inr(T)}</b>{mode === 'gst' ? <> · GST ({wallet.gstRate}%) <b>+ {inr(gstAdd)}</b></> : null}</span>
                  <span className="pay">Payout to account: {inr(payout)}</span>
                </>
              ) : <span>Select one or more commission entries above to build your withdrawal.</span>}
            </div>

            {mode === 'gst' ? (
              <div className="field">
                <label>Invoice from (GST registration) *</label>
                <div className="pm-pick">
                  {entities.map((g) => (
                    <label key={g.id} className={`pm-opt${entityId === g.id ? ' on' : ''}`}>
                      <input type="radio" name="wdGst" checked={entityId === g.id} onChange={() => setEntityId(g.id)} />
                      <span><b>{g.legalName}{g.isDefault ? ' · default' : ''}</b><small>GSTIN {g.gstin} · {g.state}</small></span>
                    </label>
                  ))}
                </div>
                {!adding && isOwner ? <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '.5rem' }} onClick={() => setAdding(true)}>{entities.length ? '+ Use another GST registration' : '+ Add your GST details'}</button> : null}
                {adding ? (
                  <div className="gst-add">
                    <div className="field-grid">
                      <div className="field"><label htmlFor="ngG">GSTIN</label><input id="ngG" maxLength={15} value={ne.gstin} onChange={(e) => setNe({ ...ne, gstin: e.target.value.toUpperCase().replace(/\s/g, '') })} /></div>
                      <div className="field"><label htmlFor="ngN">Legal name</label><input id="ngN" value={ne.legalName} onChange={(e) => setNe({ ...ne, legalName: e.target.value })} /></div>
                      <div className="field full"><label htmlFor="ngA">Registered address</label><input id="ngA" value={ne.address} onChange={(e) => setNe({ ...ne, address: e.target.value })} /></div>
                    </div>
                    <label className="remember" style={{ display: 'flex', gap: '.4rem', alignItems: 'center', fontSize: '.84rem' }}><input type="checkbox" checked={ne.isDefault} onChange={(e) => setNe({ ...ne, isDefault: e.target.checked })} /> Make this my default</label>
                    <div className="m-cta" style={{ marginTop: '.6rem' }}>
                      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={addEntity}>Save GST registration</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
                    </div>
                  </div>
                ) : null}
                <div className="field" style={{ marginTop: '.9rem' }}>
                  <label htmlFor="wdInv">Your invoice number *</label>
                  <input id="wdInv" maxLength={16} value={invNo} onChange={(e) => setInvNo(e.target.value)} />
                  <span className="field-hint">From your own invoice series for this GSTIN. Each number can be used once.</span>
                </div>
              </div>
            ) : null}

            <div className="field">
              <label>Payout account *</label>
              <div className="pm-pick">
                {wallet.methods.map((m) => (
                  <label key={m.id} className={`pm-opt${methodId === m.id ? ' on' : ''}`}>
                    <input type="radio" name="wdMethod" checked={methodId === m.id} onChange={() => setMethodId(m.id)} />
                    <span><b>{m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`}</b><small>{m.type === 'upi' ? 'UPI' : `${m.holder} · ${m.ifsc}`}</small></span>
                  </label>
                ))}
              </div>
            </div>
            <p className="adm-meta" style={{ margin: '.2rem 0 1rem' }}>Payout is released after approval by the UniVerse team. TDS is deposited against your PAN.</p>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta">
              <button type="submit" className="btn btn-green btn-lg" disabled={busy || !chosen.length}>{busy ? 'Please wait…' : mode === 'gst' ? 'Build invoice' : 'Request withdrawal'}</button>
              <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
            </div>
          </form>
        ) : step === 'invoice' && preview ? (
          <>
            <InvoiceView p={preview} />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta">
              <button className="btn btn-green btn-lg" onClick={() => { setSignedName(''); setStep('sign'); }}>Details are correct, sign</button>
              <button className="btn btn-ghost btn-lg" onClick={() => setStep('form')}>Edit</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '.9rem', marginBottom: '.8rem' }}>You are signing tax invoice <b>{invNo}</b> from <b>{preview?.supplier.legalName}</b> for <b>{money(preview?.payable ?? 0)}</b> payable. It is attached to your withdrawal for the UniVerse team to verify.</p>
            <div className="field"><label htmlFor="wdSigner">Authorised signatory name *</label><input id="wdSigner" value={signedName} onChange={(e) => setSignedName(e.target.value)} /></div>
            <SignaturePad onChange={setSig} />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta">
              <button className="btn btn-primary btn-lg" disabled={busy} onClick={sign}>{busy ? 'Submitting…' : 'Sign & submit withdrawal'}</button>
              <button className="btn btn-ghost btn-lg" onClick={() => setStep('invoice')}>Back</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** The tax invoice, laid out like the PDF: one line per student-service commission */
export function InvoiceView({ p, signed }: { p: Pick<InvoicePreview, 'number' | 'date' | 'supplier' | 'recipient' | 'lines' | 'sac' | 'amount' | 'tds' | 'tdsRate' | 'gstRate' | 'cgst' | 'sgst' | 'igst' | 'gst' | 'payable' | 'interState' | 'payTo'>; signed?: { name: string; at: string } }) {
  const half = p.gstRate / 2;
  return (
    <div className="inv">
      <div className="inv-top">
        <div><b className="inv-from">{p.supplier.legalName}</b><span>{p.supplier.address}{p.supplier.state ? `, ${p.supplier.state}` : ''}</span><span>GSTIN {p.supplier.gstin}</span></div>
        <div className="inv-title"><b>TAX INVOICE</b><span>No. {p.number}</span><span>{new Date(p.date).toLocaleDateString('en-GB')}</span></div>
      </div>
      <div className="inv-to"><small>Bill to</small><b>{p.recipient.legalName}</b><span>{p.recipient.address}{p.recipient.state ? `, ${p.recipient.state}` : ''}</span><span>GSTIN {p.recipient.gstin || '—'} · Place of supply {p.recipient.state}</span></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="inv-tbl">
          <thead><tr><th>#</th><th>Description: student service commissions</th><th>SAC</th><th className="r">Amount</th></tr></thead>
          <tbody>{p.lines.map((l, i) => <tr key={l.id}><td>{i + 1}</td><td>{l.desc} <small style={{ color: 'var(--ink-soft)' }}>({l.sub})</small></td><td>{p.sac}</td><td className="r">{money(l.amount)}</td></tr>)}</tbody>
        </table>
      </div>
      <dl className="inv-sum txd">
        <dt>Taxable value</dt><dd>{money(p.amount)}</dd>
        {p.interState ? <><dt>IGST @ {p.gstRate}%</dt><dd>{money(p.igst)}</dd></> : <><dt>CGST @ {half}%</dt><dd>{money(p.cgst)}</dd><dt>SGST @ {half}%</dt><dd>{money(p.sgst)}</dd></>}
        <dt>Invoice total</dt><dd>{money(p.amount + p.gst)}</dd>
        <dt>Less: TDS @ {p.tdsRate}% (section 393), deposited to your PAN</dt><dd>− {money(p.tds)}</dd>
        <dt className="inv-net">You receive</dt><dd className="inv-net">{money(p.payable)}</dd>
      </dl>
      <p className="inv-foot">Wallet debited: <b>{money(p.amount)}</b> · GST paid on top by UniVerse: <b>{money(p.gst)}</b>{p.payTo ? <> · Paid to {p.payTo}</> : null}</p>
      {signed ? <p className="inv-foot">Signed by <b>{signed.name}</b> · {new Date(signed.at).toLocaleString('en-GB')}</p> : null}
    </div>
  );
}

/** Tap a wallet row: a commission shows its TDS and where it was redeemed; a withdrawal shows the receipt or the signed invoice */
export function TxDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<TxDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setD(null); setError('');
    if (id) api.transaction(id).then(setD).catch((e) => setError(errMsg(e)));
  }, [id]);
  const credit = d?.type === 'Credit';
  const stateLabel = (s?: string | null) => ({ clearing: 'Clearing', available: 'Available', in_process: 'In process', redeemed: 'Redeemed', cancelled: 'Cancelled' } as Record<string, string>)[s ?? ''] ?? '';
  return (
    <Modal open={!!id} onClose={onClose}>
      <Hero title={!d ? 'Transaction' : credit ? 'Commission entry' : d.invoice ? `Invoice ${d.invoice.number}` : 'Payout receipt'} sub={d ? fmtDate(d.date) : ''} onClose={onClose} />
      <div className="modal-body">
        {error ? <p className="form-error">{error}</p> : !d ? <p className="adm-meta">Loading…</p> : credit ? (
          <dl className="inv-sum txd">
            <dt>Description</dt><dd>{d.description}</dd>
            <dt>Amount credited</dt><dd>{money(d.amount)}</dd>
            {d.gross != null ? <><dt>TDS deducted at credit (older entry)</dt><dd>− {money(d.tds ?? 0)}</dd></> : <><dt>TDS @ {d.tdsRate ?? 2}% when withdrawn</dt><dd>− {money(d.tdsOnWithdrawal ?? 0)}</dd></>}
            <dt>Status</dt><dd>{stateLabel(d.entryState) || d.status}</dd>
            {d.redeemedIn ? <><dt>Withdrawn in</dt><dd>{d.redeemedIn.description} · {fmtDate(d.redeemedIn.date)} · {d.redeemedIn.status === 'Completed' ? 'Paid' : d.redeemedIn.status}</dd></> : null}
          </dl>
        ) : (
          <>
            <p className="adm-meta" style={{ marginTop: 0 }}>{d.invoice ? `From ${d.invoice.legalName} (GSTIN ${d.invoice.gstin})` : `Receipt ${d.receiptNo}`} · to {d.method?.label ?? 'your account'}</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="inv-tbl">
                <thead><tr><th>#</th><th>Entry</th><th className="r">Amount</th><th className="r">TDS</th></tr></thead>
                <tbody>{(d.lines ?? []).map((l, i) => <tr key={l.id}><td>{i + 1}</td><td>{l.desc} <small style={{ color: 'var(--ink-soft)' }}>({l.sub})</small></td><td className="r">{money(l.amount)}</td><td className="r">{l.tds ? `− ${money(l.tds)}` : '—'}</td></tr>)}</tbody>
              </table>
            </div>
            <dl className="inv-sum txd">
              <dt>Entries withdrawn</dt><dd>{money(d.amount)}</dd>
              <dt>TDS @ {d.tdsRate ?? 2}% (section 393)</dt><dd>− {money(d.tds ?? 0)}</dd>
              {d.invoiceDetail ? <><dt>GST @ {d.invoiceDetail.gstRate}%</dt><dd>+ {money(d.invoice?.gst ?? 0)}</dd></> : null}
              <dt className="inv-net">Paid to you</dt><dd className="inv-net">{money(d.netPayout ?? d.amount)}</dd>
              <dt>Status</dt><dd>{d.status === 'Completed' ? 'Paid' : d.status === 'Rejected' ? 'Failed' : d.payout?.state === 'processing' ? 'On its way' : 'Requested'}</dd>
              {d.payout?.utr ? <><dt>Bank reference (UTR)</dt><dd>{d.payout.utr}</dd></> : null}
              {d.payout?.reason ? <><dt>Note</dt><dd>{d.payout.reason}</dd></> : null}
              {d.invoiceDetail ? <><dt>Signed by</dt><dd>{d.invoiceDetail.signedName} · {new Date(d.invoiceDetail.signedAt).toLocaleString('en-GB')}{d.invoiceDetail.verified ? ' · verified by UniVerse' : ' · awaiting verification'}</dd></> : null}
            </dl>
            {d.invoice ? <div className="m-cta"><button className="btn btn-ghost" onClick={() => api.downloadInvoice(d.id, `Invoice ${d.invoice!.number}.pdf`).catch((e) => toast(e.message))}>Download signed invoice (PDF)</button></div> : null}
          </>
        )}
      </div>
    </Modal>
  );
}
