import { Schema, model, Types, InferSchemaType } from 'mongoose';

/* ---------- Agent (partner) ---------- */
const agentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, default: '' },
    agency: { type: String, default: '' },
    zone: { type: String, enum: ['NORTH', 'SOUTH', 'EAST', 'WEST'], required: true },
    city: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false }, // set by the master admin; blocks sign-in
    rm: {
      name: { type: String, default: 'UniVerse Partner Desk' },
      email: { type: String, default: 'vas@universe.com' },
      phone: { type: String, default: '+91 63596 66055' },
    },
    agreement: {
      number: { type: String, default: '' }, // UV/AGR/2026/01847
      signedAt: { type: Date, default: Date.now },
      validTill: { type: Date },
      autoRenew: { type: Boolean, default: true },
    },
    wallet: {
      balance: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      lifetime: { type: Number, default: 0 },
    },
    bankAccount: { type: String, default: '' }, // e.g. "HDFC Bank •••• 4821", required before withdrawing
    avatar: { type: String, default: '' }, // GridFS id of the profile photo
    notifyPrefs: { type: Schema.Types.Mixed, default: {} }, // { category: { push, email } }, see notify.ts
  },
  { timestamps: true, minimize: false },
);
export const Agent = model('Agent', agentSchema);
export type AgentDoc = InferSchemaType<typeof agentSchema> & { _id: Types.ObjectId };

/* ---------- Student ---------- */
export const STATUSES = ['Pending', 'In Progress', 'Completed', 'On Hold'] as const;

const studentSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    code: { type: String, required: true }, // STU-1024
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    country: { type: String, required: true },
  },
  { timestamps: true },
);
export const Student = model('Student', studentSchema);

/* ---------- Service request (case) ---------- */
const docSchema = new Schema(
  {
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    status: { type: String, enum: ['missing', 'review', 'verified'], default: 'missing' },
    file: { type: String, default: '' }, // stored filename under /uploads
  },
  { timestamps: true },
);

const requestSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    ref: { type: String, required: true }, // REQ-1187
    service: { type: String, required: true }, // service key
    status: { type: String, enum: STATUSES, default: 'Pending' },
    progress: { type: Number, default: 10, min: 0, max: 100 },
    note: { type: String, default: '' },
    step: { type: Number, default: 0, min: 0, max: 4 }, // last completed stage, see data/timelines.ts
    stepLog: [{ step: Number, at: { type: Date, default: Date.now }, _id: false }],
    docs: [docSchema],
  },
  { timestamps: true },
);
export const ServiceRequest = model('ServiceRequest', requestSchema);

/* ---------- Message (case chat or RM chat) ---------- */
const messageSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', default: null, index: true }, // null → RM thread
    from: { type: String, enum: ['agent', 'desk', 'rm', 'system'], required: true },
    author: { type: String, default: '' }, // who wrote it: team member name on the partner side, staff name on ours
    text: { type: String, required: true },
    quiet: { type: Boolean, default: false }, // true for notes about the partner's own actions: no push or email
  },
  { timestamps: true },
);
export const Message = model('Message', messageSchema);

/* ---------- Wallet transaction ---------- */
const txSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Rejected'], default: 'Pending' },
    // commission: earned on a case · adjustment: correction by the master admin · withdrawal: money sent to the partner
    kind: { type: String, enum: ['commission', 'adjustment', 'withdrawal'], default: undefined },
    request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
    date: { type: Date, default: Date.now },
    // withdrawals: where the money goes (a copy, so later edits to the method don't change history)
    methodId: { type: Schema.Types.ObjectId, ref: 'PayoutMethod', default: null },
    method: {
      type: { type: String, enum: ['upi', 'bank'] },
      label: String, // "UPI · ravi@okaxis" or "HDFC Bank ••4821"
    },
    // how a withdrawal was paid
    payout: {
      provider: { type: String, enum: ['razorpay', 'manual'] },
      id: String, // Razorpay payout id
      state: String, // requested, processing, processed, failed, reversed
      utr: String, // bank reference shown to the partner
      reason: String, // why it failed or was rejected
      paidAt: Date,
    },
  },
  { timestamps: true },
);
export const Transaction = model('Transaction', txSchema);

/* ---------- Where a partner receives withdrawals: a UPI ID or a bank account ---------- */
const payoutMethodSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    type: { type: String, enum: ['upi', 'bank'], required: true },
    upi: { type: String, default: '' },
    holder: { type: String, default: '' },
    accountNumber: { type: String, default: '', select: false }, // full number only leaves the server for the payout itself
    last4: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
    branch: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    razorpay: { contactId: String, fundAccountId: String },
  },
  { timestamps: true },
);
export const PayoutMethod = model('PayoutMethod', payoutMethodSchema);

/* ---------- Team member (user management) ---------- */
export const MENUS = ['overview', 'whatsnew', 'students', 'requests', 'services', 'wallet', 'commissions'] as const;
export const PERMS = ['create', 'chat', 'upload', 'edit', 'withdraw'] as const;

const teamSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['Manager', 'Staff'], default: 'Staff' },
    status: { type: String, enum: ['Pending', 'Active'], default: 'Pending' },
    menus: [{ type: String, enum: MENUS }],
    perms: [{ type: String, enum: PERMS }],
    passwordHash: { type: String, select: false },
    lastLoginAt: { type: Date, default: null },
    avatar: { type: String, default: '' }, // GridFS id of the member's profile photo
    notifyPrefs: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
teamSchema.index({ agent: 1, email: 1 }, { unique: true });
export const TeamMember = model('TeamMember', teamSchema);

/* ---------- Agreement requests (download / discussion / termination) ---------- */
const agreementRequestSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    type: { type: String, enum: ['download', 'discussion', 'termination'], required: true },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  },
  { timestamps: true },
);
export const AgreementRequest = model('AgreementRequest', agreementRequestSchema);

/* ---------- Back-office staff (service desk / relationship managers) ---------- */
/** Back-office sections a staff account can be given. The master admin always has all of them plus the master-only ones. */
export const STAFF_SECTIONS = ['cases', 'partners', 'messages', 'payouts', 'agreements'] as const;

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['master', 'staff'], default: 'staff' },
    sections: { type: [{ type: String, enum: STAFF_SECTIONS }], default: () => [...STAFF_SECTIONS] },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const Admin = model('Admin', adminSchema);

/* ---------- Editable content (managed by the master admin) ---------- */

/** Overrides for one service in the catalogue. Fields left out keep the built-in text. */
const serviceContentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false },
);
export const ServiceContent = model('ServiceContent', serviceContentSchema);

const articleSchema = new Schema(
  {
    service: { type: String, required: true },
    t: { type: String, required: true, trim: true },
    d: { type: String, required: true }, // publish date, YYYY-MM-DD
    mins: { type: Number, default: 4 },
    teaser: { type: String, default: '' },
    body: [{ type: String }],
  },
  { timestamps: true },
);
export const Article = model('Article', articleSchema);

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // always 'site'
    minWithdrawal: { type: Number, default: 500 },
    supportEmail: { type: String, default: 'vas@universe.com' },
    supportPhone: { type: String, default: '+91 63596 66055' },
    commissionEffective: { type: String, default: 'July 2026' },
    defaultRm: {
      name: { type: String, default: 'UniVerse Partner Desk' },
      email: { type: String, default: 'vas@universe.com' },
      phone: { type: String, default: '+91 63596 66055' },
    },
    articlesImported: { type: Boolean, default: false }, // insights moved from the built-in list into the database
  },
  { timestamps: true },
);
export const Setting = model('Setting', settingSchema);

const auditSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
    name: { type: String, default: '' },
    action: { type: String, required: true },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);
export const AuditLog = model('AuditLog', auditSchema);

/* ---------- Commission structures that were replaced (recorded when the master admin changes a rate) ---------- */
const commissionArchiveSchema = new Schema(
  {
    effective: { type: String, required: true }, // e.g. "July 2026 – October 2026"
    items: [{ type: [String] }], // [service name, payout]
  },
  { timestamps: true },
);
export const CommissionArchive = model('CommissionArchive', commissionArchiveSchema);

/* ---------- App and website usage, recorded by our own server (no third-party tracking) ---------- */
const usageSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', index: true },
    member: { type: Schema.Types.ObjectId, ref: 'TeamMember', default: null },
    platform: { type: String, enum: ['app', 'web'], required: true },
    os: { type: String, default: '' }, // android / ios / web
    event: { type: String, required: true }, // screen_view, sign_in, referral_created, ...
    screen: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
usageSchema.index({ at: 1 }, { expireAfterSeconds: 180 * 24 * 3600 }); // keep 6 months
usageSchema.index({ event: 1, at: -1 });
export const UsageEvent = model('UsageEvent', usageSchema);

/* ---------- In-app notifications: one per recipient, created by notify() in notify.ts ---------- */
const notificationSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    member: { type: Schema.Types.ObjectId, ref: 'TeamMember', default: null }, // null = the account owner
    category: { type: String, required: true }, // case, document, message, payment, account, announcement
    type: { type: String, required: true }, // e.g. case.stage
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { kind: { type: String, default: 'none' }, id: { type: String, default: '' } },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
notificationSchema.index({ agent: 1, member: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 }); // kept 6 months
export const Notification = model('Notification', notificationSchema);

/* ---------- Announcements sent by the master admin ---------- */
const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    partner: { type: Schema.Types.ObjectId, ref: 'Agent', default: null }, // null = all partners
    sentBy: { type: String, default: '' },
    recipients: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const Announcement = model('Announcement', announcementSchema);

/* ---------- Phones registered for push notifications ---------- */
const deviceSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'TeamMember', default: null },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: 'android' },
  },
  { timestamps: true },
);
export const Device = model('Device', deviceSchema);

/* ---------- Password reset links (only a hash of the token is stored) ---------- */
const resetSchema = new Schema(
  {
    kind: { type: String, enum: ['agent', 'member'], required: true },
    user: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { versionKey: false },
);
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 3600 });
export const PasswordReset = model('PasswordReset', resetSchema);

/* ---------- Failed sign-ins, for the attempt limit (kept 30 minutes) ---------- */
const attemptSchema = new Schema({ key: { type: String, required: true, index: true }, at: { type: Date, default: Date.now } }, { versionKey: false });
attemptSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 60 });
export const LoginAttempt = model('LoginAttempt', attemptSchema);
