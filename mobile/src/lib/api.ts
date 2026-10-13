import { createLocalApi } from './local';

/* ---------- types (mirror server/src/serialize.ts) ---------- */

export type CaseStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';

export interface Agent {
  id: string; name: string; email: string; phone: string; agency: string; zone: string; city: string;
  verified: boolean; rm: { name: string; email: string }; partnerSince: string;
}
export interface CaseDoc { id: string; name: string; size: number; status: 'missing' | 'review' | 'verified'; hasFile: boolean; updatedAt: string }
export interface Case {
  id: string; ref: string; service: string; serviceName: string; status: CaseStatus; progress: number; note: string; createdAt: string;
  student: { id: string; code: string; name: string; email: string; phone: string; country: string };
  docs: CaseDoc[];
}
export interface Message { id: string; from: 'agent' | 'desk' | 'rm' | 'system'; text: string; createdAt: string }
export interface Transaction { id: string; description: string; type: 'Credit' | 'Debit'; amount: number; status: 'Pending' | 'Completed'; date: string }
export interface Wallet { balance: number; pending: number; lifetime: number; bankAccount: string; minWithdrawal: number; transactions: Transaction[] }
export interface Service {
  key: string; icon: string; category: string; name: string; short: string; about: string; tat: string; countries: string;
  kpis: [string, string][]; features: string[]; partners: string[]; steps: string[];
  commission: { amount: string; note: string }; documents: string[];
}
export interface Dashboard {
  stats: { activeCases: number; students: number; balance: number; monthEarnings: number };
  recent: Case[];
  mix: { key: string; name: string; count: number }[];
}
export interface Commissions {
  rates: { key: string; icon: string; name: string; amount: string; note: string }[];
  history: { id: string; title: string; effective: string; status: string; items: [string, string][] }[];
}

/* ---------- backend selection ---------- */

/**
 * By default the app runs fully offline on an on-device store (lib/local.ts).
 * Set EXPO_PUBLIC_API_URL at build time to use the Node/MongoDB server in /server instead.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

/* ---------- request helper ---------- */

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setToken = (t: string | null) => { token = t; };
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...init, headers });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, data.error ?? 'Something went wrong');
  }
  return data as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export interface UploadFile { uri: string; name: string; size?: number; mimeType?: string; file?: File }

const remoteApi = {
  login: (email: string, password: string) => post<{ token: string; agent: Agent }>('/auth/login', { email, password }),
  register: (body: { name: string; email: string; phone: string; zone: string; city: string; password: string }) =>
    post<{ token: string; agent: Agent }>('/auth/register', body),
  me: () => request<Agent>('/auth/me'),
  updateMe: (body: Partial<Pick<Agent, 'name' | 'phone' | 'agency' | 'city'>>) =>
    request<Agent>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  dashboard: () => request<Dashboard>('/dashboard'),
  meta: () => request<{ destinations: string[]; minWithdrawal: number }>('/meta'),
  services: () => request<Service[]>('/services'),
  commissions: () => request<Commissions>('/commissions'),

  cases: (q = '', status = '') => request<Case[]>(`/requests?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`),
  case: (id: string) => request<Case>(`/requests/${id}`),
  refer: (body: { name: string; email: string; phone: string; country: string; service: string; note: string }) => post<Case>('/requests', body),
  caseMessages: (id: string) => request<Message[]>(`/requests/${id}/messages`),
  sendCaseMessage: (id: string, text: string) => post<Message>(`/requests/${id}/messages`, { text }),
  uploadDoc: (id: string, f: UploadFile, docId?: string) => {
    const form = new FormData();
    if (f.file) form.append('file', f.file); // web gives a real File
    else form.append('file', { uri: f.uri, name: f.name, type: f.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    if (docId) form.append('docId', docId);
    return request<Case>(`/requests/${id}/documents`, { method: 'POST', body: form });
  },

  wallet: () => request<Wallet>('/wallet'),
  withdraw: (amount: number) => post<{ balance: number; transaction: Transaction }>('/wallet/withdraw', { amount }),

  rmMessages: () => request<Message[]>('/rm/messages'),
  sendRmMessage: (text: string) => post<Message>('/rm/messages', { text }),
};

export const api: typeof remoteApi = API_URL
  ? remoteApi
  : createLocalApi(() => token, () => { if (token) onUnauthorized?.(); });
