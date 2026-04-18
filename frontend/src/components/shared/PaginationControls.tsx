import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  itemLabel,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs uppercase tracking-wider text-white/50">
        Página {page} de {totalPages} · {total} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Anterior
        </button>
        <div className="flex items-center gap-1">
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === page ? 'page' : undefined}
              className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold transition-colors ${
                pageNumber === page
                  ? 'border-racing-red bg-racing-red text-white'
                  : 'border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
