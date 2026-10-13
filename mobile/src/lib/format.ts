import type { IconName } from '../components/ui';

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const time = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? t : `${shortDate(iso)} · ${t}`;
};

export const fileSize = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

/** Service icon keys from the API → Feather glyphs */
export const serviceIcon = (key: string): IconName =>
  ({
    loan: 'book-open', gic: 'lock', blocked: 'layers', remit: 'send', forex: 'credit-card',
    insurance: 'shield', oshc: 'activity', housing: 'home', sim: 'smartphone',
  } as Record<string, IconName>)[key] ?? 'box';

export const docLabel = { missing: 'Needed', review: 'In review', verified: 'Verified' } as const;
