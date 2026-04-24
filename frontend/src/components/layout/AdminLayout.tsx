import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Calendar, BarChart2, UserCog, LogOut, Menu, X, Trophy, ShieldCheck,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useRouteScrollTop } from '../../hooks/useRouteScrollTop';

const navItems = [
  { label: 'Dashboard', to: '/app/dashboard', icon: BarChart2, minRole: 'ORGANIZER' },
  { label: 'Pilotos', to: '/app/pilotos', icon: Users, minRole: 'ORGANIZER' },
  { label: 'Eventos', to: '/app/eventos', icon: Calendar, minRole: 'VALIDATOR' },
  { label: 'Campeonatos', to: '/app/campeonatos', icon: Trophy, minRole: 'ORGANIZER' },
  { label: 'Equipos', to: '/app/equipos', icon: ShieldCheck, adminOnly: true },
  { label: 'Usuarios', to: '/app/usuarios', icon: UserCog, adminOnly: true },
];

export function AdminLayout() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  useRouteScrollTop(mainRef);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'PILOT') return <Navigate to="/piloto/perfil" replace />;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => {
    if (item.adminOnly) return user?.role === 'ADMIN';
    if (item.minRole === 'VALIDATOR') return true;
    if (item.minRole === 'ORGANIZER') return user?.role === 'ADMIN' || user?.role === 'ORGANIZER';
    return true;
  });
  const mobileNavItems = filteredNav.slice(0, 5);

  return (
    <div className="racing-carbon-bg flex h-screen text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'racing-carbon-surface fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col border-r border-[#38383f] transition-transform duration-300',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Sidebar header / logo */}
        <div className="flex h-16 items-center px-5 border-b border-[#38383f]">
          <img
            src="/karting_club_logo.png"
            alt="Karting Club México"
            className="h-8 w-auto object-contain"
          />
          <button
            className="ml-auto lg:hidden text-white/40 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú lateral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors',
                  isActive
                    ? 'bg-[#e10600] text-white'
                    : 'text-white/50 hover:text-white hover:bg-[#2a2a35]',
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#38383f] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 bg-[#e10600] flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#e10600] hover:bg-[#2a2a35] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="racing-carbon-surface flex h-16 items-center gap-4 border-b border-[#38383f] px-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú lateral"
            className="text-white/50 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <img
            src="/karting_club_logo.png"
            alt="Karting Club México"
            className="h-7 w-auto object-contain"
          />
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 pb-28 lg:pb-6">
          <div key={location.pathname} className="route-enter mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="racing-carbon-surface fixed inset-x-0 bottom-0 z-40 border-t border-[#38383f] px-2 py-2 lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors',
                  isActive
                    ? 'bg-[#e10600] text-white'
                    : 'text-white/45 hover:bg-[#2a2a35] hover:text-white',
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
