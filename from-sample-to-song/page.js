(() => {
  'use strict';
  const audio = document.getElementById('seed-audio');
  const button = document.getElementById('seed-play');
  const label = document.getElementById('seed-action');
  const status = document.getElementById('seed-status');
  const download = document.getElementById('seed-download');
  const retry = document.getElementById('seed-retry');
  if (!audio || !button) return;
  const source = '/media/projects/2026/09/from-sample-to-song/suno_62bpm_4bar.mp3';
  const local = {
    id: 'from-sample-to-song-seed', songId: 'from-sample-to-song-seed', variantId: 'seed',
    title: 'From sample to song — seed loop', artist: 'MusicSubject × Call Me Daddy',
    project: 'From sample to song · Work in progress', audio: source,
    cover: '/media/songs/2026/09/satans-loan/cover.jpg',
    experience: '/from-sample-to-song/', shareUrl: '/from-sample-to-song/', radioIntent: 'heavy'
  };
  const heights = [77,40,26,43,40,31,76,42,19,50,30,27,80,38,30,41,35,34,74,42,26,44,7,31,76,44,34,32,42,58,76,33,34,44,30,37,72,45,12,50,41,63,72,38,32,44,9,4];
  const wave = document.getElementById('seed-wave');
  heights.forEach((height, index) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({x:index*10+2,y:65-height/2,width:5,height,rx:2,fill:'currentColor'}).forEach(([key,value]) => rect.setAttribute(key,String(value)));
    wave?.appendChild(rect);
  });
  const absolute = value => { try { return new URL(value, document.baseURI || location.href).href; } catch { return ''; } };
  const owner = () => {
    try { if (window.top !== window.self && window.top.location.origin === location.origin) return window.top.CMDUniversalPlayer || window.CMDUniversalPlayer; } catch {}
    return window.CMDUniversalPlayer;
  };
  const ownsSeed = () => absolute(owner()?.getTrack?.()?.audio) === absolute(source);
  let controller = null;
  let sourceReady = false;
  const sync = () => {
    const shared = owner();
    const media = ownsSeed() ? shared?.getMedia?.() : audio;
    const isLocal = absolute(controller?.current?.()?.audio) === absolute(source);
    const playing = Boolean((ownsSeed() || isLocal) && media && !media.paused && !media.ended);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Pause the supplied seed loop' : 'Play the supplied seed loop');
    if (sourceReady) label.textContent = playing ? 'Pause the seed loop' : 'Play the seed loop';
  };
  const checkSource = async () => {
    button.disabled = true; retry.hidden = true; download.hidden = true;
    label.textContent = 'Checking source audio…';
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 12000);
    try {
      const response = await fetch(source, {method:'HEAD', signal:abort.signal});
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !/audio\/|application\/octet-stream/i.test(type)) throw new Error('Source not available');
      sourceReady = true; button.disabled = false; download.hidden = false;
      status.textContent = 'The supplied seed MP3. Plays through the site player; more music follows.';
      sync();
    } catch {
      sourceReady = false;
      label.textContent = 'Source audio not available yet';
      status.textContent = 'The seed MP3 still needs to be added here, or could not be reached. Both Suno links below remain available.';
      retry.hidden = false;
    } finally { clearTimeout(timer); }
  };
  button.addEventListener('click', () => {
    if (!sourceReady) return;
    if (ownsSeed() && owner()?.getMedia?.() && owner().getMedia() !== audio) {
      owner().control('toggle'); sync(); return;
    }
    if (!controller) {
      if (!window.CMDContinuousPlayback?.create) {
        status.textContent = 'The site player could not load. Download the seed or use the Suno links.';
        return;
      }
      controller = window.CMDContinuousPlayback.create({
        id:'from-sample-to-song-seed', audio, tracks:[local], localCount:1, intent:'heavy', pageFollowSeconds:0,
        onTrack:sync, onPlayState:sync,
        onStatus:kind => { if (kind === 'failed' || kind === 'error') status.textContent = 'The seed could not play. Try again or download it.'; },
        onNeedsTap:() => { status.textContent = 'Tap the waveform to continue.'; sync(); }
      });
    }
    // Keep creation and playback in the original tap. The shared controller owns the queue.
    if (absolute(controller.current()?.audio) === absolute(source)) controller.toggle();
    else controller.load(0, {autoplay:true, reason:'seed-artwork'});
  });
  retry.addEventListener('click', checkSource);
  document.querySelectorAll('[data-suno]').forEach(link => link.addEventListener('click', () => {
    const live = owner()?.getMedia?.();
    if (live && !live.paused) live.pause();
    if (!audio.paused) audio.pause();
    sync();
  }));
  const subscriptions = [];
  const continuous = window.CMDContinuousPlayback;
  if (continuous?.subscribe) subscriptions.push(continuous.subscribe(sync));
  try {
    const parent = window.top?.CMDContinuousPlayback;
    if (parent && parent !== continuous && parent.subscribe) subscriptions.push(parent.subscribe(sync));
  } catch {}
  audio.addEventListener('play', sync); audio.addEventListener('pause', sync);
  window.addEventListener('focus', sync);
  window.addEventListener('pagehide', () => subscriptions.forEach(stop => stop?.()), {once:true});
  checkSource();
})();
