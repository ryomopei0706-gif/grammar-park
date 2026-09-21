#!/usr/bin/env python3
"""ホーム画面アイコン（パークの門の線画・オレンジ地）を生成する"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def make(size):
    S = 1024
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # 背景（角丸はiOSが切るので正方形のまま）
    d.rectangle([0, 0, S, S], fill=(255, 122, 26, 255))
    w = 40  # 線の太さ
    ink = (255, 255, 255, 255)
    # 門：2本の柱＋アーチ＋旗
    px1, px2 = 250, 774
    top, bottom = 470, 800
    d.rectangle([px1 - w // 2, top, px1 + w // 2, bottom], fill=ink)
    d.rectangle([px2 - w // 2, top, px2 + w // 2, bottom], fill=ink)
    # アーチ（半円の線）
    d.arc([px1 - w // 2, 250, px2 + w // 2, 690], start=180, end=360, fill=ink, width=w)
    # 柱の飾り（球）
    d.ellipse([px1 - 55, top - 110, px1 + 55, top], fill=ink)
    d.ellipse([px2 - 55, top - 110, px2 + 55, top], fill=ink)
    # 旗
    d.rectangle([S // 2 - w // 2, 150, S // 2 + w // 2, 300], fill=ink)
    d.polygon([(S // 2 + w // 2, 150), (S // 2 + 170, 195), (S // 2 + w // 2, 240)], fill=ink)
    # 地面
    d.rectangle([180, bottom, S - 180, bottom + w], fill=ink)
    # 門の中の「G」は入れず、シンプルに
    if size != S:
        im = im.resize((size, size), Image.LANCZOS)
    im.convert("RGB").save(os.path.join(ROOT, f"icon-{size}.png"), optimize=True)

for s in (1024, 512, 180):
    make(s)
print("OK: icon-1024/512/180.png")
