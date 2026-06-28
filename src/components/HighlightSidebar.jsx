import { useState } from 'react';
import { EpubCFI } from 'epubjs';

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (e) { return ''; }
}

const HIGHLIGHT_COLORS = {
  yellow: '#fff3a8',
  red:    '#ffb3b3',
  blue:   '#a8d8ff',
  green:  '#a8e6a8',
  purple: '#d4b3ff',
};

export default function HighlightSidebar({ highlights, onJump, onDelete, onUpdateNote }) {
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [sortMode, setSortMode] = useState('position');
  const [sortAsc, setSortAsc] = useState({ position: true, time: true });
  const [filterColor, setFilterColor] = useState(null);

  function handleSort(mode) {
    if (sortMode === mode) {
      setSortAsc(prev => ({ ...prev, [mode]: !prev[mode] }));
    } else {
      setSortMode(mode);
    }
  }

  if (!highlights || highlights.length === 0) {
    return (
      <div className="sidebar-content">
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>
          Select text to add highlights
        </div>
      </div>
    );
  }

  const cfiCompare = new EpubCFI();
  const asc = sortAsc[sortMode];
  const filtered = filterColor ? highlights.filter(h => h.color === filterColor) : highlights;
  const sorted = [...filtered].sort((a, b) => {
    let cmp;
    if (sortMode === 'time') cmp = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
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
      <div style={{ display: 'flex', gap: 8, padding: '6px 16px 8px' }}>
        {Object.entries(HIGHLIGHT_COLORS).map(([key, hex]) => (
          <div
            key={key}
            title={key}
            onClick={() => setFilterColor(filterColor === key ? null : key)}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              backgroundColor: hex,
              cursor: 'pointer',
              border: filterColor === key ? '2px solid var(--text-primary)' : '2px solid transparent',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>
      {sorted.map((hl) => (
        <div key={hl.id} className="highlight-item" onClick={() => onJump(hl.cfi)}>
          <div
            className="highlight-text"
            style={{ backgroundColor: (HIGHLIGHT_COLORS[hl.color] || hl.colorHex || '#fff3a8') + '60' }}
          >
            {hl.text || '(no text selected)'}
          </div>

          {editingNote === hl.id ? (
            <div style={{ marginTop: 8 }}>
              <textarea
                style={{
                  width: '100%',
                  height: 60,
                  padding: 6,
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setEditingNote(null); }}>
                  Cancel
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateNote(hl.id, noteText);
                    setEditingNote(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : hl.note ? (
            <div className="highlight-note">{hl.note}</div>
          ) : null}

          <div className="highlight-meta">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span className="highlight-chapter">{hl.chapter || ''}</span>
              {hl.createdAt ? <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(hl.createdAt)}</span> : null}
            </div>
            <div className="highlight-actions" onClick={(e) => e.stopPropagation()}>
              {!hl.note && editingNote !== hl.id && (
                <button
                  className="btn-icon"
                  style={{ width: 24, height: 24, fontSize: 11 }}
                  title="Add note"
                  onClick={() => { setEditingNote(hl.id); setNoteText(''); }}
                >
                  📝
                </button>
              )}
              <button
                className="btn-icon"
                style={{ width: 24, height: 24, fontSize: 11, color: '#ff6b6b' }}
                title="Delete"
                onClick={() => onDelete(hl.id)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
