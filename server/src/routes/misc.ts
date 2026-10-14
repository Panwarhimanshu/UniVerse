import { Router } from 'express';
import { Types } from 'mongoose';
import { Agent, Message, ServiceRequest, Student, Transaction } from '../models/index.js';
import { accessOf, agentIdOf, HttpError, need, needMenu } from '../middleware/auth.js';
import { SERVICES, DESTINATIONS, serviceByKey } from '../data/catalog.js';
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
router.get('/meta', (_req, res) => res.json({ destinations: DESTINATIONS, minWithdrawal: getSettings().minWithdrawal }));

/* ---------- dashboard ---------- */
router.get('/dashboard', async (req, res) => {
  const agentId = agentIdOf(req);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [agent, requests, students, monthCredits] = await Promise.all([
    Agent.findById(agentId),
    ServiceRequest.find({ agent: agentId }).sort({ createdAt: -1 }).populate('student'),
    Student.countDocuments({ agent: agentId }),
    Transaction.aggregate([
      { $match: { agent: new Types.ObjectId(agentId), type: 'Credit', status: { $ne: 'Rejected' }, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  if (!agent) throw new HttpError(404, 'Account not found');

  const mix: Record<string, number> = {};
  for (const r of requests) mix[r.service] = (mix[r.service] ?? 0) + 1;

  const seesMoney = accessOf(req).owner || accessOf(req).menus.includes('wallet');
  res.json({
    stats: {
      activeCases: requests.filter((r) => r.status !== 'Completed').length,
      students,
      balance: seesMoney ? agent.wallet?.balance ?? 0 : null,
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
  const [agent, tx] = await Promise.all([
    Agent.findById(agentId),
    Transaction.find({ agent: agentId }).sort({ date: -1 }).limit(100),
  ]);
  if (!agent) throw new HttpError(404, 'Account not found');
  res.json({ ...agent.wallet, bankAccount: agent.bankAccount, minWithdrawal: getSettings().minWithdrawal, transactions: tx.map(publicTx) });
});

router.post('/wallet/withdraw', need('withdraw'), async (req, res) => {
  const agentId = agentIdOf(req);
  const amount = Math.floor(Number(req.body?.amount));
  const min = getSettings().minWithdrawal;
  if (!Number.isFinite(amount) || amount < min) throw new HttpError(400, `Minimum withdrawal is ₹${min.toLocaleString('en-IN')}`);

  const current = await Agent.findById(agentId);
  if (!current?.bankAccount) throw new HttpError(400, 'Add your bank account in Profile before withdrawing');

  // atomic: only debit if the balance covers it
  const agent = await Agent.findOneAndUpdate(
    { _id: agentId, 'wallet.balance': { $gte: amount } },
    { $inc: { 'wallet.balance': -amount } },
    { new: true },
  );
  if (!agent) throw new HttpError(400, 'Amount exceeds your available balance');
  const tx = await Transaction.create({
    agent: agentId, description: `Withdrawal to ${agent.bankAccount}`, type: 'Debit', amount, status: 'Pending',
  });
  track(req, agentId, accessOf(req).memberId, 'withdrawal_requested');
  res.status(201).json({ balance: agent.wallet?.balance, transaction: publicTx(tx) });
});

/* ---------- relationship manager chat ---------- */
router.get('/rm/messages', async (req, res) => {
  const msgs = await Message.find({ agent: agentIdOf(req), request: null }).sort({ createdAt: 1 });
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
