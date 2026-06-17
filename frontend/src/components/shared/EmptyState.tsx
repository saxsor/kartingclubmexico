import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-[#38383f]">
      <div className="flex h-16 w-16 items-center justify-center bg-[#1f1f27] border border-[#38383f] mb-4">
        <Icon className="h-7 w-7 text-white/20" strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-black text-white uppercase tracking-wide mb-1"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-white/40 max-w-sm mb-5">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            to={action.href}
            className="inline-flex items-center gap-2 bg-[#f5c400] hover:bg-[#d99a00] px-5 py-2 text-sm font-bold uppercase tracking-wider text-[#111111] transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 bg-[#f5c400] hover:bg-[#d99a00] px-5 py-2 text-sm font-bold uppercase tracking-wider text-[#111111] transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
