import { User } from 'lucide-react';
import { ReactNode } from 'react';
import { cn, getPositionClass, resolveMediaUrl } from '../../lib/utils';

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
  idx === 0 ? 'border-l-[3px] border-l-yellow-500' :
  idx === 1 ? 'border-l-[3px] border-l-white/20' :
  idx === 2 ? 'border-l-[3px] border-l-orange-400/40' :
  'border-l-[3px] border-l-transparent';

export function PointsTable({ rows, raceNumbers = [], showGap = true, className, renderAction }: Props) {
  return (
    <div className={cn('border border-[#38383f]', className)}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#38383f] bg-[#1f1f27]">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 w-12">Pos</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Piloto</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">#</th>
              {raceNumbers.map((n) => (
                <th key={n} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                  C{n}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Total</th>
              {showGap && (
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Gap</th>
              )}
              {renderAction && (
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Diploma</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-b border-[#38383f]/50 transition-colors hover:bg-[#2a2a35]',
                  idx === 0 && 'bg-yellow-500/5',
                  positionBorder(idx),
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
                <td className="px-4 py-2.5 text-center font-mono text-white/50 text-xs">{row.kartNumber ?? '—'}</td>
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
                {renderAction && (
                  <td className="px-4 py-2.5 text-center">
                    {renderAction(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden divide-y divide-[#38383f]/50">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={cn(
              'px-4 py-3 transition-colors',
              idx === 0 && 'bg-yellow-500/5',
              positionBorder(idx),
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn('font-black text-2xl w-7 flex-shrink-0 text-center', getPositionClass(row.position))}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {row.position}
              </span>

              <PilotAvatar photoUrl={row.photoUrl} name={row.pilotName} />

              <div className="flex-1 min-w-0">
                <p className="font-bold text-white uppercase text-sm truncate leading-tight"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  {row.pilotName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {row.alias && <span className="text-[10px] text-white/40 italic">"{row.alias}"</span>}
                  {raceNumbers.length > 0 && (
                    <span className="text-[10px] text-white/30">
                      {raceNumbers.map((n) => `C${n}: ${row.races?.[n] ?? '—'}`).join(' · ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-black text-white text-xl leading-none"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {row.total}
                </p>
                {showGap && row.gap !== undefined && row.gap > 0 && (
                  <p className="text-[10px] text-white/30 font-bold">-{row.gap}</p>
                )}
              </div>
            </div>
            {renderAction && (
              <div className="mt-3">
                {renderAction(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
