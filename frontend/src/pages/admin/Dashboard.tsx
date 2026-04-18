import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, Flag, TrendingUp, DollarSign, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { eventsApi } from '../../api/events.api';
import { pilotsApi } from '../../api/pilots.api';
import { analyticsApi, StandingEntry, ConstructorEntry, FoodByEvent } from '../../api/analytics.api';
import { formatDate, CATEGORY_LABELS } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { queryKeys } from '../../lib/react-query';

const CATEGORY_COLORS: Record<string, string> = {
  SHIFTER: '#e10600',
  DOS_TIEMPOS: '#f59e0b',
  FORMULA_MUNDIAL: '#3b82f6',
  NUEVE_HP: '#10b981',
  ROOKIES: '#8b5cf6',
  MINIS: '#ec4899',
};

function DashboardStatSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
      <div className="mb-3 h-5 w-5 rounded bg-white/10" />
      <div className="h-8 w-16 rounded bg-white/10" />
      <div className="mt-2 h-4 w-28 rounded bg-white/5" />
    </div>
  );
}

function DashboardChartSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4 animate-pulse">
      <div className="h-4 w-40 rounded bg-white/10" />
      <div className="h-56 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

function shortName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded border border-white/10 bg-[#1a1a24] p-3 text-xs space-y-1">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-white/10 pt-1 mt-1 flex justify-between gap-6">
        <span className="text-white/60">Total</span>
        <span className="text-white font-mono font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function ParticipationTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded border border-white/10 bg-[#1a1a24] p-3 text-xs space-y-1">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-white/10 pt-1 mt-1 flex justify-between gap-6">
        <span className="text-white/60">Total</span>
        <span className="text-white font-mono font-bold">{total}</span>
      </div>
    </div>
  );
}

function ConstructorsTable({ entries, category }: { entries: ConstructorEntry[]; category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#e10600';
  return (
    <div className="border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
        {CATEGORY_LABELS[category] ?? category}
      </h3>
      <ol className="space-y-1.5">
        {entries.map((e, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-5 text-right font-mono text-xs text-white/40">{e.position ?? i + 1}</span>
            <span className="flex-1 text-sm text-white font-medium truncate">{e.teamName}</span>
            <span className="font-mono text-sm font-bold text-white">{e.totalPoints}</span>
            <span className="text-[10px] text-white/40 hidden sm:block">{e.eventsCount}ev</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StandingsTable({ entries, category }: { entries: StandingEntry[]; category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#e10600';
  return (
    <div className="border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
        {CATEGORY_LABELS[category] ?? category}
      </h3>
      <ol className="space-y-1.5">
        {entries.map((e, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-5 text-right font-mono text-xs text-white/40">{e.position ?? i + 1}</span>
            <span className="flex-1 text-sm text-white font-medium truncate">
              {e.pilotName}{e.alias ? ` "${e.alias}"` : ''}
            </span>
            <span className="font-mono text-sm font-bold text-white">{e.totalPoints}</span>
            <span className="text-[10px] text-white/40 hidden sm:block">{e.eventsCount}ev</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Dashboard() {
  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list({ page: 1, pageSize: 100 }),
    queryFn: () => eventsApi.list({ page: 1, pageSize: 100 }),
  });
  const pilotsQuery = useQuery({
    queryKey: queryKeys.pilots.list({ page: 1, pageSize: 100 }),
    queryFn: () => pilotsApi.list({ page: 1, pageSize: 100 }),
  });
  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const events = eventsQuery.data?.items ?? [];
  const pilots = pilotsQuery.data?.items ?? [];
  const analytics = analyticsQuery.data;
  const loading = eventsQuery.isLoading || pilotsQuery.isLoading || analyticsQuery.isLoading;

  const activeEvent = events.find((e) => e.status === 'IN_PROGRESS');
  const openEvents = events.filter((e) => e.status === 'OPEN');
  const nextEvent = activeEvent ?? openEvents[0] ?? null;
  const recentEvents = events.slice(0, 5);

  const stats = [
    { label: 'Pilotos activos', value: pilots.filter((p) => p.active).length, icon: Users, color: 'text-blue-400' },
    { label: 'Eventos totales', value: events.length, icon: Calendar, color: 'text-green-400' },
    { label: 'Eventos abiertos', value: openEvents.length, icon: Flag, color: 'text-yellow-400' },
    { label: 'En curso', value: activeEvent ? 1 : 0, icon: Trophy, color: 'text-racing-red' },
    { label: 'Equipos registrados', value: analytics?.totalTeams ?? 0, icon: ShieldCheck, color: 'text-purple-400' },
    { label: 'Equipos prom. por evento', value: analytics?.avgTeamsPerEvent ?? 0, icon: ShieldCheck, color: 'text-pink-400' },
  ];

  // Build chart data
  const revenueChartData = (analytics?.revenueByEvent ?? []).map((e) => ({
    name: shortName(e.name),
    'Inscripción': e.serviceFee,
    'Alimentos': e.foodFee,
    'Otro': e.other,
  }));

  const participationChartData = (analytics?.participationByEvent ?? []).map((e) => {
    const row: Record<string, string | number> = { name: shortName(e.name) };
    for (const [cat, count] of Object.entries(e.categories)) {
      row[CATEGORY_LABELS[cat] ?? cat] = count;
    }
    return row;
  });

  const participationCategories = Array.from(
    new Set((analytics?.participationByEvent ?? []).flatMap((e) => Object.keys(e.categories)))
  );

  const standingsByCategory = analytics?.standingsByCategory ?? {};
  const standingCategories = Object.keys(standingsByCategory).filter((c) => standingsByCategory[c].length > 0);

  const constructorsByCategory = analytics?.constructorsByCategory ?? {};
  const constructorCategories = Object.keys(constructorsByCategory).filter((c) => constructorsByCategory[c].length > 0);

  const foodByEvent: FoodByEvent[] = analytics?.foodByEvent ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Resumen general del sistema</p>
      </div>

      {/* Action-first event section */}
      {loading ? (
        <DashboardChartSkeleton />
      ) : (
        <div className="grid gap-4">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(225,6,0,0.18),rgba(255,255,255,0.03)_35%,rgba(255,255,255,0.02))]">
            <div className="border-b border-white/10 bg-black/15 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                {activeEvent ? 'Evento en curso' : nextEvent ? 'Siguiente evento disponible' : 'Sin evento activo'}
              </p>
            </div>
            <div className="p-6">
              {nextEvent ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <StatusBadge status={nextEvent.status} className="mb-3" />
                      <h2
                        className="text-4xl font-black uppercase leading-none text-white"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                      >
                        {nextEvent.name}
                      </h2>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#e10600]" />
                          {formatDate(nextEvent.date)}
                        </span>
                        {nextEvent.track && (
                          <span className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-[#e10600]" />
                            {nextEvent.track}
                          </span>
                        )}
                      </div>
                      <p className="mt-5 max-w-xl text-sm leading-7 text-white/68">
                        {activeEvent
                          ? 'Este es el foco operativo del día. Las acciones críticas deben estar visibles sin depender de scroll profundo.'
                          : 'Este es el siguiente evento accionable. Debe estar al frente para acelerar acceso a inscripción, caja, check-in y operación de carrera.'}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px] lg:grid-cols-1">
                      <Link
                        to={`/app/eventos/${nextEvent.slug}`}
                        className="rounded-xl bg-[#e10600] px-5 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b30500]"
                      >
                        Abrir hub del evento
                      </Link>
                      <Link
                        to={`/app/eventos/${nextEvent.slug}/inscripciones`}
                        className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-white/30 hover:text-white"
                      >
                        Ver inscripciones
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Link
                      to={`/app/eventos/${nextEvent.slug}/caja`}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#e10600]/40 hover:bg-white/10"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Caja</p>
                      <p className="mt-2 text-lg font-black uppercase text-white">Pagos y saldo</p>
                      <p className="mt-1 text-sm text-white/55">Cobros, comprobantes y control financiero.</p>
                    </Link>
                    <Link
                      to={`/app/eventos/${nextEvent.slug}/checkin`}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#e10600]/40 hover:bg-white/10"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Check-in</p>
                      <p className="mt-2 text-lg font-black uppercase text-white">Acceso operativo</p>
                      <p className="mt-1 text-sm text-white/55">Llegadas, asistencia y validación de pilotos.</p>
                    </Link>
                    <Link
                      to={`/app/eventos/${nextEvent.slug}/parrilla`}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#e10600]/40 hover:bg-white/10"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Parrilla</p>
                      <p className="mt-2 text-lg font-black uppercase text-white">Orden de salida</p>
                      <p className="mt-1 text-sm text-white/55">Sorteo, revisión y publicación operativa.</p>
                    </Link>
                    <Link
                      to={`/app/eventos/${nextEvent.slug}/carreras`}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#e10600]/40 hover:bg-white/10"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Carreras</p>
                      <p className="mt-2 text-lg font-black uppercase text-white">Captura deportiva</p>
                      <p className="mt-1 text-sm text-white/55">Series, resultados y operación en pista.</p>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-2xl font-black text-white">No hay eventos abiertos o en curso.</p>
                  <p className="max-w-xl text-sm leading-7 text-white/60">
                    Cuando exista una fecha accionable, aparecerá aquí arriba con accesos directos para evitar navegación innecesaria.
                  </p>
                  <Link
                    to="/app/eventos"
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-white/30 hover:text-white"
                  >
                    Ir a eventos
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }, (_, index) => <DashboardStatSkeleton key={index} />)
          : stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-black text-white">{stat.value}</p>
              <p className="text-sm text-white/50 mt-1">{stat.label}</p>
            </div>
          ))}
      </div>

      {/* Food / comensales section */}
      {foodByEvent.length > 0 && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-400">Comensales</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {foodByEvent.map((ev) => (
              <Link key={ev.slug} to={`/app/eventos/${ev.slug}/caja`} className="group rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/30 transition-colors p-4">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-1 truncate">{ev.name}</p>
                <div className="flex items-end justify-between gap-2 mt-2">
                  <div className="space-y-1 text-xs text-white/50">
                    <p>Pilotos: <span className="text-white font-semibold">{ev.pilotos}</span></p>
                    <p>Staff: <span className="text-white font-semibold">{ev.staff}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-orange-400">{ev.total}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wide">total</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Revenue chart */}
      {loading ? (
        <DashboardChartSkeleton />
      ) : revenueChartData.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Recaudación por evento</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 8 }}
                />
                <Bar dataKey="Inscripción" stackId="a" fill="#e10600" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Alimentos" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Otro" stackId="a" fill="#6b7280" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Participation chart */}
      {loading ? (
        <DashboardChartSkeleton />
      ) : participationChartData.length > 0 && participationCategories.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Participación por evento</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={participationChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={<ParticipationTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 8 }}
                />
                {participationCategories.map((cat) => (
                  <Bar
                    key={cat}
                    dataKey={CATEGORY_LABELS[cat] ?? cat}
                    stackId="a"
                    fill={CATEGORY_COLORS[cat] ?? '#6b7280'}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Teams per event chart */}
      {(analytics?.teamsPerEvent ?? []).length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Equipos por evento</h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics!.teamsPerEvent} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => shortName(v)}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'white', fontWeight: 700, marginBottom: 4 }}
                  itemStyle={{ color: '#a78bfa' }}
                  formatter={(v) => [v, 'Equipos']}
                />
                <Bar dataKey="equipos" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Championship standings — Pilots */}
      {standingCategories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Campeonato {analytics?.year} — Top 5 pilotos
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {standingCategories.map((cat) => (
              <StandingsTable key={cat} category={cat} entries={standingsByCategory[cat]} />
            ))}
          </div>
        </div>
      )}

      {/* Constructor standings */}
      {constructorCategories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Constructores {analytics?.year} — Top 5 por categoría
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {constructorCategories.map((cat) => (
              <ConstructorsTable key={cat} category={cat} entries={constructorsByCategory[cat]} />
            ))}
          </div>
        </div>
      )}

      {/* Recent events table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Eventos recientes</h2>
          <Link to="/app/eventos" className="text-sm text-racing-red hover:underline">Ver todos</Link>
        </div>
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Evento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Acción</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{event.name}</td>
                  <td className="px-4 py-3 text-white/60">{formatDate(event.date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={event.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/eventos/${event.slug}`} className="text-xs text-racing-red hover:underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
