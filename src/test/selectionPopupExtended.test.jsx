import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectionPopup from '../components/SelectionPopup';

const MOCK_RECT = { top: 100, left: 50, right: 150, bottom: 116, width: 100, height: 16 };
const MOCK_SELECTION = { cfi: 'epubcfi(/6/4!/4/2/1:0)', text: '真正的旅程', rect: MOCK_RECT };

function renderPopup(props = {}) {
  return render(
    <SelectionPopup
      selection={MOCK_SELECTION}
      onHighlight={vi.fn()}
      onNote={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

// ─── Copy button ─────────────────────────────────────────────────────────────

describe('SelectionPopup — Copy', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('renders a Copy button', () => {
    renderPopup();
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
  });

  it('copies the selected text to the clipboard', async () => {
    renderPopup();
    await userEvent.click(screen.getByTitle('Copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('真正的旅程');
  });

  it('calls onClose after copying', async () => {
    const onClose = vi.fn();
    renderPopup({ onClose });
    await userEvent.click(screen.getByTitle('Copy'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not throw if selection text is empty', async () => {
    renderPopup({ selection: { ...MOCK_SELECTION, text: '' } });
    await expect(userEvent.click(screen.getByTitle('Copy'))).resolves.not.toThrow();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});

// ─── Google Search button ─────────────────────────────────────────────────────

describe('SelectionPopup — Google Search', () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('renders a Search Google button', () => {
    renderPopup();
    expect(screen.getByTitle('Search Google')).toBeInTheDocument();
  });

  it('opens a Google search tab with the selected text', async () => {
    renderPopup();
    await userEvent.click(screen.getByTitle('Search Google'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/search?q=' + encodeURIComponent('真正的旅程'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('calls onClose after opening the search tab', async () => {
    const onClose = vi.fn();
    renderPopup({ onClose });
    await userEvent.click(screen.getByTitle('Search Google'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('URL-encodes special characters in the selected text', async () => {
    renderPopup({ selection: { ...MOCK_SELECTION, text: 'hello world & more?' } });
    await userEvent.click(screen.getByTitle('Search Google'));
    const url = openSpy.mock.calls[0][0];
    expect(url).toBe('https://www.google.com/search?q=hello%20world%20%26%20more%3F');
  });

  it('does not open a tab if selection text is empty', async () => {
    renderPopup({ selection: { ...MOCK_SELECTION, text: '' } });
    await userEvent.click(screen.getByTitle('Search Google'));
    expect(openSpy).not.toHaveBeenCalled();
  });
});
