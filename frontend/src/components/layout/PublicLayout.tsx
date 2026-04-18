import { Link, Outlet, useLocation } from 'react-router-dom';
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
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:px-8">
          <div>
            <img
              src="/karting_club_logo.png"
              alt="Karting Club México"
              className="h-8 w-auto object-contain"
            />
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/55">
              Plataforma oficial para consultar eventos, seguir resultados, revisar campeonato y operar el portal de pilotos de Karting Club México.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Explorar</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
              <Link to="/eventos" className="hover:text-white">Eventos</Link>
              <Link to="/campeonato" className="hover:text-white">Campeonato</Link>
              <Link to="/piloto" className="hover:text-white">Portal de piloto</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Información</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
              <Link to="/preguntas-frecuentes" className="hover:text-white">Preguntas frecuentes</Link>
              <Link to="/contacto" className="hover:text-white">Contacto</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Legal</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
              <Link to="/privacidad" className="hover:text-white">Aviso de privacidad</Link>
              <Link to="/terminos" className="hover:text-white">Términos de uso</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-white/30 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>© {new Date().getFullYear()} Karting Club México — Todos los derechos reservados.</p>
            <p>Resultados, parrillas y seguimiento de temporada en una sola plataforma.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
