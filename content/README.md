# 教材の書き方（content/）

ユニット1つ＝md 1ファイル（`U01_語順.md` のように `Uxx_` で始める）。`tools/build_data.py` が全部読んで `data/content.js` を作る。
区切りは**全角の縦棒「｜」**（半角 `|` は使わない）。選択肢の区切りは「 / 」（半角スラッシュの前後に空白）。

```markdown
---
id: U15
area: 2
title: There is / There are
short: 〜がある
cando: 「〜がある」を言える・聞ける
prereq: [U07, U14]
---

## キー文
- Is there a restroom near here?｜この近くにトイレはありますか？
- There are many rides in this park.｜このパークにはたくさんの乗り物がある。
- There is a cafe on the corner.｜角にカフェがある。

## ブロック図
[There is|aux] [a restroom|obj] [near here|mod]
[トイレが|1] [この近くに|2] [ある|0]

## 出会う
### 「ある」は There is から始める
日本語は「〜が ある」だが、英語は There is / are を先に言って、何があるかを後ろに置く。
> There is a cafe on the corner.｜角にカフェがある。
### 数で is / are を変える
…（説明カードは最大3枚、本文は3行以内）

## 気づく
- 比較｜机の上に本が2冊ある｜There are two books on the desk.｜There is two books on the desk.｜a｜books が複数なので are
- 誤り｜There is a lot of people here.｜is→are｜people は複数扱い

## 練習
- 並べ替え｜この近くに駅はありますか？｜Is there a station near here?｜ダミー: Are, it
- 穴埋め｜There ___ many rides in this park.｜is / are / be｜are
- 4択｜「角にカフェがある」は？｜There is a cafe on the corner. / There are a cafe on the corner. / A cafe is there on the corner. / It is a cafe on the corner.｜There is a cafe on the corner.
- 書き換え｜There is a bus stop here.｜疑問文に｜Is there a bus stop here?
- 誤り｜Is there any restrooms here?｜Is→Are｜restrooms が複数

## 使う
### 瞬間英作文
- ★ この近くにトイレはありますか？｜Is there a restroom near here?｜別解: Is there a bathroom near here? / Is there a restroom around here?
- 部屋に窓が2つある。｜There are two windows in the room.
（10文。★は5文。別解は任意）
### マイ例文
お題: あなたの家・職場・好きな場所に「ある」ものを1つ
ヒント: There is … / There are … / near, in, on
例: There is a big window in my office.｜私の事務所には大きな窓がある。
例: There are three cats in my house.｜うちには猫が3匹いる。
### 受け答え
- D-a2-07
- D-a2-08

## 単語
- restroom｜トイレ（公共の）｜n｜Where is the restroom?｜トイレはどこですか？
- near｜〜の近くに｜prep｜I live near the station.｜駅の近くに住んでいる。
（そのユニットの新出語 10〜20。品詞: n / v / adj / adv / prep / pron / conj / aux / int / num / phrase）

## SRS
1, 3, 5
```

## ルール

- **キー文**は3つ。**出会う**の説明カードは2〜3枚、各本文3行以内、例文は `>` で1つ
- **ブロック図**の役割: `subj`（主語・青）`verb`（動詞・赤）`obj`（目的語・補語・緑）`mod`（修飾・黄）`aux`（疑問詞・助動詞・There is・紫）`neg`（否定・灰）。2行目は日本語で、`|数字` は英語ブロックの番号（0始まり）
- **気づく**は5問（比較・誤り）。**「誤り」は文中の1語を別の語に置き換える形だけ**（例: There is two books. → is→are）。語順の間違い（I water need.）は「比較」か「並べ替え」で出す（ビルド検査で弾かれる）。**練習**は10問（並べ替え4〜5、穴埋め2〜3、4択1〜2、書き換え1〜2、誤り0〜1）
- **瞬間英作文**は10文。★（SRSカード）は必ず5文。★の文は「そのユニットの文型」を使い、自分の生活で言いそうな文にする
- **受け答え**は `content/_bridge.md` に登録した ID を2〜4つ
- **単語**は例文で使った新出語だけ。例文は既習の文型で書く
- **SRS** は練習問題の番号（1始まり）を3つ。並べ替え・書き換えから選ぶ
- 英文はアメリカ英語。日本語は自然な話し言葉（教科書の直訳調にしない）
- 題材は 建築・シェアハウス・大学の講師・ディズニー・旅行・家族 に寄せる。ただし固有名詞は入れすぎない

## `_bridge.md`（受け答え）

```markdown
## エリア1
- D-a1-01｜U03｜Florida: Are you here on vacation?｜誤答: Yes, I do. / I'm a vacation. / Yes, it is.
- D-a1-02｜U05｜Q: Do you like roller coasters?｜Qja: ジェットコースターは好き？｜A: Yes, I love them.｜Aja: うん、大好き。｜誤答: Yes, I am. / I like it is. / Yes, they do.
```

- `Florida:` は Florida 500 の `dialog.js` にある相手の一言（先頭一致）。q / qja / a / aja をそこから取る
- `Q: … A: …` は本アプリ独自の受け答え
- 誤答は3つ。「文法的に誤り」「同じ場面・別の文型」「同じ文型・別の場面」を1つずつ

## `_basic.md`（基礎パック）

```markdown
## basic-numbers
- one｜1｜num｜I have one cat.｜猫を1匹飼っている。
## basic-days
- Monday｜月曜日｜n｜I work on Monday.｜月曜は仕事だ。
```
