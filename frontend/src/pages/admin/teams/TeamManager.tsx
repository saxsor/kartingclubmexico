import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Pencil, Check, X, RefreshCw, Search, Plus } from 'lucide-react';
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
    onSuccess: (res) => toast.success(`Standings actualizados — ${res.combos} combinación(es) recalculada(s)`),
    onError: () => toast.error('Error al recalcular'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; active?: boolean } }) => teamsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); setEditingId(null); toast.success('Equipo actualizado'); },
    onError: (err: unknown) => { const e = err as { message?: string }; toast.error(e?.message ?? 'Error al actualizar equipo'); },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => teamsApi.create(name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); setNewName(''); setCreating(false); toast.success('Equipo creado'); },
    onError: (err: unknown) => { const e = err as { message?: string }; toast.error(e?.message ?? 'Error al crear equipo'); },
  });

  const handleEdit = (team: Team) => { setEditingId(team.id); setEditName(team.name); };
  const handleSave = (id: string) => { if (!editName.trim()) return; updateMutation.mutate({ id, data: { name: editName.trim() } }); };
  const handleToggleActive = (team: Team) => updateMutation.mutate({ id: team.id, data: { active: !team.active } });
  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); if (!newName.trim()) return; createMutation.mutate(newName.trim()); };

  if (isLoading) return <PageLoadingState rows={5} />;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Constructor <span className="text-[#e10600]">Teams</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            {allTeams.length} equipo{allTeams.length !== 1 ? 's' : ''} registrado{allTeams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            title="Recalcula el campeonato de constructores"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            Recalcular
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-[#e10600] hover:bg-[#ff0700] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(225,6,0,0.2)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo equipo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
        />
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del equipo"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
          />
          <button type="submit" disabled={createMutation.isPending}
            className="rounded-lg bg-[#e10600] hover:bg-[#ff0700] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-60">
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </button>
          <button type="button" onClick={() => { setCreating(false); setNewName(''); }}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-white/50 hover:bg-white/10 transition-colors">
            Cancelar
          </button>
        </form>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-white/30 text-sm">
          <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>No hay equipos registrados todavía.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`rounded-xl border transition-all ${
                team.active
                  ? 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                  : 'border-white/5 bg-white/[0.02] opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e10600]/10 flex-shrink-0">
                  <Users className="h-4 w-4 text-[#e10600]" />
                </div>

                {editingId === team.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(team.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white focus:border-[#e10600] focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setExpandedId(expandedId === team.id ? null : team.id)}
                    className="flex-1 text-left text-sm font-bold text-white hover:text-[#e10600] transition-colors"
                  >
                    {team.name}
                  </button>
                )}

                <span className="text-xs text-white/30">{team._count?.pilots ?? 0} piloto(s)</span>

                {editingId === team.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleSave(team.id)} disabled={updateMutation.isPending}
                      className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(team)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Renombrar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(team)} disabled={updateMutation.isPending}
                      className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                        team.active ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:bg-green-500/10'
                      }`}>
                      {team.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </div>

              {expandedId === team.id && (
                <div className="px-4 pb-4 border-t border-white/5">
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
        {[1, 2].map((i) => <div key={i} className="h-6 w-24 animate-pulse rounded-full bg-white/5" />)}
      </div>
    );
  }

  if (!team || !team.pilots.length) {
    return <p className="mt-3 text-[10px] text-white/20 italic text-center">Sin pilotos activos vinculados.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {team.pilots.map((pilot) => (
        <div key={pilot.id} className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 py-1 pl-1 pr-2.5">
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white/10">
            {pilot.photoUrl
              ? <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
              : <Users className="h-2.5 w-2.5 text-white/20" />
            }
          </div>
          <span className="text-[11px] font-medium text-white/70">{pilot.name}</span>
          {pilot.kartNumber && <span className="text-[9px] font-black text-[#e10600]">#{pilot.kartNumber}</span>}
        </div>
      ))}
    </div>
  );
}
