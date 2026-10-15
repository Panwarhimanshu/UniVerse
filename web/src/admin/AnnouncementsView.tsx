import { useState } from 'react';
import type { FormEvent } from 'react';
import { fmtTime, useApi } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { errMsg } from '../dashboard/modals';
import { adminApi } from './api';

/* Sends a notification to every partner (and their team), or to one partner. It shows in the app and portal
   notification centre and as a phone notification for anyone who has "News from UniVerse" switched on. */
export function AnnouncementsView() {
  const toast = useToast();
  const sent = useApi(adminApi.announcements, []);
  const partners = useApi(adminApi.partners, []);
  const [f, setF] = useState({ title: '', body: '', partnerId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const to = f.partnerId ? partners.data?.find((p) => p.id === f.partnerId) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.title.trim() || !f.body.trim()) return setError('Write a title and a message');
    const who = to ? (to.agency || to.name) : 'every active partner and their team';
    if (!window.confirm(`Send “${f.title.trim()}” to ${who}? This can't be undone.`)) return;
    setBusy(true);
    try {
      const r = await adminApi.sendAnnouncement({ title: f.title.trim(), body: f.body.trim(), partnerId: f.partnerId || undefined });
      toast(`Sent to ${r.recipients} ${r.recipients === 1 ? 'person' : 'people'}.`);
      setF({ title: '', body: '', partnerId: '' });
      sent.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="view active">
      <div className="d-grid pa-grid">
        <div className="panel">
          <div className="panel-h"><h3>New announcement</h3></div>
          <div className="panel-b">
            <form className="form-grid" onSubmit={submit} noValidate>
              <div className="field full">
                <label htmlFor="anTo">Send to</label>
                <select id="anTo" value={f.partnerId} onChange={(e) => setF({ ...f, partnerId: e.target.value })}>
                  <option value="">All active partners</option>
                  {partners.data?.filter((p) => !p.suspended).map((p) => <option key={p.id} value={p.id}>{p.agency || p.name} · {p.email}</option>)}
                </select>
              </div>
              <div className="field full">
                <label htmlFor="anTitle">Title <span className="t-sub">({f.title.length}/80)</span></label>
                <input id="anTitle" maxLength={80} placeholder="e.g. New: forex cards for Germany" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </div>
              <div className="field full">
                <label htmlFor="anBody">Message <span className="t-sub">({f.body.length}/600)</span></label>
                <textarea id="anBody" rows={4} maxLength={600} placeholder="What partners need to know, in two or three sentences." value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
              </div>
              {f.title || f.body ? (
                <div className="full an-preview" aria-label="Preview">
                  <span className="an-pv-label">Preview</span>
                  <b>{f.title || 'Title'}</b>
                  <span>{f.body || 'Message'}</span>
                </div>
              ) : null}
              {error ? <p className="form-error full">{error}</p> : null}
              <div className="full m-cta"><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send announcement'}</button></div>
            </form>
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>How it reaches partners</h3></div>
          <div className="panel-b adm-meta">
            <p>Every person on the account (owner and team) gets it in the notification centre of the app and the partner portal.</p>
            <p style={{ marginTop: '.6rem' }}>It also arrives as a phone notification for anyone with <b>News from UniVerse</b> switched on, which is the default. Email is off by default for announcements.</p>
            <p style={{ marginTop: '.6rem' }}>Use it for new services, rate changes and important notices. Case-specific news goes out automatically from the case itself.</p>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.4rem' }}>
        <div className="panel-h"><h3>Sent</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>When</th><th>Announcement</th><th>To</th><th>Reached</th><th>By</th></tr></thead>
            <tbody>
              {sent.data?.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(a.createdAt)}</td>
                  <td><div className="t-name">{a.title}</div><div className="t-sub">{a.body}</div></td>
                  <td>{a.partner ? a.partner.name : 'All partners'}</td>
                  <td>{a.recipients}</td>
                  <td>{a.sentBy}</td>
                </tr>
              ))}
              {sent.data && !sent.data.length ? <tr><td colSpan={5} className="empty-row">Nothing sent yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
