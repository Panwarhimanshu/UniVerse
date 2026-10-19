import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSettings } from './content.js';

/* Outgoing email. Two ways to send, picked from the env vars that are set:
   1. Microsoft 365 through the Graph API (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MAIL_FROM): an Entra app
      with the Mail.Send application permission. Unaffected by Microsoft switching off password SMTP.
   2. Any SMTP server (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
   With neither, emails are skipped (and logged). */

/* ---------- Microsoft Graph ---------- */
const graphCreds = () => {
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
  const from = fromAddress();
  return MS_TENANT_ID && MS_CLIENT_ID && MS_CLIENT_SECRET && from ? { tenant: MS_TENANT_ID, id: MS_CLIENT_ID, secret: MS_CLIENT_SECRET, from } : null;
};
/** "UniVerse <noreply@universe.com>" → the address and the display name */
const fromAddress = () => {
  const raw = (process.env.MAIL_FROM || process.env.SMTP_USER || '').trim();
  const m = /^(.*)<([^>]+)>$/.exec(raw);
  return m ? m[2].trim() : raw;
};
const fromName = () => /^(.*)<[^>]+>$/.exec((process.env.MAIL_FROM || '').trim())?.[1].trim().replace(/^"|"$/g, '') || 'UniVerse';

let graphToken: { value: string; expires: number } | null = null;
async function graphAccessToken(c: NonNullable<ReturnType<typeof graphCreds>>) {
  if (graphToken && graphToken.expires > Date.now() + 60_000) return graphToken.value;
  const r = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(c.tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.id, client_secret: c.secret, scope: 'https://graph.microsoft.com/.default' }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error(`Microsoft sign-in failed: ${data.error_description ?? data.error ?? r.status}`);
  graphToken = { value: data.access_token, expires: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
  return graphToken.value;
}
async function sendViaGraph(c: NonNullable<ReturnType<typeof graphCreds>>, to: string, subject: string, html: string) {
  const token = await graphAccessToken(c);
  const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(c.from)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject, body: { contentType: 'HTML', content: html },
        from: { emailAddress: { address: c.from, name: fromName() } },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (r.status !== 202) {
    const data = await r.json().catch(() => ({}));
    throw new Error(`Graph sendMail ${r.status}: ${data?.error?.message ?? 'failed'}`);
  }
}

/* ---------- SMTP ---------- */
let transport: Transporter | null | undefined;
const mailer = () => {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return (transport = null);
  const port = Number(SMTP_PORT) || 465;
  // 465: TLS from the start · 587 (Microsoft 365, most others): STARTTLS, required
  transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transport;
};

export const mailReady = () => !!graphCreds() || !!mailer();
export const mailMethod = () => (graphCreds() ? 'microsoft-graph' : mailer() ? 'smtp' : 'none');
export const siteUrl = () => (process.env.SITE_URL || 'https://universeportal.vercel.app').replace(/\/$/, '');

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A plain, branded email: greeting, paragraphs, optional button. */
export function layout({ greeting, paragraphs, button }: { greeting: string; paragraphs: string[]; button?: { label: string; url: string } }) {
  const s = getSettings();
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font-family:Arial,Helvetica,sans-serif;color:#16347B">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #E7ECF2">
<tr><td style="padding:22px 28px;border-bottom:1px solid #E7ECF2;font-weight:700;font-size:18px;color:#1453A5">UniVerse Partner Portal</td></tr>
<tr><td style="padding:24px 28px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">${esc(greeting)}</p>
${paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('')}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="background:#1453A5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${esc(button.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #E7ECF2;font-size:12px;color:#6B7C90">Questions? ${esc(s.supportEmail)} · ${esc(s.supportPhone)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [greeting, ...paragraphs, button ? `${button.label}: ${button.url}` : '', `Questions? ${s.supportEmail} · ${s.supportPhone}`].filter(Boolean).join('\n\n');
  return { html, text };
}

async function deliver(to: string, subject: string, body: { html: string; text: string }) {
  const g = graphCreds();
  if (g) return sendViaGraph(g, to, subject, body.html);
  const t = mailer();
  if (!t) throw new Error('Email is not configured: set the Microsoft 365 (MS_*) or SMTP_* settings on the server');
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, ...body });
}

/** Sends an email. Never throws: a mail problem must not break the action that triggered it. */
export async function sendMail(to: string, subject: string, body: { html: string; text: string }) {
  if (!to) return false;
  if (!mailReady()) {
    console.log(`[mail skipped: email not configured] ${subject} → ${to}`);
    return false;
  }
  try {
    await deliver(to, subject, body);
    return true;
  } catch (e) {
    console.error('mail failed', subject, to, e);
    return false;
  }
}

/** For the master admin's "send test email": throws with the provider's reason when it fails */
export async function sendTestMail(to: string) {
  await deliver(to, 'UniVerse test email', layout({
    greeting: 'Hello,',
    paragraphs: [`This is a test from the UniVerse back office, sent through ${mailMethod() === 'microsoft-graph' ? 'Microsoft 365 (Graph API)' : 'SMTP'}. Partner emails (applications, agreements, password links and notifications) will arrive like this.`],
  }));
}
