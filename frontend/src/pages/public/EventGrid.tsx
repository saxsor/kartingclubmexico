import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Shuffle, User } from 'lucide-react';
import { gridApi } from '../../api/grid.api';
import { eventsApi, Category } from '../../api/events.api';
import { useSSE } from '../../hooks/useSSE';
import { CATEGORY_LABELS } from '../../lib/utils';
import { queryKeys } from '../../lib/react-query';
import { resolveMediaUrl, cn } from '../../lib/utils';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';
import { SEO } from '../../components/shared/SEO';

export function EventGrid() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const { on } = useSSE(slug ?? null);

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

  useEffect(() => {
    return on('grid:updated', () => {
      void gridsQuery.refetch();
    });
  }, [on, gridsQuery]);

  // Auto-select first available category
  useEffect(() => {
    const grids = gridsQuery.data;
    if (grids && grids.length > 0 && !selectedCat) {
      setSelectedCat(grids[0].eventCategory?.category as Category);
    }
  }, [gridsQuery.data, selectedCat]);

  const event = eventQuery.data ?? null;
  const grids = gridsQuery.data ?? [];
  const loading = eventQuery.isLoading || gridsQuery.isLoading;

  if (loading) return <PageLoadingState rows={4} />;

  const currentGrid = grids.find(g => g.eventCategory?.category === selectedCat);

  return (
    <div className="pb-20">
      <SEO
        title={event ? `Parrilla de Salida — ${event.name}` : 'Parrilla de Salida'}
        description={event ? `Consulta las posiciones de salida para ${event.name}.` : undefined}
        url={`/eventos/${slug}/parrilla`}
      />

      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white transition-colors">
          ← {event?.name}
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#e10600] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            {event?.name}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Starting <span className="text-[#e10600]">Grid</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <Shuffle className="w-24 h-24 text-white" />
        </div>
      </div>

      {grids.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1a21] border border-dashed border-[#38383f] rounded-xl text-white/20">
          <Shuffle className="w-12 h-12 mx-auto mb-4 opacity-10" />
          <p className="font-bold uppercase tracking-widest text-sm">La parrilla no ha sido publicada</p>
        </div>
      ) : (
        <>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-8 p-1 bg-[#1a1a21] border border-[#38383f] rounded-lg">
            {grids.map((grid) => (
              <button
                key={grid.id}
                onClick={() => setSelectedCat(grid.eventCategory!.category as Category)}
                className={cn(
                  "flex-1 min-w-[120px] px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-md",
                  selectedCat === grid.eventCategory!.category
                    ? "bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {CATEGORY_LABELS[grid.eventCategory!.category as keyof typeof CATEGORY_LABELS] ?? grid.eventCategory!.category}
              </button>
            ))}
          </div>

          {currentGrid && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#38383f] bg-[#1a1a21]">
                        <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">Pos</th>
                        <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Piloto</th>
                        <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-24">Kart</th>
                        <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-48">Publicado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#38383f]/30">
                      {currentGrid.positions.map((pos) => {
                        const pilot = pos.inscription.pilot;
                        return (
                          <tr
                            key={pos.id}
                            className={cn(
                              "group transition-all duration-200 hover:bg-white/[0.03] border-l-4",
                              pos.position === 1 ? "border-l-yellow-500 bg-yellow-500/5" :
                              pos.position === 2 ? "border-l-slate-300 bg-slate-300/5" :
                              pos.position === 3 ? "border-l-amber-600/60 bg-amber-600/5" :
                              "border-l-transparent"
                            )}
                          >
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "font-black text-2xl italic",
                                  pos.position === 1 ? "text-yellow-400" :
                                  pos.position === 2 ? "text-slate-300" :
                                  pos.position === 3 ? "text-amber-500" :
                                  "text-white/20 group-hover:text-white/40"
                                )}
                                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                              >
                                {pos.position.toString().padStart(2, '0')}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  {pilot.photoUrl ? (
                                    <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt={pilot.name} className="h-9 w-9 object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="h-9 w-9 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                                      <User className="h-4 w-4 text-white/20" />
                                    </div>
                                  )}
                                  {pos.position < 4 && (
                                    <div className={cn(
                                      "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1f1f27]",
                                      pos.position === 1 ? "bg-yellow-500" : pos.position === 2 ? "bg-slate-300" : "bg-amber-600"
                                    )} />
                                  )}
                                </div>
                                <div>
                                  <p
                                    className="font-bold text-white uppercase text-base tracking-tight leading-none group-hover:text-[#e10600] transition-colors"
                                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                                  >
                                    {pilot.name}
                                  </p>
                                  {pilot.alias && <p className="text-[10px] text-white/30 italic mt-0.5 tracking-wider font-medium font-sans">"{pilot.alias}"</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {pos.inscription.kartNumber ? (
                                <span className="font-black text-white text-xl tabular-nums italic bg-white/5 px-3 py-1 rounded" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                  #{pos.inscription.kartNumber}
                                </span>
                              ) : (
                                <span className="text-white/10">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="text-[10px] text-white/20 font-mono uppercase">
                                {new Date(currentGrid.drawnAt).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
