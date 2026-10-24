(() => {
  if (window.CMDShortLinks) return;
  const data = /* SONG_LINK_DATA */;
  const ready = new Set();
  const parse = value => { try { return new URL(value, data.origin); } catch { return null; } };
  const pathname = value => parse(value)?.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const pathFor = row => `/${row.number}${row.slot === 1 ? '' : `/${row.slot}`}`;
  const urlFor = row => {
    if (!row) return '';
    const candidates = [row.shareCategory === 'jokes' ? data.domains.jokes : null, data.domains[row.genre], data.domains.other];
    const domain = candidates.find(domain => domain && ready.has(domain));
    return domain ? `https://${domain}${pathFor(row)}` : '';
  };
  function rowForTrack(track) {
    if (!track) return null;
    const oldId = track.songId || String(track.id || '').split(':')[0];
    const redirect=Object.hasOwn(data.redirects||{},oldId)?data.redirects[oldId]:null;
    const songId=redirect?.songId||oldId;
    const audio = track.audio || track.src || track.expectedPath;
    const matches = audio ? data.rows.filter(row => row.audio && pathname(row.audio) === pathname(audio)) : [];
    if (matches.length) return matches.find(row => row.songId === songId) || matches[0];
    // An unrecognized source must never inherit a different recording's short link.
    if (audio) return null;
    const version = redirect?.variantId || track.variantId || track.version || String(track.id || '').split(':')[1];
    const candidates=data.rows.filter(row=>row.songId===songId);
    return (version?candidates.find(row=>row.version===version):candidates.find(row=>row.version==='main')||candidates.find(row=>row.slot===1))||null;
  }
  function rowForUrl(value) {
    const url = parse(value);
    if (url && Object.values(data.domains).includes(url.hostname)) {
      const match = url.pathname.match(/^\/([1-9]\d*)(?:\/([1-9]\d*))?\/?$/);
      return match ? data.rows.find(row => row.number === Number(match[1]) && row.slot === Number(match[2] || 1)) || null : null;
    }
    if (!url || url.origin !== data.origin && url.origin !== location.origin) return null;
    const songId = url.searchParams.get('song');
    const version = url.searchParams.get('version');
    if (songId) return rowForTrack({ songId, variantId: version });
    const candidates = data.rows.filter(row => row.aliases.some(alias => pathname(alias) === pathname(url.href)));
    if (new Set(candidates.map(row => row.songId)).size !== 1) return null;
    return (version?candidates.find(row=>row.version===version):candidates.find(row=>row.version==='main')||candidates.find(row=>row.slot===1))||null;
  }
  const forTrack = track => urlFor(rowForTrack(track));
  const specialRoute = value => { const url = parse(value); return url && (url.searchParams.has('t') || pathname(url.href) === '/winhamp'); };
  const forUrl = value => specialRoute(value) ? value : urlFor(rowForUrl(value)) || value;
  const editorialShare = (input, track) => {
    if (input?.preserveShareText || specialRoute(input?.url)) return input;
    const row = track ? rowForTrack(track) : rowForUrl(input?.url);
    return row?.share ? { ...input, title: row.share.title, text: row.share.text, preserveShareText: true } : { ...input, preserveShareText: true };
  };
  const prepareShare = input => {
    const original = input?.url || '';
    const url = original ? forUrl(original) : '';
    let text = String(input?.text || input?.title || '').trim();
    if (original && url !== original) text = text.split(original).join(url);
    if (url && !text.includes(url)) text = [text, url].filter(Boolean).join('\n');
    return { ...input, text, url };
  };
  // Checks happen before the tap. Native sharing stays synchronous with the user gesture.
  const checking = typeof fetch === 'function' ? Promise.all(Object.values(data.domains).map(async domain => {
    try {
      const response = await fetch(`https://${domain}/.well-known/music-links`, { credentials: 'omit', mode: 'cors', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(4000) });
      if (!response.ok) return;
      const status = await response.json();
      if (status.service === 'musicsubject-song-links' && status.revision === data.revision) ready.add(domain);
    } catch { /* Preserve existing working URLs until this exact registry is deployed. */ }
  })) : Promise.resolve();
  window.CMDShortLinks = { forTrack, forUrl, rowForTrack, rowForUrl, editorialShare, prepareShare, ready: checking };
})();
