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
  const followCalls=[];
  const cancelCalls=[];
  const sessionStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))};
  const location={href:`https://callmedaddy.musicsubject.com/release/${search}`,origin:'https://callmedaddy.musicsubject.com',pathname:'/release/',search,hash:''};
  const window={CMDPersistentSite:{setSession(){},refreshClearance(){},followTrack(track,options){followCalls.push({track,options})},cancelFollow(){cancelCalls.push(true)}}};
  const navigator={audioSession:{type:'auto'}};
  const context=vm.createContext({window,document,sessionStorage,location,navigator,performance:{getEntriesByType:()=>[{type:navigationType}]},addEventListener:windowEvents.addEventListener.bind(windowEvents),URL,URLSearchParams,Date,Math,JSON,Error,Number,String,Promise});
  vm.runInContext(source,context,{filename:'continuous-playback.js'});
  return {window,document,windowEvents,sessionStorage,storage,navigator,followCalls,cancelCalls};
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

test('a newly playing track starts the shared five-second page-follow prompt',()=>{
  const env=environment();
  const audio=new FakeAudio('/first.mp3');
  const controller=env.window.CMDContinuousPlayback.create({
    id:'release-player',audio,
    tracks:[
      {id:'first',title:'First',audio:'/first.mp3',experience:'/first/'},
      {id:'second',title:'Second',audio:'/second.mp3',experience:'/second/'}
    ]
  });
  controller.play();
  assert.equal(env.followCalls.length,0,'starting the page song must not navigate away');
  controller.next('button-next');
  assert.equal(env.followCalls.length,1);
  assert.equal(env.followCalls[0].track.title,'Second');
  assert.equal(env.followCalls[0].track.experience,'/second/');
  assert.equal(env.followCalls[0].options.seconds,5);
  assert.equal(env.followCalls[0].options.reason,'button-next');
});

test('page following can be cancelled by pausing or disabled per player',()=>{
  const env=environment();
  const audio=new FakeAudio('/first.mp3');
  const controller=env.window.CMDContinuousPlayback.create({
    id:'release-player',audio,followPages:false,
    tracks:[
      {id:'first',title:'First',audio:'/first.mp3',experience:'/first/'},
      {id:'second',title:'Second',audio:'/second.mp3',experience:'/second/'}
    ]
  });
  controller.next();
  assert.equal(env.followCalls.length,0);
  audio.pause();
  assert.equal(env.cancelCalls.length,1);
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
  assert.equal(restoredEnv.followCalls.length,0,'recovery must not open another page');
});
