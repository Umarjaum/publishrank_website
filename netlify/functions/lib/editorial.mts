import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Article {
  id: string; slug: string; title: string; category: string; type: string; priority: string;
  published_at: string; updated_at: string; expires_at: string | null; expired: boolean; featured: boolean;
  author: string; summary: string; image: string; image_alt: string; news_sitemap: boolean;
  sections: { heading: string; text: string }[];
  actions: { label: string; url: string; style: string }[]; labels: string[];
  revision: number; kind: string; popup: boolean;
}
export const ORIGIN = 'https://publishrank.netlify.app';
export function origin() { return ORIGIN; }
export function escape(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export async function source(name: string) {
  return JSON.parse(await readFile(join(process.cwd(), name), 'utf8'));
}
const slugify = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
const validTime = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// ---- Image validation: a missing or broken image is dropped, never rendered. ----
const imageCache = new Map<string, { ok: boolean; at: number }>();
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[|.*\.(local|internal)$)/i;
export function safeImageUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const value = raw.trim();
  if (value.startsWith('/') && !value.startsWith('//')) return ORIGIN + value;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || PRIVATE_HOST.test(u.hostname) || u.username || u.password) return '';
    return u.toString();
  } catch { return ''; }
}
export async function imageWorks(url: string): Promise<boolean> {
  if (!url) return false;
  if (url.startsWith(ORIGIN + '/')) return true; // our own assets are deployed together with the feed
  const hit = imageCache.get(url);
  if (hit && Date.now() - hit.at < (hit.ok ? 3_600_000 : 600_000)) return hit.ok;
  let ok = false;
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method, headers: method === 'GET' ? { Range: 'bytes=0-0' } : {}, signal: AbortSignal.timeout(2500), redirect: 'follow' });
      if (r.ok && /^image\//i.test(r.headers.get('content-type') || '')) { ok = true; break; }
      if (method === 'HEAD' && r.status !== 405 && r.status !== 403 && r.status !== 400) break;
    } catch { break; }
  }
  imageCache.set(url, { ok, at: Date.now() });
  return ok;
}

function sectionsOf(a: any): { heading: string; text: string }[] {
  const raw = Array.isArray(a.body) ? a.body : [];
  const out: { heading: string; text: string }[] = [];
  for (const part of raw) {
    if (typeof part === 'string' && part.trim()) out.push({ heading: '', text: part.trim() });
    else if (part && typeof part.text === 'string' && part.text.trim()) out.push({ heading: String(part.heading || ''), text: part.text.trim() });
  }
  if (!out.length && typeof a.message === 'string' && a.message.trim()) out.push({ heading: '', text: a.message.trim() });
  return out;
}

/** Reads announcements.json fresh on every request and returns published, active entries (newest first). */
export async function articles(now = Date.now(), opts: { includeExpired?: boolean; checkImages?: boolean } = {}): Promise<Article[]> {
  const feed = await source('announcements.json');
  const seen = new Set<string>();
  const list: Article[] = [];
  for (const a of Array.isArray(feed.announcements) ? feed.announcements : []) {
    if (!a || a.active !== true || typeof a.title !== 'string' || !a.title.trim() || !validTime(a.published_at)) continue;
    if (Date.parse(a.published_at) > now) continue; // scheduled for later
    const slug = slugify(a.slug || a.id || a.title);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const expired = validTime(a.expires_at) && Date.parse(a.expires_at) <= now;
    if (expired && !opts.includeExpired) continue;
    list.push({
      id: String(a.id || slug), slug, title: a.title.trim(), category: String(a.category || 'Announcement'),
      type: a.article_type === 'NewsArticle' ? 'NewsArticle' : 'Article', priority: String(a.priority || 'normal'),
      published_at: a.published_at, updated_at: validTime(a.updated_at) ? a.updated_at : a.published_at,
      expires_at: validTime(a.expires_at) ? a.expires_at : null, expired: Boolean(expired), featured: a.featured === true,
      author: String(a.author || 'PublishRank Editorial'), summary: String(a.summary || a.message || '').trim(),
      image: safeImageUrl(a.image), image_alt: String(a.image_alt || a.title), news_sitemap: a.news_sitemap !== false && a.article_type === 'NewsArticle',
      sections: sectionsOf(a),
      actions: (Array.isArray(a.actions) ? a.actions : []).filter((x: any) => { try { return new URL(x.url).protocol === 'https:' && x.label; } catch { return false; } }).map((x: any) => ({ label: String(x.label), url: String(x.url), style: String(x.style || 'secondary') })),
      labels: Array.isArray(a.labels) ? a.labels.map(String) : [],
      revision: Number(a.revision) || 1, kind: String(a.type || 'news'), popup: a.site_popup !== false,
    });
  }
  list.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  if (opts.checkImages !== false) {
    await Promise.all(list.map(async a => { if (a.image && !(await imageWorks(a.image))) a.image = ''; }));
  }
  return list;
}
/** Lightweight status used by the menu indicator and the live-refresh banner. */
export function status(list: Article[]) {
  const items = list.slice(0, 20).map(a => ({ slug: a.slug, title: a.title, stamp: a.updated_at > a.published_at ? a.updated_at : a.published_at }));
  const stamp = items.reduce((m, i) => (i.stamp > m ? i.stamp : m), '');
  return { stamp, count: list.length, items };
}
export function date(value: string) {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
export const isFresh = (a: Article, days = 7) => Date.now() - Date.parse(a.published_at) < days * 86_400_000;
export function card(a: Article, featured = false) {
  const h = featured ? 'h2' : 'h3';
  const media = a.image ? `<figure class="news-thumb"><img data-optional src="${escape(a.image)}" alt="${escape(a.image_alt)}" width="1440" height="810" ${featured ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer"></figure>` : '';
  return `<a class="news-card${featured ? ' news-featured' : ''}${a.image ? '' : ' no-img'}" href="/news/${escape(a.slug)}">${media}<div><span class="kicker">${escape(a.category)}${isFresh(a) ? ' <b class="chip-new">New</b>' : ''}</span><${h}>${escape(a.title)}</${h}><p>${escape(a.summary)}</p><p class="news-meta"><i class="fa-regular fa-calendar" aria-hidden="true"></i> <time datetime="${escape(a.published_at)}">${date(a.published_at)}</time> · <i class="fa-regular fa-user" aria-hidden="true"></i> ${escape(a.author)}</p><span class="text-link">Read the story <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span></div></a>`;
}
export async function page(options: {title: string; description: string; path: string; body: string; image?: string; imageAlt?: string; schema?: object[]; article?: Article; noindex?: boolean; extraHead?: string; bodyAttrs?: string}) {
  const shell = await source('netlify/functions/lib/shell.json');
  const canonical = origin() + options.path;
  const image = options.image || origin() + '/assets/social-card.png';
  const organization = { '@type': 'Organization', '@id': origin() + '/#organization', name: 'PublishRank', url: origin() + '/', logo: { '@type': 'ImageObject', url: origin() + '/assets/icons/icon-512.png' } };
  const schema = { '@context': 'https://schema.org', '@graph': [organization, { '@type': 'WebSite', '@id': origin() + '/#website', name: 'PublishRank', url: origin() + '/' }, ...(options.schema || [])] };
  return `<!doctype html><html lang="en" id="top"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(options.title)} | PublishRank</title><meta name="description" content="${escape(options.description)}"><meta name="robots" content="${options.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}"><link rel="canonical" href="${canonical}"><meta property="og:site_name" content="PublishRank"><meta property="og:type" content="${options.article ? 'article' : 'website'}"><meta property="og:title" content="${escape(options.title)}"><meta property="og:description" content="${escape(options.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image}"><meta property="og:image:alt" content="${escape(options.imageAlt || 'PublishRank')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(options.title)}"><meta name="twitter:description" content="${escape(options.description)}"><meta name="twitter:image" content="${image}">${options.article ? `<meta property="article:published_time" content="${escape(options.article.published_at)}"><meta property="article:modified_time" content="${escape(options.article.updated_at)}"><meta property="article:section" content="${escape(options.article.category)}">` : ''}${options.extraHead || ''}<link rel="alternate" type="application/atom+xml" title="PublishRank News" href="/feed.xml"><meta name="theme-color" content="#1b0e17"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="16x16" href="/assets/icons/icon-16.png"><link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/icon-32.png"><link rel="icon" type="image/png" sizes="48x48" href="/assets/icons/icon-48.png"><link rel="icon" type="image/png" sizes="96x96" href="/assets/icons/icon-96.png"><link rel="icon" type="image/png" sizes="192x192" href="/assets/icons/icon-192.png"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" referrerpolicy="no-referrer"><link rel="stylesheet" href="/assets/style.css"><script src="/assets/app.js" defer></script><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script></head><body${options.bodyAttrs ? ' ' + options.bodyAttrs : ''}><a class="skip-link" href="#main">Skip to content</a>${shell.nav}<main id="main" tabindex="-1">${options.body}</main>${shell.footer}</body></html>`;
}
export function html(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=0, must-revalidate' : 'no-store', 'Netlify-CDN-Cache-Control': status === 200 ? 'public, s-maxage=300, must-revalidate' : 'no-store' } });
}

const KIND_ICON: Record<string, string> = { feature: 'wand-magic-sparkles', security: 'shield-halved', documentation: 'book-open' };
/** Newest story eligible for the site popup: published in the last 7 days, not expired, `site_popup` not false. */
export function popupCandidate(list: Article[]) {
  const a = list.find(x => x.popup && !x.expired && Date.now() - Date.parse(x.published_at) < 7 * 86_400_000);
  return a ? { key: a.id + '@' + a.revision, slug: a.slug, title: a.title, summary: a.summary.slice(0, 220), category: a.category, icon: KIND_ICON[a.kind] || 'newspaper', image: a.image, image_alt: a.image_alt, published_at: a.published_at } : null;
}
