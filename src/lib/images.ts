import type { ImageMetadata } from 'astro';

// Every image uploaded through the admin panel lands in src/assets/uploads and is
// referenced by its path. Looking it up here lets Astro resize and compress it at build time.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,gif,svg,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

export function resolveImage(path?: string): ImageMetadata | undefined {
  if (!path) return undefined;
  const key = decodeURI(path.startsWith('/') ? path : `/${path}`);
  return files[key]?.default;
}

/** Page images the build made from a bulletin's PDF (see scripts/bulletin-pages.mjs), in page order. */
export function generatedPages(id: string): string[] {
  const prefix = `/src/assets/uploads/_bulletin/${id}/`;
  return Object.keys(files)
    .filter((k) => k.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
