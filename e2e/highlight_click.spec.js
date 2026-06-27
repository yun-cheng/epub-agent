/**
 * E2E tests for clicking on existing highlights to show the selection popup with a Delete button,
 * and for the Selection Popup trigger mode setting (Auto vs Right-click).
 */
import { test, expect } from '@playwright/test';
import { openBook, selectTextInEpub, gotoFresh } from './helpers.js';

// Helper: add a highlight and return
async function addHighlight(page) {
  await selectTextInEpub(page);
  await expect(page.locator('.selection-popup')).toBeVisible();
  await page.locator('.selection-popup .color-dot').first().click();
  await expect(page.locator('.selection-popup')).not.toBeVisible();
  // Clear the iframe text selection so subsequent highlight clicks aren't blocked
  // by the handleHighlightClick guard that bails when text is still selected.
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    const win = iframe && iframe.contentWindow;
    if (win && win.getSelection) win.getSelection().removeAllRanges();
  });
  await page.waitForTimeout(300);
}

// Helper: click the highlight SVG annotation in the epub.
// marks-pane attaches click listeners directly to the <g data-cfi> SVG elements.
// CSS pointer-events:none only blocks native user interactions — dispatchEvent()
// bypasses it, so we dispatch directly on the SVG rect for reliable hit detection.
async function clickHighlightAnnotation(page) {
  // Wait for marks-pane to render the SVG highlight group
  const gLocator = page.locator('.epub-view g[data-cfi]').first();
  await gLocator.waitFor({ state: 'attached', timeout: 8000 });

  // Use locator.click() — Playwright handles scrolling, actionability, and
  // touch vs mouse correctly across chromium and mobile-chrome.
  await gLocator.click({ force: true });
  await page.waitForTimeout(500);
}

test.describe('Highlight click — popup', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    await addHighlight(page);
  });

  test('clicking a highlight shows the selection popup', async ({ page }) => {
    await clickHighlightAnnotation(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('popup for existing highlight has a Delete button', async ({ page }) => {
    await clickHighlightAnnotation(page);
    await expect(page.locator('.selection-popup [title="Delete highlight"]')).toBeVisible();
  });

  test('Delete button removes the highlight', async ({ page }) => {
    // Confirm highlight annotation exists
    const before = await page.locator('.epub-view g[data-cfi]').count();
    await clickHighlightAnnotation(page);
    await page.locator('.selection-popup [title="Delete highlight"]').click();
    await page.waitForTimeout(400);
    const after = await page.locator('.epub-view g[data-cfi]').count();
    expect(after).toBe(before - 1);
  });

  test('popup for existing highlight does not show Delete button for new selection', async ({ page }) => {
    // Select fresh text (not a highlight) — popup should have no Delete button
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    await expect(page.locator('.selection-popup [title="Delete highlight"]')).not.toBeVisible();
  });
});

test.describe('Highlight click — re-color', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    await addHighlight(page); // adds yellow by default
  });

  test('clicking a different color on existing highlight re-colors it', async ({ page }) => {
    await clickHighlightAnnotation(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    // Click the second color (green)
    await page.locator('.selection-popup .color-dot').nth(1).click();
    await page.waitForTimeout(400);
    // Highlight should still exist (re-colored, not deleted)
    await expect(page.locator('.epub-view g[data-cfi]')).toHaveCount(1);
  });
});

test.describe('Popup dismiss — click outside', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
  });

  test('clicking the toolbar dismisses the popup', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    // Click an empty spot on the toolbar (outside the popup)
    await page.locator('.toolbar').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });

  test('clicking inside the epub (not on selected text) dismisses the popup', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    // Dispatch a mousedown on the iframe document at a position with no text
    await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe || !iframe.contentDocument) return;
      // Click at top-left corner of the iframe content (typically empty margin)
      iframe.contentDocument.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 })
      );
    });
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });

  test('clicking the popup itself does not dismiss it', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    // Click on the popup container — popup should stay open
    await page.locator('.selection-popup').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.selection-popup')).toBeVisible();
  });
});

test.describe('Selection popup trigger — settings', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
  });

  test('Selection Popup setting appears in More Settings', async ({ page }) => {
    await page.locator('[title="More Settings"]').click();
    await expect(page.locator('text=Selection Popup')).toBeVisible();
    await expect(page.locator('select[title="Selection popup trigger mode"]')).toBeVisible();
  });

  test('Auto mode shows popup on text selection', async ({ page }) => {
    // Default is auto — popup should appear on mouseup after selecting text
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('Right-click mode suppresses popup on text selection mouseup', async ({ page }) => {
    // Switch to right-click mode
    await page.locator('[title="More Settings"]').click();
    await page.locator('select[title="Selection popup trigger mode"]').selectOption('rightclick');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Selecting text should NOT show the popup
    await selectTextInEpub(page);
    // Give it time to appear if it were going to
    await page.waitForTimeout(500);
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });

  test('Right-click mode shows popup on contextmenu with selection', async ({ page }) => {
    // Switch to right-click mode
    await page.locator('[title="More Settings"]').click();
    await page.locator('select[title="Selection popup trigger mode"]').selectOption('rightclick');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // First select text (without popup appearing)
    await selectTextInEpub(page);
    await page.waitForTimeout(200);

    // Then fire contextmenu on the epub iframe content
    await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe || !iframe.contentDocument) return;
      const doc = iframe.contentDocument;
      doc.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(400);
    await expect(page.locator('.selection-popup')).toBeVisible();
  });
});

test.describe('Popup dismiss', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
  });

  test('clicking inside the epub dismisses the popup', async ({ page }) => {
    await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        iframe.contentDocument.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
    });
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });

  test('clicking the toolbar dismisses the popup', async ({ page }) => {
    await page.locator('.toolbar').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });
});
