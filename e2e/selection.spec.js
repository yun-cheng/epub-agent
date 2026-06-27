/**
 * E2E tests for the text selection popup.
 *
 * The critical test is "popup appears after chapter navigation" — this is the
 * class of bug that unit tests missed entirely, because they never exercised
 * the real epubjs relocated event + listener re-registration lifecycle.
 */
import { test, expect } from '@playwright/test';
import { openBook, selectTextInEpub, navigateToChapter, dismissPopup } from './helpers.js';

test.describe('Selection popup — initial chapter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('selection popup appears after selecting text', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('popup shows highlight color buttons', async ({ page }) => {
    await selectTextInEpub(page);
    // Each color circle is a .color-dot div inside the popup
    const colorDots = page.locator('.selection-popup .color-dot');
    await expect(colorDots.first()).toBeVisible();
  });

  test('popup shows Copy button', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup [title="Copy"]')).toBeVisible();
  });

  test('popup shows Note button', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup [title="Add note"]')).toBeVisible();
  });

  test('popup shows Google search button', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toContainText('Google');
  });

  test('popup disappears when clicking outside', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    await dismissPopup(page);
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });
});

test.describe('Selection popup — after chapter navigation (regression)', () => {
  /**
   * This is the exact scenario that was broken: after navigating to a new chapter,
   * epubjs creates a new contentDoc. The old mouseup listener was on the old doc
   * and never fired. The fix re-registers the listener on every `relocated` event.
   */
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('popup appears after navigating to chapter 2', async ({ page }) => {
    await navigateToChapter(page, 1);
    const selected = await selectTextInEpub(page);
    expect(selected).toBeTruthy();
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('popup appears after navigating to chapter 4', async ({ page }) => {
    await navigateToChapter(page, 3);
    const selected = await selectTextInEpub(page);
    expect(selected).toBeTruthy();
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('popup appears after navigating forward then back', async ({ page }) => {
    await navigateToChapter(page, 3);
    await navigateToChapter(page, 0);
    const selected = await selectTextInEpub(page);
    expect(selected).toBeTruthy();
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('popup appears after multiple chapter hops', async ({ page }) => {
    await navigateToChapter(page, 1);
    await navigateToChapter(page, 4);
    await navigateToChapter(page, 2);
    const selected = await selectTextInEpub(page);
    expect(selected).toBeTruthy();
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('popup appears after using chapter nav buttons', async ({ page }) => {
    await page.locator('[title="Next Chapter"]').click();
    await page.waitForTimeout(1500);
    const selected = await selectTextInEpub(page);
    expect(selected).toBeTruthy();
    await expect(page.locator('.selection-popup')).toBeVisible();
  });
});

test.describe('Selection popup — Copy action', () => {
  test('Copy button copies text to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await openBook(page);
    const selectedText = await selectTextInEpub(page);
    await page.locator('.selection-popup [title="Copy"]').click();
    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText.trim()).toBe(selectedText?.trim());
  });
});
