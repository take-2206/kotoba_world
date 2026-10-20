#!/usr/bin/env python3
"""Gộp cả game (HTML + CSS + JS + ảnh) thành MỘT file HTML duy nhất để mở trên điện thoại.
Dùng: python3 tools/build-single.py [đường_dẫn_file_ra]   (cần: pip install pillow)
"""
import base64, io, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'be_que_game.html')

def data_uri(path):
    im = Image.open(path)
    name = os.path.relpath(path, os.path.join(ROOT, 'assets'))
    buf = io.BytesIO()
    if name.startswith('shop' + os.sep) and name != 'shop-background.jpg':   # hình món hàng: webp trong suốt, nhỏ
        im = im.convert('RGBA'); im.thumbnail((360, 360), Image.LANCZOS); im.save(buf, 'WEBP', quality=88, method=6); mime = 'image/webp'
    elif name == 'notebook.png':
        im = im.convert('RGBA'); im.thumbnail((128, 128), Image.LANCZOS); im.save(buf, 'PNG', optimize=True); mime = 'image/png'
    else:                                                                       # ảnh nền: JPEG vừa đủ nét cho điện thoại
        im = im.convert('RGB'); im.thumbnail((1600, 1600), Image.LANCZOS); im.save(buf, 'JPEG', quality=80, optimize=True, progressive=True); mime = 'image/jpeg'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(buf.getvalue()).decode())

read = lambda n: open(os.path.join(ROOT, n), encoding='utf-8').read()
html, css, vocab, game = read('index.html'), read('style.css'), read('vocab.js'), read('game.js')

assets = {}
for d, _, files in os.walk(os.path.join(ROOT, 'assets')):
    for f in files:
        p = os.path.join(d, f); assets[os.path.relpath(p, ROOT).replace(os.sep, '/')] = p
def inline(text):
    # chỉ thay các đường dẫn nằm trong dấu nháy (src="…", '…'), không đụng chữ hướng dẫn hiển thị
    for rel in sorted(assets, key=len, reverse=True):
        uri = data_uri(assets[rel])
        text = re.sub(r'(["\'])' + re.escape(rel) + r'\1', lambda m: m.group(1) + uri + m.group(1), text)
        text = text.replace('url(' + rel + ')', 'url(' + uri + ')')
    return text

html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="vocab.js"></script>', '<script>\n' + vocab + '\n</script>')
html = html.replace('<script src="game.js"></script>', '<script>\n' + game + '\n</script>')
html = inline(html)
open(OUT, 'w', encoding='utf-8').write(html)
print(OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
