import { describe, it, expect } from 'vitest';
import { MAX_IMAGE_KB, svgToWebp } from '@/app/lib/svg-image';

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${body}</svg>`;

describe('svgToWebp', () => {
  it('rasterizes a simple SVG to a small WebP', async () => {
    const webp = await svgToWebp(svg('<circle cx="128" cy="128" r="90" fill="red"/>'));
    expect(webp).toBeDefined();
    expect(webp!.toString('ascii', 8, 12)).toBe('WEBP');
    expect(webp!.length).toBeLessThanOrEqual(MAX_IMAGE_KB * 1024);
  });

  it.each([
    ['<image href="file:///etc/passwd"/>'],
    ['<svg:script xmlns:svg="http://www.w3.org/2000/svg">x</svg:script>'],
    ['<a-b.c:script xmlns:a-b.c="http://www.w3.org/2000/svg">x</a-b.c:script>'],
    ['<svg:image xmlns:svg="http://www.w3.org/2000/svg"/>'],
    ['<script>alert(1)</script>'],
    ['<foreignObject></foreignObject>'],
    ['<use xlink:href="http://example.com/a.svg#x"/>'],
    ['<style>@import url(http://example.com/a.css);</style>'],
    ['<rect width="9" height="9" style="fill:url(file:///x)"/>'],
  ])('rejects unsafe content: %s', async (body) => {
    expect(await svgToWebp(svg(body))).toBeUndefined();
  });

  it('rejects a DOCTYPE', async () => {
    const doc = `<!DOCTYPE svg [<!ELEMENT svg ANY>]>${svg('<rect width="9" height="9"/>')}`;
    expect(await svgToWebp(doc)).toBeUndefined();
  });

  it('allows fragment references', async () => {
    const body =
      '<defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="256" height="256" fill="url(#g)"/>';
    expect(await svgToWebp(svg(body))).toBeDefined();
  });

  it('rasterizes SVG filters (realistic styles rely on them)', async () => {
    const body =
      '<defs><filter id="b"><feGaussianBlur stdDeviation="4"/></filter><filter id="n"><feTurbulence baseFrequency="0.8"/></filter></defs><circle cx="128" cy="128" r="80" fill="#c33" filter="url(#b)"/>';
    expect(await svgToWebp(svg(body))).toBeDefined();
  });

  it('rejects oversized SVGs', async () => {
    expect(await svgToWebp(svg(`<!-- ${'x'.repeat(70 * 1024)} -->`))).toBeUndefined();
  });

  it('rejects non-strings and unparsable input', async () => {
    expect(await svgToWebp(undefined)).toBeUndefined();
    expect(await svgToWebp('not an svg')).toBeUndefined();
  });
});
