import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Edit2, Check, X, Plus, Trash2, User, ShieldCheck } from 'lucide-react';
import { championshipApi, ChampionshipEvent, ChampionshipStandingsData, ConstructorStandingsData } from '../../../api/championship.api';
import { eventsApi } from '../../../api/events.api';
import { CATEGORY_LABELS, cn, getPositionClass, resolveMediaUrl } from '../../../lib/utils';
import { queryKeys } from '../../../lib/react-query';
import { toast } from '../../../store/toast.store';
import { Category } from '../../../api/events.api';
import { InlineLoadingState, PageLoadingState } from '../../../components/shared/LoadingSkeleton';
import { SocialStandingsExport } from '../../../components/shared/SocialStandingsExport';
import { formatDate } from '../../../lib/utils';

type ViewMode = 'pilotos' | 'constructores';

const ALL_CATEGORIES: Category[] = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];

export function ChampionshipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pilotos');
  const [showAddEvent, setShowAddEvent] = useState(false);

  const detailQuery = useQuery({
    queryKey: id ? queryKeys.championships.detail(id) : ['championships', 'detail', 'missing'],
    queryFn: () => championshipApi.getById(id!),
    enabled: !!id,
  });

  const standingsQuery = useQuery({
    queryKey: id && selectedCat ? queryKeys.championships.standings(id, selectedCat) : ['championships', 'standings', 'missing'],
    queryFn: () => championshipApi.getStandings(id!, selectedCat!),
    enabled: !!id && !!selectedCat && viewMode === 'pilotos',
  });

  const constructorQuery = useQuery({
    queryKey: id && selectedCat ? ['championships', 'constructors', id, selectedCat] : ['championships', 'constructors', 'missing'],
    queryFn: () => championshipApi.getConstructorStandings(id!, selectedCat!),
    enabled: !!id && !!selectedCat && viewMode === 'constructores',
  });

  const allEventsQuery = useQuery({
    queryKey: queryKeys.events.list({ public: false }),
    queryFn: () => eventsApi.list({ pageSize: 200 }),
    enabled: showAddEvent,
  });

  useEffect(() => {
    if (detailQuery.data && !editingName) {
      setNameInput(detailQuery.data.name);
    }
  }, [detailQuery.data, editingName]);

  // Auto-select first category based on championship events
  useEffect(() => {
    if (!selectedCat && detailQuery.data) {
      const cats = getAvailableCategories(detailQuery.data.events);
      if (cats.length > 0) setSelectedCat(cats[0]);
      else setSelectedCat(ALL_CATEGORIES[0]);
    }
  }, [detailQuery.data, selectedCat]);

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; year?: number }) => championshipApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.all });
      setEditingName(false);
      toast.success('Campeonato actualizado');
    },
  });

  const assignEventMutation = useMutation({
    mutationFn: (eventSlug: string) =>
      eventsApi.update(eventSlug, { championshipId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      setShowAddEvent(false);
      toast.success('Evento agregado al campeonato');
    },
  });

  const removeEventMutation = useMutation({
    mutationFn: (eventSlug: string) =>
      eventsApi.update(eventSlug, { championshipId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      if (selectedCat) {
        queryClient.invalidateQueries({ queryKey: queryKeys.championships.standings(id!, selectedCat) });
      }
      toast.success('Evento quitado del campeonato');
    },
  });

  const championship = detailQuery.data ?? null;
  const standings = standingsQuery.data ?? null;
  const eventsInChampionship = championship?.events ?? [];

  // Events not in this championship
  const allEvents = allEventsQuery.data?.items ?? [];
  const availableToAdd = allEvents.filter(
    (e) => !e.championshipId || e.championshipId === null,
  );

  function getAvailableCategories(events: ChampionshipEvent[]): Category[] {
    const cats = new Set<Category>();
    events.forEach((e) => e.eventCategories?.forEach((c) => cats.add(c.category)));
    return ALL_CATEGORIES.filter((c) => cats.has(c));
  }

  if (detailQuery.isLoading) {
    return <PageLoadingState cards={2} rows={3} />;
  }
  if (!championship) {
    return <div className="text-center py-20 text-white/40">Campeonato no encontrado</div>;
  }

  const availableCats = getAvailableCategories(eventsInChampionship);
  const displayCats = availableCats.length > 0 ? availableCats : ALL_CATEGORIES;
  const cutoffEvent = [...eventsInChampionship].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).at(-1) ?? null;
  const exportCategoryLabel = selectedCat ? (CATEGORY_LABELS[selectedCat] ?? selectedCat) : 'Sin categoría';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/app/campeonatos')} className="text-sm text-white/50 hover:text-white mb-4 block">
          ← Volver a campeonatos
        </button>

        <div className="flex items-start gap-3">
          <Trophy className="h-6 w-6 text-yellow-400 mt-0.5 flex-shrink-0" />
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                className="flex-1 rounded border border-racing-red bg-white/5 px-3 py-1.5 text-xl font-black text-white focus:outline-none"
              />
              <button
                onClick={() => updateMutation.mutate({ name: nameInput })}
                disabled={updateMutation.isPending || !nameInput.trim()}
                aria-label="Guardar nombre del campeonato"
                className="p-1.5 text-green-400 hover:text-green-300 disabled:opacity-40"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                aria-label="Cancelar edición del campeonato"
                className="p-1.5 text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <h1 className="text-2xl font-black text-white">{championship.name}</h1>
              <button
                onClick={() => { setEditingName(true); setNameInput(championship.name); }}
                className="p-1 text-white/20 hover:text-white/70 transition-colors"
                title="Editar nombre"
                aria-label="Editar nombre del campeonato"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-white/40 ml-9">{championship.year} · {eventsInChampionship.length} eventos</p>
      </div>

      {/* Events section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#e10600]" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Eventos del campeonato</h2>
          </div>
          <button
            onClick={() => setShowAddEvent((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar evento
          </button>
        </div>

        {showAddEvent && (
          <div className="mb-4 bg-[#1f1f27] border border-[#38383f] p-4">
            <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">Selecciona un evento para agregar:</p>
            {allEventsQuery.isLoading ? (
              <InlineLoadingState lines={3} />
            ) : availableToAdd.length === 0 ? (
              <p className="text-sm text-white/40">No hay eventos disponibles sin campeonato asignado.</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availableToAdd.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => assignEventMutation.mutate(e.slug)}
                    disabled={assignEventMutation.isPending}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm border border-[#38383f] hover:bg-[#2a2a35] text-white transition-colors disabled:opacity-50"
                  >
                    <span>{e.name}</span>
                    <span className="text-xs text-white/40">{new Date(e.date).toLocaleDateString('es-MX')} · {e.status}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowAddEvent(false)}
              className="mt-3 text-xs text-white/40 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        )}

        {eventsInChampionship.length === 0 ? (
          <p className="text-sm text-white/30 border border-dashed border-white/10 px-4 py-6 text-center">
            Sin eventos asignados. Agrega eventos con el botón de arriba.
          </p>
        ) : (
          <div className="space-y-px">
            {eventsInChampionship.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-[#1f1f27] border border-[#38383f] px-4 py-2.5">
                <div>
                  <p className="text-sm text-white font-medium">{e.name}</p>
                  <p className="text-xs text-white/40">{new Date(e.date).toLocaleDateString('es-MX')} · {e.status}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`¿Quitar "${e.name}" del campeonato?`)) {
                      removeEventMutation.mutate(e.slug);
                    }
                  }}
                  disabled={removeEventMutation.isPending}
                  aria-label={`Quitar ${e.name} del campeonato`}
                  className="p-1.5 text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                  title="Quitar del campeonato"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standings section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#e10600]" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Clasificación del campeonato</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedCat && cutoffEvent && viewMode === 'pilotos' && standings && standings.standings.length > 0 && (
              <SocialStandingsExport
                title="Campeonato Pilotos"
                championshipName={championship.name}
                eventName={cutoffEvent.name}
                eventLabel="Evento de corte"
                categoryLabel={exportCategoryLabel}
                dateLabel={formatDate(cutoffEvent.date)}
                rows={standings.standings.map((row) => ({
                  position: row.position,
                  name: row.pilotName,
                  auxLabel: row.kartNumber ? `Kart #${row.kartNumber}` : row.alias,
                  points: row.totalPoints,
                  gap: row.gap,
                }))}
                fileBaseName={`${championship.name}-${selectedCat}-pilotos`}
              />
            )}
            {selectedCat && cutoffEvent && viewMode === 'constructores' && constructorQuery.data && constructorQuery.data.standings.length > 0 && (
              <SocialStandingsExport
                title="Campeonato Constructores"
                championshipName={championship.name}
                eventName={cutoffEvent.name}
                eventLabel="Evento de corte"
                categoryLabel={exportCategoryLabel}
                dateLabel={formatDate(cutoffEvent.date)}
                rows={constructorQuery.data.standings.map((row) => ({
                  position: row.position,
                  name: row.teamName,
                  auxLabel: 'Tabla acumulada',
                  points: row.totalPoints,
                  gap: row.gap,
                }))}
                fileBaseName={`${championship.name}-${selectedCat}-constructores`}
              />
            )}
            <div className="flex gap-px bg-[#38383f]">
              <button
                onClick={() => setViewMode('pilotos')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                  viewMode === 'pilotos' ? 'bg-[#e10600] text-white' : 'bg-[#1f1f27] text-white/50 hover:text-white hover:bg-[#2a2a35]',
                )}
              >
                <User className="h-3 w-3" />
                Pilotos
              </button>
              <button
                onClick={() => setViewMode('constructores')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                  viewMode === 'constructores' ? 'bg-[#e10600] text-white' : 'bg-[#1f1f27] text-white/50 hover:text-white hover:bg-[#2a2a35]',
                )}
              >
                <ShieldCheck className="h-3 w-3" />
                Constructores
              </button>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-px mb-4 bg-[#38383f]">
          {displayCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={cn(
                'px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                selectedCat === cat
                  ? 'bg-[#e10600] text-white'
                  : 'bg-[#1f1f27] text-white/50 hover:text-white hover:bg-[#2a2a35]',
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {viewMode === 'pilotos' ? (
          standingsQuery.isLoading ? (
            <InlineLoadingState lines={4} />
          ) : !standings || standings.standings.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-sm border border-dashed border-white/10">
              No hay resultados para esta categoría en el campeonato
            </div>
          ) : (
            <ChampionshipStandingsTable standings={standings} />
          )
        ) : (
          constructorQuery.isLoading ? (
            <InlineLoadingState lines={4} />
          ) : !constructorQuery.data || constructorQuery.data.standings.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-sm border border-dashed border-white/10">
              No hay datos de constructores para esta categoría
            </div>
          ) : (
            <ConstructorStandingsTable standings={constructorQuery.data} />
          )
        )}
      </div>
    </div>
  );
}

function ConstructorStandingsTable({ standings }: { standings: ConstructorStandingsData }) {
  const events = standings.events;

  return (
    <div className="border border-[#38383f] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1f1f27]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 w-12">Pos</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Equipo</th>
              {events.map((e) => (
                <th key={e.id} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap max-w-[90px]">
                  <span className="block truncate" title={e.name}>{e.name.length > 12 ? e.name.slice(0, 10) + '…' : e.name}</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Total</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Gap</th>
            </tr>
          </thead>
          <tbody>
            {standings.standings.map((row, idx) => (
              <tr
                key={row.teamId}
                className={cn(
                  'border-b border-[#38383f]/50 transition-colors hover:bg-[#2a2a35]',
                  idx === 0 && 'bg-yellow-500/5',
                  idx === 0 ? 'border-l-[3px] border-l-yellow-500' :
                  idx === 1 ? 'border-l-[3px] border-l-white/20' :
                  idx === 2 ? 'border-l-[3px] border-l-orange-400/40' :
                  'border-l-[3px] border-l-transparent',
                )}
              >
                <td className="px-4 py-2.5">
                  <span
                    className={cn('font-black text-xl', getPositionClass(row.position))}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {row.position}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-400/60 flex-shrink-0" />
                    <span className="font-bold text-white uppercase text-sm"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                      {row.teamName}
                    </span>
                  </div>
                </td>
                {events.map((e) => (
                  <td key={e.id} className="px-3 py-2.5 text-center text-white/70 text-sm">
                    {row.eventPoints[e.id] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-black text-white text-lg"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {row.totalPoints}
                </td>
                <td className="px-4 py-2.5 text-center text-white/40 text-xs font-bold">
                  {row.gap === 0 ? '—' : `-${row.gap}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChampionshipStandingsTable({ standings }: { standings: ChampionshipStandingsData }) {
  const events = standings.events;

  return (
    <div className="border border-[#38383f] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1f1f27]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 w-12">Pos</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Piloto</th>
              {events.map((e) => (
                <th key={e.id} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap max-w-[90px]">
                  <span className="block truncate" title={e.name}>{e.name.length > 12 ? e.name.slice(0, 10) + '…' : e.name}</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Total</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Gap</th>
            </tr>
          </thead>
          <tbody>
            {standings.standings.map((row, idx) => (
              <tr
                key={row.pilotId}
                className={cn(
                  'border-b border-[#38383f]/50 transition-colors hover:bg-[#2a2a35]',
                  idx === 0 && 'bg-yellow-500/5',
                  idx === 0 ? 'border-l-[3px] border-l-yellow-500' :
                  idx === 1 ? 'border-l-[3px] border-l-white/20' :
                  idx === 2 ? 'border-l-[3px] border-l-orange-400/40' :
                  'border-l-[3px] border-l-transparent',
                )}
              >
                <td className="px-4 py-2.5">
                  <span
                    className={cn('font-black text-xl', getPositionClass(row.position))}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {row.position}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {row.photoUrl ? (
                      <img src={resolveMediaUrl(row.photoUrl) ?? ''} alt={row.pilotName} className="h-7 w-7 object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-7 w-7 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-white/30" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white uppercase text-sm leading-tight"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                        {row.pilotName}
                      </p>
                      {row.alias && <p className="text-[10px] text-white/40 italic">"{row.alias}"</p>}
                    </div>
                  </div>
                </td>
                {events.map((e) => (
                  <td key={e.id} className="px-3 py-2.5 text-center text-white/70 text-sm">
                    {row.eventPoints[e.id] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-black text-white text-lg"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {row.totalPoints}
                </td>
                <td className="px-4 py-2.5 text-center text-white/40 text-xs font-bold">
                  {row.gap === 0 ? '—' : `-${row.gap}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
