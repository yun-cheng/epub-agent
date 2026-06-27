# epub-agent

An EPUB reader web app with highlights, bookmarks, full-text search, and reading customization.

> Screenshot here

## Features

- **Library** — grid view of your books with reading progress bars, last-opened dates, and drag-and-drop to add books
- **EPUB reading** — paginated and scroll modes, keyboard navigation (arrow keys to turn pages, bracket keys to jump chapters)
- **Table of contents** — sidebar with spine-synced chapter numbers showing current position
- **Highlights** — five colors, color picker to re-color existing highlights, notes per highlight, export to Markdown or JSON
- **Bookmarks** — add/remove bookmarks at the current location, sort by book order or date added
- **Full-text search** — searches across all spine items, highlights matches temporarily in the reader
- **Typography settings** — font family, font size, line spacing, content width
- **Dark theme** — injected into the EPUB iframe
- **Laser pointer mode** — red dot follows the cursor for presentations
- **URL routing** — deep links to a specific book and chapter (`/book/<name>?chapter=3`)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), then click **+ Open Book** or drag an `.epub` file onto the library page.

### Other commands

```bash
npm run build        # production build
npm run preview      # serve the production build locally
npm test             # unit tests (vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```

## Tech stack

| Layer | Library |
|---|---|
| Framework | React 19 + Vite |
| EPUB rendering | [react-reader](https://github.com/gerhardsletten/react-reader) (epub.js) |
| Popup positioning | @floating-ui/dom |
| Storage | localStorage + IndexedDB (book blobs) |
| Testing | Vitest, Playwright |

## Roadmap

- **AI agent** — answer questions about a book based on reading progress and highlights, using the stored annotations as context
