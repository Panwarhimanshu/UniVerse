import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import miscRoutes from './routes/misc.js';
import partnerRoutes from './routes/partner.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';
import analyticsRoutes from './routes/analytics.js';
import { Admin } from './models/index.js';
import { loadContent, refreshContentIfStale } from './content.js';
import { requireAuth, HttpError } from './middleware/auth.js';
import { MAX_UPLOAD_BYTES } from './files.js';
import './notify.js'; // push and email for partner updates

async function connectDb() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    // dev fallback: throwaway in-memory MongoDB, so the API runs with zero setup
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('universe');
    console.log('MONGODB_URI not set, using in-memory MongoDB (data resets on restart)');
  }
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'universe', serverSelectionTimeoutMS: 10_000 });
  console.log(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
}

/**
 * Creates the master admin from MASTER_EMAIL / MASTER_PASSWORD when there is none yet,
 * and the first staff login from ADMIN_EMAIL / ADMIN_PASSWORD when no back-office account exists.
 */
async function ensureAdmin() {
  const { MASTER_NAME, MASTER_EMAIL, MASTER_PASSWORD, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!(await Admin.exists({}))) {
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      await Admin.create({ name: ADMIN_NAME || 'UniVerse Desk', email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) });
      console.log(`Staff account created for ${ADMIN_EMAIL}`);
    }
  }
  if (!(await Admin.exists({ role: 'master' }))) {
    if (!MASTER_EMAIL || !MASTER_PASSWORD) {
      console.log('No master admin yet. Set MASTER_EMAIL and MASTER_PASSWORD to create one.');
      return;
    }
    const existing = await Admin.findOne({ email: MASTER_EMAIL.toLowerCase() });
    if (existing) {
      existing.role = 'master';
      existing.active = true;
      await existing.save();
    } else {
      await Admin.create({ name: MASTER_NAME || 'Master admin', email: MASTER_EMAIL, role: 'master', passwordHash: await bcrypt.hash(MASTER_PASSWORD, 10) });
    }
    console.log(`Master admin ready for ${MASTER_EMAIL}`);
  }
}

/* One shared start-up per process; serverless invocations reuse it while the instance is warm. */
let ready: Promise<void> | null = null;
export function init() {
  ready ??= (async () => {
    await connectDb();
    await ensureAdmin();
    await loadContent();
  })().catch((e) => {
    ready = null; // let the next request try again
    throw e;
  });
  return ready;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(async (_req, _res, next) => {
  await init();
  await refreshContentIfStale();
  next();
});

const api = express.Router();
api.get('/health', (_req, res) => res.json({ ok: true }));
api.use('/content', contentRoutes);
api.use('/auth', authRoutes);
api.use('/admin', adminRoutes);
api.use('/requests', requireAuth, requestRoutes);
api.use('/', requireAuth, analyticsRoutes);
api.use('/', requireAuth, partnerRoutes);
api.use('/', requireAuth, miscRoutes);
app.use('/api', api);

/* Errors become JSON for the client. Registered here so it applies on Vercel, which loads this file directly. */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB` });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;
