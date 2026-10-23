import { getDatabase } from '@netlify/database';
import type { Config, Context } from '@netlify/functions';
import { json, methodNotAllowed, requireUser } from './lib/account.mts';

export default async (request: Request, context: Context) => {
  try {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const user = await requireUser(context);
    const db = getDatabase();
    const rows = await db.sql`
      INSERT INTO publishrank_profiles (netlify_user_id, email, display_name)
      VALUES (${user.id}, ${user.email || ''}, ${String(user.user_metadata?.full_name || user.email || '')})
      ON CONFLICT (netlify_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), publishrank_profiles.display_name),
        updated_at = NOW()
      RETURNING id, netlify_user_id, email, display_name, created_at, updated_at
    `;
    return json(rows[0] || {});
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('account-profile failed', error);
    return json({ error: 'Account profile is temporarily unavailable.' }, { status: 500 });
  }
};

export const config: Config = { path: '/api/account-profile' };
