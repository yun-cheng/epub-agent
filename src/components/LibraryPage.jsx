export default function LibraryPage({ library, onOpenFile, onRemove, onDragOver, onDrop, fileInputRef }) {
  const hasBooks = library && library.length > 0;

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString();
    } catch(e) { return ''; }
  }

  function getInitials(title) {
    return (title || '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  }

  return (
    <div
      className={'library-page' + (hasBooks ? '' : ' library-empty')}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="library-header">
        <h2 className="library-title">Your Library</h2>
        <button className="btn" onClick={onOpenFile} title="Open EPUB file">
          + Open Book
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub"
          className="file-input-hidden"
          onChange={function(e) { if (e.target.files[0]) onOpenFile(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {hasBooks ? (
        <div className="library-grid">
          {library.map((book) => (
            <div key={book.key} className="book-card" onClick={() => onOpenFile(null, book.key)} title={book.title}>
              <div className="book-cover">
                <span className="book-cover-initials">{getInitials(book.title)}</span>
              </div>
              <div className="book-card-info">
                <div className="book-card-title">{book.title}</div>
                <div className="book-card-meta">
                  {book.lastOpened ? <span>Opened {formatDate(book.lastOpened)}</span> : null}
                </div>
                <div className="book-progress-bar">
                  <div
                    className="book-progress-fill"
                    style={{ width: Math.round((book.progress || 0) * 100) + '%' }}
                  />
                </div>
                <div className="book-card-progress">{Math.round((book.progress || 0) * 100)}%</div>
              </div>
              <button
                className="book-card-remove"
                title="Remove from library"
                onClick={(e) => { e.stopPropagation(); onRemove(book.key); }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="library-empty-state">
          <div className="drop-zone-icon">📚</div>
          <div className="drop-zone-text">Your library is empty</div>
          <div className="drop-zone-hint">Drop an EPUB file here or click &ldquo;Open Book&rdquo;</div>
        </div>
      )}
    </div>
  );
}
