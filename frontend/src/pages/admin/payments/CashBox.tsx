import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useParams } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, FileText, Download, Trash2, Users, Pencil, X, UtensilsCrossed, Search } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { CATEGORY_LABELS } from '../../../lib/utils';
import { downloadCsv } from '../../../lib/download';
import { paymentsApi } from '../../../api/payments.api';
import { eventsApi } from '../../../api/events.api';
import { inscriptionsApi, type Inscription } from '../../../api/inscriptions.api';
import { eventGuestsApi, type EventGuest } from '../../../api/eventGuests.api';
import { formatCurrency, resolveMediaUrl } from '../../../lib/utils';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';
import { EventBreadcrumbs } from '../../../components/shared/EventBreadcrumbs';
import { PageLoadingState } from '../../../components/shared/LoadingSkeleton';

export function CashBox() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [showForm, setShowForm] = useState<string | null>(null); // inscriptionId
  const [form, setForm] = useState({ type: 'SERVICE_FEE', amount: '', notes: '' });
  const [processingReceipt, setProcessingReceipt] = useState<string | null>(null);
  const [processingCashPayment, setProcessingCashPayment] = useState<string | null>(null);
  const [editingCompanions, setEditingCompanions] = useState<string | null>(null); // inscriptionId
  const [companionsValue, setCompanionsValue] = useState<number>(0);
  const [editingStaff, setEditingStaff] = useState(false);
  const [staffValue, setStaffValue] = useState<number>(0);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', count: 1, notes: '' });
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);
  const [inscriptionsPage, setInscriptionsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [inscSearch, setInscSearch] = useState('');
  const [inscCategory, setInscCategory] = useState('');
  const debouncedInscSearch = useDebounce(inscSearch, 300);
  const queryClient = useQueryClient();
  const cashboxQuery = useQuery({
    queryKey: slug ? queryKeys.payments.cashbox(slug, { page: paymentsPage, pageSize: 10 }) : ['payments', 'cashbox', 'missing'],
    queryFn: () => paymentsApi.getCashBox(slug!, { page: paymentsPage, pageSize: 10 }),
    enabled: !!slug,
  });
  const eventQuery = useQuery({
    queryKey: slug ? queryKeys.events.detail(slug) : ['events', 'detail', 'missing'],
    queryFn: () => eventsApi.get(slug!),
    enabled: !!slug,
  });
  const inscListParams = {
    page: inscriptionsPage,
    pageSize: 10,
    ...(debouncedInscSearch ? { search: debouncedInscSearch } : {}),
    ...(inscCategory ? { category: inscCategory } : {}),
  };
  const inscriptionsQuery = useQuery({
    queryKey: slug ? queryKeys.inscriptions.list(slug, inscListParams) : ['inscriptions', 'list', 'missing'],
    queryFn: () => inscriptionsApi.list(slug!, inscListParams),
    enabled: !!slug,
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => inscriptionsApi.approveReceipt(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
    },
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => inscriptionsApi.rejectReceipt(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
    },
  });
  const addPaymentMutation = useMutation({
    mutationFn: ({ inscriptionId, data }: { inscriptionId: string; data: { type: string; amount: number; notes?: string } }) =>
      paymentsApi.addPayment(slug!, inscriptionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
    },
  });
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.deletePayment(slug!, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
    },
  });
  const updateCompanionsMutation = useMutation({
    mutationFn: ({ inscriptionId, companions }: { inscriptionId: string; companions: number }) =>
      inscriptionsApi.update(slug!, inscriptionId, { companions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      setEditingCompanions(null);
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: (staffCount: number) => eventsApi.update(slug!, { staffCount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slug ? queryKeys.events.detail(slug) : [] });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      setEditingStaff(false);
    },
  });

  const guestsQuery = useQuery({
    queryKey: slug ? queryKeys.guests.list(slug) : ['guests', 'list', 'missing'],
    queryFn: () => eventGuestsApi.list(slug!),
    enabled: !!slug,
  });
  const addGuestMutation = useMutation({
    mutationFn: (data: { name?: string; count?: number; notes?: string }) => eventGuestsApi.add(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      setShowGuestForm(false);
      setGuestForm({ name: '', count: 1, notes: '' });
    },
  });
  const updateGuestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; count?: number; isPaid?: boolean; notes?: string } }) =>
      eventGuestsApi.update(slug!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      setEditingGuest(null);
    },
  });
  const deleteGuestMutation = useMutation({
    mutationFn: (id: string) => eventGuestsApi.delete(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  const cashbox = cashboxQuery.data ?? null;
  const event = eventQuery.data ?? null;
  const inscriptions = inscriptionsQuery.data?.items ?? [];
  const guests = guestsQuery.data ?? [];
  const inscriptionsPagination = inscriptionsQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const loading = cashboxQuery.isLoading || inscriptionsQuery.isLoading || eventQuery.isLoading;

  const totalPilotosComensales = cashbox?.totalPilotosComensales ?? 0;
  const totalGuestComensales = guests.reduce((s, g) => s + g.count, 0);
  const totalStaff = event?.staffCount ?? 0;
  const totalComensales = totalPilotosComensales + totalGuestComensales + totalStaff;

  const getPaymentSummary = (inscription: Inscription) => {
    const serviceFee = inscription.exentoCarrera ? 0 : Number(event?.serviceFee ?? 0);
    const foodFeeUnit = Number(event?.foodFee ?? 0);
    const totalFoodFee = inscription.exentoComida ? 0 : foodFeeUnit * inscription.companions;
    const required = serviceFee + totalFoodFee;
    const totalPaid = inscription.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const servicePaid = inscription.payments
      .filter((payment) => payment.type === 'SERVICE_FEE')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const foodPaid = inscription.payments
      .filter((payment) => payment.type === 'FOOD_FEE')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      required,
      totalPaid,
      outstanding: Math.max(required - totalPaid, 0),
      serviceOutstanding: Math.max(serviceFee - servicePaid, 0),
      foodOutstanding: Math.max(totalFoodFee - foodPaid, 0),
      isExento: inscription.exentoCarrera && inscription.exentoComida,
    };
  };

  const handleApproveReceipt = async (id: string) => {
    if (!slug) return;
    setProcessingReceipt(id);
    try {
      await approveMutation.mutateAsync(id);
    } finally {
      setProcessingReceipt(null);
    }
  };

  const handleRejectReceipt = async (id: string) => {
    if (!slug) return;
    setProcessingReceipt(id);
    try {
      await rejectMutation.mutateAsync(id);
    } finally {
      setProcessingReceipt(null);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !showForm) return;
    await addPaymentMutation.mutateAsync({ inscriptionId: showForm, data: {
      type: form.type,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
    } });
    setShowForm(null);
    setForm({ type: 'SERVICE_FEE', amount: '', notes: '' });
  };

  const handleMarkCashPaid = async (inscription: Inscription) => {
    if (!slug || !event) return;
    const summary = getPaymentSummary(inscription);
    if (summary.outstanding <= 0) return;
    if (!confirm(`¿Registrar ${formatCurrency(summary.outstanding)} como pago en efectivo para ${inscription.pilot.name}?`)) return;

    const payments: { type: string; amount: number; notes: string }[] = [];
    let remaining = summary.outstanding;
    const serviceAmount = Math.min(summary.serviceOutstanding, remaining);
    if (serviceAmount > 0) {
      payments.push({ type: 'SERVICE_FEE', amount: serviceAmount, notes: 'Pago en efectivo en evento' });
      remaining -= serviceAmount;
    }
    const foodAmount = Math.min(summary.foodOutstanding, remaining);
    if (foodAmount > 0) {
      payments.push({ type: 'FOOD_FEE', amount: foodAmount, notes: 'Pago en efectivo en evento' });
      remaining -= foodAmount;
    }
    if (remaining > 0) {
      payments.push({ type: 'OTHER', amount: remaining, notes: 'Pago en efectivo en evento' });
    }

    setProcessingCashPayment(inscription.id);
    try {
      for (const payment of payments) {
        await addPaymentMutation.mutateAsync({ inscriptionId: inscription.id, data: payment });
      }
    } finally {
      setProcessingCashPayment(null);
    }
  };

  if (loading) return <PageLoadingState showFilters rows={5} cards={2} />;

  return (
    <div className="space-y-6">
      <EventBreadcrumbs eventSlug={slug!} eventName={event?.name} currentLabel="Caja" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Caja — {event?.name ?? slug}</h1>
        <button
          onClick={() => downloadCsv(`/api/events/${slug}/cashbox/export`, `${slug}-caja.csv`).catch(() => {})}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Exportar caja a CSV"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      {cashbox && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/50 mb-1">Total recaudado</p>
            <p className="text-2xl font-black text-green-400">{formatCurrency(cashbox.totals.total)}</p>
            {cashbox.required.total > 0 && (
              <p className="text-xs text-white/35 mt-0.5">de {formatCurrency(cashbox.required.total)}</p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/50 mb-1">Cuota de servicio</p>
            <p className="text-2xl font-black text-blue-400">{formatCurrency(cashbox.totals.serviceFee)}</p>
            {cashbox.required.serviceFee > 0 && (
              <p className="text-xs text-white/35 mt-0.5">de {formatCurrency(cashbox.required.serviceFee)}</p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/50 mb-1">Cuota de comida</p>
            <p className="text-2xl font-black text-orange-400">{formatCurrency(cashbox.totals.foodFee)}</p>
            {cashbox.required.foodFee > 0 && (
              <p className="text-xs text-white/35 mt-0.5">de {formatCurrency(cashbox.required.foodFee)}</p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/50 mb-1">Otros</p>
            <p className="text-2xl font-black text-white/60">{formatCurrency(cashbox.totals.other)}</p>
          </div>
        </div>
      )}

      {/* Food / comensales summary */}
      {Number(event?.foodFee ?? 0) > 0 && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-400">Comensales</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-white/40 mb-0.5">Pilotos</p>
              <p className="text-2xl font-black text-white">{totalPilotosComensales}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-0.5">Visitantes</p>
              <p className="text-2xl font-black text-white">{totalGuestComensales}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-0.5">Staff en pista</p>
              {editingStaff ? (
                <form onSubmit={(e) => { e.preventDefault(); updateStaffMutation.mutate(staffValue); }} className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" autoFocus
                    value={staffValue}
                    onChange={(e) => setStaffValue(parseInt(e.target.value) || 0)}
                    className="w-16 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm text-white focus:border-orange-400 focus:outline-none"
                  />
                  <button type="submit" disabled={updateStaffMutation.isPending} aria-label="Guardar cantidad de staff" className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50">
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setEditingStaff(false)} aria-label="Cancelar edición de staff" className="text-xs text-white/40 hover:text-white/70">
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setStaffValue(totalStaff); setEditingStaff(true); }}
                  className="flex items-center gap-1.5 text-left group"
                  title="Editar staff"
                  aria-label="Editar cantidad de staff"
                >
                  <span className="text-2xl font-black text-white group-hover:text-orange-300 transition-colors">{totalStaff}</span>
                  <Pencil className="h-3 w-3 text-white/30 group-hover:text-orange-400 transition-colors" />
                </button>
              )}
            </div>
            <div className="border-l border-white/10 pl-4">
              <p className="text-xs text-white/40 mb-0.5">Total comidas</p>
              <p className="text-2xl font-black text-orange-400">{totalComensales}</p>
            </div>
          </div>
        </div>
      )}

      {/* Visitantes / comensales sin piloto */}
      {Number(event?.foodFee ?? 0) > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Users className="h-4 w-4" /> Comensales visitantes
            </h2>
            {user?.role !== 'VALIDATOR' && (
              <button
                onClick={() => setShowGuestForm(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            )}
          </div>

          {showGuestForm && (
            <form
              onSubmit={(e) => { e.preventDefault(); addGuestMutation.mutate({ name: guestForm.name || undefined, count: guestForm.count, notes: guestForm.notes || undefined }); }}
              className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-white/10 bg-black/20"
            >
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-white/50 mb-1">Nombre / grupo (opcional)</label>
                <input
                  type="text"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                  placeholder="Ej: Familia García"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-racing-red focus:outline-none"
                />
              </div>
              <div className="w-20">
                <label className="block text-xs text-white/50 mb-1">Personas</label>
                <input
                  type="number" min="1" max="50"
                  value={guestForm.count}
                  onChange={(e) => setGuestForm({ ...guestForm, count: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white text-center focus:border-racing-red focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addGuestMutation.isPending} className="rounded-lg bg-racing-red px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  Guardar
                </button>
                <button type="button" onClick={() => setShowGuestForm(false)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 hover:bg-white/10 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {guests.length === 0 && !showGuestForm && (
            <p className="text-xs text-white/30 text-center py-2">Sin visitantes registrados</p>
          )}

          {guests.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-4 py-2.5">
              {editingGuest?.id === g.id ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); updateGuestMutation.mutate({ id: g.id, data: { name: editingGuest.name || undefined, count: editingGuest.count } }); }}
                  className="flex flex-1 gap-2 items-center flex-wrap"
                >
                  <input
                    type="text"
                    value={editingGuest.name ?? ''}
                    onChange={(e) => setEditingGuest({ ...editingGuest, name: e.target.value })}
                    placeholder="Nombre / grupo"
                    className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm text-white focus:border-racing-red focus:outline-none"
                  />
                  <input
                    type="number" min="1" max="50"
                    value={editingGuest.count}
                    onChange={(e) => setEditingGuest({ ...editingGuest, count: parseInt(e.target.value) || 1 })}
                    className="w-16 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-sm text-white text-center focus:border-racing-red focus:outline-none"
                  />
                  <button type="submit" disabled={updateGuestMutation.isPending} aria-label="Guardar visitante" className="text-green-400 hover:text-green-300 disabled:opacity-50"><CheckCircle className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setEditingGuest(null)} aria-label="Cancelar" className="text-white/40 hover:text-white/70"><X className="h-4 w-4" /></button>
                </form>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="text-sm text-white">{g.name ?? <span className="text-white/40 italic">Sin nombre</span>}</span>
                    <span className="ml-2 text-xs text-white/50">{g.count} {g.count === 1 ? 'persona' : 'personas'} · {formatCurrency(Number(event?.foodFee ?? 0) * g.count)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateGuestMutation.mutate({ id: g.id, data: { isPaid: !g.isPaid } })}
                      disabled={updateGuestMutation.isPending}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${g.isPaid ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-orange-400 bg-orange-400/10 hover:bg-orange-400/20'}`}
                    >
                      {g.isPaid ? 'Pagado' : 'Pendiente'}
                    </button>
                    {user?.role !== 'VALIDATOR' && (
                      <>
                        <button onClick={() => setEditingGuest(g)} aria-label="Editar visitante" className="text-white/25 hover:text-white/70 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={() => { if (!confirm(`¿Eliminar visitante?`)) return; deleteGuestMutation.mutate(g.id); }}
                          disabled={deleteGuestMutation.isPending}
                          aria-label="Eliminar visitante"
                          className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending receipts section — hidden for VALIDATOR */}
      {user?.role !== 'VALIDATOR' && inscriptions.filter((i) => i.status === 'RECEIPT_SUBMITTED').length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-400 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recibos pendientes ({inscriptions.filter((i) => i.status === 'RECEIPT_SUBMITTED').length})
          </h2>
          <div className="space-y-2">
            {inscriptions.filter((i) => i.status === 'RECEIPT_SUBMITTED').map((insc) => (
              <div key={insc.id} className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium text-white">{insc.pilot.name}</p>
                    <p className="text-xs text-white/50">{insc.category}</p>
                    {insc.receiptPath && (
                      <a
                        href={resolveMediaUrl(insc.receiptPath) ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-yellow-400 hover:text-yellow-300 underline underline-offset-2 mt-1 inline-block"
                      >
                        Ver comprobante
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveReceipt(insc.id)}
                      disabled={processingReceipt === insc.id}
                      className="flex items-center gap-1.5 rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleRejectReceipt(insc.id)}
                      disabled={processingReceipt === insc.id}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
          Registrar pago
        </h2>
        <div className="flex gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={inscSearch}
              onChange={(e) => { setInscSearch(e.target.value); setInscriptionsPage(1); }}
              placeholder="Buscar piloto..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
            />
          </div>
          {(event?.eventCategories.filter((c) => c.active) ?? []).length > 1 && (
            <select
              value={inscCategory}
              onChange={(e) => { setInscCategory(e.target.value); setInscriptionsPage(1); }}
              className="rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
            >
              <option value="">Todas las categorías</option>
              {(event?.eventCategories.filter((c) => c.active) ?? []).map((c) => (
                <option key={c.id} value={c.category}>{CATEGORY_LABELS[c.category] ?? c.category}</option>
              ))}
            </select>
          )}
          {(inscSearch || inscCategory) && (
            <button
              onClick={() => { setInscSearch(''); setInscCategory(''); setInscriptionsPage(1); }}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
        <div className="space-y-2">
          {inscriptions.map((insc) => {
            const paymentSummary = getPaymentSummary(insc);
            const canMarkCashPaid = insc.status !== 'PAID' && paymentSummary.outstanding > 0;

            return (
              <div key={insc.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white flex items-center gap-2">
                      {insc.pilot.name}
                      {(insc.exentoCarrera || insc.exentoComida) && (
                        <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded" title={`${insc.exentoCarrera ? 'Exento carrera' : ''}${insc.exentoCarrera && insc.exentoComida ? ' + ' : ''}${insc.exentoComida ? 'exento comida' : ''}`}>
                          EXENTO
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/50">
                      {insc.category} |{' '}
                      <span className={
                        insc.status === 'PAID' ? 'text-green-400' :
                        insc.status === 'RECEIPT_SUBMITTED' ? 'text-yellow-400' :
                        'text-orange-400'
                      }>
                        {insc.status === 'PAID' ? 'Pagado' :
                         insc.status === 'RECEIPT_SUBMITTED' ? 'Recibo enviado' :
                         'Pendiente'}
                      </span>{' '}|{' '}
                      Total: {formatCurrency(paymentSummary.totalPaid)} / {formatCurrency(paymentSummary.required)} | Saldo: {formatCurrency(paymentSummary.outstanding)}
                    </p>
                    {/* Comensales row */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Users className="h-3.5 w-3.5 text-white/40" />
                      {editingCompanions === insc.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateCompanionsMutation.mutate({ inscriptionId: insc.id, companions: companionsValue });
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={companionsValue}
                            onChange={(e) => setCompanionsValue(parseInt(e.target.value) || 0)}
                            className="w-16 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white focus:border-racing-red focus:outline-none"
                            autoFocus
                          />
                          <span className="text-xs text-white/40">comensales</span>
                          <button type="submit" disabled={updateCompanionsMutation.isPending} aria-label={`Guardar comensales de ${insc.pilot.name}`} className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingCompanions(null)} aria-label={`Cancelar edición de comensales de ${insc.pilot.name}`} className="text-xs text-white/40 hover:text-white/70">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setEditingCompanions(insc.id); setCompanionsValue(insc.companions); }}
                          className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors group"
                          title="Editar comensales"
                          aria-label={`Editar comensales de ${insc.pilot.name}`}
                        >
                          <span>{insc.companions} comensales</span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canMarkCashPaid && (
                      <button
                        onClick={() => handleMarkCashPaid(insc)}
                        disabled={processingCashPayment === insc.id || addPaymentMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {processingCashPayment === insc.id ? 'Registrando...' : 'Pagado efectivo'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (showForm === insc.id) { setShowForm(null); return; }
                        const s = getPaymentSummary(insc);
                        const type = s.serviceOutstanding > 0 ? 'SERVICE_FEE' : s.foodOutstanding > 0 ? 'FOOD_FEE' : 'OTHER';
                        const amount = type === 'SERVICE_FEE' ? String(s.serviceOutstanding) : type === 'FOOD_FEE' ? String(s.foodOutstanding) : '';
                        setForm({ type, amount, notes: '' });
                        setShowForm(insc.id);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Pago
                    </button>
                  </div>
                </div>

                {showForm === insc.id && (
                  <form onSubmit={handleAddPayment} className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    {/* Pending breakdown hint */}
                    {(() => {
                      const s = getPaymentSummary(insc);
                      return (s.serviceOutstanding > 0 || s.foodOutstanding > 0) ? (
                        <div className="flex gap-3 text-xs text-white/50">
                          {s.serviceOutstanding > 0 && (
                            <span>Servicio pendiente: <span className="text-blue-400 font-medium">{formatCurrency(s.serviceOutstanding)}</span></span>
                          )}
                          {s.foodOutstanding > 0 && (
                            <span>Comida pendiente: <span className="text-orange-400 font-medium">{formatCurrency(s.foodOutstanding)}</span></span>
                          )}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex gap-2 flex-wrap">
                    <select
                      value={form.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        const s = getPaymentSummary(insc);
                        const autoAmount =
                          type === 'SERVICE_FEE' && s.serviceOutstanding > 0 ? String(s.serviceOutstanding) :
                          type === 'FOOD_FEE' && s.foodOutstanding > 0 ? String(s.foodOutstanding) :
                          form.amount;
                        setForm({ ...form, type, amount: autoAmount });
                      }}
                      className="rounded-lg border border-white/10 bg-racing-dark px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
                    >
                      <option value="SERVICE_FEE">Cuota servicio</option>
                      <option value="FOOD_FEE">Cuota comida</option>
                      <option value="OTHER">Otro</option>
                    </select>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="Monto"
                      required
                      min="0"
                      step="0.01"
                      className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
                    />
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Notas (opcional)"
                      className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-racing-red focus:outline-none"
                    />
                    <button type="submit" className="rounded-lg bg-racing-red px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                      Guardar
                    </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PaginationControls
        page={inscriptionsPagination.page}
        totalPages={inscriptionsPagination.totalPages}
        total={inscriptionsPagination.total}
        itemLabel="inscripciones"
        onPageChange={setInscriptionsPage}
      />

      {cashbox && cashbox.payments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">Historial de pagos</h2>
          <div className="rounded-xl border border-white/10 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Piloto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Fecha</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cashbox.payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{p.inscription.pilot.name}</td>
                    <td className="px-4 py-3 text-white/60">
                      {p.type === 'SERVICE_FEE' ? 'Servicio' : p.type === 'FOOD_FEE' ? 'Comida' : 'Otro'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">
                      {formatCurrency(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {new Date(p.paidAt).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (!confirm(`¿Eliminar este pago de ${formatCurrency(Number(p.amount))} para ${p.inscription.pilot.name}? Si el piloto estaba marcado como pagado, su estado se revertirá.`)) return;
                          deletePaymentMutation.mutate(p.id);
                        }}
                        disabled={deletePaymentMutation.isPending}
                        aria-label={`Eliminar pago de ${p.inscription.pilot.name}`}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        title="Eliminar pago"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <PaginationControls
              page={cashbox.pagination.page}
              totalPages={cashbox.pagination.totalPages}
              total={cashbox.pagination.total}
              itemLabel="pagos"
              onPageChange={setPaymentsPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
