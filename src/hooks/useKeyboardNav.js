import { useEffect, useRef } from 'react';

export function useKeyboardNav({ isLoaded, onNext, onPrev, onNextChapter, onPrevChapter }) {
  // Keep latest callbacks in a ref so the stable window listener always calls
  // the current version without re-registering.
  var cbRef = useRef({});
  cbRef.current = { isLoaded, onNext, onPrev, onNextChapter, onPrevChapter };

  // Cooldown: prevents a second navigation within 400 ms. epub.js registers
  // its own arrow-key handler; both can fire for the same keypress in scroll
  // mode, causing 2-chapter jumps.  stopImmediatePropagation alone isn't
  // enough when epub.js registers before our effect runs.
  var lastNavRef = useRef(0);

  // Register on window capture ONCE at mount — before epub.js loads the book
  // and installs its own handler.  Being first in the capture queue means our
  // stopImmediatePropagation() reliably blocks epub.js.
  useEffect(function() {
    function handleKeyDown(e) {
      var cb = cbRef.current;
      if (!cb.isLoaded) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      var isChapterKey =
        e.key === 'ArrowRight' || e.key === 'ArrowLeft' ||
        e.key === ']' || e.key === '[';

      if (isChapterKey) {
        var now = Date.now();
        var tooSoon = now - lastNavRef.current < 400;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (tooSoon) return; // already navigated for this keypress
        lastNavRef.current = now;
        if (e.key === 'ArrowRight' || e.key === ']') cb.onNextChapter();
        else cb.onPrevChapter();
        return;
      }

      if (e.key === 'ArrowDown') { e.preventDefault(); cb.onNext(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cb.onPrev(); }
    }

    function attachToIframe() {
      var iframe = document.querySelector('iframe');
      var iframeWin = iframe && iframe.contentWindow;
      if (iframeWin) {
        iframeWin.removeEventListener('keydown', handleKeyDown, true);
        iframeWin.addEventListener('keydown', handleKeyDown, true);
      }
    }

    // react-reader listens to "keyup" (not keydown) on document for ArrowLeft/Right.
    // Suppress those keyup events so react-reader doesn't also navigate.
    function handleKeyUp(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    attachToIframe();
    var t = setInterval(attachToIframe, 1000);

    return function() {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      clearInterval(t);
      try {
        var iframe = document.querySelector('iframe');
        var iframeWin = iframe && iframe.contentWindow;
        if (iframeWin) iframeWin.removeEventListener('keydown', handleKeyDown, true);
      } catch (err) {}
    };
  }, []); // empty — register once at mount, before react-reader/epub.js register
}
