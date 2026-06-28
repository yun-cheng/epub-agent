import { useState, useRef, useCallback, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { ReactReader } from 'react-reader';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import TocSidebar from './components/TocSidebar';
import HighlightSidebar from './components/HighlightSidebar';
import BookmarkSidebar from './components/BookmarkSidebar';
import SearchPanel from './components/SearchPanel';
import SelectionPopup from './components/SelectionPopup';
import NoteEditor from './components/NoteEditor';
import FootnotePopup from './components/FootnotePopup';
import BottomBar from './components/BottomBar';
import LibraryPage from './components/LibraryPage';
import { exportAs } from './utils/exportHighlights';

// --- IndexedDB helpers for persisting epub blobs across sessions ---
var _IDB_DB = null;
function getEpubDb() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open('nr_epub_db', 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore('epubs'); };
    req.onsuccess = function(e) { _IDB_DB = e.target.result; resolve(_IDB_DB); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}
function saveEpubBlob(key, blob) {
  return getEpubDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('epubs', 'readwrite');
      tx.objectStore('epubs').put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}
function loadEpubBlob(key) {
  return getEpubDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction('epubs', 'readonly').objectStore('epubs').get(key);
      req.onsuccess = function(e) { resolve(e.target.result || null); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}
function deleteEpubBlob(key) {
  return getEpubDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('epubs', 'readwrite');
      tx.objectStore('epubs').delete(key);
      tx.oncomplete = resolve;
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

// --- History API routing (SPA, vite historyApiFallback) ---
// Library:       /library
// Book:          /book/{encodedKey}
// Book+chapter:  /book/{encodedKey}?chapter={spineIndex}
function parseAppPath() {
  var path = window.location.pathname;
  var m = path.match(/^\/book\/([^?/]+)/);
  if (m) {
    var params = new URLSearchParams(window.location.search);
    var ch = params.get('chapter');
    // chapter in URL is 1-based; convert to 0-based spine index internally
    return { view: 'book', bookKey: decodeURIComponent(m[1]), chapter: ch != null ? parseInt(ch, 10) - 1 : null };
  }
  return { view: 'library' };
}
function setBookPath(bookKey, chapterIndex) {
  var p = '/book/' + encodeURIComponent(bookKey);
  // URL uses 1-based chapter number to match TOC display
  var q = chapterIndex != null ? '?chapter=' + (chapterIndex + 1) : '';
  var currentMatch = window.location.pathname.match(/^\/book\/([^?/]+)/);
  var currentKey = currentMatch ? decodeURIComponent(currentMatch[1]) : null;
  if (currentKey === bookKey) {
    history.replaceState(null, '', p + q);
  } else {
    history.pushState(null, '', p + q);
  }
}
function setLibraryPath() {
  if (window.location.pathname !== '/library') history.pushState(null, '', '/library');
}

const HIGHLIGHT_COLORS = {
  yellow: '#fff3a8',
  red:    '#ffb3b3',
  blue:   '#a8d8ff',
  green:  '#a8e6a8',
  purple: '#d4b3ff',
};

const FONT_FAMILIES = [
  { value: 'serif', label: 'Serif (Default)' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Lucida Console, monospace', label: 'Lucida' },
];

const LINE_SPACINGS = [1, 1.2, 1.5, 1.75, 2];

const DARK_THEME_CSS = [
  'body { background: #1a1a1a !important; color: #d4d4d4 !important; padding-top: 60px !important; padding-bottom: 60px !important; }',
  '* { background-color: transparent !important; }',
  'p, div, span, li, h1, h2, h3, h4, h5, h6, a { color: #d4d4d4 !important; }',
  'a { color: #6c8cff !important; }',
  'img { opacity: 0.8; }',
].join('\n');

const storage = {
  get: function(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  },
  set: function(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
};

export default function App() {
  var _bookUrl = useState(null);
  var bookUrl = _bookUrl[0];
  var setBookUrl = _bookUrl[1];
  var _bookName = useState('');
  var bookName = _bookName[0];
  var setBookName = _bookName[1];
  var _location = useLocalStorage('nr_location', null);
  var location = _location[0];
  var setLocation = _location[1];
  var _totalPages = useState(0);
  var totalPages = _totalPages[0];
  var setTotalPages = _totalPages[1];
  var _currentPage = useState(0);
  var currentPage = _currentPage[0];
  var setCurrentPage = _currentPage[1];
  var _progress = useState(0);
  var progress = _progress[0];
  var setProgress = _progress[1];
  var _isLoaded = useState(false);
  var isLoaded = _isLoaded[0];
  var setIsLoaded = _isLoaded[1];
  var _toc = useState([]);
  var toc = _toc[0];
  var setToc = _toc[1];
  var _currentSpineHref = useState(null);
  var currentSpineHref = _currentSpineHref[0];
  var setCurrentSpineHref = _currentSpineHref[1];
  var _currentSpineIdx = useState(0);
  var currentSpineIdx = _currentSpineIdx[0];
  var setCurrentSpineIdx = _currentSpineIdx[1];
  var _totalSpineItems = useState(0);
  var totalSpineItems = _totalSpineItems[0];
  var setTotalSpineItems = _totalSpineItems[1];
  var _chapterInputVal = useState('');
  var chapterInputVal = _chapterInputVal[0];
  var setChapterInputVal = _chapterInputVal[1];
  var _hrefToSpineIdx = useState({});
  var hrefToSpineIdx = _hrefToSpineIdx[0];
  var setHrefToSpineIdx = _hrefToSpineIdx[1];
  var _showExportMenu = useState(false);
  var showExportMenu = _showExportMenu[0];
  var setShowExportMenu = _showExportMenu[1];
  var _laserMode = useState(false);
  var laserMode = _laserMode[0];
  var setLaserMode = _laserMode[1];
  var _laserPos = useState({ x: 0, y: 0 });
  var laserPos = _laserPos[0];
  var setLaserPos = _laserPos[1];
  var _lightboxSrc = useState(null);
  var lightboxSrc = _lightboxSrc[0];
  var setLightboxSrc = _lightboxSrc[1];
  var _lightboxTransform = useState({ zoom: 1, tx: 0, ty: 0 });
  var lightboxTransform = _lightboxTransform[0];
  var setLightboxTransform = _lightboxTransform[1];
  var lightboxImgRef = useRef(null);
  var lightboxDraggedRef = useRef(false);
  var _imgMenu = useState(null); // { x, y, img }
  var imgMenu = _imgMenu[0];
  var setImgMenu = _imgMenu[1];
  var _footnote = useState(null); // { content, position, href }
  var footnote = _footnote[0];
  var setFootnote = _footnote[1];


  var _leftSidebar = useLocalStorage('nr_leftSidebar', 'none');
  var leftSidebar = _leftSidebar[0];
  var setLeftSidebar = _leftSidebar[1];
  var _rightSidebar = useLocalStorage('nr_rightSidebar', 'none');
  var rightSidebar = _rightSidebar[0];
  var setRightSidebar = _rightSidebar[1];

  var _toast = useState(null);
  var toast = _toast[0];
  var setToast = _toast[1];

  var _fontSize = useLocalStorage('nr_fontSize', 16);
  var fontSize = _fontSize[0];
  var setFontSize = _fontSize[1];
  var _fontFamily = useLocalStorage('nr_fontFamily', 'serif');
  var fontFamily = _fontFamily[0];
  var setFontFamily = _fontFamily[1];
  var _lineSpacing = useLocalStorage('nr_lineSpacing', 1.5);
  var lineSpacing = _lineSpacing[0];
  var setLineSpacing = _lineSpacing[1];
  var _pageWidth = useLocalStorage('nr_pageWidth', 900);
  var pageWidth = _pageWidth[0];
  var setPageWidth = _pageWidth[1];
  var _pageWidthDraft = useState(null);
  var pageWidthDraft = _pageWidthDraft[0];
  var setPageWidthDraft = _pageWidthDraft[1];
  var _scrollMode = useLocalStorage('nr_scrollMode', false);
  var scrollMode = _scrollMode[0];
  var setScrollMode = _scrollMode[1];
  var _wholeBookPages = useLocalStorage('nr_wholeBookPages', true);
  var wholeBookPages = _wholeBookPages[0];
  var setWholeBookPages = _wholeBookPages[1];
  var _popupTrigger = useLocalStorage('nr_popupTrigger', 'auto');
  var popupTrigger = _popupTrigger[0];
  var setPopupTrigger = _popupTrigger[1];

  var _highlights = useLocalStorage('nr_highlights', []);
  var highlights = _highlights[0];
  var setHighlights = _highlights[1];
  var _bookmarks = useLocalStorage('nr_bookmarks', []);
  var bookmarks = _bookmarks[0];
  var setBookmarks = _bookmarks[1];
  var _library = useLocalStorage('nr_library', []);
  var library = _library[0];
  var setLibrary = _library[1];

  var _selection = useState(null);
  var selection = _selection[0];
  var setSelection = _selection[1];
  var _showNoteEditor = useState(false);
  var showNoteEditor = _showNoteEditor[0];
  var setShowNoteEditor = _showNoteEditor[1];
  var _noteCfi = useState(null);
  var noteCfi = _noteCfi[0];
  var setNoteCfi = _noteCfi[1];
  var _noteSelectionText = useState('');
  var noteSelectionText = _noteSelectionText[0];
  var setNoteSelectionText = _noteSelectionText[1];

  var _searchResults = useState([]);
  var searchResults = _searchResults[0];
  var setSearchResults = _searchResults[1];
  var _searching = useState(false);
  var searching = _searching[0];
  var setSearching = _searching[1];

  var renditionRef = useRef(null);
  var highlightsRef = useRef(highlights);
  var readerContentRef = useRef(null);

  var fileInputRef = useRef(null);
  var showToastTimeoutRef = useRef(null);
  var hlClickRef = useRef(null);
  var popupTriggerRef = useRef('auto');
  var pendingScrollCfi = useRef(null);

  // Clear the toast timeout on unmount to prevent a setState-on-unmounted-component warning.
  useEffect(function() {
    return function() { clearTimeout(showToastTimeoutRef.current); };
  }, []);

  useEffect(function() { highlightsRef.current = highlights; }, [highlights]);
  useEffect(function() { popupTriggerRef.current = popupTrigger; }, [popupTrigger]);
  useEffect(function() {
    if (!laserMode) return;
    function onMouseMove(e) { setLaserPos({ x: e.clientX, y: e.clientY }); }
    window.addEventListener('mousemove', onMouseMove);

    var iframeListeners = [];
    function attachIframeListener() {
      var iframes = document.querySelectorAll('.epub-container iframe');
      iframes.forEach(function(iframe) {
        if (iframe._laserAttached) return;
        try {
          var iframeWin = iframe.contentWindow;
          var iframeDoc = iframe.contentDocument;
          if (!iframeWin || !iframeDoc) return;
          function onIframeMouseMove(e) {
            var rect = iframe.getBoundingClientRect();
            setLaserPos({ x: rect.left + e.clientX, y: rect.top + e.clientY });
          }
          iframeWin.addEventListener('mousemove', onIframeMouseMove);
          var style = iframeDoc.createElement('style');
          style.id = 'laser-cursor';
          style.textContent = '* { cursor: none !important; user-select: none !important; }';
          iframeDoc.head.appendChild(style);
          iframe._laserAttached = true;
          iframeListeners.push({ win: iframeWin, fn: onIframeMouseMove, doc: iframeDoc });
        } catch(err) {}
      });
    }

    attachIframeListener();
    var interval = setInterval(attachIframeListener, 500);

    return function() {
      window.removeEventListener('mousemove', onMouseMove);
      clearInterval(interval);
      iframeListeners.forEach(function(item) {
        try { item.win.removeEventListener('mousemove', item.fn); } catch(e) {}
        try {
          var s = item.doc && item.doc.getElementById('laser-cursor');
          if (s) s.remove();
        } catch(e) {}
      });
      document.querySelectorAll('.epub-container iframe').forEach(function(f) {
        delete f._laserAttached;
      });
    };
  }, [laserMode]);

  // Image right-click → custom context menu
  useEffect(function() {
    var attached = [];
    function attachImageHandlers() {
      var iframes = document.querySelectorAll('.epub-container iframe');
      iframes.forEach(function(iframe) {
        if (iframe._imgContextAttached) return;
        try {
          var doc = iframe.contentDocument;
          if (!doc) return;
          function onContextMenu(e) {
            if (e.target.tagName !== 'IMG') return;
            e.preventDefault();
            var iframeRect = iframe.getBoundingClientRect();
            setImgMenu({ x: iframeRect.left + e.clientX, y: iframeRect.top + e.clientY, img: e.target });
          }
          doc.addEventListener('contextmenu', onContextMenu);
          iframe._imgContextAttached = true;
          attached.push({ doc: doc, fn: onContextMenu, iframe: iframe });
        } catch (e) {}
      });
    }
    attachImageHandlers();
    var interval = setInterval(attachImageHandlers, 500);
    return function() {
      clearInterval(interval);
      attached.forEach(function(item) {
        try { item.doc.removeEventListener('contextmenu', item.fn); } catch (e) {}
        delete item.iframe._imgContextAttached;
      });
    };
  }, []);

  // Image click → lightbox
  useEffect(function() {
    var attached = [];
    function attachLightboxHandlers() {
      var iframes = document.querySelectorAll('.epub-container iframe');
      iframes.forEach(function(iframe) {
        if (iframe._imgLightboxAttached) return;
        try {
          var doc = iframe.contentDocument;
          if (!doc) return;
          function onImgClick(e) {
            if (e.target.tagName === 'IMG') {
              setLightboxSrc(e.target.src);
              setLightboxTransform({ zoom: 1, tx: 0, ty: 0 });
            }
          }
          // cursor: pointer on images
          var style = doc.createElement('style');
          style.id = 'lightbox-cursor';
          style.textContent = 'img { cursor: pointer !important; }';
          doc.head.appendChild(style);
          doc.addEventListener('click', onImgClick);
          iframe._imgLightboxAttached = true;
          attached.push({ doc: doc, fn: onImgClick, iframe: iframe });
        } catch (e) {}
      });
    }
    attachLightboxHandlers();
    var interval = setInterval(attachLightboxHandlers, 500);
    return function() {
      clearInterval(interval);
      attached.forEach(function(item) {
        try { item.doc.removeEventListener('click', item.fn); } catch (e) {}
        try { var s = item.doc.getElementById('lightbox-cursor'); if (s) s.remove(); } catch (e) {}
        delete item.iframe._imgLightboxAttached;
      });
    };
  }, []);

  // Footnote link interception — intercept internal <a> clicks, show popup instead of navigating
  useEffect(function() {
    var attached = [];
    function attachFootnoteHandlers() {
      var iframes = document.querySelectorAll('.epub-container iframe');
      iframes.forEach(function(iframe) {
        try {
          var doc = iframe.contentDocument;
          if (!doc || !doc.body) return;
          if (iframe._footnoteAttachedDoc === doc) return;
          // Detach from old doc if any
          if (iframe._footnoteAttachedFn && iframe._footnoteAttachedDoc) {
            try { iframe._footnoteAttachedDoc.removeEventListener('click', iframe._footnoteAttachedFn, true); } catch (e) {}
          }
          function onLinkClick(e) {
            var anchor = e.target.closest('a');
            if (!anchor || !anchor.href) return;
            var href = anchor.getAttribute('href');
            if (!href) return;
            // Only handle internal links (anchor-only or relative)
            var isAnchorOnly = href.startsWith('#');
            var isRelative = !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('//');
            if (!isAnchorOnly && !isRelative) return;
            e.preventDefault();
            e.stopPropagation();
            var iframeRect = iframe.getBoundingClientRect();
            var clickPos = { x: iframeRect.left + e.clientX, y: iframeRect.top + e.clientY };
            // Resolve fragment and base href
            var fragment = href.includes('#') ? href.split('#')[1] : null;
            var hrefBase = href.includes('#') ? href.split('#')[0] : '';
            // Try same-chapter lookup first
            if (!hrefBase || isAnchorOnly) {
              var target = fragment && doc.getElementById(fragment);
              if (target) {
                setFootnote({ content: sanitizeFootnoteHtml(target.innerHTML), position: clickPos, href: href });
                return;
              }
            }
            // Cross-chapter: load spine item
            var rend = renditionRef.current;
            if (!rend || !rend.book) return;
            var currentHref = rend.book.spine.get(rend.location && rend.location.start && rend.location.start.cfi);
            var resolvedHref = hrefBase || (currentHref && currentHref.href) || '';
            var section = rend.book.spine.get(resolvedHref);
            if (!section) {
              // Fallback: navigate normally
              goToLocation(href);
              return;
            }
            section.load(rend.book.load.bind(rend.book)).then(function(sectionDoc) {
              var el = fragment ? sectionDoc.getElementById(fragment) : sectionDoc.body;
              if (el) {
                setFootnote({ content: sanitizeFootnoteHtml(el.innerHTML), position: clickPos, href: href });
              } else {
                goToLocation(href);
              }
              section.unload();
            }).catch(function() { goToLocation(href); });
          }
          doc.addEventListener('click', onLinkClick, true);
          iframe._footnoteAttachedDoc = doc;
          iframe._footnoteAttachedFn = onLinkClick;
          attached.push({ doc: doc, fn: onLinkClick, iframe: iframe });
        } catch (e) {}
      });
    }
    attachFootnoteHandlers();
    var interval = setInterval(attachFootnoteHandlers, 500);
    return function() {
      clearInterval(interval);
      attached.forEach(function(item) {
        try { item.doc.removeEventListener('click', item.fn, true); } catch (e) {}
        delete item.iframe._footnoteAttachedDoc;
        delete item.iframe._footnoteAttachedFn;
      });
    };
  }, []);

  function sanitizeFootnoteHtml(html) {
    // Strip scripts, keep text and basic formatting
    return (html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  }

  // On mount: restore from hash (deep link to book+chapter)
  useEffect(function() {
    var parsed = parseAppPath();
    if (parsed.view === 'library') {
      setLibraryPath();
    } else if (parsed.view === 'book') {
      loadEpubBlob(parsed.bookKey).then(function(blob) {
        if (!blob) return;
        var file = new File([blob], parsed.bookKey + '.epub', { type: 'application/epub+zip' });
        var reader = new FileReader();
        reader.onload = function(e) { setBookUrl(e.target.result); };
        reader.readAsArrayBuffer(file);
        setBookName(parsed.bookKey);
        // Restore scroll: use stored CFI for this chapter, fall back to last known location
        var restoredCfi = (parsed.chapter != null
          ? storage.get('nr_chapter_cfi_' + parsed.bookKey + '_' + parsed.chapter, null)
          : null) || storage.get('nr_location_' + parsed.bookKey, null);
        setLocation(restoredCfi);
        upsertLibrary(parsed.bookKey, parsed.bookKey, storage.get('nr_progress_' + parsed.bookKey, 0));
      }).catch(function() {});
    }
    // browser back/forward
    function onPopState() {
      var p = parseAppPath();
      if (p.view === 'library') {
        setBookUrl(null);
        setBookName('');
        setLocation(null);
      } else if (p.view === 'book') {
        loadEpubBlob(p.bookKey).then(function(blob) {
          if (!blob) return;
          var file2 = new File([blob], p.bookKey + '.epub', { type: 'application/epub+zip' });
          var r2 = new FileReader();
          r2.onload = function(e) { setBookUrl(e.target.result); };
          r2.readAsArrayBuffer(file2);
          setBookName(p.bookKey);
          var popCfi = (p.chapter != null
            ? storage.get('nr_chapter_cfi_' + p.bookKey + '_' + p.chapter, null)
            : null) || storage.get('nr_location_' + p.bookKey, null);
          if (popCfi) setLocation(popCfi);
        }).catch(function() {});
      }
    }
    window.addEventListener('popstate', onPopState);
    return function() { window.removeEventListener('popstate', onPopState); };
  }, []);

  function showToastMsg(msg) {
    setToast(msg);
    if (showToastTimeoutRef.current) clearTimeout(showToastTimeoutRef.current);
    showToastTimeoutRef.current = setTimeout(function() { setToast(null); }, 2000);
  }

  function upsertLibrary(key, title, progress) {
    setLibrary(function(prev) {
      var now = new Date().toISOString();
      var exists = (prev || []).some(function(b) { return b.key === key; });
      if (exists) {
        return prev.map(function(b) {
          return b.key === key
            ? { key: b.key, title: title || b.title, progress: progress != null ? progress : b.progress, lastOpened: now }
            : b;
        });
      }
      return [{ key: key, title: title || key, progress: progress || 0, lastOpened: now }].concat(prev || []);
    });
  }

  function removeFromLibrary(key) {
    setLibrary(function(prev) { return (prev || []).filter(function(b) { return b.key !== key; }); });
    deleteEpubBlob(key).catch(function() {});
  }

  function handleFile(file) {
    if (!file || !file.name.endsWith('.epub')) {
      showToastMsg('Please select an .epub file');
      return;
    }
    var bookKey = file.name.replace(/\.epub$/i, '');
    setIsLoaded(false);
    setTotalPages(0);
    setCurrentPage(0);
    setProgress(0);
    setSelection(null);
    setSearchResults([]);
    var reader = new FileReader();
    reader.onload = function(e) {
      setBookUrl(e.target.result);
    };
    reader.readAsArrayBuffer(file);
    saveEpubBlob(bookKey, file).catch(function(e) { console.warn('epub save failed:', e); });
    setBookName(bookKey);
    var savedLoc = storage.get('nr_location_' + bookKey, null);
    setLocation(savedLoc);
    upsertLibrary(bookKey, bookKey, storage.get('nr_progress_' + bookKey, 0));
    // Pass null for chapter index — we don't know the spine index yet at load time.
    // The URL will be updated correctly once onLocationChange fires with a real index.
    setBookPath(bookKey, null);
    showToastMsg('Loaded: ' + file.name);
  }

  function closeBook() {
    setBookUrl(null);
    setBookName('');
    setIsLoaded(false);
    setSelection(null);
    setSearchResults([]);
    setRightSidebar('none');
    setLeftSidebar('none');
    setLibraryPath();
  }

  function getChapterName(cfi) {
    if (!cfi || !toc.length) return 'Unknown';
    try {
      // Get the spine item for this CFI from epub.js, then match its href
      // against the TOC. Matching directly on the CFI string doesn't work
      // because CFIs don't contain file paths.
      var spineHref = null;
      var rend = renditionRef.current;
      if (rend && rend.book && rend.book.spine) {
        var spineItem = rend.book.spine.get(cfi);
        if (spineItem && spineItem.href) {
          spineHref = spineItem.href.split('#')[0];
        }
      }
      if (!spineHref) return toc[0] ? toc[0].label : 'Unknown';

      // Find the last TOC entry whose href base matches the spine href
      var bestMatch = toc[0] ? toc[0].label : 'Unknown';
      for (var i = 0; i < toc.length; i++) {
        if (!toc[i].href) continue;
        var tocBase = toc[i].href.split('#')[0];
        if (tocBase === spineHref || spineHref.endsWith('/' + tocBase) || tocBase.endsWith('/' + spineHref)) {
          bestMatch = toc[i].label;
        }
      }
      return bestMatch;
    } catch (e) { return 'Unknown'; }
  }

  function updatePagination(start) {
    if (wholeBookPages && start.percentage !== undefined && start.percentage > 0) {
      // Estimate total pages from spine length (each spine item ≈ 2 pages in paged mode)
      var estimatedTotal = 1000;
      try {
        var rend = renditionRef.current;
        if (rend && rend.book && rend.book.spine) {
          var spineLen = rend.book.spine.length || 0;
          if (spineLen > 5) estimatedTotal = spineLen * 2;
        }
      } catch (e) {}
      var estPage = Math.max(1, Math.ceil(start.percentage * estimatedTotal));
      setCurrentPage(estPage);
      setTotalPages(estimatedTotal);
      setProgress(start.percentage);
    } else if (start.displayed && start.displayed.total > 0) {
      var page = parseInt(start.displayed.page, 10) || 0;
      var total = parseInt(start.displayed.total, 10) || 0;
      if (total > 0) {
        setCurrentPage(page);
        setTotalPages(total);
        setProgress(page / total);
      }
    } else if (start.percentage !== undefined) {
      setProgress(parseFloat(start.percentage) || 0);
    }
  }

  // Lifted out of onLocationChange so refreshPagination can call it too.
  // Updates chapter counter, TOC highlight (via currentSpineHref), and total chapters.
  function applySpineIdx(idx, r, cfi) {
    if (cfi) storage.set('nr_chapter_cfi_' + bookName + '_' + idx, cfi);
    setBookPath(bookName, idx);
    try {
      var si = r.book && r.book.spine && r.book.spine.get(idx);
      if (si && si.href) setCurrentSpineHref(si.href);
      var spLen = r.book && r.book.spine && r.book.spine.length;
      if (spLen) setTotalSpineItems(spLen);
      setCurrentSpineIdx(idx);
      setChapterInputVal(String(idx + 1));
    } catch(ex) {}
  }

  function readCurrentLocation(rend, callback) {
    try {
      var currentLoc = rend.currentLocation ? rend.currentLocation() : null;
      if (currentLoc && currentLoc.then) {
        currentLoc.then(function(result) { if (result && result.start) callback(result.start, rend); });
      } else if (currentLoc && currentLoc.start) {
        callback(currentLoc.start, rend);
      } else if (rend.location && rend.location.start) {
        callback(rend.location.start, rend);
      }
    } catch (e) {}
  }

  function onLocationChange(loc) {
    // react-reader passes loc as a CFI string, not the Location object
    if (typeof loc === 'string') {
      setLocation(loc);
      storage.set('nr_location_' + bookName, loc);
      storage.set('nr_progress_' + bookName, progress);
      upsertLibrary(bookName, bookName, progress);
      if (renditionRef.current) {
        var rend = renditionRef.current;
        readCurrentLocation(rend, function(start, r) {
          updatePagination(start);
          if (bookName) applySpineIdx(start.index, r, loc);
        });
      }
    } else if (loc && loc.start && loc.start.cfi) {
      setLocation(loc.start.cfi);
      storage.set('nr_location_' + bookName, loc.start.cfi);
      if (loc.start.displayed && loc.start.displayed.total > 0) {
        var page = parseInt(loc.start.displayed.page, 10) || 0;
        var total = parseInt(loc.start.displayed.total, 10) || 0;
        if (total > 0) {
          setCurrentPage(page);
          setTotalPages(total);
          setProgress(page / total);
        }
      }
    }
  }

  function refreshPagination() {
    var rend = renditionRef.current;
    if (!rend) return;
    readCurrentLocation(rend, function(start, r) {
      if (start.percentage > 0 || (start.displayed && start.displayed.total > 0)) {
        updatePagination(start);
      }
      // Always refresh chapter counter + TOC highlight on initial load
      if (bookName) applySpineIdx(start.index, r, null);
    });
  }

  function getRendition(rendition) {
    renditionRef.current = rendition;
    if (scrollMode) {
      try {
        rendition.flow('scrolled-doc');
      } catch (e) {
        console.warn('Flow change failed:', e);
      }
    }
    applySettingsToRendition(rendition);
        // Re-measure iframe height at 300ms and 1s — fonts may reflow content after initial paint
    function remeasureIframeHeight() {
      try {
        if (!scrollMode) return;
        var iframeEl = document.querySelector('.reader-content.scroll-mode iframe');
        if (!iframeEl || !iframeEl.contentWindow) return;
        var h = iframeEl.contentWindow.document.body.scrollHeight;
        if (h > 200) iframeEl.style.height = (h + 80) + 'px';
      } catch (e) {}
    }
    setTimeout(remeasureIframeHeight, 300);
    setTimeout(remeasureIframeHeight, 1000);
    // Fix: retry pagination after book has rendered (initial load shows 0/0 otherwise)
    setTimeout(refreshPagination, 400);
    setTimeout(refreshPagination, 1000);
    // Scroll-mode: restore saved scrollTop once after the first relocated event.
    // The scroll position is saved continuously by the scroll listener below;
    // we restore it here after epub.js finishes the initial display().
    if (scrollMode) {
      var scrollRestored = false;
      rendition.on('relocated', function() {
        if (scrollRestored) return;
        scrollRestored = true;
        setTimeout(function() {
          try {
            var sc = document.querySelector('.reader-content.scroll-mode');
            var savedTop = storage.get('nr_scroll_top_' + bookName, null);
            if (sc && savedTop != null) {
              sc.scrollTop = parseFloat(savedTop);
            }
          } catch(e) {}
        }, 250);
      });
    }
    // Direct selection detection — re-registered on every relocation so chapter
    // navigation (which creates a new contentDoc) doesn't lose the listener.
    function registerSelectionListener() {
      try {
        var rend = renditionRef.current;
        if (!rend) return false;
        var contents = rend.getContents();
        if (!contents || !contents.length) return false;
        var contentObj = contents[0];
        var contentDoc = contentObj.document;
        if (!contentDoc) return false;

        // Remove any previously attached handlers on this document
        if (contentDoc._selHandler) {
          contentDoc.removeEventListener('mouseup', contentDoc._selHandler);
          contentDoc.removeEventListener('touchend', contentDoc._selHandler);
        }
        if (contentDoc._ctxHandler) {
          contentDoc.removeEventListener('contextmenu', contentDoc._ctxHandler);
        }
        if (contentDoc._dismissHandler) {
          contentDoc.removeEventListener('mousedown', contentDoc._dismissHandler);
        }

        function buildSelectionPayload(win, sel) {
          var text = sel.toString().trim();
          if (!text) return null;
          var freshContents = renditionRef.current && renditionRef.current.getContents();
          var freshObj = freshContents && freshContents[0];
          if (!freshObj) return null;
          var cfiRange = null;
          try {
            cfiRange = freshObj.cfiFromRange(sel.getRangeAt(0));
          } catch(ex) {
            try { cfiRange = freshObj.section && freshObj.section.cfiFromRange(sel.getRangeAt(0)); } catch(e2) {}
          }
          if (!cfiRange) return null;
          var range = sel.getRangeAt(0);
          var rects = range.getClientRects();
          var iframeEl = win.frameElement;
          var iframeRect = iframeEl ? iframeEl.getBoundingClientRect() : null;
          var rect = null;
          if (rects.length > 0) {
            var r = rects[rects.length - 1];
            rect = {
              top: r.top + (iframeRect ? iframeRect.top : 0),
              left: r.left + (iframeRect ? iframeRect.left : 0),
              right: r.right + (iframeRect ? iframeRect.left : 0),
              bottom: r.bottom + (iframeRect ? iframeRect.top : 0),
              width: r.width,
              height: r.height,
            };
          }
          return { cfi: cfiRange, text: text.substring(0, 500), rect: rect };
        }

        contentDoc._selHandler = function() {
          if (popupTriggerRef.current !== 'auto') return;
          try {
            var win = contentDoc.defaultView;
            if (!win) return;
            var sel = win.getSelection();
            if (!sel || sel.isCollapsed) return;
            var payload = buildSelectionPayload(win, sel);
            if (payload) setSelection(payload);
          } catch(ex) {}
        };

        contentDoc._ctxHandler = function(e) {
          e.preventDefault();
          if (popupTriggerRef.current !== 'rightclick') return;
          try {
            var win = contentDoc.defaultView;
            if (!win) return;
            var sel = win.getSelection();
            if (sel && !sel.isCollapsed) {
              var payload = buildSelectionPayload(win, sel);
              if (payload) setSelection(payload);
            }
          } catch(ex) {}
        };

        contentDoc._dismissHandler = function() {
          setSelection(null);
        };

        contentDoc.addEventListener('mouseup', contentDoc._selHandler);
        contentDoc.addEventListener('touchend', contentDoc._selHandler);
        contentDoc.addEventListener('contextmenu', contentDoc._ctxHandler);
        contentDoc.addEventListener('mousedown', contentDoc._dismissHandler);
        return true;
      } catch(e) { return false; }
    }

    if (!registerSelectionListener()) {
      var retryCount = 0;
      var retryTimer = setInterval(function() {
        retryCount++;
        if (registerSelectionListener() || retryCount >= 20) {
          clearInterval(retryTimer);
        }
      }, 200);
    }
    rendition.on('relocated', function() {
      // Re-register on chapter navigation — new chapter = new contentDoc
      setTimeout(registerSelectionListener, 100);
      setTimeout(refreshPagination, 50);
      // If a highlight jump was pending, scroll to it now that the chapter is rendered
      if (pendingScrollCfi.current) {
        var targetCfi = pendingScrollCfi.current;
        pendingScrollCfi.current = null;
        setTimeout(function() {
          try {
            var rend = renditionRef.current;
            var contents = rend && rend.getContents && rend.getContents();
            if (!contents || !contents.length) return;
            var range = contents[0].range(targetCfi);
            if (!range || !range.startContainer) return;
            var el = range.startContainer.nodeType === 1
              ? range.startContainer
              : range.startContainer.parentElement;
            if (!el) return;
            var sc = document.querySelector('.reader-content.scroll-mode');
            if (!sc) return;
            var elRect = el.getBoundingClientRect();
            var scRect = sc.getBoundingClientRect();
            var targetScrollTop = sc.scrollTop + (elRect.top - scRect.top) - sc.clientHeight / 3;
            sc.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          } catch(e) {}
        }, 100);
      }
      var hls = highlightsRef.current;
      for (var i = 0; i < hls.length; i++) {
        var hl = hls[i];
        try {
          (function(hlRef) {
            // Remove before re-adding so revisiting a chapter doesn't stack marks
            try { rendition.annotations.remove(hlRef.cfi, 'highlight'); } catch (e2) {}
            rendition.annotations.highlight(
              hlRef.cfi,
              { cfi: hlRef.cfi, id: hlRef.id },
              function(e) { if (hlClickRef.current) hlClickRef.current(hlRef.cfi, hlRef.id, e); },
              'epubjs-hl',
              { fill: hlRef.colorHex || HIGHLIGHT_COLORS[hlRef.color] || HIGHLIGHT_COLORS.yellow, 'fill-opacity': '0.3' }
            );
          })(hl);
        } catch (e) {}
      }
    });
  }

  function injectThemeCSS(contents) {
    if (!contents || !contents.document) return;
    try {
      var doc = contents.document;
      var existing = doc.getElementById('hermes-reader-theme');
      if (existing) existing.remove();
      var style = doc.createElement('style');
      style.id = 'hermes-reader-theme';
      style.textContent = [
        'body { background: #1a1a1a !important; color: #d4d4d4 !important; padding-top: 60px !important; padding-bottom: 60px !important; }',
        '* { background-color: transparent !important; }',
        'p, div, span, li, h1, h2, h3, h4, h5, h6 { color: #d4d4d4 !important; }',
        'a { color: #6c8cff !important; }',
        'img { opacity: 0.8; }',
        'body, p, div, li { line-height: ' + lineSpacing + ' !important; }',
        '* { font-size: ' + fontSize + 'px !important; font-family: ' + fontFamily + ' !important; }',
        // Footnote / noteref links
        'a[epub\\:type="noteref"], a.noteref, sup a, a[href^="#fn"], a[href^="#note"], a[href^="#endnote"] {',
        '  color: #f0a500 !important; font-size: 0.75em !important; vertical-align: super;',
        '  border-bottom: 1px dotted #f0a500 !important; cursor: pointer !important; }',
      ].join('\n');
      doc.head.appendChild(style);
    } catch (e) {
      console.warn('Theme inject failed:', e);
    }
    // In scroll mode, set iframe height = body content + padding so the
    // reader-content scroll container can measure the full content height.
    // We measure twice: immediately (for a fast first paint) and after
    // document.fonts.ready (fonts can reflow Chinese/CJK text by 10-30%).
    if (scrollMode) {
      try {
        var win = contents.document.defaultView;
        var iframe = win && win.frameElement;
        if (iframe) {
          function updateIframeHeight() {
            try {
              var h = iframe.contentWindow.document.body.scrollHeight;
              if (h > 200) iframe.style.height = (h + 80) + 'px';
            } catch (e) {}
          }
          // Measure at multiple points: CSS is applied async so the first call
          // often measures before padding-bottom is in the layout; the retries
          // catch the correct value after reflow and after fonts finish loading.
          updateIframeHeight();
          setTimeout(updateIframeHeight, 100);
          setTimeout(updateIframeHeight, 400);
          setTimeout(updateIframeHeight, 1000);
        }
      } catch (e) {}
    }
  }

  function applySettingsToRendition(rendition) {
    if (!rendition) return;
    try {
      // Clear old hooks to avoid duplicate injections
      var hooks = rendition.hooks.content;
      hooks.clear();
      // Hook into every content render to inject CSS directly
      hooks.register(injectThemeCSS);
      // Also apply to current content immediately
      var contents = rendition.getContents();
      if (contents && contents.length) {
        for (var i = 0; i < contents.length; i++) {
          injectThemeCSS(contents[i]);
        }
      }
    } catch (e) {
      console.warn('Settings apply failed:', e);
    }
  }

  useEffect(function() {
    if (renditionRef.current) {
      applySettingsToRendition(renditionRef.current);
    }
  }, [fontSize, fontFamily, lineSpacing]);

  // Save absolute scrollTop on every scroll so it survives page refresh.
  // On reload, getRendition restores it once after the first 'relocated' event.
  useEffect(function() {
    if (!scrollMode || !bookName) return;
    var sc = readerContentRef.current;
    if (!sc) return;
    var saveTimer = null;
    function onScroll() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        storage.set('nr_scroll_top_' + bookName, sc.scrollTop);
      }, 300);
    }
    sc.addEventListener('scroll', onScroll, { passive: true });
    return function() {
      sc.removeEventListener('scroll', onScroll);
      clearTimeout(saveTimer);
    };
  }, [scrollMode, bookName]);

  // Re-flow epub content after sidebar open/close or width change
  useEffect(function() {
    if (!renditionRef.current) return;
    var t = setTimeout(function() {
      if (renditionRef.current && renditionRef.current.resize) {
        renditionRef.current.resize();
      }
    }, 300);
    return function() { clearTimeout(t); };
  }, [leftSidebar, rightSidebar, pageWidth]);

  function goNext() {
    if (renditionRef.current) renditionRef.current.next();
  }

  function goPrev() {
    if (renditionRef.current) renditionRef.current.prev();
  }

  function goToLocation(cfi) {
    setLocation(cfi);
    storage.set('nr_location_' + bookName, cfi);
    if (renditionRef.current) {
      renditionRef.current.display(cfi);
    }
  }

  function flattenToc(items) {
    var result = [];
    for (var i = 0; i < items.length; i++) {
      result.push(items[i]);
      if (items[i].subitems && items[i].subitems.length) {
        result = result.concat(flattenToc(items[i].subitems));
      }
    }
    return result;
  }

  function goPrevChapter() {
    var rend = renditionRef.current;
    if (!rend || !rend.book || !rend.book.spine) return;
    try {
      var spine = rend.book.spine;
      var loc = rend.currentLocation ? rend.currentLocation() : null;
      function doNav(spineIdx) {
        if (spineIdx > 0) {
          var prev = spine.get(spineIdx - 1);
          if (prev && prev.href) {
            goToLocation(prev.href);
          }
        }
      }
      if (loc && loc.then) { loc.then(function(r) { if (r && r.start) doNav(r.start.index); }); }
      else if (loc && loc.start) { doNav(loc.start.index); }
      else if (rend.location && rend.location.start) { doNav(rend.location.start.index); }
    } catch (e) { console.warn('Chapter nav failed:', e); }
  }

  function goNextChapter() {
    var rend = renditionRef.current;
    if (!rend || !rend.book || !rend.book.spine) return;
    try {
      var spine = rend.book.spine;
      var loc = rend.currentLocation ? rend.currentLocation() : null;
      function doNav(spineIdx) {
        if (spineIdx >= 0 && spineIdx < spine.length - 1) {
          var next = spine.get(spineIdx + 1);
          if (next && next.href) {
            goToLocation(next.href);
          }
        }
      }
      if (loc && loc.then) { loc.then(function(r) { if (r && r.start) doNav(r.start.index); }); }
      else if (loc && loc.start) { doNav(loc.start.index); }
      else if (rend.location && rend.location.start) { doNav(rend.location.start.index); }
    } catch (e) { console.warn('Chapter nav failed:', e); }
  }

  useEffect(function() {
    function handleClickOutside(e) {
      if (selection && !e.target.closest('.selection-popup') && !e.target.closest('.note-editor-overlay')) {
        setSelection(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return function() { document.removeEventListener('mousedown', handleClickOutside); };
  }, [selection]);

  useKeyboardNav({ isLoaded, onNext: goNext, onPrev: goPrev, onNextChapter: goNextChapter, onPrevChapter: goPrevChapter });

  useEffect(function() {
    function onKey(e) { if (e.key === 'Escape') setLightboxSrc(null); }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // All lightbox gestures on the image — backdrop stays untouched
  useGesture({
    onWheel: function(state) {
      var origin = [state.event.clientX - window.innerWidth / 2, state.event.clientY - window.innerHeight / 2];
      var factor = state.delta[1] < 0 ? 1.1 : 0.9;
      setLightboxTransform(function(t) {
        var newZoom = Math.min(10, Math.max(0.2, t.zoom * factor));
        var ratio = newZoom / t.zoom;
        return { zoom: newZoom, tx: origin[0] - (origin[0] - t.tx) * ratio, ty: origin[1] - (origin[1] - t.ty) * ratio };
      });
    },
    onPinch: function(state) {
      var origin = [state.origin[0] - window.innerWidth / 2, state.origin[1] - window.innerHeight / 2];
      var factor = state.delta[0];
      setLightboxTransform(function(t) {
        var newZoom = Math.min(10, Math.max(0.2, t.zoom * factor));
        var ratio = newZoom / t.zoom;
        return { zoom: newZoom, tx: origin[0] - (origin[0] - t.tx) * ratio, ty: origin[1] - (origin[1] - t.ty) * ratio };
      });
    },
    onDrag: function(state) {
      if (state.delta[0] !== 0 || state.delta[1] !== 0) lightboxDraggedRef.current = true;
      setLightboxTransform(function(t) {
        return { zoom: t.zoom, tx: t.tx + state.delta[0], ty: t.ty + state.delta[1] };
      });
    },
  }, { target: lightboxImgRef, eventOptions: { passive: false } });

  function handleHighlightClick(cfi, id, e) {
    // Don't override if user currently has text selected
    try {
      var cs = renditionRef.current && renditionRef.current.getContents();
      var hlWin = cs && cs[0] && cs[0].document && cs[0].document.defaultView;
      if (hlWin) {
        var hlSel = hlWin.getSelection();
        if (hlSel && !hlSel.isCollapsed) return;
      }
    } catch(ex) {}

    var hl = null;
    var hls = highlightsRef.current;
    for (var i = 0; i < hls.length; i++) {
      if (hls[i].id === id || hls[i].cfi === cfi) { hl = hls[i]; break; }
    }
    if (!hl) return;

    var iframeEl = null;
    try {
      var cs2 = renditionRef.current && renditionRef.current.getContents();
      var win2 = cs2 && cs2[0] && cs2[0].document && cs2[0].document.defaultView;
      iframeEl = win2 && win2.frameElement;
    } catch(ex2) {}
    var iframeRect = iframeEl ? iframeEl.getBoundingClientRect() : null;
    // Try to use the actual SVG element's rect for accurate positioning.
    // marks-pane fires in the main document, so e.target is already in main-page coords.
    // Only add iframeRect when the target is inside the iframe document.
    var rect = null;
    try {
      if (e.target && e.target.getBoundingClientRect) {
        var tr = e.target.getBoundingClientRect();
        if (tr.width > 0 || tr.height > 0) {
          var inIframe = iframeEl && e.target.ownerDocument && e.target.ownerDocument !== document;
          var offX = inIframe && iframeRect ? iframeRect.left : 0;
          var offY = inIframe && iframeRect ? iframeRect.top : 0;
          rect = {
            top: tr.top + offY,
            bottom: tr.bottom + offY,
            left: tr.left + offX,
            right: tr.right + offX,
            width: tr.width,
            height: tr.height,
          };
        }
      }
    } catch(ex3) {}
    if (!rect) {
      rect = {
        top: e.clientY + (iframeRect ? iframeRect.top : 0) - 10,
        bottom: e.clientY + (iframeRect ? iframeRect.top : 0),
        left: e.clientX + (iframeRect ? iframeRect.left : 0) - 60,
        right: e.clientX + (iframeRect ? iframeRect.left : 0) + 60,
        width: 120,
        height: 20,
      };
    }
    setSelection({ cfi: hl.cfi, text: hl.text, rect: rect, highlightId: hl.id });
  }
  hlClickRef.current = handleHighlightClick;

  function addHighlight(color) {
    if (!selection) return;
    if (!color) color = 'yellow';
    var hColor = HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS.yellow;

    // Re-coloring an existing highlight: remove old one first
    if (selection.highlightId) {
      deleteHighlight(selection.highlightId);
    }

    var newHighlight = {
      id: Date.now().toString(),
      cfi: selection.cfi,
      text: selection.text,
      color: color,
      colorHex: hColor,
      chapter: getChapterName(selection.cfi),
      note: selection.highlightId ? (highlightsRef.current.find(function(h) { return h.id === selection.highlightId; }) || {}).note || '' : '',
      createdAt: new Date().toISOString(),
    };

    setHighlights(function(prev) { return prev.concat([newHighlight]); });

    if (renditionRef.current) {
      try {
        (function(cfi, id) {
          renditionRef.current.annotations.highlight(
            cfi, { cfi: cfi, id: id },
            function(e) { if (hlClickRef.current) hlClickRef.current(cfi, id, e); },
            'epubjs-hl',
            { fill: hColor, 'fill-opacity': '0.3' }
          );
        })(newHighlight.cfi, newHighlight.id);
      } catch (e) {
        console.warn('Highlight apply failed:', e);
      }
    }

    setSelection(null);
    showToastMsg('Highlight added');
  }

  function deleteHighlight(id) {
    var hl = null;
    for (var i = 0; i < highlights.length; i++) {
      if (highlights[i].id === id) { hl = highlights[i]; break; }
    }
    if (hl && renditionRef.current) {
      try {
        renditionRef.current.annotations.remove(hl.cfi, 'highlight');
      } catch (e) {
        console.warn('Remove highlight failed:', e);
      }
    }
    setHighlights(function(prev) {
      return prev.filter(function(h) { return h.id !== id; });
    });
  }

  function jumpToHighlight(cfi) {
    // epub.js display() can mishandle range CFIs (epubcfi(path,start,end)).
    // Extract just the start-point CFI so the rendition navigates to the right
    // page/position rather than only the chapter start.
    var displayCfi = cfi;
    try {
      var commaIdx = cfi.indexOf(',');
      if (commaIdx !== -1) {
        // range CFI: "epubcfi(PARENT,START_SUFFIX,END_SUFFIX)"
        // start-point CFI: "epubcfi(PARENT_START_SUFFIX)"
        var inner = cfi.slice('epubcfi('.length, -1); // strip epubcfi( and )
        var parts = inner.split(',');
        // parts[0] = parent path, parts[1] = start suffix
        displayCfi = 'epubcfi(' + parts[0] + parts[1] + ')';
      }
    } catch(e) {}
    goToLocation(displayCfi);
    // In scroll mode: set a pending CFI; the relocated handler will scroll once the chapter is ready.
    if (scrollMode) {
      pendingScrollCfi.current = displayCfi;
    }
  }

  function openNoteEditor() {
    if (!selection) return;
    setNoteCfi(selection.cfi);
    setNoteSelectionText(selection.text || '');
    setShowNoteEditor(true);
    setSelection(null);
  }

  function saveNote(text, color) {
    if (!noteCfi) return;
    var cfi = noteCfi;
    var chosenColor = color || 'yellow';
    var chosenHex = HIGHLIGHT_COLORS[chosenColor] || HIGHLIGHT_COLORS.yellow;
    var found = false;
    for (var i = 0; i < highlights.length; i++) {
      if (highlights[i].cfi === cfi) { found = true; break; }
    }
    if (found) {
      setHighlights(function(prev) {
        return prev.map(function(h) {
          if (h.cfi === cfi) return Object.assign({}, h, { note: text, color: chosenColor, colorHex: chosenHex });
          return h;
        });
      });
    } else {
      var newNoteId = Date.now().toString();
      var selText = noteSelectionText;
      setHighlights(function(prev) {
        return prev.concat([{
          id: newNoteId,
          cfi: cfi,
          text: selText,
          color: chosenColor,
          colorHex: chosenHex,
          chapter: getChapterName(cfi),
          note: text,
          createdAt: new Date().toISOString(),
        }]);
      });
      if (renditionRef.current) {
        try {
          (function(c, i, hex) {
            renditionRef.current.annotations.highlight(
              c, { cfi: c, id: i },
              function(e) { if (hlClickRef.current) hlClickRef.current(c, i, e); },
              'epubjs-hl',
              { fill: hex, 'fill-opacity': '0.3' }
            );
          })(cfi, newNoteId, chosenHex);
        } catch (e) {
          console.warn('Highlight apply failed:', e);
        }
      }
    }
    setShowNoteEditor(false);
    setNoteCfi(null);
    setNoteSelectionText('');
    showToastMsg('Note saved');
  }

  function updateHighlightNote(id, text) {
    setHighlights(function(prev) {
      return prev.map(function(h) {
        if (h.id === id) return Object.assign({}, h, { note: text });
        return h;
      });
    });
    showToastMsg('Note updated');
  }

  var currentBookmark = location ? (bookmarks || []).find(function(b) { return b.cfi === location; }) : null;

  function addBookmark() {
    if (!location) return;
    if (currentBookmark) {
      removeBookmark(currentBookmark.id);
      showToastMsg('Bookmark removed');
      return;
    }
    var newBookmark = {
      id: Date.now().toString(),
      cfi: location,
      chapter: getChapterName(location),
      createdAt: new Date().toISOString(),
    };
    setBookmarks(function(prev) { return prev.concat([newBookmark]); });
    showToastMsg('Bookmark added');
  }

  function removeBookmark(id) {
    setBookmarks(function(prev) { return prev.filter(function(b) { return b.id !== id; }); });
  }

  function jumpToBookmark(cfi) {
    goToLocation(cfi);
  }

  // Track the current search generation so stale results from a previous search
  // are discarded if the user starts a new one before the old one completes.
  var searchGenRef = useRef(0);

  function doSearch(query) {
    if (!query.trim() || !renditionRef.current) return;
    setSearching(true);
    setSearchResults([]);

    var gen = ++searchGenRef.current;
    var rendition = renditionRef.current;
    var book = rendition ? rendition.book : null;
    if (!book) { setSearching(false); return; }

    var results = [];
    var spine = book.spine;

    function processSection(i) {
      // Abort if a newer search has started
      if (gen !== searchGenRef.current) return;

      if (i >= spine.length) {
        setSearchResults(results);
        setSearching(false);
        return;
      }

      var section = spine.get(i);
      if (!section) {
        processSection(i + 1);
        return;
      }

      section.load(book.load.bind(book)).then(function(doc) {
        if (gen !== searchGenRef.current) return;
        if (!doc) {
          processSection(i + 1);
          return;
        }

        var found = [];
        try {
          found = section.find(query) || [];
        } catch(e) {}

        for (var j = 0; j < found.length; j++) {
          results.push({
            cfi: found[j].cfi,
            excerpt: found[j].excerpt,
            chapter: section.href || 'Page ' + (i + 1),
          });
        }

        section.unload();
        processSection(i + 1);
      }).catch(function() {
        if (gen !== searchGenRef.current) return;
        processSection(i + 1);
      });
    }

    processSection(0);
  }

  function tempHighlight(cfi) {
    var rend = renditionRef.current;
    if (!rend || !cfi) return;
    try {
      try { rend.annotations.remove(cfi, 'highlight'); } catch(e) {}
      rend.annotations.highlight(cfi, {}, function() {}, 'search-temp-hl', {
        fill: '#ffff00',
        'fill-opacity': '0.5',
      });
      setTimeout(function() {
        try {
          rend.annotations.remove(cfi, 'highlight');
        } catch(e) {}
      }, 3000);
    } catch(e) {}
  }

  function jumpToSearchResult(cfi) {
    goToLocation(cfi);
    tempHighlight(cfi);
    var rend = renditionRef.current;
    function onRelocated() {
      try {
        rend.off("relocated", onRelocated);
        var container = document.querySelector(".reader-content.scroll-mode");
        if (!container) return;
        var hl = container.querySelector(".search-temp-hl");
        if (hl) hl.scrollIntoView({ block: "center" });
      } catch(e) {}
    }
    if (rend) rend.on("relocated", onRelocated);
  }

  function toggleRightSidebar(panel) {
    if (panel === 'search' && rightSidebar === 'search') {
      setSearchResults([]);
      setSearching(false);
    }
    setRightSidebar(function(prev) { return prev === panel ? 'none' : panel; });
  }

  function toggleLeftSidebar() {
    setLeftSidebar(function(prev) { return prev === 'toc' ? 'none' : 'toc'; });
  }

  useEffect(function() {
    var rend = renditionRef.current;
    if (!rend || !isLoaded) return;
    var savedScrollTop = 0;
    // Read location from the rendition itself (source of truth) rather than
    // from the `location` state variable to avoid a stale-closure bug — the
    // state value captured here would be whatever it was when the effect last
    // ran ([rightSidebar, isLoaded] deps don't include `location`).
    var currentCfi = null;
    try {
      var loc = rend.currentLocation ? rend.currentLocation() : null;
      if (loc && !loc.then && loc.start) currentCfi = loc.start.cfi;
      else if (rend.location && rend.location.start) currentCfi = rend.location.start.cfi;
    } catch(e) {}
    if (scrollMode) {
      var sd = document.querySelector('.reader-content.scroll-mode');
      if (sd) savedScrollTop = sd.scrollTop;
    }
    try { rend.resize(); } catch(e) {}
    if (scrollMode) {
      var sd2 = document.querySelector('.reader-content.scroll-mode');
      if (sd2 && savedScrollTop > 0) sd2.scrollTop = savedScrollTop;
    } else if (currentCfi) {
      try { rend.display(currentCfi); } catch(e) {}
    }
  }, [rightSidebar, isLoaded, scrollMode]);

  useEffect(function() {
    if (!isLoaded || !renditionRef.current) return;
    var rendition = renditionRef.current;
    for (var i = 0; i < highlights.length; i++) {
      var hl = highlights[i];
      try {
        (function(hlRef) {
          rendition.annotations.highlight(
            hlRef.cfi,
            { cfi: hlRef.cfi, id: hlRef.id },
            function(e) { if (hlClickRef.current) hlClickRef.current(hlRef.cfi, hlRef.id, e); },
            'epubjs-hl',
            { fill: hlRef.colorHex || HIGHLIGHT_COLORS[hlRef.color] || HIGHLIGHT_COLORS.yellow, 'fill-opacity': '0.3' }
          );
        })(hl);
      } catch (e) {}
    }
  }, [isLoaded]);

  var handleTocChange = useCallback(function(tocItems) {
    if (tocItems && tocItems.length > 0) {
      setToc(tocItems);
      setIsLoaded(true);
      // Build href → spine index map for TOC numbering
      try {
        var rend = renditionRef.current;
        if (rend && rend.book && rend.book.spine && rend.book.spine.items) {
          var map = {};
          rend.book.spine.items.forEach(function(item) {
            if (item.href != null && item.index != null) {
              map[item.href.split('#')[0]] = item.index;
            }
          });
          setHrefToSpineIdx(map);
        }
      } catch(e) {}
    }
  }, []);

  function renderToolbar() {
    return (
      <div className="toolbar">
        <div className="toolbar-left">
          {bookUrl ? <button className="btn-icon" onClick={toggleLeftSidebar} title="Table of Contents">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button> : null}
          {bookUrl
            ? <button className="btn-icon" title="Back to Library" onClick={closeBook} style={{ marginRight: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            : null}
          {bookName ? <span className="app-title">{bookName}</span> : <span className="app-title">Library</span>}
        </div>

        <div className="toolbar-center">
          {bookUrl ? <div className="chapter-nav">
            <button className="btn-icon" onClick={goPrevChapter} title="Previous Chapter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="chapter-counter">
              <input
                className="chapter-input"
                type="text"
                title="Current chapter (press Enter to jump)"
                value={chapterInputVal}
                onChange={function(e) { setChapterInputVal(e.target.value); }}
                onKeyDown={function(e) {
                  if (e.key === 'Enter') {
                    var n = parseInt(chapterInputVal, 10);
                    if (!isNaN(n) && n >= 1 && n <= totalSpineItems) {
                      var rend = renditionRef.current;
                      if (rend && rend.book && rend.book.spine) {
                        var item = rend.book.spine.get(n - 1);
                        if (item && item.href) goToLocation(item.href);
                      }
                    } else {
                      setChapterInputVal(String(currentSpineIdx + 1));
                    }
                    e.target.blur();
                  }
                  if (e.key === 'Escape') {
                    setChapterInputVal(String(currentSpineIdx + 1));
                    e.target.blur();
                  }
                }}
                onBlur={function() { setChapterInputVal(String(currentSpineIdx + 1)); }}
              />
              <span className="chapter-total">/ {totalSpineItems || '?'}</span>
            </span>
            <button className="btn-icon" onClick={goNextChapter} title="Next Chapter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div> : null}
        </div>

        <div className="toolbar-right">
          <button className={'btn-icon' + (rightSidebar === 'highlights' ? ' active' : '')} title="Highlights & Notes" onClick={function() { toggleRightSidebar('highlights'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3.5L20.5 8.5L8 21H3V16L15.5 3.5Z" /></svg>
          </button>
          {bookUrl ? <button className={'btn-icon' + (currentBookmark ? ' active' : '')} title={currentBookmark ? 'Remove Bookmark' : 'Add Bookmark'} onClick={addBookmark}>
            {currentBookmark
              ? <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            }
          </button> : null}
          {bookUrl ? <button className={'btn-icon' + (rightSidebar === 'bookmarks' ? ' active' : '')} title="All Bookmarks" onClick={function() { toggleRightSidebar('bookmarks'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
              <line x1="9" y1="13" x2="13" y2="13" />
            </svg>
          </button> : null}
          {bookUrl ? <button className={'btn-icon' + (rightSidebar === 'search' ? ' active' : '')} title="Search" onClick={function() { toggleRightSidebar('search'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button> : null}
          <button className={'btn-icon' + (laserMode ? ' active' : '')} onClick={function() { setLaserMode(function(s) { return !s; }); }} title={laserMode ? 'Exit Laser Pointer' : 'Laser Pointer'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/></svg>
          </button>
          <button className={'btn-icon' + (scrollMode ? ' active' : '')} onClick={function() { setScrollMode(function(s) { return !s; }); }} title={scrollMode ? 'Switch to Paginated' : 'Switch to Scroll'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </button>
          <button className={'btn-icon' + (rightSidebar === 'settings' ? ' active' : '')} title="More Settings" onClick={function() { toggleRightSidebar('settings'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
          </button>
        </div>
      </div>
    );
  }

  function renderLibrary() {
    return (
      <LibraryPage
        library={library}
        onOpenFile={function(fileOrNull, bookKey) {
          if (bookKey) {
            loadEpubBlob(bookKey).then(function(blob) {
              if (blob) {
                handleFile(new File([blob], bookKey + '.epub', { type: 'application/epub+zip' }));
              } else {
                fileInputRef.current.click();
              }
            }).catch(function() { fileInputRef.current.click(); });
          } else if (fileOrNull instanceof File) {
            handleFile(fileOrNull);
          } else {
            fileInputRef.current.click();
          }
        }}
        onRemove={removeFromLibrary}
        onDragOver={function(e) { e.preventDefault(); }}
        onDrop={function(e) { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        fileInputRef={fileInputRef}
      />
    );
  }

  function renderReader() {
    if (!bookUrl) return null;
    var epubOptions = { allowPopups: true, allowScriptedContent: true, sandbox: undefined };
    return (
      <div className="epub-wrapper">
      <div className="page-width-wrapper" style={{ maxWidth: pageWidth + 'px' }}>
      <ReactReader
        key={scrollMode ? 'scroll' : 'paged'}
        url={bookUrl}
        location={location}
        locationChanged={onLocationChange}
        getRendition={getRendition}
        tocChanged={handleTocChange}
        showToc={false}
        readerStyles={{
          prev: { display: 'none' },
          next: { display: 'none' },
          arrow: { display: 'none' },
          readerArea: { background: 'transparent' },
          titleArea: { display: 'none' },
        }}
        loadingView={
          <div className="loading-screen">
            <div className="spinner" />
            <span>Loading book...</span>
          </div>
        }
        epubOptions={epubOptions}
      />
      </div>
      </div>
    );
  }

  function renderBottomBar() {
    if (!bookUrl || !isLoaded) return null;
    if (scrollMode) return null;
    return (
      <BottomBar
        currentPage={currentPage}
        totalPages={totalPages}
        progress={progress}
        onPrev={goPrev}
        onNext={goNext}
      />
    );
  }

  function renderLeftSidebar() {
    if (leftSidebar !== 'toc' || !bookUrl) return null;
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Table of Contents</h3>
          <button className="btn-icon" onClick={function() { setLeftSidebar('none'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <TocSidebar toc={toc} onNavigate={goToLocation} currentSpineHref={currentSpineHref} hrefToSpineIdx={hrefToSpineIdx} />
      </div>
    );
  }

  function renderSettingsContent() {
    return (
      <div className="sidebar-content">
        <div className="setting-row">
          <label>Font Size</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn-round" title="Decrease font size" onClick={function() { setFontSize(function(s) { return Math.max(10, s - 1); }); }}>--</button>
            <span className="setting-value">{fontSize}</span>
            <button className="btn-round" title="Increase font size" onClick={function() { setFontSize(function(s) { return Math.min(36, s + 1); }); }}>+</button>
          </div>
        </div>
        <div className="setting-row">
          <label>Font Style</label>
          <select className="font-select" value={fontFamily} onChange={function(e) { setFontFamily(e.target.value); }}>
            {FONT_FAMILIES.map(function(f) { return <option key={f.value} value={f.value}>{f.label}</option>; })}
          </select>
        </div>
        <div className="setting-row">
          <label>Line Spacing</label>
          <select className="font-select" value={lineSpacing} onChange={function(e) { setLineSpacing(parseFloat(e.target.value)); }}>
            {LINE_SPACINGS.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
          </select>
        </div>
        <div className="setting-row">
          <label>Content Width</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="range"
              className="width-slider"
              min={400}
              max={1400}
              step={20}
              value={pageWidthDraft != null ? pageWidthDraft : pageWidth}
              onChange={function(e) { setPageWidthDraft(Number(e.target.value)); }}
              onMouseUp={function(e) { var v = Number(e.target.value); setPageWidth(v); setPageWidthDraft(null); }}
              onTouchEnd={function(e) { var v = Number(e.target.value); setPageWidth(v); setPageWidthDraft(null); }}
            />
            <span className="setting-value" style={{ minWidth: 36, fontSize: 11 }}>{(pageWidthDraft != null ? pageWidthDraft : pageWidth)}px</span>
          </div>
        </div>
        <div className="setting-row">
          <label>Whole Book Pages</label>
          <button className={'btn-icon' + (wholeBookPages ? ' active' : '')} title={wholeBookPages ? 'Whole Book Pages: On' : 'Whole Book Pages: Off'} onClick={function() { setWholeBookPages(function(s) { return !s; }); }} style={{ width: 40, fontSize: 12 }}>
            {wholeBookPages ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="setting-row">
          <label>Selection Popup</label>
          <select className="font-select" value={popupTrigger} onChange={function(e) { setPopupTrigger(e.target.value); }} title="Selection popup trigger mode">
            <option value="auto">Auto (on select)</option>
            <option value="rightclick">Right-click only</option>
          </select>
        </div>
      </div>
    );
  }

  function renderRightSidebar() {
    if (rightSidebar === 'none') return null;
    if (rightSidebar !== 'settings' && !bookUrl) return null;
    var header = null;
    var content = null;

    if (rightSidebar === 'highlights') {
      header = 'Highlights & Notes (' + highlights.length + ')';
      content = <HighlightSidebar highlights={highlights} onJump={jumpToHighlight} onDelete={deleteHighlight} onUpdateNote={updateHighlightNote} bookTitle={bookName} />;
    } else if (rightSidebar === 'bookmarks') {
      header = 'Bookmarks (' + bookmarks.length + ')';
      content = <BookmarkSidebar bookmarks={bookmarks} onJump={jumpToBookmark} onDelete={removeBookmark} />;
    } else if (rightSidebar === 'search') {
      header = 'Search';
      content = <SearchPanel onSearch={doSearch} results={searchResults} searching={searching} onJump={function(cfi) { jumpToSearchResult(cfi); }} />;
    } else if (rightSidebar === 'settings') {
      header = 'Settings';
      content = renderSettingsContent();
    }

    return (
      <div className="sidebar right">
        <div className="sidebar-header">
          <h3>{header}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {rightSidebar === 'highlights' && (
              <div style={{ position: 'relative' }}>
                <button className="btn btn-sm" title="Export highlights" onClick={function() { setShowExportMenu(function(s) { return !s; }); }}>
                  Export
                </button>
                {showExportMenu && (
                  <div className="export-menu" style={{ right: 0, left: 'auto' }}>
                    <button className="export-menu-item" onClick={function() { exportAs('markdown', highlights, bookName); setShowExportMenu(false); }}>Markdown (.md)</button>
                    <button className="export-menu-item" onClick={function() { exportAs('json', highlights, bookName); setShowExportMenu(false); }}>JSON (.json)</button>
                  </div>
                )}
              </div>
            )}
            <button className="btn-icon" onClick={function() { if (rightSidebar === 'search') { setSearchResults([]); setSearching(false); } setRightSidebar('none'); setShowExportMenu(false); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="app-container" style={laserMode ? { cursor: 'none' } : undefined} data-laser={laserMode ? 'true' : undefined}>
      {laserMode && (
        <div style={{
          position: 'fixed',
          left: laserPos.x,
          top: laserPos.y,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#e8000d',
          boxShadow: '0 0 0 2px rgba(232,0,13,0.35), 0 0 8px 3px rgba(232,0,13,0.4)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 99999,
        }} />
      )}
      {imgMenu && (
        <div className="img-ctx-backdrop" onClick={function() { setImgMenu(null); }}>
          <div
            className="img-ctx-menu"
            style={{ left: imgMenu.x, top: imgMenu.y }}
            onClick={function(e) { e.stopPropagation(); }}
          >
            <button className="img-ctx-item" onClick={function() {
              setImgMenu(null);
              var img = imgMenu.img;
              var canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              canvas.toBlob(function(blob) {
                if (!blob) return;
                try {
                  navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                  showToast('Image copied');
                } catch (e) {}
              }, 'image/png');
            }}>Copy</button>
            <button className="img-ctx-item" onClick={function() {
              setImgMenu(null);
              var img = imgMenu.img;
              var canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              canvas.toBlob(function(blob) {
                if (!blob) return;
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                var name = img.src.split('/').pop().split('?')[0] || 'image';
                a.download = name.match(/\.(png|jpe?g|gif|webp)$/i) ? name : name + '.png';
                a.click();
                URL.revokeObjectURL(url);
              }, 'image/png');
            }}>Save as file</button>
          </div>
        </div>
      )}
      {lightboxSrc && (
        <div
          className="lightbox-backdrop"
          onClick={function() {
            if (lightboxDraggedRef.current) { lightboxDraggedRef.current = false; return; }
            setLightboxSrc(null);
          }}
        >
          <button
            className="lightbox-close"
            onClick={function(e) { e.stopPropagation(); setLightboxSrc(null); }}
          >✕</button>
          <img
            ref={lightboxImgRef}
            src={lightboxSrc}
            className="lightbox-img"
            style={{ transform: 'translate(' + lightboxTransform.tx + 'px, ' + lightboxTransform.ty + 'px) scale(' + lightboxTransform.zoom + ')' }}
            onClick={function(e) { e.stopPropagation(); }}
            draggable={false}
            alt=""
          />
        </div>
      )}
      {renderToolbar()}
      <div className="main-area">
        {(leftSidebar === 'toc' || rightSidebar !== 'none') && bookUrl
          ? <div className="sidebar-backdrop" onClick={function() { setLeftSidebar('none'); setRightSidebar('none'); }} />
          : null}
        {renderLeftSidebar()}
        <div className="reader-area">
          <div className={'reader-content' + (scrollMode ? ' scroll-mode' : '')} ref={readerContentRef}>
            <input ref={fileInputRef} type="file" accept=".epub" className="file-input-hidden" onChange={function(e) { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
            {bookUrl ? renderReader() : renderLibrary()}
            {selection ? (
              <SelectionPopup
                selection={selection}
                onHighlight={addHighlight}
                onNote={openNoteEditor}
                onDelete={function() { if (selection && selection.highlightId) { deleteHighlight(selection.highlightId); setSelection(null); } }}
                onClose={function() { setSelection(null); }}
              />
            ) : null}
            {showNoteEditor ? (
              <NoteEditor
                cfi={noteCfi}
                highlights={highlights}
                selectionText={noteSelectionText}
                onSave={saveNote}
                onClose={function() { setShowNoteEditor(false); setNoteCfi(null); }}
              />
            ) : null}
          </div>
          {renderBottomBar()}
        </div>
        {renderRightSidebar()}
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
      {footnote && (
        <FootnotePopup
          content={footnote.content}
          position={footnote.position}
          onClose={function() { setFootnote(null); }}
          onJump={function() { goToLocation(footnote.href); setFootnote(null); }}
        />
      )}
    </div>
  );
}