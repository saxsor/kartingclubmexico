import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X, Search } from 'lucide-react';
import { inscriptionsApi, Inscription } from '../../../api/inscriptions.api';
import { pilotsApi, Pilot } from '../../../api/pilots.api';
import { eventsApi, KartEvent, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';

export function InscriptionManager() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ pilotId: '', category: '' as Category | '', kartNumber: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!slug) return;
    const [e, insc, p] = await Promise.all([
      eventsApi.get(slug),
      inscriptionsApi.list(slug),
      pilotsApi.list(),
    ]);
    setEvent(e);
    setInscriptions(insc);
    setPilots(p.filter((p) => p.active));
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form.pilotId || !form.category) return;
    setError('');
    try {
      await inscriptionsApi.create(slug, {
        pilotId: form.pilotId,
        category: form.category as Category,
        kartNumber: form.kartNumber ? parseInt(form.kartNumber) : undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ pilotId: '', category: '', kartNumber: '', notes: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear inscripción');
    }
  };

  const filtered = inscriptions.filter((i) =>
    i.pilot.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCategories = event?.eventCategories.filter((c) => c.active) ?? [];

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Inscripciones — {event?.name}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Inscribir piloto
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Nueva inscripción</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="h-5 w-5 text-white/40 hover:text-white" />
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Piloto *</label>
              <select
                value={form.pilotId}
                onChange={(e) => setForm({ ...form, pilotId: e.target.value })}
                required
                className="w-full rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              >
                <option value="">Seleccionar piloto</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.alias ? `"${p.alias}"` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Categoría *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                required
                className="w-full rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              >
                <option value="">Seleccionar categoría</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.category}>{CATEGORY_LABELS[c.category]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Número de kart</label>
              <input
                type="number"
                value={form.kartNumber}
                onChange={(e) => setForm({ ...form, kartNumber: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
              />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
            Inscribir
          </button>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar inscripciones..."
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Piloto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Categoría</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Kart</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Pago</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{i.pilot.name}</p>
                  {i.pilot.alias && <p className="text-xs text-white/50">"{i.pilot.alias}"</p>}
                </td>
                <td className="px-4 py-3"><CategoryBadge category={i.category} /></td>
                <td className="px-4 py-3 text-center font-mono text-white/70">
                  {i.kartNumber ? `#${i.kartNumber}` : '-'}
                </td>
                <td className="px-4 py-3 text-center"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-center">
                  {i.checkIn ? (
                    <span className="text-xs text-green-400 font-medium">Sí #{i.checkIn.kartNumber}</span>
                  ) : (
                    <span className="text-xs text-white/30">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-white/40">No hay inscripciones</div>
        )}
      </div>
    </div>
  );
}
