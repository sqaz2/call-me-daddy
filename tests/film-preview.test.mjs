import test from 'node:test';
import assert from 'node:assert/strict';
import {connectFilmPreview,ROOM_ENOUGH_VIDEO} from '../library/film-preview.mjs';

class Media extends EventTarget{
  constructor(){super();this.paused=true;this.ended=false;this.readyState=4;this.currentTime=0;this.duration=120;this.playbackRate=1;this.src='';this.error=null;this.plays=0;this.pauses=0;}
  getAttribute(name){return this[name]||null;}
  emit(event){this.dispatchEvent(new Event(event));}
  play(){this.plays++;if(this.rejectPlay)return Promise.reject(this.rejectPlay);this.paused=false;return this.pendingPlay||Promise.resolve();}
  pause(){this.pauses++;this.paused=true;}
  load(){this.error=null;}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
  const audio=new Media(),video=new Media(),states=[];
  const film=connectFilmPreview({audio,video,onState:s=>states.push(s)});
  const playing=()=>{audio.paused=false;audio.ended=false;audio.emit('playing');};
  return {audio,video,film,states,playing};
}

test('loading a library page does not fetch or play the film; a song starts a silent picture',async()=>{
  const {audio,video,film,playing}=setup();
  assert.equal(video.src,'');assert.equal(video.plays,0);
  film.select();playing();await settle();
  assert.equal(video.src,ROOM_ENOUGH_VIDEO);assert.equal(video.paused,false);
  assert.equal(video.muted,true);assert.equal(video.defaultMuted,true);assert.equal(video.volume,0);
  assert.equal(video.playsInline,true);assert.equal(video.loop,true);
  assert.equal(audio.plays,0);assert.equal(audio.pauses,0);
});
test('new versions, next, previous and repeat selections reset the same film without a second audio queue',async()=>{
  const {audio,video,film,playing}=setup();
  for(const selection of ['first','version','next','previous','repeat']){
    video.currentTime=70;audio.currentTime=0;film.select(selection);
    assert.equal(video.currentTime,0);assert.equal(video.paused,true);
    playing();await settle();assert.equal(video.paused,false);
  }
  assert.equal(audio.plays,0);assert.equal(audio.pauses,0);
});
test('pause, buffering and resuming keep the picture with the song',async()=>{
  const {audio,video,film,playing}=setup();film.select();playing();await settle();
  audio.currentTime=23;audio.emit('waiting');assert.equal(video.paused,true);
  playing();await settle();assert.equal(video.currentTime,23);assert.equal(video.paused,false);
  audio.paused=true;audio.emit('pause');assert.equal(video.paused,true);
  playing();await settle();assert.equal(video.paused,false);
  audio.ended=true;audio.emit('ended');assert.equal(video.paused,true);
});
test('seeking longer recordings uses the corresponding loop position, including while paused',async()=>{
  const {audio,video,film,playing}=setup();film.select();playing();await settle();
  audio.emit('seeking');assert.equal(video.paused,true);
  audio.currentTime=149;audio.emit('seeked');await settle();
  assert.equal(video.currentTime,29);assert.equal(video.paused,false);
  audio.paused=true;audio.emit('pause');audio.currentTime=51;audio.emit('seeking');audio.emit('seeked');
  assert.equal(video.currentTime,51);assert.equal(video.paused,true);
});
test('delayed film metadata and playback catch up to the actual audio position',async()=>{
  const {audio,video,film,playing}=setup();video.readyState=0;film.select();playing();await settle();
  audio.currentTime=12;video.readyState=4;video.emit('loadedmetadata');await settle();
  assert.equal(video.currentTime,12);
  audio.currentTime=18;video.emit('playing');assert.equal(video.currentTime,18);
});
test('hiding the film leaves audio running and showing it catches up',async()=>{
  const {audio,video,film,playing}=setup();film.select();playing();await settle();
  film.setEnabled(false);audio.currentTime=43;audio.emit('timeupdate');
  assert.equal(video.paused,true);assert.equal(audio.paused,false);
  film.setEnabled(true);await settle();assert.equal(video.currentTime,43);assert.equal(video.paused,false);
  assert.equal(audio.pauses,0);
});
test('blocked or failed video playback never pauses or skips the song and can be retried',async()=>{
  const {audio,video,film,playing,states}=setup();video.rejectPlay={name:'NotAllowedError'};film.select();playing();await settle();
  assert.equal(states.at(-1),'blocked');assert.equal(audio.paused,false);
  video.rejectPlay=null;film.retry();await settle();assert.equal(video.paused,false);
  video.error={code:2};video.emit('error');
  assert.equal(states.at(-1),'unavailable');assert.equal(audio.paused,false);
  film.retry();await settle();assert.equal(video.paused,false);assert.equal(audio.pauses,0);
});
test('old asynchronous play results cannot change a rapidly selected replacement recording',async()=>{
  const {video,film,playing,states}=setup();
  let reject;video.pendingPlay=new Promise((_,r)=>{reject=r;});
  film.select();playing();film.select();video.pendingPlay=null;playing();await settle();
  reject({name:'NotAllowedError'});await settle();
  assert.equal(states.at(-1),'playing');assert.equal(video.paused,false);
});
test('video unmuting is reversed and speed follows the audio owner',()=>{
  const {audio,video}=setup();
  video.muted=false;video.volume=1;video.emit('volumechange');assert.equal(video.muted,true);assert.equal(video.volume,0);
  audio.playbackRate=1.5;audio.emit('ratechange');assert.equal(video.playbackRate,1.5);
});
test('destroy removes observers so later audio events cannot revive the picture',async()=>{
  const {video,film,playing}=setup();film.select();playing();await settle();film.destroy();
  const count=video.plays;playing();await settle();assert.equal(video.plays,count);assert.equal(video.paused,true);
});
