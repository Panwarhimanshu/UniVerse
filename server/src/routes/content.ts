import { Router } from 'express';
import { Agent, Article, ServiceRequest, Student } from '../models/index.js';
import { getSettings, isServiceHidden, serviceOverrides } from '../content.js';
import { DESTINATIONS, SERVICES } from '../data/catalog.js';
import { sendAvatar } from '../files.js';

/* Public: the website and the app read service edits, insights, contact details and live figures from here. */
const router = Router();

export const publicArticle = (a: any) => ({ id: String(a._id), service: a.service, t: a.t, d: a.d, mins: a.mins, teaser: a.teaser, body: a.body });

/* Figures shown on the public site come from the database, cached briefly so the home page stays fast. */
let statsCache: { at: number; value: unknown } | null = null;
async function liveStats() {
  if (statsCache && Date.now() - statsCache.at < 60_000) return statsCache.value;
  const visible = SERVICES.filter((s) => !isServiceHidden(s.key));
  const [partners, students, completed] = await Promise.all([
    Agent.countDocuments({ suspended: { $ne: true } }),
    Student.countDocuments(),
    ServiceRequest.countDocuments({ status: 'Completed' }),
  ]);
  const value = {
    partners, students, completedCases: completed,
    services: visible.length,
    deliveryPartners: new Set(visible.flatMap((s) => s.partners)).size,
    destinations: DESTINATIONS,
  };
  statsCache = { at: Date.now(), value };
  return value;
}

router.get('/', async (_req, res) => {
  const s = getSettings();
  const articles = s.articlesImported ? (await Article.find().sort({ d: -1 })).map(publicArticle) : null;
  res.json({
    services: serviceOverrides(),
    articles,
    settings: { supportEmail: s.supportEmail, supportPhone: s.supportPhone, commissionEffective: s.commissionEffective, minWithdrawal: s.minWithdrawal },
    stats: await liveStats(),
  });
});

/* Profile photos. They live in their own storage, separate from case documents. */
router.get('/avatar/:id', async (req, res) => {
  await sendAvatar(res, String(req.params.id));
});

export default router;
