import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function PublicLayout() {
  return (
    <div className="min-h-screen racing-gradient text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-white/10 py-8 text-center text-sm text-white/40">
        <p>Karting Club México · Karting Club México · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
