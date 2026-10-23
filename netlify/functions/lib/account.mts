import { getUser } from '@netlify/identity';
import type { Context } from '@netlify/functions';

export type PublishRankUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

export async function requireUser(_context: Context): Promise<PublishRankUser> {
  const user = await getUser();
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return user as PublishRankUser;
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init.headers || {}) },
  });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return data && typeof data === 'object' ? data as Record<string, unknown> : {};
  } catch {
    throw new Response('Invalid JSON body', { status: 400 });
  }
}

export function methodNotAllowed(methods: string[]) {
  return new Response('Method not allowed', { status: 405, headers: { Allow: methods.join(', ') } });
}
