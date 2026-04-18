import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';

export function PublicLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#15151e] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
        <div key={location.pathname} className="route-enter">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-[#38383f] bg-[#15151e]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img
            src="/karting_club_logo.png"
            alt="Karting Club México"
            className="h-6 w-auto object-contain opacity-40"
          />
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Karting Club México — Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
