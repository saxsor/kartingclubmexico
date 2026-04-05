import { cn, getPositionClass } from '../../lib/utils';

interface Row {
  position: number;
  pilotName: string;
  alias?: string | null;
  kartNumber?: number | null;
  races?: Record<number, number>;
  total: number;
  gap?: number;
}

interface Props {
  rows: Row[];
  raceNumbers?: number[];
  showGap?: boolean;
  className?: string;
}

export function PointsTable({ rows, raceNumbers = [], showGap = true, className }: Props) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-white/10', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
              Pos
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
              Piloto
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">
              #
            </th>
            {raceNumbers.map((n) => (
              <th
                key={n}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60"
              >
                C{n}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">
              Total
            </th>
            {showGap && (
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">
                Gap
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                'border-b border-white/5 transition-colors hover:bg-white/5',
                idx === 0 && 'bg-yellow-500/5',
              )}
            >
              <td className="px-4 py-3">
                <span className={cn('font-bold text-lg', getPositionClass(row.position))}>
                  {row.position}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-white">{row.pilotName}</p>
                {row.alias && <p className="text-xs text-white/50">"{row.alias}"</p>}
              </td>
              <td className="px-4 py-3 text-center font-mono text-white/70">
                {row.kartNumber ?? '-'}
              </td>
              {raceNumbers.map((n) => (
                <td key={n} className="px-3 py-3 text-center text-white/80">
                  {row.races?.[n] ?? '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-center font-bold text-white text-base">
                {row.total}
              </td>
              {showGap && (
                <td className="px-4 py-3 text-center text-white/60">
                  {row.gap === 0 ? '-' : `-${row.gap}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
