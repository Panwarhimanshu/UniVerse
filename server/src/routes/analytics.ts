import { Router } from 'express';
import { Types } from 'mongoose';
import { Agent, ServiceRequest, STATUSES, Student, Transaction } from '../models/index.js';
import { accessOf, agentIdOf, HttpError } from '../middleware/auth.js';
import { serviceByKey } from '../data/catalog.js';
import { LAST_STEP } from '../data/timelines.js';
import { track } from '../usage.js';

/* A partner's own figures for the Analytics screen (app) and dashboard charts (website). */
const router = Router();

const monthKeys = (n: number) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
  });
};
const byMonth = (field: string) => ({ $dateToString: { format: '%Y-%m', date: `$${field}`, timezone: 'Asia/Kolkata' } });

router.get('/analytics', async (req, res) => {
  const agent = new Types.ObjectId(agentIdOf(req));
  const access = accessOf(req);
  const seesMoney = access.owner || access.menus.includes('wallet');
  const months = monthKeys(6);
  const since = new Date(`${months[0]}-01T00:00:00+05:30`);

  const [cases, students, monthRows] = await Promise.all([
    ServiceRequest.find({ agent }).select('service status createdAt stepLog docs'),
    Student.countDocuments({ agent }),
    ServiceRequest.aggregate([{ $match: { agent, createdAt: { $gte: since } } }, { $group: { _id: byMonth('createdAt'), n: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
  const byService = new Map<string, number>();
  let docsNeeded = 0;
  let docsInReview = 0;
  const durations: number[] = [];
  for (const c of cases) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byService.set(c.service, (byService.get(c.service) ?? 0) + 1);
    if (c.status !== 'Completed') {
      for (const d of c.docs) {
        if (d.status === 'missing') docsNeeded++;
        else if (d.status === 'review') docsInReview++;
      }
    } else {
      const done = (c.stepLog ?? []).find((l) => l.step === LAST_STEP)?.at;
      if (done) durations.push((new Date(done).getTime() - new Date(c.createdAt).getTime()) / 864e5);
    }
  }
  const monthMap = new Map(monthRows.map((r) => [r._id, r.n]));

  let money = null;
  if (seesMoney) {
    const [a, credits] = await Promise.all([
      Agent.findById(agent).select('wallet'),
      Transaction.aggregate([
        { $match: { agent, type: 'Credit', status: { $ne: 'Rejected' }, date: { $gte: since } } },
        { $group: { _id: byMonth('date'), t: { $sum: '$amount' } } },
      ]),
    ]);
    if (!a) throw new HttpError(404, 'Account not found');
    const cm = new Map(credits.map((r) => [r._id, r.t]));
    money = {
      balance: a.wallet?.balance ?? 0, pending: a.wallet?.pending ?? 0, lifetime: a.wallet?.lifetime ?? 0,
      monthly: months.map((m) => ({ month: m, amount: cm.get(m) ?? 0 })),
    };
  }

  res.json({
    totals: {
      students, cases: cases.length, open: cases.length - byStatus.Completed, completed: byStatus.Completed,
      completionRate: cases.length ? byStatus.Completed / cases.length : null,
      avgDaysToComplete: durations.length ? durations.reduce((x, y) => x + y, 0) / durations.length : null,
      docsNeeded, docsInReview,
    },
    byStatus,
    byService: [...byService].map(([key, count]) => ({ key, name: serviceByKey(key)?.name ?? key, count })).sort((x, y) => y.count - x.count),
    monthly: months.map((m) => ({ month: m, count: monthMap.get(m) ?? 0 })),
    money,
  });
});

/* Screen views from the app and website. Actions (sign-ins, referrals, uploads...) are recorded on the server where they happen. */
router.post('/events', (req, res) => {
  const list = Array.isArray(req.body?.events) ? req.body.events.slice(0, 25) : [];
  const { memberId } = accessOf(req);
  for (const e of list) {
    if (e && e.event === 'screen_view' && typeof e.screen === 'string' && e.screen) {
      track(req, agentIdOf(req), memberId, 'screen_view', e.screen.replace(/[0-9a-f]{24}/g, ':id'));
    }
  }
  res.status(204).end();
});

export default router;
