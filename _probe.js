const puppeteer = require('puppeteer-core');
const path = require('path');
(async () => {
  const w = parseInt(process.argv[2] || '1440', 10);
  const h = parseInt(process.argv[3] || '900', 10);
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  const url = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  const data = await page.evaluate(() => {
    const pick = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { sel, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
               display: cs.display, pos: cs.position, bg: cs.backgroundColor, z: cs.zIndex };
    };
    const sels = ['header.hero', '#sideNav', '.tw-topbar', '.wrap', '#view-overview', '.ov-board',
                  '.ov-slot[data-ov="pf"]', '.ov-slot[data-ov="time"]', '.ov-slot[data-ov="course"]',
                  '.side-top', '.hp-search', '#brandName', '.ov-pf', '.ov-time'];
    const root = getComputedStyle(document.documentElement);
    return {
      boxes: sels.map(pick).filter(Boolean),
      brand: root.getPropertyValue('--brand').trim(),
      bgv: root.getPropertyValue('--bg').trim(),
      theme: document.documentElement.getAttribute('data-theme'),
    };
  });
  console.log(JSON.stringify(data, null, 1));
  await browser.close();
})();
