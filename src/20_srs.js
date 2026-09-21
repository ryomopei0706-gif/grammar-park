/* ================= 間隔反復（SM-2系） ================= */
const EASE0 = 2.5, EASE_MIN = 1.3, FIRST = [1, 3], FUZZ = 0.10;

function newCard(t, today) {
  return { t, due: addDays(today, 1), ivl: 0, ease: EASE0, reps: 0, lapses: 0, stars: 1, last: null, hist: [] };
}
function starsFor(c) {
  const recentLapse = c.hist.slice(-3).some(h => h[1] === 0);
  if (c.ivl >= 60 && !recentLapse) return 5;
  if (c.ivl >= 30) return 4;
  if (c.ivl >= 7) return 3;
  if (c.reps >= 1) return 2;
  return 1;
}
/* q: 0=もう一度 1=難しい 2=できた 3=余裕 */
function rate(c, q, rtMs, today, rnd = Math.random) {
  if (q === 0) {
    c.lapses += 1; c.ivl = 1; c.ease = Math.max(EASE_MIN, c.ease - 0.20); c.stars = Math.max(1, c.stars - 1);
  } else {
    let ivl;
    if (c.reps === 0) ivl = FIRST[0];
    else if (c.reps === 1) ivl = FIRST[1];
    else { const f = q === 1 ? 1.2 : q === 2 ? c.ease : c.ease * 1.3; ivl = Math.max(c.ivl + 1, Math.round(c.ivl * f)); }
    if (q === 1) c.ease = Math.max(EASE_MIN, c.ease - 0.15);
    if (q === 3) c.ease = c.ease + 0.15;
    c.ivl = ivl; c.reps += 1;
  }
  c.hist.push([today, q, Math.round(rtMs || 0)]); if (c.hist.length > 10) c.hist = c.hist.slice(-10);
  if (q !== 0) c.stars = starsFor(c);
  const fuzz = 1 + (rnd() * 2 - 1) * FUZZ;
  c.due = addDays(today, Math.max(1, Math.round(c.ivl * fuzz)));
  c.last = today;
  return c;
}
/* タップ形式の自動評価 */
function autoRate(correct, rtMs, partial) {
  if (!correct) return 0;
  if (partial) return 1;
  if (rtMs <= 3000) return 3;
  if (rtMs <= 5000) return 2;
  return 1;
}
/* 自己判定（瞬間英作文）: revealed=答えを見てから押した */
function selfRate(said, rtMs, revealed) {
  if (!said) return 0;
  if (revealed) return 1;
  return rtMs <= 3500 ? 3 : 2;
}
function dueCards(today) {
  return Object.entries(S.cards).filter(([id, c]) => c.due <= today)
    .sort((a, b) => (a[1].stars - b[1].stars) || (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : 0));
}
/* 期日超過を上限内で翌日以降に散らす（ivl/ease は触らない） */
function spreadOverdue(today) {
  const cap = S.settings.capReview;
  const overdue = Object.values(S.cards).filter(c => c.due < today).sort((a, b) => (a.stars - b.stars) || (a.due < b.due ? -1 : 1));
  if (!overdue.length) return;
  const count = {}; Object.values(S.cards).forEach(c => { if (c.due >= today) count[c.due] = (count[c.due] || 0) + 1; });
  let day = today;
  for (const c of overdue) {
    while ((count[day] || 0) >= cap) day = addDays(day, 1);
    c.due = day; count[day] = (count[day] || 0) + 1;
  }
}
function unitStars(uid) {
  const L = LESSONS[uid]; if (!L) return 0;
  const ids = L.use.instant.filter(g => g.srs).map(g => g.id);
  const st = ids.map(id => S.cards[id]).filter(Boolean).map(c => c.stars);
  if (!st.length) return S.units[uid] && S.units[uid].done ? 1 : 0;
  st.sort((a, b) => a - b); return st[Math.floor(st.length / 2)];
}
/* ユニット完了時にカードを登録（翌日期日） */
function registerUnitCards(uid, today) {
  const L = LESSONS[uid], U = UNITS.find(u => u.id === uid);
  L.use.instant.filter(g => g.srs).forEach(g => { if (!S.cards[g.id]) S.cards[g.id] = newCard('G', today); });
  (L.srs.S || []).forEach(id => { if (!S.cards[id]) S.cards[id] = newCard('S', today); });
  (L.srs.D || []).forEach(id => { if (!S.cards[id]) S.cards[id] = newCard('D', today); });
  U.vocab.forEach(id => { if (!S.cards[id]) S.cards[id] = newCard('V', today); });
}
function cardCounts() {
  const t = todayStr(); let due = 0, total = 0, mastered = 0;
  Object.values(S.cards).forEach(c => { total++; if (c.due <= t) due++; if (c.stars >= 5) mastered++; });
  return { due, total, mastered };
}
