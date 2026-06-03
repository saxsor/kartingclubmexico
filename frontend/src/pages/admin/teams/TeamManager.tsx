import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Pencil, Check, X, RefreshCw, Search } from 'lucide-react';
import { teamsApi, Team } from '../../../api/teams.api';
import { api } from '../../../api/client';
import { toast } from '../../../store/toast.store';
import { PageLoadingState } from '../../../components/shared/LoadingSkeleton';
import { resolveMediaUrl } from '../../../lib/utils';

export function TeamManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    return <PageLoadingState rows={5} />;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Equipos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            title="Recalcula el campeonato de constructores"
            className="flex items-center gap-2 border border-[#38383f] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-[#2a2a35] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            {recalcMutation.isPending ? 'Recalculando...' : 'Recalcular'}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors"
          >
            <Users className="h-4 w-4" />
            Nuevo equipo
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          className="w-full border border-[#38383f] bg-[#15151e] pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
        />
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del equipo"
            className="flex-1 border border-[#38383f] bg-[#15151e] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(''); }}
            className="border border-[#38383f] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:bg-[#2a2a35] transition-colors"
          >
            Cancelar
          </button>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#38383f] text-white/30 text-sm">
          No hay equipos registrados todavía.
        </div>
      ) : (
        <div className="border border-[#38383f] divide-y divide-[#38383f]">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`flex flex-col transition-colors ${
                team.active ? 'bg-[#1f1f27] hover:bg-[#2a2a35]' : 'bg-[#1f1f27]/40 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-1 h-5 bg-[#38383f] flex-shrink-0" />

                {editingId === team.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(team.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 border border-[#38383f] bg-[#15151e] px-2 py-1 text-sm text-white focus:border-[#e10600] focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setExpandedId(expandedId === team.id ? null : team.id)}
                    className="flex-1 text-left text-sm text-white font-bold hover:text-[#e10600] transition-colors"
                  >
                    {team.name}
                  </button>
                )}

                <button
                  onClick={() => setExpandedId(expandedId === team.id ? null : team.id)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  {team._count?.pilots ?? 0} piloto(s)
                </button>

                {editingId === team.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSave(team.id)}
                      disabled={updateMutation.isPending}
                      className="p-1.5 text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-white/40 hover:bg-[#2a2a35] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(team)}
                      className="p-1.5 text-white/30 hover:text-white hover:bg-[#2a2a35] transition-colors"
                      title="Renombrar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(team)}
                      disabled={updateMutation.isPending}
                      className={`px-2 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                        team.active
                          ? 'text-white/30 hover:text-red-400'
                          : 'text-green-400 hover:text-green-300'
                      }`}
                      title={team.active ? 'Desactivar' : 'Activar'}
                    >
                      {team.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </div>

              {expandedId === team.id && (
                <div className="px-4 pb-4 border-t border-[#38383f]/50">
                  <TeamPilotsList teamId={team.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamPilotsList({ teamId }: { teamId: string }) {
  const { data: team, isLoading } = useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => teamsApi.get(teamId),
  });

  if (isLoading) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-6 w-24 animate-pulse bg-[#38383f]" />
        ))}
      </div>
    );
  }

  if (!team || !team.pilots.length) {
    return <p className="mt-3 text-[10px] text-white/20 italic text-center">Sin pilotos activos vinculados.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {team.pilots.map((pilot) => (
        <div
          key={pilot.id}
          className="flex items-center gap-2 border border-[#38383f] bg-[#15151e] py-1 pl-1 pr-2.5"
        >
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden bg-[#38383f]">
            {pilot.photoUrl ? (
              <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
            ) : (
              <Users className="h-2.5 w-2.5 text-white/20" />
            )}
          </div>
          <span className="text-[11px] font-bold text-white/70">{pilot.name}</span>
          {pilot.kartNumber && (
            <span className="text-[9px] font-black text-[#e10600]">#{pilot.kartNumber}</span>
          )}
        </div>
      ))}
    </div>
  );
}
