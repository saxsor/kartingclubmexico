import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface ResultRow {
  position: number | null;
  pilotName: string;
  alias: string | null;
  kartNumber: number | null;
  race1: number;
  race2: number;
  race3: number;
  total: number;
}

interface ParticipationDiplomaInput {
  pilotName: string;
  templateBuffer: Buffer;
  templateMimeType: string;
  nameYRatio?: number;
  fontSize?: number;
  textColor?: string;
}

export function generateResultsPdf(
  eventName: string,
  category: string,
  rows: ResultRow[],
): Readable {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  doc.fontSize(18).font('Helvetica-Bold').text(`${eventName}`, { align: 'center' });
  doc.fontSize(14).text(`Categoría: ${category}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-MX')}`, { align: 'right' });
  doc.moveDown(1);

  // Table header
  const cols = {
    pos: 40,
    pilot: 80,
    alias: 220,
    kart: 320,
    r1: 370,
    r2: 420,
    r3: 470,
    total: 520,
  };

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Pos', cols.pos, doc.y, { continued: false });
  const headerY = doc.y - 12;

  doc
    .text('Pos', cols.pos, headerY)
    .text('Piloto', cols.pilot, headerY)
    .text('Alias', cols.alias, headerY)
    .text('Kart', cols.kart, headerY)
    .text('C1', cols.r1, headerY)
    .text('C2', cols.r2, headerY)
    .text('C3', cols.r3, headerY)
    .text('Total', cols.total, headerY);

  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(580, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    const y = doc.y;
    doc
      .text(row.position?.toString() ?? '-', cols.pos, y)
      .text(row.pilotName, cols.pilot, y)
      .text(row.alias ?? '-', cols.alias, y)
      .text(row.kartNumber?.toString() ?? '-', cols.kart, y)
      .text(row.race1.toString(), cols.r1, y)
      .text(row.race2.toString(), cols.r2, y)
      .text(row.race3.toString(), cols.r3, y)
      .text(row.total.toString(), cols.total, y);
    doc.moveDown(0.4);
  }

  doc.end();
  return doc as unknown as Readable;
}

export function generateCsvResults(
  eventName: string,
  category: string,
  rows: ResultRow[],
): string {
  const lines: string[] = [];
  lines.push(`"Evento","${eventName}"`);
  lines.push(`"Categoría","${category}"`);
  lines.push('');
  lines.push('"Posición","Piloto","Alias","Kart","Carrera 1","Carrera 2","Carrera 3","Total"');
  for (const row of rows) {
    lines.push(
      `"${row.position ?? '-'}","${row.pilotName}","${row.alias ?? '-'}","${row.kartNumber ?? '-'}","${row.race1}","${row.race2}","${row.race3}","${row.total}"`,
    );
  }
  return lines.join('\n');
}

export async function generateParticipationDiplomaPdf({
  pilotName,
  templateBuffer,
  templateMimeType,
  nameYRatio = 0.58,
  fontSize = 28,
  textColor = '#111111',
}: ParticipationDiplomaInput): Promise<Buffer> {
  const imageOptions = templateMimeType.includes('png') ? { fit: [842, 595] as [number, number] } : { fit: [842, 595] as [number, number] };

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.image(templateBuffer, 0, 0, imageOptions);
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(fontSize);

    const pageWidth = doc.page.width;
    const textWidth = Math.min(pageWidth - 120, doc.widthOfString(pilotName) + 24);
    const textX = (pageWidth - textWidth) / 2;
    const textY = doc.page.height * nameYRatio;

    doc.text(pilotName, textX, textY, {
      width: textWidth,
      align: 'center',
      lineBreak: false,
    });

    doc.end();
  });
}
