import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';
import { clubNow, localize, reserved, type Lang } from './site';
import { generatedPages } from './images';

export async function getEvents(lang: Lang) {
  const all = (await getCollection('events')).map((e) => ({ ...e, data: localize(e.data, lang) }));
  const now = clubNow().getTime();
  const ends = (e: (typeof all)[number]) => (e.data.endDate ?? new Date(e.data.date.getTime() + 3 * 3600_000)).getTime();
  return {
    all,
    upcoming: all.filter((e) => ends(e) >= now).sort((a, b) => +a.data.date - +b.data.date),
    past: all.filter((e) => ends(e) < now).sort((a, b) => +b.data.date - +a.data.date),
  };
}

export async function getMembers(lang: Lang) {
  const all = (await getCollection('members')).filter((m) => !m.data.hidden);
  for (const m of all) {
    if (reserved.includes(m.id)) throw new Error(`Member file "${m.id}" clashes with a page of the same name. Rename it.`);
  }
  return all.map((m) => ({ ...m, data: { ...localize(withPortal(m), lang), enName: m.data.name } })).sort((a, b) => a.data.enName.localeCompare(b.data.enName));
}

/** Bulletins, newest first. Pages and cover fall back to the images generated from the PDF. */
// What members entered about themselves in the member portal, fetched by scripts/sync-profiles.mjs.
// The file only exists once the portal is set up.
const portalFiles = import.meta.glob<Record<string, any>>('/src/data/_profiles.json', { eager: true, import: 'default' });
const portal = Object.values(portalFiles)[0] ?? {};
function withPortal<T extends { id: string; data: any }>(m: T): T['data'] {
  const p = portal[m.id];
  if (!p) return m.data;
  const { bn, ...own } = p;
  return { ...m.data, ...own, bn: { ...(m.data.bn ?? {}), ...(bn ?? {}) } };
}

/** Leo club members, in the order of their position then name. */
export async function getLeos(lang: Lang) {
  const all = (await getCollection('leos')).filter((m) => !m.data.hidden);
  for (const m of all) {
    if (reserved.includes(m.id)) throw new Error(`Leo file "${m.id}" clashes with a page of the same name. Rename it.`);
  }
  return all
    .map((m) => ({ ...m, data: { ...localize(withPortal(m), lang), enName: m.data.name } }))
    .sort((a, b) => Number(!a.data.position) - Number(!b.data.position) || a.data.enName.localeCompare(b.data.enName));
}

/** Every photo attached to an event (cover first), for the gallery. */
export async function getPhotoSets(lang: Lang) {
  return (await getEvents(lang)).all
    .map((e) => ({ event: e, photos: [...new Set([e.data.cover, ...e.data.gallery].filter(Boolean) as string[])] }))
    .filter((s) => s.photos.length)
    .sort((a, b) => +b.event.data.date - +a.event.data.date);
}

export async function getBulletins(lang: Lang) {
  return (await getCollection('bulletins'))
    .map((b) => {
      const data = localize(b.data, lang);
      const pages = data.pages.length ? data.pages : generatedPages(b.id);
      return { ...b, data: { ...data, pages, cover: data.cover ?? pages[0] } };
    })
    .sort((a, b) => +b.data.date - +a.data.date);
}

/** Committees, newest Lions year first. */
export async function getCommittees(lang: Lang) {
  return (await getCollection('committees'))
    .map((c) => ({ ...c, data: localize(c.data, lang) }))
    .sort((a, b) => b.data.year.localeCompare(a.data.year));
}

/** Map of member id -> position in the current (newest) committee. */
export async function currentPositions(lang: Lang): Promise<Map<string, string>> {
  const [latest] = await getCommittees(lang);
  return new Map((latest?.data.members ?? []).map((m) => [m.member, m.position]));
}

export async function getPage(id: string, lang: Lang) {
  const entry = await getEntry('pages', id);
  return entry ? { ...entry, data: localize(entry.data, lang) } : undefined;
}

/** Bangla body text is stored as Markdown inside `bn.body`; English uses the file body. */
export function banglaBody(entry: CollectionEntry<'events' | 'members' | 'leos' | 'bulletins' | 'pages'>, lang: Lang): string | undefined {
  const body = lang === 'bn' ? (entry.data as any).bn?.body : undefined;
  return typeof body === 'string' && body.trim() ? (marked.parse(body) as string) : undefined;
}
