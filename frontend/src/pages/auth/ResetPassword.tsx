import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setValidToken(false); return; }
    api.get<{ valid: boolean }>(`/auth/reset-password/${token}/validate`)
      .then((res) => setValidToken(res.valid))
      .catch(() => setValidToken(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login?reset=ok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (validToken === null) {
    return (
      <div className="min-h-screen bg-[#15151e] flex items-center justify-center">
        <p className="text-white/40 text-sm uppercase tracking-widest">Verificando enlace...</p>
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen bg-[#15151e] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-white text-lg font-bold">El enlace es inválido o ya expiró.</p>
          <Link to="/recuperar-contrasena" className="text-sm text-[#f5c400] hover:underline">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15151e] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-[#f5c400] mb-4">
            <span className="text-white font-black text-xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ER</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Nueva contraseña
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="border-t-[3px] border-[#f5c400] bg-[#1f1f27] p-6 space-y-4">
          {error && (
            <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              placeholder="Mínimo 8 caracteres"
              className="w-full border border-white/10 bg-[#15151e] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#f5c400] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repite la contraseña"
              className="w-full border border-white/10 bg-[#15151e] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#f5c400] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f5c400] hover:bg-[#d99a00] py-3 text-sm font-bold uppercase tracking-widest text-[#111111] transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
