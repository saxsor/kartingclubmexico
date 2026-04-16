import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, X, Search, ClipboardList, Download, Trash2 } from 'lucide-react';
import { downloadCsv } from '../../../lib/download';
import { inscriptionsApi, InscriptionStatus } from '../../../api/inscriptions.api';
import { pilotsApi } from '../../../api/pilots.api';
import { eventsApi, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { EmptyState } from '../../../components/shared/EmptyState';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';
import { useDebounce } from '../../../hooks/useDebounce';

const STATUS_LABELS: Record<InscriptionStatus, string> = {
  PENDING_PAYMENT: 'Pago pendiente',
  RECEIPT_SUBMITTED: 'Comprobante enviado',
  PAID: 'Pagado',
};

export function InscriptionManager() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [form, setForm] = useState({ pilotId: '', category: '' as Category | '', kartNumber: '', notes: '', companions: 0, engine: '' });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const statusFilter = searchParams.get('status') as InscriptionStatus | null;
  const categoryFilter = searchParams.get('category') as Category | null;

  const setFilter = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.set('page', '1');
      return next;
    });
  };

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
  };

  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });

  const listParams = {
    page,
    pageSize: 10,
    search: debouncedSearch || undefined,
    status: statusFilter ?? undefined,
    category: categoryFilter ?? undefined,
  };

  const inscriptionsQuery = useQuery({
    queryKey: slug ? queryKeys.inscriptions.list(slug, listParams) : ['inscriptions', 'list', 'missing'],
    queryFn: () => inscriptionsApi.list(slug!, listParams),
    enabled: !!slug,
  });
  const pilotsQuery = useQuery({
    queryKey: queryKeys.pilots.list({ page: 1, pageSize: 100 }),
    queryFn: () => pilotsApi.list({ page: 1, pageSize: 100 }),
  });
  const createMutation = useMutation({
    mutationFn: (payload: { pilotId: string; category: Category; kartNumber?: number; notes?: string; companions?: number; engine?: string }) =>
      inscriptionsApi.create(slug!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => inscriptionsApi.delete(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Error al eliminar la inscripción');
    },
  });

  const event = eventQuery.data ?? null;
  const inscriptions = inscriptionsQuery.data?.items ?? [];
  const pagination = inscriptionsQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const pilots = (pilotsQuery.data?.items ?? []).filter((pilot) => pilot.active);
  const loading = eventQuery.isLoading || inscriptionsQuery.isLoading || pilotsQuery.isLoading;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form.pilotId || !form.category) return;
    setError('');
    try {
      await createMutation.mutateAsync({
        pilotId: form.pilotId,
        category: form.category as Category,
        kartNumber: form.kartNumber ? parseInt(form.kartNumber) : undefined,
        notes: form.notes || undefined,
        companions: form.companions,
        engine: form.engine || undefined,
      });
      setShowForm(false);
      setForm({ pilotId: '', category: '', kartNumber: '', notes: '', companions: 0, engine: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear inscripción');
    }
  };

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];
  const hasFilters = !!(debouncedSearch || statusFilter || categoryFilter);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-black text-white">Inscripciones — {event?.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCsv(`/api/events/${slug}/inscriptions/export`, `${slug}-inscripciones.csv`).catch(() => {})}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Exportar inscripciones a CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Inscribir piloto
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Nueva inscripción</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">
              <X className="h-5 w-5 text-white/40 hover:text-white" />
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Piloto *</label>
              <select
                value={form.pilotId}
                onChange={(e) => setForm({ ...form, pilotId: e.target.value })}
                required
                className="w-full rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              >
                <option value="">Seleccionar piloto</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.alias ? `"${p.alias}"` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Categoría *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                required
                className="w-full rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              >
                <option value="">Seleccionar categoría</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.category}>{CATEGORY_LABELS[c.category]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Número de kart</label>
              <input
                type="number"
                value={form.kartNumber}
                onChange={(e) => setForm({ ...form, kartNumber: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Comensales</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, companions: Math.max(0, form.companions - 1) })}
                  className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors font-bold"
                >−</button>
                <span className="w-6 text-center text-white font-semibold">{form.companions}</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, companions: Math.min(10, form.companions + 1) })}
                  className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors font-bold"
                >+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Motor</label>
              <input
                type="text"
                value={form.engine}
                onChange={(e) => setForm({ ...form, engine: e.target.value })}
                placeholder="ej. TM KZ10C, Rotax Max, IAME X30"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
            Inscribir
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setFilter('search', e.target.value || null);
            }}
            placeholder="Buscar piloto..."
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
        </div>
        <select
          value={statusFilter ?? ''}
          onChange={(e) => setFilter('status', e.target.value || null)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as InscriptionStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={categoryFilter ?? ''}
          onChange={(e) => setFilter('category', e.target.value || null)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.category}>{CATEGORY_LABELS[c.category]}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setSearchInput('');
              setSearchParams({});
            }}
            className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Piloto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Categoría</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Kart</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Motor</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Pago</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Check-in</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {inscriptions.map((i) => (
              <tr key={i.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{i.pilot.name}</p>
                  {i.pilot.alias && <p className="text-xs text-white/50">"{i.pilot.alias}"</p>}
                </td>
                <td className="px-4 py-3"><CategoryBadge category={i.category} /></td>
                <td className="px-4 py-3 text-center font-mono text-white/70">
                  {i.kartNumber ? `#${i.kartNumber}` : '-'}
                </td>
                <td className="px-4 py-3 text-xs text-white/60">
                  {i.engine ?? <span className="text-white/25">—</span>}
                </td>
                <td className="px-4 py-3 text-center"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-center">
                  {i.checkIn ? (
                    <span className="text-xs text-green-400 font-medium">Sí #{i.checkIn.kartNumber}</span>
                  ) : (
                    <span className="text-xs text-white/30">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => {
                      if (!confirm(`¿Eliminar la inscripción de ${i.pilot.name}? Esta acción no se puede deshacer.`)) return;
                      deleteMutation.mutate(i.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Eliminar inscripción"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inscriptions.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title={hasFilters ? 'Sin resultados' : 'Sin inscripciones'}
            description={
              hasFilters
                ? 'No hay inscripciones con los filtros seleccionados.'
                : 'Aún no hay pilotos inscritos en este evento.'
            }
          />
        )}
      </div>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemLabel="inscripciones"
        onPageChange={setPage}
      />
    </div>
  );
}
