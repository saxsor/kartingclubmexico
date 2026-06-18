import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { brandConfig } from '../../config/brand';

interface NavLink {
  label: string;
  to: string;
}

const publicLinks: NavLink[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Campeonato', to: '/campeonato' },
  { label: 'FAQ', to: '/preguntas-frecuentes' },
  { label: 'Contacto', to: '/contacto' },
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
          <Link to="/" className="flex items-center gap-3">
            <img
              src={brandConfig.instanceLogo}
              alt={brandConfig.instanceName}
              className="h-9 w-auto object-contain"
            />
            <span className="hidden border-l border-white/10 pl-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/35 min-[420px]:block">
              {brandConfig.poweredByLabel}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => cn(
                  'group relative text-xs font-bold uppercase tracking-widest transition-colors',
                  isActive ? 'text-white' : 'text-white/60 hover:text-white',
                )}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    <span className={cn(
                      'absolute -bottom-1 left-0 h-0.5 bg-[#f5c400] transition-all duration-200',
                      isActive ? 'w-full' : 'w-0 group-hover:w-full',
                    )} />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user?.role === 'PILOT' ? (
              <>
                <Link
                  to="/piloto/perfil"
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/60 hover:text-white font-bold"
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </Link>
                <span className="text-white/20">|</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/60 hover:text-[#f5c400] transition-colors font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </>
            ) : isAuthenticated ? (
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
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/60 hover:text-[#f5c400] transition-colors font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/piloto"
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Soy piloto
                </Link>
                <Link
                  to="/login"
                  className="bg-[#f5c400] hover:bg-[#d99a00] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#111111] transition-colors"
                >
                  Ingresar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white/70 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn('md:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="border-t border-[#38383f] bg-[#1f1f27] px-4 py-4 space-y-3">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => cn(
                'block text-xs font-bold uppercase tracking-widest py-1 border-l-2 pl-3 transition-colors',
                isActive
                  ? 'border-[#f5c400] text-white'
                  : 'border-transparent text-white/60 hover:text-white',
              )}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated && user?.role === 'PILOT' ? (
            <>
              <Link
                to="/piloto/perfil"
                className="block text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white py-1"
                onClick={() => setMobileOpen(false)}
              >
                Mi perfil
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="block text-xs font-bold uppercase tracking-widest text-[#f5c400] py-1"
              >
                Cerrar sesión
              </button>
            </>
          ) : isAuthenticated ? (
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
                className="block text-xs font-bold uppercase tracking-widest text-[#f5c400] py-1"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link
                to="/piloto"
                className="block text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white py-1"
                onClick={() => setMobileOpen(false)}
              >
                Soy piloto
              </Link>
              <Link
                to="/login"
                className="inline-block bg-[#f5c400] hover:bg-[#d99a00] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#111111] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Ingresar
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
