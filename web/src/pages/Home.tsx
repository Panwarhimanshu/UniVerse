import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Counter, Flag, ServiceCard, ServiceQuickModal, SiteFooter, SiteNav, Svg } from '../components/site';
import { destinationFlags } from '../data/flags';
import { ICONS } from '../data/services';
import { SITE, STATS, visibleServices } from '../lib/content';
import { useReveal } from '../lib/hooks';
import { useHead } from '../lib/seo';
import { HOME_FAQ, HOME_GUIDE } from '../data/seoContent';

/* ---------- hero typewriter ---------- */
const WORDS = ['Student Finance', 'Study Visas', 'Student Banking', 'Student Travel', 'Student Housing', 'Student Wellness'];
function Typewriter() {
  const [text, setText] = useState(WORDS[0]);
  useEffect(() => {
    let wi = 0, ci = WORDS[0].length, erasing = false, timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = WORDS[wi];
      if (!erasing) {
        if (ci < word.length) { ci++; setText(word.slice(0, ci)); timer = setTimeout(tick, 70); }
        else { erasing = true; timer = setTimeout(tick, 1700); }
      } else if (ci > 0) { ci--; setText(word.slice(0, ci)); timer = setTimeout(tick, 38); }
      else { wi = (wi + 1) % WORDS.length; erasing = false; timer = setTimeout(tick, 420); }
    };
    timer = setTimeout(tick, 2900);
    return () => clearTimeout(timer);
  }, []);
  return <span id="typeTarget">{text || ' '}</span>;
}

/* ---------- how it works ---------- */
const HIW = [
  { h: 'Register as a partner', p: 'Sign up with your agency details, pick your zone and get verified, usually the same day.', img: 'hiw-1.jpg', big: 'Onboard in minutes', small: 'KYC-verified partner account with a dedicated relationship manager from day one.' },
  { h: 'Share the student requirement', p: 'Submit the case through your encrypted dashboard. Ring-fenced. Never visible to another consultant.', img: 'hiw-2.jpg', big: 'Your data stays yours', small: 'Ring-fenced student records with bank-grade encryption. We are a service provider, never a competing recruiter.' },
  { h: 'We coordinate the vendors', p: 'Specialist teams handle banks, insurers, telcos and landlords while you track everything live.', img: 'hiw-3.jpg', big: 'We do the legwork', small: 'One specialist desk per service liaises directly with CIBC, Expatrio, Flywire, Medibank and 50+ more partners.' },
  { h: 'Track, complete & get paid', p: 'Commission hits your UniVerse wallet on the payout trigger. Withdraw to your bank, anytime.', img: 'hiw-4.jpg', big: 'Paid on completion', small: 'Clear payout triggers (a funded GIC, a disbursed loan, an activated SIM) credited to your wallet automatically.' },
];

function HowItWorks() {
  const [cur, setCur] = useState(0);
  const [cycle, setCycle] = useState(0); // restarts the progress bar animation
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const restart = () => {
    clearInterval(timer.current);
    timer.current = setInterval(() => { setCur((c) => (c + 1) % HIW.length); setCycle((n) => n + 1); }, 5400);
  };
  useEffect(() => { restart(); return () => clearInterval(timer.current); }, []);
  const go = (i: number) => { setCur(i); setCycle((n) => n + 1); restart(); };

  return (
    <div className="hiw">
      <div className="hiw-steps reveal">
        {HIW.map((s, i) => (
          <button key={i} className={`hiw-step${i === cur ? ' active' : ''}`} type="button" onClick={() => go(i)}>
            <span className="bar" key={i === cur ? cycle : undefined}></span>
            <span className="hiw-num">{i + 1}</span>
            <span><h3>{s.h}</h3><p>{s.p}</p></span>
          </button>
        ))}
      </div>
      <div className="hiw-visual reveal" data-d="1">
        <div className="hiw-stage">
          <img className="u-watermark" src="/img/universe-mark.png" alt="" />
          {HIW.map((s, i) => (
            <div key={i} className={`hiw-pane${i === cur ? ' active' : ''}`}>
              <div className="hiw-fig"><img src={`/img/${s.img}`} alt="" loading="lazy" /></div>
              <span className="big">{s.big}</span>
              <span className="small">{s.small}</span>
            </div>
          ))}
          <div className="hiw-dots">
            {HIW.map((_, i) => <button key={i} className={`hiw-dot${i === cur ? ' active' : ''}`} aria-label={`Step ${i + 1}`} onClick={() => go(i)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- illustrations ---------- */
const VAULT_SVG = `<svg viewBox="0 0 300 300" fill="none"><defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#21BFD3" stop-opacity=".65"/><stop offset="1" stop-color="#47B378" stop-opacity=".65"/></linearGradient></defs><circle class="ring" cx="150" cy="150" r="122" stroke="rgba(123,215,149,.4)" stroke-width="1.5" stroke-dasharray="3 11" stroke-linecap="round"/><circle class="ring2" cx="150" cy="150" r="88" stroke="rgba(120,190,255,.42)" stroke-width="1.5" stroke-dasharray="2 8" stroke-linecap="round"/><g class="shld"><path d="M150 92l58 23v44c0 42-25 65-58 77-33-12-58-35-58-77v-44l58-23z" fill="url(#vg)" stroke="rgba(255,255,255,.32)" stroke-width="2"/><path d="M140 148v-9a10 10 0 0 1 20 0v9" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="131" y="148" width="38" height="32" rx="8" fill="#fff"/><circle cx="150" cy="163" r="4.5" fill="#1453A5"/></g></svg>`;
const WHY = [
  { h: 'Single-window platform', p: 'Finance, banking, insurance, travel, housing and telecom: one portfolio, one login, one relationship manager.', d: 1,
    art: `<svg viewBox="0 0 200 90"><rect x="12" y="8" width="176" height="74" rx="10" fill="#fff" stroke="#D5E2EF" stroke-width="2"/><rect x="12" y="8" width="176" height="18" rx="10" fill="#1453A5" opacity=".12"/><circle cx="26" cy="17" r="3.4" fill="#1453A5"/><circle cx="39" cy="17" r="3.4" fill="#47B378"/><circle cx="52" cy="17" r="3.4" fill="#A9C0D6"/><rect class="wbar" x="26" y="38" width="70" height="8" rx="4" fill="#1453A5"/><rect class="wbar b2" x="26" y="52" width="112" height="8" rx="4" fill="#47B378"/><rect class="wbar b3" x="26" y="66" width="88" height="8" rx="4" fill="#A9C0D6"/><rect class="wbar b4" x="146" y="38" width="30" height="36" rx="7" fill="#E7F0FA" stroke="#1453A5" stroke-opacity=".35"/></svg>` },
  { h: 'Faster turnaround', p: 'Structured coordination with banks and insurers cuts TAT so students clear every service before the visa deadline.', d: 2,
    art: `<svg viewBox="0 0 200 90"><circle class="glow" cx="102" cy="45" r="26" fill="#47B378" opacity=".14"/><polygon points="108 10 84 44 100 44 94 78 126 38 108 38" fill="#1453A5"/><line class="speed" x1="16" y1="30" x2="58" y2="30" stroke="#1453A5" stroke-linecap="round" stroke-width="5"/><line class="speed s2" x1="8" y1="46" x2="48" y2="46" stroke="#47B378" stroke-linecap="round" stroke-width="5"/><line class="speed s3" x1="16" y1="62" x2="58" y2="62" stroke="#1453A5" stroke-linecap="round" stroke-width="5" opacity=".5"/></svg>` },
  { h: 'Transparent tracking', p: 'Live status, payout triggers and audit trails on every case: manage student expectations with confidence.', d: 0,
    art: `<svg viewBox="0 0 200 90"><line x1="30" y1="78" x2="180" y2="78" stroke="#CBD9E8" stroke-width="2"/><rect class="chart-bar" x="50" y="46" width="24" height="32" rx="6" fill="#B9CBE0"/><rect class="chart-bar c2" x="92" y="30" width="24" height="48" rx="6" fill="#21BFD3"/><rect class="chart-bar c3" x="134" y="14" width="24" height="64" rx="6" fill="#47B378"/><polyline class="trend-line" points="42,40 98,22 156,8" fill="none" stroke="#0B4E97" stroke-width="2.5" stroke-linecap="round"/></svg>` },
  { h: 'Destinations covered', p: 'Every country you can refer students to, under one roof.', d: 1,
    art: `<svg viewBox="0 0 200 90"><circle cx="100" cy="45" r="30" fill="#E7F0FA" stroke="#1453A5" stroke-width="2"/><ellipse cx="100" cy="45" rx="12" ry="30" fill="none" stroke="#1453A5" stroke-opacity=".4" stroke-width="1.6"/><line x1="70" y1="45" x2="130" y2="45" stroke="#1453A5" stroke-opacity=".4" stroke-width="1.6"/><g class="orbitg"><circle cx="100" cy="45" r="42" fill="none" stroke="#47B378" stroke-dasharray="3 7" stroke-width="1.6"/><circle cx="142" cy="45" r="4.5" fill="#47B378"/></g></svg>` },
  { h: 'Dedicated support', p: 'A named relationship manager plus a service desk that answers within the same business day, in English, Hindi or Gujarati.', d: 2,
    art: `<svg viewBox="0 0 200 90"><circle cx="84" cy="36" r="12" fill="#21BFD3"/><path d="M62 78c2-20 12-30 22-30s20 10 22 30" fill="#D9E7F5"/><circle cx="126" cy="32" r="10" fill="#47B378"/><path d="M108 76c2-16 10-24 18-24s16 8 18 24" fill="#DFF3E4"/><rect x="126" y="6" width="58" height="24" rx="9" fill="#fff" stroke="#CBD9E8" stroke-width="1.6"/><circle class="chatdot" cx="140" cy="18" r="3.4" fill="#1453A5"/><circle class="chatdot d2" cx="153" cy="18" r="3.4" fill="#47B378"/><circle class="chatdot d3" cx="166" cy="18" r="3.4" fill="#1453A5"/><circle class="pulsering" cx="84" cy="36" r="16" fill="none" stroke="#21BFD3" stroke-width="2"/></svg>` },
];

const MARQUEE_1 = [['CIBC', 'Canada GIC'], ['BMO', 'Canada GIC'], ['ICICI Bank Canada', 'Canada GIC'], ['Beacon Money', 'Canada GIC'], ['Expatrio', 'Blocked Account'], ['Flywire', 'Fee Payment'], ['Convera', 'Remittance'], ['PayMyTuition', 'Fee Payment'], ['TransferMate', 'Fee Payment'], ['SBI', 'Education Loan'], ['Bank of Baroda', 'Education Loan'], ['Punjab National Bank', 'Education Loan'], ['Union Bank', 'Education Loan'], ['Axis Bank', 'Education Loan'], ['ICICI Bank', 'Education Loan']];
const MARQUEE_2 = [['IDFC First Bank', 'Education Loan'], ['HDFC Credila', 'Education Loan'], ['Avanse', 'Education Loan'], ['Auxilo', 'Education Loan'], ['Tata Capital', 'Education Loan'], ['Prodigy Finance', 'Education Loan'], ['EbixCash', 'Forex Card'], ['Thomas Cook', 'Forex Card'], ['Allianz Care', 'Insurance'], ['ICICI Lombard', 'Insurance'], ['Tata AIG', 'Insurance'], ['Medibank', 'OSHC'], ['nib', 'OSHC'], ['Vodafone', 'SIM Card'], ['Rogers', 'SIM Card'], ['Telus', 'SIM Card']];
const MONO: Record<string, string> = { CIBC: 'CI', BMO: 'BM', 'ICICI Bank Canada': 'IC', 'Beacon Money': 'BE', Expatrio: 'EX', Flywire: 'FL', Convera: 'CO', PayMyTuition: 'PM', TransferMate: 'TM', SBI: 'SB', 'Bank of Baroda': 'BB', 'Punjab National Bank': 'PN', 'Union Bank': 'UB', 'Axis Bank': 'AX', 'ICICI Bank': 'IB', 'IDFC First Bank': 'ID', 'HDFC Credila': 'HC', Avanse: 'AV', Auxilo: 'AU', 'Tata Capital': 'TC', 'Prodigy Finance': 'PF', EbixCash: 'EB', 'Thomas Cook': 'TH', 'Allianz Care': 'AL', 'ICICI Lombard': 'IL', 'Tata AIG': 'TA', Medibank: 'ME', nib: 'NI', Vodafone: 'VO', Rogers: 'RO', Telus: 'TE' };

const MAIL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
const PHONE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

const ORBIT = [
  ['Education Loan', ICONS.loan], ['Canada GIC', ICONS.gic], ['Blocked A/C', ICONS.blocked],
  ['Forex & Fees', ICONS.remit], ['Insurance', ICONS.insurance], ['Housing', ICONS.housing],
];

export default function Home() {
  const [cat, setCat] = useState<'all' | 'vas' | 'coaching' | 'application'>('all');
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState<string | null>(null);
  useReveal([cat, q]);

  useHead('/');

  const term = q.trim().toLowerCase();
  const vas = visibleServices().filter((s) => (cat === 'all' || cat === 'vas') && (!term || `${s.name} ${s.cardText} ${s.tat}`.toLowerCase().includes(term)));
  const soon = [
    { cat: 'coaching', title: 'Coaching Services', img: 'svc-coaching.jpg', text: 'IELTS, PTE & Duolingo prep with certified trainers, mock analytics and band-score guarantees.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
    { cat: 'application', title: 'Application Services', img: 'svc-apply.jpg', text: 'University shortlisting, applications, SOP/LOR guidance and end-to-end offer management.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 13l2 2 4-4"/></svg>' },
  ].filter((s) => (cat === 'all' || cat === s.cat) && (!term || `${s.title} ${s.text}`.toLowerCase().includes(term)));

  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <SiteNav home />

      <main id="main">
        {/* ============ HERO ============ */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="hero-badge reveal"><span className="pulse"></span>B2B STUDY ABROAD SERVICES MARKETPLACE FOR CONSULTANTS</span>
              <h1 className="reveal" data-d="1">
                <span className="hl-line">One platform for every</span>
                <span className="hl-line hl-dyn"><Typewriter /><span className="type-caret" aria-hidden="true"></span></span>
                <span className="hl-line">service your students need.</span>
              </h1>
              <p className="hero-sub reveal" data-d="2">UniVerse is the B2B study abroad services platform for education consultants and immigration agents in India. Education loans, Canada GIC, German blocked accounts, fee remittance, forex, insurance, OSHC, housing and SIM cards, with commission on every completed service. Your student data stays yours and is never shared with a competing consultant.</p>
              <div className="hero-cta reveal" data-d="3">
                <Link to="/agent-login?tab=signup" className="btn btn-primary btn-lg">Start Partnering <span className="arr">→</span></Link>
                <a href="#services" className="btn btn-light btn-lg">Explore Services</a>
              </div>
              <div className="hero-flags reveal" data-d="4" aria-label="Destinations we serve">
                <span className="hf-label">Where Indian students fly</span>
                {destinationFlags(STATS.destinations).map(([c, n]) => <span className="flagchip" key={n}>{c ? <Flag code={c} /> : null}{n}</span>)}
              </div>
              <div className="hero-stats reveal" data-d="5">
                <div className="hstat"><div className="num"><Counter to={STATS.services} /></div><div className="lbl">Live Services</div></div>
                <div className="hstat"><div className="num"><Counter to={STATS.deliveryPartners} /></div><div className="lbl">Delivery Partners</div></div>
                <div className="hstat"><div className="num"><Counter to={STATS.destinations.length} /></div><div className="lbl">Countries Served</div></div>
                {STATS.students ? <div className="hstat"><div className="num"><Counter to={STATS.students} /></div><div className="lbl">Students Referred</div></div> : null}
              </div>
            </div>

            <div className="orbit-visual reveal" data-d="2" aria-hidden="true">
              <div className="orbit-stage">
                <div className="orbit-ring r1"></div>
                <div className="orbit-ring r2"></div>
                <div className="orbit-ring r3"></div>
                <div className="orbit-core"><img src="/img/universe-mark.png" alt="UniVerse" /></div>
                <div className="orbit-sat">
                  {ORBIT.map(([label, icon], i) => (
                    <div className="orb-chip" key={label} style={{ ['--a' as string]: `${i * 60}deg`, ['--r' as string]: '228px' }}>
                      <span>{label}<Svg html={icon} /></span>
                    </div>
                  ))}
                </div>
                <div className="float-card fc1"><b>CAD 23,448</b><i>GIC funded <span className="ok">· complete</span></i></div>
                <div className="float-card fc2"><b>Commission credited</b><i>Partner wallet <span className="ok">· on completion</span></i></div>
                <div className="float-card fc3"><b>OSHC issued</b><i>Same-day certificate <span className="ok">· done</span></i></div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SERVICES ============ */}
        <section className="section alt" id="services">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">The Marketplace</span>
              <h2>All Value Added Services. One login. Zero vendor chaos.</h2>
              <p>Everything an outbound student needs between admission and arrival, with coaching & application services joining soon, and your commission credited on completion.</p>
            </div>
            <div className="svc-toolbar reveal">
              <div className="svc-filters">
                {([['all', 'All'], ['vas', 'Value Added Services'], ['coaching', 'Coaching Services'], ['application', 'Application Services']] as const).map(([k, l]) => (
                  <button key={k} className={`chip-btn${cat === k ? ' active' : ''}`} onClick={() => setCat(k)}>{l}</button>
                ))}
              </div>
              <div className="svc-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a service…" aria-label="Search services" />
              </div>
            </div>

            <div className="svc-grid" id="svcGrid">
              {vas.map((s, i) => <ServiceCard key={s.key} s={s} d={i % 3} onQuick={setQuick} />)}
              {soon.map((s, i) => (
                <article key={s.cat} className={`svc-card${i ? ' g' : ''} soon reveal in`} aria-label={`${s.title} (coming soon)`}>
                  <div className="svc-media">
                    <img src={`/img/${s.img}`} alt={`${s.title} illustration`} loading="lazy" />
                    <span className="cat-tag">{s.title}</span>
                  </div>
                  <div className="svc-body">
                    <div className="svc-icon"><Svg html={s.icon} /></div>
                    <h3>{s.title} <span className="soon-pill">Coming soon</span></h3>
                    <p>{s.text}</p>
                    <div className="svc-meta"><span className="pill tat">In the pipeline</span></div>
                  </div>
                </article>
              ))}
              {!vas.length && !soon.length ? (
                <div className="svc-empty" style={{ display: 'block' }}>No services match your search. Try “loan”, “forex” or “housing”.</div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="section" id="how">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">How It Works</span>
              <h2>From referral to payout in four steps</h2>
              <p>A transparent pipeline built for consultants and education agents.</p>
            </div>
            <HowItWorks />
          </div>
        </section>

        {/* ============ WHY UNIVERSE ============ */}
        <section className="section alt" id="why">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">Why UniVerse</span>
              <h2>Built around consultants' biggest concerns</h2>
              <p>Your student's journey, our universe, and your data vault.</p>
            </div>
            <WhyBento />
          </div>
        </section>

        {/* ============ COVERAGE ============ */}
        <section className="section" id="coverage">
          <div className="container">
            <div className="cov-band reveal">
              <div>
                <h2>Wherever your students fly, we're already there.</h2>
                <p>Loans, remittance and insurance span all {STATS.destinations.length} destinations; country-specific products like GIC, blocked accounts and OSHC activate per market.</p>
                <div className="cov-stats">
                  <div className="cov-stat"><b><Counter to={STATS.destinations.length} /></b><span>Destinations</span></div>
                  <div className="cov-stat"><b><Counter to={STATS.deliveryPartners} /></b><span>Delivery partners</span></div>
                  {STATS.completedCases
                    ? <div className="cov-stat"><b><Counter to={STATS.completedCases} /></b><span>Services completed</span></div>
                    : <div className="cov-stat"><b><Counter to={STATS.services} /></b><span>Live services</span></div>}
                </div>
              </div>
              <div className="cov-chips">
                {destinationFlags(STATS.destinations).map(([c, n]) => <span className="cov-chip" key={n}>{c ? <Flag code={c} /> : null}{n}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* ============ PARTNERS ============ */}
        <section className="section alt" id="partners" style={{ paddingBottom: 56 }}>
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">Delivery Partners</span>
              <h2>Powered by {STATS.deliveryPartners} delivery partners</h2>
              <p>Banks, insurers, payment platforms and telcos delivering every service behind the scenes.</p>
            </div>
          </div>
          <div className="marquee-zone reveal">
            {[MARQUEE_1, MARQUEE_2].map((row, ri) => (
              <div className={`marquee${ri ? ' rev' : ''}`} key={ri}>
                {[...row, ...row].map(([n, t], i) => (
                  <div className="m-card" key={i}><span className="m-logo">{MONO[n]}</span><span className="m-meta"><b>{n}</b><span>{t}</span></span></div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ============ GUIDE ============ */}
        <section className="section alt" id="guide">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">For Consultants</span>
              <h2>Study abroad value added services, explained</h2>
              <p>What students need between the offer letter and arrival, and how your consultancy earns on each service.</p>
            </div>
            <div className="seo-guide">
              {HOME_GUIDE.map((g, i) => (
                <article className="seo-guide-card reveal" data-d={i || undefined} key={g.h}>
                  <h3>{g.h}</h3>
                  <p>{g.p}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="section" id="faq">
          <div className="container">
            <div className="sec-head reveal">
              <span className="eyebrow">FAQ</span>
              <h2>Questions consultants ask first</h2>
              <p>Partnering with UniVerse, and the 2026 rules your students ask about.</p>
            </div>
            <div className="faq-wrap">
              {HOME_FAQ.map((f, i) => (
                <details className="faq reveal" data-d={i % 3 || undefined} key={f.q} open={i === 0}>
                  <summary>{f.q}<span className="x">＋</span></summary>
                  <div className="faq-body">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="section" id="contact" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-wrap reveal">
              <div className="cta-inner">
                <h2>Ready to grow your consultancy?</h2>
                <p>{STATS.partners > 1 ? `Join ${STATS.partners} immigration consultants earning` : 'Earn'} on every service your students need. Onboarding takes minutes, and your relationship manager calls within the day.</p>
                <div className="cta-actions">
                  <Link to="/agent-login?tab=signup" className="btn btn-green btn-lg">Become a Partner <span className="arr">→</span></Link>
                  <Link to="/partner-login" className="btn btn-light btn-lg">Partner Login</Link>
                </div>
                <div className="cta-contact">
                  <span>Prefer to talk?</span>
                  <a href={`mailto:${SITE.supportEmail}`}><Svg html={MAIL} /> {SITE.supportEmail}</a>
                  <a href={`tel:${SITE.supportPhone.replace(/[^\d+]/g, '')}`}><Svg html={PHONE} /> {SITE.supportPhone}</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <ServiceQuickModal svcKey={quick} onClose={() => setQuick(null)} />
    </>
  );
}

/* ---------- why-universe bento with cursor spotlight + tilt ---------- */
function WhyBento() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onMove = (tilt: boolean) => (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    if (tilt) el.style.transform = `perspective(700px) rotateX(${(-(y - 0.5) * 5).toFixed(2)}deg) rotateY(${((x - 0.5) * 5).toFixed(2)}deg) translateY(-5px)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = ''; };

  return (
    <div className="why-bento">
      <article className="why-card vault reveal" onMouseMove={onMove(false)}>
        <div className="vault-scene" aria-hidden="true"><Svg html={VAULT_SVG} /></div>
        <div className="vault-pills"><span className="pill">AES-256 encryption</span><span className="pill">TLS 1.3</span><span className="pill">ISO-grade audit trails</span></div>
        <h3>Ring-fenced student data</h3>
        <p>Records you submit are locked to your account and never shared with another consultant. Bank-grade encryption at rest and in transit. UniVerse is a service provider, never a competing recruiter.</p>
      </article>
      {WHY.map((w) => (
        <article key={w.h} className="why-card reveal" data-d={w.d || undefined} onMouseMove={onMove(true)} onMouseLeave={onLeave}>
          <div className="why-art" aria-hidden="true"><Svg html={w.art} /></div>
          <h3>{w.h}</h3><p>{w.p}</p>
        </article>
      ))}
    </div>
  );
}
