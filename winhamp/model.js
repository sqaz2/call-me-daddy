(() => {
  'use strict';
  const key = track => `${track.songId || track.id}:${track.variantId || 'main'}`;
  function build(songs = []) {
    const used = new Set(), tracks = [];
    for (const song of songs) {
      const variants = window.CMDCatalogCycle?.variants(song) || (song.variants?.some(v => v.audio)
        ? song.variants.filter(v => v.audio) : song.audio ? [{ id: 'main', audio: song.audio }] : []);
      for (const [index, variant] of variants.entries()) {
        if (!/^\/(?!\/)/.test(variant.audio || '') || used.has(variant.audio)) continue;
        used.add(variant.audio);
        const variantId = variant.id || String(index);
        tracks.push({ ...song, ...variant, id: `${song.id}:${variantId}`, songId: song.id,
          title: song.title, variantId, variantLabel: variant.label || 'Main version',
          variantCount: variants.length, artist: song.artist || 'MusicSubject × Call Me Daddy',
          cover: variant.cover || song.cover || '/media/brand/call-me-daddy-musicsubject.jpg',
          aliases: song.aliases || [], rotation: song.rotation,
          released: variant.date || song.date || `${song.year || 2000}-${String(song.month || 1).padStart(2, '0')}-01` });
      }
    }
    return tracks.sort((a, b) => b.released.localeCompare(a.released));
  }
  function allowed(track) {
    const engine = window.CMDCatalogCycle;
    return (engine?.isRotationAllowed?.(track) ?? track.rotation !== 'opt-in') &&
      !engine?.isOnBreak?.(track.songId) && !window.CMDListenerTaste?.isKilled?.(track.songId, track.variantId);
  }
  function upcoming(tracks, current, shuffle = false, random = Math.random) {
    const position = tracks.findIndex(t => key(t) === key(current));
    const ordered = [...tracks.slice(position + 1), ...tracks.slice(0, Math.max(0, position))]
      .filter(t => key(t) !== key(current) && allowed(t));
    if (shuffle) for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
    return ordered;
  }
  const matches = (track, query) => [track.title, track.artist, track.variantLabel, track.project,
    ...(track.aliases || [])].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  function shareUrl(track, origin = location.origin) {
    const url = new URL('/winhamp/', origin);
    if (track) { url.searchParams.set('song', track.songId || track.id); url.searchParams.set('version', track.variantId || 'main'); }
    return url.href;
  }
  window.CMDWinHampModel = { build, key, allowed, upcoming, matches, shareUrl };
})();
