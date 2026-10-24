import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { site, memberName } from '../lib/site';
import { getMembers, getLeos } from '../lib/content';
import { resolveImage } from '../lib/images';

// What the site currently shows for each member (all of it already public), so the member portal
// can open the edit form filled in with the present values.
export const GET: APIRoute = async () => {
  const people = [...(await getMembers('en')), ...(site.features.leo ? await getLeos('en') : [])];
  const bangla = new Map([...(await getMembers('bn')), ...(site.features.leo ? await getLeos('bn') : [])].map((m) => [m.id, m.data as any]));
  const rows = await Promise.all(
    people.map(async (m) => {
      const d = m.data as any;
      const b = bangla.get(m.id) ?? {};
      const differs = (k: string) => (b[k] && b[k] !== d[k] ? b[k] : '');
      const meta = resolveImage(d.photo);
      return {
        id: m.id,
        name: memberName(d, 'en', m.collection === 'leos'),
        nameBn: differs('name') ? memberName(b, 'bn', m.collection === 'leos') : '',
        photoUrl: meta ? (await getImage({ src: meta, width: 320, height: 320, fit: 'cover' })).src : '',
        profession: d.profession ?? '', organisation: d.organisation ?? '', phone: d.phone ?? '', whatsapp: d.whatsapp ?? '', email: d.email ?? '',
        facebook: d.facebook ?? '', linkedin: d.linkedin ?? '', website: d.website ?? '', bio: d.bio ?? (m.body ?? '').trim(),
        birthday: d.birthday ?? null, anniversary: d.anniversary ?? null,
        bn: { profession: differs('profession'), organisation: differs('organisation'), bio: differs('bio') },
      };
    }),
  );
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};
