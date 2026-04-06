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
    <nav className="sticky top-0 z-50 border-b border-[#38383f] bg-[#15151e]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#e10600] group-hover:w-full transition-all duration-200" />
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/app/dashboard"
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/60 hover:text-white font-bold"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Link>
                <span className="text-white/20">|</span>
                <span className="text-xs text-white/50">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/60 hover:text-[#e10600] transition-colors font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors"
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
        <div className="border-t border-[#38383f] bg-[#1f1f27] px-4 py-4 space-y-3">
          {publicLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white py-1"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                to="/app/dashboard"
                className="block text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white py-1"
                onClick={() => setMobileOpen(false)}
              >
                Panel Admin
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="block text-xs font-bold uppercase tracking-widest text-[#e10600] py-1"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-block bg-[#e10600] hover:bg-[#b30500] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors"
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
