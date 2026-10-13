import { json, makeRequest, tokenStore } from '../lib/api';
import type { Agent, Case, CaseStatus, Message, TeamMember, Transaction } from '../lib/api';
import type { Article, ServiceOverride } from '../lib/content';

export type Section = 'cases' | 'partners' | 'messages' | 'payouts' | 'agreements';
export interface StaffUser {
  id: string; name: string; email: string; role: 'master' | 'staff'; sections: Section[]; active: boolean; lastLoginAt: string | null; createdAt: string;
}
export interface MasterSettings {
  minWithdrawal: number; supportEmail: string; supportPhone: string; commissionEffective: string;
  defaultRm: { name: string; email: string; phone: string }; articlesImported: boolean;
}
export interface PartnerFull extends Omit<Agent, 'member'> {
  suspended: boolean; wallet: { balance: number; pending: number; lifetime: number }; students: number;
  team: TeamMember[]; transactions: Transaction[];
}
export interface Activity { id: string; admin: string | null; name: string; action: string; at: string }
export interface Overview {
  partners: number; unverified: number; openCases: number; docsToReview: number; pendingPayouts: number;
  openAgreementRequests: number; casesAwaitingReply: number; rmAwaitingReply: number;
}
export interface PartnerRef { id: string; name: string; agency: string }
export interface AdminCase extends Case { partner: PartnerRef; awaitingReply: boolean; docsToReview: number; updatedAt: string }
export interface CaseDetail {
  case: Case;
  partner: (Agent & { balance: number }) | null;
  messages: Message[];
  credits: Transaction[];
}
export interface AdminPartner extends Omit<Agent, 'member'> {
  wallet: { balance: number; pending: number; lifetime: number };
  cases: number; openCases: number; teamSize: number; suspended: boolean;
}
export interface Thread { partnerId: string; name: string; agency: string; rm: string; last: Message; awaitingReply: boolean }
export interface AdminTx extends Transaction { partner: PartnerRef & { bankAccount: string } }
export interface AgreementReq {
  id: string; type: 'download' | 'discussion' | 'termination'; status: 'Open' | 'Closed'; createdAt: string;
  partner: (PartnerRef & { email: string; phone: string }) | null;
}

const store = tokenStore('uv_admin_token');
let onUnauthorized: (() => void) | null = null;
export const adminToken = store;
export const setAdminUnauthorized = (fn: () => void) => { onUnauthorized = fn; };
const { request, download } = makeRequest(store, () => onUnauthorized);

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const adminApi = {
  login: (email: string, password: string) => request<{ token: string; admin: StaffUser }>('/admin/login', json('POST', { email, password })),
  me: () => request<StaffUser>('/admin/me'),
  changePassword: (current: string, next: string) => request<{ ok: boolean }>('/admin/password', json('POST', { current, next })),
  overview: () => request<Overview>('/admin/overview'),

  cases: (f: { status?: string; q?: string; queue?: string; partner?: string }) => request<AdminCase[]>(`/admin/cases${qs(f)}`),
  case: (id: string) => request<CaseDetail>(`/admin/cases/${id}`),
  updateCase: (id: string, b: { step?: number; status?: CaseStatus }) => request<CaseDetail>(`/admin/cases/${id}`, json('PATCH', b)),
  reply: (id: string, text: string) => request<CaseDetail>(`/admin/cases/${id}/messages`, json('POST', { text })),
  requestDoc: (id: string, name: string) => request<CaseDetail>(`/admin/cases/${id}/docs`, json('POST', { name })),
  reviewDoc: (id: string, docId: string, status: 'verified' | 'missing', reason?: string) =>
    request<CaseDetail>(`/admin/cases/${id}/docs/${docId}`, json('PATCH', { status, reason })),
  downloadDoc: (id: string, docId: string, name: string) => download(`/admin/cases/${id}/docs/${docId}/file`, name),
  credit: (id: string, amount: number, cleared: boolean) => request<CaseDetail>(`/admin/cases/${id}/credit`, json('POST', { amount, cleared })),

  partners: () => request<AdminPartner[]>('/admin/partners'),
  updatePartner: (id: string, b: { verified?: boolean; rm?: Partial<Agent['rm']> }) => request<Agent>(`/admin/partners/${id}`, json('PATCH', b)),
  resetPassword: (id: string) => request<{ password: string }>(`/admin/partners/${id}/reset-password`, json('POST')),

  inbox: () => request<Thread[]>('/admin/inbox'),
  thread: (partnerId: string) => request<Message[]>(`/admin/partners/${partnerId}/messages`),
  sendRm: (partnerId: string, text: string) => request<Message>(`/admin/partners/${partnerId}/messages`, json('POST', { text })),

  transactions: (status: string) => request<AdminTx[]>(`/admin/transactions${qs({ status })}`),
  settle: (id: string, action: 'clear' | 'pay' | 'reject', reason?: string) => request<Transaction>(`/admin/transactions/${id}`, json('PATCH', { action, reason })),

  agreementRequests: (status: string) => request<AgreementReq[]>(`/admin/agreement-requests${qs({ status })}`),
  closeAgreementRequest: (id: string, status: 'Open' | 'Closed') => request<{ ok: boolean }>(`/admin/agreement-requests/${id}`, json('PATCH', { status })),

  /* master admin */
  staff: () => request<StaffUser[]>('/admin/master/staff'),
  addStaff: (b: { name: string; email: string; password: string; role: 'master' | 'staff'; sections: Section[] }) => request<StaffUser>('/admin/master/staff', json('POST', b)),
  updateStaff: (id: string, b: Partial<{ name: string; email: string; password: string; role: 'master' | 'staff'; sections: Section[]; active: boolean }>) =>
    request<StaffUser>(`/admin/master/staff/${id}`, json('PATCH', b)),
  deleteStaff: (id: string) => request<void>(`/admin/master/staff/${id}`, json('DELETE')),

  partner: (id: string) => request<PartnerFull>(`/admin/master/partners/${id}`),
  editPartner: (id: string, b: Record<string, unknown>) => request<Agent>(`/admin/master/partners/${id}`, json('PATCH', b)),
  adjustWallet: (id: string, amount: number, note: string) => request<{ wallet: PartnerFull['wallet'] }>(`/admin/master/partners/${id}/adjust`, json('POST', { amount, note })),
  deletePartner: (id: string, confirm: string) => request<void>(`/admin/master/partners/${id}`, json('DELETE', { confirm })),

  services: () => request<ServiceOverride[]>('/admin/master/services'),
  saveService: (key: string, data: Record<string, unknown>, hidden: boolean) => request<ServiceOverride>(`/admin/master/services/${key}`, json('PUT', { data, hidden })),
  resetService: (key: string) => request<void>(`/admin/master/services/${key}`, json('DELETE')),

  articles: () => request<{ imported: boolean; list: Article[] }>('/admin/master/articles'),
  importArticles: (articles: unknown[]) => request<{ ok: boolean }>('/admin/master/articles/import', json('POST', { articles })),
  saveArticle: (id: string | null, b: Omit<Article, 'id'>) =>
    request<Article>(id ? `/admin/master/articles/${id}` : '/admin/master/articles', json(id ? 'PATCH' : 'POST', b)),
  deleteArticle: (id: string) => request<void>(`/admin/master/articles/${id}`, json('DELETE')),

  settings: () => request<MasterSettings>('/admin/master/settings'),
  saveSettings: (b: Partial<MasterSettings>) => request<MasterSettings>('/admin/master/settings', json('PATCH', b)),
  activity: () => request<Activity[]>('/admin/master/activity'),
};
