# -*- coding: utf-8 -*-
"""把 ui_v3.css 注入 index.html（幂等：替换已有 <style id="ui-v3">…</style>）。

插入位置：</body> 之前 —— 文档最后一个样式块。
理由：head 里的 ui-v2、head 之后的 assistCss/wbGateCss、以及运行时注入的 stCss/tapTargets
都在它之前，同特异性下 ui-v3 一律胜出。

用法：
  python inject_v3.py            # 正常注入
  python inject_v3.py --dry      # 只做校验和大小预览，不写文件
"""
import io
import os
import re
import sys
import hashlib

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
CSS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui_v3.css")
DRY = "--dry" in sys.argv

src = io.open(P, encoding="utf-8", newline="").read()
css = io.open(CSS, encoding="utf-8", newline="").read()

# ---------- 护栏 ----------
# 1) CSS 内不得出现 </style，否则会提前闭合样式块、整块失效且无报错
low = css.lower()
assert "</style" not in low, "ui_v3.css 内不得出现 </style 字面量"

# 2) 大括号配平（去注释后计数）。不配平会让该 sheet 从错误点起静默丢弃后续规则
stripped = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
assert stripped.count("{") == stripped.count("}"), \
    "大括号不配平: { = %d, } = %d" % (stripped.count("{"), stripped.count("}"))

# 3) 禁止裸 :root 单选择器（特异性 0-1-0，会被 html[data-theme] 主题块打败）
for m in re.finditer(r"(^|[\s,{}])(:root)\s*[,{]", stripped):
    line = stripped[:m.start()].count("\n") + 1
    raise AssertionError("发现裸 :root（第 %d 行附近），请改用 html:root,html[data-theme]" % line)

# 4) 每个段落必须带编号注释，便于回滚定位
sections = re.findall(r"/\* -+ (\d+)\. ", css)
print("段落编号:", ", ".join(sections) if sections else "(无)")

# ---------- 注入 ----------
block = '<style id="ui-v3">\n' + css + '\n</style>'
pat = re.compile(r'<style id="ui-v3">.*?</style>', re.S)

before = len(src.encode("utf-8"))
if pat.search(src):
    src2 = pat.sub(lambda m: block, src, count=1)
    action = "replaced"
else:
    i = src.rfind("</body>")
    assert i > 0, "找不到 </body>"
    src2 = src[:i] + block + "\n" + src[i:]
    action = "inserted"

if not DRY:
    io.open(P, "w", encoding="utf-8", newline="").write(src2)

after = len(src2.encode("utf-8"))
sha = hashlib.sha1(io.open(P, "rb").read()).hexdigest() if not DRY else "(dry)"

print("%-9s css=%d chars  file %d -> %d bytes (%+d)" % (action, len(css), before, after, after - before))
print("sha1      " + sha)
if DRY:
    print("(dry run, 未写入)")
