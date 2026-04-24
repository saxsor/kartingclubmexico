import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, MapPin, ShieldCheck, TimerReset, Trophy, User, Users, ArrowRight, Flag, Info } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate, resolveMediaUrl, cn } from '../../lib/utils';
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
  const finishedEvents = events.filter((e) => e.status === 'FINISHED').slice(0, 3);

  return (
    <div className="space-y-20 pb-20">
      <SEO
        description="Resultados en tiempo real, parrillas, campeonato y operación de pilotos para Karting Club México. Consulta próximos eventos e información pública de la temporada."
        url="/"
      />

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden -mx-4 bg-[#0a0a0f] px-4 py-24 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-[#e10600]/20">
        <div className="absolute inset-0 racing-stripe opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,6,0,0.15),transparent_50%)] pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl grid gap-16 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="mb-6 flex items-center gap-3">
              <div className="w-2 h-8 bg-[#e10600] skew-x-[-15deg]" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">
                Oficial Racing Hub
              </span>
            </div>
            
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-28 w-auto object-contain drop-shadow-[0_0_30px_rgba(225,6,0,0.2)] mb-10"
            />
            
            <h1
              className="text-6xl sm:text-7xl lg:text-8xl font-black uppercase leading-[0.85] text-white italic tracking-tighter"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Karting <br />
              <span className="text-[#e10600]">Club México</span>
            </h1>
            
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/50 font-sans">
              La plataforma definitiva para el seguimiento de la temporada. Resultados en vivo, gestión de pilotos y el calendario oficial en un solo lugar.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/eventos"
                className="group flex items-center gap-3 bg-[#e10600] px-10 py-4 text-xs font-black uppercase tracking-widest text-white transition-all shadow-[0_0_25px_rgba(225,6,0,0.3)] hover:shadow-[0_0_40px_rgba(225,6,0,0.5)] hover:scale-105"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Ver Calendario <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/piloto"
                className="flex items-center gap-3 border border-[#38383f] bg-white/5 px-10 py-4 text-xs font-black uppercase tracking-widest text-white/80 transition-all hover:bg-white/10 hover:border-white/30"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                <User className="h-4 w-4" /> Soy Piloto
              </Link>
            </div>
          </div>

          {/* --- NEXT EVENT WIDGET --- */}
          <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            {nextEvent ? (
              <div className="group relative overflow-hidden rounded-xl border border-[#38383f] bg-[#1a1a21] shadow-2xl transition-all hover:border-[#e10600]/50">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#e10600]" />
                
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
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e10600] mb-2">
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
                      <Calendar className="h-4 w-4 text-[#e10600]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(nextEvent.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/50 bg-white/5 p-3 rounded-lg border border-white/5">
                      <MapPin className="h-4 w-4 text-[#e10600]" />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{nextEvent.track || 'Por definir'}</span>
                    </div>
                  </div>

                  <Link
                    to={`/eventos/${nextEvent.slug}`}
                    className="mt-8 flex items-center justify-between w-full bg-white text-black group-hover:bg-[#e10600] group-hover:text-white px-6 py-4 text-xs font-black uppercase tracking-widest transition-all italic"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    Ver Detalles del Evento <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="border border-[#38383f] bg-[#1a1a21] p-10 text-center rounded-xl">
                <Calendar className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase italic" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Próximas Fechas</h3>
                <p className="text-white/40 text-sm mt-2 font-sans">Estamos definiendo el calendario oficial de la temporada. Mantente atento a las próximas actualizaciones.</p>
                <Link to="/eventos" className="mt-6 inline-block text-[#e10600] text-xs font-black uppercase tracking-widest border-b border-[#e10600] pb-1 hover:text-white hover:border-white transition-colors">
                  Ver Calendario →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- PILLARS --- */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 p-8 shadow-xl transition-all hover:border-[#e10600]/30 hover:bg-[#1f1f27]">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#e10600]/10 border border-[#e10600]/20 transition-all group-hover:bg-[#e10600] group-hover:shadow-[0_0_20px_rgba(225,6,0,0.4)]">
                <Icon className="h-6 w-6 text-[#e10600] group-hover:text-white" />
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
              <div className="w-2 h-8 bg-[#e10600] skew-x-[-15deg]" />
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Últimas <span className="text-[#e10600]">Carreras</span>
              </h2>
            </div>
            <Link
              to="/eventos"
              className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e10600] hover:text-white transition-colors flex items-center gap-2"
            >
              Ver Todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {finishedEvents.map((event) => (
              <Link 
                key={event.id} 
                to={`/eventos/${event.slug}`} 
                className="group flex flex-col overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-xl transition-all hover:border-[#e10600] hover:translate-y-[-4px]"
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
                <div className="p-6 border-t border-[#38383f] group-hover:border-[#e10600]/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={event.status} />
                    <span className="text-[10px] font-mono text-white/20">{formatDate(event.date)}</span>
                  </div>
                  <h3
                    className="text-2xl font-black uppercase text-white italic transition-colors group-hover:text-[#e10600]"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {event.name}
                  </h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-[#e10600]" /> {event.track || 'Kartódromo'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-[#e10600] transition-all group-hover:translate-x-1" />
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
                <Info className="h-5 w-5 text-[#e10600]" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#e10600]">Ecosistema KCM</span>
              </div>
              <h2
                className="text-4xl md:text-5xl font-black uppercase text-white italic tracking-tighter leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Únete a la <span className="text-[#e10600]">Parrilla</span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg text-white/50 font-sans leading-relaxed">
                ¿Eres piloto? Gestiona tus inscripciones, consulta tus puntos del campeonato y mantén tu perfil actualizado desde nuestro portal exclusivo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/piloto"
                className="flex items-center justify-center gap-3 bg-white text-black px-10 py-4 text-xs font-black uppercase tracking-widest transition-all hover:bg-[#e10600] hover:text-white italic"
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
