import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { eventsApi, KartEvent } from '../../../api/events.api';
import { toast } from '../../../store/toast.store';
import { formatDate } from '../../../lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';

export function EventList() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    eventsApi.list().then(setEvents).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (event: KartEvent) => {
    if (!confirm(`¿Eliminar el evento "${event.name}"? Esta acción eliminará también todas sus inscripciones, carreras y resultados. No se puede deshacer.`)) return;
    setDeleting(event.slug);
    try {
      await eventsApi.delete(event.slug);
      setEvents((prev) => prev.filter((e) => e.slug !== event.slug));
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
          <h1 className="text-2xl font-black text-white">Eventos</h1>
          <p className="text-white/50 text-sm mt-1">{events.length} eventos</p>
        </div>
        <Link
          to="/app/eventos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-10 text-white/40">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={event.status} />
                    <h2 className="font-bold text-white truncate">{event.name}</h2>
                  </div>
                  <p className="text-sm text-white/50 mt-1">{formatDate(event.date)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.eventCategories.filter((c) => c.active).map((c) => (
                      <CategoryBadge key={c.id} category={c.category} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/app/eventos/${event.slug}`}
                    className="rounded-lg bg-racing-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    Gestionar
                  </Link>
                  <Link
                    to={`/app/eventos/${event.slug}/editar`}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={deleting === event.slug}
                    className="rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-center py-12 text-white/40">No hay eventos. Crea el primero.</div>
          )}
        </div>
      )}
    </div>
  );
}
