/* test_hero.js —— 验证首页快捷胶囊的行为（CDP，零依赖）
   1) 胶囊是否存在
   2) 点击「今日课表」是否切到工作页并进入课表二级
   3) 切回首页后胶囊是否被 MutationObserver 补回
   4) 看板槽位是否仍为 6（没被注入破坏拖拽结构） */
const { spawn } = require('child_process');
const os = require('os'), path = require('path');
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9610 + Math.floor(Math.random() * 30);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-th-' + Date.now());
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
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails.text || '').slice(0, 120));
  };
  const send = (mm, p) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: mm, params: p || {} })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : null;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1712, height: 927, deviceScaleFactor: 1, mobile: false });
  await send('Page.bringToFront');
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/') });
  await sleep(3200);
  await ev(`(()=>{document.body.classList.remove('wb-locked');var g=document.getElementById('wbGate');if(g)g.remove();var c=document.getElementById('wbGateCss');if(c)c.remove();return 1})()`);
  await sleep(600);

  const r1 = await ev(`JSON.stringify({
    pills: Array.from(document.querySelectorAll('.v3-pill')).map(function(b){return b.textContent}),
    slots: document.querySelectorAll('#ovBoard .ov-slot').length,
    heroActs: document.querySelectorAll('.v3-heroacts').length
  })`);
  console.log('① 初始状态: ' + r1);

  // 点第一个胶囊（今日课表）
  await ev(`(()=>{var p=document.querySelector('.v3-pill');if(p)p.click();return 1})()`);
  await sleep(900);
  const r2 = await ev(`JSON.stringify({
    workOn: !!document.querySelector('#view-work.on'),
    overviewOn: !!document.querySelector('#view-overview.on'),
    workTabOn: !!document.querySelector('#tabs .tab[data-view="\\u5de5\\u4f5c"].on')
  })`);
  console.log('② 点「今日课表」后: ' + r2);

  // 切回首页
  await ev(`(()=>{var t=document.querySelector('#tabs .tab[data-view="overview"]');if(t)t.click();return 1})()`);
  await sleep(1100);
  const r3 = await ev(`JSON.stringify({
    overviewOn: !!document.querySelector('#view-overview.on'),
    pillsBack: document.querySelectorAll('.v3-pill').length,
    slots: document.querySelectorAll('#ovBoard .ov-slot').length,
    heroActs: document.querySelectorAll('.v3-heroacts').length
  })`);
  console.log('③ 切回首页后: ' + r3);
  console.log('④ 运行时异常: ' + (errs.length ? errs.join(' | ') : '无'));

  ws.close(); kill();
  try { require('fs').rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
