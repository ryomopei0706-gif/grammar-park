#!/usr/bin/env node
/* ロジックの単体テスト: node tools/test.mjs
   src/ の DOM に触らないモジュール（core / srs / session / game / match）を vm で読み込んで検査する */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ls = {};
Object.defineProperties(ls, {
  getItem: { value: k => (Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null) },
  setItem: { value: (k, v) => { ls[k] = String(v); } },
  removeItem: { value: k => { delete ls[k]; } },
});
const ctx = {
  console, Date, Math, JSON, Object, Array, Set, Map, Number, String, RegExp, Error, Promise, setTimeout, clearTimeout,
  localStorage: ls, window: {}, document: { querySelector: () => null, querySelectorAll: () => [] }, navigator: {},
};
vm.createContext(ctx);
const src = ['data/content.js', 'src/10_core.js', 'src/20_srs.js', 'src/30_session.js', 'src/50_game.js', 'src/60_match.js'].map(read).join('\n');
vm.runInContext(src + '\nbuildIndex();\nthis.__x = { get S(){ return S; }, set S(v){ S = v; }, rate, newCard, starsFor, autoRate, selfRate, spreadOverdue, dueCards, normalize, compare, wordDiff, buildSession, interleave, addDays, daysBetween, weekKey, todayStr, levelOf, levelInfo, streakTick, markStudied, freezeLeft, registerUnitCards, unitStars, DEFAULT_STATE, migrate, exportJSON, importJSON, dailyTick, questTick, questUpdate, questBonus, nextUnitId, unitState };', ctx);
const X = ctx.__x;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  ✗', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
const section = n => console.log('▸', n);

section('日付');
eq(X.addDays('2026-09-21', 10), '2026-10-01', 'addDays');
eq(X.daysBetween('2026-09-21', '2026-10-01'), 10, 'daysBetween');
eq(X.weekKey('2026-09-21'), '2026-W39', 'weekKey 月曜');
eq(X.weekKey('2026-09-27'), '2026-W39', 'weekKey 日曜');
eq(X.weekKey('2026-09-28'), '2026-W40', 'weekKey 翌週');

section('間隔反復');
{
  const rnd = () => 0.5; // fuzz = 0
  let c = X.newCard('G', '2026-09-21'); eq(c.due, '2026-09-22', '新規は翌日');
  X.rate(c, 2, 2000, '2026-09-22', rnd); eq(c.ivl, 1, '1回目できた→1日'); eq(c.stars, 2, '★2'); eq(c.due, '2026-09-23', 'due');
  X.rate(c, 2, 2000, '2026-09-23', rnd); eq(c.ivl, 3, '2回目→3日');
  X.rate(c, 2, 2000, '2026-09-26', rnd); eq(c.ivl, 8, '3回目→3×2.5=7.5→8'); eq(c.stars, 3, '★3');
  X.rate(c, 3, 1000, '2026-10-04', rnd); ok(c.ivl >= 26 && c.ease > 2.5, '余裕で伸びる ' + c.ivl);
  X.rate(c, 0, 9000, '2026-10-30', rnd); eq(c.ivl, 1, 'もう一度→1日'); eq(c.lapses, 1, 'lapse'); eq(c.stars, 2, '★は1つ下がる(3→2)'); ok(c.ease < 2.65, 'ease 低下');
  X.rate(c, 1, 6000, '2026-10-31', rnd); ok(c.ivl >= 2, '難しい ×1.2 で最低+1');
  const d = X.newCard('V', '2026-09-21'); d.ivl = 61; d.reps = 6; d.hist = [['2026-09-01', 2, 0]]; eq(X.starsFor(d), 5, '★5 条件');
  d.hist.push(['2026-09-02', 0, 0]); eq(X.starsFor(d), 4, '直近に lapse があると★4');
  eq(X.autoRate(true, 2500), 3, 'autoRate 余裕'); eq(X.autoRate(true, 4000), 2, 'できた'); eq(X.autoRate(true, 8000), 1, '難しい'); eq(X.autoRate(false, 100), 0, '不正解');
  eq(X.selfRate(true, 3000, false), 3, 'selfRate 速い'); eq(X.selfRate(true, 6000, false), 2, '普通'); eq(X.selfRate(true, 1000, true), 1, '見てから'); eq(X.selfRate(false, 0, false), 0, '言えなかった');
}

section('期日超過の分散');
{
  const S = X.DEFAULT_STATE(); S.settings.capReview = 5; X.S = S;
  for (let i = 0; i < 12; i++) S.cards['c' + i] = { ...X.newCard('G', '2026-09-01'), due: '2026-09-0' + (1 + (i % 3)), stars: 1 + (i % 3) };
  X.spreadOverdue('2026-09-21');
  const byDay = {}; Object.values(S.cards).forEach(c => byDay[c.due] = (byDay[c.due] || 0) + 1);
  eq(byDay['2026-09-21'], 5, '今日は上限まで'); eq(byDay['2026-09-22'], 5, '翌日も上限'); eq(byDay['2026-09-23'], 2, '残り');
  ok(Object.values(S.cards).every(c => c.due >= '2026-09-21'), '期日超過が残っていない');
  ok(Object.values(S.cards).filter(c => c.stars === 1).every(c => c.due === '2026-09-21'), '★が低いものから今日に');
}

section('答え合わせ');
eq(X.normalize("I'm from Osaka."), 'i am from osaka', "短縮形");
eq(X.normalize("Don't worry!"), 'do not worry', "don't");
ok(X.compare("i like coffee", ["I like coffee."]).ok, '大文字・句読点を無視');
ok(!X.compare("I like coffees", ["I like coffee."]).ok, '複数形は不正解（通常）');
ok(X.compare("I like coffees", ["I like coffee."], { lenient: true }).partial, '音声認識時は部分正解');
ok(X.compare("Can you help me?", ["Could you help me?", "Can you help me?"]).ok, '別解');
{ const r = X.compare("I coffee like", ["I like coffee."]); ok(!r.ok && r.diff.some(x => x.diff), 'diff に印'); }

section('セッション');
{
  const S = X.DEFAULT_STATE(); S.profile.onboarded = true; X.S = S;
  const s10 = X.buildSession(10);
  eq(s10.meta.unit, 'U01', '最初は U01'); eq(s10.meta.steps, [1, 2], '10分は2ステップ');
  eq(s10.items.filter(i => i.kind === 'stepdone').length, 2, 'stepdone 2つ'); eq(s10.items[0].kind, 'meet', '出会うから');
  const s5 = X.buildSession(5); eq(s5.meta.steps, [1], '5分は1ステップ');
  const s15 = X.buildSession(15); eq(s15.meta.steps, [1, 2, 3, 4], '15分は1ユニット');
  ok(s15.items.filter(i => i.kind === 'Q-08').length >= 10, '④に瞬間英作文10'); ok(s15.items.some(i => i.kind === 'Q-10a'), '③に受け答え4択'); ok(s15.items.some(i => i.kind === 'Q-10b'), '④に受け答え組み立て');
  // ユニット完了 → カード登録 → 翌日の復習
  X.unitState('U01').step = 5; S.units.U01.done = '2026-09-21'; X.registerUnitCards('U01', '2026-09-21');
  const n = Object.keys(S.cards).length; ok(n >= 5 + 3 + 2 + 10, 'カード登録 ' + n);
  ok(Object.values(S.cards).every(c => c.due === '2026-09-22'), '期日は翌日');
  eq(X.unitStars('U01'), 1, '完了直後は★1');
  eq(X.nextUnitId(), 'U02', '次は U02（前提 U01 済み）');
  // 翌日
  const orig = X.todayStr;
  const due = X.dueCards('2026-09-22'); eq(due.length, n, '翌日に全部期日');
  const items = X.interleave(due.map(([id, c]) => ({ id, kind: c.t, unit: 'U01' })));
  let same = 0; for (let i = 1; i < items.length; i++) if (items[i].kind === items[i - 1].kind && items.length > 6) same++;
  ok(same <= items.length / 2, '同じ種類が連続しすぎない ' + same);
}

section('レベル・連続入園・クエスト');
{
  eq(X.levelOf(0), 1, 'Lv1'); eq(X.levelOf(100), 2, 'Lv2'); eq(X.levelOf(22000), 20, 'Lv20'); eq(X.levelInfo(150).next, 250, '次の閾値');
  const S = X.DEFAULT_STATE(); X.S = S;
  X.markStudied('2026-09-21'); eq(S.streak.cur, 1, '初日');
  X.markStudied('2026-09-21'); eq(S.streak.cur, 1, '同日は増えない');
  X.streakTick('2026-09-22'); X.markStudied('2026-09-22'); eq(S.streak.cur, 2, '連続');
  X.streakTick('2026-09-24'); eq(S.streak.cur, 2, '1日空き→凍結で維持'); ok(S.days['2026-09-23'].frozen, '凍結記録');
  X.markStudied('2026-09-24'); eq(S.streak.cur, 3, '凍結後も続く');
  X.streakTick('2026-09-27'); eq(S.streak.cur, 0, '2日空き(25,26)→週の凍結枠は残り1つなので切れる');
  ok(S.days['2026-09-25'].frozen && !(S.days['2026-09-26'] || {}).frozen, '25 は凍結、26 は凍結できず'); eq(S.streak.best, 3, '最長は残る');
  X.markStudied('2026-09-27'); eq(S.streak.cur, 1, 'また1から');
  X.streakTick('2026-09-29'); eq(S.streak.cur, 1, '28日は翌週(W40)の枠で凍結できる'); ok(S.days['2026-09-28'].frozen, '28 凍結');
}
{
  // 凍結の週境界を厳密に
  const S = X.DEFAULT_STATE(); X.S = S;
  X.markStudied('2026-09-21'); // 月
  X.streakTick('2026-09-24'); // 22,23 を凍結（W39 の枠2つ）
  X.markStudied('2026-09-24');
  X.streakTick('2026-09-26'); // 25 は W39 だが枠切れ → 切れる
  eq(S.streak.cur, 0, '週の凍結枠2つを超えたら切れる'); eq(S.streak.best, 2, '最長は残る');
}
{
  const S = X.DEFAULT_STATE(); X.S = S; const T = X.todayStr(); X.questTick(T);
  X.questUpdate('review'); X.questUpdate('step'); ok(!X.questBonus(), '2つでは付かない');
  S.days[T] = { spoken: 10 }; X.questUpdate('spoken'); ok(X.questBonus(), '3つで付く'); ok(!X.questBonus(), '2回目は付かない'); eq(S.coins, 10, 'コイン');
}

section('バックアップ');
{
  const S = X.DEFAULT_STATE(); S.xp = 1234; S.profile.name = 'Test'; X.S = S;
  const j = X.exportJSON(); X.S = X.DEFAULT_STATE(); X.importJSON(j); eq(X.S.xp, 1234, '往復'); eq(X.S.profile.name, 'Test', '名前');
  let threw = false; try { X.importJSON('{"app":"other"}'); } catch (e) { threw = true; } ok(threw, '他アプリのJSONは拒否');
  const m = X.migrate({ xp: 5 }); eq(m.settings.mode, 10, 'migrate が既定値を補う');
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
