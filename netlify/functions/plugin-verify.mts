import { createHash } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import type { Config, Context } from '@netlify/functions';
import { json, methodNotAllowed } from './lib/account.mts';

export default async (request: Request, _context: Context) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return json({ error: 'Unauthorized' }, { status: 401 });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  try {
    const db = getDatabase();
    const rows = await db.sql`
      UPDATE publishrank_wordpress_connections
      SET last_seen_at = NOW()
      WHERE connection_token_hash = ${tokenHash} AND status = 'active'
      RETURNING site_url, site_host, status, last_seen_at
    `;
    if (!rows[0]) return json({ error: 'Connection token is invalid or revoked.' }, { status: 401 });
    return json({ authenticated: true, ...rows[0] });
  } catch (error) {
    console.error('plugin-verify failed', error);
    return json({ error: 'Connection verification is temporarily unavailable.' }, { status: 500 });
  }
};

export const config: Config = { path: '/api/plugin-verify' };
