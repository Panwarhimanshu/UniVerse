import crypto from 'node:crypto';
import type { Request } from 'express';
import { Agent, AgreementDoc, GstEntity, PasswordReset, PayoutMethod } from './models/index.js';
import { buildAgreement, partyOf, signAgreement } from './agreement.js';
import type { SigBox } from './agreement.js';
import { getSettings } from './content.js';
import { deleteFile, getFileBuffer, saveFile } from './files.js';
import { layout, sendMail, siteUrl } from './mail.js';
import { notify } from './notify.js';
import { maskPan, stateOfGstin } from './kyc.js';
import type { KycInput } from './kyc.js';
import { HttpError } from './middleware/auth.js';

/* Partner onboarding: KYC → desk review → agreement sent → e-signed → (new applicants) set a password.
   Partners who joined before onboarding existed complete the same KYC and signature from inside the app. */

export const SIGN_LINK_DAYS = 14;
export const SET_PASSWORD_DAYS = 7;
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
export const isApplicant = (a: { onboarding?: string | null }) => a.onboarding === 'applied' || a.onboarding === 'agreement_sent';
export const agreementSigned = (a: any) => !!a.agreement?.esign?.at;
export const kycVerified = (a: any) => a.kyc?.status === 'verified';

type Files = Record<string, Express.Multer.File[]> | undefined;

/** Saves the uploaded certificates and returns the doc list (replacing earlier ones of the same kind) */
export async function storeKycDocs(files: Files, previous: { kind?: string | null; file?: string | null }[] = []) {
  const docs: { kind: 'pan' | 'gst' | 'msme' | 'other'; file: string; name: string; mime: string; at: Date }[] = [];
  const replaced = new Set<string>();
  for (const kind of ['pan', 'gst', 'msme', 'other'] as const) {
    const f = files?.[kind]?.[0];
    if (!f) continue;
    docs.push({ kind, file: await saveFile(f.buffer, f.originalname || `${kind}.pdf`, f.mimetype), name: f.originalname || `${kind}.pdf`, mime: f.mimetype, at: new Date() });
    replaced.add(kind);
  }
  for (const d of previous) {
    if (!d.kind || !d.file) continue;
    if (replaced.has(d.kind)) await deleteFile(d.file);
    else docs.push({ kind: d.kind as 'pan', file: d.file, name: (d as any).name ?? '', mime: (d as any).mime ?? '', at: (d as any).at ?? new Date() });
  }
  return docs;
}

export function applyKyc(a: any, v: KycInput, docs: unknown[]) {
  a.set('kyc', {
    ...v, docs, status: 'submitted', note: '', submittedAt: new Date(), verifiedAt: null, verifiedBy: '',
  });
}

/** What the partner (and the desk) see about KYC and the agreement */
export async function onboardingJson(a: any, forDesk = false) {
  const k = a.kyc ?? {};
  const pending = await AgreementDoc.findOne({ agent: a._id, status: 'sent' }).sort({ createdAt: -1 });
  return {
    stage: a.onboarding ?? 'active',
    kyc: {
      status: k.status ?? 'none', type: k.type ?? null, legalName: k.legalName ?? '', pan: forDesk ? k.pan ?? '' : maskPan(k.pan ?? ''),
      entityType: k.entityType ?? '', gstin: k.gstin ?? '', udyam: k.udyam ?? '', cin: k.cin ?? '', signatory: k.signatory ?? '', designation: k.designation ?? '', authority: k.authority ?? '',
      address: k.address ?? '', state: k.state ?? '', pincode: k.pincode ?? '', note: k.note ?? '',
      submittedAt: k.submittedAt ?? null, verifiedAt: k.verifiedAt ?? null, verifiedBy: forDesk ? k.verifiedBy ?? '' : undefined,
      docs: (k.docs ?? []).map((d: any) => ({ id: String(d._id), kind: d.kind, name: d.name, mime: d.mime })),
    },
    agreement: {
      signed: agreementSigned(a),
      signedAt: a.agreement?.esign?.at ?? null,
      version: a.agreement?.esign?.version ?? '',
      pending: pending ? { id: String(pending._id), number: pending.number, version: pending.version, sentAt: pending.createdAt } : null,
    },
    canWithdraw: kycVerified(a) && agreementSigned(a),
  };
}

/** Generates the agreement from the partner's verified details and sends it for signature */
export async function sendAgreement(a: any, by: string) {
  if (!kycVerified(a)) throw new HttpError(400, 'Verify the KYC details before sending the agreement');
  const s = getSettings();
  const missing = (['legalName', 'pan', 'address', 'signatory'] as const).filter((k) => !s.company[k]);
  if (missing.length) throw new HttpError(400, `Add UniVerse's own ${missing.map((k) => ({ legalName: 'legal name', pan: 'PAN', address: 'registered address', signatory: 'signatory' })[k]).join(', ')} in Master → Settings before sending agreements`);
  const now = new Date();
  if (!a.agreement?.number) a.set('agreement.number', `UV/AGR/${now.getFullYear()}/${String(await Agent.countDocuments()).padStart(5, '0')}`);
  const number = a.agreement.number;
  // an unsigned earlier copy is replaced
  for (const old of await AgreementDoc.find({ agent: a._id, status: 'sent' })) {
    old.status = 'void';
    old.tokenHash = undefined;
    await old.save();
    if (old.file) await deleteFile(old.file);
  }
  const bankM = await PayoutMethod.findOne({ agent: a._id, type: 'bank' }).sort({ isDefault: -1, createdAt: 1 });
  const party = partyOf(a, bankM ? { holder: bankM.holder ?? '', bank: `${bankM.bankName ?? ''}${bankM.branch ? `, ${bankM.branch}` : ''}`, account: `XXXXXX${bankM.last4 ?? ''}`, ifsc: bankM.ifsc ?? '' } : null);
  const { pdf, hash, sigBox } = await buildAgreement(party, { number, version: s.agreementVersion, date: now });
  const file = await saveFile(pdf, `UniVerse agreement ${number.replace(/\//g, '-')}.pdf`, 'application/pdf');
  const applicant = isApplicant(a);
  const token = applicant ? crypto.randomBytes(32).toString('base64url') : '';
  const doc = await AgreementDoc.create({
    agent: a._id, number, version: s.agreementVersion, file, hash, party: { ...party, sigBox }, sentBy: by,
    tokenHash: token ? hashToken(token) : undefined, expiresAt: token ? new Date(Date.now() + SIGN_LINK_DAYS * 864e5) : undefined,
  });
  if (applicant) a.onboarding = 'agreement_sent';
  await a.save();

  const link = applicant ? `${siteUrl()}/sign-agreement?token=${token}` : `${siteUrl()}/dashboard/profile?sign=1`;
  await sendMail(a.email, 'Your UniVerse partner agreement is ready to sign', layout({
    greeting: `Hello ${party.signatory.split(' ')[0] || a.name.split(' ')[0]},`,
    paragraphs: [
      `Thank you for your details. We have verified them, and your UniVerse Channel Partner Agreement (${number}) is ready for your review.`,
      'It sets out the services, the commission schedule, how commission is credited and withdrawn, TDS and GST, turnaround times, and how discrepancies and student-ownership disputes are resolved.',
      applicant
        ? `Please read it and sign it online within ${SIGN_LINK_DAYS} days. Once it is signed, we will email you a link to set your password and sign in.`
        : 'Please read it and sign it from your profile. Withdrawals open once it is signed.',
    ],
    button: { label: 'Review and sign the agreement', url: link },
  }));
  if (!applicant) {
    await notify({
      agent: a._id, audience: 'owner', category: 'account', type: 'account.agreement_to_sign',
      title: 'Your partner agreement is ready to sign', body: `Agreement ${number}: review and sign it from Profile → Agreement.`, link: { kind: 'profile' },
      email: false,
    });
  }
  return { doc, link };
}

/** Signs the pending agreement. For applicants, also activates the account and issues a set-password link. */
export async function completeSigning(a: any, doc: any, input: { name: string; signature: string }, req: Request) {
  const at = new Date();
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
  const ua = String(req.headers['user-agent'] ?? '');
  const unsigned = await getFileBuffer(doc.file);
  const signed = await signAgreement(unsigned, doc.party.sigBox as SigBox, { path: input.signature, name: input.name, at, ip, ua, hash: doc.hash, number: doc.number });
  const fileName = `UniVerse agreement ${doc.number.replace(/\//g, '-')} (signed).pdf`;
  const signedFile = await saveFile(signed, fileName, 'application/pdf');

  doc.status = 'signed';
  doc.signedFile = signedFile;
  doc.signedAt = at;
  doc.signer = { name: input.name, ip, ua: ua.slice(0, 300) };
  doc.tokenHash = undefined;
  await doc.save();

  const old = a.agreement?.file;
  const validTill = new Date(at);
  validTill.setFullYear(validTill.getFullYear() + 2);
  validTill.setDate(validTill.getDate() - 1);
  a.set('agreement.file', signedFile);
  a.set('agreement.fileName', fileName);
  a.set('agreement.fileAt', at);
  a.set('agreement.signedAt', at);
  a.set('agreement.validTill', validTill);
  a.set('agreement.status', 'Active');
  a.set('agreement.endsOn', null);
  a.set('agreement.esign', { at, name: input.name, version: doc.version });
  const wasApplicant = isApplicant(a);
  if (wasApplicant) a.onboarding = 'active';
  await a.save();
  if (old && old !== signedFile) await deleteFile(old);

  // the KYC entity becomes the default GST registration for invoices
  if (a.kyc?.gstin && !(await GstEntity.exists({ agent: a._id, gstin: a.kyc.gstin }))) {
    const any = await GstEntity.exists({ agent: a._id });
    await GstEntity.create({ agent: a._id, legalName: a.kyc.legalName, gstin: a.kyc.gstin, address: `${a.kyc.address}, ${a.kyc.pincode}`, state: stateOfGstin(a.kyc.gstin), isDefault: !any });
  }

  let setPasswordToken = '';
  if (wasApplicant) {
    setPasswordToken = crypto.randomBytes(32).toString('base64url');
    await PasswordReset.updateMany({ user: a._id, used: false }, { used: true });
    await PasswordReset.create({ kind: 'agent', user: a._id, tokenHash: hashToken(setPasswordToken), expiresAt: new Date(Date.now() + SET_PASSWORD_DAYS * 864e5) });
    await sendMail(a.email, 'Welcome to UniVerse: set your password', layout({
      greeting: `Welcome aboard, ${a.name.split(' ')[0]}!`,
      paragraphs: [
        `Your agreement ${doc.number} is signed and your UniVerse partner account is now active. A signed copy is attached to your profile and can be downloaded at any time.`,
        `Set your password within ${SET_PASSWORD_DAYS} days to sign in on the website and in the UniVerse app.`,
      ],
      button: { label: 'Set your password', url: `${siteUrl()}/reset-password?token=${setPasswordToken}&welcome=1` },
    }));
  } else {
    await sendMail(a.email, `Agreement ${doc.number} signed`, layout({
      greeting: `Hello ${a.name.split(' ')[0]},`,
      paragraphs: [`Thank you. Your agreement ${doc.number} is signed. You can download the signed copy from Profile → Agreement.`],
      button: { label: 'Open your profile', url: `${siteUrl()}/dashboard/profile` },
    }));
  }
  await notify({
    agent: a._id, audience: 'owner', category: 'account', type: 'account.agreement_signed',
    title: 'Agreement signed', body: `Agreement ${doc.number} is signed. Download it any time from Profile → Agreement.`, link: { kind: 'profile' }, email: false,
  });
  return { setPasswordToken };
}
