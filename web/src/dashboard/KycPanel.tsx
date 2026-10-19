import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Onboarding } from '../lib/api';
import { fmtDate } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { AgreementSigner, emptyKyc, KycFields, kycForm, kycProblem, useOnboardingMeta } from '../components/onboarding';
import type { KycFiles, KycValues } from '../components/onboarding';
import { errMsg, Hero, Modal } from './modals';

/* Profile → KYC & agreement: partners who joined before onboarding (and anyone sent back) complete KYC here,
   then sign the agreement the desk sends. Withdrawals open once both are done. */

const KYC_LABEL = { none: 'Not started', submitted: 'Being verified', verified: 'Verified', rejected: 'Needs changes' } as const;
const KYC_CLASS = { none: 'pend', submitted: 'prog', verified: 'done', rejected: 'hold' } as const;

export function KycPanel({ autoSign, onChanged }: { autoSign?: boolean; onChanged: () => void }) {
  const toast = useToast();
  const meta = useOnboardingMeta();
  const [o, setO] = useState<Onboarding | null>(null);
  const [editing, setEditing] = useState(false);
  const [k, setK] = useState<KycValues>(emptyKyc);
  const [files, setFiles] = useState<KycFiles>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [pdf, setPdf] = useState<string | null>(null);

  const load = () => api.onboarding().then((x) => {
    setO(x);
    if (autoSign && x.agreement.pending) setSignOpen(true);
  }).catch((e) => toast(errMsg(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!signOpen) return;
    setPdf(null);
    api.pendingAgreementPdf().then(setPdf).catch((e) => toast(errMsg(e)));
  }, [signOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return null;
  const kyc = o.kyc;
  const uploaded = Object.fromEntries(kyc.docs.map((d) => [d.kind, d.name]));
  const startEdit = () => {
    setK({
      type: kyc.type ?? '', legalName: kyc.legalName, pan: '', entityType: kyc.entityType, gstin: kyc.gstin, udyam: kyc.udyam, cin: kyc.cin,
      signatory: kyc.signatory, designation: kyc.designation, authority: kyc.authority, address: kyc.address, state: kyc.state, pincode: kyc.pincode,
    });
    setFiles({});
    setError('');
    setEditing(true);
  };
  const submit = async () => {
    setError('');
    const problem = kycProblem(k, files, kyc.docs.map((d) => d.kind));
    if (problem) return setError(problem);
    setBusy(true);
    try {
      setO(await api.submitKyc(kycForm(k, files)));
      setEditing(false);
      toast('KYC submitted. We verify it within 48 hours and then send your agreement to sign.');
      onChanged();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const done = o.canWithdraw;
  return (
    <div className="panel kyc-panel" id="kyc" style={{ marginTop: '1.4rem' }}>
      <div className="panel-h">
        <h3>KYC & agreement</h3>
        <span className={`status ${done && !o.agreement.pending ? 'done' : 'pend'}`}>{done && !o.agreement.pending ? 'Complete' : 'Action needed'}</span>
      </div>
      <div className="panel-b">
        {!done ? <p className="adm-meta" style={{ marginBottom: '1rem' }}>Withdrawals open once your KYC is verified and your Channel Partner Agreement is signed.</p> : null}
        <ol className="kyc-steps">
          <li className={kyc.status === 'verified' ? 'ok' : 'now'}>
            <div className="ks-h"><b>1. KYC details</b><span className={`status ${KYC_CLASS[kyc.status]}`}>{KYC_LABEL[kyc.status]}</span></div>
            {kyc.status === 'rejected' && kyc.note ? <p className="ks-note">Please fix: {kyc.note}</p> : null}
            {kyc.type && !editing ? (
              <p className="ks-sum">
                {kyc.type === 'entity' ? `${kyc.legalName} (${kyc.entityType})` : kyc.legalName} · PAN {kyc.pan}
                {kyc.gstin ? ` · GSTIN ${kyc.gstin}` : ''}{kyc.udyam ? ` · ${kyc.udyam}` : ''}
                {kyc.verifiedAt ? ` · verified ${fmtDate(kyc.verifiedAt)}` : kyc.submittedAt ? ` · submitted ${fmtDate(kyc.submittedAt)}` : ''}
              </p>
            ) : null}
            {!editing && (kyc.status === 'none' || kyc.status === 'rejected') ? (
              <button className="btn btn-primary btn-sm" onClick={startEdit}>{kyc.status === 'none' ? 'Complete KYC' : 'Update details'}</button>
            ) : null}
            {editing ? (
              <div className="ks-form">
                <KycFields v={k} set={setK} files={files} setFiles={setFiles} states={meta.states} entityTypes={meta.entityTypes} uploaded={uploaded} />
                {kyc.status === 'rejected' ? <p className="field-hint">For your security, enter your PAN again.</p> : null}
                {error ? <p className="form-error">{error}</p> : null}
                <div className="m-cta">
                  <button className="btn btn-primary" disabled={busy || !k.type} onClick={submit}>{busy ? 'Submitting…' : 'Submit for verification'}</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : null}
          </li>
          <li className={o.agreement.pending ? 'now' : o.agreement.signed ? 'ok' : ''}>
            <div className="ks-h">
              <b>2. Channel Partner Agreement</b>
              <span className={`status ${o.agreement.pending ? 'prog' : o.agreement.signed ? 'done' : 'pend'}`}>
                {o.agreement.pending ? (o.agreement.signed ? 'Revision to sign' : 'Ready to sign') : o.agreement.signed ? 'Signed' : 'Sent after KYC'}
              </span>
            </div>
            {o.agreement.signed ? <p className="ks-sum">Signed on {fmtDate(o.agreement.signedAt!)} (version {o.agreement.version}). Download it below.</p> : null}
            {o.agreement.pending ? (
              <>
                <p className="ks-sum">Agreement {o.agreement.pending.number} was sent on {fmtDate(o.agreement.pending.sentAt)}. Read it and sign online.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setSignOpen(true)}>Review and sign</button>
              </>
            ) : !o.agreement.signed ? <p className="ks-sum">We email it within 48 hours of verifying your KYC.</p> : null}
          </li>
        </ol>
      </div>

      <Modal open={signOpen} onClose={() => setSignOpen(false)} className="modal-wide">
        <Hero title="Sign your partner agreement" sub={o.agreement.pending ? `Agreement ${o.agreement.pending.number} · version ${o.agreement.pending.version}` : ''} onClose={() => setSignOpen(false)} />
        <div className="modal-body">
          <AgreementSigner pdfUrl={pdf} defaultName={kyc.signatory || kyc.legalName} onSign={async (b) => {
            setO(await api.signPending(b));
            setSignOpen(false);
            toast('Agreement signed. The signed copy is in your profile.');
            onChanged();
          }} />
        </div>
      </Modal>
    </div>
  );
}

/** Reminder on the overview until KYC and the agreement are done */
export function KycBanner({ kycStatus, signed, onOpen }: { kycStatus: string; signed: boolean; onOpen: () => void }) {
  if (kycStatus === 'verified' && signed) return null;
  const text = kycStatus === 'none' ? 'Complete your KYC (PAN, GST or MSME details) to keep withdrawing your commission.'
    : kycStatus === 'rejected' ? 'We need a change to your KYC details before we can send your agreement.'
      : kycStatus === 'submitted' ? 'Your KYC is being verified. We will send your agreement to sign within 48 hours.'
        : 'Your Channel Partner Agreement is ready. Sign it to keep withdrawing your commission.';
  return (
    <div className="kyc-banner" role="status">
      <span>{text}</span>
      {kycStatus !== 'submitted' ? <button className="btn btn-primary btn-sm" onClick={onOpen}>{kycStatus === 'verified' ? 'Sign now' : 'Complete now'}</button> : null}
    </div>
  );
}
