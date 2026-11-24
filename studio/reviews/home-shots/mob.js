const { start, shot, sleep, URL } = require('./common');
(async () => {
  const { browser, stop } = await start();
  const out = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(URL); await sleep(1500);
    await shot(page, 'm-hero');
    const idx = () => page.$eval('[data-stage-index]', e => e.textContent);
    out.slats = await page.$$eval('.slat', s => s.length);
    out.stageRect = await page.$eval('[data-stage]', e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width)]; });
    out.ctaRect = await page.$eval('[data-hero-cta]', e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; });
    // swipe via CDP
    const cdp = await ctx.newCDPSession(page);
    const box = await (await page.$('[data-stage-link]')).boundingBox();
    const swipe = async (x1, x2, y1, y2) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 8, y: y1 + (y2 - y1) * i / 8 }] }); await sleep(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const cy = box.y + box.height / 2;
    const i0 = await idx();
    await swipe(box.x + box.width - 30, box.x + 40, cy, cy); await sleep(350); await shot(page, 'm-swipe-mid'); await sleep(900);
    out.swipeLeft = [i0, await idx()]; out.urlAfterSwipe = page.url();
    await swipe(box.x + 40, box.x + box.width - 30, cy, cy); await sleep(1200); out.swipeRight = await idx();
    // vertical swipe scrolls
    const y0 = await page.evaluate(() => scrollY); await swipe(200, 205, cy + 40, cy - 160); await sleep(500); out.vertScroll = [(await page.evaluate(() => scrollY)) - y0, await idx()];
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await sleep(300);
    // menu
    await page.tap('[data-menu-btn]'); await sleep(400); await shot(page, 'm-menu');
    out.menu = await page.evaluate(() => ({ exp: document.querySelector('[data-menu-btn]').getAttribute('aria-expanded'), linkH: [...document.querySelectorAll('.mobile-menu a')].map(a => Math.round(a.getBoundingClientRect().height)) }));
    await page.keyboard.press('Escape'); await sleep(300); out.menuEsc = await page.$eval('[data-menu-btn]', b => b.getAttribute('aria-expanded'));
    await page.tap('[data-menu-btn]'); await sleep(350); await page.tap('.mobile-menu a[href="#pricing"]'); await sleep(1500);
    out.menuLink = await page.evaluate(() => ({ exp: document.querySelector('[data-menu-btn]').getAttribute('aria-expanded'), top: Math.round(document.querySelector('#pricing').getBoundingClientRect().top) }));
    await shot(page, 'm-pricing-top');
    // pricing tabs
    for (const v of ['first', 'five', 'ten', 'custom']) {
      await page.evaluate(v => { const i = document.querySelector('input[name=pkgTab][value=' + v + ']'); i.scrollIntoView({block:'center',behavior:'instant'}); }, v); await sleep(200); await page.tap(`input[name=pkgTab][value=${v}]`, {force:true}); await sleep(450);
      await page.evaluate(() => document.querySelector('.pkg-tabs').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -80)); await sleep(250);
      await shot(page, 'm-pricing-' + v);
    }
    out.tableOverflow = await page.$eval('.pkg-wrap', e => e.scrollWidth - e.clientWidth);
    await page.evaluate(() => document.querySelector('.pricing__more').scrollIntoView({ behavior: 'instant' })); await sleep(300); await shot(page, 'm-pricing-opts');
    await page.evaluate(() => document.querySelector('.care-table').scrollIntoView({ behavior: 'instant', block: 'center' })); await sleep(300); await shot(page, 'm-pricing-care');
    // more button
    await page.evaluate(() => document.querySelector('[data-more-btn]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300);
    out.cardsBefore = await page.$$eval('.card', cs => cs.filter(c => c.getClientRects().length).length);
    await shot(page, 'm-more-btn');
    await page.tap('[data-more-btn]'); await sleep(700); out.cardsAfter = await page.$$eval('.card', cs => cs.filter(c => c.getClientRects().length).length);
    await shot(page, 'm-more-after');
    // filter on mobile
    await page.evaluate(() => document.querySelector('[data-filter]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300);
    out.filterScroll = await page.$eval('[data-filter] .seg__scroller', e => [e.scrollWidth, e.clientWidth]);
    await page.tap('input[name=workFilter][value=care]', {force:true}); await sleep(900); await shot(page, 'm-filter-care');
    // tap targets
    out.small = await page.evaluate(() => { const res = []; document.querySelectorAll('a, button, summary, label.seg__item, label.opt, label.chip, label.check, select, input:not([type=radio]):not([type=checkbox])').forEach(e => { if (!e.getClientRects().length) return; if (e.closest('.hp')) return; const r = e.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) res.push((e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }); return [...new Set(res)]; });
    // float bar sweep through whole page
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const hits = {}; const states = [];
    await page.evaluate(() => document.querySelector('input[name=workFilter][value=all]').click()); await sleep(900);
    const H2 = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H2; y += 120) {
      await page.evaluate(yy => scrollTo({ top: yy, behavior: 'instant' }), y); await sleep(110);
      const h = await page.evaluate(() => { const f = document.querySelector('[data-float]'); const shown = f.classList.contains('is-shown'); const r = f.getBoundingClientRect(); const res = [];
        const req = document.querySelector('#request').getBoundingClientRect();
        if (shown) document.querySelectorAll('#request input, #request select, #request textarea, #request button, #request label, #request summary, #request a, footer a, footer button').forEach(e => { if (!e.getClientRects().length || e.closest('.hp')) return; const q = e.getBoundingClientRect(); const oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); if (oy > 2 && q.width > 0) res.push((e.name || e.textContent || '').trim().slice(0, 14) + ' oy' + Math.round(oy)); });
        return { shown, res, reqTop: Math.round(req.top), reqBottom: Math.round(req.bottom) }; });
      states.push([y, h.shown, h.reqTop, h.reqBottom]); h.res.forEach(x => hits[x] = (hits[x] || 0) + 1);
    }
    out.floatHits = hits;
    out.floatTransitions = states.filter((s, i) => i === 0 || s[1] !== states[i - 1][1]);
    // screenshot at request entry and exit
    const reqY = await page.evaluate(() => Math.round(document.querySelector('#request').getBoundingClientRect().top + scrollY));
    for (const d of [-600, -350, -100, 200]) { await page.evaluate(yy => scrollTo({ top: yy, behavior: 'instant' }), reqY + d); await sleep(450); await shot(page, 'm-req-entry' + d); }
    const subY = await page.evaluate(() => Math.round(document.querySelector('[data-submit]').getBoundingClientRect().top + scrollY));
    for (const d of [-700, -400, -150, 150]) { await page.evaluate(yy => scrollTo({ top: yy, behavior: 'instant' }), subY + d); await sleep(450); await shot(page, 'm-req-exit' + d); }
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await sleep(500); await shot(page, 'm-footer-end');
    // focus hides bar
    out.errs = errs;
  } catch (e) { out.FAIL = String(e.stack || e); }
  console.log(JSON.stringify(out, null, 1));
  await stop();
})();
