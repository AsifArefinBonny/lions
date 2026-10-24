// Turns each uploaded bulletin PDF into page images so the site can show a fast,
// swipeable reader on any phone. Runs automatically before every build.
// Needs `pdftoppm` (poppler) or Ghostscript; the deploy workflow installs poppler. Without either this step is skipped
// and the bulletin page simply offers the PDF to open or download.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const contentDir = join(root, 'src/content/bulletins');
const outRoot = join(root, 'src/assets/uploads/_bulletin');

if (!existsSync(contentDir)) process.exit(0);
const hasPoppler = spawnSync('pdftoppm', ['-v']).status === 0;
const hasGhostscript = !hasPoppler && spawnSync('gs', ['-v']).status === 0;

for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.md'))) {
  const id = file.replace(/\.md$/, '');
  const text = readFileSync(join(contentDir, file), 'utf8');
  const pdf = text.match(/^pdf:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
  if (!pdf) continue;
  const pdfPath = join(root, 'public', pdf.replace(/^\//, ''));
  if (!existsSync(pdfPath)) {
    console.warn(`[bulletin] ${id}: PDF not found at public${pdf}`);
    continue;
  }
  const out = join(outRoot, id);
  const stamp = join(out, '.source');
  const signature = `${pdf}:${statSync(pdfPath).size}:r160`;
  if (existsSync(stamp) && readFileSync(stamp, 'utf8') === signature) continue;
  if (!hasPoppler && !hasGhostscript) {
    console.warn(`[bulletin] ${id}: neither pdftoppm nor ghostscript is installed, skipping page images`);
    continue;
  }
  mkdirSync(out, { recursive: true });
  if (hasPoppler) {
    execFileSync('pdftoppm', ['-jpeg', '-r', '160', '-jpegopt', 'quality=92', pdfPath, join(out, 'page')]);
  } else {
    execFileSync('gs', ['-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=jpeg', '-r160', '-dJPEGQ=92', `-sOutputFile=${join(out, 'page-%03d.jpg')}`, pdfPath]);
  }
  writeFileSync(stamp, signature);
  console.log(`[bulletin] ${id}: page images created`);
}
