import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Trophy, ChevronRight, Flag } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';

export function Home() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.list().then((data) => {
      setEvents(data.filter((e) => e.status !== 'DRAFT').slice(0, 6));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const nextEvent = events.find((e) => e.status === 'OPEN' || e.status === 'IN_PROGRESS');
  const finishedEvents = events.filter((e) => e.status === 'FINISHED');

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-16 relative overflow-hidden">
        <div className="absolute inset-0 racing-stripe opacity-30" />
        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-racing-red flex items-center justify-center shadow-lg shadow-red-500/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
            EDEL RACING
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Karting Club México — Resultados, parrillas y campeonato en tiempo real
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/eventos"
              className="rounded-lg bg-racing-red px-6 py-3 font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Ver eventos
            </Link>
            <Link
              to="/campeonato"
              className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Campeonato {new Date().getFullYear()}
            </Link>
          </div>
        </div>
      </section>

      {/* Next Event */}
      {nextEvent && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-racing-red mb-4 flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Próximo evento
          </h2>
          <Link to={`/eventos/${nextEvent.slug}`} className="block group">
            <div className="rounded-xl border border-racing-red/30 bg-racing-red/5 p-6 hover:bg-racing-red/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <StatusBadge status={nextEvent.status} />
                  <h3 className="mt-2 text-2xl font-bold text-white group-hover:text-racing-red transition-colors">
                    {nextEvent.name}
                  </h3>
                  <p className="mt-1 text-white/60 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(nextEvent.date)}
                  </p>
                  {nextEvent.description && (
                    <p className="mt-2 text-white/50 text-sm">{nextEvent.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextEvent.eventCategories.filter((c) => c.active).map((c) => (
                      <CategoryBadge key={c.id} category={c.category} />
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-white/30 group-hover:text-racing-red transition-colors flex-shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Recent Events */}
      {finishedEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Eventos recientes
            </h2>
            <Link to="/eventos" className="text-sm text-racing-red hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finishedEvents.map((event) => (
              <Link key={event.id} to={`/eventos/${event.slug}`} className="group block">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors h-full">
                  <div className="flex items-start justify-between">
                    <StatusBadge status={event.status} />
                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                  <h3 className="mt-2 font-semibold text-white group-hover:text-racing-red transition-colors">
                    {event.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/50">{formatDate(event.date)}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {event.eventCategories.filter((c) => c.active).map((c) => (
                      <CategoryBadge key={c.id} category={c.category} />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="text-center py-20 text-white/40">Cargando eventos...</div>
      )}
    </div>
  );
}
