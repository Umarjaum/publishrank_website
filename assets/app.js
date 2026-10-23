document.documentElement.classList.add('js');

const navigation = document.getElementById('primary-links');
const menuToggle = document.querySelector('.menu-toggle');

if (navigation && menuToggle) {
  menuToggle.hidden = false;
  const closeMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    navigation.classList.toggle('is-open', !expanded);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuToggle.focus();
    }
  });
  const currentPath = window.location.pathname;
  navigation.querySelectorAll('a').forEach(anchor => {
    const destination = new URL(anchor.href).pathname;
    if (destination === currentPath || (destination === '/docs.html' && currentPath.startsWith('/docs-'))) {
      anchor.setAttribute('aria-current', 'page');
    }
  });
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

const searchInput = document.getElementById('docs-search');
if (searchInput) {
  const guides = [...document.querySelectorAll('[data-guide]')];
  const status = document.getElementById('search-status');
  const emptyState = document.querySelector('.search-empty');
  searchInput.closest('.search-wrap').hidden = false;
  const filterGuides = () => {
    const terms = searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let matchCount = 0;
    guides.forEach(guide => {
      const text = guide.dataset.search.toLowerCase();
      const matches = terms.every(term => text.includes(term));
      guide.hidden = !matches;
      if (matches) matchCount += 1;
    });
    status.textContent = `${matchCount} ${matchCount === 1 ? 'guide' : 'guides'} ${terms.length ? 'found' : 'available'}`;
    emptyState.hidden = matchCount !== 0;
  };
  searchInput.addEventListener('input', filterGuides);
  document.getElementById('clear-search').addEventListener('click', () => {
    searchInput.value = '';
    filterGuides();
    searchInput.focus();
  });
}

document.querySelectorAll('.copy-code').forEach(button => {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const block = button.closest('.code-block');
    const status = block.querySelector('.copy-status');
    button.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(block.querySelector('code').textContent);
      status.textContent = 'Copied to clipboard.';
    } catch {
      status.textContent = 'Clipboard access is unavailable. Select the example text and copy it manually.';
    } finally {
      button.disabled = false;
    }
  });
});

/* mega menu */
(() => {
  const items = [...document.querySelectorAll('.mi.has-mega')];
  if (!items.length) return;
  const desktop = window.matchMedia('(min-width: 901px)');
  let timer;
  const setOpen = (item, open) => {
    item.classList.toggle('open', open);
    item.querySelector('.mi-btn').setAttribute('aria-expanded', String(open));
  };
  const closeAll = except => items.forEach(item => item !== except && setOpen(item, false));
  items.forEach(item => {
    item.querySelector('.mi-btn').addEventListener('click', () => {
      const willOpen = !item.classList.contains('open');
      closeAll(item);
      setOpen(item, willOpen);
    });
    item.addEventListener('mouseenter', () => { if (desktop.matches) { clearTimeout(timer); closeAll(item); setOpen(item, true); } });
    item.addEventListener('mouseleave', () => { if (desktop.matches) timer = setTimeout(() => setOpen(item, false), 180); });
    item.addEventListener('focusout', event => { if (!item.contains(event.relatedTarget)) setOpen(item, false); });
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAll(); });
  document.addEventListener('click', event => { if (!event.target.closest('.mi')) closeAll(); });
})();

/* hero screenshot fader */
(() => {
  const root = document.querySelector('[data-fader]');
  if (!root) return;
  const stage = root.parentElement;
  const imgs = [...root.querySelectorAll('.fd-img')];
  const tabs = [...stage.querySelectorAll('.fd-tab')];
  const bar = root.querySelector('.fd-bar');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = 5000;
  let index = 0, timer;
  const show = next => {
    index = (next + imgs.length) % imgs.length;
    imgs.forEach((img, i) => img.classList.toggle('is-active', i === index));
    tabs.forEach((tab, i) => { tab.classList.toggle('is-active', i === index); tab.setAttribute('aria-pressed', String(i === index)); });
    bar.classList.remove('run'); void bar.offsetWidth;
    if (!still && !paused) bar.classList.add('run');
  };
  let paused = still;
  bar.style.setProperty('--dur', DUR + 'ms');
  const play = () => { clearInterval(timer); if (still) return; paused = false; timer = setInterval(() => show(index + 1), DUR); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); };
  const pause = () => { paused = true; clearInterval(timer); bar.classList.remove('run'); };
  tabs.forEach((tab, i) => tab.addEventListener('click', () => { show(i); play(); }));
  stage.addEventListener('mouseenter', pause); stage.addEventListener('mouseleave', play);
  stage.addEventListener('focusin', pause); stage.addEventListener('focusout', play);
  play();
})();

/* screenshot carousels */
document.querySelectorAll('[data-carousel]').forEach(root => {
  const track = root.querySelector('.car-track');
  const slides = [...track.children];
  const dots = root.querySelector('.car-dots');
  const prev = root.querySelector('.car-prev');
  const next = root.querySelector('.car-next');
  slides.forEach(() => dots.appendChild(document.createElement('i')));
  const step = () => slides[0].getBoundingClientRect().width + 20;
  const current = () => Math.round(track.scrollLeft / step());
  const update = () => {
    const i = Math.min(current(), slides.length - 1);
    [...dots.children].forEach((dot, n) => dot.classList.toggle('on', n === i));
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); next.click(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); prev.click(); }
  });
  window.addEventListener('resize', update);
  update();
});

/* issue report form */
(() => {
  const form = document.querySelector('.issue-form');
  if (!form) return;
  const hints = {
    'site-wide': 'Not sure which tool? Describe the symptom and the URL where you saw it.',
    'Traffic Guard': 'Include your IP rules format, whether a proxy or Cloudflare is in front, and whether you are logged in.',
    'Site Verification': 'Say which engine, whether you used a meta tag or file, and what the live test showed.',
    'Sitemap Health': 'Include the sitemap URL and the exact status code or XML error.',
    'IndexNow': 'Include the response shown in the submission log.',
    'AI & llms.txt': 'Include the /llms.txt URL and any problem the preview reported.'
  };
  const type = form.querySelector('#f-type');
  const tool = form.querySelector('#f-tool');
  const hint = form.querySelector('#tool-hint');
  const errorField = form.querySelector('#c-error');
  const updateHint = () => {
    const text = hints[tool.value] || (tool.value ? 'Name the exact button or setting you used on ' + tool.value + '.' : '');
    hint.hidden = !text; hint.textContent = text;
  };
  const updateCond = () => { errorField.hidden = !['bug', 'conflict', 'performance', 'indexing'].includes(type.value); };
  tool.addEventListener('change', updateHint); type.addEventListener('change', updateCond);
  const query = new URLSearchParams(location.search);
  const slug = query.get('tool');
  if (slug) {
    const wanted = slug.replace(/-/g, '').toLowerCase();
    const match = [...tool.options].find(o => o.value.replace(/[^a-z0-9]/gi, '').toLowerCase() === wanted);
    if (match) tool.value = match.value;
  }
  updateHint(); updateCond();
  form.querySelectorAll('[data-count]').forEach(field => {
    const out = field.parentElement.querySelector('.count');
    const draw = () => { out.textContent = field.value.length + ' / ' + field.dataset.count; };
    field.addEventListener('input', draw); draw();
  });
  const fileError = form.querySelector('#file-error');
  form.querySelectorAll('[data-file]').forEach(input => input.addEventListener('change', () => {
    const files = [...form.querySelectorAll('[data-file]')].map(i => i.files[0]).filter(Boolean);
    const total = files.reduce((n, f) => n + f.size, 0);
    const tooBig = files.some(f => f.size > 3 * 1024 * 1024) || total > 7 * 1024 * 1024;
    fileError.hidden = !tooBig;
    if (tooBig) { fileError.textContent = 'Screenshots are too large. Keep each under 3 MB and the total under 7 MB.'; input.value = ''; }
  }));
  const fill = document.getElementById('meter-fill'), pct = document.getElementById('meter-pct'), tip = document.getElementById('meter-tip');
  const email = form.querySelector('#f-email'), follow = form.querySelector('#f-follow');
  const syncEmail = () => { email.required = follow.checked; };
  follow.addEventListener('change', syncEmail); syncEmail();
  const keys = ['summary', 'report_type', 'tool', 'severity', 'frequency', 'steps', 'expected', 'actual', 'wp_version', 'php_version', 'theme', 'error_message', 'affected_url', 'other_seo_plugins', 'screenshot_1'];
  const filled = name => {
    const el = form.elements[name]; if (!el) return false;
    if (el.length && el[0] && el[0].type === 'radio') return [...el].some(r => r.checked);
    if (el.type === 'file') return el.files.length > 0;
    return el.value.trim() !== '';
  };
  const score = () => {
    const value = Math.round(keys.filter(filled).length / keys.length * 100);
    fill.style.width = value + '%'; pct.textContent = value + '%';
    tip.textContent = !filled('summary') ? 'Add a short summary to send. Everything else is optional.' : value < 50 ? 'Sendable. Add steps and versions to help the developer.' : value < 80 ? 'Good. An error message or screenshot would help more.' : 'Excellent. This is easy to reproduce.';
  };
  form.addEventListener('input', score); form.addEventListener('change', score); score();
})();

/* thanks page checklist */
(() => {
  const box = document.querySelector('.try'); if (!box) return;
  const items = [...box.querySelectorAll('input[type=checkbox]')];
  const update = () => { const n = items.filter(i => i.checked).length; document.getElementById('try-fill').style.width = n / items.length * 100 + '%'; document.getElementById('try-text').textContent = n + ' of ' + items.length + ' done' + (n === items.length ? '. If the problem remains, the developer has your report.' : ''); };
  items.forEach(i => i.addEventListener('change', update));
})();

/* site search dialog (Netlify Function: /api/search) */
(() => {
  const openers = document.querySelectorAll('[data-search-open]');
  if (!openers.length || typeof HTMLDialogElement === 'undefined') return;
  let dialog, input, list, status, items = [], active = -1, timer, controller;
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const build = () => {
    dialog = document.createElement('dialog'); dialog.className = 'sx'; dialog.setAttribute('aria-label', 'Search PublishRank');
    dialog.innerHTML = '<div class="sx-top"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="#e0c994" stroke-width="2"/><path d="M13 13l5 5" stroke="#e0c994" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Search tools, guides and docs" aria-label="Search" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="sx-list"><button class="sx-close" type="button">Esc</button></div><ul class="sx-list" id="sx-list" role="listbox"></ul><p class="sx-status" role="status" aria-live="polite"></p>';
    document.body.appendChild(dialog);
    input = dialog.querySelector('input'); list = dialog.querySelector('.sx-list'); status = dialog.querySelector('.sx-status');
    dialog.querySelector('.sx-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 160); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; mark(); }
      if (e.key === 'Enter' && items[active]) { e.preventDefault(); location.href = items[active].url; }
    });
  };
  const mark = () => list.querySelectorAll('a').forEach((a, i) => { a.setAttribute('aria-selected', String(i === active)); if (i === active) { input.setAttribute('aria-activedescendant', a.id); a.scrollIntoView({ block: 'nearest' }); } });
  const draw = (results, label) => {
    items = results; active = results.length ? 0 : -1;
    list.innerHTML = results.map((r, i) => '<li role="presentation"><a role="option" id="sx-' + i + '" href="' + esc(r.url) + '"><b>' + esc(r.title) + '<span class="sx-kind">' + esc(r.kind) + '</span></b><small>' + esc(r.description) + '</small></a></li>').join('');
    status.textContent = label; mark();
  };
  const run = async () => {
    const q = input.value.trim();
    if (controller) controller.abort(); controller = new AbortController();
    try {
      const res = await fetch('/api/search?limit=8&q=' + encodeURIComponent(q), { signal: controller.signal });
      if (!res.ok) throw new Error();
      const data = await res.json();
      draw(data.results, q ? (data.count ? data.count + ' result' + (data.count > 1 ? 's' : '') : 'No results for “' + q + '”. Try a tool name such as Sitemap Health.') : 'Popular pages');
    } catch (err) { if (err.name !== 'AbortError') { draw([], 'Search is unavailable right now. Browse the documentation hub instead.'); list.innerHTML = '<li role="presentation"><a href="/docs.html"><b>Documentation hub</b><small>Search all six chapters in one place.</small></a></li>'; } }
  };
  const open = () => { if (!dialog) build(); if (!dialog.open) dialog.showModal(); input.value = ''; run(); input.focus(); };
  openers.forEach(b => b.addEventListener('click', open));
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
  });
})();

/* issue form: live help suggestions */
(() => {
  const box = document.getElementById('help-hits'), field = document.querySelector('.issue-form [name=summary]');
  if (!box || !field) return;
  let timer, controller;
  field.addEventListener('input', () => {
    clearTimeout(timer);
    const q = field.value.trim();
    if (q.length < 8) { box.hidden = true; return; }
    timer = setTimeout(async () => {
      if (controller) controller.abort(); controller = new AbortController();
      try {
        const res = await fetch('/api/search?limit=3&boost=docs&q=' + encodeURIComponent(q), { signal: controller.signal });
        if (!res.ok) return;
        const { results } = await res.json();
        box.hidden = !results.length;
        const ul = box.querySelector('ul'); ul.textContent = '';
        results.forEach(r => { const li = document.createElement('li'), a = document.createElement('a'); a.href = r.url; a.textContent = r.title; a.target = '_blank'; a.rel = 'noopener'; li.append(a); ul.append(li); });
      } catch { /* suggestions are optional */ }
    }, 500);
  });
})();

/* download page: update check (Netlify Function: /api/version) */
(() => {
  const form = document.querySelector('.uc-form'), out = document.getElementById('uc-out');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const v = document.getElementById('uc-version').value.trim();
    out.className = 'uc-out'; out.textContent = 'Checking…';
    try {
      const res = await fetch('/api/version?current=' + encodeURIComponent(v));
      const d = await res.json();
      if (!res.ok) { out.className = 'uc-out warn'; out.textContent = d.error || 'The check failed. Try again shortly.'; return; }
      out.textContent = '';
      const p = document.createElement('p'); p.style.margin = '0';
      p.textContent = d.update_available ? 'Version ' + d.version + ' is available. You have ' + d.current + '.' : 'You are up to date. Latest release: ' + d.version + '.';
      out.append(p);
      if (d.update_available) { const a = document.createElement('a'); a.href = d.download_url; a.textContent = 'Download ' + d.version; a.className = 'text-link'; out.append(a); out.className = 'uc-out warn'; }
      const s = document.createElement('p'); s.style.cssText = 'margin:8px 0 0;font-size:12px'; s.append('SHA-256: '); const c = document.createElement('code'); c.textContent = d.sha256; s.append(c); out.append(s);
    } catch { out.className = 'uc-out warn'; out.textContent = 'The check could not reach the release service.'; }
  });
})();

/* News: menu indicator, live refresh and optional images (data from /api/news/status, driven by announcements.json) */
(function () {
  // Optional images: if a link is dead, remove the frame so no broken image is ever shown.
  function drop(img) { var f = img.closest('figure'); (f || img).remove(); }
  function sweep() { document.querySelectorAll('img[data-optional]').forEach(function (i) { if (i.complete && i.naturalWidth === 0) drop(i); }); }
  document.addEventListener('error', function (e) { if (e.target && e.target.matches && e.target.matches('img[data-optional]')) drop(e.target); }, true);
  sweep(); window.addEventListener('load', sweep);

  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a.mi-link[href="/news"]'));
  if (!links.length) return;
  var KEY = 'pr_news_seen', RECENT = 14 * 86400000;
  var path = location.pathname.replace(/\/$/, '');
  var onNews = path === '/news' || path.indexOf('/news/') === 0;
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function render(n) {
    links.forEach(function (a) {
      var b = a.querySelector('.nav-new');
      if (!n) { if (b) b.remove(); a.removeAttribute('aria-label'); return; }
      if (!b) { b = document.createElement('span'); b.className = 'nav-new'; b.setAttribute('aria-hidden', 'true'); a.appendChild(b); }
      b.textContent = n > 1 ? n + ' new' : 'New';
      a.setAttribute('aria-label', 'News, ' + (n > 1 ? n + ' new stories' : '1 new story'));
    });
  }
  function apply(d) {
    if (!d || !d.stamp) return render(0);
    if (onNews) { set(d.stamp); return render(0); }
    var seen = get(), now = Date.now();
    var fresh = d.items.filter(function (i) { return i.stamp > seen && now - Date.parse(i.stamp) < RECENT; });
    render(Math.min(fresh.length, 9));
  }
  function check() {
    fetch('/api/news/status', { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      apply(d);
      var live = document.getElementById('news-live');
      if (live && d && d.stamp && live.dataset.stamp && d.stamp !== live.dataset.stamp) {
        live.hidden = false; var btn = live.querySelector('button'); if (btn) btn.onclick = function () { location.reload(); };
      }
    }).catch(function () {});
  }
  check();
  setInterval(check, 300000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();

/* New-story popup: shows the newest story or feature once per revision (data from /api/news/popup). */
(function () {
  var p = location.pathname;
  if (/^\/(news|report-issue|issue-thanks)/.test(p) || /^\/news/.test(p)) return;
  var KEY = 'pr_popup_seen';
  function seen() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function mark(k) { try { localStorage.setItem(KEY, k); } catch (e) {} }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  setTimeout(function () {
    fetch('/api/news/popup', { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var it = d && d.item; if (!it || seen() === it.key) return;
      var box = el('div', 'site-popup'); box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'New on PublishRank'); box.setAttribute('aria-live', 'polite');
      var html = '';
      if (it.image) html += '<figure><img data-optional src="' + esc(it.image) + '" alt="' + esc(it.image_alt || '') + '" width="400" height="225" referrerpolicy="no-referrer"></figure>';
      html += '<div class="site-popup-body"><span class="site-popup-tag"><i class="fa-solid fa-' + esc(it.icon) + '" aria-hidden="true"></i> New · ' + esc(it.category) + '</span><h2>' + esc(it.title) + '</h2><p>' + esc(it.summary) + '</p><a class="btn primary" href="/news/' + encodeURIComponent(it.slug) + '"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Read more</a></div>';
      box.innerHTML = html;
      var x = el('button', 'site-popup-close', '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'); x.type = 'button'; x.setAttribute('aria-label', 'Dismiss this notice');
      function close() { mark(it.key); box.remove(); document.removeEventListener('keydown', onKey); }
      function onKey(e) { if (e.key === 'Escape') close(); }
      x.addEventListener('click', close); box.appendChild(x);
      box.querySelector('a.btn').addEventListener('click', function () { mark(it.key); });
      document.addEventListener('keydown', onKey); document.body.appendChild(box);
      var img = box.querySelector('img'); if (img) img.addEventListener('error', function () { img.closest('figure').remove(); });
    }).catch(function () {});
  }, 3000);
})();
