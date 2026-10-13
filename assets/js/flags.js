/* UniVerse — hand-drawn SVG country flags (offline, no CDN) */
(function () {
  'use strict';

  const stripeRows = (colors, w = 640, h = 480) => {
    const rh = h / colors.length;
    return colors.map((c, i) => `<rect x="0" y="${(i * rh).toFixed(2)}" width="${w}" height="${(rh + 0.6).toFixed(2)}" fill="${c}"/>`).join('');
  };
  const stripeCols = (colors, w = 640, h = 480) => {
    const rw = w / colors.length;
    return colors.map((c, i) => `<rect x="${(i * rw).toFixed(2)}" y="0" width="${(rw + 0.6).toFixed(2)}" height="${h}" fill="${c}"/>`).join('');
  };
  const star = (cx, cy, r, spikes = 5, ratio = 0.5, fill = '#fff', stroke = '') => {
    const pts = [], step = Math.PI / spikes;
    let a = -Math.PI / 2;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 ? r * ratio : r;
      pts.push((cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1));
      a += step;
    }
    return `<polygon points="${pts.join(' ')}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="5"` : ''}/>`;
  };

  // USA
  const US = (() => {
    let s = '';
    const rh = 480 / 13;
    for (let i = 0; i < 13; i++) s += `<rect x="0" y="${(i * rh).toFixed(1)}" width="640" height="${(rh + 0.6).toFixed(1)}" fill="${i % 2 ? '#fff' : '#B22234'}"/>`;
    s += `<rect x="0" y="0" width="256" height="${(rh * 7 + 0.5).toFixed(1)}" fill="#3C3B6E"/>`;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) s += `<circle cx="${20 + c * 43}" cy="${24 + r * 50}" r="7.4" fill="#fff"/>`;
    return s;
  })();

  // UK (simplified Union Jack)
  const UK = `<rect width="640" height="480" fill="#012169"/>`
    + `<g stroke="#fff" stroke-width="90"><line x1="0" y1="0" x2="640" y2="480"/><line x1="640" y1="0" x2="0" y2="480"/></g>`
    + `<g stroke="#C8102E" stroke-width="28"><line x1="0" y1="0" x2="640" y2="480"/><line x1="640" y1="0" x2="0" y2="480"/></g>`
    + `<rect x="262" y="0" width="116" height="480" fill="#fff"/><rect x="0" y="182" width="640" height="116" fill="#fff"/>`
    + `<rect x="290" y="0" width="60" height="480" fill="#C8102E"/><rect x="0" y="210" width="640" height="60" fill="#C8102E"/>`;

  // India chakra
  const chakra = (() => {
    let s = `<circle cx="320" cy="240" r="50" fill="none" stroke="#06038D" stroke-width="7"/><circle cx="320" cy="240" r="10" fill="#06038D"/>`;
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6;
      s += `<line x1="320" y1="240" x2="${(320 + Math.cos(a) * 44).toFixed(1)}" y2="${(240 + Math.sin(a) * 44).toFixed(1)}" stroke="#06038D" stroke-width="5"/>`;
    }
    return s;
  })();

  const FLAGS = {
    ca: `<rect width="640" height="480" fill="#fff"/><rect width="170" height="480" fill="#D52B1E"/><rect x="470" width="170" height="480" fill="#D52B1E"/><path d="M320 110l24 52 48-18-15 56 54 9-42 39 26 48-60-4-35 52-35-52-60 4 26-48-42-39 54-9-15-56 48 18z" fill="#D52B1E"/>`,
    us: US,
    gb: UK,
    au: `<rect width="640" height="480" fill="#00247D"/><g transform="scale(.5)">${UK}</g>${star(160, 378, 55, 7, 0.42)}${star(505, 105, 27, 7, 0.42)}${star(560, 205, 24, 7, 0.42)}${star(505, 325, 27, 7, 0.42)}${star(428, 250, 19, 7, 0.42)}${star(605, 240, 21, 7, 0.42)}`,
    nz: `<rect width="640" height="480" fill="#00247D"/><g transform="scale(.5)">${UK}</g>${star(505, 105, 30, 5, 0.45, '#CC142B', '#fff')}${star(560, 205, 26, 5, 0.45, '#CC142B', '#fff')}${star(505, 325, 30, 5, 0.45, '#CC142B', '#fff')}${star(605, 250, 26, 5, 0.45, '#CC142B', '#fff')}`,
    de: stripeRows(['#000000', '#DD0000', '#FFCE00']),
    ie: stripeCols(['#169B62', '#ffffff', '#FF883E']),
    fr: stripeCols(['#0055A4', '#ffffff', '#EF4135']),
    it: stripeCols(['#008C45', '#ffffff', '#CD212A']),
    nl: stripeRows(['#AE1C28', '#ffffff', '#21468B']),
    hu: stripeRows(['#CD2A3E', '#ffffff', '#436F4D']),
    es: `<rect width="640" height="120" fill="#AA151B"/><rect y="120" width="640" height="240" fill="#F1BF00"/><rect y="360" width="640" height="120" fill="#AA151B"/>`,
    ae: `<rect width="640" height="480" fill="#fff"/><rect width="640" height="160" fill="#00732F" x="0" y="0"/><rect y="320" width="640" height="160" fill="#000"/><rect y="160" width="640" height="160" fill="#fff"/><rect width="200" height="480" fill="#EF3340"/>`,
    se: `<rect width="640" height="480" fill="#006AA7"/><rect x="190" width="110" height="480" fill="#FECC02"/><rect y="185" width="640" height="110" fill="#FECC02"/>`,
    jp: `<rect width="640" height="480" fill="#fff"/><circle cx="320" cy="240" r="115" fill="#BC002D"/>`,
    sg: `<rect width="640" height="240" fill="#EF3340"/><rect y="240" width="640" height="240" fill="#fff"/><circle cx="150" cy="120" r="64" fill="#fff"/><circle cx="172" cy="112" r="54" fill="#EF3340"/>${star(140, 60, 12)}${star(178, 100, 12)}${star(165, 148, 12)}${star(120, 148, 12)}${star(102, 100, 12)}`,
    in: stripeRows(['#FF9933', '#FFFFFF', '#138808']) + chakra
  };

  const mount = (root) => {
    (root || document).querySelectorAll('[data-flag]').forEach(el => {
      const code = (el.dataset.flag || '').toLowerCase();
      if (FLAGS[code] && !el.dataset.mounted) {
        el.insertAdjacentHTML('afterbegin',
          `<svg viewBox="0 0 640 480" role="img" aria-label="${code.toUpperCase()} flag" preserveAspectRatio="xMidYMid slice">${FLAGS[code]}</svg>`);
        el.dataset.mounted = '1';
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount());
  else mount();
  window.UNIVERSE_FLAGS = { mount };
})();
