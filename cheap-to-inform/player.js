(() => {
  'use strict';
  const audio = document.getElementById('sceneAudio');
  const status = document.getElementById('sceneStatus');
  const video = document.getElementById('sceneVideo');
  const motionButton = document.getElementById('sceneMotion');
  const buttons = [...document.querySelectorAll('[data-play]')];
  if (!audio || !buttons.length) return;
  const song = (window.CMD_SONGS || []).find(item => item.id === 'cheap-to-inform');
  if (!song?.audio) {
    buttons.forEach(button => { button.disabled = true; });
    if (status) status.textContent = 'The recording did not load. You can still listen using the Suno link.';
    return;
  }
  const track = {...song, id: 'cheap-to-inform:main', songId: song.id, variantId: 'main', variantLabel: 'Original', radioIntent: 'think'};
  const absolute = value => { try { return new URL(value, location.href).href; } catch { return String(value || ''); } };
  const owner = () => {
    try {
      if (window.top !== window.self && window.top.location.origin === location.origin) return window.top.CMDUniversalPlayer || window.CMDUniversalPlayer;
    } catch { /* A cross-origin parent cannot own this page's playback. */ }
    return window.CMDUniversalPlayer;
  };
  const state = () => {
    const player = owner();
    const media = player?.getMedia?.();
    const source = media?.getAttribute?.('src') || media?.src || media?.currentSrc || '';
    return {player, media, ours: absolute(source) === absolute(track.audio), playing: Boolean(media && !media.paused && !media.ended)};
  };
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let motionEnabled = !reduceMotion?.matches && !navigator.connection?.saveData;
  let controller;
  let videoPending = false;
  const paintMotion = active => {
    if (motionButton) {
      motionButton.hidden = false;
      motionButton.setAttribute('aria-pressed', String(motionEnabled));
      motionButton.textContent = motionEnabled ? 'Disable background motion' : 'Enable background motion';
    }
    if (!video) return;
    video.muted = true;
    if (!active || !motionEnabled || document.hidden) { video.pause(); return; }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    if (video.paused && !videoPending) {
      videoPending = true;
      Promise.resolve(video.play()).catch(() => {}).finally(() => { videoPending = false; });
    }
  };
  const paint = () => {
    const current = state();
    const active = current.ours && current.playing;
    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `${active ? 'Pause' : 'Play'} Cheap to Inform`);
      const label = button.querySelector('.scene-play-label');
      if (label) label.textContent = active ? '❚❚ Pause Cheap to Inform' : '▶ Play Cheap to Inform';
      else button.textContent = active ? '❚❚ Pause the scene' : '▶ Play the scene';
    });
    if (status && current.ours) status.textContent = `${active ? 'Playing' : 'Paused'} · Cheap to Inform · use the bottom player to seek or skip.`;
    paintMotion(active);
  };
  const ensure = () => controller || (controller = window.CMDContinuousPlayback?.create({
    id: 'cheap-to-inform', audio, tracks: [track], localCount: 1, intent: 'think', pageFollowSeconds: 0,
    onTrack: paint, onPlayState: paint,
    onStatus: kind => { if (status && ['waiting', 'stalled'].includes(kind)) status.textContent = 'Buffering Cheap to Inform…'; }
  }));
  const play = () => {
    const current = state();
    if (current.ours && current.media) { current.player.control('toggle'); paint(); return; }
    const core = ensure();
    if (!core) {
      if (status) status.textContent = 'The player did not load. Use the Suno link to listen.';
      return;
    }
    if (current.media && current.media !== audio) current.player.control('pause');
    // Keep this synchronous with the artwork tap so mobile browsers permit audio.
    core.load(0, {autoplay: true, reason: 'song-artwork'});
    paint();
  };
  buttons.forEach(button => button.addEventListener('click', play));
  document.querySelectorAll('[data-external-listen]').forEach(link => link.addEventListener('click', () => {
    state().player?.control?.('pause');
    paint();
  }));
  motionButton?.addEventListener('click', () => { motionEnabled = !motionEnabled; paint(); });
  reduceMotion?.addEventListener?.('change', event => { motionEnabled = !event.matches && !navigator.connection?.saveData; paint(); });
  document.addEventListener('visibilitychange', paint);
  window.addEventListener('pagehide', () => { video?.pause(); unsubscribe?.(); });
  const unsubscribe = window.CMDContinuousPlayback?.subscribe?.(paint);
  paint();
})();
