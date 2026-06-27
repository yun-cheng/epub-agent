import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryPage from '../components/LibraryPage';

const TODAY = '2026-06-26T10:00:00.000Z';
const YESTERDAY = '2026-06-25T10:00:00.000Z';

function makeBook(overrides = {}) {
  return {
    key: 'my-book',
    title: 'My Book',
    progress: 0.25,
    lastOpened: TODAY,
    ...overrides,
  };
}

function renderLibrary(props = {}) {
  const defaults = {
    library: [],
    onOpenFile: vi.fn(),
    onRemove: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    fileInputRef: { current: null },
  };
  return render(<LibraryPage {...defaults} {...props} />);
}

// ─── Heading & open button ────────────────────────────────────────────────────

describe('LibraryPage — header', () => {
  it('shows "Your Library" heading', () => {
    renderLibrary();
    expect(screen.getByText('Your Library')).toBeInTheDocument();
  });

  it('renders the "+ Open Book" button', () => {
    renderLibrary();
    expect(screen.getByTitle('Open EPUB file')).toBeInTheDocument();
  });

  it('calls onOpenFile when "+ Open Book" is clicked', async () => {
    const onOpenFile = vi.fn();
    renderLibrary({ onOpenFile });
    await userEvent.click(screen.getByTitle('Open EPUB file'));
    expect(onOpenFile).toHaveBeenCalledOnce();
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('LibraryPage — empty state', () => {
  it('shows empty-state message when library is empty', () => {
    renderLibrary({ library: [] });
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
  });

  it('shows empty-state message when library is null', () => {
    renderLibrary({ library: null });
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
  });

  it('shows the hint text in empty state', () => {
    renderLibrary();
    expect(screen.getByText(/Drop an EPUB file here/)).toBeInTheDocument();
  });

  it('does not render any book cards in empty state', () => {
    renderLibrary();
    expect(document.querySelector('.book-card')).toBeNull();
  });
});

// ─── Book cards rendering ─────────────────────────────────────────────────────

describe('LibraryPage — book cards', () => {
  it('renders a card for each book in the library', () => {
    const library = [makeBook({ key: 'a', title: 'Book A' }), makeBook({ key: 'b', title: 'Book B' })];
    renderLibrary({ library });
    expect(screen.getByText('Book A')).toBeInTheDocument();
    expect(screen.getByText('Book B')).toBeInTheDocument();
  });

  it('does not show the empty state when there are books', () => {
    renderLibrary({ library: [makeBook()] });
    expect(screen.queryByText('Your library is empty')).not.toBeInTheDocument();
  });

  it('shows progress percentage on each card', () => {
    renderLibrary({ library: [makeBook({ progress: 0.42 })] });
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows 0% for a book with no progress', () => {
    renderLibrary({ library: [makeBook({ progress: 0 })] });
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 100% for a fully-read book', () => {
    renderLibrary({ library: [makeBook({ progress: 1 })] });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('sets progress-fill width to the correct percentage', () => {
    const { container } = renderLibrary({ library: [makeBook({ progress: 0.73 })] });
    const fill = container.querySelector('.book-progress-fill');
    expect(fill.style.width).toBe('73%');
  });

  it('shows formatted lastOpened date', () => {
    renderLibrary({ library: [makeBook({ lastOpened: TODAY })] });
    const expected = new Date(TODAY).toLocaleDateString();
    expect(screen.getByText(`Opened ${expected}`)).toBeInTheDocument();
  });

  it('does not show date meta when lastOpened is missing', () => {
    renderLibrary({ library: [makeBook({ lastOpened: null })] });
    expect(screen.queryByText(/Opened/)).not.toBeInTheDocument();
  });

  it('renders a remove button for each card', () => {
    const library = [makeBook({ key: 'a' }), makeBook({ key: 'b', title: 'Book B' })];
    renderLibrary({ library });
    expect(screen.getAllByTitle('Remove from library')).toHaveLength(2);
  });

  it('shows initials derived from the book title', () => {
    renderLibrary({ library: [makeBook({ title: 'Brave New World' })] });
    expect(screen.getByText('BN')).toBeInTheDocument();
  });

  it('shows single initial for a one-word title', () => {
    renderLibrary({ library: [makeBook({ title: 'Dune' })] });
    expect(screen.getByText('D')).toBeInTheDocument();
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('LibraryPage — interactions', () => {
  it('calls onOpenFile when a book card is clicked', async () => {
    const onOpenFile = vi.fn();
    renderLibrary({ library: [makeBook()], onOpenFile });
    await userEvent.click(screen.getByText('My Book'));
    expect(onOpenFile).toHaveBeenCalledOnce();
  });

  it('calls onRemove with the book key when remove button is clicked', async () => {
    const onRemove = vi.fn();
    renderLibrary({ library: [makeBook({ key: 'my-book' })], onRemove });
    await userEvent.click(screen.getByTitle('Remove from library'));
    expect(onRemove).toHaveBeenCalledWith('my-book');
  });

  it('does not call onOpenFile when remove button is clicked', async () => {
    const onOpenFile = vi.fn();
    renderLibrary({ library: [makeBook()], onOpenFile });
    await userEvent.click(screen.getByTitle('Remove from library'));
    expect(onOpenFile).not.toHaveBeenCalled();
  });

  it('calls onRemove with the correct key when one of multiple cards is removed', async () => {
    const onRemove = vi.fn();
    const library = [
      makeBook({ key: 'book-a', title: 'Book A' }),
      makeBook({ key: 'book-b', title: 'Book B' }),
    ];
    renderLibrary({ library, onRemove });
    const removeButtons = screen.getAllByTitle('Remove from library');
    await userEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith('book-b');
  });

  it('calls onOpenFile with the correct key when one of multiple cards is clicked', async () => {
    const onOpenFile = vi.fn();
    const library = [
      makeBook({ key: 'book-a', title: 'Book A' }),
      makeBook({ key: 'book-b', title: 'Book B' }),
    ];
    renderLibrary({ library, onOpenFile });
    await userEvent.click(screen.getByText('Book B'));
    expect(onOpenFile).toHaveBeenCalledWith(null, 'book-b');
  });

  it('calls onDragOver when dragging over the page', () => {
    const onDragOver = vi.fn();
    const { container } = renderLibrary({ onDragOver });
    const page = container.querySelector('.library-page');
    page.dispatchEvent(new Event('dragover', { bubbles: true }));
    expect(onDragOver).toHaveBeenCalledOnce();
  });

  it('calls onDrop when dropping on the page', () => {
    const onDrop = vi.fn();
    const { container } = renderLibrary({ onDrop });
    const page = container.querySelector('.library-page');
    page.dispatchEvent(new Event('drop', { bubbles: true }));
    expect(onDrop).toHaveBeenCalledOnce();
  });
});

// ─── Multiple books ordering ──────────────────────────────────────────────────

describe('LibraryPage — ordering', () => {
  it('renders books in the order provided', () => {
    const library = [
      makeBook({ key: 'a', title: 'Alpha' }),
      makeBook({ key: 'b', title: 'Beta' }),
      makeBook({ key: 'c', title: 'Gamma' }),
    ];
    renderLibrary({ library });
    const titles = screen.getAllByText(/Alpha|Beta|Gamma/).map((el) => el.textContent);
    expect(titles).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});
