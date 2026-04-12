import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { User, Hash, Calendar, Users } from 'lucide-react';
import { pilotsApi, Pilot } from '../../api/pilots.api';
import { formatDate, resolveMediaUrl } from '../../lib/utils';
import { CategoryBadge } from '../../components/shared/CategoryBadge';
import { queryKeys } from '../../lib/react-query';
import { SEO } from '../../components/shared/SEO';

interface History {
  pilot: Pilot & { team?: { id: string; name: string; slug: string } | null };
  inscriptions: {
    id: string;
    category: string;
    event: { name: string; slug: string; date: string };
    raceResults: { race: { number: number; category: string }; finalPoints: number; position: number | null }[];
  }[];
  standings: { year: number; category: string; totalPoints: number; position: number | null }[];
}

export function PilotProfile() {
  const { id } = useParams<{ id: string }>();
  const historyQuery = useQuery({
    queryKey: id ? queryKeys.pilots.history(id) : ['pilots', 'history', 'missing'],
    queryFn: () => pilotsApi.getHistory(id!) as Promise<History>,
    enabled: !!id,
  });

  const history = historyQuery.data ?? null;
  const loading = historyQuery.isLoading;

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!history) return <div className="text-center py-20 text-white/40">Piloto no encontrado</div>;

  const { pilot, inscriptions, standings } = history;

  return (
    <div className="max-w-2xl mx-auto">
      <SEO
        title={pilot.alias ? `${pilot.name} "${pilot.alias}"` : pilot.name}
        description={`Perfil de ${pilot.name} en Karting Club México. Historial de eventos, resultados y puntos del campeonato.`}
        image={pilot.photoUrl ? resolveMediaUrl(pilot.photoUrl) ?? undefined : undefined}
        url={`/pilotos/${id}`}
      />
      <Link to="/" className="text-sm text-white/50 hover:text-white mb-6 block">
        ← Inicio
      </Link>

      {/* Pilot header card */}
      <div className="border-t-[3px] border-[#e10600] bg-[#1f1f27] p-6 mb-6">
        <div className="flex items-center gap-4">
          {pilot.photoUrl ? (
            <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt={pilot.name} className="h-16 w-16 object-cover flex-shrink-0" />
          ) : (
            <div className="h-16 w-16 bg-[#2a2a35] flex items-center justify-center flex-shrink-0">
              <User className="h-8 w-8 text-white/20" />
            </div>
          )}
          <div>
            <h1
              className="text-3xl font-black text-white uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              {pilot.name}
            </h1>
            {pilot.alias && <p className="text-white/40 text-sm italic">"{pilot.alias}"</p>}
            {pilot.kartNumber && (
              <p className="text-sm text-white/50 flex items-center gap-1.5 mt-1 uppercase tracking-wider">
                <Hash className="h-3.5 w-3.5 text-[#e10600]" />
                Kart #{pilot.kartNumber}
              </p>
            )}
            {pilot.team && (
              <p className="text-sm text-white/50 flex items-center gap-1.5 mt-1">
                <Users className="h-3.5 w-3.5 text-[#e10600]" />
                <span className="font-medium text-white/70">{pilot.team.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {standings.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-[#e10600]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Campeonato</span>
          </div>
          <div className="grid gap-px sm:grid-cols-2 bg-[#38383f]">
            {standings.map((s, i) => (
              <div key={i} className="bg-[#1f1f27] p-4">
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={s.category} />
                  <span className="text-xs text-white/30 font-bold">{s.year}</span>
                </div>
                <p
                  className="text-3xl font-black text-white"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {s.totalPoints} <span className="text-lg text-white/40">pts</span>
                </p>
                <p className="text-xs text-white/50 uppercase tracking-wide mt-1">P{s.position ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {inscriptions.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-[#e10600]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Historial de eventos</span>
          </div>
          <div className="flex flex-col gap-px bg-[#38383f]">
            {inscriptions.map((insc) => (
              <div key={insc.id} className="bg-[#1f1f27] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/eventos/${insc.event.slug}`}
                      className="font-black text-white hover:text-[#e10600] transition-colors uppercase text-sm"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                    >
                      {insc.event.name}
                    </Link>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                      <Calendar className="h-3 w-3" />
                      {formatDate(insc.event.date)}
                    </p>
                  </div>
                  <CategoryBadge category={insc.category} />
                </div>
                {insc.raceResults.length > 0 && (
                  <div className="mt-3 flex gap-3">
                    {insc.raceResults.map((r, ri) => (
                      <div key={ri} className="bg-[#2a2a35] px-3 py-1.5 text-center">
                        <div className="text-[10px] text-white/30 uppercase tracking-wider">C{r.race.number}</div>
                        <div className="font-black text-white text-base"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {r.finalPoints}
                        </div>
                        {r.position && <div className="text-[10px] text-white/50">P{r.position}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
