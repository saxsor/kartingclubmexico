import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#15151e] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Checkered pattern */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="opacity-20">
              <defs>
                <pattern id="checker-404" width="16" height="16" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="white"/>
                  <rect x="8" y="8" width="8" height="8" fill="white"/>
                </pattern>
              </defs>
              <rect width="80" height="80" fill="url(#checker-404)"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-full bg-[#f5c400] absolute left-1/2 -translate-x-1/2" />
            </div>
          </div>
        </div>

        <div className="mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#f5c400]">Error</span>
        </div>
        <h1
          className="text-8xl font-black text-white uppercase leading-none mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          404
        </h1>
        <p className="text-white/40 text-sm uppercase tracking-widest mb-8">
          Página no encontrada
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="bg-[#f5c400] hover:bg-[#d99a00] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#111111] transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            to="/eventos"
            className="border border-[#38383f] hover:border-white/40 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
          >
            Ver eventos
          </Link>
        </div>
      </div>
    </div>
  );
}
