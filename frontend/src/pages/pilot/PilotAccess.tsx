import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { pilotApi } from '../../api/pilot.api';
import { pilotsApi, Pilot } from '../../api/pilots.api';
import { useDebounce } from '../../hooks/useDebounce';
import { useRouteScrollTop } from '../../hooks/useRouteScrollTop';
import { Mail, Flag, Search, UserCheck, UserPlus, ChevronRight } from 'lucide-react';
import { InlineLoadingState } from '../../components/shared/LoadingSkeleton';

type Step = 'search' | 'login' | 'register' | 'sent';

const inputClass =
  'w-full border border-[#38383f] bg-[#15151e] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none transition-colors';

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

  const pilotSearchQuery = useQuery({
    queryKey: ['pilots', 'search', debouncedSearch],
    queryFn: () => pilotsApi.list({ page: 1, pageSize: 6, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  const registerMutation = useMutation({
    mutationFn: pilotApi.selfRegister,
    onSuccess: () => setStep('sent'),
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center bg-[#e10600]">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Karting Club México</p>
            <h1 className="text-lg font-black text-white uppercase leading-tight tracking-tight">Portal de Piloto</h1>
          </div>
        </div>

        {/* Step: search */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="border border-[#38383f] bg-[#1f1f27] p-6 space-y-4">
              <p className="text-sm text-white/60">
                Busca tu nombre para acceder a tu perfil o regístrate si eres nuevo.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Busca por tu nombre..."
                  className="w-full border border-[#38383f] bg-[#15151e] pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#e10600] focus:outline-none transition-colors"
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
                      className="w-full flex items-center justify-between border border-[#38383f] bg-[#15151e] px-4 py-3 hover:bg-[#2a2a35] hover:border-[#e10600]/40 transition-colors group"
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
                    <div className="border border-[#38383f] bg-[#15151e] px-4 py-5 text-center space-y-3">
                      <p className="text-sm text-white/50">
                        No encontramos a <span className="text-white font-bold">"{debouncedSearch}"</span> en la plataforma.
                      </p>
                      <p className="text-xs text-white/30">¿Es tu primera vez en Karting Club México?</p>
                      <button
                        onClick={() => {
                          setForm((f) => ({ ...f, name: searchInput }));
                          setStep('register');
                        }}
                        className="flex items-center gap-1.5 mx-auto bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold text-white uppercase tracking-wider transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Registrarme como piloto
                      </button>
                    </div>
                  )}
                </div>
              )}

              {debouncedSearch.length < 2 && (
                <p className="text-xs text-white/25 text-center">Escribe al menos 2 letras para buscar</p>
              )}
            </div>
          </div>
        )}

        {/* Step: login (magic link) */}
        {step === 'login' && (
          <div className="border border-[#38383f] bg-[#1f1f27] p-6 space-y-4">
            <button
              onClick={() => setStep('search')}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              ← Volver
            </button>
            {selectedPilot && (
              <div className="border-l-4 border-[#e10600] bg-[#15151e] px-4 py-3">
                <p className="text-xs text-white/40 mb-0.5 uppercase tracking-wider">Accediendo como</p>
                <p className="font-black text-white uppercase tracking-tight">{selectedPilot.name}</p>
                {selectedPilot.alias && (
                  <p className="text-xs text-white/40 italic">"{selectedPilot.alias}"</p>
                )}
              </div>
            )}
            <p className="text-sm text-white/60">
              Ingresa tu correo registrado y te enviaremos un enlace de acceso instantáneo.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="tu@correo.com"
                  className={inputClass}
                />
              </div>
              {loginError && (
                <div className="border-l-4 border-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#e10600] hover:bg-[#b30500] px-4 py-2.5 text-xs font-black text-white uppercase tracking-wider transition-colors disabled:opacity-60"
              >
                {loginLoading ? 'Enviando...' : 'Enviar enlace de acceso'}
              </button>
            </form>
          </div>
        )}

        {/* Step: register */}
        {step === 'register' && (
          <div className="border border-[#38383f] bg-[#1f1f27] p-6 space-y-4">
            <button
              onClick={() => setStep('search')}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              ← Volver
            </button>
            <div>
              <h2 className="font-black text-white uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Nuevo piloto
              </h2>
              <p className="text-xs text-white/40 mt-0.5">Crea tu perfil de piloto en Karting Club México</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-3">
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
                className="w-full bg-[#e10600] hover:bg-[#b30500] px-4 py-2.5 text-xs font-black text-white uppercase tracking-wider transition-colors disabled:opacity-60"
              >
                {registerMutation.isPending ? 'Registrando...' : 'Registrarme'}
              </button>
            </form>
          </div>
        )}

        {/* Step: sent */}
        {step === 'sent' && (
          <div className="border border-green-500/30 bg-green-500/10 p-6 text-center space-y-3">
            <Mail className="h-10 w-10 text-green-400 mx-auto" />
            <div>
              <p className="text-white font-black uppercase tracking-tight">
                {registerMutation.isSuccess ? '¡Registro exitoso!' : '¡Enlace enviado!'}
              </p>
              <p className="text-sm text-white/50 mt-1">
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
