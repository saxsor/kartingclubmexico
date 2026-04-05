import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { resultsApi, CategoryResults } from '../../api/results.api';
import { eventsApi, KartEvent, Category } from '../../api/events.api';
import { useSSE } from '../../hooks/useSSE';
import { CATEGORY_LABELS } from '../../lib/utils';
import { CategoryBadge } from '../../components/shared/CategoryBadge';
import { PointsTable } from '../../components/shared/PointsTable';

export function EventResults() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [results, setResults] = useState<CategoryResults | null>(null);
  const [loading, setLoading] = useState(true);
  const { on } = useSSE(slug ?? null);

  const loadResults = useCallback(async () => {
    if (!slug || !selectedCat) return;
    const data = await resultsApi.getByCategory(slug, selectedCat);
    setResults(data);
  }, [slug, selectedCat]);

  useEffect(() => {
    if (!slug) return;
    eventsApi.get(slug).then((e) => {
      setEvent(e);
      const firstActive = e.eventCategories.find((c) => c.active);
      if (firstActive) setSelectedCat(firstActive.category);
    }).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (selectedCat) loadResults();
  }, [selectedCat, loadResults]);

  useEffect(() => {
    return on('race:results', () => loadResults());
  }, [on, loadResults]);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div>
      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white">
          ← {event?.name}
        </Link>
      </div>

      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-racing-red/20 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-racing-red" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Resultados</h1>
          <p className="text-sm text-white/50">{event?.name}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {activeCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.category)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCat === c.category
                ? 'bg-racing-red text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
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
