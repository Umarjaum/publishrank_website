# Netlify-native authentication and database notes

Verified 2026-10-23.

- Netlify Database is a managed Postgres primitive for Netlify, available on credit-based plans. It supports Functions, deploy previews with isolated database branches, and automatic migrations.
  Source: https://docs.netlify.com/build/data-and-storage/netlify-database/
- Netlify migrations belong in `netlify/database/migrations` and use filenames matching `<number>_<slug>.sql` or a matching subdirectory containing `migration.sql`.
  Source: https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
- `@netlify/database` provides `getDatabase()` and a parameterized `db.sql` tagged template. It automatically uses the correct database branch for the current deployment.
  Source: https://docs.netlify.com/build/data-and-storage/netlify-database/api/
- Netlify Identity supports email/password signup, Google/GitHub/GitLab/Bitbucket providers, server-side verification, roles, and Identity event functions. Signup is open by default but can be changed to invite-only.
  Sources: https://docs.netlify.com/manage/security/secure-access-to-sites/identity/overview/ and https://docs.netlify.com/manage/security/secure-access-to-sites/identity/registration-login/
- Netlify Functions can use `getUser()` from `@netlify/identity` to verify the current user. State-changing server-side login/signup/logout handlers require `verifyRequestOrigin()` CSRF protection.
  Source: https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/
- Netlify Blobs is key/value/object storage; Netlify recommends a relational database for complex queries, concurrency control, and relational models.
  Source: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
