import { test, expect } from '@playwright/test';
import { openBook, navigateToChapter, waitForEpubContent } from './helpers.js';

test.describe('Reader — page navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('renders the epub in an iframe', async ({ page }) => {
    await expect(page.locator('iframe')).toBeVisible();
  });

  test('"Next page" button advances the page counter', async ({ page }) => {
    // In paginated mode the iframe body holds the whole chapter, so we
    // compare the page NUMBER from the bottom-bar counter instead.
    const before = Number(await page.locator('.page-input').inputValue());
    await page.locator('[title="Next page"]').click();
    await page.waitForTimeout(800);
    const after = Number(await page.locator('.page-input').inputValue());
    expect(after).toBeGreaterThan(before);
  });

  test('"Previous page" button decreases the page counter', async ({ page }) => {
    // Advance first so there is a previous page to go back to
    await page.locator('[title="Next page"]').click();
    await page.waitForTimeout(800);
    const mid = Number(await page.locator('.page-input').inputValue());
    await page.locator('[title="Previous page"]').click();
    await page.waitForTimeout(800);
    const after = Number(await page.locator('.page-input').inputValue());
    expect(after).toBeLessThan(mid);
  });

  test('right arrow key advances the page counter', async ({ page }) => {
    const before = Number(await page.locator('.page-input').inputValue());
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
    const after = Number(await page.locator('.page-input').inputValue());
    expect(after).toBeGreaterThan(before);
  });

  test('left arrow key decreases the page counter', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
    const mid = Number(await page.locator('.page-input').inputValue());
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(800);
    const after = Number(await page.locator('.page-input').inputValue());
    expect(after).toBeLessThan(mid);
  });
});

test.describe('Reader — chapter navigation via TOC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('TOC sidebar opens on button click', async ({ page }) => {
    await page.locator('[title="Table of Contents"]').click();
    await expect(page.locator('.sidebar-item').first()).toBeVisible();
  });

  test('TOC sidebar closes on X button', async ({ page }) => {
    await page.locator('[title="Table of Contents"]').click();
    await expect(page.locator('.sidebar-item').first()).toBeVisible();
    await page.locator('.sidebar .btn-icon').first().click();
    await expect(page.locator('.sidebar-item').first()).not.toBeVisible();
  });

  test('clicking a TOC chapter loads new content', async ({ page }) => {
    const before = await page.evaluate(() =>
      document.querySelector('iframe')?.contentDocument?.body?.innerText?.substring(0, 60) ?? ''
    );
    await page.locator('[title="Table of Contents"]').click();
    await page.locator('.sidebar-item').nth(3).click();
    await page.waitForFunction((prev) => {
      const iframe = document.querySelector('iframe');
      const text = iframe?.contentDocument?.body?.innerText?.substring(0, 60) ?? '';
      return text.length > 10 && text !== prev;
    }, before, { timeout: 10000 });
    const after = await page.evaluate(() =>
      document.querySelector('iframe')?.contentDocument?.body?.innerText?.substring(0, 60) ?? ''
    );
    expect(after).not.toBe(before);
  });

  test('chapter nav buttons (prev/next chapter) work', async ({ page }) => {
    const before = await page.evaluate(() =>
      document.querySelector('iframe')?.contentDocument?.body?.innerText?.substring(0, 60) ?? ''
    );
    await page.locator('[title="Next Chapter"]').click();
    // Wait for the content to actually change (not just for text to exist)
    await page.waitForFunction((prev) => {
      const iframe = document.querySelector('iframe');
      const text = iframe?.contentDocument?.body?.innerText?.substring(0, 60) ?? '';
      return text.length > 10 && text !== prev;
    }, before, { timeout: 10000 });
    const after = await page.evaluate(() =>
      document.querySelector('iframe')?.contentDocument?.body?.innerText?.substring(0, 60) ?? ''
    );
    expect(after).not.toBe(before);
  });

  test('Back to Library button returns to library page', async ({ page }) => {
    await page.locator('[title="Back to Library"]').click();
    await expect(page.locator('text=Your Library')).toBeVisible();
  });
});

test.describe('Reader — scroll mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('scroll mode toggle button exists', async ({ page }) => {
    await expect(page.locator('[title="Switch to Scroll"]')).toBeVisible();
  });

  test('clicking scroll mode toggle reloads reader in scroll mode', async ({ page }) => {
    await page.locator('[title="Switch to Scroll"]').click();
    await waitForEpubContent(page);
    await expect(page.locator('[title="Switch to Paginated"]')).toBeVisible();
  });

  test('toggling back returns to paginated mode', async ({ page }) => {
    await page.locator('[title="Switch to Scroll"]').click();
    await waitForEpubContent(page);
    await page.locator('[title="Switch to Paginated"]').click();
    await waitForEpubContent(page);
    await expect(page.locator('[title="Switch to Scroll"]')).toBeVisible();
  });
});
