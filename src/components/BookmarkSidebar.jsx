import { useState } from 'react';

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (e) { return iso; }
}

export default function BookmarkSidebar({ bookmarks, onJump, onDelete }) {
  const [sortMode, setSortMode] = useState('position');

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="sidebar-content">
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>
          Click the bookmark icon to add bookmarks
        </div>
      </div>
    );
  }

  const sorted = [...bookmarks].sort((a, b) => {
    if (sortMode === 'time') return new Date(a.createdAt) - new Date(b.createdAt);
    if (a.cfi < b.cfi) return -1;
    if (a.cfi > b.cfi) return 1;
    return 0;
  });

  return (
    <div className="sidebar-content">
      <div className="highlight-export-bar">
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={'btn btn-sm' + (sortMode === 'position' ? ' active' : '')}
            title="Sort by position in book"
            onClick={() => setSortMode('position')}
          >
            Book order
          </button>
          <button
            className={'btn btn-sm' + (sortMode === 'time' ? ' active' : '')}
            title="Sort by time created"
            onClick={() => setSortMode('time')}
          >
            By time
          </button>
        </div>
      </div>
      {sorted.map((bm) => (
        <div key={bm.id} className="bookmark-item" onClick={() => onJump(bm.cfi)}>
          <span className="bookmark-icon">🔖</span>
          <div className="bookmark-info">
            <div className="bookmark-chapter">{bm.chapter || 'Unknown'}</div>
            <div className="bookmark-cfi">{formatDateTime(bm.createdAt)}</div>
          </div>
          <button
            className="bookmark-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(bm.id); }}
            title="Remove bookmark"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
