import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Hash } from 'lucide-react';
import { pilotsApi, Pilot } from '../../../api/pilots.api';

export function PilotList() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pilotsApi.list().then(setPilots).finally(() => setLoading(false));
  }, []);

  const filtered = pilots.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.alias?.toLowerCase().includes(search.toLowerCase()) ||
    p.kartNumber?.toString().includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Pilotos</h1>
          <p className="text-white/50 text-sm mt-1">{pilots.length} pilotos registrados</p>
        </div>
        <Link
          to="/app/pilotos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, alias o número..."
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-white/40">Cargando...</div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Piloto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Alias</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Kart</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pilot) => (
                <tr key={pilot.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{pilot.name}</td>
                  <td className="px-4 py-3 text-white/60">{pilot.alias ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {pilot.kartNumber ? (
                      <span className="font-mono font-bold text-white/80">#{pilot.kartNumber}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      pilot.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {pilot.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/pilotos/${pilot.id}`} className="text-xs text-racing-red hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-white/40">No se encontraron pilotos</div>
          )}
        </div>
      )}
    </div>
  );
}
