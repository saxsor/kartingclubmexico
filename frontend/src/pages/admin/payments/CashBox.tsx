import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useParams } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, FileText, Download, Trash2, Users, Pencil, X } from 'lucide-react';
import { downloadCsv } from '../../../lib/download';
import { paymentsApi } from '../../../api/payments.api';
import { eventsApi } from '../../../api/events.api';
import { inscriptionsApi, type Inscription } from '../../../api/inscriptions.api';
import { formatCurrency, resolveMediaUrl } from '../../../lib/utils';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { queryKeys } from '../../../lib/react-query';

export function CashBox() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [showForm, setShowForm] = useState<string | null>(null); // inscriptionId
  const [form, setForm] = useState({ type: 'SERVICE_FEE', amount: '', notes: '' });
  const [processingReceipt, setProcessingReceipt] = useState<string | null>(null);
  const [processingCashPayment, setProcessingCashPayment] = useState<string | null>(null);
  const [editingCompanions, setEditingCompanions] = useState<string | null>(null); // inscriptionId
  const [companionsValue, setCompanionsValue] = useState<number>(0);
  const [inscriptionsPage, setInscriptionsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
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
  const inscriptionsQuery = useQuery({
    queryKey: slug ? queryKeys.inscriptions.list(slug, { page: inscriptionsPage, pageSize: 10 }) : ['inscriptions', 'list', 'missing'],
    queryFn: () => inscriptionsApi.list(slug!, { page: inscriptionsPage, pageSize: 10 }),
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

  const cashbox = cashboxQuery.data ?? null;
  const event = eventQuery.data ?? null;
  const inscriptions = inscriptionsQuery.data?.items ?? [];
  const inscriptionsPagination = inscriptionsQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const loading = cashboxQuery.isLoading || inscriptionsQuery.isLoading || eventQuery.isLoading;

  const getPaymentSummary = (inscription: Inscription) => {
    const serviceFee = Number(event?.serviceFee ?? 0);
    const foodFee = Number(event?.foodFee ?? 0);
    const totalFoodFee = foodFee * (inscription.companions + 1);
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

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Caja — {slug}</h1>
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
          {[
            { label: 'Total recaudado', value: cashbox.totals.total, color: 'text-green-400' },
            { label: 'Cuota de servicio', value: cashbox.totals.serviceFee, color: 'text-blue-400' },
            { label: 'Cuota de comida', value: cashbox.totals.foodFee, color: 'text-orange-400' },
            { label: 'Otros', value: cashbox.totals.other, color: 'text-white/60' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 mb-1">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{formatCurrency(stat.value)}</p>
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
        <div className="space-y-2">
          {inscriptions.map((insc) => {
            const paymentSummary = getPaymentSummary(insc);
            const canMarkCashPaid = insc.status !== 'PAID' && paymentSummary.outstanding > 0;

            return (
              <div key={insc.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{insc.pilot.name}</p>
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
                          <span className="text-xs text-white/40">acomp. ({companionsValue + 1} total)</span>
                          <button type="submit" disabled={updateCompanionsMutation.isPending} className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingCompanions(null)} className="text-xs text-white/40 hover:text-white/70">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setEditingCompanions(insc.id); setCompanionsValue(insc.companions); }}
                          className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors group"
                          title="Editar comensales"
                        >
                          <span>{insc.companions} acomp. · {insc.companions + 1} comensales en total</span>
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
                      onClick={() => setShowForm(showForm === insc.id ? null : insc.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Pago
                    </button>
                  </div>
                </div>

                {showForm === insc.id && (
                  <form onSubmit={handleAddPayment} className="mt-3 pt-3 border-t border-white/10 flex gap-2 flex-wrap">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
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
