import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Calendar, ClipboardList, DollarSign,
  CheckSquare, Shuffle, Flag, BarChart2, UserCog, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Dashboard', to: '/app/dashboard', icon: BarChart2 },
  { label: 'Pilotos', to: '/app/pilotos', icon: Users },
  { label: 'Eventos', to: '/app/eventos', icon: Calendar },
  { label: 'Usuarios', to: '/app/usuarios', icon: UserCog, adminOnly: true },
];

export function AdminLayout() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN',
  );

  return (
    <div className="flex h-screen bg-racing-dark text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col bg-racing-gray border-r border-white/10 transition-transform duration-300',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
          <Trophy className="h-6 w-6 text-racing-red" />
          <span className="font-bold text-lg">Karting Club México</span>
          <button
            className="ml-auto lg:hidden text-white/50"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-racing-red text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10',
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-racing-red flex items-center justify-center text-sm font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-white/50 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors"
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
        <header className="flex h-16 items-center gap-4 border-b border-white/10 px-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-racing-red" />
            <span className="font-bold">Karting Club México</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-racing-dark p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
