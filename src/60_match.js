/* ================= 答え合わせ ================= */
const CONTRACTIONS = [
  ["i'm", "i am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"], ["it's", "it is"], ["we're", "we are"], ["they're", "they are"], ["that's", "that is"], ["there's", "there is"], ["what's", "what is"], ["where's", "where is"], ["who's", "who is"], ["how's", "how is"],
  ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"], ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"], ["can't", "cannot"], ["couldn't", "could not"], ["won't", "will not"], ["wouldn't", "would not"], ["shouldn't", "should not"], ["mustn't", "must not"], ["haven't", "have not"], ["hasn't", "has not"], ["hadn't", "had not"],
  ["i've", "i have"], ["you've", "you have"], ["we've", "we have"], ["they've", "they have"], ["i'll", "i will"], ["you'll", "you will"], ["he'll", "he will"], ["she'll", "she will"], ["we'll", "we will"], ["they'll", "they will"], ["it'll", "it will"], ["i'd", "i would"], ["you'd", "you would"], ["let's", "let us"],
];
function normalize(s) {
  let n = String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.,!?;:"()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [a, b] of CONTRACTIONS) n = n.replace(new RegExp('\\b' + a.replace("'", "'") + '\\b', 'g'), b);
  return n.replace(/\s+/g, ' ').trim();
}
function stripLenient(n) { return n.replace(/\b(a|an|the)\b/g, ' ').replace(/(\w)s\b/g, '$1').replace(/\s+/g, ' ').trim(); }
function compare(input, answers, opts = {}) {
  const n = normalize(input);
  for (const a of answers) if (n === normalize(a)) return { ok: true };
  if (opts.lenient) for (const a of answers) if (stripLenient(n) === stripLenient(normalize(a))) return { ok: true, partial: true };
  return { ok: false, diff: wordDiff(n, normalize(answers[0])) };
}
/* 語単位の差分（正解側で「違う語」に印） */
function wordDiff(input, answer) {
  const a = input.split(' '), b = answer.split(' ');
  const m = a.length, n = b.length, L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const mark = new Array(n).fill(true); let i = 0, j = 0;
  while (i < m && j < n) { if (a[i] === b[j]) { mark[j] = false; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return b.map((w, k) => ({ w, diff: mark[k] }));
}
