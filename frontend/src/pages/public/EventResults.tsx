import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { resultsApi } from '../../api/results.api';
import { eventsApi, Category } from '../../api/events.api';
import { useSSE } from '../../hooks/useSSE';
import { CATEGORY_LABELS } from '../../lib/utils';
import { PointsTable } from '../../components/shared/PointsTable';
import { queryKeys } from '../../lib/react-query';
import { SEO } from '../../components/shared/SEO';

export function EventResults() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const { on } = useSSE(slug ?? null);
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });
  const resultsQuery = useQuery({
    queryKey: slug && selectedCat ? queryKeys.results.byCategory(slug, selectedCat) : ['results', 'by-category', 'missing'],
    queryFn: () => resultsApi.getByCategory(slug!, selectedCat!),
    enabled: !!slug && !!selectedCat,
  });

  useEffect(() => {
    const event = eventQuery.data;
    if (!event || selectedCat) return;
    const firstActive = event.eventCategories.find((c) => c.active);
    if (firstActive) setSelectedCat(firstActive.category);
  }, [eventQuery.data, selectedCat]);

  useEffect(() => {
    return on('race:results', () => {
      void resultsQuery.refetch();
    });
  }, [on, resultsQuery]);

  const event = eventQuery.data ?? null;
  const results = resultsQuery.data ?? null;
  const loading = eventQuery.isLoading;

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div>
      <SEO
        title={event ? `Resultados — ${event.name}` : 'Resultados'}
        description={event ? `Resultados y clasificación de ${event.name}. Puntos por categoría y posiciones finales.` : undefined}
        url={`/eventos/${slug}/resultados`}
      />
      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white">
          ← {event?.name}
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            <BarChart2 className="inline h-3 w-3 mr-1.5" />
            {event?.name}
          </span>
        </div>
        <h1
          className="text-4xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Resultados
        </h1>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-px mb-6 bg-[#38383f]">
        {activeCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.category)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              selectedCat === c.category
                ? 'bg-[#e10600] text-white'
                : 'bg-[#1f1f27] text-white/50 hover:text-white hover:bg-[#2a2a35]'
            }`}
          >
            {CATEGORY_LABELS[c.category]}
          </button>
        ))}
      </div>

      {results ? (
        <div>
          {results.classification.length === 0 ? (
            <div className="text-center py-10 text-white/40">
              No hay resultados publicados para esta categoría.
            </div>
          ) : (
            <PointsTable
              rows={results.classification}
              raceNumbers={results.races}
              showGap
            />
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-white/40">
          Selecciona una categoría para ver los resultados.
        </div>
      )}
    </div>
  );
}
