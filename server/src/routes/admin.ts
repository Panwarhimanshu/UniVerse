import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Admin, Agent, AgreementRequest, AuditLog, Message, ServiceRequest, STATUSES, Student, TeamMember, Transaction } from '../models/index.js';
import { adminOf, HttpError, requireAdmin, requireSection, masterOnly, signAdminToken } from '../middleware/auth.js';
import masterRoutes from './master.js';
import { serviceByKey } from '../data/catalog.js';
import { LAST_STEP, progressFor, stepsFor } from '../data/timelines.js';
import { publicAgent, publicMessage, publicRequest, publicTx } from '../serialize.js';
import { sendDocFile } from './requests.js';

/* Back office for the UniVerse service desk and relationship managers. */
const router = Router();

const oid = (id: unknown, what = 'Record') => {
  if (!Types.ObjectId.isValid(String(id))) throw new HttpError(404, `${what} not found`);
  return new Types.ObjectId(String(id));
};
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tempPassword = () => crypto.randomBytes(6).toString('base64url');

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const a = await Admin.findOne({ email }).select('+passwordHash');
  if (!a || !(await bcrypt.compare(String(req.body?.password ?? ''), a.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!a.active) throw new HttpError(403, 'This back-office account has been disabled. Ask the master admin.');
  a.lastLoginAt = new Date();
  await a.save();
  await AuditLog.create({ admin: a._id, name: a.name, action: 'Signed in' });
  res.json({ token: signAdminToken(a.id), admin: staffJson(a) });
});

export const staffJson = (a: any) => ({
  id: String(a._id), name: a.name, email: a.email, role: a.role ?? 'staff', sections: a.sections ?? [],
  active: a.active ?? true, lastLoginAt: a.lastLoginAt ?? null, createdAt: a.createdAt,
});

router.use(requireAdmin);

/* Record what staff change. Handlers describe the action in res.locals.audit. */
router.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode < 400 && res.locals.audit) {
        const me = adminOf(req);
        AuditLog.create({ admin: me.id, name: me.name, action: res.locals.audit }).catch((e) => console.error('audit failed', e));
      }
    });
  }
  next();
});

router.get('/me', async (req, res) => {
  const a = await Admin.findById(adminOf(req).id);
  res.json(staffJson(a));
});

router.use('/master', masterOnly, masterRoutes);
router.use('/cases', requireSection('cases'));
router.use('/inbox', requireSection('messages'));
router.use('/partners', (req, res, next) => requireSection(/\/messages$/.test(req.path) ? 'messages' : 'partners')(req, res, next));
router.use('/transactions', requireSection('payouts'));
router.use('/agreement-requests', requireSection('agreements'));

router.post('/password', async (req, res) => {
  const next = String(req.body?.next ?? '');
  if (next.length < 10) throw new HttpError(400, 'Use at least 10 characters');
  const a = await Admin.findById(adminOf(req).id).select('+passwordHash');
  if (!a || !(await bcrypt.compare(String(req.body?.current ?? ''), a.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  a.passwordHash = await bcrypt.hash(next, 10);
  await a.save();
  res.json({ ok: true });
});

/** Threads (case or RM) whose latest non-system message came from the partner, i.e. waiting on us. */
async function awaitingThreads(field: 'request' | 'agent', match: Record<string, unknown>) {
  const rows = await Message.aggregate([
    { $match: { ...match, from: { $ne: 'system' } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: `$${field}`, from: { $first: '$from' }, text: { $first: '$text' }, at: { $first: '$createdAt' } } },
  ]);
  return new Map(rows.filter((r) => r.from === 'agent').map((r) => [String(r._id), r as { text: string; at: Date }]));
}

/* ---------- overview ---------- */
router.get('/overview', async (_req, res) => {
  const [partners, unverified, open, review, payouts, agreements, caseWaiting, rmWaiting] = await Promise.all([
    Agent.countDocuments(),
    Agent.countDocuments({ verified: false }),
    ServiceRequest.countDocuments({ status: { $ne: 'Completed' } }),
    ServiceRequest.countDocuments({ 'docs.status': 'review' }),
    Transaction.countDocuments({ status: 'Pending' }),
    AgreementRequest.countDocuments({ status: 'Open' }),
    awaitingThreads('request', { request: { $ne: null } }),
    awaitingThreads('agent', { request: null }),
  ]);
  res.json({
    partners, unverified, openCases: open, docsToReview: review, pendingPayouts: payouts,
    openAgreementRequests: agreements, casesAwaitingReply: caseWaiting.size, rmAwaitingReply: rmWaiting.size,
  });
});

/* ---------- cases ---------- */
const withPartner = async (list: any[]) => {
  const agents = await Agent.find({ _id: { $in: [...new Set(list.map((r) => String(r.agent)))] } }).select('name agency');
  const byId = new Map(agents.map((a) => [String(a._id), a]));
  return (r: any) => {
    const a = byId.get(String(r.agent));
    return { id: String(r.agent), name: a?.name ?? 'Deleted partner', agency: a?.agency ?? '' };
  };
};

router.get('/cases', async (req, res) => {
  const { status, q, queue, partner } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (status && (STATUSES as readonly string[]).includes(status)) filter.status = status;
  if (partner) filter.agent = oid(partner, 'Partner');
  if (queue === 'review') filter['docs.status'] = 'review';
  if (q?.trim()) {
    const re = new RegExp(escapeRe(q.trim()), 'i');
    const [students, agents] = await Promise.all([
      Student.find({ $or: [{ name: re }, { code: re }] }).select('_id'),
      Agent.find({ $or: [{ name: re }, { agency: re }, { email: re }] }).select('_id'),
    ]);
    filter.$or = [{ ref: re }, { student: { $in: students.map((s) => s._id) } }, { agent: { $in: agents.map((a) => a._id) } }];
  }
  const waiting = await awaitingThreads('request', { request: { $ne: null } });
  if (queue === 'awaiting') filter._id = { $in: [...waiting.keys()].map((id) => new Types.ObjectId(id)) };
  const list = await ServiceRequest.find(filter).sort({ updatedAt: -1 }).limit(300).populate('student');
  const partnerOf = await withPartner(list);
  res.json(list.map((r) => ({
    ...publicRequest(r),
    partner: partnerOf(r),
    awaitingReply: waiting.has(String(r._id)),
    docsToReview: r.docs.filter((d) => d.status === 'review').length,
    updatedAt: r.updatedAt,
  })));
});

const loadCase = async (id: unknown) => {
  const r = await ServiceRequest.findById(oid(id, 'Case')).populate('student');
  if (!r) throw new HttpError(404, 'Case not found');
  return r;
};

const caseDetail = async (r: any) => {
  const [agent, messages, credits] = await Promise.all([
    Agent.findById(r.agent),
    Message.find({ request: r._id }).sort({ createdAt: 1 }),
    Transaction.find({ request: r._id }).sort({ date: -1 }),
  ]);
  return {
    case: publicRequest(r),
    partner: agent ? { ...publicAgent(agent), balance: agent.wallet?.balance ?? 0 } : null,
    messages: messages.map(publicMessage),
    credits: credits.map(publicTx),
  };
};

router.get('/cases/:id', async (req, res) => res.json(await caseDetail(await loadCase(req.params.id))));

/* Move a case to a stage and/or change its status */
router.patch('/cases/:id', async (req, res) => {
  const r = await loadCase(req.params.id);
  const steps = stepsFor(r.service);
  const notes: string[] = [];
  const prevStep = r.step ?? 0;

  if (req.body?.step !== undefined) {
    const step = Math.floor(Number(req.body.step));
    if (!(step >= 0 && step <= LAST_STEP)) throw new HttpError(400, 'Unknown stage');
    if (step !== prevStep) {
      r.step = step;
      r.progress = progressFor(step);
      r.stepLog = [...(r.stepLog ?? []).filter((l) => (l.step ?? 0) < step), { step, at: new Date() }] as any;
      if (step === LAST_STEP) r.status = 'Completed';
      else if (r.status === 'Completed' || r.status === 'Pending') r.status = step === 0 ? 'Pending' : 'In Progress';
      notes.push(step > prevStep ? `Stage reached: ${steps[step][0]}` : `Moved back to: ${steps[step][0]}`);
    }
  }
  if (req.body?.status !== undefined && req.body.status !== r.status) {
    const status = String(req.body.status);
    if (!(STATUSES as readonly string[]).includes(status)) throw new HttpError(400, 'Unknown status');
    r.status = status as (typeof STATUSES)[number];
    if (status === 'Completed' && r.step !== LAST_STEP) {
      r.step = LAST_STEP;
      r.progress = 100;
      r.stepLog.push({ step: LAST_STEP, at: new Date() });
    }
    notes.push(`Status changed to ${status}`);
  }
  await r.save();
  for (const text of notes) await Message.create({ agent: r.agent, request: r._id, from: 'system', text });
  if (notes.length) res.locals.audit = `${r.ref}: ${notes.join('; ')}`;
  res.json(await caseDetail(r));
});

router.post('/cases/:id/messages', async (req, res) => {
  const r = await loadCase(req.params.id);
  const text = String(req.body?.text ?? '').trim();
  if (!text) throw new HttpError(400, 'Message is empty');
  await Message.create({ agent: r.agent, request: r._id, from: 'desk', author: adminOf(req).name, text });
  res.locals.audit = `${r.ref}: replied to partner`;
  res.status(201).json(await caseDetail(r));
});

/* Ask the partner for an extra document */
router.post('/cases/:id/docs', async (req, res) => {
  const r = await loadCase(req.params.id);
  const name = String(req.body?.name ?? '').trim();
  if (!name) throw new HttpError(400, 'Name the document you need');
  r.docs.push({ name, status: 'missing' });
  await r.save();
  await Message.create({ agent: r.agent, request: r._id, from: 'desk', author: adminOf(req).name, text: `Please upload: ${name}` });
  res.locals.audit = `${r.ref}: requested “${name}”`;
  res.status(201).json(await caseDetail(r));
});

/* Verify a document, or send it back with a reason */
router.patch('/cases/:id/docs/:docId', async (req, res) => {
  const r = await loadCase(req.params.id);
  const d = r.docs.id(String(req.params.docId));
  if (!d) throw new HttpError(404, 'Document not found');
  const status = req.body?.status;
  if (status === 'verified') {
    if (!d.file) throw new HttpError(400, 'Nothing has been uploaded for this document yet');
    d.status = 'verified';
    await r.save();
    await Message.create({ agent: r.agent, request: r._id, from: 'system', text: `“${d.name}” verified` });
    res.locals.audit = `${r.ref}: verified “${d.name}”`;
  } else if (status === 'missing') {
    const reason = String(req.body?.reason ?? '').trim();
    d.set({ status: 'missing', file: '', size: 0 });
    await r.save();
    await Message.create({
      agent: r.agent, request: r._id, from: 'desk', author: adminOf(req).name,
      text: `We couldn't accept “${d.name}”${reason ? `: ${reason}` : ''}. Please upload it again.`,
    });
    res.locals.audit = `${r.ref}: returned “${d.name}”`;
  } else {
    throw new HttpError(400, 'Unknown document status');
  }
  res.json(await caseDetail(r));
});

router.get('/cases/:id/docs/:docId/file', async (req, res) => {
  const r = await loadCase(req.params.id);
  const d = r.docs.id(String(req.params.docId));
  if (!d?.file) throw new HttpError(404, 'File not found');
  sendDocFile(res, d.file, d.name);
});

/* Credit a commission to the partner's wallet for this case */
router.post('/cases/:id/credit', async (req, res) => {
  const r = await loadCase(req.params.id);
  const amount = Math.round(Number(req.body?.amount));
  if (!(amount > 0)) throw new HttpError(400, 'Enter the commission amount in rupees');
  const cleared = !!req.body?.cleared;
  const svc = serviceByKey(r.service)?.name ?? r.service;
  const student: any = r.student;
  await Transaction.create({
    agent: r.agent, request: r._id, type: 'Credit', amount, status: cleared ? 'Completed' : 'Pending',
    description: `${svc} commission · ${student?.name ?? ''} (${r.ref})`,
  });
  await Agent.updateOne({ _id: r.agent }, cleared
    ? { $inc: { 'wallet.balance': amount, 'wallet.lifetime': amount } }
    : { $inc: { 'wallet.pending': amount } });
  await Message.create({
    agent: r.agent, request: r._id, from: 'system',
    text: `Commission of ₹${amount.toLocaleString('en-IN')} ${cleared ? 'credited to your wallet' : 'added as pending clearance'}`,
  });
  res.locals.audit = `${r.ref}: credited ₹${amount.toLocaleString('en-IN')} commission${cleared ? '' : ' (pending)'}`;
  res.status(201).json(await caseDetail(r));
});

/* ---------- partners ---------- */
router.get('/partners', async (_req, res) => {
  const [agents, counts, members] = await Promise.all([
    Agent.find().sort({ createdAt: -1 }),
    ServiceRequest.aggregate([{ $group: { _id: '$agent', total: { $sum: 1 }, open: { $sum: { $cond: [{ $ne: ['$status', 'Completed'] }, 1, 0] } } } }]),
    TeamMember.aggregate([{ $group: { _id: '$agent', n: { $sum: 1 } } }]),
  ]);
  const c = new Map(counts.map((x) => [String(x._id), x]));
  const m = new Map(members.map((x) => [String(x._id), x.n]));
  res.json(agents.map((a) => ({
    ...publicAgent(a),
    suspended: !!a.suspended,
    wallet: a.wallet,
    cases: c.get(String(a._id))?.total ?? 0,
    openCases: c.get(String(a._id))?.open ?? 0,
    teamSize: m.get(String(a._id)) ?? 0,
  })));
});

router.patch('/partners/:id', async (req, res) => {
  const a = await Agent.findById(oid(req.params.id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  if (typeof req.body?.verified === 'boolean') a.verified = req.body.verified;
  const rm = req.body?.rm;
  if (rm && typeof rm === 'object') {
    for (const k of ['name', 'email', 'phone'] as const) {
      if (typeof rm[k] === 'string' && rm[k].trim()) a.set(`rm.${k}`, rm[k].trim());
    }
  }
  await a.save();
  res.locals.audit = `${a.agency || a.name}: ${typeof req.body?.verified === 'boolean' ? (a.verified ? 'verified' : 'unverified') : 'RM updated'}`;
  res.json(publicAgent(a));
});

/* Sets a new temporary password and returns it once, so staff can pass it to the partner */
router.post('/partners/:id/reset-password', async (req, res) => {
  const a = await Agent.findById(oid(req.params.id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  const password = tempPassword();
  a.passwordHash = await bcrypt.hash(password, 10);
  await a.save();
  res.locals.audit = `${a.agency || a.name}: password reset`;
  res.json({ password });
});

/* ---------- relationship-manager inbox ---------- */
router.get('/inbox', async (_req, res) => {
  const rows = await Message.aggregate([
    { $match: { request: null } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$agent', last: { $first: '$$ROOT' }, lastNonSystem: { $first: { $cond: [{ $ne: ['$from', 'system'] }, '$from', null] } } } },
    { $sort: { 'last.createdAt': -1 } },
  ]);
  const waiting = await awaitingThreads('agent', { request: null });
  const agents = await Agent.find({ _id: { $in: rows.map((r) => r._id) } }).select('name agency rm');
  const byId = new Map(agents.map((a) => [String(a._id), a]));
  res.json(rows.map((r) => {
    const a = byId.get(String(r._id));
    return {
      partnerId: String(r._id), name: a?.name ?? 'Deleted partner', agency: a?.agency ?? '', rm: a?.rm?.name ?? '',
      last: publicMessage(r.last), awaitingReply: waiting.has(String(r._id)),
    };
  }));
});

router.get('/partners/:id/messages', async (req, res) => {
  const msgs = await Message.find({ agent: oid(req.params.id, 'Partner'), request: null }).sort({ createdAt: 1 });
  res.json(msgs.map(publicMessage));
});

router.post('/partners/:id/messages', async (req, res) => {
  const agent = oid(req.params.id, 'Partner');
  const text = String(req.body?.text ?? '').trim();
  if (!text) throw new HttpError(400, 'Message is empty');
  if (!(await Agent.exists({ _id: agent }))) throw new HttpError(404, 'Partner not found');
  const m = await Message.create({ agent, request: null, from: 'rm', author: adminOf(req).name, text });
  res.locals.audit = 'Replied in an RM conversation';
  res.status(201).json(publicMessage(m));
});

/* ---------- payouts: pending commissions and withdrawals ---------- */
router.get('/transactions', async (req, res) => {
  const status = String(req.query.status ?? 'Pending');
  const list = await Transaction.find(status === 'all' ? {} : { status: status as 'Pending' }).sort({ date: -1 }).limit(300);
  const agents = await Agent.find({ _id: { $in: [...new Set(list.map((t) => String(t.agent)))] } }).select('name agency bankAccount');
  const byId = new Map(agents.map((a) => [String(a._id), a]));
  res.json(list.map((t) => {
    const a = byId.get(String(t.agent));
    return { ...publicTx(t), partner: { id: String(t.agent), name: a?.name ?? '', agency: a?.agency ?? '', bankAccount: a?.bankAccount ?? '' } };
  }));
});

/* clear: pending commission → available · pay: withdrawal sent · reject: undo (withdrawals are refunded) */
router.patch('/transactions/:id', async (req, res) => {
  const t = await Transaction.findById(oid(req.params.id, 'Transaction'));
  if (!t) throw new HttpError(404, 'Transaction not found');
  if (t.status !== 'Pending') throw new HttpError(409, 'This transaction has already been settled');
  const action = req.body?.action;
  if (t.type === 'Credit' && action === 'clear') {
    t.status = 'Completed';
    await Agent.updateOne({ _id: t.agent }, { $inc: { 'wallet.pending': -t.amount, 'wallet.balance': t.amount, 'wallet.lifetime': t.amount } });
  } else if (t.type === 'Debit' && action === 'pay') {
    t.status = 'Completed';
  } else if (action === 'reject') {
    t.status = 'Rejected';
    await Agent.updateOne({ _id: t.agent }, t.type === 'Credit' ? { $inc: { 'wallet.pending': -t.amount } } : { $inc: { 'wallet.balance': t.amount } });
    if (t.type === 'Debit') {
      const reason = String(req.body?.reason ?? '').trim();
      await Message.create({
        agent: t.agent, request: null, from: 'rm', author: adminOf(req).name,
        text: `Your withdrawal of ₹${t.amount.toLocaleString('en-IN')} couldn't be processed${reason ? `: ${reason}` : ''}. The amount is back in your wallet.`,
      });
    }
  } else {
    throw new HttpError(400, 'That action does not apply to this transaction');
  }
  await t.save();
  res.locals.audit = `${t.type === 'Debit' ? 'Withdrawal' : 'Commission'} of ₹${t.amount.toLocaleString('en-IN')}: ${action === 'pay' ? 'paid' : action === 'clear' ? 'cleared' : 'rejected'}`;
  res.json(publicTx(t));
});

/* ---------- agreement requests ---------- */
router.get('/agreement-requests', async (req, res) => {
  const status = req.query.status === 'Closed' ? 'Closed' : req.query.status === 'all' ? null : 'Open';
  const list = await AgreementRequest.find(status ? { status } : {}).sort({ createdAt: -1 }).populate('agent', 'name agency email phone');
  res.json(list.map((r: any) => ({
    id: String(r._id), type: r.type, status: r.status, createdAt: r.createdAt,
    partner: r.agent ? { id: String(r.agent._id), name: r.agent.name, agency: r.agent.agency, email: r.agent.email, phone: r.agent.phone } : null,
  })));
});

router.patch('/agreement-requests/:id', async (req, res) => {
  const r = await AgreementRequest.findById(oid(req.params.id, 'Request'));
  if (!r) throw new HttpError(404, 'Request not found');
  r.status = req.body?.status === 'Open' ? 'Open' : 'Closed';
  await r.save();
  res.locals.audit = `Agreement request (${r.type}) ${r.status === 'Open' ? 'reopened' : 'closed'}`;
  res.json({ ok: true });
});

export default router;
