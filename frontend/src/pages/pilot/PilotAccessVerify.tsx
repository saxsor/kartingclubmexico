import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pilotApi } from '../../api/pilot.api';
import { useAuthStore } from '../../store/auth.store';
import { useRouteScrollTop } from '../../hooks/useRouteScrollTop';

export function PilotAccessVerify() {
  useRouteScrollTop();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Token inválido.'); return; }

    pilotApi.verifyAccess(token)
      .then((data) => {
        login({ id: data.user.id, email: data.user.email, name: data.user.name, role: data.user.role as 'PILOT' });
        navigate('/piloto/perfil', { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'El enlace es inválido o ya expiró.');
      });
  }, [token, login, navigate]);

  if (error) {
    return (
      <div className="racing-carbon-bg min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Enlace inválido</p>
          <p className="text-sm text-white/50 mb-4">{error}</p>
          <a href="/piloto" className="text-sm text-racing-red hover:underline">Solicitar un nuevo enlace</a>
        </div>
      </div>
    );
  }

  return (
    <div className="racing-carbon-bg min-h-screen flex items-center justify-center">
      <p className="text-white/40 text-sm">Verificando acceso...</p>
    </div>
  );
}
