#!/usr/bin/env python3
"""src/ → index.html, sw.js

  src/00_style.css  … <style>
  src/*.js（番号順）… <script>（data/content.js は別ファイルのまま読む）
"""
import os, glob, datetime, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")

css = "\n".join(open(f, encoding="utf-8").read() for f in sorted(glob.glob(os.path.join(SRC, "*.css"))))
js_files = sorted(glob.glob(os.path.join(SRC, "*.js")))
js = "\n\n".join(f"/* ===== {os.path.basename(f)} ===== */\n" + open(f, encoding="utf-8").read() for f in js_files)
js = js.replace("__BUILD__", stamp)

html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<title>Grammar Park</title>
<meta name="description" content="中学英文法を会話で使える形で身につける自分専用トレーナー">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Grammar Park">
<meta name="theme-color" content="#F3F5F8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B1220" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<div id="modal-root"></div>
<div id="toast"></div>
<script src="data/content.js?v={stamp}"></script>
<script>
{js}
</script>
</body>
</html>
"""
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(html)

sw = f"""// Grammar Park – offline cache. index.html / data/content.js はネット優先（更新を拾う）、それ以外はキャッシュ優先。
const CACHE = 'grammar-park-{stamp}';
const ASSETS = ['./', './index.html', './data/content.js', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const networkFirst = /index\\.html$|content\\.js$|\\/$/.test(url.pathname);
  e.respondWith(
    networkFirst
      ? fetch(e.request).then(r => {{ const c = r.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return r; }}).catch(() => caches.match(e.request, {{ignoreSearch:true}}))
      : caches.match(e.request, {{ignoreSearch:true}}).then(r => r || fetch(e.request).then(r2 => {{ const c = r2.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return r2; }}))
  );
}});
"""
open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8").write(sw)
print(f"OK: index.html ({len(html)//1024}KB, {len(js_files)} modules) / sw.js  build {stamp}")
