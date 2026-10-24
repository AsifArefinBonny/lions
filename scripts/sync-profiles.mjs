// Pulls what members have entered in the member portal (/account/) into the site before it builds.
// Everything here comes from members, so it is checked and cleaned before the site uses it:
// links must be http(s), text is length-limited, photos must be real JPEG/PNG/WebP data.
// Does nothing until a Firebase project is set under Club settings.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const site = JSON.parse(readFileSync(join(root, 'src/data/site.json'), 'utf8'));
const fb = site.integrations?.firebase ?? {};
const outFile = join(root, 'src/data/_profiles.json');
const photoDir = join(root, 'src/assets/uploads/_profiles');

if (!fb.projectId) process.exit(0);

const base = process.env.FIRESTORE_URL || `https://firestore.googleapis.com/v1/projects/${fb.projectId}/databases/(default)/documents`;

// Firestore's REST format wraps every value in its type; unwrap to plain values.
const plain = (v) => {
  if (v == null) return undefined;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]));
  return undefined;
};

const text = (v, max = 200) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max) : undefined);
const link = (v) => {
  const s = text(v, 300);
  if (s === undefined || s === '') return s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
};
const phone = (v) => text(v, 30)?.replace(/[^\d+\-() ]/g, '');
const email = (v) => {
  const s = text(v, 120);
  return s === undefined || s === '' || /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(s) ? s : '';
};
const dayMonth = (v) => {
  const m = Number(v?.month), d = Number(v?.day);
  return Number.isInteger(m) && Number.isInteger(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { month: m, day: d } : null;
};
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

async function fetchAll() {
  const docs = [];
  let token = '';
  do {
    const url = `${base}/profiles?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}${fb.apiKey ? `&key=${fb.apiKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore answered ${res.status}`);
    const body = await res.json();
    docs.push(...(body.documents ?? []));
    token = body.nextPageToken ?? '';
  } while (token);
  return docs;
}

let docs;
try {
  docs = await fetchAll();
} catch (err) {
  // Never fail the build because the portal is unreachable; keep whatever was synced last time.
  console.warn(`[profiles] could not read member profiles (${err.message}); using the previous copy`);
  process.exit(0);
}

rmSync(photoDir, { recursive: true, force: true });
mkdirSync(photoDir, { recursive: true });
const out = {};
for (const d of docs) {
  const handle = d.name.split('/').pop();
  if (!/^(ln|leo)-[a-z0-9]+$/.test(handle)) continue;
  const p = plain({ mapValue: { fields: d.fields ?? {} } }) ?? {};
  const entry = drop({
    profession: text(p.profession),
    organisation: text(p.organisation),
    phone: phone(p.phone),
    whatsapp: phone(p.whatsapp),
    email: email(p.email),
    facebook: link(p.facebook),
    linkedin: link(p.linkedin),
    website: link(p.website),
    bio: text(p.bio, 4000),
  });
  // A date the member removed is stored as null, which clears it on the site too.
  if ('birthday' in p) entry.birthday = dayMonth(p.birthday);
  if ('anniversary' in p) entry.anniversary = dayMonth(p.anniversary);
  if (p.bn && typeof p.bn === 'object') {
    entry.bn = drop({ profession: text(p.bn.profession), organisation: text(p.bn.organisation), bio: text(p.bn.bio, 4000) });
  }
  const photo = typeof p.photo === 'string' ? p.photo.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/) : null;
  if (photo) {
    const bytes = Buffer.from(photo[2], 'base64');
    const isImage = (photo[1] === 'jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) || (photo[1] === 'png' && bytes[0] === 0x89 && bytes[1] === 0x50) || (photo[1] === 'webp' && bytes.subarray(8, 12).toString() === 'WEBP');
    if (isImage && bytes.length < 400_000) {
      const file = `${handle}.${photo[1] === 'jpeg' ? 'jpg' : photo[1]}`;
      writeFileSync(join(photoDir, file), bytes);
      entry.photo = `/src/assets/uploads/_profiles/${file}`;
    }
  }
  out[handle] = entry;
}
writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(`[profiles] ${Object.keys(out).length} member profile(s) synced from the portal`);
