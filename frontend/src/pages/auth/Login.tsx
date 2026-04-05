import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Trophy, Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-screen racing-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-racing-red flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Karting Club México</h1>
          <p className="text-white/50 text-sm mt-1">Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none focus:ring-1 focus:ring-racing-red"
              placeholder="admin@kartingclubmexico.mx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none focus:ring-1 focus:ring-racing-red"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-racing-red py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-4">
          Solo acceso para organizadores autorizados
        </p>
      </div>
    </div>
  );
}
