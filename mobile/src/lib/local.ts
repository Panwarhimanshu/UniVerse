/**
 * On-device backend: the same operations as server/src/routes, stored in AsyncStorage.
 * Lets the app run with no server or internet. Data lives only on this phone and starts empty.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { COMMISSION_HISTORY, DESTINATIONS, SERVICES, ZONES, serviceByKey } from '../data/catalog';
import type { Agent, Case, CaseStatus, Commissions, Dashboard, Message, Service, Transaction, UploadFile, Wallet } from './api';

const KEY = 'uv_db_v2';
const OLD_KEYS = ['uv_db_v1']; // v1 held demo data — discarded on first launch
const MIN_WITHDRAWAL = 500;
const STATUSES: CaseStatus[] = ['Pending', 'In Progress', 'Completed', 'On Hold'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- stored shapes ---------- */

interface SAgent {
  id: string; name: string; email: string; phone: string; agency: string; zone: string; city: string; verified: boolean;
  rm: { name: string; email: string }; createdAt: string; passwordHash: string;
  wallet: { balance: number; pending: number; lifetime: number }; bankAccount: string;
}
interface SStudent { id: string; agentId: string; code: string; name: string; email: string; phone: string; country: string; createdAt: string }
interface SDoc { id: string; name: string; size: number; status: 'missing' | 'review' | 'verified'; uri: string; updatedAt: string }
interface SCase {
  id: string; agentId: string; studentId: string; ref: string; service: string; status: CaseStatus; progress: number;
  note: string; createdAt: string; docs: SDoc[];
}
interface SMessage { id: string; agentId: string; caseId: string | null; from: Message['from']; text: string; createdAt: string }
interface STx { id: string; agentId: string; description: string; type: 'Credit' | 'Debit'; amount: number; status: 'Pending' | 'Completed'; date: string }
interface DB { agents: SAgent[]; students: SStudent[]; cases: SCase[]; messages: SMessage[]; tx: STx[] }

export class LocalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ---------- persistence ---------- */

let cache: DB | null = null;
let loading: Promise<DB> | null = null;
let writing: Promise<void> = Promise.resolve();

const uid = () => Crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const hash = (pw: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `uv:${pw}`);

async function db(): Promise<DB> {
  if (cache) return cache;
  loading ??= (async () => {
    const raw = await AsyncStorage.getItem(KEY);
    let data: DB | null = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!data) {
      data = { agents: [], students: [], cases: [], messages: [], tx: [] };
      await AsyncStorage.multiRemove(OLD_KEYS);
      await AsyncStorage.setItem(KEY, JSON.stringify(data));
    }
    cache = data;
    return data;
  })();
  return loading;
}

/** Writes are queued so rapid actions never overwrite each other. */
function save(d: DB) {
  writing = writing.then(() => AsyncStorage.setItem(KEY, JSON.stringify(d))).catch(() => {});
  return writing;
}

/* ---------- serializers (same shapes the server returns) ---------- */

const pubAgent = (a: SAgent): Agent => ({
  id: a.id, name: a.name, email: a.email, phone: a.phone, agency: a.agency, zone: a.zone, city: a.city,
  verified: a.verified, rm: a.rm, partnerSince: a.createdAt,
});

const pubCase = (d: DB, c: SCase): Case => {
  const s = d.students.find((x) => x.id === c.studentId);
  return {
    id: c.id, ref: c.ref, service: c.service, serviceName: serviceByKey(c.service)?.name ?? c.service,
    status: c.status, progress: c.progress, note: c.note, createdAt: c.createdAt,
    student: { id: s?.id ?? '', code: s?.code ?? '', name: s?.name ?? '', email: s?.email ?? '', phone: s?.phone ?? '', country: s?.country ?? '' },
    docs: c.docs.map((x) => ({ id: x.id, name: x.name, size: x.size, status: x.status, hasFile: !!x.uri, updatedAt: x.updatedAt })),
  };
};

const pubMsg = (m: SMessage): Message => ({ id: m.id, from: m.from, text: m.text, createdAt: m.createdAt });
const pubTx = (t: STx): Transaction => ({ id: t.id, description: t.description, type: t.type, amount: t.amount, status: t.status, date: t.date });

/** Desk / RM replies are stored with a future timestamp and only become visible once that time passes. */
const visible = (m: SMessage) => new Date(m.createdAt).getTime() <= Date.now();
const reply = (d: DB, agentId: string, caseId: string | null, from: 'desk' | 'rm', text: string, delayMs = 1500) =>
  d.messages.push({ id: uid(), agentId, caseId, from, text, createdAt: new Date(Date.now() + delayMs).toISOString() });

/* ---------- API ---------- */

export function createLocalApi(getSession: () => string | null, onUnauthorized: () => void) {
  const me = async () => {
    const d = await db();
    const a = d.agents.find((x) => x.id === getSession());
    if (!a) {
      onUnauthorized();
      throw new LocalError(401, 'Please sign in again');
    }
    return { d, a };
  };
  const ownedCase = (d: DB, agentId: string, id: string) => {
    const c = d.cases.find((x) => x.id === id && x.agentId === agentId);
    if (!c) throw new LocalError(404, 'Case not found');
    return c;
  };

  return {
    async login(email: string, password: string) {
      const d = await db();
      const a = d.agents.find((x) => x.email === email.trim().toLowerCase());
      if (!a || a.passwordHash !== (await hash(password))) throw new LocalError(401, 'Incorrect email or password');
      return { token: a.id, agent: pubAgent(a) };
    },

    async register(b: { name: string; email: string; phone: string; zone: string; city: string; password: string }) {
      const d = await db();
      const email = b.email.trim().toLowerCase();
      if (!b.name.trim()) throw new LocalError(400, 'Name is required');
      if (!EMAIL_RE.test(email)) throw new LocalError(400, 'Enter a valid email address');
      if (!ZONES.includes(b.zone)) throw new LocalError(400, 'Select your zone');
      if (b.password.length < 8) throw new LocalError(400, 'Password must be at least 8 characters');
      if (d.agents.some((x) => x.email === email)) throw new LocalError(409, 'An account with this email already exists');
      const a: SAgent = {
        id: uid(), name: b.name.trim(), email, phone: b.phone.trim(), agency: b.name.trim(), zone: b.zone, city: b.city.trim(),
        verified: false, rm: { name: 'Diya Amin', email: 'diya.a@universe.com' }, createdAt: nowIso(),
        passwordHash: await hash(b.password), wallet: { balance: 0, pending: 0, lifetime: 0 }, bankAccount: 'Add a bank account',
      };
      d.agents.push(a);
      d.messages.push({ id: uid(), agentId: a.id, caseId: null, from: 'rm', text: `Hi ${a.name.split(' ')[0]}! I'm Diya, your relationship manager. Message me here anytime.`, createdAt: nowIso() });
      await save(d);
      return { token: a.id, agent: pubAgent(a) };
    },

    async me() { return pubAgent((await me()).a); },

    async updateMe(b: Partial<Pick<Agent, 'name' | 'phone' | 'agency' | 'city'>>) {
      const { d, a } = await me();
      if (b.name !== undefined && !b.name.trim()) throw new LocalError(400, 'Name is required');
      for (const k of ['name', 'phone', 'agency', 'city'] as const) if (typeof b[k] === 'string') a[k] = b[k]!.trim();
      await save(d);
      return pubAgent(a);
    },

    async dashboard(): Promise<Dashboard> {
      const { d, a } = await me();
      const cases = d.cases.filter((c) => c.agentId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const mix: Record<string, number> = {};
      for (const c of cases) mix[c.service] = (mix[c.service] ?? 0) + 1;
      return {
        stats: {
          activeCases: cases.filter((c) => c.status !== 'Completed').length,
          students: d.students.filter((s) => s.agentId === a.id).length,
          balance: a.wallet.balance,
          monthEarnings: d.tx.filter((t) => t.agentId === a.id && t.type === 'Credit' && new Date(t.date) >= monthStart).reduce((n, t) => n + t.amount, 0),
        },
        recent: cases.slice(0, 5).map((c) => pubCase(d, c)),
        mix: Object.entries(mix).sort((x, y) => y[1] - x[1]).map(([key, count]) => ({ key, name: serviceByKey(key)?.name ?? key, count })),
      };
    },

    async meta() { return { destinations: DESTINATIONS, minWithdrawal: MIN_WITHDRAWAL }; },
    async services(): Promise<Service[]> { return SERVICES as Service[]; },
    async commissions(): Promise<Commissions> {
      return {
        rates: SERVICES.map((s) => ({ key: s.key, icon: s.icon, name: s.name, ...s.commission })),
        history: COMMISSION_HISTORY as Commissions['history'],
      };
    },

    async cases(q = '', status = ''): Promise<Case[]> {
      const { d, a } = await me();
      const term = q.trim().toLowerCase();
      return d.cases
        .filter((c) => c.agentId === a.id)
        .filter((c) => !status || c.status === status)
        .map((c) => pubCase(d, c))
        .filter((c) => !term || [c.student.name, c.student.code, c.student.country, c.serviceName, c.ref].some((v) => v.toLowerCase().includes(term)))
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    },

    async case(id: string) {
      const { d, a } = await me();
      return pubCase(d, ownedCase(d, a.id, id));
    },

    async refer(b: { name: string; email: string; phone: string; country: string; service: string; note: string }) {
      const { d, a } = await me();
      if (!b.name.trim()) throw new LocalError(400, 'Student name is required');
      if (!b.phone.trim()) throw new LocalError(400, 'Phone is required');
      if (b.email.trim() && !EMAIL_RE.test(b.email.trim())) throw new LocalError(400, 'Enter a valid student email');
      if (!DESTINATIONS.includes(b.country)) throw new LocalError(400, 'Select a destination');
      const svc = serviceByKey(b.service);
      if (!svc) throw new LocalError(400, 'Select a service');

      const mine = <T extends { agentId: string }>(xs: T[]) => xs.filter((x) => x.agentId === a.id).length;
      const now = nowIso();
      const student: SStudent = { id: uid(), agentId: a.id, code: `STU-${1011 + mine(d.students)}`, name: b.name.trim(), email: b.email.trim(), phone: b.phone.trim(), country: b.country, createdAt: now };
      const c: SCase = {
        id: uid(), agentId: a.id, studentId: student.id, ref: `REQ-${1174 + mine(d.cases)}`, service: svc.key, status: 'Pending',
        progress: 10, note: b.note.trim(), createdAt: now, docs: svc.documents.map((n) => ({ id: uid(), name: n, size: 0, status: 'missing', uri: '', updatedAt: now })),
      };
      d.students.push(student);
      d.cases.push(c);
      d.messages.push({ id: uid(), agentId: a.id, caseId: c.id, from: 'system', text: 'Case created', createdAt: now });
      reply(d, a.id, c.id, 'desk', `Thanks! The ${svc.name} desk has picked up this case. Please upload the requested documents to get started.`, 2500);
      await save(d);
      return pubCase(d, c);
    },

    async caseMessages(id: string) {
      const { d, a } = await me();
      ownedCase(d, a.id, id);
      return d.messages.filter((m) => m.caseId === id && visible(m)).sort((x, y) => x.createdAt.localeCompare(y.createdAt)).map(pubMsg);
    },

    async sendCaseMessage(id: string, text: string) {
      const { d, a } = await me();
      const c = ownedCase(d, a.id, id);
      const t = text.trim();
      if (!t) throw new LocalError(400, 'Message is empty');
      const m: SMessage = { id: uid(), agentId: a.id, caseId: c.id, from: 'agent', text: t, createdAt: nowIso() };
      d.messages.push(m);
      reply(d, a.id, c.id, 'desk', `Noted on the ${serviceByKey(c.service)?.name ?? ''} case — the desk will action this and confirm here shortly.`);
      await save(d);
      return pubMsg(m);
    },

    async uploadDoc(id: string, f: UploadFile, docId?: string) {
      const { d, a } = await me();
      const c = ownedCase(d, a.id, id);
      if ((f.size ?? 0) > 10 * 1024 * 1024) throw new LocalError(413, 'File is larger than 10 MB');
      const now = nowIso();
      const slot = docId ? c.docs.find((x) => x.id === docId) : undefined;
      if (slot) Object.assign(slot, { uri: f.uri, size: f.size ?? 0, status: 'review', updatedAt: now });
      else c.docs.push({ id: uid(), name: f.name, size: f.size ?? 0, status: 'review', uri: f.uri, updatedAt: now });
      d.messages.push({ id: uid(), agentId: a.id, caseId: c.id, from: 'system', text: `You uploaded “${f.name}”`, createdAt: now });
      reply(d, a.id, c.id, 'desk', 'Received — verifying the document and will confirm here.');
      await save(d);
      return pubCase(d, c);
    },

    async wallet(): Promise<Wallet> {
      const { d, a } = await me();
      return {
        ...a.wallet, bankAccount: a.bankAccount, minWithdrawal: MIN_WITHDRAWAL,
        transactions: d.tx.filter((t) => t.agentId === a.id).sort((x, y) => y.date.localeCompare(x.date)).map(pubTx),
      };
    },

    async withdraw(amount: number) {
      const { d, a } = await me();
      const amt = Math.floor(amount);
      if (!Number.isFinite(amt) || amt < MIN_WITHDRAWAL) throw new LocalError(400, `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
      if (amt > a.wallet.balance) throw new LocalError(400, 'Amount exceeds your available balance');
      a.wallet.balance -= amt;
      const t: STx = { id: uid(), agentId: a.id, description: `Withdrawal to ${a.bankAccount}`, type: 'Debit', amount: amt, status: 'Pending', date: nowIso() };
      d.tx.push(t);
      await save(d);
      return { balance: a.wallet.balance, transaction: pubTx(t) };
    },

    async rmMessages() {
      const { d, a } = await me();
      return d.messages.filter((m) => m.agentId === a.id && m.caseId === null && visible(m)).sort((x, y) => x.createdAt.localeCompare(y.createdAt)).map(pubMsg);
    },

    async sendRmMessage(text: string) {
      const { d, a } = await me();
      const t = text.trim();
      if (!t) throw new LocalError(400, 'Message is empty');
      const m: SMessage = { id: uid(), agentId: a.id, caseId: null, from: 'agent', text: t, createdAt: nowIso() };
      d.messages.push(m);
      reply(d, a.id, null, 'rm', 'On it! Give me a few minutes — I will update you right here.');
      await save(d);
      return pubMsg(m);
    },
  };
}
