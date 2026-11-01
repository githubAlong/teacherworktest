/* capture.js —— 截图（CDP 直连，零依赖）+ 自动解锁登录门 + 可切视图
   用法：
     node capture.js --out a.png [--w 1712] [--h 927] [--full]
                     [--view overview|工作|daily|学习|助手|trash|me|代课记录]
                     [--tab 工作二级key] [--student] [--wait 2600] [--dpr 1]
   --student 会以 ?r=s 打开学生端；--tab 用于工作页内部二级（classlog/course/prep/...）*/
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const OUT = arg('out', 'cap.png'), W = +arg('w', 1712), H = +arg('h', 927), DPR = +arg('dpr', 1);
const VIEW = arg('view', ''), TAB = arg('tab', ''), FULL = argv.includes('--full');
const STUDENT = argv.includes('--student'), WAIT = +arg('wait', 2600);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9700 + Math.floor(Math.random() * 70);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-cap-' + Date.now());
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
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const evalJs = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : null;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: W < 700 });
  await send('Page.bringToFront');
  const url = process.env.WB_URL
    ? process.env.WB_URL + (STUDENT ? (process.env.WB_URL.includes('?') ? '&' : '?') + 'r=s' : '')
    : 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/') + (STUDENT ? '?r=s' : '');
  await send('Page.navigate', { url });
  await sleep(WAIT);

  // 解锁登录门
  await evalJs(`(()=>{document.body.classList.remove('wb-locked');var g=document.getElementById('wbGate');if(g)g.remove();var c=document.getElementById('wbGateCss');if(c)c.remove();
    if('${process.env.WB_SKIP_AUTH ? '1' : ''}'){var a=document.getElementById('wbauth');if(a)a.remove();document.documentElement.style.overflow='';document.body.style.overflow='';}
    return 1})()`);
  await sleep(400);

  // 切教师端视图
  if (VIEW && !STUDENT) {
    const ok = await evalJs(`(()=>{var t=document.querySelector('#tabs .tab[data-view="${VIEW}"]')
      ||document.querySelector('#mNav .tab[data-view="${VIEW}"]');
      if(!t) return 'no-tab'; t.click(); return 'clicked';})()`);
    await sleep(900);
    if (ok !== 'clicked') console.log('warn: 视图入口未找到 -> ' + VIEW);
  }
  // 切工作页二级
  if (TAB && !STUDENT) {
    const ok = await evalJs(`(()=>{var a=document.querySelector('[data-twct="${TAB}"]')
      ||document.querySelector('[data-work-sub="${TAB}"]')
      ||document.querySelector('#workNav [data-key="${TAB}"]');
      if(!a) return 'no-sub'; a.click(); return 'clicked';})()`);
    await sleep(900);
    if (ok !== 'clicked') console.log('warn: 二级入口未找到 -> ' + TAB);
  }
  // 学生端切 tab
  if (STUDENT && VIEW) {
    await evalJs(`(()=>{var b=document.querySelector('#stvTabs [data-st-tab="${VIEW}"]');if(b)b.click();return 1})()`);
    await sleep(700);
  }

  await send('Page.bringToFront');
  const m = await evalJs(`JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,view:(window.Z&&window.Z.view)||'',title:document.title})`);
  const CLIP = arg('clip', '');   // 形如 "0,0,240,927"
  let shotArgs;
  if (CLIP) {
    const [cx, cy, cw, ch] = CLIP.split(',').map(Number);
    shotArgs = { format: 'png', captureBeyondViewport: true, clip: { x: cx, y: cy, width: cw, height: ch, scale: +arg('scale', 1) } };
  } else if (FULL) {
    shotArgs = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: Math.min(16000, JSON.parse(m).h), scale: 1 } };
  } else {
    shotArgs = { format: 'png' };
  }
  const shot = await send('Page.captureScreenshot', shotArgs);
  if (shot.result && shot.result.data) { fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64')); console.log('OK ' + OUT + '  ' + m); }
  else console.error('截图失败 ' + JSON.stringify(shot).slice(0, 300));

  ws.close(); kill();
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
