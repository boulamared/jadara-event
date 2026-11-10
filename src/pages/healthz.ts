import type { APIRoute } from 'astro';

export const prerender = false;

/** Sonde pour Docker / Caddy : répond 200 si le serveur tourne. */
export const GET: APIRoute = () => new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
