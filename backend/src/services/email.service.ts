import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (config.NODE_ENV !== 'production') {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    }
    return;
  }

  const MAX_ATTEMPTS = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await t.sendMail({ from: config.SMTP_FROM, to, subject, html });
      return;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

// ─── Base layout ──────────────────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  const logoUrl = `${config.APP_URL}/karting_club_logo.png`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#111318;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111318;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="${logoUrl}" alt="Karting Club México" width="80" height="80"
                style="display:block;width:80px;height:auto;object-fit:contain;" />
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.35);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
                Karting Club México
              </p>
            </td>
          </tr>

          <!-- Red accent line -->
          <tr>
            <td style="background:#e10600;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a21;padding:32px 28px;color:#fff;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:11px;letter-spacing:1px;">
                Karting Club México &nbsp;·&nbsp; kartingclubmexico.mktjal.dpdns.org
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#e10600;color:#fff;padding:14px 28px;font-weight:900;font-size:12px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:20px;">${label}</a>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />`;
}

function eyebrow(text: string): string {
  return `<p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#e10600;letter-spacing:3px;text-transform:uppercase;">${text}</p>`;
}

// ─── Pilot Magic Link ─────────────────────────────────────────────────────────

export async function sendPilotMagicLinkEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${config.APP_URL}/piloto/acceso/${token}`;
  const html = baseLayout('Acceso a tu perfil de piloto', `
    ${eyebrow('Pilot Portal')}
    <h2 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">
      Accede a tu perfil
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">
      Hola <strong style="color:#fff;">${name}</strong>, aquí está tu enlace de acceso al portal de piloto de Karting Club México.
    </p>
    ${btn('Entrar a mi perfil', url)}
    ${divider()}
    <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;line-height:1.6;">
      Este enlace expira en 24 horas y solo puede usarse una vez.<br/>Si no lo solicitaste, puedes ignorar este correo.
    </p>
  `);
  await send(to, 'Acceso a tu perfil — Karting Club México', html);
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${config.APP_URL}/recuperar-contrasena/${token}`;
  const html = baseLayout('Recuperar contraseña', `
    ${eyebrow('Seguridad')}
    <h2 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">
      Recuperar contraseña
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">
      Hola <strong style="color:#fff;">${name}</strong>, recibimos una solicitud para restablecer tu contraseña de administrador.
    </p>
    ${btn('Restablecer contraseña', resetUrl)}
    ${divider()}
    <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;line-height:1.6;">
      Este enlace expira en 1 hora.<br/>Si no solicitaste esto, ignora este correo.
    </p>
  `);
  await send(to, 'Recuperar contraseña — Karting Club México', html);
}

// ─── Inscription confirmation ─────────────────────────────────────────────────

interface InscriptionInfo {
  pilotName: string;
  eventName: string;
  category: string;
  serviceFee: number;
  foodFee: number;
  transferInfo?: string | null;
  eventUrl: string;
}

export async function sendInscriptionConfirmation(to: string, info: InscriptionInfo): Promise<void> {
  const total = info.serviceFee + info.foodFee;
  const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const html = baseLayout('Inscripción registrada', `
    ${eyebrow('Inscripción')}
    <h2 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">
      ¡Inscripción registrada!
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">
      Hola <strong style="color:#fff;">${info.pilotName}</strong>, tu inscripción en
      <strong style="color:#fff;">${info.eventName}</strong> ha sido registrada correctamente.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;">Categoría</p>
        <p style="margin:4px 0 0;color:#fff;font-weight:700;font-size:15px;">${info.category}</p>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;">Cuota de servicio</p>
        <p style="margin:4px 0 0;color:#fff;font-weight:700;">${fmtMXN(info.serviceFee)}</p>
      </td></tr>
      ${info.foodFee > 0 ? `<tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;">Cuota de alimentos</p>
        <p style="margin:4px 0 0;color:#fff;font-weight:700;">${fmtMXN(info.foodFee)}</p>
      </td></tr>` : ''}
      <tr><td style="padding:16px;">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;">Total a pagar</p>
        <p style="margin:6px 0 0;color:#e10600;font-weight:900;font-size:24px;">${fmtMXN(total)}</p>
      </td></tr>
    </table>

    ${info.transferInfo ? `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;">Datos de pago</p>
      <pre style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;white-space:pre-wrap;font-family:monospace;">${info.transferInfo}</pre>
    </div>` : ''}

    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 4px;line-height:1.6;">
      Realiza tu pago y sube el comprobante desde el evento para confirmar tu lugar.
    </p>
    ${btn('Ver evento', info.eventUrl)}
  `);
  await send(to, `Inscripción registrada — ${info.eventName} · Karting Club México`, html);
}

// ─── Payment approved ─────────────────────────────────────────────────────────

export async function sendPaymentApprovedEmail(
  to: string,
  pilotName: string,
  eventName: string,
  eventUrl: string,
): Promise<void> {
  const html = baseLayout('Pago aprobado', `
    ${eyebrow('Pago confirmado')}
    <h2 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">
      ¡Pago aprobado!
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 12px;line-height:1.6;">
      Hola <strong style="color:#fff;">${pilotName}</strong>, tu pago para
      <strong style="color:#fff;">${eventName}</strong> ha sido verificado y aprobado.
    </p>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 4px;line-height:1.6;">
      Tu inscripción está confirmada. ¡Nos vemos en la pista!
    </p>
    ${btn('Ver parrilla', eventUrl)}
  `);
  await send(to, `Pago aprobado — ${eventName} · Karting Club México`, html);
}

// ─── Results published ────────────────────────────────────────────────────────

interface ResultInfo {
  pilotName: string;
  eventName: string;
  category: string;
  position: number;
  totalPoints: number;
  resultsUrl: string;
}

export async function sendResultsPublishedEmail(to: string, info: ResultInfo): Promise<void> {
  const positionLabel =
    info.position === 1 ? '1er lugar' :
    info.position === 2 ? '2do lugar' :
    info.position === 3 ? '3er lugar' :
    `${info.position}° lugar`;

  const html = baseLayout('Resultados publicados', `
    ${eyebrow('Resultados')}
    <h2 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">
      Resultados publicados
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">
      Hola <strong style="color:#fff;">${info.pilotName}</strong>, los resultados de
      <strong style="color:#fff;">${info.eventName}</strong> — ${info.category} ya están disponibles.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(225,6,0,0.08);border:1px solid rgba(225,6,0,0.2);margin-bottom:24px;">
      <tr><td style="padding:24px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">Tu posición final</p>
        <p style="margin:8px 0 0;font-size:42px;font-weight:900;color:#e10600;line-height:1;">${positionLabel}</p>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">${info.totalPoints} puntos en este evento</p>
      </td></tr>
    </table>

    ${btn('Ver resultados completos', info.resultsUrl)}
  `);
  await send(to, `Resultados ${info.eventName} — Karting Club México`, html);
}
