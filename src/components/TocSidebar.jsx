export default function TocSidebar({ toc, onNavigate, currentSpineHref, hrefToSpineIdx }) {
  if (!toc || toc.length === 0) {
    return (
      <div className="sidebar-content">
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>
          Table of contents not available
        </div>
      </div>
    );
  }

  // Match TOC item href against the current spine item href (both may have different path prefixes)
  function isActive(item) {
    if (!currentSpineHref || !item.href) return false;
    var itemBase = item.href.split('#')[0];
    var spineBase = currentSpineHref.split('#')[0];
    return itemBase === spineBase ||
      spineBase.endsWith('/' + itemBase) ||
      itemBase.endsWith('/' + spineBase);
  }

  const renderTocItems = (items, depth = 0) => {
    return items.map((item, index) => (
      <div key={item.href || index}>
        <button
          className={'sidebar-item' + (depth > 0 ? ' toc-sub' : '') + (isActive(item) ? ' active' : '')}
          onClick={() => {
            if (item.href) onNavigate(item.href);
          }}
          style={{
            paddingLeft: `${16 + depth * 16}px`,
            fontWeight: depth === 0 ? 500 : 400,
          }}
        >
          <span className="chapter-num">{depth === 0 ? (hrefToSpineIdx && item.href && hrefToSpineIdx[item.href.split('#')[0]] != null ? hrefToSpineIdx[item.href.split('#')[0]] + 1 : index + 1) : ''}</span>
          <span>{item.label}</span>
        </button>
        {item.subitems && item.subitems.length > 0 && renderTocItems(item.subitems, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="sidebar-content">
      {renderTocItems(toc)}
    </div>
  );
}
