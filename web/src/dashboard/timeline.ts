import type { Case } from '../lib/api';

export interface Step { title: string; sub: string; done: boolean; now: boolean }

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The case's stages as recorded by the service desk, with the date each was reached. */
export function buildTimeline(c: Case): Step[] {
  return c.timeline.map((s) => {
    let prefix = '';
    if (s.done && s.at) prefix = `${day(s.at)} · `;
    else if (s.now) prefix = c.status === 'On Hold' ? 'On hold · ' : 'Next · ';
    return { title: s.title, sub: prefix + s.sub, done: s.done, now: s.now };
  });
}
