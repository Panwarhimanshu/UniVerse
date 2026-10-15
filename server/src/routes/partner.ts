import { Router } from 'express';
import { Types } from 'mongoose';
import { AgreementRequest, Device, Message, MENUS, Notification, PERMS, ServiceRequest, Student, TeamMember } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { agentIdOf, HttpError, need, needMenu, ownerOnly } from '../middleware/auth.js';
import { emailTaken } from './auth.js';
import { isCountry, serviceByKey } from '../data/catalog.js';
import { publicMessage, publicStudent, publicTeamMember } from '../serialize.js';
import { openCase } from './requests.js';
import { track } from '../usage.js';
import { accessOf } from '../middleware/auth.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ownedStudent = async (agentId: string, id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Student not found');
  const s = await Student.findOne({ _id: id, agent: agentId });
  if (!s) throw new HttpError(404, 'Student not found');
  return s;
};

/* ---------- students ---------- */
router.get('/students', needMenu('students'), async (req, res) => {
  const agentId = agentIdOf(req);
  const [students, requests] = await Promise.all([
    Student.find({ agent: agentId }).sort({ createdAt: -1 }),
    ServiceRequest.find({ agent: agentId }).sort({ createdAt: 1 }).select('student ref service status progress'),
  ]);
  const byStudent = new Map<string, typeof requests>();
  for (const r of requests) {
    const k = String(r.student);
    byStudent.set(k, [...(byStudent.get(k) ?? []), r]);
  }
  res.json(students.map((s) => publicStudent(s, byStudent.get(String(s._id)) ?? [])));
});

router.patch('/students/:id', need('edit'), async (req, res) => {
  const agentId = agentIdOf(req);
  const s = await ownedStudent(agentId, String(req.params.id));
  const { name, email, phone, country } = req.body ?? {};
  if (name !== undefined) {
    if (!String(name).trim()) throw new HttpError(400, 'Name is required');
    s.name = String(name).trim();
  }
  if (email !== undefined) {
    if (String(email).trim() && !EMAIL_RE.test(String(email).trim())) throw new HttpError(400, 'Enter a valid email');
    s.email = String(email).trim();
  }
  if (phone !== undefined) {
    if (!String(phone).trim()) throw new HttpError(400, 'Phone is required');
    s.phone = String(phone).trim();
  }
  if (country !== undefined) {
    if (!isCountry(country)) throw new HttpError(400, 'Select a destination');
    s.country = country;
  }
  await s.save();
  const requests = await ServiceRequest.find({ agent: agentId, student: s._id }).sort({ createdAt: 1 });
  res.json(publicStudent(s, requests));
});

/* Raise one or more new service requests for an existing student */
router.post('/students/:id/requests', need('create'), async (req, res) => {
  const agentId = agentIdOf(req);
  const s = await ownedStudent(agentId, String(req.params.id));
  const services: string[] = Array.isArray(req.body?.services) ? req.body.services : [];
  if (!services.length) throw new HttpError(400, 'Pick at least one service');
  if (services.some((k) => !serviceByKey(k))) throw new HttpError(400, 'Unknown service');

  const active = await ServiceRequest.find({ agent: agentId, student: s._id, status: { $ne: 'Completed' } }).select('service');
  const taken = new Set(active.map((r) => r.service));
  const toRaise = [...new Set(services)].filter((k) => !taken.has(k));
  if (!toRaise.length) throw new HttpError(409, 'Those services are already active for this student');

  for (const k of toRaise) await openCase(agentId, s._id, k);
  track(req, agentId, accessOf(req).memberId, 'services_raised');
  const requests = await ServiceRequest.find({ agent: agentId, student: s._id }).sort({ createdAt: 1 });
  res.status(201).json(publicStudent(s, requests));
});

/* ---------- team (user management) ---------- */
const cleanList = <T extends string>(v: unknown, allowed: readonly T[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => allowed.includes(x as T)))] : [];

router.get('/team', ownerOnly, async (req, res) => {
  const members = await TeamMember.find({ agent: agentIdOf(req) }).sort({ createdAt: 1 });
  res.json(members.map(publicTeamMember));
});

router.post('/team', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  const { name, email, role, password } = req.body ?? {};
  if (!String(name ?? '').trim()) throw new HttpError(400, 'Name is required');
  if (!EMAIL_RE.test(String(email ?? '').trim())) throw new HttpError(400, 'Enter a valid email');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Set a temporary password of at least 8 characters');
  if (await emailTaken(String(email))) throw new HttpError(409, 'This email is already used by another account');
  const m = await TeamMember.create({
    agent: agentId, name: String(name).trim(), email, role: role === 'Manager' ? 'Manager' : 'Staff',
    menus: cleanList(req.body?.menus, MENUS), perms: cleanList(req.body?.perms, PERMS),
    passwordHash: await bcrypt.hash(password, 10),
  });
  res.status(201).json(publicTeamMember(m));
});

router.patch('/team/:id', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'Member not found');
  const m = await TeamMember.findOne({ _id: req.params.id, agent: agentId });
  if (!m) throw new HttpError(404, 'Member not found');
  const { name, email, role } = req.body ?? {};
  if (name !== undefined) {
    if (!String(name).trim()) throw new HttpError(400, 'Name is required');
    m.name = String(name).trim();
  }
  if (email !== undefined) {
    const next = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(next)) throw new HttpError(400, 'Enter a valid email');
    if (next !== m.email && (await emailTaken(next))) throw new HttpError(409, 'This email is already used by another account');
    m.email = next;
  }
  if (req.body?.password) {
    if (String(req.body.password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    m.passwordHash = await bcrypt.hash(String(req.body.password), 10);
  }
  if (role !== undefined) m.role = role === 'Manager' ? 'Manager' : 'Staff';
  if (req.body?.menus !== undefined) m.set('menus', cleanList(req.body.menus, MENUS));
  if (req.body?.perms !== undefined) m.set('perms', cleanList(req.body.perms, PERMS));
  await m.save();
  res.json(publicTeamMember(m));
});

router.delete('/team/:id', ownerOnly, async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.id))) throw new HttpError(404, 'Member not found');
  const r = await TeamMember.deleteOne({ _id: req.params.id, agent: agentIdOf(req) });
  if (!r.deletedCount) throw new HttpError(404, 'Member not found');
  await Promise.all([Notification.deleteMany({ member: req.params.id }), Device.deleteMany({ member: req.params.id })]);
  res.status(204).end();
});

/* ---------- agreement requests (handled by the relationship manager in the back office) ---------- */
const AGREEMENT_TEXT = {
  download: 'Requested a copy of the signed partner agreement.',
  discussion: 'Asked to discuss the partner agreement.',
  termination: 'Requested termination of the partner agreement.',
} as const;

router.post('/agreement/requests', ownerOnly, async (req, res) => {
  const agentId = agentIdOf(req);
  const type = req.body?.type as keyof typeof AGREEMENT_TEXT;
  if (!AGREEMENT_TEXT[type]) throw new HttpError(400, 'Unknown request type');
  if (await AgreementRequest.exists({ agent: agentId, type, status: 'Open' })) {
    throw new HttpError(409, 'You already have this request open. Your relationship manager will be in touch.');
  }
  await AgreementRequest.create({ agent: agentId, type });
  await Message.create({ agent: agentId, request: null, from: 'system', text: AGREEMENT_TEXT[type] });
  track(req, agentId, null, 'agreement_request');
  res.status(201).json({ ok: true });
});

/* ---------- notifications: latest desk / RM messages ---------- */
export default router;
