const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = fs.readFileSync(path.join(__dirname, 'player.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/releases/2026-09-11-cheap-to-inform.json'), 'utf8'));
function setup({existing = false, reduced = false, missing = false, sharedParent = false} = {}) {
  const events = {};
  const element = () => ({listeners: {}, attrs: {}, paused: true, ended: false, dataset: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute(name, value) { this.attrs[name] = value; }, getAttribute(name) { return name === 'src' ? this.src : this.attrs[name]; }, querySelector() { return null; }, pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); }});
  const audio = element(), status = element(), video = element(), motion = element(), button = element(), external = element();
  video.dataset.src = '/media/songs/2026/09/cheap-to-inform/background.mp4';
  let active = existing ? Object.assign(element(), {src: manifest.song.audio, currentTime: 42, paused: false}) : null;
  let creates = 0, loads = 0, toggles = 0, subscribed;
  const player = {getMedia: () => active, control(action) { if (!active) return; if (action === 'toggle') { toggles++; active.paused = !active.paused; } else if (action === 'pause') active.paused = true; }};
  const core = {create(options) { creates++; return {load(index, args) { assert.equal(index, 0); assert.equal(args.autoplay, true); loads++; audio.src = manifest.song.audio; audio.paused = false; active = audio; options.onPlayState?.(); }}; }, subscribe(fn) { subscribed = fn; return () => { subscribed = null; }; }};
  const location = {href:'https://callmedaddy.musicsubject.com/cheap-to-inform/', origin:'https://callmedaddy.musicsubject.com'};
  const window = {CMD_SONGS: missing ? [] : [manifest.song], CMDUniversalPlayer: player, CMDContinuousPlayback: core, matchMedia: () => ({matches: reduced, addEventListener(){}}), addEventListener(name, fn) { events[name] = fn; }};
  window.self = window;
  window.top = sharedParent ? {location, CMDUniversalPlayer: player} : window;
  const document = {hidden:false, getElementById: id => ({sceneAudio:audio, sceneStatus:status, sceneVideo:video, sceneMotion:motion}[id]), querySelectorAll: query => query === '[data-play]' ? [button] : [external], addEventListener(name, fn) { events[name] = fn; }};
  vm.runInNewContext(code, {window, document, location, navigator:{}, URL, Promise});
  return {audio, video, motion, button, external, status, events, document, getActive:()=>active, stats:()=>({creates,loads,toggles}), notify:()=>subscribed?.()};
}
test('release identity, dated media and fictional category are explicit', () => {
  assert.equal(manifest.song.id, 'cheap-to-inform');
  assert.equal(manifest.song.storyType, 'scene-study');
  assert.equal(manifest.update.cardTag, 'Scene study · Fictional perspectives');
  assert.equal(manifest.song.sunoUrl, 'https://suno.com/s/Gn6OwZiICiZD9qjd');
  for (const key of ['audio','cover','video']) assert.ok(manifest.song[key].startsWith('/media/songs/2026/09/cheap-to-inform/'));
  assert.equal(manifest.update.songId, manifest.song.id);
  assert.match(html, /Personal · Lived experience/);
  assert.match(html, /not my family history|not my family story|isn’t my family story/);
});
test('both protected refrain lines remain verbatim', () => {
  assert.ok(html.includes('huge audiences are cheap to mobilize and expensive to inform.'));
  assert.ok(html.includes('pick a team, punish the other one, feel informed.'));
  assert.ok(!manifest.lyrics, 'Do not label an unverified writing draft as the released lyrics.');
});
test('canonical, sharing, sources and real no-script audio are present', () => {
  assert.match(html, /rel="canonical" href="https:\/\/callmedaddy\.musicsubject\.com\/cheap-to-inform\/"/);
  assert.match(html, /data-share/);
  assert.match(html, /nbcnews\.com/);
  assert.match(html, /teenvogue\.com/);
  assert.match(html, /<noscript>[\s\S]*audio\.mp3/);
  assert.ok(html.indexOf('/data/songs.js') < html.indexOf('/cheap-to-inform/player.js'));
});
test('initializing the page neither plays nor replaces an active owner', () => {
  const env = setup();
  assert.deepEqual(env.stats(), {creates:0,loads:0,toggles:0});
  assert.equal(env.video.src, undefined);
});
test('first artwork tap loads synchronously and the next tap pauses', () => {
  const env = setup();
  env.button.listeners.click();
  assert.deepEqual(env.stats(), {creates:1,loads:1,toggles:0});
  assert.equal(env.getActive().paused, false);
  assert.equal(env.video.muted, true);
  env.button.listeners.click();
  assert.equal(env.getActive().paused, true);
  assert.equal(env.video.paused, true);
  assert.equal(env.stats().loads, 1);
});
test('returning to the page adopts the existing parent player and position', () => {
  const env = setup({existing:true,sharedParent:true});
  const previous = env.getActive();
  env.button.listeners.click();
  assert.equal(env.getActive(), previous);
  assert.equal(previous.currentTime, 42);
  assert.deepEqual(env.stats(), {creates:0,loads:0,toggles:1});
});
test('reduced motion prevents video loading until deliberately enabled', () => {
  const env = setup({reduced:true});
  env.button.listeners.click();
  assert.equal(env.video.src, undefined);
  env.motion.listeners.click();
  assert.equal(env.video.src, env.video.dataset.src);
  assert.equal(env.motion.attrs['aria-pressed'], 'true');
});
test('backgrounding pauses video without stopping the song', () => {
  const env = setup();
  env.button.listeners.click();
  env.document.hidden = true;
  env.events.visibilitychange();
  assert.equal(env.video.paused, true);
  assert.equal(env.getActive().paused, false);
});
test('Suno handoff pauses on-site audio to avoid two recordings playing', () => {
  const env = setup();
  env.button.listeners.click();
  env.external.listeners.click();
  assert.equal(env.getActive().paused, true);
});
test('missing catalog is honest and does not synthesize another audio owner', () => {
  const env = setup({missing:true});
  assert.equal(env.button.disabled, true);
  assert.match(env.status.textContent, /Suno/);
  assert.equal(env.stats().creates, 0);
});
test('only the shared controller owns queue, end and next-track handling', () => {
  assert.match(code, /CMDContinuousPlayback/);
  assert.match(code, /pageFollowSeconds: 0/);
  assert.doesNotMatch(code, /addEventListener\(['"]ended['"]/);
  assert.doesNotMatch(html, /<audio[^>]*controls/);
});
