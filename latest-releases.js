(() => {
  'use strict';
  if (window.CMDLatestReleases) return;
  const releaseType = /^(new (release|version|catalog entry)|latest version|two-version release|archive (rework|find)|earlier (file|version) found|old file|satire|interactive release)(?:\b|$)/i;
  const nonMusicType = /^(site update|sharing|listening path)(?:\b|$)/i;
  const isRelease = entry => !nonMusicType.test(entry.type || '') &&
    (entry.featured === true || releaseType.test(entry.type || ''));
  const localAudio = value => typeof value === 'string' && /^\/(?!\/)/.test(value);
  const score = value => {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}(?:-\d{2}(?:T.+)?)?$/.test(text)) return NaN;
    return Date.parse(text.length === 7 ? `${text}-01` : text);
  };
  const dateKey = (value, zone) => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
    catch { return new Date(value).toISOString().slice(0, 10); }
  };
  const available = (published, now, zone) => {
    const text = String(published);
    // Day/month-only archive dates retain their recorded precision.
    if (text.length === 7 || text.length === 10) return text <= dateKey(now, zone).slice(0, text.length);
    return score(text) <= now;
  };
  const newer = (published, since, zone) => {
    if (!Number.isFinite(since) || since <= 0) return false;
    const text = String(published);
    if (text.length === 7 || text.length === 10) return text > dateKey(since, zone).slice(0, text.length);
    return score(text) > since;
  };
  function build({ songs = [], entries = [], since = null, now = Date.now(), timezone = 'America/Edmonton' } = {}) {
    const byId = new Map(songs.filter(Boolean).map(song => [song.id, song]));
    const usedAudio = new Set(), usedVersions = new Set(), releaseIds = new Set(), newIds = new Set();
    const tracks = [];
    const ordered = entries.filter(entry => entry?.songId && isRelease(entry) &&
      Number.isFinite(score(entry.published)) && available(entry.published, now, timezone))
      .slice().sort((a, b) => score(b.published) - score(a.published) || String(a.id).localeCompare(String(b.id)));
    for (const entry of ordered) {
      const song = byId.get(entry.songId);
      if (!song) continue;
      if (window.CMDCatalogCycle?.isOnBreak?.(song.id)) continue;
      try { if (window.CMDContentIntensity?.isAllowed && !window.CMDContentIntensity.isAllowed(song.id, { intent: 'surprise' })) continue; } catch {}
      const all = Array.isArray(song.variants) && song.variants.some(variant => localAudio(variant?.audio))
        ? song.variants.filter(variant => localAudio(variant?.audio))
        : localAudio(song.audio) ? [{ id: 'main', label: 'Main version', audio: song.audio }] : [];
      let requested = entry.variantId || '';
      if (!requested) { try { requested = new URL(entry.href || '/', location.origin).searchParams.get('version') || ''; } catch {} }
      const list = requested ? all.filter(variant => variant.id === requested) : all;
      for (const [index, variant] of list.entries()) {
        const variantId = variant.id || String(index), key = `${song.id}:${variantId}`;
        const audioKey = new URL(variant.audio, location.origin).href;
        if (usedAudio.has(audioKey) || usedVersions.has(key)) continue;
        try { if (window.CMDListenerTaste?.isKilled?.(song.id, variantId)) continue; } catch {}
        usedAudio.add(audioKey); usedVersions.add(key); releaseIds.add(song.id);
        const isNew = newer(entry.published, since, timezone);
        if (isNew) newIds.add(song.id);
        tracks.push({ ...song, ...variant, id: key, songId: song.id, title: song.title,
          variantId, variantLabel: variant.label || 'Main version', variantCount: all.length,
          cover: variant.cover || song.cover || '', radioIntent: 'surprise', radioMode: 'latest',
          releasePublished: entry.published, newSinceVisit: isNew });
      }
    }
    return { tracks, releaseCount: releaseIds.size, newReleaseCount: newIds.size, since,
      excludeIds: [...releaseIds] };
  }
  window.CMDLatestReleases = { build };
})();
