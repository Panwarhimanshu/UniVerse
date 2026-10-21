import { useEffect } from 'react';
import { serviceByKey } from '../data/services';
import { builtInService, SITE } from './content';
import { HOME_FAQ, HOME_SEO, SERVICE_SEO } from '../data/seoContent';
import type { Faq } from '../data/seoContent';

/* Page metadata for the public site: title, description, canonical URL, social cards and JSON-LD.
   Used at build time (pre-rendered HTML for crawlers) and in the browser on every route change. */

export const ORIGIN = 'https://www.universepartner.co';
export const BRAND = 'UniVerse';

export interface Head { title: string; description: string; canonical: string; image: string; robots: string; jsonLd: object[] }

const org = () => ({
  '@type': 'Organization', '@id': `${ORIGIN}/#org`, name: BRAND, url: `${ORIGIN}/`,
  logo: `${ORIGIN}/img/universe-logo.png`,
  sameAs: ['https://www.linkedin.com/company/universevas'],
  description: 'B2B marketplace for study abroad value added services, serving immigration consultants and education agents in India.',
  email: SITE.supportEmail, telephone: SITE.supportPhone,
  address: { '@type': 'PostalAddress', addressLocality: 'Vadodara', addressRegion: 'Gujarat', addressCountry: 'IN' },
  contactPoint: [{ '@type': 'ContactPoint', contactType: 'partner support', email: SITE.supportEmail, telephone: SITE.supportPhone, areaServed: 'IN', availableLanguage: ['English', 'Hindi', 'Gujarati'] }],
});
const faqLd = (faqs: Faq[]) => ({ '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

/** Service SEO copy, but only while the service name has not been changed in the back office */
export function serviceSeo(key: string) {
  const s = serviceByKey(key);
  const seo = SERVICE_SEO[key];
  if (!s || !seo) return null;
  const renamed = builtInService(key)?.name !== s.name;
  return renamed ? { ...seo, h1: s.name, title: `${s.name} | ${BRAND}`, description: s.short } : seo;
}

export function headFor(path: string): Head {
  const m = /^\/services\/([a-z-]+)\/?$/.exec(path);
  if (m) {
    const s = serviceByKey(m[1]);
    const seo = serviceSeo(m[1]);
    if (s && seo && !s.hidden) {
      const url = `${ORIGIN}/services/${s.key}`;
      return {
        title: seo.title, description: seo.description, canonical: url, image: `${ORIGIN}/img/${s.img}`, robots: 'index,follow',
        jsonLd: [{
          '@context': 'https://schema.org',
          '@graph': [
            org(),
            { '@type': 'Service', '@id': `${url}#service`, name: seo.h1, serviceType: s.name, description: s.about, url, provider: { '@id': `${ORIGIN}/#org` }, areaServed: { '@type': 'Country', name: 'India' }, audience: { '@type': 'BusinessAudience', name: 'Education consultants and immigration agents' } },
            { '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
              { '@type': 'ListItem', position: 2, name: 'Services', item: `${ORIGIN}/#services` },
              { '@type': 'ListItem', position: 3, name: s.name, item: url },
            ] },
            faqLd(seo.faqs),
          ],
        }],
      };
    }
  }
  if (path === '/' || path === '') {
    return {
      title: HOME_SEO.title, description: HOME_SEO.description, canonical: `${ORIGIN}/`, image: `${ORIGIN}/img/og-home.png`, robots: 'index,follow',
      jsonLd: [{
        '@context': 'https://schema.org',
        '@graph': [org(), { '@type': 'WebSite', '@id': `${ORIGIN}/#site`, name: BRAND, url: `${ORIGIN}/`, publisher: { '@id': `${ORIGIN}/#org` }, inLanguage: 'en-IN' }, faqLd(HOME_FAQ)],
      }],
    };
  }
  // sign-in, sign-up, dashboards and back office: not for search results
  return { title: `${BRAND} Partner Portal`, description: HOME_SEO.description, canonical: `${ORIGIN}${path}`, image: `${ORIGIN}/img/og-home.png`, robots: 'noindex,nofollow', jsonLd: [] };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The <head> tags as HTML, for the pre-rendered pages */
export function headHtml(h: Head) {
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<meta name="robots" content="${h.robots}" />`,
    ...(h.robots.startsWith('index') ? [`<link rel="canonical" href="${h.canonical}" />`] : []),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:url" content="${h.canonical}" />`,
    `<meta property="og:image" content="${h.image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${h.image}" />`,
    ...h.jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ');
}

/** Keeps the document head in step with the page after client-side navigation */
export function useHead(path: string, deps: unknown[] = []) {
  useEffect(() => {
    const h = headFor(path);
    document.title = h.title;
    const set = (sel: string, attr: string, val: string, make: () => HTMLElement) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = make(); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    const meta = (key: 'name' | 'property', k: string) => () => { const e = document.createElement('meta'); e.setAttribute(key, k); return e; };
    set('meta[name="description"]', 'content', h.description, meta('name', 'description'));
    set('meta[name="robots"]', 'content', h.robots, meta('name', 'robots'));
    set('link[rel="canonical"]', 'href', h.canonical, () => { const e = document.createElement('link'); e.rel = 'canonical'; return e; });
    for (const [k, v] of [['og:title', h.title], ['og:description', h.description], ['og:url', h.canonical], ['og:image', h.image]]) set(`meta[property="${k}"]`, 'content', v, meta('property', k));
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((e) => e.remove());
    for (const j of h.jsonLd) {
      const e = document.createElement('script');
      e.type = 'application/ld+json';
      e.textContent = JSON.stringify(j);
      document.head.appendChild(e);
    }
  }, [path, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}
