import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock EpubCFI so tests don't need the full epub.js bundle.
// compare() returns negative/zero/positive like a standard comparator.
vi.mock('epubjs', () => ({
  EpubCFI: class {
    compare(a, b) {
      // Treat CFI strings lexicographically for test purposes.
      return a < b ? -1 : a > b ? 1 : 0;
    }
  },
}));

import BookmarkSidebar from '../components/BookmarkSidebar';

const EARLIER = '2024-01-01T00:00:00.000Z';
const LATER   = '2024-06-01T00:00:00.000Z';

// CFI strings are ordered lexicographically: cfi-A < cfi-B < cfi-C
function makeBookmarks() {
  return [
    { id: 'bm-c', cfi: 'epubcfi(/cfi-C)', chapter: 'Chapter C', createdAt: EARLIER },
    { id: 'bm-a', cfi: 'epubcfi(/cfi-A)', chapter: 'Chapter A', createdAt: LATER   },
    { id: 'bm-b', cfi: 'epubcfi(/cfi-B)', chapter: 'Chapter B', createdAt: EARLIER  },
  ];
}

function renderSidebar(bookmarks, extraProps = {}) {
  return render(
    <BookmarkSidebar
      bookmarks={bookmarks}
      onJump={vi.fn()}
      onDelete={vi.fn()}
      {...extraProps}
    />
  );
}

function getChapterOrder() {
  return screen.getAllByText(/Chapter [ABC]/).map(el => el.textContent);
}

// ─── Sort controls rendered ───────────────────────────────────────────────────

describe('BookmarkSidebar — sort controls', () => {
  it('renders a "Sort:" label', () => {
    renderSidebar(makeBookmarks());
    expect(screen.getByText('Sort:')).toBeInTheDocument();
  });

  it('renders "Book order" sort button', () => {
    renderSidebar(makeBookmarks());
    expect(screen.getByTitle('Sort by position in book')).toBeInTheDocument();
  });

  it('renders "Date added" sort button', () => {
    renderSidebar(makeBookmarks());
    expect(screen.getByTitle('Sort by date added')).toBeInTheDocument();
  });

  it('defaults to "Book order" button having active class', () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by position in book');
    expect(btn.className).toContain('active');
  });

  it('"Date added" button does not have active class by default', () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by date added');
    expect(btn.className).not.toContain('active');
  });
});

// ─── Default sort (position, ascending) ──────────────────────────────────────

describe('BookmarkSidebar — default sort by position asc', () => {
  it('shows ↑ indicator on Book order button by default', () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by position in book');
    expect(btn.textContent).toContain('↑');
  });

  it('lists bookmarks in CFI ascending order by default', () => {
    renderSidebar(makeBookmarks());
    expect(getChapterOrder()).toEqual(['Chapter A', 'Chapter B', 'Chapter C']);
  });
});

// ─── Toggle sort direction ────────────────────────────────────────────────────

describe('BookmarkSidebar — sort direction toggle', () => {
  it('switches ↑ to ↓ when Book order button is clicked again', async () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by position in book');
    await userEvent.click(btn);
    expect(btn.textContent).toContain('↓');
  });

  it('reverses order when Book order is clicked a second time', async () => {
    renderSidebar(makeBookmarks());
    await userEvent.click(screen.getByTitle('Sort by position in book'));
    expect(getChapterOrder()).toEqual(['Chapter C', 'Chapter B', 'Chapter A']);
  });

  it('toggles back to ↑ on a third click', async () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by position in book');
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(btn.textContent).toContain('↑');
  });
});

// ─── Switch to date sort ──────────────────────────────────────────────────────

describe('BookmarkSidebar — date sort', () => {
  it('switches active state to "Date added" when that button is clicked', async () => {
    renderSidebar(makeBookmarks());
    await userEvent.click(screen.getByTitle('Sort by date added'));
    expect(screen.getByTitle('Sort by date added').className).toContain('active');
    expect(screen.getByTitle('Sort by position in book').className).not.toContain('active');
  });

  it('shows ↑ on Date added button after first click', async () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by date added');
    await userEvent.click(btn);
    expect(btn.textContent).toContain('↑');
  });

  it('sorts by date ascending after clicking Date added', async () => {
    renderSidebar(makeBookmarks());
    await userEvent.click(screen.getByTitle('Sort by date added'));
    // EARLIER items (bm-c, bm-b) come first; LATER item (bm-a) comes last
    const order = getChapterOrder();
    expect(order.indexOf('Chapter A')).toBeGreaterThan(order.indexOf('Chapter B'));
    expect(order.indexOf('Chapter A')).toBeGreaterThan(order.indexOf('Chapter C'));
  });

  it('reverses date order when Date added is clicked a second time', async () => {
    renderSidebar(makeBookmarks());
    const btn = screen.getByTitle('Sort by date added');
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(btn.textContent).toContain('↓');
    // LATER item (bm-a) should now be first
    expect(getChapterOrder()[0]).toBe('Chapter A');
  });
});
