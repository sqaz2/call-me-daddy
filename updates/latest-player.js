(() => {
  'use strict';
  const button = document.getElementById('latestRadioPlay');
  const status = document.getElementById('latestRadioStatus');
  if (!button || !status) return;
  const shared = () => {
    try { if (window.top.location.origin === location.origin) return window.top.CMDUniversalPlayer || window.CMDUniversalPlayer; } catch {}
    return window.CMDUniversalPlayer;
  };
  const build = () => window.CMDLatestReleases?.build({ songs: window.CMD_SONGS || [],
    entries: window.CMD_BRIEFING?.entries || [], timezone: window.CMD_BRIEFING?.timezone,
    since: window.CMDVisitHistory?.current()?.previousAt ?? null });
  const describe = model => {
    if (!model?.tracks.length) return 'No playable releases are available in this queue. Browse Music for other listening options.';
    if (!model.since) return 'Newest releases first, including alternate cuts. Previous visits are remembered in this browser only.';
    if (!model.newReleaseCount) return 'You are up to date. Play the recent releases, newest first.';
    const count = model.newReleaseCount;
    return `${count} ${count === 1 ? 'release' : 'releases'} with new music since your last visit. Newest first, then earlier releases.`;
  };
  let controller = null, audio = null, signature = '';
  const ready = Boolean(window.CMDContinuousPlayback?.create && window.CMDPlaylistRadio?.create && window.CMDLatestReleases);
  const model = build();
  button.disabled = !ready || !model?.tracks.length;
  status.textContent = ready ? describe(model) : 'The player did not load. Refresh this page, or browse Music.';
  button.addEventListener('click', () => {
    window.CMDVisitHistory?.touch();
    const next = build();
    if (!next?.tracks.length) { status.textContent = describe(next); return; }
    const owner = shared();
    // Only this deliberate tap replaces playback. Simply opening Updates is silent.
    if (owner?.getMedia?.()) owner.control('pause');
    const nextSignature = JSON.stringify(next.tracks.map(track => [track.id, track.audio]));
    if (!controller || signature !== nextSignature) {
      controller?.pause(); controller?.destroy(); audio?.remove();
      audio = document.createElement('audio');
      audio.id = 'latestRadioAudio'; audio.preload = 'none'; audio.hidden = true;
      document.body.appendChild(audio);
      signature = nextSignature;
      controller = window.CMDContinuousPlayback.create({ id: 'latest-release-radio', route: '/updates/',
        audio, tracks: next.tracks, localCount: next.tracks.length, intent: 'surprise', excludeIds: next.excludeIds,
        onStatus: kind => {
          if (kind === 'blocked' || kind === 'failed') status.textContent = 'Playback needs a tap. Press Play newest first to retry.';
          else if (kind === 'error') status.textContent = 'That recording is unavailable. Trying the next release…';
        },
        onNeedsTap: () => { status.textContent = 'Ready — press Play newest first to begin.'; }
      });
    }
    status.textContent = `Starting with ${next.tracks[0].title}. Newest releases first.`;
    // No navigation or asynchronous setup between the tap and audio.play().
    controller.load(0, { autoplay: true, reason: 'newest-first' });
  });
})();
