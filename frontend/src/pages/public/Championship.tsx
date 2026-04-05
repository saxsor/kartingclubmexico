import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { championshipApi, ChampionshipData, Standing } from '../../api/championship.api';
import { CATEGORY_LABELS, getPositionClass, cn } from '../../lib/utils';
import { Category } from '../../api/events.api';

export function Championship() {
  const [data, setData] = useState<ChampionshipData | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    championshipApi.get().then((d) => {
      setData(d);
      const firstCat = Object.keys(d.standings)[0];
      if (firstCat) setSelectedCat(firstCat);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!data) return <div className="text-center py-20 text-white/40">Sin datos de campeonato</div>;

  const categories = Object.keys(data.standings);
  const currentStandings: Standing[] = selectedCat ? (data.standings[selectedCat] ?? []) : [];
  const leaderPoints = currentStandings[0]?.totalPoints ?? 0;

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Campeonato {data.year}</h1>
          <p className="text-white/50 text-sm">Tabla de posiciones acumulada</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selectedCat === cat
                ? 'bg-racing-red text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20',
            )}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {currentStandings.length === 0 ? (
        <div className="text-center py-16 text-white/40">No hay datos para esta categoría</div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Piloto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Eventos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Puntos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Gap</th>
                </tr>
              </thead>
              <tbody>
                {currentStandings.map((s, idx) => (
                  <tr key={s.id} className={cn(
                    'border-b border-white/5 transition-colors hover:bg-white/5',
                    idx === 0 && 'bg-yellow-500/5',
                  )}>
                    <td className="px-4 py-3">
                      <span className={cn('font-bold text-lg', getPositionClass(s.position ?? 99))}>
                        {s.position ?? idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{s.pilot.name}</p>
                      {s.pilot.alias && <p className="text-xs text-white/50">"{s.pilot.alias}"</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-white/70">{s.eventsCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-white text-base">
                      {s.totalPoints}
                    </td>
                    <td className="px-4 py-3 text-center text-white/60">
                      {leaderPoints - s.totalPoints === 0 ? '-' : `-${leaderPoints - s.totalPoints}`}
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
