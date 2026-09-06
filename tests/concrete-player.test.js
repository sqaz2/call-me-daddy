const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const playerSource=fs.readFileSync(path.join(root,'concrete-under-evergreens/player.js'),'utf8');
const LOCAL_AUDIO='/media/songs/2026/08/concrete-under-evergreens/audio.mp3';

class FakeClassList{
  constructor(){this.values=new Set()}
  add(name){this.values.add(name)}
  contains(name){return this.values.has(name)}
}

class FakeElement{
  constructor(tag='div',id=''){
    this.tagName=String(tag).toUpperCase();this.id=id;this.hidden=false;this.listeners=new Map();this.style={};this.textContent='';this.src='';this.href='';this.attributes=new Map();
  }
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list)}
  dispatch(type,init={}){const event={type,target:this,currentTarget:this,clientX:50,preventDefault(){},...init};for(const listener of this.listeners.get(type)||[])listener(event)}
  click(){this.dispatch('click')}
  setAttribute(k,v){this.attributes.set(k,String(v))}
  getAttribute(k){return this.attributes.get(k)||null}
  getBoundingClientRect(){return {left:0,width:100}}
}

class FakeAudio extends FakeElement{
  constructor(id){super('audio',id);this._src='';this.paused=true;this.ended=false;this.duration=180;this.currentTime=0}
  set src(value){this._src=value||''}
  get src(){return this._src}
  play(){this.paused=false;this.ended=false;this.dispatch('play');return Promise.resolve()}
  pause(){if(this.paused)return;this.paused=true;this.dispatch('pause')}
}

function createHarness({live=null,asChildFrame=false}={}){
  const location={href:'https://callmedaddy.musicsubject.com/concrete-under-evergreens/',origin:'https://callmedaddy.musicsubject.com',pathname:'/concrete-under-evergreens/',search:''};
  const ids=['concretePlayer','concretePlayerCover','concretePlayerLabel','concretePlayerTitle','concretePlayerStatus','concretePlay','concretePrev','concreteNext','concretePlayerShare','concreteProgress','concreteProgressBar'];
  const elements=new Map(ids.map(id=>[id,new FakeElement(id==='concretePlayerCover'?'img':id==='concretePlayerTitle'?'a':id.includes('Play')||id.includes('Prev')||id.includes('Next')||id.includes('Share')||id.includes('Progress')?'button':'div',id)]));
  const audio=new FakeAudio('concreteAudio');
  elements.set('concreteAudio',audio);
  const coverButton=new FakeElement('button');
  coverButton.className='concrete-cover-button';
  const coverPlay=new FakeElement('span');
  coverPlay.className='concrete-cover-play';
  coverButton.querySelector=()=>null;
  const pageImg=new FakeElement('img');
  const triggers=[coverButton];
  const marker=new FakeElement('b');
  const details=new FakeElement('details');
  details.querySelector=selector=>selector==='summary b'?marker:null;
  const timers=[];
  const document={
    body:{classList:new FakeClassList()},
    head:{appendChild(){}},
    createElement:tag=>new FakeElement(tag),
    getElementById:id=>elements.get(id)||null,
    querySelector:selector=>{
      if(selector==='.concrete-cover-button img')return pageImg;
      if(selector==='.concrete-hero-video')return null;
      if(selector==='.concrete-cover-button')return coverButton;
      if(selector==='.concrete-cover-play')return coverPlay;
      if(selector==='.concrete-lyrics details')return details;
      return null;
    },
    querySelectorAll:selector=>selector==='[data-concrete-play]'?triggers:[]
  };
  let creates=0,toggles=0,next=0,previous=0,loads=[];
  let shared=null;
  const liveMedia=live?Object.assign(new FakeAudio('live'),{src:live.audio||LOCAL_AUDIO,ended:false,currentTime:live.currentTime||30,duration:180}):null;
  if(liveMedia)liveMedia.paused=live.paused===true;
  const controls=[];
  const universal={
    getTrack:()=>live?{title:'Concrete Under Evergreens',audio:live.audio||LOCAL_AUDIO,songId:'concrete-under-evergreens',variantId:'main',experience:'/concrete-under-evergreens/'}:null,
    getMedia:()=>liveMedia,
    control:(action,...args)=>{controls.push([action,...args]);if(action==='toggle'&&liveMedia){if(liveMedia.paused)liveMedia.play();else liveMedia.pause()}if(action==='next')next++;if(action==='previous')previous++}
  };
  const windowObj={
    document,location,
    top:null,
    self:null,
    CMD_SONGS:[{id:'concrete-under-evergreens',title:'Concrete Under Evergreens',artist:'Call Me Daddy',audio:LOCAL_AUDIO,cover:'/cover.png',experience:'/concrete-under-evergreens/'}],
    CMDPersistentSite:{setSession(){},refreshClearance(){}},
    CMDPlaylistRadio:{share(data){shared=data;return true}},
    CMDUniversalPlayer:universal,
    CMDContinuousPlayback:{
      create(options){
        creates++;
        const api={
          current:()=>options.tracks[0],
          toggle:()=>{toggles++;audio.paused?audio.play():audio.pause()},
          next:()=>{next++;return true},
          previous:()=>{previous++;return true},
          load:(index,opts)=>{loads.push({index,opts});audio.src=options.tracks[index]?.audio||'';if(opts?.autoplay)audio.play();return true}
        };
        options.onTrack?.(options.tracks[0],{index:0,reason:'ready',radio:false});
        return api;
      }
    },
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},
    setInterval:(fn)=>{timers.push({fn,ms:'interval'});return timers.length},
    clearInterval(){},
    addEventListener(){}
  };
  windowObj.top=windowObj;windowObj.self=windowObj;
  if(asChildFrame){
    const topUniversal={...universal};
    windowObj.top={location:{origin:location.origin},CMDUniversalPlayer:topUniversal};
    windowObj.CMDUniversalPlayer=null;
  }
  const context=vm.createContext({window:windowObj,document,location,navigator:{},URL,URLSearchParams,Math,setTimeout:windowObj.setTimeout,clearInterval:windowObj.clearInterval,addEventListener(){}});
  vm.runInContext(playerSource,context,{filename:'concrete-under-evergreens/player.js'});
  return {elements,audio,coverButton,coverPlay,triggers,getShared:()=>shared,stats:()=>({creates,toggles,next,previous,loads,controls}),liveMedia,flushTimers:()=>{for(const t of [...timers]){if(typeof t.fn==='function'&&t.ms!=='interval')t.fn()}}};
}

test('cold first tap uses one continuous controller and does not invent a second ended queue',()=>{
  const {triggers,stats,elements}=createHarness();
  assert.equal(stats().creates,0,'controller stays lazy until the first gesture');
  triggers[0].click();
  assert.deepEqual(stats(),{creates:1,toggles:1,next:0,previous:0,loads:[],controls:[]});
  elements.get('concreteNext').click();
  elements.get('concretePrev').click();
  assert.equal(stats().creates,1);
  assert.equal(stats().next,1);
  assert.equal(stats().previous,1);
  assert.equal(elements.get('concretePlayerLabel').textContent,'Lacombe civic ballad');
});

test('when continuous already plays this song, cover mirrors Playing and page Play toggles the shared session',()=>{
  const {coverPlay,coverButton,triggers,stats,liveMedia,elements}=createHarness({live:{audio:LOCAL_AUDIO,paused:false,currentTime:42}});
  assert.equal(stats().creates,0,'must not create a competing continuous owner');
  assert.equal(coverPlay.hidden,true);
  assert.equal(coverButton.getAttribute('aria-label'),'Pause Concrete Under Evergreens');
  assert.equal(elements.get('concretePlayerStatus').textContent,'Playing');
  assert.equal(liveMedia.paused,false);

  triggers[0].click();
  assert.equal(stats().creates,0);
  assert.deepEqual(stats().controls,[['toggle']]);
  assert.equal(liveMedia.paused,true,'page Play pauses the shared owner instead of starting local audio');
  assert.equal(elements.get('concreteAudio').paused,true,'local audio stays idle');
});

test('shared-session page Play does not claim a second local audio for the same track',()=>{
  const {triggers,stats,audio,liveMedia}=createHarness({live:{audio:LOCAL_AUDIO,paused:false},asChildFrame:true});
  triggers[0].click();
  assert.equal(stats().creates,0);
  assert.equal(audio.src,'');
  assert.equal(audio.paused,true);
  assert.equal(liveMedia.paused,true);
  assert.deepEqual(stats().controls,[['toggle']]);
});

test('the cinematic clip is ambient hero background, not a standalone evidence player',()=>{
  const html=fs.readFileSync(path.join(root,'concrete-under-evergreens/index.html'),'utf8');
  assert.match(html,/class="concrete-hero-video"[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline/);
  assert.match(html,/background-loop\.mp4/);
  assert.match(html,/continuous-playback\.js/);
  assert.doesNotMatch(html,/<video[^>]*controls/);
  assert.doesNotMatch(html,/Dramatic reconstruction/i);
  assert.doesNotMatch(html,/concrete-video-frame/);
});
