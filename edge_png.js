/* edge_png.js —— 零依赖 PNG 解码，扫描某一行/列的“卡片边界”
   用法：node edge_png.js <file.png> row <y>
        node edge_png.js <file.png> col <x> */
const fs = require('fs'), zlib = require('zlib');

function readPNG(file) {
  const buf = fs.readFileSync(file);
  let i = 8, w = 0, h = 0, bit = 0, ct = 0, inter = 0;
  const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.slice(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bit = data[8]; ct = data[9]; inter = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (bit !== 8 || inter !== 0) throw new Error('only 8-bit non-interlaced supported: bit=' + bit + ' inter=' + inter);
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : -1;
  if (ch < 0) throw new Error('unsupported colorType ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const line = raw.slice(p, p + stride); p += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, px: out };
}

const [file, mode, arg, arg2] = process.argv.slice(2);
const img = readPNG(file);
const get = (x, y) => { const o = (y * img.w + x) * img.ch; return [img.px[o], img.px[o + 1], img.px[o + 2]]; };
const hex = (c) => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
console.log('size', img.w + 'x' + img.h, 'ch', img.ch);

if (mode === 'band') {
  // 纵向投影：x 范围内，若整列（y0..y1）都不是纯白，则该列是空隙
  const y0 = +arg, y1 = +arg2;
  let cols = [];
  for (let x = 0; x < img.w; x++) {
    let n = 0, tot = 0;
    for (let y = y0; y <= y1; y++) { const c = get(x, y); tot++; if (c[0] > 250 && c[1] > 250 && c[2] > 250) n++; }
    cols.push(n / tot > 0.5 ? 'W' : '.');
  }
  let s = '', prev = null, start = 0, out = [];
  for (let x = 0; x < cols.length; x++) {
    if (prev === null) { prev = cols[x]; start = 0; }
    else if (cols[x] !== prev) { out.push(`${prev}:${start}-${x - 1}(${x - start})`); prev = cols[x]; start = x; }
  }
  out.push(`${prev}:${start}-${cols.length - 1}(${cols.length - start})`);
  console.log('带内白列(y=' + y0 + '..' + y1 + ')');
  console.log(out.filter(o => true).join('  '));
  process.exit(0);
}

if (mode === 'region') {
  // region x0 y0 x1 y1 —— 统计区域内出现的颜色及占比
  const [x0, y0, x1, y1] = [process.argv[4], process.argv[5], process.argv[6], process.argv[7]].map(Number);
  const cnt = new Map();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const h = hex(get(x, y)); cnt.set(h, (cnt.get(h) || 0) + 1);
  }
  const arr = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
  const tot = arr.reduce((s, v) => s + v[1], 0);
  console.log('区域 %d,%d-%d,%d 共 %d 像素，%d 种颜色', x0, y0, x1, y1, tot, arr.length);
  arr.slice(0, 12).forEach(([h, n]) => console.log('  ' + h + '  ' + n + '  ' + (n / tot * 100).toFixed(1) + '%'));
  process.exit(0);
}

if (mode === 'anycol') {
  // y0..y1 带内，只要该列存在任何非白像素就算“有墨”
  const y0 = +arg, y1 = +arg2;
  let out = [], prev = null, start = 0;
  const cols = [];
  for (let x = 0; x < img.w; x++) {
    let ink = false;
    for (let y = y0; y <= y1; y++) { const c = get(x, y); if (!(c[0] > 250 && c[1] > 250 && c[2] > 250)) { ink = true; break; } }
    cols.push(ink ? '.' : 'W');
  }
  for (let x = 0; x < cols.length; x++) {
    if (prev === null) { prev = cols[x]; start = 0; }
    else if (cols[x] !== prev) { out.push(`${prev}:${start}-${x - 1}(${x - start})`); prev = cols[x]; start = x; }
  }
  out.push(`${prev}:${start}-${cols.length - 1}(${cols.length - start})`);
  console.log('有墨列(y=' + y0 + '..' + y1 + ')  . = 有内容');
  console.log(out.filter(o => !o.startsWith('W:')).join('  ') || '(全白)');
  process.exit(0);
}

if (mode === 'hband') {
  const x0 = +arg, x1 = +arg2;
  let rows = [];
  for (let y = 0; y < img.h; y++) {
    let n = 0, tot = 0;
    for (let x = x0; x <= x1; x++) { const c = get(x, y); tot++; if (c[0] > 250 && c[1] > 250 && c[2] > 250) n++; }
    rows.push(n / tot > 0.5 ? 'W' : '.');
  }
  let prev = null, start = 0, out = [];
  for (let y = 0; y < rows.length; y++) {
    if (prev === null) { prev = rows[y]; start = 0; }
    else if (rows[y] !== prev) { out.push(`${prev}:${start}-${y - 1}(${y - start})`); prev = rows[y]; start = y; }
  }
  out.push(`${prev}:${start}-${rows.length - 1}(${rows.length - start})`);
  console.log('带内白行(x=' + x0 + '..' + x1 + ')');
  console.log(out.join('  '));
  process.exit(0);
}

const n = +arg;
const lim = mode === 'row' ? img.w : img.h;
let segs = [], start = 0, prev = null;
for (let k = 0; k < lim; k++) {
  const c = mode === 'row' ? get(k, n) : get(n, k);
  const isWhite = c[0] > 248 && c[1] > 248 && c[2] > 248;
  const tag = isWhite ? 'W' : 'B';
  if (prev === null) { prev = tag; start = 0; }
  else if (tag !== prev) {
    segs.push({ tag: prev, a: start, b: k - 1, len: k - start });
    prev = tag; start = k;
  }
}
segs.push({ tag: prev, a: start, b: lim - 1, len: lim - start });
const big = segs.filter(s => s.len >= 3);
console.log(big.map(s => `${s.tag}:${s.a}-${s.b}(${s.len})`).join('  '));
console.log('--- 该行采样色 ---');
for (let k = 0; k < lim; k += Math.max(1, Math.floor(lim / 30))) {
  const c = get(k, n);
  process.stdout.write(`${k}=${hex(c)} `);
}
console.log();
