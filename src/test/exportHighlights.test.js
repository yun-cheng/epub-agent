import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toMarkdown, toJSON, downloadFile, exportAs } from '../utils/exportHighlights';

const HL1 = {
  id: 'h1',
  text: 'The journey of a thousand miles',
  chapter: 'Chapter 1',
  color: 'yellow',
  note: 'Great quote',
  cfi: 'epubcfi(/6/4!/4/2/1:0)',
};

const HL2 = {
  id: 'h2',
  text: 'Begin with the end in mind',
  chapter: 'Chapter 2',
  color: 'blue',
  note: '',
  cfi: 'epubcfi(/6/6!/4/2/1:0)',
};

// ─── toMarkdown ───────────────────────────────────────────────────────────────

describe('toMarkdown', () => {
  it('returns a heading line', () => {
    const md = toMarkdown([HL1]);
    expect(md).toContain('# Highlights & Notes');
  });

  it('includes chapter name as a subheading', () => {
    const md = toMarkdown([HL1]);
    expect(md).toContain('Chapter 1');
  });

  it('includes the highlight text as a blockquote', () => {
    const md = toMarkdown([HL1]);
    expect(md).toContain('> The journey of a thousand miles');
  });

  it('includes the note when present', () => {
    const md = toMarkdown([HL1]);
    expect(md).toContain('**Note:** Great quote');
  });

  it('does not include a Note line when note is empty', () => {
    const md = toMarkdown([HL2]);
    expect(md).not.toContain('**Note:**');
  });

  it('includes the color', () => {
    const md = toMarkdown([HL1]);
    expect(md).toContain('yellow');
  });

  it('includes a separator between entries', () => {
    const md = toMarkdown([HL1, HL2]);
    expect(md).toContain('---');
  });

  it('numbers each entry', () => {
    const md = toMarkdown([HL1, HL2]);
    expect(md).toContain('1.');
    expect(md).toContain('2.');
  });

  it('falls back to "Unknown chapter" when chapter is missing', () => {
    const md = toMarkdown([{ ...HL1, chapter: '' }]);
    expect(md).toContain('Unknown chapter');
  });

  it('returns empty-state message for empty array', () => {
    const md = toMarkdown([]);
    expect(md).toContain('no highlights yet');
  });

  it('returns empty-state message for null', () => {
    const md = toMarkdown(null);
    expect(md).toContain('no highlights yet');
  });
});

// ─── toJSON ───────────────────────────────────────────────────────────────────

describe('toJSON', () => {
  it('returns valid JSON string', () => {
    const json = toJSON([HL1]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('round-trips the highlights array', () => {
    const json = toJSON([HL1, HL2]);
    expect(JSON.parse(json)).toEqual([HL1, HL2]);
  });

  it('returns an empty array for empty input', () => {
    expect(JSON.parse(toJSON([]))).toEqual([]);
  });

  it('returns an empty array for null input', () => {
    expect(JSON.parse(toJSON(null))).toEqual([]);
  });

  it('is pretty-printed (contains newlines)', () => {
    const json = toJSON([HL1]);
    expect(json).toContain('\n');
  });
});

// ─── downloadFile ─────────────────────────────────────────────────────────────

describe('downloadFile', () => {
  let appendSpy, removeSpy, clickSpy, createSpy, revokeSpy;

  beforeEach(() => {
    clickSpy = vi.fn();
    appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    createSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    });
    createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers a click on the anchor element', () => {
    downloadFile('hello', 'test.txt', 'text/plain');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('appends then removes the anchor from the body', () => {
    downloadFile('hello', 'test.txt', 'text/plain');
    expect(appendSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after download', () => {
    downloadFile('hello', 'test.txt', 'text/plain');
    expect(revokeSpy).toHaveBeenCalledOnce();
  });
});

// ─── exportAs ─────────────────────────────────────────────────────────────────

describe('exportAs', () => {
  let downloadSpy;

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    downloadSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '', download: '', click: vi.fn(),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('sets download attribute to .json for json format', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    exportAs('json', [HL1], 'My Book');
    expect(anchor.download).toMatch(/\.json$/);
  });

  it('sets download attribute to .md for markdown format', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    exportAs('markdown', [HL1], 'My Book');
    expect(anchor.download).toMatch(/\.md$/);
  });

  it('uses the book title (slugified) in the filename', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    exportAs('json', [HL1], 'My Awesome Book');
    expect(anchor.download).toContain('my-awesome-book');
  });

  it('falls back to "highlights" slug when no title given', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    exportAs('json', [HL1], '');
    expect(anchor.download).toContain('highlights');
  });

  it('does nothing for an unknown format', () => {
    const clickFn = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: clickFn });
    exportAs('pdf', [HL1], 'Book');
    expect(clickFn).not.toHaveBeenCalled();
  });
});
