import type { Config } from '@netlify/functions';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Entry = { t: string; u: string; d: string; k: string; w: string };
const STOP = new Set(['the', 'and', 'for', 'with', 'not', 'are', 'was', 'has', 'have', 'does', 'doesnt', 'this', 'that', 'from', 'into', 'how', 'why', 'what', 'can', 'cant', 'when', 'after', 'but', 'you', 'your', 'my', 'is', 'it', 'on', 'in', 'to', 'of', 'a', 'an']);
let cache: Entry[] | null = null;
const read = async (f: string) => JSON.parse(await readFile(join(process.cwd(), f), 'utf8'));
// Static pages plus every FAQ and published story, so new JSON entries become searchable automatically.
const load = async (): Promise<Entry[]> => {
  if (cache) return cache;
  const base: Entry[] = await read('netlify/functions/lib/search-index.json');
  const extra: Entry[] = [];
  try { for (const f of (await read('faqs.json')).faqs) extra.push({ t: f.question, u: '/faq/' + f.slug, d: String(f.answer[0]).slice(0, 160), k: 'FAQ', w: f.category + ' faq' }); } catch {}
  try {
    for (const a of (await read('announcements.json')).announcements) {
      if (a.active !== true || !a.slug || Date.parse(a.published_at) > Date.now()) continue;
      extra.push({ t: a.title, u: '/news/' + a.slug, d: String(a.summary || a.message || '').slice(0, 160), k: 'News', w: String(a.category || '') + ' news' });
    }
  } catch {}
  const urls = new Set(base.map(e => e.u));
  return (cache = [...base, ...extra.filter(e => !urls.has(e.u))]);
};
const tokens = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s.]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w)).slice(0, 24);
const json = (body: unknown, status = 200, cache = 'public, max-age=0, must-revalidate') => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' } });

export default async (request: Request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
  const limit = Math.min(10, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '6', 10) || 6));
  const docsBoost = url.searchParams.get('boost') === 'docs';
  try {
    const index = await load();
    if (!q) {
      // Suggestions when the search box is empty: the most useful starting points.
      const picks = ['/platform.html', '/docs-getting-started.html', '/docs-operations.html', '/download.html', '/report-issue.html', '/docs-news-seo.html'];
      return json({ query: '', count: picks.length, results: picks.map(u => index.find(e => e.u === u)).filter(Boolean).map(e => ({ title: e!.t, url: e!.u, description: e!.d, kind: e!.k })) });
    }
    const words = tokens(q);
    const phrase = q.toLowerCase();
    const scored = index.map(e => {
      const title = e.t.toLowerCase(), words_ = e.w.toLowerCase(), desc = e.d.toLowerCase();
      let score = title.includes(phrase) ? 12 : 0;
      for (const w of words) {
        if (title.includes(w)) score += title.split(/\s+/).some(t => t.startsWith(w)) ? 6 : 4;
        if (words_.includes(w)) score += 3;
        if (desc.includes(w)) score += 1;
      }
      if (score && e.k === 'Tool') score += 1;
      if (score && docsBoost && (e.k === 'Docs' || e.k === 'Tool')) score += 2;
      return { e, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.e.t.localeCompare(b.e.t)).slice(0, limit);
    return json({ query: q, count: scored.length, results: scored.map(({ e, score }) => ({ title: e.t, url: e.u, description: e.d, kind: e.k, score })) });
  } catch {
    return json({ error: 'Search is temporarily unavailable.' }, 503, 'no-store');
  }
};
export const config: Config = { path: '/api/search' };
