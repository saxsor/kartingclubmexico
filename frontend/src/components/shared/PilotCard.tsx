import { User, Hash } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  name: string;
  alias?: string | null;
  kartNumber?: number | null;
  position?: number;
  className?: string;
  onClick?: () => void;
}

export function PilotCard({ name, alias, kartNumber, position, className, onClick }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-colors',
        onClick && 'cursor-pointer hover:bg-white/10',
        className,
      )}
      onClick={onClick}
    >
      {position !== undefined && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-racing-red text-sm font-bold text-[#111111]">
          {position}
        </div>
      )}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
        <User className="h-4 w-4 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {alias && <p className="truncate text-xs text-white/50">"{alias}"</p>}
      </div>
      {kartNumber && (
        <div className="flex items-center gap-1 text-white/60">
          <Hash className="h-3 w-3" />
          <span className="text-sm font-mono font-bold">{kartNumber}</span>
        </div>
      )}
    </div>
  );
}
