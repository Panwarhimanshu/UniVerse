import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SITE, STATS } from '../lib/content';
import { useToast } from '../lib/toast';

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
        <a href="#" onClick={(e) => { e.preventDefault(); setForgot(!forgot); }}>Forgot password?</a>
      </div>
      {forgot ? (
        <p className="auth-help">
          Call your relationship manager or write to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> from your registered email.
          We'll send you a temporary password. Team members can ask their account owner to set a new one.
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : cta}</button>
    </form>
  );
}

function SignUpForm() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', zone: '', city: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !f.zone) return setError('Fill in all required fields');
    if (f.password.length < 8) return setError('Password must be at least 8 characters');
    if (f.password !== f.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const { token, agent } = await api.register({ name: f.name, email: f.email.trim(), phone: f.phone, zone: f.zone, city: f.city, password: f.password });
      signIn(token, agent);
      toast('Your partner account is ready.');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="signupName">Full name / agency name *</label>
        <div className="ctl">{USER}<input type="text" id="signupName" placeholder="e.g. Horizon Overseas" value={f.name} onChange={set('name')} /></div>
      </div>
      <div className="field-grid">
        <div className="field"><label htmlFor="signupEmail">Email address *</label><input type="email" id="signupEmail" placeholder="you@agency.com" autoComplete="email" value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="signupPhone">Phone number *</label><input type="tel" id="signupPhone" placeholder="+91 98XXX XXXXX" autoComplete="tel" value={f.phone} onChange={set('phone')} /></div>
        <div className="field">
          <label htmlFor="signupZone">Zone *</label>
          <select id="signupZone" value={f.zone} onChange={set('zone')}>
            <option value="">Select zone</option><option value="NORTH">North</option><option value="SOUTH">South</option><option value="EAST">East</option><option value="WEST">West</option>
          </select>
        </div>
        <div className="field"><label htmlFor="signupCity">City</label><input type="text" id="signupCity" placeholder="e.g. Vadodara" value={f.city} onChange={set('city')} /></div>
        <div className="field"><label htmlFor="signupPassword">Create password *</label><input type="password" id="signupPassword" placeholder="Min. 8 characters" autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
        <div className="field"><label htmlFor="signupConfirmPassword">Confirm password *</label><input type="password" id="signupConfirmPassword" placeholder="Repeat password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn-green btn-block btn-lg" style={{ marginTop: '.4rem' }} disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
    </form>
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
      points={['Same-day partner verification', 'Dedicated relationship manager', 'Commission on every completed service']}
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
          <p className="muted">Create your partner account in a minute</p>
          <SignUpForm />
          <p className="auth-alt">By signing up you agree to our partner terms &amp; data policy.</p>
        </div>
      )}
    </AuthShell>
  );
}
