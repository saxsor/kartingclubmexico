import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shuffle } from 'lucide-react';
import { gridApi, StartGrid } from '../../api/grid.api';
import { eventsApi, KartEvent } from '../../api/events.api';
import { useSSE } from '../../hooks/useSSE';
import { CATEGORY_LABELS } from '../../lib/utils';
import { CategoryBadge } from '../../components/shared/CategoryBadge';

export function EventGrid() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [grids, setGrids] = useState<StartGrid[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSSE(slug ?? null);

  const loadGrids = useCallback(async () => {
    if (!slug) return;
    const data = await gridApi.getAll(slug);
    setGrids(data);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([eventsApi.get(slug), gridApi.getAll(slug)])
      .then(([e, g]) => { setEvent(e); setGrids(g); })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    return on('grid:updated', () => loadGrids());
  }, [on, loadGrids]);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div>
      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white">
          ← {event?.name}
        </Link>
      </div>

      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-racing-red/20 flex items-center justify-center">
          <Shuffle className="h-5 w-5 text-racing-red" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Parrilla de Salida</h1>
          <p className="text-sm text-white/50">{event?.name}</p>
        </div>
      </div>

      {grids.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          La parrilla no ha sido publicada aún.
        </div>
      ) : (
        <div className="space-y-8">
          {grids.map((grid) => (
            <div key={grid.id} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/10">
                <CategoryBadge category={grid.eventCategory?.category ?? ''} />
                <span className="text-xs text-white/40">
                  Sorteo: {new Date(grid.drawnAt).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {grid.positions.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        pos.position === 1
                          ? 'bg-yellow-500 text-black'
                          : pos.position === 2
                          ? 'bg-gray-400 text-black'
                          : pos.position === 3
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {pos.position}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{pos.inscription.pilot.name}</p>
                      {pos.inscription.pilot.alias && (
                        <p className="text-xs text-white/50">"{pos.inscription.pilot.alias}"</p>
                      )}
                    </div>
                    {pos.inscription.kartNumber && (
                      <div className="text-sm font-mono font-bold text-white/60 bg-white/10 rounded px-2 py-1">
                        #{pos.inscription.kartNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
