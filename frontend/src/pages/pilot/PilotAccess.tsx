import { useState } from 'react';
import { pilotApi } from '../../api/pilot.api';
import { Mail, Flag } from 'lucide-react';

export function PilotAccess() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await pilotApi.requestAccess(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el enlace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-racing-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-racing-red">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Edel Racing</p>
            <h1 className="text-lg font-black text-white leading-tight">Portal de Piloto</h1>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
            <Mail className="h-8 w-8 text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">¡Enlace enviado!</p>
            <p className="text-sm text-white/50">
              Revisa tu correo <span className="text-white/80">{email}</span> y haz clic en el enlace para acceder.
              Expira en 24 horas.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/60 mb-6">
              Ingresa tu correo registrado y te enviaremos un enlace de acceso instantáneo, sin contraseña.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-racing-red px-4 py-2.5 text-sm font-black text-white uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
