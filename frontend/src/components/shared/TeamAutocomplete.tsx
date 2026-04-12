import { useEffect, useRef, useState } from 'react';
import { teamsApi, Team } from '../../api/teams.api';
import { Users } from 'lucide-react';

interface Props {
  value: string;           // team name (display)
  teamId: string | null;   // resolved team id
  onChange: (teamName: string, teamId: string | null) => void;
  placeholder?: string;
  label?: string;
}

export function TeamAutocomplete({ value, teamId, onChange, placeholder = 'Busca o crea un equipo', label = 'Equipo' }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display name when parent value changes (e.g. on data load)
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const data = await teamsApi.search(q);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Clear resolved teamId while typing (user is searching / will create)
    onChange(val, null);
    setOpen(true);
    search(val);
  };

  const handleSelect = (team: Team) => {
    setQuery(team.name);
    onChange(team.name, team.id);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    onChange('', null);
    setResults([]);
    setOpen(false);
  };

  const showCreateOption = query.trim().length >= 2 && !results.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      )}
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (query.trim()) { setOpen(true); search(query); } }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-8 py-2.5 text-sm text-white placeholder-white/30 focus:border-racing-red focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Resolved badge */}
      {teamId && (
        <p className="mt-1 text-xs text-green-400/80">Equipo seleccionado: {query}</p>
      )}
      {!teamId && query.trim().length >= 2 && (
        <p className="mt-1 text-xs text-yellow-400/70">Se creará el equipo "{query.trim()}" si no existe</p>
      )}

      {/* Dropdown */}
      {open && (query.trim().length >= 1) && (results.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a24] shadow-xl overflow-hidden">
          {results.map((team) => (
            <button
              key={team.id}
              type="button"
              onMouseDown={() => handleSelect(team)}
              className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Users className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
              <span>{team.name}</span>
              {team._count && (
                <span className="ml-auto text-xs text-white/30">{team._count.pilots} piloto(s)</span>
              )}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              onMouseDown={() => { onChange(query.trim(), null); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-racing-red hover:bg-white/10 transition-colors flex items-center gap-2 border-t border-white/5"
            >
              <span className="font-bold">+ Crear equipo</span>
              <span className="text-white/60">"{query.trim()}"</span>
            </button>
          )}
          {loading && (
            <div className="px-4 py-2.5 text-xs text-white/30">Buscando...</div>
          )}
        </div>
      )}
    </div>
  );
}
