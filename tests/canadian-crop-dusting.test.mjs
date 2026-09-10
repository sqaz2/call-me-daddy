import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const ID='canadian-crop-dusting',route='/canadian-crop-dusting/';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const release=JSON.parse(read('content/releases/2026-09-10-canadian-crop-dusting.json'));
const proof=JSON.parse(read('content/sources/canadian-crop-dusting.json'));
const html=read('canadian-crop-dusting/index.html'),js=read('canadian-crop-dusting/player.js');
const bytes=p=>fs.readFileSync(new URL('../'+p.replace(/^\//,''),import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('uploaded recording and portrait remain byte-for-byte intact',()=>{
 assert.equal(hash(bytes(release.song.audio)),proof.audio.sha256);
 assert.equal(hash(bytes(release.song.cover)),proof.artwork.sha256);
 assert.equal(release.song.variants[0].duration,214.824);
});
test('the page and shared preview focus on this recording, with the diary linked below',()=>{
 assert.equal(release.song.experience,route); assert.equal(release.song.shareUrl,route);
 assert.match(html,/<title>Canadian Crop Dusting/);
 assert.ok(html.includes('property="og:image" content="https://callmedaddy.musicsubject.com'+release.song.cover+'"'));
 assert.ok(html.includes('data-share-url="https://callmedaddy.musicsubject.com'+route+'"'));
 assert.ok(html.indexOf('id="origin"')>html.indexOf('id="releasePlay"'));
 assert.ok(read('from-sample-to-song/index.html').includes('href="'+route+'"'));
 assert.match(html,/Try not to blush/);
});
test('exact supplied lyrics reach the page and searchable catalog',()=>{
 assert.equal(release.lyrics.text,proof.lyrics);
 assert.equal(html.match(/<pre id="songLyrics" class="lyrics">([\s\S]*?)<\/pre>/)[1],proof.lyrics);
 const c={window:{}};vm.runInNewContext(read('data/song-lyrics.js'),c);
 assert.equal(c.window.CMD_SONG_LYRICS[ID].lyrics,proof.lyrics);
 assert.match(release.lyrics.sunoUrl,/a02a94bb-9e94-4b86-9e29-cf3e13d485e7$/);
});
function harness({owned=false,stale=false,mismatch=false,top=false,engine=true}={}){
 const nodes=new Map(),stats={creates:0,plays:0,toggles:0,loads:0,pauses:0};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,paused:true,ended:false,isConnected:true,events:{},attrs:{},addEventListener(k,v){this.events[k]=v},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]||null},pause(){this.paused=true}});return nodes.get(id)};
 const audio=node('releaseAudio'),art=node('releasePlay'),button=node('playButton');
 const current=node('otherAudio');current.src=owned&&!mismatch?release.song.audio:'/other.mp3';current.paused=false;current.isConnected=!stale;
 let media=owned?current:null;
 const owner={getMedia:()=>media,getTrack:()=>({songId:ID,audio:release.song.audio}),control(action){if(action==='toggle'){stats.toggles++;media.paused=!media.paused}else if(action==='pause'){stats.pauses++;media.paused=true}}};
 const document={visibilityState:'visible',getElementById:node,querySelectorAll:q=>q==='[data-play]'?[art,button]:[node('external')],addEventListener(){}};
 const location={href:'https://test.local'+route,origin:'https://test.local'};
 const window={document,location,CMD_SONGS:[release.song],CMDUniversalPlayer:owner,addEventListener(){},setInterval(){return 1},clearInterval(){}};window.self=window;window.top=top?{location,CMDUniversalPlayer:owner}:window;
 if(engine)window.CMDContinuousPlayback={subscribe(){return()=>{}},create(opts){stats.creates++;let track=opts.tracks[0];audio.src=track.audio;return{current:()=>track,play(){stats.plays++;media=audio;audio.paused=false;opts.onPlayState?.()},load(i,config){stats.loads++;assert.equal(config.autoplay,true);track=opts.tracks[i];media=audio;audio.src=track.audio;audio.paused=false;opts.onPlayState?.()}}}};
 vm.runInNewContext(js,{window,document,location,URL});
 return{stats,art,button,audio,media:()=>media,node};
}

test('first tap starts the requested recording; later taps toggle the same owner',()=>{
 const h=harness();assert.equal(h.stats.creates,0);h.art.events.click();
 assert.equal(h.stats.plays,1);assert.equal(h.media().src,release.song.audio);
 h.button.events.click();assert.equal(h.stats.creates,1);assert.equal(h.stats.toggles,1);
});
test('revisited page controls retained top-level audio without restarting',()=>{
 const h=harness({owned:true,top:true});h.art.events.click();assert.equal(h.stats.creates,0);assert.equal(h.stats.toggles,1);
});
test('actual audio source wins over stale song metadata',()=>{
 const h=harness({owned:true,mismatch:true});h.art.events.click();
 assert.equal(h.stats.pauses,1);assert.equal(h.stats.plays,1);assert.equal(h.stats.toggles,0);
});
test('detached owner is replaced and the shared controller retains next/previous ownership',()=>{
 const h=harness({owned:true,stale:true});h.art.events.click();assert.equal(h.stats.creates,1);
 assert.match(js,/CMDContinuousPlayback\.create/);assert.doesNotMatch(js,/addEventListener\(['"]ended/);
 assert.match(js,/pageFollowSeconds:0/);assert.doesNotMatch(html,/<audio[^>]*(autoplay|controls)/);
});
