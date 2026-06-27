import { useState } from 'react';

export default function NoteEditor({ cfi, highlights, onSave, onClose }) {
  const existing = highlights.find(h => h.cfi === cfi);
  const [text, setText] = useState(existing?.note || '');

  return (
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor" onClick={(e) => e.stopPropagation()}>
        <h4>{existing ? 'Edit Note' : 'Add Note'}</h4>
        {existing?.text && (
          <div className="selected-text-preview">
            "{existing.text}"
          </div>
        )}
        <textarea
          placeholder="Type your note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="note-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onSave(text)}>Save</button>
        </div>
      </div>
    </div>
  );
}