import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventsApi, Category } from '../../../api/events.api';
import { CATEGORY_LABELS } from '../../../lib/utils';

const ALL_CATEGORIES: Category[] = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];

export function EventForm() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isEdit = slug !== 'nuevo' && slug !== undefined;

  const [form, setForm] = useState({
    name: '',
    date: '',
    description: '',
    serviceFee: '0',
    foodFee: '0',
    blockCheckInOnDebt: false,
    transferInfo: '',
    categories: [] as Category[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && slug) {
      eventsApi.get(slug).then((event) => {
        setForm({
          name: event.name,
          date: event.date.substring(0, 10),
          description: event.description ?? '',
          serviceFee: event.serviceFee,
          foodFee: event.foodFee,
          blockCheckInOnDebt: event.blockCheckInOnDebt,
          transferInfo: event.transferInfo ?? '',
          categories: event.eventCategories.filter((c) => c.active).map((c) => c.category),
        });
      });
    }
  }, [slug, isEdit]);

  const toggleCategory = (cat: Category) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = {
        name: form.name,
        date: form.date,
        description: form.description || undefined,
        serviceFee: parseFloat(form.serviceFee),
        foodFee: parseFloat(form.foodFee),
        blockCheckInOnDebt: form.blockCheckInOnDebt,
        transferInfo: form.transferInfo || undefined,
        categories: form.categories,
      };

      if (isEdit && slug) {
        await eventsApi.update(slug, data);
        navigate(`/app/eventos/${slug}`);
      } else {
        const created = await eventsApi.create(data);
        navigate(`/app/eventos/${created.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <button onClick={() => navigate('/app/eventos')} className="text-sm text-white/50 hover:text-white">
          ← Volver a eventos
        </button>
      </div>

      <h1 className="text-2xl font-black text-white mb-6">
        {isEdit ? 'Editar evento' : 'Nuevo evento'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Nombre del evento *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Gran Premio Karting Club México"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Fecha *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            Datos de transferencia (para auto-inscripción)
          </label>
          <textarea
            value={form.transferInfo}
            onChange={(e) => setForm({ ...form, transferInfo: e.target.value })}
            rows={4}
            placeholder={'Banco: BBVA\nCuenta: 1234567890\nCLABE: 012345678901234567\nTitular: Edel Racing'}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none resize-none"
          />
          <p className="mt-1 text-xs text-white/40">
            Se mostrará al piloto después de inscribirse.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Cuota de servicio ($)</label>
            <input
              type="number"
              value={form.serviceFee}
              onChange={(e) => setForm({ ...form, serviceFee: e.target.value })}
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Cuota de comida ($)</label>
            <input
              type="number"
              value={form.foodFee}
              onChange={(e) => setForm({ ...form, foodFee: e.target.value })}
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="blockCheckIn"
            type="checkbox"
            checked={form.blockCheckInOnDebt}
            onChange={(e) => setForm({ ...form, blockCheckInOnDebt: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-white/10 accent-racing-red"
          />
          <label htmlFor="blockCheckIn" className="text-sm text-white/70">
            Bloquear check-in si hay deuda pendiente
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Categorías</label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  form.categories.includes(cat)
                    ? 'border-racing-red bg-racing-red/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-racing-red py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear evento')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/eventos')}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
