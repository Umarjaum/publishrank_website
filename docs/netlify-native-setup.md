# Netlify-native PublishRank account setup

The website now uses Netlify Identity for account access and Netlify Database for the shared account and WordPress connection records. Netlify Functions expose the private bridge used by the plugin.

## One-time Netlify setup

1. In the Netlify project, enable **Identity** and keep registration open while testing, or use invite-only registration for a controlled launch.
2. Enable email/password login and the Google/GitHub providers under Identity registration settings.
3. Enable **Netlify Database** for the site. It is available on credit-based plans.
4. Deploy the repository. Netlify automatically applies `netlify/database/migrations/0001_publishrank_accounts.sql` before publishing the deploy.
5. Add the production website URL and any custom-domain URL to the Identity site URL/redirect configuration.

## WordPress connection flow

An administrator opens **PublishRank → Publisher Account** in WordPress. The plugin sends the administrator to `/account.html?connect=1` on the website. After Netlify Identity sign-in, the website issues a short-lived, one-time connection code. The plugin exchanges that code server-to-server and stores only the resulting connection token encrypted with the WordPress salts.

The plugin periodically verifies the token through `/api/plugin-verify`. The database stores only a SHA-256 hash of the connection token. The website does not receive or store a WordPress password, and the integration never creates or changes WordPress users or roles.

## Required production checks

Before enabling the optional plugin admin gate, verify one complete connection in a staging WordPress site. If the Netlify site uses a custom domain, change `SITE_URL` in `src/Auth/NetlifyAuth.php` to that canonical HTTPS URL and release a new plugin version. Keep the emergency local WordPress-admin bypass available during rollout.
