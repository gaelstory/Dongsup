const { start, shot, sleep, URL } = require('./common');
(async () => {
  const { browser, stop } = await start();
  const out = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL); await sleep(1500);
    const seq = [];
    for (let i = 0; i < 48; i++) {
      await page.keyboard.press('Tab'); await sleep(60);
      const d = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
        let ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineWidth + ' ' + cs.outlineColor : '';
        if (!ring && a.tagName === 'INPUT') { const s = a.nextElementSibling; if (s) { const c2 = getComputedStyle(s); ring = (c2.outlineStyle !== 'none' ? 'sib ' + c2.outlineWidth + ' ' + c2.outlineColor : '') + (c2.boxShadow !== 'none' ? ' sibshadow' : ''); } const p = a.closest('.seg__item,.opt,.chip,.check'); if (!ring && p) { const c3 = getComputedStyle(p); ring = c3.outlineStyle !== 'none' ? 'parent ' + c3.outlineWidth : ''; } }
        return { t: a.tagName, txt: (a.getAttribute('aria-label') || a.textContent || a.name || '').trim().slice(0, 22), name: a.name || '', ring, inView: r.top >= 0 && r.bottom <= innerHeight, top: Math.round(r.top) }; });
      seq.push(d);
      if (i === 0) await shot(page, 'd-tab-skip');
      if (i === 2) await shot(page, 'd-tab-nav');
      if (i === 9) await shot(page, 'd-tab-10');
    }
    out.tab = seq.map(s => `${s.t}|${s.txt}|${s.name}|ring:${s.ring || 'NONE'}|inView:${s.inView}|top:${s.top}`);
    // focus shots for form controls
    await page.focus('input[name=replyBy][value="문자"]'); await page.keyboard.press('ArrowRight'); await sleep(300);
    await page.evaluate(() => document.activeElement.scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(200);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('ArrowDown'); await sleep(300);
    await shot(page, 'd-focus-form-controls');
    await page.focus('input[name=features]'); await page.evaluate(() => document.activeElement.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.keyboard.press('Space'); await page.keyboard.press('Tab'); await sleep(300); await shot(page, 'd-focus-chips');
    await page.focus('#f-consent'); await page.evaluate(() => document.activeElement.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.keyboard.press('Tab'); await sleep(300); await shot(page, 'd-focus-submit');

    // floating pill overlap sweep
    for (const w of [1440, 1280, 1100, 1024, 900, 768]) {
      await page.setViewportSize({ width: w, height: 900 }); await page.goto(URL); await sleep(900);
      const H = await page.evaluate(() => document.documentElement.scrollHeight);
      const hits = {};
      for (let y = 900; y < H - 900; y += 150) {
        await page.evaluate(yy => scrollTo({ top: yy, behavior: 'instant' }), y); await sleep(90);
        const h = await page.evaluate(() => {
          const f = document.querySelector('[data-float]'); if (!f.classList.contains('is-shown')) return null;
          const els = [...f.querySelectorAll('a')].filter(a => a.getClientRects().length && !a.hidden);
          const res = [];
          for (const a of els) { const r = a.getBoundingClientRect();
            const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
            let n; while ((n = walker.nextNode())) { if (!n.textContent.trim()) continue; const p = n.parentElement; if (!p.getClientRects().length) continue; const range = document.createRange(); range.selectNodeContents(n);
              for (const q of range.getClientRects()) { const ox = Math.min(r.right, q.right) - Math.max(r.left, q.left), oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); if (ox > 2 && oy > 2) { res.push((p.closest('section') || {}).id + ':' + p.className.split(' ')[0] + ':' + n.textContent.trim().slice(0, 14) + ' ox' + Math.round(ox)); break; } } }
            document.querySelectorAll('main a, main button, main input, main summary .qa__icon, main select').forEach(e => { if (!e.getClientRects().length) return; const q = e.getBoundingClientRect(); const ox = Math.min(r.right, q.right) - Math.max(r.left, q.left), oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); if (ox > 2 && oy > 2) res.push('CTRL ' + (e.closest('section') || {}).id + ':' + e.className.split(' ')[0] + ' ox' + Math.round(ox)); });
          }
          return res; });
        if (h) h.forEach(x => { hits[x] = (hits[x] || 0) + 1; });
      }
      out['overlap_' + w] = Object.keys(hits).slice(0, 40);
      out['floatRect_' + w] = await page.evaluate(() => { const a = document.querySelector('.float-cta__main').getBoundingClientRect(); const wr = document.querySelector('main .wrap').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('main .wrap')); return { left: Math.round(a.left), right: Math.round(a.right), contentRight: Math.round(wr.right - parseFloat(cs.paddingRight)) }; });
    }
    await page.setViewportSize({ width: 768, height: 1024 }); await page.goto(URL); await sleep(900);
    for (const [i, y] of [[0, 0], [1, 1400], [2, 5200]]) { await page.evaluate(yy => scrollTo({ top: yy, behavior: 'instant' }), y); await sleep(500); await shot(page, 't768-' + i); }
    await page.evaluate(() => document.querySelector('#pricing').scrollIntoView({ behavior: 'instant' })); await sleep(500); await shot(page, 't768-pricing');
    await page.evaluate(() => document.querySelector('#process').scrollIntoView({ behavior: 'instant' })); await sleep(500); await shot(page, 't768-process');
    await page.setViewportSize({ width: 1024, height: 768 }); await page.goto(URL); await sleep(900); await shot(page, 'd1024-hero');
    await page.evaluate(() => document.querySelector('.pkg-table').scrollIntoView({ behavior: 'instant' })); await sleep(500); await shot(page, 'd1024-pricing');
    out.overflow1024 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  } catch (e) { out.FAIL = String(e.stack || e); }
  console.log(JSON.stringify(out, null, 1));
  await stop();
})();
