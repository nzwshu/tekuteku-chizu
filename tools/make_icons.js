// アイコンを作る: node tools/make_icons.js  (playwright が必要)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'prefectures.json'), 'utf8'));
const COL = ['#ff6b81', '#ffb703', '#22c493', '#a27bff', '#ff9ad5'];
const paths = d.prefs.filter(p => p.name !== '沖縄').map(p => `<path d="${p.d}" fill="${COL[p.color % 5]}" stroke="#1c1b22" stroke-width="9" stroke-linejoin="round"/>`).join('');
const svg = (pad, round) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${round}" fill="#ffd84a"/>
<g transform="translate(${pad + 6},${pad + 6})" opacity=".35"><svg x="0" y="0" width="${512 - 2 * pad}" height="${512 - 2 * pad}" viewBox="140 0 600 880" preserveAspectRatio="xMidYMid meet"><g fill="#1c1b22">${d.prefs.filter(p => p.name !== '沖縄').map(p => `<path d="${p.d}" stroke="#1c1b22" stroke-width="9"/>`).join('')}</g></svg></g>
<svg x="${pad}" y="${pad}" width="${512 - 2 * pad}" height="${512 - 2 * pad}" viewBox="140 0 600 880" preserveAspectRatio="xMidYMid meet">${paths}</svg></svg>`;
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 512, height: 512 } });
  const out = (n, s, px) => pg.setViewportSize({ width: px, height: px }).then(() => pg.setContent(`<body style="margin:0;background:transparent"><div style="width:${px}px;height:${px}px">${s.replace('width="512" height="512"', `width="${px}" height="${px}"`)}</div>`)).then(() => pg.screenshot({ path: path.join(__dirname, '..', 'icons', n), omitBackground: true }));
  await out('icon-512.png', svg(46, 112), 512); await out('icon-192.png', svg(46, 112), 192);
  await out('maskable-512.png', svg(96, 0), 512);           // 角丸なし・余白大きめ(OSが丸く切り抜く)
  await out('apple-touch-icon.png', svg(40, 0), 180);       // iOSは角丸を自分でつける
  await b.close(); })();
