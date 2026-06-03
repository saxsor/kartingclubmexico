import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ClipboardList, DollarSign, CheckSquare, Shuffle, Flag, BarChart2, Settings, Camera } from 'lucide-react';
import { eventsApi } from '../../../api/events.api';
import { formatDate } from '../../../lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { queryKeys } from '../../../lib/react-query';
import { EventBreadcrumbs } from '../../../components/shared/EventBreadcrumbs';
import { PageLoadingState } from '../../../components/shared/LoadingSkeleton';

const actions = [
  { label: 'Inscripciones', to: 'inscripciones', icon: ClipboardList, description: 'Gestionar inscripciones de pilotos' },
  { label: 'Caja', to: 'caja', icon: DollarSign, description: 'Control de pagos y cobros' },
  { label: 'Check-in', to: 'checkin', icon: CheckSquare, description: 'Confirmación de llegada' },
  { label: 'Fotos', to: 'fotos', icon: Camera, description: 'Galería de fotos del evento' },
  { label: 'Parrilla', to: 'parrilla', icon: Shuffle, description: 'Sorteo de parrilla de salida', adminOnly: true },
  { label: 'Carreras', to: 'carreras', icon: Flag, description: 'Control de carreras y tiempos', adminOnly: true },
  { label: 'Clasificación', to: 'clasificacion', icon: BarChart2, description: 'Resultados y clasificación', adminOnly: true },
];

export function EventHub() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });
  const patchStatusMutation = useMutation({
    mutationFn: (status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED') => eventsApi.patchStatus(slug!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      if (slug) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(slug) });
      }
    },
  });

  const event = eventQuery.data ?? null;
  const loading = eventQuery.isLoading;

  if (loading) return <PageLoadingState cards={3} rows={1} />;
  if (!event) return <div className="text-center py-20 text-white/40">Evento no encontrado</div>;

  return (
    <div className="space-y-6">
      <EventBreadcrumbs eventSlug={slug!} eventName={event.name} />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Event <span className="text-[#e10600]">Hub</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">{event.name} · {formatDate(event.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={event.status} />
          {user?.role === 'ADMIN' && (
            <Link
              to={`/app/eventos/${slug}/editar`}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Editar
            </Link>
          )}
        </div>
      </div>

      {/* Quick status change — hidden for VALIDATOR */}
      {user?.role !== 'VALIDATOR' && (
        <div className="flex flex-wrap gap-2">
          {(['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED'] as const).map((s) => (
            <button
              key={s}
              onClick={async () => { await patchStatusMutation.mutateAsync(s); }}
              disabled={event.status === s || patchStatusMutation.isPending}
              className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${
                event.status === s
                  ? 'bg-[#e10600] text-white cursor-default shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                  : 'border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {s === 'DRAFT' ? 'Borrador' : s === 'OPEN' ? 'Abrir' : s === 'IN_PROGRESS' ? 'Iniciar' : 'Finalizar'}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.filter((a) => !a.adminOnly || user?.role !== 'VALIDATOR').map((action) => (
          <Link
            key={action.to}
            to={`/app/eventos/${slug}/${action.to}`}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-[#e10600]/50 hover:bg-white/[0.08]"
          >
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <action.icon className="w-16 h-16 text-white" />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="h-11 w-11 rounded-lg bg-[#e10600]/10 flex items-center justify-center group-hover:bg-[#e10600]/20 transition-colors flex-shrink-0">
                <action.icon className="h-5 w-5 text-[#e10600]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-[#e10600] transition-colors">{action.label}</p>
                <p className="text-base font-black uppercase text-white italic tracking-tight leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
