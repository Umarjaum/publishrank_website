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

async function loadEditorialPhoto(figure) {
  try {
    const response = await fetch(`/api/editorial-photos?topic=${encodeURIComponent(figure.dataset.unsplash)}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok || response.status === 204) return;
    const photo = await response.json();
    const imageUrl = new URL(photo.src);
    const photographerUrl = new URL(photo.photographerUrl);
    const photoUrl = new URL(photo.photoUrl);
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'images.unsplash.com' ||
        photographerUrl.protocol !== 'https:' || photographerUrl.hostname !== 'unsplash.com' ||
        photoUrl.protocol !== 'https:' || photoUrl.hostname !== 'unsplash.com') return;
    const image = figure.querySelector('img');
    const preview = new Image();
    preview.src = photo.src;
    await preview.decode();
    image.removeAttribute('srcset');
    image.src = photo.src;
    image.alt = photo.alt;
    const photographer = document.createElement('a');
    photographer.href = photo.photographerUrl;
    photographer.textContent = photo.photographer;
    const source = document.createElement('a');
    source.href = photo.photoUrl;
    source.textContent = 'Unsplash';
    figure.querySelector('figcaption').replaceChildren('Photo by ', photographer, ' on ', source);
  } catch {
    return;
  }
}

if ('IntersectionObserver' in window) {
  const photoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      photoObserver.unobserve(entry.target);
      loadEditorialPhoto(entry.target);
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('[data-unsplash]').forEach(figure => photoObserver.observe(figure));
}
