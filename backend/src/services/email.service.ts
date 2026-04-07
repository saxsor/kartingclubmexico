import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Create transporter lazily so the server still starts if SMTP is not configured
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
    // SMTP not configured — log to console in dev
    if (config.NODE_ENV !== 'production') {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    }
    return;
  }
  await t.sendMail({ from: config.SMTP_FROM, to, subject, html });
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#15151e;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#15151e;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#e10600;padding:12px 24px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">
                EDEL RACING
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1f1f27;padding:28px 24px;color:#fff;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;">
                Karting Club México · Edel Racing
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
  return `<a href="${href}" style="display:inline-block;background:#e10600;color:#fff;padding:12px 24px;font-weight:700;font-size:13px;text-decoration:none;letter-spacing:1px;text-transform:uppercase;margin-top:16px;">${label}</a>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;" />`;
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${config.APP_URL}/recuperar-contrasena/${token}`;
  const html = baseLayout('Recuperar contraseña', `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;">
      Recuperar contraseña
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;">
      Hola ${name}, recibimos una solicitud para restablecer tu contraseña.
    </p>
    ${btn('Restablecer contraseña', resetUrl)}
    ${divider()}
    <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">
      Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.
    </p>
  `);
  await send(to, 'Recuperar contraseña — Edel Racing', html);
}

// ─── Self-registration ────────────────────────────────────────────────────────

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
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;">
      ¡Inscripción registrada!
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;">
      Hola <strong style="color:#fff;">${info.pilotName}</strong>, tu inscripción en
      <strong style="color:#fff;">${info.eventName}</strong> ha sido registrada correctamente.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Categoría</p>
        <p style="margin:4px 0 0;color:#fff;font-weight:700;">${info.category}</p>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Cuota de servicio</p>
        <p style="margin:4px 0 0;color:#fff;font-weight:700;">${fmtMXN(info.serviceFee)}</p>
      </td></tr>
      ${info.foodFee > 0 ? `<tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Cuota de comida</p>
        <p style="margin:4px 0 0;color:#fff;font-weight:700;">${fmtMXN(info.foodFee)}</p>
      </td></tr>` : ''}
      <tr><td style="padding:12px 16px;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Total a pagar</p>
        <p style="margin:4px 0 0;color:#e10600;font-weight:900;font-size:20px;">${fmtMXN(total)}</p>
      </td></tr>
    </table>

    ${info.transferInfo ? `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Datos de pago</p>
      <pre style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;white-space:pre-wrap;font-family:monospace;">${info.transferInfo}</pre>
    </div>` : ''}

    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 4px;">
      Realiza tu pago y sube el comprobante desde el evento para confirmar tu lugar.
    </p>
    ${btn('Ver evento', info.eventUrl)}
  `);
  await send(to, `Inscripción registrada — ${info.eventName}`, html);
}

// ─── Payment approved ─────────────────────────────────────────────────────────

export async function sendPaymentApprovedEmail(
  to: string,
  pilotName: string,
  eventName: string,
  eventUrl: string,
): Promise<void> {
  const html = baseLayout('Pago aprobado', `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;">
      ¡Pago aprobado!
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;">
      Hola <strong style="color:#fff;">${pilotName}</strong>, tu pago para
      <strong style="color:#fff;">${eventName}</strong> ha sido verificado y aprobado.
    </p>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 4px;">
      Tu inscripción está confirmada. ¡Nos vemos en la pista!
    </p>
    ${btn('Ver parrilla', eventUrl)}
  `);
  await send(to, `Pago aprobado — ${eventName}`, html);
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
  const positionLabel = info.position === 1 ? '🥇 1er lugar' :
    info.position === 2 ? '🥈 2do lugar' :
    info.position === 3 ? '🥉 3er lugar' :
    `${info.position}° lugar`;

  const html = baseLayout('Resultados publicados', `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;">
      Resultados publicados
    </h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;">
      Hola <strong style="color:#fff;">${info.pilotName}</strong>, los resultados de
      <strong style="color:#fff;">${info.eventName}</strong> — ${info.category} ya están disponibles.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0;font-size:36px;font-weight:900;color:#e10600;">${positionLabel}</p>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.5);">${info.totalPoints} puntos totales en el evento</p>
      </td></tr>
    </table>

    ${btn('Ver resultados completos', info.resultsUrl)}
  `);
  await send(to, `Resultados — ${info.eventName}`, html);
}
