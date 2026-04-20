import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Award, BarChart2 } from 'lucide-react';
import { resultsApi } from '../../api/results.api';
import { eventsApi, Category } from '../../api/events.api';
import { useSSE } from '../../hooks/useSSE';
import { CATEGORY_LABELS } from '../../lib/utils';
import { PointsTable } from '../../components/shared/PointsTable';
import { queryKeys } from '../../lib/react-query';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';
import { toast } from '../../store/toast.store';

export function EventResults() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [downloadingPilotId, setDownloadingPilotId] = useState<string | null>(null);
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

  if (loading) return <PageLoadingState rows={3} />;

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];
  const canDownloadDiplomas = event?.status === 'FINISHED' && !!event?.diplomaTemplateUrl;

  const handleDownloadDiploma = async (pilotId: string) => {
    if (!slug) return;
    setDownloadingPilotId(pilotId);
    try {
      const response = await fetch(resultsApi.diplomaUrl(slug, pilotId), {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo descargar el diploma');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] ?? `diploma-${pilotId}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el diploma');
    } finally {
      setDownloadingPilotId(null);
    }
  };

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

      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#e10600] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            {event?.name}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Resultados <span className="text-[#e10600]">Finales</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <BarChart2 className="w-24 h-24 text-white" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8 p-1 bg-[#1a1a21] border border-[#38383f] rounded-lg">
        {activeCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.category)}
            className={`flex-1 min-w-[120px] px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-md ${
              selectedCat === c.category
                ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {CATEGORY_LABELS[c.category]}
          </button>
        ))}
      </div>

      {results ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {results.classification.length === 0 ? (
            <div className="text-center py-20 bg-[#1a1a21] border border-dashed border-[#38383f] rounded-xl text-white/20">
              <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="font-bold uppercase tracking-widest text-sm">Sin resultados publicados</p>
            </div>
          ) : (
            <PointsTable
              rows={results.classification}
              raceNumbers={results.races}
              showGap
              renderAction={canDownloadDiplomas ? (row) => (
                row.pilotId ? (
                  <button
                    type="button"
                    onClick={() => handleDownloadDiploma(row.pilotId!)}
                    disabled={downloadingPilotId === row.pilotId}
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md bg-yellow-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-yellow-500 transition-all hover:text-black disabled:opacity-50"
                  >
                    <Award className="h-3.5 w-3.5 relative z-10" />
                    <span className="relative z-10">{downloadingPilotId === row.pilotId ? 'Descargando' : 'Diploma'}</span>
                    <div className="absolute inset-0 translate-y-full bg-yellow-500 transition-transform duration-300 group-hover:translate-y-0" />
                  </button>
                ) : null
              ) : undefined}
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
