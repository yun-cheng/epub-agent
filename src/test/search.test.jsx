import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPanel from '../components/SearchPanel';

const MOCK_RESULTS = [
  {
    cfi: 'epubcfi(/6/4!/4/2/1:10)',
    excerpt: '真正的旅程不是以相同的眼光看一百個地方',
    chapter: '序言',
  },
  {
    cfi: 'epubcfi(/6/4!/4/2/2:5)',
    excerpt: '旅程的意義在於探索未知的自我',
    chapter: '第一章',
  },
];

function renderPanel(props = {}) {
  const defaults = {
    onSearch: vi.fn(),
    results: [],
    searching: false,
    onJump: vi.fn(),
  };
  return render(<SearchPanel {...defaults} {...props} />);
}

// ─── Initial render ─────────────────────────────────────────────────────────

describe('SearchPanel — initial state', () => {
  it('renders the search input', () => {
    renderPanel();
    expect(screen.getByPlaceholderText('Search in book...')).toBeInTheDocument();
  });

  it('shows nothing before any search is submitted', () => {
    renderPanel();
    expect(screen.queryByText(/result/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
  });
});

// ─── Submitting a search ─────────────────────────────────────────────────────

describe('SearchPanel — submitting', () => {
  it('calls onSearch with the trimmed query on form submit', async () => {
    const onSearch = vi.fn();
    renderPanel({ onSearch });
    await userEvent.type(screen.getByPlaceholderText('Search in book...'), '  旅程  ');
    fireEvent.submit(screen.getByPlaceholderText('Search in book...').closest('form'));
    expect(onSearch).toHaveBeenCalledWith('旅程');
  });

  it('does not call onSearch for an empty or whitespace-only query', async () => {
    const onSearch = vi.fn();
    renderPanel({ onSearch });
    fireEvent.submit(screen.getByPlaceholderText('Search in book...').closest('form'));
    expect(onSearch).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText('Search in book...'), '   ');
    fireEvent.submit(screen.getByPlaceholderText('Search in book...').closest('form'));
    expect(onSearch).not.toHaveBeenCalled();
  });
});

// ─── Loading state ───────────────────────────────────────────────────────────

describe('SearchPanel — searching state', () => {
  it('shows a spinner and "Searching..." when searching=true', () => {
    renderPanel({ searching: true });
    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('does not show results while searching', () => {
    renderPanel({ searching: true, results: MOCK_RESULTS });
    expect(screen.queryByText(/result/i)).not.toBeInTheDocument();
  });
});

// ─── No results ──────────────────────────────────────────────────────────────

describe('SearchPanel — no results', () => {
  it('shows "No results found" after a search returns empty results', async () => {
    renderPanel({ results: [] });
    // trigger hasSearched by submitting
    await userEvent.type(screen.getByPlaceholderText('Search in book...'), '沒有這個詞');
    fireEvent.submit(screen.getByPlaceholderText('Search in book...').closest('form'));
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('does not show "No results found" before any search', () => {
    renderPanel({ results: [] });
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });
});

// ─── Results ─────────────────────────────────────────────────────────────────

describe('SearchPanel — displaying results', () => {
  it('shows the result count', () => {
    renderPanel({ results: MOCK_RESULTS });
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  it('uses singular "result" for a single match', () => {
    renderPanel({ results: [MOCK_RESULTS[0]] });
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('renders each result excerpt', () => {
    renderPanel({ results: MOCK_RESULTS });
    expect(screen.getByText(/真正的旅程/)).toBeInTheDocument();
    expect(screen.getByText(/旅程的意義/)).toBeInTheDocument();
  });

  it('renders each result chapter label', () => {
    renderPanel({ results: MOCK_RESULTS });
    expect(screen.getByText('序言')).toBeInTheDocument();
    expect(screen.getByText('第一章')).toBeInTheDocument();
  });

  it('wraps the search term in <em> tags in the excerpt', async () => {
    const { container } = render(
      <SearchPanel
        onSearch={vi.fn()}
        results={[{ cfi: 'x', excerpt: '真正的旅程不是以相同的眼光', chapter: '序言' }]}
        searching={false}
        onJump={vi.fn()}
      />
    );
    await userEvent.type(screen.getByPlaceholderText('Search in book...'), '旅程');
    const excerpt = container.querySelector('.search-result-excerpt');
    expect(excerpt.innerHTML).toContain('<em>旅程</em>');
  });

  it('highlights the query term case-insensitively', async () => {
    // Results render whenever results.length > 0, using the internal query state.
    // Render with results present from the start, then type the query to set it.
    const { container } = render(
      <SearchPanel
        onSearch={vi.fn()}
        results={[{ cfi: 'x', excerpt: 'The quick brown fox', chapter: 'Ch1' }]}
        searching={false}
        onJump={vi.fn()}
      />
    );
    await userEvent.type(screen.getByPlaceholderText('Search in book...'), 'QUICK');
    const excerpt = container.querySelector('.search-result-excerpt');
    expect(excerpt.innerHTML).toContain('<em>quick</em>');
  });

  it('calls onJump with the result cfi when a result is clicked', async () => {
    const onJump = vi.fn();
    renderPanel({ results: MOCK_RESULTS, onJump });
    await userEvent.click(screen.getByText(/真正的旅程/));
    expect(onJump).toHaveBeenCalledWith('epubcfi(/6/4!/4/2/1:10)');
  });

  it('calls onJump with the correct cfi for each result', async () => {
    const onJump = vi.fn();
    renderPanel({ results: MOCK_RESULTS, onJump });
    await userEvent.click(screen.getByText(/旅程的意義/));
    expect(onJump).toHaveBeenCalledWith('epubcfi(/6/4!/4/2/2:5)');
  });
});

// ─── escapeRegex edge cases ───────────────────────────────────────────────────

describe('SearchPanel — regex-special characters in query', () => {
  it('renders without throwing when the query contains regex special chars', () => {
    expect(() =>
      renderPanel({
        results: [{ cfi: 'x', excerpt: 'price is $10.00 (USD)', chapter: 'Ch1' }],
      })
    ).not.toThrow();
  });

  it('highlights literal dots and parens without regex errors', async () => {
    const { container } = render(
      <SearchPanel
        onSearch={vi.fn()}
        results={[{ cfi: 'x', excerpt: 'price is $10.00 (USD)', chapter: 'Ch1' }]}
        searching={false}
        onJump={vi.fn()}
      />
    );
    await userEvent.type(screen.getByPlaceholderText('Search in book...'), '$10.00');
    fireEvent.submit(screen.getByPlaceholderText('Search in book...').closest('form'));
    const excerpt = container.querySelector('.search-result-excerpt');
    expect(excerpt.innerHTML).toContain('<em>$10.00</em>');
  });
});
