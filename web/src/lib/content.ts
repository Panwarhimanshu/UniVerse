import { SERVICES } from '../data/services';
import type { Service } from '../data/services';
import { BLOGS } from '../data/blogs';
import type { Blog } from '../data/blogs';

/* Content the master admin can edit: service text, insights and contact details.
   Built-in text is the fallback; edits from the server are applied on top at startup. */

export interface ServiceOverride { key: string; hidden: boolean; data: Partial<Service> & { commission?: { amount: string; note: string }; documents?: string[] } }
export interface Article extends Blog { id: string; service: string }
export interface SiteSettings { supportEmail: string; supportPhone: string; commissionEffective: string; minWithdrawal: number }

export const SITE: SiteSettings = {
  supportEmail: 'vas@universe.com', supportPhone: '+91 63596 66055', commissionEffective: 'July 2026', minWithdrawal: 500,
};

const BASE_SERVICES: Service[] = structuredClone(SERVICES);
const BASE_BLOGS: Record<string, Blog[]> = structuredClone(BLOGS);
export const builtInService = (key: string) => BASE_SERVICES.find((s) => s.key === key);
export const builtInArticles = () => Object.entries(BASE_BLOGS).flatMap(([service, list]) => list.map((b) => ({ ...b, service })));

const EDITABLE = ['name', 'short', 'cardText', 'about', 'tat', 'countries', 'kpis', 'feats', 'partners', 'steps'] as const;

export function applyContent(c: { services: ServiceOverride[]; articles: Article[] | null; settings: SiteSettings }) {
  SERVICES.forEach((s, i) => {
    const o = c.services.find((x) => x.key === s.key);
    const next: Service = structuredClone(BASE_SERVICES[i]);
    for (const k of EDITABLE) {
      const v = o?.data?.[k];
      if (v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) (next as unknown as Record<string, unknown>)[k] = v;
    }
    next.hidden = !!o?.hidden;
    Object.assign(s, next);
  });
  for (const k of Object.keys(BLOGS)) delete BLOGS[k];
  if (c.articles) {
    for (const a of c.articles) (BLOGS[a.service] ??= []).push({ id: a.id, t: a.t, d: a.d, mins: a.mins, teaser: a.teaser, body: a.body });
  } else {
    Object.assign(BLOGS, structuredClone(BASE_BLOGS));
  }
  Object.assign(SITE, c.settings);
}

/** Loads edits from the server. The site still works with the built-in text if this fails. */
export async function loadSiteContent() {
  try {
    const res = await fetch('/api/content');
    if (res.ok) applyContent(await res.json());
  } catch {
    /* offline: keep built-in content */
  }
}

export const visibleServices = () => SERVICES.filter((s) => !s.hidden);
