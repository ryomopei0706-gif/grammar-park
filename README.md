# Grammar Park

中学英文法（6エリア58ユニット）を、1回5〜15分のセッションと間隔反復で「会話で使える形」にする自分専用の iPhone ホーム画面用 Web アプリ。
仕様書は Obsidian Vault `04_Private/英語/中学英語文法アプリ/`。

## 構成
- `index.html` … アプリ本体（`tools/build.py` が `src/` から生成。直接編集しない）
- `data/content.js` … 教材（`tools/build_data.py` が `content/` の md から生成。直接編集しない）
- `content/` … 教材の元データ（md）。ユニット1つ＝1ファイル。書き方は `content/README.md`
- `sw.js` / `manifest.webmanifest` / `icon-*.png` … オフライン・ホーム画面用

## ビルド
```bash
python3 tools/build_data.py --florida ../florida-english   # content/ → data/content.js（検査つき）
python3 tools/build.py                                     # src/ → index.html, sw.js
node tools/test.mjs                                        # ロジックの単体テスト
```

## ローカルで動かす
```bash
python3 -m http.server 8766
```
→ http://localhost:8766

## 公開
GitHub Pages（main / root）。iPhone の Safari で開き、共有 › 「ホーム画面に追加」。
