const { start, shot, sleep, URL } = require('./common');
(async () => {
  const { browser, stop } = await start();
  const out = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await ctx.newPage();
    await page.goto(URL); await sleep(1200);
    await page.evaluate(() => document.querySelector('[data-submit]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(500);
    await page.click('[data-submit]'); await sleep(1200);
    out.empty = await page.evaluate(() => ({ summary: document.querySelector('[data-summary]').innerText, errors: [...document.querySelectorAll('.field__error:not([hidden])')].map(e => e.textContent), active: document.activeElement.id, invalid: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.id), describedby: document.querySelector('#f-name').getAttribute('aria-describedby') }));
    await shot(page, 'd-form-empty-errors');
    await page.evaluate(() => document.querySelector('[data-summary]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300); await shot(page, 'd-form-summary');
    // phone
    await page.fill('#f-name', '김'); await page.locator('#f-name').blur(); await sleep(100);
    out.nameShort = await page.$eval('#f-name-err', e => e.textContent);
    await page.fill('#f-name', '김온기 온기 베이커리');
    await page.click('#f-phone'); await page.keyboard.type('01012345678abc9', { delay: 15 });
    out.phone = await page.$eval('#f-phone', e => e.value);
    await page.fill('#f-phone', ''); await page.keyboard.type('0212345678'); out.phone02 = await page.$eval('#f-phone', e => e.value);
    await page.fill('#f-phone', ''); await page.keyboard.type('0311234567'); out.phone031 = await page.$eval('#f-phone', e => e.value);
    await page.fill('#f-phone', ''); await page.keyboard.type('15881234'); out.phone1588 = await page.$eval('#f-phone', e => e.value);
    await page.fill('#f-phone', ''); await page.keyboard.type('+821012345678'); out.phonePlus82 = await page.$eval('#f-phone', e => e.value);
    await page.fill('#f-phone', ''); await page.keyboard.type('01012345678');
    // backspace over hyphen
    for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace'); out.phoneBksp = await page.$eval('#f-phone', e => e.value);
    await page.keyboard.type('5678');
    // email required
    await page.click('input[name=replyBy][value="이메일"] + .seg__label', { force: true }); await sleep(300);
    out.emailReqShown = await page.$eval('[data-email-req]', e => !e.hidden);
    await page.selectOption('#f-industry', '카페·음식점');
    await page.check('#f-consent', { force: true });
    await page.click('[data-submit]'); await sleep(900);
    out.emailErr = await page.evaluate(() => ({ err: document.querySelector('#f-email-err').textContent, summary: document.querySelector('[data-summary]').innerText, active: document.activeElement.id }));
    await shot(page, 'd-form-email-required');
    await page.fill('#f-email', 'bad@addr'); await page.locator('#f-email').blur(); out.emailBad = await page.$eval('#f-email-err', e => e.textContent);
    await page.fill('#f-email', 'owner@ongi.kr'); await sleep(100); out.emailFixed = await page.$eval('#f-email-err', e => e.hidden);
    out.summaryStale = await page.$eval('[data-summary]', e => e.hidden ? 'hidden' : e.innerText);
    await page.fill('#f-message', '빵집 홈페이지가 필요합니다.\n예약 주문을 받고 싶어요.');
    await page.check('input[name=features][value="지도·오시는 길"]', { force: true });
    // reload draft
    await sleep(500); await page.reload(); await sleep(1200);
    out.draft = await page.evaluate(() => ({ name: document.querySelector('#f-name').value, phone: document.querySelector('#f-phone').value, reply: document.querySelector('input[name=replyBy]:checked').value, consent: document.querySelector('#f-consent').checked, ind: document.querySelector('#f-industry').value }));
    await page.check('#f-consent', { force: true });
    await page.evaluate(() => document.querySelector('[data-submit]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('[data-submit]'); await sleep(1500);
    out.resB = await page.evaluate(() => ({ title: document.querySelector('.result__title').textContent, body: document.querySelector('.result__body').textContent, text: document.querySelector('.result__text').textContent, active: document.activeElement.className, top: document.querySelector('.result__title').getBoundingClientRect().top, formHidden: document.querySelector('[data-form]').hidden, mailto: !!document.querySelector('.result a[href^="mailto:"]') }));
    await shot(page, 'd-result-B'); await shot(page, 'd-result-B-full', { fullPage: false });
    await page.evaluate(() => document.querySelector('.result__actions').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300);
    await page.click('.result__actions .btn'); await sleep(200);
    out.copyLabel = await page.$eval('.result__actions .btn', e => e.textContent);
    out.clip = (await page.evaluate(() => navigator.clipboard.readText())).slice(0, 60);
    await shot(page, 'd-result-B-copied');
    await sleep(1800); out.copyLabelAfter = await page.$eval('.result__actions .btn', e => e.textContent);
    await page.click('.mini-btn'); await sleep(150); out.addrLabel = await page.$eval('.mini-btn', e => e.textContent); out.clip2 = await page.evaluate(() => navigator.clipboard.readText());
    await page.click('.result__edit'); await sleep(900);
    out.back = await page.evaluate(() => ({ formHidden: document.querySelector('[data-form]').hidden, name: document.querySelector('#f-name').value, consent: document.querySelector('#f-consent').checked, active: document.activeElement.id }));
    await shot(page, 'd-back-to-form');
    // privacy dialog
    await page.evaluate(() => document.querySelector('[data-privacy-open]').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300);
    await page.click('[data-privacy-open]'); await sleep(400);
    out.dlg = await page.evaluate(() => ({ open: document.querySelector('dialog').open, active: document.activeElement.tagName + '.' + document.activeElement.className }));
    await shot(page, 'd-dialog');
    await page.keyboard.press('Escape'); await sleep(200);
    out.dlgEsc = await page.evaluate(() => ({ open: document.querySelector('dialog').open, active: document.activeElement.textContent }));
    await page.click('[data-privacy-open]'); await sleep(300); await page.mouse.click(40, 40); await sleep(200);
    out.dlgBackdrop = await page.$eval('dialog', d => d.open);
    out.footerFloat = await page.$eval('[data-float]', e => ({ shown: e.classList.contains('is-shown'), vis: getComputedStyle(e).visibility }));
  } catch (e) { out.FAIL = String(e.stack || e); }
  console.log(JSON.stringify(out, null, 1));
  await stop();
})();
