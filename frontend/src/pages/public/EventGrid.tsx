import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shuffle, User } from 'lucide-react';
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

  if (loading) return <div className="text-center py-20 text-white/40 text-sm uppercase tracking-widest">Cargando...</div>;

  return (
    <div>
      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
          ← {event?.name}
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            <Shuffle className="inline h-3 w-3 mr-1.5" />
            {event?.name}
          </span>
        </div>
        <h1
          className="text-4xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Parrilla de Salida
        </h1>
      </div>

      {grids.length === 0 ? (
        <div className="text-center py-20 text-white/40 text-sm uppercase tracking-widest">
          La parrilla no ha sido publicada aún.
        </div>
      ) : (
        <div className="space-y-8">
          {grids.map((grid) => (
            <div key={grid.id}>
              <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f27] border border-[#38383f] border-b-0">
                <CategoryBadge category={grid.eventCategory?.category ?? ''} />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  Sorteo: {new Date(grid.drawnAt).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="border border-[#38383f] divide-y divide-[#38383f]/50">
                {grid.positions.map((pos) => {
                  const pilot = pos.inscription.pilot;
                  const isTop3 = pos.position <= 3;
                  return (
                    <div
                      key={pos.id}
                      className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#2a2a35] ${
                        pos.position === 1 ? 'border-l-[3px] border-l-yellow-500 bg-yellow-500/5' :
                        pos.position === 2 ? 'border-l-[3px] border-l-white/20' :
                        pos.position === 3 ? 'border-l-[3px] border-l-orange-400/40' :
                        'border-l-[3px] border-l-transparent'
                      }`}
                    >
                      {/* Position number */}
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center text-sm font-black ${
                          pos.position === 1 ? 'bg-yellow-500 text-black' :
                          pos.position === 2 ? 'bg-white/20 text-white' :
                          pos.position === 3 ? 'bg-orange-500/80 text-white' :
                          'bg-[#2a2a35] text-white/50'
                        }`}
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {pos.position}
                      </div>

                      {/* Pilot avatar */}
                      {pilot.photoUrl ? (
                        <img src={pilot.photoUrl} alt={pilot.name} className="h-9 w-9 object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-9 w-9 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white/20" />
                        </div>
                      )}

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-black text-white uppercase truncate"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                        >
                          {pilot.name}
                        </p>
                        {pilot.alias && (
                          <p className="text-[10px] text-white/40 italic">"{pilot.alias}"</p>
                        )}
                      </div>

                      {/* Kart number */}
                      {pos.inscription.kartNumber && (
                        <div className="text-xs font-bold text-white/50 bg-[#2a2a35] px-2.5 py-1 uppercase tracking-wider">
                          #{pos.inscription.kartNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
