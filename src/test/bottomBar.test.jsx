import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomBar from '../components/BottomBar';

function renderBar(props = {}) {
  const defaults = {
    currentPage: 3,
    totalPages: 13,
    progress: 0.2,
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };
  return render(<BottomBar {...defaults} {...props} />);
}

// ─── Display ─────────────────────────────────────────────────────────────────

describe('BottomBar — display', () => {
  it('shows the current page number in the input', () => {
    renderBar({ currentPage: 5, totalPages: 20 });
    expect(screen.getByRole('spinbutton').value).toBe('5');
  });

  it('shows the total pages', () => {
    renderBar({ totalPages: 20 });
    expect(screen.getByText('/ 20')).toBeInTheDocument();
  });

  it('shows rounded progress percentage', () => {
    renderBar({ progress: 0.374 });
    expect(screen.getByText('37%')).toBeInTheDocument();
  });

  it('shows 0% at zero progress', () => {
    renderBar({ progress: 0 });
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 100% at full progress', () => {
    renderBar({ progress: 1 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('sets progress-fill width to the rounded percentage', () => {
    const { container } = renderBar({ progress: 0.456 });
    const fill = container.querySelector('.progress-fill');
    expect(fill.style.width).toBe('46%');
  });

  it('renders prev and next page buttons', () => {
    renderBar();
    expect(screen.getByTitle('Previous page')).toBeInTheDocument();
    expect(screen.getByTitle('Next page')).toBeInTheDocument();
  });

  it('page input respects min/max attributes', () => {
    renderBar({ currentPage: 3, totalPages: 13 });
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '13');
  });

  it('page input is read-only', () => {
    renderBar();
    expect(screen.getByRole('spinbutton')).toHaveAttribute('readonly');
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('BottomBar — interactions', () => {
  it('calls onPrev when the previous page button is clicked', async () => {
    const onPrev = vi.fn();
    renderBar({ onPrev });
    await userEvent.click(screen.getByTitle('Previous page'));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it('calls onNext when the next page button is clicked', async () => {
    const onNext = vi.fn();
    renderBar({ onNext });
    await userEvent.click(screen.getByTitle('Next page'));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('does not call onNext when prev is clicked', async () => {
    const onNext = vi.fn();
    renderBar({ onNext });
    await userEvent.click(screen.getByTitle('Previous page'));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does not call onPrev when next is clicked', async () => {
    const onPrev = vi.fn();
    renderBar({ onPrev });
    await userEvent.click(screen.getByTitle('Next page'));
    expect(onPrev).not.toHaveBeenCalled();
  });
});
