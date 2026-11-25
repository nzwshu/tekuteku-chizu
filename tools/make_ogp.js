// OGP画像(1200x630)を作る: node tools/make_ogp.js  (playwright が必要)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'prefectures.json'), 'utf8'));
const COL = ['#ff6b81', '#ffb703', '#22c493', '#a27bff', '#ff9ad5'];
const done = new Set([13, 14, 11, 12, 8, 9, 10, 7, 6, 5, 4, 3, 2, 22, 23, 21, 20, 19, 15, 16, 17, 18, 24, 25, 26, 27, 28, 29, 30, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 36, 37, 33, 34, 35, 31, 32]);
const [, , vw, vh] = d.viewBox;
const paths = d.prefs.map(p => { const id = +p.id, on = done.has(id) && id % 5 !== 1 || id === 13; return `<path d="${p.d}" fill="${on ? COL[p.color % 5] : '#fff'}" stroke="#1c1b22" stroke-width="3" stroke-linejoin="round"/>`; }).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0}body{width:1200px;height:630px;background:#7fd3f0;position:relative;overflow:hidden;font-family:'Zen Maru Gothic','Hiragino Maru Gothic ProN','Noto Sans CJK JP',sans-serif;color:#1c1b22}
.map{position:absolute;right:30px;top:20px;height:590px;width:518px;filter:drop-shadow(5px 6px 0 rgba(28,27,34,.5))}
h1{position:absolute;left:64px;top:150px;margin:0;font-size:92px;line-height:1.12;font-weight:900;letter-spacing:.02em}
p{position:absolute;left:68px;top:420px;margin:0;font-size:36px;font-weight:700;line-height:1.5}
.tag{position:absolute;left:68px;top:540px;background:#1c1b22;color:#7fd3f0;border-radius:40px;padding:10px 28px;font-size:30px;font-weight:900}
</style><svg class="map" viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>
<h1>てくてく<br>地図あつめ</h1><p>歩いた道・走った道が線になって、<br>日本地図が完成していく</p><div class="tag">ウォーキング × ランニング × 地図パズル</div>`;
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await pg.setContent(html); console.log(await pg.evaluate(() => { const s = document.querySelector('svg'); const r = s.getBoundingClientRect(); return [document.querySelectorAll('path').length, r.x, r.y, r.width, r.height, getComputedStyle(s).display]; })); await pg.waitForTimeout(500); await pg.screenshot({ path: path.join(__dirname, '..', 'ogp.png') }); await b.close(); })();
