// After each build: report how much space the site and its uploads take, and warn well before the limits:
// Cloudflare Pages allows 20,000 files and 25 MB per file; GitHub recommends keeping a repository near 1 GB.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : []);
const size = (files) => files.reduce((n, f) => n + statSync(f).size, 0);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

const site = walk(join(root, 'dist'));
const uploads = [...walk(join(root, 'public/files')), ...walk(join(root, 'src/assets/uploads')).filter((f) => !/\/_(bulletin|profiles)\//.test(f))];
const siteSize = size(site);
console.log(`[size] built site ${mb(siteSize)} (${site.length} files) · uploads kept in the repository ${mb(size(uploads))}`);

for (const f of uploads.filter((f) => statSync(f).size > 10 * 1048576)) {
  console.warn(`[size] large upload: ${relative(root, f)} is ${mb(statSync(f).size)}. Compress it if you can.`);
}
for (const f of site.filter((f) => statSync(f).size > 24 * 1048576)) {
  console.warn(`[size] WARNING: ${relative(root, f)} is ${mb(statSync(f).size)}. Cloudflare Pages will not publish files over 25 MB.`);
}
if (site.length > 15000) console.warn(`[size] WARNING: the site has ${site.length} files; Cloudflare Pages allows 20,000.`);
const repo = size(uploads);
if (repo > 800 * 1048576) console.warn(`[size] WARNING: uploads take ${mb(repo)} of the repository. GitHub recommends about 1 GB; consider moving older originals elsewhere.`);
