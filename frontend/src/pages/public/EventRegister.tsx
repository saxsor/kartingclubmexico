import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Upload, ArrowLeft, Search, UserCheck, UserPlus, X, Camera, User } from 'lucide-react';
import { pilotApi } from '../../api/pilot.api';
import { eventsApi, Category } from '../../api/events.api';
import { inscriptionsApi, SelfRegisterResponse } from '../../api/inscriptions.api';
import { pilotsApi, Pilot } from '../../api/pilots.api';
import { CATEGORY_LABELS, formatCurrency } from '../../lib/utils';
import { queryKeys } from '../../lib/react-query';
import { useFileUpload } from '../../hooks/useFileUpload';
import { UploadProgress } from '../../components/shared/UploadProgress';
import { TeamAutocomplete } from '../../components/shared/TeamAutocomplete';
import { useDebounce } from '../../hooks/useDebounce';
import { HeroLoadingState, InlineLoadingState } from '../../components/shared/LoadingSkeleton';

const ALL_CATEGORIES: Category[] = [
  'SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS',
];

type Step = 'search' | 'form' | 'payment' | 'done';

const STEP_LABELS: Record<Step, string> = {
  search: 'Identificación',
  form: 'Tus datos',
  payment: 'Pago',
  done: 'Confirmación',
};
const STEPS: Step[] = ['search', 'form', 'payment', 'done'];

const inputClass = 'w-full border border-white/10 bg-[#1f1f27] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none';
const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

export function EventRegister() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>('search');
  const [registerResult, setRegisterResult] = useState<SelfRegisterResponse | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [error, setError] = useState('');

  // Pilot search state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);

  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });

  const pilotSearchQuery = useQuery({
    queryKey: ['pilots', 'search', debouncedSearch],
    queryFn: () => pilotsApi.list({ page: 1, pageSize: 8, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  const selfRegisterMutation = useMutation({
    mutationFn: (payload: {
      pilotId?: string;
      name?: string;
      alias?: string;
      email?: string;
      phone?: string;
      kartNumber?: string;
      category: Category;
      notes?: string;
      companions?: number;
    }) => inscriptionsApi.selfRegister(slug!, payload),
  });
  const receiptUpload = useFileUpload();

  const [form, setForm] = useState({
    name: '', alias: '', email: '', phone: '', kartNumber: '',
    category: '' as Category | '', notes: '', companions: 0,
  });
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const event = eventQuery.data ?? null;
  const loadingEvent = eventQuery.isLoading;
  const submitting = selfRegisterMutation.isPending;
  const activeCategories = event?.eventCategories.filter((c) => c.active).map((c) => c.category) ?? [];
  const pilotResults = (pilotSearchQuery.data?.items ?? []).filter((p) => p.active);

  const handleSelectPilot = (pilot: Pilot) => {
    setSelectedPilot(pilot);
    setStep('form');
    const p = pilot as typeof pilot & { team?: { id: string; name: string } | null };
    setForm((f) => ({ ...f, name: pilot.name, alias: pilot.alias ?? '', kartNumber: pilot.kartNumber?.toString() ?? '' }));
    if (p.team) { setTeamName(p.team.name); setTeamId(p.team.id); }
  };

  const handleNewPilot = () => {
    setSelectedPilot(null);
    setStep('form');
    setForm({ name: '', alias: '', email: '', phone: '', kartNumber: '', category: '' as Category | '', notes: '', companions: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form.category) return;
    setError('');
    try {
      const teamPayload = teamName.trim() ? { teamName: teamName.trim() } : {};
      const payload = selectedPilot
        ? {
            pilotId: selectedPilot.id,
            kartNumber: form.kartNumber || undefined,
            category: form.category as Category,
            notes: form.notes || undefined,
            companions: form.companions,
            ...teamPayload,
          }
        : {
            name: form.name,
            alias: form.alias || undefined,
            email: form.email || undefined,
            phone: form.phone || undefined,
            kartNumber: form.kartNumber || undefined,
            category: form.category as Category,
            notes: form.notes || undefined,
            companions: form.companions,
            ...teamPayload,
          };
      const result = await selfRegisterMutation.mutateAsync(payload);
      // Upload photo (non-blocking) — works for both new and existing pilots
      if (photoFile && result.inscription.pilotId) {
        pilotApi.uploadRegistrationPhoto(result.inscription.pilotId, photoFile).catch(() => {});
      }
      setRegisterResult(result);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    }
  };

  const handleUploadReceipt = async () => {
    if (!slug || !registerResult || !receiptFile) return;
    setError('');
    try {
      await receiptUpload.upload({
        url: `/api/events/${slug}/inscriptions/${registerResult.inscription.id}/receipt`,
        field: 'receipt',
        file: receiptFile,
      });
      setReceiptUploaded(true);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir comprobante');
    }
  };

  if (loadingEvent) return (
    <HeroLoadingState sections={2} />
  );

  if (!event) return (
    <div className="text-center py-20 text-white/30 text-sm uppercase tracking-widest">Evento no encontrado</div>
  );

  if (event.status !== 'OPEN') {
    return (
      <div className="max-w-lg mx-auto">
        <Link to={`/eventos/${slug}`} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al evento
        </Link>
        <div className="border-t-[3px] border-[#e10600] bg-[#1f1f27] p-8 text-center">
          <p className="text-white/50 text-sm uppercase tracking-wide">Este evento no está abierto para inscripciones.</p>
        </div>
      </div>
    );
  }

  const currentStepIdx = STEPS.indexOf(step);
  const submitDisabledReason = !form.category
    ? 'Selecciona una categoría para continuar.'
    : !selectedPilot && !form.name.trim()
      ? 'Escribe tu nombre completo para continuar.'
      : '';
  const submitDisabled = submitting || Boolean(submitDisabledReason);

  return (
    <div className="max-w-lg mx-auto">
      <Link to={`/eventos/${slug}`} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> {event.name}
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-5 bg-[#e10600]" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">{event.name}</span>
        </div>
        <h1
          className="text-3xl font-black text-white uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Inscripción
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 flex items-center justify-center text-xs font-black ${
                step === s ? 'bg-[#e10600] text-white' :
                i < currentStepIdx ? 'bg-green-500 text-white' :
                'bg-[#2a2a35] text-white/30'
              }`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {i < currentStepIdx ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block ${
                step === s ? 'text-white' : i < currentStepIdx ? 'text-green-500' : 'text-white/30'
              }`}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 mx-3 ${i < currentStepIdx ? 'bg-green-500' : 'bg-[#38383f]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="space-y-4">
          <p className="text-sm text-white/50">
            ¿Ya has corrido con nosotros antes? Búscate para inscribirte más rápido.
          </p>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Escribe tu nombre..."
              autoFocus
              className={`${inputClass} pl-10`}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label="Limpiar búsqueda de piloto"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          {debouncedSearch.length >= 2 && (
            <div className="border border-white/10 divide-y divide-white/5">
              {pilotSearchQuery.isLoading && (
                <InlineLoadingState lines={2} className="m-2" />
              )}
              {!pilotSearchQuery.isLoading && pilotResults.length === 0 && (
                <div className="px-4 py-3 text-sm text-white/30">
                  No encontramos a nadie con ese nombre.
                </div>
              )}
              {pilotResults.map((pilot) => (
                <button
                  key={pilot.id}
                  onClick={() => handleSelectPilot(pilot)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{pilot.name}</p>
                    {pilot.alias && <p className="text-xs text-white/40">"{pilot.alias}"</p>}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#e10600] flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> Soy yo
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-widest">o</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* New pilot */}
          <button
            onClick={handleNewPilot}
            className="w-full flex items-center justify-center gap-2 border border-white/10 py-3 text-sm font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Soy nuevo, registrarme
          </button>
        </div>
      )}

      {/* Step 2: Form */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected pilot banner + photo */}
          {selectedPilot && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border border-green-500/30 bg-green-500/10 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-green-400">{selectedPilot.name}</p>
                  {selectedPilot.alias && <p className="text-xs text-green-400/60">"{selectedPilot.alias}"</p>}
                </div>
                <button type="button" onClick={() => { setSelectedPilot(null); setStep('search'); }}
                  className="text-green-400/50 hover:text-green-400 transition-colors text-xs uppercase tracking-wide">
                  Cambiar
                </button>
              </div>
              {/* Photo picker for existing pilot */}
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="relative group flex-shrink-0">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/10 bg-[#1f1f27] flex items-center justify-center">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                      : (selectedPilot as any).photoUrl
                        ? <img src={(selectedPilot as any).photoUrl} alt={selectedPilot.name} className="h-full w-full object-cover" />
                        : <User className="h-7 w-7 text-white/20" />
                    }
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
                <div>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Foto de perfil</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {photoFile ? 'Nueva foto seleccionada' : 'Opcional — toca para cambiar'}
                  </p>
                  {photoFile && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-[10px] text-red-400/60 hover:text-red-400 mt-1 transition-colors">
                      Quitar foto
                    </button>
                  )}
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoFile(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Personal data — only for new pilots */}
          {!selectedPilot && (
            <>
              {/* Photo picker */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="relative group flex-shrink-0"
                >
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/10 bg-[#1f1f27] flex items-center justify-center">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                      : <User className="h-7 w-7 text-white/20" />
                    }
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
                <div>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Foto de perfil</p>
                  <p className="text-xs text-white/30 mt-0.5">Opcional — puedes agregarla después</p>
                  {photoFile && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-[10px] text-red-400/60 hover:text-red-400 mt-1 transition-colors">
                      Quitar foto
                    </button>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoFile(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </div>

              <div>
                <label className={labelClass}>Nombre completo *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required placeholder="Juan Pérez" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Alias / Apodo</label>
                <input type="text" value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  placeholder="El Rayo" className={inputClass} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Correo electrónico</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="juan@ejemplo.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="5512345678" className={inputClass} />
                </div>
              </div>
            </>
          )}

          {/* Race fields — always shown */}
          <div>
            <label className={labelClass}>Número de kart (opcional)</label>
            <input type="number" value={form.kartNumber} onChange={(e) => setForm({ ...form, kartNumber: e.target.value })}
              placeholder="42" min="1" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Equipo (opcional)</label>
            <TeamAutocomplete
              value={teamName}
              teamId={teamId}
              onChange={(name, id) => { setTeamName(name); setTeamId(id); }}
              placeholder="Busca o escribe el nombre de tu equipo"
              label=""
            />
          </div>

          <div>
            <label className={labelClass}>Categoría *</label>
            <div className="grid grid-cols-2 gap-px bg-[#38383f]">
              {ALL_CATEGORIES.filter((c) => activeCategories.includes(c)).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    form.category === cat
                      ? 'bg-[#e10600] text-white'
                      : 'bg-[#1f1f27] text-white/50 hover:text-white hover:bg-[#2a2a35]'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            {activeCategories.length === 0 && (
              <p className="text-xs text-white/40 mt-2 uppercase tracking-wide">No hay categorías disponibles.</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Comensales (incluye al piloto si come)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, companions: Math.max(0, form.companions - 1) })}
                className="h-10 w-10 flex items-center justify-center border border-white/10 bg-[#1f1f27] text-white/60 hover:bg-[#2a2a35] hover:text-white transition-colors text-lg font-bold"
              >−</button>
              <span className="w-8 text-center text-white font-bold text-lg">{form.companions}</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, companions: Math.min(10, form.companions + 1) })}
                className="h-10 w-10 flex items-center justify-center border border-white/10 bg-[#1f1f27] text-white/60 hover:bg-[#2a2a35] hover:text-white transition-colors text-lg font-bold"
              >+</button>
            </div>
            {Number(event?.foodFee ?? 0) > 0 && (
              <p className="mt-1.5 text-xs text-white/40 uppercase tracking-wide">
                La comida se cobra por persona — {form.companions} comensal{form.companions !== 1 ? 'es' : ''} seleccionado{form.companions !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Cualquier información adicional..."
              className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('search')}
              className="border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              ← Atrás
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex-1 bg-[#e10600] hover:bg-[#b30500] py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Inscribirme'}
            </button>
          </div>
          {submitDisabledReason && (
            <p className="text-xs text-white/35 uppercase tracking-wide">{submitDisabledReason}</p>
          )}
        </form>
      )}

      {/* Step 3: Payment */}
      {step === 'payment' && registerResult && (
        <div className="space-y-4">
          <div className="border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Inscripción registrada. Realiza el pago y sube tu comprobante.
          </div>

          <div className="border-t-[3px] border-[#e10600] bg-[#1f1f27] p-5 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-4 bg-[#e10600]" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">Monto a pagar</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Cuota de servicio</span>
              <span className="font-bold text-white">{formatCurrency(Number(registerResult.serviceFee))}</span>
            </div>
            {Number(registerResult.foodFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">
                  Comida ({registerResult.companions} persona{registerResult.companions !== 1 ? 's' : ''})
                </span>
                <span className="font-bold text-white">
                  {formatCurrency(Number(registerResult.foodFee) * registerResult.companions)}
                </span>
              </div>
            )}
            <div className="border-t border-[#38383f] pt-3 flex justify-between">
              <span className="text-sm font-bold text-white uppercase tracking-wide">Total</span>
              <span className="text-xl font-black text-[#e10600]"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {formatCurrency(Number(registerResult.serviceFee) + Number(registerResult.foodFee) * registerResult.companions)}
              </span>
            </div>
          </div>

          {registerResult.transferInfo ? (
            <div className="border border-[#38383f] bg-[#1f1f27] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-4 bg-[#e10600]" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">Datos de transferencia</span>
              </div>
              <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
                {registerResult.transferInfo}
              </pre>
            </div>
          ) : (
            <div className="border border-[#38383f] bg-[#1f1f27] p-5 text-sm text-white/40 uppercase tracking-wide">
              El organizador te proporcionará los datos de pago.
            </div>
          )}

          <div className="border border-[#38383f] bg-[#1f1f27] p-5 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-4 bg-[#e10600]" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">Comprobante de pago</span>
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wide">JPG, PNG, PDF, WebP · máx. 10 MB</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="flex-1 border border-dashed border-white/20 px-4 py-3 text-sm text-white/40 hover:border-[#e10600]/50 hover:text-white/60 transition-colors truncate">
                {receiptFile ? receiptFile.name : 'Seleccionar archivo...'}
              </div>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              <div className="border border-white/10 bg-[#2a2a35] hover:bg-[#38383f] px-3 py-3 transition-colors">
                <Upload className="h-4 w-4 text-white/60" />
              </div>
            </label>

            <UploadProgress
              progress={receiptUpload.progress}
              uploading={receiptUpload.uploading}
              error={receiptUpload.error}
              label="Subiendo comprobante..."
            />

            {error && (
              <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <button
              onClick={handleUploadReceipt}
              disabled={!receiptFile || receiptUpload.uploading}
              className="w-full bg-[#e10600] hover:bg-[#b30500] py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50"
            >
              {receiptUpload.uploading ? `Subiendo ${receiptUpload.progress}%...` : 'Enviar comprobante'}
            </button>

            <button
              onClick={() => setStep('done')}
              className="w-full border border-[#38383f] py-3 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-[#1f1f27] transition-colors"
            >
              Terminar y enviar comprobante después
            </button>
            <p className="text-center text-[11px] text-white/35 uppercase tracking-wide">
              Tu lugar queda pendiente hasta que el pago sea confirmado.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="border-t-[3px] border-green-500 bg-[#1f1f27] p-8 text-center space-y-4">
          <CheckCircle className="h-14 w-14 text-green-400 mx-auto" />
          <h2
            className="text-2xl font-black text-white uppercase"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            {receiptUploaded ? '¡Comprobante enviado!' : '¡Inscripción registrada!'}
          </h2>
          <p className="text-sm text-white/50 max-w-xs mx-auto">
            {receiptUploaded
              ? 'Tu comprobante fue enviado. El organizador lo revisará y confirmará tu pago.'
              : 'Tu inscripción fue registrada. Recuerda realizar el pago y enviar tu comprobante para confirmar tu lugar.'}
          </p>
          {registerResult && !receiptUploaded && (
            <button
              onClick={() => setStep('payment')}
              className="bg-[#e10600] hover:bg-[#b30500] px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition-colors"
            >
              Subir comprobante
            </button>
          )}
          <div>
            <Link to={`/eventos/${slug}`}
              className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              ← Volver al evento
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
