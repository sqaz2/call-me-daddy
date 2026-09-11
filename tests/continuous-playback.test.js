const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../continuous-playback.js'),'utf8');

class FakeTarget{
  constructor(){this.listeners=new Map()}
  addEventListener(type,handler){const handlers=this.listeners.get(type)||[];handlers.push(handler);this.listeners.set(type,handlers)}
  emit(type,event={}){for(const handler of this.listeners.get(type)||[])handler({type,target:this,...event})}
}

class FakeAudio extends FakeTarget{
  constructor(src='/first.mp3'){
    super();
    this.src=src;
    this.currentSrc=src;
    this.currentTime=0;
    this.duration=180;
    this.playbackRate=1;
    this.paused=true;
    this.ended=false;
    this.playCalls=0;
    this.loadCalls=0;
    this.error=null;
    this.id='testAudio';
  }
  load(){this.loadCalls+=1;this.currentSrc=this.src}
  play(){this.playCalls+=1;this.paused=false;this.ended=false;this.emit('play');return Promise.resolve()}
  pause(){this.paused=true;this.emit('pause')}
}

function environment({storage=new Map(),navigationType='navigate',search=''}={}){
  const document=new FakeTarget();
  document.visibilityState='visible';
  document.wasDiscarded=false;
  const windowEvents=new FakeTarget();
  const sessionStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))};
  const location={href:`https://callmedaddy.musicsubject.com/release/${search}`,origin:'https://callmedaddy.musicsubject.com',pathname:'/release/',search,hash:''};
  const window={CMDPersistentSite:{setSession(){},refreshClearance(){}}};
  const navigator={audioSession:{type:'auto'}};
  const context=vm.createContext({window,document,sessionStorage,location,navigator,performance:{getEntriesByType:()=>[{type:navigationType}]},addEventListener:windowEvents.addEventListener.bind(windowEvents),URL,URLSearchParams,Date,Math,JSON,Error,Number,String,Promise});
  vm.runInContext(source,context,{filename:'continuous-playback.js'});
  return {window,document,windowEvents,sessionStorage,storage,navigator};
}

test('ended moves to the prepared next song immediately on the same audio element',async()=>{
  const env=environment();
  const audio=new FakeAudio('/first.mp3');
  let radioCalls=0;
  const controller=env.window.CMDContinuousPlayback.create({
    id:'release-player',
    audio,
    tracks:[{id:'first',title:'First',audio:'/first.mp3'}],
    radio:{next(){radioCalls+=1;return {id:'second',title:'Second',audio:'/second.mp3'}}}
  });
  controller.play();
  assert.equal(radioCalls,1,'the next route is prepared before the current track ends');
  audio.paused=true;
  audio.ended=true;
  audio.emit('ended');
  await Promise.resolve();
  assert.equal(audio.src,'/second.mp3');
  assert.equal(audio.playCalls,2);
  assert.equal(controller.current().title,'Second');
});

test('track callbacks and subscribers never announce the next title against the previous audio source',()=>{
  const env=environment(),audio=new FakeAudio('/satans-loan.mp3'),seen=[];
  env.window.CMDContinuousPlayback.subscribe(event=>{if(event.type==='track')seen.push([event.track.audio,event.audio.src]);});
  const controller=env.window.CMDContinuousPlayback.create({audio,tracks:[{id:'satans-loan',title:"Satan's Loan",audio:'/satans-loan.mp3'},{id:'superstore-effect',title:'the superstore effect',audio:'/superstore-effect.mp3'}],onTrack:track=>seen.push([track.audio,audio.src])});
  controller.play();controller.next();controller.load(0,{autoplay:true});
  assert.ok(seen.length>=6);
  seen.forEach(([announced,playing])=>assert.equal(announced,playing,'Track changes must install their media source before publishing metadata'));
});

test('a background pause recovers when the document resumes',async()=>{
  const env=environment();
  const audio=new FakeAudio('/first.mp3');
  const controller=env.window.CMDContinuousPlayback.create({id:'release-player',audio,tracks:[{id:'first',title:'First',audio:'/first.mp3'}],loopLocal:true});
  controller.play();
  env.document.visibilityState='hidden';
  audio.paused=true;
  audio.emit('pause');
  const before=audio.playCalls;
  env.document.emit('resume');
  await Promise.resolve();
  assert.equal(audio.playCalls,before+1);
  assert.equal(controller.getState().wantsPlayback,true);
});

test('the prepared song is announced during the five-second Up Next window',()=>{
  const env=environment();
  const audio=new FakeAudio('/first.mp3');
  const events=[];
  env.window.CMDContinuousPlayback.subscribe(event=>events.push(event));
  env.window.CMDContinuousPlayback.create({
    id:'release-player',
    audio,
    tracks:[{id:'first',title:'First',audio:'/first.mp3'}],
    radio:{next(){return {id:'second',title:'Second',audio:'/second.mp3'}}}
  });
  audio.currentTime=176;
  audio.emit('timeupdate');
  const event=events.at(-1);
  assert.equal(event.type,'time');
  assert.equal(event.state.nextTrack.title,'Second');
  assert.equal(event.state.secondsRemaining,4);
});

test('a deliberate visible pause stays paused',()=>{
  const env=environment();
  const audio=new FakeAudio('/first.mp3');
  const controller=env.window.CMDContinuousPlayback.create({id:'release-player',audio,tracks:[{id:'first',title:'First',audio:'/first.mp3'}],loopLocal:true});
  controller.play();
  audio.pause();
  env.document.emit('resume');
  assert.equal(controller.getState().wantsPlayback,false);
  assert.equal(audio.paused,true);
});

test('an older paused player cannot overwrite the active player recovery record',()=>{
  const env=environment();
  const firstAudio=new FakeAudio('/first.mp3');
  const secondAudio=new FakeAudio('/second.mp3');
  const first=env.window.CMDContinuousPlayback.create({id:'first-player',audio:firstAudio,tracks:[{id:'first',title:'First',audio:'/first.mp3'}],loopLocal:true});
  const second=env.window.CMDContinuousPlayback.create({id:'second-player',audio:secondAudio,tracks:[{id:'second',title:'Second',audio:'/second.mp3'}],loopLocal:true});
  first.play();
  second.play();
  first.pause();
  env.document.visibilityState='hidden';
  env.document.emit('visibilitychange');
  const snapshot=JSON.parse(env.sessionStorage.getItem('cmd:playback-session:v1'));
  assert.equal(snapshot.playerId,'second-player');
  assert.equal(snapshot.wantsPlayback,true);
});

test('reload restores the same song and position from the tab session',async()=>{
  const storage=new Map();
  const firstEnv=environment({storage});
  const firstAudio=new FakeAudio('/first.mp3');
  const first=firstEnv.window.CMDContinuousPlayback.create({id:'release-player',audio:firstAudio,tracks:[{id:'first',title:'First',audio:'/first.mp3'}],loopLocal:true,route:'/release/'});
  first.play();
  firstAudio.currentTime=47;
  firstEnv.document.visibilityState='hidden';
  firstEnv.document.emit('visibilitychange');

  const restoredEnv=environment({storage,navigationType:'reload'});
  const restoredAudio=new FakeAudio('/first.mp3');
  restoredEnv.window.CMDContinuousPlayback.create({id:'release-player',audio:restoredAudio,tracks:[{id:'first',title:'First',audio:'/first.mp3'}],loopLocal:true,route:'/release/'});
  assert.equal(restoredAudio.loadCalls,1);
  restoredAudio.emit('loadedmetadata');
  await Promise.resolve();
  assert.equal(restoredAudio.currentTime,47);
  assert.equal(restoredAudio.playCalls,1);
  assert.equal(restoredEnv.navigator.audioSession.type,'playback');
});

test('release history is recorded on actual playback, not idle preparation or pause/resume',()=>{
  const env=environment(),audio=new FakeAudio(),heard=[];
  env.window.CMDCatalogCycle={remember:track=>heard.push(track.id)};
  const c=env.window.CMDContinuousPlayback.create({audio,tracks:[{id:'first',audio:'/first.mp3'},{id:'second',audio:'/second.mp3'}]});
  assert.deepEqual(heard,[]);c.play();assert.deepEqual(heard,[]);
  audio.emit('playing');c.pause();c.play();audio.emit('playing');
  assert.deepEqual(heard,['first']);c.next();audio.emit('playing');
  assert.deepEqual(heard,['first','second']);
});
test('a queued song put on break is skipped even when it was already prepared',()=>{
  const env=environment(),audio=new FakeAudio(),parked=new Set();
  env.window.CMDCatalogCycle={isOnBreak:id=>parked.has(id)};
  const c=env.window.CMDContinuousPlayback.create({audio,tracks:[{id:'first',audio:'/first.mp3'},{id:'second',audio:'/second.mp3'},{id:'third',audio:'/third.mp3'}]});
  assert.equal(c.peekNext().id,'second');parked.add('second');c.next();
  assert.equal(c.current().id,'third');
});
test('destroyed controllers cannot advance, recover or overwrite metadata from late events',()=>{
  const env=environment(),audio=new FakeAudio();let updates=0;
  const c=env.window.CMDContinuousPlayback.create({audio,tracks:[{id:'first',audio:'/first.mp3'},{id:'second',audio:'/second.mp3'}],onTrack:()=>updates++});
  c.play();c.destroy();const calls=audio.playCalls,changes=updates;
  audio.emit('ended');audio.emit('error');env.document.emit('resume');c.next();c.play();
  assert.equal(audio.playCalls,calls);assert.equal(updates,changes);assert.equal(audio.src,'/first.mp3');
});
