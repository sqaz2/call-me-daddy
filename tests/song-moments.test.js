const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
const origin='https://callmedaddy.musicsubject.com';
const track={id:'song:remix',songId:'song',variantId:'remix',variantLabel:'Remix',variantCount:2,title:'A song',audio:'/remix.mp3'};
class Target{
  constructor(){this.listeners=new Map();this.textContent='';this.hidden=false}
  addEventListener(type,fn){this.listeners.set(type,[...(this.listeners.get(type)||[]),fn])}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn))}
  emit(type){for(const fn of [...this.listeners.get(type)||[]])fn({type,target:this})}
  setAttribute(name,value){this[name]=value}
}
class Media extends Target{
  constructor(src='/remix.mp3'){super();this.src=src;this.currentSrc=src;this.currentTime=0;this.duration=NaN;this.readyState=0;this.paused=true;this.plays=0}
  getAttribute(name){return name==='src'?this.src:null}
  play(){this.plays++;this.paused=false;this.emit('playing');return Promise.resolve()}
  pause(){this.paused=true;this.emit('pause')}
  metadata(duration=180){this.duration=duration;this.readyState=1;this.currentSrc=this.src;this.emit('loadedmetadata')}
}
function environment({navigator={}}={}){
  const location={href:origin+'/music/?song=song&version=remix&t=83&share=1',origin,pathname:'/music/',search:'?song=song&version=remix&t=83&share=1'};
  const window={};
  const context=vm.createContext({window,location,navigator,URL,URLSearchParams});
  vm.runInContext(read('song-moments.js'),context);
  return {window,location,context,api:window.CMDSongMoments};
}
test('moment URLs retain exact recording and time on the canonical domain',()=>{
  const {api}=environment();const data=api.shareData(track,83.8),url=new URL(data.url);
  assert.equal(url.origin,origin);assert.equal(url.pathname,'/music/');
  assert.equal(url.searchParams.get('song'),'song');assert.equal(url.searchParams.get('version'),'remix');
  assert.equal(url.searchParams.get('t'),'83');assert.equal(url.searchParams.get('share'),'1');
  assert.match(data.text,/1:23/);assert.match(data.title,/Remix/);
  assert.equal(api.shareData({},12),null);
});
test('native sharing bypasses shortening and cancellation does not copy anything',async()=>{
  const native=[],copies=[];
  const {window,api}=environment({navigator:{share:async data=>native.push(data),clipboard:{writeText:async text=>copies.push(text)}}});
  window.CMDShortLinks={prepareShare(){throw Error('Should not shorten a moment')}};
  const result=await api.share(track,38);
  assert.equal(result.status,'shared');assert.equal(new URL(native[0].url).searchParams.get('t'),'38');assert.equal(copies.length,0);
  const cancelled=environment({navigator:{share:async()=>{throw Object.assign(Error(),{name:'AbortError'})},clipboard:{writeText:async text=>copies.push(text)}}});
  assert.equal((await cancelled.api.share(track,38)).status,'cancelled');assert.equal(copies.length,0);
});
test('clipboard fallback keeps moment URL and reports manual copy honestly if blocked',async()=>{
  let copied='';const good=environment({navigator:{clipboard:{writeText:async value=>copied=value}}});
  assert.equal((await good.api.share(track,10)).status,'copied');assert.match(copied,/t=10&share=1/);
  const blocked=environment({navigator:{clipboard:{writeText:async()=>{throw Error('denied')}}}});
  const result=await blocked.api.share(track,10);assert.equal(result.status,'copy');assert.match(result.url,/t=10&share=1/);
});
test('incoming time applies only to its exact song and variant, with invalid times normalized',()=>{
  const {api}=environment();
  assert.equal(api.readRequest('?song=song&version=main&t=90',track),null);
  assert.equal(api.readRequest('?song=other&version=remix&t=90',track),null);
  assert.equal(api.readRequest('?song=song&version=remix',track),null);
  for(const value of ['-4','NaN','Infinity','abc'])assert.equal(api.readRequest(`?song=song&version=remix&t=${value}`,track).seconds,0);
});
test('a moment waits for matching metadata, seeks once and clamps before the end',()=>{
  const {api}=environment(),media=new Media();
  const request=api.readRequest('?song=song&version=remix&t=99999',track),applied=[];
  const cue=api.cue(request,{onApplied:value=>applied.push(value)});
  assert.equal(media.currentTime,0);assert.equal(media.plays,0);
  cue.arm(media,()=>track);assert.equal(media.currentTime,0);
  media.metadata(100);assert.equal(media.currentTime,99.9);assert.equal(applied.length,1);
  media.currentTime=6;media.emit('loadedmetadata');media.emit('durationchange');assert.equal(media.currentTime,6);
  assert.equal(cue.arm(media),false);assert.equal(media.plays,0);
});
test('a stale loaded source or mismatched identity never receives the seek',()=>{
  const {api}=environment(),media=new Media();media.currentSrc='/main.mp3';media.duration=120;media.readyState=1;
  const request=api.readRequest('?song=song&version=remix&t=83',track);let current={...track,variantId:'main'};
  const cue=api.cue(request);cue.arm(media,()=>current);assert.equal(media.currentTime,0);
  media.metadata();assert.equal(media.currentTime,0);
  current=track;media.emit('canplay');assert.equal(media.currentTime,83);
});
test('switching recordings before metadata cancels a pending moment permanently',()=>{
  const {api}=environment(),media=new Media();
  const cue=api.cue(api.readRequest('?song=song&version=remix&t=83',track));cue.arm(media,()=>track);
  media.src='/another.mp3';media.emit('loadstart');media.metadata();assert.equal(media.currentTime,0);
  media.src='/remix.mp3';media.emit('loadstart');media.metadata();assert.equal(media.currentTime,0);
});
function listeningEnvironment({existing=false}={}){
  const env=environment(),elements=new Map(),audio=new Media('');let current=null,live=existing?track:null,activeAudio=existing?new Media(track.audio):null,options;
  const element=id=>{if(id==='catalogAudio')return audio;if(!elements.has(id))elements.set(id,new Target());return elements.get(id)};
  if(activeAudio){activeAudio.metadata();activeAudio.currentTime=12;activeAudio.paused=false}
  const catalog={getCurrent:()=>current,getQueue:()=>current?[current]:[],getQueueIndex:()=>0,peekNext:()=>null,
    playRecording(id,variantId){current={...track,songId:id,variantId};audio.src=track.audio;audio.currentSrc='';audio.readyState=0;audio.emit('loadstart');audio.play();return true},next(){},previous(){}};
  const player={getTrack:()=>live,getMedia:()=>activeAudio,connect:input=>{options=input;return {activate(){live=options.getTrack();activeAudio=audio}}},control(action){return activeAudio?.[action]?.()}};
  env.window.CMDMusicCatalog=catalog;env.window.CMDUniversalPlayer=player;env.window.top=env.window;
  env.window.CMD_SONGS=[{id:'song',title:'A song',audio:'/main.mp3',variants:[{id:'main',label:'Main',audio:'/main.mp3'},{id:'remix',label:'Remix',audio:'/remix.mp3'}]}];
  env.window.CMDCatalogCycle={variants:song=>song?.variants||[],intents:[],normalizeIntent:()=>''};
  env.context.document={getElementById:element};
  vm.runInContext(read('music/listening.js'),env.context);
  return {...env,element,audio,catalog,player,get activeAudio(){return activeAudio},setCurrent:track=>current=track};
}
test('recipient page labels the shared moment and waits for the Play gesture and metadata',()=>{
  const env=listeningEnvironment();
  assert.equal(env.audio.plays,0);assert.equal(env.audio.src,'');
  assert.match(env.element('listenPlay').textContent,/Play from 1:23/);assert.match(env.element('listenMoment').textContent,/1:23/);
  env.element('listenPlay').emit('click');assert.equal(env.audio.plays,1);assert.equal(env.audio.currentTime,0);
  env.audio.metadata();assert.equal(env.audio.currentTime,83);
  env.audio.currentTime=91;env.element('listenPlay').emit('click');env.element('listenPlay').emit('click');assert.equal(env.audio.currentTime,91);
});
test('recipient gesture seeks the retained audio owner without restarting a second player',()=>{
  const env=listeningEnvironment({existing:true}),owner=env.activeAudio;
  assert.equal(owner.currentTime,12);assert.equal(owner.plays,0);assert.equal(env.audio.plays,0);
  env.element('listenPlay').emit('click');assert.equal(owner.currentTime,83);assert.equal(owner.plays,1);assert.equal(env.audio.plays,0);
});
test('choosing another song before the initial play discards the shared start time',()=>{
  const env=listeningEnvironment();
  env.setCurrent({...track,songId:'another',audio:'/another.mp3'});env.audio.src='/another.mp3';env.audio.emit('loadstart');env.audio.metadata();
  assert.equal(env.element('listenMoment').hidden,true);assert.equal(env.audio.currentTime,0);
  env.setCurrent(track);env.audio.src=track.audio;env.audio.emit('loadstart');env.audio.metadata();assert.equal(env.audio.currentTime,0);
});
