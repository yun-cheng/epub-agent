import { test, expect } from '@playwright/test';
import { openBook, gotoFresh, waitForEpubContent, EPUB_PATH } from './helpers.js';

test.describe('Library — empty state', () => {
  test.beforeEach(async ({ page }) => { await gotoFresh(page); });

  test('shows "Your Library" heading on first load', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible();
  });

  test('shows empty-state message and icon when no books', async ({ page }) => {
    await expect(page.locator('text=Your library is empty')).toBeVisible();
    await expect(page.locator('text=/Drop an EPUB/')).toBeVisible();
  });

  test('"+ Open Book" button triggers file input', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[title="Open EPUB file"]').click(),
    ]);
    expect(fileChooser).toBeTruthy();
  });
});

test.describe('Library — after opening a book', () => {
  test.beforeEach(async ({ page }) => { await gotoFresh(page); });

  test('book appears in library after opening and closing', async ({ page }) => {
    await openBook(page);
    // Go back to library
    await page.locator('[title="Back to Library"]').click();
    await expect(page.locator('.book-card')).toBeVisible();
  });

  test('library card shows book title', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    const card = page.locator('.book-card').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.book-card-title')).not.toBeEmpty();
  });

  test('library card shows reading progress', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    await expect(page.locator('.book-card-progress')).toBeVisible();
    await expect(page.locator('.book-progress-bar')).toBeVisible();
  });

  test('library card shows last-opened date', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    await expect(page.locator('text=/Opened/')).toBeVisible();
  });

  test('clicking book card opens the book without a file picker', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    await expect(page.locator('.book-card')).toBeVisible();

    let fileChooserOpened = false;
    page.on('filechooser', () => { fileChooserOpened = true; });

    await page.locator('.book-card').first().click();
    await waitForEpubContent(page);

    expect(fileChooserOpened).toBe(false);
  });

  test('remove button deletes book from library', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    await expect(page.locator('.book-card')).toBeVisible();
    await page.locator('[title="Remove from library"]').click();
    await expect(page.locator('.book-card')).not.toBeVisible();
    await expect(page.locator('text=Your library is empty')).toBeVisible();
  });

  test('library persists across page reload', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    await page.reload();
    await expect(page.locator('.book-card')).toBeVisible();
  });
});
