import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { User, Users, ClipboardList, Search } from 'lucide-react';
import { api } from '../../api/client';
import { CATEGORY_LABELS, resolveMediaUrl } from '../../lib/utils';
import { SEO } from '../../components/shared/SEO';
import { PageLoadingState } from '../../components/shared/LoadingSkeleton';
import { useState } from 'react';

const ALL_CATEGORY_ORDER = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];

interface PilotEntry {
  pilotId: string;
  name: string;
  alias: string | null;
  photoUrl: string | null;
  kartNumber: number | null;
}

interface PublicPilotsResponse {
  eventName: string;
  status: string;
  activeCategories: string[];
  pilots: Record<string, PilotEntry[]>;
}

export function EventPilots() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['events', slug, 'pilots-public'],
    queryFn: () => api.get<PublicPilotsResponse>(`/events/${slug}/pilots-public`),
    enabled: !!slug,
    refetchInterval: 30_000,
  });

  const data = query.data ?? null;
  const loading = query.isLoading;

  if (loading) return <PageLoadingState rows={4} />;
  if (!data) return <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Evento no encontrado</div>;

  const categories = ALL_CATEGORY_ORDER.filter((c) => data.activeCategories.includes(c));
  const totalPilots = Object.values(data.pilots).reduce((s, arr) => s + arr.length, 0);

  // Auto-select first category if none selected
  if (!selectedCat && categories.length > 0) {
    setSelectedCat(categories[0]);
  }

  const currentPilots = selectedCat ? (data.pilots[selectedCat] ?? []) : [];

  return (
    <div className="pb-20">
      <SEO
        title={`Pilotos inscritos — ${data.eventName}`}
        description={`${totalPilots} piloto${totalPilots !== 1 ? 's' : ''} inscritos en ${data.eventName}.`}
        url={`/eventos/${slug}/pilotos`}
      />

      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white transition-colors">
          ← {data.eventName}
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#e10600] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            {data.eventName}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Entry <span className="text-[#e10600]">List</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <Users className="w-24 h-24 text-white" />
        </div>
        <div className="mt-2 flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
          <span className="bg-[#e10600] text-white px-1.5 py-0.5 rounded-sm">{totalPilots}</span> Pilotos confirmados
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-[#1a1a21] border border-[#38383f] rounded-lg">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`flex-1 min-w-[120px] px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-md ${
                selectedCat === c
                  ? 'bg-[#e10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c}
            </button>
          ))}
        </div>
      )}

      {totalPilots === 0 ? (
        <div className="text-center py-20 bg-[#1a1a21] border border-dashed border-[#38383f] rounded-xl text-white/20">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
          <p className="font-bold uppercase tracking-widest text-sm">Aún no hay inscritos</p>
          {data.status === 'OPEN' && (
            <Link
              to={`/eventos/${slug}/inscribirse`}
              className="mt-6 inline-flex items-center gap-2 bg-[#e10600] hover:bg-[#b30500] px-8 py-3 text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg hover:shadow-[0_0_20px_rgba(225,6,0,0.4)]"
            >
              <ClipboardList className="h-4 w-4" /> Inscribirme ahora
            </Link>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#38383f] bg-[#1a1a21]">
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-16">No.</th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Piloto</th>
                    <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-24">Kart</th>
                    <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.2em] text-white/30 w-32">Perfil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38383f]/30">
                  {currentPilots.map((pilot, idx) => (
                    <tr key={pilot.pilotId} className="group transition-all duration-200 hover:bg-white/[0.03] border-l-4 border-l-transparent hover:border-l-[#e10600]">
                      <td className="px-4 py-3.5">
                        <span className="font-black text-2xl italic text-white/20 group-hover:text-[#e10600]/40 transition-colors" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {pilot.photoUrl ? (
                              <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt={pilot.name} className="h-9 w-9 object-cover flex-shrink-0" />
                            ) : (
                              <div className="h-9 w-9 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-white/20" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white uppercase text-base tracking-tight leading-none group-hover:text-[#e10600] transition-colors" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                              {pilot.name}
                            </p>
                            {pilot.alias && <p className="text-[10px] text-white/30 italic mt-0.5 tracking-wider font-medium font-sans">"{pilot.alias}"</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {pilot.kartNumber ? (
                          <span className="font-black text-white text-xl tabular-nums italic bg-white/5 px-3 py-1 rounded" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            #{pilot.kartNumber}
                          </span>
                        ) : (
                          <span className="text-white/10">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/pilotos/${pilot.pilotId}`}
                          className="inline-flex items-center justify-center p-2 text-white/20 hover:text-[#e10600] transition-colors"
                        >
                          <Search className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA inscribirse at bottom if space is available */}
          {data.status === 'OPEN' && (
            <div className="mt-12 text-center p-8 bg-gradient-to-b from-transparent to-[#e10600]/5 border-b border-[#e10600]/20">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">¿Quieres correr con nosotros?</p>
              <Link
                to={`/eventos/${slug}/inscribirse`}
                className="inline-flex items-center gap-2 bg-white text-black hover:bg-[#e10600] hover:text-white px-8 py-4 text-xs font-black uppercase tracking-widest transition-all shadow-xl"
              >
                <ClipboardList className="h-4 w-4" /> Registrarme en este evento
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
