import type { Config } from '@netlify/functions';
import { articles, escape, origin, source } from './lib/editorial.mts';

const headers = (type: string) => ({ 'Content-Type': type, 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=300, must-revalidate' });
export default async (request: Request) => {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  try {
    const all = await articles(Date.now(), { checkImages: false });
    if (new URL(request.url).pathname === '/feed.xml') {
      const updated = all.reduce((m, a) => (a.updated_at > m ? a.updated_at : m), all[0]?.updated_at || new Date().toISOString());
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en"><title>PublishRank News</title><subtitle>Product news and publishing guides from PublishRank</subtitle><id>${origin()}/news</id><link rel="self" type="application/atom+xml" href="${origin()}/feed.xml"/><link rel="alternate" type="text/html" href="${origin()}/news"/><updated>${escape(new Date(updated).toISOString())}</updated>${all.slice(0, 30).map(a => `<entry><title>${escape(a.title)}</title><id>${escape(origin() + '/news/' + a.slug)}</id><link rel="alternate" type="text/html" href="${escape(origin() + '/news/' + a.slug)}"/><published>${escape(new Date(a.published_at).toISOString())}</published><updated>${escape(new Date(a.updated_at).toISOString())}</updated><author><name>${escape(a.author)}</name></author><category term="${escape(a.category)}"/><summary>${escape(a.summary)}</summary></entry>`).join('')}</feed>`;
      return new Response(xml, { headers: headers('application/atom+xml; charset=utf-8') });
    }
    const faqs = (await source('faqs.json')).faqs as { slug: string; question: string }[];
    const txt = `# PublishRank\n\n> PublishRank is a free, open-source, nonprofit WordPress SEO and publishing toolkit for news publishers of every size. It does not guarantee rankings or Google News inclusion.\n\n## Product\n- [Platform: all 27 tools](${origin()}/platform.html)\n- [Feature status](${origin()}/features.html)\n- [Download](${origin()}/download.html)\n\n## Documentation\n- [Documentation hub](${origin()}/docs.html)\n- [News SEO and sitemaps](${origin()}/docs-news-seo.html)\n- [Structured data](${origin()}/docs-schema.html)\n\n## Comparisons\n- [PublishRank vs Yoast SEO](${origin()}/publishrank-vs-yoast.html)\n- [PublishRank vs Rank Math](${origin()}/publishrank-vs-rank-math.html)\n\n## Latest news\n${all.slice(0, 10).map(a => `- [${a.title}](${origin()}/news/${a.slug}): ${a.summary.replace(/\s+/g, ' ')}`).join('\n')}\n\n## FAQ\n- [All questions](${origin()}/faq)\n${faqs.slice(0, 15).map(f => `- [${f.question}](${origin()}/faq/${f.slug})`).join('\n')}\n`;
    return new Response(txt, { headers: headers('text/plain; charset=utf-8') });
  } catch {
    return new Response('Temporarily unavailable.', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
};
export const config: Config = { path: ['/feed.xml', '/llms.txt'] };
