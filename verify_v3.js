/* ui-v3 验证探针（CDP 直连，零依赖）
   用法：node verify_v3.js [width] [height] [query]
   判据见计划书第五节。 */
const { spawn } = require('child_process');
const os = require('os'), path = require('path');
const argv = process.argv.slice(2);
const W = +argv[0] || 1712, H = +argv[1] || 927, QS = argv[2] || '', WAIT = +argv[3] || 2600;
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9600 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROBE = `(() => {
  const root = getComputedStyle(document.documentElement);
  const v = n => (root.getPropertyValue(n) || '').trim();
  const pick = (sel, ps) => { const el = document.querySelector(sel); if (!el) return null;
    const cs = getComputedStyle(el), o = { sel }; for (const p of ps) o[p] = cs[p]; return o; };

  const s3 = document.getElementById('ui-v3');
  let rules = -1, last = '-';
  try { rules = s3.sheet.cssRules.length; last = String(s3.sheet.cssRules[rules-1].cssText).slice(0,50); }
  catch (e) { last = 'ERR ' + e.message; }

  // 主题压制测试：切到国企主题后主色必须仍是蓝（否则说明 0-1-0 被 0-1-1 打败）
  const before = v('--brand');
  document.documentElement.setAttribute('data-theme','gov');
  const afterBrand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
  const afterBg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.documentElement.removeAttribute('data-theme');

  return JSON.stringify({
    tokens: { '--bg': v('--bg'), '--card': v('--card'), '--brand': v('--brand'),
              '--ink': v('--ink'), '--line': v('--line'), '--sh': v('--sh') || '(空)',
              '--r-card': v('--r-card'), '--r': v('--r'), '--r-lg': v('--r-lg'),
              '--sh-4': v('--sh-4').slice(0,28) || '(空)' },
    themeLock: { before, afterBrand, afterBg, ok: before === afterBrand },
    sheet: { styleCount: document.querySelectorAll('style').length, uiV3Rules: rules, last },
    boxes: [
      pick('body', ['backgroundColor','color','fontSize']),
      pick('#sideNav', ['backgroundColor','height','position','borderRightColor','backgroundImage']),
      pick('#tabs', ['backgroundColor']),
      pick('.tabs-in', ['backgroundColor']),
      pick('#wbpvBar', ['backgroundColor','height']),
      pick('.hp-card', ['borderRadius','boxShadow','backgroundColor']),
      pick('.panel', ['borderRadius','boxShadow','backgroundColor']),
      pick('.stat', ['borderRadius','boxShadow']),
      pick('.ov-av', ['borderRadius','width','height']),
      pick('table.tb th', ['backgroundColor','color','fontWeight']),
      pick('.mnav', ['display'])
    ].filter(Boolean),
    overflow: { docW: document.documentElement.scrollWidth, winW: window.innerWidth,
                ok: document.documentElement.scrollWidth <= window.innerWidth + 1 },
    view: (window.Z && window.Z.view) || 'n/a'
  });
})()`;

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-v3-' + Date.now());
  const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
  const kill = () => { try { proc.kill('SIGKILL'); } catch (e) { } };
  let list = null;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/list'); list = await r.json(); if (list.length) break; } catch (e) { }
    await sleep(250);
  }
  if (!list || !list.length) { kill(); console.error('chrome 起不来'); process.exit(2); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails.text || '').slice(0, 140));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      errs.push('[console] ' + m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 140));
  };
  const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.bringToFront');
  const url = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/') + (QS ? '?' + QS : '');
  await send('Page.navigate', { url });
  await sleep(WAIT);

  // 解锁登录门（仅本地视觉检查）
  await send('Runtime.evaluate', { expression: `(()=>{document.body.classList.remove('wb-locked');var g=document.getElementById('wbGate');if(g)g.remove();var c=document.getElementById('wbGateCss');if(c)c.remove();})()` });
  await sleep(500);
  await send('Page.bringToFront');

  const r = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const val = r.result && r.result.result && r.result.result.value;
  if (!val) { console.error('探针执行失败: ' + JSON.stringify(r).slice(0, 400)); ws.close(); kill(); process.exit(1); }
  const o = JSON.parse(val);

  /* 打印：D12 的打印令牌用裸 :root（0-1-0），早被 ui-v2 的 0-1-1 压死，
     历史表现是打印打出浅蓝底。ui-v3 在末尾补了 @media print 兜底，这里验证。 */
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  await sleep(280);
  const printBg = await send('Runtime.evaluate', {
    expression: `getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()`,
    returnByValue: true
  });
  await send('Emulation.setEmulatedMedia', { media: '' });
  o.print = { bg: (printBg.result && printBg.result.result ? printBg.result.result.value : '?'), shouldBe: '#FFFFFF' };
  o.errors = errs.slice(0, 6); o.errCount = errs.length;
  o.viewport = W + 'x' + H;
  console.log(JSON.stringify(o, null, 1));
  ws.close(); kill();
  try { require('fs').rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
