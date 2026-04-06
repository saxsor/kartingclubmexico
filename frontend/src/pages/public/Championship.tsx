import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, User } from 'lucide-react';
import { championshipApi, Standing } from '../../api/championship.api';
import { CATEGORY_LABELS, getPositionClass, cn, resolveMediaUrl } from '../../lib/utils';
import { queryKeys } from '../../lib/react-query';

export function Championship() {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const championshipQuery = useQuery({
    queryKey: queryKeys.championship.current(),
    queryFn: () => championshipApi.get(),
  });

  useEffect(() => {
    const data = championshipQuery.data;
    if (!data || selectedCat) return;
    const firstCat = Object.keys(data.standings)[0];
    if (firstCat) setSelectedCat(firstCat);
  }, [championshipQuery.data, selectedCat]);

  const data = championshipQuery.data ?? null;
  const loading = championshipQuery.isLoading;

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!data) return <div className="text-center py-20 text-white/40">Sin datos de campeonato</div>;

  const categories = Object.keys(data.standings);
  const currentStandings: Standing[] = selectedCat ? (data.standings[selectedCat] ?? []) : [];
  const leaderPoints = currentStandings[0]?.totalPoints ?? 0;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            <Trophy className="inline h-3 w-3 mr-1.5 text-yellow-400" />
            Clasificación general
          </span>
        </div>
        <h1
          className="text-4xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Campeonato {data.year}
        </h1>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-px mb-6 bg-[#38383f]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={cn(
              'px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors',
              selectedCat === cat
                ? 'bg-[#e10600] text-white'
                : 'bg-[#1f1f27] text-white/50 hover:text-white hover:bg-[#2a2a35]',
            )}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {currentStandings.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm uppercase tracking-widest">No hay datos para esta categoría</div>
      ) : (
        <div className="border border-[#38383f] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#38383f] bg-[#1f1f27]">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 w-12">Pos</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Piloto</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Eventos</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Puntos</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Gap</th>
                </tr>
              </thead>
              <tbody>
                {currentStandings.map((s, idx) => (
                  <tr key={s.id} className={cn(
                    'border-b border-[#38383f]/60 transition-colors hover:bg-[#2a2a35]',
                    idx === 0 && 'bg-yellow-500/5 border-l-[3px] border-l-yellow-500',
                    idx === 1 && 'border-l-[3px] border-l-white/20',
                    idx === 2 && 'border-l-[3px] border-l-orange-400/40',
                    idx > 2 && 'border-l-[3px] border-l-transparent',
                  )}>
                    <td className="px-4 py-3">
                      <span className={cn('font-black text-xl', getPositionClass(s.position ?? 99))}
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {s.position ?? idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.pilot.photoUrl ? (
                          <img src={resolveMediaUrl(s.pilot.photoUrl) ?? ''} alt={s.pilot.name} className="h-7 w-7 object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-7 w-7 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-white/30" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white uppercase text-sm leading-tight"
                            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                            {s.pilot.name}
                          </p>
                          {s.pilot.alias && <p className="text-[10px] text-white/40 italic">"{s.pilot.alias}"</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-white/50 text-xs">{s.eventsCount}</td>
                    <td className="px-4 py-3 text-center font-black text-white text-lg"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {s.totalPoints}
                    </td>
                    <td className="px-4 py-3 text-center text-white/40 text-xs font-bold">
                      {leaderPoints - s.totalPoints === 0 ? '—' : `-${leaderPoints - s.totalPoints}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
