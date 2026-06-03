import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      api.patch(`/users/${userId}/active`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Usuarios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-[#38383f] bg-[#1f1f27] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white uppercase tracking-wider text-sm">Nuevo usuario</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">
              <X className="h-5 w-5 text-white/40 hover:text-white transition-colors" />
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
                  className="w-full border border-[#38383f] bg-[#15151e] px-3 py-2 text-sm text-white placeholder-white/20 focus:border-[#e10600] focus:outline-none transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
                className="w-full border border-[#38383f] bg-[#15151e] px-3 py-2 text-sm text-white focus:border-[#e10600] focus:outline-none"
              >
                <option value="ORGANIZER">Organizador</option>
                <option value="VALIDATOR">Validador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-[#38383f] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:bg-[#2a2a35] transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email..."
            className="w-full border border-[#38383f] bg-[#15151e] pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as User['role'] | ''); setPage(1); }}
          className="border border-[#38383f] bg-[#15151e] px-3 py-2 text-sm text-white focus:border-[#e10600] focus:outline-none"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ORGANIZER">Organizador</option>
          <option value="VALIDATOR">Validador</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value as 'true' | 'false' | ''); setPage(1); }}
          className="border border-[#38383f] bg-[#15151e] px-3 py-2 text-sm text-white focus:border-[#e10600] focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        {(search || roleFilter || activeFilter !== '') && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setActiveFilter(''); setPage(1); }}
            className="flex items-center gap-1 border border-[#38383f] px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-[#2a2a35] transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <TableLoadingState rows={6} />
      ) : (
        <div className="border border-[#38383f] overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-[#38383f] bg-[#1a1a21]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Usuario</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Rol</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Estado</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#38383f]/50 transition-colors hover:bg-[#2a2a35]">
                  <td className="px-4 py-3">
                    <p className="font-bold text-white">{user.name}</p>
                    <p className="text-xs text-white/50">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      user.role === 'ADMIN' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                      user.role === 'VALIDATOR' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                      'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    }`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                        user.active
                          ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-white/5 text-white/30 border-white/10 hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/30'
                      }`}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-xs font-bold uppercase tracking-wider text-red-400/50 hover:text-red-400 transition-colors"
                    >
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
