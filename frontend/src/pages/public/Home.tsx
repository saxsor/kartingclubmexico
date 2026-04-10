import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Flag, MapPin, User } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate, resolveMediaUrl } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';
import { SEO } from '../../components/shared/SEO';

export function Home() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.list({ page: 1, pageSize: 6, public: true })
      .then((data) => {
        setEvents(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const nextEvent = events.find((e) => e.status === 'OPEN' || e.status === 'IN_PROGRESS');
  const finishedEvents = events.filter((e) => e.status === 'FINISHED');

  return (
    <div className="space-y-16">
      <SEO
        description="Resultados en tiempo real, parrillas de salida y campeonato de karting en México. Inscríbete a los próximos eventos."
        url="/"
      />
      {/* Hero */}
      <section className="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-20 bg-[#15151e]">
        {/* Checkered stripe overlay */}
        <div className="absolute inset-0 racing-stripe opacity-40 pointer-events-none" />
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#15151e] to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-36 md:h-48 w-auto object-contain drop-shadow-lg"
            />
          </div>

          <p className="text-base text-white/50 max-w-lg mx-auto tracking-wide mb-10">
            Resultados en tiempo real &nbsp;·&nbsp; Campeonato &nbsp;·&nbsp; Parrillas
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/eventos"
              className="bg-[#e10600] hover:bg-[#b30500] px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors"
            >
              Ver eventos
            </Link>
            <Link
              to="/campeonato"
              className="border border-[#38383f] hover:border-white/40 bg-transparent px-8 py-3 text-sm font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors"
            >
              Campeonato {new Date().getFullYear()}
            </Link>
            <Link
              to="/piloto"
              className="flex items-center gap-2 border border-white/20 hover:border-white/50 bg-transparent px-8 py-3 text-sm font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              Soy piloto
            </Link>
          </div>
        </div>

        {/* Checkered flag accent strip at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden opacity-20">
          <svg width="100%" height="12" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="checker" width="12" height="12" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="white"/>
                <rect x="6" y="6" width="6" height="6" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="12" fill="url(#checker)"/>
          </svg>
        </div>
      </section>

      {/* Next Event */}
      {nextEvent && (
        <section>
          {/* Section label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-[#e10600]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">
              <Flag className="inline h-3 w-3 mr-1.5" />
              Próximo evento
            </span>
          </div>

          <Link to={`/eventos/${nextEvent.slug}`} className="block group">
            {nextEvent.posterUrl ? (
              <div className="relative border-t-[3px] border-[#e10600] bg-[#0d0d14]">
                <img src={resolveMediaUrl(nextEvent.posterUrl) ?? ''} alt={nextEvent.name} className="w-full object-contain group-hover:opacity-90 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#15151e] via-[#15151e]/70 to-transparent">
                  <StatusBadge status={nextEvent.status} className="mb-2" />
                  <h3 className="text-3xl font-black text-white uppercase drop-shadow-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>{nextEvent.name}</h3>
                  <p className="mt-1 text-white/60 text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />{formatDate(nextEvent.date)}</p>
                  {nextEvent.track && (
                    <p className="mt-0.5 text-white/50 text-xs flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{nextEvent.track}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t-[3px] border-[#e10600] bg-[#1f1f27] hover:bg-[#2a2a35] transition-colors p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <StatusBadge status={nextEvent.status} />
                    <h3
                      className="mt-3 text-3xl font-black text-white group-hover:text-[#e10600] transition-colors uppercase"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                    >
                      {nextEvent.name}
                    </h3>
                    <p className="mt-2 text-white/50 flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {formatDate(nextEvent.date)}
                    </p>
                    {nextEvent.track && (
                      <p className="mt-0.5 text-white/40 flex items-center gap-2 text-xs">
                        <MapPin className="h-3.5 w-3.5" />
                        {nextEvent.track}
                      </p>
                    )}
                    {nextEvent.description && (
                      <p className="mt-2 text-white/40 text-sm">{nextEvent.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {nextEvent.eventCategories.filter((c) => c.active).map((c) => (
                        <CategoryBadge key={c.id} category={c.category} />
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/20 group-hover:text-[#e10600] transition-colors flex-shrink-0 mt-1" />
                </div>
              </div>
            )}
          </Link>
        </section>
      )}

      {/* Pilot CTA */}
      <section className="border border-white/10 bg-white/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#e10600]/20 border border-[#e10600]/30">
            <User className="h-5 w-5 text-[#e10600]" />
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-wider text-white">¿Eres piloto?</p>
            <p className="text-xs text-white/50 mt-0.5">Accede a tu perfil, edita tus datos y revisa tu historial de eventos.</p>
          </div>
        </div>
        <Link
          to="/piloto"
          className="flex-shrink-0 bg-[#e10600] hover:bg-[#b30500] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors"
        >
          Entrar a mi perfil
        </Link>
      </section>

      {/* Recent Events */}
      {finishedEvents.length > 0 && (
        <section>
          {/* Section label */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#e10600]" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                <Calendar className="inline h-3 w-3 mr-1.5" />
                Eventos recientes
              </span>
            </div>
            <Link
              to="/eventos"
              className="text-xs font-bold uppercase tracking-widest text-[#e10600] hover:text-white transition-colors"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-[#38383f]">
            {finishedEvents.map((event) => (
              <Link key={event.id} to={`/eventos/${event.slug}`} className="group block bg-[#1f1f27]">
                {event.posterUrl && (
                  <div className="relative bg-[#0d0d14]">
                    <img src={resolveMediaUrl(event.posterUrl) ?? ''} alt={event.name} className="w-full object-contain group-hover:opacity-90 transition-opacity duration-300" />
                  </div>
                )}
                <div className={`border-t-[3px] border-[#e10600] p-5 hover:bg-[#2a2a35] transition-colors h-full ${event.posterUrl ? '' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <StatusBadge status={event.status} />
                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#e10600] transition-colors" />
                  </div>
                  <h3
                    className="mt-2 text-lg font-black text-white group-hover:text-[#e10600] transition-colors uppercase"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                  >
                    {event.name}
                  </h3>
                  <p className="mt-1 text-xs text-white/40 uppercase tracking-wide">{formatDate(event.date)}</p>
                  {event.track && (
                    <p className="mt-0.5 text-xs text-white/30 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />{event.track}
                    </p>
                  )}
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
        <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Cargando eventos...</div>
      )}
    </div>
  );
}
