import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../my-music/library.js',import.meta.url),'utf8');
const KEY='cmd-my-music-v1';
const plain=value=>JSON.parse(JSON.stringify(value));
const ref=(songId,variantId='main')=>({songId,variantId});
const track=(songId,variantId='main')=>({...ref(songId,variantId),audio:`/media/${songId}-${variantId}.mp3`});

function load({storage=new Map(),blockedRead=false,blockedWrite=false}={}){
  let clock=10000,writes=0;
  const handlers=new Map();
  const location={href:'https://callmedaddy.musicsubject.com/music/',origin:'https://callmedaddy.musicsubject.com'};
  const window={location,addEventListener:(type,fn)=>handlers.set(type,fn),dispatchEvent:()=>{}};
  window.top=window;
  class Clock extends Date{static now(){return clock}}
  const localStorage={
    getItem(key){if(blockedRead)throw Error('No storage');return storage.get(key)??null},
    setItem(key,value){if(blockedWrite)throw Error('Quota');storage.set(key,String(value));if(key===KEY)writes++},
    removeItem:key=>storage.delete(key)
  };
  vm.runInNewContext(source,{window,location,localStorage,URL,Date:Clock,console});
  return {api:window.CMDMyMusic,storage,window,tick:ms=>clock+=ms,writes:()=>writes,blockWrites:()=>{blockedWrite=true},storageEvent:key=>handlers.get('storage')?.({key})};
}
function audio(t,{position=0,paused=false,ended=false,duration=200}={}){
  return {currentSrc:new URL(t.audio,'https://callmedaddy.musicsubject.com').href,currentTime:position,paused,ended,duration};
}

test('playlists persist across reload with exact versions, edits, and order',()=>{
  const first=load(),{api,storage}=first;
  const made=api.createPlaylist('  Night drive  ');assert.equal(made.ok,true);
  const id=made.playlist.id;assert.equal(made.playlist.name,'Night drive');
  assert.equal(api.addRecording(id,ref('survival','v6')).ok,true);
  assert.equal(api.addRecording(id,ref('survival','original')).ok,true);
  assert.equal(api.addRecording(id,ref('survival','v6')).ok,false);
  api.moveRecording(id,ref('survival','original'),-1);api.renamePlaylist(id,'Van radio');
  const second=load({storage});
  assert.deepEqual(plain(second.api.getPlaylists()[0]),{id,name:'Van radio',recordings:[ref('survival','original'),ref('survival','v6')],updatedAt:10000});
  second.api.removeRecording(id,ref('survival','original'));
  assert.deepEqual(plain(api.getPlaylists()[0].recordings),[ref('survival','v6')]);
  second.api.deletePlaylist(id);assert.equal(api.getPlaylists().length,0);
});

test('mutations read the newest tab state and do not discard another tab additions',()=>{
  const first=load(),second=load({storage:first.storage});
  const id=first.api.createPlaylist('Shared device').playlist.id;
  first.api.addRecording(id,ref('first'));
  second.api.addRecording(id,ref('second'));
  first.api.addRecording(id,ref('third'));
  assert.deepEqual(plain(second.api.getPlaylists()[0].recordings),[ref('first'),ref('second'),ref('third')]);
  second.api.deletePlaylist(id);
  assert.equal(first.api.addRecording(id,ref('lost')).ok,false);
  assert.equal(first.api.getPlaylists().length,0);
});

test('playlist bounds reject excess items and treat empty and main as one version',()=>{
  const {api}=load(),id=api.createPlaylist('x'.repeat(120)).playlist.id;
  assert.equal(api.getPlaylists()[0].name.length,80);
  assert.equal(api.createPlaylist(' \n ').ok,false);
  api.addRecording(id,ref('same',''));
  assert.equal(api.addRecording(id,ref('same','main')).ok,false);
  for(let i=1;i<200;i++)api.addRecording(id,ref(`song-${i}`));
  assert.equal(api.addRecording(id,ref('overflow')).ok,false);
  for(let i=1;i<20;i++)assert.equal(api.createPlaylist(`List ${i}`).ok,true);
  assert.equal(api.createPlaylist('Too many').ok,false);
});

test('malformed storage is recoverable and untrusted fields never enter saved data',()=>{
  for(const value of ['not json','null','[]','{"version":999,"playlists":[]}']){
    const storage=new Map([[KEY,value]]),{api}=load({storage});
    assert.equal(api.getPlaylists().length,0);assert.equal(api.getResume(),null);
    assert.equal(api.storageStatus().persistent,true);assert.equal(api.createPlaylist('Recovered').ok,true);
  }
  const storage=new Map([[KEY,JSON.stringify({version:1,playlists:[null,{id:'p-good',name:'Good',source:'https://attacker.test',recordings:[{...ref('valid','v6'),audio:'https://attacker.test/song.mp3'},ref('https://attacker.test','main'),null,ref('valid','v6')]},{id:'p-good',name:'Duplicate'}],resume:{queue:[ref('valid')],index:999,position:9}})]]);
  const {api}=load({storage});
  assert.deepEqual(plain(api.getPlaylists()),[{id:'p-good',name:'Good',recordings:[ref('valid','v6')],updatedAt:0}]);
  assert.equal(api.getResume(),null);api.renamePlaylist('p-good','Safe');
  assert.ok(!storage.get(KEY).includes('attacker'));
  assert.equal(api.addRecording('p-good',{songId:'../evil',variantId:'main'}).ok,false);
  assert.equal(api.addRecording('p-good',{songId:'valid',variantId:{evil:true}}).ok,false);
});

test('blocked writes and reads keep a usable session-only library and surface its status',()=>{
  for(const options of [{blockedWrite:true},{blockedRead:true}]){
    const {api,storage}=load(options),id=api.createPlaylist('Session playlist').playlist.id;
    api.addRecording(id,ref('one','v6'));api.addRecording(id,ref('two'));
    assert.equal(api.storageStatus().persistent,false);
    assert.deepEqual(plain(api.getPlaylists()[0].recordings),[ref('one','v6'),ref('two')]);
    assert.equal(storage.has(KEY),false);
  }
});

test('a later quota failure retains existing playlists and new mutations in memory',()=>{
  const env=load(),id=env.api.createPlaylist('Keep me').playlist.id;
  env.api.addRecording(id,ref('first'));env.blockWrites();env.api.addRecording(id,ref('second'));
  env.api.renamePlaylist(id,'Still here');
  assert.equal(env.api.storageStatus().persistent,false);
  assert.equal(env.api.getPlaylists()[0].name,'Still here');
  assert.deepEqual(plain(env.api.getPlaylists()[0].recordings),[ref('first'),ref('second')]);
});

test('resume persists IDs and exact queue position, with four-second writes and final pause',()=>{
  const env=load(),{api}=env,t=track('first','v6'),media=audio(t,{position:12});
  const queue=[track('before'),t,track('after')];
  api.rememberPlayback({track:t,media,playing:true,queue,index:1});assert.equal(env.writes(),1);
  env.tick(1000);media.currentTime=13;api.rememberPlayback({track:t,media,playing:true,queue,index:1});assert.equal(env.writes(),1);
  env.tick(3000);media.currentTime=16;api.rememberPlayback({track:t,media,playing:true,queue,index:1});assert.equal(env.writes(),2);
  env.tick(200);media.currentTime=16.2;media.paused=true;api.rememberPlayback({track:t,media,playing:false,queue,index:1});assert.equal(env.writes(),3);
  assert.deepEqual(plain(load({storage:env.storage}).api.getResume()),{queue:[ref('before'),ref('first','v6'),ref('after')],index:1,position:16.2,updatedAt:14200});
  assert.ok(!env.storage.get(KEY).includes('/media/'));
  api.rememberPlayback({track:t,media,playing:false,queue,index:1});assert.equal(env.writes(),3);
  media.currentTime=30;api.rememberPlayback({track:t,media,playing:false,queue,index:1});assert.equal(api.getResume().position,30);
});

test('rapid track changes bypass throttle and a stale source cannot overwrite the current recording',()=>{
  const env=load(),first=track('first'),second=track('second','remix'),media=audio(first,{position:50});
  env.api.rememberPlayback({track:first,media,playing:true,queue:[first,second],index:0});
  media.currentSrc=new URL(second.audio,'https://callmedaddy.musicsubject.com').href;media.currentTime=0;
  env.api.rememberPlayback({track:first,media,playing:true,queue:[first,second],index:0});assert.equal(env.writes(),1);
  env.api.rememberPlayback({track:second,media,playing:true,queue:[first,second],index:1});
  assert.equal(env.writes(),2);assert.equal(env.api.getResume().index,1);assert.equal(env.api.getResume().position,0);
});

test('idle initialization and an old paused owner cannot replace the active resume',()=>{
  const env=load(),first=track('first'),second=track('second'),one=audio(first,{position:42}),two=audio(second,{paused:true,position:70});
  env.api.rememberPlayback({track:first,media:one,playing:true,queue:[first]});
  env.api.rememberPlayback({track:second,media:two,playing:false,queue:[second]});
  env.api.rememberPlayback({track:second,media:two,playing:true,queue:[second]});
  assert.equal(env.api.getResume().queue[0].songId,'first');
  two.paused=false;env.api.rememberPlayback({track:second,media:two,playing:true,queue:[second]});
  one.paused=true;one.currentTime=0;env.api.rememberPlayback({track:first,media:one,playing:false,queue:[first]});
  assert.equal(env.api.getResume().queue[0].songId,'second');assert.equal(env.api.getResume().position,70);
  const reloaded=load({storage:env.storage});
  reloaded.api.rememberPlayback({track:first,media:one,playing:false,queue:[first]});
  assert.equal(reloaded.api.getResume().queue[0].songId,'second');
});

test('queue cleanup maps the current index and duplicate instances correctly',()=>{
  const {api}=load(),t={...track('current','v6'),queueIndex:3},media=audio(t);
  api.rememberPlayback({track:t,media,playing:true,queue:[null,t,track('other'),t]});
  assert.deepEqual(plain(api.getResume().queue),[ref('current','v6'),ref('other'),ref('current','v6')]);
  assert.equal(api.getResume().index,2);
  // A stale reported index is reconciled to the actual source and version.
  api.rememberPlayback({track:t,media,playing:true,queue:[track('wrong'),null,t],index:0});
  assert.equal(api.getResume().index,1);
});

test('a long queue stays bounded while keeping its active recording and useful neighbours',()=>{
  const {api}=load(),queue=Array.from({length:600},(_,i)=>track(`song-${i}`)),t=queue[450],media=audio(t);
  api.rememberPlayback({track:t,media,playing:true,queue,index:450});
  const saved=api.getResume();assert.equal(saved.queue.length,200);assert.equal(saved.queue[saved.index].songId,'song-450');
  assert.equal(saved.queue[0].songId,'song-350');
});

test('completed tracks resume at zero and media without a matching catalog identity is ignored',()=>{
  const {api}=load(),t=track('finished'),media=audio(t,{position:199});
  api.rememberPlayback({track:t,media,playing:true,queue:[t]});
  media.ended=true;media.paused=true;media.currentTime=200;api.rememberPlayback({track:t,media,playing:false,queue:[t]});
  assert.equal(api.getResume().position,0);
  api.rememberPlayback({track:{audio:'/other.mp3'},media:audio({audio:'/other.mp3'}),playing:true});
  assert.equal(api.getResume().queue[0].songId,'finished');
});

test('subscriptions cover local edits and other tabs, and unsubscribe is respected',()=>{
  const env=load();let calls=0;const stop=env.api.subscribe(()=>calls++);
  env.api.createPlaylist('One');assert.equal(calls,1);
  env.storageEvent(KEY);assert.equal(calls,2);env.storageEvent('unrelated');assert.equal(calls,2);
  stop();env.api.createPlaylist('Two');assert.equal(calls,2);
});

test('reentrant render subscribers do not bypass the resume write throttle',()=>{
  const env=load(),t=track('song'),media=audio(t),sample={track:t,media,playing:true,queue:[t]};
  let calls=0;env.api.subscribe(()=>{if(++calls<5)env.api.rememberPlayback(sample)});
  env.api.rememberPlayback(sample);assert.equal(env.writes(),1);assert.equal(calls,1);
});

test('same-origin retained frames reuse the top API and its memory-only subscription state',()=>{
  const top=load({blockedWrite:true}),window={top:top.window,location:top.window.location};
  vm.runInNewContext(source,{window});assert.equal(window.CMDMyMusic,top.api);
});
