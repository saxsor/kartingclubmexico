import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, MapPin, ShieldCheck, TimerReset, Trophy, User, Users } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate, resolveMediaUrl } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';

const pillars = [
  {
    icon: Calendar,
    title: 'Calendario centralizado',
    description: 'Cada fecha vive en una sola ficha pública con estado operativo, categorías y acceso directo a su información clave.',
  },
  {
    icon: TimerReset,
    title: 'Resultados en tiempo real',
    description: 'Parrillas, clasificación y seguimiento deportivo disponibles desde la misma plataforma para pilotos y audiencia.',
  },
  {
    icon: Trophy,
    title: 'Campeonato visible',
    description: 'La temporada se consulta por categoría con tablas públicas que mantienen continuidad entre evento y evento.',
  },
  {
    icon: ShieldCheck,
    title: 'Operación más ordenada',
    description: 'Inscripción, pagos, portal de piloto y trazabilidad administrativa resueltos dentro del mismo sistema.',
  },
];

const quickLinks = [
  { label: 'Próximas fechas', to: '/eventos' },
  { label: 'Clasificación anual', to: '/campeonato' },
  { label: 'Portal de piloto', to: '/piloto' },
  { label: 'Preguntas frecuentes', to: '/preguntas-frecuentes' },
];

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
        description="Resultados en tiempo real, parrillas, campeonato y operación de pilotos para Karting Club México. Consulta próximos eventos e información pública de la temporada."
        url="/"
      />

      <section className="relative overflow-hidden -mx-4 bg-[#15151e] px-4 py-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="absolute inset-0 racing-stripe opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(225,6,0,0.18),transparent_42%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#15151e] to-transparent pointer-events-none" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-white/55">
              <div className="h-px w-10 bg-[#e10600]" />
              Plataforma oficial
            </div>
            <div className="mb-8 flex items-center gap-6">
              <img
                src="/karting_club_logo.png"
                alt="Karting Club México"
                className="h-24 w-auto object-contain drop-shadow-lg sm:h-28"
              />
            </div>
            <h1
              className="max-w-3xl text-5xl font-black uppercase leading-[0.92] text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              Karting Club México
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              Un solo lugar para consultar eventos, seguir parrillas y resultados, revisar el campeonato y mantener ordenada la operación pública y deportiva de cada fecha.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/eventos"
                className="bg-[#e10600] px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b30500]"
              >
                Ver calendario
              </Link>
              <Link
                to="/campeonato"
                className="border border-[#38383f] bg-transparent px-8 py-3 text-sm font-bold uppercase tracking-widest text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                Campeonato {new Date().getFullYear()}
              </Link>
              <Link
                to="/piloto"
                className="flex items-center gap-2 border border-white/20 bg-transparent px-8 py-3 text-sm font-bold uppercase tracking-widest text-white/55 transition-colors hover:border-white/50 hover:text-white"
              >
                <User className="h-4 w-4" />
                Soy piloto
              </Link>
            </div>
          </div>

          {nextEvent ? (
            <div className="overflow-hidden border border-white/10 bg-[#111118] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
              <div className="border-b border-white/10 bg-black/20 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e10600]">
                  {nextEvent.status === 'IN_PROGRESS' ? 'En curso' : 'Próximo evento'}
                </p>
              </div>
              {nextEvent.posterUrl ? (
                <div className="relative bg-[#0d0d14]">
                  <img
                    src={resolveMediaUrl(nextEvent.posterUrl) ?? ''}
                    alt={nextEvent.name}
                    className="w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/45 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <StatusBadge status={nextEvent.status} className="mb-3" />
                    <h2
                      className="text-3xl font-black uppercase leading-none text-white"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                    >
                      {nextEvent.name}
                    </h2>
                    <div className="mt-3 space-y-1.5 text-sm text-white/70">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#e10600]" />
                        {formatDate(nextEvent.date)}
                      </p>
                      {nextEvent.track && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#e10600]" />
                          {nextEvent.track}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <StatusBadge status={nextEvent.status} className="mb-3" />
                  <h2
                    className="text-3xl font-black uppercase leading-none text-white"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                  >
                    {nextEvent.name}
                  </h2>
                  <div className="mt-4 space-y-2 text-sm text-white/70">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#e10600]" />
                      {formatDate(nextEvent.date)}
                    </p>
                    {nextEvent.track && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#e10600]" />
                        {nextEvent.track}
                      </p>
                    )}
                  </div>
                  {nextEvent.description && (
                    <p className="mt-4 text-sm leading-7 text-white/58">{nextEvent.description}</p>
                  )}
                </div>
              )}
              <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2">
                <Link
                  to={`/eventos/${nextEvent.slug}`}
                  className="bg-[#e10600] px-5 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b30500]"
                >
                  Ver detalle del evento
                </Link>
                <Link
                  to={nextEvent.status === 'OPEN' ? `/eventos/${nextEvent.slug}/inscribirse` : `/eventos/${nextEvent.slug}/resultados`}
                  className="flex items-center justify-between bg-[#171720] px-5 py-4 text-sm font-bold uppercase tracking-widest text-white/75 transition-colors hover:text-white"
                >
                  {nextEvent.status === 'OPEN' ? 'Ir a inscripción' : 'Ver resultados'}
                  <ChevronRight className="h-4 w-4 text-[#e10600]" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-px border border-white/10 bg-white/10">
              <div className="grid gap-px sm:grid-cols-2">
                <div className="bg-[#171720] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Cobertura</p>
                  <p
                    className="mt-3 text-3xl font-black uppercase text-white"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                  >
                    Eventos
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/60">Consulta próximas fechas, históricos y fichas públicas por evento.</p>
                </div>
                <div className="bg-[#111118] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Seguimiento</p>
                  <p
                    className="mt-3 text-3xl font-black uppercase text-white"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                  >
                    Resultados
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/60">Parrillas, clasificaciones y publicación deportiva desde la misma plataforma.</p>
                </div>
              </div>
              <div className="bg-[#1b1b24] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Acceso rápido</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {quickLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex items-center justify-between border border-white/10 bg-[#111118] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white/70 transition-colors hover:border-[#e10600] hover:text-white"
                    >
                      {item.label}
                      <ChevronRight className="h-4 w-4 text-[#e10600] transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden opacity-20">
          <svg width="100%" height="12" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="checker" width="12" height="12" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="white" />
                <rect x="6" y="6" width="6" height="6" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="12" fill="url(#checker)" />
          </svg>
        </div>
      </section>

      <section className="grid gap-px bg-[#38383f] sm:grid-cols-2 xl:grid-cols-4">
        {pillars.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-[#1f1f27] p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e10600]/25 bg-[#e10600]/12">
              <Icon className="h-5 w-5 text-[#e10600]" />
            </div>
            <h2
              className="mt-5 text-2xl font-black uppercase text-white"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              {title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-6 w-1 bg-[#e10600]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">
              Cómo funciona
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">01</p>
              <h3 className="mt-3 text-lg font-black uppercase text-white">Consulta la fecha</h3>
              <p className="mt-2 text-sm leading-7 text-white/60">Revisa el evento, sus categorías activas y su estado operativo actual.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">02</p>
              <h3 className="mt-3 text-lg font-black uppercase text-white">Sigue la jornada</h3>
              <p className="mt-2 text-sm leading-7 text-white/60">Consulta pilotos inscritos, parrilla y resultados según avance la fecha.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">03</p>
              <h3 className="mt-3 text-lg font-black uppercase text-white">Mantén continuidad</h3>
              <p className="mt-2 text-sm leading-7 text-white/60">El campeonato y el historial de pilotos conectan cada evento con la temporada completa.</p>
            </div>
          </div>
        </div>

        <div className="border border-white/10 bg-[#111118] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-[#e10600]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">Pilotos y operación</span>
          </div>
          <p className="text-sm leading-7 text-white/65">
            El portal de piloto permite revisar historial, mantener datos al día y seguir la relación entre evento, inscripción y resultados sin salir del ecosistema del club.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/piloto"
              className="bg-[#e10600] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-[#b30500]"
            >
              Entrar a mi perfil
            </Link>
            <Link
              to="/contacto"
              className="border border-white/15 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white/70 transition-colors hover:border-white/35 hover:text-white"
            >
              Ver soporte
            </Link>
          </div>
        </div>
      </section>

      {finishedEvents.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-[#e10600]" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                <Calendar className="mr-1.5 inline h-3 w-3" />
                Eventos recientes
              </span>
            </div>
            <Link
              to="/eventos"
              className="text-xs font-bold uppercase tracking-widest text-[#e10600] transition-colors hover:text-white"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid gap-px bg-[#38383f] sm:grid-cols-2 lg:grid-cols-3">
            {finishedEvents.map((event) => (
              <Link key={event.id} to={`/eventos/${event.slug}`} className="group block bg-[#1f1f27]">
                {event.posterUrl && (
                  <div className="relative bg-[#0d0d14]">
                    <img src={resolveMediaUrl(event.posterUrl) ?? ''} alt={event.name} className="w-full object-contain transition-opacity duration-300 group-hover:opacity-90" />
                  </div>
                )}
                <div className="h-full border-t-[3px] border-[#e10600] p-5 transition-colors hover:bg-[#2a2a35]">
                  <div className="mb-2 flex items-start justify-between">
                    <StatusBadge status={event.status} />
                    <ChevronRight className="h-4 w-4 text-white/20 transition-colors group-hover:text-[#e10600]" />
                  </div>
                  <h3
                    className="mt-2 text-lg font-black uppercase text-white transition-colors group-hover:text-[#e10600]"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                  >
                    {event.name}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{formatDate(event.date)}</p>
                  {event.track && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/30">
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

      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e10600]">Confianza pública</p>
          <h2
            className="mt-3 text-3xl font-black uppercase text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Una presencia digital más clara y útil
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
            Además del calendario y los resultados, ahora el sitio concentra FAQ, contacto operativo y páginas institucionales para reforzar claridad pública y consistencia del club.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/preguntas-frecuentes"
            className="border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-widest text-white/75 transition-colors hover:border-white/35 hover:text-white"
          >
            Ver FAQ
          </Link>
          <Link
            to="/contacto"
            className="bg-[#e10600] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-[#b30500]"
          >
            Ir a contacto
          </Link>
        </div>
      </section>

      {loading && <PageLoadingState rows={3} />}
    </div>
  );
}
