/* ================= 共通部品 ================= */
const ICON = {
  spk: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  log: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};
function spkBtn(text, lang = 'en', cls = '') { return `<button class="spk ${cls}" data-say="${esc(text)}" data-lang="${lang}" aria-label="読み上げ">${ICON.spk}</button>`; }
function bindSpk(root) { $$('[data-say]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speak(b.dataset.say, b.dataset.lang, { force: true, el: b }); })); }
function starsHtml(n) { return `<span class="stars">${'★'.repeat(n)}<span class="e">${'★'.repeat(5 - n)}</span></span>`; }
const ROLE_JA = { subj: 'だれが', verb: 'どうする', obj: 'なにを', mod: 'どこで・いつ', aux: 'はじめの言葉', neg: 'ない' };
function blocksHtml(u) {
  let h = '<div class="blocks">' + u.blocks.map(b => `<span class="blk ${b.r}">${esc(b.t)}<small>${ROLE_JA[b.r] || ''}</small></span>`).join('') + '</div>';
  if (u.blocksJa && u.blocksJa.length) h += '<div class="blocks">' + u.blocksJa.map(b => `<span class="blk ja">${esc(b.t)}<small>${b.link + 1}</small></span>`).join('') + '</div>';
  return h;
}
let toastT = null;
function toast(msg, ms = 2200) { const t = $('#toast'); const d = document.createElement('div'); d.textContent = msg; t.appendChild(d); setTimeout(() => d.remove(), ms); }
function openModal(html, opts = {}) {
  const r = $('#modal-root'); r.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
  $('.modal-bg', r).addEventListener('click', e => { if (e.target === e.currentTarget && !opts.sticky) closeModal(); });
  bindSpk(r); return $('.modal', r);
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#FF7A1A', '#0FA3A0', '#5B6CFF', '#1E9E6A', '#B04BD6', '#D9A400'];
  for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 6]; s.style.animationDelay = (Math.random() * .4) + 's'; c.appendChild(s); }
  document.body.appendChild(c); setTimeout(() => c.remove(), 1900);
}

/* ================= 問題の描画 =================
   renderQuestion(item, root, done)  done({correct, q, rtMs, said, revealed, skip})
*/
function renderQuestion(item, root, done) {
  const t0 = nowMs(); let finished = false;
  const finish = res => { if (finished) return; finished = true; done({ rtMs: nowMs() - t0, ...res }); };
  const R = {
    'meet': rMeet, 'Q-01': rQ01, 'Q-02': rQ02, 'Q-03': rQ03, 'Q-04': rQ04, 'Q-05': rChips, 'Q-07': rChips,
    'Q-08': rQ08, 'Q-10a': rQ10a, 'Q-10b': rChips, 'V-ja': rVja, 'Q-11': rQ11, 'Q-12': rQ12,
  }[item.kind];
  root.innerHTML = ''; root.className = 'q';
  if (!R) { finish({ skip: true }); return; }
  R(item, root, finish, t0);
  bindSpk(root);
}
function unitLabel(item) { const u = IDX.unit[item.unit]; return u ? `${u.id} ／ ${u.short}` : ''; }
function head(item, title) { return `<div class="eyebrow center">${esc(unitLabel(item))}${title ? ' ／ ' + esc(title) : ''}</div>`; }
function feedback(root, ok, en, ja, why, alt, item) {
  const band = document.createElement('div'); band.className = 'fb ' + (ok ? 'ok' : 'ng');
  band.innerHTML = `<div><b>${ok ? '✓ 正解' : '→ 正解は'}</b></div>
    <div class="en"><span>${en}</span>${spkBtn(en.replace(/<[^>]+>/g, ''))}</div>
    ${ja ? `<div class="alt">${esc(ja)}</div>` : ''}${why ? `<div class="why">${esc(why)}</div>` : ''}${alt ? `<div class="alt">ほかの言い方：${esc(alt)}</div>` : ''}`;
  root.appendChild(band); bindSpk(band);
  sfx(ok ? 'ok' : 'ng');
  speak(en.replace(/<[^>]+>/g, ''), 'en');
  return band;
}
function nextBtn(root, cb, label = '次へ →') {
  const f = document.createElement('div'); f.className = 'qfoot';
  f.innerHTML = `<button class="btn primary" id="next">${label}</button>`;
  root.appendChild(f);
  const b = $('#next', f); b.addEventListener('click', cb);
  if (S.settings.autoNext) setTimeout(() => { if (b.isConnected) cb(); }, 1400);
  return b;
}
function whyBtn(item) { return `<button class="tinybtn" data-why="1">？ 説明を見る</button>`; }
function bindWhy(root, item) { const b = $('[data-why]', root); if (b) b.addEventListener('click', () => showMeetModal(item.unit)); }
function showMeetModal(uid) {
  const u = IDX.unit[uid], L = LESSONS[uid]; if (!u) return;
  openModal(`<h3>${esc(u.id)} ${esc(u.title)}</h3><div class="sub">${esc(u.cando)}</div>${blocksHtml(u)}
    ${L.meet.map(m => `<div class="meet-card flat"><h3>${esc(m.title)}</h3><div class="body">${esc(m.body)}</div>${m.ex ? `<div class="ex"><div class="grow"><b>${esc(m.ex.en)}</b><span>${esc(m.ex.ja)}</span></div>${spkBtn(m.ex.en)}</div>` : ''}</div>`).join('')}
    <button class="btn" onclick="closeModal()">閉じる</button>`);
}

/* ---- 出会う ---- */
function rMeet(item, root, finish) {
  const u = IDX.unit[item.unit], L = LESSONS[item.unit]; let page = 0;
  const pages = [
    `<div class="card"><div class="eyebrow">できること</div><div style="font-size:1.25rem;font-weight:800">${esc(u.cando)}</div>
      <div>${u.key.map(k => `<div class="keyline"><div class="grow"><b>${esc(k.en)}</b><span>${esc(k.ja)}</span></div>${spkBtn(k.en)}</div>`).join('')}</div>
      <div class="sub">🔊 を押して、まねして声に出す</div></div>`,
    `<div class="card"><div class="eyebrow">文のかたち</div>${blocksHtml(u)}<div class="sub">色は役割。数字は英語のブロックと同じ順番</div></div>`,
    ...L.meet.map(m => `<div class="meet-card"><h3>${esc(m.title)}</h3><div class="body">${esc(m.body)}</div>${m.ex ? `<div class="ex"><div class="grow"><b>${esc(m.ex.en)}</b><span>${esc(m.ex.ja)}</span></div>${spkBtn(m.ex.en)}</div>` : ''}</div>`),
  ];
  const draw = () => {
    root.innerHTML = head(item, '出会う') + `<div id="pg">${pages[page]}</div>
      <div class="dots">${pages.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>
      <div class="qfoot"><div class="btn-row">${page > 0 ? '<button class="btn" id="prev">← 前</button>' : ''}<button class="btn primary" id="nx">${page < pages.length - 1 ? '次 →' : '問題へ →'}</button></div></div>`;
    bindSpk(root);
    if (page === 0) speak(u.key[0].en, 'en');
    const p = $('#prev', root); if (p) p.addEventListener('click', () => { page--; draw(); });
    $('#nx', root).addEventListener('click', () => { if (page < pages.length - 1) { page++; draw(); } else finish({ skip: true, correct: true }); });
  };
  draw();
}
/* ---- 2文比較 ---- */
function rQ01(item, root, finish) {
  const d = item.data; const opts = [['a', d.a], ['b', d.b]];
  root.innerHTML = head(item, '気づく') + `<div class="prompt">${esc(d.ja)}</div><div class="inst">正しいのはどっち？</div>
    <div class="choices two">${opts.map(([k, s]) => `<button class="btn" data-k="${k}">${esc(s)}</button>`).join('')}</div>${whyBtn(item)}`;
  bindWhy(root, item);
  $$('[data-k]', root).forEach(b => b.addEventListener('click', () => {
    const ok = b.dataset.k === d.ans; $$('[data-k]', root).forEach(x => { x.disabled = true; if (x.dataset.k === d.ans) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
    feedback(root, ok, esc(d.ans === 'a' ? d.a : d.b), d.ja, d.why, '', item);
    nextBtn(root, () => finish({ correct: ok, q: ok ? autoRate(true, nowMs() - t0) : 0 }));
  }));
  const t0 = nowMs();
}
/* ---- 誤り探し ---- */
function rQ02(item, root, finish) {
  const d = item.data; const words = d.en.split(' ');
  root.innerHTML = head(item, item.phase === 'lesson' ? '気づく' : '復習') + `<div class="inst">まちがっている語をタップ</div>
    <div class="words">${words.map((w, i) => `<button class="w" data-i="${i}">${esc(w)}</button>`).join('')}</div>${whyBtn(item)}`;
  bindWhy(root, item); const t0 = nowMs();
  const strip = w => w.replace(/[.,!?]/g, '');
  $$('.w', root).forEach(b => b.addEventListener('click', () => {
    const w = strip(words[b.dataset.i]); const ok = w.toLowerCase() === d.err.toLowerCase();
    $$('.w', root).forEach(x => { x.disabled = true; if (strip(words[x.dataset.i]).toLowerCase() === d.err.toLowerCase()) x.classList.add('right'); else if (x === b) x.classList.add('pick'); });
    const fixed = words.map(x => strip(x).toLowerCase() === d.err.toLowerCase() ? x.replace(strip(x), d.fix) : x).join(' ');
    const fixedCap = fixed.charAt(0).toUpperCase() + fixed.slice(1);
    feedback(root, ok, esc(fixedCap), '', d.why, '', item);
    nextBtn(root, () => finish({ correct: ok, q: ok ? autoRate(true, nowMs() - t0) : 0 }));
  }));
}
/* ---- 4択（汎用） ---- */
function choiceQ(item, root, finish, promptHtml, choices, ans, fb) {
  root.innerHTML = promptHtml + `<div class="choices">${shuffle(choices).map(c => `<button class="btn" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>${whyBtn(item)}`;
  bindWhy(root, item); const t0 = nowMs();
  $$('[data-c]', root).forEach(b => b.addEventListener('click', () => {
    const ok = b.dataset.c === ans; $$('[data-c]', root).forEach(x => { x.disabled = true; if (x.dataset.c === ans) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
    feedback(root, ok, fb.en, fb.ja, fb.why, fb.alt, item);
    nextBtn(root, () => finish({ correct: ok, q: ok ? autoRate(true, nowMs() - t0) : 0 }));
  }));
}
function rQ03(item, root, finish) { const d = item.data; choiceQ(item, root, finish, head(item, '練習') + `<div class="prompt">${esc(d.q)}</div>`, d.choices, d.ans, { en: esc(d.ans), why: d.why }); }
function rQ04(item, root, finish) {
  const d = item.data; const filled = d.en.replace('___', d.ans);
  choiceQ(item, root, finish, head(item, '練習') + `<div class="prompt en">${esc(d.en).replace('___', '<span style="color:var(--accent)">___</span>')}</div>${d.ja ? `<div class="inst">${esc(d.ja)}</div>` : ''}`, d.choices, d.ans, { en: esc(filled).replace(esc(d.ans), `<span style="color:var(--accent)">${esc(d.ans)}</span>`), why: d.why });
}
function rVja(item, root, finish) {
  const v = item.data; const others = sample(VOCAB.filter(x => x.id !== v.id && x.pos === v.pos && x.ja !== v.ja), 3);
  while (others.length < 3) { const x = VOCAB[Math.floor(Math.random() * VOCAB.length)]; if (x.id !== v.id && !others.includes(x)) others.push(x); }
  choiceQ(item, root, finish, head(item, '単語') + `<div class="prompt en row" style="justify-content:center">${esc(v.en)} ${spkBtn(v.en)}</div><div class="inst">意味は？</div>`, [v.ja, ...others.map(o => o.ja)], v.ja, { en: esc(v.en), ja: v.ja, alt: v.ex ? v.ex.en : '' });
  speak(v.en, 'en');
}
function rQ12(item, root, finish) {
  const v = item.data; const others = sample(VOCAB.filter(x => x.id !== v.id && x.pos === v.pos), 3);
  while (others.length < 3) { const x = VOCAB[Math.floor(Math.random() * VOCAB.length)]; if (x.id !== v.id && !others.includes(x)) others.push(x); }
  choiceQ(item, root, finish, head(item, '単語') + `<div class="prompt row" style="justify-content:center">🎧 ${spkBtn(v.en, 'en', 'on')}</div><div class="inst">聞こえた単語は？（もう一度聞ける）</div>`, [v.en, ...others.map(o => o.en)], v.en, { en: esc(v.en), ja: v.ja });
  setTimeout(() => speak(v.en, 'en', { force: true }), 200);
}
/* ---- 受け答え 4択 ---- */
function rQ10a(item, root, finish) {
  const d = item.data;
  const promptHtml = head(item, '受け答え') + `<div class="card"><div class="eyebrow">相手</div><div class="row"><div class="grow" style="font-size:1.25rem;font-weight:800">${esc(d.q)}</div>${spkBtn(d.q, 'en', 'on')}</div><div class="sub" id="qja" style="opacity:0;transition:opacity .4s">${esc(d.qja)}</div></div><div class="inst">あなたの返しは？</div>`;
  choiceQ(item, root, finish, promptHtml, [d.a, ...d.wrong], d.a, { en: esc(d.a), ja: d.aja });
  speak(d.q, 'en'); setTimeout(() => { const e = $('#qja', root); if (e) e.style.opacity = 1; }, 3000);
}
/* ---- 並べ替え / 書き換え / 受け答え組み立て ---- */
function rChips(item, root, finish) {
  const d = item.data; let tokens, dummy, ans, promptHtml, title, ja;
  if (item.kind === 'Q-05') { tokens = d.tokens; dummy = d.dummy || []; ans = d.ans; ja = d.ja; title = '練習'; promptHtml = `<div class="prompt">${esc(d.ja)}</div><div class="inst">単語をタップして英語にする</div>`; }
  else if (item.kind === 'Q-07') {
    tokens = d.ans[0].split(' '); ans = d.ans; title = '練習';
    const lower = new Set(tokens.map(t => normalize(t))); dummy = d.en.split(' ').filter(w => !lower.has(normalize(w))).slice(0, 2);
    promptHtml = `<div class="prompt en">${esc(d.en)}</div><div class="inst">→ ${esc(d.inst)}</div>`;
  } else { // Q-10b
    tokens = d.a.split(' '); ans = [d.a]; ja = d.aja; title = '受け答え';
    const lower = new Set(tokens.map(t => normalize(t))); dummy = shuffle(d.wrong.join(' ').split(' ').filter(w => !lower.has(normalize(w)))).slice(0, 2);
    promptHtml = `<div class="card"><div class="eyebrow">相手</div><div class="row"><div class="grow" style="font-size:1.125rem;font-weight:800">${esc(d.q)}</div>${spkBtn(d.q, 'en', 'on')}</div><div class="sub">${esc(d.qja)}</div></div><div class="inst">返しを組み立てる：${esc(d.aja)}</div>`;
  }
  const pool = shuffle([...tokens, ...dummy].map((w, i) => ({ w, i })));
  const placed = [];
  root.innerHTML = head(item, title) + promptHtml + `<div class="answer-row" id="ans"></div><div class="chips" id="pool"></div>${whyBtn(item)}<div class="qfoot"><button class="btn primary" id="check" disabled>こたえる</button></div>`;
  bindWhy(root, item); const t0 = nowMs();
  if (item.kind === 'Q-10b') speak(d.q, 'en');
  const draw = () => {
    $('#ans', root).innerHTML = placed.map(p => `<button class="chip" data-p="${p.i}">${esc(p.w)}</button>`).join('');
    $('#pool', root).innerHTML = pool.map(p => `<button class="chip ${placed.includes(p) ? 'ghost' : ''}" data-q="${p.i}" ${placed.includes(p) ? 'disabled' : ''}>${esc(p.w)}</button>`).join('');
    $('#check', root).disabled = placed.length < tokens.length;
    $$('[data-q]', root).forEach(b => b.addEventListener('click', () => { placed.push(pool.find(p => p.i == b.dataset.q)); draw(); }));
    $$('[data-p]', root).forEach(b => b.addEventListener('click', () => { const k = placed.findIndex(p => p.i == b.dataset.p); placed.splice(k, 1); draw(); }));
  };
  draw();
  $('#check', root).addEventListener('click', () => {
    const got = placed.map(p => p.w).join(' '); const r = compare(got, ans); const ok = r.ok;
    $('#check', root).remove(); $$('#pool button', root).forEach(b => b.disabled = true);
    const enHtml = ok ? esc(ans[0]) : r.diff.map(x => x.diff ? `<u>${esc(x.w)}</u>` : esc(x.w)).join(' ');
    feedback(root, ok, ok ? esc(ans[0]) : esc(ans[0]), ja, d.why || '', ans.length > 1 ? ans.slice(1).join(' / ') : '', item);
    if (!ok) { const b = $('.fb', root); const p = document.createElement('div'); p.className = 'alt'; p.innerHTML = 'あなたの答え：' + esc(got); b.appendChild(p); }
    nextBtn(root, () => finish({ correct: ok, q: ok ? autoRate(true, nowMs() - t0) : 0 }));
  });
}
/* ---- 瞬間英作文（自己判定） ---- */
function rQ08(item, root, finish) {
  const g = item.data; const silent = S.settings.silent; let revealed = false, timer = null, saidAt = null;
  const title = item.phase === 'sprint' ? 'スプリント' : item.phase === 'review' ? '復習' : '使う';
  root.innerHTML = head(item, title) + `<div class="inst">${silent ? '心の中で英語にする' : '声に出して英語にする'}</div><div class="prompt">${esc(g.ja)}</div>
    <div class="ring"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="37"/><circle class="fg" cx="42" cy="42" r="37" stroke-dasharray="232.5" stroke-dashoffset="0"/></svg><div class="n" id="tn">5</div></div>
    <div id="fbslot"></div>
    <div class="qfoot"><div class="btn-row"><button class="btn" id="no">言えなかった</button><button class="btn ok" id="yes">言えた</button></div><button class="tinybtn" id="reveal">答えを見る</button></div>`;
  const t0 = nowMs(); let left = 5;
  const fg = $('.fg', root);
  const reveal = () => {
    if (revealed) return; revealed = true; clearInterval(timer);
    $('.ring', root).style.display = 'none'; const rb = $('#reveal', root); if (rb) rb.remove();
    const slot = $('#fbslot', root); slot.innerHTML = `<div class="fb ok" style="background:var(--card2);color:var(--ink)"><div class="en"><span>${esc(g.ans[0])}</span>${spkBtn(g.ans[0])}</div>${g.ans.length > 1 ? `<div class="alt">ほかの言い方：${esc(g.ans.slice(1).join(' / '))}</div>` : ''}</div>`;
    bindSpk(slot); speak(g.ans[0], 'en');
  };
  timer = setInterval(() => { left--; $('#tn', root).textContent = Math.max(0, left); fg.style.strokeDashoffset = 232.5 * (1 - left / 5); if (left <= 0) reveal(); }, 1000);
  $('#reveal', root).addEventListener('click', reveal);
  const judge = said => {
    const rt = (saidAt || nowMs()) - t0; const wasRevealed = revealed;
    if (!revealed) reveal();
    $('#yes', root).disabled = $('#no', root).disabled = true;
    const q = selfRate(said, rt, wasRevealed);
    const b = $('.fb', root); if (b) { b.classList.remove('ok'); b.classList.add(said ? 'ok' : 'ng'); b.style.background = ''; b.style.color = ''; }
    sfx(said ? 'ok' : 'ng');
    nextBtn(root, () => finish({ correct: said, q, said, revealed: wasRevealed }));
  };
  $('#yes', root).addEventListener('click', () => { saidAt = nowMs(); judge(true); });
  $('#no', root).addEventListener('click', () => judge(false));
}
/* ---- 意味→英（入力） ---- */
function rQ11(item, root, finish) {
  const v = item.data;
  root.innerHTML = head(item, '単語') + `<div class="prompt">${esc(v.ja)}</div><div class="inst">英語で（${esc(v.pos)}）</div>
    <input class="textin" id="in" type="text" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" lang="en" placeholder="English">
    <div class="qfoot"><div class="btn-row"><button class="btn" id="dunno">分からない</button><button class="btn primary" id="check">こたえる</button></div></div>`;
  const t0 = nowMs(); const inp = $('#in', root); setTimeout(() => inp.focus(), 50);
  const finishWith = ok => {
    inp.disabled = true; $('#check', root).disabled = true; $('#dunno', root).disabled = true;
    feedback(root, ok, esc(v.en), v.ja, '', v.ex ? v.ex.en : '', item);
    nextBtn(root, () => finish({ correct: ok, q: ok ? autoRate(true, nowMs() - t0) : 0 }));
  };
  const check = () => { const r = compare(inp.value, [v.en]); finishWith(r.ok); };
  $('#check', root).addEventListener('click', check);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); check(); } });
  $('#dunno', root).addEventListener('click', () => finishWith(false));
}
