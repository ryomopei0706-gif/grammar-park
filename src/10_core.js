'use strict';
/* ================= util ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); };
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
function todayStr() { const d = new Date(); const cut = (typeof S !== 'undefined' && S.settings) ? S.settings.dayCutHour : 0; if (cut && d.getHours() < cut) d.setDate(d.getDate() - 1); return fmtDate(d); }
function weekKey(s) { // ISO week: YYYY-Www
  const d = parseDate(s); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-W' + pad2(Math.ceil((((t - y0) / 86400000) + 1) / 7));
}
const nowMs = () => Date.now();

/* ================= state ================= */
const KEY = 'gp.v1', SNAP_PREFIX = 'gp.snap.', SESS_KEY = 'gp.session';
const DEFAULT_STATE = () => ({
  v: 1, content: null,
  profile: { name: 'Pei', created: null, lessonDay: null, onboarded: false },
  settings: { mode: 10, tts: true, ttsRate: 0.9, ttsVoice: '', stt: false, silent: false, problemFirst: false, fontScale: 1, theme: 'auto', dayCutHour: 0, capReview: 20, capNew: 10, adaptive: true, sfx: true, autoNext: false },
  units: {}, areas: {}, cards: {},
  xp: 0, coins: 0,
  streak: { cur: 0, best: 0, lastDay: null, freezeUsed: {}, freezeExtra: 0 },
  days: {}, quests: { day: null, done: { review: false, step: false, spoken: false } },
  badges: {}, shards: 0, weak: [], said: [], my: [], missions: [], reports: [],
  parade: {}, backup: { lastExport: null, lastPrompt: null },
  lastTick: null, welcomeDone: null, currentUnit: null,
});
let S = DEFAULT_STATE();
let saveError = false;

function migrate(s) {
  const d = DEFAULT_STATE();
  const out = Object.assign({}, d, s);
  out.profile = Object.assign({}, d.profile, s.profile || {});
  out.settings = Object.assign({}, d.settings, s.settings || {});
  out.streak = Object.assign({}, d.streak, s.streak || {});
  out.quests = Object.assign({}, d.quests, s.quests || {});
  out.backup = Object.assign({}, d.backup, s.backup || {});
  out.v = 1;
  return out;
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) S = migrate(JSON.parse(raw)); } catch (e) { console.warn('load failed', e); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveError = false; }
  catch (e) { saveError = true; console.warn('save failed', e); }
}
function commit(fn, opts = {}) { fn(S); save(); if (!opts.silent && typeof render === 'function') render(); }

/* 復元ポイント（5世代） */
function snapKeys() { return Object.keys(localStorage).filter(k => k.startsWith(SNAP_PREFIX)).sort(); }
function pushSnap(label) {
  try {
    localStorage.setItem(SNAP_PREFIX + (label || todayStr()), JSON.stringify(S));
    const ks = snapKeys(); while (ks.length > 5) localStorage.removeItem(ks.shift());
  } catch (e) { console.warn('snap failed', e); }
}
function restoreSnap(key) {
  const raw = localStorage.getItem(key); if (!raw) return false;
  pushSnap('before-restore'); S = migrate(JSON.parse(raw)); save(); return true;
}

/* 1日の初回起動でやること */
function dailyTick() {
  const t = todayStr();
  if (S.lastTick === t) return false;
  if (S.lastTick) pushSnap(S.lastTick);
  streakTick(t);
  spreadOverdue(t);
  questTick(t);
  syncContent();
  S.lastTick = t; save();
  return true;
}

/* 教材版との整合 */
function syncContent() {
  if (typeof CONTENT_VERSION === 'undefined') return;
  if (S.content === CONTENT_VERSION) return;
  const valid = new Set();
  UNITS.forEach(u => { const L = LESSONS[u.id]; L.use.instant.forEach(g => valid.add(g.id)); L.drill.forEach(d => valid.add(d.id)); u.vocab.forEach(v => valid.add(v)); (L.srs.D || []).forEach(d => valid.add(d)); });
  Object.keys(S.cards).forEach(id => { if (!valid.has(id)) delete S.cards[id]; });
  S.content = CONTENT_VERSION;
}

/* ================= backup ================= */
function exportJSON() {
  return JSON.stringify({ app: 'grammar-park', v: 1, exportedAt: new Date().toISOString(), content: S.content, state: S }, null, 0);
}
function importJSON(text) {
  let obj; try { obj = JSON.parse(text); } catch (e) { throw new Error('JSONとして読めません'); }
  if (!obj || obj.app !== 'grammar-park' || !obj.state) throw new Error('Grammar Park のバックアップではありません');
  pushSnap('before-import'); S = migrate(obj.state); S.lastTick = null; save();
}
async function shareBackup() {
  const text = exportJSON(); const name = 'grammar-park_' + todayStr() + '.json';
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); S.backup.lastExport = todayStr(); save(); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    S.backup.lastExport = todayStr(); save(); return 'download';
  } catch (e) { return 'fail'; }
}
async function copyBackup() {
  try { await navigator.clipboard.writeText(exportJSON()); S.backup.lastExport = todayStr(); save(); return true; } catch (e) { return false; }
}

/* 日別集計 */
function dayLog(field, n = 1) {
  const t = todayStr(); const d = S.days[t] || (S.days[t] = { xp: 0, sessions: 0, reviews: 0, new: 0, spoken: 0, min: 0, correct: 0, answered: 0 });
  d[field] = (d[field] || 0) + n;
  // 180日より古い日別ログを落とす
  const keys = Object.keys(S.days); if (keys.length > 200) keys.sort().slice(0, keys.length - 180).forEach(k => delete S.days[k]);
}
