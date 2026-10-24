// Prepares this template for a new club: clears the sample content and sets the club's identity.
//
//   npm run new-club -- --name "Lions Club of Dhaka Central" --short "Dhaka Central" --yes
//
// Optional: --club-no, --ident-no, --charter 2001-05-14, --affiliation "...", --no-bangla
// Everything else (logo, colours, contacts, pages) is then edited in the admin panel at /admin/.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const name = value('name');
if (!name || !flag('yes')) {
  console.log('This removes all sample members, events, bulletins and committees, then sets up a new club.\n');
  console.log('Usage: npm run new-club -- --name "Lions Club of ..." --short "..." --yes');
  process.exit(name ? 0 : 1);
}
const short = value('short', name.replace(/^lions club of\s+/i, ''));

const emptyDir = (dir, keep = []) => {
  const full = join(root, dir);
  if (!existsSync(full)) return;
  for (const f of readdirSync(full)) if (!keep.includes(f)) rmSync(join(full, f), { recursive: true, force: true });
};
for (const dir of ['src/content/members', 'src/content/leos', 'src/content/events', 'src/content/bulletins', 'src/content/committees']) emptyDir(dir);
emptyDir('src/assets/uploads', ['.gitkeep']);
emptyDir('public/files', ['.gitkeep']);

const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const writeJson = (p, data) => writeFileSync(join(root, p), `${JSON.stringify(data, null, 2)}\n`);

const site = readJson('src/data/site.json');
Object.assign(site, {
  name,
  shortName: short,
  description: `${name} is a service club of Lions International.`,
  logo: '',
  affiliation: value('affiliation', 'Lions International'),
  clubNo: value('club-no'),
  identNo: value('ident-no'),
  charterDate: value('charter'),
  founder: '',
  contact: { email: '', phone: '', whatsapp: '', address: '', mapUrl: '', meeting: '', bn: { address: '', meeting: '' } },
  social: { facebook: '', instagram: '', youtube: '', linkedin: '' },
  integrations: { web3formsKey: '', tawkPropertyId: '', tawkWidgetId: '', cmsAuthUrl: '', firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' } },
  announcement: { enabled: false, text: '', link: '', bn: { text: '' } },
  bn: { name: '', shortName: '', tagline: 'আমরা সেবা করি', description: '', affiliation: '', founder: '', memberPrefix: 'লায়ন' },
});
site.features.bangla = !flag('no-bangla');
site.sms = { ...site.sms, enabled: false };
writeJson('src/data/site.json', site);

const home = readJson('src/data/home.json');
home.hero = { eyebrow: site.affiliation, title: 'Where there is a need, there is a Lion.', text: `We are the ${name}. Our members give their time to serve the community.`, image: '', bn: { eyebrow: '', title: '', text: '' } };
home.stats = [];
home.message = { member: '', title: '', text: '', bn: { title: '', text: '' } };
writeJson('src/data/home.json', home);
home.impact = { title: 'Our impact', showAuto: true, items: [], bn: { title: 'আমাদের অর্জন' } };
writeJson('src/data/home.json', home);
writeJson('src/data/past-presidents.json', { presidents: [] });
home.spotlight = { image: '', title: '', text: '', button: '', link: '', bn: { title: '', text: '', button: '' } };
home.join.image = '';
writeJson('src/data/home.json', home);
const pages = readJson('src/data/pages.json');
for (const key of Object.keys(pages)) pages[key] = { title: '', intro: '', image: '', bn: { title: '', intro: '' } };
writeJson('src/data/pages.json', pages);
writeFileSync(
  join(root, 'src/content/pages/founder.md'),
  `---\ntitle: "Our Founder"\nintro: ""\nmember: ""\nname: ""\nrole: ${JSON.stringify(`Founder, ${name}`)}\nphoto: ""\nwritings: []\nbn:\n  title: "আমাদের প্রতিষ্ঠাতা"\n  intro: ""\n  role: ""\n  body: ""\n---\n\nWrite the founder's biography here.\n`,
);

const donate = readJson('src/data/donate.json');
writeJson('src/data/donate.json', { ...donate, methods: [], projects: [] });
const leo = readJson('src/data/leo.json');
const leoName = name.replace(/^lions club/i, 'Leo Club');
writeJson('src/data/leo.json', { ...leo, name: leoName, intro: `Young people learning leadership through service, sponsored by the ${name}.`, advisor: '', image: '', bn: { name: '', intro: '', body: '' } });
const clubs = readJson('src/data/clubs.json');
writeJson('src/data/clubs.json', { ...clubs, clubs: [{ name, location: '', url: '', logo: '', bn: { name: '', location: '' } }] });
const resources = readJson('src/data/resources.json');
writeJson('src/data/resources.json', { ...resources, items: resources.items.filter((i) => /lionsclubs\.org/.test(i.url ?? '')) });

writeFileSync(
  join(root, 'src/content/pages/about.md'),
  `---\ntitle: ${JSON.stringify(`About ${name}`)}\nintro: ""\nimage: ""\ntimeline: []\npledgeTitle: ""\npledge: ""\nbn:\n  title: ""\n  intro: ""\n  pledgeTitle: ""\n  body: ""\n---\n\nWrite the history of the club here.\n`,
);

console.log(`Ready: ${name}\nNext: npm run dev, then open http://localhost:4321/admin/ to add the club's content.`);
