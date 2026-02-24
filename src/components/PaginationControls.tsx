'use client';

import { getPageWindow } from '@/lib/pagination';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export default function PaginationControls({
  page,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationControlsProps) {
  if (totalItems === 0) return null;

  const pages = getPageWindow(page, totalPages, 5);

  return (
    <div className="pagination-wrap">
      <p className="pagination-meta">{`Menampilkan ${startItem}-${endItem} dari ${totalItems}`}</p>
      <div className="pagination-controls">
        {onPageSizeChange && typeof pageSize === 'number' && (
          <select
            className="input-modern pagination-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Jumlah data per halaman"
          >
            {pageSizeOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        )}

        <button className="btn-secondary btn-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Sebelumnya
        </button>

        <div className="pagination-pages">
          {pages.map((value) => (
            <button
              key={value}
              className={`btn-ghost btn-sm pagination-page${value === page ? ' is-active' : ''}`}
              onClick={() => onPageChange(value)}
              aria-current={value === page ? 'page' : undefined}
            >
              {value}
            </button>
          ))}
        </div>

        <button className="btn-secondary btn-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}
