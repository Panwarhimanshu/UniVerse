import { Router } from 'express';
import { Types } from 'mongoose';
import { Agent, Message, PayoutMethod, ServiceRequest, Student, Transaction } from '../models/index.js';
import { accessOf, agentIdOf, HttpError, need, needMenu, ownerOnly } from '../middleware/auth.js';
import { ACCOUNT_RE, IFSC_RE, UPI_RE, lookupIfsc, methodLabel, publicMethod, razorpayReady, syncWallet } from '../wallet.js';
import { SERVICES, COUNTRIES, DESTINATIONS, serviceByKey } from '../data/catalog.js';
import { CommissionArchive } from '../models/index.js';
import { track } from '../usage.js';
import { publicMessage, publicRequest, publicTx } from '../serialize.js';
import { getSettings, isServiceHidden } from '../content.js';

const router = Router();

/* ---------- catalogue ---------- */
router.get('/services', (_req, res) => res.json(SERVICES.filter((s) => !isServiceHidden(s.key))));
router.get('/commissions', async (_req, res) =>
  res.json({
    rates: SERVICES.filter((s) => !isServiceHidden(s.key)).map((s) => ({ key: s.key, icon: s.icon, name: s.name, ...s.commission })),
    // the live structure, then every structure the master admin has replaced, newest first
    history: [
      {
        id: 'current', title: 'Current structure', status: 'Active',
        effective: `${getSettings().commissionEffective} – present`,
        items: SERVICES.filter((s) => !isServiceHidden(s.key)).map((s) => [s.name, `${s.commission.amount} ${s.commission.note}`]),
      },
      ...(await CommissionArchive.find().sort({ createdAt: -1 }).limit(12)).map((a, i) => ({
        id: i === 0 ? 'previous' : String(a._id), title: i === 0 ? 'Previous structure' : 'Earlier structure',
        status: 'Archived', effective: a.effective, items: a.items,
      })),
    ],
  }),
);
router.get('/meta', (_req, res) => res.json({ destinations: DESTINATIONS, countries: COUNTRIES, minWithdrawal: getSettings().minWithdrawal }));

/* ---------- dashboard ---------- */
router.get('/dashboard', async (req, res) => {
  const agentId = agentIdOf(req);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [agent, requests, students, monthCredits, wallet] = await Promise.all([
    Agent.findById(agentId),
    ServiceRequest.find({ agent: agentId }).sort({ createdAt: -1 }).populate('student'),
    Student.countDocuments({ agent: agentId }),
    Transaction.aggregate([
      { $match: { agent: new Types.ObjectId(agentId), type: 'Credit', status: 'Completed', date: { $gte: startOfMonth }, $or: [{ kind: 'commission' }, { kind: null, description: /commission/i }] } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    syncWallet(agentId),
  ]);
  if (!agent) throw new HttpError(404, 'Account not found');

  const mix: Record<string, number> = {};
  for (const r of requests) mix[r.service] = (mix[r.service] ?? 0) + 1;

  const seesMoney = accessOf(req).owner || accessOf(req).menus.includes('wallet');
  res.json({
    stats: {
      activeCases: requests.filter((r) => r.status !== 'Completed').length,
      students,
      balance: seesMoney ? wallet.balance : null,
      monthEarnings: seesMoney ? monthCredits[0]?.total ?? 0 : null,
    },
    recent: requests.slice(0, 5).map(publicRequest),
    mix: Object.entries(mix)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, name: serviceByKey(key)?.name ?? key, count })),
  });
});

/* ---------- wallet ---------- */
router.get('/wallet', needMenu('wallet'), async (req, res) => {
  const agentId = agentIdOf(req);
  const [wallet, tx, methods] = await Promise.all([
    syncWallet(agentId),
    Transaction.find({ agent: agentId }).sort({ date: -1 }).limit(100),
    PayoutMethod.find({ agent: agentId }).sort({ isDefault: -1, createdAt: 1 }),
  ]);
  res.json({
    ...wallet, minWithdrawal: getSettings().minWithdrawal, instantPayouts: razorpayReady(),
    methods: methods.map(publicMethod), transactions: tx.map(publicTx),
  });
});

/* Withdraw to one of the partner's payout methods. The amount leaves the balance at once; the back office pays it. */
router.post('/wallet/withdraw', need('withdraw'), async (req, res) => {
  const agentId = agentIdOf(req);
  const amount = Math.floor(Number(req.body?.amount));
  const min = getSettings().minWithdrawal;
  if (!Number.isFinite(amount) || amount < min) throw new HttpError(400, `Minimum withdrawal is ₹${min.toLocaleString('en-IN')}`);
  if (!Types.ObjectId.isValid(String(req.body?.methodId ?? ''))) throw new HttpError(400, 'Choose where to receive the money');
  const m = await PayoutMethod.findOne({ _id: req.body.methodId, agent: agentId });
  if (!m) throw new HttpError(400, 'Choose where to receive the money');

  // reserve the amount atomically, so two requests at once can't overdraw
  const wallet = await syncWallet(agentId);
  if (amount > wallet.balance) throw new HttpError(400, `You can withdraw up to ₹${wallet.balance.toLocaleString('en-IN')}`);
  const locked = await Agent.findOneAndUpdate({ _id: agentId, 'wallet.balance': { $gte: amount } }, { $inc: { 'wallet.balance': -amount } });
  if (!locked) throw new HttpError(409, 'Your balance just changed. Please try again.');

  const tx = await Transaction.create({
    agent: agentId, type: 'Debit', kind: 'withdrawal', amount, status: 'Pending',
    description: `Withdrawal to ${methodLabel(m)}`, methodId: m._id, method: { type: m.type, label: methodLabel(m) },
    payout: { state: 'requested' },
  });
  const after = await syncWallet(agentId);
  track(req, agentId, accessOf(req).memberId, 'withdrawal_requested');
  res.status(201).json({ balance: after.balance, transaction: publicTx(tx) });
});

/* Payout methods: UPI IDs and bank accounts. Only the account owner can add or remove them. */
router.get('/wallet/methods', needMenu('wallet'), async (req, res) => {
  const list = await PayoutMethod.find({ agent: agentIdOf(req) }).sort({ isDefault: -1, createdAt: 1 });
  res.json(list.map(publicMethod));
});

router.get('/wallet/ifsc/:code', async (req, res) => {
  const found = await lookupIfsc(String(req.params.code));
  if (found === null) throw new HttpError(404, 'No bank branch has this IFSC code');
  res.json(found ?? { bank: '', branch: '', city: '' });
});

router.post('/wallet/methods', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  const type = req.body?.type;
  if ((await PayoutMethod.countDocuments({ agent: agentId })) >= 5) throw new HttpError(400, 'You can save up to 5 payout methods. Remove one first.');
  let doc;
  if (type === 'upi') {
    const upi = String(req.body?.upi ?? '').trim().toLowerCase();
    if (!UPI_RE.test(upi)) throw new HttpError(400, 'Enter a valid UPI ID, like name@okaxis');
    if (await PayoutMethod.exists({ agent: agentId, type: 'upi', upi })) throw new HttpError(409, 'This UPI ID is already saved');
    doc = { type, upi };
  } else if (type === 'bank') {
    const holder = String(req.body?.holder ?? '').trim();
    const accountNumber = String(req.body?.accountNumber ?? '').replace(/\s+/g, '');
    const ifsc = String(req.body?.ifsc ?? '').trim().toUpperCase();
    if (holder.length < 3) throw new HttpError(400, 'Enter the account holder name as it appears in the bank');
    if (!ACCOUNT_RE.test(accountNumber)) throw new HttpError(400, 'Account number should be 9 to 18 digits');
    if (!IFSC_RE.test(ifsc)) throw new HttpError(400, 'Enter a valid IFSC code, like HDFC0001234');
    const bank = await lookupIfsc(ifsc);
    if (bank === null) throw new HttpError(400, 'No bank branch has this IFSC code. Please check it.');
    if (await PayoutMethod.exists({ agent: agentId, type: 'bank', ifsc, last4: accountNumber.slice(-4), holder })) throw new HttpError(409, 'This bank account is already saved');
    doc = { type, holder, accountNumber, last4: accountNumber.slice(-4), ifsc, bankName: bank?.bank ?? '', branch: bank?.branch ?? '' };
  } else {
    throw new HttpError(400, 'Choose UPI or bank account');
  }
  const isDefault = !(await PayoutMethod.exists({ agent: agentId }));
  const m = await PayoutMethod.create({ agent: agentId, ...doc, isDefault });
  res.status(201).json(publicMethod(m));
});

router.post('/wallet/methods/:id/default', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'Payout method not found');
  const m = await PayoutMethod.findOne({ _id: req.params.id, agent: agentId });
  if (!m) throw new HttpError(404, 'Payout method not found');
  await PayoutMethod.updateMany({ agent: agentId }, { isDefault: false });
  m.isDefault = true;
  await m.save();
  res.json((await PayoutMethod.find({ agent: agentId }).sort({ isDefault: -1, createdAt: 1 })).map(publicMethod));
});

router.delete('/wallet/methods/:id', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'Payout method not found');
  if (await Transaction.exists({ agent: agentId, methodId: req.params.id, status: 'Pending' })) {
    throw new HttpError(409, 'A withdrawal to this account is still being processed. Remove it after that is paid.');
  }
  const m = await PayoutMethod.findOneAndDelete({ _id: req.params.id, agent: agentId });
  if (!m) throw new HttpError(404, 'Payout method not found');
  if (m.isDefault) {
    const next = await PayoutMethod.findOne({ agent: agentId }).sort({ createdAt: 1 });
    if (next) { next.isDefault = true; await next.save(); }
  }
  res.status(204).end();
});

/* ---------- relationship manager chat ---------- */
router.get('/rm/messages', async (req, res) => {
  // account notices (from: system) live in the notification centre, not in the RM chat
  const msgs = await Message.find({ agent: agentIdOf(req), request: null, from: { $ne: 'system' } }).sort({ createdAt: 1 });
  res.json(msgs.map(publicMessage));
});

router.post('/rm/messages', need('chat'), async (req, res) => {
  const agentId = agentIdOf(req);
  const text = String(req.body?.text ?? '').trim();
  if (!text) throw new HttpError(400, 'Message is empty');
  if (text.length > 2000) throw new HttpError(400, 'Message is too long');
  const m = await Message.create({ agent: agentId, request: null, from: 'agent', author: accessOf(req).name, text });
  track(req, agentId, accessOf(req).memberId, 'message_sent');
  res.status(201).json(publicMessage(m));
});

export default router;
