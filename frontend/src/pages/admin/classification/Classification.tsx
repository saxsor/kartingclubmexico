import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart2, Download } from 'lucide-react';
import { resultsApi, CategoryResults } from '../../../api/results.api';
import { eventsApi, KartEvent, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { PointsTable } from '../../../components/shared/PointsTable';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';

export function Classification() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [results, setResults] = useState<CategoryResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    eventsApi.get(slug).then((e) => {
      setEvent(e);
      const first = e.eventCategories.find((c) => c.active);
      if (first) setSelectedCat(first.category);
    }).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug || !selectedCat) return;
    resultsApi.getByCategory(slug, selectedCat).then(setResults);
  }, [slug, selectedCat]);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Clasificación — {event?.name}</h1>
        {selectedCat && slug && (
          <div className="flex gap-2">
            <a
              href={resultsApi.exportUrl(slug, 'csv', selectedCat)}
              download
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </a>
            <a
              href={resultsApi.exportUrl(slug, 'pdf', selectedCat)}
              download
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
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
        results.classification.length === 0 ? (
          <div className="text-center py-10 text-white/40">
            No hay resultados para esta categoría aún.
          </div>
        ) : (
          <PointsTable
            rows={results.classification}
            raceNumbers={results.races}
            showGap
          />
        )
      ) : (
        <div className="text-center py-10 text-white/40">Selecciona una categoría</div>
      )}
    </div>
  );
}
