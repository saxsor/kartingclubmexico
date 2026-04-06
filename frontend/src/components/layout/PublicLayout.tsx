import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#15151e] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-[#38383f] bg-[#15151e]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#e10600]" />
            <span
              className="text-sm font-bold uppercase tracking-widest text-white/40"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Karting Club México
            </span>
          </div>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Karting Club México — Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
