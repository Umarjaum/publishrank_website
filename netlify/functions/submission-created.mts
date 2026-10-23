// Runs automatically after every Netlify Form submission (event function name).
// Adds a ticket ID and priority, then optionally notifies the developer and replies to the reporter.
// Optional environment variables: ISSUE_WEBHOOK_URL (Slack or Discord), RESEND_API_KEY,
// ISSUE_NOTIFY_EMAIL, ISSUE_FROM_EMAIL, ISSUE_AUTOREPLY=off
type Data = Record<string, unknown>;
const text = (v: unknown, max = 600): string => {
  const s = Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '';
  return s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
};
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const priority = (d: Data) => {
  const sev = text(d.severity), type = text(d.report_type);
  if (type === 'security' || sev === 'Blocks publishing') return 'P1 urgent';
  if (sev === 'Major feature broken') return 'P2 high';
  if (type === 'feature' || type === 'docs' || sev === 'Cosmetic') return 'P4 low';
  return 'P3 normal';
};
const checks = (d: Data) => {
  const list = ['Clear the page cache and CDN, then retry.', 'Turn off other SEO plugins to test for a conflict.', 'Open PublishRank → Diagnostics and note any warning.'];
  if (text(d.tool) === 'Sitemap Health' || text(d.report_type) === 'indexing') list.push('Open the sitemap index URL in a private window and note the status code.');
  if (text(d.tool) === 'Traffic Guard') list.push('Confirm your trusted proxy ranges and test from a different network.');
  return list;
};

export default async (request: Request) => {
  const body = await request.json().catch(() => null) as { payload?: { id?: string; form_name?: string; created_at?: string; data?: Data } } | null;
  const payload = body?.payload;
  if (!payload || payload.form_name !== 'issue-report') return new Response(null, { status: 204 });
  const d = payload.data || {};
  const stamp = (payload.created_at || new Date().toISOString()).slice(2, 10).replace(/-/g, '');
  const ticket = `PR-${stamp}-${(payload.id || Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()}`;
  const level = priority(d);
  const attachments = ['screenshot_1', 'screenshot_2'].map(k => d[k] as { url?: string; filename?: string } | undefined).filter(f => f && typeof f === 'object' && f.url).map(f => `${text(f!.filename, 80) || 'screenshot'}: ${text(f!.url, 400)}`);
  const lines = [
    `New PublishRank report ${ticket} [${level}]`,
    `Summary: ${text(d.summary, 140) || '(none)'}`,
    `Type: ${text(d.report_type) || 'n/a'} | Tool: ${text(d.tool) || 'n/a'} | Severity: ${text(d.severity) || 'n/a'} | Frequency: ${text(d.frequency) || 'n/a'}`,
    `Versions: PublishRank ${text(d.plugin_version) || '?'} | WP ${text(d.wp_version) || '?'} | PHP ${text(d.php_version) || '?'} | Theme ${text(d.theme) || '?'}`,
    `Cache/CDN: ${text(d.cache_cdn) || 'n/a'} | Other SEO plugins: ${text(d.other_seo_plugins) || 'n/a'}`,
    text(d.affected_url) ? `URL: ${text(d.affected_url)}` : '',
    `Steps: ${text(d.steps, 700) || '(not given)'}`,
    `Expected: ${text(d.expected, 300) || '(not given)'}`, `Actual: ${text(d.actual, 300) || '(not given)'}`,
    text(d.error_message) ? `Error: ${text(d.error_message, 500)}` : '',
    attachments.length ? `Attachments (links expire): ${attachments.join(' · ')}` : '',
    `Reply: ${text(d.can_follow_up) && text(d.email) ? text(d.email, 120) : 'no follow-up requested'}`
  ].filter(Boolean);
  const summary = lines.join('\n').slice(0, 1900);
  const jobs: Promise<unknown>[] = [];
  const hook = process.env.ISSUE_WEBHOOK_URL;
  if (hook) jobs.push(fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: summary, content: summary, username: 'PublishRank issues' }) }));
  const key = process.env.RESEND_API_KEY, to = process.env.ISSUE_NOTIFY_EMAIL, from = process.env.ISSUE_FROM_EMAIL;
  const send = (payload: Record<string, unknown>) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (key && to && from) {
    const reporter = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(d.email, 200)) ? text(d.email, 200) : '';
    jobs.push(send({ from, to: [to], subject: `[${level}] ${ticket}: ${text(d.summary, 90) || 'PublishRank report'}`, text: summary, ...(reporter && text(d.can_follow_up) ? { reply_to: reporter } : {}) }));
    if (reporter && text(d.can_follow_up) && process.env.ISSUE_AUTOREPLY !== 'off') {
      jobs.push(send({ from, to: [reporter], subject: `We received your PublishRank report ${ticket}`, html: `<p>Thank you${text(d.name) ? ', ' + esc(text(d.name, 80)) : ''}. Your report <b>${ticket}</b> (“${esc(text(d.summary, 120))}”) reached the developer.</p><p>PublishRank is a nonprofit project, so there is no guaranteed response time. While you wait, try:</p><ul>${checks(d).map(c => `<li>${esc(c)}</li>`).join('')}</ul><p>Quote ${ticket} if you reply to this email.</p>` }));
    }
  }
  const results = await Promise.allSettled(jobs);
  console.log(JSON.stringify({ ticket, level, notified: results.filter(r => r.status === 'fulfilled').length, failed: results.filter(r => r.status === 'rejected').length }));
  return new Response(null, { status: 204 });
};
