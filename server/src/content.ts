import { ServiceContent, Setting } from './models/index.js';
import { SERVICES, type Service } from './data/catalog.js';

/* Site settings and service edits made by the master admin, cached in memory and refreshed on every save. */

export interface SiteSettings {
  minWithdrawal: number;
  supportEmail: string;
  supportPhone: string;
  commissionEffective: string;
  defaultRm: { name: string; email: string; phone: string };
  articlesImported: boolean;
  tdsRate: number;
  gstRate: number;
  sac: string;
  agreementVersion: string;
  company: Company;
}
export interface Company {
  legalName: string; constitution: string; gstin: string; pan: string; cin: string; address: string; state: string; stateCode: string; city: string;
  signatory: string; signatoryId: string; designation: string; email: string;
}
export const COMPANY_KEYS = ['legalName', 'constitution', 'gstin', 'pan', 'cin', 'address', 'state', 'stateCode', 'city', 'signatory', 'signatoryId', 'designation', 'email'] as const;

let settings: SiteSettings;
const hidden = new Set<string>();
const overrides = new Map<string, Record<string, unknown>>();
const BASE: Service[] = structuredClone(SERVICES);

export const getSettings = () => settings;
export const isServiceHidden = (key: string) => hidden.has(key);
export const serviceOverrides = () =>
  SERVICES.map((s) => ({ key: s.key, hidden: hidden.has(s.key), data: overrides.get(s.key) ?? {} }));

export async function loadSettings() {
  const doc = await Setting.findOneAndUpdate({ key: 'site' }, { $setOnInsert: { key: 'site' } }, { upsert: true, new: true });
  const o = doc.toObject();
  settings = {
    minWithdrawal: o.minWithdrawal,
    supportEmail: o.supportEmail,
    supportPhone: o.supportPhone,
    commissionEffective: o.commissionEffective,
    defaultRm: { name: o.defaultRm?.name ?? '', email: o.defaultRm?.email ?? '', phone: o.defaultRm?.phone ?? '' },
    articlesImported: !!o.articlesImported,
    tdsRate: o.tdsRate ?? 2,
    gstRate: o.gstRate ?? 18,
    sac: o.sac ?? '998599',
    agreementVersion: o.agreementVersion ?? '2026.1',
    company: Object.fromEntries(COMPANY_KEYS.map((k) => [k, String((o.company as Record<string, unknown> | undefined)?.[k] ?? '')])) as unknown as Company,
  };
  if (!settings.company.legalName) settings.company.legalName = 'UniVerse LLP';
  return settings;
}

/** Re-applies stored edits on top of the built-in catalogue (server-side fields only; the website reads the rest). */
export async function loadServiceContent() {
  const docs = await ServiceContent.find();
  hidden.clear();
  overrides.clear();
  for (const d of docs) {
    if (d.hidden) hidden.add(d.key);
    overrides.set(d.key, (d.data ?? {}) as Record<string, unknown>);
  }
  SERVICES.forEach((s, i) => {
    const base = structuredClone(BASE[i]);
    const o = overrides.get(s.key) ?? {};
    const str = (v: unknown, fb: string) => (typeof v === 'string' && v.trim() ? v.trim() : fb);
    const list = (v: unknown, fb: string[]) => (Array.isArray(v) && v.length ? v.map(String) : fb);
    const com = (o.commission ?? {}) as { amount?: string; note?: string };
    Object.assign(s, base, {
      name: str(o.name, base.name),
      short: str(o.short, base.short),
      about: str(o.about, base.about),
      tat: str(o.tat, base.tat),
      countries: str(o.countries, base.countries),
      features: list(o.feats, base.features),
      partners: list(o.partners, base.partners),
      steps: list(o.steps, base.steps),
      documents: list(o.documents, base.documents),
      kpis: Array.isArray(o.kpis) && o.kpis.length ? o.kpis : base.kpis,
      commission: { amount: str(com.amount, base.commission.amount), note: str(com.note, base.commission.note) },
    });
  });
}

let loadedAt = 0;
export async function loadContent() {
  await loadSettings();
  await loadServiceContent();
  loadedAt = Date.now();
}

/** On serverless hosting several copies of the API run at once; re-read edits made through another copy. */
export async function refreshContentIfStale(maxAgeMs = 30_000) {
  if (Date.now() - loadedAt > maxAgeMs) await loadContent();
}
