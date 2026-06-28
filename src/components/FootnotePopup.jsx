import { useEffect, useRef } from 'react';

export default function FootnotePopup({ content, position, onClose, onJump }) {
  var popupRef = useRef(null);

  useEffect(function() {
    var el = popupRef.current;
    if (!el || !position) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pw = el.offsetWidth || 320;
    var ph = el.offsetHeight || 200;
    var x = Math.min(position.x, vw - pw - 12);
    var y = position.y + 12;
    if (y + ph > vh - 12) y = position.y - ph - 12;
    el.style.left = Math.max(12, x) + 'px';
    el.style.top = Math.max(12, y) + 'px';
  }, [position, content]);

  useEffect(function() {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className="footnote-backdrop" onClick={onClose}>
      <div ref={popupRef} className="footnote-popup" onClick={function(e) { e.stopPropagation(); }}>
        <div className="footnote-popup-header">
          {onJump && (
            <button className="btn-icon" title="Go to location" onClick={onJump} style={{ fontSize: 12 }}>↗</button>
          )}
          <button className="btn-icon" title="Close" onClick={onClose} style={{ fontSize: 14, marginLeft: 'auto' }}>✕</button>
        </div>
        <div
          className="footnote-popup-body"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}
