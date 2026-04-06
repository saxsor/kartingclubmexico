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
      <section className="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-20 bg-[#15151e]">
        {/* Checkered stripe overlay */}
        <div className="absolute inset-0 racing-stripe opacity-40 pointer-events-none" />
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#15151e] to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Trophy icon */}
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 bg-[#e10600] flex items-center justify-center shadow-lg shadow-red-600/30">
              <Trophy className="h-9 w-9 text-white" />
            </div>
          </div>

          {/* Main heading — F1 style */}
          <h1
            className="text-6xl md:text-8xl font-black text-white uppercase tracking-tight leading-none mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            KARTING CLUB
          </h1>
          <h2
            className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-none mb-6"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: '#e10600' }}
          >
            MÉXICO
          </h2>

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
          </Link>
        </section>
      )}

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
                <div className="border-t-[3px] border-[#e10600] p-5 hover:bg-[#2a2a35] transition-colors h-full">
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
