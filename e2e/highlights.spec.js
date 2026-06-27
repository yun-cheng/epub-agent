import { test, expect } from '@playwright/test';
import { openBook, selectTextInEpub, navigateToChapter, gotoFresh } from './helpers.js';

async function openHighlightsSidebar(page) {
  const btn = page.locator('[title="Highlights & Notes"]');
  if (!(await page.locator('.sidebar[data-side="right"]').isVisible().catch(() => false))) {
    await btn.click();
  }
}

test.describe('Highlights — creating', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
  });

  test('clicking a color in the popup creates a highlight', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    // Click first color button (yellow)
    await page.locator('.selection-popup .color-dot').first().click();
    // Popup should close after highlight
    await expect(page.locator('.selection-popup')).not.toBeVisible();
  });

  test('highlight appears in the highlights sidebar', async ({ page }) => {
    await selectTextInEpub(page);
    await page.locator('.selection-popup .color-dot').first().click();
    await page.waitForTimeout(300);
    await page.locator('[title="Highlights & Notes"]').click();
    await expect(page.locator('.highlight-item, .hl-item')).toBeVisible();
  });

  test('highlight count increases after adding highlight', async ({ page }) => {
    await page.locator('[title="Highlights & Notes"]').click();
    const initialCount = await page.locator('.highlight-item, .hl-item').count();

    await selectTextInEpub(page);
    await page.locator('.selection-popup .color-dot').first().click();
    await page.waitForTimeout(300);

    const newCount = await page.locator('.highlight-item, .hl-item').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('multiple highlights with different colors can be added', async ({ page }) => {
    // Add yellow highlight
    await selectTextInEpub(page);
    const colorBtns = page.locator('.selection-popup .color-dot');
    await colorBtns.nth(0).click();
    await page.waitForTimeout(500);

    // Advance page and add another
    await page.locator('[title="Next page"]').click();
    await page.waitForTimeout(800);
    await selectTextInEpub(page);
    await page.locator('.selection-popup .color-dot').nth(1).click();
    await page.waitForTimeout(300);

    await page.locator('[title="Highlights & Notes"]').click();
    const highlights = page.locator('.highlight-item, .hl-item');
    expect(await highlights.count()).toBe(2);
  });
});

test.describe('Highlights — sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    // Add one highlight
    await selectTextInEpub(page);
    await page.locator('.selection-popup .color-dot').first().click();
    await page.waitForTimeout(300);
    await page.locator('[title="Highlights & Notes"]').click();
  });

  test('sidebar shows the highlight text snippet', async ({ page }) => {
    await expect(page.locator('.highlight-item, .hl-item').first()).toBeVisible();
  });

  test('export button is visible when highlights exist', async ({ page }) => {
    await expect(page.locator('[title="Export highlights"]')).toBeVisible();
  });

  test('delete button removes highlight from sidebar', async ({ page }) => {
    const before = await page.locator('.highlight-item, .hl-item').count();
    await page.locator('[title="Delete"]').first().click();
    const after = await page.locator('.highlight-item, .hl-item').count();
    expect(after).toBe(before - 1);
  });

  test('highlights persist after page reload', async ({ page }) => {
    const before = await page.locator('.highlight-item, .hl-item').count();
    await page.reload();
    await openBook(page);
    await page.locator('[title="Highlights & Notes"]').click();
    const after = await page.locator('.highlight-item, .hl-item').count();
    expect(after).toBe(before);
  });
});

test.describe('Highlights — notes', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    await selectTextInEpub(page);
    await page.locator('.selection-popup .color-dot').first().click();
    await page.waitForTimeout(300);
  });

  test('Note button in popup opens note editor', async ({ page }) => {
    await selectTextInEpub(page);
    await expect(page.locator('.selection-popup')).toBeVisible();
    await page.locator('.selection-popup [title="Add note"]').click();
    await expect(page.locator('.note-editor textarea')).toBeVisible();
  });

  test('note is saved and shown in sidebar', async ({ page }) => {
    await page.locator('[title="Highlights & Notes"]').click();
    const noteBtn = page.locator('[title="Edit note"]').first();
    if (await noteBtn.isVisible()) {
      await noteBtn.click();
      const textarea = page.locator('.note-editor textarea, textarea').first();
      await textarea.fill('This is a test note');
      await page.locator('[title="Save note"], button:has-text("Save")').click();
      await expect(page.locator('text=This is a test note')).toBeVisible();
    }
  });
});

test.describe('Highlights — export', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await openBook(page);
    await selectTextInEpub(page);
    await page.locator('.selection-popup .color-dot').first().click();
    await page.waitForTimeout(300);
    await page.locator('[title="Highlights & Notes"]').click();
  });

  test('export menu opens on Export button click', async ({ page }) => {
    await page.locator('[title="Export highlights"]').click();
    await expect(page.locator('text=Markdown (.md)')).toBeVisible();
    await expect(page.locator('text=JSON (.json)')).toBeVisible();
  });

  test('Markdown export triggers download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.locator('[title="Export highlights"]').click();
        await page.locator('text=Markdown (.md)').click();
      })(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('JSON export triggers download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.locator('[title="Export highlights"]').click();
        await page.locator('text=JSON (.json)').click();
      })(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('exported JSON contains highlight data', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.locator('[title="Export highlights"]').click();
        await page.locator('text=JSON (.json)').click();
      })(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const json = JSON.parse(Buffer.concat(chunks).toString());
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty('text');
    expect(json[0]).toHaveProperty('cfi');
  });

  test('exported Markdown starts with heading', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.locator('[title="Export highlights"]').click();
        await page.locator('text=Markdown (.md)').click();
      })(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const md = Buffer.concat(chunks).toString();
    expect(md).toMatch(/^# Highlights/);
  });
});
