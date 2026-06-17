interface Props {
  progress: number;   // 0-100
  uploading: boolean;
  error?: string | null;
  label?: string;
}

export function UploadProgress({ progress, uploading, error, label = 'Subiendo archivo' }: Props) {
  if (!uploading && progress === 0 && !error) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className={error ? 'text-red-400' : 'text-white/60'}>
          {error ?? (progress === 100 ? '¡Listo!' : label)}
        </span>
        {!error && (
          <span className="font-mono text-white/40">{progress}%</span>
        )}
      </div>
      <div className="h-1 w-full bg-[#38383f] overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${
            error ? 'bg-red-500' : progress === 100 ? 'bg-green-500' : 'bg-[#f5c400]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
