import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Agent, PayoutMethod, Transaction } from './models/index.js';
import { HttpError } from './middleware/auth.js';

/*
  Wallet rules
  - The transactions are the record. Each partner's balance, pending and earned figures are recalculated from them
    after every change (syncWallet), so they can never drift.
      balance  = completed credits − withdrawals that weren't rejected
      pending  = commissions waiting to clear
      lifetime = completed commissions (corrections by the master admin are not "earnings")
  - Withdrawals go to a payout method (UPI ID or bank account). The back office approves each one and pays it
    either through RazorpayX Payouts (when RAZORPAYX_* is set) or by hand, entering the bank reference.
*/

const kindOf = (t: { kind?: string | null; type: string; description: string }) =>
  t.kind ?? (t.type === 'Debit' ? 'withdrawal' : /commission/i.test(t.description) ? 'commission' : 'adjustment');

export async function syncWallet(agentId: Types.ObjectId | string) {
  const tx = await Transaction.find({ agent: agentId }).select('type status amount kind description');
  let balance = 0, pending = 0, lifetime = 0;
  for (const t of tx) {
    if (t.type === 'Credit') {
      if (t.status === 'Completed') {
        balance += t.amount;
        if (kindOf(t) === 'commission') lifetime += t.amount;
      } else if (t.status === 'Pending') pending += t.amount;
    } else if (t.status !== 'Rejected') balance -= t.amount;
  }
  const wallet = { balance, pending, lifetime };
  await Agent.updateOne({ _id: agentId }, { $set: { wallet } });
  return wallet;
}

/** A rejected or failed withdrawal gives its entries back to the wallet */
export const releaseEntries = (withdrawalId: Types.ObjectId | string) =>
  Transaction.updateMany({ redeemedBy: withdrawalId }, { $unset: { redeemedBy: 1 } });

/** What a withdrawal actually pays: entries - TDS (+ GST when invoiced). Older withdrawals paid their amount. */
export const payoutOf = (t: { amount: number; netPayout?: number | null; invoice?: { payable?: number | null } | null }) =>
  t.netPayout ?? t.invoice?.payable ?? t.amount;

/* ---------- payout methods ---------- */
export const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_RE = /^\d{9,18}$/;

/** Bank and branch for an IFSC code, from Razorpay's free IFSC directory. null when the code doesn't exist. */
const ifscCache = new Map<string, { bank: string; branch: string; city: string } | null>();
export async function lookupIfsc(code: string) {
  const ifsc = code.trim().toUpperCase();
  if (!IFSC_RE.test(ifsc)) return null;
  if (ifscCache.has(ifsc)) return ifscCache.get(ifsc)!;
  try {
    const r = await fetch(`https://ifsc.razorpay.com/${ifsc}`, { signal: AbortSignal.timeout(6000) });
    const found = r.ok ? await r.json() : null;
    const v = found ? { bank: String(found.BANK ?? ''), branch: String(found.BRANCH ?? ''), city: String(found.CITY ?? '') } : null;
    ifscCache.set(ifsc, v);
    return v;
  } catch {
    return undefined; // directory unreachable: don't block the partner
  }
}

export const methodLabel = (m: { type: string; upi?: string | null; bankName?: string | null; last4?: string | null }) =>
  m.type === 'upi' ? `UPI · ${m.upi}` : `${m.bankName || 'Bank account'} ••${m.last4}`;

export const publicMethod = (m: InstanceType<typeof PayoutMethod>) => ({
  id: String(m._id), type: m.type, label: methodLabel(m), isDefault: m.isDefault,
  upi: m.type === 'upi' ? m.upi : undefined,
  holder: m.type === 'bank' ? m.holder : undefined,
  bankName: m.type === 'bank' ? m.bankName : undefined,
  branch: m.type === 'bank' ? m.branch : undefined,
  ifsc: m.type === 'bank' ? m.ifsc : undefined,
  last4: m.type === 'bank' ? m.last4 : undefined,
});

/* ---------- RazorpayX Payouts ---------- */
export const razorpayReady = () => !!(process.env.RAZORPAYX_KEY_ID && process.env.RAZORPAYX_KEY_SECRET && process.env.RAZORPAYX_ACCOUNT_NUMBER);

async function rzp<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAYX_KEY_ID}:${process.env.RAZORPAYX_KEY_SECRET}`).toString('base64');
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Payout-Idempotency': idempotencyKey } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `Razorpay: ${data?.error?.description ?? `request failed (${r.status})`}`);
  return data as T;
}

/** Sends a withdrawal through RazorpayX. Creates the contact and fund account the first time a method is used. */
export async function razorpayPayout(txId: string) {
  if (!razorpayReady()) throw new HttpError(400, 'Razorpay payouts are not set up yet. Pay by hand and enter the bank reference.');
  const t = await Transaction.findById(txId);
  if (!t || t.type !== 'Debit') throw new HttpError(404, 'Withdrawal not found');
  if (t.status !== 'Pending') throw new HttpError(409, 'This withdrawal has already been settled');
  if (t.payout?.id) throw new HttpError(409, 'This withdrawal was already sent to Razorpay');
  const m = t.methodId ? await PayoutMethod.findById(t.methodId).select('+accountNumber') : null;
  if (!m) throw new HttpError(400, 'The payout method for this withdrawal no longer exists. Reject it so the partner can try again.');
  const agent = await Agent.findById(t.agent);
  if (!agent) throw new HttpError(404, 'Partner not found');

  if (!m.razorpay?.contactId) {
    const c = await rzp<{ id: string }>('/contacts', { name: (agent.agency || agent.name).slice(0, 50), email: agent.email, contact: agent.phone || undefined, type: 'vendor', reference_id: String(agent._id) });
    m.set('razorpay.contactId', c.id);
  }
  if (!m.razorpay?.fundAccountId) {
    const fa = await rzp<{ id: string }>('/fund_accounts', m.type === 'upi'
      ? { contact_id: m.razorpay!.contactId, account_type: 'vpa', vpa: { address: m.upi } }
      : { contact_id: m.razorpay!.contactId, account_type: 'bank_account', bank_account: { name: m.holder, ifsc: m.ifsc, account_number: m.accountNumber } });
    m.set('razorpay.fundAccountId', fa.id);
  }
  await m.save();

  const p = await rzp<{ id: string; status: string }>('/payouts', {
    account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
    fund_account_id: m.razorpay!.fundAccountId,
    amount: Math.round(payoutOf(t) * 100), // paise: entries - TDS (+ GST)
    currency: 'INR',
    mode: m.type === 'upi' ? 'UPI' : payoutOf(t) > 200000 ? 'NEFT' : 'IMPS',
    purpose: 'payout',
    queue_if_low_balance: true,
    reference_id: String(t._id),
    narration: 'UniVerse commission',
  }, String(t._id));
  t.set('payout', { provider: 'razorpay', id: p.id, state: 'processing' });
  await t.save();
  return t;
}

/** Checks the signature on a RazorpayX webhook (header X-Razorpay-Signature) */
export const validWebhook = (raw: Buffer, signature: string) => {
  const secret = process.env.RAZORPAYX_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};
