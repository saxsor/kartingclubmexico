import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Grid, Flag, BarChart2, ClipboardList } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';

export function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    eventsApi.get(slug).then(setEvent).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!event) return <div className="text-center py-20 text-white/40">Evento no encontrado</div>;

  const actions = [
    { label: 'Inscribirme', to: `/eventos/${slug}/inscribirse`, icon: ClipboardList, show: event.status === 'OPEN', highlight: true },
    { label: 'Parrilla de salida', to: `/eventos/${slug}/parrilla`, icon: Grid, show: event.status !== 'DRAFT', highlight: false },
    { label: 'Resultados', to: `/eventos/${slug}/resultados`, icon: BarChart2, show: event.status === 'FINISHED' || event.status === 'IN_PROGRESS', highlight: false },
  ].filter((a) => a.show);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Meta tags for sharing */}
      <div className="mb-6">
        <Link to="/eventos" className="text-sm text-white/50 hover:text-white">
          ← Eventos
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6">
        <StatusBadge status={event.status} className="mb-3" />
        <h1 className="text-3xl font-black text-white">{event.name}</h1>
        <p className="mt-2 text-white/60 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatDate(event.date)}
        </p>
        {event.description && (
          <p className="mt-4 text-white/70">{event.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {event.eventCategories.filter((c) => c.active).map((c) => (
            <CategoryBadge key={c.id} category={c.category} />
          ))}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`flex items-center gap-4 rounded-xl border p-5 transition-colors group ${
                action.highlight
                  ? 'border-racing-red/50 bg-racing-red/10 hover:bg-racing-red/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-racing-red/20 flex items-center justify-center group-hover:bg-racing-red/30 transition-colors">
                <action.icon className="h-5 w-5 text-racing-red" />
              </div>
              <span className="font-semibold text-white">{action.label}</span>
            </Link>
          ))}
        </div>
      )}

      {event.status === 'IN_PROGRESS' && (
        <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
          <Flag className="h-4 w-4" />
          Este evento está en curso. Los resultados se actualizan en tiempo real.
        </div>
      )}
    </div>
  );
}
