import type { Config } from '@netlify/functions';

declare const Netlify: { env: { get(name: string): string | undefined } };

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (request.method !== 'GET') {
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
  }
  const queries: Record<string, string> = {
    newsroom: 'newspaper journalism',
    editorial: 'writing desk notebook',
    publishing: 'workspace laptop publishing',
  };
  const topic = new URL(request.url).searchParams.get('topic') || 'newsroom';
  if (!Object.hasOwn(queries, topic)) {
    return Response.json({ error: 'Unknown image topic.' }, { status: 400, headers });
  }
  const accessKey = Netlify.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) return new Response(null, { status: 204, headers });
  try {
    const endpoint = new URL('https://api.unsplash.com/search/photos');
    endpoint.search = new URLSearchParams({
      query: queries[topic], orientation: 'landscape', per_page: '1', content_filter: 'high',
    }).toString();
    const response = await fetch(endpoint, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return new Response(null, { status: 204, headers });
    const result = await response.json();
    const photo = result.results?.[0];
    if (!photo?.urls?.raw || !photo?.links?.html || !photo?.user?.links?.html || !photo?.user?.name) {
      return new Response(null, { status: 204, headers });
    }
    const image = new URL(photo.urls.raw);
    const photoLink = new URL(photo.links.html);
    const photographerLink = new URL(photo.user.links.html);
    if (image.protocol !== 'https:' || image.hostname !== 'images.unsplash.com' ||
        photoLink.protocol !== 'https:' || photoLink.hostname !== 'unsplash.com' ||
        photographerLink.protocol !== 'https:' || photographerLink.hostname !== 'unsplash.com') {
      return new Response(null, { status: 204, headers });
    }
    image.searchParams.set('auto', 'format');
    image.searchParams.set('fit', 'crop');
    image.searchParams.set('w', '1200');
    image.searchParams.set('h', '675');
    image.searchParams.set('q', '80');
    for (const link of [photoLink, photographerLink]) {
      link.searchParams.set('utm_source', 'publishrank');
      link.searchParams.set('utm_medium', 'referral');
    }
    return Response.json({
      src: image.href,
      alt: photo.alt_description || photo.description || 'Editorial photography from Unsplash',
      photographer: photo.user.name,
      photographerUrl: photographerLink.href,
      photoUrl: photoLink.href,
    }, { headers: {
      ...headers,
      'Cache-Control': 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    } });
  } catch {
    return new Response(null, { status: 204, headers });
  }
};

export const config: Config = { path: '/api/editorial-photos' };
