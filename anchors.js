/* 锚点探针：输出 index.html 里所有关键定位串的字符偏移与出现次数。
   用法：node anchors.js
   注意：插入 ui-v3 后会平移其后全部偏移，每批开工前重跑本脚本，禁止沿用旧值。*/
const fs = require('fs');
const crypto = require('crypto');
const P = __dirname + '/index.html';
const s = fs.readFileSync(P, 'utf8');

const sha1 = crypto.createHash('sha1').update(fs.readFileSync(P)).digest('hex');
const lines = [];
const push = (a, b, c) => lines.push([a, b, c]);

function count(needle) {
  let n = 0, i = 0;
  while ((i = s.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}
function at(needle) { const i = s.indexOf(needle); return i; }

console.log('file   : ' + P);
console.log('sha1   : ' + sha1);
console.log('bytes  : ' + fs.statSync(P).size);
console.log('chars  : ' + s.length);
console.log('');

/* ---- 样式块 ---- */
const styles = [
  ['style#main           ', '<style data-page-node-id="pXo4bB5ZfrvKjRua7ime1n"'],
  ['style#tw-msg-css     ', '<style id="tw-msg-css">'],
  ['style#tw-nav2-css    ', '<style id="tw-nav2-css">'],
  ['style#ui-v2          ', '<style id="ui-v2">'],
  ['style#ui-v3 (待建)   ', '<style id="ui-v3">'],
  ['style#assistCss      ', '<style id="assistCss">'],
  ['style#wbGateCss      ', '<style id="wbGateCss">'],
];
console.log('== 样式块 ==');
for (const [label, needle] of styles) {
  const i = at(needle);
  console.log(label + ' offset=' + (i < 0 ? 'MISSING' : i) + '  hits=' + count(needle));
}

/* ---- 结构锚点 ---- */
const anchors = [
  ['</head>              ', '</head>'],
  ['</body>              ', '</body>'],
  ['nav#tabs             ', 'id="tabs"'],
  ['nav#mNav             ', 'id="mNav"'],
  ['div.wrap             ', '<div class="wrap">'],
  ['主脚本起             ', '<script data-page-node-id="IhRrdrFHAXDC5enIY1s8iE">'],
  ['主 IIFE 起           ', '!function(){"use strict";var t=window.__WB_DB||null'],
  ['[prd-nav]            ', '[prd-nav]'],
  ['ovBoard              ', 'id="ovBoard"'],
  ['view-overview        ', 'id="view-overview"'],
  ['view-daily           ', 'id="view-daily"'],
  ['view-cat             ', 'id="view-cat"'],
  ['view-work            ', 'id="view-work"'],
  ['view-trash           ', 'id="view-trash"'],
  ['view-assist          ', 'id="view-assist"'],
  ['view-me              ', 'id="view-me"'],
  ['view-代课记录        ', 'id="view-代课记录"'],
];
console.log('');
console.log('== 结构锚点 ==');
for (const [label, needle] of anchors) {
  const i = at(needle);
  console.log(label + ' offset=' + (i < 0 ? 'MISSING' : i) + '  hits=' + count(needle));
}

/* ---- JS 函数锚点 ---- */
const fns = [
  ['bp()                 ', 'function bp(t){'],
  ['pd()                 ', 'function pd(){'],
  ['_a()                 ', 'function _a(){'],
  ['Ic()                 ', 'function Ic(){'],
  ['twShowSection()      ', 'function twShowSection('],
  ['twHi()               ', 'function twHi('],
  ['twPromo()            ', 'function twPromo('],
  ['Rn 首页问候 Ra       ', 'function Ra('],
  ['__renderStudent      ', 'window.__renderStudent=function(){'],
  ['stCss 变量           ', 'Od="stCss"'],
  ['stCss 字符串起点     ', 'textContent='],
  ['#stView 骨架          ', 'n.id="stView"'],
];
console.log('');
console.log('== JS 锚点 ==');
for (const [label, needle] of fns) {
  const i = at(needle);
  console.log(label + ' offset=' + (i < 0 ? 'MISSING' : i) + '  hits=' + count(needle));
}

/* ---- 学生端 11.2 静态覆盖块 ---- */
const i112 = at('11.2 学生端');
console.log('');
console.log('== 学生端静态块 ==');
console.log('11.2 注释 offset=' + (i112 < 0 ? 'MISSING' : i112));
if (i112 >= 0) {
  console.log('片段: ' + JSON.stringify(s.substr(i112, 140)));
}

/* ---- 关键 CSS 值探针（判断哪条声明真实生效） ---- */
console.log('');
console.log('== 关键声明计数 ==');
for (const n of ['.mcard{', '--r-lg', '--r-xl', 'var(--r)', 'border-radius:20px', 'html body #stView']) {
  console.log(n.padEnd(22) + ' hits=' + count(n));
}
