import { hipHopBeats } from './model.mjs';

const tracks = hipHopBeats(window.CMD_SONGS), grid = document.getElementById('beatGrid');
const audio = document.getElementById('beatsAudio'), status = document.getElementById('beatStatus');
const params = new URLSearchParams(location.search);
const selected = tracks.findIndex(t => t.songId === params.get('song') && t.variantId === params.get('version'));
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const time = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const absolute = value => new URL(value || '/', location.href).href;
let controller;
document.querySelector('.beat-question').hidden = !tracks.length;
if (!tracks.length) status.textContent = '';
const owner = () => {
  try { return window.top.CMDUniversalPlayer || window.CMDUniversalPlayer; }
  catch { return window.CMDUniversalPlayer; }
};
function draw() {
  const media = owner()?.getMedia?.();
  const source = media?.getAttribute?.('src') || media?.currentSrc || media?.src;
  grid.querySelectorAll('[data-beat-play]').forEach(button => {
    const track = tracks[Number(button.dataset.beatPlay)];
    const playing = Boolean(media && !media.paused && absolute(source) === absolute(track.audio));
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${track.title} — ${track.variantLabel}`);
    button.querySelector('.beat-play-label').textContent = playing ? '❚❚ Pause beat' : '▶ Play beat';
    button.closest('article').classList.toggle('is-playing', playing);
  });
  const active = source && tracks.find(track => absolute(track.audio) === absolute(source));
  if (active) status.textContent = media.error ? 'Playback stopped. Tap the artwork to retry.' : media.paused ? `Paused · ${active.title}` : media.readyState < 3 ? 'Buffering…' : `Playing · ${active.title} · use the dock to seek or skip.`;
}
function play(index) {
  const track = tracks[index], current = owner(), media = current?.getMedia?.();
  const source = media?.getAttribute?.('src') || media?.currentSrc || media?.src;
  if (media?.isConnected !== false && source && absolute(source) === absolute(track.audio)) {
    current.control('toggle');
    draw();
    return;
  }
  if (media && media !== audio) current.control('pause');
  if (!window.CMDContinuousPlayback?.create) { status.textContent = 'The player did not load. Refresh to try again.'; return; }
  if (!controller) controller = window.CMDContinuousPlayback.create({
    id: 'hip-hop-beats', audio, tracks, startIndex: index,
    // Stay in this collection; the shared controller owns end/next/recovery.
    radio: { next: () => null }, followPages: false, restoreSession: false,
    onPlayState: draw, onTrack: draw,
    onTime: () => { if (!audio.paused && audio.readyState >= 3) status.textContent = 'Playing · use the dock to seek or skip.'; },
    onStatus: kind => { status.textContent = kind === 'failed' || kind === 'error' ? 'Playback stopped. Tap the artwork to retry.' : kind === 'blocked' ? 'Tap the artwork to play.' : 'Buffering…'; }
  });
  if (absolute(controller.current()?.audio) === absolute(track.audio)) controller.play();
  else controller.load(index, { autoplay: true, reason: 'beat-selection' });
  history.replaceState(null, '', track.experience);
  draw();
}
grid.innerHTML = tracks.length ? tracks.map((track, index) => `<article class="beat-card${index === selected ? ' is-selected' : ''}" data-beat="${safe(track.id)}">
  <button class="beat-art" type="button" data-beat-play="${index}" aria-label="Play ${safe(track.title)} — ${safe(track.variantLabel)}" aria-pressed="false">
    <img src="${safe(track.cover)}" alt="${safe(track.title)} artwork" width="600" height="600" ${index ? 'loading="lazy"' : 'fetchpriority="high"'}>
    <span class="beat-play-label">▶ Play beat</span>
  </button>
  <div class="beat-copy"><div class="beat-meta"><span>Hip hop · ${safe(track.variantLabel)}</span>${track.duration ? `<span>${time(track.duration)}</span>` : ''}</div>
  <h2>${safe(track.title)}</h2><p>${safe(track.artist)}</p>
  <div class="actions"><button class="btn primary" type="button" data-beat-share="${index}">Share this beat</button><button class="btn" type="button" data-beat-copy="${index}">Copy post</button></div>
  <a class="beat-song-link" href="${safe((window.CMD_SONGS || []).find(s => s.id === track.songId)?.experience || '/music/')}">Hear the song version →</a></div>
</article>`).join('') : '<p>No beats are published here yet.</p>';
grid.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.beatPlay !== undefined) play(Number(button.dataset.beatPlay));
  if (button.dataset.beatShare !== undefined) window.CMDShare?.shareTrack(tracks[Number(button.dataset.beatShare)]);
  if (button.dataset.beatCopy !== undefined) {
    const track = tracks[Number(button.dataset.beatCopy)];
    window.CMDShare?.copyPost({ title: track.title, url: new URL(track.shareUrl, location.origin).href });
  }
});
window.CMDContinuousPlayback?.subscribe?.(draw);
let timer;
const start = () => { if (!timer) timer = setInterval(draw, 400); };
window.addEventListener('pagehide', () => { clearInterval(timer); timer = null; });
window.addEventListener('pageshow', start);
if (params.has('song') && selected < 0) status.textContent = 'That beat is not in this collection. Choose a recording below.';
else if (selected >= 0) status.textContent = `${tracks[selected].title} — ${tracks[selected].variantLabel}. Tap its artwork to play.`;
draw(); start();
