import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { pilotApi } from '../../api/pilot.api';
import { pilotsApi, Pilot } from '../../api/pilots.api';
import { useDebounce } from '../../hooks/useDebounce';
import { useRouteScrollTop } from '../../hooks/useRouteScrollTop';
import { Mail, Flag, Search, UserCheck, UserPlus, ChevronRight, Camera, User } from 'lucide-react';
import { InlineLoadingState } from '../../components/shared/LoadingSkeleton';

type Step = 'search' | 'login' | 'register' | 'sent';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none transition-colors';

export function PilotAccess() {
  useRouteScrollTop();
  const [step, setStep] = useState<Step>('search');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);

  // Login state
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [form, setForm] = useState({ name: '', alias: '', email: '', phone: '' });
  const [registerError, setRegisterError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const pilotSearchQuery = useQuery({
    queryKey: ['pilots', 'search', debouncedSearch],
    queryFn: () => pilotsApi.list({ page: 1, pageSize: 6, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  const registerMutation = useMutation({
    mutationFn: pilotApi.selfRegister,
    onSuccess: async (data) => {
      if (photoFile && data.pilotId) {
        try {
          await pilotApi.uploadRegistrationPhoto(data.pilotId, photoFile);
        } catch {
          // Photo upload failure is non-blocking — registration already succeeded
        }
      }
      setStep('sent');
    },
    onError: (err: Error) => setRegisterError(err.message),
  });

  const pilots = pilotSearchQuery.data?.items ?? [];
  const searching = debouncedSearch.length >= 2 && pilotSearchQuery.isFetching;

  const handleSelectPilot = (pilot: Pilot) => {
    setSelectedPilot(pilot);
    setStep('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await pilotApi.requestAccess(email);
      setStep('sent');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Error al enviar el enlace.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    registerMutation.mutate({
      name: form.name,
      alias: form.alias || undefined,
      email: form.email,
      phone: form.phone || undefined,
    });
  };

  return (
    <div className="racing-carbon-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header — logo arriba, título abajo, centrado */}
        <div className="text-center mb-8">
          <img
            src="/karting_club_logo.png"
            alt="Karting Club México"
            className="h-16 w-auto object-contain mx-auto mb-4 drop-shadow-[0_8px_24px_rgba(225,6,0,0.35)]"
          />
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Pilot <span className="text-[#e10600]">Portal</span>
          </h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-[0.25em] mt-2">Acceso para pilotos</p>
        </div>

        {/* Step: search */}
        {step === 'search' && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,rgba(225,6,0,0.08),transparent_70%)] pointer-events-none" />
            <div className="p-6 space-y-4 relative">
              <p className="text-sm text-white/50">
                Busca tu nombre para acceder o regístrate si eres nuevo.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Busca por tu nombre..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {debouncedSearch.length >= 2 && (
                <div className="space-y-1">
                  {searching && <InlineLoadingState lines={2} />}
                  {!searching && pilots.map((pilot) => (
                    <button
                      key={pilot.id}
                      onClick={() => handleSelectPilot(pilot)}
                      className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 hover:border-[#e10600]/50 transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-white group-hover:text-[#e10600] transition-colors">
                          {pilot.name}
                        </p>
                        {pilot.alias && (
                          <p className="text-xs text-white/40 italic">"{pilot.alias}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/40 group-hover:text-[#e10600] transition-colors">
                        <UserCheck className="h-4 w-4" />
                        Soy yo
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  ))}
                  {!searching && pilots.length === 0 && (
                    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-5 text-center space-y-3">
                      <p className="text-sm text-white/50">
                        No encontramos a <span className="text-white font-bold">"{debouncedSearch}"</span>.
                      </p>
                      <p className="text-xs text-white/30">¿Es tu primera vez aquí?</p>
                      <button
                        onClick={() => { setForm((f) => ({ ...f, name: searchInput })); setStep('register'); }}
                        className="flex items-center gap-1.5 mx-auto rounded-lg bg-[#e10600] hover:bg-[#ff0700] px-4 py-2 text-xs font-bold text-white uppercase tracking-wider transition-all hover:scale-[1.02]"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Registrarme como piloto
                      </button>
                    </div>
                  )}
                </div>
              )}

              {debouncedSearch.length < 2 && (
                <p className="text-xs text-white/20 text-center">Escribe al menos 2 letras para buscar</p>
              )}
            </div>
          </div>
        )}

        {/* Step: login (magic link) */}
        {step === 'login' && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#e10600] to-transparent" />
            <div className="p-6 space-y-4">
              <button onClick={() => setStep('search')} className="text-xs text-white/40 hover:text-white transition-colors">
                ← Volver
              </button>
              {selectedPilot && (
                <div className="rounded-lg border border-[#e10600]/20 bg-[#e10600]/5 px-4 py-3">
                  <p className="text-[10px] text-white/40 mb-0.5 uppercase tracking-widest">Accediendo como</p>
                  <p className="font-black text-white text-lg italic uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{selectedPilot.name}</p>
                  {selectedPilot.alias && <p className="text-xs text-[#e10600]/70 italic">"{selectedPilot.alias}"</p>}
                </div>
              )}
              <p className="text-sm text-white/50">
                Ingresa tu correo y te enviamos un enlace de acceso instantáneo.
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">Correo electrónico</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="tu@correo.com" className={inputClass} />
                </div>
                {loginError && <div className="border-l-4 border-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-400">{loginError}</div>}
                <button type="submit" disabled={loginLoading}
                  className="w-full rounded-lg bg-[#e10600] hover:bg-[#ff0700] py-3 text-xs font-black text-white uppercase tracking-wider transition-all hover:scale-[1.01] disabled:opacity-60 shadow-[0_0_20px_rgba(225,6,0,0.25)]">
                  {loginLoading ? 'Enviando...' : 'Enviar enlace de acceso'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step: register */}
        {step === 'register' && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#e10600] to-transparent" />
            <div className="p-6 space-y-4">
              <button onClick={() => setStep('search')} className="text-xs text-white/40 hover:text-white transition-colors">
                ← Volver
              </button>
              <div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Nuevo <span className="text-[#e10600]">Piloto</span>
                </h2>
                <p className="text-xs text-white/40 mt-0.5">Crea tu perfil en Karting Club México</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                {/* Photo picker */}
                <div className="flex items-center gap-4 py-1">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="relative group flex-shrink-0"
                  >
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center">
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

                {[
                  { key: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre', required: true },
                  { key: 'alias', label: 'Alias / Apodo', type: 'text', placeholder: 'El Chapo, La Cobra...', required: false, optional: true },
                  { key: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com', required: true },
                  { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+52 55 1234 5678', required: false, optional: true },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">
                      {f.label}
                      {f.optional && <span className="text-white/25 normal-case font-normal ml-1">(opcional)</span>}
                      {f.required && <span className="text-[#e10600] ml-1">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required}
                      placeholder={f.placeholder}
                      className={inputClass}
                    />
                  </div>
                ))}
                {registerError && (
                  <div className="border-l-4 border-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {registerError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full rounded-lg bg-[#e10600] hover:bg-[#ff0700] py-3 text-xs font-black text-white uppercase tracking-wider transition-all hover:scale-[1.01] disabled:opacity-60 shadow-[0_0_20px_rgba(225,6,0,0.25)]"
                >
                  {registerMutation.isPending ? 'Registrando...' : 'Registrarme'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step: sent */}
        {step === 'sent' && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center space-y-4 shadow-2xl">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
              <Mail className="h-7 w-7 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white italic uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {registerMutation.isSuccess ? '¡Registro exitoso!' : '¡Enlace enviado!'}
              </p>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">
                {registerMutation.isSuccess
                  ? `Revisa tu correo ${form.email} — te enviamos un enlace para acceder a tu perfil.`
                  : `Revisa tu correo ${email} y haz clic en el enlace para acceder. Expira en 24 horas.`
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
