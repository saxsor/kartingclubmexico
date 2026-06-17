import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shuffle, Trash2 } from 'lucide-react';
import { gridApi } from '../../../api/grid.api';
import { eventsApi, Category } from '../../../api/events.api';
import { toast } from '../../../store/toast.store';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { queryKeys } from '../../../lib/react-query';
import { EventBreadcrumbs } from '../../../components/shared/EventBreadcrumbs';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { PageLoadingState } from '../../../components/shared/LoadingSkeleton';

export function GridDraw() {
  const { slug } = useParams<{ slug: string }>();
  const [drawing, setDrawing] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });
  const gridsQuery = useQuery({
    queryKey: slug ? queryKeys.grids.list(slug) : ['grids', 'list', 'missing'],
    queryFn: () => gridApi.getAll(slug!),
    enabled: !!slug,
  });
  const drawMutation = useMutation({
    mutationFn: (category: Category) => gridApi.draw(slug!, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grids.all });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (category: Category) => gridApi.delete(slug!, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grids.all });
    },
  });

  const event = eventQuery.data ?? null;
  const grids = gridsQuery.data ?? [];
  const loading = eventQuery.isLoading || gridsQuery.isLoading;

  const handleDraw = async (category: Category) => {
    if (!slug) return;
    setDrawing(category);
    try {
      await drawMutation.mutateAsync(category);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sortear');
    } finally {
      setDrawing(null);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!slug || !confirm('¿Eliminar esta parrilla?')) return;
    await deleteMutation.mutateAsync(category);
  };

  if (loading) return <PageLoadingState cards={4} rows={0} />;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div className="space-y-6">
      <EventBreadcrumbs eventSlug={slug!} eventName={event?.name} currentLabel="Parrilla" />
      <div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Starting <span className="text-[#f5c400]">Grid</span>
        </h1>
        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-1">{event?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {activeCategories.map((ec) => {
          const grid = grids.find((g) => g.eventCategory?.category === ec.category);
          return (
            <div key={ec.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <CategoryBadge category={ec.category} />
                <div className="flex gap-2">
                  {grid && (
                    <button
                      onClick={() => handleDelete(ec.category)}
                      aria-label={`Eliminar parrilla de ${CATEGORY_LABELS[ec.category] ?? ec.category}`}
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDraw(ec.category)}
                    disabled={drawing === ec.category}
                    className="flex items-center gap-1.5 rounded-lg bg-racing-red text-[#111111] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#d99a00] transition-colors disabled:opacity-60"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    {grid ? 'Re-sortear' : 'Sortear'}
                  </button>
                </div>
              </div>

              {grid ? (
                <div className="space-y-1 mt-3">
                  {grid.positions.map((pos) => (
                    <div key={pos.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5">
                      <span className={`w-6 text-center text-sm font-bold ${
                        pos.position === 1 ? 'text-yellow-400' :
                        pos.position === 2 ? 'text-gray-300' :
                        pos.position === 3 ? 'text-orange-400' : 'text-white/60'
                      }`}>
                        {pos.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{pos.inscription.pilot.name}</span>
                        {pos.inscription.kartNotes && (
                          <p className="text-xs text-white/35 italic truncate">{pos.inscription.kartNotes}</p>
                        )}
                      </div>
                      {pos.inscription.kartNumber && (
                        <span className="text-xs font-mono text-white/50">#{pos.inscription.kartNumber}</span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-white/30 mt-2">
                    Sorteado: {new Date(grid.drawnAt).toLocaleString('es-MX')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-white/40 mt-2">
                  Sin parrilla. Requiere pilotos con check-in.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
