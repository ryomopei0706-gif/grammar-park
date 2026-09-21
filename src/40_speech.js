/* ================= 音声（読み上げ） ================= */
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function ttsOK() { return 'speechSynthesis' in window; }
function pickVoice(lang) {
  if (!voices.length) loadVoices();
  if (lang === 'en') {
    if (S.settings.ttsVoice) { const v = voices.find(v => v.name === S.settings.ttsVoice); if (v) return v; }
    const en = voices.filter(v => /^en[-_]US/i.test(v.lang));
    return en.find(v => /Samantha/i.test(v.name)) || en.find(v => /Ava/i.test(v.name)) || en.find(v => /Siri/i.test(v.name)) || en[0] || voices.find(v => /^en/i.test(v.lang)) || null;
  }
  const ja = voices.filter(v => /^ja/i.test(v.lang));
  return ja.find(v => /Kyoko/i.test(v.name)) || ja[0] || null;
}
let speakToken = 0;
function speak(text, lang = 'en', opts = {}) {
  if (!ttsOK() || !text) return Promise.resolve();
  if (!opts.force && !S.settings.tts) return Promise.resolve();
  return new Promise(res => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(lang); if (v) u.voice = v;
      u.lang = lang === 'en' ? 'en-US' : 'ja-JP';
      u.rate = lang === 'en' ? (opts.rate || S.settings.ttsRate) : 1.0;
      const tok = ++speakToken;
      u.onend = () => { if (tok === speakToken) markSpeaking(false); res(); };
      u.onerror = () => { markSpeaking(false); res(); };
      markSpeaking(true, opts.el);
      speechSynthesis.speak(u);
      setTimeout(() => { if (tok === speakToken && speechSynthesis.speaking === false) { markSpeaking(false); res(); } }, 200 + text.length * 120);
    } catch (e) { markSpeaking(false); res(); }
  });
}
function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) { } markSpeaking(false); }
let speakingEl = null;
function markSpeaking(on, el) {
  if (speakingEl) speakingEl.classList.remove('on');
  speakingEl = on ? (el || null) : null;
  if (speakingEl) speakingEl.classList.add('on');
}
/* iOS: ユーザー操作の中で一度鳴らしておくと、以後は自動再生できる */
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked || !ttsOK()) return;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); audioUnlocked = true; } catch (e) { }
}
/* 効果音（WebAudio の短いトーン） */
let actx = null;
function sfx(kind) {
  if (!S.settings.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime;
    if (kind === 'ok') { o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(880, t + 0.08); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.25); }
    else if (kind === 'ng') { o.frequency.setValueAtTime(220, t); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.start(t); o.stop(t + 0.2); }
    else if (kind === 'level') { [523, 659, 784, 1047].forEach((f, i) => { o.frequency.setValueAtTime(f, t + i * 0.09); }); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.start(t); o.stop(t + 0.5); }
  } catch (e) { }
}
