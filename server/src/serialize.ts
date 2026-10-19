import { serviceByKey } from './data/catalog.js';
import { LAST_STEP, stepsFor } from './data/timelines.js';

/* Shapes returned to the client. Keeps Mongo internals (_id, __v, hashes) out of responses */

export const publicAgent = (a: any) => ({
  id: String(a._id),
  name: a.name,
  email: a.email,
  phone: a.phone,
  agency: a.agency,
  zone: a.zone,
  city: a.city,
  verified: a.verified,
  rm: { name: a.rm?.name, email: a.rm?.email, phone: a.rm?.phone },
  bankAccount: a.bankAccount ?? '',
  avatar: a.avatar ?? '',
  agreement: {
    number: a.agreement?.number ?? '',
    signedAt: a.agreement?.signedAt ?? a.createdAt,
    validTill: a.agreement?.validTill ?? null,
    autoRenew: a.agreement?.autoRenew ?? true,
    status: a.agreement?.status ?? 'Active',
    endsOn: a.agreement?.endsOn ?? null,
    hasFile: !!a.agreement?.file,
    fileName: a.agreement?.fileName ?? '',
  },
  partnerSince: a.createdAt,
  // KYC and agreement signature, for the "complete your onboarding" prompts
  kyc: { status: a.kyc?.status ?? 'none', type: a.kyc?.type ?? null, gstin: a.kyc?.gstin ?? '' },
  agreementSigned: !!a.agreement?.esign?.at,
});

export const publicStudent = (s: any, requests: any[] = []) => ({
  id: String(s._id),
  code: s.code,
  name: s.name,
  email: s.email,
  phone: s.phone,
  country: s.country,
  createdAt: s.createdAt,
  requests: requests.map((r) => ({ id: String(r._id), ref: r.ref, service: r.service, status: r.status, progress: r.progress })),
});

export const publicTeamMember = (m: any) => ({
  id: String(m._id), name: m.name, email: m.email, role: m.role, status: m.status, menus: m.menus, perms: m.perms,
  lastLoginAt: m.lastLoginAt ?? null,
  avatar: m.avatar ?? '',
});

/** The case's stages with the date each one was reached. */
export const caseTimeline = (r: any) => {
  const step = r.step ?? 0;
  const done = r.status === 'Completed' ? LAST_STEP : step;
  const dates = new Map<number, Date>();
  for (const l of r.stepLog ?? []) dates.set(l.step, l.at);
  if (!dates.has(0)) dates.set(0, r.createdAt);
  return stepsFor(r.service).map(([title, sub], i) => ({
    title, sub,
    done: i <= done,
    now: i === done + 1 && r.status !== 'Completed',
    at: i <= done ? dates.get(i) ?? null : null,
  }));
};

export const publicRequest = (r: any) => {
  const s = r.student ?? {};
  return {
    id: String(r._id),
    ref: r.ref,
    service: r.service,
    serviceName: serviceByKey(r.service)?.name ?? r.service,
    status: r.status,
    progress: r.progress,
    step: r.step ?? 0,
    timeline: caseTimeline(r),
    note: r.note,
    createdAt: r.createdAt,
    student: { id: String(s._id ?? ''), code: s.code, name: s.name, email: s.email, phone: s.phone, country: s.country },
    docs: (r.docs ?? []).map((d: any) => ({
      id: String(d._id), name: d.name, size: d.size, status: d.status, hasFile: !!d.file, updatedAt: d.updatedAt,
    })),
  };
};

export const publicMessage = (m: any) => ({
  id: String(m._id),
  from: m.from,
  author: m.author ?? '',
  text: m.text,
  createdAt: m.createdAt,
});

export const publicTx = (t: any) => ({
  id: String(t._id),
  description: t.description,
  type: t.type,
  kind: t.kind ?? (t.type === 'Debit' ? 'withdrawal' : /commission/i.test(t.description) ? 'commission' : 'adjustment'),
  amount: t.amount,
  status: t.status,
  date: t.date,
  method: t.method?.label ? { type: t.method.type, label: t.method.label } : null,
  payout: t.payout?.state ? { state: t.payout.state, utr: t.payout.utr ?? '', reason: t.payout.reason ?? '', paidAt: t.payout.paidAt ?? null } : null,
  // commission: gross before TDS, the TDS deducted, and the rate (amount is the net)
  gross: t.gross ?? null,
  tds: t.tds ?? null,
  tdsRate: t.tdsRate ?? null,
  invoice: t.invoice?.number ? {
    number: t.invoice.number, date: t.invoice.date, gstin: t.invoice.supplier?.gstin ?? '', legalName: t.invoice.supplier?.legalName ?? '',
    taxable: t.invoice.taxable, gst: Math.round(((t.invoice.cgst ?? 0) + (t.invoice.sgst ?? 0) + (t.invoice.igst ?? 0)) * 100) / 100,
    payable: t.invoice.payable, verified: !!t.invoice.verified,
  } : null,
});
