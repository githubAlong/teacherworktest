/* wb_eval.js —— 通用运行时探针：注入 CSS / 执行 JS / 截图，全部 CDP 零依赖
   用法：
     WB_EVAL="getComputedStyle(document.querySelector('#x')).color" node wb_eval.js
     WB_CSS="#sideSub{display:none!important}" node wb_eval.js --shot out.png
     WB_URL=https://... 可指向线上；WB_SKIP_AUTH=1 跳过登录门；WB_CLEAN=1 去掉预览条/提示
     --w/--h/--dpr/--wait/--clip/--scale 同 capture.js */
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const W = +arg('w', 1712), H = +arg('h', 927), DPR = +arg('dpr', 1), WAIT = +arg('wait', 4200);
const SHOT = arg('shot', ''), CLIP = arg('clip', ''), SCALE = +arg('scale', 1);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9900 + Math.floor(Math.random() * 90);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-eval-' + Date.now());
  const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0, pending = new Map();
  const send = (m, p) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) return 'EXCEPTION: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400);
    return r.result && r.result.result && r.result.result.value;
  };
  let list = [];
  for (let t = 0; t < 90; t++) {
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: W < 700 });
  await send('Page.bringToFront');
  const url = process.env.WB_URL || ('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await send('Page.navigate', { url });
  await sleep(WAIT);
  await evalJs(`(()=>{document.body.classList.remove('wb-locked');['wbGate','wbGateCss'].forEach(function(i){var e=document.getElementById(i);if(e)e.remove();});
    ${process.env.WB_SKIP_AUTH ? "var a=document.getElementById('wbauth');if(a)a.remove();document.documentElement.style.overflow='';document.body.style.overflow='';" : ''}
    ${process.env.WB_CLEAN ? "['wbpvBar','syncBar','toast'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove();});document.body.classList.remove('v3-haspv');" : ''}
    return 1})()`);
  await sleep(300);
  if (process.env.WB_CSS) {
    await evalJs(`(()=>{var s=document.createElement('style');s.textContent=${JSON.stringify(process.env.WB_CSS)};document.head.appendChild(s);return 1})()`);
    await sleep(400);
  }
  if (process.env.WB_EVAL) console.log(String(await evalJs(process.env.WB_EVAL)));
  /* WB_NODEAT="x,y" —— 用 DOM.getNodeForLocation 定位该坐标的真实绘制节点，
     它会一并返回 pseudoElements，能抓到 ::before/::after 画的线（elementsFromPoint 抓不到）。 */
  if (process.env.WB_NODEAT) {
    const [nx, ny] = process.env.WB_NODEAT.split(',').map(Number);
    await send('DOM.enable');
    const r = await send('DOM.getNodeForLocation', { x: nx, y: ny, includeUserAgentShadowDOM: false });
    const info = r.result || {};
    if (info.nodeId || info.backendNodeId) {
      const d = await send('DOM.describeNode', info.nodeId
        ? { nodeId: info.nodeId, depth: 0, pierce: false }
        : { backendNodeId: info.backendNodeId, depth: 0, pierce: false });
      const n = (d.result && d.result.node) || {};
      const attrs = (n.attributes || []).join(' ');
      console.log('节点 <' + (n.nodeName || '').toLowerCase() + '> ' + attrs);
      console.log('伪元素: ' + JSON.stringify(info.pseudoElements || []));
      console.log('offset: ' + JSON.stringify(info.offset || null));
    } else {
      console.log('未命中节点: ' + JSON.stringify(r.result || r.error || {}));
    }
  }
  if (SHOT) {
    await send('Page.bringToFront');
    let shotArgs = { format: 'png' };
    if (CLIP) {
      const [cx, cy, cw, ch] = CLIP.split(',').map(Number);
      shotArgs = { format: 'png', captureBeyondViewport: true, clip: { x: cx, y: cy, width: cw, height: ch, scale: SCALE } };
    }
    const shot = await send('Page.captureScreenshot', shotArgs);
    if (shot.result && shot.result.data) { fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64')); console.log('OK ' + SHOT); }
    else console.error('截图失败 ' + JSON.stringify(shot).slice(0, 300));
  }
  ws.close(); proc.kill();
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
