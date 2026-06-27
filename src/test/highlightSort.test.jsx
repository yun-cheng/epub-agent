import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('epubjs', () => ({
  EpubCFI: class {
    compare(a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
  },
}));

import HighlightSidebar from '../components/HighlightSidebar';

const EARLIER = '2024-01-01T00:00:00.000Z';
const LATER   = '2024-06-01T00:00:00.000Z';

function makeHighlights() {
  return [
    { id: 'hl-c', cfi: 'epubcfi(/cfi-C)', text: 'Text C', color: 'yellow', chapter: 'Ch C', note: '', createdAt: EARLIER },
    { id: 'hl-a', cfi: 'epubcfi(/cfi-A)', text: 'Text A', color: 'green',  chapter: 'Ch A', note: '', createdAt: LATER   },
    { id: 'hl-b', cfi: 'epubcfi(/cfi-B)', text: 'Text B', color: 'blue',   chapter: 'Ch B', note: '', createdAt: EARLIER },
  ];
}

function renderSidebar(highlights, extraProps = {}) {
  return render(
    <HighlightSidebar
      highlights={highlights}
      onJump={vi.fn()}
      onDelete={vi.fn()}
      onUpdateNote={vi.fn()}
      {...extraProps}
    />
  );
}

function getTextOrder() {
  return screen.getAllByText(/Text [ABC]/).map(el => el.textContent);
}

// ─── Sort controls ────────────────────────────────────────────────────────────

describe('HighlightSidebar — sort controls', () => {
  it('renders a "Sort:" label', () => {
    renderSidebar(makeHighlights());
    expect(screen.getByText('Sort:')).toBeInTheDocument();
  });

  it('renders "Book order" sort button', () => {
    renderSidebar(makeHighlights());
    expect(screen.getByTitle('Sort by position in book')).toBeInTheDocument();
  });

  it('renders "Date added" sort button', () => {
    renderSidebar(makeHighlights());
    expect(screen.getByTitle('Sort by date added')).toBeInTheDocument();
  });

  it('does not render an export button in the sidebar', () => {
    renderSidebar(makeHighlights());
    expect(screen.queryByText(/export/i)).not.toBeInTheDocument();
  });
});

// ─── Default sort ─────────────────────────────────────────────────────────────

describe('HighlightSidebar — default sort by position asc', () => {
  it('shows ↑ indicator on Book order button by default', () => {
    renderSidebar(makeHighlights());
    const btn = screen.getByTitle('Sort by position in book');
    expect(btn.textContent).toContain('↑');
  });

  it('lists highlights in CFI ascending order by default', () => {
    renderSidebar(makeHighlights());
    expect(getTextOrder()).toEqual(['Text A', 'Text B', 'Text C']);
  });
});

// ─── Toggle direction ─────────────────────────────────────────────────────────

describe('HighlightSidebar — sort direction toggle', () => {
  it('switches ↑ to ↓ when Book order button is clicked', async () => {
    renderSidebar(makeHighlights());
    const btn = screen.getByTitle('Sort by position in book');
    await userEvent.click(btn);
    expect(btn.textContent).toContain('↓');
  });

  it('reverses order when Book order is clicked a second time', async () => {
    renderSidebar(makeHighlights());
    await userEvent.click(screen.getByTitle('Sort by position in book'));
    expect(getTextOrder()).toEqual(['Text C', 'Text B', 'Text A']);
  });
});

// ─── Date sort ────────────────────────────────────────────────────────────────

describe('HighlightSidebar — date sort', () => {
  it('switches active state to "Date added" when clicked', async () => {
    renderSidebar(makeHighlights());
    await userEvent.click(screen.getByTitle('Sort by date added'));
    expect(screen.getByTitle('Sort by date added').className).toContain('active');
    expect(screen.getByTitle('Sort by position in book').className).not.toContain('active');
  });

  it('sorts highlights by date ascending after clicking Date added', async () => {
    renderSidebar(makeHighlights());
    await userEvent.click(screen.getByTitle('Sort by date added'));
    const order = getTextOrder();
    // LATER item (hl-a) should come after the EARLIER items
    expect(order.indexOf('Text A')).toBeGreaterThan(order.indexOf('Text B'));
    expect(order.indexOf('Text A')).toBeGreaterThan(order.indexOf('Text C'));
  });

  it('reverses date order on a second click of Date added', async () => {
    renderSidebar(makeHighlights());
    const btn = screen.getByTitle('Sort by date added');
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(btn.textContent).toContain('↓');
    expect(getTextOrder()[0]).toBe('Text A');
  });
});
