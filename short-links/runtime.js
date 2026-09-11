(() => {
  if (window.CMDShortLinks) return;
  const data = /* SONG_LINK_DATA */;
  const ready = new Set();
  const parse = value => { try { return new URL(value, data.origin); } catch { return null; } };
  const pathname = value => parse(value)?.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const pathFor = row => `/${row.number}${row.slot === 1 ? '' : `/${row.slot}`}`;
  const urlFor = row => {
    if (!row) return '';
    const preferred = data.domains[row.genre];
    const domain = ready.has(preferred) ? preferred : ready.has(data.domains.other) ? data.domains.other : '';
    return domain ? `https://${domain}${pathFor(row)}` : '';
  };
  function rowForTrack(track) {
    if (!track) return null;
    const songId = track.songId || String(track.id || '').split(':')[0];
    const audio = track.audio || track.src || track.expectedPath;
    const matches = audio ? data.rows.filter(row => row.audio && pathname(row.audio) === pathname(audio)) : [];
    if (matches.length) return matches.find(row => row.songId === songId) || matches[0];
    // An unrecognized source must never inherit a different recording's short link.
    if (audio) return null;
    const version = track.variantId || track.version || String(track.id || '').split(':')[1];
    return data.rows.find(row => row.songId === songId && (version ? row.version === version : row.slot === 1)) || null;
  }
  function rowForUrl(value) {
    const url = parse(value);
    if (!url || url.origin !== data.origin && url.origin !== location.origin) return null;
    const songId = url.searchParams.get('song');
    const version = url.searchParams.get('version');
    if (songId) return rowForTrack({ songId, variantId: version });
    const candidates = data.rows.filter(row => row.aliases.some(alias => pathname(alias) === pathname(url.href)));
    if (new Set(candidates.map(row => row.songId)).size !== 1) return null;
    return candidates.find(row => version ? row.version === version : row.slot === 1) || null;
  }
  const forTrack = track => urlFor(rowForTrack(track));
  const forUrl = value => urlFor(rowForUrl(value)) || value;
  // Checks happen before the tap. Native sharing stays synchronous with the user gesture.
  const checking = typeof fetch === 'function' ? Promise.all(Object.values(data.domains).map(async domain => {
    try {
      const response = await fetch(`https://${domain}/.well-known/music-links`, { credentials: 'omit', mode: 'cors', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(4000) });
      if (!response.ok) return;
      const status = await response.json();
      if (status.service === 'musicsubject-song-links' && status.revision === data.revision) ready.add(domain);
    } catch { /* Preserve existing working URLs until this exact registry is deployed. */ }
  })) : Promise.resolve();
  window.CMDShortLinks = { forTrack, forUrl, rowForTrack, rowForUrl, ready: checking };
})();
