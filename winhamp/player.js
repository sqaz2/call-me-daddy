(() => {
  'use strict';
  const $ = id => document.getElementById(id), model = window.CMDWinHampModel;
  if (!model || !window.CMDContinuousPlayback) { $('status').textContent = 'The player did not load. Refresh to try again.'; return; }
  const tracks = model.build(window.CMD_SONGS || []);
  const params = new URLSearchParams(location.search), requested = tracks.find(t => t.songId === params.get('song') && (!params.get('version') || t.variantId === params.get('version')));
  let selected = requested || tracks.find(model.allowed) || tracks[0], controller = null, audio = null;
  let shuffle = false, repeat = 'all', graph = null, currentKey = '', lastMedia = null, lastPaint = 0, noticeUntil = 0, seekHeld = false;
  let allMixes = Boolean(requested && tracks.find(t => t.songId === requested.songId) !== requested);
  const rows = new Map();
  const format = value => { const seconds = Math.max(0, Number(value) || 0); return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; };
  const topWindow = () => { try { return window.top.location.origin === location.origin ? window.top : window; } catch { return window; } };
  const owner = () => topWindow().CMDUniversalPlayer || window.CMDUniversalPlayer;
  const media = () => owner()?.getMedia?.() || audio;
  const playingTrack = () => owner()?.getTrack?.() || controller?.current() || selected;
  const isLocal = () => Boolean(audio && media() === audio);
  const announce = text => { $('status').textContent = text; noticeUntil = Date.now() + 4500; };
  function prefs(action, value) {
    try { const storageKey = 'cmd-winhamp-v1'; if (action === 'read') return JSON.parse(localStorage.getItem(storageKey) || '{}'); localStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
    return {};
  }
  const saved = prefs('read');
  if (saved.amber) document.body.classList.add('amber');
  if (Number.isFinite(saved.volume)) $('volume').value = Math.max(0, Math.min(100, saved.volume));
  $('volumeValue').textContent = `${$('volume').value}%`;
  const save = () => prefs('write', { amber: document.body.classList.contains('amber'), volume: Number($('volume').value) });
  const updateSkinLabel = () => $('skin').setAttribute('aria-label', `Switch to ${document.body.classList.contains('amber') ? 'green' : 'amber'} display`);
  updateSkinLabel();

  function renderList() {
    const query = $('search').value, first = new Set();
    const visible = tracks.filter(track => {
      const lead = !first.has(track.songId); first.add(track.songId);
      return (allMixes || query.trim() || lead) && model.matches(track, query);
    });
    rows.clear();
    const fragment = document.createDocumentFragment();
    for (const track of visible) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'track-row';
      row.dataset.key = model.key(track); row.setAttribute('aria-current', String(model.key(playingTrack() || {}) === model.key(track)));
      row.setAttribute('aria-label', `Play ${track.title}, ${track.variantLabel}`);
      const number = document.createElement('span'); number.className = 'row-number'; number.textContent = String(tracks.indexOf(track) + 1).padStart(2, '0');
      const copy = document.createElement('span'); copy.className = 'row-copy';
      const name = document.createElement('span'); name.className = 'row-name'; name.textContent = track.title;
      const version = document.createElement('span'); version.className = 'row-version';
      version.textContent = [track.variantLabel, track.artist === 'Sqaz' ? 'Sqaz' : '', track.rotation === 'opt-in' && !model.allowed(track) ? 'Explicit · play on request' : ''].filter(Boolean).join(' · ');
      const duration = document.createElement('span'); duration.className = 'row-duration'; duration.textContent = track.duration ? format(track.duration) : '—';
      copy.append(name, version); row.append(number, copy, duration); row.addEventListener('click', () => start(track));
      rows.set(model.key(track), row); fragment.append(row);
    }
    if (!visible.length) { const message = document.createElement('p'); message.className = 'empty'; message.textContent = 'No matches. Try another title or mix.'; fragment.append(message); }
    $('trackList').replaceChildren(fragment);
    const songs = new Set(tracks.map(t => t.songId)).size;
    $('trackCount').textContent = `${songs} SONGS · ${tracks.length} MIXES`;
    $('listCount').textContent = query ? `${visible.length} matches` : `${visible.length} ${allMixes ? 'mixes' : 'songs'} · newest first`;
  }

  function setupSpectrum(element) {
    if (graph || !element) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let context, source;
    try {
      context = new AC();
      const analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .78;
      source = context.createMediaElementSource(element);
      // Attach the audible path immediately; failure to draw must never mute a song.
      source.connect(context.destination);
      source.connect(analyser);
      graph = { context, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
      audio.__cmdWinHampGraph = graph;
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch { if (context && !source) void context.close().catch(() => {}); }
  }
  function configureQueue() {
    $('shuffle').setAttribute('aria-pressed', String(shuffle));
    $('repeat').setAttribute('aria-pressed', String(repeat !== 'off'));
    $('repeat').textContent = repeat === 'all' ? 'REPEAT ALL' : repeat === 'one' ? 'REPEAT ONE' : 'REPEAT OFF';
    $('repeat').setAttribute('aria-label', `Repeat ${repeat}; change repeat mode`);
    if (isLocal() && controller) controller.configureQueue({ tracks: model.upcoming(tracks, controller.current(), shuffle), loopLocal: repeat === 'all', repeatOne: repeat === 'one' });
  }
  function start(track, restoring = false) {
    if (!track) return;
    const active = owner();
    if (active?.getMedia?.()) active.control('pause');
    controller?.pause(); controller?.destroy();
    if (!audio) { audio = document.createElement('audio'); audio.id = 'winhampAudio'; audio.preload = 'metadata'; audio.hidden = true; document.body.append(audio); }
    selected = track; audio.volume = Number($('volume').value) / 100;
    setupSpectrum(audio);
    if (graph?.context.state === 'suspended') void graph.context.resume().catch(() => {});
    const queue = [track, ...model.upcoming(tracks, track, shuffle)];
    controller = window.CMDContinuousPlayback.create({ id: 'winhamp', route: '/winhamp/', audio,
      tracks: queue, localCount: queue.length, radio: { next: () => null }, loopLocal: repeat === 'all', repeatOne: repeat === 'one', followPages: false, restoreSession: restoring,
      onTrack: next => { selected = next; paintTrack(next); },
      onStatus: kind => { if (kind === 'blocked' || kind === 'failed') announce('Press Play to continue.'); else if (kind === 'error') announce('Track unavailable. Trying the next one…'); },
      onNeedsTap: () => announce('Ready. Press Play to begin.') });
    // Keep play() in the original tap: no fetch, navigation or awaited setup.
    if (!restoring) controller.load(0, { autoplay: true, reason: 'winhamp-pick' });
  }
  function toggle() {
    const element = media();
    if (!element) { start(selected); return; }
    if (element.paused) { const activeGraph = element.__cmdWinHampGraph; if (activeGraph?.context.state === 'suspended') void activeGraph.context.resume().catch(() => {}); }
    owner()?.control('toggle');
  }
  function paintTrack(track) {
    if (!track) return;
    const key = model.key(track), index = tracks.findIndex(t => model.key(t) === key);
    currentKey = key;
    $('trackTitle').textContent = track.title || 'Call Me Daddy';
    $('trackVersion').textContent = [track.variantLabel || track.label, track.artist].filter(Boolean).join(' · ');
    $('trackNumber').textContent = index >= 0 ? `${String(index + 1).padStart(2, '0')}.` : '♪';
    $('cover').src = track.cover || '/media/brand/call-me-daddy-musicsubject.jpg'; $('cover').alt = `${track.title} artwork`;
    $('artwork').setAttribute('aria-label', `Play or pause ${track.title}`);
    const ext = (track.audio || '').split('?')[0].split('.').at(-1);
    $('format').textContent = /^(mp3|wav|m4a|ogg|aac|flac)$/i.test(ext || '') ? ext.toUpperCase() : 'AUDIO';
    $('story').hidden = !track.experience;
    $('story').href = track.experience || model.shareUrl(track);
    if (track.experience && track.variantId) { const url = new URL(track.experience, location.origin); url.searchParams.set('version', track.variantId); $('story').href = url.href; }
    document.title = `${track.title} — WinHamp · Call Me Daddy`;
    for (const [rowKey, row] of rows) row.setAttribute('aria-current', String(rowKey === key));
  }
  function syncDock() {
    const host = topWindow();
    const active = host.location.pathname === '/winhamp/' || host.location.pathname === '/winhamp';
    host.document.body?.classList.toggle('cmd-winhamp-view', active);
    if (host !== window && !host.document.getElementById('winhamp-dock-style')) {
      const style = host.document.createElement('style'); style.id = 'winhamp-dock-style';
      style.textContent = 'body.cmd-winhamp-view>.cmd-universal-player{display:none!important}'; host.document.head.append(style);
    }
  }
  function draw(element) {
    const canvas = $('spectrum'), ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const activeGraph = element?.__cmdWinHampGraph;
    if (activeGraph && !element.paused) activeGraph.analyser.getByteFrequencyData(activeGraph.data);
    const amber = document.body.classList.contains('amber');
    for (let i = 0; i < 32; i++) {
      const bin = Math.min(120, Math.floor(2 ** (i / 5.2)));
      const value = activeGraph && !element.paused ? activeGraph.data[bin] / 255 : 0;
      const blocks = Math.max(1, Math.round(value * 20));
      for (let j = 0; j < blocks; j++) { ctx.fillStyle = amber ? j > 15 ? '#ffe1a4' : '#e9ae56' : j > 15 ? '#e7dc78' : j > 9 ? '#b1d859' : '#7bcd67'; ctx.globalAlpha = value ? 1 : .28; ctx.fillRect(i * 18.7 + 2, 132 - j * 6, 13, 4); }
    }
    ctx.globalAlpha = 1;
  }
  function paint(now) {
    requestAnimationFrame(paint);
    if (now - lastPaint < 100 || document.visibilityState === 'hidden') return;
    lastPaint = now; syncDock();
    const element = media(), track = playingTrack();
    if (track && model.key(track) !== currentKey) paintTrack(track);
    if (element !== lastMedia) { lastMedia = element; if (element) { $('volume').value = Math.round(element.volume * 100); $('volumeValue').textContent = `${$('volume').value}%`; } }
    const playing = Boolean(element && !element.paused && !element.ended);
    document.body.classList.toggle('is-playing', playing);
    $('playIcon').textContent = playing ? 'Ⅱ' : '▶'; $('playText').textContent = playing ? 'PAUSE' : 'PLAY'; $('play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $('stateLamp').textContent = playing ? 'PLAYING' : element?.ended ? 'FINISHED' : element ? 'PAUSED' : 'READY';
    $('artwork').querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
    const duration = Number.isFinite(element?.duration) ? element.duration : Number(track?.duration) || 0;
    $('elapsed').textContent = format(element?.currentTime); $('duration').textContent = format(duration);
    if (!seekHeld) $('seek').value = duration ? (element?.currentTime || 0) / duration * 1000 : 0;
    $('seek').disabled = !element || !Number.isFinite(element.duration) || element.duration <= 0;
    if (Date.now() > noticeUntil) {
      const next = element?.__cmdContinuousPlaybackController?.peekNext?.();
      const remaining = duration - (element?.currentTime || 0);
      $('status').textContent = playing && next && remaining > 0 && remaining <= 5
        ? `Up next in ${Math.ceil(remaining)} · ${next.title}` : playing ? (isLocal() ? 'Stay here. The music keeps going.' : 'Music continues from your current playlist.') : 'Pick a song. Stay a while.';
    }
    draw(element);
  }
  async function share(track) {
    const url = model.shareUrl(track), data = { title: track ? `${track.title} — WinHamp` : 'WinHamp — MusicSubject × Call Me Daddy', text: track ? `Give ${track.title} a listen in WinHamp.` : 'Old-school player. New music.', url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url); announce('Link copied. Pass it around.');
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Keep a copyable link available on browsers without clipboard permission.
      const field = $('search'); field.value = url; field.focus(); field.select(); announce('Select and copy the link in the search box.');
    }
  }
  $('play').addEventListener('click', toggle); $('artwork').addEventListener('click', toggle);
  $('stop').addEventListener('click', () => { const element = media(); owner()?.control('pause'); if (element) element.currentTime = 0; });
  $('next').addEventListener('click', () => { if (media()) owner()?.control('next'); else start(selected); });
  $('previous').addEventListener('click', () => owner()?.control('previous'));
  $('volume').addEventListener('input', () => { const element = media(); if (element) element.volume = Number($('volume').value) / 100; $('volumeValue').textContent = `${$('volume').value}%`; save(); });
  $('seek').addEventListener('input', () => { seekHeld = true; const element = media(); if (element && Number.isFinite(element.duration)) $('elapsed').textContent = format(Number($('seek').value) / 1000 * element.duration); });
  $('seek').addEventListener('change', () => { const element = media(); if (element && Number.isFinite(element.duration)) owner()?.control('seek', Number($('seek').value) / 1000 * element.duration); seekHeld = false; });
  $('seek').addEventListener('pointercancel', () => { seekHeld = false; });
  $('shuffle').addEventListener('click', () => { shuffle = !shuffle; configureQueue(); announce(shuffle ? 'Shuffle on. Your current song keeps playing.' : 'Shuffle off. Newest songs first.'); });
  $('repeat').addEventListener('click', () => { repeat = repeat === 'all' ? 'one' : repeat === 'one' ? 'off' : 'all'; configureQueue(); announce(repeat === 'one' ? 'This song repeats.' : repeat === 'all' ? 'The playlist repeats.' : 'Playback stops at the end of the playlist.'); });
  $('skin').addEventListener('click', () => { document.body.classList.toggle('amber'); save(); updateSkinLabel(); });
  $('search').addEventListener('input', renderList);
  $('versions').checked = allMixes; $('versions').addEventListener('change', () => { allMixes = $('versions').checked; renderList(); });
  $('shareSong').addEventListener('click', () => share(playingTrack())); $('sharePlayer').addEventListener('click', () => share(null));
  $('cover').addEventListener('error', () => { if (!$('cover').src.endsWith('/media/brand/call-me-daddy-musicsubject.jpg')) $('cover').src = '/media/brand/call-me-daddy-musicsubject.jpg'; });
  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target.tagName) || event.target.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '/') { event.preventDefault(); $('search').focus(); }
    if (event.code === 'Space') { event.preventDefault(); toggle(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); owner()?.control('next'); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); owner()?.control('previous'); }
  });
  if (!tracks.length) { $('status').textContent = 'No songs are available yet.'; for (const id of ['play', 'artwork', 'next', 'previous', 'shareSong']) $(id).disabled = true; }
  renderList(); paintTrack(playingTrack()); syncDock(); requestAnimationFrame(paint);
  if (params.has('song') && !requested) announce('That recording is unavailable. Choose another song below.');
  if (requested) { rows.get(model.key(requested))?.scrollIntoView({ block: 'nearest' }); if (media()) announce('Shared song ready. Tap its row to play.'); }
  const snapshot = window.CMDContinuousPlayback.readSnapshot?.();
  const reload = document.wasDiscarded || performance.getEntriesByType('navigation')[0]?.type === 'reload' || params.get('cmdResume') === '1';
  if (!requested && reload && snapshot?.playerId === 'winhamp' && snapshot.wantsPlayback && !media()) {
    const restore = tracks.find(t => t.audio === snapshot.track?.audio); if (restore) start(restore, true);
  }
})();
