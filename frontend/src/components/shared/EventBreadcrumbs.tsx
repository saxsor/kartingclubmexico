import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EventBreadcrumbsProps {
  eventName?: string | null;
  eventSlug: string;
  currentLabel?: string;
}

function fallbackEventLabel(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function EventBreadcrumbs({
  eventName,
  eventSlug,
  currentLabel,
}: EventBreadcrumbsProps) {
  const resolvedEventName = eventName?.trim() || fallbackEventLabel(eventSlug);

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs uppercase tracking-[0.2em] text-white/35">
      <Link to="/app/eventos" className="transition-colors hover:text-white/70">
        Eventos
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-white/20" />
      <Link to={`/app/eventos/${eventSlug}`} className="transition-colors hover:text-white/70">
        {resolvedEventName}
      </Link>
      {currentLabel ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-white/20" />
          <span className="text-white/60">{currentLabel}</span>
        </>
      ) : null}
    </nav>
  );
}
