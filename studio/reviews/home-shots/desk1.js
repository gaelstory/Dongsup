const { start, shot, sleep, URL } = require('./common');
(async () => {
  const { browser, stop } = await start();
  const out = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
    await page.goto(URL); await sleep(300);
    await shot(page, 'd-load-300ms');
    await sleep(1500);
    const idx = () => page.$eval('[data-stage-index]', e => e.textContent);
    out.idx0 = await idx();
    await page.mouse.move(5, 5);
    await sleep(4800); out.idxAfter4_8s = await idx();
    await sleep(4400); out.idxAfter9s = await idx();
    // mid-flip
    const t0 = Date.now(); 
    await page.click('[data-stage-next]'); await sleep(330); await shot(page, 'd-midflip'); await sleep(900);
    out.idxAfterNext = await idx();
    await page.click('[data-stage-prev]'); await sleep(1100); out.idxAfterPrev = await idx();
    out.caption = await page.$eval('[data-stage-caption]', e => e.textContent);
    out.href = await page.$eval('[data-stage-link]', e => e.getAttribute('href'));
    // rapid clicks
    for (let i = 0; i < 5; i++) { await page.click('[data-stage-next]'); await sleep(80); }
    await sleep(1400); out.idxAfter5Rapid = await idx(); out.urlAfterRapid = await page.$eval('[data-stage-url]', e => e.textContent);
    // hover tilt
    const box = await (await page.$('[data-stage-link]')).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 8 }); await sleep(500);
    await shot(page, 'd-hover-tilt');
    const a = await idx(); await sleep(5200); out.hoverPausesAutoplay = (a === await idx());
    await page.mouse.move(5, 300); await sleep(300);
    // pause toggle
    await page.click('[data-stage-toggle]'); const b = await idx(); await sleep(5000);
    out.pauseHolds = (b === await idx()); out.toggleLabel = await page.$eval('[data-stage-toggle]', e => e.getAttribute('aria-label'));
    await shot(page, 'd-paused');
    await page.click('[data-stage-toggle]');
    // scroll scale
    out.scaleTop = await page.$eval('[data-stage-unit]', e => getComputedStyle(e).transform);
    // portfolio
    await page.evaluate(() => document.querySelector('#work').scrollIntoView()); await sleep(900);
    for (const v of ['food', 'care', 'pro', 'brand', 'all']) {
      await page.click(`input[name="workFilter"][value="${v}"] + .seg__label`, { force: true }).catch(async () => { await page.check(`input[name="workFilter"][value="${v}"]`, { force: true }); });
      await sleep(1000);
      out['filter_' + v] = await page.$$eval('.card', cs => cs.filter(c => c.getClientRects().length).map(c => c.dataset.name));
      await shot(page, 'd-filter-' + v);
    }
    // keyboard arrows on filter
    await page.focus('input[name="workFilter"][value="all"]'); await page.keyboard.press('ArrowRight'); await sleep(900);
    out.arrowFilter = await page.$eval('input[name="workFilter"]:checked', e => e.value);
    await shot(page, 'd-filter-kbd');
    await page.keyboard.press('ArrowLeft'); await sleep(900);
    // card hover
    const card = await page.$('.card[data-slug="ongi-bakery"] .card__thumb'); await card.scrollIntoViewIfNeeded();
    const cb = await card.boundingBox(); await page.mouse.move(cb.x + 40, cb.y + 40); await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 6 }); await sleep(600);
    await shot(page, 'd-card-hover');
    // links exist
    out.links = await page.$$eval('.card__thumb', as => as.map(a => a.getAttribute('href')));
    const bad = []; for (const h of out.links) { const r = await page.request.get(URL.replace('index.html', h)); if (r.status() !== 200) bad.push(h); } out.badLinks = bad; out.links = out.links.length;
    const tl = await page.$$eval('.row-samples a', as => as.map(a => a.getAttribute('href'))); out.tableLinks = tl.length;
    // ask handoff
    await page.mouse.move(5, 5);
    await page.click('[data-ask="ongi-bakery"]'); await sleep(1400);
    out.ask = await page.evaluate(() => ({ checked: document.querySelector('input[name=likedWorks][data-slug=ongi-bakery]').checked, open: document.querySelector('[data-liked]').open, picked: document.querySelector('[data-picked]').textContent, count: document.querySelector('[data-liked-count]').textContent, active: document.activeElement.className, y: scrollY, pickedTop: document.querySelector('[data-picked]').getBoundingClientRect().top }));
    await shot(page, 'd-ask-handoff');
    // pricing
    await page.evaluate(() => document.querySelector('.pkg-table').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(600);
    const td = await (await page.$('td[data-col="ten"][data-label="수정 횟수"]')).boundingBox(); await page.mouse.move(td.x + 30, td.y + 10); await sleep(400);
    await shot(page, 'd-pricing-hover');
    await page.click('[data-pick-package="ten"]'); await sleep(1400);
    out.pickPkg = await page.evaluate(() => ({ v: document.querySelector('input[name=package]:checked').value, picked: document.querySelector('[data-picked]').textContent, hint: [...document.querySelectorAll('.opt__hint')].map(e => e.textContent) }));
    await shot(page, 'd-pick-package');
    // FAQ
    await page.evaluate(() => document.querySelector('#faq').scrollIntoView({ behavior: 'instant' })); await sleep(500);
    await page.click('.qa:nth-of-type(1) summary'); await page.click('.qa:nth-of-type(3) summary'); await sleep(500);
    out.faqOpen = await page.$$eval('.qa', q => q.map(d => d.open));
    await shot(page, 'd-faq-open');
    await page.focus('.qa:nth-of-type(2) summary'); await page.keyboard.press('Enter'); await sleep(400); await shot(page, 'd-faq-kbd-focus');
    await page.click('.qa:nth-of-type(1) summary'); await sleep(400); out.faqClose = await page.$eval('.qa', d => d.open);
    out.errs = errs;
  } catch (e) { out.FAIL = String(e.stack || e); }
  console.log(JSON.stringify(out, null, 1));
  await stop();
})();
