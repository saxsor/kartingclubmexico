import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '../../../store/toast.store';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, AlertTriangle } from 'lucide-react';
import { racesApi, Race, ResultStatus } from '../../../api/races.api';
import { inscriptionsApi } from '../../../api/inscriptions.api';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { CategoryBadge } from '../../../components/shared/CategoryBadge';
import { queryKeys } from '../../../lib/react-query';

interface RaceEntry {
  inscriptionId: string;
  pilotName: string;
  alias: string | null;
  kartNumber: number | null;
  status: ResultStatus;
  lapsCompleted: number;
}

interface SortableItemProps {
  id: string;
  position: number;
  entry: RaceEntry;
  onStatusChange: (id: string, status: ResultStatus) => void;
  onAddPenalty: (id: string) => void;
}

function SortableItem({ id, position, entry, onStatusChange, onAddPenalty }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 touch-none"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        entry.status !== 'FINISHED' ? 'bg-gray-700 text-white/40' :
        position === 1 ? 'bg-yellow-500 text-black' :
        position === 2 ? 'bg-gray-400 text-black' :
        position === 3 ? 'bg-orange-500 text-white' :
        'bg-white/10 text-white'
      }`}>
        {entry.status !== 'FINISHED' ? entry.status : position}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{entry.pilotName}</p>
        {entry.alias && <p className="text-xs text-white/50">"{entry.alias}"</p>}
        {entry.kartNumber && <p className="text-xs text-white/40">Kart #{entry.kartNumber}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={entry.status}
          onChange={(e) => onStatusChange(id, e.target.value as ResultStatus)}
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg border border-white/10 bg-racing-dark px-2 py-1.5 text-xs text-white focus:outline-none"
        >
          <option value="FINISHED">Finalizó</option>
          <option value="DNS">DNS</option>
          <option value="DNF">DNF</option>
          <option value="DSQ">DSQ</option>
        </select>

        <button
          onClick={() => onAddPenalty(id)}
          className="text-white/30 hover:text-orange-400 transition-colors"
          title="Añadir penalización"
        >
          <AlertTriangle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function RaceCapture() {
  const { slug, raceId } = useParams<{ slug: string; raceId: string }>();
  const navigate = useNavigate();
  const { saveAndSync } = useOfflineSync();

  const [race, setRace] = useState<Race | null>(null);
  const [entries, setEntries] = useState<RaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [penaltyModal, setPenaltyModal] = useState<string | null>(null);
  const [penaltyForm, setPenaltyForm] = useState({ type: 'POINTS', amount: '1', reason: '' });
  const queryClient = useQueryClient();
  const raceQuery = useQuery({
    queryKey: slug && raceId ? queryKeys.races.detail(slug, raceId) : ['races', 'detail', 'missing'],
    queryFn: () => racesApi.get(slug!, raceId!),
    enabled: !!slug && !!raceId,
  });
  const inscriptionsQuery = useQuery({
    queryKey: slug ? queryKeys.inscriptions.list(slug, { page: 1, pageSize: 100 }) : ['inscriptions', 'list', 'missing'],
    queryFn: () => inscriptionsApi.list(slug!, { page: 1, pageSize: 100 }),
    enabled: !!slug,
  });
  const addPenaltyMutation = useMutation({
    mutationFn: ({ resultId, data }: { resultId: string; data: { type: string; amount: number; reason: string } }) =>
      racesApi.addPenalty(raceId!, resultId, data),
    onSuccess: () => {
      if (slug && raceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.races.detail(slug, raceId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.results.byCategory(slug!, raceQuery.data?.category ?? '') });
    },
  });

  useEffect(() => {
    const r = raceQuery.data;
    const insc = inscriptionsQuery.data;
    if (!r || !insc) return;

    setRace(r);

    const categoryInscriptions = insc.items.filter((i) => i.category === r.category);

    if (r.results.length > 0) {
      const sorted = [...r.results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      setEntries(sorted.map((res) => ({
        inscriptionId: res.inscriptionId,
        pilotName: res.inscription.pilot.name,
        alias: res.inscription.pilot.alias,
        kartNumber: res.inscription.kartNumber,
        status: res.status,
        lapsCompleted: res.lapsCompleted,
      })));
    } else {
      setEntries(categoryInscriptions.map((i) => ({
        inscriptionId: i.id,
        pilotName: i.pilot.name,
        alias: i.pilot.alias,
        kartNumber: i.kartNumber,
        status: 'FINISHED' as ResultStatus,
        lapsCompleted: r.laps,
      })));
    }
    setLoading(false);
  }, [raceQuery.data, inscriptionsQuery.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = entries.findIndex((e) => e.inscriptionId === active.id);
      const newIdx = entries.findIndex((e) => e.inscriptionId === over.id);
      setEntries(arrayMove(entries, oldIdx, newIdx));
    }
  };

  const handleStatusChange = (id: string, status: ResultStatus) => {
    setEntries((e) => e.map((en) => en.inscriptionId === id ? { ...en, status } : en));
  };

  const handleSave = async () => {
    if (!raceId) return;
    setSaving(true);
    try {
      const results = entries.map((e, idx) => ({
        inscriptionId: e.inscriptionId,
        position: e.status === 'FINISHED' ? idx + 1 : null,
        lapsCompleted: e.lapsCompleted,
        status: e.status,
      }));
      await saveAndSync(raceId, results);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // saved offline
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPenalty = async (inscriptionId: string) => {
    // Find resultId
    const result = race?.results.find((r) => r.inscriptionId === inscriptionId);
    if (!raceId || !result) {
      toast.info('Primero guarda los resultados antes de añadir penalizaciones');
      return;
    }
    setPenaltyModal(result.id);
  };

  const handleSavePenalty = async () => {
    if (!raceId || !penaltyModal) return;
    await addPenaltyMutation.mutateAsync({ resultId: penaltyModal, data: {
      type: penaltyForm.type,
      amount: parseInt(penaltyForm.amount),
      reason: penaltyForm.reason,
    } });
    setPenaltyModal(null);
  };

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;
  if (!race) return <div className="text-center py-20 text-white/40">Carrera no encontrada</div>;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-white/50 hover:text-white mb-1 block">
            ← Carreras
          </button>
          <div className="flex items-center gap-2">
            <CategoryBadge category={race.category} />
            <h1 className="text-lg font-black text-white">Carrera {race.number}</h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            saved ? 'bg-green-600 text-white' : 'bg-racing-red text-white hover:bg-red-700'
          } disabled:opacity-60`}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      <p className="text-xs text-white/40">
        Arrastra para reordenar posiciones. Los DNS/DNF/DSQ no cuentan posición.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map((e) => e.inscriptionId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <SortableItem
                key={entry.inscriptionId}
                id={entry.inscriptionId}
                position={idx + 1}
                entry={entry}
                onStatusChange={handleStatusChange}
                onAddPenalty={handleAddPenalty}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Penalty modal */}
      {penaltyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-racing-gray p-6 space-y-4">
            <h2 className="font-bold text-white">Añadir penalización</h2>
            <div>
              <label className="block text-xs text-white/60 mb-1">Tipo</label>
              <select
                value={penaltyForm.type}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, type: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white"
              >
                <option value="POINTS">Puntos</option>
                <option value="POSITIONS">Posiciones</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Cantidad</label>
              <input
                type="number"
                value={penaltyForm.amount}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, amount: e.target.value })}
                min={1}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Motivo *</label>
              <input
                type="text"
                value={penaltyForm.reason}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, reason: e.target.value })}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSavePenalty}
                disabled={!penaltyForm.reason}
                className="flex-1 rounded-lg bg-racing-red py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Aplicar
              </button>
              <button
                onClick={() => setPenaltyModal(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
