import type { Config } from '@netlify/functions';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { origin } from './lib/editorial.mts';

const parse = (v: string) => v.split('.').map(n => Number.parseInt(n, 10) || 0);
const compare = (a: string, b: string) => {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', 'X-Content-Type-Options': 'nosniff' };

// Update check. Reads the checksum file shipped in /downloads, so releasing a new ZIP
// plus its .sha256 updates this endpoint without any code change.
export default async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET, OPTIONS' } });
  try {
    const dir = join(process.cwd(), 'downloads');
    const releases = (await readdir(dir)).map(f => /^publishrank-(\d+(?:\.\d+){1,3})\.zip\.sha256$/.exec(f)).filter((m): m is RegExpExecArray => Boolean(m));
    if (!releases.length) throw new Error('No release');
    releases.sort((a, b) => compare(b[1], a[1]));
    const [file, version] = releases[0];
    const sha256 = (await readFile(join(dir, file), 'utf8')).trim().split(/\s+/)[0];
    const current = (new URL(request.url).searchParams.get('current') || '').trim();
    const valid = /^\d+(\.\d+){1,3}$/.test(current);
    const body: Record<string, unknown> = {
      name: 'PublishRank', version, sha256, download_url: `${origin()}/downloads/publishrank-${version}.zip`, details_url: `${origin()}/download.html`,
      requires_wp: '6.3', requires_php: '7.4', tested_wp: '7.1', license: 'GPL-2.0-or-later'
    };
    if (valid) { body.current = current; body.update_available = compare(version, current) > 0; }
    else if (current) return new Response(JSON.stringify({ error: 'Use a version like 2.9.67.' }), { status: 400, headers: { ...headers, 'Cache-Control': 'no-store' } });
    return new Response(JSON.stringify(body), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Release information is temporarily unavailable.' }), { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } });
  }
};
export const config: Config = { path: '/api/version' };
