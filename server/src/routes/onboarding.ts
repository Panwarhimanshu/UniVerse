import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { Agent, AgreementDoc, TeamMember } from '../models/index.js';
import { accessOf, adminOf, agentIdOf, HttpError, ownerOnly } from '../middleware/auth.js';
import { ZONES } from '../data/catalog.js';
import { getSettings } from '../content.js';
import { sendDocFile } from '../files.js';
import { layout, sendMail } from '../mail.js';
import { ENTITY_TYPES, INDIAN_STATES, kycUpload, readKyc } from '../kyc.js';
import {
  agreementSigned, applyKyc, completeSigning, hashToken, isApplicant, kycVerified, onboardingJson, sendAgreement, storeKycDocs,
} from '../onboard.js';
import { validSignature } from '../pdf.js';
import { EMAIL_RE } from './auth.js';
import { track } from '../usage.js';

const SLA = '48 hours';
const oid = (id: unknown, what = 'Record') => {
  if (!Types.ObjectId.isValid(String(id))) throw new HttpError(404, `${what} not found`);
  return new Types.ObjectId(String(id));
};
const files = (req: import('express').Request) => req.files as Record<string, Express.Multer.File[]> | undefined;
const readSignature = (b: any) => {
  const name = String(b?.name ?? '').trim();
  if (b?.accept !== true && b?.accept !== 'true') throw new HttpError(400, 'Tick the box to confirm you have read and accept the agreement');
  if (name.length < 3) throw new HttpError(400, 'Type your full name as your signature');
  if (!validSignature(b?.signature)) throw new HttpError(400, 'Draw your signature in the box');
  return { name: name.slice(0, 120), signature: String(b.signature) };
};

/* ================= public: apply, and sign from the emailed link ================= */
export const publicOnboarding = Router();

publicOnboarding.get('/meta', (_req, res) => res.json({ states: INDIAN_STATES, entityTypes: ENTITY_TYPES, sla: SLA }));

/* New partner application: contact details + KYC + certificates, in one multipart request. No password yet. */
publicOnboarding.post('/apply', kycUpload, async (req, res) => {
  const b = req.body ?? {};
  const name = String(b.name ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim();
  const city = String(b.city ?? '').trim();
  const agency = String(b.agency ?? '').trim();
  if (!name) throw new HttpError(400, 'Enter your full name');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
  if (!/^\+?[\d\s-]{10,16}$/.test(phone)) throw new HttpError(400, 'Enter a valid mobile number');
  if (!ZONES.includes(b.zone)) throw new HttpError(400, 'Select your zone');
  if (!city) throw new HttpError(400, 'Enter your city');
  const password = String(b.password ?? '');
  if (password.length < 8) throw new HttpError(400, 'Create a password of at least 8 characters');
  if (b.consent !== 'true' && b.consent !== true) throw new HttpError(400, 'Confirm that the details are true and that you agree to execute the Channel Partner Agreement');
  const k = readKyc(b, files(req) ?? {});
  if (!k.ok) throw new HttpError(400, k.error);

  // an applicant whose details were sent back can apply again with the same email (the old record is updated)
  let a = await Agent.findOne({ email });
  if (a && !(isApplicant(a) && a.kyc?.status === 'rejected')) throw new HttpError(409, 'An account with this email already exists. Sign in instead, or use another email.');
  if (!a && (await TeamMember.exists({ email }))) throw new HttpError(409, 'This email is used by a team member of another partner');

  const docs = await storeKycDocs(files(req), a?.kyc?.docs ?? []);
  if (!a) {
    const s = getSettings();
    a = new Agent({
      name, email, phone, zone: b.zone, city, agency: agency || (k.v.type === 'entity' ? k.v.legalName : name),
      // the password works only once the agreement is signed (sign-in checks the onboarding stage)
      passwordHash: await bcrypt.hash(password, 10), passwordSet: true,
      rm: s.defaultRm, onboarding: 'applied',
      agreement: { number: '', autoRenew: true },
    });
  } else {
    Object.assign(a, { name, phone, zone: b.zone, city, agency: agency || a.agency, passwordHash: await bcrypt.hash(password, 10), passwordSet: true });
  }
  applyKyc(a, k.v, docs);
  await a.save();
  track(req, a.id, null, 'application_submitted');

  await sendMail(email, 'We have received your UniVerse partner application', layout({
    greeting: `Hello ${name.split(' ')[0]},`,
    paragraphs: [
      'Thank you for applying to become a UniVerse partner. We have received your details and documents.',
      `Our team will verify them and email you your partner agreement for review within ${SLA}. Once you sign it, your account is active and you can sign in with the password you created.`,
    ],
  }));
  res.status(201).json({ ok: true, email, sla: SLA });
});

const docByToken = async (token: unknown) => {
  const doc = await AgreementDoc.findOne({ tokenHash: hashToken(String(token ?? '')), status: 'sent' });
  if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) throw new HttpError(404, 'This link has expired or the agreement was already signed. Ask your relationship manager for a new link.');
  return doc;
};

publicOnboarding.get('/agreement', async (req, res) => {
  const doc = await docByToken(req.query.token);
  const a = await Agent.findById(doc.agent);
  if (!a) throw new HttpError(404, 'Account not found');
  const p = doc.party as any;
  res.json({
    number: doc.number, version: doc.version, sentAt: doc.createdAt, expiresAt: doc.expiresAt,
    party: { type: p.type, legalName: p.legalName, signatory: p.signatory, email: a.email },
  });
});
publicOnboarding.get('/agreement/pdf', async (req, res) => {
  const doc = await docByToken(req.query.token);
  await sendDocFile(res, doc.file, `UniVerse agreement ${doc.number.replace(/\//g, '-')}.pdf`);
});
publicOnboarding.post('/agreement/sign', async (req, res) => {
  const doc = await docByToken(req.body?.token);
  const input = readSignature(req.body);
  const a = await Agent.findById(doc.agent);
  if (!a) throw new HttpError(404, 'Account not found');
  const { setPasswordToken } = await completeSigning(a, doc, input, req);
  res.json({ ok: true, email: a.email, setPasswordToken, canSignIn: !setPasswordToken });
});

/* ================= partner: KYC and signature from inside the app ================= */
export const partnerOnboarding = Router();

partnerOnboarding.get('/onboarding', async (req, res) => {
  const a = await Agent.findById(agentIdOf(req));
  if (!a) throw new HttpError(404, 'Account not found');
  res.json(await onboardingJson(a, false));
});

partnerOnboarding.post('/kyc', ownerOnly, kycUpload, async (req, res) => {
  const a = await Agent.findById(agentIdOf(req));
  if (!a) throw new HttpError(404, 'Account not found');
  if (kycVerified(a)) throw new HttpError(409, 'Your KYC is already verified. Ask your relationship manager to change it.');
  // keep earlier certificates that aren't being replaced, so a resubmission can upload just the missing one
  const prev = a.kyc?.docs ?? [];
  const merged = { ...(files(req) ?? {}) } as Record<string, unknown>;
  for (const d of prev) if (d.kind && !merged[d.kind]) merged[d.kind] = [{}];
  const k = readKyc(req.body ?? {}, merged);
  if (!k.ok) throw new HttpError(400, k.error);
  applyKyc(a, k.v, await storeKycDocs(files(req), prev));
  await a.save();
  track(req, a.id, accessOf(req).memberId, 'kyc_submitted');
  res.json(await onboardingJson(a, false));
});

const pendingDoc = async (agentId: Types.ObjectId | string) => {
  const doc = await AgreementDoc.findOne({ agent: agentId, status: 'sent' }).sort({ createdAt: -1 });
  if (!doc) throw new HttpError(404, 'There is no agreement waiting for your signature');
  return doc;
};
partnerOnboarding.get('/agreement/pending/pdf', ownerOnly, async (req, res) => {
  const doc = await pendingDoc(agentIdOf(req));
  await sendDocFile(res, doc.file, `UniVerse agreement ${doc.number.replace(/\//g, '-')}.pdf`);
});
partnerOnboarding.post('/agreement/pending/sign', ownerOnly, async (req, res) => {
  const doc = await pendingDoc(agentIdOf(req));
  const input = readSignature(req.body);
  const a = await Agent.findById(agentIdOf(req));
  if (!a) throw new HttpError(404, 'Account not found');
  await completeSigning(a, doc, input, req);
  res.json(await onboardingJson(a, false));
});

/* ================= back office: review applications and KYC, send agreements ================= */
export const deskOnboarding = Router();

const stageOf = (a: any) => (isApplicant(a)
  ? (a.onboarding === 'agreement_sent' ? 'agreement_sent' : a.kyc?.status === 'rejected' ? 'sent_back' : a.kyc?.status === 'verified' ? 'verified' : 'review')
  : !kycVerified(a) ? (a.kyc?.status === 'submitted' ? 'review' : a.kyc?.status === 'rejected' ? 'sent_back' : 'not_started')
    : !agreementSigned(a) ? 'verified' : 'done');

deskOnboarding.get('/', async (_req, res) => {
  const agents = await Agent.find().sort({ 'kyc.submittedAt': -1, createdAt: -1 }).select('name agency email phone city zone onboarding kyc agreement createdAt');
  const pending = await AgreementDoc.find({ status: 'sent' }).select('agent createdAt number');
  const sent = new Map(pending.map((d) => [String(d.agent), d]));
  res.json(agents.map((a) => {
    const d = sent.get(String(a._id));
    let stage = stageOf(a);
    if (stage === 'verified' && d) stage = 'agreement_sent';
    return {
      id: String(a._id), name: a.name, agency: a.agency, email: a.email, phone: a.phone, city: a.city, zone: a.zone,
      applicant: isApplicant(a), stage, kycType: a.kyc?.type ?? null, legalName: a.kyc?.legalName ?? '',
      submittedAt: a.kyc?.submittedAt ?? null, agreementSentAt: d?.createdAt ?? null, signedAt: a.agreement?.esign?.at ?? null, createdAt: a.createdAt,
    };
  }));
});

const agentOr404 = async (id: unknown) => {
  const a = await Agent.findById(oid(id, 'Partner'));
  if (!a) throw new HttpError(404, 'Partner not found');
  return a;
};

deskOnboarding.get('/:id', async (req, res) => {
  const a = await agentOr404(req.params.id);
  const docs = await AgreementDoc.find({ agent: a._id, status: { $ne: 'void' } }).sort({ createdAt: -1 }).limit(5);
  res.json({
    id: String(a._id), name: a.name, agency: a.agency, email: a.email, phone: a.phone, city: a.city, zone: a.zone, applicant: isApplicant(a),
    ...(await onboardingJson(a, true)),
    agreements: docs.map((d) => ({ id: String(d._id), number: d.number, version: d.version, status: d.status, sentAt: d.createdAt, sentBy: d.sentBy, signedAt: d.signedAt, signer: d.signer?.name ?? '' })),
  });
});

deskOnboarding.get('/:id/docs/:docId', async (req, res) => {
  const a = await agentOr404(req.params.id);
  const d = (a.kyc?.docs ?? []).find((x: any) => String(x._id) === req.params.docId);
  if (!d?.file) throw new HttpError(404, 'Document not found');
  await sendDocFile(res, d.file, `${a.agency || a.name} ${d.kind} ${d.name}`.slice(0, 120));
});

deskOnboarding.post('/:id/verify', async (req, res) => {
  const a = await agentOr404(req.params.id);
  if (a.kyc?.status !== 'submitted') throw new HttpError(409, 'There are no submitted details to verify');
  a.set('kyc.status', 'verified');
  a.set('kyc.verifiedAt', new Date());
  a.set('kyc.verifiedBy', adminOf(req).name);
  a.set('kyc.note', '');
  if (a.kyc?.type === 'entity' || !a.verified) a.verified = true;
  await a.save();
  res.locals.audit = `${a.agency || a.name}: KYC verified`;
  res.json({ ok: true });
});

deskOnboarding.post('/:id/reject', async (req, res) => {
  const a = await agentOr404(req.params.id);
  const reason = String(req.body?.reason ?? '').trim().slice(0, 400);
  if (!reason) throw new HttpError(400, 'Tell the partner what to fix');
  if (agreementSigned(a) && kycVerified(a)) throw new HttpError(409, 'This partner has already signed their agreement');
  a.set('kyc.status', 'rejected');
  a.set('kyc.note', reason);
  await a.save();
  await sendMail(a.email, 'Please update your UniVerse partner details', layout({
    greeting: `Hello ${a.name.split(' ')[0]},`,
    paragraphs: [
      'We could not verify the details you submitted. Here is what needs to change:',
      reason,
      isApplicant(a)
        ? 'Please submit the application again with the same email address and corrected details or documents.'
        : 'Please update them from Profile → KYC & agreement in the app or the partner portal.',
    ],
  }));
  res.locals.audit = `${a.agency || a.name}: KYC sent back (${reason})`;
  res.json({ ok: true });
});

deskOnboarding.post('/:id/agreement', async (req, res) => {
  const a = await agentOr404(req.params.id);
  const { link } = await sendAgreement(a, adminOf(req).name);
  res.locals.audit = `${a.agency || a.name}: agreement sent for signature`;
  res.json({ ok: true, link });
});

deskOnboarding.get('/:id/agreements/:docId/pdf', async (req, res) => {
  const a = await agentOr404(req.params.id);
  const d = await AgreementDoc.findOne({ _id: oid(req.params.docId, 'Agreement'), agent: a._id });
  if (!d) throw new HttpError(404, 'Agreement not found');
  await sendDocFile(res, d.signedFile || d.file, `UniVerse agreement ${d.number.replace(/\//g, '-')}${d.signedFile ? ' (signed)' : ''}.pdf`);
});
