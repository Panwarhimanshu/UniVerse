import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Types } from 'mongoose';
import {
  Admin, Agent, AgreementRequest, Announcement, Article, AuditLog, CommissionArchive, Device, Message, Notification, PayoutMethod, ServiceContent, ServiceRequest, Setting,
  UsageEvent,
  MENUS, PERMS, STAFF_SECTIONS, Student, TeamMember, Transaction,
} from '../models/index.js';
import { adminOf, HttpError } from '../middleware/auth.js';
import { SERVICES, serviceByKey, ZONES } from '../data/catalog.js';
import { COMPANY_KEYS, getSettings, isServiceHidden, loadServiceContent, loadSettings, serviceOverrides } from '../content.js';
import { GSTIN_RE } from '../kyc.js';
import { publicAgent, publicTeamMember, publicTx } from '../serialize.js';
import { publicArticle } from './content.js';
import { deleteFile, MAX_UPLOAD_BYTES, saveFile, sendDocFile } from '../files.js';
import { EMAIL_RE, photo, removePhoto, storePhoto } from './auth.js';
import { accountNotices, notify } from '../notify.js';
import { publicMethod, syncWallet } from '../wallet.js';

/* Master admin only (mounted behind masterOnly in admin.ts). */
const router = Router();

const oid = (id: unknown, what = 'Record') => {
  if (!Types.ObjectId.isValid(String(id))) throw new HttpError(404, `${what} not found`);
  return new Types.ObjectId(String(id));
};
const staffJson = (a: any) => ({
  id: String(a._id), name: a.name, email: a.email, role: a.role ?? 'staff', sections: a.sections ?? [],
  active: a.active ?? true, lastLoginAt: a.lastLoginAt ?? null, createdAt: a.createdAt,
});
const cleanSections = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is (typeof STAFF_SECTIONS)[number] => (STAFF_SECTIONS as readonly string[]).includes(x)))] : [];

/* ---------- staff accounts ---------- */
router.get('/staff', async (_req, res) => {
  res.json((await Admin.find().sort({ role: 1, createdAt: 1 })).map(staffJson));
});

router.post('/staff', async (req, res) => {
  const { name, email, password, role } = req.body ?? {};
  if (!String(name ?? '').trim()) throw new HttpError(400, 'Name is required');
  if (!EMAIL_RE.test(String(email ?? '').trim())) throw new HttpError(400, 'Enter a valid email');
  if (typeof password !== 'string' || password.length < 10) throw new HttpError(400, 'Set a temporary password of at least 10 characters');
  if (await Admin.exists({ email: String(email).trim().toLowerCase() })) throw new HttpError(409, 'A back-office account with this email already exists');
  const a = await Admin.create({
    name: String(name).trim(), email, role: role === 'master' ? 'master' : 'staff',
    sections: cleanSections(req.body?.sections), passwordHash: await bcrypt.hash(password, 10),
  });
  res.locals.audit = `Added ${a.role === 'master' ? 'master admin' : 'staff'} ${a.name}`;
  res.status(201).json(staffJson(a));
});

router.patch('/staff/:id', async (req, res) => {
  const a = await Admin.findById(oid(req.params.id, 'Staff member'));
  if (!a) throw new HttpError(404, 'Staff member not found');
  const self = String(a._id) === adminOf(req).id;
  const b = req.body ?? {};
  if (b.name !== undefined) {
    if (!String(b.name).trim()) throw new HttpError(400, 'Name is required');
    a.name = String(b.name).trim();
  }
  if (b.email !== undefined) {
    const e = String(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(e)) throw new HttpError(400, 'Enter a valid email');
    if (e !== a.email && (await Admin.exists({ email: e }))) throw new HttpError(409, 'Another account already uses this email');
    a.email = e;
  }
  const losingMaster = a.role === 'master' && ((b.role !== undefined && b.role !== 'master') || b.active === false);
  if (losingMaster) {
    if (self) throw new HttpError(400, "You can't remove your own master access");
    if ((await Admin.countDocuments({ role: 'master', active: true })) <= 1) throw new HttpError(400, 'Keep at least one active master admin');
  }
  if (b.role !== undefined) a.role = b.role === 'master' ? 'master' : 'staff';
  if (b.sections !== undefined) a.set('sections', cleanSections(b.sections));
  if (b.active !== undefined) {
    if (self && !b.active) throw new HttpError(400, "You can't disable your own account");
    a.active = !!b.active;
  }
  if (b.password) {
    if (String(b.password).length < 10) throw new HttpError(400, 'Password must be at least 10 characters');
    a.passwordHash = await bcrypt.hash(String(b.password), 10);
  }
  await a.save();
  res.locals.audit = `Updated staff account ${a.name}${b.active === false ? ' (disabled)' : b.active === true ? ' (enabled)' : ''}${b.password ? ' (password set)' : ''}`;
  res.json(staffJson(a));
});

router.delete('/staff/:id', async (req, res) => {
  const a = await Admin.findById(oid(req.params.id, 'Staff member'));
  if (!a) throw new HttpError(404, 'Staff member not found');
  if (String(a._id) === adminOf(req).id) throw new HttpError(400, "You can't delete your own account");
  if (a.role === 'master' && (await Admin.countDocuments({ role: 'master' })) <= 1) throw new HttpError(400, 'Keep at least one master admin');
  await a.deleteOne();
  res.locals.audit = `Deleted back-office account ${a.name}`;
  res.status(204).end();
});

/* ---------- partners: full control ---------- */
router.get('/partners/:id', async (req, res) => {
  const a = await Agent.findById(oid(req.params.id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  const [team, tx, students, methods, byStatus, recent, agreementRequests, lastSeen, devices] = await Promise.all([
    TeamMember.find({ agent: a._id }).sort({ createdAt: 1 }),
    Transaction.find({ agent: a._id }).sort({ date: -1 }).limit(50),
    Student.countDocuments({ agent: a._id }),
    PayoutMethod.find({ agent: a._id }).sort({ isDefault: -1, createdAt: 1 }),
    ServiceRequest.aggregate([{ $match: { agent: a._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ServiceRequest.find({ agent: a._id }).sort({ createdAt: -1 }).limit(8).populate('student', 'name'),
    AgreementRequest.find({ agent: a._id }).sort({ createdAt: -1 }).limit(10),
    UsageEvent.findOne({ agent: a._id }).sort({ at: -1 }).select('at platform'),
    Device.countDocuments({ agent: a._id }),
  ]);
  res.json({
    ...publicAgent(a), suspended: !!a.suspended, wallet: a.wallet, students,
    team: team.map(publicTeamMember), transactions: tx.map(publicTx),
    payoutMethods: methods.map(publicMethod),
    cases: Object.fromEntries(byStatus.map((r) => [r._id, r.n])),
    recentCases: recent.map((r: any) => ({
      id: String(r._id), ref: r.ref, service: serviceByKey(r.service)?.name ?? r.service, student: r.student?.name ?? '', status: r.status, createdAt: r.createdAt,
    })),
    agreementRequests: agreementRequests.map((r) => ({ id: String(r._id), type: r.type, status: r.status, outcome: r.outcome ?? '', createdAt: r.createdAt })),
    lastSeen: lastSeen ? { at: lastSeen.at, platform: lastSeen.platform } : null,
    devices,
  });
});

router.patch('/partners/:id', async (req, res) => {
  const a = await Agent.findById(oid(req.params.id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  const b = req.body ?? {};
  for (const k of ['name', 'agency', 'phone', 'city', 'bankAccount'] as const) {
    if (typeof b[k] === 'string') a.set(k, b[k].trim());
  }
  if (!a.name) throw new HttpError(400, 'Name is required');
  if (b.email !== undefined) {
    const e = String(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(e)) throw new HttpError(400, 'Enter a valid email');
    if (e !== a.email && ((await Agent.exists({ email: e })) || (await TeamMember.exists({ email: e })))) throw new HttpError(409, 'Another account already uses this email');
    a.email = e;
  }
  if (b.zone !== undefined) {
    if (!ZONES.includes(b.zone)) throw new HttpError(400, 'Unknown zone');
    a.zone = b.zone;
  }
  const before = { verified: a.verified, rm: a.rm?.name, suspended: !!a.suspended };
  if (typeof b.verified === 'boolean') a.verified = b.verified;
  if (typeof b.suspended === 'boolean') a.suspended = b.suspended;
  if (b.agreement && typeof b.agreement === 'object') {
    if (b.agreement.validTill) {
      const d = new Date(b.agreement.validTill);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Enter a valid date');
      a.set('agreement.validTill', d);
    }
    if (typeof b.agreement.autoRenew === 'boolean') a.set('agreement.autoRenew', b.agreement.autoRenew);
    if (typeof b.agreement.number === 'string') a.set('agreement.number', b.agreement.number.trim());
    if (b.agreement.signedAt) {
      const d = new Date(b.agreement.signedAt);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Enter a valid signing date');
      a.set('agreement.signedAt', d);
    }
    if (b.agreement.status !== undefined) {
      if (!['Active', 'Ending', 'Ended'].includes(b.agreement.status)) throw new HttpError(400, 'Unknown agreement status');
      a.set('agreement.status', b.agreement.status);
      if (b.agreement.status === 'Active') a.set('agreement.endsOn', null);
    }
    if (b.agreement.endsOn !== undefined && a.agreement?.status !== 'Active') {
      const d = b.agreement.endsOn ? new Date(b.agreement.endsOn) : null;
      if (d && Number.isNaN(d.getTime())) throw new HttpError(400, 'Enter a valid end date');
      a.set('agreement.endsOn', d);
    }
  }
  if (b.rm && typeof b.rm === 'object') {
    for (const k of ['name', 'email', 'phone'] as const) if (typeof b.rm[k] === 'string' && b.rm[k].trim()) a.set(`rm.${k}`, b.rm[k].trim());
  }
  await a.save();
  await accountNotices(a, before);
  res.locals.audit = typeof b.suspended === 'boolean'
    ? `${a.agency || a.name}: ${b.suspended ? 'suspended' : 'reactivated'}`
    : `${a.agency || a.name}: details edited`;
  res.json({ ...publicAgent(a), suspended: !!a.suspended });
});

const partnerOf = async (id: unknown) => {
  const a = await Agent.findById(oid(id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  return a;
};
const memberOf = async (agent: Types.ObjectId, id: unknown) => {
  const m = await TeamMember.findOne({ _id: oid(id, 'Team member'), agent });
  if (!m) throw new HttpError(404, 'Team member not found');
  return m;
};
const fullAgent = (a: any) => ({ ...publicAgent(a), suspended: !!a.suspended });

/* Profile photo on the partner's behalf; ?member=<id> sets a team member's photo instead */
router.post('/partners/:id/avatar', photo.single('photo'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a JPG, PNG or WebP photo up to 2 MB');
  const a = await partnerOf(req.params.id);
  const doc: any = req.query.member ? await memberOf(a._id, req.query.member) : a;
  const old = doc.avatar;
  doc.avatar = await storePhoto(req.file);
  await doc.save();
  if (old) await removePhoto(old);
  res.locals.audit = `${a.agency || a.name}: profile photo changed${req.query.member ? ` for ${doc.name}` : ''}`;
  res.json({ avatar: doc.avatar });
});

router.delete('/partners/:id/avatar', async (req, res) => {
  const a = await partnerOf(req.params.id);
  const doc: any = req.query.member ? await memberOf(a._id, req.query.member) : a;
  if (doc.avatar) await removePhoto(doc.avatar);
  doc.avatar = '';
  await doc.save();
  res.locals.audit = `${a.agency || a.name}: profile photo removed${req.query.member ? ` for ${doc.name}` : ''}`;
  res.json({ avatar: '' });
});

/* Signed agreement PDF: upload or replace, and remove */
const agreementPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});
router.post('/partners/:id/agreement-file', agreementPdf.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose the signed agreement as a PDF up to 4 MB');
  const a = await partnerOf(req.params.id);
  const old = a.agreement?.file;
  a.set('agreement.file', await saveFile(req.file.buffer, req.file.originalname || 'agreement.pdf', 'application/pdf'));
  a.set('agreement.fileName', req.file.originalname || `UniVerse agreement ${a.agreement?.number ?? ''}.pdf`.trim());
  a.set('agreement.fileAt', new Date());
  await a.save();
  if (old) await deleteFile(old);
  await notify({
    agent: a._id, audience: 'owner', category: 'account', type: 'account.agreement_sent',
    title: 'Your signed agreement is ready', body: 'Download it from Profile → Agreement.', link: { kind: 'profile' },
  });
  res.locals.audit = `${a.agency || a.name}: agreement PDF uploaded`;
  res.json(fullAgent(a));
});
router.get('/partners/:id/agreement-file', async (req, res) => {
  const a = await partnerOf(req.params.id);
  if (!a.agreement?.file) throw new HttpError(404, 'No signed agreement on file');
  await sendDocFile(res, a.agreement.file, a.agreement.fileName || 'UniVerse agreement.pdf');
});
router.delete('/partners/:id/agreement-file', async (req, res) => {
  const a = await partnerOf(req.params.id);
  if (a.agreement?.file) await deleteFile(a.agreement.file);
  a.set('agreement.file', '');
  a.set('agreement.fileName', '');
  a.set('agreement.fileAt', null);
  await a.save();
  res.locals.audit = `${a.agency || a.name}: agreement PDF removed`;
  res.json(fullAgent(a));
});

/* Payout methods: the desk can remove a wrong UPI ID or bank account, or change the default.
   Partners add new ones themselves, since the account holder has to confirm the details. */
router.delete('/partners/:id/methods/:mid', async (req, res) => {
  const a = await partnerOf(req.params.id);
  const m = await PayoutMethod.findOne({ _id: oid(req.params.mid, 'Payout method'), agent: a._id });
  if (!m) throw new HttpError(404, 'Payout method not found');
  await m.deleteOne();
  if (m.isDefault) {
    const next = await PayoutMethod.findOne({ agent: a._id }).sort({ createdAt: 1 });
    if (next) await PayoutMethod.updateOne({ _id: next._id }, { isDefault: true });
  }
  res.locals.audit = `${a.agency || a.name}: payout method removed (${publicMethod(m).label})`;
  res.status(204).end();
});
router.post('/partners/:id/methods/:mid/default', async (req, res) => {
  const a = await partnerOf(req.params.id);
  const m = await PayoutMethod.findOne({ _id: oid(req.params.mid, 'Payout method'), agent: a._id });
  if (!m) throw new HttpError(404, 'Payout method not found');
  await PayoutMethod.updateMany({ agent: a._id }, { isDefault: false });
  await PayoutMethod.updateOne({ _id: m._id }, { isDefault: true });
  res.locals.audit = `${a.agency || a.name}: default payout method set to ${publicMethod(m).label}`;
  res.status(204).end();
});

/* Team members */
router.patch('/partners/:id/team/:mid', async (req, res) => {
  const a = await partnerOf(req.params.id);
  const m = await memberOf(a._id, req.params.mid);
  const b = req.body ?? {};
  if (b.name !== undefined) {
    if (!String(b.name).trim()) throw new HttpError(400, 'Name is required');
    m.name = String(b.name).trim();
  }
  if (b.email !== undefined) {
    const e = String(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(e)) throw new HttpError(400, 'Enter a valid email');
    if (e !== m.email && ((await Agent.exists({ email: e })) || (await TeamMember.exists({ email: e })))) throw new HttpError(409, 'Another account already uses this email');
    m.email = e;
  }
  if (b.role !== undefined) m.role = b.role === 'Manager' ? 'Manager' : 'Staff';
  if (Array.isArray(b.menus)) m.set('menus', b.menus.filter((x: string) => (MENUS as readonly string[]).includes(x)));
  if (Array.isArray(b.perms)) m.set('perms', b.perms.filter((x: string) => (PERMS as readonly string[]).includes(x)));
  await m.save();
  res.locals.audit = `${a.agency || a.name}: team member ${m.name} edited`;
  res.json(publicTeamMember(m));
});
/* Sets a temporary password and returns it once, so the desk can pass it on */
router.post('/partners/:id/team/:mid/reset-password', async (req, res) => {
  const a = await partnerOf(req.params.id);
  const m = await memberOf(a._id, req.params.mid);
  const password = crypto.randomBytes(6).toString('base64url');
  m.passwordHash = await bcrypt.hash(password, 10);
  m.status = 'Active';
  await m.save();
  res.locals.audit = `${a.agency || a.name}: password reset for team member ${m.name}`;
  res.json({ password });
});
router.delete('/partners/:id/team/:mid', async (req, res) => {
  const a = await partnerOf(req.params.id);
  const m = await memberOf(a._id, req.params.mid);
  if (m.avatar) await removePhoto(m.avatar);
  await m.deleteOne();
  await Promise.all([Notification.deleteMany({ member: m._id }), Device.deleteMany({ member: m._id })]);
  res.locals.audit = `${a.agency || a.name}: team member ${m.name} removed`;
  res.status(204).end();
});

/* Manual wallet correction. Positive amounts credit, negative amounts debit; both are recorded as transactions. */
router.post('/partners/:id/adjust', async (req, res) => {
  const id = oid(req.params.id, 'Partner');
  const amount = Math.round(Number(req.body?.amount));
  const note = String(req.body?.note ?? '').trim();
  if (!amount) throw new HttpError(400, 'Enter an amount (use a minus sign to deduct)');
  if (!note) throw new HttpError(400, 'Add a short reason; the partner sees it in their wallet');
  const a = await Agent.findById(id);
  if (!a) throw new HttpError(404, 'Partner not found');
  const before = await syncWallet(id);
  if (amount < 0 && before.balance < -amount) throw new HttpError(400, "The partner's balance is lower than that");
  await Transaction.create({ agent: id, type: amount > 0 ? 'Credit' : 'Debit', kind: 'adjustment', amount: Math.abs(amount), status: 'Completed', description: note });
  const wallet = await syncWallet(id);
  res.locals.audit = `${a.agency || a.name}: wallet ${amount > 0 ? 'credited' : 'debited'} ₹${Math.abs(amount).toLocaleString('en-IN')} (${note})`;
  res.json({ wallet });
});

/* Permanently deletes a partner and everything linked to them. The caller must repeat the partner's email. */
router.delete('/partners/:id', async (req, res) => {
  const a = await Agent.findById(oid(req.params.id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  if (String(req.body?.confirm ?? '').trim().toLowerCase() !== a.email) throw new HttpError(400, "Type the partner's email to confirm");
  const reqs = await ServiceRequest.find({ agent: a._id }).select('docs');
  for (const r of reqs) for (const d of r.docs) {
    if (d.file) await deleteFile(d.file);
  }
  await Promise.all([
    Student.deleteMany({ agent: a._id }), ServiceRequest.deleteMany({ agent: a._id }), Message.deleteMany({ agent: a._id }),
    Transaction.deleteMany({ agent: a._id }), TeamMember.deleteMany({ agent: a._id }), AgreementRequest.deleteMany({ agent: a._id }),
    Notification.deleteMany({ agent: a._id }), Device.deleteMany({ agent: a._id }), UsageEvent.deleteMany({ agent: a._id }), PayoutMethod.deleteMany({ agent: a._id }),
  ]);
  await a.deleteOne();
  res.locals.audit = `Deleted partner ${a.agency || a.name} (${a.email}) and all their data`;
  res.status(204).end();
});

/* ---------- services ---------- */
const TEXT = ['name', 'short', 'cardText', 'about', 'tat', 'countries'] as const;
const LISTS = ['feats', 'partners', 'steps', 'documents'] as const;

const servicesWithCurrent = () => serviceOverrides().map((o) => {
  const svc = serviceByKey(o.key)!;
  return { ...o, current: { commission: svc.commission, documents: svc.documents } };
});

router.get('/services', (_req, res) => res.json(servicesWithCurrent()));

/* When a commission rate changes, the structure that was in force is archived so partners see real history. */
const commissionSnapshot = () => SERVICES.filter((s) => !isServiceHidden(s.key)).map((s) => [s.name, `${s.commission.amount} ${s.commission.note}`]);
const monthLabel = () => new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
async function archiveIfRatesChanged(before: string[][], rates: Map<string, string>) {
  const changed = SERVICES.some((s) => rates.get(s.key) !== `${s.commission.amount} ${s.commission.note}`);
  if (!changed) return;
  const now = monthLabel();
  await CommissionArchive.create({ effective: `${getSettings().commissionEffective} – ${now}`, items: before });
  await Setting.updateOne({ key: 'site' }, { commissionEffective: now });
  await loadSettings();
  // clause 8.1 of the partner agreement: every revision is notified by email, app and in-app
  const partners = await Agent.find({ $or: [{ onboarding: 'active' }, { onboarding: { $exists: false } }, { onboarding: null }] }).select('_id');
  for (let i = 0; i < partners.length; i += 20) {
    await Promise.all(partners.slice(i, i + 20).map((p) => notify({
      agent: p._id, category: 'account', type: 'account.commission_revised', audience: 'all',
      title: 'Commission structure revised',
      body: `UniVerse has published a revised commission structure (effective ${now}). See the Commissions section for the new rates and the history of every revision.`,
      link: { kind: 'none' },
    })));
  }
}
const currentRates = () => new Map(SERVICES.map((s) => [s.key, `${s.commission.amount} ${s.commission.note}`]));

router.put('/services/:key', async (req, res) => {
  const before = commissionSnapshot();
  const rates = currentRates();
  const key = String(req.params.key);
  if (!serviceByKey(key)) throw new HttpError(404, 'Service not found');
  const b = req.body?.data ?? {};
  const data: Record<string, unknown> = {};
  for (const k of TEXT) if (typeof b[k] === 'string' && b[k].trim()) data[k] = b[k].trim();
  for (const k of LISTS) {
    if (Array.isArray(b[k])) {
      const list = b[k].map((x: unknown) => String(x).trim()).filter(Boolean);
      if (list.length) data[k] = list;
    }
  }
  if (Array.isArray(b.kpis)) {
    const kpis = b.kpis.map((p: unknown) => (Array.isArray(p) ? [String(p[0] ?? '').trim(), String(p[1] ?? '').trim()] : null))
      .filter((p: string[] | null): p is string[] => !!p && !!p[0] && !!p[1]);
    if (kpis.length) data.kpis = kpis;
  }
  if (b.commission && typeof b.commission === 'object') {
    const c = { amount: String(b.commission.amount ?? '').trim(), note: String(b.commission.note ?? '').trim() };
    if (c.amount || c.note) data.commission = c;
  }
  await ServiceContent.findOneAndUpdate({ key }, { key, data, hidden: !!req.body?.hidden }, { upsert: true });
  await loadServiceContent();
  await archiveIfRatesChanged(before, rates);
  res.locals.audit = `Edited service ${serviceByKey(key)?.name}${req.body?.hidden ? ' (hidden)' : ''}`;
  res.json(servicesWithCurrent().find((s) => s.key === key));
});

router.delete('/services/:key', async (req, res) => {
  const before = commissionSnapshot();
  const rates = currentRates();
  await ServiceContent.deleteOne({ key: String(req.params.key) });
  await loadServiceContent();
  await archiveIfRatesChanged(before, rates);
  res.locals.audit = `Reset service ${serviceByKey(String(req.params.key))?.name ?? req.params.key} to the original text`;
  res.status(204).end();
});

/* ---------- insights articles ---------- */
const articleBody = (b: any) => {
  const service = String(b?.service ?? '');
  if (!SERVICES.some((s) => s.key === service)) throw new HttpError(400, 'Pick the service this article is about');
  const t = String(b?.t ?? '').trim();
  if (!t) throw new HttpError(400, 'Title is required');
  const d = String(b?.d ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new HttpError(400, 'Enter the publish date');
  const body = (Array.isArray(b?.body) ? b.body : []).map((p: unknown) => String(p).trim()).filter(Boolean);
  if (!body.length) throw new HttpError(400, 'Write the article text');
  return { service, t, d, mins: Math.max(1, Math.round(Number(b?.mins) || 3)), teaser: String(b?.teaser ?? '').trim(), body };
};

router.get('/articles', async (_req, res) => {
  res.json({ imported: getSettings().articlesImported, list: (await Article.find().sort({ d: -1 })).map(publicArticle) });
});

/* One-time move of the built-in articles into the database, so they become editable */
router.post('/articles/import', async (req, res) => {
  // claim the import atomically so two requests arriving together can't both insert
  const claimed = await Setting.findOneAndUpdate({ key: 'site', articlesImported: { $ne: true } }, { articlesImported: true });
  if (!claimed) return res.json({ ok: true, imported: 0 });
  const list = Array.isArray(req.body?.articles) ? req.body.articles : [];
  const docs = list.map((a: unknown) => { try { return articleBody(a); } catch { return null; } }).filter(Boolean);
  if (docs.length) await Article.insertMany(docs);
  await loadSettings();
  res.json({ ok: true, imported: docs.length });
});

router.post('/articles', async (req, res) => {
  const a = await Article.create(articleBody(req.body));
  if (!getSettings().articlesImported) {
    await Setting.updateOne({ key: 'site' }, { articlesImported: true });
    await loadSettings();
  }
  res.locals.audit = `Published article “${a.t}”`;
  res.status(201).json(publicArticle(a));
});

router.patch('/articles/:id', async (req, res) => {
  const a = await Article.findByIdAndUpdate(oid(req.params.id, 'Article'), articleBody(req.body), { new: true });
  if (!a) throw new HttpError(404, 'Article not found');
  res.locals.audit = `Edited article “${a.t}”`;
  res.json(publicArticle(a));
});

router.delete('/articles/:id', async (req, res) => {
  const a = await Article.findByIdAndDelete(oid(req.params.id, 'Article'));
  if (!a) throw new HttpError(404, 'Article not found');
  res.locals.audit = `Deleted article “${a.t}”`;
  res.status(204).end();
});

/* ---------- site settings ---------- */
router.get('/settings', (_req, res) => res.json(getSettings()));

router.patch('/settings', async (req, res) => {
  const b = req.body ?? {};
  const set: Record<string, unknown> = {};
  if (b.minWithdrawal !== undefined) {
    const n = Math.round(Number(b.minWithdrawal));
    if (!(n >= 1)) throw new HttpError(400, 'Minimum withdrawal must be at least ₹1');
    set.minWithdrawal = n;
  }
  if (b.supportEmail !== undefined) {
    if (!EMAIL_RE.test(String(b.supportEmail).trim())) throw new HttpError(400, 'Enter a valid support email');
    set.supportEmail = String(b.supportEmail).trim();
  }
  for (const k of ['supportPhone', 'commissionEffective'] as const) {
    if (typeof b[k] === 'string' && b[k].trim()) set[k] = b[k].trim();
  }
  if (b.defaultRm && typeof b.defaultRm === 'object') {
    for (const k of ['name', 'email', 'phone'] as const) {
      if (typeof b.defaultRm[k] === 'string' && b.defaultRm[k].trim()) set[`defaultRm.${k}`] = b.defaultRm[k].trim();
    }
  }
  for (const k of ['tdsRate', 'gstRate'] as const) {
    if (b[k] === undefined) continue;
    const n = Number(b[k]);
    if (!(n >= 0 && n <= 40)) throw new HttpError(400, `${k === 'tdsRate' ? 'TDS' : 'GST'} rate must be between 0 and 40%`);
    set[k] = n;
  }
  if (typeof b.sac === 'string') {
    if (!/^\d{4,8}$/.test(b.sac.trim())) throw new HttpError(400, 'SAC must be 4 to 8 digits');
    set.sac = b.sac.trim();
  }
  if (typeof b.agreementVersion === 'string' && b.agreementVersion.trim()) set.agreementVersion = b.agreementVersion.trim().slice(0, 20);
  if (b.company && typeof b.company === 'object') {
    for (const k of COMPANY_KEYS) if (typeof b.company[k] === 'string') set[`company.${k}`] = b.company[k].trim().slice(0, 300);
    const g = String(b.company.gstin ?? '').trim().toUpperCase();
    if (g && !GSTIN_RE.test(g)) throw new HttpError(400, 'Company GSTIN is not valid');
    if (g) set['company.gstin'] = g;
  }
  await Setting.updateOne({ key: 'site' }, { $set: set });
  res.locals.audit = 'Updated site settings';
  res.json(await loadSettings());
});

/* ---------- app and website usage ---------- */
router.get('/usage', async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const tz = 'Asia/Kolkata';
  const now = Date.now();
  const since = new Date(now - days * 864e5);
  const userKey = { $concat: [{ $toString: '$agent' }, ':', { $ifNull: [{ $toString: '$member' }, 'owner'] }] };
  const distinctSince = async (ms: number, extra: Record<string, unknown> = {}) =>
    (await UsageEvent.aggregate([{ $match: { at: { $gte: new Date(now - ms) }, ...extra } }, { $group: { _id: userKey } }, { $count: 'n' }]))[0]?.n ?? 0;

  const [dau, wau, mau, daily, platforms, oses, screens, actions, active, signIns] = await Promise.all([
    distinctSince(864e5),
    distinctSince(7 * 864e5),
    distinctSince(30 * 864e5),
    UsageEvent.aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: tz } }, platform: '$platform' }, users: { $addToSet: userKey } } },
      { $project: { _id: 0, day: '$_id.day', platform: '$_id.platform', n: { $size: '$users' } } },
    ]),
    UsageEvent.aggregate([{ $match: { at: { $gte: since } } }, { $group: { _id: '$platform', users: { $addToSet: userKey } } }, { $project: { n: { $size: '$users' } } }]),
    UsageEvent.aggregate([{ $match: { at: { $gte: since }, platform: 'app' } }, { $group: { _id: '$os', users: { $addToSet: userKey } } }, { $project: { n: { $size: '$users' } } }]),
    UsageEvent.aggregate([{ $match: { at: { $gte: since }, event: 'screen_view' } }, { $group: { _id: { platform: '$platform', screen: '$screen' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 12 }]),
    UsageEvent.aggregate([{ $match: { at: { $gte: since }, event: { $ne: 'screen_view' } } }, { $group: { _id: '$event', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    UsageEvent.aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: '$agent', events: { $sum: 1 }, lastSeen: { $max: '$at' }, platforms: { $addToSet: '$platform' } } },
      { $sort: { events: -1 } }, { $limit: 8 },
    ]),
    UsageEvent.find({ event: 'sign_in' }).sort({ at: -1 }).limit(10),
  ]);

  const agentIds = [...new Set([...active.map((a) => String(a._id)), ...signIns.map((s) => String(s.agent))])];
  const agents = await Agent.find({ _id: { $in: agentIds } }).select('name agency');
  const nameOf = new Map(agents.map((a) => [String(a._id), a.agency || a.name]));
  const dayKeys = Array.from({ length: days }, (_, i) =>
    new Date(now - (days - 1 - i) * 864e5).toLocaleDateString('en-CA', { timeZone: tz }));

  res.json({
    days,
    activeUsers: { day: dau, week: wau, month: mau },
    daily: dayKeys.map((d) => ({
      day: d,
      app: daily.find((r) => r.day === d && r.platform === 'app')?.n ?? 0,
      web: daily.find((r) => r.day === d && r.platform === 'web')?.n ?? 0,
    })),
    platforms: Object.fromEntries(platforms.map((p) => [p._id, p.n])),
    appOs: Object.fromEntries(oses.map((o) => [o._id || 'unknown', o.n])),
    screens: screens.map((s) => ({ platform: s._id.platform, screen: s._id.screen, views: s.n })),
    actions: actions.map((a) => ({ event: a._id, count: a.n })),
    topPartners: active.map((a) => ({ id: String(a._id), name: nameOf.get(String(a._id)) ?? 'Deleted partner', events: a.events, lastSeen: a.lastSeen, platforms: a.platforms })),
    recentSignIns: signIns.map((s) => ({ name: nameOf.get(String(s.agent)) ?? 'Deleted partner', platform: s.platform, os: s.os, at: s.at })),
  });
});

/* ---------- announcements: a notification to every partner, or to one ---------- */
router.get('/announcements', async (_req, res) => {
  const list = await Announcement.find().sort({ createdAt: -1 }).limit(50).populate('partner', 'name agency');
  res.json(list.map((a: any) => ({
    id: String(a._id), title: a.title, body: a.body, sentBy: a.sentBy, recipients: a.recipients, createdAt: a.createdAt,
    partner: a.partner ? { id: String(a.partner._id), name: a.partner.agency || a.partner.name } : null,
  })));
});

router.post('/announcements', async (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  if (!title || title.length > 80) throw new HttpError(400, 'Write a title of up to 80 characters');
  if (!body || body.length > 600) throw new HttpError(400, 'Write a message of up to 600 characters');
  const partner = req.body?.partnerId ? oid(req.body.partnerId, 'Partner') : null;
  const agents = await Agent.find(partner ? { _id: partner } : { suspended: { $ne: true } }).select('_id');
  if (partner && !agents.length) throw new HttpError(404, 'Partner not found');
  let recipients = 0;
  for (let i = 0; i < agents.length; i += 20) {
    const counts = await Promise.all(agents.slice(i, i + 20).map((a) => notify({
      agent: a._id, category: 'announcement', type: 'announcement', title, body, link: { kind: 'none' },
    })));
    recipients += counts.reduce((n, c) => n + (c ?? 0), 0);
  }
  const a = await Announcement.create({ title, body, partner, sentBy: adminOf(req).name, recipients });
  res.locals.audit = `Sent announcement “${title}” to ${partner ? 'one partner' : 'all partners'}`;
  res.status(201).json({ id: String(a._id), recipients });
});

/* ---------- activity log ---------- */
router.get('/activity', async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.admin) filter.admin = oid(req.query.admin, 'Staff member');
  const list = await AuditLog.find(filter).sort({ at: -1 }).limit(Math.min(500, Number(req.query.limit) || 200));
  res.json(list.map((l) => ({ id: String(l._id), admin: l.admin ? String(l.admin) : null, name: l.name, action: l.action, at: l.at })));
});

export default router;
