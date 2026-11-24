export interface PaginationProps {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (nextPage: number) => void;
  onSizeChange: (nextSize: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  hasNext,
  hasPrevious,
  onPageChange,
  onSizeChange,
  pageSizeOptions = [5, 8, 10, 20],
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="px-4 py-3 border-t border-hairline bg-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-soft">
      <div className="tabular-nums">
        Hiển thị trang <span className="font-semibold text-ink">{page}</span> / {safeTotalPages} ·
        Tổng <span className="font-semibold text-ink">{totalElements}</span> bản ghi
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span>Cỡ trang</span>
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="input-field px-2 py-1 text-xs tabular-nums"
          >
            {pageSizeOptions.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="btn-secondary px-3 py-1 text-xs focus-ring cursor-pointer"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="btn-secondary px-3 py-1 text-xs focus-ring cursor-pointer"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
