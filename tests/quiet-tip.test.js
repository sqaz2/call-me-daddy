const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../quiet-tip.js'),'utf8');
const ORIGIN='https://callmedaddy.musicsubject.com',KEY='cmd-quiet-tip-v1';
const plain=value=>JSON.parse(JSON.stringify(value));
class Media{
  constructor(name='one',duration=300){this.src=`${ORIGIN}/${name}.mp3`;this.currentSrc=this.src;this.currentTime=0;this.duration=duration;this.paused=false;this.ended=false;this.muted=false;this.volume=1;this.readyState=4;this.playbackRate=1;this.tagName='AUDIO';this.listeners=new Map()}
  getAttribute(key){return key==='src'?this.src:null}
  addEventListener(type,fn,capture){this.listeners.set(type,[...this.listeners.get(type)||[],{fn,capture}])}
  removeEventListener(type,fn,capture){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item.fn!==fn||item.capture!==capture))}
  emit(type){for(const item of [...this.listeners.get(type)||[]].sort((a,b)=>Number(b.capture)-Number(a.capture)))item.fn({type,target:this})}
  play(){throw Error('Engagement must never control playback')}
  pause(){throw Error('Engagement must never control playback')}
}
function load({storage=new Map(),blocked=false,top,clock=1000000}={}){
  const location={origin:ORIGIN,href:ORIGIN+'/music/'};
  const sessionStorage={getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)||null},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value)}};
  const window={location,sessionStorage};window.top=top||window;
  class Clock extends Date{static now(){return clock}}
  const context={window,URL,Date:Clock};vm.runInNewContext(source,context);
  const api=window.CMDQuietTip;
  return {api,window,storage,tick:seconds=>clock+=seconds*1000,now:()=>clock,again:()=>vm.runInNewContext(source,context),observe:media=>api.observe({track:{audio:media.currentSrc},media,playing:!media.paused&&!media.ended})};
}
function advance(env,media,seconds){for(let i=0;i<seconds;i++){env.tick(1);media.currentTime+=media.playbackRate;media.emit('timeupdate');env.observe(media)}}
function finish(env,media){env.tick(1);media.currentTime=media.duration;media.ended=true;media.paused=true;media.emit('timeupdate');media.emit('pause');env.observe(media);media.emit('ended')}
function song(env,name,duration=300){const media=new Media(name,duration);env.observe(media);advance(env,media,duration-1);finish(env,media);return media}

test('requires both 15 actual minutes and three genuine natural completions',()=>{
  const env=load();song(env,'one');song(env,'two');
  const third=new Media('three');env.observe(third);advance(env,third,299);
  assert.deepEqual(plain(env.api.getState()),{eligible:false,listenedSeconds:899,completedSongs:2});
  finish(env,third);
  assert.deepEqual(plain(env.api.getState()),{eligible:true,listenedSeconds:900,completedSongs:3});
  third.emit('ended');assert.equal(env.api.getState().completedSongs,3);
  const short=load();song(short,'a',10);song(short,'b',10);song(short,'c',10);
  assert.equal(short.api.getState().completedSongs,3);assert.equal(short.api.getState().eligible,false);
  const long=load();song(long,'a',450);song(long,'b',450);
  assert.equal(long.api.getState().listenedSeconds,900);assert.equal(long.api.getState().eligible,false);
});

test('captures completion before the controller changes the source',()=>{
  const env=load(),media=new Media();
  media.addEventListener('ended',()=>{media.src=ORIGIN+'/next.mp3';media.currentSrc=media.src;media.currentTime=0;media.ended=false;media.paused=false},false);
  env.observe(media);advance(env,media,299);finish(env,media);
  assert.equal(env.api.getState().completedSongs,1);assert.equal(env.api.getState().listenedSeconds,300);
});

test('pauses, mute, zero volume, waiting, seeks and long background gaps do not count as listening',()=>{
  const env=load(),media=new Media();env.observe(media);advance(env,media,5);
  media.paused=true;media.emit('pause');advance(env,media,8);assert.equal(env.api.getState().listenedSeconds,5);
  media.paused=false;media.emit('play');media.muted=true;media.emit('volumechange');advance(env,media,8);assert.equal(env.api.getState().listenedSeconds,5);
  media.muted=false;media.volume=0;media.emit('volumechange');advance(env,media,8);assert.equal(env.api.getState().listenedSeconds,5);
  media.volume=1;media.emit('volumechange');media.emit('waiting');advance(env,media,8);assert.equal(env.api.getState().listenedSeconds,5);
  media.emit('playing');media.seeking=true;media.emit('seeking');advance(env,media,8);assert.equal(env.api.getState().listenedSeconds,5);
  media.seeking=false;media.emit('seeked');env.tick(20);media.currentTime+=20;media.emit('timeupdate');assert.equal(env.api.getState().listenedSeconds,5);
  advance(env,media,1);assert.equal(env.api.getState().listenedSeconds,6);
});

test('large unannounced jumps and seeking to the end cannot produce a completion',()=>{
  const env=load(),media=new Media();env.observe(media);advance(env,media,225);
  env.tick(1);media.currentTime=299;media.emit('timeupdate');finish(env,media);
  assert.equal(env.api.getState().completedSongs,0);assert.equal(env.api.getState().listenedSeconds,226);
  const premature=load(),other=new Media();premature.observe(other);advance(premature,other,10);finish(premature,other);
  assert.equal(premature.api.getState().completedSongs,0);assert.equal(premature.api.getState().listenedSeconds,10);
});

test('repeated segments cannot substitute for hearing 75 percent of the track',()=>{
  const env=load(),media=new Media();env.observe(media);advance(env,media,150);
  media.emit('seeking');media.currentTime=0;media.emit('seeked');advance(env,media,150);
  media.emit('seeking');media.currentTime=294;media.emit('seeked');advance(env,media,5);finish(env,media);
  assert.equal(env.api.getState().listenedSeconds,306);assert.equal(env.api.getState().completedSongs,0);
});

test('playback speed uses actual elapsed listening time, not a fast clock',()=>{
  const env=load(),media=new Media();media.playbackRate=2;env.observe(media);advance(env,media,149);finish(env,media);
  assert.equal(env.api.getState().listenedSeconds,150);assert.equal(env.api.getState().completedSongs,1);
});

test('source mismatch, decorative video and idle initialization cannot claim engagement',()=>{
  const env=load(),media=new Media();
  env.api.observe({track:{audio:'/wrong.mp3'},media,playing:true});advance(env,media,1);
  // advance also sends a matching observe, which establishes its first baseline.
  assert.equal(env.api.getState().listenedSeconds,0);
  const idle=new Media('idle');idle.paused=true;env.observe(idle);advance(env,media,5);
  assert.equal(env.api.getState().listenedSeconds,5);assert.equal(idle.listeners.size,0);
  const video=new Media('video');video.tagName='VIDEO';env.observe(video);assert.equal(video.listeners.size,0);
  media.src=ORIGIN+'/loading.mp3';advance(env,media,3);assert.equal(env.api.getState().listenedSeconds,5);
});

test('switching owners detaches old handlers and old paused owners cannot steal them back',()=>{
  const env=load(),first=new Media('first'),second=new Media('second');env.observe(first);advance(env,first,5);env.observe(second);
  assert.equal([...first.listeners.values()].flat().length,0);
  first.paused=true;env.observe(first);advance(env,second,5);first.ended=true;first.currentTime=first.duration;first.emit('ended');
  assert.equal(env.api.getState().listenedSeconds,10);assert.equal(env.api.getState().completedSongs,0);
  second.src=ORIGIN+'/third.mp3';second.currentSrc=second.src;second.currentTime=0;env.observe(second);advance(env,second,5);
  assert.equal(env.api.getState().listenedSeconds,15);assert.equal(second.listeners.get('ended').length,1);
});

test('same-origin frames and duplicate script loads reuse one singleton',()=>{
  const parent=load(),child=load({top:parent.window});assert.equal(child.api,parent.api);
  const media=new Media();parent.observe(media);child.observe(media);parent.again();advance(parent,media,5);
  assert.equal(parent.api.getState().listenedSeconds,5);assert.equal(media.listeners.get('ended').length,1);
  const blankParent={location:{origin:ORIGIN},sessionStorage:parent.window.sessionStorage};
  const firstFrame=load({top:blankParent}),secondFrame=load({top:blankParent});assert.equal(firstFrame.api,blankParent.CMDQuietTip);assert.equal(secondFrame.api,firstFrame.api);
});

test('session storage retains bounded progress and expires after 30 idle minutes',()=>{
  const env=load();song(env,'one');song(env,'two');song(env,'three');
  const restored=load({storage:env.storage,clock:env.now()+1000});assert.equal(restored.api.getState().eligible,true);
  restored.tick(30*60);assert.deepEqual(plain(restored.api.getState()),{eligible:false,listenedSeconds:0,completedSongs:0});
  const media=new Media();restored.observe(media);advance(restored,media,5);assert.equal(restored.api.getState().listenedSeconds,5);
  assert.deepEqual(Object.keys(JSON.parse(env.storage.get(KEY))).sort(),['completedSongs','lastActivity','listenedSeconds','version']);
});

test('invalid or stale stored state fails closed; blocked storage still works in memory',()=>{
  for(const value of ['broken',JSON.stringify({version:1,listenedSeconds:Infinity,completedSongs:3,lastActivity:1000}),JSON.stringify({version:1,listenedSeconds:900,completedSongs:3,lastActivity:1000001}),JSON.stringify({version:1,listenedSeconds:900,completedSongs:3,lastActivity:1})]){
    const env=load({storage:new Map([[KEY,value]]),clock:value.includes('lastActivity":1}')?2000000:1000000});assert.equal(env.api.getState().eligible,false);
  }
  const env=load({blocked:true});song(env,'one');song(env,'two');song(env,'three');assert.equal(env.api.getState().eligible,true);
});

test('subscribers receive detached state and can clean up without changing engagement',()=>{
  const env=load(),media=new Media();let calls=0;
  const unsubscribe=env.api.subscribe(state=>{calls++;state.listenedSeconds=100000;throw Error('UI failure')});
  env.observe(media);advance(env,media,3);assert.equal(calls,3);assert.equal(env.api.getState().listenedSeconds,3);
  unsubscribe();advance(env,media,2);assert.equal(calls,3);assert.equal(env.api.getState().listenedSeconds,5);
});
