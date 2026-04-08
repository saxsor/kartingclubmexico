import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Users, ClipboardList } from 'lucide-react';
import { api } from '../../api/client';
import { CATEGORY_LABELS, resolveMediaUrl } from '../../lib/utils';
import { SEO } from '../../components/shared/SEO';

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

  const query = useQuery({
    queryKey: ['events', slug, 'pilots-public'],
    queryFn: () => api.get<PublicPilotsResponse>(`/events/${slug}/pilots-public`),
    enabled: !!slug,
    refetchInterval: 30_000, // refresh every 30s
  });

  const data = query.data ?? null;
  const loading = query.isLoading;

  if (loading) return (
    <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Cargando...</div>
  );
  if (!data) return (
    <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Evento no encontrado</div>
  );

  const categories = ALL_CATEGORY_ORDER.filter((c) => data.activeCategories.includes(c));
  const totalPilots = Object.values(data.pilots).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <SEO
        title={`Pilotos inscritos — ${data.eventName}`}
        description={`${totalPilots} piloto${totalPilots !== 1 ? 's' : ''} inscritos en ${data.eventName}. Consulta quién participa por categoría.`}
        url={`/eventos/${slug}/pilotos`}
      />
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`/eventos/${slug}`}
          className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {data.eventName}
        </Link>
      </div>

      {/* Header */}
      <div className="border-t-[3px] border-[#e10600] bg-[#1f1f27] p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-4 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">{data.eventName}</span>
        </div>
        <h1
          className="text-3xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Pilotos inscritos
        </h1>
        <div className="mt-3 flex items-center gap-2 text-white/40 text-sm">
          <Users className="h-4 w-4" />
          <span>{totalPilots} piloto{totalPilots !== 1 ? 's' : ''} registrado{totalPilots !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {totalPilots === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm uppercase tracking-wide">Aún no hay pilotos inscritos.</p>
          {data.status === 'OPEN' && (
            <Link
              to={`/eventos/${slug}/inscribirse`}
              className="mt-4 inline-flex items-center gap-2 bg-[#e10600] hover:bg-[#b30500] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5" /> ¡Sé el primero!
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const pilots = data.pilots[cat] ?? [];
            if (pilots.length === 0) return null;
            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 bg-[#e10600]" />
                  <h2
                    className="text-lg font-black text-white uppercase tracking-wide"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h2>
                  <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-0.5">
                    {pilots.length}
                  </span>
                </div>

                {/* Pilot grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pilots.map((pilot, idx) => (
                    <Link
                      key={pilot.pilotId}
                      to={`/pilotos/${pilot.pilotId}`}
                      className="group flex items-center gap-3 border border-white/10 bg-[#1f1f27] hover:bg-[#2a2a35] hover:border-[#e10600]/40 p-3 transition-colors"
                    >
                      {/* Position number */}
                      <div className="flex-shrink-0 w-6 text-center text-xs font-black text-white/20 group-hover:text-[#e10600]/60 transition-colors">
                        {idx + 1}
                      </div>

                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {pilot.photoUrl ? (
                          <img
                            src={resolveMediaUrl(pilot.photoUrl) ?? ''}
                            alt={pilot.name}
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-[#38383f] flex items-center justify-center">
                            <User className="h-5 w-5 text-white/20" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate leading-tight">{pilot.name}</p>
                        {pilot.alias && (
                          <p className="text-xs text-white/40 truncate">"{pilot.alias}"</p>
                        )}
                        {pilot.kartNumber && (
                          <p className="text-xs text-[#e10600]/70 font-mono">#{pilot.kartNumber}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA inscribirse */}
      {data.status === 'OPEN' && (
        <div className="mt-10 border border-[#e10600]/30 bg-[#e10600]/5 p-6 text-center">
          <p className="text-white/60 text-sm mb-4">¿Quieres aparecer en esta lista?</p>
          <Link
            to={`/eventos/${slug}/inscribirse`}
            className="inline-flex items-center gap-2 bg-[#e10600] hover:bg-[#b30500] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Inscribirme ahora
          </Link>
        </div>
      )}
    </div>
  );
}
