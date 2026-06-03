import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Grid, Flag, BarChart2, ClipboardList, ChevronRight, MapPin, Users, Camera, Info, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { CATEGORY_LABELS } from '../../lib/utils';
import { SEO } from '../../components/shared/SEO';
import { eventsApi } from '../../api/events.api';
import { photosApi } from '../../api/photos.api';
import { formatDate, resolveMediaUrl, cn } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { queryKeys } from '../../lib/react-query';
import { HeroLoadingState } from '../../components/shared/LoadingSkeleton';

export function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });

  const event = eventQuery.data ?? null;
  const loading = eventQuery.isLoading;

  const albumQuery = useQuery({
    queryKey: ['photos', 'public', slug, 'exists'],
    queryFn: () => photosApi.getAlbum(slug!).then(a => a.isPublished ? a : null).catch(() => null),
    enabled: !!slug,
  });

  if (loading) return <HeroLoadingState sections={3} />;
  if (!event) return <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Evento no encontrado</div>;

  const actions = [
    { label: 'Inscribirme Ahora', to: `/eventos/${slug}/inscribirse`, icon: ClipboardList, show: event.status === 'OPEN', highlight: true },
    { label: 'Galería de Fotos', to: `/eventos/${slug}/fotos`, icon: Camera, show: !!albumQuery.data, highlight: true },
    { label: 'Entry List', to: `/eventos/${slug}/pilotos`, icon: Users, show: event.status !== 'DRAFT', highlight: false },
    { label: 'Starting Grid', to: `/eventos/${slug}/parrilla`, icon: Grid, show: event.status !== 'DRAFT', highlight: false },
    { label: 'Resultados Finales', to: `/eventos/${slug}/resultados`, icon: BarChart2, show: event.status === 'FINISHED' || event.status === 'IN_PROGRESS', highlight: false },
  ].filter((a) => a.show);

  return (
    <div className="pb-24 md:pb-10">
      <SEO
        title={event.name}
        description={event.description ?? `Evento de karting el ${new Date(event.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}${event.track ? ` en ${event.track}` : ''}.`}
        image={event.posterUrl ? resolveMediaUrl(event.posterUrl) ?? undefined : undefined}
        url={`/eventos/${slug}`}
        type="article"
      />

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/eventos" className="text-sm text-white/50 hover:text-white transition-colors">
          ← Calendario de Eventos
        </Link>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border border-[#38383f] bg-[#1a1a21] shadow-2xl mb-8">
        {event.posterUrl ? (
          <div className="aspect-[16/9] md:aspect-[21/9] relative">
            <img src={resolveMediaUrl(event.posterUrl) ?? ''} alt={event.name} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a21] via-[#1a1a21]/40 to-transparent" />
          </div>
        ) : (
          <div className="h-48 md:h-64 bg-[#1f1f27] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full opacity-[0.03] pointer-events-none skew-x-[-20deg] bg-white" />
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <Flag className="w-40 h-40 text-white" />
            </div>
          </div>
        )}

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-6 bg-[#e10600] skew-x-[-15deg]" />
            <StatusBadge status={event.status} />
          </div>
          <h1 
            className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {event.name}
          </h1>
          
          <div className="mt-4 flex flex-wrap gap-5 text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#e10600]" />
              <span className="text-xs font-black uppercase tracking-widest">{formatDate(event.date)}</span>
            </div>
            {event.track && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#e10600]" />
                <span className="text-xs font-black uppercase tracking-widest">{event.track}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Info Column */}
        <div className="lg:col-span-2 space-y-5">

          {/* In progress notice */}
          {event.status === 'IN_PROGRESS' && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-5 flex items-center gap-4 text-yellow-400">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black uppercase text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Evento en Curso</p>
                <p className="text-xs opacity-70">Los resultados y parrillas se están actualizando en vivo.</p>
              </div>
            </div>
          )}

          {/* Google Maps */}
          {(event as any).address && (
            <div className="overflow-hidden rounded-lg border border-[#38383f]">
              <div className="border-b border-[#38383f] bg-[#1a1a21] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#e10600]" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Ubicación</h2>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent((event as any).address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold uppercase tracking-widest text-[#e10600] hover:text-white transition-colors"
                >
                  Abrir en Maps ↗
                </a>
              </div>
              <iframe
                title="Ubicación del evento"
                src={`https://maps.google.com/maps?q=${encodeURIComponent((event as any).address)}&output=embed`}
                width="100%"
                height="220"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="bg-[#1a1a21] px-5 py-3">
                <p className="text-xs text-white/50">{(event as any).address}</p>
              </div>
            </div>
          )}

          {/* Schedule */}
          {(event as any).schedule && (
            <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50">
              <div className="border-b border-[#38383f] bg-[#1a1a21] px-5 py-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#e10600]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Horarios del Día</h2>
              </div>
              <div className="divide-y divide-[#38383f]/50">
                {(event as any).schedule.split('\n').filter(Boolean).map((line: string, i: number) => {
                  const [time, ...rest] = line.split('—');
                  const desc = rest.join('—').trim();
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <span className="text-[#e10600] font-black text-sm font-mono w-16 flex-shrink-0">{time.trim()}</span>
                      <span className="text-white/70 text-sm">{desc || time.trim()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Costs + Categories grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Costs */}
            <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50">
              <div className="border-b border-[#38383f] bg-[#1a1a21] px-5 py-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#e10600]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Costos</h2>
              </div>
              <div className="p-4 space-y-2">
                {Number(event.serviceFee) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50 uppercase tracking-wider">Inscripción</span>
                    <span className="font-black text-white">${Number(event.serviceFee).toLocaleString('es-MX')}</span>
                  </div>
                )}
                {Number(event.foodFee) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50 uppercase tracking-wider">Alimentos</span>
                    <span className="font-black text-white">${Number(event.foodFee).toLocaleString('es-MX')}</span>
                  </div>
                )}
                {Number(event.serviceFee) > 0 && Number(event.foodFee) > 0 && (
                  <div className="flex justify-between items-center border-t border-[#38383f] pt-2 mt-2">
                    <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
                    <span className="font-black text-[#e10600] text-lg">${(Number(event.serviceFee) + Number(event.foodFee)).toLocaleString('es-MX')}</span>
                  </div>
                )}
                {Number(event.serviceFee) === 0 && Number(event.foodFee) === 0 && (
                  <p className="text-xs text-white/30 italic">Costos no publicados aún.</p>
                )}
              </div>
            </div>

            {/* Categories + counts */}
            <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50">
              <div className="border-b border-[#38383f] bg-[#1a1a21] px-5 py-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#e10600]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Categorías</h2>
              </div>
              <div className="p-4 space-y-2">
                {event.eventCategories.filter(c => c.active).map(c => {
                  const count = ((event as any).inscriptions ?? []).filter((i: any) => i.category === c.category).length;
                  return (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-xs text-white/70 font-bold uppercase tracking-wider">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      {count > 0 && <span className="text-xs font-black text-[#e10600]">{count} piloto{count !== 1 ? 's' : ''}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Conditions */}
          {(event as any).conditions && (
            <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50">
              <div className="border-b border-[#38383f] bg-[#1a1a21] px-5 py-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#e10600]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Condiciones del Evento</h2>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {(event as any).conditions.split('•').map((c: string) => c.trim()).filter(Boolean).map((cond: string, i: number) => (
                  <span key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] flex-shrink-0" />
                    {cond}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50">
              <div className="border-b border-[#38383f] bg-[#1a1a21] px-5 py-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-[#e10600]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Información del Evento</h2>
              </div>
              <div className="p-5">
                <p className="text-white/60 leading-relaxed text-sm whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

        </div>

        {/* Actions Column */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Acceso Operativo</p>
          <div className="grid gap-3">
            {actions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={cn(
                  "group flex items-center justify-between p-5 transition-all rounded-lg border shadow-lg",
                  action.highlight
                    ? "bg-[#e10600] border-[#e10600] text-white hover:shadow-[0_0_20px_rgba(225,6,0,0.3)]"
                    : "bg-[#1a1a21] border-[#38383f] text-white hover:border-[#e10600] hover:bg-[#1f1f27]"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 flex items-center justify-center rounded flex-shrink-0 transition-colors",
                    action.highlight ? "bg-white/20" : "bg-[#2a2a35] group-hover:bg-[#e10600]/10"
                  )}>
                    <action.icon className={cn("h-5 w-5", action.highlight ? "text-white" : "text-[#e10600]")} />
                  </div>
                  <span className="font-black uppercase text-sm italic tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {action.label}
                  </span>
                </div>
                <ChevronRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-1", action.highlight ? "text-white/40" : "text-white/10")} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      {event.status === 'OPEN' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-[#15151e] via-[#15151e]/95 to-transparent md:hidden">
          <Link
            to={`/eventos/${event.slug}/inscribirse`}
            className="flex items-center justify-center gap-3 w-full bg-[#e10600] py-4 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(225,6,0,0.4)] rounded-md"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            <ClipboardList className="h-5 w-5" /> Inscribirme Ahora
          </Link>
        </div>
      )}
    </div>
  );
}
