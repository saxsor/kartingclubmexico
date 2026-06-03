import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X, Search, UserCog } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { api } from '../../../api/client';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';
import { TableLoadingState } from '../../../components/shared/LoadingSkeleton';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ORGANIZER' | 'VALIDATOR';
  active: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<User['role'], string> = {
  ADMIN: 'Admin',
  ORGANIZER: 'Organizador',
  VALIDATOR: 'Validador',
};

const ROLE_COLOR: Record<User['role'], string> = {
  ADMIN: 'bg-red-500/20 text-red-400',
  ORGANIZER: 'bg-blue-500/20 text-blue-400',
  VALIDATOR: 'bg-yellow-500/20 text-yellow-400',
};

export function UserManager() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'ORGANIZER' as User['role'] });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<User['role'] | ''>('');
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | ''>('');
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const listParams = {
    page, pageSize: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(activeFilter !== '' ? { active: activeFilter === 'true' } : {}),
  };

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(listParams),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);
      if (activeFilter !== '') params.set('active', activeFilter);
      return api.get<{ items: User[]; pagination: PaginationMeta }>(`/users?${params}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post<User>('/users', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.users.all }); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      api.patch(`/users/${userId}/active`, { active }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.users.all }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.users.all }); },
  });

  const users = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const loading = usersQuery.isLoading;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync(form);
      setShowForm(false);
      setForm({ email: '', password: '', name: '', role: 'ORGANIZER' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    }
  };

  const handleToggleActive = async (user: User) => {
    await toggleActiveMutation.mutateAsync({ userId: user.id, active: !user.active });
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar usuario ${user.name}?`)) return;
    await deleteMutation.mutateAsync(user.id);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Control <span className="text-[#e10600]">Usuarios</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            {pagination.total} usuario{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-[#e10600] hover:bg-[#ff0700] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(225,6,0,0.2)]"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e10600]/10 rounded-lg">
                <UserCog className="h-4 w-4 text-[#e10600]" />
              </div>
              <h2 className="font-black text-white uppercase tracking-wider text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Nuevo usuario</h2>
            </div>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario" className="text-white/30 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {error && (
            <div className="border-l-4 border-red-500 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'name', label: 'Nombre', type: 'text', placeholder: 'Nombre completo' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'usuario@kartingclubmexico.mx' },
              { key: 'password', label: 'Contraseña', type: 'password', placeholder: 'Min. 8 caracteres' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  required
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-[#e10600] focus:outline-none transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
                className="w-full rounded-lg border border-white/10 bg-[#15151e] px-3 py-2 text-sm text-white focus:border-[#e10600] focus:outline-none"
              >
                <option value="ORGANIZER">Organizador</option>
                <option value="VALIDATOR">Validador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg bg-[#e10600] hover:bg-[#ff0700] px-5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50">
              {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:bg-white/10 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as User['role'] | ''); setPage(1); }}
          className="rounded-lg border border-white/10 bg-[#15151e] px-3 py-2 text-sm text-white focus:border-[#e10600] focus:outline-none">
          <option value="">Todos los roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ORGANIZER">Organizador</option>
          <option value="VALIDATOR">Validador</option>
        </select>
        <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value as 'true' | 'false' | ''); setPage(1); }}
          className="rounded-lg border border-white/10 bg-[#15151e] px-3 py-2 text-sm text-white focus:border-[#e10600] focus:outline-none">
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        {(search || roleFilter || activeFilter !== '') && (
          <button onClick={() => { setSearch(''); setRoleFilter(''); setActiveFilter(''); setPage(1); }}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <TableLoadingState rows={6} />
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Usuario</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Rol</th>
                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/40">Estado</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-white/40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-bold text-white">{user.name}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_COLOR[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors ${
                        user.active
                          ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                          : 'bg-white/5 text-white/30 hover:bg-green-500/20 hover:text-green-400'
                      }`}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(user)} className="text-xs text-red-400/50 hover:text-red-400 transition-colors font-bold uppercase tracking-wider">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemLabel="usuarios"
        onPageChange={setPage}
      />
    </div>
  );
}
