# PublishRank website

PublishRank is an independent, fully nonprofit WordPress SEO project dedicated to news publishers of every size. The production domain is **https://publishrank.netlify.app**.

## Public resources

The site contains 26 indexable pages plus a custom error page. Platform resources cover technical SEO, article intelligence, scalable sitemaps, the migration roadmap, and project development. Publisher resources describe the audience, nonprofit mission, frequently asked questions, and support. Editorial guides cover PublishRank vs Rank Math, PublishRank vs Yoast SEO, and Google Discover readiness, with source links, authorship, publication dates, and large article images.

The searchable documentation hub links to six detailed chapters: installation and setup, news SEO and sitemaps, structured data, technical SEO, editorial workflows, and operations and troubleshooting. Examples are general validation aids, not undocumented PublishRank APIs. Planned migration and future intelligence remain clearly labeled.

Privacy, terms of use, cookies, disclaimer, and accessibility pages describe the current website, including third-party image delivery. The nonprofit statement describes project purpose, not registered-charity or tax-exempt status. The project owner should review these policies against actual operations and applicable requirements before relying on them. Update privacy and cookie policies before introducing data collection or tracking.

## Maintenance

The frontend is a static site: edit the HTML pages, `assets/style.css`, and `assets/app.js` directly. No frontend build step is required. The optional Unsplash endpoint is a TypeScript Netlify Function with development dependencies for function types and type checking. Shared navigation and the four-column footer are rendered in each HTML document so they remain usable without JavaScript. Keep those shared sections consistent when editing pages.

Every public page includes a unique title and description, the production canonical URL, Open Graph and social-card metadata, and JSON-LD. The homepage canonical is `/`; Netlify permanently redirects `/index.html` to `/`. Update `sitemap.xml` when adding or removing indexable pages. `404.html` is deliberately excluded from the sitemap and marked `noindex`.

`assets/social-card.svg` is the editable source of the 1200 × 630 PNG social preview used by existing reference pages. The homepage and new guides use relevant 1200 × 675 Unsplash images for large previews. Regenerate `assets/social-card.png` if its source changes. The site does not include analytics, visitor accounts, submission forms, or client-side persistent storage. Documentation search and copy controls run locally in the current page.

The site is served directly from the repository root through `netlify.toml`. Serve it through Netlify Dev or any static web server for previewing root-relative asset paths. Check keyboard navigation, mobile layouts, documentation search, copying success/failure, FAQ expansion, internal links, and structured metadata after changes.

## Unsplash photography

Curated Unsplash CDN images render without JavaScript or an API key. The homepage can optionally load public photo metadata from the free Unsplash API through `netlify/functions/editorial-photos.mts` at `/api/editorial-photos`. Set `UNSPLASH_ACCESS_KEY` as a secret Netlify environment variable scoped to Functions, then redeploy. Never place the credential in HTML, browser JavaScript, or this repository. Obtain it from an Unsplash developer application and review its current API terms and rate limits; requests are not unlimited.

The endpoint accepts only three predefined editorial topics, keeps credentials server-side, hotlinks returned CDN URLs, and supplies photographer and Unsplash attribution links. Successful responses use Netlify CDN cache headers to reduce API usage. Missing configuration, upstream errors, or image-loading failure leave the original curated image intact. Article metadata deliberately uses stable images rather than dynamically selected photos. The integration does not offer photo downloads, collect visitor profiles, or persist application data.

## Search readiness and launch follow-up

The supplied WordPress slug is `publishrank`, linked as https://wordpress.org/plugins/publishrank/. On October 8, 2026, the WordPress plugin API returned “Plugin not found” and the directory link led to a search page. Confirm the public listing, author, and release before promoting installation; the site does not invent version numbers or review ratings.

After deployment, submit https://publishrank.netlify.app/sitemap.xml in the verified Google Search Console property and inspect the homepage and new guides. The existing verification meta tag remains unchanged. Organic rankings, indexing, rich results, and Discover placement are controlled by Google and cannot be guaranteed. No paid advertising campaign was created. Comparison guides are independent evaluation checklists, not claims of measured superiority over Rank Math or Yoast.

Developer: Muhammad Umar Jabbar — https://umarjaum.netlify.app
