import siteData from '../data/site.json';
import homeData from '../data/home.json';
import presidentsData from '../data/past-presidents.json';
import donateData from '../data/donate.json';
import leoData from '../data/leo.json';
import clubsData from '../data/clubs.json';
import joinData from '../data/join.json';
import resourcesData from '../data/resources.json';
import pagesData from '../data/pages.json';

export type Lang = 'en' | 'bn';

/** Languages this club has switched on. English is always the default. */
export const langs: Lang[] = siteData.features.bangla ? ['en', 'bn'] : ['en'];

/** getStaticPaths helper: one page per language (/about/ and /bn/about/). */
export const langPaths = () => langs.map((lang) => ({ params: { lang: lang === 'en' ? undefined : lang }, props: { lang } }));

/**
 * Any object in the content may carry a `bn` key holding Bangla versions of its fields.
 * For Bangla pages those values replace the English ones; anything left empty falls back to English.
 */
export function localize<T>(value: T, lang: Lang): T {
  if (Array.isArray(value)) return value.map((v) => localize(v, lang)) as T;
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  const { bn, ...rest } = value as Record<string, any>;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(rest)) out[k] = localize(v, lang);
  if (lang === 'bn' && bn && typeof bn === 'object') {
    for (const [k, v] of Object.entries(bn as Record<string, any>)) {
      if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) continue;
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' ? { ...out[k], ...clean(v) } : v;
    }
  }
  return out as T;
}
const clean = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const getSite = (lang: Lang = 'en') => localize(siteData, lang);
export const getHome = (lang: Lang = 'en') => localize(homeData, lang);
export const getPresidents = (lang: Lang = 'en') =>
  localize((presidentsData.presidents ?? []) as { name: string; term?: string; photo?: string; member?: string }[], lang);
export const getDonate = (lang: Lang = 'en') => localize(donateData, lang);
export const getLeo = (lang: Lang = 'en') => localize(leoData, lang);
export const getClubs = (lang: Lang = 'en') => localize(clubsData, lang);
export const getJoin = (lang: Lang = 'en') => localize(joinData, lang);
export const getResources = (lang: Lang = 'en') => localize(resourcesData, lang);
const uiKeys: Record<string, string> = { events: 'events', activities: 'act', gallery: 'gallery', members: 'members', greetings: 'greet', committee: 'committee', pastPresidents: 'pp', bulletin: 'bulletin', contact: 'contact', founder: 'founder' };
/**
 * Heading, introduction and banner photo of a page. Each can be changed in the admin panel
 * ("Page headings & banners"); anything left empty uses the built-in text and the plain blue banner.
 */
export function pageMeta(key: keyof typeof pagesData, lang: Lang, t: (k: string) => string) {
  const p = localize(pagesData[key] ?? {}, lang) as { title?: string; intro?: string; image?: string };
  const ui = uiKeys[key];
  return { title: p.title || (ui ? t(`${ui}.title`) : ''), intro: p.intro || (ui ? t(`${ui}.intro`) : ''), image: p.image || undefined };
}
export const site = siteData;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix an internal path with the base path (GitHub Pages project sites) and the language. */
export function href(path = '/', lang: Lang = 'en'): string {
  if (/^([a-z]+:|#)/i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${lang === 'en' ? '' : `/${lang}`}${p}`;
}

/** "Now" expressed in the club's wall-clock time, to compare against stored dates. */
export function clubNow(): Date {
  return new Date(Date.now() + (siteData.utcOffsetHours ?? 0) * 3600_000);
}

const fmt = (lang: Lang, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'UTC', ...opts });
export const fmtDate = (d: Date, lang: Lang) => fmt(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const fmtDay = (d: Date, lang: Lang) => fmt(lang, { weekday: 'long' }).format(d);
export const fmtMonthYear = (d: Date, lang: Lang) => fmt(lang, { month: 'long', year: 'numeric' }).format(d);
export const fmtMonthShort = (d: Date, lang: Lang) => fmt(lang, { month: 'short' }).format(d);
export const fmtDayNum = (d: Date, lang: Lang) => fmt(lang, { day: 'numeric' }).format(d);
export const fmtYear = (d: Date, lang: Lang) => fmt(lang, { year: 'numeric' }).format(d);
export const hasTime = (d: Date) => d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
export function fmtTime(d: Date, lang: Lang): string {
  if (lang !== 'bn') return fmt(lang, { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  // Bangla names the part of the day instead of using AM/PM: "সন্ধ্যা ৭:৩০".
  const h = d.getUTCHours();
  const part = h < 4 ? 'রাত' : h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  return `${part} ${digitsFor(`${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}`, lang)}`;
}

/** Show the digits of a typed value ("2025-2026", "2023") in Bangla numerals on Bangla pages. */
export function digitsFor(value: string | number | undefined, lang: Lang): string {
  const v = String(value ?? '');
  return lang === 'bn' ? v.replace(/\d/g, (n) => '০১২৩৪৫৬৭৮৯'[Number(n)]) : v;
}

/** Member name with the club's prefix ("Ln.", or "Leo" for Leo members) and honours ("PMJF"). */
export function memberName(m: { name: string; titles?: string }, lang: Lang = 'en', leo = false): string {
  const s = getSite(lang);
  return [leo ? s.leoPrefix : s.memberPrefix, m.name, m.titles].filter(Boolean).join(' ');
}

export const fmtNumber = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-IN').format(n);
export const fmtDayMonth = (v: { month: number; day: number }, lang: Lang) => fmt(lang, { day: 'numeric', month: 'long' }).format(new Date(Date.UTC(2024, v.month - 1, v.day)));
export const monthName = (m: number, lang: Lang) => fmt(lang, { month: 'long' }).format(new Date(Date.UTC(2024, m - 1, 1)));

export function initials(name: string): string {
  const parts = name.replace(/\b(md|dr|prof|sk|mrs?|ms)\.?\s/gi, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Google Calendar "add event" link. Stored dates are wall-clock, so shift back to real UTC. */
export function calendarLink(e: { title: string; date: Date; endDate?: Date; venue?: string; address?: string; summary?: string }): string {
  const shift = (siteData.utcOffsetHours ?? 0) * 3600_000;
  const stamp = (d: Date) => new Date(d.getTime() - shift).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const end = e.endDate ?? new Date(e.date.getTime() + 2 * 3600_000);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.date)}/${stamp(end)}`,
    location: [e.venue, e.address].filter(Boolean).join(', '),
    details: e.summary ?? '',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export const digits = (v?: string) => (v ?? '').replace(/[^\d]/g, '');

type NavItem = { key: string; path: string; on: boolean; group?: string };
const f = siteData.features;
const items: NavItem[] = [
  { key: 'nav.about', path: '/about/', on: true, group: 'nav.g.club' },
  { key: 'nav.founder', path: '/founder/', on: f.founder, group: 'nav.g.club' },
  { key: 'nav.committee', path: '/committee/', on: f.committee, group: 'nav.g.club' },
  { key: 'nav.pastPresidents', path: '/past-presidents/', on: f.pastPresidents, group: 'nav.g.club' },
  { key: 'nav.leo', path: '/leo/', on: f.leo, group: 'nav.g.club' },
  { key: 'nav.clubs', path: '/clubs/', on: f.clubs, group: 'nav.g.club' },
  { key: 'nav.resources', path: '/resources/', on: f.resources, group: 'nav.g.club' },
  { key: 'nav.activities', path: '/activities/', on: f.activities, group: 'nav.g.activities' },
  { key: 'nav.events', path: '/events/', on: f.events, group: 'nav.g.activities' },
  { key: 'nav.gallery', path: '/gallery/', on: f.gallery, group: 'nav.g.activities' },
  { key: 'nav.members', path: '/members/', on: f.members, group: 'nav.g.members' },
  { key: 'nav.greetings', path: '/greetings/', on: f.greetings && f.members, group: 'nav.g.members' },
  { key: 'nav.bulletin', path: '/bulletin/', on: f.bulletin },
  { key: 'nav.donate', path: '/donate/', on: f.donate },
  { key: 'nav.contact', path: '/contact/', on: true },
];
export const nav = items.filter((n) => n.on);

/** Desktop menu: items sharing a group become one dropdown; a group with a single item stays a plain link. */
export const menu = nav.reduce<({ key: string; path: string } | { group: string; items: NavItem[] })[]>((acc, n) => {
  const siblings = n.group ? nav.filter((x) => x.group === n.group) : [];
  if (siblings.length < 2) acc.push({ key: n.key, path: n.path });
  else if (siblings[0] === n) acc.push({ group: n.group!, items: siblings });
  return acc;
}, []);

/** Where the "Join us" buttons lead. */
export const joinPath = f.join ? '/join/' : '/contact/?subject=membership';

/** Paths that a member profile link (/ln-name/) must never take over. */
export const reserved = ['about', 'events', 'members', 'committee', 'past-presidents', 'bulletin', 'activities', 'gallery', 'donate', 'leo', 'greetings', 'clubs', 'join', 'resources', 'founder', 'account', 'contact', 'admin', 'bn', 'vcard', 'files', '404'];
