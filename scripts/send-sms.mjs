// Sends SMS to members through TextBee (an Android phone with the club's SIM acts as the sender).
//
//   node scripts/send-sms.mjs daily        birthday / anniversary greetings for today + reminders for flagged events
//   node scripts/send-sms.mjs broadcast    one message (SMS_MESSAGE) to every member who accepts SMS
//
// Run after `npm run build`: it reads the member and event lists the build writes into dist/.
// Mobile numbers are private. They come from the member portal's private records (FIREBASE_SERVICE_ACCOUNT)
// and/or the SMS_CONTACTS secret, and are never printed: GitHub's logs for a public repository are public.
import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const mode = process.argv[2] ?? 'daily';
const site = read('src/data/site.json');
const home = read('src/data/home.json');
const sms = site.sms ?? {};
const dry = process.env.SMS_DRY_RUN === '1' || !process.env.TEXTBEE_API_KEY;
const bn = sms.language === 'bn';
const pick = (obj, key) => (bn && obj?.bn?.[key]) || obj?.[key] || '';

if (!sms.enabled && mode === 'daily') {
  console.log('[sms] SMS is switched off in Club settings.');
  process.exit(0);
}
for (const f of ['dist/members.json', 'dist/events.json']) {
  if (!existsSync(join(root, f))) throw new Error(`${f} is missing. Run "npm run build" first.`);
}
const members = read('dist/members.json');
const events = read('dist/events.json');

// ---- private contact list -------------------------------------------------------------------
const mobile = (v) => {
  const d = String(v ?? '').replace(/[^\d+]/g, '');
  if (/^01\d{9}$/.test(d)) return `+88${d}`; // Bangladeshi number typed without the country code
  if (/^8801\d{9}$/.test(d)) return `+${d}`;
  return /^\+\d{8,15}$/.test(d) ? d : '';
};
const monthDay = (v) => {
  if (typeof v === 'string') { const m = v.match(/^(\d{1,2})-(\d{1,2})$/); return m ? { month: +m[1], day: +m[2] } : undefined; }
  return v && v.month && v.day ? { month: +v.month, day: +v.day } : undefined;
};

async function fromFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return {};
  const key = JSON.parse(raw);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600 })}`;
  const jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')}`;
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  }).then((r) => r.json());
  if (!token.access_token) throw new Error('could not sign in to Firebase with the service account');
  const out = {};
  let page = '';
  do {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/(default)/documents/private?pageSize=300${page ? `&pageToken=${page}` : ''}`, { headers: { Authorization: `Bearer ${token.access_token}` } });
    const body = await res.json();
    for (const d of body.documents ?? []) {
      const f = d.fields ?? {};
      if (f.sms?.booleanValue === false) continue; // the member opted out
      out[d.name.split('/').pop()] = { mobile: f.mobile?.stringValue };
    }
    page = body.nextPageToken ?? '';
  } while (page);
  return out;
}

function fromSecret() {
  if (!process.env.SMS_CONTACTS) return {};
  const list = JSON.parse(process.env.SMS_CONTACTS);
  return Object.fromEntries(Object.entries(list).map(([id, v]) => [id, typeof v === 'string' ? { mobile: v } : v]));
}

const contacts = { ...fromSecret(), ...(await fromFirestore().catch((e) => (console.warn(`[sms] ${e.message}`), {}))) };
const people = members
  .map((m) => {
    const c = contacts[m.id] ?? {};
    return { id: m.id, name: (bn && m.nameBn) || m.name, to: mobile(c.mobile), birthday: monthDay(c.birthday) ?? m.birthday, anniversary: monthDay(c.anniversary) ?? m.anniversary };
  })
  .filter((p) => p.to);

// ---- what to send ---------------------------------------------------------------------------
const club = pick(site, 'shortName') || pick(site, 'name');
const nowClub = new Date(Date.now() + (site.utcOffsetHours ?? 0) * 3600_000);
const dayKey = (d) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '').replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
const locale = bn ? 'bn-BD' : 'en-GB';
// Bangla names the part of the day ("সন্ধ্যা ৭:৩০") instead of using AM/PM.
const clock = (d) => {
  if (!bn) return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  const h = d.getUTCHours();
  const part = h < 4 ? 'রাত' : h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  return `${part} ${`${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}`.replace(/\d/g, (n) => '০১২৩৪৫৬৭৮৯'[n])}`;
};
const queue = []; // { to: [numbers], text, label }

if (mode === 'broadcast') {
  const text = (process.env.SMS_MESSAGE ?? '').trim();
  if (!text) throw new Error('SMS_MESSAGE is empty.');
  queue.push({ to: people.map((p) => p.to), text, label: `broadcast to ${people.length} member(s)` });
} else {
  if (sms.greetings !== false) {
    for (const p of people) {
      for (const kind of ['birthday', 'anniversary']) {
        const d = p[kind];
        if (!d || d.month !== nowClub.getUTCMonth() + 1 || d.day !== nowClub.getUTCDate()) continue;
        const wish = pick(home.greetings, kind === 'birthday' ? 'birthdayWish' : 'anniversaryWish');
        queue.push({ to: [p.to], text: fill(pick(sms, 'greetingTemplate') || '{name}, {wish} - {club}', { name: p.name, wish, club }), label: `${kind} greeting for ${p.name}` });
      }
    }
  }
  const daysBefore = (sms.remindDaysBefore ?? [1]).map(Number);
  for (const e of events.filter((e) => e.notify)) {
    const start = new Date(e.date);
    const days = Math.round((Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - Date.UTC(nowClub.getUTCFullYear(), nowClub.getUTCMonth(), nowClub.getUTCDate())) / 86400_000);
    if (!daysBefore.includes(days)) continue;
    const hasTime = start.getUTCHours() + start.getUTCMinutes() > 0;
    const vars = {
      title: (bn && e.titleBn) || e.title,
      date: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(start),
      time: hasTime ? clock(start) : '',
      venue: (bn && e.venueBn) || e.venue || '',
      club,
    };
    const tpl = pick(sms, 'reminderTemplate') || 'Reminder: {title}, {date} {time}, {venue}. - {club}';
    queue.push({ to: people.map((p) => p.to), text: fill(tpl, vars), label: `reminder for "${e.title}" to ${people.length} member(s)` });
  }
}

// ---- send, within the plan's daily allowance ------------------------------------------------
const limit = Number(sms.dailyLimit ?? 50);
let used = 0;
console.log(`[sms] ${dayKey(nowClub)} · ${people.length} member(s) with a mobile number · ${queue.length} message(s) to send${dry ? ' · DRY RUN, nothing is sent' : ''}`);
for (const item of queue) {
  const to = item.to.slice(0, Math.max(0, limit - used));
  if (to.length < item.to.length) console.warn(`[sms] daily limit of ${limit} reached: ${item.to.length - to.length} recipient(s) skipped for ${item.label}`);
  if (!to.length) continue;
  used += to.length;
  console.log(`[sms] ${item.label}: "${item.text}" (${item.text.length} characters)`);
  if (dry) continue;
  const res = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.TEXTBEE_API_KEY },
    body: JSON.stringify({ recipients: to, message: item.text, ...(process.env.TEXTBEE_DEVICE_ID ? { deviceId: process.env.TEXTBEE_DEVICE_ID } : {}) }),
  });
  if (!res.ok) {
    console.error(`[sms] TextBee refused the message (${res.status})`);
    process.exitCode = 1;
  }
}
