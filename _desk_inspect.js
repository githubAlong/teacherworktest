const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 150)));
  await page.goto('https://teacher-desk-95026.app.workbuddy.host/?sharecode=XZK4S73ECP', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);

  // 抓取 app.js 内容（浏览器内 fetch 可绕过 curl 403）
  const files = await page.evaluate(async () => {
    const out = {};
    try {
      const r = await fetch('app.js');
      out.appJs = await r.text();
      out.appStatus = r.status;
    } catch (e) { out.appErr = String(e); }
    try {
      const r2 = await fetch('styles.css');
      out.styles = await r2.text();
      out.cssStatus = r2.status;
    } catch (e) { out.cssErr = String(e); }
    return out;
  });

  console.log('app.js status:', files.appStatus, '| bytes:', (files.appJs || '').length);
  console.log('styles.css status:', files.cssStatus, '| bytes:', (files.styles || '').length);
  if (files.appJs) fs.writeFileSync('_desk_app.js', files.appJs);
  if (files.styles) fs.writeFileSync('_desk_styles.css', files.styles);

  // 页面状态
  const st = await page.evaluate(() => ({
    bodyClass: document.body.className,
    loginVisible: !document.getElementById('login-view')?.hidden,
    appVisible: !document.getElementById('app-view')?.hidden,
    sideNavItems: [...document.querySelectorAll('#side-nav *')].map(e => e.textContent).filter(Boolean).slice(0, 30),
    contentLen: document.getElementById('content')?.innerHTML.length,
    routes: location.hash
  }));
  console.log('页面状态:', JSON.stringify(st, null, 2));
  console.log('页面错误:', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
