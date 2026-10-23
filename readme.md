# PublishRank website

PublishRank is an independent, fully nonprofit WordPress SEO project dedicated to news publishers of every size. The production domain is **https://publishrank.netlify.app**.

## Public resources

The site contains product and documentation pages, a dedicated news library, individual editorial articles and a custom error page. Platform resources cover technical SEO, article intelligence, scalable sitemaps, the migration roadmap, and project development. Publisher resources describe the audience, nonprofit mission, frequently asked questions, and support. Editorial guides cover PublishRank vs Rank Math, PublishRank vs Yoast SEO, and Google Discover readiness, with source links, authorship, publication dates, and large article images.

The searchable documentation hub links to six detailed chapters: installation and setup, news SEO and sitemaps, structured data, technical SEO, editorial workflows, and operations and troubleshooting. Examples are general validation aids, not undocumented PublishRank APIs. Planned migration and future intelligence remain clearly labeled.

Privacy, terms of use, cookies, disclaimer, and accessibility pages describe the current website, including locally hosted image delivery. The nonprofit statement describes project purpose, not registered-charity or tax-exempt status. The project owner should review these policies against actual operations and applicable requirements before relying on them. Update privacy and cookie policies before introducing data collection or tracking.

## Shared account
The website account at `/account.html` uses the same Supabase project and publishable key as the optional **PublishRank → Publisher Account** WordPress screen. This is a shared identity service, not a password handoff: users sign in separately in each environment, and the plugin binds the Supabase subject to an existing WordPress administrator.

Before enabling the website account in production, add `https://publishrank.netlify.app/account.html` and the custom-domain equivalent to the Supabase Auth redirect allow-list. Enable only the providers you intend to support. Never put a Supabase `service_role` key in this repository or in the browser.

## Maintenance

Product and documentation pages are static: edit the HTML pages, `assets/style.css`, and `assets/app.js` directly. No frontend build step is required. The news library and article sitemaps use TypeScript Netlify Functions. Run `node_modules/.bin/tsc --noEmit` for type checking. Shared navigation and the four-column footer are rendered in each HTML document so they remain usable without JavaScript. Keep those shared sections consistent when editing pages, including the function-rendered shell in `netlify/functions/lib/shell.json`.

Every public page includes a unique title and description, the production canonical URL, Open Graph and social-card metadata, and JSON-LD. The homepage canonical is `/`; Netlify permanently redirects `/index.html` to `/`. The `sitemap.xml` index references `pages-sitemap.xml` and the two function-generated article feeds. Update `pages-sitemap.xml` when adding or removing static pages. `404.html` is deliberately excluded from the sitemap and marked `noindex`.

`assets/social-card.svg` is the editable source of the 1200 × 630 PNG social preview used by existing reference pages. The homepage and new guides use relevant, locally hosted editorial photography for large previews. Regenerate `assets/social-card.png` if its source changes. The site does not include analytics, visitor accounts, or client-side persistent storage. Documentation search and copy controls run locally in the current page.

The site is served directly from the repository root through `netlify.toml`. Serve it through Netlify Dev or any static web server for previewing root-relative asset paths. Check keyboard navigation, mobile layouts, documentation search, copying success/failure, FAQ expansion, internal links, and structured metadata after changes.

## Publishing news and announcements

Edit `announcements.json` (the same feed the plugin reads) to publish or revise a story, then deploy the site. This is a version-controlled editorial source, with no browser write endpoint or runtime database. Each article needs a unique lowercase hyphenated `slug`, a `title`, `summary`, `category`, `author`, ISO 8601 `published_at` and `updated_at` dates, an optional `image` https link with descriptive `image_alt`, and a `body` array of `heading` and plain `text` objects. HTML is escaped in article content. Preserve original publication dates and change `updated_at` for substantive revisions. Future articles remain hidden until their publication time (allowing for the five-minute page cache).

Use `type: "Article"` for evergreen guides and `type: "NewsArticle"` only for genuine news reporting. The `/news-sitemap.xml` feed includes up to 1,000 news articles within the last 48 hours; it is valid for that feed to be empty. `/articles-sitemap.xml` includes all published articles, modification times and image URLs. Both feeds update from the same source as article pages. `/api/news` exposes published articles as JSON. Raw `/announcements.json` remains public, including future entries: do not put embargoed or confidential material there.

The `/news` library supports accessible server-rendered search and topic filters. Query-result pages are noindexed and point canonically to `/news`. Individual articles live at `/news/{slug}` and include article schema, breadcrumbs, social previews, bylines, related reading and canonical URLs. Missing articles return HTTP 404; source loading errors return HTTP 503 instead of an empty success page.

`announcements.json` retains its existing plugin-compatible structure. The library displays only active entries whose publication date has arrived and whose optional expiry has not passed. Keep inactive advisory examples inactive until a genuine advisory is verified. Actions should use public HTTPS URLs.

Editorial photography lives in `assets/img/` with descriptive filenames and contextual alternative text. Replace photographs with relevant licensed assets when updating the site. The legacy optional photo API remains available, but the browser no longer calls it or replaces curated images.

## Search readiness and launch follow-up

**Plugin download:** `downloads/publishrank-2.9.67.zip` (with `.sha256`) is served from this site and linked from `download.html`. To release an update, add the new ZIP under `downloads/`, then update the version, checksum and the `/download/latest` redirect in `netlify.toml`, plus `download.html` and `features.html`.

The supplied WordPress slug is `publishrank`, linked as https://wordpress.org/plugins/publishrank/. On October 8, 2026, the WordPress plugin API returned “Plugin not found” and the directory link led to a search page. Confirm the public listing, author, and release before promoting installation; the site does not invent version numbers or review ratings.

After deployment, submit https://publishrank.netlify.app/sitemap.xml in the verified Google Search Console property and inspect the homepage and new guides. The existing verification meta tag remains unchanged. Organic rankings, indexing, rich results, and Discover placement are controlled by Google and cannot be guaranteed. No paid advertising campaign was created. Comparison guides are independent evaluation checklists, not claims of measured superiority over Rank Math or Yoast.

Developer: Muhammad Umar Jabbar — https://umarjaum.netlify.app

## Issue report form

`report-issue.html` contains a Netlify Form named `issue-report` (honeypot `bot-field`, reCAPTCHA, up to two screenshot uploads). Submissions redirect to `issue-thanks.html` (noindex). Enable form detection in Netlify (Site configuration → Forms) and redeploy so the form is registered. Edit the form only in the static HTML so Netlify can parse it at deploy time.

## Netlify Functions (added 2026-10-23)

- `/api/search?q=&limit=&boost=docs` (`search.mts`): keyword search over `netlify/functions/lib/search-index.json` (tools, pages, docs, articles). Powers the Ctrl/Cmd+K search dialog and live help suggestions on the issue form. Regenerate the index when pages or articles change.
- `/api/version?current=2.9.60` (`version.mts`): update check built from `downloads/publishrank-X.Y.Z.zip.sha256`. Returns version, SHA-256, download URL, requirements and `update_available`. Drop in a new ZIP and checksum to release.
- `submission-created.mts`: runs automatically after each `issue-report` submission. Adds a ticket ID (PR-YYMMDD-XXXX) and a P1–P4 priority, then optionally notifies you. Set these environment variables in Netlify (all optional): `ISSUE_WEBHOOK_URL` (Slack or Discord webhook), `RESEND_API_KEY`, `ISSUE_NOTIFY_EMAIL`, `ISSUE_FROM_EMAIL` (a sender verified in Resend), and `ISSUE_AUTOREPLY=off` to disable the reporter confirmation email. Without them the function only logs the ticket.
