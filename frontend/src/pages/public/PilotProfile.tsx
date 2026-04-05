import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Hash, Calendar } from 'lucide-react';
import { pilotsApi, Pilot } from '../../api/pilots.api';
import { formatDate, CATEGORY_LABELS } from '../../lib/utils';
import { CategoryBadge } from '../../components/shared/CategoryBadge';

interface History {
  pilot: Pilot;
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
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    pilotsApi.getHistory(id).then((data) => setHistory(data as History)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!history) return <div className="text-center py-20 text-white/40">Piloto no encontrado</div>;

  const { pilot, inscriptions, standings } = history;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-white/50 hover:text-white mb-6 block">
        ← Inicio
      </Link>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-racing-red flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{pilot.name}</h1>
            {pilot.alias && <p className="text-white/50">"{pilot.alias}"</p>}
            {pilot.kartNumber && (
              <p className="text-sm text-white/60 flex items-center gap-1.5 mt-1">
                <Hash className="h-3.5 w-3.5" />
                Kart #{pilot.kartNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {standings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">Campeonato</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {standings.map((s, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <CategoryBadge category={s.category} />
                  <span className="text-xs text-white/40">{s.year}</span>
                </div>
                <p className="text-2xl font-black text-white">{s.totalPoints} pts</p>
                <p className="text-sm text-white/60">Posición #{s.position ?? '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {inscriptions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">Historial de eventos</h2>
          <div className="space-y-3">
            {inscriptions.map((insc) => (
              <div key={insc.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/eventos/${insc.event.slug}`} className="font-semibold text-white hover:text-racing-red transition-colors">
                      {insc.event.name}
                    </Link>
                    <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(insc.event.date)}
                    </p>
                  </div>
                  <CategoryBadge category={insc.category} />
                </div>
                {insc.raceResults.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {insc.raceResults.map((r, ri) => (
                      <div key={ri} className="text-center">
                        <div className="text-xs text-white/40">C{r.race.number}</div>
                        <div className="font-bold text-white">{r.finalPoints}pts</div>
                        {r.position && <div className="text-xs text-white/60">P{r.position}</div>}
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
