import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare, X, Search, Save } from 'lucide-react';
import { checkinApi } from '../../../api/checkin.api';
import { inscriptionsApi, Inscription } from '../../../api/inscriptions.api';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { queryKeys } from '../../../lib/react-query';

export function CheckInPanel() {
  const { slug } = useParams<{ slug: string }>();
  const [search, setSearch] = useState('');
  const [kartInputs, setKartInputs] = useState<Record<string, string>>({});
  const [kartNotesInputs, setKartNotesInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const checkinQuery = useQuery({
    queryKey: slug ? queryKeys.checkin.list(slug) : ['checkin', 'list', 'missing'],
    queryFn: () => checkinApi.list(slug!),
    enabled: !!slug,
  });
  const checkInMutation = useMutation({
    mutationFn: ({ inscriptionId, kartNumber, kartNotes }: { inscriptionId: string; kartNumber: number; kartNotes?: string }) =>
      checkinApi.checkIn(slug!, inscriptionId, kartNumber, kartNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.grids.all });
    },
  });
  const saveNotesMutation = useMutation({
    mutationFn: ({ inscriptionId, kartNotes }: { inscriptionId: string; kartNotes: string }) =>
      inscriptionsApi.update(slug!, inscriptionId, { kartNotes: kartNotes || undefined }),
    onSuccess: (_data, { inscriptionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkin.all });
      setKartNotesInputs((k) => { const n = { ...k }; delete n[inscriptionId]; return n; });
    },
  });
  const undoMutation = useMutation({
    mutationFn: (inscriptionId: string) => checkinApi.undoCheckIn(slug!, inscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.grids.all });
    },
  });

  const inscriptions = checkinQuery.data ?? [];
  const loading = checkinQuery.isLoading;

  const handleCheckIn = async (insc: Inscription) => {
    if (!slug) return;
    const kart = parseInt(kartInputs[insc.id] ?? insc.kartNumber?.toString() ?? '0');
    if (!kart) {
      setError((e) => ({ ...e, [insc.id]: 'Ingresa número de kart' }));
      return;
    }
    const notes = kartNotesInputs[insc.id] ?? insc.kartNotes ?? '';
    try {
      await checkInMutation.mutateAsync({ inscriptionId: insc.id, kartNumber: kart, kartNotes: notes || undefined });
      setError((e) => { const n = { ...e }; delete n[insc.id]; return n; });
    } catch (err) {
      setError((e) => ({ ...e, [insc.id]: err instanceof Error ? err.message : 'Error' }));
    }
  };

  const handleUndo = async (insc: Inscription) => {
    if (!slug) return;
    await undoMutation.mutateAsync(insc.id);
  };

  const filtered = inscriptions.filter((i) =>
    i.pilot.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()),
  );

  const checkedIn = filtered.filter((i) => i.checkIn);
  const notCheckedIn = filtered.filter((i) => !i.checkIn);

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Check-in</h1>
        <div className="text-sm text-white/60">
          {checkedIn.length}/{inscriptions.length} confirmados
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar piloto..."
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
        />
      </div>

      {notCheckedIn.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
            Pendientes ({notCheckedIn.length})
          </h2>
          <div className="space-y-2">
            {notCheckedIn.map((insc) => (
              <div key={insc.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{insc.pilot.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={insc.category} />
                      <StatusBadge status={insc.status} />
                    </div>
                    {error[insc.id] && (
                      <p className="text-xs text-red-400 mt-1">{error[insc.id]}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={kartInputs[insc.id] ?? insc.kartNumber?.toString() ?? ''}
                        onChange={(e) => setKartInputs((k) => ({ ...k, [insc.id]: e.target.value }))}
                        placeholder="Kart #"
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white text-center focus:border-racing-red focus:outline-none"
                      />
                      <button
                        onClick={() => handleCheckIn(insc)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Check-in
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={kartNotesInputs[insc.id] ?? insc.kartNotes ?? ''}
                        onChange={(e) => setKartNotesInputs((k) => ({ ...k, [insc.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveNotesMutation.mutate({ inscriptionId: insc.id, kartNotes: kartNotesInputs[insc.id] ?? insc.kartNotes ?? '' });
                        }}
                        placeholder="Ej: kart azul, pontones blancos"
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/25 focus:border-racing-red focus:outline-none"
                      />
                      {(kartNotesInputs[insc.id] !== undefined && kartNotesInputs[insc.id] !== (insc.kartNotes ?? '')) && (
                        <button
                          onClick={() => saveNotesMutation.mutate({ inscriptionId: insc.id, kartNotes: kartNotesInputs[insc.id] })}
                          disabled={saveNotesMutation.isPending}
                          title="Guardar nota"
                          className="flex-shrink-0 rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-40"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {checkedIn.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
            Confirmados ({checkedIn.length})
          </h2>
          <div className="space-y-2">
            {checkedIn.map((insc) => (
              <div key={insc.id} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{insc.pilot.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={insc.category} />
                      <span className="text-xs text-green-400 font-medium">
                        Kart #{insc.checkIn!.kartNumber}
                      </span>
                    </div>
                    {insc.kartNotes && (
                      <p className="text-xs text-white/40 mt-0.5 italic">{insc.kartNotes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUndo(insc)}
                    aria-label={`Deshacer check-in de ${insc.pilot.name}`}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
