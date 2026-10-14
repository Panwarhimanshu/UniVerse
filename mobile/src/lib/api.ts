import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/* ---------- types (mirror server/src/serialize.ts) ---------- */

export type CaseStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
export type Menu = 'overview' | 'whatsnew' | 'students' | 'requests' | 'services' | 'wallet' | 'commissions';
export type Perm = 'create' | 'chat' | 'upload' | 'edit' | 'withdraw';

export interface TeamMember {
  id: string; name: string; email: string; role: 'Manager' | 'Staff'; status: 'Pending' | 'Active';
  menus: Menu[]; perms: Perm[]; lastLoginAt: string | null;
}
export interface Agent {
  id: string; name: string; email: string; phone: string; agency: string; zone: string; city: string; verified: boolean;
  rm: { name: string; email: string; phone: string };
  bankAccount: string;
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
export interface Service {
  key: string; icon: string; category: string; name: string; short: string; about: string; tat: string; countries: string;
  kpis: [string, string][]; features: string[]; partners: string[]; steps: string[];
  commission: { amount: string; note: string }; documents: string[];
}
export interface Dashboard {
  stats: { activeCases: number; students: number; balance: number | null; monthEarnings: number | null };
  recent: Case[];
  mix: { key: string; name: string; count: number }[];
}
export interface Commissions {
  rates: { key: string; icon: string; name: string; amount: string; note: string }[];
  history: { id: string; title: string; effective: string; status: string; items: [string, string][] }[];
}
export interface Article { id: string; service: string; t: string; d: string; mins: number; teaser: string; body: string[] }
export interface SiteContent {
  articles: Article[] | null;
  settings: { supportEmail: string; supportPhone: string; commissionEffective: string; minWithdrawal: number };
}

/* ---------- server ---------- */

/** The live UniVerse API. Override with EXPO_PUBLIC_API_URL (e.g. http://192.168.1.5:4000/api) to test against a local server. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://universeportal.vercel.app/api').replace(/\/$/, '');

let token: string | null = null;
let onUnauthorized: ((message: string) => void) | null = null;
export const setToken = (t: string | null) => { token = t; };
export const setUnauthorizedHandler = (fn: (message: string) => void) => { onUnauthorized = fn; };

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
    throw new ApiError(0, "Can't reach UniVerse. Check your internet connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error ?? 'Something went wrong';
    if (res.status === 401 && token) onUnauthorized?.(message);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const post = <T>(path: string, body: unknown) => request<T>(path, json('POST', body));

export interface UploadFile { uri: string; name: string; size?: number; mimeType?: string; file?: File }
type MemberInput = Pick<TeamMember, 'name' | 'email' | 'role' | 'menus' | 'perms'>;

export const api = {
  login: (email: string, password: string) => post<{ token: string; agent: Agent }>('/auth/login', { email, password }),
  register: (body: { name: string; email: string; phone: string; zone: string; city: string; password: string }) =>
    post<{ token: string; agent: Agent }>('/auth/register', body),
  me: () => request<Agent>('/auth/me'),
  updateMe: (body: Partial<Pick<Agent, 'name' | 'phone' | 'agency' | 'city' | 'bankAccount'>>) => request<Agent>('/auth/me', json('PATCH', body)),
  changePassword: (current: string, next: string) => post<{ ok: boolean }>('/auth/password', { current, next }),

  content: () => request<SiteContent>('/content'),
  dashboard: () => request<Dashboard>('/dashboard'),
  meta: () => request<{ destinations: string[]; minWithdrawal: number }>('/meta'),
  services: () => request<Service[]>('/services'),
  commissions: () => request<Commissions>('/commissions'),
  notifications: () => request<Notification[]>('/notifications'),

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
  /** Downloads an uploaded document and opens the share sheet so it can be saved or viewed. */
  downloadDoc: async (caseId: string, doc: CaseDoc) => {
    const url = `${API_URL}/requests/${caseId}/documents/${doc.id}/file`;
    if (Platform.OS === 'web') {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new ApiError(res.status, 'Download failed');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await res.blob());
      a.download = doc.name;
      a.click();
      return;
    }
    const safe = doc.name.replace(/[^\w.\- ]+/g, '_');
    const target = `${FileSystem.cacheDirectory}${Date.now()}-${safe}`;
    const res = await FileSystem.downloadAsync(url, target, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status !== 200) throw new ApiError(res.status, 'Download failed');
    const type = res.headers['content-type'] ?? res.headers['Content-Type'];
    let uri = res.uri;
    // give the file its real extension so the viewer knows what it is
    const ext = type?.includes('pdf') ? '.pdf' : type?.includes('png') ? '.png' : type?.includes('jpeg') ? '.jpg' : '';
    if (ext && !safe.toLowerCase().endsWith(ext)) {
      await FileSystem.moveAsync({ from: uri, to: uri + ext });
      uri += ext;
    }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: type, dialogTitle: doc.name });
  },

  students: () => request<Student[]>('/students'),
  updateStudent: (id: string, b: Partial<Pick<Student, 'name' | 'email' | 'phone' | 'country'>>) => request<Student>(`/students/${id}`, json('PATCH', b)),
  raiseRequests: (id: string, services: string[]) => post<Student>(`/students/${id}/requests`, { services }),

  wallet: () => request<Wallet>('/wallet'),
  withdraw: (amount: number) => post<{ balance: number; transaction: Transaction }>('/wallet/withdraw', { amount }),

  rmMessages: () => request<Message[]>('/rm/messages'),
  sendRmMessage: (text: string) => post<Message>('/rm/messages', { text }),

  team: () => request<TeamMember[]>('/team'),
  addMember: (b: MemberInput & { password: string }) => post<TeamMember>('/team', b),
  updateMember: (id: string, b: Partial<MemberInput> & { password?: string }) => request<TeamMember>(`/team/${id}`, json('PATCH', b)),
  removeMember: (id: string) => request<void>(`/team/${id}`, json('DELETE')),

  agreementRequest: (type: 'download' | 'discussion' | 'termination') => post<{ ok: boolean }>('/agreement/requests', { type }),
};
