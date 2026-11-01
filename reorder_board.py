"""reorder_board.py —— 把 #ovBoard 里 6 个 .ov-slot 的默认顺序改成参考图顺序

目标顺序：pf(老师) → time(时钟) → course(上课提醒) → todo(事项) → cal(日历) → wx(天气)
同时把每张卡的 data-w 统一成 4，使 12 栅格下三列等宽（参考图实测 521/521/521）。

只做结构搬移 + 单个属性值替换，不改任何文案，不触碰 JS。
"""
import re, sys, shutil

SRC = 'index.html'

def find_div_end(s, start):
    """start 指向 '<div' 的 '<'，返回匹配的 '</div>' 结束位置（不含）。"""
    depth = 0
    i = start
    tok = re.compile(r'<div\b|</div\s*>', re.I)
    while True:
        m = tok.search(s, i)
        if not m:
            raise AssertionError('未找到配对的 </div>（从 %d 起）' % start)
        if m.group(0).lower().startswith('</'):
            depth -= 1
            if depth == 0:
                return m.end()
            i = m.end()
        else:
            depth += 1
            i = m.end()

def split_children(s, a, b):
    """把 [a,b) 内的顶层子元素切片。"""
    out = []
    i = a
    pat = re.compile(r'<div\b', re.I)
    while i < b:
        m = pat.search(s, i)
        if not m or m.start() >= b:
            break
        e = find_div_end(s, m.start())
        out.append((m.start(), e))
        i = e
    return out

def main():
    s = open(SRC, encoding='utf-8').read()
    anchor = s.find('class="ov-board" id="ovBoard"')
    assert anchor > 0, '找不到 #ovBoard'
    open_tag = s.rfind('<div', 0, anchor)
    inner_a = s.find('>', anchor) + 1
    inner_b = find_div_end(s, open_tag) - len('</div>')

    kids = split_children(s, inner_a, inner_b)
    print('顶层子元素数：', len(kids))
    blocks = []
    for (a, e) in kids:
        chunk = s[a:e]
        m = re.search(r'data-ov="([^"]+)"', chunk)
        w = re.search(r'data-w="(\d+)"', chunk)
        blocks.append({'a': a, 'e': e, 'ov': m.group(1) if m else None,
                       'w': w.group(1) if w else None, 'html': chunk})
        print('  %-8s data-w=%-3s %6d B' % (blocks[-1]['ov'], blocks[-1]['w'], len(chunk)))

    order = ['pf', 'time', 'course', 'todo', 'cal', 'wx']
    by = {b['ov']: b for b in blocks}
    assert set(by) == set(order), '槽位集合不符：%s' % sorted(by)
    assert len(blocks) == 6, '期望 6 个槽位，实际 %d' % len(blocks)

    gap = s[blocks[0]['e']:blocks[1]['a']]
    print('槽位之间的连接串：%r' % gap[:60])

    new_inner = gap.join(by[k]['html'] for k in order)
    # 统一 data-w=4（三列等宽）
    def force_w(html):
        return re.sub(r'(class="ov-slot"[^>]*?)\bdata-w="\d+"', r'\1data-w="4"', html, count=1)
    new_inner = gap.join(force_w(by[k]['html']) for k in order)

    # 重新校验顺序与字节数
    for k in order:
        pass
    after = []
    for (a, e) in split_children(new_inner, 0, len(new_inner)):
        m = re.search(r'data-ov="([^"]+)"', new_inner[a:e])
        w = re.search(r'data-w="(\d+)"', new_inner[a:e])
        after.append((m.group(1) if m else '?', w.group(1) if w else '?'))
    print('改后顺序：', after)
    assert [x[0] for x in after] == order, '改后顺序不对：%s' % after
    assert all(x[1] == '4' for x in after), 'data-w 未统一：%s' % after

    old_total = sum(len(b['html']) for b in blocks)
    print('块总字节 %d -> %d（差 %+d，应为 data-w 位数差）' % (old_total, len(new_inner), len(new_inner) - old_total))

    if '--apply' not in sys.argv:
        print('\n[预演] 未写入。加 --apply 落地。')
        return
    shutil.copy(SRC, SRC + '.bak_order')
    out = s[:inner_a] + new_inner + s[inner_b:]
    open(SRC, 'w', encoding='utf-8', newline='').write(out)
    print('已写入，文件 %d B -> %d B' % (len(s.encode('utf-8')), len(out.encode('utf-8'))))

main()
