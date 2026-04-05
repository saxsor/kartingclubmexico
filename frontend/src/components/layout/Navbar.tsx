import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Menu, X, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

interface NavLink {
  label: string;
  to: string;
}

const publicLinks: NavLink[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Campeonato', to: '/campeonato' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-racing-dark/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white">
            <Trophy className="h-6 w-6 text-racing-red" />
            <span className="font-bold text-lg tracking-tight">Karting Club México</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/app/dashboard"
                  className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Link>
                <span className="text-white/30">|</span>
                <span className="text-sm text-white/60">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-white/70 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-racing-red px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Ingresar
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white/70 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn('md:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="border-t border-white/10 px-4 py-3 space-y-3">
          {publicLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block text-sm text-white/70 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                to="/app/dashboard"
                className="block text-sm text-white/70 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                Panel Admin
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="block text-sm text-red-400"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="block text-sm font-medium text-racing-red"
              onClick={() => setMobileOpen(false)}
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
