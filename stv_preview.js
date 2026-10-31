/* stv_preview.js —— 学生端样式预览（CDP，零依赖）
   学生端数据来自云端 wb_as_share，离线时 #stView 停在「正在读取…」。
   这里用真实类名构造样例内容填进 #stvInner，逐个 tab 截图，用来验证样式覆盖层。
   用法：node stv_preview.js [--tab home|board|course|box|rollcall|homework|discipline|message] [--w 390] [--h 900] [--out x.png] [--full] */
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const TAB = arg('tab', 'home'), W = +arg('w', 390), H = +arg('h', 900), OUT = arg('out', 'stv.png');
const FULL = argv.includes('--full');
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9560 + Math.floor(Math.random() * 40);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FIXTURE = {
  home: `
<div class="stv2-hero">
  <span class="stv2-tag">今日小黑板</span>
  <div class="stv2-ttl">明天月考，请带齐文具和计算器</div>
  <div class="stv2-sub">高一(3)班 · 数学组</div>
  <div class="stv2-by">王老师 07:30</div>
</div>
<div class="stv2-row3">
  <div class="stv2-card">
    <div class="stv2-ch">今日作业</div>
    <div class="stv2-cs">共 2 项</div>
    <div class="stv2-hwitem"><div class="stv2-hwicon">📘</div>
      <div class="stv2-hwmain"><i>数学</i>课本 P42 第 1-8 题</div>
      <div class="stv2-hwdue">今天<i>18:00</i></div></div>
    <div class="stv2-hwitem"><div class="stv2-hwicon">📗</div>
      <div class="stv2-hwmain"><i>英语</i>背诵 Unit 5 单词</div>
      <div class="stv2-hwdue cool">明天<i>08:00</i></div></div>
  </div>
  <div class="stv2-card stv2-purple">
    <div class="stv2-ch">惊喜盲盒</div>
    <div class="stv2-cs">今天还有 1 次机会</div>
    <div class="stv2-big">点一下，看看今天抽到什么</div>
    <button class="stv2-pbtn">开启盲盒</button>
    <div class="stv2-pnote">每天限 1 次，抽到即为今天的小惊喜</div>
    <div class="stv2-deco">🎁</div>
  </div>
  <div class="stv2-card">
    <div class="stv2-ch">随机点名</div>
    <div class="stv2-cs">全班 43 人</div>
    <div class="stv2-num">07</div>
    <div class="stv2-numl">今天已被点到的次数</div>
    <button class="stv2-rbtn">抽一位同学</button>
  </div>
</div>
<div class="stv2-card">
  <div class="stv2-course-head"><div><div class="stv2-ch">课件资料</div><div class="stv2-cs">共 5 份</div></div>
    <span class="stv2-toggle">收起</span></div>
  <div class="stv2-chips">
    <button class="stv2-chip on">全部</button><button class="stv2-chip">第一章</button>
    <button class="stv2-chip">第二章</button><button class="stv2-chip">习题课</button>
  </div>
  <div class="stv2-files">
    <div class="stv2-file"><span class="stv2-fn">函数与导数.pdf</span><span class="stv2-ft">1.2M</span>
      <button class="stv2-mini">预览</button></div>
    <div class="stv2-file"><span class="stv2-fn">期中复习提纲.docx</span><span class="stv2-ft">320K</span>
      <span class="stv2-nofile">暂不可预览</span></div>
  </div>
</div>
<div class="stv2-row2">
  <div class="stv2-card"><div class="stv2-ch">违纪记录</div><div class="stv2-cs">近 7 天</div>
    <div class="stv2-recs">
      <div class="stv2-rec"><div class="stv2-rt">上课讲话 · 已整改</div><div class="stv2-rd">11-01</div></div>
      <div class="stv2-rec"><div class="stv2-rt">作业未交 <span class="stv2-ntag">已补交</span></div><div class="stv2-rd">10-30</div></div>
    </div>
  </div>
  <div class="stv2-card"><div class="stv2-ch">留言板</div><div class="stv2-cs">3 条</div>
    <div class="stv2-recs">
      <div class="stv2-rec"><div class="stv2-rt">老师，第五章第 3 题不太懂</div><div class="stv2-rd">10:24</div></div>
      <div class="stv2-rec"><div class="stv2-rt">好的，明天课上再讲一遍</div><div class="stv2-rd">10:30</div></div>
    </div>
  </div>
</div>`,
  board: `
<div class="stv-card"><div class="stv-ct"><h2>小黑板</h2><span class="stv-cnt">今天 08:12 更新</span></div>
  <p class="stv-hint">老师发布的通知，只读查看</p>
  <div class="stv-pane">明天月考，请带齐文具和科学计算器。
考试时间 8:00-10:00，提前 15 分钟到考场。
考完把答题卡交到讲台。</div>
</div>`,
  course: `
<div class="stv-card"><div class="stv-ct"><h2>课件资料</h2><span class="stv-cnt">共 5 份</span></div>
  <p class="stv-hint">按分类查看，点击可预览或下载</p>
  <div class="stv-warn">部分文件需要登录后才能下载</div>
  <div class="stv-grp">
    <button class="stv-grp-h"><span class="stv-gtag">第一章</span><span class="stv-gn">3 份</span><span class="stv-gi">收起</span></button>
    <div class="stv-mat"><div class="mn">函数与导数.pdf<i>1.2 MB · 昨天</i></div>
      <span class="stv-sub">PDF</span><button class="stv-mini">预览</button></div>
    <div class="stv-mat"><div class="mn">期中复习提纲.docx<i>320 KB · 前天</i></div>
      <span class="stv-sub">DOCX</span><span class="stv-nomat">暂不可预览</span></div>
  </div>
  <div class="stv-grp">
    <button class="stv-grp-h"><span class="stv-gtag">习题课</span><span class="stv-gn">2 份</span><span class="stv-gi">展开</span></button>
  </div>
</div>`,
  box: `
<div class="stv-card">
  <div class="stv-ct"><h2>惊喜盲盒</h2><span class="stv-cnt">今天还有 1 次</span></div>
  <div class="stv-draw"><div class="stv-hero md">点一下试试</div></div>
  <p class="stv-tip">每天限 1 次，抽到什么算什么</p>
  <div class="stv-row ctr"><button class="stv-btn">开启盲盒</button></div>
  <div class="stv-row ctr" style="margin-top:10px"><button class="stv-btn2">重置（需老师确认）</button></div>
</div>
<div class="stv-card"><div class="stv-ct"><h2>今天抽到的</h2></div>
  <div class="stv-list">
    <div class="stv-li"><span class="t">「免写一次作业」</span><span class="d">08:31</span></div>
    <div class="stv-li"><span class="t">「加分 +2」</span><span class="d">昨天</span></div>
  </div>
</div>`,
  rollcall: `
<div class="stv-card">
  <div class="stv-ct"><h2>随机点名</h2><span class="stv-cnt">全班 43 人</span></div>
  <div class="stv-draw"><div class="stv-hero">07</div></div>
  <p class="stv-tip">点下面的按钮，随机抽一位同学</p>
  <div class="stv-row ctr"><button class="stv-btn">抽一位</button></div>
  <div class="stv-row ctr" style="margin-top:12px">
    <span class="stv-seg"><button class="on">不重复</button><button>可重复</button></span>
  </div>
  <div class="stv-row ctr" style="margin-top:12px">
    <span class="stv-fld">本轮已抽 <input class="stv-inp" value="7"></span>
  </div>
</div>
<div class="stv-card"><div class="stv-ct"><h2>历史记录</h2></div>
  <div class="stv-list">
    <div class="stv-li"><span class="t">张浩宇</span><span class="d">08:32</span></div>
    <div class="stv-li"><span class="t">刘思琪</span><span class="d">08:30</span></div>
  </div>
</div>`,
  homework: `
<div class="stv-card"><div class="stv-ct"><h2>作业</h2><span class="stv-cnt">共 2 条</span></div>
  <p class="stv-hint">按截止时间从早到晚排列，只读查看，不提供提交入口。</p>
  <div class="stv-tbw"><table class="stv-tb"><thead><tr>
    <th class="c-ti">科目</th><th class="c-ct">内容</th><th class="c-du">截止时间</th>
  </tr></thead><tbody>
    <tr><td class="c-ti"><span class="stv-sub">数学</span></td>
      <td class="c-ct">课本 P42 第 1-8 题</td>
      <td class="c-du"><span class="stv-due hot">今天 18:00</span></td></tr>
    <tr><td class="c-ti"><span class="stv-sub">英语</span></td>
      <td class="c-ct">背诵 Unit 5 单词</td>
      <td class="c-du"><span class="stv-due long">长期有效</span></td></tr>
  </tbody></table></div>
</div>`,
  discipline: `
<div class="stv-card"><div class="stv-ct"><h2>违纪记录</h2><span class="stv-cnt">共 2 条</span></div>
  <p class="stv-hint">老师登记的记录，如有疑问请当面沟通</p>
  <div class="stv-list">
    <div class="stv-li"><span class="t">上课讲话 · 已整改</span><span class="d">11-01</span></div>
    <div class="stv-li"><span class="t">作业未交</span><span class="d">10-30</span></div>
  </div>
</div>
<div class="stv-card"><div class="stv-ct"><h2>我要说明</h2></div>
  <p class="stv-hint">有情况需要说明，可以写在这里给老师看</p>
  <div class="stv2-fldrow">
    <label class="stv2-fl"><i>班级</i><input class="stv2-inp2" value="高一(3)班"></label>
    <label class="stv2-fl"><i>姓名</i><input class="stv2-inp2" placeholder="你的名字"></label>
  </div>
  <textarea class="stv2-ta2" placeholder="写清楚当时的情况…"></textarea>
  <div class="stv-row" style="margin-top:12px"><button class="stv-btn">提交说明</button></div>
</div>`,
  message: `
<div class="stv-card"><div class="stv-ct"><h2>留言板</h2><span class="stv-cnt">共 3 条</span></div>
  <p class="stv-hint">给老师留一句话，老师能看到并回复</p>
  <div class="stv2-fldrow">
    <label class="stv2-fl"><i>称呼</i><input class="stv2-inp2" placeholder="可以不填"></label>
  </div>
  <textarea class="stv2-ta2" placeholder="想说的话…"></textarea>
  <div class="stv-row" style="margin-top:12px"><button class="stv-btn">发送留言</button></div>
</div>
<div class="stv-card"><div class="stv-ct"><h2>大家的留言</h2></div>
  <div class="stv-list">
    <div class="stv-li"><span class="t">老师，第五章第 3 题不太懂</span><span class="d">10:24</span></div>
    <div class="stv-li"><span class="t">好的，明天课上再讲一遍</span><span class="d">10:30</span></div>
  </div>
</div>`
};

(async () => {
  const ud = path.join(os.tmpdir(), 'cdp-stv-' + Date.now());
  const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  await send('Page.bringToFront');
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/') + '?r=s' });
  await sleep(3000);
  await send('Page.bringToFront');

  // 有 #stView 就注入样例；没有说明角色分流没走到学生端
  const ok = await ev(`(()=>{var box=document.getElementById('stvInner');if(!box)return 'no-stv';
    box.innerHTML=${JSON.stringify(FIXTURE[TAB] || '')};
    return 'ok'})()`);
  if (ok !== 'ok') { console.error('学生端未挂载: ' + ok); ws.close(); kill(); process.exit(1); }
  await sleep(700);

  const m = await ev(`JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})`);
  const shotArgs = FULL
    ? { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: Math.min(12000, JSON.parse(m).h), scale: 1 } }
    : { format: 'png' };
  const shot = await send('Page.captureScreenshot', shotArgs);
  if (shot.result && shot.result.data) { fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64')); console.log('OK ' + OUT + '  ' + m); }
  else console.error('截图失败');
  ws.close(); kill();
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch (e) { }
})().catch(e => { console.error(e); process.exit(1); });
