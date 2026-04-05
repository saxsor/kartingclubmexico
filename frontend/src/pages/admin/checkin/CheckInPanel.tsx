import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare, X, Search } from 'lucide-react';
import { checkinApi } from '../../../api/checkin.api';
import { Inscription } from '../../../api/inscriptions.api';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';

export function CheckInPanel() {
  const { slug } = useParams<{ slug: string }>();
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [search, setSearch] = useState('');
  const [kartInputs, setKartInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Record<string, string>>({});

  const load = async () => {
    if (!slug) return;
    const data = await checkinApi.list(slug);
    setInscriptions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  const handleCheckIn = async (insc: Inscription) => {
    if (!slug) return;
    const kart = parseInt(kartInputs[insc.id] ?? insc.kartNumber?.toString() ?? '0');
    if (!kart) {
      setError((e) => ({ ...e, [insc.id]: 'Ingresa número de kart' }));
      return;
    }
    try {
      await checkinApi.checkIn(slug, insc.id, kart);
      setError((e) => { const n = { ...e }; delete n[insc.id]; return n; });
      load();
    } catch (err) {
      setError((e) => ({ ...e, [insc.id]: err instanceof Error ? err.message : 'Error' }));
    }
  };

  const handleUndo = async (insc: Inscription) => {
    if (!slug) return;
    await checkinApi.undoCheckIn(slug, insc.id);
    load();
  };

  const filtered = inscriptions.filter((i) =>
    i.pilot.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()),
  );

  const checkedIn = filtered.filter((i) => i.checkIn);
  const notCheckedIn = filtered.filter((i) => !i.checkIn);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Check-in</h1>
        <div className="text-sm text-white/60">
          {checkedIn.length}/{inscriptions.length} confirmados
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar piloto..."
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
        />
      </div>

      {notCheckedIn.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
            Pendientes ({notCheckedIn.length})
          </h2>
          <div className="space-y-2">
            {notCheckedIn.map((insc) => (
              <div key={insc.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{insc.pilot.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={insc.category} />
                      <StatusBadge status={insc.status} />
                    </div>
                    {error[insc.id] && (
                      <p className="text-xs text-red-400 mt-1">{error[insc.id]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={kartInputs[insc.id] ?? insc.kartNumber?.toString() ?? ''}
                      onChange={(e) => setKartInputs((k) => ({ ...k, [insc.id]: e.target.value }))}
                      placeholder="Kart #"
                      className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white text-center focus:border-racing-red focus:outline-none"
                    />
                    <button
                      onClick={() => handleCheckIn(insc)}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Check-in
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {checkedIn.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
            Confirmados ({checkedIn.length})
          </h2>
          <div className="space-y-2">
            {checkedIn.map((insc) => (
              <div key={insc.id} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{insc.pilot.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={insc.category} />
                      <span className="text-xs text-green-400 font-medium">
                        Kart #{insc.checkIn!.kartNumber}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUndo(insc)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                    title="Deshacer check-in"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
