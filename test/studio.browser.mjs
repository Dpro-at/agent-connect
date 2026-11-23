import assert from 'node:assert/strict';

/** Run with a Playwright Page supplied by the consumer's browser test runner. No provider calls. */
export async function verifyStudio(page, url = 'http://127.0.0.1:4318') {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  // The local entrypoint is an empty connected shell; sample fixtures are test-only.
  assert.equal(await page.locator('#workspace-name, #theme-toggle, .local-pill').count(), 0);
  assert.equal(await page.locator('#caption').inputValue(), '');
  assert.equal(await page.locator('#channel-picker [data-channel=x]').count(), 0);
  assert.equal(await page.locator('#publish').isDisabled(), true);
  const mountFixtures = () => page.evaluate(async () => {
    const { mountSocialStudio } = await import('/studio/index.js');
    const previous = document.getElementById('studio');
    const host = document.createElement('div'); host.id = 'studio'; previous.replaceWith(host);
    window.__studioTestController = await mountSocialStudio(host, {mode:'demo'});
  });
  await mountFixtures();
  const reset = async () => {
    await page.locator('#more-menu').click();
    await page.locator('#reset').click();
  };
  await reset();
  assert.equal(await page.locator('.sidebar').count(), 0);
  assert.equal(await page.locator('.studio-tabs [role=tab]').count(), 4);
  // Locally hosted real brand assets must actually decode, not simply have an img element.
  for (const id of ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok']) {
    const image = page.locator(`#channel-picker [data-channel=${id}] img`);
    await image.evaluate(image => image.decode());
    assert.equal(await image.evaluate(image => image.naturalWidth > 0), true);
    assert.match(await image.getAttribute('src'), /\/studio\/icons\/.+\.svg$/);
  }
  // Roving keyboard focus and selection for both tab strips.
  await page.locator('#tab-compose').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-calendar').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#accounts-view').isVisible(), true);
  assert.equal(await page.locator('.account-row').count(), 6);
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#compose-view').isVisible(), true);
  for (const name of ['Facebook', 'Instagram', 'LinkedIn', 'X', 'YouTube', 'TikTok']) {
    await page.getByRole('tab', { name: `${name} preview`, exact: true }).click();
    assert.equal(await page.getByRole('article', { name: `${name} post preview` }).isVisible(), true);
  }
  await page.locator('#preview-tiktok').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#preview-facebook').getAttribute('aria-selected'), 'true');
  // Account selection and live editing must keep editor and preview state consistent.
  await page.locator('[data-channel=x]').click();
  await page.locator('#select-all-accounts').click();
  assert.equal(await page.locator('[data-channel=x]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-channel=x]').click();
  await page.locator('#clear-accounts').click();
  assert.equal(await page.locator('[data-channel=x]').getAttribute('aria-pressed'), 'false');
  await page.locator('#new-post').click();
  await page.locator('#caption').fill('A local test post');
  assert.match(await page.locator('#post-preview').innerText(), /A local test post/);
  assert.equal(await page.locator('#char-count').innerText(), '17 characters');
  await page.locator('#post-options summary').click();
  await page.locator('#title').fill('Browser test post');
  await page.locator('#privacy').selectOption('public');
  // Local file selection, dimensions, removal and a real video element for video previews.
  await page.locator('#media-file').setInputFiles({ name: 'test.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="blue"/></svg>') });
  await page.getByText('640 × 480 · Local preview only', { exact: true }).waitFor();
  for (const ratio of ['square', 'portrait', 'vertical', 'landscape']) {
    await page.locator('#ratio').selectOption(ratio);
    assert.equal(await page.locator(`.preview-media.${ratio}`).count(), 1);
  }
  await page.locator('#remove-media').click();
  assert.equal(await page.locator('#remove-media').isVisible(), false);
  await page.locator('#media-file').setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('test video placeholder') });
  assert.equal(await page.locator('#post-preview video').count(), 1);
  await page.locator('#remove-media').click();
  // Validation opens the collapsed review options and focuses the missing field.
  await page.locator('#save-draft').click();
  await page.locator('[data-view=library]').click();
  const row = page.locator('.post-row').filter({ hasText: 'Browser test post' });
  assert.equal(await row.count(), 1);
  await row.getByRole('button', { name: 'Edit post', exact: true }).click();
  await page.locator('#schedule-post').click();
  assert.equal(await page.locator('#post-options').getAttribute('open') !== null, true);
  const future = new Date(); future.setFullYear(future.getFullYear() + 1);
  await page.locator('#schedule').fill(`${future.getFullYear()}-01-20T10:30`);
  await page.locator('#consent').check();
  await page.locator('#schedule-post').click();
  assert.match(await page.locator('#calendar-grid').innerText(), /Browser test post/);
  const month = await page.locator('#month-title').innerText();
  await page.locator('#next-month').click();
  assert.equal((await page.locator('#month-title').innerText()) === month, false);
  await page.locator('#prev-month').click();
  assert.equal(await page.locator('#month-title').innerText(), month);
  await page.locator('[data-date]').first().click();
  assert.equal(await page.locator('#compose-view').isVisible(), true);
  await page.reload();
  await mountFixtures();
  await page.locator('[data-view=library]').click();
  assert.match(await page.locator('#post-list').innerText(), /Browser test post/);
  await page.locator('#status-filter').selectOption('scheduled');
  assert.match(await page.locator('#post-list').innerText(), /Browser test post/);
  await row.getByRole('button', { name: 'Delete Browser test post' }).click();
  assert.equal(await row.count(), 0);
  await page.locator('#undo-delete').click();
  assert.equal(await row.count(), 1);
  // Simulated publishing is explicitly a local action and changes the displayed state.
  await row.getByRole('button', { name: 'Edit post', exact: true }).click();
  await page.locator('#post-options summary').click();
  await page.locator('#consent').check();
  await page.locator('#publish').click();
  assert.match(await page.locator('#editor-status').innerText(), /Published demo/);
  await page.locator('[data-view=library]').click();
  await page.locator('#status-filter').selectOption('failed');
  await page.getByText('No posts in this view.', { exact: true }).waitFor();
  await page.locator('[data-create-post]').click();
  assert.equal(await page.locator('#compose-view').isVisible(), true);
  // Two mounted instances must not leak events; host-width changes must reflow inside a wide app.
  const connected = await page.evaluate(async () => {
    const { mountSocialStudio } = await import('/studio/index.js');
    const host = document.createElement('div'); document.body.append(host);
    const before = JSON.stringify(localStorage); let calls = 0;
    const opts = { mode: 'connected', workspaceName: 'Embedded workspace', accounts: [{ platform: 'facebook', id: '123', name: 'Test Page' }], posts: [], onSave: async post => { calls++; return post; } };
    let controller = await mountSocialStudio(host, opts); controller.destroy();
    controller = await mountSocialStudio(host, opts);
    const root = host.shadowRoot;
    root.getElementById('caption').value = 'Connected test'; root.getElementById('save-draft').click();
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = { calls, unchanged: before === JSON.stringify(localStorage), disabled: root.querySelector('[data-channel=instagram]').disabled };
    controller.setTheme('dark'); result.dark = root.querySelector('.studio-shell').dataset.theme === 'dark';
    controller.destroy(); result.clean = root.childNodes.length === 0; host.remove(); return result;
  });
  assert.equal(connected.calls, 1); assert.equal(connected.unchanged, true); assert.equal(connected.disabled, true); assert.equal(connected.clean, true); assert.equal(connected.dark, true);
  await reset();
  // Mandatory Girru window sizes, phone size, dark mode and embedded width.
  for (const [width, height] of [[1280, 720], [1440, 900], [1728, 1117], [800, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert.equal(size.content, size.viewport);
    await page.locator('[data-view=calendar]').click(); assert.equal(await page.locator('#calendar-grid').isVisible(), true);
    await page.locator('[data-view=compose]').click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.__studioTestController.setTheme('dark'));
  assert.equal(await page.locator('.studio-shell').getAttribute('data-theme'), 'dark');
  await page.evaluate(() => window.__studioTestController.setTheme('light'));
  await page.evaluate(() => { document.getElementById('studio').style.width = '720px'; });
  const columns = await page.locator('.compose-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 1);
  await page.evaluate(() => { document.getElementById('studio').style.width = ''; });
  assert.equal(errors.length, 0);
}

export async function verifyMultipleAccounts(page) {
  const result = await page.evaluate(async () => {
    const { mountSocialStudio } = await import('/studio/index.js');
    const host = document.createElement('div'); document.body.append(host);
    const accounts = Array.from({ length: 120 }, (_, index) => ({ platform: index < 60 ? 'facebook' : 'instagram', id: `account-${index}`, name: `Account ${index}` }));
    let sent;
    const controller = await mountSocialStudio(host, {
      mode: 'connected', workspaceName: 'Multiple accounts', accounts, posts: [],
      onConnect: async platform => ({platform, id:'added-account', name:'Added account'}),
      onSave: async post => { sent = post; return post; },
    });
    const root = host.shadowRoot;
    const click = selector => root.querySelector(selector).click();
    click('[data-channel=facebook]');
    const available = root.querySelectorAll('.account-choice').length;
    root.getElementById('account-search').value = 'Account 17'; root.getElementById('account-search').dispatchEvent(new Event('input'));
    const matches = root.querySelectorAll('.account-choice').length;
    click('#clear-accounts');
    click('[data-account-key="facebook:account-17"]');
    root.getElementById('caption').value = 'Multiple target post'; click('#save-draft');
    await new Promise(resolve => setTimeout(resolve, 10));
    const selectedFacebook = sent.accountIds.facebook;
    const selectedInstagram = sent.accountIds.instagram;
    root.getElementById('post-options').open = true;
    root.getElementById('consent').checked = true;
    root.getElementById('caption').value = 'Edited after review'; root.getElementById('caption').dispatchEvent(new Event('input'));
    const invalidated = !root.getElementById('consent').checked;
    click('[data-view=accounts]'); click('#open-connect'); click('[data-connect=facebook]'); click('#connection-continue');
    await new Promise(resolve => setTimeout(resolve, 10));
    const totalAfterConnect = root.querySelectorAll('.account-row').length;
    controller.setAccounts(accounts.slice(60));
    click('[data-view=compose]'); click('#save-draft');
    await new Promise(resolve => setTimeout(resolve, 10));
    const removedTargetsGone = !sent.accountIds.facebook && sent.accountIds.instagram.length === 60;
    controller.destroy(); host.remove();
    return { available, matches, selectedFacebook, instagramCount:selectedInstagram.length, invalidated, totalAfterConnect, removedTargetsGone };
  });
  assert.equal(result.available, 60);
  assert.equal(result.matches, 1);
  assert.equal(result.selectedFacebook.length, 1);
  assert.equal(result.selectedFacebook[0], 'account-17');
  assert.equal(result.instagramCount, 60);
  assert.equal(result.invalidated, true);
  assert.equal(result.totalAfterConnect, 121);
  assert.equal(result.removedTargetsGone, true);
}


export async function verifyConnectionLifecycle(page) {
  const result = await page.evaluate(async () => {
    const { mountSocialStudio } = await import('/studio/index.js');
    const host = document.createElement('div'); document.body.append(host);
    let disconnected = 0;
    const controller = await mountSocialStudio(host, {
      mode:'connected', workspaceName:'Connection test',
      accounts:[{platform:'instagram', id:'ig-1', name:'My Instagram', status:'expired'}], posts:[],
      onConnect:async platform => [{platform, id:'ig-2', name:'Second Instagram'}],
      onReconnect:async account => ({...account,status:'connected'}),
      onCheckConnection:async account => ({...account,status:'expired'}),
      onDisconnect:async () => { disconnected++; if (disconnected === 1) throw Error('Private provider detail'); },
    });
    const root = host.shadowRoot;
    const click = selector => root.querySelector(selector).click();
    const wait = () => new Promise(resolve => setTimeout(resolve, 10));
    click('[data-view=accounts]');
    const expired = root.getElementById('account-list').textContent.includes('Reconnect required');
    click('[data-reconnect-account]'); click('#connection-continue'); await wait();
    const reconnected = root.querySelectorAll('.account-row').length === 1 && root.getElementById('account-list').textContent.includes('Connected');
    click('[data-check-account]'); await wait();
    const checkedExpired = root.getElementById('account-list').textContent.includes('Reconnect required');
    click('#open-connect'); click('[data-connect=instagram]'); click('#connection-continue'); await wait();
    const added = root.querySelectorAll('.account-row').length === 2;
    click('[data-disconnect-account]'); click('#connection-continue'); await wait();
    const failedKept = root.querySelectorAll('.account-row').length === 2 && !root.getElementById('connection-error').textContent.includes('Private provider detail');
    click('#connection-continue'); await wait();
    const removed = root.querySelectorAll('.account-row').length === 1;
    controller.destroy(); host.remove();
    return {expired,reconnected,checkedExpired,added,failedKept,removed};
  });
  for (const value of Object.values(result)) assert.equal(value, true);
}
