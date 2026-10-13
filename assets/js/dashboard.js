/* UniVerse — agent dashboard logic (demo data) */
(function () {
  'use strict';
  const S = window.UNIVERSE_SERVICES || {};

  /* ---------- session ---------- */
  let agent = { name: 'Amit Patel', email: 'amit@horizonoverseas.in' };
  try {
    const raw = sessionStorage.getItem('uv_agent');
    if (raw) {
      const a = JSON.parse(raw);
      if (a && a.name) { agent.name = a.name; if (a.email) agent.email = a.email; }
    }
  } catch (e) { /* demo fallback */ }
  const initials = agent.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  setText('userNameChip', agent.name);
  setText('userAv', initials);
  setText('profileName', agent.name);
  setText('profileAv', initials);
  setText('profileEmail', agent.email);

  /* ---------- mock data ---------- */
  const state = {
    balance: 86500,
    pending: 12500,
    lifetime: 465000,
    students: [
      { id: 'STU-1024', name: 'Sneha Gupta', email: 'sneha.g@gmail.com', phone: '+91 98240 11122', country: 'Canada', service: 'Canada GIC', status: 'In Progress', progress: 65, date: '24 Sep 2026' },
      { id: 'STU-1023', name: 'Rahul Sharma', email: 'rahul.s@outlook.com', phone: '+91 99251 33445', country: 'Germany', service: 'German Blocked Account', status: 'Completed', progress: 100, date: '22 Sep 2026' },
      { id: 'STU-1022', name: 'Priya Patel', email: 'priya.p@yahoo.in', phone: '+91 98981 77889', country: 'United Kingdom', service: 'Education Loans', status: 'In Progress', progress: 45, date: '21 Sep 2026' },
      { id: 'STU-1021', name: 'Amit Kumar', email: 'amit.k@gmail.com', phone: '+91 97129 55667', country: 'Australia', service: 'OSHC / OVHC', status: 'Completed', progress: 100, date: '20 Sep 2026' },
      { id: 'STU-1020', name: 'Kavya Desai', email: 'kavya.d@gmail.com', phone: '+91 96384 22110', country: 'Canada', service: 'Fee Payment', status: 'Pending', progress: 20, date: '19 Sep 2026' },
      { id: 'STU-1019', name: 'Dev Mehta', email: 'dev.m@icloud.com', phone: '+91 95102 88334', country: 'United States', service: 'Forex Card', status: 'Completed', progress: 100, date: '18 Sep 2026' },
      { id: 'STU-1018', name: 'Ishita Rao', email: 'ishita.r@gmail.com', phone: '+91 99789 11223', country: 'Australia', service: 'Accommodation', status: 'In Progress', progress: 70, date: '17 Sep 2026' },
      { id: 'STU-1017', name: 'Vivek Patil', email: 'vivek.p@gmail.com', phone: '+91 94261 00998', country: 'Canada', service: 'SIM Cards', status: 'Completed', progress: 100, date: '15 Sep 2026' },
      { id: 'STU-1016', name: 'Nisha Verma', email: 'nisha.v@gmail.com', phone: '+91 98257 66554', country: 'Ireland', service: 'Travel & Student Insurance', status: 'On Hold', progress: 30, date: '14 Sep 2026' },
      { id: 'STU-1015', name: 'Arjun Singh', email: 'arjun.s@outlook.com', phone: '+91 99040 44332', country: 'Germany', service: 'Travel & Student Insurance', status: 'Completed', progress: 100, date: '12 Sep 2026' },
      { id: 'STU-1014', name: 'Meera Joshi', email: 'meera.j@gmail.com', phone: '+91 97143 33221', country: 'Canada', service: 'Education Loans', status: 'In Progress', progress: 55, date: '10 Sep 2026' },
      { id: 'STU-1013', name: 'Kabir Chauhan', email: 'kabir.c@gmail.com', phone: '+91 98791 10099', country: 'United Kingdom', service: 'Accommodation', status: 'Completed', progress: 100, date: '08 Sep 2026' },
      { id: 'STU-1012', name: 'Anaya Iyer', email: 'anaya.i@gmail.com', phone: '+91 96620 88776', country: 'New Zealand', service: 'Fee Payment', status: 'Pending', progress: 15, date: '05 Sep 2026' },
      { id: 'STU-1011', name: 'Rohan Bhatt', email: 'rohan.b@gmail.com', phone: '+91 93271 55443', country: 'UAE', service: 'Forex Card', status: 'Completed', progress: 100, date: '02 Sep 2026' }
    ],
    tx: [
      { date: '24 Sep 2026', desc: 'GIC payout — Sneha Gupta (CIBC case REQ-1187)', type: 'Credit', amount: 12200, status: 'Pending' },
      { date: '22 Sep 2026', desc: 'Blocked account payout — Rahul Sharma', type: 'Credit', amount: 3250, status: 'Completed' },
      { date: '20 Sep 2026', desc: 'OSHC commission — Amit Kumar (Medibank)', type: 'Credit', amount: 1500, status: 'Completed' },
      { date: '18 Sep 2026', desc: 'Forex card activation — Dev Mehta (EbixCash)', type: 'Credit', amount: 1000, status: 'Completed' },
      { date: '17 Sep 2026', desc: 'Accommodation booking — Ishita Rao (London)', type: 'Credit', amount: 5000, status: 'Pending' },
      { date: '15 Sep 2026', desc: 'SIM activation — Vivek Patil (Rogers)', type: 'Credit', amount: 2200, status: 'Completed' },
      { date: '12 Sep 2026', desc: 'Insurance commission — Arjun Singh', type: 'Credit', amount: 3600, status: 'Completed' },
      { date: '10 Sep 2026', desc: 'Withdrawal to HDFC ••4821', type: 'Debit', amount: 25000, status: 'Completed' },
      { date: '08 Sep 2026', desc: 'Accommodation payout — Kabir Chauhan (Manchester)', type: 'Credit', amount: 5000, status: 'Completed' }
    ]
  };

  /* ---------- commission data ---------- */
  const COMMISSIONS = [
    { key: 'education-loans', amt: '0.75–1.25%', note: 'of disbursed amount' },
    { key: 'canada-gic', amt: 'CAD 175–225', note: 'per funded GIC account' },
    { key: 'german-blocked-account', amt: 'EUR 35', note: 'per funded blocked account' },
    { key: 'fee-payments', amt: '0.4%', note: 'of transfer value · min ₹800' },
    { key: 'forex-card', amt: '₹1,000', note: 'per first successful load' },
    { key: 'insurance', amt: '50%', note: 'of net premium' },
    { key: 'oshc-ovhc', amt: '₹1,500', note: 'per issued policy' },
    { key: 'accommodation', amt: '₹5,000', note: 'per confirmed booking' },
    { key: 'sim-cards', amt: '₹1,000–4,000', note: 'per activated SIM' }
  ];

  const COMM_STRUCT = {
    current: {
      title: 'Current Commission Structure',
      effective: 'Effective: July 2026',
      status: 'Active',
      items: [
        ['Canada GIC', 'CAD 175 – 225 per funded account'],
        ['German Blocked Account', 'EUR 35 per funded account'],
        ['Education Loans', '0.75% – 1.25% of disbursed amount'],
        ['Insurance', '50% of net premium'],
        ['SIM Cards', 'INR 1,000 – 4,000 per activated SIM'],
        ['Fee Payment & Remittance', '0.40% of transfer value · min ₹800'],
        ['Multi-Currency Forex Card', '₹1,000 per first successful load'],
        ['OSHC / OVHC', '₹1,500 per issued policy'],
        ['Student Accommodation', '₹5,000 per confirmed booking']
      ]
    },
    previous: {
      title: 'Previous Commission Structure',
      effective: 'Effective: January 2026 – June 2026',
      status: 'Archived',
      items: [
        ['Canada GIC', 'CAD 150 – 200 per funded account'],
        ['German Blocked Account', 'EUR 30 per funded account'],
        ['Education Loans', '0.50% – 1.00% of disbursed amount'],
        ['Insurance', '40% of net premium'],
        ['SIM Cards', 'INR 800 – 3,500 per activated SIM'],
        ['Fee Payment & Remittance', '0.35% of transfer value · min ₹600'],
        ['Multi-Currency Forex Card', '₹800 per first successful load'],
        ['OSHC / OVHC', '₹1,200 per issued policy'],
        ['Student Accommodation', '₹3,500 per confirmed booking']
      ]
    }
  };

  const inr = n => '₹' + n.toLocaleString('en-IN');
  const statusClass = s => s === 'Completed' ? 'done' : s === 'In Progress' ? 'prog' : s === 'Pending' ? 'pend' : 'hold';
  const reqRef = (idx) => 'REQ-' + (1187 - idx);

  /* ---------- view switching ---------- */
  const TITLES = { overview: 'Overview', students: 'Students', requests: 'Service Requests', services: 'Marketplace Services', wallet: 'My Wallet', commissions: 'Commissions', profile: 'Agent Profile' };
  const links = document.querySelectorAll('.s-link');
  const show = (view) => {
    if (!document.getElementById('view-' + view)) view = 'overview';
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    links.forEach(l => l.classList.toggle('active', l.dataset.view === view));
    setText('pageTitle', TITLES[view] || 'Overview');
    document.getElementById('dashSide').classList.remove('open');
    if (history.replaceState) history.replaceState(null, '', '#' + view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  links.forEach(l => l.addEventListener('click', () => show(l.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { show(b.dataset.goto); closeUserMenu(); }));
  show((location.hash || '#overview').slice(1));

  /* ---------- sidebar / menus ---------- */
  document.getElementById('menuFab').addEventListener('click', () => document.getElementById('dashSide').classList.toggle('open'));
  const userMenu = document.getElementById('userMenu');
  const userBtn = document.getElementById('userMenuBtn');
  const closeUserMenu = () => userMenu.classList.remove('open');
  userBtn.addEventListener('click', (e) => { e.stopPropagation(); userMenu.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (!userMenu.contains(e.target)) closeUserMenu(); });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('uv_agent');
    window.uniToast && uniToast('Signed out. See you soon!');
    setTimeout(() => window.location.href = 'agent-login.html', 700);
  });
  document.getElementById('notifBtn').addEventListener('click', () => {
    window.uniToast && uniToast('🔔 GIC case REQ-1187: awaiting student wire transfer.');
  });
  document.getElementById('editProfile').addEventListener('click', () => window.uniToast && uniToast('Profile edit requests go to your relationship manager.'));

  /* ---------- counter animation ---------- */
  const spinNum = (id, target, fmt) => {
    const el = document.getElementById(id); if (!el) return;
    const dur = 1100, t0 = performance.now();
    const f = fmt || (v => Math.round(v).toLocaleString('en-IN'));
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = f(target * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  spinNum('statActive', state.students.filter(s => s.status !== 'Completed').length);
  spinNum('statStudents', 132);
  spinNum('statWallet', state.balance, v => inr(Math.round(v)));
  spinNum('statEarnings', 58000, v => inr(Math.round(v)));

  /* ---------- wallet ---------- */
  const renderWallet = () => {
    setText('walletBalance', inr(state.balance));
    setText('walletPending', inr(state.pending));
    setText('walletLifetime', inr(state.lifetime));
    setText('wdAvail', inr(state.balance));
    document.getElementById('walletTxTbody').innerHTML = state.tx.map(t => `
      <tr>
        <td>${t.date}</td>
        <td class="t-name" style="font-weight:500">${t.desc}</td>
        <td><span class="pill ${t.type === 'Credit' ? 'ctry' : ''}">${t.type}</span></td>
        <td style="font-weight:700;color:${t.type === 'Credit' ? 'var(--green-deep)' : 'var(--ink)'}">${t.type === 'Credit' ? '+' : '−'} ${inr(t.amount)}</td>
        <td><span class="status ${statusClass(t.status)}">${t.status}</span></td>
      </tr>`).join('');
  };

  /* ---------- students / requests tables ---------- */
  let searchQ = '', statusF = '';
  const matches = (s) =>
    (!statusF || s.status === statusF) &&
    (!searchQ || (s.name + s.service + s.country + s.id).toLowerCase().includes(searchQ.toLowerCase()));
  const rowSmall = (s) => `
    <tr>
      <td><div class="t-name">${s.name}</div><div class="t-sub">${s.email}</div></td>
      <td>${s.country}</td><td>${s.service}</td>
      <td><span class="status ${statusClass(s.status)}">${s.status}</span></td>
    </tr>`;
  const rowFull = (s) => `
    <tr>
      <td>${s.id}</td>
      <td><div class="t-name">${s.name}</div><div class="t-sub">${s.phone}</div></td>
      <td>${s.country}</td><td>${s.service}</td>
      <td><span class="status ${statusClass(s.status)}">${s.status}</span></td>
      <td><div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${s.progress}%"></div></div><span>${s.progress}%</span></div></td>
      <td>${s.date}</td>
    </tr>`;
  const renderStudents = () => {
    const list = state.students.filter(matches);
    document.getElementById('studentsTbody').innerHTML = list.map(rowFull).join('') ||
      '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:2rem">No students match your filters.</td></tr>';
    document.getElementById('recentTbody').innerHTML = state.students.slice(0, 5).map(rowSmall).join('');
    document.getElementById('requestsTbody').innerHTML = state.students.map((s, i) => `
      <tr data-idx="${i}">
        <td>${reqRef(i)}</td>
        <td class="t-name" style="font-weight:600">${s.name}</td>
        <td>${s.service}</td>
        <td><span class="status ${statusClass(s.status)}">${s.status}</span></td>
        <td><div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${s.progress}%"></div></div><span>${s.progress}%</span></div></td>
        <td><button class="open-btn">Open</button></td>
      </tr>`).join('');
  };
  document.getElementById('studentStatusFilter').addEventListener('change', (e) => { statusF = e.target.value; renderStudents(); });
  const bindSearch = (el) => el && el.addEventListener('input', (e) => { searchQ = e.target.value; renderStudents(); });
  bindSearch(document.getElementById('globalSearch'));

  /* ---------- donut ---------- */
  const DONUT_COLORS = ['#0A66C2', '#2FA84F', '#0B2440', '#1B85E8', '#7BD795', '#F59E0B', '#5B6E84', '#B09DFF', '#0FA3B1'];
  const renderDonut = () => {
    const counts = {};
    state.students.forEach(s => { counts[s.service] = (counts[s.service] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = state.students.length;
    setText('donutTotal', total);
    const C = 2 * Math.PI * 15.9155;
    let off = 0;
    document.getElementById('donutSvg').innerHTML = entries.map(([name, n], i) => {
      const frac = n / total;
      const seg = `<circle r="15.9155" cx="21" cy="21" fill="transparent" stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}" stroke-width="5.2"
        stroke-dasharray="${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}" stroke-dashoffset="${(-off * C).toFixed(2)}" stroke-linecap="round"><title>${name}: ${n}</title></circle>`;
      off += frac;
      return seg;
    }).join('');
    document.getElementById('donutLegend').innerHTML = entries.map(([name, n], i) => `
      <div class="lg"><span class="sw" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>${name}<b>${n}</b></div>`).join('');
  };

  /* ---------- service tiles (marketplace + quick launch) ---------- */
  const svcTile = (key, btnLabel) => {
    const s = S[key]; if (!s) return '';
    const partnerLine = s.partners.slice(0, 3).join(' · ') + (s.partners.length > 3 ? ` +${s.partners.length - 3} more` : '');
    return `
      <article class="comm-card svc-tile" data-svc-tile="${key}">
        <div class="cc-top"><span class="cc-ic">${s.icon}</span><h3 style="font-size:.95rem">${s.name}</h3></div>
        <p style="font-size:.82rem;color:var(--ink-soft)">${s.short}</p>
        <div class="mk-row">${s.kpis.map(k => `<span class="mk">${k[0]} · ${k[1]}</span>`).join('')}</div>
        <ul class="ft-mini">${s.feats.slice(0, 2).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <div class="svc-meta"><span class="pill tat">${s.tat}</span><span class="pill ctry">${s.countries}</span></div>
        <p class="pt-line"><b>Partners:</b> ${esc(partnerLine)}</p>
        <button class="btn btn-primary btn-sm" data-refer="${key}" style="margin-top:.35rem">${btnLabel}</button>
      </article>`;
  };
  document.getElementById('svcCatalog').innerHTML = Object.keys(S).map(k => svcTile(k, 'Refer a student')).join('');
  document.getElementById('quickLaunch').innerHTML = ['education-loans', 'canada-gic', 'german-blocked-account'].map(k => svcTile(k, 'Start referral')).join('');

  /* ---------- commission cards + history ---------- */
  document.getElementById('commGrid').innerHTML = COMMISSIONS.map(c => {
    const s = S[c.key];
    return `
      <div class="comm-card">
        <div class="cc-top"><span class="cc-ic">${s ? s.icon : ''}</span><h3 style="font-size:.95rem">${s ? s.name : c.key}</h3></div>
        <b class="cc-amt">${c.amt}</b>
        <span class="cc-note">${c.note}</span>
      </div>`;
  }).join('');
  document.getElementById('commHistory').innerHTML = ['current', 'previous'].map(k => {
    const st = COMM_STRUCT[k];
    return `
      <article class="ch-card ${k}">
        <div class="ch-top">
          <h4>${st.title}</h4>
          <span class="ch-meta">${st.effective} <span class="status ${k === 'current' ? 'done' : 'hold'}">${st.status}</span></span>
        </div>
        <ul class="ch-list">${st.items.slice(0, 5).map(([n, v]) => `<li><span class="svc">${n}</span><b>${v}</b></li>`).join('')}</ul>
        <button class="btn btn-ghost btn-sm" data-comm="${k}">View Details</button>
      </article>`;
  }).join('');

  /* ---------- generic modal helpers ---------- */
  const openModal = (id) => { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = (id) => { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; };
  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close-modal]');
    if (closer) { closeModal(closer.dataset.closeModal); return; }
    if (e.target.classList.contains('modal-veil')) { closeModal(e.target.id); return; }
    if (e.target.closest('.modal-close')) { closeModal(e.target.closest('.modal-veil').id); return; }
    const referBtn = e.target.closest('[data-refer]');
    if (referBtn) { openAddModal(referBtn.dataset.refer); return; }
    const commBtn = e.target.closest('[data-comm]');
    if (commBtn) { openCommStruct(commBtn.dataset.comm); return; }
    const reqRow = e.target.closest('#requestsTbody tr[data-idx]');
    if (reqRow) { openRequest(parseInt(reqRow.dataset.idx, 10)); return; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-veil.open').forEach(m => closeModal(m.id));
  });

  /* ---------- commission structure detail modal ---------- */
  const openCommStruct = (key) => {
    const st = COMM_STRUCT[key]; if (!st) return;
    setText('commModalTitle', st.title);
    setText('commModalSub', `${st.effective} · ${st.status}`);
    document.getElementById('commModalTable').innerHTML = `
      <thead><tr><th>Service</th><th>Payout</th></tr></thead>
      <tbody>${st.items.map(([n, v]) => `<tr><td class="t-name" style="font-weight:600">${n}</td><td>${v}</td></tr>`).join('')}</tbody>`;
    openModal('commModal');
  };

  /* ---------- request dialog: docs + case chat ---------- */
  const DOC_SETS = {
    gic: ['Passport — student.pdf', 'Offer letter — university.pdf', 'SDS fund checklist.pdf'],
    blocked: ['Passport — student.pdf', 'Admission letter.pdf', 'IBA / Expatrio form.pdf'],
    oshc: ['Passport — student.pdf', 'Confirmation of Enrolment.pdf'],
    loans: ['KYC & income docs.pdf', 'Offer letter.pdf', 'Fee structure.pdf'],
    def: ['Passport — student.pdf', 'KYC form.pdf', 'Offer letter.pdf']
  };
  const docKeyFor = (service) => service.includes('GIC') ? 'gic' : service.includes('Blocked') ? 'blocked' : service.includes('OSHC') ? 'oshc' : service.includes('Loan') ? 'loans' : 'def';
  const reqStore = {};
  let activeReq = null;

  const seedReq = (idx) => {
    if (!reqStore[idx]) {
      const s = state.students[idx];
      const docs = (DOC_SETS[docKeyFor(s.service)] || DOC_SETS.def).map((n, i) => ({
        name: n, size: (184 + i * 62) + ' KB', status: i === 2 ? 'hold' : (i === 1 ? 'prog' : 'done')
      }));
      reqStore[idx] = {
        docs,
        chat: [
          { who: 'them', text: `${s.service} case ${reqRef(idx)} is now "${s.status}". I'll post every update here.`, time: 'Yesterday · 5:40 PM' },
          { who: 'you', text: 'Thank you! Please keep this one on priority — visa timeline is tight.', time: 'Yesterday · 6:05 PM' }
        ]
      };
    }
    return reqStore[idx];
  };

  const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const docStatusLabel = (s) => s === 'done' ? 'Verified' : s === 'prog' ? 'Under review' : 'Action needed';

  const renderReqDocs = () => {
    const st = reqStore[activeReq];
    const grid = document.getElementById('reqDocs');
    grid.innerHTML = st.docs.map(d => `
      <div class="doc-card">
        <span class="doc-ic">${DOC_ICON}</span>
        <span class="dn"><b title="${esc(d.name)}">${esc(d.name)}</b><i>${d.size}</i></span>
        <span class="status ${d.status === 'done' ? 'done' : d.status === 'prog' ? 'prog' : 'pend'}">${docStatusLabel(d.status)}</span>
      </div>`).join('') + `
      <button class="doc-add" id="docAddTile" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Upload a document
      </button>`;
    document.getElementById('docAddTile').addEventListener('click', () => document.getElementById('reqFileInput').click());
  };

  const bubble = (m) => {
    if (m.who === 'sys') return `<div class="csys">${esc(m.text)}</div>`;
    return `<div class="cmsg ${m.who}">${esc(m.text)}<span>${m.who === 'you' ? 'You' : 'Service desk'} · ${esc(m.time)}</span></div>`;
  };
  const renderReqChat = () => {
    const box = document.getElementById('reqChat');
    box.innerHTML = reqStore[activeReq].chat.map(bubble).join('');
    box.scrollTop = box.scrollHeight;
  };

  const openRequest = (idx) => {
    activeReq = idx;
    const s = state.students[idx];
    seedReq(idx);
    setText('reqTitle', `${s.name} — ${s.service}`);
    setText('reqMeta', `${reqRef(idx)} · ${s.country} · Referred ${s.date}`);
    const chip = document.getElementById('reqStatusChip');
    chip.className = 'status ' + statusClass(s.status);
    chip.textContent = s.status;
    document.getElementById('reqProgFill').style.width = s.progress + '%';
    setText('reqProgPct', s.progress + '%');
    renderReqDocs();
    renderReqChat();
    openModal('reqModal');
    setTimeout(() => document.getElementById('reqMsgInput').focus(), 250);
  };
  const latestCase = document.getElementById('latestCase');
  if (latestCase) latestCase.addEventListener('click', () => openRequest(0));

  const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const pushReqMsg = (m) => { reqStore[activeReq].chat.push(m); renderReqChat(); };
  const deskReply = (text, delay) => {
    setTimeout(() => {
      const s = state.students[activeReq];
      pushReqMsg({ who: 'them', text, time: nowTime() });
    }, delay || 900);
  };
  const sendReqMsg = () => {
    const inp = document.getElementById('reqMsgInput');
    const text = inp.value.trim();
    if (!text || activeReq === null) return;
    inp.value = '';
    pushReqMsg({ who: 'you', text, time: nowTime() });
    const s = state.students[activeReq];
    deskReply(`Noted on the ${s.service} case — the desk will action this and confirm here shortly.`);
  };
  document.getElementById('reqSendBtn').addEventListener('click', sendReqMsg);
  document.getElementById('reqMsgInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendReqMsg(); });
  document.getElementById('reqAttachBtn').addEventListener('click', () => document.getElementById('reqFileInput').click());
  const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  document.getElementById('reqFileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f || activeReq === null) return;
    reqStore[activeReq].docs.push({ name: f.name, size: fmtSize(f.size), status: 'prog' });
    renderReqDocs();
    pushReqMsg({ who: 'sys', text: `You uploaded “${f.name}”` });
    deskReply('Received — verifying the document and will confirm here.', 1100);
    window.uniToast && uniToast(`Uploaded “${f.name}” to ${reqRef(activeReq)}.`);
    e.target.value = '';
  });

  /* ---------- RM chat drawer ---------- */
  const rmDrawer = document.getElementById('rmDrawer');
  const rmMsgs = [
    { who: 'them', text: `Hi ${agent.name.split(' ')[0]}! Diya here 👋 Anything you need on your active cases today?`, time: '10:02 AM' }
  ];
  const renderRm = () => {
    const box = document.getElementById('rmBody');
    box.innerHTML = rmMsgs.map(bubble).join('');
    box.scrollTop = box.scrollHeight;
  };
  const openRm = () => {
    document.querySelectorAll('.modal-veil.open').forEach(m => closeModal(m.id));
    renderRm();
    rmDrawer.classList.add('open');
    setTimeout(() => document.getElementById('rmInput').focus(), 250);
  };
  document.getElementById('rmOpen').addEventListener('click', openRm);
  document.getElementById('reqRmBtn').addEventListener('click', openRm);
  document.getElementById('rmClose').addEventListener('click', () => rmDrawer.classList.remove('open'));
  const sendRm = () => {
    const inp = document.getElementById('rmInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    rmMsgs.push({ who: 'you', text, time: nowTime() });
    renderRm();
    setTimeout(() => {
      rmMsgs.push({ who: 'them', text: 'On it! Give me a few minutes — I will update you right here. 🙂', time: nowTime() });
      renderRm();
    }, 1100);
  };
  document.getElementById('rmSend').addEventListener('click', sendRm);
  document.getElementById('rmInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendRm(); });

  /* ---------- add-student modal ---------- */
  const svcSelect = document.getElementById('sService');
  svcSelect.innerHTML = '<option value="">Select service</option>' +
    Object.keys(S).map(k => `<option value="${S[k].name}">${S[k].name}</option>`).join('');
  const openAddModal = (svcKey) => {
    if (svcKey && S[svcKey]) svcSelect.value = S[svcKey].name;
    openModal('addStudentModal');
    setTimeout(() => document.getElementById('sName').focus(), 200);
  };
  document.getElementById('qaAddStudent').addEventListener('click', () => openAddModal());
  document.getElementById('openAddStudent').addEventListener('click', () => openAddModal());
  document.getElementById('addStudentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sName').value.trim();
    const email = document.getElementById('sEmail').value.trim();
    const phone = document.getElementById('sPhone').value.trim();
    const country = document.getElementById('sCountry').value;
    const service = svcSelect.value;
    if (!name || !country || !service) return;
    const next = state.students.length ? parseInt(state.students[0].id.split('-')[1], 10) + 1 : 1025;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    state.students.unshift({ id: 'STU-' + next, name, email, phone, country, service, status: 'Pending', progress: 10, date: today });
    // shift REQ refs — new case becomes REQ-1188 of index 0 in display logic via formula; fine for demo
    e.target.reset();
    closeModal('addStudentModal');
    renderStudents(); renderDonut(); spinNum('statActive', state.students.filter(s => s.status !== 'Completed').length);
    window.uniToast && uniToast(`Referral submitted — ${name} → ${service}. New case created.`);
  });

  /* ---------- withdraw modal ---------- */
  document.getElementById('openWithdraw').addEventListener('click', () => { setText('wdAvail', inr(state.balance)); openModal('withdrawModal'); });
  document.getElementById('withdrawForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = parseInt(document.getElementById('wdAmount').value, 10);
    if (!amt || amt < 500) { window.uniToast && uniToast('Minimum withdrawal is ₹500.'); return; }
    if (amt > state.balance) { window.uniToast && uniToast('Amount exceeds your available balance.'); return; }
    state.balance -= amt;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    state.tx.unshift({ date: today, desc: 'Withdrawal to HDFC ••4821', type: 'Debit', amount: amt, status: 'Pending' });
    e.target.reset();
    closeModal('withdrawModal');
    renderWallet();
    spinNum('statWallet', state.balance, v => inr(Math.round(v)));
    window.uniToast && uniToast(`${inr(amt)} withdrawal requested — lands in 1 working day.`);
  });

  /* ---------- initial render ---------- */
  renderStudents();
  renderDonut();
  renderWallet();
})();
