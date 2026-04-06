import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shuffle, Trash2 } from 'lucide-react';
import { gridApi, StartGrid } from '../../../api/grid.api';
import { eventsApi, KartEvent, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { toast } from '../../../store/toast.store';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';

export function GridDraw() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [grids, setGrids] = useState<StartGrid[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState<string | null>(null);

  const load = async () => {
    if (!slug) return;
    try {
      const [e, g] = await Promise.all([eventsApi.get(slug), gridApi.getAll(slug)]);
      setEvent(e);
      setGrids(g);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const handleDraw = async (category: Category) => {
    if (!slug) return;
    setDrawing(category);
    try {
      await gridApi.draw(slug, category);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sortear');
    } finally {
      setDrawing(null);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!slug || !confirm('¿Eliminar esta parrilla?')) return;
    await gridApi.delete(slug, category);
    load();
  };

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black text-white">Parrilla de salida</h1>

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
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDraw(ec.category)}
                    disabled={drawing === ec.category}
                    className="flex items-center gap-1.5 rounded-lg bg-racing-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    {grid ? 'Re-sortear' : 'Sortear'}
                  </button>
                </div>
              </div>

              {grid ? (
                <div className="space-y-1 mt-3">
                  {grid.positions.map((pos) => (
                    <div key={pos.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
                      <span className={`w-6 text-center text-sm font-bold ${
                        pos.position === 1 ? 'text-yellow-400' :
                        pos.position === 2 ? 'text-gray-300' :
                        pos.position === 3 ? 'text-orange-400' : 'text-white/60'
                      }`}>
                        {pos.position}
                      </span>
                      <span className="text-sm text-white flex-1">{pos.inscription.pilot.name}</span>
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
