import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Trash2, User } from 'lucide-react';
import { pilotsApi } from '../../../api/pilots.api';
import { teamsApi } from '../../../api/teams.api';
import { TeamAutocomplete } from '../../../components/shared/TeamAutocomplete';
import { toast } from '../../../store/toast.store';
import { queryKeys } from '../../../lib/react-query';
import { resolveMediaUrl } from '../../../lib/utils';

export function PilotForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id !== 'nuevo' && id !== undefined;

  const [form, setForm] = useState({
    name: '', alias: '', kartNumber: '', phone: '', email: '', engine: '', active: true,
  });
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const pilotQuery = useQuery({
    queryKey: isEdit && id ? queryKeys.pilots.detail(id) : ['pilots', 'detail', 'new'],
    queryFn: () => pilotsApi.get(id!),
    enabled: isEdit && !!id,
  });
  const pilotData = pilotQuery.data;
  const createMutation = useMutation({
    mutationFn: (data: Partial<Record<string, unknown>>) => pilotsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
      navigate('/app/pilotos');
    },
  });
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Record<string, unknown>>) => pilotsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.pilots.detail(id) });
      }
      navigate('/app/pilotos');
    },
  });

  useEffect(() => {
    const pilot = pilotData as (typeof pilotData & { team?: { id: string; name: string } | null });
    if (!pilot) return;
    setForm({
      name: pilot.name,
      alias: pilot.alias ?? '',
      kartNumber: pilot.kartNumber?.toString() ?? '',
      phone: pilot.phone ?? '',
      email: pilot.email ?? '',
      engine: pilot.engine ?? '',
      active: pilot.active,
    });
    if (pilot.team) {
      setTeamName(pilot.team.name);
      setTeamId(pilot.team.id);
    }
  }, [pilotData]);

  const currentPilot = pilotData ?? null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setPhotoUploading(true);
    try {
      const updated = await pilotsApi.uploadPhoto(id, file);
      queryClient.setQueryData(queryKeys.pilots.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
      toast.success('Foto actualizada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    if (!id || !confirm('¿Eliminar la foto del piloto?')) return;
    setPhotoUploading(true);
    try {
      const updated = await pilotsApi.deletePhoto(id);
      queryClient.setQueryData(queryKeys.pilots.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Resolve team: if name typed but no id selected, find or create
      let resolvedTeamId: string | null | undefined = teamId;
      if (teamName.trim() && !teamId) {
        try {
          const team = await teamsApi.create(teamName.trim());
          resolvedTeamId = team.id;
        } catch (err: unknown) {
          // 409 = already exists, use returned team
          const e = err as { status?: number; data?: { team?: { id: string } } };
          if (e?.status === 409 && e?.data?.team?.id) {
            resolvedTeamId = e.data.team.id;
          } else {
            throw err;
          }
        }
      } else if (!teamName.trim()) {
        resolvedTeamId = null;
      }

      const data = {
        name: form.name,
        alias: form.alias || undefined,
        kartNumber: form.kartNumber ? parseInt(form.kartNumber) : undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        engine: form.engine || undefined,
        active: form.active,
        teamId: resolvedTeamId,
      };
      if (isEdit && id) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
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

      {/* Photo section — only when editing */}
      {isEdit && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-racing-red" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Foto de perfil</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Avatar preview */}
            <div className="relative flex-shrink-0">
              {currentPilot?.photoUrl ? (
                <img
                  key={currentPilot.photoUrl}
                  src={`${resolveMediaUrl(currentPilot.photoUrl) ?? ''}?t=${Date.now()}`}
                  alt="Foto"
                  className="h-20 w-20 object-cover border border-[#38383f]"
                />
              ) : (
                <div className="h-20 w-20 bg-[#2a2a35] border border-[#38383f] flex items-center justify-center">
                  <User className="h-8 w-8 text-white/20" />
                </div>
              )}
              {photoUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2a2a35] hover:bg-[#38383f] border border-[#38383f] text-white/70 hover:text-white transition-colors disabled:opacity-40"
              >
                <Camera className="h-3.5 w-3.5" />
                {currentPilot?.photoUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {currentPilot?.photoUrl && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={photoUploading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              )}
              <p className="text-[10px] text-white/30">JPG, PNG o WebP · máx. 5 MB</p>
            </div>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      )}

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
          { key: 'engine', label: 'Motor habitual', type: 'text', required: false, placeholder: 'ej. TM KZ10C, Rotax Max, IAME X30' },
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

        <TeamAutocomplete
          label="Equipo (opcional)"
          value={teamName}
          teamId={teamId}
          onChange={(name, id) => { setTeamName(name); setTeamId(id); }}
          placeholder="Busca o escribe el nombre del equipo"
        />

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
