import { Router } from 'express';
import { Article } from '../models/index.js';
import { getSettings, serviceOverrides } from '../content.js';

/* Public: the website and the app read service edits, insights and contact details from here. */
const router = Router();

export const publicArticle = (a: any) => ({ id: String(a._id), service: a.service, t: a.t, d: a.d, mins: a.mins, teaser: a.teaser, body: a.body });

router.get('/', async (_req, res) => {
  const s = getSettings();
  const articles = s.articlesImported ? (await Article.find().sort({ d: -1 })).map(publicArticle) : null;
  res.json({
    services: serviceOverrides(),
    articles,
    settings: { supportEmail: s.supportEmail, supportPhone: s.supportPhone, commissionEffective: s.commissionEffective, minWithdrawal: s.minWithdrawal },
  });
});

export default router;
