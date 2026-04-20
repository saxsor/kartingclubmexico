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
  nameXRatio?: number;
  nameYRatio?: number;
  nameWidthRatio?: number;
  nameHeightRatio?: number;
  fontSize?: number;
  textColor?: string;
  textAlign?: string;
}

function resolveFittedDiplomaFontSize(
  doc: PDFKit.PDFDocument,
  text: string,
  desiredFontSize: number,
  maxWidth: number,
  maxHeight: number,
): number {
  const minFontSize = 14; // Aumentado de 8
  doc.font('Helvetica-Bold');

  let currentSize = desiredFontSize;
  doc.fontSize(currentSize);
  
  const checkFit = () => {
    const width = doc.widthOfString(text);
    // Be more permissive with height, allowing up to 20% overflow if width fits
    const height = doc.currentLineHeight() * 0.8; 
    return width <= maxWidth && height <= maxHeight;
  };

  if (checkFit()) return currentSize;

  while (currentSize > minFontSize) {
    currentSize -= 1;
    doc.fontSize(currentSize);
    if (checkFit()) break;
  }

  return currentSize;
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
  nameXRatio = 0.15,
  nameYRatio = 0.58,
  nameWidthRatio = 0.7,
  nameHeightRatio = 0.1,
  fontSize = 28,
  textColor = '#111111',
  textAlign = 'center',
}: ParticipationDiplomaInput): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    // Create document without an initial page to determine size first
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const img = (doc as any).openImage(templateBuffer);
      
      // Add page with the EXACT same size as the image
      doc.addPage({ size: [img.width, img.height], margin: 0 });
      doc.image(img, 0, 0);

      doc.fillColor(textColor).font('Helvetica-Bold');

      const pageWidth = img.width;
      const pageHeight = img.height;

      // Position box relative to actual image dimensions
      const boxX = pageWidth * nameXRatio;
      const boxY = pageHeight * nameYRatio;
      const boxWidth = pageWidth * nameWidthRatio;
      const boxHeight = pageHeight * nameHeightRatio;

      // Scale font size based on image width vs standard 842pt width
      const resolutionScale = pageWidth / 842;
      const scaledFontSize = fontSize * resolutionScale;

      const fittedFontSize = resolveFittedDiplomaFontSize(doc, pilotName, scaledFontSize, boxWidth, boxHeight);
      doc.fontSize(fittedFontSize);

      // Center text vertically within the box
      const textHeight = doc.currentLineHeight();
      const verticalOffset = Math.max(0, (boxHeight - textHeight) / 2);

      doc.text(pilotName, boxX, boxY + verticalOffset, {
        width: boxWidth,
        align: (textAlign as any) || 'center',
        lineBreak: false,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
