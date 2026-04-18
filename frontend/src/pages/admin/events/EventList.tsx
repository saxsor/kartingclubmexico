import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { eventsApi, KartEvent } from '../../../api/events.api';
import { toast } from '../../../store/toast.store';
import { formatDate } from '../../../lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { EmptyState } from '../../../components/shared/EmptyState';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';
import { Flag } from 'lucide-react';

export function EventList() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmEvent, setConfirmEvent] = useState<KartEvent | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const listParams = {
    page, pageSize: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(yearFilter ? { year: parseInt(yearFilter, 10) } : {}),
  };
  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list(listParams),
    queryFn: () => eventsApi.list(listParams),
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => eventsApi.delete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });

  const events = eventsQuery.data?.items ?? [];
  const pagination = eventsQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const loading = eventsQuery.isLoading;

  const handleDelete = (event: KartEvent) => setConfirmEvent(event);

  const confirmDelete = async () => {
    if (!confirmEvent) return;
    setDeleting(confirmEvent.slug);
    setConfirmEvent(null);
    try {
      await deleteMutation.mutateAsync(confirmEvent.slug);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Eventos</h1>
          <p className="text-white/50 text-sm mt-1">{pagination.total} eventos</p>
        </div>
        <Link
          to="/app/eventos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre..."
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="OPEN">Abierto</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="FINISHED">Terminado</option>
        </select>
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
        >
          <option value="">Todos los años</option>
          {yearOptions.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        {(search || statusFilter || yearFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setYearFilter(''); setPage(1); }}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-white/40">Cargando...</div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Sin eventos aún"
          description="Crea el primer evento de la temporada para comenzar a gestionar inscripciones y carreras."
          action={{ label: 'Crear evento', href: '/app/eventos/nuevo' }}
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={event.status} />
                    <h2 className="font-bold text-white truncate">{event.name}</h2>
                  </div>
                  <p className="text-sm text-white/50 mt-1">{formatDate(event.date)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.eventCategories.filter((c) => c.active).map((c) => (
                      <CategoryBadge key={c.id} category={c.category} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/app/eventos/${event.slug}`}
                    className="rounded-lg bg-racing-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    Gestionar
                  </Link>
                  <Link
                    to={`/app/eventos/${event.slug}/editar`}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={deleting === event.slug}
                    aria-label={`Eliminar evento ${event.name}`}
                    className="rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemLabel="eventos"
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!confirmEvent}
        title="Eliminar evento"
        description={`¿Eliminar "${confirmEvent?.name}"? Se borrarán todas sus inscripciones, carreras y resultados. No se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmEvent(null)}
        variant="danger"
      />
    </div>
  );
}
