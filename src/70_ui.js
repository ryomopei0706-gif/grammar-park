/* ================= 画面 ================= */
let route = 'home';
let sess = null;          // 進行中セッション
let lastResult = null;

function go(r) { route = r; window.scrollTo(0, 0); render(); }
function render() {
  applyTheme();
  const app = $('#app');
  if (!S.profile.onboarded) { app.innerHTML = renderOnboard(); bindOnboard(app); return; }
  if (route === 'session' && sess) { app.innerHTML = ''; renderSession(app); return; }
  if (route === 'result' && lastResult) { app.innerHTML = renderResult(); bindResult(app); return; }
  const body = { home: renderHome, map: renderMap, log: renderLog, settings: renderSettings }[route] || renderHome;
  app.innerHTML = body() + tabbar();
  bindCommon(app);
  ({ home: bindHome, map: bindMap, log: bindLog, settings: bindSettings }[route] || bindHome)(app);
}
function applyTheme() {
  const t = S.settings.theme; document.documentElement.dataset.theme = t === 'auto' ? '' : t;
  document.documentElement.style.setProperty('--fs', S.settings.fontScale || 1);
}
function tabbar() {
  const tabs = [['home', 'ホーム', ICON.home], ['map', 'マップ', ICON.map], ['log', 'きろく', ICON.log]];
  return `<nav id="tabbar">${tabs.map(([r, n, ic]) => `<button class="${route === r || (route === 'settings' && r === 'log') ? 'on' : ''}" data-go="${r}">${ic}<span>${n}</span></button>`).join('')}</nav>`;
}
function bindCommon(root) { $$('[data-go]', root).forEach(b => b.addEventListener('click', () => go(b.dataset.go))); bindSpk(root); }

/* ---------- オンボーディング ---------- */
let obPage = 0;
function renderOnboard() {
  const pages = [
    `<div class="gate">🎡</div><h1>Grammar Park へようこそ</h1><p>中学英文法58ユニットを、1回5分の「アトラクション」で体に入れる。<br>忘れる前に復習が戻ってきて、使えた文型でパークが広がる。</p>`,
    `<div class="gate">🎟️</div><h1>あなたのこと</h1><p>呼び名と、1日にかける時間</p>
      <input id="ob-name" value="${esc(S.profile.name)}" placeholder="呼び名">
      <div class="seg" id="ob-mode">${[5, 10, 15].map(m => `<button data-m="${m}" class="${S.settings.mode === m ? 'on' : ''}">${m}分</button>`).join('')}</div>
      <p class="small muted">あとで設定から変えられます</p>`,
    `<div class="gate">🔊</div><h1>声を出せますか</h1><p>英文は読み上げます。まねして声に出すのがいちばん効きます。<br>電車など声を出せない場所が多いなら「心の中で」にしておけます。</p>
      <button class="btn" id="ob-test">🔊 読み上げを試す</button>
      <div class="seg" id="ob-silent"><button data-s="0" class="${!S.settings.silent ? 'on' : ''}">声に出す</button><button data-s="1" class="${S.settings.silent ? 'on' : ''}">心の中で</button></div>
      <p class="small muted">マイクは使いません（許可は求められません）</p>`,
  ];
  return `<div class="screen notab"><div class="ob">${pages[obPage]}</div>
    <div class="dots">${pages.map((_, i) => `<i class="${i === obPage ? 'on' : ''}"></i>`).join('')}</div>
    <button class="btn primary" id="ob-next">${obPage < 2 ? '次へ' : 'パークに入る'}</button></div>`;
}
function bindOnboard(root) {
  $$('#ob-mode button', root).forEach(b => b.addEventListener('click', () => { S.settings.mode = +b.dataset.m; save(); render(); }));
  $$('#ob-silent button', root).forEach(b => b.addEventListener('click', () => { S.settings.silent = b.dataset.s === '1'; save(); render(); }));
  const t = $('#ob-test', root); if (t) t.addEventListener('click', () => { unlockAudio(); speak('Welcome to Grammar Park. I like coffee.', 'en', { force: true }); });
  $('#ob-next', root).addEventListener('click', () => {
    unlockAudio();
    const n = $('#ob-name', root); if (n) S.profile.name = n.value.trim() || 'Pei';
    if (obPage < 2) { obPage++; save(); render(); }
    else { S.profile.onboarded = true; S.profile.created = todayStr(); save(); dailyTick(); go('home'); }
  });
}

/* ---------- ホーム ---------- */
function renderHome() {
  const mode = S.settings.mode; const plan = planSummary(mode); const lv = levelInfo(S.xp); const t = todayStr();
  const d = S.days[t] || {}; const pending = loadSession(); questTick(t);
  const q = S.quests.done;
  return `<div class="screen">
    <div class="h-row"><div><div class="eyebrow">Grammar Park</div><h1>こんにちは、${esc(S.profile.name)}</h1></div>
      <div class="pill acc">Lv.${lv.lv}</div></div>
    ${saveError ? '<div class="warnband">この環境では保存できません。学習記録が残らない可能性があります（プライベートブラウズ？）</div>' : ''}
    <div class="pass"><div class="eyebrow">今日の1つ</div><div class="big">${esc(plan.text)}</div>
      <div class="foot"><span>連続入園 <b>${S.streak.cur}日</b>${freezeLeft(t) ? ` ❄${freezeLeft(t)}` : ''}</span><span>今日 <b>${d.xp || 0} xp</b></span></div></div>
    <button class="btn primary" id="start">${pending ? '▶ つづきから' : '▶ はじめる'}</button>
    ${pending ? '<button class="tinybtn" id="restart">つづきを捨てて最初から</button>' : ''}
    <div class="row"><div class="seg grow" id="mode">${[5, 10, 15].map(m => `<button data-m="${m}" class="${mode === m ? 'on' : ''}">${m}分</button>`).join('')}</div></div>
    <div class="card"><div class="eyebrow">今日のクエスト</div>
      <div class="quest ${q.review ? 'done' : ''}"><span class="box">${q.review ? '✓' : ''}</span>復習を終える</div>
      <div class="quest ${q.step ? 'done' : ''}"><span class="box">${q.step ? '✓' : ''}</span>新しいステップを1つ</div>
      <div class="quest ${q.spoken ? 'done' : ''}"><span class="box">${q.spoken ? '✓' : ''}</span>声に出して10文（${Math.min(10, d.spoken || 0)}/10）</div></div>
    <div class="card"><div class="level"><div class="badge">${lv.lv}</div><div class="t"><b>${esc(lv.title)}</b><span>${S.xp} xp${lv.next ? ` ／ 次まで ${lv.next - S.xp}` : ''}</span></div></div><div class="bar acc"><i style="width:${Math.round(lv.pct * 100)}%"></i></div></div>
    ${S.lastCando ? `<div class="card flat"><div class="eyebrow">前回言えるようになったこと</div><div style="font-weight:700">${esc(S.lastCando)}</div></div>` : ''}
  </div>`;
}
function bindHome(root) {
  $$('#mode button', root).forEach(b => b.addEventListener('click', () => { S.settings.mode = +b.dataset.m; save(); render(); }));
  $('#start', root).addEventListener('click', () => { unlockAudio(); startSession(); });
  const r = $('#restart', root); if (r) r.addEventListener('click', () => { clearSession(); render(); });
}

/* ---------- セッション ---------- */
function startSession() {
  const pending = loadSession();
  if (pending) { sess = pending; go('session'); return; }
  const { items, meta } = buildSession(S.settings.mode);
  if (!items.length) { toast('今日はもうやることがありません。ゆっくりどうぞ'); return; }
  sess = { items, meta, i: 0, stats: { correct: 0, answered: 0, xp: 0, spoken: 0, reviews: 0, reviewsDone: 0, combo: 0, comboBonus: false, cando: [], stars: {}, levelUp: 0, retry: [] }, startedAt: nowMs() };
  sess.stats.reviews = items.filter(x => x.phase === 'review').length;
  items.forEach(x => { if (x.cardId && S.cards[x.cardId]) sess.stats.stars[x.unit] = sess.stats.stars[x.unit] || unitStars(x.unit); });
  saveSession(sess); go('session');
}
function renderSession(app) {
  const total = sess.items.length + sess.stats.retry.length;
  const item = sess.items[sess.i];
  if (!item) { finishSession(); return; }
  app.innerHTML = `<div class="screen notab" style="gap:12px"><div class="shead"><button class="x" id="quit">×</button><div class="bar"><i style="width:${Math.round(sess.i / total * 100)}%"></i></div><div class="n">${sess.i + 1}/${total}</div></div><div id="qroot" class="q"></div></div>`;
  $('#quit', app).addEventListener('click', () => {
    openModal(`<h3>中断しますか？</h3><p class="sub">続きは24時間保存されます</p><div class="btn-row"><button class="btn" id="m-no">もどる</button><button class="btn primary" id="m-yes">中断する</button></div>`);
    $('#m-no').addEventListener('click', closeModal);
    $('#m-yes').addEventListener('click', () => { closeModal(); stopSpeak(); saveSession(sess); sess = null; go('home'); });
  });
  if (item.kind === 'stepdone') { onStepDone(item); sess.i++; saveSession(sess); renderSession(app); return; }
  renderQuestion(item, $('#qroot', app), res => { onAnswer(item, res); sess.i++; saveSession(sess); render(); });
}
function onAnswer(item, res) {
  if (res.skip) return;
  const st = sess.stats; const stage = STAGE[item.kind]; const today = todayStr();
  st.answered++; dayLog('answered');
  if (res.correct) { st.correct++; dayLog('correct'); st.combo++; const n = XP[stage] || 2; st.xp += n; st.levelUp = addXp(n) || st.levelUp; }
  else st.combo = 0;
  if (st.combo === 5 && !st.comboBonus) { st.comboBonus = true; st.xp += XP.combo; st.levelUp = addXp(XP.combo) || st.levelUp; toast('5連続！ +10xp'); }
  if (item.kind === 'Q-08') {
    if (res.said) { st.spoken++; dayLog('spoken'); questUpdate('spoken'); S.said.push({ id: item.data.id, en: item.data.ans[0], ja: item.data.ja, at: today }); if (S.said.length > 500) S.said = S.said.slice(-500); }
    if (item.phase === 'lesson' && (res.q || 0) <= 1 && !item.retry) { sess.stats.retry.push(1); sess.items.push({ ...item, retry: true, phase: 'lesson' }); }
  }
  if (item.cardId && S.cards[item.cardId] && !item.retry) {
    const c = S.cards[item.cardId]; rate(c, res.q ?? (res.correct ? 2 : 0), res.rtMs, today);
    if (item.phase === 'review') { st.reviewsDone++; dayLog('reviews'); }
  }
  save();
}
function onStepDone(item) {
  const st = sess.stats; const u = unitState(item.unit); const today = todayStr();
  if ((u.step || 1) <= item.step) u.step = item.step + 1;
  u.lastAt = today; st.xp += XP.step; st.levelUp = addXp(XP.step) || st.levelUp; questUpdate('step');
  if (item.step === 4 && !u.done) {
    u.done = today; registerUnitCards(item.unit, today); st.xp += XP.unit; st.levelUp = addXp(XP.unit) || st.levelUp;
    st.cando.push(IDX.unit[item.unit].cando); S.lastCando = IDX.unit[item.unit].cando; dayLog('new');
    if (S.currentUnit === item.unit) S.currentUnit = null;
  }
  save();
}
function finishSession() {
  const st = sess.stats; const today = todayStr(); stopSpeak();
  if (st.reviews && st.reviewsDone >= st.reviews) { st.xp += XP.review; st.levelUp = addXp(XP.review) || st.levelUp; }
  if (st.reviewsDone >= st.reviews) questUpdate('review');   // 復習が無かった日も「終えた」扱い
  if (sess.meta.welcome) { S.welcomeDone = today; st.xp += XP.welcome; st.levelUp = addXp(XP.welcome) || st.levelUp; }
  questUpdate('spoken');
  if (questBonus()) { st.xp += XP.quests; st.levelUp = addXp(XP.quests) || st.levelUp; st.questBonus = true; }
  markStudied(today); dayLog('sessions'); dayLog('min', Math.round((nowMs() - sess.startedAt) / 60000));
  const starsAfter = {}; Object.keys(st.stars).forEach(u => starsAfter[u] = unitStars(u));
  lastResult = { ...st, starsAfter, unit: sess.meta.unit, steps: sess.meta.steps, welcome: sess.meta.welcome };
  clearSession(); sess = null; save();
  go('result');
  if (lastResult.levelUp) { sfx('level'); confetti(); setTimeout(() => openModal(`<div class="center" style="padding:10px 0"><div style="font-size:3rem">🎉</div><h3>レベル ${lastResult.levelUp}</h3><p style="font-size:1.25rem;font-weight:800;color:var(--accent)">${esc(LEVELS[lastResult.levelUp - 1][1])}</p>${[5, 10, 15, 20].includes(lastResult.levelUp) ? '<p class="sub">節目です。設定からバックアップを書き出しておくと安心</p>' : ''}<button class="btn primary" style="margin-top:12px" onclick="closeModal()">やった</button></div>`), 300); }
}
function renderResult() {
  const r = lastResult; const acc = r.answered ? Math.round(r.correct / r.answered * 100) : 0;
  const starRows = Object.keys(r.stars).filter(u => r.starsAfter[u] !== r.stars[u]).map(u => `<div class="li"><div class="t"><b>${esc(u)} ${esc(IDX.unit[u]?.short || '')}</b></div>${starsHtml(r.stars[u])} → ${starsHtml(r.starsAfter[u])}</div>`).join('');
  const stepsRow = r.unit ? `<div class="li"><div class="t"><b>${esc(r.unit)} ${esc(IDX.unit[r.unit].short)}</b><span>${r.steps.map(k => STEP_NAMES[k]).join('・')} を完了</span></div>${unitDone(r.unit) ? '<span class="pill ok">乗車完了</span>' : `<span class="pill">次は ${STEP_NAMES[unitState(r.unit).step] || '完了'}</span>`}</div>` : '';
  return `<div class="screen notab"><div class="result"><div class="emoji">${r.welcome ? '👋' : '🎉'}</div>
    ${r.cando.length ? `<div class="eyebrow">今日言えるようになったこと</div><div class="cando">${r.cando.map(esc).join('<br>')}</div>` : `<h2>${r.welcome ? 'おかえり' : 'おつかれさま'}</h2>`}
    <div class="stat-row" style="width:100%"><div class="stat"><div class="v">${r.correct}/${r.answered}</div><div class="k">正解 ${acc}%</div></div><div class="stat"><div class="v">+${r.xp}</div><div class="k">xp</div></div><div class="stat"><div class="v">${S.streak.cur}</div><div class="k">連続入園</div></div></div>
    <div class="delta">${stepsRow}${starRows}</div>
    ${r.questBonus ? '<div class="pill ok">今日のクエスト 全達成 +30xp +10コイン</div>' : ''}
    </div><div class="qfoot"><button class="btn primary" id="home">ホームへ</button></div></div>`;
}
function bindResult(root) { $('#home', root).addEventListener('click', () => go('home')); }

/* ---------- マップ ---------- */
function renderMap() {
  const cur = nextUnitId();
  return `<div class="screen"><div class="h-row"><h1>マップ</h1><span class="sub">${UNITS.filter(u => unitDone(u.id)).length}/${UNITS.length} 乗車</span></div>
    ${AREAS.filter(a => a.units.length).map(a => `<div class="card" style="border-top:4px solid ${a.color}"><div class="areahead"><span class="c" style="background:${a.color}"></span><b>エリア${a.id} ${esc(a.name)}</b><span>${a.units.filter(unitDone).length}/${a.units.length}</span></div>
      <div class="list">${a.units.map(id => { const u = IDX.unit[id]; const done = unitDone(id); const st = unitStars(id); const ok = prereqOK(u); const isCur = id === cur;
        return `<button class="li ${!ok && !done ? 'dim' : ''}" data-u="${id}"><div class="t"><b>${isCur ? '▶ ' : done ? '● ' : ok ? '○ ' : '🔒 '}${esc(u.id)} ${esc(u.title)}</b><span>${esc(u.cando)}</span></div>${done ? starsHtml(st) : isCur ? `<span class="pill acc">${STEP_NAMES[unitState(id).step] || ''}</span>` : ''}</button>`; }).join('')}</div></div>`).join('')}
    <div class="card flat"><div class="sub">エリア2以降は教材ができ次第、追加されます（次回のフェーズ）。</div></div>
  </div>`;
}
function bindMap(root) {
  $$('[data-u]', root).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.u; const u = IDX.unit[id]; const done = unitDone(id); const ok = prereqOK(u); const st = unitStars(id);
    const L = LESSONS[id]; const said = S.said.filter(s => s.id.startsWith(id + '-')).slice(-5);
    openModal(`<h3>${esc(u.id)} ${esc(u.title)}</h3><div class="sub">${esc(u.cando)}</div>
      <div>${u.key.map(k => `<div class="keyline"><div class="grow"><b>${esc(k.en)}</b><span>${esc(k.ja)}</span></div>${spkBtn(k.en)}</div>`).join('')}</div>
      <div class="row"><span>${starsHtml(st)}</span><span class="sub">${done ? '乗車済み ' + (S.units[id].done) : ok ? '乗れます' : '前提: ' + (u.prereq || []).join(', ')}</span></div>
      ${said.length ? `<div class="eyebrow">言えた文</div><div class="small">${said.map(s => esc(s.en)).join('<br>')}</div>` : ''}
      <div class="btn-row">${!done && ok ? `<button class="btn primary" id="m-go">${id === nextUnitId() ? 'つづきをやる' : 'ここから始める'}</button>` : ''}<button class="btn" id="m-why">説明を読む</button></div>`);
    const g = $('#m-go'); if (g) g.addEventListener('click', () => { S.currentUnit = id; save(); closeModal(); go('home'); toast(`次は ${id} から`); });
    $('#m-why').addEventListener('click', () => { closeModal(); showMeetModal(id); });
  }));
}

/* ---------- きろく ---------- */
function renderLog() {
  const t = todayStr(); const [y, m] = t.split('-').map(Number);
  const first = new Date(y, m - 1, 1); const nDays = new Date(y, m, 0).getDate(); const offset = (first.getDay() + 6) % 7;
  let cells = '<div class="h">月</div><div class="h">火</div><div class="h">水</div><div class="h">木</div><div class="h">金</div><div class="h">土</div><div class="h">日</div>';
  for (let i = 0; i < offset; i++) cells += '<div class="d x"></div>';
  let monthDays = 0;
  for (let d = 1; d <= nDays; d++) { const k = `${y}-${pad2(m)}-${pad2(d)}`; const dd = S.days[k]; const on = dd && dd.sessions > 0; if (on) monthDays++; cells += `<div class="d ${on ? 'on' : dd && dd.frozen ? 'frz' : ''} ${k === t ? 'today' : ''}">${d}</div>`; }
  const last7 = Array.from({ length: 7 }, (_, i) => S.days[addDays(t, -i)] || {}); const a7 = last7.reduce((s, d) => s + (d.answered || 0), 0), c7 = last7.reduce((s, d) => s + (d.correct || 0), 0);
  const cc = cardCounts(); const mastered = UNITS.filter(u => unitStars(u.id) >= 5).length;
  return `<div class="screen"><div class="h-row"><h1>きろく</h1><button class="spk" data-go="settings" aria-label="設定">${ICON.gear}</button></div>
    <div class="card"><div class="eyebrow">${y}年${m}月</div><div class="cal">${cells}</div><div class="sub">◌ 点線＝凍結した日</div></div>
    <div class="stat-row"><div class="stat"><div class="v">${S.streak.cur}</div><div class="k">連続入園</div></div><div class="stat"><div class="v">${S.streak.best}</div><div class="k">最長</div></div><div class="stat"><div class="v">${monthDays}</div><div class="k">今月の日数</div></div></div>
    <div class="stat-row"><div class="stat"><div class="v">${S.said.length}</div><div class="k">言えた文</div></div><div class="stat"><div class="v">${mastered}</div><div class="k">★5ユニット</div></div><div class="stat"><div class="v">${a7 ? Math.round(c7 / a7 * 100) : '–'}%</div><div class="k">正解率 7日</div></div></div>
    <div class="card"><div class="eyebrow">くわしい統計</div><div class="small">カード ${cc.total} 枚（今日の期日 ${cc.due}、★5 ${cc.mastered}）<br>累計 ${S.xp} xp ／ コイン ${S.coins}<br>教材 ${S.content || '–'} ／ アプリ __BUILD__</div></div>
  </div>`;
}
function bindLog(root) { }

/* ---------- 設定 ---------- */
function renderSettings() {
  const s = S.settings; const sw = (k, on) => `<button class="switch ${on ? 'on' : ''}" data-sw="${k}" role="switch"></button>`;
  const enVoices = voices.filter(v => /^en/i.test(v.lang));
  return `<div class="screen"><div class="h-row"><h1>設定</h1><button class="btn sm" data-go="log">← きろく</button></div>
    <div class="card">
      <div class="set"><div class="k">呼び名</div><input id="name" value="${esc(S.profile.name)}" style="width:120px;padding:8px;border-radius:10px;border:1.5px solid var(--line);background:var(--card)"></div>
      <div class="set"><div class="k">1日の時間</div><div class="seg" style="width:180px" id="s-mode">${[5, 10, 15].map(m => `<button data-m="${m}" class="${s.mode === m ? 'on' : ''}">${m}分</button>`).join('')}</div></div>
      <div class="set"><div class="k">読み上げ<small>英文を自動で読む</small></div>${sw('tts', s.tts)}</div>
      <div class="set"><div class="k">読み上げの速さ</div><select class="sel" id="rate">${[0.7, 0.8, 0.9, 1.0].map(r => `<option value="${r}" ${s.ttsRate == r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="set"><div class="k">声</div><select class="sel" id="voice" style="max-width:150px"><option value="">自動</option>${enVoices.map(v => `<option value="${esc(v.name)}" ${s.ttsVoice === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      <div class="set"><div class="k">効果音</div>${sw('sfx', s.sfx)}</div>
      <div class="set"><div class="k">声を出さないモード<small>瞬間英作文を心の中で</small></div>${sw('silent', s.silent)}</div>
      <div class="set"><div class="k">自動で次へ<small>正解後 1.4秒で進む</small></div>${sw('autoNext', s.autoNext)}</div>
    </div>
    <div class="card">
      <div class="set"><div class="k">文字サイズ</div><div class="seg" style="width:180px" id="s-fs">${[[0.9, '小'], [1, '中'], [1.15, '大']].map(([v, n]) => `<button data-f="${v}" class="${s.fontScale == v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="set"><div class="k">テーマ</div><div class="seg" style="width:180px" id="s-theme">${[['auto', '自動'], ['light', '明'], ['dark', '暗']].map(([v, n]) => `<button data-t="${v}" class="${s.theme === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="set"><div class="k">日付の切り替え<small>夜型なら4時</small></div><div class="seg" style="width:140px" id="s-cut">${[[0, '0時'], [4, '4時']].map(([v, n]) => `<button data-c="${v}" class="${s.dayCutHour == v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="set"><div class="k">1日の復習上限</div><select class="sel" id="cap">${[10, 15, 20, 30, 40].map(n => `<option ${s.capReview == n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="card"><div class="eyebrow">データ</div>
      <div class="sub">記録はこの端末の中だけにあります。${S.backup.lastExport ? '最後のバックアップ: ' + S.backup.lastExport : 'まだバックアップしていません'}</div>
      <div class="btn-row"><button class="btn" id="bk-share">📤 ファイルに書き出す</button><button class="btn" id="bk-copy">📋 テキストをコピー</button></div>
      <div class="btn-row"><label class="btn" for="bk-file">📥 ファイルを取り込む</label><input type="file" id="bk-file" accept=".json,application/json" hidden><button class="btn" id="bk-paste">📋 貼り付けて取り込む</button></div>
      <button class="btn line" id="bk-snap">復元ポイントから戻す（${snapKeys().length}）</button>
      <button class="btn line" id="reset" style="color:var(--ng)">この端末のデータを消す</button>
    </div>
    <div class="card"><div class="eyebrow">iPhone で使う</div><div class="small">Safari で開いて 共有 → 「ホーム画面に追加」。毎日のリマインドは iPhone の『ショートカット』アプリで「オートメーション → 時刻 → URLを開く」にこのページのURLを入れると作れます。</div>
      <div class="small muted">教材 ${S.content || '–'} ／ アプリ __BUILD__</div></div>
  </div>`;
}
function bindSettings(root) {
  const s = S.settings;
  $$('[data-sw]', root).forEach(b => b.addEventListener('click', () => { s[b.dataset.sw] = !s[b.dataset.sw]; save(); render(); }));
  $$('#s-mode button', root).forEach(b => b.addEventListener('click', () => { s.mode = +b.dataset.m; save(); render(); }));
  $$('#s-fs button', root).forEach(b => b.addEventListener('click', () => { s.fontScale = +b.dataset.f; save(); render(); }));
  $$('#s-theme button', root).forEach(b => b.addEventListener('click', () => { s.theme = b.dataset.t; save(); render(); }));
  $$('#s-cut button', root).forEach(b => b.addEventListener('click', () => { s.dayCutHour = +b.dataset.c; save(); render(); }));
  $('#rate', root).addEventListener('change', e => { s.ttsRate = +e.target.value; save(); speak('I like coffee.', 'en', { force: true }); });
  $('#voice', root).addEventListener('change', e => { s.ttsVoice = e.target.value; save(); speak('Welcome to Grammar Park.', 'en', { force: true }); });
  $('#cap', root).addEventListener('change', e => { s.capReview = +e.target.value; save(); });
  $('#name', root).addEventListener('change', e => { S.profile.name = e.target.value.trim() || 'Pei'; save(); });
  $('#bk-share', root).addEventListener('click', async () => { const r = await shareBackup(); toast({ shared: '書き出しました', download: 'ダウンロードしました', cancel: 'キャンセル', fail: '書き出せませんでした。テキストのコピーを試してください' }[r]); render(); });
  $('#bk-copy', root).addEventListener('click', async () => { toast((await copyBackup()) ? 'コピーしました。メモなどに貼って保存してください' : 'コピーできませんでした'); render(); });
  $('#bk-file', root).addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(txt => doImport(txt)); });
  $('#bk-paste', root).addEventListener('click', () => {
    openModal(`<h3>バックアップを貼り付け</h3><textarea id="pst" style="width:100%;min-height:140px;border-radius:14px;border:1.5px solid var(--line);padding:10px;background:var(--card)"></textarea><div class="btn-row"><button class="btn" onclick="closeModal()">やめる</button><button class="btn primary" id="pst-ok">取り込む</button></div>`);
    $('#pst-ok').addEventListener('click', () => { const v = $('#pst').value; closeModal(); doImport(v); });
  });
  $('#bk-snap', root).addEventListener('click', () => {
    const ks = snapKeys(); if (!ks.length) { toast('復元ポイントはまだありません'); return; }
    openModal(`<h3>復元ポイント</h3><p class="sub">今の状態は「before-restore」として控えを取ります</p><div class="list">${ks.slice().reverse().map(k => `<button class="btn" data-k="${k}">${k.replace(SNAP_PREFIX, '')}</button>`).join('')}</div><button class="btn line" onclick="closeModal()">やめる</button>`);
    $$('[data-k]').forEach(b => b.addEventListener('click', () => { if (restoreSnap(b.dataset.k)) { closeModal(); toast('戻しました'); S.lastTick = null; dailyTick(); render(); } }));
  });
  $('#reset', root).addEventListener('click', () => {
    openModal(`<h3>この端末のデータを消しますか？</h3><p class="sub">復元ポイントに控えを取ってから初期化します</p><div class="btn-row"><button class="btn" onclick="closeModal()">やめる</button><button class="btn" style="background:var(--ng);color:#fff" id="rs-ok">消す</button></div>`);
    $('#rs-ok').addEventListener('click', () => { pushSnap('before-reset'); S = DEFAULT_STATE(); save(); clearSession(); closeModal(); obPage = 0; render(); });
  });
}
function doImport(txt) {
  try { importJSON(txt); clearSession(); dailyTick(); toast('取り込みました'); go('home'); } catch (e) { toast(e.message || '取り込めませんでした'); }
}
