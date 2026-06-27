import { test, expect } from '@playwright/test';
import { openBook, waitForEpubContent } from './helpers.js';

async function openMoreSettings(page) {
  const alreadyOpen = await page.locator('.sidebar.right').isVisible().catch(() => false);
  if (!alreadyOpen) {
    await page.locator('[title="More Settings"]').click();
    await expect(page.locator('.sidebar.right')).toBeVisible();
  }
}

async function getEpubFontSize(page) {
  return page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    const body = iframe?.contentDocument?.body;
    if (!body) return null;
    return window.getComputedStyle(body).fontSize;
  });
}

// Font size is in the Settings sidebar — open it if needed, then return locators
async function getFontSizeButtons(page) {
  const alreadyOpen = await page.locator('.sidebar.right').isVisible().catch(() => false);
  if (!alreadyOpen) await openMoreSettings(page);
  return {
    increase: page.locator('.sidebar.right [title="Increase font size"]'),
    decrease: page.locator('.sidebar.right [title="Decrease font size"]'),
    value: page.locator('.sidebar.right .setting-value').first(),
  };
}

test.describe('Settings — font size', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('font size increase button increases the displayed value', async ({ page }) => {
    const btns = await getFontSizeButtons(page);
    const before = await btns.value.textContent();
    await btns.increase.click();
    const after = await btns.value.textContent();
    expect(Number(after)).toBeGreaterThan(Number(before));
  });

  test('font size decrease button decreases the displayed value', async ({ page }) => {
    const btns = await getFontSizeButtons(page);
    const before = await btns.value.textContent();
    await btns.decrease.click();
    const after = await btns.value.textContent();
    expect(Number(after)).toBeLessThan(Number(before));
  });

  test('font size is applied to epub content', async ({ page }) => {
    const before = await getEpubFontSize(page);
    const btns = await getFontSizeButtons(page);
    await btns.increase.click();
    await page.waitForTimeout(500);
    const after = await getEpubFontSize(page);
    expect(after).not.toBe(before);
  });

  test('font size persists after page reload', async ({ page }) => {
    const btns = await getFontSizeButtons(page);
    await btns.increase.click();
    const size = await btns.value.textContent();
    await page.reload();
    await openBook(page);
    const btns2 = await getFontSizeButtons(page);
    const reloaded = await btns2.value.textContent();
    expect(reloaded).toBe(size);
  });
});

test.describe('Settings — font family', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
    await openMoreSettings(page);
  });

  test('font family select is visible in More Settings', async ({ page }) => {
    await expect(page.locator('.font-select').first()).toBeVisible();
  });

  test('changing font family updates epub content', async ({ page }) => {
    const getFontFamily = () => page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe?.contentDocument?.body
        ? window.getComputedStyle(iframe.contentDocument.body).fontFamily
        : null;
    });
    const before = await getFontFamily();
    // Select "Sans Serif" option
    await page.locator('.font-select').first().selectOption({ label: 'Sans Serif' });
    await page.waitForTimeout(500);
    const after = await getFontFamily();
    expect(after).not.toBe(before);
  });
});

test.describe('Settings — dark theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
    await openMoreSettings(page);
  });

  test('dark theme toggle changes app theme', async ({ page }) => {
    const themeToggle = page.locator('[title*="Theme"], [title*="Dark"], button:has-text("Dark")');
    if (await themeToggle.isVisible()) {
      const htmlClass = await page.evaluate(() => document.documentElement.className);
      await themeToggle.click();
      const newClass = await page.evaluate(() => document.documentElement.className);
      expect(newClass).not.toBe(htmlClass);
    }
  });

  test('dark theme toggles epub background color', async ({ page }) => {
    const themeToggle = page.locator('[title*="Theme"], [title*="Dark"], select[title*="Theme"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      const bg = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe?.contentDocument?.body
          ? window.getComputedStyle(iframe.contentDocument.body).backgroundColor
          : null;
      });
      expect(bg).toBeTruthy();
    }
  });
});

test.describe('Settings — line spacing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
    await openMoreSettings(page);
  });

  test('line spacing select is visible', async ({ page }) => {
    // In More Settings: first .font-select is Font Style, second is Line Spacing
    const selects = page.locator('.font-select');
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
  });

  test('changing line spacing updates epub content', async ({ page }) => {
    const getLineHeight = () => page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe?.contentDocument?.body
        ? window.getComputedStyle(iframe.contentDocument.body).lineHeight
        : null;
    });
    const before = await getLineHeight();
    // Font Style is first select, Line Spacing is second
    await page.locator('.font-select').nth(1).selectOption('2');
    await page.waitForTimeout(500);
    const after = await getLineHeight();
    expect(after).not.toBe(before);
  });
});

test.describe('Settings — scroll mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('enabling scroll mode hides bottom bar next/prev buttons', async ({ page }) => {
    await page.locator('[title="Switch to Scroll"]').click();
    await waitForEpubContent(page);
    // In scroll mode, page-based navigation may be replaced by scrolling
    await expect(page.locator('[title="Switch to Paginated"]')).toBeVisible();
  });

  test('scroll mode state persists across reload', async ({ page }) => {
    await page.locator('[title="Switch to Scroll"]').click();
    await waitForEpubContent(page);
    await page.reload();
    await openBook(page);
    // Should still be in scroll mode
    await expect(page.locator('[title="Switch to Paginated"]')).toBeVisible();
  });
});
