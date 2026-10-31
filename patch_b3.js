/* patch_b3.js —— 在首页问候卡里插入快捷胶囊（参考应用 Hero 卡的胶囊按钮）
   做法：往 </body> 前注入一段独立 <script>，幂等（带 <script id="ui-v3-hero"> 标记）。
   不碰主 IIFE —— 点击通过转发到侧栏 tab 实现，不需要访问内部变量 Z。

   为什么不做参考应用那套「4 个快捷入口 + 3 个统计卡」：
   那是因为参考是手机 App、没有侧栏才需要的。这个工作台桌面端已有完整侧栏导航，
   再加一排入口是冗余；而统计数字要读 Z.data，得把代码注入主 IIFE 才能拿到。 */
const fs = require('fs');
const crypto = require('crypto');
const P = __dirname + '/index.html';
let s = fs.readFileSync(P, 'utf8');
const before = crypto.createHash('sha1').update(fs.readFileSync(P)).digest('hex');

const JS = `
<script id="ui-v3-hero">
(function(){
  if (window.__v3Hero) return; window.__v3Hero = 1;
  var PICKS = [
    { t: '今日课表', go: '工作', sub: 'course' },
    { t: '考勤',     go: '工作', sub: 'attend' },
    { t: '上课记录', go: '工作', sub: 'classlog' },
    { t: '小课堂',   go: '助手' }
  ];
  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'v3-heroacts';
    PICKS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'v3-pill'; b.textContent = p.t;
      b.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var tab = document.querySelector('#tabs .tab[data-view="' + p.go + '"]');
        if (!tab) return;
        tab.click();
        if (!p.sub) return;
        setTimeout(function () {
          var sub = document.querySelector('[data-twct="' + p.sub + '"]')
                 || document.querySelector('#sideSub [data-side-sub="' + p.sub + '"]')
                 || document.querySelector('#workNav [data-key="' + p.sub + '"]');
          if (sub) sub.click();
        }, 140);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function mount() {
    var pf = document.querySelector('#ovBoard > .ov-slot[data-ov="pf"] > .hp-card')
          || document.querySelector('#view-overview .hp-card.ov-pf');
    if (!pf || pf.querySelector('.v3-heroacts')) return;
    var q = pf.querySelector('.ov-pf-q');
    if (!q) return;
    pf.insertBefore(build(), q);
  }
  function start() {
    mount();
    var board = document.getElementById('ovBoard');
    if (board && !board.__v3obs) {
      /* 首次挂载后 bp()/_a() 会重写看板内容，胶囊会丢，用 observer 补回。
         mount() 内有已存在判断，不会死循环。 */
      var ob = new MutationObserver(function () { mount(); });
      ob.observe(board, { childList: true, subtree: true });
      board.__v3obs = ob;
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 380); });
  else setTimeout(start, 380);
  setTimeout(start, 1600);
  setTimeout(start, 3200);
})();
<\/script>`;

const pat = /<script id="ui-v3-hero">[\s\S]*?<\/script>/;
let action;
if (pat.test(s)) {
  s = s.replace(pat, function () { return JS; });
  action = 'replaced';
} else {
  const i = s.lastIndexOf('</body>');
  if (i < 0) { console.error('找不到 </body>'); process.exit(1); }
  s = s.slice(0, i) + JS + '\n' + s.slice(i);
  action = 'inserted';
}

fs.writeFileSync(P, s, 'utf8');
const after = crypto.createHash('sha1').update(fs.readFileSync(P)).digest('hex');
console.log(action + '  bytes ' + Buffer.byteLength(s, 'utf8'));
console.log('sha1 ' + before + ' -> ' + after);

const chk = fs.readFileSync(P, 'utf8');
console.log('自检: script 标记 ' + (chk.match(/id="ui-v3-hero"/g) || []).length + ' 处, v3-pill ' + (chk.match(/v3-heroacts/g) || []).length + ' 处');
