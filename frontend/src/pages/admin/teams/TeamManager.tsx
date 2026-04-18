import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Pencil, Check, X, RefreshCw, Search } from 'lucide-react';
import { teamsApi, Team } from '../../../api/teams.api';
import { api } from '../../../api/client';
import { toast } from '../../../store/toast.store';

export function TeamManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const { data: allTeams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list(),
  });
  const teams = search
    ? allTeams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTeams;

  const recalcMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean; updated: number; combos: number }>('/admin/audit-log/recalculate-constructors', {}),
    onSuccess: (res) => {
      toast.success(`Standings actualizados — ${res.combos} combinación(es) recalculada(s)`);
    },
    onError: () => toast.error('Error al recalcular'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; active?: boolean } }) =>
      teamsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setEditingId(null);
      toast.success('Equipo actualizado');
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      toast.error(e?.message ?? 'Error al actualizar equipo');
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => teamsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setNewName('');
      setCreating(false);
      toast.success('Equipo creado');
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      toast.error(e?.message ?? 'Error al crear equipo');
    },
  });

  const handleEdit = (team: Team) => {
    setEditingId(team.id);
    setEditName(team.name);
  };

  const handleSave = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id, data: { name: editName.trim() } });
  };

  const handleToggleActive = (team: Team) => {
    updateMutation.mutate({ id: team.id, data: { active: !team.active } });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  if (isLoading) {
    return <div className="text-white/50 text-sm">Cargando equipos...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Equipos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            title="Backfill snapshots de equipo en resultados pasados y recalcula el campeonato de constructores"
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            {recalcMutation.isPending ? 'Recalculando...' : 'Recalcular constructores'}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <Users className="h-4 w-4" />
            Nuevo equipo
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
        />
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="mb-6 flex gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del equipo"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 rounded-lg bg-racing-red text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(''); }}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
          No hay equipos registrados todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                team.active ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/2 opacity-50'
              }`}
            >
              <Users className="h-4 w-4 text-white/30 flex-shrink-0" />

              {editingId === team.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(team.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 rounded border border-white/20 bg-white/10 px-2 py-1 text-sm text-white focus:border-racing-red focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-sm text-white font-medium">{team.name}</span>
              )}

              <span className="text-xs text-white/30">{team._count?.pilots ?? 0} piloto(s)</span>

              {editingId === team.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSave(team.id)}
                    disabled={updateMutation.isPending}
                    className="p-1.5 rounded text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 rounded text-white/40 hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(team)}
                    className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Renombrar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(team)}
                    disabled={updateMutation.isPending}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      team.active
                        ? 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                    title={team.active ? 'Desactivar' : 'Activar'}
                  >
                    {team.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
