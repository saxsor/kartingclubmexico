import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, ChevronRight, MapPin, ShieldCheck, TimerReset, Trophy, User, Users, ArrowRight, Flag, Info, ClipboardList } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate, resolveMediaUrl } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';

const pillars = [
  {
    icon: Calendar,
    title: 'Calendario Centralizado',
    description: 'Cada fecha vive en una sola ficha pública con estado operativo, categorías y acceso directo.',
  },
  {
    icon: TimerReset,
    title: 'Live Timing & Results',
    description: 'Parrillas, clasificación y seguimiento deportivo en tiempo real para pilotos y audiencia.',
  },
  {
    icon: Trophy,
    title: 'Campeonato Oficial',
    description: 'Temporada completa por categoría con tablas dinámicas que mantienen la continuidad.',
  },
  {
    icon: ShieldCheck,
    title: 'Gestión Operativa',
    description: 'Inscripciones, pagos y portal de piloto resueltos en un ecosistema integrado y seguro.',
  },
];

const partnerLogos = [
  {
    name: 'Edel Racing',
    label: 'Development Partner',
    logo: '/partners/edel-logo.png',
    tone: 'gold',
    href: '',
  },
  {
    name: 'Eileen',
    label: 'Racing Family',
    logo: '/partners/logo_eileen.webp',
    tone: 'light',
    logoClassName: 'max-h-16 max-w-[205px]',
    href: '',
  },
  {
    name: 'Velora Labs',
    label: 'Technology Partner',
    logo: '/partners/velora_logo_grande.png',
    tone: 'light',
    href: '',
  },
  {
    name: 'De 0 a mi Primer Carrera',
    label: 'Racing Partner',
    logo: '/partners/de0_carrera_logo_blanco.webp',
    tone: 'light',
    logoClassName: 'max-h-16 max-w-[210px]',
    href: '',
  },
  {
    name: 'Próximamente',
    label: 'Partner Slot',
    tone: 'muted',
  },
  {
    name: 'Próximamente',
    label: 'Sponsor Slot',
    tone: 'muted',
  },
];

export function Home() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    eventsApi.list({ page: 1, pageSize: 6, public: true })
      .then((data) => {
        setEvents(data.items);
        setLoading(false);
      })
      .catch(() => {
        setEvents([]);
        setLoadError(true);
        setLoading(false);
      });
  }, []);

  const registrationEvent = events.find((e) => e.status === 'OPEN');
  const nextEvent = events.find((e) => e.status === 'IN_PROGRESS') ?? registrationEvent;
  const finishedEvents = events.filter((e) => e.status === 'FINISHED').slice(0, 3);

  return (
    <div className="space-y-20 pb-20">
      <SEO
        description="Resultados en tiempo real, parrillas, campeonato y operación de pilotos para Karting Club México. Consulta próximos eventos e información pública de la temporada."
        url="/"
      />

      {/* --- HERO SECTION --- */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#0a0a0f] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 border-b border-[#f5c400]/20">
        <div className="absolute inset-0 racing-stripe opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,196,0,0.15),transparent_50%)] pointer-events-none" />
        
        <div className="relative mx-auto grid w-full min-w-0 max-w-7xl gap-12 sm:gap-16 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="min-w-0 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="mb-6 flex items-center gap-3">
              <div className="w-2 h-8 bg-[#f5c400] skew-x-[-15deg]" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">
                Oficial Racing Hub
              </span>
            </div>
            
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-20 w-auto max-w-full object-contain drop-shadow-[0_0_30px_rgba(245,196,0,0.2)] mb-8 sm:h-28 sm:mb-10"
            />
            
            <h1
              className="max-w-full text-5xl min-[380px]:text-6xl sm:text-7xl lg:text-8xl font-black uppercase leading-[0.85] text-white italic tracking-tighter"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Karting <br />
              <span className="text-[#f5c400]">Club México</span>
            </h1>
            
            <p className="mt-6 max-w-full text-base leading-relaxed text-white/50 font-sans sm:mt-8 sm:max-w-xl sm:text-lg">
              La plataforma definitiva para el seguimiento de la temporada. Resultados en vivo, gestión de pilotos y el calendario oficial en un solo lugar.
            </p>

            {registrationEvent && (
              <Link
                to={`/eventos/${registrationEvent.slug}/inscribirse`}
                className="group mt-6 block w-full max-w-xl overflow-hidden rounded-lg border border-[#f5c400]/80 bg-[#f5c400] shadow-[0_0_20px_rgba(245,196,0,0.32)] transition-all hover:translate-y-[-2px] hover:bg-[#ffd84d] hover:shadow-[0_0_34px_rgba(245,196,0,0.48)] sm:mt-8"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-black/65 sm:text-[10px] sm:tracking-[0.22em]">
                      <ClipboardList className="h-3.5 w-3.5" /> Inscripción abierta
                    </p>
                    <p
                      className="mt-1 text-2xl font-black uppercase italic leading-none tracking-tight text-black sm:hidden"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      Inscríbete YA!
                    </p>
                    <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wider text-black/75 sm:hidden">
                      {registrationEvent.name}
                    </p>
                    <p
                      className="mt-1 hidden truncate text-3xl font-black uppercase italic leading-none tracking-tight text-black sm:block"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      Inscríbete a {registrationEvent.name} YA!
                    </p>
                  </div>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black text-[#f5c400] transition-transform group-hover:translate-x-1 sm:h-10 sm:w-10">
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </Link>
            )}
            
            <div className={`${registrationEvent ? 'mt-5' : 'mt-10'} flex flex-wrap gap-4`}>
              <Link
                to="/eventos"
                className={`${registrationEvent ? 'border border-[#38383f] bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10' : 'bg-[#f5c400] text-[#111111] shadow-[0_0_25px_rgba(245,196,0,0.3)] hover:scale-105 hover:shadow-[0_0_40px_rgba(245,196,0,0.5)]'} group flex w-full items-center justify-center gap-3 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all sm:w-auto sm:px-10`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Ver Calendario <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/piloto"
                className="flex w-full items-center justify-center gap-3 border border-[#38383f] bg-white/5 px-6 py-4 text-xs font-black uppercase tracking-widest text-white/80 transition-all hover:bg-white/10 hover:border-white/30 sm:w-auto sm:px-10"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                <User className="h-4 w-4" /> Soy Piloto
              </Link>
            </div>
          </div>

          {/* --- NEXT EVENT WIDGET --- */}
          <div className="min-w-0 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            {loadError ? (
              <div className="border border-[#38383f] bg-[#1a1a21] p-10 text-center rounded-xl">
                <AlertTriangle className="w-16 h-16 text-[#f5c400]/60 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase italic" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Calendario no disponible</h3>
                <p className="text-white/40 text-sm mt-2 font-sans">No pudimos consultar las próximas fechas en este momento.</p>
                <Link to="/eventos" className="mt-6 inline-block text-[#f5c400] text-xs font-black uppercase tracking-widest border-b border-[#f5c400] pb-1 hover:text-white hover:border-white transition-colors">
                  Abrir calendario
                </Link>
              </div>
            ) : nextEvent ? (
              <div className="group relative overflow-hidden rounded-xl border border-[#38383f] bg-[#1a1a21] shadow-2xl transition-all hover:border-[#f5c400]/50">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#f5c400]" />
                
                {nextEvent.posterUrl ? (
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img
                      src={resolveMediaUrl(nextEvent.posterUrl) ?? ''}
                      alt={nextEvent.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a21] via-[#1a1a21]/40 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <StatusBadge status={nextEvent.status} />
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-[#1f1f27] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5">
                      <Flag className="w-32 h-32 text-white" />
                    </div>
                    <StatusBadge status={nextEvent.status} />
                  </div>
                )}

                <div className="p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f5c400] mb-2">
                    {nextEvent.status === 'IN_PROGRESS' ? '• En vivo ahora' : 'Próxima Fecha'}
                  </p>
                  <h2
                    className="text-4xl font-black uppercase italic text-white leading-none tracking-tighter"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {nextEvent.name}
                  </h2>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-white/50 bg-white/5 p-3 rounded-lg border border-white/5">
                      <Calendar className="h-4 w-4 text-[#f5c400]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(nextEvent.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/50 bg-white/5 p-3 rounded-lg border border-white/5">
                      <MapPin className="h-4 w-4 text-[#f5c400]" />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{nextEvent.track || 'Por definir'}</span>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {nextEvent.status === 'OPEN' && (
                      <Link
                        to={`/eventos/${nextEvent.slug}/inscribirse`}
                        className="flex items-center justify-between bg-[#f5c400] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#111111] shadow-[0_0_24px_rgba(245,196,0,0.35)] transition-all hover:bg-[#ffd84d] italic"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        Inscribirme Ahora <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    <Link
                      to={`/eventos/${nextEvent.slug}`}
                      className={`${nextEvent.status === 'OPEN' ? 'border border-white/10 bg-white/5 text-white/80 hover:border-[#f5c400]/40 hover:text-white' : 'bg-white text-black group-hover:bg-[#f5c400] group-hover:text-[#111111]'} flex items-center justify-between px-6 py-4 text-xs font-black uppercase tracking-widest transition-all italic`}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      Ver Detalles <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-[#38383f] bg-[#1a1a21] p-10 text-center rounded-xl">
                <Calendar className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase italic" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Próximas Fechas</h3>
                <p className="text-white/40 text-sm mt-2 font-sans">Estamos definiendo el calendario oficial de la temporada. Mantente atento a las próximas actualizaciones.</p>
                <Link to="/eventos" className="mt-6 inline-block text-[#f5c400] text-xs font-black uppercase tracking-widest border-b border-[#f5c400] pb-1 hover:text-white hover:border-white transition-colors">
                  Ver Calendario →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- PARTNER BELT --- */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-[#f5c400]/15 bg-[#101016] py-5">
        <div className="absolute inset-0 racing-stripe opacity-10 pointer-events-none" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6 lg:px-8">
          <div className="shrink-0 border-b border-white/10 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f5c400]">Aliados</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Powered by racing</p>
          </div>

          <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="sponsor-marquee flex w-max items-center gap-4">
              {[...partnerLogos, ...partnerLogos, ...partnerLogos].map((partner, index) => {
                const content = partner.logo ? (
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className={[
                      'max-h-14 max-w-[185px] object-contain opacity-95 transition-opacity duration-300 hover:opacity-100',
                      partner.logoClassName ?? '',
                    ].join(' ')}
                  />
                ) : (
                  <div>
                    <p
                      className={[
                        'whitespace-nowrap text-2xl font-black uppercase italic leading-none tracking-tight',
                        partner.tone === 'gold' ? 'text-[#f5c400]' : partner.tone === 'light' ? 'text-white' : 'text-white/28',
                      ].join(' ')}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {partner.name}
                    </p>
                    <p className="mt-1 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.2em] text-white/28">
                      {partner.label}
                    </p>
                  </div>
                );
                const className = 'flex h-20 w-60 shrink-0 items-center justify-center border border-white/10 bg-black/35 px-5 text-center shadow-[0_0_18px_rgba(0,0,0,0.18)] transition-colors hover:border-[#f5c400]/30';

                return partner.href ? (
                  <a
                    key={`${partner.name}-${partner.label}-${index}`}
                    href={partner.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir ${partner.name}`}
                    className={className}
                  >
                    {content}
                  </a>
                ) : (
                  <div key={`${partner.name}-${partner.label}-${index}`} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* --- PILLARS --- */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 p-8 shadow-xl transition-all hover:border-[#f5c400]/30 hover:bg-[#1f1f27]">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#f5c400]/10 border border-[#f5c400]/20 transition-all group-hover:bg-[#f5c400] group-hover:shadow-[0_0_20px_rgba(245,196,0,0.4)]">
                <Icon className="h-6 w-6 text-[#f5c400] group-hover:text-white" />
              </div>
              <h2
                className="mt-6 text-2xl font-black uppercase text-white italic tracking-tight"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/40 font-sans">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- RECENT EVENTS --- */}
      {finishedEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-[#f5c400] skew-x-[-15deg]" />
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Últimas <span className="text-[#f5c400]">Carreras</span>
              </h2>
            </div>
            <Link
              to="/eventos"
              className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5c400] hover:text-white transition-colors flex items-center gap-2"
            >
              Ver Todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {finishedEvents.map((event) => (
              <Link 
                key={event.id} 
                to={`/eventos/${event.slug}`} 
                className="group flex flex-col overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-xl transition-all hover:border-[#f5c400] hover:translate-y-[-4px]"
              >
                {event.posterUrl ? (
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img src={resolveMediaUrl(event.posterUrl) ?? ''} alt={event.name} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f1f27] to-transparent opacity-60" />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-[#1a1a21] flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-white/5" />
                  </div>
                )}
                <div className="p-6 border-t border-[#38383f] group-hover:border-[#f5c400]/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={event.status} />
                    <span className="text-[10px] font-mono text-white/20">{formatDate(event.date)}</span>
                  </div>
                  <h3
                    className="text-2xl font-black uppercase text-white italic transition-colors group-hover:text-[#f5c400]"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {event.name}
                  </h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-[#f5c400]" /> {event.track || 'Kartódromo'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-[#f5c400] transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* --- COMMUNITY / PILOT PORTAL CTA --- */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl border border-[#38383f] bg-[#1a1a21] p-8 md:p-16 shadow-2xl">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.02] pointer-events-none skew-x-[-20deg] bg-white" />
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_auto] items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-5 w-5 text-[#f5c400]" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#f5c400]">Ecosistema KCM</span>
              </div>
              <h2
                className="text-4xl md:text-5xl font-black uppercase text-white italic tracking-tighter leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Únete a la <span className="text-[#f5c400]">Parrilla</span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg text-white/50 font-sans leading-relaxed">
                ¿Eres piloto? Gestiona tus inscripciones, consulta tus puntos del campeonato y mantén tu perfil actualizado desde nuestro portal exclusivo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/piloto"
                className="flex items-center justify-center gap-3 bg-white text-black px-10 py-4 text-xs font-black uppercase tracking-widest transition-all hover:bg-[#f5c400] hover:text-[#111111] italic"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Acceder al Portal <User className="h-4 w-4" />
              </Link>
              <Link
                to="/contacto"
                className="flex items-center justify-center gap-3 border border-[#38383f] bg-white/5 px-10 py-4 text-xs font-black uppercase tracking-widest text-white/80 transition-all hover:border-white/30 italic"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Soporte <Users className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm">
          <PageLoadingState rows={3} />
        </div>
      )}
    </div>
  );
}
