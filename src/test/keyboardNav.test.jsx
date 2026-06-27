import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

function KeyNavHarness({ isLoaded, onNext, onPrev, onNextChapter, onPrevChapter }) {
  useKeyboardNav({ isLoaded, onNext, onPrev, onNextChapter, onPrevChapter });
  return <div />;
}

function makeHandlers() {
  return {
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onNextChapter: vi.fn(),
    onPrevChapter: vi.fn(),
  };
}

function press(key, target = document) {
  fireEvent.keyDown(target, { key, bubbles: true });
}

afterEach(cleanup);

// ─── When book is not loaded ─────────────────────────────────────────────────

describe('useKeyboardNav — isLoaded=false', () => {
  it('does not respond to any key when isLoaded is false', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={false} {...h} />);
    press('ArrowRight');
    press('ArrowLeft');
    press('ArrowUp');
    press('ArrowDown');
    press('[');
    press(']');
    expect(h.onNext).not.toHaveBeenCalled();
    expect(h.onPrev).not.toHaveBeenCalled();
    expect(h.onNextChapter).not.toHaveBeenCalled();
    expect(h.onPrevChapter).not.toHaveBeenCalled();
  });
});

// ─── Page navigation ─────────────────────────────────────────────────────────

describe('useKeyboardNav — page navigation', () => {
  it('ArrowRight calls onNext', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press('ArrowRight');
    expect(h.onNext).toHaveBeenCalledOnce();
  });

  it('ArrowDown calls onNext', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press('ArrowDown');
    expect(h.onNext).toHaveBeenCalledOnce();
  });

  it('ArrowLeft calls onPrev', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press('ArrowLeft');
    expect(h.onPrev).toHaveBeenCalledOnce();
  });

  it('ArrowUp calls onPrev', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press('ArrowUp');
    expect(h.onPrev).toHaveBeenCalledOnce();
  });

  it('ArrowRight does not call onPrev or chapter handlers', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press('ArrowRight');
    expect(h.onPrev).not.toHaveBeenCalled();
    expect(h.onNextChapter).not.toHaveBeenCalled();
    expect(h.onPrevChapter).not.toHaveBeenCalled();
  });
});

// ─── Chapter navigation ───────────────────────────────────────────────────────

describe('useKeyboardNav — chapter navigation', () => {
  it('] calls onNextChapter', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press(']');
    expect(h.onNextChapter).toHaveBeenCalledOnce();
  });

  it('[ calls onPrevChapter', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press('[');
    expect(h.onPrevChapter).toHaveBeenCalledOnce();
  });

  it('] does not call page nav handlers', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    press(']');
    expect(h.onNext).not.toHaveBeenCalled();
    expect(h.onPrev).not.toHaveBeenCalled();
    expect(h.onPrevChapter).not.toHaveBeenCalled();
  });
});

// ─── Input fields are ignored ─────────────────────────────────────────────────

describe('useKeyboardNav — ignores keypresses in inputs', () => {
  it('does not call onNext when ArrowRight is pressed inside an <input>', () => {
    const h = makeHandlers();
    const { container } = render(
      <>
        <KeyNavHarness isLoaded={true} {...h} />
        <input data-testid="inp" />
      </>
    );
    const input = container.querySelector('input');
    fireEvent.keyDown(input, { key: 'ArrowRight', bubbles: true });
    expect(h.onNext).not.toHaveBeenCalled();
  });

  it('does not call onPrev when ArrowLeft is pressed inside a <textarea>', () => {
    const h = makeHandlers();
    const { container } = render(
      <>
        <KeyNavHarness isLoaded={true} {...h} />
        <textarea />
      </>
    );
    const ta = container.querySelector('textarea');
    fireEvent.keyDown(ta, { key: 'ArrowLeft', bubbles: true });
    expect(h.onPrev).not.toHaveBeenCalled();
  });

  it('does not call chapter nav when [ pressed inside an <input>', () => {
    const h = makeHandlers();
    const { container } = render(
      <>
        <KeyNavHarness isLoaded={true} {...h} />
        <input />
      </>
    );
    fireEvent.keyDown(container.querySelector('input'), { key: '[', bubbles: true });
    expect(h.onPrevChapter).not.toHaveBeenCalled();
  });
});

// ─── Unrelated keys are ignored ───────────────────────────────────────────────

describe('useKeyboardNav — unrelated keys', () => {
  it('does not call any handler for unrelated keys', () => {
    const h = makeHandlers();
    render(<KeyNavHarness isLoaded={true} {...h} />);
    ['Enter', 'Escape', 'Space', 'a', 'f', '1'].forEach(k => press(k));
    expect(h.onNext).not.toHaveBeenCalled();
    expect(h.onPrev).not.toHaveBeenCalled();
    expect(h.onNextChapter).not.toHaveBeenCalled();
    expect(h.onPrevChapter).not.toHaveBeenCalled();
  });
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

describe('useKeyboardNav — cleanup on unmount', () => {
  it('stops responding after the component unmounts', () => {
    const h = makeHandlers();
    const { unmount } = render(<KeyNavHarness isLoaded={true} {...h} />);
    unmount();
    press('ArrowRight');
    expect(h.onNext).not.toHaveBeenCalled();
  });
});
