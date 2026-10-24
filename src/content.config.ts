import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The admin panel saves empty optional fields as "" or null; treat both as "not set".
const text = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined || v === '' ? undefined : String(v)));

// Dates are stored as wall-clock time in the club's own timezone ("2026-06-26T19:30").
// They are parsed as if UTC and always formatted as UTC, so what is typed is what is shown.
const toDate = (v: unknown) => {
  if (v instanceof Date) return v;
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const s = v.trim().replace(' ', 'T');
  if (s.length <= 10) return new Date(`${s}T00:00:00Z`);
  return new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s}Z`);
};
const date = z.preprocess(toDate, z.date());
const optionalDate = z.preprocess(toDate, z.date().optional());
// Optional Bangla overrides: any field repeated inside `bn` replaces the English value on /bn/ pages.
const bn = z.record(z.string(), z.any()).nullish();
const images = z
  .array(z.union([z.string(), z.object({ image: z.string() }).transform((o) => o.image)]))
  .nullish()
  .transform((v) => (v ?? []).filter(Boolean));

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date,
    endDate: optionalDate,
    venue: text,
    address: text,
    mapUrl: text,
    category: text,
    leo: z.boolean().nullish().transform((v) => !!v),
    notify: z.boolean().nullish().transform((v) => !!v),
    summary: text,
    cover: text,
    gallery: images,
    bn,
  }),
});

// Day and month only (never the year), and only with the member's consent.
const dayMonth = z
  .object({ month: z.coerce.number().int().min(1).max(12), day: z.coerce.number().int().min(1).max(31) })
  .nullish()
  .catch(undefined)
  .transform((v) => v ?? undefined);

const person = {
  name: z.string(),
  handle: text,
  titles: text,
  position: text,
  photo: text,
  memberSince: text,
  profession: text,
  organisation: text,
  email: text,
  phone: text,
  whatsapp: text,
  facebook: text,
  linkedin: text,
  website: text,
  birthday: dayMonth,
  anniversary: dayMonth,
  hidden: z.boolean().nullish().transform((v) => !!v),
  bn,
};

const members = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/members' }),
  schema: z.object(person),
});

const leos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/leos' }),
  schema: z.object(person),
});

const bulletins = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bulletins' }),
  schema: z.object({
    title: z.string(),
    date,
    summary: text,
    cover: text,
    pdf: text,
    pages: images,
    bn,
  }),
});

const committees = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/committees' }),
  schema: z.object({
    year: z.union([z.string(), z.number()]).transform(String),
    theme: text,
    bn,
    members: z
      .array(z.object({ member: z.string(), position: z.string(), group: text, bn }))
      .nullish()
      .transform((v) => v ?? []),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    intro: text,
    image: text,
    pledgeTitle: text,
    pledge: text,
    member: text,
    name: text,
    role: text,
    photo: text,
    writings: z
      .array(z.object({ title: z.string(), date: text, text: text, bn }))
      .nullish()
      .transform((v) => v ?? []),
    bn,
    timeline: z
      .array(z.object({ year: z.union([z.string(), z.number()]).transform(String), title: z.string(), text: text, bn }))
      .nullish()
      .transform((v) => v ?? []),
  }),
});

export const collections = { events, members, leos, bulletins, committees, pages };
