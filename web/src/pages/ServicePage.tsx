import { Link, Navigate, useParams } from 'react-router-dom';
import { BlogItem, ServiceCard, SiteFooter, SiteNav, Svg } from '../components/site';
import { BLOGS, fmtBlogDate } from '../data/blogs';
import { monogram, serviceByKey } from '../data/services';
import { useReveal } from '../lib/hooks';
import { serviceSeo, useHead } from '../lib/seo';

const KPI_ICONS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14 15 10"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
];
const STEP_ICONS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.6" y1="16.6" x2="21" y2="21"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11.5 11 13.5 15 9.5"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>',
];

export default function ServicePage() {
  const { key = '' } = useParams();
  const s = serviceByKey(key);
  useReveal([key]);
  useHead(`/services/${key}`, [s?.name]);

  if (!s || s.hidden) return <Navigate to="/" replace />;
  const seo = serviceSeo(s.key);
  const blogs = BLOGS[s.key] ?? [];

  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <SiteNav />
      <main id="main">
        {/* ===== HERO ===== */}
        <section className="svc-hero">
          <div className="container svc-hero-grid">
            <div>
              <nav className="crumbs reveal" aria-label="Breadcrumb">
                <Link to="/">Home</Link><span className="sep">/</span>
                <Link to="/#services">Services</Link><span className="sep">/</span>
                <span className="here">{s.name}</span>
              </nav>
              <span className="svc-cat reveal">Value Added Services · {s.sub} · {s.tat}</span>
              <h1 className="reveal grad-text" data-d="1" style={{ margin: '1rem 0 1rem' }}>{seo?.h1 ?? s.name}</h1>
              <p className="hero-sub reveal" data-d="2" style={{ marginBottom: '1.4rem' }}>{s.about}</p>
              <ul className="h-points reveal" data-d="3">{s.feats.slice(0, 3).map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="hero-cta reveal" data-d="4">
                <Link to="/partner-login" className="btn btn-primary btn-lg">Refer a Student <span className="arr">→</span></Link>
                <a href="#journey" className="btn btn-light btn-lg">How it works</a>
              </div>
            </div>
            <div className="svc-art reveal" data-d="2">
              <div className="frame"><img src={`/img/${s.img}`} alt={`${s.name}: creative illustration`} /></div>
              <div className="float-card fc1"><b>{s.kpis[0][0]}</b><i>{s.kpis[0][1]} <span className="ok">· {s.tat}</span></i></div>
              <div className="float-card fc2"><b>{s.kpis[2][0]}</b><i>{s.kpis[2][1]} <span className="ok">· payout trigger</span></i></div>
            </div>
          </div>
        </section>

        {/* ===== KPI STRIP ===== */}
        <section className="section" style={{ paddingTop: 0, paddingBottom: 56 }}>
          <div className="container">
            <div className="kpi-row">
              {s.kpis.map(([v, l], i) => (
                <div className="kpi-card reveal" data-d={i || undefined} key={l}>
                  <span className="kpi-ic"><Svg html={KPI_ICONS[i]} /></span>
                  <span className="kc-tx"><b className={i === 1 ? 'g' : 'bl'}>{v}</b><span>{l}</span></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHY PARTNERS OFFER IT ===== */}
        <section className="section alt" id="details">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">Why Partners Offer It</span>
              <h2>What you get with {s.name}</h2>
              <p>{s.short}</p>
            </div>
            <div className="feat-grid">
              {s.feats.map((f, i) => <div className="feat reveal" data-d={i % 3 || undefined} key={f}>{f}</div>)}
            </div>
          </div>
        </section>

        {/* ===== GUIDE ===== */}
        {seo ? (
          <section className="section" id="guide">
            <div className="container">
              <div className="seo-article reveal">
                <span className="eyebrow">Guide · updated October 2026</span>
                <h2>{seo.guideHeading}</h2>
                {seo.guide.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </section>
        ) : null}

        {/* ===== PROCESS ===== */}
        <section className="section" id="journey">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">The Journey</span>
              <h2>From referral to payout</h2>
              <p>We run the coordination; you track every step live in your dashboard.</p>
            </div>
            <div className="steps-grid">
              {s.steps.map((st, i) => (
                <div className="step-card reveal" data-d={i} key={i}>
                  <span className="s-ic"><Svg html={STEP_ICONS[i]} /><span className="s-num">{i + 1}</span></span>
                  <p>{st}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PARTNERS ===== */}
        <section className="section alt">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">Delivered With</span>
              <h2>Trusted delivery partners</h2>
              <p>The institutions that make every {s.name} case land on time.</p>
            </div>
            <div className="vp-grid reveal">
              {s.partners.map((p, i) => (
                <div className="vp-card" key={p}><span className="vp-logo">{monogram(p)}</span><b>{p}</b><span>{s.partnerTypes[i]}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== INSIGHTS ===== */}
        {blogs.length ? (
          <section className="section" id="insights">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow">Insights & Updates</span>
                <h2>{s.name}: guides & market updates</h2>
                <p>Fresh reading for you and your students, published regularly by the UniVerse specialist desk.</p>
              </div>
              <div className="blog-list">
                {blogs.map((b, i) => (
                  <BlogItem key={b.t} tag={s.name} date={fmtBlogDate(b.d)} mins={b.mins} title={b.t} teaser={b.teaser} body={b.body} open={i === 0} foot d={i} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ===== FAQ ===== */}
        {seo ? (
          <section className="section alt" id="faq">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow">FAQ</span>
                <h2>{s.name}: frequently asked questions</h2>
              </div>
              <div className="faq-wrap">
                {seo.faqs.map((f, i) => (
                  <details className="faq reveal" data-d={i % 3 || undefined} key={f.q} open={i === 0}>
                    <summary>{f.q}<span className="x">＋</span></summary>
                    <div className="faq-body">{f.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ===== RELATED ===== */}
        <section className="section">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">Also In Your Universe</span>
              <h2>Related services partners bundle</h2>
            </div>
            <div className="svc-grid">
              {s.related.map((k) => serviceByKey(k)).filter((r) => r && !r.hidden).map((r) => <ServiceCard key={r!.key} s={r!} short />)}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-wrap reveal">
              <div className="cta-inner">
                <h2>Refer your first {s.name} case today</h2>
                <p>Onboarding takes minutes. Your relationship manager activates this service on your dashboard the same day.</p>
                <div className="cta-actions">
                  <Link to="/agent-login?tab=signup" className="btn btn-green btn-lg">Become a Partner <span className="arr">→</span></Link>
                  <Link to="/partner-login" className="btn btn-light btn-lg">Partner Login</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
