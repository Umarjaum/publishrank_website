import type { Config } from '@netlify/functions';
import { date, escape, html, origin, page, source } from './lib/editorial.mts';

interface Faq { slug: string; category: string; question: string; answer: string[]; links: { label: string; url: string }[]; related: string[]; updated_at: string }
const plain = (f: Faq) => f.answer.join(' ');
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,;:.\s]+$/, '') + '…');
const safeLinks = (f: Faq) => f.links.filter(l => /^\/(?!\/)/.test(l.url) || /^https:\/\//.test(l.url));
const qEntity = (f: Faq) => ({ '@type': 'Question', '@id': origin() + '/faq/' + f.slug + '#question', name: f.question, answerCount: 1, dateModified: f.updated_at, acceptedAnswer: { '@type': 'Answer', text: plain(f), url: origin() + '/faq/' + f.slug } });
const crumbs = (items: [string, string][]) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });
const CAT_ICON: Record<string, string> = {"Getting started": "rocket", "Features": "toolbox", "News SEO & sitemaps": "newspaper", "Schema & rich results": "diagram-project", "Compare plugins": "scale-balanced", "Privacy & security": "shield-halved", "Support & troubleshooting": "life-ring"};
const catIcon = (c: string) => `<i class="fa-solid fa-${CAT_ICON[c] || 'circle-question'}" aria-hidden="true"></i> `;
const catId = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async (request: Request) => {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  try {
    const url = new URL(request.url);
    const data = await source('faqs.json');
    const faqs: Faq[] = data.faqs;
    if (url.pathname === '/faq-sitemap.xml') {
      const latest = faqs.reduce((m, f) => (f.updated_at > m ? f.updated_at : m), '');
      const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin()}/faq</loc><lastmod>${escape(latest)}</lastmod></url>${faqs.map(f => `<url><loc>${escape(origin() + '/faq/' + f.slug)}</loc><lastmod>${escape(f.updated_at)}</lastmod></url>`).join('')}</urlset>`;
      return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=300, must-revalidate' } });
    }
    if (url.pathname === '/api/faq') return Response.json({ faqs }, { headers: { 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' } });
    const slug = decodeURIComponent(url.pathname.replace(/^\/faq\/?/, '')).replace(/\/$/, '');
    if (slug) {
      const f = faqs.find(x => x.slug === slug);
      if (!f) return html(await page({ title: 'Question not found', description: 'Browse all PublishRank frequently asked questions.', path: '/faq', noindex: true, body: '<section class="hero"><div class="container"><p class="eyebrow">404 · Question not found</p><h1>We could not find that question.</h1><a class="btn primary" href="/faq">Browse all questions</a></div></section>' }), 404);
      const related = f.related.map(r => faqs.find(x => x.slug === r)).filter(Boolean) as Faq[];
      const canonical = origin() + '/faq/' + f.slug;
      const body = `<section class="hero page-hero faq-hero"><div class="container"><nav class="article-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/faq">FAQ</a> / <a href="/faq#${catId(f.category)}">${escape(f.category)}</a></nav><span class="eyebrow"><i class="fa-solid fa-circle-question" aria-hidden="true"></i> ${escape(f.category)}</span><h1>${escape(f.question)}</h1></div></section><section class="section"><div class="container faq-single"><article class="faq-answer" itemscope itemtype="https://schema.org/Question"><div class="lead" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer"><div itemprop="text">${f.answer.map(p => `<p>${escape(p)}</p>`).join('')}</div></div><meta itemprop="name" content="${escape(f.question)}">${safeLinks(f).length ? `<p class="article-actions">${safeLinks(f).map((l, i) => `<a class="btn${i === 0 ? ' primary' : ''}" href="${escape(l.url)}"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> ${escape(l.label)}</a>`).join(' ')}</p>` : ''}<p class="news-meta">Last reviewed <time datetime="${escape(f.updated_at)}">${date(f.updated_at)}</time> · <a href="/faq/${escape(f.slug)}">Permalink</a> · <a href="/report-issue.html">Suggest a correction</a></p></article>${related.length ? `<aside class="faq-related"><span class="kicker"><i class="fa-solid fa-diagram-next" aria-hidden="true"></i> Related questions</span>${related.map(r => `<a href="/faq/${escape(r.slug)}">${escape(r.question)}</a>`).join('')}</aside>` : ''}</div></section>`;
      return html(await page({ title: f.question, description: clip(plain(f), 158), path: '/faq/' + f.slug, body, schema: [{ '@type': 'FAQPage', '@id': canonical + '#faq', url: canonical, name: f.question, inLanguage: 'en', isPartOf: { '@id': origin() + '/#website' }, mainEntity: [qEntity(f)] }, crumbs([['Home', origin() + '/'], ['FAQ', origin() + '/faq'], [f.question, canonical]])] }));
    }
    const q = (url.searchParams.get('q') || '').trim().slice(0, 120).toLowerCase();
    const shown = q ? faqs.filter(f => `${f.question} ${plain(f)}`.toLowerCase().includes(q)) : faqs;
    const cats: string[] = (data.categories as string[]).filter(c => shown.some(f => f.category === c));
    const body = `<section class="hero page-hero"><div class="container"><div class="eyebrow"><i class="fa-solid fa-circle-question" aria-hidden="true"></i> Questions, answered</div><h1>Clear answers.<br><span>No fine-print promises.</span></h1><p class="lead">${faqs.length} answers about PublishRank, WordPress publishing SEO and how it compares with other plugins. Every question has its own link.</p></div></section><section class="section"><div class="container"><form class="news-search faq-search" action="/faq" method="get" role="search"><div><label for="faq-q">Search the FAQ</label><input id="faq-q" type="search" name="q" value="${escape(q)}" placeholder="Try news sitemap, Yoast or schema"></div><button class="btn primary" type="submit"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Search</button>${q ? '<a class="text-link" href="/faq">Clear</a>' : ''}</form><nav class="faq-cats" aria-label="Question topics">${cats.map(c => `<a href="#${catId(c)}">${catIcon(c)}${escape(c)} <small>${shown.filter(f => f.category === c).length}</small></a>`).join('')}</nav>${shown.length ? cats.map(c => `<section class="faq-group" id="${catId(c)}"><h2>${catIcon(c)}${escape(c)}</h2>${shown.filter(f => f.category === c).map(f => `<details class="faq-item" id="${escape(f.slug)}"><summary>${escape(f.question)}</summary>${f.answer.map(p => `<p>${escape(p)}</p>`).join('')}<p class="faq-links">${safeLinks(f).map(l => `<a class="text-link" href="${escape(l.url)}">${escape(l.label)} →</a>`).join(' ')} <a class="faq-permalink" href="/faq/${escape(f.slug)}" aria-label="Permanent link to this answer"><i class="fa-solid fa-link" aria-hidden="true"></i> Link to this answer</a></p></details>`).join('')}</section>`).join('') : `<div class="news-empty"><h2>No answers match “${escape(q)}”.</h2><p>Try different words or <a href="/support.html">ask the developer</a>.</p></div>`}</div></section>`;
    const open = `<script>(function(){var h=decodeURIComponent(location.hash.slice(1));var d=h&&document.getElementById(h);if(d&&d.tagName==='DETAILS'){d.open=true;d.scrollIntoView();}})();</script>`;
    return html(await page({ title: 'Frequently asked questions', description: `${faqs.length} answers about PublishRank: setup, News Sitemap, schema, IndexNow, redirects, privacy and how it compares with Yoast SEO, Rank Math and other WordPress SEO plugins.`, path: '/faq', noindex: Boolean(q), body: body + open, schema: [{ '@type': 'FAQPage', '@id': origin() + '/faq#faq', url: origin() + '/faq', name: 'PublishRank frequently asked questions', inLanguage: 'en', isPartOf: { '@id': origin() + '/#website' }, mainEntity: faqs.map(qEntity) }, crumbs([['Home', origin() + '/'], ['FAQ', origin() + '/faq']])] }));
  } catch {
    return new Response('The FAQ is temporarily unavailable. Please try again shortly.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
};
export const config: Config = { path: ['/faq', '/faq/:slug', '/faq-sitemap.xml', '/api/faq'] };
