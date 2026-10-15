import fs from 'node:fs';
import type { Types } from 'mongoose';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Agent, Device, messageHooks, ServiceRequest, TeamMember } from './models/index.js';
import { layout, sendMail, siteUrl } from './mail.js';

/* Push notifications through Firebase Cloud Messaging, plus emails for the updates a partner must act on. */

let ready: boolean | undefined;
function firebase() {
  if (ready !== undefined) return ready;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
      || (process.env.FIREBASE_SERVICE_ACCOUNT_FILE && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE) ? fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8') : '');
    if (!raw) return (ready = false);
    if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
    return (ready = true);
  } catch (e) {
    console.error('Firebase not configured', e);
    return (ready = false);
  }
}
export const pushReady = () => firebase();

export interface PushMessage { title: string; body: string; url?: string }

/** Sends to every phone signed in to the partner's account. `walletOnly` skips team members who can't see the wallet. */
export async function pushToAgent(id: unknown, msg: PushMessage, walletOnly = false) {
  if (!firebase()) return 0;
  const agentId = id as Types.ObjectId;
  let devices = await Device.find({ agent: agentId });
  if (walletOnly) {
    const allowed = new Set((await TeamMember.find({ agent: agentId, menus: 'wallet' }).select('_id')).map((m) => String(m._id)));
    devices = devices.filter((d) => !d.member || allowed.has(String(d.member)));
  }
  if (!devices.length) return 0;
  const res = await getMessaging().sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    notification: { title: msg.title, body: msg.body.slice(0, 240) },
    data: { url: msg.url ?? '/updates' },
    android: { priority: 'high', notification: { channelId: 'updates', color: '#0A66C2' } },
  });
  // forget phones that uninstalled the app or signed out elsewhere
  const dead = res.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code ?? '') ? devices[i].token : null))
    .filter(Boolean);
  if (dead.length) await Device.deleteMany({ token: { $in: dead } });
  return res.successCount;
}

const MONEY = /₹|commission|withdrawal/i;
// worth an email as well: someone on our side wrote to them, or something they need to know or act on
const IMPORTANT = /Completed|couldn't accept|upload it again|credited|withdrawal|commission/i;

messageHooks.onCreate = async (m) => {
  const agent = await Agent.findById(m.agent).select('email name agency');
  if (!agent) return;
  const c = m.request ? await ServiceRequest.findById(m.request).populate('student', 'name') : null;
  const student = (c?.student as { name?: string } | undefined)?.name;
  const who = m.from === 'rm' ? `${m.author || 'Your RM'}` : m.from === 'desk' ? `${m.author || 'Service desk'}` : 'UniVerse';
  const title = c ? `${c.ref}${student ? ` · ${student}` : ''}` : m.from === 'rm' ? `Message from ${who}` : 'UniVerse update';
  const body = m.from === 'system' ? m.text : `${who}: ${m.text}`;
  const url = c ? `/case/${c._id}` : m.from === 'rm' ? '/rm' : '/updates';

  await Promise.all([
    pushToAgent(m.agent, { title, body, url }, MONEY.test(m.text)).catch((e) => console.error('push failed', e)),
    m.from !== 'system' || IMPORTANT.test(m.text)
      ? sendMail(agent.email, m.from === 'system' ? `Update on ${title}` : `${who} replied${c ? ` on ${title}` : ''}`, layout({
        greeting: `Hello ${agent.name.split(' ')[0]},`,
        paragraphs: [
          m.from === 'system' ? `${c ? `${title}: ` : ''}${m.text}` : `${who} wrote${c ? ` about ${title}` : ''}: “${m.text}”`,
          c ? 'Open the case to see the details and reply.' : 'Open the partner portal to see the details and reply.',
        ],
        button: { label: 'Open UniVerse', url: `${siteUrl()}/dashboard/${c ? 'requests' : 'overview'}` },
      }))
      : null,
  ]);
};
