import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectionPopup from '../components/SelectionPopup';
import HighlightSidebar from '../components/HighlightSidebar';

const MOCK_RECT = { top: 100, left: 50, right: 150, bottom: 116, width: 100, height: 16 };
const MOCK_SELECTION = { cfi: 'epubcfi(/6/4!/4/2/1:0)', text: '真正的旅程', rect: MOCK_RECT };

// ─── SelectionPopup ─────────────────────────────────────────────────────────

describe('SelectionPopup', () => {
  it('renders nothing when selection is null', () => {
    const { container } = render(
      <SelectionPopup selection={null} onHighlight={vi.fn()} onNote={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when selection has no rect', () => {
    const { container } = render(
      <SelectionPopup selection={{ cfi: 'x', text: 'hi' }} onHighlight={vi.fn()} onNote={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all five color options', () => {
    render(
      <SelectionPopup selection={MOCK_SELECTION} onHighlight={vi.fn()} onNote={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByTitle('Yellow')).toBeInTheDocument();
    expect(screen.getByTitle('Green')).toBeInTheDocument();
    expect(screen.getByTitle('Blue')).toBeInTheDocument();
    expect(screen.getByTitle('Pink')).toBeInTheDocument();
    expect(screen.getByTitle('Orange')).toBeInTheDocument();
  });

  it('calls onHighlight with the correct color key when a color dot is clicked', async () => {
    const onHighlight = vi.fn();
    render(
      <SelectionPopup selection={MOCK_SELECTION} onHighlight={onHighlight} onNote={vi.fn()} onClose={vi.fn()} />
    );
    await userEvent.click(screen.getByTitle('Yellow'));
    expect(onHighlight).toHaveBeenCalledOnce();
    expect(onHighlight).toHaveBeenCalledWith('yellow');
  });

  it('calls onHighlight with the correct key for each color', async () => {
    const colors = ['Yellow', 'Green', 'Blue', 'Pink', 'Orange'];
    const keys = ['yellow', 'green', 'blue', 'pink', 'orange'];
    for (let i = 0; i < colors.length; i++) {
      const onHighlight = vi.fn();
      const { unmount } = render(
        <SelectionPopup selection={MOCK_SELECTION} onHighlight={onHighlight} onNote={vi.fn()} onClose={vi.fn()} />
      );
      await userEvent.click(screen.getByTitle(colors[i]));
      expect(onHighlight).toHaveBeenCalledWith(keys[i]);
      unmount();
    }
  });

  it('calls onNote when the Note button is clicked', async () => {
    const onNote = vi.fn();
    render(
      <SelectionPopup selection={MOCK_SELECTION} onHighlight={vi.fn()} onNote={onNote} onClose={vi.fn()} />
    );
    await userEvent.click(screen.getByTitle('Add note'));
    expect(onNote).toHaveBeenCalledOnce();
  });

  it('positions the popup above the selection rect', () => {
    const { container } = render(
      <SelectionPopup selection={MOCK_SELECTION} onHighlight={vi.fn()} onNote={vi.fn()} onClose={vi.fn()} />
    );
    const popup = container.querySelector('.selection-popup');
    expect(popup).toBeInTheDocument();
    // centered horizontally on rect, 8px above top
    expect(popup.style.left).toBe(`${MOCK_RECT.left + MOCK_RECT.width / 2}px`);
    expect(popup.style.top).toBe(`${MOCK_RECT.top - 8}px`);
  });
});

// ─── HighlightSidebar ───────────────────────────────────────────────────────

describe('HighlightSidebar', () => {
  it('shows empty state when highlights array is empty', () => {
    render(
      <HighlightSidebar highlights={[]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    expect(screen.getByText('Select text to add highlights')).toBeInTheDocument();
  });

  it('shows empty state when highlights is null', () => {
    render(
      <HighlightSidebar highlights={null} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    expect(screen.getByText('Select text to add highlights')).toBeInTheDocument();
  });

  const makeHighlight = (overrides = {}) => ({
    id: 'hl-1',
    cfi: 'epubcfi(/6/4!/4/2/1:0)',
    text: '真正的旅程',
    color: 'yellow',
    chapter: '序言',
    note: '',
    ...overrides,
  });

  it('renders highlight text', () => {
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    expect(screen.getByText('真正的旅程')).toBeInTheDocument();
  });

  it('applies the correct background color for the highlight color key', () => {
    const { container } = render(
      <HighlightSidebar highlights={[makeHighlight({ color: 'blue' })]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    const textEl = container.querySelector('.highlight-text');
    // blue hex is #a8d8ff, with 60 alpha suffix
    expect(textEl.style.backgroundColor).toContain('rgb');
  });

  it('shows chapter label', () => {
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    expect(screen.getByText('序言')).toBeInTheDocument();
  });

  it('calls onJump with the highlight cfi when clicked', async () => {
    const onJump = vi.fn();
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={onJump} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    await userEvent.click(screen.getByText('真正的旅程'));
    expect(onJump).toHaveBeenCalledWith('epubcfi(/6/4!/4/2/1:0)');
  });

  it('calls onDelete with the highlight id when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={vi.fn()} onDelete={onDelete} onUpdateNote={vi.fn()} />
    );
    await userEvent.click(screen.getByTitle('Delete'));
    expect(onDelete).toHaveBeenCalledWith('hl-1');
  });

  it('shows existing note text', () => {
    render(
      <HighlightSidebar
        highlights={[makeHighlight({ note: 'This is profound' })]}
        onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()}
      />
    );
    expect(screen.getByText('This is profound')).toBeInTheDocument();
  });

  it('opens note editor when add note button is clicked', async () => {
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    await userEvent.click(screen.getByTitle('Add note'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onUpdateNote with id and text when note is saved', async () => {
    const onUpdateNote = vi.fn();
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={onUpdateNote} />
    );
    await userEvent.click(screen.getByTitle('Add note'));
    await userEvent.type(screen.getByRole('textbox'), 'My note');
    await userEvent.click(screen.getByText('Save'));
    expect(onUpdateNote).toHaveBeenCalledWith('hl-1', 'My note');
  });

  it('closes note editor without saving when cancel is clicked', async () => {
    const onUpdateNote = vi.fn();
    render(
      <HighlightSidebar highlights={[makeHighlight()]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={onUpdateNote} />
    );
    await userEvent.click(screen.getByTitle('Add note'));
    await userEvent.type(screen.getByRole('textbox'), 'Draft note');
    await userEvent.click(screen.getByText('Cancel'));
    expect(onUpdateNote).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders multiple highlights', () => {
    const highlights = [
      makeHighlight({ id: 'hl-1', text: '真正的旅程' }),
      makeHighlight({ id: 'hl-2', text: '以一百種眼光', color: 'green', cfi: 'epubcfi(/6/4!/4/2/2:0)' }),
    ];
    render(
      <HighlightSidebar highlights={highlights} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    expect(screen.getByText('真正的旅程')).toBeInTheDocument();
    expect(screen.getByText('以一百種眼光')).toBeInTheDocument();
  });

  it('hides add-note button when the highlight already has a note', () => {
    render(
      <HighlightSidebar
        highlights={[makeHighlight({ note: 'Existing note' })]}
        onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()}
      />
    );
    expect(screen.queryByTitle('Add note')).not.toBeInTheDocument();
  });
});
