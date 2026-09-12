import { resolveSocial, SOCIAL_VERSION } from './song-social.mjs';

// Only the top-level tab owns its favicon. Hidden playback-owner frames must not overwrite it.
if (window === window.top && !window.CMDSongFavicon) {
  let serial = 0, index;
  const original = document.querySelector('link[rel~="icon"]')?.href || '/favicon.svg';
  const getIndex = () => index ||= fetch(`/data/song-social.json?v=${SOCIAL_VERSION}`, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('Artwork index unavailable'); return r.json(); })
    .catch(error => { index = null; throw error; });
  const update = async () => {
    const ticket = ++serial, url = location.href;
    try {
      const record = resolveSocial(url, await getIndex());
      if (ticket !== serial || location.href !== url) return;
      const image = record?.image || original;
      if (record) {
        document.title = record.title;
        for (const [key, value] of Object.entries({ 'og:title': record.title, 'og:description': record.description, 'og:url': record.canonical, 'og:image': record.image, 'twitter:title': record.title, 'twitter:image': record.image })) {
          const attribute = key.startsWith('twitter:') ? 'name' : 'property';
          let tag = document.querySelector(`meta[${attribute}="${key}"]`);
          if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.appendChild(tag); }
          tag.content = value || '';
        }
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
        canonical.href = record.canonical;
      }
      for (const rel of ['icon', 'apple-touch-icon']) {
        const matches = [...document.querySelectorAll(rel === 'icon' ? 'link[rel~="icon"]' : 'link[rel="apple-touch-icon"]')];
        const link = matches.shift() || document.head.appendChild(document.createElement('link'));
        matches.forEach(other => other.remove());
        link.rel = rel; link.removeAttribute('type'); link.removeAttribute('sizes');
        if (link.href !== new URL(image, location.href).href) link.href = image;
      }
    } catch { /* The server-rendered icon remains usable when offline. */ }
  };
  window.CMDSongFavicon = { update };
  for (const name of ['pushState', 'replaceState']) {
    const originalHistory = history[name];
    history[name] = function (...args) { const result = originalHistory.apply(this, args); void update(); return result; };
  }
  addEventListener('popstate', update);
  addEventListener('pageshow', update);
  void update();
}
