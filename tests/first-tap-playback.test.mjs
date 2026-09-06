import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const song={id:'superstore-effect',title:'the superstore effect',audio:'/media/songs/2026/09/superstore-effect/audio.mp3',cover:'/cover.jpg',experience:'/superstore-effect/'};
const other={id:'other',title:'Other song',audio:'/other.mp3',experience:'/other/'};

class Element{
  constructor(){this.listeners=new Map();this.attrs=new Map();this.style={};this.hidden=true;this.textContent='';this.classList={add(){}};}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  emit(type,detail={}){const event={currentTarget:this,target:this,...detail};for(const fn of this.listeners.get(type)||[])fn(event);}
  setAttribute(key,value){this.attrs.set(key,String(value));}
  getAttribute(key){return this.attrs.get(key)??null;}
  hasAttribute(key){return this.attrs.has(key);}
  getBoundingClientRect(){return {left:0,width:100};}
  querySelector(){return null;}
}

function fixture({home=false,core=true,songs=[song,other]}={}){
  const state={creates:0,plays:0,loads:[],next:0,previous:0,inGesture:false,synchronous:[],audios:[],options:null,controller:null};
  class Audio extends Element{
    constructor(){super();this.paused=true;this.ended=false;this.currentTime=0;this.duration=213;this.src='';this.muted=false;state.audios.push(this);}
    getAttribute(key){return key==='src'?(this.src||null):super.getAttribute(key);}
    play(){state.plays++;state.synchronous.push(state.inGesture);if(this.rejectPlay)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));this.paused=false;this.ended=false;this.emit('play');return Promise.resolve();}
    pause(){this.paused=true;this.emit('pause');}
  }
  const nodes=new Map();
  if(!home){
    for(const id of ['ssPlayer','ssPlay','ssPlayerStatus','ssPageStatus','ssPlayerTitle','ssPlayerCover','ssPlayerLabel','ssProgress','ssProgressBar','ssNext','ssPrev','ssPlayerShare'])nodes.set(id,new Element());
    nodes.set('ssAudio',new Audio());
  }
  const cover=new Element(),button=new Element(),icon=new Element();
  button.setAttribute('data-ss-play-label','');
  const document=new Element();
  document.body=new Element();
  document.body.appendChild=element=>nodes.set(element.id,element);
  document.getElementById=id=>nodes.get(id)||null;
  document.querySelector=selector=>selector==='.ss-cover-play'?icon:null;
  document.querySelectorAll=selector=>selector==='[data-ss-play]'?[cover,button]:[];
  document.createElement=tag=>tag==='audio'?new Audio():new Element();
  const window={CMD_SONGS:songs,CMDPersistentSite:{setSession(){},refreshClearance(){}},CMDPlaylistRadio:{share(){}}};
  if(core)window.CMDContinuousPlayback={create(options){
    state.creates++;state.options=options;
    let index=options.startIndex||0;
    const queue=options.tracks.slice();
    const current=()=>queue[index];
    const play=()=>options.audio.play().catch(error=>options.onNeedsTap?.(current(),error));
    const controller={current,play,pause:()=>options.audio.pause(),toggle:()=>options.audio.paused?play():options.audio.pause(),
      load(next,config={}){state.loads.push({next,config});index=next;options.audio.src=current().audio;options.audio.currentTime=0;options.onTrack?.(current(),{reason:config.reason||'manual'});if(config.autoplay!==false)play();return true;},
      next(){state.next++;queue.push({...other,songId:other.id});return controller.load(queue.length-1,{autoplay:true});},
      previous(){state.previous++;return controller.load(0,{autoplay:true});}
    };
    options.audio.src=current().audio;
    options.onTrack?.(current(),{reason:'ready'});
    state.controller=controller;
    return controller;
  }};
  const context=vm.createContext({window,document,location:{href:'https://site.test/',origin:'https://site.test'},URL,navigator:{},console});
  vm.runInContext(source(home?'home-playback.js':'superstore-effect/player.js'),context);
  const click=element=>{state.inGesture=true;element.emit('click');state.inGesture=false;};
  const link=(href,extra={})=>{const element=new Element();element.setAttribute('href',href);Object.assign(element,extra);return element;};
  const homeClick=(element,extra={})=>{
    const event={button:0,defaultPrevented:false,target:{closest:()=>element},preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
    state.inGesture=true;document.emit('click',event);state.inGesture=false;
    // Element.emit copies the event; preventDefault's result is checked through a shared marker.
    return event;
  };
  return {state,nodes,cover,button,icon,click,homeClick,link,window,document};
}

test('release cover starts the full audio on the first click, not on page load',()=>{
  const f=fixture();assert.equal(f.state.plays,0);f.click(f.cover);
  assert.equal(f.state.plays,1);assert.equal(f.nodes.get('ssAudio').src,song.audio);
  assert.equal(f.state.synchronous[0],true);assert.equal(f.nodes.get('ssAudio').muted,false);
  assert.equal(f.cover.getAttribute('aria-pressed'),'true');
});
test('the explicit Play full song button is connected too',()=>{
  const f=fixture();f.click(f.button);assert.equal(f.state.plays,1);assert.equal(f.button.textContent,'Pause song');
});
test('a second tap pauses and a third resumes without resetting the song',()=>{
  const f=fixture();f.click(f.cover);const audio=f.nodes.get('ssAudio');audio.currentTime=42;
  f.click(f.cover);assert.equal(audio.paused,true);f.click(f.cover);
  assert.equal(audio.paused,false);assert.equal(audio.currentTime,42);assert.equal(f.state.creates,1);
});
test('the existing shared engine owns previous and next',()=>{
  const f=fixture();f.click(f.nodes.get('ssNext'));f.click(f.nodes.get('ssPrev'));
  assert.equal(f.state.next,1);assert.equal(f.state.previous,1);assert.equal(f.state.options.replacePlayer,f.nodes.get('ssPlayer'));
});
test('tapping the release cover after radio returns to the intended song',()=>{
  const f=fixture();f.click(f.nodes.get('ssNext'));f.click(f.cover);
  assert.equal(f.nodes.get('ssAudio').src,song.audio);assert.equal(f.state.loads.at(-1).config.reason,'cover');
});
test('a failed shared-script load still permits direct first-tap audio',()=>{
  const f=fixture({core:false});assert.equal(f.state.plays,0);f.click(f.cover);
  assert.equal(f.state.plays,1);assert.equal(f.nodes.get('ssAudio').src,song.audio);assert.equal(f.state.synchronous[0],true);
});
test('blocked playback offers a retry rather than silently doing nothing',async()=>{
  const f=fixture({core:false});f.nodes.get('ssAudio').rejectPlay=true;f.click(f.cover);await Promise.resolve();
  assert.match(f.nodes.get('ssPageStatus').textContent,/tap Play to retry/);assert.equal(f.nodes.get('ssPlayer').hidden,false);
});
test('a homepage release card starts audio inside its first click handler',()=>{
  const f=fixture({home:true});assert.equal(f.state.audios.length,0);f.homeClick(f.link('/superstore-effect/'));
  assert.equal(f.state.plays,1);assert.equal(f.state.synchronous[0],true);assert.equal(f.state.audios[0].src,song.audio);
  assert.equal(f.state.options.pageFollowSeconds,5);
});
test('switching homepage songs reuses the same audio element and controller',()=>{
  const f=fixture({home:true});f.homeClick(f.link('/superstore-effect/'));f.homeClick(f.link('/other/'));
  assert.equal(f.state.creates,1);assert.equal(f.state.audios.length,1);assert.equal(f.state.audios[0].src,other.audio);
});
test('modified clicks retain normal browser navigation',()=>{
  const f=fixture({home:true});f.homeClick(f.link('/superstore-effect/'),{ctrlKey:true});
  assert.equal(f.state.plays,0);assert.equal(f.state.creates,0);
});
test('external, download and multi-song links do not start an arbitrary song',()=>{
  const f=fixture({home:true,songs:[song,other,{...other,id:'third',experience:'/other/'}]});
  f.homeClick(f.link('https://elsewhere.test/superstore-effect/'));f.homeClick(f.link('/other/'));
  const download=f.link('/superstore-effect/');download.setAttribute('download','');f.homeClick(download);
  assert.equal(f.state.plays,0);
});
test('recent listening resolves an explicit song identity but not an unknown version',()=>{
  const f=fixture({home:true});f.homeClick(f.link('/music/?song=superstore-effect&version=unknown'));assert.equal(f.state.plays,0);
  f.homeClick(f.link('/music/?song=superstore-effect&intent=surprise'));assert.equal(f.state.plays,1);
});
test('the release has one main artwork, no preview players, and collapsed lyrics',()=>{
  const html=source('superstore-effect/index.html');
  assert.doesNotMatch(html,/<video\b|promo-clip\.mp4|alt-clip\.mp4|background-loop\.mp4|title-card\.png|data-concrete-play/);
  assert.equal((html.match(/class="ss-cover-button"/g)||[]).length,1);
  assert.match(html,/<audio[^>]+src="\/media\/songs\/2026\/09\/superstore-effect\/audio\.mp3"/);
  assert.doesNotMatch(html,/<details\s+open/);assert.match(html,/data-ss-play-label/);
});
test('homepage playback loads after the engine and before navigation interception',()=>{
  const html=source('index.html');
  const engine=html.indexOf('src="/continuous-playback.js'),handler=html.indexOf('src="/home-playback.js'),browser=html.indexOf('src="/persistent-site-browser.js');
  assert.ok(engine>=0&&handler>engine&&browser>handler);
});
