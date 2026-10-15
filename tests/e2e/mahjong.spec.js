const { test, expect } = require('@playwright/test');

test('lobby and authentic tiles fit the viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Mahjong Multiplayer');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await page.fill('#name', 'QA Player');
  await page.selectOption('#playerCount', '2');
  await page.click('#createBtn');
  await expect(page.locator('#game')).toBeVisible();
  await page.click('#startBtn');
  await expect(page.locator('#bottomArea .tile-symbol').first()).toBeVisible();
  await expect(page.locator('#bottomArea .tile-symbol').first()).not.toHaveText('');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test('two browser contexts can join, play, reconnect, and leave', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await host.fill('#name', 'Host QA');
  await host.selectOption('#playerCount', '2');
  await host.click('#createBtn');
  await expect(host.locator('#roomLabel')).toHaveText(/^[A-Z0-9]{6}$/);
  const code = await host.locator('#roomLabel').textContent();

  await guest.goto('/');
  await guest.fill('#name', 'Guest QA');
  await guest.fill('#roomCode', code);
  await guest.click('#joinBtn');
  await expect(host.locator('#bottomArea .tile')).toHaveCount(14);
  await expect(guest.locator('#bottomArea .tile')).toHaveCount(13);

  await expect(host.locator('#discardSelectedBtn')).toBeEnabled();
  await host.locator('#bottomArea .tile').first().click();
  await host.click('#discardSelectedBtn');
  await expect(guest.locator('#passBtn')).toBeEnabled();
  await guest.click('#passBtn');
  await expect(guest.locator('#discardSelectedBtn')).toBeEnabled();

  await guest.reload();
  await expect(guest.locator('#game')).toBeVisible();
  await expect(guest.locator('#bottomArea .tile').first()).toBeVisible();
  await guest.click('#leaveBtn');
  await expect(guest.locator('#lobby')).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test('PWA shell is available offline after service worker activation', async ({ page, context, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox Playwright does not expose service workers consistently.');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#lobby')).toBeVisible();
  await context.setOffline(false);
});
