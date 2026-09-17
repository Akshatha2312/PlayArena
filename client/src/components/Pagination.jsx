import React from 'react';
import './Pagination.css';

/**
 * Reusable, responsive Pagination component.
 * Props:
 *  - currentPage: number (1-indexed)
 *  - totalPages: number
 *  - totalItems: number (optional)
 *  - itemsPerPage: number (optional)
 *  - onPageChange: function(newPage)
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = null,
  itemsPerPage = null,
  onPageChange,
}) => {
  if (totalPages <= 1 && totalItems === null) {
    return null;
  }

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  // Calculate range text (e.g., "Showing 21–40 of 128")
  let rangeText = null;
  if (totalItems !== null && itemsPerPage !== null) {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    rangeText = `Showing ${start}–${end} of ${totalItems}`;
  } else if (totalItems !== null) {
    rangeText = `Total: ${totalItems} items`;
  }

  // Generate page numbers array with compact pattern (e.g. 1 2 3 ... 8 9)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        {rangeText && <span>{rangeText}</span>}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls" role="navigation" aria-label="Pagination Navigation">
          <button
            type="button"
            className="pagination-btn pagination-prev"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            aria-label="Go to previous page"
          >
            &larr; Prev
          </button>

          <div className="pagination-pages">
            {pageNumbers.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                    &hellip;
                  </span>
                );
              }
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  className={`pagination-page-btn ${p === currentPage ? 'active' : ''}`}
                  onClick={() => onPageChange && onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="pagination-btn pagination-next"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            aria-label="Go to next page"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
