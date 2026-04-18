import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ClipboardList, DollarSign, CheckSquare, Shuffle, Flag, BarChart2, Settings } from 'lucide-react';
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{event.name}</h1>
          <p className="text-white/50 text-sm mt-1">{formatDate(event.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={event.status} />
          {user?.role === 'ADMIN' && (
            <Link
              to={`/app/eventos/${slug}/editar`}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Editar
            </Link>
          )}
        </div>
      </div>

      {/* Quick status change — hidden for VALIDATOR */}
      {user?.role !== 'VALIDATOR' && <div className="flex flex-wrap gap-2">
        {(['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED'] as const).map((s) => (
          <button
            key={s}
            onClick={async () => {
              await patchStatusMutation.mutateAsync(s);
            }}
            disabled={event.status === s}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              event.status === s
                ? 'bg-racing-red text-white cursor-default'
                : 'border border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            {s === 'DRAFT' ? 'Borrador' : s === 'OPEN' ? 'Abrir' : s === 'IN_PROGRESS' ? 'Iniciar' : 'Finalizar'}
          </button>
        ))}
      </div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.filter((a) => !a.adminOnly || user?.role !== 'VALIDATOR').map((action) => (
          <Link
            key={action.to}
            to={`/app/eventos/${slug}/${action.to}`}
            className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-racing-red/30 transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-racing-red/20 flex items-center justify-center group-hover:bg-racing-red/30 transition-colors flex-shrink-0">
              <action.icon className="h-6 w-6 text-racing-red" />
            </div>
            <div>
              <p className="font-semibold text-white group-hover:text-racing-red transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-white/50 mt-0.5">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
