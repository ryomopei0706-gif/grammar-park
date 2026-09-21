#!/usr/bin/env python3
"""content/*.md → data/content.js  （検査つき）

使い方: python3 tools/build_data.py [--florida ../florida-english]
"""
import sys, re, json, glob, os, argparse, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "data", "content.js")
SEP = "｜"

AREAS = [
    {"id": 1, "name": "はじまりの広場", "en": "Entrance Plaza", "color": "#FF7A1A", "icon": "wheel"},
    {"id": 2, "name": "タイムトンネル", "en": "Time Tunnel", "color": "#0FA3A0", "icon": "tunnel"},
    {"id": 3, "name": "未来ゾーン", "en": "Future Zone", "color": "#5B6CFF", "icon": "rocket"},
    {"id": 4, "name": "くらべる湖", "en": "Compare Lake", "color": "#1E9E6A", "icon": "lake"},
    {"id": 5, "name": "記憶の塔", "en": "Memory Tower", "color": "#B04BD6", "icon": "tower"},
    {"id": 6, "name": "ことばの城", "en": "Word Castle", "color": "#D9A400", "icon": "castle"},
]

errors, warnings = [], []
def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)

def parts(line):
    return [p.strip() for p in line.split(SEP)]

def split_choices(s):
    return [c.strip() for c in s.split(" / ") if c.strip()]

def slug(en):
    s = re.sub(r"[^a-z0-9]+", "-", en.lower()).strip("-")
    return "V-" + s

def parse_front(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return None, text
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip() for x in v[1:-1].split(",") if x.strip()]
        elif re.fullmatch(r"-?\d+", v):
            v = int(v)
        fm[k.strip()] = v
    return fm, m.group(2)

def sections(body):
    """## 見出し → 本文 の dict（順序保持）"""
    out, cur, buf = {}, None, []
    for line in body.splitlines():
        if line.startswith("## "):
            if cur is not None:
                out[cur] = "\n".join(buf).strip("\n")
            cur, buf = line[3:].strip(), []
        else:
            buf.append(line)
    if cur is not None:
        out[cur] = "\n".join(buf).strip("\n")
    return out

def subsections(text):
    out, cur, buf = [], None, []
    for line in text.splitlines():
        if line.startswith("### "):
            if cur is not None:
                out.append((cur, "\n".join(buf).strip("\n")))
            cur, buf = line[4:].strip(), []
        else:
            buf.append(line)
    if cur is not None:
        out.append((cur, "\n".join(buf).strip("\n")))
    return out

def bullet_lines(text):
    return [l[2:].strip() for l in text.splitlines() if l.startswith("- ")]

def parse_block_row(line):
    """[There is|aux] [a restroom|obj] → [{t, r}]"""
    return [{"t": m.group(1).strip(), "r": m.group(2).strip()} for m in re.finditer(r"\[([^\]|]+)\|([^\]]+)\]", line)]

def tokens_of(sentence):
    return sentence.split()

def check_error_item(qid, en, e, f):
    """誤り探しは「文中の1語を別の語に置き換える」形だけ許す（語順の誤りは 比較／並べ替え で出す）"""
    words = [w.strip(".,!?").lower() for w in en.split()]
    if e.lower() not in words: err(f"{qid}: 誤り語「{e}」が文中に無い")
    if f.lower() in words: err(f"{qid}: 直す先「{f}」がすでに文中にある＝語順の誤り。誤り探しではなく 比較 か 並べ替え にする")
    if words.count(e.lower()) > 1: warn(f"{qid}: 誤り語「{e}」が文中に2回ある（どちらをタップしても正解になる）")

# ---------------------------------------------------------------- units
def parse_unit(path):
    text = open(path, encoding="utf-8").read()
    fm, body = parse_front(text)
    fname = os.path.basename(path)
    if not fm or "id" not in fm:
        err(f"{fname}: frontmatter がない"); return None, None
    uid = fm["id"]
    sec = sections(body)
    for need in ["キー文", "ブロック図", "出会う", "気づく", "練習", "使う", "単語", "SRS"]:
        if need not in sec:
            err(f"{uid}: 「## {need}」がない")
    if errors:
        return None, None

    # キー文
    key = []
    for l in bullet_lines(sec["キー文"]):
        p = parts(l)
        if len(p) < 2: err(f"{uid}: キー文の形式 {l}"); continue
        key.append({"en": p[0], "ja": p[1]})
    if len(key) != 3: warn(f"{uid}: キー文が{len(key)}つ（3が標準）")

    # ブロック図
    blines = [l for l in sec["ブロック図"].splitlines() if l.strip()]
    blocks = parse_block_row(blines[0]) if blines else []
    blocksJa = []
    if len(blines) > 1:
        for m in re.finditer(r"\[([^\]|]+)\|(\d+)\]", blines[1]):
            blocksJa.append({"t": m.group(1).strip(), "link": int(m.group(2))})
    ROLES = {"subj", "verb", "obj", "mod", "aux", "neg"}
    for b in blocks:
        if b["r"] not in ROLES: err(f"{uid}: ブロック図の役割 {b['r']} は不明（subj/verb/obj/mod/aux/neg）")

    # 出会う
    meet = []
    for title, t in subsections(sec["出会う"]):
        ex = None; lines = []
        for l in t.splitlines():
            if l.startswith(">"):
                p = parts(l[1:].strip())
                ex = {"en": p[0], "ja": p[1] if len(p) > 1 else ""}
            elif l.strip():
                lines.append(l.strip())
        meet.append({"title": title, "body": "\n".join(lines), "ex": ex})
    if not (1 <= len(meet) <= 3): warn(f"{uid}: 説明カードが{len(meet)}枚（1〜3）")

    # 気づく
    notice = []
    for i, l in enumerate(bullet_lines(sec["気づく"]), 1):
        p = parts(l); nid = f"{uid}-N{i}"
        try:
            if p[0] == "比較":
                if p[4] not in ("a", "b"): err(f"{nid}: 比較の正解は a か b")
                notice.append({"id": nid, "type": "Q-01", "ja": p[1], "a": p[2], "b": p[3], "ans": p[4], "why": p[5] if len(p) > 5 else ""})
            elif p[0] == "誤り":
                e, f = [x.strip() for x in p[2].split("→", 1)]
                check_error_item(nid, p[1], e, f)
                notice.append({"id": nid, "type": "Q-02", "en": p[1], "err": e, "fix": f, "why": p[3] if len(p) > 3 else ""})
            else:
                err(f"{nid}: 気づくの種類 {p[0]} は不明")
        except IndexError:
            err(f"{nid}: 項目が足りない: {l}")
    if len(notice) != 5: warn(f"{uid}: 気づくが{len(notice)}問（5が標準）")

    # 練習
    drill = []
    for i, l in enumerate(bullet_lines(sec["練習"]), 1):
        p = parts(l); did = f"{uid}-D{i}"
        try:
            kind = p[0]
            if kind == "並べ替え":
                ans = [p[2]]; dummy = []; alt = []
                for extra in p[3:]:
                    if extra.startswith("ダミー:"): dummy = [x.strip() for x in extra[4:].split(",") if x.strip()]
                    elif extra.startswith("別解:"): alt = split_choices(extra[3:])
                ans += alt
                drill.append({"id": did, "type": "Q-05", "ja": p[1], "tokens": tokens_of(p[2]), "dummy": dummy, "ans": ans})
            elif kind == "穴埋め":
                ch = split_choices(p[2])
                if "___" not in p[1]: err(f"{did}: 穴埋めに ___ がない")
                if p[3] not in ch: err(f"{did}: 穴埋めの正解 {p[3]} が選択肢にない")
                drill.append({"id": did, "type": "Q-04", "en": p[1], "choices": ch, "ans": p[3], "why": p[4] if len(p) > 4 else ""})
            elif kind == "4択":
                ch = split_choices(p[2])
                if len(ch) != 4: err(f"{did}: 4択の選択肢が{len(ch)}個")
                if p[3] not in ch: err(f"{did}: 4択の正解が選択肢にない")
                drill.append({"id": did, "type": "Q-03", "q": p[1], "choices": ch, "ans": p[3], "why": p[4] if len(p) > 4 else ""})
            elif kind == "書き換え":
                ans = [p[3]]
                for extra in p[4:]:
                    if extra.startswith("別解:"): ans += split_choices(extra[3:])
                drill.append({"id": did, "type": "Q-07", "en": p[1], "inst": p[2], "ans": ans})
            elif kind == "誤り":
                e, f = [x.strip() for x in p[2].split("→", 1)]
                check_error_item(did, p[1], e, f)
                drill.append({"id": did, "type": "Q-02", "en": p[1], "err": e, "fix": f, "why": p[3] if len(p) > 3 else ""})
            else:
                err(f"{did}: 練習の種類 {kind} は不明")
        except IndexError:
            err(f"{did}: 項目が足りない: {l}")
    if not (8 <= len(drill) <= 12): warn(f"{uid}: 練習が{len(drill)}問（10が標準）")

    # 使う
    use = {"instant": [], "my": None, "dialogs": []}
    for title, t in subsections(sec["使う"]):
        if title.startswith("瞬間英作文"):
            for i, l in enumerate(bullet_lines(t), 1):
                star = l.startswith("★")
                l2 = l[1:].strip() if star else l
                p = parts(l2)
                if len(p) < 2: err(f"{uid}-G{i}: 瞬間英作文の形式 {l}"); continue
                alt = []
                for extra in p[2:]:
                    if extra.startswith("別解:"): alt = split_choices(extra[3:])
                use["instant"].append({"id": f"{uid}-G{i}", "ja": p[0], "ans": [p[1]] + alt, "srs": star})
        elif title.startswith("マイ例文"):
            my = {"prompt": "", "hints": [], "samples": []}
            for l in t.splitlines():
                l = l.strip()
                if l.startswith("お題:"): my["prompt"] = l[3:].strip()
                elif l.startswith("ヒント:"): my["hints"] = split_choices(l[4:])
                elif l.startswith("例:"):
                    p = parts(l[2:].strip()); my["samples"].append({"en": p[0], "ja": p[1] if len(p) > 1 else ""})
            use["my"] = my
        elif title.startswith("受け答え"):
            use["dialogs"] = bullet_lines(t)
    nstar = sum(1 for g in use["instant"] if g["srs"])
    if len(use["instant"]) < 8: warn(f"{uid}: 瞬間英作文が{len(use['instant'])}文（10が標準）")
    if nstar != 5: err(f"{uid}: 瞬間英作文の★が{nstar}文（5にする）")
    if not use["dialogs"]: warn(f"{uid}: 受け答えが登録されていない")

    # 単語
    vocab = []
    for l in bullet_lines(sec["単語"]):
        p = parts(l)
        if len(p) < 3: err(f"{uid}: 単語の形式 {l}"); continue
        v = {"id": slug(p[0]), "en": p[0], "ja": p[1], "pos": p[2], "unit": uid, "pack": None,
             "ex": {"en": p[3], "ja": p[4]} if len(p) > 4 else None}
        vocab.append(v)
    if not (6 <= len(vocab) <= 35): warn(f"{uid}: 単語が{len(vocab)}語（10〜20が標準）")

    # SRS
    srs_idx = [int(x) for x in re.findall(r"\d+", sec["SRS"])]
    S = []
    for n in srs_idx:
        if 1 <= n <= len(drill): S.append(drill[n - 1]["id"])
        else: err(f"{uid}: SRS の番号 {n} が練習の範囲外")
    if len(S) != 3: warn(f"{uid}: SRS カードが{len(S)}枚（3が標準）")

    unit = {
        "id": uid, "area": fm.get("area"), "title": fm.get("title", ""), "short": fm.get("short", ""),
        "cando": fm.get("cando", ""), "key": key, "prereq": fm.get("prereq", []) or [],
        "blocks": blocks, "blocksJa": blocksJa, "vocab": [v["id"] for v in vocab], "dialogs": use["dialogs"],
    }
    lesson = {"meet": meet, "notice": notice, "drill": drill, "use": use, "srs": {"S": S, "D": use["dialogs"]}}
    return unit, (lesson, vocab)

# ---------------------------------------------------------------- bridge
def load_florida(path):
    if not path: return []
    f = os.path.join(path, "dialog.js")
    if not os.path.exists(f):
        warn(f"Florida 500 の dialog.js が見つからない: {f}"); return []
    src = open(f, encoding="utf-8").read()
    out = []
    for m in re.finditer(r"\{c:(\d+),\s*q:\"((?:[^\"\\]|\\.)*)\",\s*qja:\"((?:[^\"\\]|\\.)*)\",\s*a:\"((?:[^\"\\]|\\.)*)\",\s*aja:\"((?:[^\"\\]|\\.)*)\"", src):
        out.append({"c": int(m.group(1)), "q": m.group(2), "qja": m.group(3), "a": m.group(4), "aja": m.group(5)})
    return out

def parse_bridge(path, florida):
    files = sorted(glob.glob(os.path.join(os.path.dirname(path), "_bridge*.md")))
    if not files:
        warn("content/_bridge*.md がない"); return []
    text = "\n".join(open(f, encoding="utf-8").read() for f in files)
    out = []
    for l in bullet_lines(text):
        p = parts(l)
        if len(p) < 4: err(f"bridge: 項目が足りない: {l}"); continue
        did, units = p[0], [u.strip() for u in p[1].split(",")]
        d = {"id": did, "units": units, "q": "", "qja": "", "a": "", "aja": "", "wrong": [], "src": None}
        for x in p[2:]:
            if x.startswith("Florida:"):
                q = x[8:].strip()
                hit = next((f for f in florida if f["q"].startswith(q)), None)
                if not hit: err(f"bridge {did}: Florida 500 に「{q}」が見つからない"); continue
                d.update({"q": hit["q"], "qja": hit["qja"], "a": hit["a"], "aja": hit["aja"], "src": "florida"})
            elif x.startswith("Q:"): d["q"] = x[2:].strip()
            elif x.startswith("Qja:"): d["qja"] = x[4:].strip()
            elif x.startswith("A:"): d["a"] = x[2:].strip()
            elif x.startswith("Aja:"): d["aja"] = x[4:].strip()
            elif x.startswith("誤答:"): d["wrong"] = split_choices(x[3:])
        if not d["q"] or not d["a"]: err(f"bridge {did}: q / a が無い")
        if len(d["wrong"]) != 3: err(f"bridge {did}: 誤答は3つ（今 {len(d['wrong'])}）")
        if d["a"] in d["wrong"]: err(f"bridge {did}: 誤答に正解が含まれている")
        out.append(d)
    ids = [d["id"] for d in out]
    for i in set(ids):
        if ids.count(i) > 1: err(f"bridge: ID重複 {i}")
    return out

def parse_basic(path):
    if not os.path.exists(path): warn("content/_basic.md がない"); return []
    text = open(path, encoding="utf-8").read()
    out = []; pack = None
    for l in text.splitlines():
        if l.startswith("## "): pack = l[3:].strip()
        elif l.startswith("- ") and pack:
            p = parts(l[2:])
            if len(p) < 3: err(f"basic: 形式 {l}"); continue
            out.append({"id": slug(p[0]), "en": p[0], "ja": p[1], "pos": p[2], "unit": None, "pack": pack,
                        "ex": {"en": p[3], "ja": p[4]} if len(p) > 4 else None})
    return out

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--florida", default=os.path.join(ROOT, "..", "florida-english"))
    args = ap.parse_args()

    units, lessons, vocab = [], {}, []
    for path in sorted(glob.glob(os.path.join(CONTENT, "U*.md"))):
        u, rest = parse_unit(path)
        if u:
            units.append(u); lessons[u["id"]] = rest[0]; vocab += rest[1]

    ids = [u["id"] for u in units]
    for i in set(ids):
        if ids.count(i) > 1: err(f"ユニットID重複 {i}")
    idset = set(ids)
    for u in units:
        for p in u["prereq"]:
            if p not in idset: warn(f"{u['id']}: 前提 {p} がまだ無い")
        if u["area"] not in {a["id"] for a in AREAS}: err(f"{u['id']}: area が不正")
    # 前提の循環
    def reach(x, seen):
        for p in next((u["prereq"] for u in units if u["id"] == x), []):
            if p in seen: err(f"前提の循環: {x} → {p}"); return
            reach(p, seen | {p})
    for u in units: reach(u["id"], {u["id"]})

    # 単語の重複（先勝ち）
    seen = {}
    vocab2 = []
    for v in vocab + parse_basic(os.path.join(CONTENT, "_basic.md")):
        if v["id"] in seen:
            warn(f"単語重複 {v['en']}（{seen[v['id']]} と {v['unit'] or v['pack']}）— 先のものを使う")
            continue
        seen[v["id"]] = v["unit"] or v["pack"]; vocab2.append(v)
    for u in units:
        u["vocab"] = [x for x in u["vocab"] if x in seen]

    florida = load_florida(args.florida)
    dialogs = parse_bridge(os.path.join(CONTENT, "_bridge.md"), florida)
    dids = {d["id"] for d in dialogs}
    for u in units:
        for d in u["dialogs"]:
            if d not in dids: err(f"{u['id']}: 受け答え {d} が _bridge*.md に無い")
    for d in dialogs:
        for x in d["units"]:
            if x not in idset: warn(f"bridge {d['id']}: ユニット {x} がまだ無い")

    units.sort(key=lambda u: u["id"])
    for a in AREAS:
        a["units"] = [u["id"] for u in units if u["area"] == a["id"]]

    if warnings:
        print("警告:"); [print("  -", w) for w in warnings]
    if errors:
        print("エラー:"); [print("  -", e) for e in errors]
        print(f"\nビルド中止（エラー {len(errors)}）"); sys.exit(1)

    ver = datetime.date.today().isoformat()
    js = "// 自動生成: tools/build_data.py（content/*.md から）。手で編集しない。\n"
    js += f"const CONTENT_VERSION={json.dumps(ver)};\n"
    js += "const AREAS=" + json.dumps(AREAS, ensure_ascii=False) + ";\n"
    js += "const UNITS=" + json.dumps(units, ensure_ascii=False) + ";\n"
    js += "const LESSONS=" + json.dumps(lessons, ensure_ascii=False) + ";\n"
    js += "const VOCAB=" + json.dumps(vocab2, ensure_ascii=False) + ";\n"
    js += "const DIALOGS=" + json.dumps(dialogs, ensure_ascii=False) + ";\n"
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(js)
    ng = sum(len(l["notice"]) + len(l["drill"]) + len(l["use"]["instant"]) for l in lessons.values())
    print(f"OK: ユニット {len(units)} / 問題 {ng} / 単語 {len(vocab2)} / 受け答え {len(dialogs)} → {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT)//1024}KB)")

if __name__ == "__main__":
    main()
