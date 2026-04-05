import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, Flag } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { pilotsApi, Pilot } from '../../api/pilots.api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';

export function Dashboard() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([eventsApi.list(), pilotsApi.list()])
      .then(([e, p]) => { setEvents(e); setPilots(p); })
      .finally(() => setLoading(false));
  }, []);

  const activeEvent = events.find((e) => e.status === 'IN_PROGRESS');
  const openEvents = events.filter((e) => e.status === 'OPEN');
  const recentEvents = events.slice(0, 5);

  const stats = [
    { label: 'Pilotos registrados', value: pilots.filter((p) => p.active).length, icon: Users, color: 'text-blue-400' },
    { label: 'Eventos totales', value: events.length, icon: Calendar, color: 'text-green-400' },
    { label: 'Eventos abiertos', value: openEvents.length, icon: Flag, color: 'text-yellow-400' },
    { label: 'En curso', value: activeEvent ? 1 : 0, icon: Trophy, color: 'text-racing-red' },
  ];

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Resumen general del sistema</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-black text-white">{stat.value}</p>
            <p className="text-sm text-white/50 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {activeEvent && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1 flex items-center gap-2">
                <Flag className="h-3.5 w-3.5" />
                Evento en curso
              </p>
              <h2 className="text-xl font-bold text-white">{activeEvent.name}</h2>
              <p className="text-sm text-white/60 mt-0.5">{formatDate(activeEvent.date)}</p>
            </div>
            <Link
              to={`/app/eventos/${activeEvent.slug}`}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 transition-colors"
            >
              Gestionar
            </Link>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Eventos recientes</h2>
          <Link to="/app/eventos" className="text-sm text-racing-red hover:underline">Ver todos</Link>
        </div>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Evento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Acción</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{event.name}</td>
                  <td className="px-4 py-3 text-white/60">{formatDate(event.date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={event.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/eventos/${event.slug}`} className="text-xs text-racing-red hover:underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
