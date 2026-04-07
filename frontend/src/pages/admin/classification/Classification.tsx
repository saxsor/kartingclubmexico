import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { resultsApi } from '../../../api/results.api';
import { downloadCsv } from '../../../lib/download';
import { eventsApi, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { PointsTable } from '../../../components/shared/PointsTable';
import { queryKeys } from '../../../lib/react-query';

export function Classification() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
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
    const first = event.eventCategories.find((c) => c.active);
    if (first) setSelectedCat(first.category);
  }, [eventQuery.data, selectedCat]);

  const event = eventQuery.data ?? null;
  const results = resultsQuery.data ?? null;
  const loading = eventQuery.isLoading;

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Clasificación — {event?.name}</h1>
        {selectedCat && slug && (
          <div className="flex gap-2">
            <button
              onClick={() => downloadCsv(resultsApi.exportUrl(slug, 'csv', selectedCat), `${slug}-${selectedCat}-resultados.csv`).catch(() => {})}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
              aria-label="Exportar resultados a CSV"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={() => { window.open(resultsApi.exportUrl(slug, 'pdf', selectedCat), '_blank'); }}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
              aria-label="Exportar resultados a PDF"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
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
