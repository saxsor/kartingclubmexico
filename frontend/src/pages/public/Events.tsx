import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { eventsApi, KartEvent } from '../../api/events.api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CategoryBadge } from '../../components/shared/CategoryBadge';
import { PaginationMeta } from '../../api/pagination';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';

export function Events() {
  const [events, setEvents] = useState<KartEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    setLoading(true);
    eventsApi.list({ page, pageSize: 10, public: true })
      .then((data) => {
        setEvents(data.items);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <PageLoadingState rows={4} />;

  return (
    <div>
      <SEO title="Eventos" description="Calendario de eventos de karting en México. Inscríbete, consulta resultados y parrillas de salida." url="/eventos" />
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            <Calendar className="inline h-3 w-3 mr-1.5" />
            Temporada {new Date().getFullYear()}
          </span>
        </div>
        <h1
          className="text-4xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Eventos
        </h1>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-white/40 text-sm uppercase tracking-widest">No hay eventos disponibles</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-px bg-[#38383f]">
            {events.map((event) => (
              <Link key={event.id} to={`/eventos/${event.slug}`} className="block group">
                <div className="bg-[#1f1f27] hover:bg-[#2a2a35] transition-colors px-5 py-4 flex items-center justify-between gap-4 border-l-[3px] border-transparent group-hover:border-[#e10600]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <StatusBadge status={event.status} />
                      <h2
                        className="text-lg font-black text-white group-hover:text-[#e10600] transition-colors uppercase truncate"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                      >
                        {event.name}
                      </h2>
                    </div>
                    <p className="text-xs text-white/40 flex items-center gap-1.5 uppercase tracking-wide">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {event.eventCategories.filter((c) => c.active).map((c) => (
                        <CategoryBadge key={c.id} category={c.category} />
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-[#e10600] transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>

          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            itemLabel="eventos"
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
