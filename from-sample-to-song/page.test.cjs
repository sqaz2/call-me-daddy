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
  const document = {getElementById:node, createElementNS:()=>node('rect'), querySelectorAll:selector=>{
    assert.equal(selector,'[data-suno], [data-process-video]');
    return ['suno-1','suno-2','facebook-beat','facebook-sampling'].map(node);
  }};
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
  assert.match(html,/Version 1 and Version 2 are page labels/); assert.doesNotMatch(html,/name="robots" content="noindex"/);
});
test('source remains separate from full songs and has measured provenance',()=>{
  assert.equal(record.source.durationSeconds,15.56898); assert.equal(record.source.bpmFromFilename,62);
  assert.match(html,/not either full Suno version/); assert.equal(record.versions.length,2);
});
const seedPath = path.join(__dirname,'..',record.source.audio);
test('the original MP3 is byte-for-byte identical to the user upload', {
  skip: record.source.uploadStatus === 'pending' && !fs.existsSync(seedPath)
    ? 'Original seed upload is explicitly pending; the public page links to both full Suno versions.' : false
},()=>{
  const file=fs.readFileSync(seedPath);
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

test('pending source upload is disclosed without blocking the two listening links',()=>{
  assert.ok(['pending','uploaded'].includes(record.source.uploadStatus));
  if(record.source.uploadStatus === 'pending') assert.match(html,/Original seed playback becomes available here once its upload is complete/);
  assert.equal((html.match(/data-suno href=/g)||[]).length,2);
});

test('both process links use the exact Facebook post supplied by the artist',()=>{
  assert.equal(record.processVideo.url,'https://www.facebook.com/share/v/1FN8ky6Tvr/');
  for(const id of ['facebook-beat','facebook-sampling']) {
    const link=html.match(new RegExp(`<a id="${id}"[^>]*>`))?.[0];
    assert.ok(link); assert.ok(link.includes(`href="${record.processVideo.url}"`));
    assert.match(link,/data-process-video=/); assert.match(link,/target="_blank"/);
    assert.match(link,/rel="noopener noreferrer"/);
  }
});
test('sampling points to comments without inventing a direct comment URL',()=>{
  assert.equal(record.processVideo.sampling.location,'comments');
  assert.equal(record.processVideo.sampling.directUrl,null);
  assert.match(html,/The sampling video is in the comments on that Facebook post/);
  assert.match(html,/Opens the same Facebook post, not a direct link to an individual comment/);
  assert.match(html,/aria-describedby="sampling-location"/);
});
test('process links stay available without JavaScript or a Facebook embed',()=>{
  assert.match(html,/href="#watch-process"/);
  assert.match(html,/id="watch-process"[^>]*aria-labelledby="watch-process-title"/);
  assert.match(html,/id="watch-process-title"/);
  assert.doesNotMatch(html,/<iframe|connect\.facebook\.net|plugins\/video/i);
});
for(const id of ['facebook-beat','facebook-sampling']) {
  test(`opening ${id} pauses site audio without creating another player`,async()=>{
    const h=harness({sharedSeed:true});await h.ready();
    h.node('seed-audio').paused=false;
    h.node(id).events.click();
    assert.equal(h.sharedMedia.paused,true);assert.equal(h.node('seed-audio').paused,true);
    assert.equal(h.counts().creates,0);
  });
}
test('Facebook comments remain reachable when the seed audio is unavailable',async()=>{
  const h=harness({available:false,sharedSeed:true,player:false});await h.ready();
  assert.equal(h.node('seed-play').disabled,true);
  assert.equal(typeof h.node('facebook-sampling').events.click,'function');
  h.node('facebook-sampling').events.click();assert.equal(h.sharedMedia.paused,true);
  assert.equal(h.counts().creates,0);
});
