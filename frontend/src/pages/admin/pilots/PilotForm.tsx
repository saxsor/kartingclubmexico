import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pilotsApi, Pilot } from '../../../api/pilots.api';

export function PilotForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id !== 'nuevo' && id !== undefined;

  const [form, setForm] = useState({
    name: '', alias: '', kartNumber: '', phone: '', email: '', active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      pilotsApi.get(id).then((p) => {
        setForm({
          name: p.name,
          alias: p.alias ?? '',
          kartNumber: p.kartNumber?.toString() ?? '',
          phone: p.phone ?? '',
          email: p.email ?? '',
          active: p.active,
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = {
        name: form.name,
        alias: form.alias || undefined,
        kartNumber: form.kartNumber ? parseInt(form.kartNumber) : undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        active: form.active,
      };
      if (isEdit && id) {
        await pilotsApi.update(id, data);
      } else {
        await pilotsApi.create(data);
      }
      navigate('/app/pilotos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <button onClick={() => navigate('/app/pilotos')} className="text-sm text-white/50 hover:text-white">
          ← Volver a pilotos
        </button>
      </div>

      <h1 className="text-2xl font-black text-white mb-6">
        {isEdit ? 'Editar piloto' : 'Nuevo piloto'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {[
          { key: 'name', label: 'Nombre *', type: 'text', required: true, placeholder: 'Nombre completo' },
          { key: 'alias', label: 'Alias', type: 'text', required: false, placeholder: 'Apodo o nick' },
          { key: 'kartNumber', label: 'Número de kart', type: 'number', required: false, placeholder: '1-999' },
          { key: 'phone', label: 'Teléfono', type: 'tel', required: false, placeholder: '+52 55 xxxx xxxx' },
          { key: 'email', label: 'Email', type: 'email', required: false, placeholder: 'piloto@ejemplo.com' },
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-white/70 mb-1.5">{field.label}</label>
            <input
              type={field.type}
              value={form[field.key as keyof typeof form].toString()}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
            />
          </div>
        ))}

        {isEdit && (
          <div className="flex items-center gap-3">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/10 accent-racing-red"
            />
            <label htmlFor="active" className="text-sm text-white/70">Piloto activo</label>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-racing-red py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear piloto')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/pilotos')}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
