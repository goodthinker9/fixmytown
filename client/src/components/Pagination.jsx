// Simple prev/next pagination. Hidden when there's only one page.
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn--link"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Prev
      </button>
      <span className="pagination__info">Page {page} of {totalPages}</span>
      <button
        type="button"
        className="btn btn--link"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}
