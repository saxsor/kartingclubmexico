import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Trash2, ChevronRight, Search, X } from 'lucide-react';
import { championshipApi } from '../../../api/championship.api';
import { queryKeys } from '../../../lib/react-query';
import { toast } from '../../../store/toast.store';

export function ChampionshipList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear().toString() });
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const listQuery = useQuery({
    queryKey: queryKeys.championships.list(),
    queryFn: () => championshipApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; year: number }) => championshipApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.all });
      setShowForm(false);
      setForm({ name: '', year: new Date().getFullYear().toString() });
      toast.success('Campeonato creado');
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Error al crear'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => championshipApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.all });
      toast.success('Campeonato eliminado');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({ name: form.name, year: parseInt(form.year, 10) });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar el campeonato "${name}"? Los eventos quedarán sin campeonato asignado.`)) return;
    deleteMutation.mutate(id);
  };

  const allChampionships = listQuery.data ?? [];
  const years = [...new Set(allChampionships.map((c) => c.year))].sort((a, b) => b - a);
  const championships = allChampionships.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (yearFilter && String(c.year) !== yearFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Campeonatos
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-racing-red px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#1f1f27] border border-[#38383f] p-4 space-y-3 max-w-md">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Nuevo campeonato</h2>
          {formError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</p>
          )}
          <div>
            <label className="block text-xs text-white/60 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Campeonato 2026"
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Año</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded bg-racing-red px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-white/10 px-4 py-2 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full border border-[#38383f] bg-[#1f1f27] pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border border-[#38383f] bg-[#1f1f27] px-3 py-2 text-xs text-white focus:border-[#e10600] focus:outline-none"
        >
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="text-center py-16 text-white/40 text-sm">Cargando...</div>
      ) : championships.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm border border-dashed border-white/10">
          <Trophy className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>No hay campeonatos creados</p>
          <p className="text-xs mt-1">Crea el primero con el botón "Nuevo"</p>
        </div>
      ) : (
        <div className="space-y-px">
          {championships.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-[#1f1f27] border border-[#38383f] px-4 py-3 hover:bg-[#2a2a35] transition-colors group"
            >
              <button
                className="flex items-center gap-3 flex-1 text-left"
                onClick={() => navigate(`/app/campeonatos/${c.id}`)}
              >
                <div className="w-1 h-8 bg-[#e10600] flex-shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">{c.name}</p>
                  <p className="text-xs text-white/40">{c.year} · {c._count?.events ?? 0} eventos</p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 ml-auto transition-colors" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                disabled={deleteMutation.isPending}
                className="ml-3 p-1.5 text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                title="Eliminar campeonato"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
