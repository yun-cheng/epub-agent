import { useState } from 'react';
import { EpubCFI } from 'epubjs';

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
  const [sortAsc, setSortAsc] = useState({ position: true, time: true });

  function handleSort(mode) {
    if (sortMode === mode) {
      setSortAsc(prev => ({ ...prev, [mode]: !prev[mode] }));
    } else {
      setSortMode(mode);
    }
  }

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="sidebar-content">
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>
          Click the bookmark icon to add bookmarks
        </div>
      </div>
    );
  }

  const cfiCompare = new EpubCFI();
  const asc = sortAsc[sortMode];
  const sorted = [...bookmarks].sort((a, b) => {
    let cmp;
    if (sortMode === 'time') cmp = new Date(a.createdAt) - new Date(b.createdAt);
    else { try { cmp = cfiCompare.compare(a.cfi, b.cfi); } catch (e) { cmp = 0; } }
    return asc ? cmp : -cmp;
  });

  return (
    <div className="sidebar-content">
      <div className="highlight-export-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={'btn btn-sm' + (sortMode === 'position' ? ' active' : '')}
              title="Sort by position in book"
              onClick={() => handleSort('position')}
            >
              Book {sortMode === 'position' ? (sortAsc.position ? '↑' : '↓') : ''}
            </button>
            <button
              className={'btn btn-sm' + (sortMode === 'time' ? ' active' : '')}
              title="Sort by date added"
              onClick={() => handleSort('time')}
            >
              Created {sortMode === 'time' ? (sortAsc.time ? '↑' : '↓') : ''}
            </button>
          </div>
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
