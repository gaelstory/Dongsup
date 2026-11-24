const { start, shot, sleep, URL } = require('./common');
(async () => {
  const { browser, stop } = await start();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL); await sleep(1500);
  const idx = () => page.$eval('[data-stage-index]', e => e.textContent);
  const box = await (await page.$('[data-stage-link]')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 8 });
  const s = [];
  for (let i = 0; i < 7; i++) { s.push(await idx()); await sleep(2000); }
  console.log('hover samples', s, await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches));
  // focus pause
  await page.mouse.move(5, 5);
  await page.keyboard.press('Tab');
  for (let i = 0; i < 12; i++) { const d = await page.evaluate(() => document.activeElement.getAttribute('data-stage-link') !== null); if (d) break; await page.keyboard.press('Tab'); }
  const f = []; for (let i = 0; i < 4; i++) { f.push(await idx()); await sleep(2500); }
  console.log('focus samples', f);
  await shot(page, 'd-stage-focus');
  await stop();
})();
