# Website changes — 2026-10-23 (shared account and plugin identity)
- Added `/account.html` with email/password sign-up and sign-in plus Google/GitHub OAuth buttons.
- Added a site-wide Account entry in the primary navigation.
- Reused the existing PublishRank Supabase project and public publishable key so the website identity matches the plugin’s optional Publisher Account screen.
- Documented the secure shared-identity model: PKCE in the plugin, no service-role key in browser code, and no WordPress role or password handoff.

# Website changes — 2026-10-23 (update 7, branding, help, popups, icons)

- Your logo is now the favicon (`/favicon.ico`, 16–192 px PNGs, Apple touch icon, web manifest, Organization logo in JSON-LD). Google needs a few days to refresh its favicon.
- Branded 1200x630 social cards: `assets/social-card.png` plus `assets/social/*.jpg` (page photos with the logo) used by Open Graph and Twitter tags. Stories without an image fall back to the branded card.
- New-story popup: shows the newest story or feature (published within 7 days) once per revision. Control it per entry with `"site_popup": true/false` in `announcements.json`; bump `revision` to show an updated entry again. Endpoint: `/api/news/popup`.
- Help is always visible: highlighted Help button in the header and a Help band in the footer (Report an issue, Contact support, FAQ).
- Font Awesome 6.5.2 (free) loads from cdnjs; icons added to the menus, footer, buttons, platform tool cards, News and FAQ pages.

# Website changes — 2026-10-23 (update 6, advanced SEO)

- `scripts/seo-build.mjs` runs on every Netlify build: regenerates `pages-sitemap.xml` with real `lastmod` from git history and prints warnings for titles, descriptions, canonicals, duplicate slugs and image rules in the JSON files. It never fails the build.
- New Atom feed `/feed.xml` and dynamic `/llms.txt` (both read `announcements.json` and `faqs.json`); feed autodiscovery link and theme-color on every page.
- Site search now also finds every FAQ and published story automatically.
- JSON-LD graph (Organization, WebSite, WebPage, BreadcrumbList) added to image-seo, redirects, schema-suite and wordpress-seo.
- `netlify.toml`: build command, HSTS, asset caching, and 404 for source files (`/scripts`, `/netlify`, package files).

# Website changes — 2026-10-23 (update 5)

- **News is now driven by `announcements.json`** (plugin feed format kept; new optional per-entry fields: `slug`, `category`, `author`, `article_type`, `image`, `image_alt`, `body`, `news_sitemap`). The five guides from `news.json` were migrated (same slugs) and `news.json` was removed.
- **Images from links, never broken:** images must be `https://` links (or site paths). The function checks each link (cached) and drops it if it fails; the browser also removes any image that fails to load. Entries with no `image` render with no image frame.
- **New indicator in the menu:** `/api/news/status` feeds a "New"/"N new" badge beside News (stories from the last 14 days not yet seen by that browser). It clears on visiting News. An open News page shows a Refresh bar when the feed changes.
- **Dynamic pages:** `/news`, `/news/<slug>`, `/api/news`, `/api/news/status` (function `news`). Future `published_at` stays hidden until due; `expires_at` removes from lists but the URL stays.
- **News sitemap:** `/news-sitemap.xml` (Google News format, last 48 h, `article_type: NewsArticle`, opt out with `"news_sitemap": false`) and `/articles-sitemap.xml`.
- **FAQ library:** `faqs.json` (57 answers) → `/faq`, `/faq/<slug>` (dedicated link per question), `/faq-sitemap.xml`, `/api/faq`. FAQPage JSON-LD, BreadcrumbList, canonical, Open Graph and Twitter tags. `faq.html` now 301-redirects to `/faq`.
# Website changes — 2026-10-23 (update 4)

- New Netlify Functions: `search` (/api/search), `version` (/api/version), `submission-created` (form event: ticket ID, priority, optional Slack/Discord/email alerts and reporter confirmation).
- Site-wide search dialog (Ctrl/Cmd+K or /), live help suggestions on the issue form, update checker on the download page.
- `netlify.toml`: included files and noindex headers for the new endpoints.

# Website changes — 2026-10-23 (update 3)

- Fixed `issue-thanks.html` and `report-issue.html`: menu links had been rewritten to point at the page itself; duplicate `</main>` removed.
- Issue form: only the summary and consent are required. The email is required only when follow-up is ticked. Added the `netlify` attribute alongside `data-netlify="true"`.
- Rebuilt the thanks page: animated check, interactive troubleshooting checklist, next-steps timeline, screenshot carousel.

# Website changes — 2026-10-23 (update 2)

- Added `report-issue.html`: advanced Netlify Form `issue-report` with issue type, affected tool (all 27), severity, frequency, steps, environment, caching/CDN, screenshot uploads, consent, honeypot and reCAPTCHA. Prefills with `?tool=slug`; shows tool hints and an error-log field when relevant; live completeness meter; file-size checks.
- Added `issue-thanks.html` (noindex), a Report-an-issue link in the Company menu, support page and every platform tool card.
- Updated privacy and cookie pages to describe the form and reCAPTCHA.

# Website changes — 2026-10-23

- Production domain changed to https://publishrank.netlify.app everywhere (canonicals, Open Graph, JSON-LD, sitemaps, robots.txt, netlify.toml, functions, README, legal pages).
- New mega menu (Platform, Guides, Docs, Company) on all pages and in `netlify/functions/lib/shell.json`. Works with hover, click, keyboard, Esc and mobile accordion.
- New `platform.html`: all 27 PublishRank tools in four groups, with real screenshots and a carousel. Added to `pages-sitemap.xml`.
- New homepage hero (animated headline, screenshot fader, chips) and an "Inside WordPress" screenshot carousel.
- Added 9 cropped WebP screenshots (`assets/img/ui-*.webp`). Styles and scripts appended to `assets/style.css` and `assets/app.js`.
- Descriptions for tools without a screenshot (Author Expertise, Local SEO, Publisher Account, Configuration History, Setup Wizard, Search Engines, Insights, Settings, Search Console) are written from menu names and existing docs. Please review them against the plugin.

Tests run: internal link/anchor check (0 problems), JSON validity, desktop and mobile render with no JS errors or horizontal scroll. Not run: Netlify deploy, HTML validator, full keyboard audit.

# Website changes — 2026-10-22

- Added `download.html`: v2.9.67 ZIP download, SHA-256, requirements (WP 6.3+, PHP 7.4+, tested up to 7.1 per plugin readme), install steps, pre-install notes (conflicting SEO plugins, footer credit, optional services), compatibility table.
- Added `downloads/publishrank-2.9.67.zip` and `.sha256`; Netlify redirects `/download` and `/download/latest`; `noindex` header on `/downloads/*`.
- Rewrote `features.html` as a verified, status-labelled inventory of 8 areas, plus a "not included / not verified" list and a real dashboard screenshot (`assets/img/dashboard-v2-9-67.webp`).
- Replaced all unconfirmed WordPress.org links (nav, footer, home, comparisons, Discover guide, getting-started) with the download page.
- Added `download.html` to `sitemap.xml`; appended styles to `assets/style.css`.

Tests run: local link/fragment/asset check (0 problems), JSON-LD parse, unique titles, sitemap entries, ZIP integrity. Not run: HTML validator, browser/mobile rendering, keyboard/accessibility audit, Netlify deploy.
