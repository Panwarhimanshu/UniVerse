import { useEffect, useState } from 'react';
import { fmtDate, useApi } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { errMsg, Hero, Modal } from '../dashboard/modals';
import { adminApi } from './api';
import type { OnboardingDetail, OnboardingRow, OnboardingStage } from './api';

/* Partner onboarding desk: review KYC (new applicants and existing partners), verify or send back with a reason,
   send the Channel Partner Agreement, and see who has signed. */

const STAGE: Record<OnboardingStage, [string, string]> = {
  review: ['To review', 'prog'], sent_back: ['Sent back', 'hold'], verified: ['Verified · send agreement', 'pend'],
  agreement_sent: ['Agreement sent', 'prog'], done: ['Signed', 'done'], not_started: ['KYC not started', 'pend'],
};
const TABS: [string, OnboardingStage[] | null][] = [
  ['To review', ['review']], ['Send agreement', ['verified']], ['Awaiting signature', ['agreement_sent']], ['Sent back', ['sent_back']],
  ['Not started', ['not_started']], ['Signed', ['done']], ['All', null],
];
const DOC_LABEL = { pan: 'PAN card', gst: 'GST certificate', msme: 'Udyam (MSME) certificate', other: 'Other document' } as const;

export function OnboardingView({ onChanged }: { onChanged: () => void }) {
  const list = useApi(adminApi.onboardingList, []);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const rows = list.data ?? [];
  const count = (stages: OnboardingStage[] | null) => (stages ? rows.filter((r) => stages.includes(r.stage)).length : rows.length);
  const term = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!TABS[tab][1] || TABS[tab][1]!.includes(r.stage)) && (!term || [r.name, r.agency, r.email, r.legalName, r.city].join(' ').toLowerCase().includes(term)));
  return (
    <section className="view active">
      <div className="adm-toolbar">
        <div className="svc-filters">
          {TABS.map(([label, st], i) => <button key={label} className={`chip-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{label} <em className="chip-n">{count(st)}</em></button>)}
        </div>
        <div className="dash-search adm-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" placeholder="Name, entity, email, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
      </div>
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Partner</th><th>KYC</th><th>Stage</th><th>Dates</th><th></th></tr></thead>
            <tbody>
              {shown.map((r: OnboardingRow) => (
                <tr key={r.id}>
                  <td>
                    <div className="t-name">{r.agency || r.name}{r.applicant ? <span className="pill" style={{ marginLeft: '.4rem' }}>New applicant</span> : null}</div>
                    <div className="t-sub">{r.name} · {r.email} · {r.phone}</div>
                  </td>
                  <td>{r.kycType ? <><div className="t-name" style={{ fontWeight: 500 }}>{r.legalName}</div><div className="t-sub">{r.kycType === 'entity' ? 'Entity' : 'Individual'}</div></> : <span className="t-sub">—</span>}</td>
                  <td><span className={`status ${STAGE[r.stage][1]}`}>{STAGE[r.stage][0]}</span></td>
                  <td className="t-sub" style={{ whiteSpace: 'nowrap' }}>
                    {r.submittedAt ? <div>Submitted {fmtDate(r.submittedAt)}</div> : null}
                    {r.agreementSentAt ? <div>Agreement {fmtDate(r.agreementSentAt)}</div> : null}
                    {r.signedAt ? <div>Signed {fmtDate(r.signedAt)}</div> : null}
                  </td>
                  <td><button className={`btn ${['review', 'verified'].includes(r.stage) ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setOpen(r.id)}>{r.stage === 'review' ? 'Review' : 'Open'}</button></td>
                </tr>
              ))}
              {list.data && !shown.length ? <tr><td colSpan={5} className="empty-row">Nothing here.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <OnboardingModal id={open} onClose={() => setOpen(null)} onChanged={() => { list.reload(); onChanged(); }} />
    </section>
  );
}

function OnboardingModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<OnboardingDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [link, setLink] = useState('');
  const load = () => { if (id) adminApi.onboardingDetail(id).then(setD).catch((e) => toast(errMsg(e))); };
  useEffect(() => { setD(null); setRejecting(false); setReason(''); setLink(''); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); toast(done); load(); onChanged(); return true; } catch (e) { toast(errMsg(e)); return false; } finally { setBusy(false); }
  };
  const k = d?.kyc;
  const row = (label: string, value: string | undefined) => (value ? <><dt>{label}</dt><dd>{value}</dd></> : null);
  return (
    <Modal open={!!id} onClose={onClose} className="modal-wide">
      <Hero title={d ? d.agency || d.name : 'Loading…'} sub={d ? `${d.name} · ${d.email} · ${d.phone}${d.applicant ? ' · new applicant' : ''}` : ''} onClose={onClose} />
      {d && k ? (
        <div className="modal-body">
          <div className="pp-grid">
            <div className="pp-card">
              <div className="pp-card-h"><h4>KYC details</h4><span className={`status ${{ none: 'pend', submitted: 'prog', verified: 'done', rejected: 'hold' }[k.status]}`}>{{ none: 'Not started', submitted: 'To review', verified: 'Verified', rejected: 'Sent back' }[k.status]}</span></div>
              {k.type ? (
                <dl className="pp-dl">
                  {row('Works as', k.type === 'entity' ? `Entity · ${k.entityType}` : 'Individual')}
                  {row(k.type === 'entity' ? 'Registered name' : 'Name as on PAN', k.legalName)}
                  {row('PAN', k.pan)}
                  {row('GSTIN', k.gstin)}
                  {row('Udyam', k.udyam)}
                  {row('CIN / LLPIN', k.cin)}
                  {row('Signatory', k.signatory ? `${k.signatory}${k.designation ? `, ${k.designation}` : ''}` : '')}
                  {row('Authority', k.authority)}
                  {row('Address', `${k.address}, ${k.state} ${k.pincode}`)}
                  {row('Location', `${d.city} · ${d.zone[0]}${d.zone.slice(1).toLowerCase()} zone`)}
                  {row('Submitted', k.submittedAt ? fmtDate(k.submittedAt) : '')}
                  {row('Verified', k.verifiedAt ? `${fmtDate(k.verifiedAt)}${k.verifiedBy ? ` by ${k.verifiedBy}` : ''}` : '')}
                </dl>
              ) : <p className="adm-meta">This partner has not submitted KYC yet. They see a prompt in the app and portal.</p>}
              {k.status === 'rejected' && k.note ? <p className="ks-note" style={{ marginTop: '.6rem' }}>Sent back: {k.note}</p> : null}
            </div>
            <div className="pp-card">
              <div className="pp-card-h"><h4>Documents</h4></div>
              {k.docs.length ? (
                <ul className="pp-list">
                  {k.docs.map((x) => (
                    <li key={x.id}><span><b>{DOC_LABEL[x.kind]}</b><small>{x.name}</small></span>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.kycDoc(d.id, x.id, `${d.agency || d.name} ${DOC_LABEL[x.kind]}`).catch((e) => toast(errMsg(e)))}>Download</button></li>
                  ))}
                </ul>
              ) : <p className="adm-meta">No documents.</p>}
              <p className="adm-meta" style={{ marginTop: '.8rem' }}>Check the PAN and GSTIN on the government portals (incometax.gov.in, services.gst.gov.in) and that the names match the certificates.</p>
            </div>
          </div>

          {k.status === 'submitted' ? (
            <div className="pp-card" style={{ marginTop: '1rem' }}>
              <div className="pp-card-h"><h4>Decision</h4></div>
              {rejecting ? (
                <div>
                  <div className="field"><label htmlFor="obReason">What should the partner fix? (sent to them by email)</label>
                    <input id="obReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The GST certificate is for a different PAN" /></div>
                  <div className="m-cta">
                    <button className="btn btn-sm" style={{ background: '#B91C1C', color: '#fff' }} disabled={busy || !reason.trim()} onClick={() => run(() => adminApi.rejectKyc(d.id, reason.trim()), 'Sent back to the partner').then((ok) => ok && setRejecting(false))}>Send back</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="m-cta">
                  <button className="btn btn-green" disabled={busy} onClick={async () => {
                    if (!(await run(() => adminApi.verifyKyc(d.id), 'KYC verified'))) return;
                    if (confirm('KYC verified. Send the Channel Partner Agreement for signature now?')) {
                      await run(async () => setLink((await adminApi.sendAgreement(d.id)).link), 'Agreement sent');
                    }
                  }}>Verify KYC</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>Send back</button>
                </div>
              )}
            </div>
          ) : null}

          <div className="pp-card" style={{ marginTop: '1rem' }}>
            <div className="pp-card-h">
              <h4>Channel Partner Agreement</h4>
              {k.status === 'verified' ? (
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => {
                  if (d.agreement.signed && !confirm('This partner has already signed. Send a new agreement to sign (for example after a revision)?')) return;
                  run(async () => setLink((await adminApi.sendAgreement(d.id)).link), 'Agreement sent');
                }}>{d.agreement.pending ? 'Send again' : d.agreement.signed ? 'Send revised agreement' : 'Send agreement'}</button>
              ) : null}
            </div>
            {link ? (
              <div className="pp-temp" style={{ position: 'static', marginTop: 0, marginBottom: '.8rem' }}>
                <div><b>Signing link{d.applicant ? '' : ' (opens their profile)'}</b><p className="adm-meta" style={{ wordBreak: 'break-all' }}>{link}</p><p className="adm-meta">Emailed to {d.email}. You can also share it on WhatsApp.</p></div>
                <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(link); toast('Copied'); }}>Copy link</button>
              </div>
            ) : null}
            {d.agreements.length ? (
              <ul className="pp-list">
                {d.agreements.map((a) => (
                  <li key={a.id}>
                    <span><b>{a.number}</b> · v{a.version}<small>Sent {fmtDate(a.sentAt)}{a.sentBy ? ` by ${a.sentBy}` : ''}{a.signedAt ? ` · signed ${fmtDate(a.signedAt)} by ${a.signer}` : ''}</small></span>
                    <div className="um-actions">
                      <span className={`status ${a.status === 'signed' ? 'done' : 'prog'}`}>{a.status === 'signed' ? 'Signed' : 'Awaiting signature'}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.agreementPdf(d.id, a.id, `${a.number} agreement.pdf`).catch((e) => toast(errMsg(e)))}>PDF</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="adm-meta">{k.status === 'verified' ? 'Not sent yet.' : 'Sent after the KYC is verified.'}</p>}
          </div>
        </div>
      ) : <div className="modal-body"><div className="empty-state">Loading…</div></div>}
    </Modal>
  );
}
