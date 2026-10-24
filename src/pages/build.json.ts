import type { APIRoute } from 'astro';
// When this copy of the site was built. The deploy workflow compares it with the member portal's latest change.
export const GET: APIRoute = () => new Response(JSON.stringify({ builtAt: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } });
