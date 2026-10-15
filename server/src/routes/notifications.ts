import { Router } from 'express';
import { Types } from 'mongoose';
import { Agent, Notification, TeamMember } from '../models/index.js';
import { accessOf, agentIdOf, HttpError } from '../middleware/auth.js';
import { CATEGORIES, CATEGORY_KEYS, wants } from '../notify.js';
import type { Category } from '../notify.js';

/* The signed-in person's notifications (owner and each team member have their own) and their preferences. */
const router = Router();

const mine = (req: Parameters<typeof agentIdOf>[0]) => {
  const { memberId } = accessOf(req);
  return { agent: new Types.ObjectId(agentIdOf(req)), member: memberId ? new Types.ObjectId(memberId) : null };
};
const publicNotification = (n: InstanceType<typeof Notification>) => ({
  id: String(n._id), category: n.category, type: n.type, title: n.title, body: n.body,
  link: { kind: n.link?.kind ?? 'none', id: n.link?.id || undefined }, read: !!n.readAt, createdAt: n.createdAt,
});

/* GET /notifications?category=payment&before=<iso date>&limit=30 → newest first, plus the unread count */
router.get('/notifications', async (req, res) => {
  const who = mine(req);
  const filter: Record<string, unknown> = { ...who };
  const category = String(req.query.category ?? '');
  if (CATEGORY_KEYS.includes(category as Category)) filter.category = category;
  if (req.query.before) {
    const d = new Date(String(req.query.before));
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
  }
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit + 1),
    Notification.countDocuments({ ...who, readAt: null }),
  ]);
  res.json({ items: items.slice(0, limit).map(publicNotification), unread, more: items.length > limit });
});

/* Cheap check for the badge, polled by the app and website */
router.get('/notifications/unread', async (req, res) => {
  const who = mine(req);
  const [count, latest] = await Promise.all([
    Notification.countDocuments({ ...who, readAt: null }),
    Notification.findOne(who).sort({ createdAt: -1 }).select('createdAt'),
  ]);
  res.json({ count, latest: latest?.createdAt ?? null });
});

/* POST /notifications/read { ids: [...] } or { all: true } */
router.post('/notifications/read', async (req, res) => {
  const who = mine(req);
  const filter: Record<string, unknown> = { ...who, readAt: null };
  if (req.body?.all !== true) {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((x: unknown) => Types.ObjectId.isValid(String(x)));
    if (!ids.length) throw new HttpError(400, 'Nothing to mark as read');
    filter._id = { $in: ids };
  }
  await Notification.updateMany(filter, { readAt: new Date() });
  res.json({ unread: await Notification.countDocuments({ ...who, readAt: null }) });
});

/* Preferences: which categories may use push and email (in-app is always on) */
const prefsDoc = async (req: Parameters<typeof agentIdOf>[0]) => {
  const { memberId } = accessOf(req);
  const doc = memberId ? await TeamMember.findById(memberId) : await Agent.findById(agentIdOf(req));
  if (!doc) throw new HttpError(404, 'Account not found');
  return doc;
};
const prefsJson = (prefs: Record<string, { push?: boolean; email?: boolean }> | undefined) =>
  CATEGORY_KEYS.map((key) => ({ key, label: CATEGORIES[key].label, description: CATEGORIES[key].description, push: wants(prefs, key, 'push'), email: wants(prefs, key, 'email') }));

router.get('/notifications/preferences', async (req, res) => {
  res.json(prefsJson((await prefsDoc(req)).notifyPrefs as never));
});

/* PUT /notifications/preferences { payment: { push: true, email: false }, ... } */
router.put('/notifications/preferences', async (req, res) => {
  const doc = await prefsDoc(req);
  // only the keys sent change; categories never touched keep following the defaults
  const next = { ...((doc.notifyPrefs ?? {}) as Record<string, { push?: boolean; email?: boolean }>) };
  for (const key of CATEGORY_KEYS) {
    const v = req.body?.[key];
    if (!v || typeof v !== 'object') continue;
    next[key] = { ...next[key] };
    if (typeof v.push === 'boolean') next[key].push = v.push;
    if (typeof v.email === 'boolean') next[key].email = v.email;
  }
  doc.set('notifyPrefs', next);
  await doc.save();
  res.json(prefsJson(next));
});

export default router;
