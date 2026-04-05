import { CATEGORY_LABELS } from '../../lib/utils';
import { cn } from '../../lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  SHIFTER: 'bg-red-700 text-white',
  DOS_TIEMPOS: 'bg-blue-700 text-white',
  FORMULA_MUNDIAL: 'bg-purple-700 text-white',
  NUEVE_HP: 'bg-green-700 text-white',
  ROOKIES: 'bg-orange-600 text-white',
  MINIS: 'bg-yellow-500 text-black',
};

interface Props {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        CATEGORY_COLORS[category] ?? 'bg-gray-600 text-white',
        className,
      )}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}
