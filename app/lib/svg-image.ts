import sharp from 'sharp';

import { IMAGE_QUALITY, IMAGE_SIZE } from '../constants';

export const MAX_IMAGE_KB = 15;
// Hard cap before rasterizing; the prompt's size hint is only advisory.
const MAX_SVG_BYTES = 64 * 1024;
const QUALITY_LADDER = [IMAGE_QUALITY, 45, 30];
// Best-effort sanity filter; prompt rules are advisory and word text is user-authored.
export const UNSAFE_SVG =
  /<(?:[\w.-]+:)?(image|script|foreignObject)|<!(ENTITY|DOCTYPE)|@import|url\(\s*["']?(?!#)|href\s*=\s*["'](?!#)/i;

/** SVG string -> small WebP, or undefined if unsafe, unparsable or too big. */
export async function svgToWebp(svg: unknown): Promise<Buffer | undefined> {
  if (typeof svg !== 'string' || svg.length > MAX_SVG_BYTES || UNSAFE_SVG.test(svg))
    return undefined;
  try {
    for (const quality of QUALITY_LADDER) {
      const webp = await sharp(Buffer.from(svg))
        .resize(IMAGE_SIZE, IMAGE_SIZE)
        .flatten({ background: '#fff' })
        .webp({ quality })
        .toBuffer();
      if (webp.length <= MAX_IMAGE_KB * 1024) return webp;
    }
  } catch {
    // unparsable SVG
  }
  return undefined;
}
