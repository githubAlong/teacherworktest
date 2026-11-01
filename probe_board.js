/* probe_board.js —— 打印首页看板网格与槽位布局事实（CDP 零依赖）
   用法：node probe_board.js [width] [height]
        WB_URL=https://... node probe_board.js 1712 927   # 打线上 */
const { spawn } = require('child_process');
const os = require('os'), path = require('path');
const argv = process.argv.slice(2);
const W = +argv[0] || 1712, H = +argv[1] || 927;
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9800 + Math.floor(Math.random() * 90);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROBE = `(() => {
  const g = (el) => el ? getComputedStyle(el) : null;
  const b = document.getElementById('ovBoard');
  if (!b) return JSON.stringify({err: 'no #ovBoard'});
  const gb = g(b);
  const slots = [...b.children].map((s, i) => {
    const gs = g(s);
    const card = s.firstElementChild;
    return {
      i,
      ov: s.getAttribute('data-ov'),
      cls: s.className,
      inline: s.getAttribute('style') || '',
      col: gs.gridColumn, row: gs.gridRow,
      w: s.offsetWidth, h: s.offsetHeight,
      card: card ? card.className : null,
      cardRadius: card ? g(card).borderRadius : null,
      cardBg: card ? g(card).backgroundColor : null,
      cardShadow: card ? g(card).boxShadow : null
    };
  });
  return JSON.stringify({
    board: {
      display: gb.display,
      cols: gb.gridTemplateColumns,
      rows: gb.gridTemplateRows,
      gap: gb.gap,
      flow: gb.gridAutoFlow,
      w: b.offsetWidth, h: b.offsetHeight,
      inline: b.getAttribute('style') || '',
      attrs: [...b.attributes].map(a => a.name + '=' + a.value)
    },
    wrap: (() => { const w = document.querySelector('.wrap'); return w ? {w: w.offsetWidth, pad: g(w).padding} : null; })(),
    slots
  }, null, 1);
})()`;

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-brd-' + Date.now());
  const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0, pending = new Map();
  const send = (m, p) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result && r.result.result.value; };

  let list = [];
  for (let t = 0; t < 80; t++) {
    await sleep(150);
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/list'); list = await r.json(); if (list.length) break; } catch (e) { }
  }
  const page = list.find(x => x.type === 'page') || list[0];
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m); }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.bringToFront');
  const url = process.env.WB_URL || ('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await send('Page.navigate', { url });
  await sleep(4200);
  await evalJs(`(()=>{document.body.classList.remove('wb-locked');var k=document.getElementById('wbGate');if(k)k.remove();var c=document.getElementById('wbGateCss');if(c)c.remove();var a=document.getElementById('wbauth');if(a)a.remove();return 1})()`);
  await sleep(500);
  console.log(await evalJs(PROBE));
  ws.close(); proc.kill();
  try { require('fs').rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
