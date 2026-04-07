import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15151e] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-[#e10600] mb-4">
            <span className="text-white font-black text-xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ER</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Recuperar contraseña
          </h1>
        </div>

        {sent ? (
          <div className="border-t-[3px] border-green-500 bg-[#1f1f27] p-6 text-center space-y-3">
            <p className="text-sm text-white/60">
              Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-[#e10600] hover:text-white transition-colors">
              ← Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="border-t-[3px] border-[#e10600] bg-[#1f1f27] p-6 space-y-4">
            {error && (
              <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}
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
                placeholder="admin@edelracing.mx"
                className="w-full border border-white/10 bg-[#15151e] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#e10600] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e10600] hover:bg-[#b30500] py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-xs text-white/30 hover:text-white transition-colors">
                ← Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
