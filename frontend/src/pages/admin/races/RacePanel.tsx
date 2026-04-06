import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { racesApi, Race } from '../../../api/races.api';
import { eventsApi, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { queryKeys } from '../../../lib/react-query';

export function RacePanel() {
  const { slug } = useParams<{ slug: string }>();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category: '' as Category | '', number: 1, laps: 15 });
  const queryClient = useQueryClient();
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });
  const racesQuery = useQuery({
    queryKey: slug ? queryKeys.races.list(slug) : ['races', 'list', 'missing'],
    queryFn: () => racesApi.list(slug!),
    enabled: !!slug,
  });
  const createMutation = useMutation({
    mutationFn: (data: { category: Category; number: number; laps?: number }) => racesApi.create(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.races.all });
    },
  });
  const patchStatusMutation = useMutation({
    mutationFn: ({ raceId, status }: { raceId: string; status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' }) =>
      racesApi.patchStatus(slug!, raceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.races.all });
    },
  });

  const event = eventQuery.data ?? null;
  const races = racesQuery.data ?? [];
  const loading = eventQuery.isLoading || racesQuery.isLoading;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form.category) return;
    await createMutation.mutateAsync({ category: form.category, number: form.number, laps: form.laps });
    setCreating(false);
  };

  const handleStatus = async (race: Race, status: Race['status']) => {
    if (!slug) return;
    await patchStatusMutation.mutateAsync({ raceId: race.id, status });
  };

  const grouped = races.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, Race[]>);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Carreras</h1>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva carrera
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-white/60 mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              required
              className="rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
            >
              <option value="">Seleccionar</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.category}>{CATEGORY_LABELS[c.category]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Número</label>
            <input
              type="number"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) })}
              min={1} max={10}
              className="w-16 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Vueltas</label>
            <input
              type="number"
              value={form.laps}
              onChange={(e) => setForm({ ...form, laps: parseInt(e.target.value) })}
              min={1}
              className="w-16 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
            Crear
          </button>
        </form>
      )}

      {Object.keys(grouped).map((cat) => (
        <div key={cat}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
            <CategoryBadge category={cat} />
          </h2>
          <div className="space-y-2">
            {grouped[cat].map((race) => (
              <div key={race.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-white">
                      Carrera {race.number} — {race.laps} vueltas
                    </p>
                    <StatusBadge status={race.status} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {race.status === 'PENDING' && (
                      <button
                        onClick={() => handleStatus(race, 'IN_PROGRESS')}
                        className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-500 transition-colors"
                      >
                        Iniciar
                      </button>
                    )}
                    {race.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatus(race, 'FINISHED')}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors"
                      >
                        Finalizar
                      </button>
                    )}
                    <Link
                      to={`/app/eventos/${slug}/carreras/${race.id}`}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10 transition-colors"
                    >
                      Capturar resultados
                    </Link>
                  </div>
                </div>
                {race.results.length > 0 && (
                  <div className="mt-3 text-xs text-white/40">
                    {race.results.length} resultado(s) capturado(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {races.length === 0 && (
        <div className="text-center py-12 text-white/40">No hay carreras creadas aún.</div>
      )}
    </div>
  );
}
