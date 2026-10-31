const puppeteer = require('puppeteer-core');
const path = require('path');
(async () => {
  const w = parseInt(process.argv[2] || '1440', 10);
  const h = parseInt(process.argv[3] || '900', 10);
  const tag = process.argv[4] || 'p';
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 160)));
  await page.goto('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'), { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2200));
  await page.evaluate(() => {
    document.body.classList.remove('wb-locked');
    ['wbGate', 'wbGateCss'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
  });

  const shots = [
    ['work', '#sideNav .tab[data-view="工作"]'],
    ['assist', '#sideNav .tab[data-view="助手"]'],
    ['trash', '#sideNav .tab[data-view="trash"]'],
    ['me', '#sideNav .tab[data-view="me"]'],
  ];
  for (const [name, sel] of shots) {
    const ok = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return false;
      el.click();
      return true;
    }, sel);
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: `_${tag}_${name}.png` });
    console.log(name, ok ? 'ok' : 'NOT FOUND');
  }
  await browser.close();
})();
