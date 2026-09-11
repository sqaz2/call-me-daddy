(() => {
  const input = document.getElementById('homeSongSearch');
  const results = document.getElementById('homeSongResults');
  if (!input || !results) return;
  const songs = window.CMD_SONGS || [];
  const search = window.CMDCatalogSearch;
  const status = document.getElementById('homeSearchStatus');
  const clear = document.getElementById('homeSearchClear');
  const browse = document.getElementById('homeBrowseAll');
  const filters = [...document.querySelectorAll('[data-home-filter]')];
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let filter = 'all', expanded = false;
  const versions = song => song.variants?.length ? song.variants : [{ id: 'main', label: song.kind || 'Main version', audio: song.audio }];
  const row = (song, variant) => window.CMDShortLinks?.rowForTrack({ songId: song.id, variantId: variant.id });
  const date = song => Math.max(0, ...(window.CMD_BRIEFING?.entries || []).filter(e => e.songId === song.id).map(e => Date.parse(e.published) || 0), Date.parse(song.published || song.date) || 0);
  const dates = new Map(songs.map(song => [song.id, date(song)]));
  const destination = (song, variant, exact = false) => {
    if (exact && variant?.audio) return `/music/?song=${encodeURIComponent(song.id)}&version=${encodeURIComponent(variant.id)}`;
    return song.experience || `/music/?song=${encodeURIComponent(song.id)}${variant?.id ? `&version=${encodeURIComponent(variant.id)}` : ''}`;
  };
  const styleMatch = song => filter === 'all' || versions(song).some(v => {
    const info = row(song, v);
    return filter === 'jokes' ? info?.shareCategory === 'jokes' : info?.genre === filter;
  });
  function render() {
    const query = input.value.trim();
    const normalized = search.normalize(query);
    const matching = search.filterSongs(songs, query).filter(styleMatch).sort((a, b) => {
      if (query) {
        const rank = song => search.normalize(song.title) === normalized ? 0 : search.normalize(song.title).includes(normalized) ? 1 : 2;
        const difference = rank(a) - rank(b);
        if (difference) return difference;
      }
      return dates.get(b.id) - dates.get(a.id) || a.title.localeCompare(b.title);
    });
    const quick = !query && filter === 'all' && !expanded;
    const visible = quick ? matching.slice(0, 4) : matching;
    status.textContent = quick ? `Quick picks · ${songs.length} songs to explore` : `${matching.length} ${matching.length === 1 ? 'song' : 'songs'} found`;
    clear.hidden = !query;
    browse.hidden = !quick;
    browse.textContent = `Browse all ${songs.length} songs`;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.homeFilter === filter)));
    results.innerHTML = visible.length ? visible.map(song => {
      const variants = versions(song);
      const specific = query && variants.find(v => search.normalize(`${v.id} ${v.label || ''}`).includes(normalized));
      const preferred = specific || variants[0];
      const href = destination(song, preferred, Boolean(specific));
      const image = preferred.cover || song.cover;
      const category = row(song, preferred)?.shareCategory === 'jokes' ? 'Jokes & satire' : '';
      const caption = [category, variants.length > 1 ? `${variants.length} versions` : 'Song'].filter(Boolean).join(' · ');
      return `<article class="home-song" role="listitem" data-home-song="${safe(song.id)}">
        <a class="home-song-open" href="${safe(href)}" aria-label="Open ${safe(song.title)}${specific ? ` — ${safe(specific.label)}` : ''}">
          <span class="home-song-art">${image ? `<img src="${safe(image)}" alt="" loading="lazy" decoding="async">` : '<span aria-hidden="true">♪</span>'}</span>
          <span class="home-song-copy"><strong>${safe(song.title)}</strong><small>${safe(specific ? specific.label : caption)}</small></span><span class="home-song-arrow" aria-hidden="true">→</span>
        </a>
        ${variants.length > 1 ? `<details class="home-song-versions"><summary>Choose a version</summary><ul>${variants.map(v => `<li><a href="${safe(destination(song, v, true))}">${safe(v.label || v.id)} <span aria-hidden="true">→</span></a></li>`).join('')}</ul></details>` : ''}
      </article>`;
    }).join('') : '<div class="home-search-empty"><strong>No songs found.</strong><p>Try fewer words, another lyric, or a different category.</p><button type="button" data-home-reset>Show all songs</button></div>';
    results.querySelector('[data-home-reset]')?.addEventListener('click', () => { input.value = ''; filter = 'all'; expanded = true; render(); input.focus(); });
  }
  input.addEventListener('input', render);
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  filters.forEach(button => button.addEventListener('click', () => { filter = button.dataset.homeFilter; expanded = true; render(); }));
  browse.addEventListener('click', () => { expanded = true; render(); });
  document.getElementById('homeSearchForm').addEventListener('submit', event => { event.preventDefault(); render(); results.querySelector('a')?.focus(); });
  document.querySelector('[data-focus-song-search]')?.addEventListener('click', () => { input.focus({ preventScroll: true }); });
  const params = new URLSearchParams(location.search);
  if (params.has('q')) input.value = params.get('q');
  render();
})();
