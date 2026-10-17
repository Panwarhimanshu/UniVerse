import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/* ---------- types (mirror server/src/serialize.ts) ---------- */

export type CaseStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
export type Menu = 'overview' | 'whatsnew' | 'students' | 'requests' | 'services' | 'wallet' | 'commissions';
export type Perm = 'create' | 'chat' | 'upload' | 'edit' | 'withdraw';

export interface TeamMember {
  id: string; name: string; email: string; role: 'Manager' | 'Staff'; status: 'Pending' | 'Active';
  menus: Menu[]; perms: Perm[]; lastLoginAt: string | null; avatar: string;
}
export interface Agent {
  id: string; name: string; email: string; phone: string; agency: string; zone: string; city: string; verified: boolean;
  rm: { name: string; email: string; phone: string };
  bankAccount: string;
  avatar: string;
  agreement: {
    number: string; signedAt: string; validTill: string | null; autoRenew: boolean;
    status: 'Active' | 'Ending' | 'Ended'; endsOn: string | null; hasFile: boolean; fileName: string;
  };
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
/* ---------- notifications (server notification engine, see docs/NOTIFICATIONS.md) ---------- */
export type NotificationCategory = 'case' | 'document' | 'message' | 'payment' | 'account' | 'announcement';
export interface NotificationLink { kind: 'case' | 'rm' | 'wallet' | 'profile' | 'whatsnew' | 'none'; id?: string }
export interface AppNotification {
  id: string; category: NotificationCategory; type: string; title: string; body: string; link: NotificationLink; read: boolean; createdAt: string;
}
export interface NotificationPref { key: NotificationCategory; label: string; description: string; push: boolean; email: boolean }
export interface Transaction {
  id: string; description: string; type: 'Credit' | 'Debit'; kind: 'commission' | 'adjustment' | 'withdrawal';
  amount: number; status: 'Pending' | 'Completed' | 'Rejected'; date: string;
  method: { type: 'upi' | 'bank'; label: string } | null;
  payout: { state: 'requested' | 'processing' | 'processed' | 'failed' | 'reversed'; utr: string; reason: string; paidAt: string | null } | null;
}
export interface PayoutMethod {
  id: string; type: 'upi' | 'bank'; label: string; isDefault: boolean;
  upi?: string; holder?: string; bankName?: string; branch?: string; ifsc?: string; last4?: string;
}
export interface Wallet {
  balance: number; pending: number; lifetime: number; minWithdrawal: number;
  /** true when withdrawals are paid through RazorpayX (minutes) rather than by hand (a working day) */
  instantPayouts: boolean;
  methods: PayoutMethod[]; transactions: Transaction[];
}
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
/** A partner's agreement request and how the desk resolved it */
export interface AgreementRequest {
  id: string; type: 'download' | 'discussion' | 'termination'; status: 'Open' | 'Closed';
  outcome: '' | 'sent' | 'scheduled' | 'confirmed' | 'retained'; note: string;
  meetingAt: string | null; endsOn: string | null; handledBy: string; handledAt: string | null; createdAt: string;
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
/** Public address of a profile photo, or '' when there is none */
export const avatarUrl = (id?: string | null) => (!id ? '' : id.startsWith('http') ? id : `${API_URL}/content/avatar/${id}`); // Cloudinary URL, or a stored photo id
export const setUnauthorizedHandler = (fn: (message: string) => void) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // tells the server which platform the request came from, for the usage report
  const headers: Record<string, string> = { 'X-Client': 'app', 'X-Client-OS': Platform.OS, ...(init.headers as Record<string, string>) };
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

/** Downloads a protected file and opens the share sheet so it can be saved or viewed. */
async function downloadFile(path: string, name: string) {
  const url = `${API_URL}${path}`;
  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError(res.status, 'Download failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = name;
    a.click();
    return;
  }
  const safe = name.replace(/[^\w.\- ]+/g, '_');
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
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: type, dialogTitle: name });
}

export const api = {
  login: (email: string, password: string) => post<{ token: string; agent: Agent }>('/auth/login', { email, password }),
  register: (body: { name: string; email: string; phone: string; zone: string; city: string; password: string }) =>
    post<{ token: string; agent: Agent }>('/auth/register', body),
  me: () => request<Agent>('/auth/me'),
  updateMe: (body: Partial<Pick<Agent, 'name' | 'phone' | 'agency' | 'city' | 'bankAccount'>>) => request<Agent>('/auth/me', json('PATCH', body)),
  changePassword: (current: string, next: string) => post<{ ok: boolean }>('/auth/password', { current, next }),
  forgotPassword: (email: string) => post<{ ok: boolean }>('/auth/forgot', { email }),
  registerDevice: (token: string, platform: string) => post<{ ok: boolean }>('/auth/devices', { token, platform }),
  unregisterDevice: (token: string) => request<void>('/auth/devices', json('DELETE', { token })),
  uploadAvatar: (f: UploadFile) => {
    const form = new FormData();
    if (f.file) form.append('photo', f.file);
    else form.append('photo', { uri: f.uri, name: f.name, type: f.mimeType ?? 'image/jpeg' } as unknown as Blob);
    return request<Agent>('/auth/me/avatar', { method: 'POST', body: form });
  },
  removeAvatar: () => request<Agent>('/auth/me/avatar', json('DELETE')),
  analytics: () => request<Analytics>('/analytics'),
  /** Records which screens are opened, for the master admin's usage report. Never throws. */
  trackViews: (screens: string[]) => {
    if (token && screens.length) post('/events', { events: screens.map((screen) => ({ event: 'screen_view', screen })) }).catch(() => {});
  },

  content: () => request<SiteContent>('/content'),
  dashboard: () => request<Dashboard>('/dashboard'),
  meta: () => request<{ destinations: string[]; countries?: string[]; minWithdrawal: number }>('/meta'),
  services: () => request<Service[]>('/services'),
  commissions: () => request<Commissions>('/commissions'),
  notifications: (category = '', before = '') =>
    request<{ items: AppNotification[]; unread: number; more: boolean }>(`/notifications?limit=30${category ? `&category=${category}` : ''}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
  unreadNotifications: () => request<{ count: number; latest: string | null }>('/notifications/unread'),
  markNotificationsRead: (ids: string[] | 'all') => post<{ unread: number }>('/notifications/read', ids === 'all' ? { all: true } : { ids }),
  notificationPrefs: () => request<NotificationPref[]>('/notifications/preferences'),
  saveNotificationPrefs: (b: Partial<Record<NotificationCategory, { push?: boolean; email?: boolean }>>) => request<NotificationPref[]>('/notifications/preferences', json('PUT', b)),

  cases: (q = '', status = '') => request<Case[]>(`/requests?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`),
  case: (id: string) => request<Case>(`/requests/${id}`),
  /** Requests one or more services for a new student, or for an existing one when studentId is set */
  refer: (body: { name: string; email: string; phone: string; country: string; services: string[]; note: string; studentId?: string }) =>
    post<Case & { opened: number }>('/requests', body),
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
  downloadDoc: (caseId: string, doc: CaseDoc) => downloadFile(`/requests/${caseId}/documents/${doc.id}/file`, doc.name),
  downloadAgreement: (name: string) => downloadFile('/agreement/file', name),
  agreementRequests: () => request<AgreementRequest[]>('/agreement/requests'),

  students: () => request<Student[]>('/students'),
  addStudent: (b: { name: string; email: string; phone: string; country: string }) => post<Student>('/students', b),
  updateStudent: (id: string, b: Partial<Pick<Student, 'name' | 'email' | 'phone' | 'country'>>) => request<Student>(`/students/${id}`, json('PATCH', b)),
  raiseRequests: (id: string, services: string[]) => post<Student>(`/students/${id}/requests`, { services }),

  wallet: () => request<Wallet>('/wallet'),
  withdraw: (amount: number, methodId: string) => post<{ balance: number; transaction: Transaction }>('/wallet/withdraw', { amount, methodId }),
  payoutMethods: () => request<PayoutMethod[]>('/wallet/methods'),
  addPayoutMethod: (b: { type: 'upi'; upi: string } | { type: 'bank'; holder: string; accountNumber: string; ifsc: string }) => post<PayoutMethod>('/wallet/methods', b),
  setDefaultPayoutMethod: (id: string) => post<PayoutMethod[]>(`/wallet/methods/${id}/default`, {}),
  removePayoutMethod: (id: string) => request<void>(`/wallet/methods/${id}`, json('DELETE')),
  lookupIfsc: (code: string) => request<{ bank: string; branch: string; city: string }>(`/wallet/ifsc/${encodeURIComponent(code)}`),

  rmMessages: () => request<Message[]>('/rm/messages'),
  sendRmMessage: (text: string) => post<Message>('/rm/messages', { text }),

  team: () => request<TeamMember[]>('/team'),
  addMember: (b: MemberInput & { password: string }) => post<TeamMember>('/team', b),
  updateMember: (id: string, b: Partial<MemberInput> & { password?: string }) => request<TeamMember>(`/team/${id}`, json('PATCH', b)),
  removeMember: (id: string) => request<void>(`/team/${id}`, json('DELETE')),

  agreementRequest: (type: 'download' | 'discussion' | 'termination') => post<AgreementRequest>('/agreement/requests', { type }),
};
