/* Typed client for the UniVerse API (server/src). All routes live under /api. */

export type CaseStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';

export interface Agent {
  id: string; name: string; email: string; phone: string; agency: string; zone: string; city: string; verified: boolean;
  rm: { name: string; email: string; phone: string };
  bankAccount: string;
  avatar: string;
  agreement: { number: string; signedAt: string; validTill: string | null; autoRenew: boolean };
  partnerSince: string;
  /** set when a team member (not the owner) is signed in */
  member: TeamMember | null;
}
export interface CaseDoc { id: string; name: string; size: number; status: 'missing' | 'review' | 'verified'; hasFile: boolean; updatedAt: string }
export interface TimelineStep { title: string; sub: string; done: boolean; now: boolean; at: string | null }
export interface Case {
  id: string; ref: string; service: string; serviceName: string; status: CaseStatus; progress: number; note: string; createdAt: string;
  step: number; timeline: TimelineStep[];
  student: { id: string; code: string; name: string; email: string; phone: string; country: string };
  docs: CaseDoc[];
}
export interface Student {
  id: string; code: string; name: string; email: string; phone: string; country: string; createdAt: string;
  requests: { id: string; ref: string; service: string; status: CaseStatus; progress: number }[];
}
export interface Message { id: string; from: 'agent' | 'desk' | 'rm' | 'system'; author: string; text: string; createdAt: string }
export interface Notification extends Message { ref: string | null; requestId: string | null }
export interface Transaction { id: string; description: string; type: 'Credit' | 'Debit'; amount: number; status: 'Pending' | 'Completed' | 'Rejected'; date: string }
export interface Wallet { balance: number; pending: number; lifetime: number; bankAccount: string; minWithdrawal: number; transactions: Transaction[] }
export interface Dashboard {
  stats: { activeCases: number; students: number; balance: number | null; monthEarnings: number | null };
  recent: Case[];
  mix: { key: string; name: string; count: number }[];
}
export interface Analytics {
  totals: {
    students: number; cases: number; open: number; completed: number; completionRate: number | null;
    avgDaysToComplete: number | null; docsNeeded: number; docsInReview: number;
  };
  byStatus: Record<CaseStatus, number>;
  byService: { key: string; name: string; count: number }[];
  monthly: { month: string; count: number }[];
  money: { balance: number; pending: number; lifetime: number; monthly: { month: string; amount: number }[] } | null;
}
/** Profile photos are public images served by the API */
export const avatarUrl = (id: string) => (id ? `/api/content/avatar/${id}` : '');
export interface Commissions {
  rates: { key: string; icon: string; name: string; amount: string; note: string }[];
  history: { id: string; title: string; effective: string; status: string; items: [string, string][] }[];
}
export type Menu = 'overview' | 'whatsnew' | 'students' | 'requests' | 'services' | 'wallet' | 'commissions';
export type Perm = 'create' | 'chat' | 'upload' | 'edit' | 'withdraw';
export interface TeamMember {
  id: string; name: string; email: string; role: 'Manager' | 'Staff'; status: 'Pending' | 'Active'; menus: Menu[]; perms: Perm[]; lastLoginAt: string | null; avatar: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** A token kept in localStorage (or sessionStorage when "Remember me" is off). */
export function tokenStore(key: string) {
  let token: string | null = localStorage.getItem(key) ?? sessionStorage.getItem(key);
  return {
    get: () => token,
    set: (t: string | null, remember = true) => {
      token = t;
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      if (t) (remember ? localStorage : sessionStorage).setItem(key, t);
    },
  };
}

export function makeRequest(store: ReturnType<typeof tokenStore>, onUnauthorized: () => (() => void) | null) {
  const send = async (path: string, init: RequestInit = {}) => {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    const token = store.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await fetch('/api' + path, { ...init, headers });
    } catch {
      throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token) onUnauthorized()?.();
      throw new ApiError(res.status, data.error ?? 'Something went wrong');
    }
    return res;
  };
  const request = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const res = await send(path, init);
    if (res.status === 204) return undefined as T;
    return (await res.json().catch(() => ({}))) as T;
  };
  /** Downloads a protected file and hands it to the browser's save dialog. */
  const download = async (path: string, fallbackName: string) => {
    const res = await send(path);
    const cd = res.headers.get('Content-Disposition') ?? '';
    const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
    const name = m ? decodeURIComponent(m[1] ?? m[2]) : fallbackName;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return { request, download };
}

const store = tokenStore('uv_token');
let onUnauthorized: (() => void) | null = null;
export const getToken = store.get;
/** remember=false keeps the session only until the browser is closed */
export const setToken = store.set;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };
const { request, download } = makeRequest(store, () => onUnauthorized);

export type MemberInput = Pick<TeamMember, 'name' | 'email' | 'role' | 'menus' | 'perms'>;
export const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  login: (email: string, password: string) => request<{ token: string; agent: Agent }>('/auth/login', json('POST', { email, password })),
  register: (b: { name: string; email: string; phone: string; zone: string; city: string; password: string }) =>
    request<{ token: string; agent: Agent }>('/auth/register', json('POST', b)),
  me: () => request<Agent>('/auth/me'),
  updateMe: (b: Partial<Pick<Agent, 'name' | 'phone' | 'agency' | 'city' | 'bankAccount'>>) => request<Agent>('/auth/me', json('PATCH', b)),
  changePassword: (current: string, next: string) => request<{ ok: boolean }>('/auth/password', json('POST', { current, next })),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return request<Agent>('/auth/me/avatar', { method: 'POST', body: form });
  },
  removeAvatar: () => request<Agent>('/auth/me/avatar', json('DELETE')),
  analytics: () => request<Analytics>('/analytics'),
  /** Records a page view for the master admin's usage report. Never throws. */
  trackView: (screen: string) => { if (store.get()) request('/events', json('POST', { events: [{ event: 'screen_view', screen }] })).catch(() => {}); },

  dashboard: () => request<Dashboard>('/dashboard'),
  commissions: () => request<Commissions>('/commissions'),
  notifications: () => request<Notification[]>('/notifications'),

  cases: () => request<Case[]>('/requests'),
  case: (id: string) => request<Case>(`/requests/${id}`),
  refer: (b: { name: string; email: string; phone: string; country: string; service: string; note: string }) => request<Case>('/requests', json('POST', b)),
  caseMessages: (id: string) => request<Message[]>(`/requests/${id}/messages`),
  sendCaseMessage: (id: string, text: string) => request<Message>(`/requests/${id}/messages`, json('POST', { text })),
  uploadDoc: (id: string, file: File, docId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (docId) form.append('docId', docId);
    return request<Case>(`/requests/${id}/documents`, { method: 'POST', body: form });
  },
  downloadDoc: (caseId: string, docId: string, name: string) => download(`/requests/${caseId}/documents/${docId}/file`, name),

  students: () => request<Student[]>('/students'),
  updateStudent: (id: string, b: Partial<Pick<Student, 'name' | 'email' | 'phone' | 'country'>>) => request<Student>(`/students/${id}`, json('PATCH', b)),
  raiseRequests: (id: string, services: string[]) => request<Student>(`/students/${id}/requests`, json('POST', { services })),

  wallet: () => request<Wallet>('/wallet'),
  withdraw: (amount: number) => request<{ balance: number; transaction: Transaction }>('/wallet/withdraw', json('POST', { amount })),

  rmMessages: () => request<Message[]>('/rm/messages'),
  sendRmMessage: (text: string) => request<Message>('/rm/messages', json('POST', { text })),

  team: () => request<TeamMember[]>('/team'),
  addMember: (b: MemberInput & { password: string }) => request<TeamMember>('/team', json('POST', b)),
  updateMember: (id: string, b: Partial<MemberInput> & { password?: string }) => request<TeamMember>(`/team/${id}`, json('PATCH', b)),
  removeMember: (id: string) => request<void>(`/team/${id}`, json('DELETE')),

  agreementRequest: (type: 'download' | 'discussion' | 'termination') =>
    request<{ ok: boolean }>('/agreement/requests', json('POST', { type })),
};
