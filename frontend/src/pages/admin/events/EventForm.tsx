import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import { eventsApi, Category } from '../../../api/events.api';
import { CATEGORY_LABELS, resolveMediaUrl } from '../../../lib/utils';
import { toast } from '../../../store/toast.store';
import { queryKeys } from '../../../lib/react-query';

const ALL_CATEGORIES: Category[] = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];

export function EventForm() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isEdit = slug !== 'nuevo' && slug !== undefined;

  const [form, setForm] = useState({
    name: '',
    date: '',
    description: '',
    track: '',
    serviceFee: '0',
    foodFee: '0',
    blockCheckInOnDebt: false,
    transferInfo: '',
    categories: [] as Category[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [posterUploading, setPosterUploading] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const eventQuery = useQuery({
    queryKey: isEdit && slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'new'],
    queryFn: () => eventsApi.get(slug!),
    enabled: isEdit && !!slug,
  });
  const createMutation = useMutation({
    mutationFn: (data: unknown) => eventsApi.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      navigate(`/app/eventos/${created.slug}`);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (data: unknown) => eventsApi.update(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      if (slug) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(slug) });
      }
      navigate(`/app/eventos/${slug}`);
    },
  });

  useEffect(() => {
    const event = eventQuery.data;
    if (!event) return;
    setForm({
      name: event.name,
      date: event.date.substring(0, 10),
      description: event.description ?? '',
      track: event.track ?? '',
      serviceFee: event.serviceFee,
      foodFee: event.foodFee,
      blockCheckInOnDebt: event.blockCheckInOnDebt,
      transferInfo: event.transferInfo ?? '',
      categories: event.eventCategories.filter((c) => c.active).map((c) => c.category),
    });
  }, [eventQuery.data]);

  const currentEvent = eventQuery.data ?? null;

  const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slug) return;
    setPosterUploading(true);
    try {
      const updated = await eventsApi.uploadPoster(slug, file);
      queryClient.setQueryData(queryKeys.events.detail(slug), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir poster');
    } finally {
      setPosterUploading(false);
      if (posterInputRef.current) posterInputRef.current.value = '';
    }
  };

  const handleDeletePoster = async () => {
    if (!slug || !confirm('¿Eliminar el poster del evento?')) return;
    setPosterUploading(true);
    try {
      const updated = await eventsApi.deletePoster(slug);
      queryClient.setQueryData(queryKeys.events.detail(slug), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    } finally {
      setPosterUploading(false);
    }
  };

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
        track: form.track || undefined,
        serviceFee: parseFloat(form.serviceFee),
        foodFee: parseFloat(form.foodFee),
        blockCheckInOnDebt: form.blockCheckInOnDebt,
        transferInfo: form.transferInfo || undefined,
        categories: form.categories,
      };

      if (isEdit && slug) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
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

      {/* Poster section — only when editing */}
      {isEdit && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-racing-red" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Poster del evento</span>
          </div>

          {currentEvent?.posterUrl ? (
            <div>
              {/* Preview — key forces remount when URL changes, ?t= busts browser cache */}
              <div className="relative overflow-hidden border border-[#38383f]" style={{ aspectRatio: '16/7' }}>
                <img
                  key={currentEvent.posterUrl}
                  src={`${resolveMediaUrl(currentEvent.posterUrl) ?? ''}?t=${Date.now()}`}
                  alt="Poster"
                  className="w-full h-full object-cover"
                />
                {posterUploading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-xs text-white/60 uppercase tracking-widest">Subiendo...</span>
                  </div>
                )}
              </div>
              {/* Action bar — always visible below the image */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  disabled={posterUploading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2a2a35] hover:bg-[#38383f] border border-[#38383f] text-white/70 hover:text-white transition-colors disabled:opacity-40"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Cambiar imagen
                </button>
                <button
                  type="button"
                  onClick={handleDeletePoster}
                  disabled={posterUploading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => posterInputRef.current?.click()}
              disabled={posterUploading}
              className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 hover:border-racing-red/50 bg-transparent hover:bg-racing-red/5 transition-colors py-12 text-white/40 hover:text-white/70 disabled:opacity-40"
            >
              {posterUploading ? (
                <>
                  <div className="h-8 w-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  <span className="text-sm font-medium">Subiendo poster...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">Subir poster del evento</span>
                  <span className="text-xs text-white/30">JPG, PNG o WebP · máx. 10 MB · recomendado 1600×700 px</span>
                </>
              )}
            </button>
          )}

          <input
            ref={posterInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePosterChange}
          />
        </div>
      )}

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
          <label className="block text-sm font-medium text-white/70 mb-1.5">Pista / Circuito</label>
          <input
            type="text"
            value={form.track}
            onChange={(e) => setForm({ ...form, track: e.target.value })}
            placeholder="Karting Club México — Pista Norte"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
          <p className="mt-1 text-xs text-white/40">Se mostrará en los banners debajo de la fecha.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            Datos de transferencia (para auto-inscripción)
          </label>
          <textarea
            value={form.transferInfo}
            onChange={(e) => setForm({ ...form, transferInfo: e.target.value })}
            rows={4}
            placeholder={'Banco: BBVA\nCuenta: 1234567890\nCLABE: 012345678901234567\nTitular: Karting Club México'}
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
