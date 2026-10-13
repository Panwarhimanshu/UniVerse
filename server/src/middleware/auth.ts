import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin, Agent, MENUS, PERMS, TeamMember } from '../models/index.js';

const secret = () => process.env.JWT_SECRET || 'dev-secret';

interface Payload { sub: string; mid?: string; adm?: boolean }

/** Partner session. `memberId` is set when a team member (not the account owner) signs in. */
export const signToken = (agentId: string, memberId?: string) =>
  jwt.sign(memberId ? { sub: agentId, mid: memberId } : { sub: agentId }, secret(), { expiresIn: '30d' });
export const signAdminToken = (adminId: string) => jwt.sign({ sub: adminId, adm: true }, secret(), { expiresIn: '12h' });

/** Error with an HTTP status, caught by the error handler in index.ts */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Access {
  owner: boolean;
  memberId: string | null;
  name: string; // who is acting, used as the author of chat messages
  menus: string[];
  perms: string[];
}

interface AuthedRequest extends Request {
  agentId: string;
  access: Access;
  adminId: string;
  adminName: string;
  adminRole: 'master' | 'staff';
  adminSections: string[];
}

const readToken = (req: Request): Payload => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Not signed in');
  try {
    return jwt.verify(token, secret()) as Payload;
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const p = readToken(req);
  if (p.adm) throw new HttpError(401, 'Not signed in');
  const r = req as AuthedRequest;
  r.agentId = p.sub;
  const agent = await Agent.findById(p.sub).select('suspended').lean();
  if (!agent) throw new HttpError(401, 'This account no longer exists');
  if (agent.suspended) throw new HttpError(401, 'This partner account is suspended. Please contact UniVerse support.');
  if (p.mid) {
    const m = await TeamMember.findOne({ _id: p.mid, agent: p.sub }).lean();
    if (!m) throw new HttpError(401, 'Your access to this account has been removed');
    r.access = { owner: false, memberId: String(m._id), name: m.name, menus: m.menus ?? [], perms: m.perms ?? [] };
  } else {
    r.access = { owner: true, memberId: null, name: '', menus: [...MENUS], perms: [...PERMS] };
  }
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const p = readToken(req);
  if (!p.adm) throw new HttpError(403, 'Back-office access only');
  const a = await Admin.findById(p.sub);
  if (!a) throw new HttpError(401, 'Not signed in');
  if (!a.active) throw new HttpError(401, 'This back-office account has been disabled');
  const r = req as AuthedRequest;
  r.adminId = String(a._id);
  r.adminName = a.name;
  r.adminRole = a.role === 'master' ? 'master' : 'staff';
  r.adminSections = [...(a.sections ?? [])];
  next();
}

/** Staff need the section; the master admin can use every section. */
export const requireSection = (section: string) => (req: Request, _res: Response, next: NextFunction) => {
  const r = req as AuthedRequest;
  if (r.adminRole !== 'master' && !r.adminSections.includes(section)) throw new HttpError(403, "You don't have access to this section.");
  next();
};

export const masterOnly = (req: Request, _res: Response, next: NextFunction) => {
  if ((req as AuthedRequest).adminRole !== 'master') throw new HttpError(403, 'Only the master admin can do this.');
  next();
};

export const agentIdOf = (req: Request) => (req as AuthedRequest).agentId;
export const accessOf = (req: Request) => (req as AuthedRequest).access;
export const adminOf = (req: Request) => {
  const r = req as AuthedRequest;
  return { id: r.adminId, name: r.adminName, role: r.adminRole, sections: r.adminSections };
};

const PERM_TEXT: Record<string, string> = {
  create: 'raise service requests', chat: 'send messages', upload: 'upload documents',
  edit: 'edit student details', withdraw: 'request withdrawals',
};

/** Blocks team members who were not given this permission. The owner always passes. */
export const need = (perm: string) => (req: Request, _res: Response, next: NextFunction) => {
  const a = accessOf(req);
  if (!a.owner && !a.perms.includes(perm)) throw new HttpError(403, `Your account manager hasn't given you permission to ${PERM_TEXT[perm] ?? perm}.`);
  next();
};

export const needMenu = (menu: string) => (req: Request, _res: Response, next: NextFunction) => {
  const a = accessOf(req);
  if (!a.owner && !a.menus.includes(menu)) throw new HttpError(403, "You don't have access to this section.");
  next();
};

export const ownerOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!accessOf(req).owner) throw new HttpError(403, 'Only the account owner can do this.');
  next();
};
