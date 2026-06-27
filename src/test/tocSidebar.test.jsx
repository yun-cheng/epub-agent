import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TocSidebar from '../components/TocSidebar';

function makeToc(overrides = []) {
  return overrides.length ? overrides : [
    { href: 'chapter1.xhtml', label: 'Introduction', subitems: [] },
    { href: 'chapter2.xhtml', label: 'Chapter One', subitems: [] },
    { href: 'chapter3.xhtml', label: 'Chapter Two', subitems: [] },
  ];
}

function renderSidebar(props = {}) {
  return render(
    <TocSidebar
      toc={makeToc()}
      onNavigate={vi.fn()}
      currentSpineHref={null}
      hrefToSpineIdx={null}
      {...props}
    />
  );
}

// ─── Empty / null state ───────────────────────────────────────────────────────

describe('TocSidebar — empty state', () => {
  it('shows empty message when toc is null', () => {
    render(<TocSidebar toc={null} onNavigate={vi.fn()} />);
    expect(screen.getByText('Table of contents not available')).toBeInTheDocument();
  });

  it('shows empty message when toc is an empty array', () => {
    render(<TocSidebar toc={[]} onNavigate={vi.fn()} />);
    expect(screen.getByText('Table of contents not available')).toBeInTheDocument();
  });
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('TocSidebar — rendering', () => {
  it('renders each chapter label', () => {
    renderSidebar();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Chapter One')).toBeInTheDocument();
    expect(screen.getByText('Chapter Two')).toBeInTheDocument();
  });

  it('uses index+1 as chapter number when hrefToSpineIdx is null', () => {
    renderSidebar({ hrefToSpineIdx: null });
    const buttons = screen.getAllByRole('button');
    // First top-level item gets chapter number 1
    const nums = buttons.map(b => b.querySelector('.chapter-num')?.textContent);
    expect(nums[0]).toBe('1');
    expect(nums[1]).toBe('2');
    expect(nums[2]).toBe('3');
  });

  it('uses hrefToSpineIdx value+1 as chapter number when provided', () => {
    const hrefToSpineIdx = {
      'chapter1.xhtml': 4,
      'chapter2.xhtml': 5,
      'chapter3.xhtml': 6,
    };
    renderSidebar({ hrefToSpineIdx });
    const buttons = screen.getAllByRole('button');
    const nums = buttons.map(b => b.querySelector('.chapter-num')?.textContent);
    expect(nums[0]).toBe('5');
    expect(nums[1]).toBe('6');
    expect(nums[2]).toBe('7');
  });

  it('falls back to index+1 for items missing from hrefToSpineIdx', () => {
    // Only chapter1 is in the map; chapter2 and chapter3 fall back
    const hrefToSpineIdx = { 'chapter1.xhtml': 9 };
    renderSidebar({ hrefToSpineIdx });
    const buttons = screen.getAllByRole('button');
    const nums = buttons.map(b => b.querySelector('.chapter-num')?.textContent);
    expect(nums[0]).toBe('10'); // from hrefToSpineIdx: 9+1
    expect(nums[1]).toBe('2');  // fallback: index 1 + 1
    expect(nums[2]).toBe('3');  // fallback: index 2 + 1
  });

  it('renders sub-items with toc-sub class', () => {
    const toc = [
      {
        href: 'part1.xhtml',
        label: 'Part One',
        subitems: [
          { href: 'part1a.xhtml', label: 'Section A', subitems: [] },
        ],
      },
    ];
    const { container } = renderSidebar({ toc });
    expect(screen.getByText('Section A')).toBeInTheDocument();
    const subBtn = screen.getByText('Section A').closest('button');
    expect(subBtn.classList.contains('toc-sub')).toBe(true);
  });

  it('does not apply toc-sub class to top-level items', () => {
    renderSidebar();
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.classList.contains('sidebar-item')).toBe(true);
    });
    // top-level buttons should not have toc-sub
    const topLevel = buttons.filter(b => b.style.paddingLeft === '16px');
    topLevel.forEach(btn => {
      expect(btn.classList.contains('toc-sub')).toBe(false);
    });
  });

  it('applies active class to the item matching currentSpineHref', () => {
    renderSidebar({ currentSpineHref: 'chapter2.xhtml' });
    const activeBtn = screen.getByText('Chapter One').closest('button');
    expect(activeBtn.classList.contains('active')).toBe(true);
  });

  it('does not apply active class to non-matching items', () => {
    renderSidebar({ currentSpineHref: 'chapter2.xhtml' });
    const btn = screen.getByText('Introduction').closest('button');
    expect(btn.classList.contains('active')).toBe(false);
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('TocSidebar — interactions', () => {
  it('calls onNavigate with the item href when clicked', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });
    await userEvent.click(screen.getByText('Chapter One'));
    expect(onNavigate).toHaveBeenCalledWith('chapter2.xhtml');
  });

  it('calls onNavigate with the correct href for each item', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });
    await userEvent.click(screen.getByText('Introduction'));
    expect(onNavigate).toHaveBeenCalledWith('chapter1.xhtml');
  });

  it('does not call onNavigate when item has no href', async () => {
    const onNavigate = vi.fn();
    const toc = [{ href: '', label: 'No Link', subitems: [] }];
    renderSidebar({ toc, onNavigate });
    await userEvent.click(screen.getByText('No Link'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
