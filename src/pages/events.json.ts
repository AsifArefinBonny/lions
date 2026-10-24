import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Event list used by the SMS reminder job (scripts/send-sms.mjs). Dates are club wall-clock time.
export const GET: APIRoute = async () => {
  const rows = (await getCollection('events')).map((e) => ({
    id: e.id, title: e.data.title, titleBn: (e.data.bn as any)?.title ?? '', date: e.data.date.toISOString(),
    venue: e.data.venue ?? '', venueBn: (e.data.bn as any)?.venue ?? '', notify: e.data.notify,
  }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};
