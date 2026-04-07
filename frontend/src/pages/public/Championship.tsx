import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, User, ChevronRight } from 'lucide-react';
import { championshipApi, ChampionshipStandingsData } from '../../api/championship.api';
import { CATEGORY_LABELS, getPositionClass, cn, resolveMediaUrl } from '../../lib/utils';
import { queryKeys } from '../../lib/react-query';
import { Category } from '../../api/events.api';

const ALL_CATEGORIES: Category[] = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];

// ─── Championship list page ───────────────────────────────────────────────────
export function Championship() {
  const navigate = useNavigate();
  const listQuery = useQuery({
    queryKey: queryKeys.championships.list(),
    queryFn: () => championshipApi.list(),
  });

  const championships = listQuery.data ?? [];

  useEffect(() => {
    if (!listQuery.isLoading && championships.length === 1) {
      navigate(`/campeonato/${championships[0].id}`, { replace: true });
    }
  }, [listQuery.isLoading, championships, navigate]);

  if (listQuery.isLoading || championships.length === 1) {
    return <div className="text-center py-20 text-white/40">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            <Trophy className="inline h-3 w-3 mr-1.5 text-yellow-400" />
            Campeonatos
          </span>
        </div>
        <h1
          className="text-4xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Campeonatos
        </h1>
      </div>

      {championships.length === 0 ? (
        <div className="text-center py-20 text-white/40 text-sm">No hay campeonatos disponibles</div>
      ) : (
        <div className="space-y-px">
          {championships.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/campeonato/${c.id}`)}
              className="w-full flex items-center gap-4 bg-[#1f1f27] border border-[#38383f] px-6 py-5 hover:bg-[#2a2a35] transition-colors group text-left"
            >
              <div className="w-1 h-10 bg-[#e10600] flex-shrink-0" />
              <div className="flex-1">
                <p
                  className="text-xl font-black text-white uppercase"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {c.name}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {c.year} · {c._count?.events ?? 0} eventos
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white/60 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Championship detail page ─────────────────────────────────────────────────
export function ChampionshipDetailPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  const detailQuery = useQuery({
    queryKey: id ? queryKeys.championships.detail(id) : ['championships', 'detail', 'missing'],
    queryFn: () => championshipApi.getById(id!),
    enabled: !!id,
  });

  const standingsQuery = useQuery({
    queryKey: id && selectedCat ? queryKeys.championships.standings(id, selectedCat) : ['championships', 'standings', 'missing'],
    queryFn: () => championshipApi.getStandings(id!, selectedCat!),
    enabled: !!id && !!selectedCat,
  });

  // Auto-select first category
  useEffect(() => {
    if (!selectedCat && detailQuery.data) {
      const cats = getAvailableCategories(detailQuery.data.events);
      setSelectedCat(cats.length > 0 ? cats[0] : ALL_CATEGORIES[0]);
    }
  }, [detailQuery.data, selectedCat]);

  const championship = detailQuery.data ?? null;
  const standings = standingsQuery.data ?? null;
  const loading = detailQuery.isLoading;

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!championship) return <div className="text-center py-20 text-white/40">Campeonato no encontrado</div>;

  const availableCats = getAvailableCategories(championship.events);
  const displayCats = availableCats.length > 0 ? availableCats : ALL_CATEGORIES;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/campeonato')}
        className="text-sm text-white/40 hover:text-white mb-6 block transition-colors"
      >
        ← Todos los campeonatos
      </button>

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
          {championship.name}
        </h1>
        <p className="text-sm text-white/40 mt-1">{championship.year} · {championship.events.length} eventos</p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-px mb-6 bg-[#38383f]">
        {displayCats.map((cat) => (
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

      {standingsQuery.isLoading ? (
        <div className="text-center py-10 text-white/40 text-sm">Cargando clasificación...</div>
      ) : !standings || standings.standings.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm uppercase tracking-widest">
          No hay datos para esta categoría
        </div>
      ) : (
        <ChampionshipPublicTable standings={standings} />
      )}
    </div>
  );
}

function getAvailableCategories(events: Array<{ eventCategories?: { category: Category }[] }>): Category[] {
  const cats = new Set<Category>();
  events.forEach((e) => e.eventCategories?.forEach((c) => cats.add(c.category)));
  return ALL_CATEGORIES.filter((c) => cats.has(c));
}

function ChampionshipPublicTable({ standings }: { standings: ChampionshipStandingsData }) {
  const events = standings.events;
  const currentStandings = standings.standings;

  return (
    <div className="border border-[#38383f] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1f1f27]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 w-12">Pos</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Piloto</th>
              {events.map((e) => (
                <th key={e.id} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <span className="block truncate max-w-[80px]" title={e.name}>
                    {e.name.length > 10 ? e.name.slice(0, 9) + '…' : e.name}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Puntos</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Gap</th>
            </tr>
          </thead>
          <tbody>
            {currentStandings.map((s, idx) => (
              <tr
                key={s.pilotId}
                className={cn(
                  'border-b border-[#38383f]/60 transition-colors hover:bg-[#2a2a35]',
                  idx === 0 && 'bg-yellow-500/5 border-l-[3px] border-l-yellow-500',
                  idx === 1 && 'border-l-[3px] border-l-white/20',
                  idx === 2 && 'border-l-[3px] border-l-orange-400/40',
                  idx > 2 && 'border-l-[3px] border-l-transparent',
                )}
              >
                <td className="px-4 py-3">
                  <span
                    className={cn('font-black text-xl', getPositionClass(s.position))}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {s.position}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {s.photoUrl ? (
                      <img src={resolveMediaUrl(s.photoUrl) ?? ''} alt={s.pilotName} className="h-7 w-7 object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-7 w-7 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-white/30" />
                      </div>
                    )}
                    <div>
                      <p
                        className="font-bold text-white uppercase text-sm leading-tight"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                      >
                        {s.pilotName}
                      </p>
                      {s.alias && <p className="text-[10px] text-white/40 italic">"{s.alias}"</p>}
                    </div>
                  </div>
                </td>
                {events.map((e) => (
                  <td key={e.id} className="px-3 py-3 text-center text-white/70 text-sm">
                    {s.eventPoints[e.id] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-black text-white text-lg"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {s.totalPoints}
                </td>
                <td className="px-4 py-3 text-center text-white/40 text-xs font-bold">
                  {s.gap === 0 ? '—' : `-${s.gap}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
