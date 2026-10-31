# -*- coding: utf-8 -*-
"""UI v2 结构改造：
1) 把首页搜索条移到「内容列顶部」的独立工具条 tw-topbar
2) 顶栏(hero) 变为侧栏顶部的品牌卡（头像+名称+副标题）
3) .wrap 下移一行，让出 topbar 的位置
"""
import io
import re
import shutil

P = "index.html"
s = io.open(P, encoding="utf-8", newline="").read()
shutil.copyfile(P, "index.html.bak_topbar")

# ---- 1. 取出 .hp-search 整块（按 div 配对）----
start = s.index('<div class="hp-search">')
depth = 0
i = start
end = None
for m in re.finditer(r'<div\b|</div>', s[start:]):
    if m.group(0) == '</div>':
        depth -= 1
    else:
        depth += 1
    if depth == 0:
        end = start + m.end()
        break
assert end, "hp-search block not closed"
blk = s[start:end]
assert 'id="hpSearch"' in blk and 'ovLayoutBtn' in blk, "unexpected block"
print("hp-search block len", len(blk))

# 移除原位置（连同后面多余空白）
s = s[:start] + s[end:]

# ---- 2. 插到 </header> 之后 ----
topbar = '\n<div class="tw-topbar" id="twTopbar">\n  ' + blk + '\n</div>\n'
j = s.index("</header>") + len("</header>")
s = s[:j] + topbar + s[j:]
print("topbar inserted")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("size", len(s.encode("utf-8")))
