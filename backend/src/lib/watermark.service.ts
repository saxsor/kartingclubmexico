import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATERMARK_PATH = join(__dirname, '../../assets/watermark.png');
const WATERMARK_WIDTH_RATIO = 0.20;
const MARGIN_RATIO = 0.02;

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const watermarkPng = await readFile(WATERMARK_PATH);
  const meta = await sharp(imageBuffer).metadata();
  const imageWidth = meta.width ?? 1920;
  const imageHeight = meta.height ?? 1080;

  const wmWidth = Math.round(imageWidth * WATERMARK_WIDTH_RATIO);
  const margin = Math.round(imageWidth * MARGIN_RATIO);

  const watermarkResized = await sharp(watermarkPng)
    .resize(wmWidth)
    .toBuffer();

  const wmMeta = await sharp(watermarkResized).metadata();
  const wmHeight = wmMeta.height ?? 80;

  return sharp(imageBuffer)
    .composite([{
      input: watermarkResized,
      left: imageWidth - wmWidth - margin,
      top: imageHeight - wmHeight - margin,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
