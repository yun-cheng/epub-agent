import { useState, useCallback } from 'react';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function SearchPanel({ onSearch, results, searching, onJump }) {
  var [query, setQuery] = useState('');
  var [hasSearched, setHasSearched] = useState(false);

  var handleSubmit = useCallback(function(e) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setHasSearched(true);
    }
  }, [query, onSearch]);

  return (
    <>
      <form className="search-panel" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          placeholder="Search in book..."
          value={query}
          onChange={function(e) { setQuery(e.target.value); }}
          autoFocus
        />
      </form>
      <div className="sidebar-content">
        {searching ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <div style={{ marginTop: 8, fontSize: 12 }}>Searching...</div>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            No results found
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="search-result-count">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            {results.map(function(r, i) {
              // HTML-escape both the excerpt and the query term before building
              // the regex-highlighted HTML, so user-supplied text cannot inject
              // markup via dangerouslySetInnerHTML.
              var safeExcerpt = escapeHtml(r.excerpt || '');
              var safeQuery = escapeRegex(escapeHtml(query));
              var highlighted = safeExcerpt.replace(
                new RegExp('(' + safeQuery + ')', 'gi'),
                '<em>$1</em>'
              );
              return (
                <div
                  key={i}
                  className="search-result-item"
                  onClick={function() { onJump(r.cfi); }}
                >
                  <div
                    className="search-result-excerpt"
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                  <div className="search-result-chapter">{r.chapter}</div>
                </div>
              );
            })}
          </>
        ) : null}
      </div>
    </>
  );
}
