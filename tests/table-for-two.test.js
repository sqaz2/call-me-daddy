const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const manifest=JSON.parse(read('content/releases/2026-09-07-set-a-table-for-two.json'));
const song=manifest.song;
const playerSource=read('set-a-table-for-two/player.js');
class Element {
  constructor(){this.handlers={};this.attrs={};this.dataset={};this.textContent='';this.src='';this.paused=true;this.ended=false;this.plays=0;this.pauses=0;this.currentTime=0;this.duration=144}
  addEventListener(type,fn){(this.handlers[type]||=[]).push(fn)}
  setAttribute(k,v){this.attrs[k]=String(v)}
  getAttribute(k){return k==='src'?this.src||null:this.attrs[k]||null}
  click(){for(const fn of this.handlers.click||[])fn({currentTarget:this,target:this})}
  play(){this.plays++;this.paused=false;return Promise.resolve()}
  pause(){this.pauses++;this.paused=true}
}
function environment({query='',external=null}={}){
  const ids=Object.fromEntries(['releaseAudio','releasePlay','releaseStatus','releaseCover','releasePlayIcon','releasePlayText','releaseCutLabel','releaseDuration','releaseSuno','releaseShare'].map(id=>[id,new Element()]));
  const buttons=song.variants.map(v=>{const b=new Element();b.dataset.cut=v.id;return b});
  const location={origin:'https://example.test',href:'https://example.test/set-a-table-for-two/'+query,search:query,pathname:'/set-a-table-for-two/'};
  const calls={creates:0,controls:[]};const observers=[];
  let activeMedia=external?.media||null,activeTrack=external?.track||null,core=null;
  const owner={getMedia:()=>activeMedia,getTrack:()=>activeTrack,control:action=>{calls.controls.push(action);if(!activeMedia)return;if(action==='pause'||(action==='toggle'&&!activeMedia.paused))activeMedia.pause();else activeMedia.play()}};
  const document={getElementById:id=>ids[id]||null,querySelectorAll:()=>buttons};
  const window={location,document,setInterval:()=>1,clearInterval(){},addEventListener(){},CMD_SONGS:[song],CMDUniversalPlayer:owner,CMDContinuousPlayback:{subscribe:fn=>{observers.push(fn);return()=>{}},create:options=>{
    calls.creates++;
    let index=options.startIndex||0;
    const publish=()=>observers.forEach(fn=>fn());
    const activate=()=>{activeMedia=options.audio;activeTrack=options.tracks[index];options.audio.src=activeTrack.audio;options.audio.play();options.onPlayState?.(true);publish()};
    core={current:()=>options.tracks[index],play:activate,load:(i)=>{index=i;options.audio.currentTime=0;options.onTrack?.(options.tracks[index]);activate()},options};
    options.onTrack?.(options.tracks[index]);options.audio.src=options.tracks[index].audio;
    return core;
  }}};
  window.self=window;window.top=external?{location,CMDUniversalPlayer:owner}:window;
  vm.runInNewContext(playerSource,{window,document,location,URL,URLSearchParams,console});
  return {ids,buttons,window,calls,core:()=>core,media:()=>activeMedia,track:()=>activeTrack,refresh:()=>observers.forEach(fn=>fn())};
}
const main=song.variants[0],clone=song.variants[1];
test('one release contains both titles, both versions and the explicit flag',()=>{
  assert.equal(song.title,'Fuck Everybody But You');assert.ok(song.aliases.includes('Set A Table For Two'));
  assert.equal(song.variants.length,2);assert.equal(song.explicit,true);assert.equal(song.experience,'/set-a-table-for-two/');
  assert.equal(manifest.update.featured,true);assert.equal(manifest.update.songId,song.id);
});
test('artist-directed size and artwork pairing is not guessed from filenames',()=>{
  assert.ok(main.audio.endsWith('/fuck everybody but you.mp3'));assert.ok(main.cover.endsWith('/grok_image_1788830947264.jpg'));
  assert.ok(clone.audio.endsWith('/Set A Table For Two.mp3'));assert.ok(clone.cover.endsWith('/Screenshot_20260907-194633.png'));
  const bigger=fs.statSync(path.join(root,main.audio)).size,smaller=fs.statSync(path.join(root,clone.audio)).size;
  assert.ok(bigger>smaller);assert.equal(main.duration,143.88);assert.equal(clone.duration,144.12);
});
test('both original audio files retain their recorded SHA-256 fingerprints',()=>{
  const source=JSON.parse(read('set-a-table-for-two/sources.json'));
  source.recordings.forEach(item=>{const data=fs.readFileSync(path.join(root,item.file));assert.equal(data.length,item.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),item.sha256)});
});
test('initial page and invalid version query never autoplay or claim the dock',()=>{
  for(const query of ['','?version=unknown']){const e=environment({query});assert.equal(e.calls.creates,0);assert.equal(e.media(),null);assert.equal(e.ids.releaseAudio.src,'');assert.equal(e.buttons[0].getAttribute('aria-pressed'),'true')}
});
test('first artwork tap plays the main recording in the same gesture',()=>{
  const e=environment();e.ids.releasePlay.click();assert.equal(e.calls.creates,1);assert.equal(e.media().plays,1);assert.equal(e.media().src,main.audio);assert.equal(e.media().paused,false);assert.equal(e.ids.releaseCover.src,main.cover);
});
test('exact voice-clone link selects the correct image before the first tap',()=>{
  const e=environment({query:'?version=voice-clone'});assert.equal(e.calls.creates,0);assert.equal(e.ids.releaseCover.src,clone.cover);e.ids.releasePlay.click();assert.equal(e.media().src,clone.audio);assert.equal(e.track().variantId,'voice-clone');assert.ok(e.ids.releaseSuno.href.endsWith('de2f1819-86af-48c8-8f2b-32e7cb559f9f'));
});
test('cut button resumes without resetting; artwork toggles the actual media',()=>{
  const e=environment();e.buttons[0].click();e.media().currentTime=42;e.buttons[0].click();assert.equal(e.media().currentTime,42);assert.equal(e.media().paused,false);e.ids.releasePlay.click();assert.equal(e.media().paused,true);e.ids.releasePlay.click();assert.equal(e.media().paused,false);assert.equal(e.calls.creates,1);
});
test('an existing owner frame is controlled rather than recreated',()=>{
  const media=new Element();media.src=new URL(main.audio,'https://example.test').href;media.paused=false;media.currentTime=37;
  const e=environment({external:{media,track:{...song,...main}}});assert.equal(e.calls.creates,0);e.ids.releasePlay.click();assert.equal(media.paused,true);assert.equal(media.currentTime,37);assert.equal(e.calls.creates,0);assert.deepEqual(e.calls.controls,['toggle']);
});
test('selecting the other cut transfers one owner and updates artwork, version and share link',()=>{
  const media=new Element();media.src=main.audio;media.paused=false;
  const e=environment({external:{media,track:song}});e.buttons[1].click();assert.equal(media.pauses,1);assert.equal(e.calls.creates,1);assert.equal(e.media().src,clone.audio);assert.equal(e.track().variantId,'voice-clone');assert.equal(e.ids.releaseCover.src,clone.cover);assert.equal(e.ids.releaseShare.dataset.shareUrl,'https://example.test/set-a-table-for-two/?version=voice-clone');assert.equal(e.buttons[1].getAttribute('aria-pressed'),'true');
});
test('merely browsing this page leaves a different song and its position alone',()=>{
  const media=new Element();media.src='/other-song.mp3';media.currentTime=61;media.paused=false;
  const e=environment({external:{media,track:{id:'other-song',audio:media.src}}});e.refresh();assert.equal(e.calls.creates,0);assert.equal(media.pauses,0);assert.equal(media.currentTime,61);assert.ok(e.ids.releaseStatus.textContent.includes('Another song'));
});
test('rapid cut switches use one controller and leave metadata on the final recording',()=>{
  const e=environment();for(let i=0;i<8;i++)e.buttons[i%2].click();assert.equal(e.calls.creates,1);assert.equal(e.media().src,clone.audio);assert.equal(e.track().variantId,'voice-clone');assert.equal(e.ids.releaseCover.src,clone.cover);assert.match(e.ids.releaseShare.dataset.shareUrl,/version=voice-clone$/);
});
test('shared-core track changes are reflected by the release UI',()=>{
  const e=environment();e.ids.releasePlay.click();e.core().load(1);assert.equal(e.ids.releaseCutLabel.textContent,'Voice-clone cut');assert.equal(e.ids.releaseCover.src,clone.cover);assert.equal(e.buttons[1].getAttribute('aria-pressed'),'true');
});
test('page has a single hidden audio owner and no competing ended/next queue',()=>{
  const html=read('set-a-table-for-two/index.html');assert.equal((html.match(/<audio\b/g)||[]).length,1);assert.ok(!/<audio[^>]*controls/.test(html));assert.ok(html.includes('/universal-player.js'));assert.ok(html.includes('/continuous-playback.js'));assert.ok(!/addEventListener\(['"](?:ended|error)['"]/.test(playerSource));assert.equal((html.match(/data-cut=/g)||[]).length,2);
});
test('on-page, raw, manifest and catalog lyric text stay exact; both titles and lyric lines are searchable',()=>{
  const raw=read('set-a-table-for-two/lyrics.txt');assert.equal(manifest.lyrics.text,raw);
  const escaped=raw.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));
  assert.ok(read('set-a-table-for-two/index.html').includes(`<pre id="releaseLyrics">${escaped}</pre>`));
  const window={};const context=vm.createContext({window});for(const file of ['data/songs.js','data/song-lyrics.js','catalog-search.js'])vm.runInContext(read(file),context);
  assert.equal(window.CMDSongLyrics.lyrics(song.id),raw);
  for(const q of ['Set A Table For Two','Fuck Everybody But You','Pringles','wedding elvis at last vegas'])assert.ok(window.CMDCatalogSearch.matchesSong(song,q),q);
});
