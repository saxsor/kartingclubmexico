import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Camera, Download, Check } from 'lucide-react';
import { photosApi } from '../../api/photos.api';
import { eventsApi } from '../../api/events.api';
import { resolveMediaUrl, formatDate } from '../../lib/utils';
import { PhotoLightbox } from '../../components/shared/PhotoLightbox';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';
import { toast } from '../../store/toast.store';

const BULK_DOWNLOAD_LIMIT = 20;

export function EventGallery() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['events', 'public', slug],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });

  const albumQuery = useQuery({
    queryKey: ['photos', 'public', slug],
    queryFn: () => photosApi.getAlbum(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    const photoParam = searchParams.get('photo');
    if (photoParam !== null && albumQuery.data) {
      const index = parseInt(photoParam, 10);
      if (!isNaN(index) && index >= 0 && index < albumQuery.data.photos.length) {
        setSelectedIndex(index);
      }
    }
  }, [searchParams, albumQuery.data]);

  const handleOpenLightbox = (index: number) => {
    if (isSelecting) return;
    setSelectedIndex(index);
    setSearchParams({ photo: index.toString() });
  };

  const handleCloseLightbox = () => {
    setSelectedIndex(null);
    setSearchParams({});
  };

  const handleNavigate = (index: number) => {
    setSelectedIndex(index);
    setSearchParams({ photo: index.toString() });
  };

  const toggleSelectionMode = () => {
    setIsSelecting((current) => {
      if (current) setSelectedPhotoIds([]);
      return !current;
    });
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((current) => {
      if (current.includes(photoId)) return current.filter((id) => id !== photoId);
      if (current.length >= BULK_DOWNLOAD_LIMIT) {
        toast.error(`Solo puedes seleccionar hasta ${BULK_DOWNLOAD_LIMIT} fotos`);
        return current;
      }
      return [...current, photoId];
    });
  };

  const handleBulkDownload = async () => {
    if (!slug || selectedPhotoIds.length === 0 || isBulkDownloading) return;
    setIsBulkDownloading(true);
    try {
      await photosApi.downloadBulk(slug, selectedPhotoIds);
      toast.success(`${selectedPhotoIds.length} fotos descargadas`);
      setIsSelecting(false);
      setSelectedPhotoIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron descargar las fotos');
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const event = eventQuery.data;
  const album = albumQuery.data;
  const loading = eventQuery.isLoading || albumQuery.isLoading;

  if (loading) return <PageLoadingState cards={6} rows={2} />;
  if (!event || !album || !album.isPublished) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Camera className="h-16 w-16 text-white/10 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Galería no disponible</h1>
        <p className="text-white/40 mb-8">Las fotos de este evento aún no han sido publicadas o el evento no existe.</p>
        <Link to="/eventos" className="text-racing-red hover:underline font-bold">Ver otros eventos</Link>
      </div>
    );
  }

  const photos = album.photos;

  return (
    <div className="racing-carbon-bg min-h-screen">
      <SEO 
        title={`Fotos — ${event.name}`}
        description={`Galería de fotos oficial de Karting Club México para el evento ${event.name}.`}
        image={resolveMediaUrl(album.coverUrl || photos[0]?.fileUrl) ?? undefined}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 relative">
          <Link 
            to={`/eventos/${slug}`}
            className="inline-flex items-center gap-2 text-white/30 hover:text-[#e10600] transition-colors mb-8 group uppercase text-[10px] font-black tracking-[0.2em]"
          >
            <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
            Volver al evento
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="relative">
              <div className="absolute -left-4 top-0 w-1.5 h-full bg-[#e10600] skew-x-[-15deg] hidden md:block" />
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-[0.9]">
                Galería <span className="text-[#e10600]">Pro</span>
              </h1>
              <p className="text-white/50 text-base md:text-xl mt-4 font-bold uppercase tracking-widest italic">
                {event.name} <span className="mx-2 text-white/20">|</span> {formatDate(event.date)}
              </p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end gap-3">
                  <button
                    type="button"
                    onClick={toggleSelectionMode}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
                      isSelecting
                        ? 'border-[#e10600] bg-[#e10600] text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {isSelecting ? 'Cancelar selección' : 'Seleccionar fotos'}
                  </button>
                  {isSelecting && (
                    <button
                      type="button"
                      onClick={handleBulkDownload}
                      disabled={selectedPhotoIds.length === 0 || isBulkDownloading}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#e10600] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {isBulkDownloading ? 'Preparando ZIP...' : `Descargar (${selectedPhotoIds.length})`}
                    </button>
                  )}
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-4xl font-black text-white italic tabular-nums leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{photos.length}</span>
                  <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">Imágenes Totales</span>
               </div>
            </div>
          </div>
        </div>

        {/* Description if any */}
        {album.description && (
          <div className="max-w-3xl mb-16 p-6 border-l-2 border-white/10 bg-white/[0.02]">
            <p className="text-white/60 text-lg italic leading-relaxed">
              "{album.description}"
            </p>
          </div>
        )}

        {isSelecting && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">
              {selectedPhotoIds.length} de {BULK_DOWNLOAD_LIMIT} fotos seleccionadas
            </p>
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Toca las imágenes que quieras incluir en el ZIP
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => (isSelecting ? togglePhotoSelection(photo.id) : handleOpenLightbox(index))}
              className="group relative aspect-[3/4] overflow-hidden bg-[#1a1a21] cursor-pointer rounded-lg shadow-xl"
            >
              <img
                src={resolveMediaUrl(photo.fileUrl) || ''}
                alt=""
                loading="lazy"
                className={`h-full w-full object-cover transition-all duration-700 ${isSelecting ? 'group-hover:scale-105' : 'group-hover:scale-110 group-hover:rotate-1'}`}
              />
              {isSelecting && (
                <>
                  <div className={`absolute inset-0 transition-colors ${selectedPhotoIds.includes(photo.id) ? 'bg-[#e10600]/35' : 'bg-black/20'}`} />
                  <div className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border text-white transition-all ${
                    selectedPhotoIds.includes(photo.id)
                      ? 'border-[#e10600] bg-[#e10600]'
                      : 'border-white/30 bg-black/40'
                  }`}>
                    <Check className="h-4 w-4" />
                  </div>
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                 <div className="flex items-center justify-between translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="h-8 w-8 rounded-full bg-[#e10600] text-white flex items-center justify-center shadow-lg">
                       <Camera className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      {isSelecting ? 'Seleccionar' : 'Ver foto'}
                    </span>
                 </div>
              </div>
            </div>
          ))}
        </div>


        {photos.length === 0 && (
          <div className="py-20 text-center text-white/20">
             <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
             <p>No hay fotos en esta galería aún.</p>
          </div>
        )}
      </div>

      {selectedIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={selectedIndex}
          onClose={handleCloseLightbox}
          onNavigate={handleNavigate}
          eventName={event.name}
        />
      )}
      
      {/* Footer hint */}
      <div className="container mx-auto px-4 py-20 text-center border-t border-white/5 mt-20">
         <p className="text-white/20 text-sm uppercase tracking-[0.2em]">Karting Club México — Galería Oficial</p>
      </div>
    </div>
  );
}
