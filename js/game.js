/* 待ち時間のミニゲーム(3種類): jump=ランナージャンプ / memo=しんけいすいじゃく / mole=もぐらたたき */
(function (root) {
  'use strict';
  const T = x => (root.I18N ? root.I18N.tr(x) : x);
  const BEST = k => 'hashitte-game-best-' + k;
  const best = k => { try { return +localStorage.getItem(BEST(k)) || 0; } catch (e) { return 0; } };
  const saveBest = (k, v) => { if (v > best(k)) { try { localStorage.setItem(BEST(k), v); } catch (e) { /* なし */ } } };
  let cv, c, raf = null, timer = null, g = null, kind = null, listeners = [];
  const on = (t, ev, fn) => { t.addEventListener(ev, fn); listeners.push([t, ev, fn]); };
  function clearAll() {
    if (raf) cancelAnimationFrame(raf); raf = null; clearInterval(timer); timer = null;
    listeners.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn)); listeners = [];
  }
  function overlay(W, H, title, sub) {
    c.fillStyle = 'rgba(16,41,59,.68)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.textAlign = 'center';
    c.font = '700 18px sans-serif'; c.fillText(T(title), W / 2, H / 2 - 6); c.font = '13px sans-serif'; c.fillText(T(sub), W / 2, H / 2 + 20); c.textAlign = 'left';
  }

  /* ---------- 1. ランナージャンプ ---------- */
  function jumpGame() {
    const W = 320, H = 150, GY = 112;
    setup(W, H);
    const reset = () => { g = { y: 0, vy: 0, obs: [], t: 0, score: 0, over: false, speed: 3.4, next: 70 }; }; reset();
    const jump = () => { if (g.over) { reset(); return; } if (g.y === 0) g.vy = 9.6; };
    on(cv, 'pointerdown', jump); on(root, 'keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } });
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!g.over) {
        g.t++; g.score = Math.floor(g.t / 6); g.speed = 3.4 + Math.min(3.2, g.t / 900);
        g.vy -= 0.58; g.y = Math.max(0, g.y + g.vy); if (g.y === 0) g.vy = 0;
        if (--g.next <= 0) { g.obs.push({ x: W + 10, w: 16 + Math.random() * 10 }); g.next = 48 + Math.random() * 55 - Math.min(22, g.t / 60); }
        g.obs.forEach(o => { o.x -= g.speed; }); g.obs = g.obs.filter(o => o.x > -40);
        for (const o of g.obs) if (o.x < 58 && o.x + o.w > 34 && g.y < 22) { g.over = true; saveBest('jump', g.score); }
      }
      c.fillStyle = '#fff3b8'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const x = ((i * 130 - g.t * 0.4) % (W + 60) + W + 60) % (W + 60) - 30; c.beginPath(); c.arc(x, 30 + i * 9, 10, 0, 7); c.arc(x + 12, 32 + i * 9, 8, 0, 7); c.fill(); }
      c.fillStyle = '#9fd0b5'; c.fillRect(0, GY + 4, W, H - GY);
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([12, 10]); c.lineDashOffset = g.t * g.speed; c.beginPath(); c.moveTo(0, GY + 12); c.lineTo(W, GY + 12); c.stroke(); c.setLineDash([]);
      c.font = '26px sans-serif'; c.fillText('🏃', 32, GY - g.y); g.obs.forEach(o => c.fillText('🚧', o.x, GY + 2));
      c.fillStyle = '#1c1b22'; c.font = '700 13px sans-serif'; c.fillText(T(`${g.score}m  ベスト ${best('jump')}m`), 10, 20);
      if (g.over) overlay(W, H, `${g.score}m 走りました`, 'タップでもう一度');
    };
    raf = requestAnimationFrame(loop);
  }

  /* ---------- 2. しんけいすいじゃく(配置も絵柄も固定。1回でもまちがえたら、ぜんぶふせて振出しに戻る) ---------- */
  const MEMO_LAYOUT = ['🏃', '🗻', '📍', '👟', '🗾', '🍙', '🗻', '🏃', '👟', '📍', '🍙', '🗾'];   // 4列×3行。毎回おなじ並び
  const memoBest = () => { try { return +localStorage.getItem(BEST('memo')) || 0; } catch (e) { return 0; } };   // 少ない回数ほど良い
  function memoGame() {
    const W = 320, H = 300, COLS = 4, CW = 68, CH = 76, GAP = 8, X0 = (W - (COLS * CW + (COLS - 1) * GAP)) / 2, Y0 = 38, HOLD = 1000;
    setup(W, H);
    const reset = full => { g = { open: [], done: [], tries: full ? 1 : g.tries + 1, over: false, until: 0, ok: 0, most: full ? 0 : g.most }; }; g = { tries: 0, most: 0 }; reset(true);
    const at = (x, y) => { for (let i = 0; i < 12; i++) { const cx = X0 + (i % COLS) * (CW + GAP), cy = Y0 + Math.floor(i / COLS) * (CH + GAP); if (x >= cx && x <= cx + CW && y >= cy && y <= cy + CH) return i; } return -1; };
    on(cv, 'pointerdown', e => {
      e.preventDefault(); const now = performance.now();
      if (g.over) { reset(true); return; }
      if (g.until > now) return;                                       // まちがいを見せている間は、さわれない
      const r = cv.getBoundingClientRect(), i = at((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
      if (i < 0 || g.done.includes(i) || g.open.includes(i)) return;
      g.open.push(i);
      if (g.open.length < 2) return;
      const [p, q] = g.open;
      if (MEMO_LAYOUT[p] === MEMO_LAYOUT[q]) { g.done.push(p, q); g.open = []; g.ok = now + 500; g.most = Math.max(g.most, g.done.length / 2);
        if (g.done.length === 12) { g.over = true; const b = memoBest(); if (!b || g.tries < b) { try { localStorage.setItem(BEST('memo'), g.tries); } catch (x) { /* なし */ } } } }
      else g.until = now + HOLD;                                       // 1回でもまちがえたら、時間をおいて振出しに戻る
    });
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (g.until && g.until <= now && !g.over) reset(false);
      c.fillStyle = '#fff3d6'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#1c1b22'; c.font = '700 13px sans-serif'; c.textAlign = 'left';
      const bst = memoBest(); c.fillText(T(`${g.tries}回目  ${g.done.length / 2}/6組  ベスト ${bst ? bst + '回' : '-'}`), 8, 20);
      const bad = g.until > now;
      for (let i = 0; i < 12; i++) {
        const cx = X0 + (i % COLS) * (CW + GAP), cy = Y0 + Math.floor(i / COLS) * (CH + GAP), up = g.done.includes(i) || g.open.includes(i), done = g.done.includes(i);
        c.beginPath(); c.roundRect ? c.roundRect(cx, cy, CW, CH, 12) : c.rect(cx, cy, CW, CH);
        c.fillStyle = !up ? '#6f9bff' : done ? '#c9efd6' : (bad ? '#ffd0d0' : '#fff'); c.fill();
        c.lineWidth = 2.5; c.strokeStyle = '#1c1b22'; c.stroke();
        c.textAlign = 'center';
        if (up) { c.font = '34px sans-serif'; c.fillStyle = '#1c1b22'; c.fillText(MEMO_LAYOUT[i], cx + CW / 2, cy + CH / 2 + 12); }
        else { c.font = '700 26px sans-serif'; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText('?', cx + CW / 2, cy + CH / 2 + 10); }
        c.textAlign = 'left';
      }
      c.textAlign = 'center'; c.font = '700 14px sans-serif';
      if (bad) { c.fillStyle = '#c9302c'; c.fillText(T('ちがった…  最初からやり直し'), W / 2, H - 10); }
      else if (g.ok > now) { c.fillStyle = '#1fa971'; c.fillText(T('そろった！'), W / 2, H - 10); }
      else { c.font = '12px sans-serif'; c.fillStyle = '#6b7f8f'; c.fillText(T('1回でもまちがえると、ぜんぶ裏返ります'), W / 2, H - 10); }
      c.textAlign = 'left';
      if (g.over) overlay(W, H, `${g.tries}回目で ぜんぶそろった！`, 'タップでもう一度');
    };
    raf = requestAnimationFrame(loop);
  }

  /* ---------- 3. もぐらたたき(25秒) ---------- */
  function moleGame() {
    const W = 270, H = 300, CELL = 90;
    setup(W, H);
    const reset = () => { g = { moles: Array(9).fill(0), score: 0, t0: performance.now(), over: false, last: 0, flash: Array(9).fill(0) }; }; reset();
    on(cv, 'pointerdown', e => {
      if (g.over) { reset(); return; }
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top - 0) / r.height * H - 30;
      if (y < 0) return; const i = Math.floor(y / CELL) * 3 + Math.floor(x / CELL);
      if (i >= 0 && i < 9 && g.moles[i] > performance.now()) { g.score++; g.moles[i] = 0; g.flash[i] = performance.now() + 200; }
    });
    const loop = now => {
      raf = requestAnimationFrame(loop);
      const left = Math.max(0, 25 - (now - g.t0) / 1000);
      if (!g.over) {
        if (left <= 0) { g.over = true; saveBest('mole', g.score); }
        else if (now - g.last > Math.max(420, 900 - (25 - left) * 18)) {
          g.last = now; const i = Math.floor(Math.random() * 9); if (g.moles[i] < now) g.moles[i] = now + Math.max(650, 1100 - (25 - left) * 15);
        }
      }
      c.fillStyle = '#d9ecdf'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#1c1b22'; c.font = '700 14px sans-serif'; c.fillText(T(`${g.score}ひき   のこり ${left.toFixed(1)}秒   ベスト ${best('mole')}`), 8, 20);
      for (let i = 0; i < 9; i++) {
        const cx = (i % 3) * CELL + CELL / 2, cy = 30 + Math.floor(i / 3) * CELL + CELL / 2 + 8;
        c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(cx, cy + 18, 32, 13, 0, 0, 7); c.fill();
        if (g.moles[i] > now) { c.font = '40px sans-serif'; c.textAlign = 'center'; c.fillText('🐹', cx, cy + 12); c.textAlign = 'left'; }
        else if (g.flash[i] > now) { c.font = '30px sans-serif'; c.textAlign = 'center'; c.fillText('💥', cx, cy + 10); c.textAlign = 'left'; }
      }
      if (g.over) overlay(W, H, `${g.score}ひき たたきました`, 'タップでもう一度');
    };
    raf = requestAnimationFrame(loop);
  }

  function setup(W, H) { cv.width = W * 2; cv.height = H * 2; cv.style.aspectRatio = W + ' / ' + H; cv.style.maxWidth = Math.min(W * 1.4, 380) + 'px'; c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.textBaseline = 'alphabetic'; }
  const GAMES = { jump: jumpGame, memo: memoGame, mole: moleGame };
  root.MiniGame = {
    start(canvas, k) { this.stop(); cv = canvas; kind = k; (GAMES[k] || jumpGame)(); },
    stop() { clearAll(); },
    kinds: ['jump', 'memo', 'mole'],
  };
})(window);
