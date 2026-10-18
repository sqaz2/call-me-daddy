const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const OPTIONAL='sqaz-kill-you';
class Target{
  constructor(){this.listeners={};this.dataset={};this.attributes={};this.textContent='';}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn)}
  removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(f=>f!==fn)}
  dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event)}
  emit(type,extra={}){this.dispatchEvent({type,...extra})}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]||null}
}
class Audio extends Target{
  constructor(){super();this.paused=true;this.ended=false;this.duration=305;this.currentTime=0;this.playCalls=0;this.isConnected=true;this.src='';}
  getAttribute(k){return k==='src'?this.src:super.getAttribute(k)}
  load(){this.currentSrc=this.src;this.currentTime=0;}
  play(){this.playCalls++;this.paused=false;this.ended=false;this.emit('play');this.emit('playing');return Promise.resolve()}
  pause(){this.paused=true;this.emit('pause')}
}
function env({store=new Map(),search='',blocked=false,writeBlocked=false,origin='https://callmedaddy.musicsubject.com'}={}){
  const window=new Target(),document=new Target(),elements={};
  const location={origin,search,pathname:'/sqaz/',href:origin+'/sqaz/'+search};
  Object.assign(window,{location,document,setInterval:()=>1,clearInterval(){}});window.top=window;window.self=window;
  document.body={dataset:{songId:OPTIONAL}};document.visibilityState='visible';document.getElementById=id=>elements[id]||null;document.querySelectorAll=()=>[];
  const storage={getItem:k=>{if(blocked)throw Error('blocked');return store.get(k)||null},setItem:(k,v)=>{if(blocked||writeBlocked)throw Error('blocked');store.set(k,String(v))}};
  const context=vm.createContext({window,document,location,localStorage:storage,sessionStorage:storage,navigator:{},performance:{getEntriesByType:()=>[]},addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window),URL,URLSearchParams,Date,Math,Uint32Array,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}}});
  const load=file=>vm.runInContext(read(file),context,{filename:file});
  ['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','data/2026-08-29-uploads.js','data/content-intensity.js','catalog-cycle.js'].forEach(load);
  return {window,document,elements,store,load,api:window.CMDCatalogCycle,song:window.CMD_SONGS.find(s=>s.id===OPTIONAL)};
}
const includes=(tracks,id=OPTIONAL)=>tracks.some(t=>(t.songId||t.id)===id);
test('optional archive is excluded in every intention, including heavy unlock and likes',()=>{
  const e=env();e.window.CMDListenerTaste={likes:()=>[OPTIONAL],get:()=> 'like'};
  for(const {id:intent} of e.api.intents)for(let n=0;n<8;n++)assert.equal(includes(e.api.build(e.window.CMD_SONGS,{intent,seed:'default-'+n,includeHeavy:true,unlockedByTaste:true})),false);
});
test('explicit song and shared-link picks play once without enabling later cycles',()=>{
  const e=env();assert.equal(e.api.build([e.song],{explicitPick:true}).length,1);assert.equal(e.api.isRotationAllowed(e.song),false);
  const shared=env({search:'?song=sqaz-kill-you&version=main'});
  assert.equal(shared.api.build(shared.window.CMD_SONGS)[0].songId,OPTIONAL);
  assert.equal(includes(shared.api.build(shared.window.CMD_SONGS)),false);
  assert.equal(shared.store.has(shared.api.rotationStorageKey),false);
});
test('add and remove persist across reloads and new same-origin player contexts',()=>{
  const first=env();assert.equal(first.api.setRotationEnabled(OPTIONAL,true).persistent,true);
  const reload=env({store:first.store});assert.equal(reload.api.isRotationAllowed(OPTIONAL),true);
  assert.equal(includes(reload.api.build(reload.window.CMD_SONGS)),true);
  reload.api.setRotationEnabled(OPTIONAL,false);
  assert.equal(first.api.isRotationAllowed(first.song),false);
  assert.equal(includes(first.api.build(first.window.CMD_SONGS)),false);
});
test('corrupt storage fails closed and blocked reads or writes retain only the visit choice',()=>{
  for(const raw of ['{','[]','null','{"sqaz-kill-you":"true"}']){
    const e=env({store:new Map([['cmd-optional-rotation-v1',raw]])});assert.equal(e.api.isRotationAllowed(e.song),false);
  }
  for(const options of [{blocked:true},{writeBlocked:true}]){
    const e=env(options);assert.equal(e.api.setRotationEnabled(OPTIONAL,true).persistent,false);assert.equal(e.api.isRotationAllowed(e.song),true);
    e.api.setRotationEnabled(OPTIONAL,false);assert.equal(e.api.isRotationAllowed(e.song),false);
  }
});
test('newest-first queue excludes optional songs until enabled, including without an engine',()=>{
  const e=env();e.load('data/briefing.js');e.load('latest-releases.js');
  const build=()=>e.window.CMDLatestReleases.build({songs:e.window.CMD_SONGS,entries:e.window.CMD_BRIEFING.entries,now:Date.parse('2026-10-19T00:00:00Z')}).tracks;
  assert.equal(includes(build()),false);e.api.setRotationEnabled(OPTIONAL,true);assert.equal(includes(build()),true);
  e.window.CMDCatalogCycle=undefined;assert.equal(includes(build()),false);
});
test('a running radio sees the changed preference before choosing its next track',()=>{
  const e=env();e.window.CMD_SONGS=[e.song];e.load('playlist-radio.js');const radio=e.window.CMDPlaylistRadio.create();
  assert.equal(radio.next(),null);e.api.setRotationEnabled(OPTIONAL,true);assert.equal(radio.next().songId,OPTIONAL);
  e.api.setRotationEnabled(OPTIONAL,false);assert.equal(radio.next(),null);
});
test('prepared next track is removed immediately; playback source and metadata stay together',()=>{
  const e=env(),audio=new Audio();e.load('continuous-playback.js');e.api.setRotationEnabled(OPTIONAL,true);
  const tracks=[{id:'first',title:'First',audio:'/first.mp3'},e.song,{id:'last',title:'Last',audio:'/last.mp3'}];
  const seen=[];e.window.CMDContinuousPlayback.subscribe(event=>{if(event.type==='track')seen.push([event.track.audio,event.audio.src])});
  const c=e.window.CMDContinuousPlayback.create({audio,tracks,radio:{next:()=>null}});c.play();assert.equal(c.peekNext().id,OPTIONAL);
  e.api.setRotationEnabled(OPTIONAL,false);assert.equal(c.peekNext().id,'last');audio.ended=true;audio.emit('ended');
  assert.equal(c.current().id,'last');assert.equal(audio.src,'/last.mp3');assert.ok(seen.every(([a,b])=>a===b));
});
test('Sqaz page stays silent and first artwork tap starts its exact recording in the shared dock',()=>{
  const e=env(),audio=new Audio();e.load('playlist-radio.js');e.load('continuous-playback.js');
  for(const id of ['releasePlay','releaseStatus','releaseCover','releasePlayIcon','releasePlayText','releaseCutLabel','releaseDuration','releaseShare','sqazRotation','sqazRotationStatus'])e.elements[id]=new Target();
  e.elements.releaseAudio=audio;
  e.window.CMDUniversalPlayer={getMedia:()=>e.window.CMDContinuousPlayback.getActive()?.audio,getTrack:()=>e.window.CMDContinuousPlayback.getActive()?.track,control:action=>e.window.CMDContinuousPlayback.getActive()?.controller[action]()};
  e.load('release-page/player.js');e.load('sqaz/rotation.js');
  assert.equal(audio.playCalls,0);assert.equal(audio.src,'');
  assert.equal(e.elements.sqazRotation.textContent,'Add to my rotation');
  e.elements.releasePlay.emit('click');assert.equal(audio.playCalls,1);assert.equal(audio.src,e.song.audio);
  assert.equal(e.window.CMDUniversalPlayer.getTrack().title,'Kill You');assert.equal(e.api.isRotationAllowed(e.song),false);
  const c=e.window.CMDContinuousPlayback.getActive().controller;c.next();const second=c.current();c.next();assert.notEqual(c.current().audio,second.audio);
  c.load(0,{autoplay:true});assert.equal(c.current().artist,'Sqaz');assert.equal(c.current().audio,audio.src);
  const plays=audio.playCalls;e.elements.sqazRotation.emit('click');assert.equal(audio.playCalls,plays);assert.equal(e.api.isRotationAllowed(e.song),true);
  assert.equal(e.elements.sqazRotation.textContent,'Remove from my rotation');e.elements.sqazRotation.emit('click');assert.equal(e.api.isRotationAllowed(e.song),false);
});
test('shared playback skips optional automatic tracks if the preference engine fails to load',()=>{
  const e=env(),audio=new Audio();e.window.CMDCatalogCycle=undefined;e.load('continuous-playback.js');
  const c=e.window.CMDContinuousPlayback.create({audio,tracks:[{id:'first',audio:'/first.mp3'},e.song,{id:'last',audio:'/last.mp3'}],radio:{next:()=>null}});
  c.play();assert.equal(c.peekNext().id,'last');c.next();assert.equal(audio.src,'/last.mp3');
  c.load(1,{autoplay:true});assert.equal(audio.src,e.song.audio);
});
test('already-installed native catalogue loaders never receive an unenabled optional song',()=>{
  const e=env({origin:'https://appassets.androidplatform.net'});assert.equal(e.window.CMD_SONGS.some(s=>s.id===OPTIONAL),false);
});
test('both exact Spotify releases and uploaded recording are present on the page',()=>{
  const html=read('sqaz/index.html');
  for(const id of ['3i7CCHKfbOYfR4hXUJmCFo','3mKMLLWbGungagNUcxLdqN'])assert.ok(html.includes('https://open.spotify.com/track/'+id));
  assert.equal(/<audio[^>]*\bautoplay\b/i.test(html),false);assert.ok(html.includes('id="sqazRotation"'));
  assert.ok(html.includes('Zach'));assert.ok(html.includes('SoundClick'));assert.ok(html.includes('pwn.piczo.com'));
  const e=env();assert.equal(e.song.rotation,'opt-in');assert.ok(fs.statSync(path.join(__dirname,'..',e.song.audio)).size>6000000);
});
