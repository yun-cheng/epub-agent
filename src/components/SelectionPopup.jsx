import { useEffect, useRef } from 'react';
import { computePosition, flip, shift, offset } from '@floating-ui/dom';

var COLORS = [
  { key: 'yellow', hex: '#fff3a8', label: 'Yellow' },
  { key: 'green', hex: '#a8e6a8', label: 'Green' },
  { key: 'blue', hex: '#a8d8ff', label: 'Blue' },
  { key: 'pink', hex: '#ffb3d9', label: 'Pink' },
  { key: 'orange', hex: '#ffcc80', label: 'Orange' },
];

export default function SelectionPopup({ selection, onHighlight, onNote, onDelete, onClose }) {
  var popupRef = useRef(null);

  useEffect(function() {
    if (!selection || !selection.rect || !popupRef.current) return;

    var rect = selection.rect;

    // Virtual element from the selection/highlight rect for floating-ui to anchor to
    var virtualEl = {
      getBoundingClientRect: function() {
        return {
          x: rect.left,
          y: rect.top,
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom != null ? rect.bottom : rect.top + (rect.height || 0),
          right: rect.right != null ? rect.right : rect.left + (rect.width || 0),
          width: rect.width || 0,
          height: rect.height || 0,
        };
      },
    };

    computePosition(virtualEl, popupRef.current, {
      placement: 'bottom',
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ['top'] }),
        shift({ padding: 8 }),
      ],
    }).then(function(pos) {
      if (!popupRef.current) return;
      popupRef.current.style.left = pos.x + 'px';
      popupRef.current.style.top = pos.y + 'px';
    });
  }, [selection]);

  if (!selection || !selection.rect) return null;

  var isHighlight = !!selection.highlightId;

  function handleCopy() {
    if (selection.text) navigator.clipboard.writeText(selection.text);
    if (onClose) onClose();
  }

  function handleGoogleSearch() {
    if (selection.text) {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(selection.text), '_blank', 'noopener,noreferrer');
    }
    if (onClose) onClose();
  }

  return (
    <div ref={popupRef} className="selection-popup">
      {/* Row 1: color swatches */}
      <div className="popup-row">
        {COLORS.map(function(c) {
          return (
            <div
              key={c.key}
              className="color-dot"
              style={{ backgroundColor: c.hex }}
              title={isHighlight ? 'Change to ' + c.label : c.label}
              onClick={function() { onHighlight(c.key); }}
            />
          );
        })}
      </div>
      {/* Row 2: action buttons */}
      <div className="popup-row popup-actions">
        <button className="popup-btn note" onClick={onNote} title="Add note">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path d="M13.5.5l2 2L5 13H3v-2L13.5.5z"/>
          </svg>
        </button>
        <button className="popup-btn copy" onClick={handleCopy} title="Copy">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path d="M4 2h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm0 1v9h7V3H4zM2 4v9h8v1H2a1 1 0 0 1-1-1V4h1z"/>
          </svg>
        </button>
        <button className="popup-btn google" onClick={handleGoogleSearch} title="Search Google">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
          </svg>
        </button>
        {isHighlight ? (
          <button className="popup-btn delete" onClick={onDelete} title="Delete highlight" style={{ color: '#e05' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
