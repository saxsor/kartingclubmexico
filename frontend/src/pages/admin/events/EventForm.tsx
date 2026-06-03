import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import { eventsApi, Category } from '../../../api/events.api';
import { championshipApi } from '../../../api/championship.api';
import { CATEGORY_LABELS, resolveMediaUrl } from '../../../lib/utils';
import { toast } from '../../../store/toast.store';
import { queryKeys } from '../../../lib/react-query';

const ALL_CATEGORIES: Category[] = ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS'];
type DiplomaTextAlign = 'left' | 'center' | 'right';

export function EventForm() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isEdit = slug !== 'nuevo' && slug !== undefined;

  const [form, setForm] = useState({
    name: '',
    date: '',
    description: '',
    track: '',
    address: '',
    schedule: '',
    conditions: 'Llanta libre • Motor libre • Chasis libre • Peso libre',
    serviceFee: '0',
    foodFee: '0',
    blockCheckInOnDebt: false,
    transferInfo: '',
    diplomaNameX: '0.15',
    diplomaNameY: '0.58',
    diplomaNameWidth: '0.70',
    diplomaNameHeight: '0.10',
    diplomaFontSize: '28',
    diplomaTextColor: '#111111',
    diplomaTextAlign: 'center' as DiplomaTextAlign,
    categories: [] as Category[],
    championshipId: '' as string,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [posterUploading, setPosterUploading] = useState(false);
  const [diplomaUploading, setDiplomaUploading] = useState(false);
  const [diplomaPreviewRatio, setDiplomaPreviewRatio] = useState(16 / 9);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const diplomaInputRef = useRef<HTMLInputElement>(null);
  const diplomaCanvasRef = useRef<HTMLDivElement>(null);
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

  const championshipsQuery = useQuery({
    queryKey: queryKeys.championships.list(),
    queryFn: () => championshipApi.list(),
  });

  useEffect(() => {
    const event = eventQuery.data;
    if (!event) return;
    setForm({
      name: event.name,
      date: event.date.substring(0, 10),
      description: event.description ?? '',
      track: event.track ?? '',
      address: event.address ?? '',
      schedule: event.schedule ?? '',
      conditions: event.conditions ?? 'Llanta libre • Motor libre • Chasis libre • Peso libre',
      serviceFee: event.serviceFee,
      foodFee: event.foodFee,
      blockCheckInOnDebt: event.blockCheckInOnDebt,
      transferInfo: event.transferInfo ?? '',
      diplomaNameX: String(event.diplomaNameX ?? 0.15),
      diplomaNameY: String(event.diplomaNameY ?? 0.58),
      diplomaNameWidth: String(event.diplomaNameWidth ?? 0.70),
      diplomaNameHeight: String(event.diplomaNameHeight ?? 0.10),
      diplomaFontSize: String(event.diplomaFontSize ?? 28),
      diplomaTextColor: event.diplomaTextColor ?? '#111111',
      diplomaTextAlign: (event.diplomaTextAlign ?? 'center') as DiplomaTextAlign,
      categories: event.eventCategories.filter((c) => c.active).map((c) => c.category),
      championshipId: event.championshipId ?? '',
    });
  }, [eventQuery.data]);

  const currentEvent = eventQuery.data ?? null;
  const diplomaPreviewUrl = currentEvent?.diplomaTemplateUrl
    ? `${resolveMediaUrl(currentEvent.diplomaTemplateUrl) ?? ''}?t=${currentEvent.updatedAt}`
    : null;

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

  const handleDiplomaTemplateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slug) return;
    setDiplomaUploading(true);
    try {
      const updated = await eventsApi.uploadDiplomaTemplate(slug, file);
      queryClient.setQueryData(queryKeys.events.detail(slug), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      toast.success('Plantilla de diploma actualizada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir plantilla de diploma');
    } finally {
      setDiplomaUploading(false);
      if (diplomaInputRef.current) diplomaInputRef.current.value = '';
    }
  };

  const handleDeleteDiplomaTemplate = async () => {
    if (!slug || !confirm('¿Eliminar la plantilla de diploma?')) return;
    setDiplomaUploading(true);
    try {
      const updated = await eventsApi.deleteDiplomaTemplate(slug);
      queryClient.setQueryData(queryKeys.events.detail(slug), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      toast.success('Plantilla de diploma eliminada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar plantilla de diploma');
    } finally {
      setDiplomaUploading(false);
    }
  };

  const startDraggingDiplomaBox = (
    event: React.PointerEvent<HTMLDivElement>,
    mode: 'move' | 'resize' = 'move'
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const canvas = diplomaCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const initialX = parseFloat(form.diplomaNameX);
    const initialY = parseFloat(form.diplomaNameY);
    const initialW = parseFloat(form.diplomaNameWidth);
    const initialH = parseFloat(form.diplomaNameHeight);
    const startPointerX = (event.clientX - rect.left) / rect.width;
    const startPointerY = (event.clientY - rect.top) / rect.height;

    const onMove = (moveEvent: PointerEvent) => {
      const currentPointerX = (moveEvent.clientX - rect.left) / rect.width;
      const currentPointerY = (moveEvent.clientY - rect.top) / rect.height;
      const deltaX = currentPointerX - startPointerX;
      const deltaY = currentPointerY - startPointerY;

      if (mode === 'move') {
        const nextX = Math.min(1 - initialW, Math.max(0, initialX + deltaX));
        const nextY = Math.min(1 - initialH, Math.max(0, initialY + deltaY));
        setForm((prev) => ({
          ...prev,
          diplomaNameX: nextX.toFixed(3),
          diplomaNameY: nextY.toFixed(3),
        }));
      } else {
        const nextW = Math.min(1 - initialX, Math.max(0.05, initialW + deltaX));
        const nextH = Math.min(1 - initialY, Math.max(0.02, initialH + deltaY));
        setForm((prev) => ({
          ...prev,
          diplomaNameWidth: nextW.toFixed(3),
          diplomaNameHeight: nextH.toFixed(3),
        }));
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
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
        address: form.address || undefined,
        schedule: form.schedule || undefined,
        conditions: form.conditions || undefined,
        serviceFee: parseFloat(form.serviceFee),
        foodFee: parseFloat(form.foodFee),
        blockCheckInOnDebt: form.blockCheckInOnDebt,
        transferInfo: form.transferInfo || undefined,
        diplomaNameX: parseFloat(form.diplomaNameX),
        diplomaNameY: parseFloat(form.diplomaNameY),
        diplomaNameWidth: parseFloat(form.diplomaNameWidth),
        diplomaNameHeight: parseFloat(form.diplomaNameHeight),
        diplomaFontSize: parseInt(form.diplomaFontSize, 10),
        diplomaTextColor: form.diplomaTextColor,
        diplomaTextAlign: form.diplomaTextAlign,
        categories: form.categories,
        championshipId: form.championshipId || null,
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
        <button onClick={() => navigate('/app/eventos')} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
          ← Volver a eventos
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {isEdit ? <>Edit <span className="text-[#e10600]">Event</span></> : <>New <span className="text-[#e10600]">Event</span></>}
        </h1>
        {isEdit && currentEvent && (
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">{currentEvent.name}</p>
        )}
      </div>

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

      {isEdit && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Diploma de participación</span>
          </div>

          {currentEvent?.diplomaTemplateUrl ? (
            <div>
              <div className="relative overflow-hidden border border-[#38383f]" style={{ aspectRatio: '16/9' }}>
                <img
                  key={currentEvent.diplomaTemplateUrl}
                  src={`${resolveMediaUrl(currentEvent.diplomaTemplateUrl) ?? ''}?t=${Date.now()}`}
                  alt="Plantilla de diploma"
                  className="w-full h-full object-cover"
                />
                {diplomaUploading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-xs text-white/60 uppercase tracking-widest">Subiendo...</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => diplomaInputRef.current?.click()}
                  disabled={diplomaUploading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2a2a35] hover:bg-[#38383f] border border-[#38383f] text-white/70 hover:text-white transition-colors disabled:opacity-40"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Cambiar plantilla
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDiplomaTemplate}
                  disabled={diplomaUploading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => diplomaInputRef.current?.click()}
              disabled={diplomaUploading}
              className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-yellow-500/20 hover:border-yellow-500/50 bg-transparent hover:bg-yellow-500/5 transition-colors py-12 text-white/40 hover:text-white/70 disabled:opacity-40"
            >
              {diplomaUploading ? (
                <>
                  <div className="h-8 w-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  <span className="text-sm font-medium">Subiendo plantilla...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">Subir plantilla de diploma</span>
                  <span className="text-xs text-white/30">JPG o PNG · máx. 10 MB · recomendado formato horizontal</span>
                </>
              )}
            </button>
          )}

          <input
            ref={diplomaInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleDiplomaTemplateChange}
          />

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">Ajuste visual del nombre</p>
              <p className="text-xs text-white/45">
                Mueve el nombre en la plantilla y ajusta tamaño y color. La vista previa usa un nombre de ejemplo para ubicarlo.
              </p>
            </div>

            {diplomaPreviewUrl ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-[#38383f] bg-[#111318]">
                <div
                  ref={diplomaCanvasRef}
                  className="relative mx-auto w-full max-w-full overflow-hidden"
                  style={{ aspectRatio: `${diplomaPreviewRatio}`, maxHeight: '70vh' }}
                  onPointerDown={(e) => {
                    // Si pulsa directamente en el canvas (fuera de la caja), movemos el centro de la caja allí
                    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      const y = (e.clientY - rect.top) / rect.height;
                      const w = parseFloat(form.diplomaNameWidth);
                      const h = parseFloat(form.diplomaNameHeight);
                      
                      setForm(prev => ({
                        ...prev,
                        diplomaNameX: Math.min(1 - w, Math.max(0, x - w / 2)).toFixed(3),
                        diplomaNameY: Math.min(1 - h, Math.max(0, y - h / 2)).toFixed(3),
                      }));
                    }
                  }}
                >
                  <img
                    src={diplomaPreviewUrl}
                    alt="Vista previa del diploma"
                    className="h-full w-full object-contain bg-[#0b0d12]"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        setDiplomaPreviewRatio(img.naturalWidth / img.naturalHeight);
                      }
                    }}
                  />
                  <div
                    className="absolute border-2 border-dashed border-yellow-400 flex items-center justify-center cursor-move select-none group z-10"
                    style={{
                      left: `${Number(form.diplomaNameX) * 100}%`,
                      top: `${Number(form.diplomaNameY) * 100}%`,
                      width: `${Number(form.diplomaNameWidth) * 100}%`,
                      height: `${Number(form.diplomaNameHeight) * 100}%`,
                      color: form.diplomaTextColor,
                      fontSize: `${Math.max(10, Number(form.diplomaFontSize) * 0.65)}px`,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      touchAction: 'none',
                      backgroundColor: 'rgba(250, 204, 21, 0.05)',
                    }}
                    onPointerDown={(e) => startDraggingDiplomaBox(e, 'move')}
                  >
                    <span className="w-full px-2 truncate leading-tight uppercase font-bold text-center pointer-events-none" style={{ textAlign: form.diplomaTextAlign }}>
                      Nombre del Piloto
                    </span>
                    
                    {/* Resize Handle - More visible */}
                    <div 
                      className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-400 cursor-se-resize flex items-center justify-center z-20"
                      onPointerDown={(e) => startDraggingDiplomaBox(e, 'resize')}
                    >
                      <div className="w-2 h-2 bg-black rounded-sm transform rotate-45" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-white/10 bg-[#111318] px-4 py-6 text-sm text-white/40">
                Sube primero la plantilla del diploma para ver la posición del nombre sobre el diseño real.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Posición horizontal</label>
                <input
                  type="range"
                  value={form.diplomaNameX}
                  onChange={(e) => setForm({ ...form, diplomaNameX: e.target.value })}
                  min="0"
                  max="1"
                  step="0.001"
                  className="w-full accent-yellow-500"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                  <span>Izquierda</span>
                  <span>{form.diplomaNameX}</span>
                  <span>Derecha</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Posición vertical</label>
                <input
                  type="range"
                  value={form.diplomaNameY}
                  onChange={(e) => setForm({ ...form, diplomaNameY: e.target.value })}
                  min="0"
                  max="1"
                  step="0.001"
                  className="w-full accent-yellow-500"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                  <span>Arriba</span>
                  <span>{form.diplomaNameY}</span>
                  <span>Abajo</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Tamaño de fuente</label>
                <input
                  type="range"
                  value={form.diplomaFontSize}
                  onChange={(e) => setForm({ ...form, diplomaFontSize: e.target.value })}
                  min="16"
                  max="96"
                  step="1"
                  className="w-full accent-yellow-500"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                  <span>Pequeño</span>
                  <span>{form.diplomaFontSize}px</span>
                  <span>Grande</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 border-t border-white/5 pt-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Ancho de caja</label>
                <input
                  type="range"
                  value={form.diplomaNameWidth}
                  onChange={(e) => setForm({ ...form, diplomaNameWidth: e.target.value })}
                  min="0.05"
                  max="1"
                  step="0.001"
                  className="w-full accent-yellow-500"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                  <span>Estrecho</span>
                  <span>{Math.round(Number(form.diplomaNameWidth) * 100)}%</span>
                  <span>Ancho</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Alto de caja</label>
                <input
                  type="range"
                  value={form.diplomaNameHeight}
                  onChange={(e) => setForm({ ...form, diplomaNameHeight: e.target.value })}
                  min="0.01"
                  max="0.5"
                  step="0.001"
                  className="w-full accent-yellow-500"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                  <span>Bajo</span>
                  <span>{Math.round(Number(form.diplomaNameHeight) * 100)}%</span>
                  <span>Alto</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Alineación y Color</label>
                <div className="flex items-center gap-3">
                  <select
                    value={form.diplomaTextAlign}
                    onChange={(e) => setForm({ ...form, diplomaTextAlign: e.target.value as DiplomaTextAlign })}
                    className="flex-1 rounded-lg border border-white/10 bg-[#111318] px-3 py-2 text-sm text-white focus:border-yellow-500 outline-none"
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111318] px-3 py-2">
                    <input
                      type="color"
                      value={form.diplomaTextColor}
                      onChange={(e) => setForm({ ...form, diplomaTextColor: e.target.value })}
                      className="h-6 w-8 cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Nombre del evento *</label>
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
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Fecha *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Pista / Circuito</label>
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
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Dirección / Ubicación</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Av. Circuito 123, Col. Karting, Guadalajara, Jalisco"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
          <p className="mt-1 text-xs text-white/40">Se mostrará con mapa interactivo en la página del evento.</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Horarios del día</label>
          <textarea
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            rows={5}
            placeholder={'8:00 — Apertura de puertas\n9:00 — Registro y pesaje\n10:00 — Calentamiento libre\n11:00 — Inicio de carreras\n16:00 — Premiación'}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none resize-none font-mono"
          />
          <p className="mt-1 text-xs text-white/40">Una línea por hora. Formato: 9:00 — Descripción</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Condiciones del evento</label>
          <input
            type="text"
            value={form.conditions}
            onChange={(e) => setForm({ ...form, conditions: e.target.value })}
            placeholder="Llanta libre • Motor libre • Chasis libre • Peso libre"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
          />
          <p className="mt-1 text-xs text-white/40">Separa con • para mostrar como etiquetas individuales.</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">
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
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Cuota de servicio ($)</label>
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
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Cuota de comida ($)</label>
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

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Campeonato</label>
          <select
            value={form.championshipId}
            onChange={(e) => setForm({ ...form, championshipId: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#1f1f27] px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
          >
            <option value="">— Sin campeonato —</option>
            {(championshipsQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/40">El evento contará para la clasificación de este campeonato.</p>
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
            className="flex-1 rounded-lg bg-[#e10600] hover:bg-[#ff0700] py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.01] disabled:opacity-60 shadow-[0_0_20px_rgba(225,6,0,0.2)]"
          >
            {loading ? 'Guardando...' : (isEdit ? 'Actualizar evento' : 'Crear evento')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/eventos')}
            className="rounded-lg border border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white/50 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
