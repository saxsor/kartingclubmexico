import { X } from 'lucide-react';
import { useToastStore } from '../../store/toast.store';

const STYLES = {
  error: 'border-l-[3px] border-[#e10600] bg-[#1f1f27] text-white',
  success: 'border-l-[3px] border-green-500 bg-[#1f1f27] text-white',
  info: 'border-l-[3px] border-white/30 bg-[#1f1f27] text-white',
};

const DOT = {
  error: 'bg-[#e10600]',
  success: 'bg-green-500',
  info: 'bg-white/40',
};

export function Toaster() {
  const { toasts, startExit } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-3 px-4 py-3 shadow-lg pointer-events-auto',
            STYLES[t.type],
            t.exiting
              ? 'animate-out slide-out-to-right-4 fade-out duration-200 fill-mode-forwards'
              : 'animate-in slide-in-from-right-4 fade-in duration-200',
          ].join(' ')}
        >
          <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${DOT[t.type]}`} />
          <p className="text-sm flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => startExit(t.id)}
            aria-label="Cerrar notificación"
            className="text-white/30 hover:text-white transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
