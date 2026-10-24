import type { APIRoute } from 'astro';
import { site, href, memberName } from '../../lib/site';
import { getMembers, getLeos, currentPositions } from '../../lib/content';

// "Save contact" file for each member profile.
export async function getStaticPaths() {
  if (!site.features.members) return [];
  const roles = await currentPositions('en');
  const people = [...(await getMembers('en')), ...(site.features.leo ? await getLeos('en') : [])];
  return people.map((member) => ({ params: { member: member.id }, props: { member, role: roles.get(member.id) ?? member.data.position } }));
}

const esc = (v: string) => v.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export const GET: APIRoute = ({ props, site: origin }) => {
  const { member, role } = props as { member: any; role?: string };
  const d = member.data;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(memberName(d, 'en', member.collection === 'leos'))}`,
    `N:${esc(d.name)};;;${esc(site.memberPrefix ?? '')};${esc(d.titles ?? '')}`,
    `ORG:${esc(d.organisation ?? site.name)}`,
    role && `TITLE:${esc(`${role}, ${site.name}`)}`,
    d.phone && `TEL;TYPE=CELL:${d.phone.replace(/\s/g, '')}`,
    d.email && `EMAIL:${d.email}`,
    `URL:${new URL(href(`/${member.id}/`), origin).href}`,
    'END:VCARD',
  ].filter(Boolean);
  return new Response(lines.join('\r\n'), { headers: { 'Content-Type': 'text/vcard; charset=utf-8' } });
};
