/* ================= 教材の索引 ================= */
const IDX = { unit: {}, instant: {}, drill: {}, dialog: {}, vocab: {}, vocabByUnit: {} };
function buildIndex() {
  UNITS.forEach(u => { IDX.unit[u.id] = u; });
  Object.entries(LESSONS).forEach(([uid, L]) => {
    L.use.instant.forEach(g => IDX.instant[g.id] = { ...g, unit: uid });
    L.drill.forEach(d => IDX.drill[d.id] = { ...d, unit: uid });
    L.notice.forEach(d => IDX.drill[d.id] = { ...d, unit: uid });
  });
  DIALOGS.forEach(d => IDX.dialog[d.id] = d);
  VOCAB.forEach(v => { IDX.vocab[v.id] = v; if (v.unit) (IDX.vocabByUnit[v.unit] = IDX.vocabByUnit[v.unit] || []).push(v); });
}
const STAGE = { 'meet': null, 'Q-01': 'recog', 'Q-02': 'recog', 'Q-03': 'recog', 'Q-04': 'recog', 'Q-05': 'recall', 'Q-07': 'recall', 'Q-08': 'produce', 'Q-10a': 'recog', 'Q-10b': 'recall', 'V-ja': 'recog', 'Q-11': 'recall', 'Q-12': 'recog' };

/* ================= ユニットの進行 ================= */
function unitState(uid) { return S.units[uid] || (S.units[uid] = { step: 1, done: null, lastAt: null }); }
function unitDone(uid) { return !!(S.units[uid] && S.units[uid].done); }
function prereqOK(u) { return (u.prereq || []).every(p => !IDX.unit[p] || unitDone(p)); }
function nextUnitId() {
  if (S.currentUnit && IDX.unit[S.currentUnit] && !unitDone(S.currentUnit)) return S.currentUnit;
  const u = UNITS.find(u => !unitDone(u.id) && prereqOK(u));
  S.currentUnit = u ? u.id : null; return S.currentUnit;
}
const STEP_NAMES = ['', '出会う', '気づく', '練習', '使う'];

function stepItems(uid, step) {
  const L = LESSONS[uid]; const items = [];
  const dl = (L.srs.D || []).map(id => IDX.dialog[id]).filter(Boolean);
  if (step === 1) items.push({ kind: 'meet', unit: uid, phase: 'lesson' });
  if (step === 2) L.notice.forEach(d => items.push({ kind: d.type, unit: uid, data: d, phase: 'lesson' }));
  if (step === 3) {
    L.drill.forEach(d => items.push({ kind: d.type, unit: uid, data: d, phase: 'lesson' }));
    dl.slice(0, 2).forEach(d => items.push({ kind: 'Q-10a', unit: uid, data: d, phase: 'lesson' }));
  }
  if (step === 4) {
    (dl.length > 2 ? dl.slice(2, 4) : dl.slice(0, 2)).forEach(d => items.push({ kind: 'Q-10b', unit: uid, data: d, phase: 'lesson' }));
    L.use.instant.forEach(g => items.push({ kind: 'Q-08', unit: uid, data: g, phase: 'lesson' }));
  }
  items.push({ kind: 'stepdone', unit: uid, step, phase: 'lesson' });
  return items;
}
function unitSteps(uid, from, count) {
  const items = []; for (let k = from; k <= 4 && k < from + count; k++) items.push(...stepItems(uid, k)); return items;
}

/* ================= 復習カード → 問題 ================= */
function reviewItem(id, c) {
  const base = { phase: 'review', cardId: id };
  if (c.t === 'G') { const g = IDX.instant[id]; return g ? { ...base, kind: 'Q-08', unit: g.unit, data: g } : null; }
  if (c.t === 'S') { const d = IDX.drill[id]; return d ? { ...base, kind: d.type, unit: d.unit, data: d } : null; }
  if (c.t === 'D') { const d = IDX.dialog[id]; return d ? { ...base, kind: c.stars <= 2 ? 'Q-10a' : 'Q-10b', unit: d.units[0], data: d } : null; }
  if (c.t === 'V') { const v = IDX.vocab[id]; if (!v) return null; const k = ['V-ja', 'Q-11', 'Q-12'][c.reps % 3]; return { ...base, kind: k, unit: v.unit, data: v }; }
  return null;
}
/* 同じユニット・同じ形式が続かないように並べる */
function interleave(items) {
  const pool = shuffle(items); const out = [];
  while (pool.length) {
    const prev = out[out.length - 1];
    let i = pool.findIndex(it => !prev || (it.unit !== prev.unit && it.kind !== prev.kind));
    if (i < 0) i = pool.findIndex(it => !prev || it.kind !== prev.kind);
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/* ================= セッションを組む ================= */
function buildSession(mode) {
  const today = todayStr();
  const gap = S.streak.lastDay ? daysBetween(S.streak.lastDay, today) : 0;
  const welcome = gap >= 7 && S.welcomeDone !== today && Object.keys(S.cards).length > 0;
  const CAP = { 5: 8, 10: 10, 15: 15 }[mode] || 10;
  let due = dueCards(today).slice(0, welcome ? 12 : CAP).map(([id, c]) => reviewItem(id, c)).filter(Boolean);
  due = interleave(due);
  const items = [...due];
  const meta = { welcome, reviews: due.length, unit: null, steps: [], sprint: 0, mode };
  if (welcome) return { items, meta };

  const uid = nextUnitId();
  if (uid) {
    const st = unitState(uid); const n = { 5: 1, 10: 2, 15: 4 }[mode] || 2;
    const from = clamp(st.step || 1, 1, 4);
    items.push(...unitSteps(uid, from, n));
    meta.unit = uid; for (let k = from; k <= 4 && k < from + n; k++) meta.steps.push(k);
  }
  if (mode >= 10) {
    const pool = Object.entries(S.cards).filter(([id, c]) => c.t === 'G' && c.stars >= 2 && IDX.instant[id]).map(([id]) => id);
    sample(pool, 10).forEach(id => items.push({ kind: 'Q-08', unit: IDX.instant[id].unit, data: IDX.instant[id], phase: 'sprint' }));
    meta.sprint = Math.min(10, pool.length);
  }
  return { items, meta };
}
/* ホーム用の「今日の1つ」 */
function planSummary(mode) {
  const today = todayStr(); const CAP = { 5: 8, 10: 10, 15: 15 }[mode] || 10;
  const gap = S.streak.lastDay ? daysBetween(S.streak.lastDay, today) : 0;
  const reviews = Math.min(CAP, dueCards(today).length);
  const uid = nextUnitId(); const parts = [];
  if (gap >= 7 && S.welcomeDone !== today && Object.keys(S.cards).length) return { text: 'おかえり。軽く5分だけ', reviews, unit: null };
  if (reviews) parts.push(`復習 ${reviews}`);
  if (uid) {
    const st = unitState(uid); const n = { 5: 1, 10: 2, 15: 4 }[mode] || 2; const from = clamp(st.step || 1, 1, 4);
    const names = []; for (let k = from; k <= 4 && k < from + n; k++) names.push(STEP_NAMES[k]);
    parts.push(`${uid} ${IDX.unit[uid].short}（${names.join('・')}）`);
  } else if (!reviews) parts.push('今日は復習だけ。ゆっくりどうぞ');
  return { text: parts.join(' → '), reviews, unit: uid };
}

/* 中断・再開 */
function saveSession(sess) { try { localStorage.setItem(SESS_KEY, JSON.stringify({ ...sess, savedAt: nowMs() })); } catch (e) { } }
function loadSession() {
  try { const raw = localStorage.getItem(SESS_KEY); if (!raw) return null; const s = JSON.parse(raw); if (nowMs() - s.savedAt > 86400000) { clearSession(); return null; } return s; } catch (e) { return null; }
}
function clearSession() { try { localStorage.removeItem(SESS_KEY); } catch (e) { } }
