(() => {
  const data = window.CMD_BRIEFING;
  const songs = Array.isArray(window.CMD_SONGS) ? window.CMD_SONGS : [];
  const feed = document.getElementById('updatesFeed');
  if (!data || !Array.isArray(data.entries) || !feed) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const zone = data.timezone || 'America/Edmonton';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthOnly = value => /^\d{4}-\d{2}$/.test(String(value || ''));
  const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const bySongId = new Map(songs.map(song => [song.id, song]));

  const dayKey = value => {
    const text = String(value || '');
    if (monthOnly(text) || dateOnly(text)) return text;
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date(text));
    } catch {
      return text.slice(0, 10);
    }
  };

  const prettyDate = value => {
    const text = String(value || '');
    if (monthOnly(text)) {
      const [year, month] = text.split('-').map(Number);
      return `${months[month - 1] || month} ${year}`;
    }
    if (dateOnly(text)) {
      const [year, month, day] = text.split('-').map(Number);
      return `${months[month - 1] || month} ${day}, ${year}`;
    }
    try {
      return new Intl.DateTimeFormat('en', {
        timeZone: zone, month: 'long', day: 'numeric', year: 'numeric'
      }).format(new Date(text));
    } catch {
      return text.slice(0, 10);
    }
  };

  const score = value => {
    const text = String(value || '');
    if (monthOnly(text)) {
      const [year, month] = text.split('-').map(Number);
      return Date.UTC(year, month - 1, 1);
    }
    if (dateOnly(text)) {
      const [year, month, day] = text.split('-').map(Number);
      return Date.UTC(year, month - 1, day);
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolved = data.entries.map(entry => {
    const song = entry.songId ? bySongId.get(entry.songId) : null;
    return {
      ...entry,
      song,
      title: entry.title || song?.title || entry.id,
      summary: entry.summary || entry.cardSummary || song?.description || '',
      href: entry.href || song?.experience || (entry.songId ? `/music/?song=${encodeURIComponent(entry.songId)}` : '')
    };
  }).sort((a, b) => score(b.published) - score(a.published));

  const groups = new Map();
  resolved.forEach(entry => {
    const key = dayKey(entry.published);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  feed.innerHTML = [...groups.entries()].map(([key, entries]) => {
    const partial = monthOnly(key);
    const label = prettyDate(entries[0]?.published || key);
    const cards = entries.map(entry => `
      <article class="update-card" id="${escapeHtml(entry.id)}">
        <div class="update-meta">
          <span>${escapeHtml(entry.type || 'Update')}</span>
          ${entry.badge ? `<b>${escapeHtml(entry.badge)}</b>` : ''}
          ${entry.song ? `<span>${escapeHtml(entry.song.artist || '')}</span>` : ''}
        </div>
        <h3>${escapeHtml(entry.title)}</h3>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="update-actions">
          ${entry.href ? `<a href="${escapeHtml(entry.href)}">${escapeHtml(entry.cta || (entry.song ? 'Open release' : 'Open'))} →</a>` : ''}
          <a href="#${encodeURIComponent(entry.id)}" aria-label="Permanent link to ${escapeHtml(entry.title)}">Permalink</a>
          <button class="update-share" type="button" data-share="${escapeHtml(entry.id)}" data-title="${escapeHtml(entry.title)}">Share update</button>
        </div>
      </article>`).join('');

    return `
      <section class="updates-day" data-date="${escapeHtml(key)}">
        <div class="updates-day-head">
          <h2>${escapeHtml(label)}</h2>
          <span>${partial ? 'Exact day not recorded' : `${entries.length} ${entries.length === 1 ? 'update' : 'updates'}`}</span>
        </div>
        <div class="updates-list">${cards}</div>
      </section>`;
  }).join('') || '<p class="updates-empty">No public updates yet.</p>';

  const featuredCount = resolved.filter(entry => entry.featured).length;
  const updateCount = document.getElementById('updateCount');
  const releaseCount = document.getElementById('releaseCount');
  const catalogCount = document.getElementById('catalogCount');
  if (updateCount) updateCount.textContent = String(resolved.length);
  if (releaseCount) releaseCount.textContent = String(featuredCount);
  if (catalogCount) catalogCount.textContent = String(songs.length);

  const shareUrl = id => `${location.origin}/updates/#${encodeURIComponent(id)}`;
  document.querySelectorAll('[data-share]').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.share || '';
      const title = button.dataset.title || 'Call Me Daddy update';
      const url = shareUrl(id);
      try {
        if (navigator.share) {
          await navigator.share({ title, text: title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        const previous = button.textContent;
        button.textContent = 'Link copied';
        setTimeout(() => { button.textContent = previous; }, 1800);
      } catch (_) {
        try {
          await navigator.clipboard.writeText(url);
          button.textContent = 'Link copied';
        } catch (_) {
          location.hash = id;
        }
      }
    });
  });

  if (location.hash.length > 1) {
    const id = decodeURIComponent(location.hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }
})();