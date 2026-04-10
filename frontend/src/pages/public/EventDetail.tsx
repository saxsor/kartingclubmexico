import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Grid, Flag, BarChart2, ClipboardList, ChevronRight, MapPin, Users } from 'lucide-react';
import { SEO } from '../../components/shared/SEO';
import { eventsApi } from '../../api/events.api';
import { formatDate, resolveMediaUrl } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';
import { queryKeys } from '../../lib/react-query';

export function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });

  const event = eventQuery.data ?? null;
  const loading = eventQuery.isLoading;

  if (loading) return (
    <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Cargando...</div>
  );
  if (!event) return (
    <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Evento no encontrado</div>
  );

  const actions = [
    { label: 'Inscribirme', to: `/eventos/${slug}/inscribirse`, icon: ClipboardList, show: event.status === 'OPEN', highlight: true },
    { label: 'Pilotos inscritos', to: `/eventos/${slug}/pilotos`, icon: Users, show: event.status !== 'DRAFT', highlight: false },
    { label: 'Parrilla de salida', to: `/eventos/${slug}/parrilla`, icon: Grid, show: event.status !== 'DRAFT', highlight: false },
    { label: 'Resultados', to: `/eventos/${slug}/resultados`, icon: BarChart2, show: event.status === 'FINISHED' || event.status === 'IN_PROGRESS', highlight: false },
  ].filter((a) => a.show);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: event.description ?? `Evento de karting: ${event.name}`,
    startDate: event.date,
    location: { '@type': 'Place', name: event.track ?? 'Karting Club México' },
    organizer: { '@type': 'Organization', name: 'Karting Club México' },
    url: `${window.location.origin}/eventos/${slug}`,
    ...(event.posterUrl && { image: resolveMediaUrl(event.posterUrl) }),
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-0">
      <SEO
        title={event.name}
        description={event.description ?? `Evento de karting el ${new Date(event.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}${event.track ? ` en ${event.track}` : ''}.`}
        image={event.posterUrl ? resolveMediaUrl(event.posterUrl) ?? undefined : undefined}
        url={`/eventos/${slug}`}
        type="article"
        jsonLd={jsonLd}
      />
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/eventos"
          className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
        >
          ← Eventos
        </Link>
      </div>

      {/* Event header — poster or default */}
      {event.posterUrl ? (
        /* ── POSTER MODE ── */
        <div className="relative mb-6 bg-[#0d0d14]">
          <img
            src={resolveMediaUrl(event.posterUrl) ?? ''}
            alt={event.name}
            className="w-full object-contain"
          />
          {/* Gradient overlay — bottom to top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#15151e] via-[#15151e]/60 to-transparent" />
          {/* Left red accent bar */}
          <div className="absolute top-0 left-0 w-1 h-full bg-[#e10600]" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <StatusBadge status={event.status} className="mb-3" />
            <h1
              className="text-4xl md:text-5xl font-black text-white uppercase leading-tight drop-shadow-lg"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              {event.name}
            </h1>
            <p className="mt-2 text-white/70 flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {formatDate(event.date)}
            </p>
            {event.track && (
              <p className="mt-1 text-white/50 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                {event.track}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* ── DEFAULT MODE (checkered) ── */
        <div className="relative border-t-[3px] border-[#e10600] bg-[#1f1f27] p-6 mb-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-full opacity-5 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="checker-detail" width="10" height="10" patternUnits="userSpaceOnUse">
                  <rect width="5" height="5" fill="white"/>
                  <rect x="5" y="5" width="5" height="5" fill="white"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#checker-detail)"/>
            </svg>
          </div>
          <div className="relative">
            <StatusBadge status={event.status} className="mb-4" />
            <h1
              className="text-4xl md:text-5xl font-black text-white uppercase leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              {event.name}
            </h1>
            <p className="mt-3 text-white/50 flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {formatDate(event.date)}
            </p>
            {event.track && (
              <p className="mt-1 text-white/40 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                {event.track}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Description + categories (below poster or inline for default) */}
      {(event.description || event.eventCategories.some(c => c.active)) && (
        <div className="mb-6 px-1">
          {event.description && (
            <p className="text-white/60 text-sm leading-relaxed mb-3">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {event.eventCategories.filter((c) => c.active).map((c) => (
              <CategoryBadge key={c.id} category={c.category} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`group flex items-center gap-4 p-5 transition-colors ${
                action.highlight
                  ? 'bg-[#e10600] hover:bg-[#b30500] text-white'
                  : 'border-t-[3px] border-[#38383f] bg-[#1f1f27] hover:bg-[#2a2a35] hover:border-[#e10600] text-white'
              }`}
            >
              <div className={`h-10 w-10 flex items-center justify-center flex-shrink-0 ${
                action.highlight ? 'bg-white/20' : 'bg-[#2a2a35] group-hover:bg-[#38383f]'
              }`}>
                <action.icon className={`h-5 w-5 ${action.highlight ? 'text-white' : 'text-[#e10600]'}`} />
              </div>
              <span
                className="font-black uppercase tracking-wide text-sm flex-1"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
              >
                {action.label}
              </span>
              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${action.highlight ? 'text-white/70' : 'text-white/20 group-hover:text-[#e10600]'}`} />
            </Link>
          ))}
        </div>
      )}

      {/* In progress notice */}
      {event.status === 'IN_PROGRESS' && (
        <div className="border-l-4 border-yellow-500 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-400 flex items-center gap-3">
          <Flag className="h-4 w-4 flex-shrink-0" />
          <span>Este evento está en curso. Los resultados se actualizan en tiempo real.</span>
        </div>
      )}

      {/* Sticky CTA — mobile only, visible when event is OPEN */}
      {event.status === 'OPEN' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-[#15151e] via-[#15151e]/95 to-transparent md:hidden">
          <Link
            to={`/eventos/${event.slug}/inscribirse`}
            className="flex items-center justify-center gap-2 w-full bg-[#e10600] hover:bg-[#b30500] py-4 text-sm font-black uppercase tracking-widest text-white transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Inscribirme a este evento
          </Link>
          <Link
            to="/piloto"
            className="flex items-center justify-center gap-2 w-full mt-2 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            ¿Ya estás inscrito? Accede a tu perfil →
          </Link>
        </div>
      )}
    </div>
  );
}
