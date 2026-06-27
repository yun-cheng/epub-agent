/**
 * E2E tests for URL routing.
 * Library:       /library
 * Book:          /book/{key}
 * Book+chapter:  /book/{key}?cfi={cfi}
 */
import { test, expect } from '@playwright/test';
import { gotoFresh, openBook, waitForEpubContent } from './helpers.js';

test.describe('URL routing', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test('library URL is /library on initial load', async ({ page }) => {
    await expect(page).toHaveURL(/\/library/);
  });

  test('URL changes to /book/{key} when a book is opened', async ({ page }) => {
    await openBook(page);
    await expect(page).toHaveURL(/\/book\//);
  });

  test('URL contains the book key', async ({ page }) => {
    await openBook(page);
    expect(page.url()).toContain('/book/test');
  });

  test('URL updates with chapter index as the reader relocates', async ({ page }) => {
    await openBook(page);
    await expect(page).toHaveURL(/chapter=\d+/, { timeout: 15000 });
  });

  test('URL changes back to /library when returning to library', async ({ page }) => {
    await openBook(page);
    await page.locator('[title="Back to Library"]').click();
    await expect(page).toHaveURL(/\/library/);
    await expect(page).not.toHaveURL(/\/book\//);
  });

  test('opening a book URL directly loads the book', async ({ page }) => {
    await openBook(page);
    const bookUrl = page.url();

    await page.goto('/library');
    await page.goto(bookUrl);
    await waitForEpubContent(page);
    await expect(page.locator('iframe')).toBeAttached();
  });

  test('browser back button returns to library from book', async ({ page }) => {
    await openBook(page);
    await expect(page).toHaveURL(/\/book\//);

    await page.goBack();
    await expect(page.locator('.library-page')).toBeVisible();
  });
});
