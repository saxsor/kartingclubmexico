import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../../../api/client';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ORGANIZER';
  active: boolean;
  createdAt: string;
}

export function UserManager() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'ORGANIZER' as User['role'] });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({ page, pageSize: 10 }),
    queryFn: () => api.get<{ items: User[]; pagination: PaginationMeta }>(`/users?page=${page}&pageSize=10`),
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
          className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Nuevo usuario</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">
              <X className="h-5 w-5 text-white/40" />
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'name', label: 'Nombre', type: 'text', placeholder: 'Nombre completo' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'usuario@kartingclubmexico.mx' },
              { key: 'password', label: 'Contraseña', type: 'password', placeholder: 'Min. 8 caracteres' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-white/60 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  required
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-white/60 mb-1">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
                className="w-full rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              >
                <option value="ORGANIZER">Organizador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
            Crear usuario
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-white/40">Cargando...</div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Rol</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-white/50">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        user.active ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' :
                        'bg-gray-500/20 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                      }`}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
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
