import { Router } from 'express';
import { Transaction } from '../models/index.js';
import { notify } from '../notify.js';
import { payoutOf, releaseEntries, syncWallet, validWebhook } from '../wallet.js';

/* RazorpayX calls this when a payout finishes. Set the webhook URL to https://universeportal.vercel.app/api/webhooks/razorpay
   with the events payout.processed, payout.failed, payout.reversed and payout.rejected, and put its secret in
   RAZORPAYX_WEBHOOK_SECRET. */
const router = Router();

router.post('/razorpay', async (req, res) => {
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
  if (!raw || !validWebhook(raw, String(req.headers['x-razorpay-signature'] ?? ''))) return res.status(401).json({ error: 'Bad signature' });
  const event = String(req.body?.event ?? '');
  const p = req.body?.payload?.payout?.entity;
  if (!p?.id || !event.startsWith('payout.')) return res.json({ ok: true });

  const t = await Transaction.findOne({ 'payout.id': p.id });
  if (!t || t.status !== 'Pending') return res.json({ ok: true }); // unknown, or already settled (webhooks can repeat)
  const amt = `₹${payoutOf(t).toLocaleString('en-IN')}`;
  const to = t.method?.label ?? 'your account';

  if (event === 'payout.processed') {
    t.status = 'Completed';
    t.set('payout.state', 'processed');
    t.set('payout.utr', String(p.utr ?? ''));
    t.set('payout.paidAt', new Date());
    await t.save();
    await notify({ agent: t.agent, category: 'payment', type: 'payment.withdrawal_paid', title: `${amt} withdrawal paid`, body: `Your withdrawal of ${amt} has reached ${to}.${p.utr ? ` Bank reference: ${p.utr}.` : ''}`, link: { kind: 'wallet' }, audience: 'wallet' });
  } else if (['payout.failed', 'payout.reversed', 'payout.rejected'].includes(event)) {
    const reason = String(p.status_details?.description ?? p.failure_reason ?? 'The bank could not complete the transfer');
    t.status = 'Rejected';
    t.set('payout.state', event === 'payout.reversed' ? 'reversed' : 'failed');
    t.set('payout.reason', reason);
    await t.save();
    await releaseEntries(t._id);
    await notify({ agent: t.agent, category: 'payment', type: 'payment.withdrawal_rejected', title: `${amt} withdrawal failed`, body: `${reason}. The entries are back in your wallet. Check your payout details and try again.`, link: { kind: 'wallet' }, audience: 'wallet' });
  } else {
    return res.json({ ok: true });
  }
  await syncWallet(t.agent);
  res.json({ ok: true });
});

export default router;
