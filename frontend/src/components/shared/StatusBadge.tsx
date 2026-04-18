import { cn } from '../../lib/utils';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-white/5 text-white/40 border border-white/10',
  OPEN: 'bg-green-500/15 text-green-400 border border-green-500/30',
  IN_PROGRESS: 'bg-[#e10600]/15 text-[#e10600] border border-[#e10600]/30 animate-pulse motion-reduce:animate-none',
  FINISHED: 'bg-white/5 text-white/50 border border-white/10',
  PENDING_PAYMENT: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  RECEIPT_SUBMITTED: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  PAID: 'bg-green-500/15 text-green-400 border border-green-500/30',
  PENDING: 'bg-white/5 text-white/40 border border-white/10',
  DNS: 'bg-white/5 text-white/30 border border-white/10',
  DNF: 'bg-[#e10600]/10 text-[#e10600]/70 border border-[#e10600]/20',
  DSQ: 'bg-[#e10600]/10 text-[#e10600]/70 border border-[#e10600]/20',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'BORRADOR',
  OPEN: 'ABIERTO',
  IN_PROGRESS: 'EN CURSO',
  FINISHED: 'FINALIZADO',
  PENDING_PAYMENT: 'PAGO PEND.',
  RECEIPT_SUBMITTED: 'COMPROBANTE',
  PAID: 'PAGADO',
  PENDING: 'PENDIENTE',
  DNS: 'DNS',
  DNF: 'DNF',
  DSQ: 'DSQ',
};

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase',
        STATUS_STYLES[status] ?? 'bg-gray-500/20 text-gray-400',
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
