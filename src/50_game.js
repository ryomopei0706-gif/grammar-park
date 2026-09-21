/* ================= XP・レベル・連続入園・クエスト ================= */
const XP = { recog: 2, recall: 3, produce: 4, step: 10, unit: 50, review: 20, combo: 10, gate: 100, mission: 80, quests: 30, welcome: 30 };
const LEVELS = [
  [0, 'ゲート前'], [100, '入園者'], [250, 'マップ持ち'], [450, '1日券'], [700, 'ファストパス'], [1000, '2エリア目'], [1400, 'ナイトパス'], [1900, '3エリア目'], [2500, '湖のほとり'], [3200, '塔の入口'],
  [4000, '年間パス'], [5000, 'コースター常連'], [6200, 'パレード先頭'], [7600, '花火の名所を知る人'], [9200, '裏道を知る人'], [11000, 'キャスト見習い'], [13000, 'キャスト'], [15500, 'エリアマネージャー'], [18500, 'パークデザイナー'], [22000, 'パークの創業者'],
];
function levelOf(xp) { let lv = 1; for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i][0]) lv = i + 1; return lv; }
function levelInfo(xp) {
  const lv = levelOf(xp); const cur = LEVELS[lv - 1][0]; const next = LEVELS[lv] ? LEVELS[lv][0] : null;
  return { lv, title: LEVELS[lv - 1][1], cur, next, pct: next ? clamp((xp - cur) / (next - cur), 0, 1) : 1 };
}
/* XP 加算。レベルアップしたら新レベルを返す */
function addXp(n) {
  const before = levelOf(S.xp); S.xp += n; dayLog('xp', n);
  const after = levelOf(S.xp);
  return after > before ? after : 0;
}

/* ---- 連続入園 ---- */
const FREEZE_PER_WEEK = 2;
function freezeAvailable(day) {
  const wk = weekKey(day); const used = S.streak.freezeUsed[wk] || 0;
  return used < FREEZE_PER_WEEK + (S.streak.freezeExtra || 0);
}
function useFreeze(day) {
  const wk = weekKey(day); S.streak.freezeUsed[wk] = (S.streak.freezeUsed[wk] || 0) + 1;
  const d = S.days[day] || (S.days[day] = { xp: 0, sessions: 0 }); d.frozen = true;
  // 週の凍結枠を使い切っていて extra があれば消費
  if (S.streak.freezeUsed[wk] > FREEZE_PER_WEEK && S.streak.freezeExtra > 0) S.streak.freezeExtra--;
  const ks = Object.keys(S.streak.freezeUsed).sort(); while (ks.length > 8) delete S.streak.freezeUsed[ks.shift()];
}
/* 1日の初回起動: 空いた日を凍結するか、切る */
function streakTick(today) {
  const last = S.streak.lastDay; if (!last || S.streak.cur === 0) return;
  const gap = daysBetween(last, today);
  for (let i = 1; i < gap; i++) {
    const d = addDays(last, i);
    if (S.days[d] && S.days[d].frozen) continue;
    if (freezeAvailable(d)) useFreeze(d); else { S.streak.cur = 0; break; }
  }
}
/* セッション完了時 */
function markStudied(today) {
  if (S.streak.lastDay === today) return false;
  S.streak.cur = S.streak.cur > 0 ? S.streak.cur + 1 : 1;
  if (S.streak.lastDay && daysBetween(S.streak.lastDay, today) === 1) { /* 連続 */ }
  S.streak.best = Math.max(S.streak.best, S.streak.cur);
  S.streak.lastDay = today;
  return true;
}
function freezeLeft(today) { const wk = weekKey(today); return Math.max(0, FREEZE_PER_WEEK + (S.streak.freezeExtra || 0) - (S.streak.freezeUsed[wk] || 0)); }

/* ---- デイリークエスト ---- */
function questTick(today) {
  if (S.quests.day !== today) S.quests = { day: today, done: { review: false, step: false, spoken: false }, bonus: false };
}
function questUpdate(kind) {
  const t = todayStr(); questTick(t);
  if (kind === 'review') S.quests.done.review = true;
  if (kind === 'step') S.quests.done.step = true;
  if (kind === 'spoken') { const d = S.days[t]; if (d && d.spoken >= 10) S.quests.done.spoken = true; }
}
/* 3つ揃った最初の1回だけ true（ボーナス付与はここで） */
function questBonus() {
  if (!S.quests.bonus && S.quests.done.review && S.quests.done.step && S.quests.done.spoken) { S.quests.bonus = true; S.coins += 10; return true; }
  return false;
}
