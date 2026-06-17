import { User } from 'lucide-react';
import { ReactNode } from 'react';
import { cn, resolveMediaUrl } from '../../lib/utils';

export interface PointsTableRow {
  position: number;
  pilotId?: string;
  pilotName: string;
  alias?: string | null;
  kartNumber?: number | null;
  photoUrl?: string | null;
  races?: Record<number, number>;
  total: number;
  gap?: number;
}

interface Props {
  rows: PointsTableRow[];
  raceNumbers?: number[];
  showGap?: boolean;
  className?: string;
  renderAction?: (row: PointsTableRow) => ReactNode;
}

function PilotAvatar({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  if (photoUrl) {
    return (
      <img
        src={resolveMediaUrl(photoUrl) ?? ''}
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

const positionBorder = (idx: number) =>
  idx === 0 ? 'border-l-4 border-l-yellow-500 bg-yellow-500/5' :
  idx === 1 ? 'border-l-4 border-l-slate-300 bg-slate-300/5' :
  idx === 2 ? 'border-l-4 border-l-amber-600/60 bg-amber-600/5' :
  'border-l-4 border-l-transparent';

const positionColor = (pos: number) =>
  pos === 1 ? 'text-yellow-400' :
  pos === 2 ? 'text-slate-300' :
  pos === 3 ? 'text-amber-500' :
  'text-white/40';

export function PointsTable({ rows, raceNumbers = [], showGap = true, className, renderAction }: Props) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-2xl', className)}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1a1a21]">
              <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">Pos</th>
              <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Piloto</th>
              <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">#</th>
              {raceNumbers.map((n) => (
                <th key={n} className="px-3 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">
                  C{n}
                </th>
              ))}
              <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c400] w-24">PTS</th>
              {showGap && (
                <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-20">Gap</th>
              )}
              {renderAction && (
                <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Diploma</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#38383f]/30">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  'group transition-all duration-200 hover:bg-white/[0.03]',
                  positionBorder(idx),
                )}
              >
                <td className="px-4 py-3.5">
                  <span className={cn('font-black text-2xl italic', positionColor(row.position))}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.position.toString().padStart(2, '0')}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <PilotAvatar photoUrl={row.photoUrl} name={row.pilotName} />
                      {idx < 3 && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1f1f27]",
                          idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-300" : "bg-amber-600"
                        )} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white uppercase text-base tracking-tight leading-none group-hover:text-[#f5c400] transition-colors"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                        {row.pilotName}
                      </p>
                      {row.alias && <p className="text-[10px] text-white/30 italic mt-0.5 tracking-wider font-medium">"{row.alias}"</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center font-mono text-white/40 text-sm font-bold">{row.kartNumber ?? '—'}</td>
                {raceNumbers.map((n) => (
                  <td key={n} className="px-3 py-3.5 text-center text-white/60 font-mono text-sm">
                    {row.races?.[n] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-3.5 text-center">
                  <span className="font-black text-white text-xl tabular-nums italic"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.total}
                  </span>
                </td>
                {showGap && (
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-[11px] text-white/30 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-sm">
                      {row.gap === 0 ? 'LEADER' : `-${row.gap}`}
                    </span>
                  </td>
                )}
                {renderAction && (
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      {renderAction(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden divide-y divide-[#38383f]/30">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={cn(
              'px-4 py-4 transition-all',
              positionBorder(idx),
            )}
          >
            <div className="flex items-center gap-4">
              <span className={cn('font-black text-3xl italic w-8 flex-shrink-0 text-center', positionColor(row.position))}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {row.position}
              </span>

              <div className="relative flex-shrink-0">
                <PilotAvatar photoUrl={row.photoUrl} name={row.pilotName} />
                {idx < 3 && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1f1f27]",
                    idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-300" : "bg-amber-600"
                  )} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-white uppercase text-base truncate leading-none tracking-tight"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  {row.pilotName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/30 font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded-sm">#{row.kartNumber ?? '—'}</span>
                  {raceNumbers.length > 0 && (
                    <span className="text-[10px] text-white/20 font-mono">
                      {raceNumbers.map((n) => `${row.races?.[n] ?? '0'}`).join('·')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-black text-white text-2xl italic leading-none"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {row.total}
                </p>
                {showGap && row.gap !== undefined && (
                  <p className="text-[10px] text-white/30 font-mono font-bold mt-1 uppercase tracking-tighter">
                    {row.gap === 0 ? 'Leader' : `Gap -${row.gap}`}
                  </p>
                )}
              </div>
            </div>
            {renderAction && (
              <div className="mt-4 pt-3 border-t border-[#38383f]/30">
                {renderAction(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
