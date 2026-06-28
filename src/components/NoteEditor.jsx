import { useState } from 'react';

const COLORS = [
  { key: 'yellow', hex: '#fff3a8' },
  { key: 'green',  hex: '#a8e6a8' },
  { key: 'blue',   hex: '#a8d8ff' },
  { key: 'pink',   hex: '#ffb3d9' },
  { key: 'orange', hex: '#ffcc80' },
];

export default function NoteEditor({ cfi, highlights, selectionText, onSave, onClose }) {
  const existing = highlights.find(h => h.cfi === cfi);
  const [text, setText] = useState(existing?.note || '');
  const [color, setColor] = useState(existing?.color || 'yellow');

  const preview = existing?.text || selectionText || '';

  return (
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor" onClick={(e) => e.stopPropagation()}>
        <h4>{existing ? 'Edit Note' : 'Add Note'}</h4>
        {preview && (
          <div className="selected-text-preview">"{preview}"</div>
        )}
        <div className="note-color-row">
          {COLORS.map(function(c) {
            return (
              <div
                key={c.key}
                className={'note-color-dot' + (color === c.key ? ' selected' : '')}
                style={{ backgroundColor: c.hex }}
                onClick={() => setColor(c.key)}
              />
            );
          })}
        </div>
        <textarea
          placeholder="Type your note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="note-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onSave(text, color)}>Save</button>
        </div>
      </div>
    </div>
  );
}
