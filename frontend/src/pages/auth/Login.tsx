import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15151e] flex items-center justify-center px-4">
      {/* Subtle racing stripe background */}
      <div className="absolute inset-0 racing-stripe opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-16 w-auto object-contain drop-shadow-[0_10px_24px_rgba(225,6,0,0.3)]"
            />
          </div>
          <h1
            className="text-3xl font-black text-white uppercase tracking-tight leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            KARTING CLUB
          </h1>
          <h2
            className="text-xl font-black uppercase tracking-widest mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: '#e10600' }}
          >
            MÉXICO
          </h2>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-2">Panel de Administración</p>
        </div>

        {/* Form card */}
        <div className="border-t-[3px] border-[#e10600] bg-[#1f1f27] p-6 space-y-4">
          {error && (
            <div className="border-l-4 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[#38383f] bg-[#15151e] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#e10600] focus:outline-none focus:ring-1 focus:ring-[#e10600] transition-colors"
              placeholder="admin@kartingclubmexico.mx"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#38383f] bg-[#15151e] px-3 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:border-[#e10600] focus:outline-none focus:ring-1 focus:ring-[#e10600] transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-[#e10600] hover:bg-[#b30500] py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <Link to="/recuperar-contrasena" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <p className="text-center text-xs text-white/20 mt-2 uppercase tracking-widest">
          Solo acceso para organizadores autorizados
        </p>
      </div>
    </div>
  );
}
