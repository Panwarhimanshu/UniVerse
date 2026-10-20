/* One-off: withdrawals made before entry-based withdrawals took an amount, not entries. Mark the oldest completed
   credits of each partner as redeemed by those withdrawals (first in, first out), so they don't show as available
   again. Safe to run more than once. Usage: node scripts/migrate-entries.mjs [--dry] */
import fs from 'node:fs';
import mongoose from 'mongoose';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const dry = process.argv.includes('--dry');

await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB || 'universe' });
const tx = mongoose.connection.db.collection('transactions');
const legacy = await tx.find({ type: 'Debit', kind: { $in: ['withdrawal', null] }, status: { $ne: 'Rejected' }, entries: { $exists: false } }).sort({ date: 1 }).toArray();
let marked = 0;
for (const w of legacy) {
  if (/adjust|correction/i.test(w.kind ?? '')) continue;
  let left = w.amount;
  const credits = await tx.find({ agent: w.agent, type: 'Credit', status: 'Completed', redeemedBy: null, date: { $lte: w.date ?? w.createdAt } }).sort({ date: 1 }).toArray();
  const used = [];
  for (const c of credits) {
    if (left <= 0) break;
    used.push(c._id);
    if (c.amount > left) {
      // partly used: this entry keeps the used part (redeemed); the rest becomes a new available entry
      const rest = c.amount - left;
      console.log(`  split ${c._id}: ₹${left} redeemed, ₹${rest} stays available`);
      if (!dry) {
        await tx.updateOne({ _id: c._id }, { $set: { amount: left } });
        const { _id, ...copy } = c;
        await tx.insertOne({ ...copy, amount: rest, description: `${c.description} (balance after earlier withdrawal)` });
      }
      left = 0;
    } else left -= c.amount;
  }
  console.log(`withdrawal ${w._id} ₹${w.amount}: ${used.length} entries${left > 0 ? ` (₹${left} not matched)` : ''}`);
  if (!dry && used.length) {
    await tx.updateMany({ _id: { $in: used } }, { $set: { redeemedBy: w._id } });
    await tx.updateOne({ _id: w._id }, { $set: { entries: used } });
  }
  marked += used.length;
}
console.log(`${legacy.length} older withdrawals, ${marked} entries ${dry ? 'would be' : ''} marked redeemed`);
await mongoose.disconnect();
