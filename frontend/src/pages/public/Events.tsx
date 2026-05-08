import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, ChevronRight, Flag } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { PaginationMeta } from '../../api/pagination';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';

export function Events() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    eventsApi.list({ page, pageSize: 10, public: true })
      .then((data) => {
        setEvents(data.items);
        setPagination(data.pagination);
      })
      .catch(() => {
        setEvents([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [page, reloadKey]);

  if (loading) return <PageLoadingState rows={4} />;

  return (
    <div className="pb-20">
      <SEO title="Eventos" description="Calendario de eventos de karting en México. Inscríbete, consulta resultados y parrillas de salida." url="/eventos" />
      
      {/* Page header */}
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#e10600] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            Temporada {new Date().getFullYear()}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Calendario <span className="text-[#e10600]">Oficial</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <Calendar className="w-24 h-24 text-white" />
        </div>
      </div>

      {loadError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No pudimos cargar eventos"
          description="El calendario no respondió. Intenta de nuevo en unos segundos."
          action={{ label: 'Reintentar', onClick: () => setReloadKey((current) => current + 1) }}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No hay eventos programados"
          description="Estamos definiendo el calendario oficial de la temporada."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3">
            {events.map((event) => (
              <Link 
                key={event.id} 
                to={`/eventos/${event.slug}`} 
                className="group relative overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 transition-all hover:border-[#e10600] shadow-xl"
              >
                <div className="flex items-center">
                  {/* Date Block */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-24 py-6 bg-[#1a1a21] border-r border-[#38383f] group-hover:bg-[#e10600]/10 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                      {new Date(event.date).toLocaleDateString('es-MX', { month: 'short' })}
                    </span>
                    <span className="text-3xl font-black text-white italic" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {new Date(event.date).getDate().toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex-1 px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <StatusBadge status={event.status} />
                        <h2
                          className="text-2xl font-black text-white group-hover:text-white transition-colors uppercase truncate italic"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                        >
                          {event.name}
                        </h2>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-[10px] text-white/40 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                          <Flag className="h-3 w-3 text-[#e10600]" />
                          {event.track || 'Kartódromo por definir'}
                        </p>
                        <p className="sm:hidden text-[10px] text-white/40 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                          <Calendar className="h-3 w-3" />
                          {formatDate(event.date)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {event.eventCategories.filter((c) => c.active).map((c) => (
                          <span key={c.id} className="text-[9px] font-black uppercase tracking-tighter bg-white/5 text-white/30 px-2 py-0.5 rounded-sm border border-white/5">
                            {c.category.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:block text-right">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-[#e10600]">Detalles</span>
                        <span className="text-[10px] text-white/20 uppercase tracking-widest">Ver Info →</span>
                      </div>
                      <ChevronRight className="h-6 w-6 text-white/10 group-hover:text-[#e10600] transition-all group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
                
                {/* Progress bar effect on hover */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-[#e10600] w-0 group-hover:w-full transition-all duration-500" />
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              itemLabel="eventos"
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
