// 截图工具：node _shot.js <out.png> [width] [height] [url]
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const out = process.argv[2] || '_shot.png';
  const w = parseInt(process.argv[3] || '1440', 10);
  const h = parseInt(process.argv[4] || '900', 10);
  const url = process.argv[5] || 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(e => console.log('[goto]', e.message));
  await new Promise(r => setTimeout(r, 2500));

  // 截图前解锁被登录门挡住的界面（仅用于本地视觉检查）
  await page.evaluate(() => {
    document.body.classList.remove('wb-locked');
    const g = document.getElementById('wbGate');
    if (g) g.remove();
    const css = document.getElementById('wbGateCss');
    if (css) css.remove();
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: out, fullPage: false });
  const info = await page.evaluate(() => ({
    view: (window.Z && window.Z.view) || 'n/a',
    title: document.title,
    bodyH: document.body.scrollHeight,
  })).catch(() => ({}));
  console.log('saved', out, JSON.stringify(info));
  await browser.close();
})();
