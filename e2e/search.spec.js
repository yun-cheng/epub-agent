import { test, expect } from '@playwright/test';
import { openBook, waitForEpubContent } from './helpers.js';

async function openSearch(page) {
  await page.locator('[title="Search"]').click();
  await expect(page.locator('input.search-input')).toBeVisible();
}

async function search(page, query) {
  await openSearch(page);
  await page.locator('input.search-input').fill(query);
  await page.keyboard.press('Enter');
}

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openBook(page);
  });

  test('Search button opens the search panel', async ({ page }) => {
    await page.locator('[title="Search"]').click();
    await expect(page.locator('.search-panel')).toBeVisible();
  });

  test('search input is focused when panel opens', async ({ page }) => {
    await openSearch(page);
    await expect(page.locator('input.search-input')).toBeFocused();
  });

  test('typing a query shows results', async ({ page }) => {
    await search(page, 'the');
    await page.waitForTimeout(1500); // search is async across epub chapters
    const results = page.locator('.search-result-item');
    await expect(results.first()).toBeVisible({ timeout: 8000 });
  });

  test('clicking a search result navigates to that location', async ({ page }) => {
    await search(page, 'the');
    await page.waitForTimeout(1500);
    const results = page.locator('.search-result-item');
    await results.first().waitFor({ timeout: 8000 });
    await results.first().click();
    await waitForEpubContent(page);
    await expect(page.locator('iframe')).toBeVisible();
  });

  test('closing search panel clears results', async ({ page }) => {
    await search(page, 'the');
    await page.waitForTimeout(1500);
    // Toggle search off
    await page.locator('[title="Search"]').click();
    await expect(page.locator('.search-panel')).not.toBeVisible();
  });

  test('empty search shows no results', async ({ page }) => {
    await search(page, 'xyzzy_no_match_12345');
    await page.waitForTimeout(2000);
    const results = page.locator('.search-result-item');
    expect(await results.count()).toBe(0);
  });
});
