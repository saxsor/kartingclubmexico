import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Flag, HelpCircle, Mail, ShieldCheck, Trophy, User, FileText, ChevronRight } from 'lucide-react';
import { SEO } from '../../components/shared/SEO';

function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 border-l-4 border-[#e10600] pl-4">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e10600]">{eyebrow}</p>
        <h1
          className="mt-3 text-4xl font-black uppercase text-white sm:text-5xl"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Mail;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e10600]/30 bg-[#e10600]/15">
          <Icon className="h-5 w-5 text-[#e10600]" />
        </div>
        <h2
          className="text-2xl font-black uppercase text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-3 text-sm leading-7 text-white/70">{children}</div>
    </section>
  );
}

function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-white underline decoration-[#e10600]/60 underline-offset-4 hover:text-[#e10600]">
      {children}
    </Link>
  );
}

export function ContactPage() {
  return (
    <PageShell
      eyebrow="Contacto"
      title="Soporte y atención"
      description="Karting Club México centraliza la operación pública en el calendario de eventos, el portal de piloto y las confirmaciones relacionadas con cada inscripción."
    >
      <SEO
        title="Contacto"
        description="Canales de atención y soporte operativo de Karting Club México para pilotos, inscripciones, resultados y seguimiento de eventos."
        url="/contacto"
      />
      <Card icon={Mail} title="Canales disponibles">
        <p>
          Para dudas sobre inscripciones, pagos, parrillas o resultados, el punto de partida correcto es el evento publicado en{' '}
          <InlineLink to="/eventos">Eventos</InlineLink>. Ahí encontrarás el contexto vigente de cada fecha.
        </p>
        <p>
          Si ya eres piloto registrado, utiliza <InlineLink to="/piloto">Soy piloto</InlineLink> para acceder a tu perfil, revisar tu historial y mantener tus datos actualizados.
        </p>
        <p>
          Después de una inscripción o cambio relevante, la plataforma emite correos de confirmación y seguimiento para mantener trazabilidad operativa.
        </p>
      </Card>
      <Card icon={Flag} title="Qué tipo de ayuda se atiende aquí">
        <ul className="space-y-2 text-white/75">
          <li>Inscripción a próximos eventos.</li>
          <li>Seguimiento de estado de pago y comprobantes.</li>
          <li>Consulta de parrillas, resultados y campeonato.</li>
          <li>Actualización de perfil de piloto y datos deportivos.</li>
        </ul>
      </Card>
      <Card icon={ChevronRight} title="Rutas rápidas">
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/eventos" className="border border-white/10 bg-[#1f1f27] px-4 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:border-[#e10600] hover:text-[#e10600]">
            Ver eventos
          </Link>
          <Link to="/campeonato" className="border border-white/10 bg-[#1f1f27] px-4 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:border-[#e10600] hover:text-[#e10600]">
            Ver campeonato
          </Link>
          <Link to="/piloto" className="border border-white/10 bg-[#1f1f27] px-4 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:border-[#e10600] hover:text-[#e10600]">
            Portal piloto
          </Link>
        </div>
      </Card>
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
      eyebrow="FAQ"
      title="Preguntas frecuentes"
      description="Una referencia rápida para entender cómo usar la plataforma pública de Karting Club México sin depender de soporte manual."
    >
      <SEO
        title="Preguntas frecuentes"
        description="Preguntas frecuentes sobre inscripciones, portal de piloto, parrillas, resultados y campeonato en Karting Club México."
        url="/preguntas-frecuentes"
      />
      <div className="grid gap-4">
        {faqs.map((item) => (
          <section key={item.q} className="border border-white/10 bg-white/5 p-6">
            <div className="mb-3 flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-[#e10600]" />
              <h2 className="text-lg font-bold uppercase tracking-wide text-white">{item.q}</h2>
            </div>
            <p className="text-sm leading-7 text-white/70">{item.a}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacidad"
      title="Aviso de privacidad"
      description="Este resumen explica el uso operativo de la información compartida por pilotos y usuarios dentro de la plataforma pública y administrativa de Karting Club México."
    >
      <SEO
        title="Aviso de privacidad"
        description="Resumen del aviso de privacidad operativo de Karting Club México para inscripciones, perfiles, pagos y comunicación de eventos."
        url="/privacidad"
      />
      <Card icon={ShieldCheck} title="Información que se procesa">
        <p>La plataforma puede procesar datos de identificación y operación deportiva como nombre, alias, correo, teléfono, equipo, número de kart, historial de eventos, estatus de inscripción y evidencia asociada a pagos o comprobantes.</p>
      </Card>
      <Card icon={CalendarDays} title="Finalidades operativas">
        <ul className="space-y-2 text-white/75">
          <li>Administrar inscripciones y seguimiento por evento.</li>
          <li>Publicar parrillas, resultados y tablas del campeonato.</li>
          <li>Permitir acceso al portal de piloto y actualización de perfil.</li>
          <li>Emitir confirmaciones y notificaciones relacionadas con la operación del club.</li>
        </ul>
      </Card>
      <Card icon={User} title="Exposición pública limitada">
        <p>La plataforma publica información deportiva necesaria para la operación del campeonato y la consulta de resultados. Los datos administrativos sensibles no forman parte de las vistas públicas generales.</p>
      </Card>
      <Card icon={FileText} title="Conservación y control">
        <p>Los datos se conservan para continuidad deportiva, administrativa y de trazabilidad. Si necesitas corregir información de tu perfil, la vía adecuada es el portal de piloto o la coordinación del evento correspondiente.</p>
      </Card>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell
      eyebrow="Términos"
      title="Términos de uso"
      description="Condiciones generales de uso para las secciones públicas y operativas de Karting Club México."
    >
      <SEO
        title="Términos de uso"
        description="Condiciones generales de uso del sitio y la plataforma operativa de Karting Club México."
        url="/terminos"
      />
      <Card icon={Trophy} title="Uso de la plataforma">
        <p>El sitio está diseñado para consulta pública de eventos, campeonato, parrillas y resultados, así como para la gestión operativa de pilotos e inscripciones cuando corresponda.</p>
      </Card>
      <Card icon={User} title="Responsabilidad de los usuarios">
        <p>Quien utilice el portal de piloto o cualquier flujo de inscripción debe proporcionar información veraz y mantener sus datos actualizados para evitar inconsistencias deportivas o administrativas.</p>
      </Card>
      <Card icon={Flag} title="Publicación deportiva">
        <p>La organización puede publicar información relacionada con el desarrollo de los eventos, incluyendo parrillas, clasificaciones, resultados y posiciones de campeonato.</p>
      </Card>
      <Card icon={ShieldCheck} title="Disponibilidad y cambios">
        <p>La plataforma puede actualizarse, ajustarse o interrumpirse por mantenimiento, operación de eventos o mejoras del sistema. Karting Club México puede modificar estas condiciones para mantener el sitio alineado con su operación.</p>
      </Card>
    </PageShell>
  );
}
