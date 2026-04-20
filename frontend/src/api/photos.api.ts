import { api, uploadWithAuth } from './client';

export interface Photo {
  id: string;
  albumId: string;
  fileUrl: string;
  order: number;
  createdAt: string;
}

export interface PhotoAlbum {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoAlbumWithPhotos extends PhotoAlbum {
  photos: Photo[];
}

export interface PhotoAlbumUpdate {
  title?: string;
  description?: string;
  isPublished?: boolean;
  coverUrl?: string;
}

export const photosApi = {
  getAlbum: (slug: string) => api.get<PhotoAlbumWithPhotos>(`/events/${slug}/photos`),
  
  createAlbum: (slug: string, data: { title: string; description?: string }) =>
    api.post<PhotoAlbum>(`/events/${slug}/photos/album`, data),

  updateAlbum: (slug: string, data: PhotoAlbumUpdate) =>
    api.patch<PhotoAlbum>(`/events/${slug}/photos/album`, data),

  uploadPhotos: (slug: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return uploadWithAuth<Photo[]>(`/events/${slug}/photos/upload`, fd);
  },

  deletePhoto: (slug: string, photoId: string) =>
    api.delete<void>(`/events/${slug}/photos/${photoId}`),

  reorderPhotos: (slug: string, order: { id: string; order: number }[]) =>
    api.patch<void>(`/events/${slug}/photos/reorder`, { order }),
};
