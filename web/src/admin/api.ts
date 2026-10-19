import { json, makeRequest, tokenStore } from '../lib/api';
import type { Agent, Case, CaseStatus, Message, Onboarding, PayoutMethod, TeamMember, Transaction } from '../lib/api';
import type { Article, ServiceOverride } from '../lib/content';

export type Section = 'cases' | 'partners' | 'messages' | 'payouts' | 'agreements';
export interface StaffUser {
  id: string; name: string; email: string; role: 'master' | 'staff'; sections: Section[]; active: boolean; lastLoginAt: string | null; createdAt: string;
}
export interface MasterSettings {
  minWithdrawal: number; supportEmail: string; supportPhone: string; commissionEffective: string;
  defaultRm: { name: string; email: string; phone: string }; articlesImported: boolean;
  tdsRate: number; gstRate: number; sac: string; agreementVersion: string; company: Company;
}
export interface Company {
  legalName: string; constitution: string; gstin: string; pan: string; cin: string; address: string; state: string; stateCode: string; city: string;
  signatory: string; signatoryId: string; designation: string; email: string;
}
export interface PartnerFull extends Omit<Agent, 'member'> {
  suspended: boolean; wallet: { balance: number; pending: number; lifetime: number }; students: number;
  team: TeamMember[]; transactions: Transaction[];
  payoutMethods: PayoutMethod[];
  cases: Partial<Record<CaseStatus, number>>;
  recentCases: { id: string; ref: string; service: string; student: string; status: CaseStatus; createdAt: string }[];
  agreementRequests: { id: string; type: 'download' | 'discussion' | 'termination'; status: 'Open' | 'Closed'; outcome: string; createdAt: string }[];
  lastSeen: { at: string; platform: 'app' | 'web' } | null;
  devices: number;
}
export interface Stats {
  partners: { total: number; newThisMonth: number; suspended: number };
  students: number;
  cases: {
    total: number; byStatus: Record<CaseStatus, number>;
    byService: { key: string; name: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  recent: { id: string; ref: string; service: string; status: CaseStatus; createdAt: string; student: string; country: string; partner: string }[];
  topPartners: { id: string; name: string; verified: boolean; cases: number; open: number; balance: number | null }[];
  money: {
    creditedThisMonth: number; paidThisMonth: number; pendingWithdrawals: number; pendingWithdrawalCount: number;
    monthly: { month: string; amount: number }[];
  } | null;
  activity: { id: string; name: string; action: string; at: string }[] | null;
}
export interface Activity { id: string; admin: string | null; name: string; action: string; at: string }
export interface Overview {
  partners: number; unverified: number; openCases: number; docsToReview: number; pendingPayouts: number;
  openAgreementRequests: number; casesAwaitingReply: number; rmAwaitingReply: number; kycToReview: number; tdsRate: number;
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
export interface AdminTx extends Transaction {
  partner: PartnerRef;
  payTo: { type: 'upi'; upi: string } | { type: 'bank'; holder: string; accountNumber: string; ifsc: string; bankName: string; branch: string } | null;
  invoiceDetail: {
    supplier: { legalName: string; gstin: string; address: string; state: string }; taxable: number; tdsAdjusted: number; gstRate: number;
    cgst: number; sgst: number; igst: number; payable: number; signedName: string; signedAt: string; verifiedBy: string;
  } | null;
}
export type OnboardingStage = 'review' | 'sent_back' | 'verified' | 'agreement_sent' | 'done' | 'not_started';
export interface OnboardingRow {
  id: string; name: string; agency: string; email: string; phone: string; city: string; zone: string; applicant: boolean; stage: OnboardingStage;
  kycType: 'individual' | 'entity' | null; legalName: string; submittedAt: string | null; agreementSentAt: string | null; signedAt: string | null; createdAt: string;
}
export interface OnboardingDetail extends Omit<Onboarding, 'stage'> {
  id: string; name: string; agency: string; email: string; phone: string; city: string; zone: string; applicant: boolean; stage: string;
  kyc: Onboarding['kyc'] & { verifiedBy: string };
  agreements: { id: string; number: string; version: string; status: 'sent' | 'signed'; sentAt: string; sentBy: string; signedAt: string | null; signer: string }[];
}
export interface AgreementReq {
  id: string; type: 'download' | 'discussion' | 'termination'; status: 'Open' | 'Closed'; createdAt: string;
  outcome: '' | 'sent' | 'scheduled' | 'confirmed' | 'retained'; note: string;
  meetingAt: string | null; endsOn: string | null; handledBy: string; handledAt: string | null;
  partner: (PartnerRef & { email: string; phone: string; agreementNumber: string; agreementStatus: string; hasFile: boolean; fileName: string }) | null;
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
  stats: () => request<Stats>('/admin/stats'),

  cases: (f: { status?: string; q?: string; queue?: string; partner?: string }) => request<AdminCase[]>(`/admin/cases${qs(f)}`),
  case: (id: string) => request<CaseDetail>(`/admin/cases/${id}`),
  updateCase: (id: string, b: { step?: number; status?: CaseStatus }) => request<CaseDetail>(`/admin/cases/${id}`, json('PATCH', b)),
  reply: (id: string, text: string) => request<CaseDetail>(`/admin/cases/${id}/messages`, json('POST', { text })),
  requestDoc: (id: string, name: string) => request<CaseDetail>(`/admin/cases/${id}/docs`, json('POST', { name })),
  reviewDoc: (id: string, docId: string, status: 'verified' | 'missing', reason?: string) =>
    request<CaseDetail>(`/admin/cases/${id}/docs/${docId}`, json('PATCH', { status, reason })),
  downloadDoc: (id: string, docId: string, name: string) => download(`/admin/cases/${id}/docs/${docId}/file`, name),
  /** Excel-friendly CSV of all cases, payouts or partners */
  exportCsv: (kind: 'cases' | 'transactions' | 'partners') => download(`/admin/${kind}/export`, `${kind === 'transactions' ? 'payouts' : kind}-${new Date().toISOString().slice(0, 10)}.csv`),
  credit: (id: string, amount: number, cleared: boolean) => request<CaseDetail>(`/admin/cases/${id}/credit`, json('POST', { amount, cleared })),

  partners: () => request<AdminPartner[]>('/admin/partners'),
  updatePartner: (id: string, b: { verified?: boolean; rm?: Partial<Agent['rm']> }) => request<Agent>(`/admin/partners/${id}`, json('PATCH', b)),
  resetPassword: (id: string) => request<{ password: string }>(`/admin/partners/${id}/reset-password`, json('POST')),

  inbox: () => request<Thread[]>('/admin/inbox'),
  thread: (partnerId: string) => request<Message[]>(`/admin/partners/${partnerId}/messages`),
  sendRm: (partnerId: string, text: string) => request<Message>(`/admin/partners/${partnerId}/messages`, json('POST', { text })),

  transactions: (status: string) => request<{ instantPayouts: boolean; items: AdminTx[] }>(`/admin/transactions${qs({ status })}`),
  downloadInvoice: (id: string, name: string) => download(`/admin/transactions/${id}/invoice`, name),
  onboardingList: () => request<OnboardingRow[]>('/admin/onboarding'),
  onboardingDetail: (id: string) => request<OnboardingDetail>(`/admin/onboarding/${id}`),
  kycDoc: (id: string, docId: string, name: string) => download(`/admin/onboarding/${id}/docs/${docId}`, name),
  verifyKyc: (id: string) => request<{ ok: boolean }>(`/admin/onboarding/${id}/verify`, json('POST')),
  rejectKyc: (id: string, reason: string) => request<{ ok: boolean }>(`/admin/onboarding/${id}/reject`, json('POST', { reason })),
  sendAgreement: (id: string) => request<{ ok: boolean; link: string }>(`/admin/onboarding/${id}/agreement`, json('POST')),
  agreementPdf: (id: string, docId: string, name: string) => download(`/admin/onboarding/${id}/agreements/${docId}/pdf`, name),
  settle: (id: string, action: 'clear' | 'pay' | 'payout' | 'reject' | 'verify-invoice', extra: { reason?: string; utr?: string } = {}) => request<Transaction>(`/admin/transactions/${id}`, json('PATCH', { action, ...extra })),

  agreementRequests: (status: string) => request<AgreementReq[]>(`/admin/agreement-requests${qs({ status })}`),
  reopenAgreementRequest: (id: string) => request<{ ok: boolean }>(`/admin/agreement-requests/${id}`, json('PATCH', { status: 'Open' })),
  /** fields: note, meetingAt, outcome, endsOn; file: the signed agreement PDF */
  resolveAgreementRequest: (id: string, fields: Record<string, string>, file?: File | null) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
    if (file) form.append('file', file);
    return request<{ ok: boolean }>(`/admin/agreement-requests/${id}/resolve`, { method: 'POST', body: form });
  },

  /* master admin */
  usage: (days: number) => request<Usage>(`/admin/master/usage?days=${days}`),
  announcements: () => request<Announcement[]>('/admin/master/announcements'),
  sendAnnouncement: (b: { title: string; body: string; partnerId?: string }) => request<{ id: string; recipients: number }>('/admin/master/announcements', json('POST', b)),
  staff: () => request<StaffUser[]>('/admin/master/staff'),
  addStaff: (b: { name: string; email: string; password: string; role: 'master' | 'staff'; sections: Section[] }) => request<StaffUser>('/admin/master/staff', json('POST', b)),
  updateStaff: (id: string, b: Partial<{ name: string; email: string; password: string; role: 'master' | 'staff'; sections: Section[]; active: boolean }>) =>
    request<StaffUser>(`/admin/master/staff/${id}`, json('PATCH', b)),
  deleteStaff: (id: string) => request<void>(`/admin/master/staff/${id}`, json('DELETE')),

  partner: (id: string) => request<PartnerFull>(`/admin/master/partners/${id}`),
  editPartner: (id: string, b: Record<string, unknown>) => request<Agent>(`/admin/master/partners/${id}`, json('PATCH', b)),
  adjustWallet: (id: string, amount: number, note: string) => request<{ wallet: PartnerFull['wallet'] }>(`/admin/master/partners/${id}/adjust`, json('POST', { amount, note })),
  partnerPhoto: (id: string, file: File, member?: string) => {
    const form = new FormData();
    form.append('photo', file);
    return request<{ avatar: string }>(`/admin/master/partners/${id}/avatar${member ? `?member=${member}` : ''}`, { method: 'POST', body: form });
  },
  removePartnerPhoto: (id: string, member?: string) => request<{ avatar: string }>(`/admin/master/partners/${id}/avatar${member ? `?member=${member}` : ''}`, json('DELETE')),
  uploadAgreement: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Agent>(`/admin/master/partners/${id}/agreement-file`, { method: 'POST', body: form });
  },
  removeAgreement: (id: string) => request<Agent>(`/admin/master/partners/${id}/agreement-file`, json('DELETE')),
  downloadAgreement: (id: string, name: string) => download(`/admin/master/partners/${id}/agreement-file`, name),
  removeMethod: (id: string, mid: string) => request<void>(`/admin/master/partners/${id}/methods/${mid}`, json('DELETE')),
  defaultMethod: (id: string, mid: string) => request<void>(`/admin/master/partners/${id}/methods/${mid}/default`, json('POST')),
  editMember: (id: string, mid: string, b: Partial<Pick<TeamMember, 'name' | 'email' | 'role' | 'menus' | 'perms'>>) => request<TeamMember>(`/admin/master/partners/${id}/team/${mid}`, json('PATCH', b)),
  resetMember: (id: string, mid: string) => request<{ password: string }>(`/admin/master/partners/${id}/team/${mid}/reset-password`, json('POST')),
  removeMember: (id: string, mid: string) => request<void>(`/admin/master/partners/${id}/team/${mid}`, json('DELETE')),
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

export interface Announcement {
  id: string; title: string; body: string; sentBy: string; recipients: number; createdAt: string; partner: { id: string; name: string } | null;
}
export interface Usage {
  days: number;
  activeUsers: { day: number; week: number; month: number };
  daily: { day: string; app: number; web: number }[];
  platforms: Partial<Record<'app' | 'web', number>>;
  appOs: Record<string, number>;
  screens: { platform: 'app' | 'web'; screen: string; views: number }[];
  actions: { event: string; count: number }[];
  topPartners: { id: string; name: string; events: number; lastSeen: string; platforms: ('app' | 'web')[] }[];
  recentSignIns: { name: string; platform: 'app' | 'web'; os: string; at: string }[];
}
