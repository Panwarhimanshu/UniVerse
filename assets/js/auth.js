/* UniVerse — auth screen logic (demo) */
(function () {
  'use strict';

  // tab switching (agent login page)
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.auth-pane').forEach(p => {
        p.classList.toggle('active', p.dataset.pane === target);
      });
    });
  });

  const login = (name, email) => {
    sessionStorage.setItem('uv_agent', JSON.stringify({ name, email, t: Date.now() }));
    window.location.href = 'agent-dashboard.html';
  };

  // partner login
  const pf = document.getElementById('partnerLoginForm');
  if (pf) {
    pf.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = pf.querySelector('#email').value.trim();
      if (!email) return;
      const btn = pf.querySelector('button[type="submit"]');
      btn.textContent = 'Signing in…'; btn.disabled = true;
      setTimeout(() => login('Amit Patel', email), 650);
    });
  }

  // agent login tab
  const al = document.getElementById('agentLoginForm');
  if (al) {
    al.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = al.querySelector('#agentEmail').value.trim();
      if (!email) return;
      const btn = al.querySelector('button[type="submit"]');
      btn.textContent = 'Signing in…'; btn.disabled = true;
      setTimeout(() => login('Amit Patel', email), 650);
    });
  }

  // agent signup tab
  const asf = document.getElementById('agentSignupForm');
  if (asf) {
    asf.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = asf.querySelector('#signupName').value.trim() || 'Partner';
      const email = asf.querySelector('#signupEmail').value.trim();
      const pw = asf.querySelector('#signupPassword').value;
      const cpw = asf.querySelector('#signupConfirmPassword').value;
      if (pw !== cpw) { window.uniToast && uniToast('Passwords do not match.'); return; }
      const btn = asf.querySelector('button[type="submit"]');
      btn.textContent = 'Creating account…'; btn.disabled = true;
      setTimeout(() => { window.uniToast && uniToast('Account created — welcome to UniVerse!'); login(name, email); }, 800);
    });
  }
})();
