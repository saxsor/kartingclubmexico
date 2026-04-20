import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, MessageCircle, Facebook, Twitter, Link2, Loader2 } from 'lucide-react';
import { Photo } from '../../api/photos.api';
import { resolveMediaUrl, cn } from '../../lib/utils';
import { toast } from '../../store/toast.store';

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
    toast.success('Enlace copiado al portapapeles');
    setIsShareMenuOpen(false);
  };

  if (!currentPhoto) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}?photo=${currentIndex}`;
  const shareText = `Mira esta foto del evento ${eventName}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/98 backdrop-blur-xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 text-white z-20">
        <div className="flex items-center gap-4">
           <div className="w-1 h-8 bg-[#e10600] skew-x-[-15deg]" />
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 leading-none">
                {eventName}
              </span>
              <span className="text-sm font-black italic text-white uppercase mt-1">
                Media Viewer <span className="text-white/30 ml-2 font-mono not-italic">{currentIndex + 1} <span className="text-white/10">/</span> {photos.length}</span>
              </span>
           </div>
        </div>
        <button
          onClick={onClose}
          className="group h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-[#e10600] transition-all duration-300 shadow-xl"
        >
          <X className="h-6 w-6 transition-transform group-hover:rotate-90" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-4 md:px-20 py-4">
        <button
          onClick={handlePrevious}
          className="absolute left-6 z-10 h-16 w-16 hidden md:flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/20 active:scale-90"
        >
          <ChevronLeft className="h-10 w-10" />
        </button>

        <div className="relative group max-h-full max-w-full">
          <img
            key={currentPhoto.id}
            src={resolveMediaUrl(currentPhoto.fileUrl) || ''}
            alt=""
            className="max-h-[80vh] max-w-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-500 rounded-sm"
          />
          {/* Subtle watermark hint or overlay could go here */}
        </div>

        <button
          onClick={handleNext}
          className="absolute right-6 z-10 h-16 w-16 hidden md:flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/20 active:scale-90"
        >
          <ChevronRight className="h-10 w-10" />
        </button>
      </div>

      {/* Footer / Controls */}
      <div className="p-8 flex flex-col items-center gap-8 relative z-20">
        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-12 text-white/40 mb-2">
           <button onClick={handlePrevious} className="p-2 hover:text-[#e10600] active:scale-75 transition-all"><ChevronLeft className="h-10 w-10" /></button>
           <span className="text-sm font-black italic tracking-widest">{currentIndex + 1} <span className="text-white/10">OF</span> {photos.length}</span>
           <button onClick={handleNext} className="p-2 hover:text-[#e10600] active:scale-75 transition-all"><ChevronRight className="h-10 w-10" /></button>
        </div>

        {/* Fallback Share Menu */}
        {isShareMenuOpen && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#141419] border border-white/10 rounded-2xl p-2 flex flex-col gap-1 w-72 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 duration-300">
            {[
              { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
              { label: 'Facebook', icon: Facebook, color: 'text-blue-500', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
              { label: 'X (Twitter)', icon: Twitter, color: 'text-sky-500', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` }
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-white/5 text-white transition-all group"
                onClick={() => setIsShareMenuOpen(false)}
              >
                <social.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", social.color)} />
                <span className="text-sm font-bold uppercase tracking-widest">{social.label}</span>
              </a>
            ))}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-white/5 text-white transition-all group border-t border-white/5 mt-1"
            >
              <Link2 className="h-5 w-5 text-white/30 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold uppercase tracking-widest">Copiar Enlace</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <a
            href={`/api/photos/${currentPhoto.id}/download`}
            download
            className="group relative flex items-center gap-3 px-10 py-4 overflow-hidden rounded-lg bg-[#e10600] text-white font-black uppercase tracking-[0.15em] transition-all hover:scale-[1.05] active:scale-[0.95] shadow-[0_10px_30px_rgba(225,6,0,0.3)]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            <Download className="h-5 w-5" />
            <span className="relative z-10 italic">Descargar Foto</span>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
          </a>
          
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="h-14 w-14 flex items-center justify-center rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            title="Compartir"
          >
            {isSharing ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#e10600]" />
            ) : (
              <Share2 className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

