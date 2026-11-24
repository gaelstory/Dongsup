const { start, shot, sleep, URL } = require('./common');
const svg = (slug, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900"><rect width="1440" height="900" fill="hsl(${i * 47 % 360} 40% ${i % 3 === 0 ? 96 : 60}%)"/>${Array.from({ length: 10 }, (_, k) => `<rect x="0" y="${k * 90}" width="1440" height="2" fill="#000" opacity=".25"/><text x="40" y="${k * 90 + 60}" font-size="48" font-family="sans-serif">${slug} row ${k}</text>`).join('')}<circle cx="720" cy="450" r="300" fill="none" stroke="#000" stroke-width="6"/></svg>`;
(async () => {
  const { browser, stop } = await start();
  const out = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL); await sleep(1200);
    out.heights = await page.evaluate(() => { const o = {}; ['top', 'work', 'why', 'process', 'pricing', 'faq', 'request'].forEach(id => o[id] = Math.round(document.getElementById(id).getBoundingClientRect().height)); o.form = Math.round(document.querySelector('[data-form]').getBoundingClientRect().height); o.total = document.documentElement.scrollHeight; return o; });
    // ask handoff mobile
    await page.evaluate(() => document.querySelector('[data-ask="padosori-fest"]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300);
    await page.tap('[data-ask="padosori-fest"]'); await sleep(1600); await shot(page, 'm-ask-handoff');
    // focus input: bar hidden?
    await page.tap('#f-name'); await sleep(400);
    out.barOnFocus = await page.$eval('[data-float]', f => f.classList.contains('is-shown'));
    await page.fill('#f-name', '달무리'); await page.fill('#f-phone', '01098765432');
    await page.selectOption('#f-industry', '카페·음식점');
    await page.evaluate(() => document.querySelector('[data-liked]').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -90)); await sleep(300); await shot(page, 'm-liked-open');
    await page.evaluate(() => document.querySelector('[data-field=features]').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -90)); await sleep(300); await shot(page, 'm-features');
    await page.evaluate(() => document.querySelector('.consent').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -90)); await sleep(300); await shot(page, 'm-consent');
    await page.tap('[data-submit]'); await sleep(1200); await shot(page, 'm-consent-error');
    out.consentErr = await page.evaluate(() => ({ active: document.activeElement.id, sum: document.querySelector('[data-summary]').innerText }));
    await page.evaluate(() => document.querySelector('#f-consent').click());
    await page.evaluate(() => document.querySelector('[data-submit]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(200);
    await page.tap('[data-submit]'); await sleep(1500); await shot(page, 'm-result-B');
    out.resB = await page.evaluate(() => { const pre = document.querySelector('.result__text'); return { preOverflow: pre.scrollWidth - pre.clientWidth, barShown: document.querySelector('[data-float]').classList.contains('is-shown'), h: Math.round(document.querySelector('[data-result]').getBoundingClientRect().height) }; });
    await page.evaluate(() => document.querySelector('.result__actions').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -200)); await sleep(300); await shot(page, 'm-result-B-actions');
    // 320 / 360 overflow
    for (const w of [320, 360]) { await page.setViewportSize({ width: w, height: 700 }); await page.goto(URL); await sleep(900); out['overflow' + w] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); await shot(page, 'm' + w + '-hero');
      await page.evaluate(() => document.querySelector('[data-field=replyBy]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300); await shot(page, 'm' + w + '-reply'); 
      await page.evaluate(() => document.querySelector('.pkg-tabs').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -80)); await sleep(300); await shot(page, 'm' + w + '-pricing'); }
    await ctx.close();
    // real thumbs simulation
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage(); let n = 0;
    await p2.route('**/assets/thumbs/*.jpg', r => { const slug = r.request().url().split('/').pop().replace('.jpg', ''); r.fulfill({ contentType: 'image/svg+xml', body: svg(slug, n++) }); });
    await p2.goto(URL); await sleep(1800); await shot(p2, 'thumb-hero');
    const box = await (await p2.$('[data-stage-link]')).boundingBox(); await p2.mouse.move(box.x + 600, box.y + 150, { steps: 5 }); await sleep(500); await shot(p2, 'thumb-hero-hover');
    await p2.click('[data-stage-next]'); await sleep(380); await shot(p2, 'thumb-midflip'); await sleep(900); await shot(p2, 'thumb-after');
    await p2.evaluate(() => document.querySelector('#work-grid').scrollIntoView({ behavior: 'instant' })); await sleep(700); await shot(p2, 'thumb-grid');
    out.thumbState = await p2.evaluate(() => ({ posterHasImg: document.querySelectorAll('.face .poster.has-img').length, imgsHidden: [...document.querySelectorAll('.card .thumb__img')].filter(i => i.hidden).length }));
    await ctx2.close();
    // reduced motion
    const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const p3 = await ctx3.newPage(); await p3.goto(URL); await sleep(1200);
    out.rm = await p3.evaluate(() => ({ slats: document.querySelectorAll('.slat').length, toggleHidden: document.querySelector('[data-stage-toggle]').hidden, scale: getComputedStyle(document.querySelector('[data-stage-unit]')).transform }));
    const a = await p3.$eval('[data-stage-index]', e => e.textContent); await sleep(5000); out.rmAuto = [a, await p3.$eval('[data-stage-index]', e => e.textContent)];
    await p3.click('[data-stage-next]'); await sleep(400); out.rmNext = await p3.$eval('[data-stage-index]', e => e.textContent); await shot(p3, 'rm-next');
    await ctx3.close();
    // no JS
    const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const p4 = await ctx4.newPage(); await p4.goto(URL); await sleep(800); await shot(p4, 'nojs-m-hero');
    out.nojs = await p4.evaluate(() => 0).catch(() => 'no eval');
    await p4.screenshot({ path: __dirname + '/shots/nojs-full.jpg', type: 'jpeg', quality: 40, fullPage: true });
    await ctx4.close();
  } catch (e) { out.FAIL = String(e.stack || e); }
  console.log(JSON.stringify(out, null, 1));
  await stop();
})();
