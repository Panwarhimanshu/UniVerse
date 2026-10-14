import type { Request } from 'express';
import { UsageEvent } from './models/index.js';

/* First-party usage records for the master admin's "App usage" page. Clients say where they run with X-Client headers. */

export const EVENTS = [
  'screen_view', 'sign_in', 'sign_up', 'referral_created', 'services_raised', 'document_uploaded',
  'message_sent', 'withdrawal_requested', 'agreement_request', 'profile_photo',
] as const;

export const clientOf = (req: Request) => {
  const platform = String(req.headers['x-client'] ?? '').toLowerCase() === 'app' ? 'app' : 'web';
  const os = String(req.headers['x-client-os'] ?? (platform === 'web' ? 'web' : '')).toLowerCase().slice(0, 16);
  return { platform, os } as const;
};

/** Records one event; never fails the request it is attached to. */
export function track(req: Request, agentId: string, memberId: string | null, event: string, screen = '') {
  const { platform, os } = clientOf(req);
  UsageEvent.create({ agent: agentId, member: memberId, platform, os, event, screen: screen.slice(0, 80) })
    .catch((e) => console.error('usage event failed', e));
}
