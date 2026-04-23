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

function getFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const match = disposition.match(/filename="([^"]+)"/i) ?? disposition.match(/filename=([^;]+)/i);
  return match?.[1]?.trim() ?? null;
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

  downloadBulk: async (slug: string, photoIds: string[]) => {
    const params = new URLSearchParams();
    photoIds.forEach((photoId) => params.append('photoId', photoId));

    const response = await fetch(`/api/events/${slug}/photos/download-bulk?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(error.error ?? `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = getFilenameFromDisposition(response.headers.get('content-disposition')) ?? `${slug}-fotos.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
