import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { flagSvg } from '../data/flags';
import { serviceByKey } from '../data/services';
import type { Service } from '../data/services';

const LOGO = '/img/universe-logo.png';

/* ---------- inline svg helpers ---------- */
export const Svg = ({ html, className }: { html: string; className?: string }) => (
  <span className={className} style={className ? undefined : { display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />
);
export const Flag = ({ code }: { code: string }) => <Svg html={flagSvg(code)} />;

const GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

/* ---------- navbar ---------- */
export function SiteNav({ home = false }: { home?: boolean }) {
  const [scrolled, setScrolled] = useState(!home);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!home) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [home]);

  const links = home
    ? [['#services', 'Services'], ['#how', 'How it works'], ['#why', 'Why UniVerse'], ['#partners', 'Partners'], ['#faq', 'FAQ']]
    : [['/', 'Home'], ['/#services', 'Services'], ['/#how', 'How it works'], ['/#partners', 'Partners'], ['/#faq', 'FAQ']];
  const A = ({ to, label }: { to: string; label: string }) =>
    to.startsWith('#') ? <a href={to} onClick={() => setOpen(false)}>{label}</a> : <Link to={to} onClick={() => setOpen(false)}>{label}</Link>;

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="UniVerse home"><img src={LOGO} alt="UniVerse logo" /></Link>
          <button className={`nav-toggle${open ? ' open' : ''}`} aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span></span><span></span><span></span>
          </button>
          <div className="nav-links">{links.map(([to, l]) => <A key={to} to={to} label={l} />)}</div>
          <div className="nav-cta">
            <Link to="/partner-login" className="btn btn-ghost btn-sm">Partner Login</Link>
            <Link to="/agent-login?tab=signup" className="btn btn-primary btn-sm">Become a Partner</Link>
          </div>
        </div>
      </nav>
      <div className={`mobile-menu${open ? ' open' : ''}`} id="mobileMenu">
        {links.map(([to, l]) => <A key={to} to={to} label={l} />)}
        <Link to="/partner-login" className="btn btn-ghost btn-block">Partner Login</Link>
        <Link to="/agent-login?tab=signup" className="btn btn-primary btn-block">Become a Partner</Link>
      </div>
    </>
  );
}

/* ---------- footer ---------- */
export function SiteFooter() {
  const S = (k: string, label: string) => <li><Link to={`/services/${k}`}>{label}</Link></li>;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src={LOGO} alt="UniVerse logo" />
            <p>UniVerse is a B2B marketplace for value added services, serving immigration consultants and education agents across the globe.</p>
          </div>
          <div>
            <h4>Funding & Forex</h4>
            <ul>{S('education-loans', 'Education Loans')}{S('fee-payments', 'Fee Payments')}{S('forex-card', 'Forex Cards')}</ul>
          </div>
          <div>
            <h4>Banking & Cover</h4>
            <ul>{S('canada-gic', 'Canada GIC')}{S('german-blocked-account', 'Blocked Account')}{S('insurance', 'Insurance')}{S('oshc-ovhc', 'OSHC / OVHC')}</ul>
          </div>
          <div>
            <h4>Arrival & Company</h4>
            <ul>
              {S('accommodation', 'Accommodation')}{S('sim-cards', 'SIM Cards')}
              <li><Link to="/partner-login">Partner Login</Link></li>
              <li><Link to="/agent-login?tab=signup">Become a Partner</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} UniVerse Pvt. Ltd. · Your student's journey, our universe!</p>
          <div className="socials">
            <a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="X">𝕏</a>
            <a href="#" aria-label="Instagram" className="gn">◉</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- service meta pills (tat + flags / globe) ---------- */
export function SvcMeta({ s, label = true }: { s: Service; label?: boolean }) {
  return (
    <div className="svc-meta">
      <span className="pill tat">{s.tat}</span>
      {s.globe ? (
        <span className="pill ctry globe"><Svg html={GLOBE} />All destinations</span>
      ) : (
        <span className="svc-flags">
          {s.flags.map((f) => <span key={f}><Flag code={f} /></span>)}
          {label && s.flagLabel ? <span className="fl-lab">{s.flagLabel}</span> : null}
        </span>
      )}
    </div>
  );
}

/* ---------- service card (home grid + related services) ---------- */
export function ServiceCard({ s, d = 0, onQuick, short = false }: { s: Service; d?: number; onQuick?: (k: string) => void; short?: boolean }) {
  return (
    <Link className={`svc-card${s.green ? ' g' : ''} reveal`} data-d={d || undefined} data-cat="vas" to={`/services/${s.key}`} aria-label={s.name}>
      <div className="svc-media">
        <img src={`/img/${s.img}`} alt={`${s.name} illustration`} loading="lazy" />
        {onQuick ? (
          <button className="qv" aria-label={`Quick view ${s.name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuick(s.key); }}>
            <Svg html={EYE} />
          </button>
        ) : (
          <span className="cat-tag">{s.sub}</span>
        )}
      </div>
      <div className="svc-body">
        <div className="svc-icon"><Svg html={s.icon} /></div>
        <h3>{s.name}</h3>
        <p>{short ? s.short : s.cardText}</p>
        <SvcMeta s={s} label={!short || s.flags.length > 1} />
        <span className="svc-link">Explore service <span className="arr">→</span></span>
      </div>
    </Link>
  );
}

/* ---------- quick-view modal (home page) ---------- */
export function ServiceQuickModal({ svcKey, onClose }: { svcKey: string | null; onClose: () => void }) {
  const s = svcKey ? serviceByKey(svcKey) : undefined;
  useEffect(() => {
    if (!s) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [s, onClose]);

  return (
    <div className={`modal-veil${s ? ' open' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {s ? (
          <>
            <div className="modal-hero">
              <button className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
              <div className="mi"><Svg html={s.icon} /></div>
              <h3>{s.name}</h3><p>{s.short}</p>
            </div>
            <div className="modal-body">
              <div className="m-kpis">{s.kpis.map(([v, l]) => <div className="m-kpi" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
              <div className="m-sec"><h4>About this service</h4><p style={{ fontSize: '.92rem', color: 'var(--ink)' }}>{s.about}</p></div>
              <div className="m-sec"><h4>What partners get</h4><ul className="m-feats">{s.feats.map((f) => <li key={f}>{f}</li>)}</ul></div>
              <div className="m-sec"><h4>How a case moves</h4><div className="m-steps">{s.steps.map((st, i) => <div className="m-step" key={i}><b>{i + 1}</b><span>{st}</span></div>)}</div></div>
              <div className="m-sec"><h4>Delivery partners</h4><div className="m-partners">{s.partners.map((p) => <span className="pill ctry" key={p}>{p}</span>)}</div></div>
              <div className="m-cta">
                <Link to={`/services/${s.key}`} className="btn btn-primary" onClick={onClose}>Open full service page <span className="arr">→</span></Link>
                <Link to="/agent-login" className="btn btn-ghost" onClick={onClose}>Refer a student</Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- animated count-up ---------- */
export function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(typeof window === 'undefined' ? to : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - t0) / 1400, 1);
        setVal(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{Math.round(val)}{suffix}</span>;
}

/* ---------- blog accordion list (service pages + What's New) ---------- */
export function BlogItem({ tag, date, mins, title, teaser, body, open, foot, isNew, d }: {
  tag: string; date: string; mins: number; title: string; teaser: string; body: string[]; open?: boolean; foot?: boolean; isNew?: boolean; d?: number;
}) {
  return (
    <details className={`blog-item${foot ? ' reveal' : ''}`} data-d={d || undefined} open={open}>
      <summary>
        <div className="bi-head">
          <div className="bi-meta">
            <span className="bi-tag">{tag}</span>
            {isNew ? <span className="bi-tag" style={{ color: 'var(--green-deep)', background: 'rgba(47,168,79,.12)' }}>New</span> : null}
            <span className="bi-date">{date}</span><span className="bi-dot">·</span><span className="bi-mins">{mins} min read</span>
          </div>
          <h3>{title}</h3>
          <p>{teaser}</p>
        </div>
        <span className="blog-x" aria-hidden="true">＋</span>
      </summary>
      <div className="bi-body">
        {body.map((p, i) => <p key={i}>{p}</p>)}
        {foot ? (
          <p className="bi-foot">Have a student case this applies to? <Link to="/partner-login">Log in and raise a request</Link> and the desk will pick it up the same day.</p>
        ) : null}
      </div>
    </details>
  );
}
