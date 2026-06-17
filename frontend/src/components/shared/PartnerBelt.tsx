import { cn } from '../../lib/utils';

type PartnerTone = 'gold' | 'light' | 'muted';

type Partner = {
  name: string;
  label: string;
  logo?: string;
  tone: PartnerTone;
  logoClassName?: string;
  href?: string;
};

type PartnerBeltProps = {
  variant?: 'marquee' | 'compact';
  className?: string;
};

const partnerLogos: Partner[] = [
  {
    name: 'Edel Racing',
    label: 'Development Partner',
    logo: '/partners/edel-logo.png',
    tone: 'gold',
    href: '',
  },
  {
    name: 'Eileen',
    label: 'Racing Family',
    logo: '/partners/logo_eileen.webp',
    tone: 'light',
    logoClassName: 'max-h-16 max-w-[205px]',
    href: '',
  },
  {
    name: 'Velora Labs',
    label: 'Technology Partner',
    logo: '/partners/velora_logo_grande.png',
    tone: 'light',
    href: '',
  },
  {
    name: 'De 0 a mi Primer Carrera',
    label: 'Racing Partner',
    logo: '/partners/de0_carrera_logo_blanco.webp',
    tone: 'light',
    logoClassName: 'max-h-16 max-w-[210px]',
    href: '',
  },
  {
    name: 'Próximamente',
    label: 'Partner Slot',
    tone: 'muted',
  },
  {
    name: 'Próximamente',
    label: 'Sponsor Slot',
    tone: 'muted',
  },
];

function PartnerTile({ partner, index, compact = false }: { partner: Partner; index: number; compact?: boolean }) {
  const content = partner.logo ? (
    <img
      src={partner.logo}
      alt={partner.name}
      className={cn(
        'object-contain opacity-95 transition-opacity duration-300 hover:opacity-100',
        compact ? 'max-h-12 max-w-[140px] sm:max-w-[160px]' : 'max-h-14 max-w-[185px]',
        !compact && partner.logoClassName,
      )}
    />
  ) : (
    <div>
      <p
        className={cn(
          'whitespace-nowrap font-black uppercase italic leading-none tracking-tight',
          compact ? 'text-xl' : 'text-2xl',
          partner.tone === 'gold' ? 'text-[#f5c400]' : partner.tone === 'light' ? 'text-white' : 'text-white/28',
        )}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {partner.name}
      </p>
      <p className="mt-1 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.2em] text-white/28">
        {partner.label}
      </p>
    </div>
  );

  const className = compact
    ? 'flex h-20 min-w-0 items-center justify-center bg-black/35 px-4 text-center transition-colors hover:bg-black/45'
    : 'flex h-20 w-60 shrink-0 items-center justify-center border border-white/10 bg-black/35 px-5 text-center shadow-[0_0_18px_rgba(0,0,0,0.18)] transition-colors hover:border-[#f5c400]/30';

  return partner.href ? (
    <a
      key={`${partner.name}-${partner.label}-${index}`}
      href={partner.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Abrir ${partner.name}`}
      className={className}
    >
      {content}
    </a>
  ) : (
    <div key={`${partner.name}-${partner.label}-${index}`} className={className}>
      {content}
    </div>
  );
}

export function PartnerBelt({ variant = 'marquee', className }: PartnerBeltProps) {
  if (variant === 'compact') {
    return (
      <section className={cn('overflow-hidden rounded-lg border border-[#38383f] bg-[#101016]/90', className)}>
        <div className="flex flex-col gap-1 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f5c400]">Aliados</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Powered by racing</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {partnerLogos.filter((partner) => partner.logo).map((partner, index) => (
            <PartnerTile key={`${partner.name}-${partner.label}`} partner={partner} index={index} compact />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn('relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-[#f5c400]/15 bg-[#101016] py-5', className)}>
      <div className="absolute inset-0 racing-stripe opacity-10 pointer-events-none" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6 lg:px-8">
        <div className="shrink-0 border-b border-white/10 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f5c400]">Aliados</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Powered by racing</p>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="sponsor-marquee flex w-max items-center gap-4">
            {[...partnerLogos, ...partnerLogos, ...partnerLogos].map((partner, index) => (
              <PartnerTile key={`${partner.name}-${partner.label}-${index}`} partner={partner} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
