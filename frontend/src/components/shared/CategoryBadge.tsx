import { CATEGORY_LABELS } from '../../lib/utils';
import { cn } from '../../lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  SHIFTER: 'bg-[#f5c400] text-[#111111]',
  DOS_TIEMPOS: 'bg-blue-600 text-white',
  FORMULA_MUNDIAL: 'bg-purple-600 text-white',
  NUEVE_HP: 'bg-emerald-600 text-white',
  ROOKIES: 'bg-orange-500 text-white',
  MINIS: 'bg-yellow-400 text-black',
};

interface Props {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
        CATEGORY_COLORS[category] ?? 'bg-gray-600 text-white',
        className,
      )}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}
