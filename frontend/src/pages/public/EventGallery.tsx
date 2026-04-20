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
        <div className="mb-12">
          <Link 
            to={`/eventos/${slug}`}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al evento
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
                Galería de <span className="text-racing-red">Fotos</span>
              </h1>
              <p className="text-white/60 text-lg mt-2 font-medium">
                {event.name} — {formatDate(event.date)}
              </p>
            </div>
            <div className="flex items-center gap-4">
               <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <span className="text-white font-bold">{photos.length}</span>
                  <span className="text-white/40 ml-1.5 text-sm uppercase tracking-wider">Fotos</span>
               </div>
            </div>
          </div>
        </div>

        {/* Description if any */}
        {album.description && (
          <p className="text-white/50 max-w-2xl mb-12 text-lg italic leading-relaxed">
            "{album.description}"
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => handleOpenLightbox(index)}
              className="group relative aspect-square overflow-hidden bg-white/5 cursor-pointer rounded-lg md:rounded-xl"
            >
              <img
                src={resolveMediaUrl(photo.fileUrl) || ''}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <div className="h-10 w-10 rounded-full bg-racing-red text-white flex items-center justify-center scale-75 group-hover:scale-100 transition-transform">
                    <Share2 className="h-5 w-5" />
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
