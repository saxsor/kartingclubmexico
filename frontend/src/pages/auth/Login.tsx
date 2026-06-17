import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const { isAuthenticated, user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={user?.role === 'VALIDATOR' ? '/app/eventos' : '/app/dashboard'} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await signIn(email, password);
      navigate(loggedUser.role === 'VALIDATOR' ? '/app/eventos' : '/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="racing-carbon-bg min-h-screen flex items-center justify-center px-4">

      <div className="relative w-full max-w-sm">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block opacity-90 hover:opacity-100 transition-opacity">
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-20 w-auto object-contain mx-auto drop-shadow-[0_8px_24px_rgba(245,196,0,0.4)]"
            />
          </a>
          <h1
            className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mt-5"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Admin <span className="text-[#f5c400]">Panel</span>
          </h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-[0.25em] mt-2">
            Acceso para organizadores
          </p>
        </div>

        {/* Form card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl">
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#f5c400] to-transparent" />
          {/* Corner glow */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,rgba(245,196,0,0.08),transparent_70%)] pointer-events-none" />

          <form onSubmit={handleSubmit} className="relative p-7 space-y-5">
            {error && (
              <div className="border-l-4 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-400 rounded-r-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@kartingclubmexico.mx"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-[#f5c400] focus:outline-none focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-white/20 focus:border-[#f5c400] focus:outline-none focus:bg-white/[0.07] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#f5c400] hover:bg-[#ffd84d] py-3.5 text-xs font-black uppercase tracking-widest text-[#111111] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_24px_rgba(245,196,0,0.25)]"
            >
              {loading ? 'Ingresando...' : 'Ingresar al panel'}
            </button>

            <div className="text-center pt-1">
              <Link
                to="/recuperar-contrasena"
                className="text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
