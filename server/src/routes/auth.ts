import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Agent, TeamMember } from '../models/index.js';
import { signToken, requireAuth, agentIdOf, accessOf, ownerOnly, HttpError } from '../middleware/auth.js';
import { ZONES } from '../data/catalog.js';
import { publicAgent, publicTeamMember } from '../serialize.js';
import { getSettings } from '../content.js';
import { deleteFile, MAX_AVATAR_BYTES, saveFile } from '../files.js';
import { track } from '../usage.js';

const router = Router();
export const SUSPENDED = 'This partner account is suspended. Please contact UniVerse support.';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the email already belongs to a partner account or a team member anywhere. */
export const emailTaken = async (email: string) => {
  const e = email.trim().toLowerCase();
  return !!((await Agent.exists({ email: e })) || (await TeamMember.exists({ email: e })));
};

router.post('/register', async (req, res) => {
  const { name, email, phone, zone, city, password } = req.body ?? {};
  if (!name?.trim()) throw new HttpError(400, 'Name is required');
  if (!EMAIL_RE.test(email ?? '')) throw new HttpError(400, 'Enter a valid email address');
  if (!ZONES.includes(zone)) throw new HttpError(400, 'Select your zone');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (await emailTaken(email)) throw new HttpError(409, 'An account with this email already exists');

  const now = new Date();
  const validTill = new Date(now);
  validTill.setFullYear(validTill.getFullYear() + 2);
  validTill.setDate(validTill.getDate() - 1);
  const seq = String((await Agent.countDocuments()) + 1001).padStart(5, '0');
  const agent = await Agent.create({
    name: name.trim(), email, phone, zone, city, agency: name.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    rm: getSettings().defaultRm,
    agreement: { number: `UV/AGR/${now.getFullYear()}/${seq}`, signedAt: now, validTill, autoRenew: true },
  });
  track(req, agent.id, null, 'sign_up');
  res.status(201).json({ token: signToken(agent.id), agent: { ...publicAgent(agent), member: null } });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const agent = await Agent.findOne({ email }).select('+passwordHash');
  if (agent) {
    if (!(await bcrypt.compare(password, agent.passwordHash))) throw new HttpError(401, 'Incorrect email or password');
    if (agent.suspended) throw new HttpError(403, SUSPENDED);
    track(req, agent.id, null, 'sign_in');
    return res.json({ token: signToken(agent.id), agent: { ...publicAgent(agent), member: null } });
  }

  // team members sign in to the owner's account with the access the owner gave them
  const member = await TeamMember.findOne({ email }).select('+passwordHash');
  if (!member?.passwordHash || !(await bcrypt.compare(password, member.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  const owner = await Agent.findById(member.agent);
  if (!owner) throw new HttpError(401, 'This account is no longer active');
  if (owner.suspended) throw new HttpError(403, SUSPENDED);
  member.status = 'Active';
  member.lastLoginAt = new Date();
  await member.save();
  track(req, owner.id, member.id, 'sign_in');
  res.json({ token: signToken(owner.id, member.id), agent: { ...publicAgent(owner), member: publicTeamMember(member) } });
});

router.get('/me', requireAuth, async (req, res) => {
  const agent = await Agent.findById(agentIdOf(req));
  if (!agent) throw new HttpError(404, 'Account not found');
  const { memberId } = accessOf(req);
  const member = memberId ? await TeamMember.findById(memberId) : null;
  res.json({ ...publicAgent(agent), member: member ? publicTeamMember(member) : null });
});

router.patch('/me', requireAuth, ownerOnly, async (req, res) => {
  const allowed = ['name', 'phone', 'agency', 'city', 'bankAccount'] as const;
  const update: Record<string, string> = {};
  for (const k of allowed) if (typeof req.body?.[k] === 'string') update[k] = req.body[k].trim();
  if (update.name === '') throw new HttpError(400, 'Name is required');
  const agent = await Agent.findByIdAndUpdate(agentIdOf(req), update, { new: true });
  if (!agent) throw new HttpError(404, 'Account not found');
  res.json({ ...publicAgent(agent), member: null });
});

/* Profile photo for whoever is signed in (the owner, or a team member for their own login) */
const photo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype)),
});

const meDoc = async (req: import('express').Request) => {
  const { memberId } = accessOf(req);
  const doc = memberId ? await TeamMember.findById(memberId) : await Agent.findById(agentIdOf(req));
  if (!doc) throw new HttpError(404, 'Account not found');
  return doc;
};
const meJson = async (req: import('express').Request) => {
  const agent = await Agent.findById(agentIdOf(req));
  const { memberId } = accessOf(req);
  const member = memberId ? await TeamMember.findById(memberId) : null;
  return { ...publicAgent(agent), member: member ? publicTeamMember(member) : null };
};

router.post('/me/avatar', requireAuth, photo.single('photo'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a JPG, PNG or WebP photo up to 2 MB');
  const doc = await meDoc(req);
  const id = await saveFile(req.file.buffer, req.file.originalname || 'photo', req.file.mimetype, 'avatars');
  const old = doc.avatar;
  doc.avatar = id;
  await doc.save();
  if (old) await deleteFile(old, 'avatars');
  track(req, agentIdOf(req), accessOf(req).memberId, 'profile_photo');
  res.json(await meJson(req));
});

router.delete('/me/avatar', requireAuth, async (req, res) => {
  const doc = await meDoc(req);
  if (doc.avatar) await deleteFile(doc.avatar, 'avatars');
  doc.avatar = '';
  await doc.save();
  res.json(await meJson(req));
});

/* Change your own password (owner or team member) */
router.post('/password', requireAuth, async (req, res) => {
  const current = String(req.body?.current ?? '');
  const next = String(req.body?.next ?? '');
  if (next.length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
  const { memberId } = accessOf(req);
  const doc = memberId
    ? await TeamMember.findById(memberId).select('+passwordHash')
    : await Agent.findById(agentIdOf(req)).select('+passwordHash');
  if (!doc?.passwordHash || !(await bcrypt.compare(current, doc.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  doc.passwordHash = await bcrypt.hash(next, 10);
  await doc.save();
  res.json({ ok: true });
});

export default router;
