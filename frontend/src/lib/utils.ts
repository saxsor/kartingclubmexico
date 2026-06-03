import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(amount));
}

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;

  if (url.startsWith('drive:')) {
    return `https://lh3.googleusercontent.com/d/${url.slice(6)}`;
  }

  if (/^(?:https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  if (url.startsWith('/app/uploads/')) {
    return url.replace('/app/uploads/', '/uploads/');
  }

  if (url.startsWith('app/uploads/')) {
    return `/${url.replace(/^app\/uploads\//, 'uploads/')}`;
  }

  if (url.startsWith('uploads/')) {
    return `/${url}`;
  }

  if (url.startsWith('/')) {
    return url;
  }

  return `/${url}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  SHIFTER: 'Shifter',
  DOS_TIEMPOS: '2 Tiempos',
  FORMULA_MUNDIAL: 'Fórmula Mundial',
  NUEVE_HP: '9 HP',
  ROOKIES: 'Rookies',
  MINIS: 'Minis',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  PENDING_PAYMENT: 'Pago pendiente',
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  FINISHED_RACE: 'Finalizada',
  DNS: 'DNS',
  DNF: 'DNF',
  DSQ: 'DSQ',
};

export function getPositionClass(position: number): string {
  if (position === 1) return 'position-gold';
  if (position === 2) return 'position-silver';
  if (position === 3) return 'position-bronze';
  return '';
}
