import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, MessageCircle, Facebook, Twitter, Link2, Loader2 } from 'lucide-react';
import { Photo } from '../../api/photos.api';
import { resolveMediaUrl, cn } from '../../lib/utils';

interface Props {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  eventName: string;
}

export function PhotoLightbox({ photos, currentIndex, onClose, onNavigate, eventName }: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const currentPhoto = photos[currentIndex];

  const handlePrevious = useCallback(() => {
    setIsShareMenuOpen(false);
    onNavigate((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  const handleNext = useCallback(() => {
    setIsShareMenuOpen(false);
    onNavigate((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrevious, handleNext]);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    
    const url = `${window.location.origin}${window.location.pathname}?photo=${currentIndex}`;
    const shareText = `Mira esta foto del evento ${eventName}`;

    try {
      // 1. Fetch the watermarked image blob
      const response = await fetch(`/api/photos/${currentPhoto.id}/download`);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const file = new File([blob], `foto-kcm-${currentPhoto.id.slice(0,8)}.jpg`, { type: 'image/jpeg' });

      const shareData = {
        title: `Foto — ${eventName}`,
        text: shareText,
        url: url,
        files: [file],
      };

      // 2. Try sharing the file natively
      // Note: canShare check is important for file support
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
      } else {
        setIsShareMenuOpen(!isShareMenuOpen);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing natively:', err);
        setIsShareMenuOpen(true);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    const url = `${window.location.origin}${window.location.pathname}?photo=${currentIndex}`;
    await navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');
    setIsShareMenuOpen(false);
  };

  if (!currentPhoto) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}?photo=${currentIndex}`;
  const shareText = `Mira esta foto del evento ${eventName}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex flex-col">
           <span className="text-sm font-bold uppercase tracking-widest text-white/40">
             {eventName}
           </span>
           <span className="text-xs text-white/60">
             Foto {currentIndex + 1} de {photos.length}
           </span>
        </div>
        <button
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4 md:p-8">
        <button
          onClick={handlePrevious}
          className="absolute left-4 z-10 h-12 w-12 hidden md:flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <img
          src={resolveMediaUrl(currentPhoto.fileUrl) || ''}
          alt=""
          className="max-h-full max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-300"
        />

        <button
          onClick={handleNext}
          className="absolute right-4 z-10 h-12 w-12 hidden md:flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      {/* Footer / Controls */}
      <div className="p-6 flex flex-col items-center gap-6 relative">
        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-8 text-white/60">
           <button onClick={handlePrevious} className="p-2 hover:text-white"><ChevronLeft className="h-8 w-8" /></button>
           <span className="text-sm font-mono">{currentIndex + 1} / {photos.length}</span>
           <button onClick={handleNext} className="p-2 hover:text-white"><ChevronRight className="h-8 w-8" /></button>
        </div>

        {/* Fallback Share Menu */}
        {isShareMenuOpen && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 rounded-2xl p-2 flex flex-col gap-1 w-64 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors"
              onClick={() => setIsShareMenuOpen(false)}
            >
              <MessageCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">WhatsApp</span>
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors"
              onClick={() => setIsShareMenuOpen(false)}
            >
              <Facebook className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Facebook</span>
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors"
              onClick={() => setIsShareMenuOpen(false)}
            >
              <Twitter className="h-5 w-5 text-sky-500" />
              <span className="font-medium">X (Twitter)</span>
            </a>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors"
            >
              <Link2 className="h-5 w-5 text-zinc-400" />
              <span className="font-medium">Copiar Enlace</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <a
            href={`/api/photos/${currentPhoto.id}/download`}
            download
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-racing-red text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            <Download className="h-5 w-5" />
            Descargar
          </a>
          
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
            title="Compartir"
          >
            {isSharing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

