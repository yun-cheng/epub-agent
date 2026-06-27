export default function BottomBar({ currentPage, totalPages, progress, onPrev, onNext }) {
  return (
    <div className="bottom-bar">
      <button className="btn-icon" onClick={onPrev} title="Previous page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div className="pagination">
        <input className="page-input" type="number" min={1} max={totalPages} value={currentPage} readOnly />
        <span className="page-total">/ {totalPages}</span>
      </div>
      <button className="btn-icon" onClick={onNext} title="Next page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: Math.round(progress * 100) + '%' }} />
      </div>
      <span className="progress-text">{Math.round(progress * 100)}%</span>
    </div>
  );
}
