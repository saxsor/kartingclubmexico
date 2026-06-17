import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Trophy, User, ChevronRight, Users } from 'lucide-react';
import { SEO } from '../../components/shared/SEO';
import { championshipApi, ChampionshipStandingsData, ConstructorStandingsData } from '../../api/championship.api';
import { CATEGORY_LABELS, cn, resolveMediaUrl, formatDate } from '../../lib/utils';
import { queryKeys } from '../../lib/react-query';
import { Category } from '../../api/events.api';
import { InlineLoadingState, PageLoadingState } from '../../components/shared/LoadingSkeleton';
import { SocialStandingsExport } from '../../components/shared/SocialStandingsExport';
import { EmptyState } from '../../components/shared/EmptyState';

type ViewMode = 'pilots' | 'constructors';

const ALL_CATEGORIES: Category[] = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];

// ─── Championship list page ───────────────────────────────────────────────────
export function Championship() {
  const navigate = useNavigate();
  const listQuery = useQuery({
    queryKey: queryKeys.championships.list(),
    queryFn: () => championshipApi.list(),
  });

  const championships = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  useEffect(() => {
    if (!listQuery.isLoading && championships.length === 1) {
      navigate(`/campeonato/${championships[0].id}`, { replace: true });
    }
  }, [listQuery.isLoading, championships, navigate]);

  if (listQuery.isLoading || championships.length === 1) {
    return <PageLoadingState rows={4} />;
  }

  return (
    <div>
      <SEO title="Campeonatos" description="Clasificación del campeonato de karting en México. Puntos, posiciones y estadísticas por categoría." url="/campeonato" />
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#f5c400] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            Temporada {new Date().getFullYear()}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Todos los <span className="text-[#f5c400]">Campeonatos</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <Trophy className="w-24 h-24 text-white" />
        </div>
      </div>

      {listQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No pudimos cargar campeonatos"
          description="La tabla de campeonato no respondió. Intenta de nuevo en unos segundos."
          action={{ label: 'Reintentar', onClick: () => listQuery.refetch() }}
        />
      ) : championships.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No hay campeonatos disponibles"
          description="Cuando se active una temporada, aparecerá aquí."
        />
      ) : (
        <div className="space-y-px">
          {championships.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/campeonato/${c.id}`)}
              className="w-full flex items-center gap-4 bg-[#1f1f27] border border-[#38383f] px-6 py-5 hover:bg-[#2a2a35] transition-colors group text-left"
            >
              <div className="w-1 h-10 bg-[#f5c400] flex-shrink-0" />
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
  const [viewMode, setViewMode] = useState<ViewMode>('pilots');

  const detailQuery = useQuery({
    queryKey: id ? queryKeys.championships.detail(id) : ['championships', 'detail', 'missing'],
    queryFn: () => championshipApi.getById(id!),
    enabled: !!id,
  });

  const standingsQuery = useQuery({
    queryKey: id && selectedCat ? queryKeys.championships.standings(id, selectedCat) : ['championships', 'standings', 'missing'],
    queryFn: () => championshipApi.getStandings(id!, selectedCat!),
    enabled: !!id && !!selectedCat && viewMode === 'pilots',
  });

  const constructorQuery = useQuery({
    queryKey: id && selectedCat ? ['championships', 'constructors', id, selectedCat] : ['championships', 'constructors', 'missing'],
    queryFn: () => championshipApi.getConstructorStandings(id!, selectedCat!),
    enabled: !!id && !!selectedCat && viewMode === 'constructors',
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
  const constructorStandings = constructorQuery.data ?? null;
  const loading = detailQuery.isLoading;

  if (loading) return <PageLoadingState rows={4} />;
  if (detailQuery.isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No pudimos cargar el campeonato"
        description="La clasificación no respondió. Intenta de nuevo en unos segundos."
        action={{ label: 'Reintentar', onClick: () => detailQuery.refetch() }}
      />
    );
  }
  if (!championship) return <div className="text-center py-20 text-white/40">Campeonato no encontrado</div>;

  const availableCats = getAvailableCategories(championship.events);
  const displayCats = availableCats.length > 0 ? availableCats : ALL_CATEGORIES;
  const cutoffEvent = [...championship.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).at(-1) ?? null;

  return (
    <div>
      <SEO
        title={championship ? `Clasificación — ${championship.name}` : 'Clasificación'}
        description={championship ? `Clasificación del campeonato ${championship.name}. Puntos por categoría y posiciones finales.` : undefined}
        url={`/campeonato/${id}`}
      />
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/campeonato')}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Todos los campeonatos
        </button>
      </div>

      {/* Page header */}
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#f5c400] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            {championship.name} {championship.year}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Clasificación <span className="text-[#f5c400]">General</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <Trophy className="w-24 h-24 text-white" />
        </div>
      </div>

      {selectedCat && cutoffEvent && viewMode === 'pilots' && standings && standings.standings.length > 0 && (
        <div className="mb-6 flex justify-end">
          <SocialStandingsExport
            title="Campeonato Pilotos"
            championshipName={championship.name}
            eventName={cutoffEvent.name}
            eventLabel="Evento de corte"
            categoryLabel={CATEGORY_LABELS[selectedCat] ?? selectedCat}
            dateLabel={formatDate(cutoffEvent.date)}
            rows={standings.standings.map((row) => ({
              position: row.position,
              name: row.pilotName,
              auxLabel: row.kartNumber ? `Kart #${row.kartNumber}` : row.alias,
              points: row.totalPoints,
              gap: row.gap,
            }))}
            fileBaseName={`${championship.name}-${selectedCat}-pilotos-publico`}
          />
        </div>
      )}

      {selectedCat && cutoffEvent && viewMode === 'constructors' && constructorStandings && constructorStandings.standings.length > 0 && (
        <div className="mb-6 flex justify-end">
          <SocialStandingsExport
            title="Campeonato Constructores"
            championshipName={championship.name}
            eventName={cutoffEvent.name}
            eventLabel="Evento de corte"
            categoryLabel={CATEGORY_LABELS[selectedCat] ?? selectedCat}
            dateLabel={formatDate(cutoffEvent.date)}
            rows={constructorStandings.standings.map((row) => ({
              position: row.position,
              name: row.teamName,
              auxLabel: 'Tabla acumulada',
              points: row.totalPoints,
              gap: row.gap,
            }))}
            fileBaseName={`${championship.name}-${selectedCat}-constructores-publico`}
          />
        </div>
      )}

      {/* View mode toggle: Pilots / Constructors */}
      <div className="flex gap-2 mb-6 p-1 bg-[#1a1a21] border border-[#38383f] rounded-lg w-full md:w-auto">
        <button
          onClick={() => setViewMode('pilots')}
          className={cn(
            'flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-md',
            viewMode === 'pilots'
              ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
              : 'text-white/40 hover:text-white hover:bg-white/5',
          )}
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          <User className="h-3.5 w-3.5" /> Pilotos
        </button>
        <button
          onClick={() => setViewMode('constructors')}
          className={cn(
            'flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-md',
            viewMode === 'constructors'
              ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
              : 'text-white/40 hover:text-white hover:bg-white/5',
          )}
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          <Users className="h-3.5 w-3.5" /> Constructores
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8 p-1 bg-[#1a1a21] border border-[#38383f] rounded-lg">
        {displayCats.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={cn(
              'flex-1 min-w-[120px] px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-md',
              selectedCat === cat
                ? 'bg-[#f5c400] text-[#111111] shadow-[0_0_15px_rgba(245,196,0,0.3)]'
                : 'text-white/40 hover:text-white hover:bg-white/5',
            )}
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {viewMode === 'pilots' ? (
        standingsQuery.isLoading ? (
          <InlineLoadingState lines={4} />
        ) : standingsQuery.isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="No pudimos cargar pilotos"
            description="La clasificación de pilotos no respondió."
            action={{ label: 'Reintentar', onClick: () => standingsQuery.refetch() }}
          />
        ) : !standings || standings.standings.length === 0 ? (
          <div className="text-center py-16 text-white/40 text-sm uppercase tracking-widest">
            No hay datos para esta categoría
          </div>
        ) : (
          <ChampionshipPublicTable standings={standings} />
        )
      ) : (
        constructorQuery.isLoading ? (
          <InlineLoadingState lines={4} />
        ) : constructorQuery.isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="No pudimos cargar constructores"
            description="La clasificación de constructores no respondió."
            action={{ label: 'Reintentar', onClick: () => constructorQuery.refetch() }}
          />
        ) : !constructorStandings || constructorStandings.standings.length === 0 ? (
          <div className="text-center py-16 text-white/40 text-sm uppercase tracking-widest">
            No hay equipos con puntos en esta categoría
          </div>
        ) : (
          <ConstructorPublicTable standings={constructorStandings} />
        )
      )}
    </div>
  );
}

function ConstructorPublicTable({ standings }: { standings: ConstructorStandingsData }) {
  const events = standings.events;
  const rows = standings.standings;

  const positionBorder = (idx: number) =>
    idx === 0 ? 'border-l-4 border-l-yellow-500 bg-yellow-500/5' :
    idx === 1 ? 'border-l-4 border-l-slate-300 bg-slate-300/5' :
    idx === 2 ? 'border-l-4 border-l-amber-600/60 bg-amber-600/5' :
    'border-l-4 border-l-transparent';

  const positionColor = (pos: number) =>
    pos === 1 ? 'text-yellow-400' :
    pos === 2 ? 'text-slate-300' :
    pos === 3 ? 'text-amber-500' :
    'text-white/40';

  return (
    <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1a1a21]">
              <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">Pos</th>
              <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Equipo</th>
              {events.map((e) => (
                <th key={e.id} className="px-3 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-24">
                  <span className="block truncate max-w-[80px] mx-auto" title={e.name}>
                    {e.name.length > 8 ? e.name.slice(0, 7) + '…' : e.name}
                  </span>
                </th>
              ))}
              <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c400] w-24">PTS</th>
              <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-20">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#38383f]/30">
            {rows.map((s, idx) => (
              <tr
                key={s.teamId}
                className={cn(
                  'group transition-all duration-200 hover:bg-white/[0.03]',
                  positionBorder(idx),
                )}
              >
                <td className="px-4 py-3.5">
                  <span
                    className={cn('font-black text-2xl italic', positionColor(s.position))}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {s.position.toString().padStart(2, '0')}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-7 w-7 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                        <Users className="h-3.5 w-3.5 text-white/30" />
                      </div>
                      {idx < 3 && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1f1f27]",
                          idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-300" : "bg-amber-600"
                        )} />
                      )}
                    </div>
                    <div>
                      <p
                        className="font-bold text-white uppercase text-base tracking-tight leading-none group-hover:text-[#f5c400] transition-colors"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                      >
                        {s.teamName}
                      </p>
                    </div>
                  </div>
                </td>
                {events.map((e) => (
                  <td key={e.id} className="px-3 py-3.5 text-center text-white/60 font-mono text-sm">
                    {s.eventPoints[e.id] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-3.5 text-center">
                  <span className="font-black text-white text-xl tabular-nums italic"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {s.totalPoints}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="text-[11px] text-white/30 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-sm">
                    {s.gap === 0 ? 'LEADER' : `-${s.gap}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  const positionBorder = (idx: number) =>
    idx === 0 ? 'border-l-4 border-l-yellow-500 bg-yellow-500/5' :
    idx === 1 ? 'border-l-4 border-l-slate-300 bg-slate-300/5' :
    idx === 2 ? 'border-l-4 border-l-amber-600/60 bg-amber-600/5' :
    'border-l-4 border-l-transparent';

  const positionColor = (pos: number) =>
    pos === 1 ? 'text-yellow-400' :
    pos === 2 ? 'text-slate-300' :
    pos === 3 ? 'text-amber-500' :
    'text-white/40';

  return (
    <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1a1a21]">
              <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">Pos</th>
              <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Piloto</th>
              {events.map((e) => (
                <th key={e.id} className="px-3 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-24">
                  <span className="block truncate max-w-[80px] mx-auto" title={e.name}>
                    {e.name.length > 8 ? e.name.slice(0, 7) + '…' : e.name}
                  </span>
                </th>
              ))}
              <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c400] w-24">PTS</th>
              <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-20">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#38383f]/30">
            {currentStandings.map((s, idx) => (
              <tr
                key={s.pilotId}
                className={cn(
                  'group transition-all duration-200 hover:bg-white/[0.03]',
                  positionBorder(idx),
                )}
              >
                <td className="px-4 py-3.5">
                  <span
                    className={cn('font-black text-2xl italic', positionColor(s.position))}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {s.position.toString().padStart(2, '0')}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {s.photoUrl ? (
                        <img src={resolveMediaUrl(s.photoUrl) ?? ''} alt={s.pilotName} className="h-7 w-7 object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-7 w-7 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-white/30" />
                        </div>
                      )}
                      {idx < 3 && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1f1f27]",
                          idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-300" : "bg-amber-600"
                        )} />
                      )}
                    </div>
                    <div>
                      <p
                        className="font-bold text-white uppercase text-base tracking-tight leading-none group-hover:text-[#f5c400] transition-colors"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                      >
                        {s.pilotName}
                      </p>
                      {s.alias && <p className="text-[10px] text-white/30 italic mt-0.5 tracking-wider font-medium">"{s.alias}"</p>}
                    </div>
                  </div>
                </td>
                {events.map((e) => (
                  <td key={e.id} className="px-3 py-3.5 text-center text-white/60 font-mono text-sm">
                    {s.eventPoints[e.id] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-3.5 text-center">
                  <span className="font-black text-white text-xl tabular-nums italic"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {s.totalPoints}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="text-[11px] text-white/30 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-sm">
                    {s.gap === 0 ? 'LEADER' : `-${s.gap}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
