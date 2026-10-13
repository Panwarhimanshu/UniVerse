/* UniVerse — shared site interactions */
(function () {
  'use strict';

  /* ============ service catalogue data ============ */
  const ICONS = {
    loan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    gic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    blocked: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    remit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    forex: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    insurance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    oshc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    housing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    sim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="3"/></svg>'
  };

  const SERVICES = {
    'education-loans': {
      icon: ICONS.loan, cat: 'vas', sub: 'Funding & Forex', name: 'Education Loans', flags: [], globe: true,
      short: 'Secured & unsecured study loans from ₹5 lakh to ₹1.5 crore.',
      tat: '7–14 days', countries: 'All 11 destinations',
      kpis: [['₹1.5 Cr', 'Max sanction'], ['14+', 'Lending partners'], ['7–14d', 'Sanction time']],
      about: 'Collateral and non-collateral education loans covering tuition, living costs, travel and forex — matched to the right lender so every student file reaches sanction before the visa deadline.',
      feats: ['Loan up to ₹1.5 Cr with collateral', 'Up to ₹75 lakh unsecured on profile', 'Interest concessions for meritorious students', 'Sanction letter accepted for visa filing', 'Moratorium & flexible repayment', 'Doorstep documentation support'],
      partners: ['SBI', 'Bank of Baroda', 'PNB', 'Union Bank', 'Axis Bank', 'ICICI Bank', 'YES Bank', 'IDFC First', 'HDFC Credila', 'Avanse', 'Auxilo', 'Tata Capital', 'Poonawalla Fincorp', 'Prodigy Finance'],
      steps: ['Share the student profile and admit letter', 'We match 3–4 best-fit lenders the same day', 'Documentation, follow-ups and query handling', 'Sanction letter issued — commission credited on disbursal']
    },
    'canada-gic': {
      icon: ICONS.gic, cat: 'vas', sub: 'Banking', name: 'Canada GIC', flags: ['ca'],
      short: 'Guaranteed Investment Certificate for the Student Direct Stream.',
      tat: '5–7 days', countries: 'Canada',
      kpis: [['CAD 23,448', 'Min. deposit'], ['4', 'GIC banks'], ['5–7d', 'Certificate time']],
      about: 'Full GIC setup for SDS and non-SDS applicants — account opening, CAD 23,448 transfer guidance and the Investment Declaration needed for the Canadian study permit.',
      feats: ['CIBC, BMO, ICICI Bank Canada & Beacon Money', 'SDS-compliant investment declaration', 'Wire transfer & FX guidance for the deposit', 'Refund-friendly process if the visa is refused', 'Activation support after landing in Canada'],
      partners: ['CIBC', 'BMO', 'ICICI Bank Canada', 'Beacon Money'],
      steps: ['Choose the GIC bank with the student', 'Account opened & wiring details shared in 48h', 'Student remits CAD 23,448 + fees', 'GIC certificate issued in 5–7 days — payout credited on funding']
    },
    'german-blocked-account': {
      icon: ICONS.blocked, cat: 'vas', sub: 'Banking', name: 'German Blocked Account', flags: ['de'],
      short: 'Expatrio-powered Sperrkonto for the German student visa.',
      tat: '3–5 days', countries: 'Germany',
      kpis: [['€11,904', 'Annual amount'], ['€992/mo', 'Payout schedule'], ['3–5d', 'Confirmation']],
      about: 'Blocked account, health insurance and free current account bundled through Expatrio — with the instant confirmation letter German consulates require.',
      feats: ['0€ account-opening fee options', 'Instant 06-confirmation letter for visa', 'Bundled incoming + statutory health insurance', 'Payouts of €992 per month, visa-compliant', 'Extension letters for later semesters'],
      partners: ['Expatrio'],
      steps: ['Student registers with passport & admit letter', 'Transfers €11,904 to the assigned IBAN', 'Confirmation letter generated within 3–5 days', 'Activation & payout setup on arrival — payout credited on funding']
    },
    'fee-payments': {
      icon: ICONS.remit, cat: 'vas', sub: 'Funding & Forex', name: 'Fee Payment & Remittance', flags: [], globe: true,
      short: 'Tuition & living-cost transfers at competitive FX rates.',
      tat: '2–3 days', countries: 'All 11 destinations',
      kpis: [['2–3d', 'Credit time'], ['4', 'Payment rails'], ['0', 'Hidden charges']],
      about: 'RBI-compliant outward remittance under LRS for tuition, deposits and student living costs — with university receipt tracking and better rates than bank counters.',
      feats: ['Flywire, Convera, PayMyTuition & TransferMate rails', 'Live interbank-linked FX rates', 'TCS & LRS documentation handled', 'University confirmation shared with agent', 'Same-rail transfers for hostel & GIC deposits'],
      partners: ['Flywire', 'Convera', 'PayMyTuition', 'TransferMate'],
      steps: ['Upload the university fee invoice', 'Student transfers INR — rate locked live', 'University credited in 2–3 working days', 'Receipt shared — commission credited on completion']
    },
    'forex-card': {
      icon: ICONS.forex, cat: 'vas', sub: 'Funding & Forex', name: 'Multi-Currency Forex Card', flags: [], globe: true,
      short: 'One prepaid card carrying 14+ currencies, loaded from India.',
      tat: '24–48 hrs', countries: 'All 11 destinations',
      kpis: [['14+', 'Currencies'], ['24–48h', 'Card delivery'], ['0%*', 'Markup plans']],
      about: 'A student-first prepaid forex card with interbank-linked loads, app control and instant reloads — safer and cheaper than carrying currency.',
      feats: ['14+ currencies on a single card', 'Card delivered before departure', 'Reload anytime from the app', 'ATM withdrawals & POS spending worldwide', 'Complimentary travel insurance on select plans'],
      partners: ['EbixCash', 'Thomas Cook'],
      steps: ['Submit KYC and travel details', 'Choose load currency & amount — CAD 300+ starter packs', 'Card delivered and loaded in 24–48 hours', 'Payout credited on first successful load']
    },
    'insurance': {
      icon: ICONS.insurance, cat: 'vas', sub: 'Insurance', name: 'Travel & Student Insurance', flags: [], globe: true,
      short: 'Visa-compliant medical and travel cover, worldwide.',
      tat: 'Same day', countries: 'All 11 destinations',
      kpis: [['Same day', 'Policy issue'], ['3+', 'Insurers'], ['100%', 'Visa-compliant']],
      about: 'Comprehensive student medical and travel policies accepted by universities and consulates — issued the same day and emailed straight to the student.',
      feats: ['Allianz Care, ICICI Lombard & Tata AIG', 'University waiver-friendly plans', 'Covers hospitalisation, baggage & sponsors', 'Refund if visa is refused (T&C apply)', 'Instant policy certificate by email'],
      partners: ['Allianz Care', 'ICICI Lombard', 'Tata AIG'],
      steps: ['Share destination, course start & duration', 'Pick the plan matched to visa rules', 'Pay online — policy issued same day', 'Payout credited on premium payment']
    },
    'oshc-ovhc': {
      icon: ICONS.oshc, cat: 'vas', sub: 'Insurance', name: 'OSHC / OVHC', flags: ['au'],
      short: 'Mandatory health cover for Australian student & visitor visas.',
      tat: 'Same day', countries: 'Australia',
      kpis: [['Same day', 'Certificate'], ['2', 'Govt-approved funds'], ['100%', 'Visa-ready']],
      about: 'Overseas Student Health Cover (OSHC) and Overseas Visitor Health Cover (OVHC) from government-approved providers — the certificate uploads directly to ImmiAccount.',
      feats: ['Medibank & nib — approved providers', 'Single, couple & family coverage', 'Certificates accepted by ImmiAccount', 'Policy matched exactly to visa length', 'Priority claims assistance after landing'],
      partners: ['Medibank', 'nib'],
      steps: ['Share the CoE and visa duration', 'Get matched OSHC quotes instantly', 'Pay online — certificate issued same day', 'Payout credited on premium payment']
    },
    'accommodation': {
      icon: ICONS.housing, cat: 'vas', sub: 'Arrival', name: 'Student Accommodation', flags: ['gb','ca','au'], flagLabel: '50+ cities',
      short: 'Verified housing near campus, booked before departure.',
      tat: '48–72 hrs', countries: 'UK · Canada · Australia · EU',
      kpis: [['1M+', 'Verified beds'], ['50+', 'Cities covered'], ['48–72h', 'Booking time']],
      about: 'Purpose-built student apartments and verified private rentals near campus — compared, reserved and contracted before the student boards the flight.',
      feats: ['Studios, en-suites & shared apartments', 'Options typically $400–$1,500 per month', 'Virtual tours & roommate matching', 'Guarantor & instalment plan support', 'Move-in assistance after landing'],
      partners: ['Verified PBSA network'],
      steps: ['Share university, budget & move-in date', 'Shortlist with virtual tours in 48 hours', 'Contract signed & deposit paid remotely', 'Confirmation shared — payout credited on check-in']
    },
    'sim-cards': {
      icon: ICONS.sim, cat: 'vas', sub: 'Arrival', name: 'International SIM Cards', flags: ['ca','gb','us','de'], flagLabel: '4 markets',
      short: 'Pre-activated SIMs, connected the moment they land.',
      tat: '3–5 days', countries: 'Canada · UK · USA · Germany',
      kpis: [['3–5d', 'Home delivery'], ['4', 'Carrier networks'], ['Day 0', 'Connectivity']],
      about: 'Destination-country SIMs on leading carriers, delivered to the student\u2019s Indian address and active before the flight lands.',
      feats: ['Vodafone, Rogers & Telus networks', 'Pre-activated with a local number', 'Unlimited call & high-data plans', 'Number reserved before travel', 'Easy plan upgrades after landing'],
      partners: ['Vodafone', 'Rogers', 'Telus'],
      steps: ['Pick destination & plan with the student', 'KYC completed in 2 minutes', 'SIM delivered in 3–5 days, pre-activated', 'Payout credited on activation']
    }
  };
  window.UNIVERSE_SERVICES = SERVICES;
  window.UNIVERSE_ICONS = ICONS;

  /* ============ navbar ============ */
  const nav = document.getElementById('navbar');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open);
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('open'); navToggle.classList.remove('open');
    }));
  }

  /* ============ reveal on scroll ============ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ============ animated counters ============ */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target; cio.unobserve(el);
      const target = parseFloat(el.dataset.count); const suffix = el.dataset.suffix || '';
      const decimals = parseInt(el.dataset.dec || '0', 10);
      const dur = 1400; const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .5 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

  /* ============ rotating hero word ============ */
  const rotator = document.getElementById('wordRotator');
  if (rotator) {
    const words = ['Student Finance', 'Study Visas', 'Student Banking', 'Student Travel', 'Student Housing'];
    let wi = 0;
    setInterval(() => {
      wi = (wi + 1) % words.length;
      rotator.style.opacity = 0; rotator.style.transform = 'translateY(10px)';
      setTimeout(() => {
        rotator.textContent = words[wi];
        rotator.style.opacity = 1; rotator.style.transform = 'translateY(0)';
      }, 320);
    }, 2600);
    rotator.style.transition = 'opacity .3s ease, transform .3s ease';
    rotator.style.display = 'inline-block';
  }

  /* ============ services filter + search ============ */
  const grid = document.getElementById('svcGrid');
  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.svc-card'));
    const empty = document.getElementById('svcEmpty');
    const search = document.getElementById('svcSearch');
    let activeCat = 'all';
    const apply = () => {
      const q = (search ? search.value : '').trim().toLowerCase();
      let shown = 0;
      cards.forEach(c => {
        const okCat = activeCat === 'all' || c.dataset.cat === activeCat;
        const okQ = !q || c.textContent.toLowerCase().includes(q);
        const show = okCat && okQ;
        c.style.display = show ? '' : 'none';
        if (show) shown++;
      });
      if (empty) empty.style.display = shown ? 'none' : 'block';
    };
    document.querySelectorAll('.chip-btn[data-cat]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-btn[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); activeCat = btn.dataset.cat; apply();
    }));
    if (search) search.addEventListener('input', apply);
  }

  /* ============ service modal ============ */
  const veil = document.getElementById('svcModal');
  if (veil) {
    const body = veil.querySelector('.modal-body-zone');
    const openModal = (key) => {
      const s = SERVICES[key]; if (!s) return;
      body.innerHTML = `
        <div class="modal-hero">
          <button class="modal-close" aria-label="Close">✕</button>
          <div class="mi">${s.icon}</div>
          <h3>${s.name}</h3><p>${s.short}</p>
        </div>
        <div class="modal-body">
          <div class="m-kpis">${s.kpis.map(k => `<div class="m-kpi"><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
          <div class="m-sec"><h4>About this service</h4><p style="font-size:.92rem;color:var(--ink)">${s.about}</p></div>
          <div class="m-sec"><h4>What partners get</h4><ul class="m-feats">${s.feats.map(f => `<li>${f}</li>`).join('')}</ul></div>
          <div class="m-sec"><h4>How a case moves</h4><div class="m-steps">${s.steps.map((st, i) => `<div class="m-step"><b>${i + 1}</b><span>${st}</span></div>`).join('')}</div></div>
          <div class="m-sec"><h4>Delivery partners</h4><div class="m-partners">${s.partners.map(p => `<span class="pill ctry">${p}</span>`).join('')}</div></div>
          <div class="m-cta">
            <a href="services/${key}.html" class="btn btn-primary">Open full service page <span class="arr">→</span></a>
            <a href="agent-login.html" class="btn btn-ghost">Refer a student</a>
          </div>
        </div>`;
      veil.classList.add('open');
      document.body.style.overflow = 'hidden';
      veil.querySelector('.modal-close').focus();
    };
    const closeModal = () => { veil.classList.remove('open'); document.body.style.overflow = ''; };
    document.addEventListener('click', (e) => {
      const q = e.target.closest('[data-quick]');
      if (q) { e.preventDefault(); e.stopPropagation(); openModal(q.dataset.quick); return; }
      if (e.target.closest('[data-close]') || e.target.classList.contains('modal-veil') || e.target.closest('.modal-close')) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  /* ============ how-it-works stepper ============ */
  const hiwSteps = document.querySelectorAll('.hiw-step');
  const hiwPanes = document.querySelectorAll('.hiw-pane');
  const hiwDots = document.querySelectorAll('.hiw-dot');
  if (hiwSteps.length) {
    let cur = 0, timer;
    const activate = (i) => {
      cur = i;
      hiwSteps.forEach((s, j) => s.classList.toggle('active', j === i));
      hiwPanes.forEach((p, j) => p.classList.toggle('active', j === i));
      hiwDots.forEach((d, j) => d.classList.toggle('active', j === i));
      // restart bar animation
      const bar = hiwSteps[i].querySelector('.bar');
      if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    };
    const auto = () => { clearInterval(timer); timer = setInterval(() => activate((cur + 1) % hiwSteps.length), 5400); };
    hiwSteps.forEach((s, i) => s.addEventListener('click', () => { activate(i); auto(); }));
    hiwDots.forEach((d, i) => d.addEventListener('click', () => { activate(i); auto(); }));
    activate(0); auto();
  }

  /* ============ footer year ============ */
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ============ why-cards: cursor spotlight + micro-tilt ============ */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.why-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
      if (card.classList.contains('vault')) return; // big vault card: spotlight only
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = -(((e.clientY - r.top) / r.height) - 0.5) * 5;
        const ry = (((e.clientX - r.left) / r.width) - 0.5) * 5;
        card.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-5px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ============ service hero art 3D tilt ============ */
  const heroArt = document.querySelector('.svc-art');
  if (heroArt && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const frame = heroArt.querySelector('.frame');
    heroArt.addEventListener('mousemove', (e) => {
      const r = heroArt.getBoundingClientRect();
      const ry = ((e.clientX - r.left) / r.width - .5) * 7;
      const rx = -((e.clientY - r.top) / r.height - .5) * 7;
      frame.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
    heroArt.addEventListener('mouseleave', () => { frame.style.transform = ''; });
  }

  /* ============ global toast helper ============ */
  window.uniToast = function (msg) {
    let zone = document.querySelector('.toast-zone');
    if (!zone) { zone = document.createElement('div'); zone.className = 'toast-zone'; document.body.appendChild(zone); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="ti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' + msg;
    zone.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3400);
  };
})();
