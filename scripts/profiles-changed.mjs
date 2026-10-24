// Used by the deploy workflow's frequent schedule: prints "true" when a member has saved a change
// in the portal since the live site was last built, so the site is only rebuilt when needed.
//   node scripts/profiles-changed.mjs https://example.github.io/site
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const fb = JSON.parse(readFileSync(join(root, 'src/data/site.json'), 'utf8')).integrations?.firebase ?? {};
const live = (process.argv[2] ?? '').replace(/\/$/, '');
const say = (v) => { console.log(v ? 'true' : 'false'); process.exit(0); };

if (!fb.projectId || !live) say(false);
try {
  const built = await fetch(`${live}/build.json`).then((r) => (r.ok ? r.json() : null));
  if (!built?.builtAt) say(true);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${fb.projectId}/databases/(default)/documents:runQuery${fb.apiKey ? `?key=${fb.apiKey}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'profiles' }], orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'DESCENDING' }], limit: 1, select: { fields: [{ fieldPath: 'updatedAt' }] } } }),
  });
  const rows = res.ok ? await res.json() : [];
  const latest = rows[0]?.document?.fields?.updatedAt?.timestampValue;
  say(!!latest && new Date(latest) > new Date(built.builtAt));
} catch {
  say(false);
}
