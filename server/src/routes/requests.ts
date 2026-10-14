import { Router } from 'express';
import multer from 'multer';
import { Types } from 'mongoose';
import { ServiceRequest, Student, Message, STATUSES } from '../models/index.js';
import { accessOf, agentIdOf, HttpError, need } from '../middleware/auth.js';
import { SERVICES, serviceByKey, DESTINATIONS } from '../data/catalog.js';
import { publicRequest, publicMessage } from '../serialize.js';
import { isServiceHidden } from '../content.js';
import { track } from '../usage.js';
import { deleteFile, MAX_UPLOAD_BYTES, saveFile, sendDocFile } from '../files.js';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Opens a new service request for an existing student, with the service's document checklist. */
export async function openCase(agentId: string, studentId: Types.ObjectId, serviceKey: string, note = '') {
  const svc = serviceByKey(serviceKey);
  if (!svc) throw new HttpError(400, 'Unknown service');
  if (isServiceHidden(svc.key)) throw new HttpError(400, `${svc.name} isn't available right now`);
  const reqCount = await ServiceRequest.countDocuments({ agent: agentId });
  const created = await ServiceRequest.create({
    agent: agentId, student: studentId, ref: `REQ-${1174 + reqCount}`, service: svc.key, note,
    docs: svc.documents.map((d) => ({ name: d, status: 'missing' })),
    stepLog: [{ step: 0, at: new Date() }],
  });
  await Message.create({ agent: agentId, request: created._id, from: 'system', text: `${created.ref} opened for ${svc.name}` });
  return created;
}

async function loadOwned(agentId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Case not found');
  const r = await ServiceRequest.findOne({ _id: id, agent: agentId }).populate('student');
  if (!r) throw new HttpError(404, 'Case not found');
  return r;
}

/* List cases, with optional ?q= search and ?status= filter */
router.get('/', async (req, res) => {
  const agentId = agentIdOf(req);
  const { q, status } = req.query as { q?: string; status?: string };
  const filter: Record<string, unknown> = { agent: agentId };
  if (status && (STATUSES as readonly string[]).includes(status)) filter.status = status;
  if (q?.trim()) {
    const re = new RegExp(escapeRe(q.trim()), 'i');
    const students = await Student.find({ agent: agentId, $or: [{ name: re }, { code: re }, { country: re }] }).select('_id');
    const serviceKeys = SERVICES.filter((s) => re.test(s.name)).map((s) => s.key);
    filter.$or = [{ student: { $in: students.map((s) => s._id) } }, { ref: re }, { service: { $in: serviceKeys } }];
  }
  const list = await ServiceRequest.find(filter).sort({ createdAt: -1 }).populate('student');
  res.json(list.map(publicRequest));
});

/* Refer a student into a service → creates the student and the case */
router.post('/', need('create'), async (req, res) => {
  const agentId = agentIdOf(req);
  const { name, email, phone, country, service, note } = req.body ?? {};
  if (!name?.trim()) throw new HttpError(400, 'Student name is required');
  if (!phone?.trim()) throw new HttpError(400, 'Phone is required');
  if (!DESTINATIONS.includes(country)) throw new HttpError(400, 'Select a destination');
  const svc = serviceByKey(service);
  if (!svc) throw new HttpError(400, 'Select a service');

  const studentCount = await Student.countDocuments({ agent: agentId });
  const student = await Student.create({ agent: agentId, code: `STU-${1011 + studentCount}`, name: name.trim(), email, phone, country });
  const created = await openCase(agentId, student._id, svc.key, note ?? '');

  const full = await created.populate('student');
  track(req, agentId, accessOf(req).memberId, 'referral_created');
  res.status(201).json(publicRequest(full));
});

router.get('/:id', async (req, res) => {
  res.json(publicRequest(await loadOwned(agentIdOf(req), String(req.params.id))));
});

router.get('/:id/messages', async (req, res) => {
  const r = await loadOwned(agentIdOf(req), String(req.params.id));
  const msgs = await Message.find({ request: r._id }).sort({ createdAt: 1 });
  res.json(msgs.map(publicMessage));
});

router.post('/:id/messages', need('chat'), async (req, res) => {
  const agentId = agentIdOf(req);
  const r = await loadOwned(agentId, String(req.params.id));
  const text = String(req.body?.text ?? '').trim();
  if (!text) throw new HttpError(400, 'Message is empty');
  if (text.length > 2000) throw new HttpError(400, 'Message is too long');
  const m = await Message.create({ agent: agentId, request: r._id, from: 'agent', author: accessOf(req).name, text });
  track(req, agentId, accessOf(req).memberId, 'message_sent');
  res.status(201).json(publicMessage(m));
});

/* Upload a document: field "file"; optional "docId" fills an existing requested slot */
router.post('/:id/documents', need('upload'), upload.single('file'), async (req, res) => {
  const agentId = agentIdOf(req);
  const r = await loadOwned(agentId, String(req.params.id));
  const file = req.file;
  if (!file) throw new HttpError(400, 'No file received');

  const fileId = await saveFile(file.buffer, file.originalname, file.mimetype);
  const slot = req.body?.docId ? r.docs.id(req.body.docId) : null;
  if (slot) {
    if (slot.file) await deleteFile(slot.file);
    slot.set({ file: fileId, size: file.size, status: 'review' });
  } else {
    r.docs.push({ name: file.originalname, file: fileId, size: file.size, status: 'review' });
  }
  await r.save();
  const by = accessOf(req).name;
  await Message.create({ agent: agentId, request: r._id, from: 'system', text: `${by || 'You'} uploaded “${file.originalname}”` });
  track(req, agentId, accessOf(req).memberId, 'document_uploaded');
  res.status(201).json(publicRequest(r));
});

/* Download a file that was uploaded to this case */
router.get('/:id/documents/:docId/file', async (req, res) => {
  const r = await loadOwned(agentIdOf(req), String(req.params.id));
  const d = r.docs.id(String(req.params.docId));
  if (!d?.file) throw new HttpError(404, 'File not found');
  await sendDocFile(res, d.file, d.name);
});

export default router;
