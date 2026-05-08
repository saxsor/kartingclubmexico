import { useRef, useState, type CSSProperties } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from '../../store/toast.store';

export interface SocialStandingsRow {
  position: number;
  name: string;
  auxLabel?: string | null;
  points: number;
  gap?: number | null;
}

interface SocialStandingsExportProps {
  title: string;
  championshipName: string;
  eventName: string;
  eventLabel?: string;
  categoryLabel: string;
  dateLabel: string;
  rows: SocialStandingsRow[];
  fileBaseName: string;
  disabled?: boolean;
  buttonLabel?: string;
  footerLabel?: string;
  variant?: 'standard' | 'carousel-safe';
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

const hiddenCanvasStyle: CSSProperties = {
  position: 'fixed',
  left: '-20000px',
  top: 0,
  pointerEvents: 'none',
  opacity: 0,
  zIndex: -1,
};

function chunkRows(rows: SocialStandingsRow[], rowsPerPage: number): SocialStandingsRow[][] {
  const pages: SocialStandingsRow[][] = [];
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    pages.push(rows.slice(index, index + rowsPerPage));
  }
  return pages;
}

function sanitizeFilePart(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tabla';
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function SocialCardPage({
  title,
  championshipName,
  eventName,
  eventLabel,
  categoryLabel,
  dateLabel,
  rows,
  page,
  totalPages,
  footerLabel,
  variant,
}: {
  title: string;
  championshipName: string;
  eventName: string;
  eventLabel: string;
  categoryLabel: string;
  dateLabel: string;
  rows: SocialStandingsRow[];
  page: number;
  totalPages: number;
  footerLabel: string;
  variant: 'standard' | 'carousel-safe';
}) {
  const isCarouselSafe = variant === 'carousel-safe';
  const shellClasses = isCarouselSafe
    ? 'mx-auto flex h-full max-w-[900px] flex-col px-24 py-20'
    : 'flex h-full flex-col px-16 py-10';
  const contentPanelClasses = isCarouselSafe
    ? 'flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-black/30 p-7 shadow-2xl backdrop-blur-sm'
    : 'flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-black/25 p-5 shadow-2xl backdrop-blur-sm';

  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#0f1116',
        backgroundImage: `
          radial-gradient(circle at top center, rgba(255,255,255,0.08), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.04), transparent 25%),
          repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px),
          repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 14px),
          linear-gradient(135deg, #0d0f14 0%, #161922 50%, #101216 100%)
        `,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(225,6,0,0.18),transparent_24%)]" />
      <div className={`relative ${shellClasses}`}>
        <div className={`${isCarouselSafe ? 'mb-6' : 'mb-4'} flex items-start justify-between gap-8`}>
          <div className="flex items-start gap-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <img
                src="/karting_club_logo.png"
                alt="Karting Club México"
                width={132}
                height={132}
                className={`${isCarouselSafe ? 'h-16 w-16' : 'h-20 w-20'} object-contain`}
                crossOrigin="anonymous"
              />
            </div>
            <div className="pt-1">
              <p
                className={`${isCarouselSafe ? 'text-[13px]' : 'text-[15px]'} font-black uppercase tracking-[0.34em] text-white/35`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Karting Club México
              </p>
              <h1
                className={`mt-2 ${isCarouselSafe ? 'max-w-[400px] text-[38px]' : 'max-w-[460px] text-[46px]'} font-black uppercase italic leading-[0.9] tracking-tight text-white`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {title}
              </h1>
            </div>
          </div>

          <div className={`${isCarouselSafe ? 'min-w-[230px]' : 'min-w-[220px]'} rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-right backdrop-blur-sm`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/35">Página</p>
            <p
              className={`mt-2 whitespace-nowrap ${isCarouselSafe ? 'text-[27px]' : 'text-[34px]'} font-black italic leading-none text-[#e10600]`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {String(page).padStart(2, '0')}
              <span className="mx-1.5 text-white/20">/</span>
              <span className="text-white/45">{String(totalPages).padStart(2, '0')}</span>
            </p>
          </div>
        </div>

        <div className={`${isCarouselSafe ? 'mb-7 gap-5' : 'mb-5 gap-4'} grid grid-cols-2`}>
          {[
            { label: 'Campeonato', value: championshipName },
            { label: eventLabel, value: eventName },
            { label: 'Categoría', value: categoryLabel },
            { label: 'Fecha', value: dateLabel },
          ].map((item) => (
            <div key={item.label} className={`${isCarouselSafe ? 'h-[112px]' : 'h-[104px]'} overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-sm`}>
              <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-white/35">{item.label}</p>
              <p
                className={`mt-2 ${isCarouselSafe ? 'text-[20px]' : 'text-[22px]'} font-black uppercase leading-[1.02] text-white`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className={contentPanelClasses}>
          <div className={`grid grid-cols-[96px_minmax(0,1fr)_156px_136px] gap-4 border-b border-white/10 ${isCarouselSafe ? 'px-4 pb-4' : 'px-3 pb-3'}`}>
            {['Posición', 'Nombre', 'Puntos', 'Gap'].map((label, index) => (
              <p
                key={label}
                className={`text-[14px] font-black uppercase tracking-[0.28em] ${index > 1 ? 'text-center' : ''} text-white/35`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {label}
              </p>
            ))}
          </div>

          <div className={`${isCarouselSafe ? 'mt-4 space-y-3' : 'mt-3 space-y-2.5'}`}>
            {rows.map((row, index) => {
              const medalClass =
                row.position === 1 ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400' :
                row.position === 2 ? 'border-slate-300/40 bg-slate-200/10 text-slate-200' :
                row.position === 3 ? 'border-amber-600/50 bg-amber-500/10 text-amber-400' :
                'border-white/8 bg-white/[0.04] text-white';

              return (
                <div
                  key={`${row.position}-${row.name}-${index}`}
                  className={`grid grid-cols-[96px_minmax(0,1fr)_156px_136px] items-center gap-4 rounded-2xl border px-4 ${isCarouselSafe ? 'py-3.5' : 'py-3'} ${medalClass}`}
                >
                  <div
                    className={`${isCarouselSafe ? 'text-[34px]' : 'text-[38px]'} text-center font-black italic leading-none`}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {String(row.position).padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`${isCarouselSafe ? 'text-[24px]' : 'text-[28px]'} truncate font-black uppercase leading-none`}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {row.name}
                    </p>
                    <p className={`${isCarouselSafe ? 'mt-2 text-[12px]' : 'mt-1.5 text-[13px]'} truncate font-semibold uppercase tracking-[0.16em] text-white/45`}>
                      {row.auxLabel || 'Karting Club México'}
                    </p>
                  </div>
                  <div
                    className={`${isCarouselSafe ? 'text-[34px]' : 'text-[38px]'} text-center font-black italic leading-none text-[#e10600]`}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {row.points}
                  </div>
                  <div className={`${isCarouselSafe ? 'text-[14px]' : 'text-[16px]'} text-center font-bold uppercase tracking-[0.16em] text-white/55`}>
                    {row.gap === undefined || row.gap === null ? '—' : row.gap === 0 ? 'Leader' : `-${row.gap}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${isCarouselSafe ? 'mt-6' : 'mt-5'} flex items-center justify-between`}>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.24em] text-white/28"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {isCarouselSafe ? `${footerLabel} | carrusel` : footerLabel}
          </p>
          <div className="h-[6px] w-44 skew-x-[-24deg] bg-[#e10600]" />
        </div>
      </div>
    </div>
  );
}

export function SocialStandingsExport({
  title,
  championshipName,
  eventName,
  eventLabel = 'Evento',
  categoryLabel,
  dateLabel,
  rows,
  fileBaseName,
  disabled = false,
  buttonLabel,
  footerLabel,
  variant = 'standard',
}: SocialStandingsExportProps) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const pages = chunkRows(rows, variant === 'carousel-safe' ? 6 : 8);

  const resolvedFooterLabel = footerLabel || `${championshipName} | ${categoryLabel}`;
  const resolvedButtonLabel = buttonLabel || (variant === 'carousel-safe' ? 'Carrusel 6 filas' : 'Feed 8 filas');

  const handleExport = async () => {
    if (disabled || pages.length === 0 || isExporting) return;
    setIsExporting(true);

    try {
      await document.fonts.ready;

      for (const [index] of pages.entries()) {
        const node = cardRefs.current[index];
        if (!node) throw new Error('No se pudo preparar la tarjeta para exportar');

        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          canvasWidth: CARD_WIDTH * 2,
          canvasHeight: CARD_HEIGHT * 2,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: '#0f1116',
        });

        const filename = `${sanitizeFilePart(fileBaseName)}-${String(index + 1).padStart(2, '0')}.png`;
        downloadDataUrl(dataUrl, filename);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }

      toast.success(`${pages.length} PNG generado${pages.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo exportar la imagen');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || pages.length === 0 || isExporting}
        title={variant === 'carousel-safe' ? 'Exportar PNG con márgenes seguros para carrusel' : 'Exportar PNG vertical para feed'}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {isExporting ? 'Generando...' : resolvedButtonLabel}
      </button>

      <div aria-hidden="true" style={hiddenCanvasStyle}>
        {pages.map((pageRows, index) => (
          <div
            key={`${fileBaseName}-${index}`}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
          >
            <SocialCardPage
              title={title}
              championshipName={championshipName}
              eventName={eventName}
              eventLabel={eventLabel}
              categoryLabel={categoryLabel}
              dateLabel={dateLabel}
              rows={pageRows}
              page={index + 1}
              totalPages={pages.length}
              footerLabel={resolvedFooterLabel}
              variant={variant}
            />
          </div>
        ))}
      </div>
    </>
  );
}
