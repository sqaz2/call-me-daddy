import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const ID='everybody-else-less',route='/sad-music/everybody-else-less/';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const release=JSON.parse(read('content/releases/2026-08-everybody-else-less.json'));
const proof=JSON.parse(read('content/sources/everybody-else-less.json'));
const html=read(route.slice(1)+'index.html'),js=read(route.slice(1)+'player.js');
const load=p=>{const c={window:{}};vm.runInNewContext(read(p),c);return JSON.parse(JSON.stringify(c.window))};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitHash=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const bytes=p=>fs.readFileSync(new URL('../'+p.replace(/^\//,''),import.meta.url));
test('the existing collection recording is exactly the artist upload, without moving its URL',()=>{
 const audio=bytes(release.song.audio);assert.equal(audio.length,proof.audioBytes);assert.equal(hash(audio),proof.audioSha256);assert.equal(gitHash(audio),proof.audioGitBlob);
 assert.deepEqual(audio,bytes(proof.uploadedPath));assert.equal(release.song.audio,proof.existingAudio);
});
test('the existing published artwork stays unchanged',()=>{
 const cover=bytes(release.song.cover);assert.equal(cover.length,proof.coverBytes);assert.equal(gitHash(cover),proof.coverGitBlob);assert.equal(release.song.cover,proof.existingCover);
});
test('lyrics retain the supplied recording words and punctuation',()=>{
 const audio=bytes(proof.uploadedPath),sync=b=>b.reduce((n,x)=>(n<<7)|x,0);assert.equal(audio.toString('ascii',0,3),'ID3');assert.equal(audio[3],4);assert.equal(audio[5],0);
 let p=10,text=null;const end=10+sync(audio.subarray(6,10));
 while(p+10<=end){const id=audio.toString('ascii',p,p+4),size=sync(audio.subarray(p+4,p+8));if(!size)break;
  if(id==='USLT'){const body=audio.subarray(p+10,p+10+size);assert.equal(body[0],3);text=body.subarray(body.indexOf(0,4)+1).toString('utf8').replace(/\0+$/,'');break}p+=10+size;
 }
 assert.ok(text);const compact=s=>s.split('\n').filter(line=>line.trim()).join('\n');assert.equal(compact(release.lyrics.text),compact(text));assert.equal(hash(Buffer.from(release.lyrics.text)),proof.lyricsSha256);
 const pageLyrics=html.match(/<pre id="songLyrics" class="lyrics">([\s\S]*?)<\/pre>/)?.[1];assert.equal(pageLyrics,release.lyrics.text);
});
test('one catalog identity, exact main version and one lyric entry',()=>{
 const songs=load('data/songs.js').CMD_SONGS.filter(s=>s.id===ID);assert.equal(songs.length,1);assert.deepEqual(songs[0],release.song);assert.equal(songs[0].variants[0].id,'main');
 assert.equal(load('data/song-lyrics.js').CMD_SONG_LYRICS[ID].lyrics,release.lyrics.text);
 assert.equal((read('data/song-lyrics.js').match(/"everybody-else-less"\s*:/g)||[]).length,1);
});
test('collection links, shares and sitemap retain the existing story route',()=>{
 assert.equal(release.song.experience,route);assert.equal(release.song.shareUrl,route);assert.ok(read('data/sad-music.js').includes(`route:'${route}'`));
 assert.ok(html.includes(`href="https://callmedaddy.musicsubject.com${route}"`));assert.ok(read('sitemap.xml').includes(`https://callmedaddy.musicsubject.com${route}`));
 assert.ok(read('data/briefing.js').includes(release.update.id));assert.ok(read('updates/'+release.update.id+'/index.html').includes(route));
});
test('August remains collection metadata, not an invented exact creation date',()=>{
 assert.equal(release.song.date,'2026-08');assert.equal(release.song.month,8);assert.match(release.update.published,/^2026-09-09T/);assert.match(html,/AUGUST COLLECTION/);assert.match(html,/fictional narrator/);assert.doesNotMatch(html,/August 23|created in August|new September song/i);
});
test('static lyrics, sharing, keyboard access and no native autoplay',()=>{
 assert.match(html,/data-share/);assert.match(html,/Skip to the song/);assert.match(html,/aria-live="polite"/);assert.doesNotMatch(html,/<audio[^>]*(autoplay|controls)/);
 assert.match(html,/jOr9CSygvDsRHMC9/);assert.match(js,/CMDContinuousPlayback\.create/);assert.doesNotMatch(js,/addEventListener\(['"]ended/);
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
test('browsing is silent; the first tap starts playback in that same handler',()=>{const h=harness();assert.equal(h.stats.creates,0);h.art.events.click();assert.equal(h.stats.creates,1);assert.equal(h.stats.plays,1);assert.equal(h.media().paused,false)});
test('repeated taps reuse the controller and toggle the existing recording',()=>{const h=harness();h.art.events.click();h.button.events.click();assert.equal(h.stats.creates,1);assert.equal(h.stats.toggles,1);assert.equal(h.media().paused,true)});
for(const top of [false,true])test(`returning page delegates to ${top?'top-level':'local'} owner without restarting`,()=>{const h=harness({owned:true,top});h.art.events.click();assert.equal(h.stats.creates,0);assert.equal(h.stats.toggles,1)});
test('stale detached iframe owner is not trusted',()=>{const h=harness({owned:true,stale:true});h.art.events.click();assert.equal(h.stats.creates,1);assert.equal(h.stats.toggles,0)});
test('actual audio source takes precedence over stale title metadata',()=>{const h=harness({owned:true,mismatch:true});h.art.events.click();assert.equal(h.stats.pauses,1);assert.equal(h.stats.plays,1);assert.equal(h.stats.toggles,0)});
test('missing engine shows an honest Suno alternative',()=>{const h=harness({engine:false});h.art.events.click();assert.equal(h.stats.creates,0);assert.match(h.node('releaseStatus').textContent,/did not load/)});
test('external Suno listening pauses site audio instead of competing with it',()=>{const h=harness({owned:true});h.node('external').events.click();assert.equal(h.media().paused,true);assert.equal(h.stats.creates,0)});
