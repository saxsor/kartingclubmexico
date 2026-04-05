import { cn } from '../../lib/utils';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400 border border-gray-500/50',
  OPEN: 'bg-green-500/20 text-green-400 border border-green-500/50',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse',
  FINISHED: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  PENDING_PAYMENT: 'bg-orange-500/20 text-orange-400 border border-orange-500/50',
  PAID: 'bg-green-500/20 text-green-400 border border-green-500/50',
  PENDING: 'bg-gray-500/20 text-gray-400 border border-gray-500/50',
  DNS: 'bg-gray-500/20 text-gray-400',
  DNF: 'bg-red-500/20 text-red-400',
  DSQ: 'bg-red-700/20 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  PENDING_PAYMENT: 'Pago pendiente',
  PAID: 'Pagado',
  PENDING: 'Pendiente',
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-gray-500/20 text-gray-400',
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
