(() => {
  const data = window.CMD_BRIEFING;
  if (!data || !Array.isArray(data.entries) || !data.entries.length) return;

  const loadSongs = () => new Promise(resolve => {
    if (Array.isArray(window.CMD_SONGS)) {
      resolve(window.CMD_SONGS);
      return;
    }
    const existing = document.querySelector('script[src^="/data/songs.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.CMD_SONGS || []), { once: true });
      existing.addEventListener('error', () => resolve([]), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = '/data/songs.js';
    script.addEventListener('load', () => resolve(window.CMD_SONGS || []), { once: true });
    script.addEventListener('error', () => resolve([]), { once: true });
    document.head.appendChild(script);
  });

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const zone = data.timezone || 'America/Edmonton';
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthOnly = value => /^\d{4}-\d{2}$/.test(String(value || ''));
  const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

  const dateKey = value => {
    const text = String(value || '');
    if (dateOnly(text)) return text;
    if (monthOnly(text)) return text;
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(text));
    } catch {
      return text.slice(0, 10);
    }
  };

  const currentDateKey = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const prettyDate = value => {
    const text = String(value || '');
    if (monthOnly(text)) {
      const [year, month] = text.split('-').map(Number);
      return `${monthNames[month - 1] || month} ${year}`;
    }
    if (dateOnly(text)) {
      const [year, month, day] = text.split('-').map(Number);
      return `${monthNames[month - 1] || month} ${day}, ${year}`;
    }
    try {
      return new Intl.DateTimeFormat('en', {
        timeZone: zone,
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(text));
    } catch {
      return text.slice(0, 10);
    }
  };

  const dateScore = value => {
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

  const configIntents = Array.isArray(window.CMD_RADIO_CONFIG?.intents) ? window.CMD_RADIO_CONFIG.intents : [];
  const fallbackIntents = [
    { id: 'surprise', label: 'Play the site', description: 'The whole catalog, weighted toward fresh turns, clean variety and things you have not just heard.' },
    { id: 'laugh', label: 'Make me laugh', description: 'Comedy, satire, shock-value punchlines and songs that should not work nearly this well.' },
    { id: 'think', label: 'Make me think', description: 'Ideas, contradictions, creative process and songs that change depending on what plays beside them.' },
    { id: 'level-up', label: 'Level me up', description: 'Adaptation, survival, better people and enough momentum to move instead of shrinking.' },
    { id: 'heavy', label: 'Give me heavy', description: 'Confinement, pressure, grief, numbness and the records that pushed back instead of pretending.' },
    { id: 'old-files', label: 'Show old files', description: 'Older writing, resurfaced recordings and the new versions that grew out of them.' }
  ];
  const intents = configIntents.length ? configIntents : fallbackIntents;

  loadSongs().then(songs => {
    const bySongId = new Map((songs || []).map(song => [song.id, song]));
    const resolveEntry = entry => {
      const song = entry.songId ? bySongId.get(entry.songId) : null;
      return {
        ...entry,
        song,
        title: entry.title || song?.title || entry.id,
        summary: entry.summary || entry.cardSummary || song?.description || '',
        href: entry.href || song?.experience || (entry.songId ? `/music/?song=${encodeURIComponent(entry.songId)}` : ''),
        updateHref: entry.sharePath || `/updates/${encodeURIComponent(entry.id)}/`
      };
    };

    const entries = data.entries.map(resolveEntry);
    const dayEntries = entries
      .filter(entry => entry.published && !monthOnly(entry.published))
      .sort((a, b) => dateScore(b.published) - dateScore(a.published));

    if (!dayEntries.length) return;

    const latestKey = dateKey(dayEntries[0].published);
    const latestEntries = dayEntries.filter(entry => dateKey(entry.published) === latestKey);
    const latestLabel = prettyDate(dayEntries[0].published);
    const isToday = latestKey === currentDateKey();
    const briefingTitle = isToday ? 'WHAT CHANGED<br>TODAY.' : 'LATEST<br>CHANGES.';
    const briefingKicker = isToday ? `Daily briefing · ${latestLabel}` : `Latest briefing · ${latestLabel}`;
    const heroLabel = isToday ? 'What changed today ↓' : 'Latest changes ↓';

    const feed = latestEntries.map((entry, index) => `
      <article class="briefing-item${index === 0 ? ' briefing-item-lead' : ''}" id="home-${escapeHtml(entry.id)}">
        <div class="briefing-item-meta">
          <span>${escapeHtml(entry.type || 'Update')}</span>
          ${entry.badge ? `<b>${escapeHtml(entry.badge)}</b>` : ''}
        </div>
        <h3>${escapeHtml(entry.title)}</h3>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="briefing-item-actions">
          ${entry.href ? `<a href="${escapeHtml(entry.href)}">${escapeHtml(entry.cta || 'Open')} <span aria-hidden="true">→</span></a>` : ''}
          <a class="briefing-permalink" href="${escapeHtml(entry.updateHref)}">Open update</a>
        </div>
      </article>
    `).join('');

    const radioLanes = intents.map(intent => `
      <a class="briefing-intent" href="/music/?intent=${encodeURIComponent(intent.id)}">
        <span><strong>${escapeHtml(intent.label)}</strong><small>${escapeHtml(intent.description)}</small></span>
        <b aria-hidden="true">→</b>
      </a>
    `).join('');

    const section = document.createElement('section');
    section.className = 'shell briefing-section';
    section.id = 'briefing';
    section.innerHTML = `
      <div class="briefing-head">
        <div>
          <div class="eyebrow">${escapeHtml(briefingKicker)}</div>
          <h2>${briefingTitle}</h2>
        </div>
        <div class="briefing-status">
          <span class="briefing-live-dot" aria-hidden="true"></span>
          <div>
            <strong>${latestEntries.length} ${latestEntries.length === 1 ? 'update' : 'updates'} in the latest drop</strong>
            <small>Music, experiments, archive finds and site changes all count.</small>
            <a class="briefing-all" href="/updates/">See everything that changed →</a>
          </div>
        </div>
      </div>

      <div class="briefing-layout">
        <div class="briefing-feed">${feed}</div>
        <aside class="briefing-radio-card">
          <div class="kicker">Don't browse. Pick an intention.</div>
          <h3>WHAT DO YOU WANT<br>THE MUSIC TO DO?</h3>
          <p>The radio uses your answer as a weighting signal, not a rigid playlist. It can still surprise you; it just stops pretending every listener showed up for the same reason.</p>
          <div class="briefing-intents">${radioLanes}</div>
          <p class="briefing-radio-note">Every full run avoids duplicate song identities. Alternate versions rotate on later runs instead of stuffing one cycle with the same song six times.</p>
        </aside>
      </div>
    `;

    const hero = document.querySelector('.hero');
    const latest = document.querySelector('.latest-section');
    if (!document.getElementById('briefing')) {
      if (hero?.parentNode) hero.insertAdjacentElement('afterend', section);
      else if (latest?.parentNode) latest.insertAdjacentElement('beforebegin', section);
      else document.querySelector('main')?.prepend(section);
    }

    const featured = entries
      .filter(entry => entry.featured)
      .sort((a, b) => {
        const byDate = dateScore(b.published) - dateScore(a.published);
        return byDate || (Number(a.featuredOrder) || 999) - (Number(b.featuredOrder) || 999);
      });
    const releaseGrid = document.querySelector('.release-grid');
    if (releaseGrid && featured.length) {
      releaseGrid.innerHTML = featured.map(entry => {
        const song = entry.song;
        const className = escapeHtml(entry.cardClass || '');
        const titleLines = Array.isArray(entry.cardLines) && entry.cardLines.length ? entry.cardLines : [entry.title];
        const cover = entry.cover || song?.cover || '';
        const video = entry.video || (song?.catalogVideo ? song?.video : '') || '';
        const media = entry.cardClass === 'pulse-uprising'
          ? '<span class="pulse-card-art" aria-hidden="true"></span>'
          : video
            ? `<video autoplay muted loop playsinline preload="none" poster="${escapeHtml(cover)}"><source src="${escapeHtml(video)}" type="video/mp4"></video>`
            : cover
              ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(entry.title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">`
              : '';
        const meta = [prettyDate(entry.published), song?.artist || entry.type].filter(Boolean).join(' · ');
        return `
          <a class="release-card ${className}" href="${escapeHtml(entry.href)}" aria-label="Open ${escapeHtml(entry.title)}">
            ${media}
            <span class="release-card-shade"></span>
            <span class="release-tag">${escapeHtml(entry.cardTag || entry.type)}</span>
            <span class="release-card-copy">
              <small>${escapeHtml(meta)}</small>
              <strong>${titleLines.map(escapeHtml).join('<br>')}</strong>
              <p>${escapeHtml(entry.cardSummary || entry.summary)}</p>
            </span>
          </a>`;
      }).join('');
    }

    const heavySongs = (songs || []).filter(song => song.project === 'When Things Got Heavy');
    const versionCount = heavySongs.reduce((total, song) => {
      const variants = Array.isArray(song.variants) ? song.variants.filter(variant => variant?.audio) : [];
      return total + (variants.length || (song.audio ? 1 : 0));
    }, 0);
    if (heavySongs.length) {
      document.querySelectorAll('.btn[href="/sad-music/"]').forEach(button => {
        button.textContent = `When Things Got Heavy · ${heavySongs.length} songs / ${versionCount} versions`;
      });
      document.querySelectorAll('.link-row[href="/sad-music/"] small').forEach(label => {
        label.textContent = `${heavySongs.length} songs · ${versionCount} versions · collection`;
      });
    }

    const heroActions = document.querySelector('.hero .actions');
    const primary = heroActions?.querySelector('.btn.primary');
    if (primary) {
      primary.href = '#briefing';
      primary.textContent = heroLabel;
    }
    if (heroActions && !heroActions.querySelector('[data-radio-entry]')) {
      const radioButton = document.createElement('a');
      radioButton.className = 'btn';
      radioButton.href = '/music/?intent=surprise';
      radioButton.dataset.radioEntry = 'true';
      radioButton.textContent = 'Start intention radio';
      primary?.insertAdjacentElement('afterend', radioButton);
    }

    const nav = document.querySelector('.navlinks');
    if (nav && !nav.querySelector('a[href="/updates/"]')) {
      const link = document.createElement('a');
      link.href = '/updates/';
      link.textContent = 'Updates';
      const about = nav.querySelector('a[href="#about"]');
      if (about) nav.insertBefore(link, about);
      else nav.appendChild(link);
    }
  });
})();
