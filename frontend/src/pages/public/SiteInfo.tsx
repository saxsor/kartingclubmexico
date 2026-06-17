import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Flag, HelpCircle, Mail, ShieldCheck, Trophy, User, FileText, ChevronRight, MessageCircle } from 'lucide-react';
import { SEO } from '../../components/shared/SEO';
import { cn } from '../../lib/utils';

function PageShell({
  eyebrow,
  title,
  icon: Icon,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: typeof HelpCircle;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-20">
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-[#f5c400] skew-x-[-15deg]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            {eyebrow}
          </span>
        </div>
        <h1
          className="text-5xl font-black text-white uppercase italic tracking-tighter"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title.split(' ')[0]} <span className="text-[#f5c400]">{title.split(' ').slice(1).join(' ')}</span>
        </h1>
        <div className="absolute top-0 right-0 hidden md:block opacity-10">
          <Icon className="w-24 h-24 text-white" />
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: typeof Mail;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 shadow-xl", className)}>
      <div className="border-b border-[#38383f] bg-[#1a1a21] px-6 py-4 flex items-center gap-3">
        <Icon className="h-4 w-4 text-[#f5c400]" />
        <h2
          className="text-lg font-black uppercase tracking-wider text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h2>
      </div>
      <div className="p-6 text-sm leading-7 text-white/60 space-y-4 font-sans">
        {children}
      </div>
    </section>
  );
}

function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-bold text-white hover:text-[#f5c400] transition-colors border-b border-white/20 hover:border-[#f5c400]">
      {children}
    </Link>
  );
}

export function ContactPage() {
  return (
    <PageShell
      eyebrow="Soporte"
      title="Contacto Directo"
      icon={Mail}
      description="Karting Club México centraliza la operación pública en el calendario de eventos, el portal de piloto y las confirmaciones relacionadas con cada inscripción."
    >
      <SEO
        title="Contacto"
        description="Canales de atención y soporte operativo de Karting Club México para pilotos, inscripciones, resultados y seguimiento de eventos."
        url="/contacto"
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card icon={MessageCircle} title="WhatsApp">
          <p>Atención directa para dudas rápidas sobre el reglamento o el estado de tu inscripción.</p>
          <a 
            href="https://wa.me/5212202736338" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-all rounded-md mt-2 w-full justify-center"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            +52 1 220 273 6338
          </a>
        </Card>

        <Card icon={Mail} title="Correo Electrónico">
          <p>Para envíos formales, comprobantes de pago adicionales o aclaraciones administrativas.</p>
          <a 
            href="mailto:contacto@eileendinoracer.com" 
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-all rounded-md mt-2 w-full justify-center"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            contacto@eileendinoracer.com
          </a>
        </Card>
      </div>

      <Card icon={Flag} title="Asistencia Operativa">
        <p>
          Si tienes dudas sobre una fecha específica, te recomendamos revisar primero el evento en{' '}
          <InlineLink to="/eventos">Eventos</InlineLink>. La mayoría de la información (horarios, costos, ubicación) se actualiza ahí en tiempo real.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-2">
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
            <ShieldCheck className="h-5 w-5 text-[#f5c400] mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs uppercase tracking-wider">Inscripciones</p>
              <p className="text-xs text-white/40 mt-1">Estado de pagos y validación de recibos.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
            <Trophy className="h-5 w-5 text-[#f5c400] mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs uppercase tracking-wider">Resultados</p>
              <p className="text-xs text-white/40 mt-1">Aclaraciones sobre puntos o posiciones.</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/eventos" className="group flex items-center justify-between border border-[#38383f] bg-[#1a1a21] px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:border-[#f5c400] hover:bg-[#f5c400]/5">
          Ver eventos <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#f5c400]" />
        </Link>
        <Link to="/campeonato" className="group flex items-center justify-between border border-[#38383f] bg-[#1a1a21] px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:border-[#f5c400] hover:bg-[#f5c400]/5">
          Ver campeonato <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#f5c400]" />
        </Link>
        <Link to="/piloto" className="group flex items-center justify-between border border-[#38383f] bg-[#1a1a21] px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:border-[#f5c400] hover:bg-[#f5c400]/5">
          Portal piloto <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#f5c400]" />
        </Link>
      </div>
    </PageShell>
  );
}

export function FAQPage() {
  const faqs = [
    {
      q: '¿Cómo me inscribo a un evento?',
      a: 'Entra a la sección de Eventos, abre la fecha correspondiente y usa la acción de inscripción cuando el evento esté abierto.',
    },
    {
      q: '¿Dónde veo mi historial como piloto?',
      a: 'El portal de piloto permite revisar tus participaciones, editar datos personales y dar seguimiento a eventos abiertos.',
    },
    {
      q: '¿Cuándo aparecen la parrilla y los resultados?',
      a: 'La parrilla se publica por evento cuando la organización la genera. Los resultados aparecen durante o después de la jornada según el estado operativo del evento.',
    },
    {
      q: '¿Cómo consulto el campeonato?',
      a: 'La sección Campeonato concentra la clasificación pública y las tablas por categoría disponibles en la temporada vigente.',
    },
    {
      q: '¿Qué pasa si mi evento ya terminó?',
      a: 'La fecha permanece visible como histórico con sus resultados publicados y, cuando aplica, con acceso a los pilotos inscritos y a la clasificación final.',
    },
    {
      q: '¿Cómo actualizo mis datos o mi foto?',
      a: 'Accede con tu perfil de piloto y realiza los cambios desde el portal. Esa es la vía correcta para mantener consistencia deportiva y administrativa.',
    },
  ];

  return (
    <PageShell
      eyebrow="Ayuda"
      title="Preguntas Frecuentes"
      icon={HelpCircle}
      description="Una referencia rápida para entender cómo usar la plataforma pública de Karting Club México sin depender de soporte manual."
    >
      <SEO
        title="Preguntas frecuentes"
        description="Preguntas frecuentes sobre inscripciones, portal de piloto, parrillas, resultados y campeonato en Karting Club México."
        url="/preguntas-frecuentes"
      />
      <div className="grid gap-4">
        {faqs.map((item, idx) => (
          <section key={item.q} className="overflow-hidden rounded-lg border border-[#38383f] bg-[#1f1f27]/50 transition-all hover:border-white/20 group">
            <div className="px-6 py-5 flex items-start gap-4">
              <span className="font-black text-2xl italic text-[#f5c400]/20 group-hover:text-[#f5c400]/40 transition-colors" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {(idx + 1).toString().padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-base font-bold uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {item.q}
                </h2>
                <p className="text-sm leading-7 text-white/50">{item.a}</p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Aviso Privacidad"
      icon={ShieldCheck}
      description="Este resumen explica el uso operativo de la información compartida por pilotos y usuarios dentro de la plataforma pública y administrativa de Karting Club México."
    >
      <SEO
        title="Aviso de privacidad"
        description="Resumen del aviso de privacidad operativo de Karting Club México para inscripciones, perfiles, pagos y comunicación de eventos."
        url="/privacidad"
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card icon={ShieldCheck} title="Datos Procesados">
          <p>La plataforma procesa datos de identificación y operación deportiva como nombre, alias, correo, teléfono, equipo, número de kart e historial de eventos.</p>
        </Card>
        <Card icon={CalendarDays} title="Finalidad">
          <ul className="list-disc pl-4 space-y-2 opacity-80">
            <li>Administrar inscripciones por evento.</li>
            <li>Publicar parrillas y resultados.</li>
            <li>Acceso al portal de piloto.</li>
            <li>Notificaciones operativas.</li>
          </ul>
        </Card>
      </div>
      <Card icon={User} title="Exposición Pública">
        <p>La plataforma publica información deportiva necesaria para la operación del campeonato. Los datos administrativos sensibles (como identificaciones oficiales o documentos privados) no forman parte de las vistas públicas generales.</p>
      </Card>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Términos Uso"
      icon={FileText}
      description="Condiciones generales de uso para las secciones públicas y operativas de Karting Club México."
    >
      <SEO
        title="Términos de uso"
        description="Condiciones generales de uso del sitio y la plataforma operativa de Karting Club México."
        url="/terminos"
      />
      <div className="grid gap-6">
        <Card icon={Trophy} title="Uso de la Plataforma">
          <p>El sitio está diseñado para consulta pública de eventos, campeonato, parrillas y resultados, así como para la gestión operativa de pilotos e inscripciones cuando corresponda.</p>
        </Card>
        <Card icon={User} title="Responsabilidad">
          <p>Quien utilice el portal de piloto o cualquier flujo de inscripción debe proporcionar información veraz y mantener sus datos actualizados para evitar inconsistencias deportivas o administrativas.</p>
        </Card>
        <Card icon={Flag} title="Publicación">
          <p>La organización se reserva el derecho de publicar información relacionada con el desarrollo de los eventos, incluyendo parrillas, clasificaciones, resultados y posiciones de campeonato.</p>
        </Card>
      </div>
    </PageShell>
  );
}
