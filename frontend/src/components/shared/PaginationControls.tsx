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

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-white/50">
        Pagina {page} de {totalPages} | {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Anterior
        </button>
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
