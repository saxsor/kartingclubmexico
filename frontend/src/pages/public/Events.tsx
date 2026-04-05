import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';

export function Events() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.list()
      .then((data) => setEvents(data.filter((e) => e.status !== 'DRAFT')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Eventos</h1>
        <p className="text-white/50 mt-1">Todos los eventos de la temporada</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-white/40">No hay eventos disponibles</div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Link key={event.id} to={`/eventos/${event.slug}`} className="block group">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={event.status} />
                      <h2 className="text-lg font-bold text-white group-hover:text-racing-red transition-colors">
                        {event.name}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-white/50 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(event.date)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {event.eventCategories.filter((c) => c.active).map((c) => (
                        <CategoryBadge key={c.id} category={c.category} />
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/70 flex-shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
