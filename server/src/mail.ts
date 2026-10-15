import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSettings } from './content.js';

/* Outgoing email over the SMTP account in SMTP_* env vars. Without them, emails are skipped (and logged). */

let transport: Transporter | null | undefined;
const mailer = () => {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return (transport = null);
  const port = Number(SMTP_PORT) || 465;
  transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transport;
};

export const mailReady = () => !!mailer();
export const siteUrl = () => (process.env.SITE_URL || 'https://universeportal.vercel.app').replace(/\/$/, '');

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A plain, branded email: greeting, paragraphs, optional button. */
export function layout({ greeting, paragraphs, button }: { greeting: string; paragraphs: string[]; button?: { label: string; url: string } }) {
  const s = getSettings();
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font-family:Arial,Helvetica,sans-serif;color:#0B2440">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #E7ECF2">
<tr><td style="padding:22px 28px;border-bottom:1px solid #E7ECF2;font-weight:700;font-size:18px;color:#0A66C2">UniVerse Partner Portal</td></tr>
<tr><td style="padding:24px 28px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">${esc(greeting)}</p>
${paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('')}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="background:#0A66C2;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${esc(button.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #E7ECF2;font-size:12px;color:#6B7C90">Questions? ${esc(s.supportEmail)} · ${esc(s.supportPhone)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [greeting, ...paragraphs, button ? `${button.label}: ${button.url}` : '', `Questions? ${s.supportEmail} · ${s.supportPhone}`].filter(Boolean).join('\n\n');
  return { html, text };
}

/** Sends an email. Never throws: a mail problem must not break the action that triggered it. */
export async function sendMail(to: string, subject: string, body: { html: string; text: string }) {
  const t = mailer();
  if (!t || !to) {
    if (!t) console.log(`[mail skipped: SMTP not configured] ${subject} → ${to}`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, ...body });
    return true;
  } catch (e) {
    console.error('mail failed', subject, to, e);
    return false;
  }
}
