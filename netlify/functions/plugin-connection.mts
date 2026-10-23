import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import type { Config, Context } from '@netlify/functions';
import { json, methodNotAllowed, readJson, requireUser } from './lib/account.mts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const validSiteUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname.length > 2;
  } catch { return false; }
};

export default async (request: Request, context: Context) => {
  try {
    const db = getDatabase();
    if (request.method === 'POST') {
      const user = await requireUser(context);
      const body = await readJson(request);
      const siteUrl = String(body.site_url || '').trim().replace(/\/$/, '');
      if (!validSiteUrl(siteUrl)) return json({ error: 'site_url must be a valid HTTPS WordPress site URL.' }, { status: 400 });
      const profileRows = await db.sql`
        INSERT INTO publishrank_profiles (netlify_user_id, email)
        VALUES (${user.id}, ${user.email || ''})
        ON CONFLICT (netlify_user_id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
        RETURNING id
      `;
      const profileId = profileRows[0]?.id;
      const code = `${randomUUID()}-${randomBytes(18).toString('base64url')}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await db.sql`
        INSERT INTO publishrank_connection_codes (profile_id, site_url, code_hash, expires_at)
        VALUES (${profileId}, ${siteUrl}, ${hash(code)}, ${expiresAt})
      `;
      return json({ code, expires_at: expiresAt, exchange_url: '/api/plugin-connection' }, { status: 201 });
    }
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const code = url.searchParams.get('code') || '';
      if (!code) return json({ error: 'Missing connection code.' }, { status: 400 });
      const rows = await db.sql`
        SELECT c.id, c.site_url, p.netlify_user_id, p.email
        FROM publishrank_connection_codes c
        JOIN publishrank_profiles p ON p.id = c.profile_id
        WHERE c.code_hash = ${hash(code)} AND c.used_at IS NULL AND c.expires_at > NOW()
        LIMIT 1
      `;
      const row = rows[0] as { id: string; site_url: string; netlify_user_id: string; email: string } | undefined;
      if (!row) return json({ error: 'The connection code is invalid, expired, or already used.' }, { status: 410 });
      const connectionToken = randomBytes(32).toString('base64url');
      await db.sql`
        UPDATE publishrank_connection_codes SET used_at = NOW() WHERE id = ${row.id}
      `;
      await db.sql`
        INSERT INTO publishrank_wordpress_connections (profile_id, site_url, site_host, connection_token_hash)
        SELECT p.id, ${row.site_url}, split_part(replace(replace(${row.site_url}, 'https://', ''), 'http://', ''), '/', 1), ${hash(connectionToken)}
        FROM publishrank_profiles p WHERE p.netlify_user_id = ${row.netlify_user_id}
      `;
      return json({ site_url: row.site_url, email: row.email, netlify_user_id: row.netlify_user_id, connection_token: connectionToken });
    }
    return methodNotAllowed(['GET', 'POST']);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('plugin-connection failed', error);
    return json({ error: 'Connection service is temporarily unavailable.' }, { status: 500 });
  }
};

export const config: Config = { path: '/api/plugin-connection' };
