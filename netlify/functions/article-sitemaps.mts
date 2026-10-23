import type { Config } from '@netlify/functions';
import { articles, escape, origin } from './lib/editorial.mts';

const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
export default async (request: Request) => {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  try {
    const now = Date.now();
    const isNews = new URL(request.url).pathname === '/news-sitemap.xml';
    const all = await articles(now);
    let urls: string;
    if (isNews) {
      // Google News format: only genuine news published in the last 48 hours (opt out per entry with "news_sitemap": false).
      urls = all.filter(a => a.news_sitemap && Date.parse(a.published_at) >= now - 48 * 3_600_000).slice(0, 1000)
        .map(a => `<url><loc>${escape(origin() + '/news/' + a.slug)}</loc><news:news><news:publication><news:name>PublishRank</news:name><news:language>en</news:language></news:publication><news:publication_date>${escape(new Date(a.published_at).toISOString())}</news:publication_date><news:title>${escape(a.title)}</news:title></news:news></url>`).join('');
    } else {
      const latest = all.reduce((m, a) => (a.updated_at > m ? a.updated_at : m), all[0]?.updated_at || new Date(now).toISOString());
      urls = `<url><loc>${origin()}/news</loc><lastmod>${escape(new Date(latest).toISOString())}</lastmod></url>` + all.map(a => `<url><loc>${escape(origin() + '/news/' + a.slug)}</loc><lastmod>${escape(new Date(a.updated_at).toISOString())}</lastmod>${a.image ? `<image:image><image:loc>${escape(a.image)}</image:loc></image:image>` : ''}</url>`).join('');
    }
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=60, must-revalidate' } });
  } catch {
    return new Response('Sitemap temporarily unavailable.', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
};
export const config: Config = { path: ['/articles-sitemap.xml', '/news-sitemap.xml'] };
