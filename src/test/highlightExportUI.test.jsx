import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HighlightSidebar from '../components/HighlightSidebar';
import * as exportModule from '../utils/exportHighlights';

const HIGHLIGHTS = [
  { id: 'h1', text: 'Hello world', chapter: 'Ch 1', color: 'yellow', note: 'great', cfi: 'epubcfi(/1)' },
  { id: 'h2', text: 'Another line', chapter: 'Ch 2', color: 'blue', note: '', cfi: 'epubcfi(/2)' },
];

function renderSidebar(props = {}) {
  return render(
    <HighlightSidebar
      highlights={HIGHLIGHTS}
      onJump={vi.fn()}
      onDelete={vi.fn()}
      onUpdateNote={vi.fn()}
      bookTitle="Test Book"
      {...props}
    />
  );
}

// ─── Export button visibility ─────────────────────────────────────────────────

describe('HighlightSidebar — export button', () => {
  it('renders the Export button when there are highlights', () => {
    renderSidebar();
    expect(screen.getByTitle('Export highlights')).toBeInTheDocument();
  });

  it('does not render the Export button when highlights list is empty', () => {
    render(
      <HighlightSidebar highlights={[]} onJump={vi.fn()} onDelete={vi.fn()} onUpdateNote={vi.fn()} />
    );
    expect(screen.queryByTitle('Export highlights')).not.toBeInTheDocument();
  });
});

// ─── Export menu toggle ───────────────────────────────────────────────────────

describe('HighlightSidebar — export menu', () => {
  it('menu is hidden initially', () => {
    renderSidebar();
    expect(screen.queryByText('Markdown (.md)')).not.toBeInTheDocument();
    expect(screen.queryByText('JSON (.json)')).not.toBeInTheDocument();
  });

  it('opens the menu when Export button is clicked', async () => {
    renderSidebar();
    await userEvent.click(screen.getByTitle('Export highlights'));
    expect(screen.getByText('Markdown (.md)')).toBeInTheDocument();
    expect(screen.getByText('JSON (.json)')).toBeInTheDocument();
  });

  it('closes the menu when Export button is clicked again', async () => {
    renderSidebar();
    await userEvent.click(screen.getByTitle('Export highlights'));
    await userEvent.click(screen.getByTitle('Export highlights'));
    expect(screen.queryByText('Markdown (.md)')).not.toBeInTheDocument();
  });
});

// ─── Export actions ───────────────────────────────────────────────────────────

describe('HighlightSidebar — export actions', () => {
  let exportSpy;

  beforeEach(() => {
    exportSpy = vi.spyOn(exportModule, 'exportAs').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls exportAs with "markdown" when Markdown is clicked', async () => {
    renderSidebar();
    await userEvent.click(screen.getByTitle('Export highlights'));
    await userEvent.click(screen.getByText('Markdown (.md)'));
    expect(exportSpy).toHaveBeenCalledWith('markdown', HIGHLIGHTS, 'Test Book');
  });

  it('calls exportAs with "json" when JSON is clicked', async () => {
    renderSidebar();
    await userEvent.click(screen.getByTitle('Export highlights'));
    await userEvent.click(screen.getByText('JSON (.json)'));
    expect(exportSpy).toHaveBeenCalledWith('json', HIGHLIGHTS, 'Test Book');
  });

  it('closes the menu after selecting Markdown', async () => {
    renderSidebar();
    await userEvent.click(screen.getByTitle('Export highlights'));
    await userEvent.click(screen.getByText('Markdown (.md)'));
    expect(screen.queryByText('Markdown (.md)')).not.toBeInTheDocument();
  });

  it('closes the menu after selecting JSON', async () => {
    renderSidebar();
    await userEvent.click(screen.getByTitle('Export highlights'));
    await userEvent.click(screen.getByText('JSON (.json)'));
    expect(screen.queryByText('JSON (.json)')).not.toBeInTheDocument();
  });

  it('passes the bookTitle prop to exportAs', async () => {
    renderSidebar({ bookTitle: 'My Novel' });
    await userEvent.click(screen.getByTitle('Export highlights'));
    await userEvent.click(screen.getByText('JSON (.json)'));
    expect(exportSpy).toHaveBeenCalledWith('json', HIGHLIGHTS, 'My Novel');
  });
});
