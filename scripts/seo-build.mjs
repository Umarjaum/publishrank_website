// Runs on every Netlify build (see netlify.toml). Never fails the build: it only improves and reports.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ORIGIN = 'https://publishrank.netlify.app';
const pages = readdirSync('.').filter(f => f.endsWith('.html') && !['404.html', 'issue-thanks.html'].includes(f)).sort();
const lastmod = file => { try { const v = execSync(`git log -1 --format=%cI -- "${file}"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return v || ''; } catch { return ''; } };

// 1. pages-sitemap.xml with real lastmod values taken from git history (omitted when git history is unavailable).
const entries = pages.map(f => { const m = lastmod(f); return `<url><loc>${ORIGIN}/${f}</loc>${m ? `<lastmod>${m}</lastmod>` : ''}</url>`; });
const home = lastmod('index.html');
writeFileSync('pages-sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ORIGIN}/</loc>${home ? `<lastmod>${home}</lastmod>` : ''}</url>${entries.filter(e => !e.includes(`${ORIGIN}/index.html`)).join('')}</urlset>`);

// 2. Content checks for the JSON feeds and static pages (warnings only).
const warn = [];
const titles = new Map();
for (const f of pages) {
  const h = readFileSync(f, 'utf8');
  const t = (h.match(/<title>(.*?)<\/title>/s) || [])[1] || '', d = (h.match(/<meta name="description" content="(.*?)"/s) || [])[1] || '';
  if (!t) warn.push(`${f}: missing <title>`); else if (t.length > 65) warn.push(`${f}: title is ${t.length} chars (aim for 60 or fewer)`);
  if (d.length < 70 || d.length > 165) warn.push(`${f}: description is ${d.length} chars (aim for 70-160)`);
  if (!/rel="canonical"/.test(h)) warn.push(`${f}: missing canonical`);
  if (titles.has(t)) warn.push(`${f}: duplicate title with ${titles.get(t)}`); titles.set(t, f);
}
try {
  const feed = JSON.parse(readFileSync('announcements.json', 'utf8')), seen = new Set();
  for (const a of feed.announcements) {
    const k = a.slug || a.id;
    if (seen.has(k)) warn.push(`announcements.json: duplicate slug/id "${k}"`); seen.add(k);
    if (a.active && !a.summary) warn.push(`announcements.json: "${k}" has no summary (used for meta description)`);
    if (a.image && !/^https:\/\/|^\//.test(a.image)) warn.push(`announcements.json: "${k}" image must be an https link`);
    if (a.image && !a.image_alt) warn.push(`announcements.json: "${k}" has an image but no image_alt`);
  }
  const faq = JSON.parse(readFileSync('faqs.json', 'utf8')), slugs = new Set(faq.faqs.map(f => f.slug));
  if (slugs.size !== faq.faqs.length) warn.push('faqs.json: duplicate slugs');
  for (const f of faq.faqs) for (const r of f.related || []) if (!slugs.has(r)) warn.push(`faqs.json: "${f.slug}" relates to unknown "${r}"`);
} catch (e) { warn.push('JSON check failed: ' + e.message); }
console.log(warn.length ? 'SEO checks:\n - ' + warn.join('\n - ') : 'SEO checks passed.');
