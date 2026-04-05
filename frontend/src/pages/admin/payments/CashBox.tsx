import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DollarSign, Plus } from 'lucide-react';
import { paymentsApi, CashBoxData } from '../../../api/payments.api';
import { inscriptionsApi, Inscription } from '../../../api/inscriptions.api';
import { formatCurrency } from '../../../lib/utils';

export function CashBox() {
  const { slug } = useParams<{ slug: string }>();
  const [cashbox, setCashbox] = useState<CashBoxData | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [showForm, setShowForm] = useState<string | null>(null); // inscriptionId
  const [form, setForm] = useState({ type: 'SERVICE_FEE', amount: '', notes: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!slug) return;
    const [cb, insc] = await Promise.all([
      paymentsApi.getCashBox(slug),
      inscriptionsApi.list(slug),
    ]);
    setCashbox(cb);
    setInscriptions(insc);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !showForm) return;
    await paymentsApi.addPayment(slug, showForm, {
      type: form.type,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
    });
    setShowForm(null);
    setForm({ type: 'SERVICE_FEE', amount: '', notes: '' });
    load();
  };

  if (loading) return <div className="text-center py-20 text-white/40">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black text-white">Caja — {slug}</h1>

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

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
          Registrar pago
        </h2>
        <div className="space-y-2">
          {inscriptions.map((insc) => (
            <div key={insc.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{insc.pilot.name}</p>
                  <p className="text-xs text-white/50">
                    {insc.category} |{' '}
                    <span className={insc.status === 'PAID' ? 'text-green-400' : 'text-orange-400'}>
                      {insc.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                    </span>{' '}|{' '}
                    Total: {formatCurrency(insc.payments.reduce((s, p) => s + Number(p.amount), 0))}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(showForm === insc.id ? null : insc.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Pago
                </button>
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
          ))}
        </div>
      </div>

      {cashbox && cashbox.payments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">Historial de pagos</h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Piloto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Fecha</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
