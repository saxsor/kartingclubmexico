import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pilotApi, PilotInscription } from '../../api/pilot.api';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth.api';
import { teamsApi } from '../../api/teams.api';
import { formatCurrency, formatDate, resolveMediaUrl } from '../../lib/utils';
import { useRouteScrollTop } from '../../hooks/useRouteScrollTop';
import { Flag, User, Camera, LogOut, Pencil, CheckCircle, X, Trophy, Calendar, Users } from 'lucide-react';
import { TeamAutocomplete } from '../../components/shared/TeamAutocomplete';
import { HeroLoadingState } from '../../components/shared/LoadingSkeleton';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pago pendiente', color: 'text-orange-400' },
  RECEIPT_SUBMITTED: { label: 'Recibo enviado', color: 'text-yellow-400' },
  PAID: { label: 'Pagado', color: 'text-green-400' },
};

const CATEGORY_LABEL: Record<string, string> = {
  SHIFTER: 'Shifter', DOS_TIEMPOS: '2 Tiempos', FORMULA_MUNDIAL: 'Fórmula Mundial',
  NUEVE_HP: '9 HP', ROOKIES: '6.5 HP', MINIS: 'Minis',
};

const inputClass = 'w-full border border-[#38383f] bg-[#15151e] px-3 py-1.5 text-sm text-white placeholder-white/30 focus:border-[#f5c400] focus:outline-none transition-colors';

function getTotalPaid(insc: PilotInscription) {
  return insc.payments.reduce((s, p) => s + Number(p.amount), 0);
}

function getRequired(insc: PilotInscription) {
  return insc.totalRequired;
}

export function PilotPortal() {
  useRouteScrollTop();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', alias: '', phone: '', engine: '', kartNumber: '' });
  const [profileTeamName, setProfileTeamName] = useState('');
  const [profileTeamId, setProfileTeamId] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [editingInsc, setEditingInsc] = useState<string | null>(null);
  const [inscForm, setInscForm] = useState({ companions: 0, kartNumber: '', engine: '' });

  const profileQuery = useQuery({
    queryKey: ['pilot', 'me'],
    queryFn: pilotApi.getProfile,
  });

  const pilot = profileQuery.data;

  const updateProfileMutation = useMutation({
    mutationFn: pilotApi.updateProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot', 'me'] }); setEditingProfile(false); },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: pilotApi.uploadPhoto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pilot', 'me'] }),
  });

  const updateInscMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { companions?: number; kartNumber?: number | null; engine?: string } }) =>
      pilotApi.updateInscription(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot', 'me'] }); setEditingInsc(null); },
  });

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/piloto');
  };

  const startEditProfile = () => {
    setProfileForm({ name: pilot?.name ?? '', alias: pilot?.alias ?? '', phone: pilot?.phone ?? '', engine: pilot?.engine ?? '', kartNumber: pilot?.kartNumber?.toString() ?? '' });
    setProfileTeamName(pilot?.team?.name ?? '');
    setProfileTeamId(pilot?.team?.id ?? null);
    setEditingProfile(true);
  };

  const startEditInsc = (insc: PilotInscription) => {
    setInscForm({ companions: insc.companions, kartNumber: insc.kartNumber?.toString() ?? '', engine: insc.engine ?? '' });
    setEditingInsc(insc.id);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="racing-carbon-bg min-h-screen px-4 py-6">
        <div className="mx-auto max-w-lg">
          <HeroLoadingState sections={3} />
        </div>
      </div>
    );
  }

  if (!pilot) {
    return (
      <div className="racing-carbon-bg min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-sm">Error al cargar el perfil.</p>
      </div>
    );
  }

  const openInscriptions = pilot.inscriptions.filter((i) => i.event.status === 'OPEN');
  const pastInscriptions = pilot.inscriptions.filter((i) => i.event.status !== 'OPEN');

  return (
    <div className="racing-carbon-bg min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-[#38383f] bg-[#15151e] px-5 py-3 flex items-center justify-between">
        <a href="/" title="Ir al sitio público" className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
          <img
            src="/karting_club_logo.png"
            alt="Karting Club México"
            className="h-8 w-auto object-contain"
          />
          <div>
            <h1 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Pilot <span className="text-[#f5c400]">Portal</span>
            </h1>
            {pilot.alias
              ? <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">"{pilot.alias}"</p>
              : <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">{pilot.name}</p>
            }
          </div>
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" /> Salir
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Profile card */}
        <div className="border-t-[3px] border-[#f5c400] border-x border-b border-[#38383f] bg-[#1f1f27] p-5">
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#38383f] bg-[#15151e] flex items-center justify-center">
                {pilot.photoUrl ? (
                  <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt={pilot.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-white/30" />
                )}
              </div>
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploadPhotoMutation.isPending}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#f5c400] flex items-center justify-center hover:bg-[#d99a00] transition-colors disabled:opacity-60"
                title="Cambiar foto"
                aria-label="Cambiar foto de perfil"
              >
                <Camera className="h-3 w-3 text-white" />
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhotoMutation.mutate(file);
              }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editingProfile ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  let resolvedTeamId: string | null = profileTeamId;
                  if (profileTeamName.trim() && !resolvedTeamId) {
                    try {
                      const created = await teamsApi.create(profileTeamName.trim());
                      resolvedTeamId = created.id;
                    } catch (err: unknown) {
                      const e = err as { team?: { id: string } };
                      if (e?.team?.id) resolvedTeamId = e.team.id;
                    }
                  }
                  updateProfileMutation.mutate({
                    ...profileForm,
                    kartNumber: profileForm.kartNumber ? parseInt(profileForm.kartNumber) : null,
                    teamId: profileTeamName.trim() ? resolvedTeamId ?? null : null,
                  });
                }} className="space-y-2">
                  <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Nombre" required className={inputClass} />
                  <input value={profileForm.alias} onChange={(e) => setProfileForm({ ...profileForm, alias: e.target.value })} placeholder="Alias (opcional)" className={inputClass} />
                  <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Teléfono (opcional)" className={inputClass} />
                  <div className="flex gap-2">
                    <input value={profileForm.engine} onChange={(e) => setProfileForm({ ...profileForm, engine: e.target.value })} placeholder="Motor (ej. TM KZ10C...)" className={`flex-1 ${inputClass}`} />
                    <input type="number" min="1" value={profileForm.kartNumber} onChange={(e) => setProfileForm({ ...profileForm, kartNumber: e.target.value })} placeholder="# Kart" className={`w-20 ${inputClass}`} />
                  </div>
                  <TeamAutocomplete
                    value={profileTeamName}
                    teamId={profileTeamId}
                    onChange={(name, id) => { setProfileTeamName(name); setProfileTeamId(id); }}
                    placeholder="Equipo (opcional)"
                  />
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={updateProfileMutation.isPending} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50">
                      <CheckCircle className="h-3.5 w-3.5" /> {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" onClick={() => setEditingProfile(false)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-lg leading-tight uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{pilot.name}</h2>
                    <button onClick={startEditProfile} className="text-white/30 hover:text-white transition-colors" title="Editar perfil" aria-label="Editar perfil">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {pilot.alias && <p className="text-sm text-white/50 italic">"{pilot.alias}"</p>}
                  {pilot.email && <p className="text-xs text-white/30 mt-0.5">{pilot.email}</p>}
                  {pilot.phone && <p className="text-xs text-white/30">{pilot.phone}</p>}
                  {pilot.engine && <p className="text-xs text-white/40 mt-1">Motor: {pilot.engine}</p>}
                  {pilot.kartNumber && <p className="text-xs text-white/40">Kart: <span className="text-[#f5c400] font-black">#{pilot.kartNumber}</span></p>}
                  {pilot.team && (
                    <p className="text-xs text-purple-400/80 mt-0.5 flex items-center gap-1">
                      <Users className="h-3 w-3" />{pilot.team.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active event inscriptions */}
        {openInscriptions.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#f5c400]" /> Eventos abiertos
            </h3>
            <div className="space-y-px">
              {openInscriptions.map((insc) => {
                const paid = getTotalPaid(insc);
                const required = getRequired(insc);
                const outstanding = Math.max(required - paid, 0);
                const isEditing = editingInsc === insc.id;

                return (
                  <div key={insc.id} className="border border-[#38383f] bg-[#1f1f27] p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{insc.event.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{formatDate(insc.event.date)} · {CATEGORY_LABEL[insc.category] ?? insc.category}</p>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${STATUS_LABEL[insc.status]?.color ?? 'text-white/50'}`}>
                        {STATUS_LABEL[insc.status]?.label ?? insc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-[#15151e] border border-[#38383f] px-3 py-2">
                        <span className="block text-white/30 uppercase tracking-wider text-[10px]">Pagado</span>
                        <span className="text-white font-black">{formatCurrency(paid)}</span>
                      </div>
                      <div className="bg-[#15151e] border border-[#38383f] px-3 py-2">
                        <span className="block text-white/30 uppercase tracking-wider text-[10px]">Saldo</span>
                        <span className={`font-black ${outstanding > 0 ? 'text-orange-400' : 'text-green-400'}`}>{formatCurrency(outstanding)}</span>
                      </div>
                    </div>

                    {isEditing ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        updateInscMutation.mutate({
                          id: insc.id,
                          data: {
                            companions: inscForm.companions,
                            kartNumber: inscForm.kartNumber ? parseInt(inscForm.kartNumber) : null,
                            engine: inscForm.engine || undefined,
                          },
                        });
                      }} className="border-t border-[#38383f] pt-3 space-y-2">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Acompañantes</label>
                            <input type="number" min="0" max="20" value={inscForm.companions} onChange={(e) => setInscForm({ ...inscForm, companions: parseInt(e.target.value) || 0 })} className={inputClass} />
                            <p className="text-xs text-white/30 mt-0.5">{inscForm.companions} comensales en total</p>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Número de kart</label>
                            <input type="number" min="1" value={inscForm.kartNumber} onChange={(e) => setInscForm({ ...inscForm, kartNumber: e.target.value })} placeholder="Sin asignar" className={inputClass} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Motor</label>
                          <input type="text" value={inscForm.engine} onChange={(e) => setInscForm({ ...inscForm, engine: e.target.value })} placeholder="ej. TM KZ10C, Rotax Max, IAME X30" className={inputClass} />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" disabled={updateInscMutation.isPending} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5" /> {updateInscMutation.isPending ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button type="button" onClick={() => setEditingInsc(null)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
                            <X className="h-3.5 w-3.5" /> Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="border-t border-[#38383f] pt-3 flex items-center justify-between">
                        <div className="text-xs text-white/50 space-y-0.5">
                          <p>{insc.companions} comensales</p>
                          <p>Kart: {insc.kartNumber ?? <span className="text-white/30">Sin asignar</span>}</p>
                          {insc.engine && <p>Motor: {insc.engine}</p>}
                        </div>
                        <button
                          onClick={() => startEditInsc(insc)}
                          className="flex items-center gap-1.5 border border-[#38383f] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/50 hover:bg-[#2a2a35] hover:text-white transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Championship standings */}
        {pilot.standings.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-[#f5c400]" /> Posición en campeonato
            </h3>
            <div className="border border-[#38383f] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#38383f] bg-[#1a1a21]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Año</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Categoría</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-white/40">Pos.</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-white/40">Pts.</th>
                  </tr>
                </thead>
                <tbody>
                  {pilot.standings.map((s) => (
                    <tr key={s.id} className="border-b border-[#38383f]/50 transition-colors hover:bg-[#2a2a35]">
                      <td className="px-4 py-2.5 text-white/60">{s.year}</td>
                      <td className="px-4 py-2.5 text-white/60">{CATEGORY_LABEL[s.category] ?? s.category}</td>
                      <td className="px-4 py-2.5 text-right font-black text-white">
                        {s.position != null ? `#${s.position}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-[#f5c400]">{s.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Past events */}
        {pastInscriptions.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#f5c400]" /> Historial de eventos
            </h3>
            <div className="border border-[#38383f] divide-y divide-[#38383f]">
              {pastInscriptions.map((insc) => (
                <div key={insc.id} className="bg-[#1f1f27] p-3 flex items-center justify-between hover:bg-[#2a2a35] transition-colors">
                  <div>
                    <p className="text-sm font-bold text-white">{insc.event.name}</p>
                    <p className="text-xs text-white/40">{formatDate(insc.event.date)} · {CATEGORY_LABEL[insc.category] ?? insc.category}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${STATUS_LABEL[insc.status]?.color ?? 'text-white/50'}`}>
                    {STATUS_LABEL[insc.status]?.label ?? insc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pilot.inscriptions.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[#38383f] text-white/30 text-sm">
            No tienes inscripciones registradas.
          </div>
        )}
      </div>
    </div>
  );
}
