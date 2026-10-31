# -*- coding: utf-8 -*-
"""把 ui_v2.css 注入 index.html（替换已有 <style id="ui-v2">…</style>）。"""
import io
import re
import shutil

P = "index.html"
CSS = io.open("ui_v2.css", encoding="utf-8").read()
s = io.open(P, encoding="utf-8", newline="").read()
if not __import__("os").path.exists("index.html.bak_ui"):
    shutil.copyfile(P, "index.html.bak_ui")

block = '<style id="ui-v2">\n' + CSS + '\n</style>'
pat = re.compile(r'<style id="ui-v2">.*?</style>', re.S)
if pat.search(s):
    s = pat.sub(lambda m: block, s, count=1)
    print("replaced existing ui-v2")
else:
    i = s.rfind("</head>")
    assert i > 0
    s = s[:i] + block + "\n" + s[i:]
    print("inserted ui-v2")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("size", len(s.encode("utf-8")))
