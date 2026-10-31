/* patch_b5.js —— 修学生端违纪公示未过滤 show_stu 的问题
   学生端 R() 的 discipline 分支直接把 b 全量渲染，导致教师端标了「学生端隐藏」
   的违纪记录照样公示给学生。
   用 !==false 而非 ===true：G() 是直接把数据库原始行赋给 b，历史行的 show_stu
   可能是 null / undefined，严格判断 true 会把老数据全部隐藏 —— 那是新的静默回归。 */
const fs = require('fs');
const crypto = require('crypto');
const P = __dirname + '/index.html';
let s = fs.readFileSync(P, 'utf8');

const before = crypto.createHash('sha1').update(fs.readFileSync(P)).digest('hex');

const OLD = '"discipline"===c?function(){var t=b||[]';
const NEW = '"discipline"===c?function(){var t=(b||[]).filter(function(x){return x&&x.show_stu!==false})';

function count(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

const nOld = count(s, OLD);
const nNew = count(s, NEW);
console.log('旧串命中 ' + nOld + ' 处，新串命中 ' + nNew + ' 处');

if (nNew === 1 && nOld === 0) {
  console.log('已经修过了，跳过');
  process.exit(0);
}
if (nOld !== 1) {
  console.error('定位失败：旧串应恰好命中 1 处，实际 ' + nOld);
  process.exit(1);
}

const at = s.indexOf(OLD);
s = s.slice(0, at) + NEW + s.slice(at + OLD.length);

fs.writeFileSync(P, s, 'utf8');

const after = crypto.createHash('sha1').update(fs.readFileSync(P)).digest('hex');
console.log('替换位置 ' + at);
console.log('sha1 ' + before + ' -> ' + after);
console.log('字节 ' + Buffer.byteLength(s, 'utf8'));

// 自检：新代码必须只出现一次，且共 N 条 仍用 t.length
const chk = fs.readFileSync(P, 'utf8');
console.log('自检 filter 命中 ' + count(chk, 'x.show_stu!==false') + ' 处');
