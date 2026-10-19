import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { GstEntity, InvoicePreview, Wallet } from '../lib/api';
import { inr } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { SignaturePad } from '../components/onboarding';
import { errMsg, Hero, Modal } from './modals';

/* Withdraw "without GST" (straight to a payout method) or "with GST": choose the GST registration, preview the tax
   invoice the platform drafts, confirm, sign it, and the signed invoice goes with the request for the desk to verify. */

type Step = 'form' | 'invoice' | 'sign';
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function WithdrawModal({ open, wallet, isOwner, onClose, onDone, onAddMethod, onKyc }: {
  open: boolean; wallet: Wallet | null; isOwner: boolean; onClose: () => void; onDone: () => void; onAddMethod: () => void; onKyc?: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
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

  useEffect(() => {
    if (!open || !wallet) return;
    setStep('form'); setAmount(''); setError(''); setPreview(null); setSig(''); setAdding(false);
    setMethodId(wallet.methods.find((m) => m.isDefault)?.id ?? wallet.methods[0]?.id ?? '');
    setEntities(wallet.gstEntities);
    setEntityId(wallet.gstEntities.find((g) => g.isDefault)?.id ?? wallet.gstEntities[0]?.id ?? '');
    setMode(wallet.gstEntities.length ? 'gst' : 'plain');
    api.nextInvoiceNumber().then((r) => setInvNo(r.suggestion)).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!wallet) return null;
  const { balance, minWithdrawal } = wallet;
  const amt = parseInt(amount, 10);

  const checkForm = () => {
    if (!amt || amt < minWithdrawal) return `Minimum withdrawal is ${inr(minWithdrawal)}`;
    if (amt > balance) return `You can withdraw up to ${inr(balance)}`;
    if (!methodId) return 'Choose where to receive the money';
    if (mode === 'gst') {
      if (!entityId) return 'Choose or add the GST registration to invoice from';
      if (!/^[A-Za-z0-9/-]{1,16}$/.test(invNo.trim())) return 'Enter your invoice number (up to 16 letters, digits, / or -)';
    }
    return '';
  };

  const submitPlain = async () => {
    setBusy(true);
    try {
      await api.withdraw(amt, methodId);
      toast(`Withdrawal of ${inr(amt)} requested. You'll get a notification when it's paid.`);
      onDone();
      onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const next = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const p = checkForm();
    if (p) return setError(p);
    if (mode === 'plain') return submitPlain();
    setBusy(true);
    try {
      setPreview(await api.invoicePreview({ amount: amt, methodId, gstEntityId: entityId, invoiceNumber: invNo.trim() }));
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
      const list = await api.gstEntities();
      setEntities(list);
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
      await api.withdraw(amt, methodId, { gstEntityId: entityId, invoiceNumber: invNo.trim(), signedName: signedName.trim(), signature: sig });
      toast(`Withdrawal of ${inr(amt)} + GST requested with invoice ${invNo.trim()}. We'll verify it and pay you.`);
      onDone();
      onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const blocked = !wallet.canWithdraw;
  return (
    <Modal open={open} onClose={onClose} className={step !== 'form' ? 'modal-wide' : ''}>
      <Hero
        title={step === 'form' ? 'Withdraw funds' : step === 'invoice' ? 'Check your tax invoice' : 'Sign the invoice'}
        sub={step === 'form' ? (wallet.instantPayouts ? 'Sent by UPI or IMPS once approved, usually within minutes.' : 'Checked and paid within two working days of approval.') : `Invoice ${invNo} to UniVerse for ${inr(amt)} commission`}
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
            <div className="field"><label htmlFor="wdAmount">Amount (₹) *</label><input id="wdAmount" type="number" min={minWithdrawal} step={100} placeholder={`Minimum ₹${minWithdrawal}`} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
            <p style={{ fontSize: '.8rem', color: 'var(--ink-soft)', margin: '-.3rem 0 1rem' }}>
              Available: <b style={{ color: 'var(--navy)' }}>{inr(balance)}</b>
              {balance >= minWithdrawal ? <> · <a href="#" onClick={(e) => { e.preventDefault(); setAmount(String(balance)); }}>Withdraw all</a></> : null}
            </p>

            <div className="field">
              <label>GST</label>
              <div className="seg2" role="radiogroup">
                <button type="button" role="radio" aria-checked={mode === 'plain'} className={mode === 'plain' ? 'on' : ''} onClick={() => setMode('plain')}>
                  <b>Without GST</b><span>Not registered under GST. Paid the amount above.</span>
                </button>
                <button type="button" role="radio" aria-checked={mode === 'gst'} className={mode === 'gst' ? 'on' : ''} onClick={() => setMode('gst')}>
                  <b>With GST</b><span>Raise a tax invoice. Paid the amount + {wallet.gstRate}% GST.</span>
                </button>
              </div>
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
              <label>{mode === 'gst' ? 'Bank account of this GST registration *' : 'Send to *'}</label>
              <div className="pm-pick">
                {wallet.methods.map((m) => (
                  <label key={m.id} className={`pm-opt${methodId === m.id ? ' on' : ''}`}>
                    <input type="radio" name="wdMethod" checked={methodId === m.id} onChange={() => setMethodId(m.id)} />
                    <span><b>{m.type === 'upi' ? m.upi : `${m.bankName || 'Bank account'} ••${m.last4}`}</b><small>{m.type === 'upi' ? 'UPI' : `${m.holder} · ${m.ifsc}`}</small></span>
                  </label>
                ))}
              </div>
              {isOwner ? <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '.5rem' }} onClick={() => { onClose(); onAddMethod(); }}>+ Add a bank account</button> : null}
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta">
              <button type="submit" className="btn btn-green btn-lg" disabled={busy}>{busy ? 'Please wait…' : mode === 'gst' ? 'Preview invoice' : 'Request withdrawal'}</button>
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
              <button className="btn btn-green btn-lg" disabled={busy} onClick={sign}>{busy ? 'Submitting…' : 'Sign and request withdrawal'}</button>
              <button className="btn btn-ghost btn-lg" onClick={() => setStep('invoice')}>Back</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** The draft tax invoice, laid out like the PDF the platform generates */
function InvoiceView({ p }: { p: InvoicePreview }) {
  const half = p.gstRate / 2;
  return (
    <div className="inv">
      <div className="inv-top">
        <div><b className="inv-from">{p.supplier.legalName}</b><span>{p.supplier.address}{p.supplier.state ? `, ${p.supplier.state}` : ''}</span><span>GSTIN {p.supplier.gstin}</span></div>
        <div className="inv-title"><b>TAX INVOICE</b><span>No. {p.number}</span><span>{new Date(p.date).toLocaleDateString('en-GB')}</span></div>
      </div>
      <div className="inv-to"><small>Bill to</small><b>{p.recipient.legalName}</b><span>{p.recipient.address}{p.recipient.state ? `, ${p.recipient.state}` : ''}</span><span>GSTIN {p.recipient.gstin || '—'} · Place of supply {p.recipient.state}</span></div>
      <table className="inv-tbl">
        <thead><tr><th>Description</th><th>SAC</th><th className="r">Taxable value</th></tr></thead>
        <tbody><tr><td>{p.description}</td><td>{p.sac}</td><td className="r">{money(p.taxable)}</td></tr></tbody>
      </table>
      <dl className="inv-sum">
        <dt>Taxable value</dt><dd>{money(p.taxable)}</dd>
        {p.interState ? <><dt>IGST @ {p.gstRate}%</dt><dd>{money(p.igst)}</dd></> : <><dt>CGST @ {half}%</dt><dd>{money(p.cgst)}</dd><dt>SGST @ {half}%</dt><dd>{money(p.sgst)}</dd></>}
        <dt>Invoice total</dt><dd>{money(p.taxable + p.gst)}</dd>
        <dt>Less: TDS @ {p.tdsRate}% (already deducted from your wallet credits)</dt><dd>− {money(p.tdsAdjusted)}</dd>
        <dt className="inv-net">You receive</dt><dd className="inv-net">{money(p.payable)}</dd>
      </dl>
      <p className="inv-foot">Wallet debited: <b>{money(p.amount)}</b> · GST paid on top by UniVerse: <b>{money(p.gst)}</b> · Paid to {p.payTo}</p>
    </div>
  );
}
