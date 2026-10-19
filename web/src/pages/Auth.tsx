import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SITE, STATS } from '../lib/content';
import { AgreementSigner, emptyKyc, KycFields, kycForm, kycProblem, useOnboardingMeta } from '../components/onboarding';
import type { KycFiles, KycValues } from '../components/onboarding';

const LOGO = '/img/universe-logo.png';
const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const MAIL = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
const LOCK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const USER = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

function AuthShell({ title, sub, points, children }: { title: string; sub: string; points: string[]; children: ReactNode }) {
  return (
    <div className="auth-page">
      <Link to="/" className="back-home">← Back to home</Link>
      <aside className="auth-brand">
        <div className="logo-box"><img src={LOGO} alt="UniVerse logo" /></div>
        <h1>{title}</h1>
        <p className="sub">{sub}</p>
        <ul className="auth-points">{points.map((p) => <li key={p}><span className="pt">{CHECK}</span>{p}</li>)}</ul>
      </aside>
      <main className="auth-form-side"><div className="auth-card">{children}</div></main>
    </div>
  );
}

/** Shared sign-in form (used by /partner-login and the Sign In tab of /agent-login) */
function SignInForm({ cta }: { cta: string }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReset = async () => {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter your email address above first');
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password');
    setBusy(true);
    try {
      const { token, agent } = await api.login(email.trim(), password);
      signIn(token, agent, remember);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <div className="ctl">{MAIL}<input type="email" id="email" placeholder="you@agency.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="ctl">{LOCK}<input type="password" id="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      </div>
      <div className="auth-row">
        <label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
        <a href="#" onClick={(e) => { e.preventDefault(); setForgot(!forgot); setSent(false); }}>Forgot password?</a>
      </div>
      {forgot ? (
        <div className="auth-help">
          {sent ? (
            <p>If <b>{email.trim()}</b> has a UniVerse account, a reset link is on its way. It works for 30 minutes. Check your spam folder too.</p>
          ) : (
            <>
              <p>Enter your email above and we'll send you a link to choose a new password.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={sendReset} disabled={busy} style={{ marginTop: '.5rem' }}>Email me a reset link</button>
            </>
          )}
          <p style={{ marginTop: '.5rem' }}>Still stuck? Write to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.</p>
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : cta}</button>
    </form>
  );
}

/** Partner application: contact details, then KYC (individual or entity) with certificates. No password yet:
    the agreement is emailed within 48 hours and the password is set after signing it. */
function SignUpForm() {
  const meta = useOnboardingMeta();
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ name: '', email: '', phone: '', zone: '', city: '', agency: '' });
  const [k, setK] = useState<KycValues>(emptyKyc);
  const [files, setFiles] = useState<KycFiles>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ email: string; sla: string } | null>(null);
  const set = (key: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [key]: e.target.value }));

  const next = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !f.zone || !f.city.trim()) return setError('Fill in all required fields');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError('Enter a valid email address');
    if (!/^\+?[\d\s-]{10,16}$/.test(f.phone.trim())) return setError('Enter a valid mobile number');
    setStep(2);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const problem = kycProblem(k, files);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      const form = new FormData();
      for (const [key, val] of Object.entries(f)) form.append(key, val.trim());
      const r = await api.apply(kycForm(k, files, form));
      setDone({ email: r.email, sla: r.sla });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your application');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="apply-done" role="dialog" aria-labelledby="applyDoneTitle">
        <div className="apply-done-ic">{CHECK}</div>
        <h3 id="applyDoneTitle">Thank you, your details are received</h3>
        <p>We have recorded your application. Our team will verify your details and email your partner agreement to <b>{done.email}</b> for review within <b>{done.sla}</b>.</p>
        <ol className="apply-steps">
          <li>We verify your PAN, GST / MSME details and documents.</li>
          <li>You receive the agreement by email and sign it online.</li>
          <li>We email you a link to set your password and sign in.</li>
        </ol>
        <p className="muted" style={{ fontSize: '.85rem' }}>Didn't get an email in {done.sla}? Check your spam folder or write to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.</p>
        <Link to="/" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Back to home</Link>
      </div>
    );
  }

  return (
    <>
      <div className="apply-progress" aria-label={`Step ${step} of 2`}>
        <span className={step >= 1 ? 'on' : ''}>1 · Your details</span>
        <span className={step >= 2 ? 'on' : ''}>2 · KYC & documents</span>
      </div>
      {step === 1 ? (
        <form onSubmit={next} noValidate>
          <div className="field">
            <label htmlFor="signupName">Your full name *</label>
            <div className="ctl">{USER}<input type="text" id="signupName" placeholder="e.g. Manish Shah" value={f.name} onChange={set('name')} /></div>
          </div>
          <div className="field-grid">
            <div className="field"><label htmlFor="signupEmail">Email address *</label><input type="email" id="signupEmail" placeholder="you@agency.com" autoComplete="email" value={f.email} onChange={set('email')} /></div>
            <div className="field"><label htmlFor="signupPhone">Mobile number *</label><input type="tel" id="signupPhone" placeholder="+91 98XXX XXXXX" autoComplete="tel" value={f.phone} onChange={set('phone')} /></div>
            <div className="field"><label htmlFor="signupAgency">Agency / trade name</label><input id="signupAgency" placeholder="e.g. Horizon Overseas" value={f.agency} onChange={set('agency')} /></div>
            <div className="field"><label htmlFor="signupCity">City *</label><input type="text" id="signupCity" placeholder="e.g. Vadodara" value={f.city} onChange={set('city')} /></div>
            <div className="field">
              <label htmlFor="signupZone">Zone *</label>
              <select id="signupZone" value={f.zone} onChange={set('zone')}>
                <option value="">Select zone</option><option value="NORTH">North</option><option value="SOUTH">South</option><option value="EAST">East</option><option value="WEST">West</option>
              </select>
            </div>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn btn-green btn-block btn-lg" style={{ marginTop: '.4rem' }}>Continue</button>
          <p className="muted" style={{ fontSize: '.8rem', marginTop: '.6rem' }}>No password yet: you'll set one after signing your partner agreement.</p>
        </form>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="muted" style={{ marginBottom: '.8rem' }}>How do you work with UniVerse?</p>
          <KycFields v={k} set={setK} files={files} setFiles={setFiles} states={meta.states} entityTypes={meta.entityTypes} />
          {error ? <p className="form-error">{error}</p> : null}
          <div className="apply-actions">
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => { setError(''); setStep(1); }}>Back</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={busy || !k.type}>{busy ? 'Submitting…' : 'Submit application'}</button>
          </div>
        </form>
      )}
    </>
  );
}

/** Opened from the agreement email: /sign-agreement?token=… */
export function SignAgreement() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [info, setInfo] = useState<Awaited<ReturnType<typeof api.agreementByToken>> | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ email: string; setPasswordToken: string } | null>(null);
  useEffect(() => {
    document.title = 'Sign your partner agreement | UniVerse';
    if (!token) return setError('This link is incomplete. Open the link from your email again.');
    api.agreementByToken(token).then(setInfo).catch((e) => setError(e.message));
    api.agreementPdfByToken(token).then(setPdf).catch(() => {});
  }, [token]);

  return (
    <div className="sign-page">
      <header className="sign-head"><Link to="/"><img src={LOGO} alt="UniVerse" /></Link></header>
      <main className="sign-card">
        {done ? (
          <div className="apply-done">
            <div className="apply-done-ic">{CHECK}</div>
            <h3>Agreement signed. Welcome to UniVerse!</h3>
            <p>Your account is active. We've emailed the signed copy details and a link to set your password to <b>{done.email}</b>. You can also set it right now.</p>
            <Link to={`/reset-password?token=${encodeURIComponent(done.setPasswordToken)}&welcome=1`} className="btn btn-primary btn-block btn-lg" style={{ marginTop: '1rem' }}>Set your password</Link>
          </div>
        ) : error ? (
          <div className="apply-done"><h3>We couldn't open this agreement</h3><p className="muted">{error}</p></div>
        ) : !info ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <>
            <h1>Channel Partner Agreement</h1>
            <p className="muted">Agreement {info.number} · version {info.version} · for {info.party.legalName}. Read it in full, then sign below. The link works until {new Date(info.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.</p>
            <AgreementSigner pdfUrl={pdf} defaultName={info.party.signatory} onSign={async (b) => {
              const r = await api.signByToken(token, b);
              setDone({ email: r.email, setPasswordToken: r.setPasswordToken });
            }} />
          </>
        )}
      </main>
    </div>
  );
}

/** Opened from the reset email: /reset-password?token=… */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const welcome = params.get('welcome') === '1';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { document.title = welcome ? 'Set your password | UniVerse' : 'Choose a new password | UniVerse'; }, [welcome]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={welcome ? 'One last step' : 'Choose a new password'}
      sub="Pick something you don't use anywhere else."
      points={welcome
        ? ['At least 8 characters', 'Works on the website and in the UniVerse app', 'The link can be used once, within 7 days']
        : ['At least 8 characters', 'Works on the website and in the app', 'The link can be used once, within 30 minutes']}
    >
      <div className="top"><img src={LOGO} alt="UniVerse" /></div>
      <h2>{welcome ? 'Set your password' : 'Reset password'}</h2>
      {done ? (
        <>
          <p className="muted">{welcome ? 'Your password is set. Sign in with your email and this password on the website and in the app.' : 'Your password has been changed. You can sign in with it on the website and in the app.'}</p>
          <Link to="/partner-login" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '1rem' }}>Sign in</Link>
        </>
      ) : !token ? (
        <p className="muted">This link is incomplete. Open the link from your email again, or ask for a new one from the sign-in page.</p>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="np">New password</label>
            <div className="ctl">{LOCK}<input type="password" id="np" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></div>
          </div>
          <div className="field">
            <label htmlFor="np2">Confirm new password</label>
            <div className="ctl">{LOCK}<input type="password" id="np2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export function PartnerLogin() {
  const { agent } = useAuth();
  useEffect(() => { document.title = 'Partner Login | UniVerse'; }, []);
  if (agent) return <Navigate to="/dashboard" replace />;
  return (
    <AuthShell
      title="Welcome back to UniVerse"
      sub="Check pipelines, payouts and new services in one place."
      points={['Student records that are never shared', 'Live case tracking across 9 services', 'Wallet payouts withdrawable anytime']}
    >
      <div className="top"><img src={LOGO} alt="UniVerse" /></div>
      <h2>Partner Login</h2>
      <p className="muted">Sign in to your UniVerse dashboard</p>
      <SignInForm cta="Sign in to Dashboard" />
      <p className="auth-alt">New to UniVerse? <Link to="/agent-login?tab=signup">Become a partner →</Link></p>
    </AuthShell>
  );
}

export function AgentLogin() {
  const { agent } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'signup' ? 'signup' : 'login';
  useEffect(() => { document.title = 'Agent Portal: Login & Sign Up | UniVerse'; }, []);
  if (agent) return <Navigate to="/dashboard" replace />;

  return (
    <AuthShell
      title="Your student's journey, our universe."
      sub={`${STATS.partners > 1 ? `Join ${STATS.partners} consultants earning` : 'Earn'} on ${STATS.services} study-abroad services, from loans to landing kits.`}
      points={['Verified and agreement sent within 48 hours', 'Dedicated relationship manager', 'Commission on every completed service']}
    >
      <div className="top"><img src={LOGO} alt="UniVerse" /></div>
      <div className="auth-tabs" role="tablist">
        <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} type="button" onClick={() => setParams({})}>Sign In</button>
        <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} type="button" onClick={() => setParams({ tab: 'signup' })}>Sign Up</button>
      </div>
      {tab === 'login' ? (
        <div className="auth-pane active" key="login">
          <h2>Agent Login</h2>
          <p className="muted">Access your referrals, tracking & wallet</p>
          <SignInForm cta="Sign In to Dashboard" />
        </div>
      ) : (
        <div className="auth-pane active" key="signup">
          <h2>Agent Registration</h2>
          <p className="muted">Apply in two short steps: your details, then KYC</p>
          <SignUpForm />
          <p className="auth-alt">You sign the Channel Partner Agreement online once we verify your details.</p>
        </div>
      )}
    </AuthShell>
  );
}
