export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
}

export function getPaginatedItems<T>(source: T[], currentPage: number, pageSize: number): PaginationResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalItems = source.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (page - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, totalItems);

  return {
    items: source.slice(startIndex, endIndex),
    page,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: endIndex,
  };
}

export function getPageWindow(currentPage: number, totalPages: number, maxVisible = 5): number[] {
  if (totalPages <= 0) return [];

  const safeVisible = Math.max(3, maxVisible);
  const half = Math.floor(safeVisible / 2);

  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + safeVisible - 1);

  if (end - start + 1 < safeVisible) {
    start = Math.max(1, end - safeVisible + 1);
  }

  const pages: number[] = [];
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }

  return pages;
}
