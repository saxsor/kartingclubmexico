import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, User } from 'lucide-react';
import { pilotsApi, Pilot } from '../../../api/pilots.api';
import { toast } from '../../../store/toast.store';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';
import { resolveMediaUrl } from '../../../lib/utils';

export function PilotList() {
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const listParams = { page, pageSize: 10, search };
  const pilotsQuery = useQuery({
    queryKey: queryKeys.pilots.list(listParams),
    queryFn: () => pilotsApi.list(listParams),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => pilotsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
    },
  });

  const pilots = pilotsQuery.data?.items ?? [];
  const pagination = pilotsQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const loading = pilotsQuery.isLoading;

  const handleDelete = async (pilot: Pilot) => {
    if (!confirm(`¿Eliminar al piloto "${pilot.name}"?`)) return;
    setDeleting(pilot.id);
    try {
      await deleteMutation.mutateAsync(pilot.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Pilotos</h1>
          <p className="text-white/50 text-sm mt-1">{pagination.total} pilotos registrados</p>
        </div>
        <Link
          to="/app/pilotos/nuevo"
          className="flex items-center gap-2 bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo piloto
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, alias o número..."
          className="w-full border border-white/10 bg-[#1f1f27] pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-white/40 text-sm uppercase tracking-widest">Cargando...</div>
      ) : (
        <div className="border border-[#38383f] overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-[#38383f] bg-[#1f1f27]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Piloto</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 hidden sm:table-cell">Alias</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Kart</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40 hidden md:table-cell">Estado</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="border-b border-[#38383f]/50 hover:bg-[#2a2a35] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {pilot.photoUrl ? (
                        <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt={pilot.name} className="h-8 w-8 object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white/20" />
                        </div>
                      )}
                      <span className="font-bold text-white text-sm">{pilot.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs hidden sm:table-cell">
                    {pilot.alias ? `"${pilot.alias}"` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-white/60 text-xs">
                    {pilot.kartNumber ? `#${pilot.kartNumber}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      pilot.active
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {pilot.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`/app/pilotos/${pilot.id}`}
                        className="text-xs font-bold uppercase tracking-wider text-[#e10600] hover:text-white transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(pilot)}
                        disabled={deleting === pilot.id}
                        className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pilots.length === 0 && (
            <div className="text-center py-8 text-white/40 text-sm uppercase tracking-widest">
              No se encontraron pilotos
            </div>
          )}
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemLabel="pilotos"
        onPageChange={setPage}
      />
    </div>
  );
}
