/**
 * E2E tests for keyboard chapter navigation.
 * ArrowLeft/Right navigate previous/next chapter.
 * The cooldown guard must ensure only one chapter is navigated per keypress
 * even in scroll mode where epub.js registers its own handler.
 */
import { test, expect } from '@playwright/test';
import { openBook, waitForEpubContent, gotoFresh, navigateToChapter } from './helpers.js';

// Read the current chapter counter from the toolbar (e.g. "3" from "3 / 90")
async function getChapterInput(page) {
  const val = await page.locator('.chapter-input').inputValue().catch(() => null);
  return val ? parseInt(val, 10) : null;
}

async function getTotalChapters(page) {
  const text = await page.locator('.chapter-total').textContent().catch(() => '');
  const m = text.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

test.describe('Keyboard navigation — paginated mode', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    // Navigate to chapter 2 so there's room to go both left and right
    await navigateToChapter(page, 1);
  });

  test('ArrowRight advances to the next chapter', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
    const after = await getChapterInput(page);
    expect(after).toBe(before + 1);
  });

  test('ArrowLeft goes to the previous chapter', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(800);
    const after = await getChapterInput(page);
    expect(after).toBe(before - 1);
  });

  test('ArrowRight advances exactly one chapter, not two', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    const after = await getChapterInput(page);
    expect(after).toBe(before + 1);
  });

  test('] key advances to the next chapter', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press(']');
    await page.waitForTimeout(800);
    const after = await getChapterInput(page);
    expect(after).toBe(before + 1);
  });

  test('[ key goes to the previous chapter', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press('[');
    await page.waitForTimeout(800);
    const after = await getChapterInput(page);
    expect(after).toBe(before - 1);
  });

  test('keyboard navigation works when epub iframe has focus', async ({ page }) => {
    // Click inside the epub to focus the iframe
    const epubFrame = page.locator('.epub-view iframe');
    await epubFrame.click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});
    await page.waitForTimeout(200);

    const before = await getChapterInput(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
    const after = await getChapterInput(page);
    expect(after).toBe(before + 1);
  });

  test('chapter counter shows correct total', async ({ page }) => {
    const total = await getTotalChapters(page);
    expect(total).toBeGreaterThan(1);
  });
});

test.describe('Keyboard navigation — scroll mode', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    // Switch to scroll mode
    await page.locator('[title="Switch to Scroll"]').click();
    await page.waitForTimeout(800);
    await navigateToChapter(page, 1);
  });

  test('ArrowRight advances exactly one chapter in scroll mode', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    const after = await getChapterInput(page);
    expect(after).toBe(before + 1);
  });

  test('ArrowLeft goes back exactly one chapter in scroll mode', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);
    const after = await getChapterInput(page);
    expect(after).toBe(before - 1);
  });

  test('rapid ArrowRight presses do not double-navigate within cooldown', async ({ page }) => {
    const before = await getChapterInput(page);
    // Fire two ArrowRight in quick succession — cooldown should suppress the second
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    const after = await getChapterInput(page);
    expect(after).toBe(before + 1);
  });
});

test.describe('Chapter input box', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    await navigateToChapter(page, 1);
  });

  test('typing a chapter number and pressing Enter navigates to that chapter', async ({ page }) => {
    const total = await getTotalChapters(page);
    if (!total || total < 3) return;
    await page.locator('.chapter-input').click();
    await page.locator('.chapter-input').fill('1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const after = await getChapterInput(page);
    expect(after).toBe(1);
  });

  test('pressing Escape restores the original chapter number', async ({ page }) => {
    const before = await getChapterInput(page);
    await page.locator('.chapter-input').click();
    await page.locator('.chapter-input').fill('999');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const after = await getChapterInput(page);
    expect(after).toBe(before);
  });
});
