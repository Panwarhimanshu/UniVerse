import { Router } from 'express';
import { Types } from 'mongoose';
import { Agent, GstEntity, Message, PayoutMethod, ServiceRequest, Student, Transaction } from '../models/index.js';
import { accessOf, agentIdOf, HttpError, need, needMenu, ownerOnly } from '../middleware/auth.js';
import { ACCOUNT_RE, IFSC_RE, UPI_RE, lookupIfsc, methodLabel, publicMethod, razorpayReady, releaseEntries, syncWallet } from '../wallet.js';
import { SERVICES, COUNTRIES, DESTINATIONS, serviceByKey } from '../data/catalog.js';
import { CommissionArchive } from '../models/index.js';
import { track } from '../usage.js';
import { publicMessage, publicRequest, publicTx } from '../serialize.js';
import { getSettings, isServiceHidden } from '../content.js';
import { gstinValid, stateOfGstin } from '../kyc.js';
import { buildInvoice, calcWithdrawal } from '../invoice.js';
import type { WithdrawLine } from '../invoice.js';
import { validSignature } from '../pdf.js';
import { saveFile, sendDocFile } from '../files.js';

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
  const [wallet, tx, methods, gst, me] = await Promise.all([
    syncWallet(agentId),
    Transaction.find({ agent: agentId }).sort({ date: -1 }).limit(150),
    PayoutMethod.find({ agent: agentId }).sort({ isDefault: -1, createdAt: 1 }),
    GstEntity.find({ agent: agentId }).sort({ isDefault: -1, createdAt: 1 }),
    Agent.findById(agentId).select('kyc agreement onboarding'),
  ]);
  const s = getSettings();
  // TDS deposited this financial year (April to March) on withdrawals that were not rejected
  const now = new Date();
  const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);
  // TDS actually deducted this FY: paid withdrawals, plus older credits that had TDS taken when credited
  const tdsFY = tx.filter((t) => (t.date ?? t.createdAt) >= fyStart && (t.type === 'Debit' ? t.status === 'Completed' : t.gross != null && t.status !== 'Rejected'))
    .reduce((x, t) => x + (t.tds ?? 0), 0);
  const byId = new Map(tx.map((t) => [String(t._id), t]));
  res.json({
    ...wallet, minWithdrawal: s.minWithdrawal, instantPayouts: razorpayReady(), tdsRate: s.tdsRate, gstRate: s.gstRate, tdsFY,
    canWithdraw: withdrawBlock(me) === '', withdrawBlock: withdrawBlock(me),
    methods: methods.map(publicMethod), gstEntities: gst.map(publicGst),
    transactions: tx.map((t) => ({ ...publicTx(t), entryState: entryState(t, byId) })),
  });
});

/* Withdraw by selecting cleared commission entries. TDS is deducted on those entries now; "with GST" the partner signs
   a tax invoice (one line per entry) and is paid GST on top. The entries are locked until the desk pays or rejects. */
router.post('/wallet/withdraw', need('withdraw'), async (req, res) => {
  const agentId = agentIdOf(req);
  const blocked = withdrawBlock(await Agent.findById(agentId).select('kyc agreement onboarding'));
  if (blocked) throw new HttpError(403, blocked);
  if (!Array.isArray(req.body?.entryIds)) throw new HttpError(400, 'Update the app: withdrawals are now made by selecting commission entries');
  const { ids, lines } = await loadEntries(agentId, req.body.entryIds);
  if (!Types.ObjectId.isValid(String(req.body?.methodId ?? ''))) throw new HttpError(400, 'Choose where to receive the money');
  const m = await PayoutMethod.findOne({ _id: req.body.methodId, agent: agentId });
  if (!m) throw new HttpError(400, 'Choose where to receive the money');

  const withGst = req.body?.gst === true;
  let inv: Awaited<ReturnType<typeof prepareInvoice>> | null = null;
  let signer: { name: string; signature: string } | null = null;
  if (withGst) {
    inv = await prepareInvoice(agentId, lines, req.body);
    const name = String(req.body?.signedName ?? '').trim();
    if (req.body?.accept !== true) throw new HttpError(400, 'Confirm that the invoice details are correct');
    if (name.length < 3) throw new HttpError(400, 'Type your name to sign the invoice');
    if (!validSignature(req.body?.signature)) throw new HttpError(400, 'Draw your signature to sign the invoice');
    signer = { name: name.slice(0, 120), signature: String(req.body.signature) };
  }
  const calc = inv ? inv.calc : calcWithdrawal(lines);
  const min = getSettings().minWithdrawal;
  if (calc.payable < min) throw new HttpError(400, `The minimum payout is ₹${min.toLocaleString('en-IN')}. Select more entries.`);
  const wallet = await syncWallet(agentId);
  if (calc.amount > wallet.balance) throw new HttpError(400, `These entries add up to more than your available balance (₹${wallet.balance.toLocaleString('en-IN')}) because of a correction. Ask your relationship manager.`);

  const tx = await Transaction.create({
    agent: agentId, type: 'Debit', kind: 'withdrawal', amount: calc.amount, tds: calc.tds, tdsRate: calc.tdsRate, netPayout: calc.payable,
    entries: ids, status: 'Pending',
    description: `${inv ? `Withdrawal with GST invoice ${inv.number}` : 'Withdrawal (without GST)'} · ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'}`,
    methodId: m._id, method: { type: m.type, label: methodLabel(m) }, payout: { state: 'requested' },
  });
  // lock the entries atomically, so the same entry can't be withdrawn twice
  const locked = await Transaction.updateMany({ _id: { $in: ids }, agent: agentId, redeemedBy: null }, { $set: { redeemedBy: tx._id } });
  if (locked.modifiedCount !== ids.length) {
    await releaseEntries(tx._id);
    await tx.deleteOne();
    throw new HttpError(409, 'Some of these entries were just withdrawn. Refresh and try again.');
  }
  if (inv && signer) {
    const at = new Date();
    const pdf = await buildInvoice({
      number: inv.number, date: at, supplier: inv.supplier, calc: inv.calc, lines, bank: describeMethod(m),
      signature: { path: signer.signature, name: signer.name, at },
    });
    const file = await saveFile(pdf, `Invoice ${inv.number.replace(/[^\w-]+/g, '-')}.pdf`, 'application/pdf');
    tx.gstEntity = inv.entity._id;
    tx.set('invoice', {
      number: inv.number, date: at, supplier: inv.supplier, taxable: calc.amount, tdsAdjusted: calc.tds, gstRate: calc.gstRate,
      cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst, payable: calc.payable, file, signedName: signer.name, signedAt: at, verified: false,
    });
    await tx.save();
  }
  const after = await syncWallet(agentId);
  track(req, agentId, accessOf(req).memberId, 'withdrawal_requested');
  res.status(201).json({ balance: after.balance, transaction: publicTx(tx) });
});

/* What the partner gets for a set of entries, before choosing GST (the GST path uses /wallet/invoice/preview) */
router.post('/wallet/withdraw/quote', need('withdraw'), async (req, res) => {
  const { lines } = await loadEntries(agentIdOf(req), req.body?.entryIds);
  res.json({ ...calcWithdrawal(lines), lines });
});

/* One transaction in full: a commission entry and what happened to it, or a withdrawal with its entries, TDS,
   GST invoice and payout reference */
router.get('/wallet/transactions/:id', needMenu('wallet'), async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'Transaction not found');
  const agentId = agentIdOf(req);
  const t = await Transaction.findOne({ _id: req.params.id, agent: agentId });
  if (!t) throw new HttpError(404, 'Transaction not found');
  const s = getSettings();
  if (t.type === 'Credit') {
    const by = t.redeemedBy ? await Transaction.findById(t.redeemedBy).select('description status date') : null;
    return res.json({
      ...publicTx(t), entryState: entryState(t, new Map(by ? [[String(by._id), by]] : [])),
      tdsOnWithdrawal: lineOf(t).commission ? Math.round((t.amount * s.tdsRate) / 100) : 0,
      redeemedIn: by ? { id: String(by._id), description: by.description, status: by.status, date: by.date } : null,
    });
  }
  const entries = t.entries?.length ? await Transaction.find({ _id: { $in: t.entries } }).sort({ date: 1 }) : [];
  const rate = t.tdsRate ?? s.tdsRate;
  res.json({
    ...publicTx(t),
    lines: entries.map((e) => {
      const l = lineOf(e);
      return { ...l, tds: l.commission ? Math.round((l.amount * rate) / 100) : 0 };
    }),
    invoiceDetail: t.invoice?.number ? {
      supplier: t.invoice.supplier, taxable: t.invoice.taxable, gstRate: t.invoice.gstRate, cgst: t.invoice.cgst, sgst: t.invoice.sgst, igst: t.invoice.igst,
      payable: t.invoice.payable, signedName: t.invoice.signedName, signedAt: t.invoice.signedAt, verified: !!t.invoice.verified,
    } : null,
    receiptNo: `UV/PAY/${(t.date ?? t.createdAt).getFullYear()}/${String(t._id).slice(-6).toUpperCase()}`,
  });
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

/* ---------- GST: registrations a partner invoices from, invoice preview, invoice download ---------- */
const withdrawBlock = (a: any) => {
  if (!a) return 'Account not found';
  if (a.kyc?.status !== 'verified') {
    return a.kyc?.status === 'submitted'
      ? 'Your KYC details are being verified. Withdrawals open once they are verified and your agreement is signed.'
      : 'Complete your KYC (Profile → KYC & agreement) to withdraw. It takes two minutes.';
  }
  if (!a.agreement?.esign?.at) return 'Sign your partner agreement (Profile → KYC & agreement) to withdraw.';
  return '';
};
const publicGst = (g: any) => ({ id: String(g._id), legalName: g.legalName, gstin: g.gstin, address: g.address, state: g.state, isDefault: !!g.isDefault });
const describeMethod = (m: any) => (m.type === 'upi' ? `UPI ${m.upi}` : `${m.holder}, ${m.bankName} A/c XXXX${m.last4}, IFSC ${m.ifsc}`);
const INVOICE_NO_RE = /^[A-Za-z0-9/-]{1,16}$/;

/** A credit as a withdrawal / invoice line */
function lineOf(t: any): WithdrawLine {
  const kind = t.kind ?? (/commission/i.test(t.description) ? 'commission' : 'adjustment');
  return {
    id: String(t._id), desc: t.description, sub: `credited ${new Date(t.date ?? t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`,
    amount: t.amount,
    // TDS applies to commission at withdrawal; older entries already had it taken when credited
    commission: kind === 'commission' && t.gross == null,
  };
}

/** Clearing, available, in process (withdrawal pending), redeemed, or cancelled */
function entryState(t: any, byId: Map<string, any>) {
  if (t.type !== 'Credit') return null;
  if (t.status === 'Rejected') return 'cancelled';
  if (t.status === 'Pending') return 'clearing';
  if (!t.redeemedBy) return 'available';
  const w = byId.get(String(t.redeemedBy));
  return w && w.status === 'Pending' ? 'in_process' : 'redeemed';
}

async function loadEntries(agentId: Types.ObjectId | string, raw: unknown) {
  const ids = [...new Set(Array.isArray(raw) ? raw.map(String) : [])];
  if (!ids.length) throw new HttpError(400, 'Select at least one commission entry to withdraw');
  if (ids.length > 200 || !ids.every((x) => Types.ObjectId.isValid(x))) throw new HttpError(400, 'Select valid entries');
  const list = await Transaction.find({ _id: { $in: ids }, agent: agentId, type: 'Credit', status: 'Completed', redeemedBy: null }).sort({ date: 1 });
  if (list.length !== ids.length) throw new HttpError(409, 'Some of the selected entries are no longer available. Refresh and try again.');
  return { ids: list.map((t) => t._id), lines: list.map(lineOf) };
}

async function prepareInvoice(agentId: Types.ObjectId | string, lines: WithdrawLine[], b: any) {
  if (!Types.ObjectId.isValid(String(b?.gstEntityId ?? ''))) throw new HttpError(400, 'Choose the GST registration to invoice from');
  const entity = await GstEntity.findOne({ _id: b.gstEntityId, agent: agentId });
  if (!entity) throw new HttpError(400, 'Choose the GST registration to invoice from');
  const number = String(b?.invoiceNumber ?? '').trim();
  if (!INVOICE_NO_RE.test(number)) throw new HttpError(400, 'Enter your invoice number: up to 16 letters, digits, / or -');
  if (await Transaction.exists({ agent: agentId, 'invoice.number': number, 'invoice.supplier.gstin': entity.gstin, status: { $ne: 'Rejected' } })) {
    throw new HttpError(409, `Invoice number ${number} is already used for this GSTIN. Use your next invoice number.`);
  }
  const a = await Agent.findById(agentId).select('kyc');
  return {
    entity, number, calc: calcWithdrawal(lines, entity.gstin),
    supplier: { legalName: entity.legalName, gstin: entity.gstin, address: entity.address, state: entity.state || stateOfGstin(entity.gstin), pan: entity.gstin.slice(2, 12) || a?.kyc?.pan },
  };
}

router.get('/wallet/gst', needMenu('wallet'), async (req, res) => {
  res.json((await GstEntity.find({ agent: agentIdOf(req) }).sort({ isDefault: -1, createdAt: 1 })).map(publicGst));
});

router.post('/wallet/gst', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  const gstin = String(req.body?.gstin ?? '').trim().toUpperCase();
  const legalName = String(req.body?.legalName ?? '').trim();
  const address = String(req.body?.address ?? '').trim();
  if (!gstinValid(gstin)) throw new HttpError(400, 'Enter a valid 15-character GSTIN');
  if (!legalName) throw new HttpError(400, 'Enter the legal name registered under this GSTIN');
  if (address.length < 8) throw new HttpError(400, 'Enter the address registered under this GSTIN');
  if (await GstEntity.exists({ agent: agentId, gstin })) throw new HttpError(409, 'This GSTIN is already saved');
  if ((await GstEntity.countDocuments({ agent: agentId })) >= 5) throw new HttpError(400, 'You can save up to 5 GST registrations');
  const first = !(await GstEntity.exists({ agent: agentId }));
  const g = await GstEntity.create({ agent: agentId, gstin, legalName, address, state: stateOfGstin(gstin), isDefault: first || req.body?.isDefault === true });
  if (g.isDefault && !first) await GstEntity.updateMany({ agent: agentId, _id: { $ne: g._id } }, { isDefault: false });
  res.status(201).json(publicGst(g));
});

router.patch('/wallet/gst/:id', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'GST registration not found');
  const g = await GstEntity.findOne({ _id: req.params.id, agent: agentId });
  if (!g) throw new HttpError(404, 'GST registration not found');
  if (typeof req.body?.legalName === 'string' && req.body.legalName.trim()) g.legalName = req.body.legalName.trim();
  if (typeof req.body?.address === 'string' && req.body.address.trim().length >= 8) g.address = req.body.address.trim();
  if (req.body?.isDefault === true) {
    await GstEntity.updateMany({ agent: agentId }, { isDefault: false });
    g.isDefault = true;
  }
  await g.save();
  res.json(publicGst(g));
});

router.delete('/wallet/gst/:id', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'GST registration not found');
  const g = await GstEntity.findOneAndDelete({ _id: req.params.id, agent: agentId });
  if (!g) throw new HttpError(404, 'GST registration not found');
  if (g.isDefault) {
    const next = await GstEntity.findOne({ agent: agentId }).sort({ createdAt: 1 });
    if (next) await GstEntity.updateOne({ _id: next._id }, { isDefault: true });
  }
  res.status(204).end();
});

/* The invoice the partner is about to sign: one line per selected entry, figures and parties, shown before they confirm */
router.post('/wallet/invoice/preview', need('withdraw'), async (req, res) => {
  const agentId = agentIdOf(req);
  const { lines } = await loadEntries(agentId, req.body?.entryIds);
  if (!Types.ObjectId.isValid(String(req.body?.methodId ?? ''))) throw new HttpError(400, 'Choose where to receive the money');
  const m = await PayoutMethod.findOne({ _id: req.body.methodId, agent: agentId });
  if (!m) throw new HttpError(400, 'Choose where to receive the money');
  const inv = await prepareInvoice(agentId, lines, req.body);
  const c = getSettings().company;
  res.json({
    number: inv.number, date: new Date(), supplier: inv.supplier, sac: getSettings().sac, lines,
    recipient: { legalName: c.legalName, gstin: c.gstin, address: c.address, state: c.state, pan: c.pan },
    payTo: describeMethod(m), ...inv.calc,
  });
});

/* Next invoice number suggestion: the partner's last number + 1 when it ends in digits */
router.get('/wallet/invoice/next', needMenu('wallet'), async (req, res) => {
  const last = await Transaction.findOne({ agent: agentIdOf(req), 'invoice.number': { $exists: true } }).sort({ createdAt: -1 }).select('invoice.number');
  const n = last?.invoice?.number ?? '';
  const m = /^(.*?)(\d+)$/.exec(n);
  const year = new Date().getFullYear() % 100;
  res.json({ suggestion: m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}` : `UV/${year}-${year + 1}/001` });
});

router.get('/wallet/transactions/:id/invoice', needMenu('wallet'), async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'Invoice not found');
  const t = await Transaction.findOne({ _id: req.params.id, agent: agentIdOf(req) });
  if (!t?.invoice?.file) throw new HttpError(404, 'Invoice not found');
  await sendDocFile(res, t.invoice.file, `Invoice ${t.invoice.number}.pdf`);
});
