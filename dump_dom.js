/* dump_dom.js —— 导出指定选择器的 outerHTML（截断），用于拿准类名
   用法：node dump_dom.js "#tabs" "#meBody" [--w 1712] [--h 927] [--len 3000] [--q query] */
const { spawn } = require('child_process');
const os = require('os'), path = require('path');
const argv = process.argv.slice(2);
const sels = argv.filter(a => !a.startsWith('--'));
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const W = +arg('w', 1712), H = +arg('h', 927), LEN = +arg('len', 3000), QS = arg('q', ''), WAIT = +arg('wait', 2400);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9650 + Math.floor(Math.random() * 40);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-dump-' + Date.now());
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
    return r.result && r.result.result ? r.result.result.value : null;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.bringToFront');
  await send('Page.navigate', { url: process.env.WB_URL || ('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/') + (QS ? '?' + QS : '')) });
  await sleep(WAIT);
  await ev(`(()=>{document.body.classList.remove('wb-locked');var g=document.getElementById('wbGate');if(g)g.remove();var c=document.getElementById('wbGateCss');if(c)c.remove();return 1})()`);
  await sleep(400);

  for (const sel of sels) {
    let expr;
    if (sel.startsWith('children:')) {
      // 列出某元素的一级子节点：children:body
      const host = sel.slice(9) || 'body';
      expr = `(()=>{var p=document.querySelector(${JSON.stringify(host)});if(!p)return '(未找到)';
        return Array.from(p.children).map(function(e,i){return i+'. '+e.tagName.toLowerCase()+
          (e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):'')+
          '  ['+Math.round(e.getBoundingClientRect().height)+'px]';}).join('\\n')})()`;
    } else if (sel.startsWith('text:')) {
      // 按可见文字反查元素：text:预览模式（排除 script/style）
      const kw = JSON.stringify(sel.slice(5));
      expr = `(()=>{var all=Array.from(document.querySelectorAll('body *')).filter(function(e){
        var t=(e.tagName||'').toUpperCase();
        return t!=='SCRIPT' && t!=='STYLE' && t!=='NOSCRIPT' && e.children.length===0 && (e.textContent||'').indexOf(${kw})>=0});
        if(!all.length) return '(无匹配文字 ' + ${kw} + ')';
        var e=all[0], chain=[];
        for(var i=0;i<6&&e;i++){chain.push(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):''));e=e.parentElement}
        var host=all[0]; for(var j=0;j<3&&host.parentElement;j++) host=host.parentElement;
        return '祖先链: '+chain.join(' < ')+'\\n\\n'+host.outerHTML;})()`;
    } else {
      expr = `(()=>{var e=document.querySelector(${JSON.stringify(sel)});return e?e.outerHTML:'(未找到 ' + ${JSON.stringify(sel)} + ')'})()`;
    }
    const html = await ev(expr);
    console.log('\n===== ' + sel + ' =====');
    console.log(String(html).slice(0, LEN));
  }
  ws.close(); kill();
  try { require('fs').rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
