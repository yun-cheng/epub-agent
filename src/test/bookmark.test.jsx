import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookmarkSidebar from '../components/BookmarkSidebar';

const FIXED_DATE = new Date('2024-03-15T10:00:00.000Z');

function makeBookmark(overrides = {}) {
  return {
    id: 'bm-1',
    cfi: 'epubcfi(/6/4!/4/2/1:0)',
    chapter: '序言',
    createdAt: FIXED_DATE.toISOString(),
    ...overrides,
  };
}

function renderSidebar(props = {}) {
  return render(
    <BookmarkSidebar
      bookmarks={[]}
      onJump={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

describe('BookmarkSidebar — empty state', () => {
  it('shows empty state when bookmarks is an empty array', () => {
    renderSidebar();
    expect(screen.getByText('Click the bookmark icon to add bookmarks')).toBeInTheDocument();
  });

  it('shows empty state when bookmarks is null', () => {
    renderSidebar({ bookmarks: null });
    expect(screen.getByText('Click the bookmark icon to add bookmarks')).toBeInTheDocument();
  });
});

// ─── Rendering bookmarks ─────────────────────────────────────────────────────

describe('BookmarkSidebar — rendering', () => {
  it('renders the chapter name for each bookmark', () => {
    renderSidebar({ bookmarks: [makeBookmark()] });
    expect(screen.getByText('序言')).toBeInTheDocument();
  });

  it('falls back to "Unknown" when chapter is missing', () => {
    renderSidebar({ bookmarks: [makeBookmark({ chapter: '' })] });
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('falls back to "Unknown" when chapter is null', () => {
    renderSidebar({ bookmarks: [makeBookmark({ chapter: null })] });
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('shows a formatted date from createdAt', () => {
    renderSidebar({ bookmarks: [makeBookmark()] });
    const dateStr = FIXED_DATE.toLocaleDateString();
    expect(screen.getByText(`Added ${dateStr}`)).toBeInTheDocument();
  });

  it('renders the bookmark icon', () => {
    const { container } = renderSidebar({ bookmarks: [makeBookmark()] });
    expect(container.querySelector('.bookmark-icon')).toBeInTheDocument();
  });

  it('renders a delete button for each bookmark', () => {
    renderSidebar({ bookmarks: [makeBookmark()] });
    expect(screen.getByTitle('Remove bookmark')).toBeInTheDocument();
  });

  it('renders multiple bookmarks', () => {
    const bookmarks = [
      makeBookmark({ id: 'bm-1', chapter: '序言' }),
      makeBookmark({ id: 'bm-2', chapter: '第一章', cfi: 'epubcfi(/6/6!/4/2/1:0)' }),
    ];
    renderSidebar({ bookmarks });
    expect(screen.getByText('序言')).toBeInTheDocument();
    expect(screen.getByText('第一章')).toBeInTheDocument();
    expect(screen.getAllByTitle('Remove bookmark')).toHaveLength(2);
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('BookmarkSidebar — interactions', () => {
  it('calls onJump with the bookmark cfi when the item is clicked', async () => {
    const onJump = vi.fn();
    renderSidebar({ bookmarks: [makeBookmark()], onJump });
    await userEvent.click(screen.getByText('序言'));
    expect(onJump).toHaveBeenCalledWith('epubcfi(/6/4!/4/2/1:0)');
  });

  it('calls onDelete with the bookmark id when delete is clicked', async () => {
    const onDelete = vi.fn();
    renderSidebar({ bookmarks: [makeBookmark()], onDelete });
    await userEvent.click(screen.getByTitle('Remove bookmark'));
    expect(onDelete).toHaveBeenCalledWith('bm-1');
  });

  it('does not call onJump when delete is clicked', async () => {
    const onJump = vi.fn();
    renderSidebar({ bookmarks: [makeBookmark()], onJump });
    await userEvent.click(screen.getByTitle('Remove bookmark'));
    expect(onJump).not.toHaveBeenCalled();
  });

  it('calls onJump with the correct cfi when one of multiple bookmarks is clicked', async () => {
    const onJump = vi.fn();
    const bookmarks = [
      makeBookmark({ id: 'bm-1', chapter: '序言', cfi: 'epubcfi(/6/4!/4/2/1:0)' }),
      makeBookmark({ id: 'bm-2', chapter: '第一章', cfi: 'epubcfi(/6/6!/4/2/1:0)' }),
    ];
    renderSidebar({ bookmarks, onJump });
    await userEvent.click(screen.getByText('第一章'));
    expect(onJump).toHaveBeenCalledWith('epubcfi(/6/6!/4/2/1:0)');
  });

  it('calls onDelete with the correct id when one of multiple delete buttons is clicked', async () => {
    const onDelete = vi.fn();
    const bookmarks = [
      makeBookmark({ id: 'bm-1', chapter: '序言' }),
      makeBookmark({ id: 'bm-2', chapter: '第一章', cfi: 'epubcfi(/6/6!/4/2/1:0)' }),
    ];
    renderSidebar({ bookmarks, onDelete });
    const deleteButtons = screen.getAllByTitle('Remove bookmark');
    await userEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('bm-2');
  });
});
