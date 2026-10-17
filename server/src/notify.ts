import fs from 'node:fs';
import { Types } from 'mongoose';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Agent, Device, Notification, TeamMember } from './models/index.js';
import { layout, sendMail, siteUrl } from './mail.js';

/*
  Notification engine. Every partner-facing event goes through notify():

    event ──► recipients ──► in-app record (always) ──► push (if allowed) ──► email (if allowed)

  - Recipients: the account owner, plus team members whose menus cover the event (see Audience).
  - In-app: one record per recipient with its own read state (GET /api/notifications).
  - Push and email follow each person's preferences per category, falling back to the category defaults below.
  The full event list is in docs/NOTIFICATIONS.md.
*/

export const CATEGORIES = {
  case: { label: 'Case progress', description: 'Completed cases and cases on hold (stage changes come in the app only)', push: true, email: true },
  document: { label: 'Documents', description: 'Documents requested, returned or verified', push: true, email: true },
  message: { label: 'Messages', description: 'Replies from the service desk and your relationship manager', push: true, email: true },
  payment: { label: 'Payments', description: 'Commissions credited and withdrawals paid', push: true, email: true },
  account: { label: 'Account', description: 'Verification, relationship manager and agreement updates', push: true, email: true },
  announcement: { label: 'News from UniVerse', description: 'New services, offers and important notices', push: true, email: false },
} as const;
export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

/** Who on a partner account gets it: everyone, the owner only, or people who can open a given menu */
export type Audience = 'all' | 'owner' | 'requests' | 'wallet';

/** What the notification opens. Each client maps this to its own screen. */
export interface Link { kind: 'case' | 'rm' | 'wallet' | 'profile' | 'whatsnew' | 'none'; id?: string }

export interface NotifyInput {
  agent: Types.ObjectId | string;
  category: Category;
  type: string; // e.g. case.stage, payment.commission (see docs/NOTIFICATIONS.md)
  title: string;
  body: string;
  link?: Link;
  audience?: Audience;
  /** false: never email this one, whatever the preferences (e.g. routine confirmations) */
  email?: boolean;
  /** leave out this person ('owner' or a team member id): the one whose own action caused it */
  except?: string;
}

type Prefs = Partial<Record<Category, { push?: boolean; email?: boolean }>>;
export const wants = (prefs: Prefs | undefined | null, c: Category, channel: 'push' | 'email') =>
  prefs?.[c]?.[channel] ?? CATEGORIES[c][channel];

/* ---------- push (Firebase Cloud Messaging) ---------- */
let firebaseReady: boolean | undefined;
function firebase() {
  if (firebaseReady !== undefined) return firebaseReady;
  try {
    const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT || (file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
    if (!raw) return (firebaseReady = false);
    if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
    return (firebaseReady = true);
  } catch (e) {
    console.error('Firebase not configured', e);
    return (firebaseReady = false);
  }
}
export const pushReady = () => firebase();

async function push(tokens: string[], n: { id: string; title: string; body: string; link: Link }) {
  if (!tokens.length || !firebase()) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: n.title, body: n.body.slice(0, 240) },
    data: { notificationId: n.id, kind: n.link.kind, id: n.link.id ?? '' },
    android: { priority: 'high', notification: { channelId: 'updates', color: '#1453A5' } },
  });
  // forget phones that uninstalled the app or whose token expired
  const dead = res.responses
    .map((r, i) => (!r.success && /not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code ?? '') ? tokens[i] : null))
    .filter((t): t is string => !!t);
  if (dead.length) await Device.deleteMany({ token: { $in: dead } });
}

const WEB_VIEW: Record<Link['kind'], string> = { case: 'requests', rm: 'overview', wallet: 'wallet', profile: 'profile', whatsnew: 'whatsnew', none: 'overview' };

/** Creates the in-app notifications and sends push and email. Never throws: a failed notification must not break the action. */
export async function notify(input: NotifyInput) {
  try {
    const agentId = new Types.ObjectId(String(input.agent));
    const audience = input.audience ?? 'all';
    const link = input.link ?? { kind: 'none' };
    const owner = await Agent.findById(agentId).select('name email notifyPrefs');
    if (!owner) return 0;
    const members = audience === 'owner' ? [] : await TeamMember.find({ agent: agentId }).select('name email menus notifyPrefs');

    const recipients = [
      { member: null as Types.ObjectId | null, key: 'owner', name: owner.name, email: owner.email, prefs: owner.notifyPrefs as Prefs },
      ...members
        .filter((m) => audience === 'all' || (m.menus as string[]).includes(audience))
        .map((m) => ({ member: m._id, key: String(m._id), name: m.name, email: m.email, prefs: m.notifyPrefs as Prefs })),
    ].filter((r) => r.key !== input.except);
    if (!recipients.length) return 0;

    const docs = await Notification.insertMany(recipients.map((r) => ({
      agent: agentId, member: r.member, category: input.category, type: input.type, title: input.title, body: input.body, link,
    })));

    const devices = await Device.find({ agent: agentId }).select('token member');
    await Promise.all(recipients.map(async (r, i) => {
      const jobs: Promise<unknown>[] = [];
      if (wants(r.prefs, input.category, 'push')) {
        const tokens = devices.filter((d) => String(d.member ?? 'owner') === r.key).map((d) => d.token);
        jobs.push(push(tokens, { id: String(docs[i]._id), title: input.title, body: input.body, link }).catch((e) => console.error('push failed', e)));
      }
      if (input.email !== false && wants(r.prefs, input.category, 'email')) {
        jobs.push(sendMail(r.email, input.title, layout({
          greeting: `Hello ${r.name.split(' ')[0]},`,
          paragraphs: [input.body],
          button: { label: 'Open UniVerse', url: `${siteUrl()}/dashboard/${WEB_VIEW[link.kind]}` },
        })));
      }
      await Promise.all(jobs);
    }));
    return recipients.length;
  } catch (e) {
    console.error('notify failed', input.type, e);
    return 0;
  }
}

/** Verification, RM and reactivation changes made in the back office */
export async function accountNotices(a: InstanceType<typeof Agent>, before: { verified?: boolean; rm?: string; suspended?: boolean }) {
  if (before.verified !== undefined && before.verified !== a.verified) {
    await notify(a.verified
      ? { agent: a._id, category: 'account', type: 'account.verified', title: 'Your account is verified', body: 'Your partner account has been verified. Thank you for completing your onboarding with UniVerse.', link: { kind: 'profile' } }
      : { agent: a._id, category: 'account', type: 'account.unverified', title: 'Verification withdrawn', body: 'Your account verification has been withdrawn. Your relationship manager will contact you.', link: { kind: 'profile' } });
  }
  if (before.rm !== undefined && before.rm !== a.rm?.name && a.rm?.name) {
    await notify({ agent: a._id, category: 'account', type: 'account.rm_changed', title: 'New relationship manager', body: `Your relationship manager is now ${a.rm.name}${a.rm.phone ? ` (${a.rm.phone})` : ''}. You can chat with them from the app.`, link: { kind: 'rm' } });
  }
  if (before.suspended === true && !a.suspended) {
    await notify({ agent: a._id, category: 'account', type: 'account.reactivated', title: 'Account reactivated', body: 'Your partner account has been reactivated. Welcome back.' });
  }
}
