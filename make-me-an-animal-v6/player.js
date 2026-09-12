(() => {
  'use strict';
  const songId = 'make-me-an-animal';
  const song = (window.CMD_SONGS || []).find(item => item.id === songId);
  const audio = document.getElementById('animalAudio');
  const status = document.getElementById('animalStatus');
  const video = document.getElementById('animalVideo');
  const motion = document.getElementById('animalMotion');
  const playButtons = [...document.querySelectorAll('[data-animal-play]')];
  if (!audio || !song?.variants?.length) {
    if (status) status.textContent = 'The recording list did not load. The Suno link is still available.';
    playButtons.forEach(button => { button.disabled = true; });
    return;
  }
  const versions = song.variants.filter(item => item.audio);
  const params = new URLSearchParams(location.search);
  let selected = versions.find(item => item.id === params.get('version')) || versions.find(item => item.id === 'suno-v6') || versions[0];
  let controller = null;
  let controllerVersion = '';
  let videoPending = false;
  let videoSource = '';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let motionEnabled = !reduced?.matches && !navigator.connection?.saveData;
  const absolute = value => { try { return new URL(value || '', location.href).href; } catch { return String(value || ''); } };
  const topWindow = () => { try { return window.top.location.origin === location.origin ? window.top : window; } catch { return window; } };
  const owner = () => topWindow().CMDUniversalPlayer || window.CMDUniversalPlayer;
  const sourceOf = media => media?.getAttribute?.('src') || media?.src || media?.currentSrc || '';
  const trackFor = variant => ({...song, ...variant, id: `${songId}:${variant.id}`, songId,
    variantId: variant.id, variantLabel: variant.label, variantCount: versions.length,
    title: song.title, artist: song.artist, cover: variant.cover || song.cover,
    experience: `/make-me-an-animal-v6/?song=${songId}&version=${encodeURIComponent(variant.id)}`,
    shareUrl: `/music/?song=${songId}&version=${encodeURIComponent(variant.id)}&share=1`, radioIntent: 'surprise'});
  const state = () => {
    const player = owner(), media = player?.getMedia?.();
    const source = absolute(sourceOf(media));
    return {player, media, playing: Boolean(media && !media.paused && !media.ended), source,
      ours: Boolean(media && source === absolute(selected.audio))};
  };
  const shortLabel = variant => variant.id === 'suno-v6' ? 'v6' : variant.label;
  const paintMotion = active => {
    const src = selected.video || '';
    if (motion) { motion.hidden = !src; motion.setAttribute('aria-pressed', String(motionEnabled)); motion.textContent = `${motionEnabled ? 'Disable' : 'Enable'} background motion`; }
    if (!video) return;
    video.muted = true;
    if (videoSource && videoSource !== src) { video.pause(); video.removeAttribute('src'); video.load(); videoSource = ''; }
    if (!src || !active || !motionEnabled || document.hidden) { video.pause(); return; }
    if (!videoSource) { video.src = src; videoSource = src; }
    if (video.paused && !videoPending) {
      videoPending = true;
      Promise.resolve(video.play()).catch(() => {}).finally(() => { videoPending = false; });
    }
  };
  const paint = () => {
    const current = state();
    const active = current.ours && current.playing;
    const label = `${active ? '❚❚ Pause' : '▶ Play'} ${shortLabel(selected)}`;
    document.getElementById('animalPlay').textContent = label;
    document.getElementById('animalCoverAction').textContent = label;
    playButtons.forEach(button => { button.setAttribute('aria-pressed', String(active)); button.setAttribute('aria-label', `${active ? 'Pause' : 'Play'} Make Me an Animal — ${shortLabel(selected)}`); });
    document.querySelectorAll('[data-animal-version]').forEach(button => {
      const variant = versions.find(item => item.id === button.dataset.animalVersion);
      const playing = Boolean(variant && current.media && current.playing && current.source === absolute(variant.audio));
      button.setAttribute('aria-pressed', String(playing));
      button.textContent = playing ? '❚❚ Pause' : variant?.id === 'suno-v6' ? '▶ Play v6' : '▶ Play this version';
    });
    document.querySelectorAll('[data-animal-card]').forEach(card => { card.dataset.selected = String(card.dataset.animalCard === selected.id); });
    if (status && current.ours) status.textContent = `${active ? 'Playing' : 'Paused'} · Make Me an Animal · ${shortLabel(selected)}. Use the bottom player to seek or skip.`;
    paintMotion(active);
  };
  const paintSelection = () => {
    const v6 = selected.id === 'suno-v6';
    document.getElementById('animalVersion').textContent = v6 ? 'Suno v6 · New version' : `Earlier recording · ${selected.label}`;
    document.getElementById('animalDescription').textContent = v6 ? 'A new version. The Animal you knew is still here.' : 'An earlier Animal recording. The new v6 version is available below.';
    const cover = document.getElementById('animalCover');
    cover.src = selected.cover || song.cover;
    cover.alt = v6 ? 'Make Me an Animal v6: a snarling lion; ME AN also reads as MEAN.' : `Make Me an Animal — ${selected.label}: original artwork`;
    if (video) { video.poster = cover.src; video.dataset.src = selected.video || ''; }
    document.getElementById('animalCredit').textContent = v6 ? 'Brought to you by MusicSubject and callmedaddy with Suno v6.' : `Make Me an Animal · ${selected.label} · Earlier recording`;
    const suno = document.getElementById('animalSuno');
    suno.hidden = !selected.sunoUrl;
    if (selected.sunoUrl) { suno.href = selected.sunoUrl; suno.textContent = v6 ? 'Open v6 on Suno ↗' : 'Open this version on Suno ↗'; }
    document.getElementById('animalShare').textContent = v6 ? 'Share v6' : 'Share this version';
    document.title = `Make Me an Animal — ${shortLabel(selected)} | MusicSubject × Call Me Daddy`;
    paint();
  };
  const play = variant => {
    selected = variant || selected;
    paintSelection();
    const current = state();
    if (current.ours && current.media) { current.player.control('toggle'); paint(); return; }
    if (!window.CMDContinuousPlayback?.create) { if (status) status.textContent = 'The player did not load. Use the Suno link to listen.'; return; }
    if (current.media && current.media !== audio) current.player?.control?.('pause');
    if (controllerVersion !== selected.id) {
      controller?.destroy?.();
      controllerVersion = selected.id;
      controller = window.CMDContinuousPlayback.create({id: `animal-${selected.id}`, audio, tracks: [trackFor(selected)], localCount: 1,
        intent: 'surprise', pageFollowSeconds: 0, onTrack: paint, onPlayState: paint,
        onStatus: kind => { if (status && ['waiting','stalled'].includes(kind)) status.textContent = `Buffering ${shortLabel(selected)}…`; if (status && ['blocked','error'].includes(kind)) status.textContent = 'Playback could not start. Tap play again or use the Suno link.'; }
      });
    }
    // Do not await anything before this call: it must retain the mobile tap gesture.
    controller.load(0, {autoplay: true, reason: 'song-artwork'});
    paint();
  };
  const share = async variant => {
    const ok = await window.CMDPlaylistRadio?.share?.(trackFor(variant));
    if (status && ok === false) status.textContent = 'Sharing was not completed. The share links below are also available.';
  };
  playButtons.forEach(button => button.addEventListener('click', () => play(selected)));
  document.querySelectorAll('[data-animal-version]').forEach(button => button.addEventListener('click', () => {
    const variant = versions.find(item => item.id === button.dataset.animalVersion);
    if (variant) play(variant);
  }));
  document.getElementById('animalShare').addEventListener('click', () => share(selected));
  document.querySelectorAll('[data-animal-share]').forEach(button => button.addEventListener('click', () => {
    const variant = versions.find(item => item.id === button.dataset.animalShare);
    if (variant) share(variant);
  }));
  motion?.addEventListener('click', () => { motionEnabled = !motionEnabled; paint(); });
  document.querySelectorAll('[data-external-listen]').forEach(link => link.addEventListener('click', () => { owner()?.control?.('pause'); paint(); }));
  reduced?.addEventListener?.('change', event => { motionEnabled = !event.matches && !navigator.connection?.saveData; paint(); });
  document.addEventListener('visibilitychange', paint);
  const subscriptions = [...new Set([window.CMDContinuousPlayback, topWindow().CMDContinuousPlayback])].filter(Boolean).map(api => api.subscribe?.(paint)).filter(Boolean);
  window.addEventListener('pagehide', () => { video?.pause(); subscriptions.forEach(unsubscribe => unsubscribe()); });
  paintSelection();
})();
