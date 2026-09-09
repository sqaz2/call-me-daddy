const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'page.js'), 'utf8');
const record = JSON.parse(fs.readFileSync(path.join(root, 'project.json')));
function harness({available = true, sharedSeed = false, player = true} = {}) {
  let creates = 0, toggles = 0, delegated = 0, loads = 0;
  const nodes = {};
  function node(id) {
    if (!nodes[id]) nodes[id] = {id, textContent:'', hidden:false, disabled:false, paused:true, ended:false, events:{}, attrs:{},
      addEventListener(name, handler) { this.events[name] = handler; }, setAttribute(key, value) { this.attrs[key] = value; },
      appendChild() {}, pause() { this.paused = true; this.events.pause?.(); }};
    return nodes[id];
  }
  const sharedMedia = {paused:false, ended:false, pause(){this.paused=true;}};
  const subscribers = [];
  const document = {getElementById:node, createElementNS:()=>node('rect'), querySelectorAll:()=>[node('suno-1'),node('suno-2')]};
  const location = {href:'https://callmedaddy.musicsubject.com/from-sample-to-song/', origin:'https://callmedaddy.musicsubject.com'};
  const window = {location, addEventListener(){}, CMDUniversalPlayer: {
    getTrack:()=>sharedSeed ? {audio:record.source.audio} : null,
    getMedia:()=>sharedSeed ? sharedMedia : null,
    control(action){ assert.equal(action,'toggle'); delegated++; sharedMedia.paused=!sharedMedia.paused; }
  }};
  window.top=window; window.self=window;
  if (player) window.CMDContinuousPlayback = {
    subscribe(fn){subscribers.push(fn); return ()=>{};},
    create(options){creates++; let current=options.tracks[0]; return {
      current:()=>current, toggle(){toggles++;node('seed-audio').paused=!node('seed-audio').paused;options.onPlayState?.(!node('seed-audio').paused);},
      load(index, detail){loads++;assert.equal(detail.autoplay,true);current=options.tracks[index];}
    };}
  };
  const context={window,document,location,URL,AbortController,setTimeout,clearTimeout,
    fetch:async()=>({ok:available, headers:{get:()=>available?'audio/mpeg':'text/html'}})};
  vm.runInNewContext(js,context);
  return {nodes,node,subscribers,sharedMedia,ready:()=>new Promise(resolve=>setImmediate(resolve)),
    counts:()=>({creates,toggles,delegated,loads})};
}
test('exact supplied Suno URLs and source-song route are retained',()=>{
  for(const version of record.versions) assert.ok(html.includes(version.url));
  assert.ok(html.includes('href="/satans-loan/"'));
});
test('page is clearly an unfinished project, not an invented release',()=>{
  assert.match(html,/WORK IN PROGRESS/); assert.match(html,/Not a finished release/);
  assert.match(html,/Version 1 and Version 2 are page labels/); assert.match(html,/name="robots" content="noindex"/);
});
test('source remains separate from full songs and has measured provenance',()=>{
  assert.equal(record.source.durationSeconds,15.56898); assert.equal(record.source.bpmFromFilename,62);
  assert.match(html,/not either full Suno version/); assert.equal(record.versions.length,2);
});
test('the packaged MP3 is byte-for-byte identical to the user upload',()=>{
  const file=fs.readFileSync(path.join(__dirname,'..',record.source.audio));
  assert.equal(file.length,record.source.bytes);
  assert.equal(crypto.createHash('sha256').update(file).digest('hex'),record.source.sha256);
});
test('cold page load never creates a controller or steals active playback',async()=>{
  const h=harness(); await h.ready(); assert.equal(h.counts().creates,0); assert.equal(h.node('seed-play').disabled,false);
});
test('first tap creates and starts shared playback in the same handler',async()=>{
  const h=harness(); await h.ready();h.node('seed-play').events.click();
  assert.deepEqual(h.counts(),{creates:1,toggles:1,delegated:0,loads:0});
  h.node('seed-play').events.click(); assert.equal(h.counts().creates,1);assert.equal(h.counts().toggles,2);
});
test('returning to a playing source delegates to its existing owner',async()=>{
  const h=harness({sharedSeed:true}); await h.ready();h.node('seed-play').events.click();
  assert.equal(h.counts().creates,0); assert.equal(h.counts().delegated,1);
});
test('a missing or HTML-fallback source does not expose a broken play button',async()=>{
  const h=harness({available:false}); await h.ready();
  assert.equal(h.node('seed-play').disabled,true);assert.equal(h.node('seed-download').hidden,true);
  assert.equal(h.node('seed-retry').hidden,false);assert.match(h.node('seed-status').textContent,/could not be reached/);
});
test('failure to load the shared player leaves download and Suno alternatives',async()=>{
  const h=harness({player:false}); await h.ready();h.node('seed-play').events.click();
  assert.equal(h.counts().creates,0);assert.match(h.node('seed-status').textContent,/could not load/);
});
test('opening Suno pauses existing site audio',async()=>{
  const h=harness({sharedSeed:true});await h.ready();h.node('suno-1').events.click();assert.equal(h.sharedMedia.paused,true);
});
test('new page has share metadata, keyboard skip link, live status and no autoplay',()=>{
  assert.match(html,/data-share/); assert.match(html,/rel="canonical"/); assert.match(html,/class="skip"/);
  assert.match(html,/aria-live="polite"/); assert.doesNotMatch(html,/<audio[^>]*autoplay/);
});
test('no competing ended queue or global song-catalog mutation is added',()=>{
  assert.doesNotMatch(js,/addEventListener\(['"]ended/); assert.doesNotMatch(js,/CMD_SONGS\s*=/);
  assert.match(js,/CMDContinuousPlayback\.create/);assert.match(js,/pageFollowSeconds:0/);
});
