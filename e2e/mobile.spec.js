/**
 * Mobile-specific E2E tests. Playwright's 'mobile-chrome' project in the config
 * runs these with Pixel 5 viewport (393x851). Desktop-specific tests are skipped
 * via `test.skip` when the viewport is wide.
 */
import { test, expect } from '@playwright/test';
import { openBook, selectTextInEpub, waitForEpubContent } from './helpers.js';

// Narrow viewport used for mobile tests when running in the desktop project
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('Mobile — layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
  });

  test('library page renders at mobile width', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible();
    await expect(page.locator('[title="Open EPUB file"]')).toBeVisible();
  });

  test('bottom navigation bar is visible when reading', async ({ page }) => {
    await openBook(page);
    await expect(page.locator('.bottom-bar, [class*="bottom"]')).toBeVisible();
  });

  test('"Next page" in bottom bar advances the page', async ({ page }) => {
    await openBook(page);
    const before = Number(await page.locator('.page-input').inputValue());
    await page.locator('[title="Next page"]').click();
    await page.waitForTimeout(800);
    const after = Number(await page.locator('.page-input').inputValue());
    expect(after).toBeGreaterThan(before);
  });
});

test.describe('Mobile — sidebar drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await openBook(page);
  });

  test('TOC sidebar opens as full-width drawer on mobile', async ({ page }) => {
    await page.locator('[title="Table of Contents"]').click();
    const sidebar = page.locator('.sidebar').first();
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    // On mobile the sidebar should be nearly full viewport width
    expect(box.width).toBeGreaterThan(300);
  });

  test('backdrop appears when TOC sidebar is open', async ({ page }) => {
    await page.locator('[title="Table of Contents"]').click();
    await expect(page.locator('.sidebar-backdrop')).toBeVisible();
  });

  test('clicking backdrop closes the sidebar', async ({ page }) => {
    await page.locator('[title="Table of Contents"]').click();
    await expect(page.locator('.sidebar-backdrop')).toBeVisible();
    await page.locator('.sidebar-backdrop').click();
    await expect(page.locator('.sidebar-backdrop')).not.toBeVisible();
  });

  test('highlights sidebar opens as full-width drawer', async ({ page }) => {
    await page.locator('[title="Highlights & Notes"]').click();
    const sidebar = page.locator('.sidebar').last();
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box.width).toBeGreaterThan(300);
  });

  test('backdrop click closes highlights sidebar too', async ({ page }) => {
    await page.locator('[title="Highlights & Notes"]').click();
    await expect(page.locator('.sidebar-backdrop')).toBeVisible();
    await page.locator('.sidebar-backdrop').click();
    await expect(page.locator('.sidebar-backdrop')).not.toBeVisible();
  });
});

test.describe('Mobile — selection popup', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await openBook(page);
  });

  test('selection popup appears on mobile after text selection', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('selection popup is within viewport on mobile', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    const box = await page.locator('.selection-popup').boundingBox();
    const vp = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 10); // 10px tolerance
  });
});

test.describe('Mobile — font controls in more settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await openBook(page);
  });

  test('More Settings panel has font size controls on mobile', async ({ page }) => {
    await page.locator('[title="More Settings"]').click();
    await expect(page.locator('.more-settings-mobile-only')).toBeVisible();
    await expect(page.locator('.more-settings-mobile-only [title="Increase font size"]')).toBeVisible();
  });

  test('mobile font size controls work', async ({ page }) => {
    await page.locator('[title="More Settings"]').click();
    const sizeEl = page.locator('.more-settings-mobile-only .setting-value');
    const before = Number(await sizeEl.textContent());
    await page.locator('.more-settings-mobile-only [title="Increase font size"]').click();
    const after = Number(await sizeEl.textContent());
    expect(after).toBeGreaterThan(before);
  });
});
