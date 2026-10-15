import type { Request } from 'express';
import { LoginAttempt } from './models/index.js';
import { HttpError } from './middleware/auth.js';

/* Slows down password guessing. Failures are stored in MongoDB so the limit holds across serverless instances.
   Per email: 5 failures in 15 minutes locks that email for the rest of the window. Per IP: 30 in 15 minutes. */

const WINDOW = 15 * 60 * 1000;
const PER_EMAIL = 5;
const PER_IP = 30;

export const clientIp = (req: Request) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

export async function checkAttempts(kind: string, req: Request, email: string) {
  const since = new Date(Date.now() - WINDOW);
  const [byEmail, byIp] = await Promise.all([
    LoginAttempt.find({ key: `${kind}:${email}`, at: { $gte: since } }).sort({ at: 1 }).select('at'),
    LoginAttempt.countDocuments({ key: `${kind}-ip:${clientIp(req)}`, at: { $gte: since } }),
  ]);
  if (byEmail.length >= PER_EMAIL || byIp >= PER_IP) {
    const oldest = byEmail.length >= PER_EMAIL ? byEmail[byEmail.length - PER_EMAIL].at : since;
    const mins = Math.max(1, Math.ceil((oldest.getTime() + WINDOW - Date.now()) / 60000));
    throw new HttpError(429, `Too many attempts. Please wait ${mins} minute${mins > 1 ? 's' : ''} and try again, or reset your password.`);
  }
}

export async function recordFailure(kind: string, req: Request, email: string) {
  await LoginAttempt.insertMany([{ key: `${kind}:${email}` }, { key: `${kind}-ip:${clientIp(req)}` }]);
}

export const clearAttempts = (kind: string, email: string) => LoginAttempt.deleteMany({ key: `${kind}:${email}` });
