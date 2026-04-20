import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Camera, Download, Share2 } from 'lucide-react';
import { photosApi } from '../../api/photos.api';
import { eventsApi } from '../../api/events.api';
import { resolveMediaUrl, formatDate } from '../../lib/utils';
import { PhotoLightbox } from '../../components/shared/PhotoLightbox';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';

export function EventGallery() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
    <div className="min-h-screen bg-racing-dark">
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

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => handleOpenLightbox(index)}
              className="group relative aspect-[3/4] overflow-hidden bg-[#1a1a21] cursor-pointer rounded-lg shadow-xl"
            >
              <img
                src={resolveMediaUrl(photo.fileUrl) || ''}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                 <div className="flex items-center justify-between translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="h-8 w-8 rounded-full bg-[#e10600] text-white flex items-center justify-center shadow-lg">
                       <Camera className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Ver foto</span>
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
