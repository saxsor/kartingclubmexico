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
