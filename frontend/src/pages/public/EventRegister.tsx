import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Upload, ArrowLeft } from 'lucide-react';
import { eventsApi, KartEvent, Category } from '../../api/events.api';
import { inscriptionsApi, SelfRegisterResponse } from '../../api/inscriptions.api';
import { CATEGORY_LABELS, formatCurrency } from '../../lib/utils';

const ALL_CATEGORIES: Category[] = [
  'SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS',
];

type Step = 'form' | 'payment' | 'done';

export function EventRegister() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<KartEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [registerResult, setRegisterResult] = useState<SelfRegisterResponse | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    kartNumber: '',
    category: '' as Category | '',
    notes: '',
  });

  useEffect(() => {
    if (!slug) return;
    eventsApi.get(slug).then(setEvent).finally(() => setLoadingEvent(false));
  }, [slug]);

  const activeCategories = event?.eventCategories.filter((c) => c.active).map((c) => c.category) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form.category) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await inscriptionsApi.selfRegister(slug, {
        name: form.name,
        alias: form.alias || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        kartNumber: form.kartNumber || undefined,
        category: form.category as Category,
        notes: form.notes || undefined,
      });
      setRegisterResult(result);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadReceipt = async () => {
    if (!slug || !registerResult || !receiptFile) return;
    setUploadingReceipt(true);
    setError('');
    try {
      await inscriptionsApi.uploadReceipt(slug, registerResult.inscription.id, receiptFile);
      setReceiptUploaded(true);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir comprobante');
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (loadingEvent) {
    return <div className="text-center py-20 text-white/40">Cargando...</div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-white/40">Evento no encontrado</div>;
  }

  if (event.status !== 'OPEN') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Volver al evento
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">Este evento no está abierto para inscripciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link to={`/eventos/${slug}`} className="text-sm text-white/50 hover:text-white flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {event.name}
        </Link>
      </div>

      <h1 className="text-2xl font-black text-white mb-6">Inscripción — {event.name}</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['form', 'payment', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? 'bg-racing-red text-white'
                  : i < ['form', 'payment', 'done'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {i < ['form', 'payment', 'done'].indexOf(step) ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < 2 && <div className={`h-px w-8 ${i < ['form', 'payment', 'done'].indexOf(step) ? 'bg-green-500' : 'bg-white/10'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-white/50">
          {step === 'form' ? 'Tus datos' : step === 'payment' ? 'Pago' : 'Confirmación'}
        </span>
      </div>

      {/* Step 1: Personal info form */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Nombre completo *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Juan Pérez"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Alias / Apodo</label>
            <input
              type="text"
              value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value })}
              placeholder="El Rayo"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="juan@ejemplo.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="5512345678"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Número de kart (opcional)</label>
            <input
              type="number"
              value={form.kartNumber}
              onChange={(e) => setForm({ ...form, kartNumber: e.target.value })}
              placeholder="42"
              min="1"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Categoría *</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.filter((c) => activeCategories.includes(c)).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.category === cat
                      ? 'border-racing-red bg-racing-red/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            {activeCategories.length === 0 && (
              <p className="text-sm text-white/40 mt-2">No hay categorías disponibles.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Cualquier información adicional..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.category}
            className="w-full rounded-lg bg-racing-red py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Registrando...' : 'Inscribirme'}
          </button>
        </form>
      )}

      {/* Step 2: Payment info + receipt upload */}
      {step === 'payment' && registerResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Inscripción registrada exitosamente. Ahora realiza el pago y sube tu comprobante.
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="font-semibold text-white">Monto a pagar</h2>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Cuota de servicio:</span>
              <span className="font-semibold text-white">{formatCurrency(Number(registerResult.serviceFee))}</span>
            </div>
            {Number(registerResult.foodFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Cuota de comida:</span>
                <span className="font-semibold text-white">{formatCurrency(Number(registerResult.foodFee))}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
              <span className="text-white">Total:</span>
              <span className="text-racing-red">
                {formatCurrency(Number(registerResult.serviceFee) + Number(registerResult.foodFee))}
              </span>
            </div>
          </div>

          {registerResult.transferInfo ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="font-semibold text-white mb-2">Datos de transferencia</h2>
              <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans">
                {registerResult.transferInfo}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
              El organizador te proporcionará los datos de pago.
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="font-semibold text-white">Subir comprobante de pago</h2>
            <p className="text-sm text-white/50">Formatos aceptados: JPG, PNG, PDF, WebP. Máx. 10MB.</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="flex-1 rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-white/50 hover:border-white/40 transition-colors">
                {receiptFile ? receiptFile.name : 'Seleccionar archivo...'}
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors">
                <Upload className="h-4 w-4" />
              </div>
            </label>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleUploadReceipt}
              disabled={!receiptFile || uploadingReceipt}
              className="w-full rounded-lg bg-racing-red py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {uploadingReceipt ? 'Subiendo...' : 'Enviar comprobante'}
            </button>

            <button
              onClick={() => setStep('done')}
              className="w-full rounded-lg border border-white/10 py-2.5 text-sm text-white/50 hover:bg-white/5 transition-colors"
            >
              Enviar después
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'done' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
          <h2 className="text-xl font-black text-white">
            {receiptUploaded ? '¡Comprobante enviado!' : '¡Inscripción registrada!'}
          </h2>
          <p className="text-sm text-white/60">
            {receiptUploaded
              ? 'Tu comprobante ha sido enviado. El organizador lo revisará y confirmará tu pago a la brevedad.'
              : 'Tu inscripción fue registrada. Recuerda realizar el pago y enviar tu comprobante para confirmar tu lugar.'}
          </p>
          {registerResult && !receiptUploaded && (
            <button
              onClick={() => setStep('payment')}
              className="rounded-lg bg-racing-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Subir comprobante
            </button>
          )}
          <div>
            <Link
              to={`/eventos/${slug}`}
              className="text-sm text-white/50 hover:text-white underline underline-offset-2"
            >
              Volver al evento
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
