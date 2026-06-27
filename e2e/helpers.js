import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const EPUB_PATH = path.resolve(__dirname, '../public/test.epub');

/**
 * Navigate to url with a clean localStorage. Uses a sessionStorage flag so that
 * subsequent page.reload() calls within the same test do NOT clear localStorage
 * (needed by the "highlights persist after reload" test).
 */
export async function gotoFresh(page, url = '/library') {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__test_clean')) {
      localStorage.clear();
      sessionStorage.setItem('__test_clean', '1');
    }
  });
  await page.goto(url);
}

/** Open a book via the hidden file input and wait for the epub iframe to render content. */
export async function openBook(page, epubPath = EPUB_PATH) {
  await page.locator('input[type="file"]').first().setInputFiles(epubPath);
  await page.waitForSelector('iframe', { state: 'attached' });
  await waitForEpubContent(page);
}

/** Wait until the epub iframe has text content rendered inside it. */
export async function waitForEpubContent(page) {
  await page.waitForFunction(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentDocument) return false;
    const body = iframe.contentDocument.body;
    return body && body.innerText && body.innerText.trim().length > 20;
  }, { timeout: 15000 });
}

/** Programmatically select text inside the epub iframe and fire mouseup. Returns the selected text. */
export async function selectTextInEpub(page) {
  // Wait until the selection listener is registered (up to 8s)
  await page.waitForFunction(() => {
    const iframe = document.querySelector('iframe');
    return !!(iframe?.contentDocument?._selHandler);
  }, { timeout: 8000 });

  return page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentDocument) return null;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    const iframeRect = iframe.getBoundingClientRect();
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let textNode = null;
    // Skip text nodes at x=0 (popup would overflow left edge)
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t.length > 15) {
        const range = doc.createRange();
        range.setStart(walker.currentNode, 0);
        range.setEnd(walker.currentNode, 3);
        const r = range.getBoundingClientRect();
        // Prefer text at least 80px from left edge after accounting for iframe position
        if (r.left + iframeRect.left > 80) {
          textNode = walker.currentNode;
          break;
        }
        if (!textNode) textNode = walker.currentNode; // fallback to first match
      }
    }
    if (!textNode) return null;
    const range = doc.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, Math.min(20, textNode.textContent.length));
    const sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    doc.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    return sel.toString().trim();
  });
}

/**
 * Open the TOC sidebar, click the nth chapter (0-indexed), then close the TOC.
 * Waits for the selection listener to be re-registered on the new chapter's document,
 * which reliably signals that the chapter has fully loaded.
 */
export async function navigateToChapter(page, index) {
  const tocBtn = page.locator('[title="Table of Contents"]');
  const isOpen = await page.locator('.sidebar-item').first().isVisible().catch(() => false);
  if (!isOpen) await tocBtn.click();

  // Remove the handler from the current doc so we can detect when the new chapter registers one
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    if (iframe?.contentDocument) delete iframe.contentDocument._selHandler;
  });

  await page.locator('.sidebar-item').nth(index).click();

  // Wait for the new chapter's _selHandler to be registered (proves chapter loaded + listener settled)
  await page.waitForFunction(() => {
    const iframe = document.querySelector('iframe');
    return !!(iframe?.contentDocument?._selHandler);
  }, { timeout: 15000 });

  // Close the TOC so it doesn't block subsequent toolbar interactions.
  // On mobile the open sidebar covers the toolbar button, so prefer the X inside the sidebar header.
  const tocStillOpen = await page.locator('.sidebar-item').first().isVisible().catch(() => false);
  if (tocStillOpen) {
    const closeX = page.locator('.sidebar-header button.btn-icon').first();
    const xVisible = await closeX.isVisible().catch(() => false);
    if (xVisible) {
      await closeX.click();
    } else {
      await tocBtn.click();
    }
  }
}

/** Dismiss any open selection popup by clicking outside the epub. */
export async function dismissPopup(page) {
  await page.locator('.toolbar').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(100);
}
