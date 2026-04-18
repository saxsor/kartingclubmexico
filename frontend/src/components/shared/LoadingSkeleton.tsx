import { cn } from '../../lib/utils';

interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn('animate-pulse rounded bg-white/10', className)} />;
}

interface PageLoadingStateProps {
  showFilters?: boolean;
  cards?: number;
  rows?: number;
  className?: string;
}

export function PageLoadingState({
  showFilters = false,
  cards = 0,
  rows = 3,
  className,
}: PageLoadingStateProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-32 bg-white/5" />
      </div>

      {showFilters ? (
        <div className="flex flex-wrap gap-2">
          <SkeletonBlock className="h-10 min-w-[220px] flex-1" />
          <SkeletonBlock className="h-10 w-40" />
          <SkeletonBlock className="h-10 w-32" />
        </div>
      ) : null}

      {cards > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-4 w-full bg-white/5" />
              <SkeletonBlock className="h-4 w-2/3 bg-white/5" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-8 w-24" />
            </div>
            <SkeletonBlock className="h-4 w-3/4 bg-white/5" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-5 w-16 bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TableLoadingStateProps {
  rows?: number;
  className?: string;
}

export function TableLoadingState({ rows = 5, className }: TableLoadingStateProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-10 min-w-[220px] flex-1" />
        <SkeletonBlock className="h-10 w-40" />
        <SkeletonBlock className="h-10 w-32" />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 px-4 py-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-48 bg-white/5" />
              </div>
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface HeroLoadingStateProps {
  sections?: number;
  className?: string;
}

export function HeroLoadingState({ sections = 2, className }: HeroLoadingStateProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonBlock className="h-4 w-28 bg-white/5" />
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <SkeletonBlock className="h-56 w-full" />
        <SkeletonBlock className="h-6 w-24" />
        <SkeletonBlock className="h-12 w-2/3" />
        <SkeletonBlock className="h-4 w-40 bg-white/5" />
      </div>
      {Array.from({ length: sections }, (_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-4 w-full bg-white/5" />
          <SkeletonBlock className="h-4 w-5/6 bg-white/5" />
          <SkeletonBlock className="h-4 w-2/3 bg-white/5" />
        </div>
      ))}
    </div>
  );
}

interface InlineLoadingStateProps {
  lines?: number;
  className?: string;
}

export function InlineLoadingState({ lines = 2, className }: InlineLoadingStateProps) {
  return (
    <div className={cn('space-y-2 rounded-lg border border-white/10 bg-white/5 p-4', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock
          key={index}
          className={cn('h-4', index === lines - 1 ? 'w-2/3 bg-white/5' : 'w-full')}
        />
      ))}
    </div>
  );
}
