/* patch_b3.js —— 首页顶部预览条让位（幂等注入 <script id="ui-v3-hero">）

   历史：这里原本还负责往问候卡里插 4 个「今日课表 / 考勤 / 上课记录 / 小课堂」快捷胶囊
   （模仿参考应用 Hero 卡的胶囊按钮）。新版首页按用户给的参考图改成了六张白卡，
   问候卡里没有那排胶囊，白底上 rgba(255,255,255,.18) 的胶囊也完全不可见，
   所以整段胶囊注入已移除，只保留预览条让位这一个职责。
   要恢复胶囊：加回 mount()/build() 即可（见 git 历史 de3262d 之前的版本）。 */
const fs = require('fs');
const crypto = require('crypto');
const P = __dirname + '/index.html';
let s = fs.readFileSync(P, 'utf8');
const before = crypto.createHash('sha1').update(fs.readFileSync(P)).digest('hex');

const JS = `
<script id="ui-v3-hero">
(function(){
  if (window.__v3Hero) return; window.__v3Hero = 1;
  /* 顶部预览条是 position:fixed;top:0，而 header.hero 从 y=0 排起，
     必然压住 logo 的上半截（桌面和手机都有）。这里量出实际条高，
     写进 --v3-pv-h 让 hero 让位；点「知道了」关掉后要能自动收回。 */
  function fixBar() {
    var bar = document.getElementById('wbpvBar'), root = document.documentElement;
    if (!bar) { document.body.classList.remove('v3-haspv'); return; }
    var cs = getComputedStyle(bar);
    var h = (cs.display === 'none' || cs.visibility === 'hidden') ? 0 : Math.round(bar.getBoundingClientRect().height);
    if (h > 4) {
      root.style.setProperty('--v3-pv-h', h + 'px');
      document.body.classList.add('v3-haspv');
    } else {
      document.body.classList.remove('v3-haspv');
    }
  }
  function start() {
    fixBar();
    var bar = document.getElementById('wbpvBar');
    if (bar && !bar.__v3obs) {
      new MutationObserver(fixBar).observe(bar, { attributes: true, attributeFilter: ['style', 'class'] });
      bar.__v3obs = 1;
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 380); });
  else setTimeout(start, 380);
  setTimeout(start, 1600);
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
console.log('自检: script 标记 ' + (chk.match(/id="ui-v3-hero"/g) || []).length + ' 处, 残留 v3-heroacts ' + (chk.match(/v3-heroacts/g) || []).length + ' 处（应为 0）');
