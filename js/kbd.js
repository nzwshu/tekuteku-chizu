/* アプリ内のキーボード(フリック / QWERTY)。設定で「端末のもの」「フリック」「QWERTY」から選ぶ。
   検索欄(#search, #set-nick)にだけ使う。端末のキーボードは出さない(inputmode="none")。 */
(function (root) {
  'use strict';
  const TARGETS = '#search, #set-nick';
  const KANA = [['あ', 'い', 'う', 'え', 'お'], ['か', 'き', 'く', 'け', 'こ'], ['さ', 'し', 'す', 'せ', 'そ'], ['た', 'ち', 'つ', 'て', 'と'], ['な', 'に', 'ぬ', 'ね', 'の'], ['は', 'ひ', 'ふ', 'へ', 'ほ'], ['ま', 'み', 'む', 'め', 'も'], ['や', '（', 'ゆ', '）', 'よ'], ['ら', 'り', 'る', 'れ', 'ろ'], ['わ', 'を', 'ん', 'ー', '〜'], ['、', '。', '？', '！', '…']];
  const ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, null, 9, 10];            // 3列×4行(null=小゛゜キー)
  const CYCLES = ['あぁ', 'いぃ', 'うぅ', 'えぇ', 'おぉ', 'かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'てで', 'とど', 'はばぱ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ', 'つっづ', 'やゃ', 'ゆゅ', 'よょ', 'わゎ'].map(s => [...s]);
  const QROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const T = x => (root.I18N ? root.I18N.tr(x) : x);
  let mode = 'system', layout = 'flick', kanaMode = !(root.I18N && root.I18N.lang === 'en'), el = null, input = null, cand = () => [], hideTimer = 0;


  /* ---- ローマ字 → かな(QWERTYで、日本語の検索に使う) ---- */
  const RT = (() => {
    const t = {}, V = 'aiueo';
    const rows = { '': 'あいうえお', k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
    for (const c in rows) [...V].forEach((v, i) => { t[c + v] = rows[c][i]; });
    Object.assign(t, { ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', wi: 'うぃ', we: 'うぇ', si: 'し', ti: 'ち', tu: 'つ', hu: 'ふ', zi: 'じ', shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', xtu: 'っ', ltu: 'っ', xtsu: 'っ',
      sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', thi: 'てぃ', dhi: 'でぃ', xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ' });
    const ys = { k: 'き', g: 'ぎ', s: 'し', z: 'じ', j: 'じ', t: 'ち', c: 'ち', d: 'ぢ', n: 'に', h: 'ひ', b: 'び', p: 'ぴ', m: 'み', r: 'り' };
    for (const c in ys) { t[c + 'ya'] = ys[c] + 'ゃ'; t[c + 'yu'] = ys[c] + 'ゅ'; t[c + 'yo'] = ys[c] + 'ょ'; t[c + 'ye'] = ys[c] + 'ぇ'; }
    const pre = new Set(); for (const k in t) for (let i = 1; i < k.length; i++) pre.add(k.slice(0, i));
    return { t, pre };
  })();
  function toKana(s) {                                              // 戻り値: かなにした部分 + まだ決まらない末尾
    let out = '', i = 0;
    while (i < s.length) {
      const c = s[i], n = s[i + 1];
      if (c === '-') { out += 'ー'; i++; continue; }
      if (c === 'n') {
        if (n === 'n') { out += 'ん'; i += 2; continue; }
        if (n === undefined) return { out, rest: 'n' };
        if (!'aiueoy'.includes(n)) { out += 'ん'; i++; continue; }
      }
      if (n !== undefined && c === n && /[bcdfghjklmpqrstvwxyz]/.test(c)) { out += 'っ'; i++; continue; }
      let hit = '';
      for (let L = Math.min(4, s.length - i); L >= 1; L--) { const k = s.substr(i, L); if (RT.t[k]) { hit = k; break; } }
      if (hit) { out += RT.t[hit]; i += hit.length; continue; }
      if (RT.pre.has(s.slice(i)) || (s.length - i === 1 && /[a-z]/.test(c))) return { out, rest: s.slice(i) };
      out += c; i++;
    }
    return { out, rest: '' };
  }
  const kanaOn = () => kanaMode && !!input && input.id === 'search';
  function kanaFix() {                                              // 入力の直前にならんだローマ字を、かなに置きかえる
    if (!input) return; const a = input.selectionStart ?? input.value.length, m = /[a-z-]+$/.exec(input.value.slice(0, a)); if (!m) return;
    const r = toKana(m[0]), txt = r.out + r.rest; if (txt !== m[0]) input.setRangeText(txt, a - m[0].length, a, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));   // 変換後の文字で、候補を出しなおす
  }
  function flushN() { if (!input) return; const a = input.selectionStart ?? input.value.length; if (a > 0 && input.value[a - 1] === 'n' && kanaOn()) { input.setRangeText('ん', a - 1, a, 'end'); } }

  const DEL = '⌫';
  const kata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  function insert(text) {
    if (!input) return; const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.setRangeText(text, a, b, 'end'); input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function back() {
    if (!input) return; const a = input.selectionStart ?? 0, b = input.selectionEnd ?? a;
    if (a !== b) input.setRangeText('', a, b, 'end'); else if (a > 0) input.setRangeText('', a - 1, a, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function modifier() {                                              // 直前の文字を 濁点/半濁点/小さい字 に切り替える
    if (!input) return; const a = input.selectionStart ?? 0; if (a < 1) return; const ch = input.value[a - 1];
    const cy = CYCLES.find(c => c.includes(ch)); if (!cy) return;
    input.setRangeText(cy[(cy.indexOf(ch) + 1) % cy.length], a - 1, a, 'end'); input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function enter() {
    if (!input) return; flushN(); const f = input.form;
    if (f) { f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); }
    else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    hide();
  }

  /* ボタンの反応は「押して離した」で処理する(clickだと、フォーカスを守る処理と干渉して取りこぼすことがある) */
  function tapOn(b, fn) {
    let armed = false;
    b.addEventListener('pointerdown', () => { armed = true; });
    b.addEventListener('pointerleave', () => { armed = false; }); b.addEventListener('pointercancel', () => { armed = false; });
    b.addEventListener('pointerup', () => { if (!armed) return; armed = false; fn(); keepFocus(); });
    b.addEventListener('click', e => e.preventDefault());
  }
  function keepFocus() { if (input && document.activeElement !== input) { try { input.focus({ preventScroll: true }); } catch (e) { /* なし */ } } }
  function build() {
    if (el) el.remove();
    el = document.createElement('div'); el.id = 'kbd'; el.setAttribute('data-notr', ''); el.hidden = true;
    ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => el.addEventListener(ev, e => { if (e.cancelable) e.preventDefault(); }, { passive: false }));   // 入力欄からフォーカスを外さない
    const bar = document.createElement('div'); bar.className = 'kbd-cand'; el.appendChild(bar);
    const body = document.createElement('div'); body.className = 'kbd-body ' + layout; el.appendChild(body);
    const pop = document.createElement('div'); pop.className = 'kbd-pop'; pop.hidden = true; el.appendChild(pop);
    const mk = (cls, label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kk ' + cls; b.textContent = label; tapOn(b, fn); return b; };
    if (layout === 'flick') {
      const col0 = document.createElement('div'); col0.className = 'col0';
      const move = d => () => { if (!input) return; const n = Math.max(0, Math.min(input.value.length, (input.selectionStart ?? 0) + d)); input.setSelectionRange(n, n); };
      col0.append(mk('fn big', 'ABC', () => { layout = 'qwerty'; build(); show(); }), mk('fn big', '◀', move(-1)), mk('fn big', '▶', move(1)),
        mk('fn clr', T('全消し'), () => { if (!input) return; input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }));
      const grid = document.createElement('div'); grid.className = 'grid';
      ORDER.forEach(i => {
        if (i === null) { grid.appendChild(mk('fn', '小゛゜', modifier)); return; }
        const set = KANA[i], b = document.createElement('button'); b.type = 'button'; b.className = 'kk flick'; b.textContent = set[0];
        let x0 = 0, y0 = 0, down = false, pick = 0;
        const dir = (dx, dy) => (Math.abs(dx) < 16 && Math.abs(dy) < 16) ? 0 : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : (dy < 0 ? 2 : 4);
        b.addEventListener('pointerdown', e => { down = true; x0 = e.clientX; y0 = e.clientY; pick = 0; try { b.setPointerCapture(e.pointerId); } catch (x) { /* なし */ } showPop(b, set, 0); });
        b.addEventListener('pointermove', e => { if (!down) return; const d = dir(e.clientX - x0, e.clientY - y0); if (d !== pick) { pick = d; showPop(b, set, d); } });
        const up = () => { if (!down) return; down = false; pop.hidden = true; insert(set[pick]); };
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', () => { down = false; pop.hidden = true; });
        grid.appendChild(b);
      });
      const col4 = document.createElement('div'); col4.className = 'col4';
      col4.append(mk('fn big', DEL, back), mk('fn', T('空白'), () => insert('　')), mk('fn go', T(input && input.id === 'set-nick' ? '完了' : '検索'), enter));
      body.append(col0, grid, col4);
    } else {
      QROWS.forEach((r, ri) => {
        const row = document.createElement('div'); row.className = 'qrow r' + ri;
        if (ri === 3) row.appendChild(mk('q', '-', () => { insert('-'); if (kanaOn()) kanaFix(); }));
        [...r].forEach(c => row.appendChild(mk('q', c, () => { insert(c); if (kanaOn() && /[a-z]/.test(c)) kanaFix(); })));
        if (ri === 3) row.appendChild(mk('fn big del', DEL, back));
        body.appendChild(row);
      });
      const last = document.createElement('div'); last.className = 'qrow last';
      last.append(mk('fn big', 'あ', () => { layout = 'flick'; build(); show(); }), mk('fn kmode', input && input.id === 'search' ? (kanaMode ? 'かな' : 'ABC') : 'ABC', () => { if (!input || input.id !== 'search') return; flushN(); kanaMode = !kanaMode; build(); show(); }), mk('q sp', '', () => insert(' ')), mk('fn go', T(input && input.id === 'set-nick' ? '完了' : '検索'), enter));
      body.appendChild(last);
    }
    function showPop(b, set, d) {
      const r = b.getBoundingClientRect(), pr = el.getBoundingClientRect();
      pop.hidden = false; pop.textContent = set[d]; pop.style.left = (r.left - pr.left + r.width / 2) + 'px'; pop.style.top = (r.top - pr.top - 46) + 'px';
    }
    document.body.appendChild(el); renderCand();
  }
  function renderCand() {
    if (!el) return; const bar = el.querySelector('.kbd-cand'); bar.textContent = '';
    if (!input || input.id !== 'search') { bar.hidden = true; setH(); return; }
    const list = cand(kanaOn() ? input.value.replace(/n$/, 'ん') : input.value) || []; bar.hidden = false; bar.classList.toggle('empty', !list.length);
    list.slice(0, 8).forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kc'; b.textContent = c.label; tapOn(b, () => { input.value = c.value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); hide(); }); bar.appendChild(b); });
    setH();
  }
  function setH() { const h = el && !el.hidden ? Math.round(el.getBoundingClientRect().height) : 0; document.documentElement.style.setProperty('--kbd', h + 'px'); document.documentElement.classList.toggle('kbd-on', h > 0); }
  function show() { if (!el) build(); el.hidden = false; renderCand(); requestAnimationFrame(() => { setH(); try { input && input.scrollIntoView({ block: 'center' }); } catch (e) { /* なし */ } }); }
  function hide() { if (el) el.hidden = true; setH(); }

  document.addEventListener('pointerdown', e => { const t = e.target; if (mode !== 'system' && t.matches && t.matches(TARGETS)) t.inputMode = 'none'; }, true);   // あとから作られる入力欄(設定のニックネーム)も、フォーカス前に端末キーボードを止める
  document.addEventListener('focusin', e => {
    const t = e.target; if (mode === 'system' || !t.matches || !t.matches(TARGETS)) return;
    input = t; clearTimeout(hideTimer); show();
  });
  document.addEventListener('pointerdown', e => { if (!el || el.hidden) return; if (e.target.closest && (e.target.closest('#kbd') || e.target.closest(TARGETS))) return; hide(); }, true);
  document.addEventListener('input', e => { if (input && e.target === input) renderCand(); });

  const defLayout = () => (mode === 'qwerty' || (root.I18N && root.I18N.lang === 'en')) ? 'qwerty' : 'flick';   // 英語表示のときは、アルファベットのキーボードを先に出す
  window.addEventListener('i18nchange', () => { kanaMode = !(root.I18N && root.I18N.lang === 'en'); if (mode !== 'system') { layout = defLayout(); if (el) { const was = !el.hidden; build(); el.hidden = !was; setH(); } } });
  function apply() {
    document.querySelectorAll(TARGETS).forEach(i => { i.inputMode = mode === 'system' ? 'search' : 'none'; });
    if (mode === 'system') hide(); else { layout = defLayout(); if (el) { build(); el.hidden = true; } }
  }
  root.Kbd = { setMode(m) { mode = m === 'flick' || m === 'qwerty' ? m : 'system'; apply(); }, setCandidates(fn) { cand = fn; }, refresh() { if (el) { const was = !el.hidden; build(); el.hidden = !was; setH(); } }, kata };
  window.addEventListener('i18nchange', () => root.Kbd.refresh());
})(window);
