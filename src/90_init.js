/* ================= 起動 ================= */
(function init() {
  load();
  buildIndex();
  applyTheme();
  syncContent(); save();
  if (S.profile.onboarded) dailyTick();
  document.body.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  document.body.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (sess) saveSession(sess); stopSpeak(); }
    else if (S.profile.onboarded && dailyTick()) render();
  });
  window.addEventListener('pageshow', () => { if (S.profile.onboarded && dailyTick()) render(); });
  route = 'home';
  render();

  // Service Worker
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('新しいバージョンがあります。アプリを開き直すと反映されます', 4000); });
      });
    }).catch(() => { });
  }
  // Safari で開いていて、まだホーム画面に追加していないとき
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!standalone && /iPhone|iPad/.test(navigator.userAgent) && !localStorage.getItem('gp.a2hs')) {
    setTimeout(() => { toast('共有 → 「ホーム画面に追加」でアプリとして使えます', 5000); try { localStorage.setItem('gp.a2hs', '1'); } catch (e) { } }, 1500);
  }
})();
