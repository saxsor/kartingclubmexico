import { User } from 'lucide-react';
import { cn, getPositionClass } from '../../lib/utils';

interface Row {
  position: number;
  pilotName: string;
  alias?: string | null;
  kartNumber?: number | null;
  photoUrl?: string | null;
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

function PilotAvatar({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-7 w-7 object-cover flex-shrink-0"
        style={{ imageRendering: 'auto' }}
      />
    );
  }
  return (
    <div className="h-7 w-7 bg-[#38383f] flex items-center justify-center flex-shrink-0">
      <User className="h-3.5 w-3.5 text-white/30" />
    </div>
  );
}

export function PointsTable({ rows, raceNumbers = [], showGap = true, className }: Props) {
  return (
    <div className={cn('overflow-x-auto border border-[#38383f]', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#38383f] bg-[#1f1f27]">
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 w-12">
              Pos
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">
              Piloto
            </th>
            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
              #
            </th>
            {raceNumbers.map((n) => (
              <th
                key={n}
                className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40"
              >
                C{n}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
              Total
            </th>
            {showGap && (
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
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
                'border-b border-[#38383f]/50 transition-colors hover:bg-[#2a2a35]',
                idx === 0 && 'bg-yellow-500/5 border-l-[3px] border-l-yellow-500',
                idx === 1 && 'border-l-[3px] border-l-white/20',
                idx === 2 && 'border-l-[3px] border-l-orange-400/40',
                idx > 2 && 'border-l-[3px] border-l-transparent',
              )}
            >
              <td className="px-4 py-2.5">
                <span className={cn('font-black text-xl', getPositionClass(row.position))}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {row.position}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <PilotAvatar photoUrl={row.photoUrl} name={row.pilotName} />
                  <div>
                    <p className="font-bold text-white uppercase text-sm leading-tight"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                      {row.pilotName}
                    </p>
                    {row.alias && <p className="text-[10px] text-white/40 italic">"{row.alias}"</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-2.5 text-center font-mono text-white/50 text-xs">
                {row.kartNumber ?? '—'}
              </td>
              {raceNumbers.map((n) => (
                <td key={n} className="px-3 py-2.5 text-center text-white/70 text-sm">
                  {row.races?.[n] ?? '—'}
                </td>
              ))}
              <td className="px-4 py-2.5 text-center font-black text-white text-lg"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {row.total}
              </td>
              {showGap && (
                <td className="px-4 py-2.5 text-center text-white/40 text-xs font-bold">
                  {row.gap === 0 ? '—' : `-${row.gap}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
