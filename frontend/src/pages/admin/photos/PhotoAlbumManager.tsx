import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Trash2, 
  GripVertical, 
  Image as ImageIcon, 
  Check, 
  X, 
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { photosApi, Photo } from '../../../api/photos.api';
import { eventsApi } from '../../../api/events.api';
import { queryKeys } from '../../../lib/react-query';
import { resolveMediaUrl, cn } from '../../../lib/utils';
import { EventBreadcrumbs } from '../../../components/shared/EventBreadcrumbs';
import { PageLoadingState } from '../../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../../components/shared/EmptyState';

interface SortablePhotoProps {
  photo: Photo;
  isCover: boolean;
  onDelete: (id: string) => void;
  onSetCover: (url: string) => void;
}

function SortablePhotoCard({ photo, isCover, onDelete, onSetCover }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 transition-all hover:border-racing-red/40",
        isDragging && "opacity-50 scale-95 shadow-2xl ring-2 ring-racing-red/50",
        isCover && "ring-2 ring-racing-red ring-offset-2 ring-offset-racing-dark"
      )}
    >
      <img
        src={resolveMediaUrl(photo.fileUrl) || ''}
        alt=""
        className="h-full w-full object-cover transition-transform group-hover:scale-110"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Draggable Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 left-2 h-8 w-8 flex items-center justify-center rounded-lg bg-black/60 text-white/60 cursor-grab active:cursor-grabbing hover:bg-racing-red hover:text-white transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDelete(photo.id)}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/60 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
          title="Eliminar foto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSetCover(photo.fileUrl)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors",
            isCover ? "bg-racing-red text-white" : "bg-black/60 text-white/70 hover:bg-white/20"
          )}
        >
          <Star className={cn("h-3 w-3", isCover && "fill-current")} />
          {isCover ? 'Portada' : 'Elegir portada'}
        </button>
      </div>

      {isCover && (
        <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-racing-red flex items-center justify-center group-hover:hidden">
          <Star className="h-3.5 w-3.5 text-white fill-current" />
        </div>
      )}
    </div>
  );
}

export function PhotoAlbumManager() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });

  const albumQuery = useQuery({
    queryKey: slug ? ['photos', 'album', slug] : ['photos', 'album', 'missing'],
    queryFn: () => photosApi.getAlbum(slug!),
    enabled: !!slug,
  });

  const createAlbumMutation = useMutation({
    mutationFn: () => photosApi.createAlbum(slug!, { title: eventQuery.data?.name || 'Fotos' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', 'album', slug] });
    },
  });

  const updateAlbumMutation = useMutation({
    mutationFn: (data: Parameters<typeof photosApi.updateAlbum>[1]) => photosApi.updateAlbum(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', 'album', slug] });
    },
  });

  // Upload sequential to have progress and avoid timeouts
  const uploadPhotos = async (files: File[]) => {
    setUploadStatus({ current: 0, total: files.length });
    setError(null);
    const uploaded: Photo[] = [];

    try {
      // We upload in batches or one by one to show progress
      // For now, let's keep it simple but with progress updates
      // Note: backend expects an array, so we'll send them in small groups or one by one
      for (let i = 0; i < files.length; i++) {
        setUploadStatus({ current: i + 1, total: files.length });
        const result = await photosApi.uploadPhotos(slug!, [files[i]]);
        uploaded.push(...result);
      }
      
      queryClient.invalidateQueries({ queryKey: ['photos', 'album', slug] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir fotos');
    } finally {
      setUploadStatus(null);
    }
  };

  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => photosApi.deletePhoto(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', 'album', slug] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; order: number }[]) => photosApi.reorderPhotos(slug!, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', 'album', slug] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !albumQuery.data) return;

    if (active.id !== over.id) {
      const oldIndex = albumQuery.data.photos.findIndex((p) => p.id === active.id);
      const newIndex = albumQuery.data.photos.findIndex((p) => p.id === over.id);

      const newPhotos = arrayMove(albumQuery.data.photos, oldIndex, newIndex);
      
      // Optimistic update
      queryClient.setQueryData(['photos', 'album', slug], {
        ...albumQuery.data,
        photos: newPhotos,
      });

      // Persist
      reorderMutation.mutate(
        newPhotos.map((p, i) => ({ id: p.id, order: i }))
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 50) {
      setError('Máximo 50 fotos a la vez');
      return;
    }
    if (files.length > 0) {
      uploadPhotos(files);
    }
    // Clear input
    e.target.value = '';
  };

  const album = albumQuery.data;
  const event = eventQuery.data;
  const loading = eventQuery.isLoading || albumQuery.isLoading;

  if (loading && !uploadStatus) return <PageLoadingState cards={4} rows={1} />;
  if (!event) return <div className="text-center py-20 text-white/40">Evento no encontrado</div>;

  const photos = album?.photos || [];
  const isUploading = !!uploadStatus;
  const progressPercent = isUploading ? Math.round((uploadStatus.current / uploadStatus.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <EventBreadcrumbs eventSlug={slug!} eventName={event.name} currentLabel="Fotos" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Galería de Fotos</h1>
          <p className="text-white/50 text-sm mt-1">{event.name}</p>
        </div>

        <div className="flex items-center gap-2">
          {album && (
            <button
              onClick={() => updateAlbumMutation.mutate({ isPublished: !album.isPublished })}
              disabled={updateAlbumMutation.isPending || isUploading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                album.isPublished 
                  ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20" 
                  : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
              )}
            >
              {album.isPublished ? (
                <><Eye className="h-4 w-4" /> Publicado</>
              ) : (
                <><EyeOff className="h-4 w-4" /> Borrador</>
              )}
            </button>
          )}

          <label className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-racing-red hover:bg-red-700 transition-colors cursor-pointer",
            isUploading && "opacity-50 cursor-not-allowed"
          )}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? `Subiendo ${uploadStatus.current}/${uploadStatus.total}...` : 'Subir Fotos'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {isUploading && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center text-sm">
             <div className="flex items-center gap-2 text-white font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-racing-red" />
                Subiendo galería a Google Drive...
             </div>
             <span className="text-white/40 font-mono">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
             <div 
               className="h-full bg-racing-red transition-all duration-300 ease-out"
               style={{ width: `${progressPercent}%` }}
             />
          </div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
            No cierres esta pestaña hasta completar la subida
          </p>
        </div>
      )}

      {!album ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/5">
          <ImageIcon className="h-12 w-12 text-white/10 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Crea el album del evento</h3>
          <p className="text-white/40 text-sm mb-6">Aún no hay un album configurado para este evento.</p>
          <button
            onClick={() => createAlbumMutation.mutate()}
            disabled={createAlbumMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
          >
            {createAlbumMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crear Album
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Album Settings */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Título del album</label>
                <input 
                  type="text"
                  defaultValue={album.title}
                  onBlur={(e) => {
                    if (e.target.value !== album.title) {
                      updateAlbumMutation.mutate({ title: e.target.value });
                    }
                  }}
                  className="w-full bg-transparent border-none p-0 text-white font-semibold focus:ring-0 focus:outline-none"
                />
             </div>
             <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Descripción (opcional)</label>
                <input 
                  type="text"
                  placeholder="Añade una descripción..."
                  defaultValue={album.description || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (album.description || '')) {
                      updateAlbumMutation.mutate({ description: e.target.value });
                    }
                  }}
                  className="w-full bg-transparent border-none p-0 text-white text-sm focus:ring-0 focus:outline-none"
                />
             </div>
             <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-center">
                <p className="text-white/40 text-xs">{photos.length} fotos subidas</p>
                {album.isPublished ? (
                  <p className="text-green-500/80 text-[10px] mt-1 flex items-center gap-1 uppercase font-bold tracking-widest">
                    <Check className="h-3 w-3" /> Visible en la web pública
                  </p>
                ) : (
                  <p className="text-yellow-500/80 text-[10px] mt-1 flex items-center gap-1 uppercase font-bold tracking-widest">
                    <EyeOff className="h-3 w-3" /> Solo visible para el equipo
                  </p>
                )}
             </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
              <X className="h-5 w-5" />
              {error}
            </div>
          )}

          {photos.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No hay fotos aún"
              description="Sube las fotos del evento para que los pilotos puedan descargarlas."
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={photos.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {photos.map((photo) => (
                    <SortablePhotoCard
                      key={photo.id}
                      photo={photo}
                      isCover={album.coverUrl === photo.fileUrl}
                      onDelete={(id) => {
                        if (confirm('¿Eliminar esta foto permanentemente?')) {
                          deletePhotoMutation.mutate(id);
                        }
                      }}
                      onSetCover={(url) => updateAlbumMutation.mutate({ coverUrl: url })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
