/* diagnose.js —— 两件事：
   1) 查某个坐标点上到底是什么元素在占位（解决"背景不铺满/被遮挡"）
   2) 查某个元素所有命中的 CSS 规则，按层叠顺序列出（解决"改了不生效"）
   用法：
     node diagnose.js --at 112,700 --at 112,200
     node diagnose.js --rules ".hp-card" --rules ".ov-pf"
     node diagnose.js --at 112,700 --rules ".hp-card"
   可选 --w --h --q --filter 关键词（只显示含该关键词的声明） */
const { spawn } = require('child_process');
const os = require('os'), path = require('path');
const argv = process.argv.slice(2);
const all = (n) => argv.reduce((a, v, i) => (v === '--' + n && argv[i + 1] ? a.concat([argv[i + 1]]) : a), []);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const W = +arg('w', 1712), H = +arg('h', 927), QS = arg('q', ''), FILTER = arg('filter', '');
const ATS = all('at'), RULES = all('rules');
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9620 + Math.floor(Math.random() * 50);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-diag-' + Date.now());
  const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  const kill = () => { try { proc.kill('SIGKILL'); } catch (e) { } };
  let list = null;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/list'); list = await r.json(); if (list.length) break; } catch (e) { }
    await sleep(250);
  }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (m, p) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return 'EXC ' + JSON.stringify(r.result.exceptionDetails).slice(0, 200);
    return r.result && r.result.result ? r.result.result.value : null;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.bringToFront');
  await send('Page.navigate', { url: process.env.WB_URL || ('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/') + (QS ? '?' + QS : '')) });
  await sleep(2600);
  await ev(`(()=>{document.body.classList.remove('wb-locked');var g=document.getElementById('wbGate');if(g)g.remove();var c=document.getElementById('wbGateCss');if(c)c.remove();return 1})()`);
  await sleep(500);

  for (const at of ATS) {
    const [x, y] = at.split(',').map(Number);
    const out = await ev(`(()=>{var chain=[],e=document.elementFromPoint(${x},${y});
      for(var i=0;i<6&&e;i++){
        var cs=getComputedStyle(e);
        chain.push(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+
          (e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):'')+
          ' | bg='+cs.backgroundColor+' h='+Math.round(e.getBoundingClientRect().height)+
          ' y='+Math.round(e.getBoundingClientRect().top));
        e=e.parentElement}
      return chain.join('\\n  ↑ ');})()`);
    console.log('\n=== 坐标 (' + x + ',' + y + ') 命中的元素链 ===');
    console.log('  ' + out);
  }

  if (argv.includes('--shadows')) {
    const out = await ev(`(()=>{
      var seen={}, rows=[];
      var all=document.querySelectorAll('body *');
      for(var i=0;i<all.length;i++){
        var e=all[i], cs=getComputedStyle(e);
        if(cs.boxShadow==='none') continue;
        if(cs.display==='none'||cs.visibility==='hidden') continue;
        var r=e.getBoundingClientRect(); if(r.width<4||r.height<4) continue;
        var key=cs.boxShadow;
        var tag=e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+
          (e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):'');
        if(!seen[key]){seen[key]={n:0,ex:[]}}
        seen[key].n++; if(seen[key].ex.length<4) seen[key].ex.push(tag);
      }
      var keys=Object.keys(seen).sort(function(a,b){return seen[b].n-seen[a].n});
      return keys.map(function(k){return seen[k].n+'×  '+k.slice(0,120)+'\\n      '+seen[k].ex.join(' , ')}).join('\\n');
    })()`);
    console.log('\n=== 当前仍带 box-shadow 的元素（按数量排序）===');
    console.log(out || '(全部已清除)');
  }

  for (const sel of RULES) {    const out = await ev(`(()=>{
      var el=document.querySelector(${JSON.stringify(sel)});
      if(!el) return '(未找到 '+${JSON.stringify(sel)}+')';
      var hits=[], flt=${JSON.stringify(FILTER)};
      for(var i=0;i<document.styleSheets.length;i++){
        var sh=document.styleSheets[i], id=sh.ownerNode?(sh.ownerNode.id||sh.ownerNode.getAttribute('data-page-node-id')||'(anon)'):'?';
        var rules; try{rules=sh.cssRules}catch(e){continue}
        (function walk(rs, media){
          for(var j=0;j<rs.length;j++){
            var r=rs[j];
            if(r.type===4){ walk(r.cssRules, (media?media+' && ':'')+r.conditionText); continue }
            if(!r.selectorText) continue;
            var sels=r.selectorText.split(',').map(function(s){return s.trim()});
            for(var k=0;k<sels.length;k++){
              var ok=false; try{ok=el.matches(sels[k])}catch(e){}
              if(!ok) continue;
              var t=r.style.cssText||'';
              if(flt && t.indexOf(flt)<0) continue;
              hits.push({sheet:id, media:media||'-', sel:sels[k], css:t});
            }
          }
        })(rules,null);
      }
      return hits.map(function(h){return '['+h.sheet+(h.media!=='-'?' @'+h.media:'')+']\\n   '+h.sel+'\\n   { '+h.css.slice(0,240)+' }'}).join('\\n');
    })()`);
    console.log('\n=== ' + sel + ' 命中的规则（按层叠顺序，越靠后越强）===');
    console.log(String(out).slice(0, 6000));
  }

  ws.close(); kill();
  try { require('fs').rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
