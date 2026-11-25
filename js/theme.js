/* 時間帯テーマ: 端末のいる場所と時刻から、朝・昼・夕方・夜で画面の色を変える。
   日の出・日没は緯度経度から計算する(位置が不明なときは東京)。 ?tod=morning|day|evening|night で固定できる */
(function (root) {
  'use strict';
  const KEY = 'hashitte-loc';
  let loc = [35.6762, 139.6503];
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && isFinite(s[0]) && isFinite(s[1])) loc = s; } catch (e) { /* 既定 */ }

  /* 日の出・日没(その日の0時からの分、現地ではなく端末時刻に合わせたUTC換算) — 簡易版NOAA式 */
  function sun(date, lat, lon) {
    const rad = Math.PI / 180, N = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 864e5);
    const g = 2 * Math.PI / 365 * (N - 1);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const c = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
    if (c > 1) return { rise: null, set: null, polar: 'night' };
    if (c < -1) return { rise: null, set: null, polar: 'day' };
    const ha = Math.acos(c) / rad;
    const riseUTC = 720 - 4 * (lon + ha) - eqt, setUTC = 720 - 4 * (lon - ha) - eqt;   // UTC分
    // 端末の「今日」の0時(ローカル)を基準にした分へ
    const base = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - date.getTimezoneOffset() * -60000 * 0;
    const dayStartLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const toLocalMin = m => { const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + m * 60000; return (t - dayStartLocal) / 60000; };
    void base;
    return { rise: toLocalMin(riseUTC), set: toLocalMin(setUTC) };
  }
  /* 画面の色(選べる色)。sea=背景、glow=中央のうっすら明るい部分、dark=暗い背景(文字を明るくする) */
  const COLORS = {
    yellow: { sea: '#ffd84a', glow: '#ffe680' }, orange: { sea: '#ff9a5c', glow: '#ffc58f' }, red: { sea: '#ff6b6b', glow: '#ffa8a8' },
    pink: { sea: '#ff9ad5', glow: '#ffcdea' }, green: { sea: '#6fd08c', glow: '#b7ecc6' }, sky: { sea: '#7fd3f0', glow: '#c4ecfa' },
    blue: { sea: '#6f9bff', glow: '#b5cdff' }, purple: { sea: '#b08cff', glow: '#d9c7ff' }, white: { sea: '#ebe8e1', glow: '#ffffff' },
    black: { sea: '#26242c', glow: '#3d3a47', dark: true },
  };
  const LEGACY = { morning: 'yellow', day: 'yellow', evening: 'orange', night: 'black' };   // 以前の「朝・昼・夕方・夜」の選択は、近い色に引きつぐ
  let mode = 'sky'; try { mode = localStorage.getItem('hashitte-theme-mode') || 'sky'; } catch (e) { /* 水色 */ }
  try { if (!localStorage.getItem('hashitte-theme-sky1')) { localStorage.setItem('hashitte-theme-sky1', '1'); if (mode === 'yellow' || LEGACY[mode] === 'yellow') { mode = 'sky'; localStorage.setItem('hashitte-theme-mode', 'sky'); } } } catch (e) { /* なし */ }   // 基本の色を水色にした: 以前の黄色のままの端末は、一度だけ水色にそろえる
  if (LEGACY[mode]) mode = LEGACY[mode]; if (mode !== 'auto' && !COLORS[mode]) mode = 'sky';
  function phase(now) {
    const q = new URLSearchParams(location.search).get('tod');
    if (['morning', 'day', 'evening', 'night'].includes(q)) return q;
    const s = sun(now, loc[0], loc[1]);
    if (!s.rise && s.polar) return s.polar;
    const t = now.getHours() * 60 + now.getMinutes(), sr = ((s.rise % 1440) + 1440) % 1440, ss = ((s.set % 1440) + 1440) % 1440;
    if (t >= sr - 30 && t < sr + 180) return 'morning';
    if (t >= sr + 180 && t < ss - 120) return 'day';
    if (t >= ss - 120 && t < ss + 40) return 'evening';
    return 'night';
  }
  const META = { morning: '#ffd9b0', day: '#ffd84a', evening: '#ff9a5c', night: '#2b2140' };
  function apply() {
    const root = document.documentElement, st = root.style, c = COLORS[mode];
    const m = document.querySelector('meta[name="theme-color"]');
    if (mode === 'auto' || !c) {                                  // 自動: いる場所の日の出・日没に合わせて、朝・昼・夕方・夜で変わる
      ['--sea', '--glow', '--on-bg', '--sh'].forEach(k => st.removeProperty(k));
      const p = phase(new Date()); root.dataset.tod = p; if (m) m.content = META[p]; return p;
    }
    st.setProperty('--sea', c.sea); st.setProperty('--glow', c.glow);
    if (c.dark) { st.setProperty('--on-bg', '#fff3c4'); st.setProperty('--sh', '#0d0b12'); } else { st.removeProperty('--on-bg'); st.removeProperty('--sh'); }
    root.dataset.tod = c.dark ? 'night' : 'day'; if (m) m.content = c.sea; return root.dataset.tod;
  }
  root.Theme = {
    colors: COLORS,
    apply, mode: () => mode, setMode(v) { mode = v; try { localStorage.setItem('hashitte-theme-mode', v); } catch (e) { /* なし */ } apply(); }, phase: () => document.documentElement.dataset.tod,
    setLocation(lat, lon) { if (!isFinite(lat) || !isFinite(lon)) return; loc = [lat, lon]; try { localStorage.setItem(KEY, JSON.stringify(loc)); } catch (e) { /* なし */ } apply(); },
  };
  apply();
  setInterval(apply, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
})(window);
