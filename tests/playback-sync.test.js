const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../universal-player.js'),'utf8');
class Target{
  constructor(){this.listeners=new Map()}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list)}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn))}
  emit(type,extra={}){for(const fn of [...(this.listeners.get(type)||[])])fn({type,target:this,currentTarget:this,preventDefault(){},...extra})}
}
class Element extends Target{
  constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.className='';this.hidden=false;this.style={setProperty(k,v){this[k]=v}};this.dataset={};this.textContent='';this.classList={add:(...a)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...a])].join(' ')},remove:(...a)=>{this.className=this.className.split(/\s+/).filter(v=>v&&!a.includes(v)).join(' ')},contains:v=>this.className.split(/\s+/).includes(v)}}
  append(...a){a.forEach(e=>this.appendChild(e))}
  appendChild(e){e.parentNode=this;this.children.push(e);return e}
  insertBefore(e,before){e.parentNode=this;const i=this.children.indexOf(before);if(i<0)this.children.push(e);else this.children.splice(i,0,e);return e}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(e=>e!==this)}
  setAttribute(k,v){this.attributes.set(k,String(v))}
  getAttribute(k){return this.attributes.get(k)||null}
  getBoundingClientRect(){return {left:0,width:100,top:0,bottom:5,height:5}}
  querySelector(s){return this.querySelectorAll(s)[0]||null}
  querySelectorAll(selector){
    const parts=selector.trim().split(/\s+/),desc=e=>e.children.flatMap(c=>[c,...desc(c)]);
    const matches=(e,p)=>p.startsWith('.')?e.className.split(/\s+/).includes(p.slice(1)):e.tagName.toLowerCase()===p.toLowerCase();
    if(parts.length===1)return desc(this).filter(e=>matches(e,parts[0]));
    return desc(this).filter(e=>matches(e,parts[0])).flatMap(e=>desc(e).filter(c=>matches(c,parts.at(-1))));
  }
  set innerHTML(value){
    this.children=[];const node=(tag,cls)=>{const e=new Element(tag);e.className=cls;return e};
    if(value.includes('cmd-site-session-pill')){const pill=node('div','cmd-site-session-pill');pill.append(node('button',''));this.append(pill);return}
    if(!value.includes('cmd-universal-shell'))return;
    const shell=node('div','cmd-universal-shell'),art=node('button','cmd-universal-art'),copy=node('div','cmd-universal-copy'),controls=node('div','cmd-universal-controls'),progress=node('div','cmd-universal-progress'),times=node('div','cmd-universal-times');
    art.append(node('img',''),node('span',''));copy.append(node('small','cmd-universal-context'),node('button','cmd-universal-title'),node('span','cmd-universal-detail'),node('a','cmd-universal-story'));
    controls.append(...['prev','toggle','next','share'].map(n=>node('button',`cmd-universal-${n}`)));progress.append(node('span',''));times.append(node('span','cmd-universal-current'),node('span','cmd-universal-duration'));shell.append(art,copy,controls,progress,times,node('span','cmd-universal-live'));this.append(shell);
  }
}
class Media extends Target{
  constructor(src='/superstore.mp3'){super();this.src=src;this.currentSrc=src;this.currentTime=30;this.duration=120;this.paused=true;this.ended=false;this.dataset={};this.loads=0;this.pauses=0;this.plays=0}
  getAttribute(name){return name==='src'?this.src:null}
  play(){this.plays++;this.paused=false;this.emit('play');this.emit('playing');return Promise.resolve()}
  pause(){this.pauses++;this.paused=true;this.emit('pause')}
  load(){this.loads++;this.currentSrc=this.src;this.emit('loadstart')}
}
const songs=[{id:'superstore',title:'Superstore Effect',audio:'/superstore.mp3',cover:'/superstore.jpg',experience:'/superstore/'},{id:'armando',title:'Armando',audio:'/armando.mp3',cover:'/armando.jpg',experience:'/armando/'},{id:'unfinished',title:'Unfinished',audio:'/unfinished.mp3',cover:'/unfinished.jpg'}];
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
function environment(extra={}){
  const document=new Target();document.title='Superstore Effect';document.referrer='';document.head=new Element('head');document.body=new Element('body');document.documentElement=new Element('html');document.visibilityState='visible';
  document.createElement=tag=>new Element(tag);document.getElementById=id=>[...document.head.children,...document.body.children].find(n=>n.id===id)||null;document.querySelector=s=>document.body.querySelector(s);document.querySelectorAll=s=>s==='iframe'?document.body.querySelectorAll(s):[];
  const navigations=[],claims=[],opened=[],actions={};
  const location={href:'https://example.test/superstore/',origin:'https://example.test',pathname:'/superstore/',search:'',assign:u=>opened.push(u)};
  const window={location,document,CMD_SONGS:songs,CMDPersistentSite:{open:u=>navigations.push(u),refreshClearance(){},claimPlayback:w=>claims.push(w)},open:(...args)=>opened.push(args)};window.self=window;window.top=window;
  const navigator={mediaSession:{setActionHandler:(a,f)=>actions[a]=f,setPositionState(){}},clipboard:{writeText(){}}};
  const context=vm.createContext({window,document,location,navigator,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,MediaMetadata:class{constructor(v){Object.assign(this,v)}},...extra});
  vm.runInContext(source,context);return {window,document,location,navigator,context,navigations,claims,opened,actions,api:window.CMDUniversalPlayer,root:()=>document.body.querySelector('.cmd-universal-player')};
}
const response=(ok=true,html='<html><title>Song</title></html>',url='')=>({ok,url,headers:{get:()=> 'text/html'},text:async()=>html});

test('legacy source change updates title, artwork, story, share and Media Session',async()=>{
  const env=environment({fetch:async()=>response()}),audio=new Media();
  env.api.connect({id:'legacy',media:audio,track:songs[0]});audio.play();await flush();
  audio.src='/armando.mp3'; // currentSrc may still describe the old resource during load.
  audio.emit('play');audio.currentSrc=audio.src;audio.emit('timeupdate');await flush();
  assert.equal(env.root().querySelector('.cmd-universal-title').textContent,'Armando');
  assert.equal(env.root().querySelector('img').src,'/armando.jpg');
  assert.equal(env.root().querySelector('.cmd-universal-story').href,'/armando/');
  assert.equal(env.navigator.mediaSession.metadata.title,'Armando');
  assert.deepEqual(env.navigations,['/armando/']);
});
test('idle setup from a second player does not replace the active song',()=>{
  const env=environment(),a=new Media(),b=new Media('/armando.mp3');
  env.api.connect({id:'a',media:a,track:songs[0]});a.play();
  env.api.connect({id:'b',media:b,track:songs[1]}).update({show:false});
  assert.equal(env.api.getActive().id,'a');assert.equal(env.api.getTrack().title,'Superstore Effect');
});
test('a missing story gets an exact fallback page without stopping or reloading audio',async()=>{
  const env=environment(),audio=new Media('/unfinished.mp3');env.api.connect({id:'u',media:audio,track:songs[2]});audio.play();await flush();
  assert.deepEqual(env.navigations,['/now-playing/?song=unfinished&version=main']);assert.equal(audio.pauses,0);assert.equal(audio.loads,0);assert.equal(audio.plays,1);
});
test('404, redirects, and external story URLs fall back to this exact recording',async()=>{
  const env=environment({fetch:async()=>response(false)});
  assert.equal(await env.api.resolveRoute(songs[1]),'/now-playing/?song=armando&version=main');
  assert.equal(await env.api.resolveRoute({...songs[1],experience:'https://elsewhere.test/story'}),'/now-playing/?song=armando&version=main');
  const redirected=environment({fetch:async()=>response(true,'','https://example.test/')});
  assert.equal(await redirected.api.resolveRoute(songs[1]),'/now-playing/?song=armando&version=main');
});
test('soft-404 HTML cannot masquerade as a published story',async()=>{
  const env=environment({fetch:async()=>response(),DOMParser:class{parseFromString(){return{title:'Home',querySelector:s=>s.startsWith('link')?{getAttribute:()=>'/'}:null}}}});
  assert.equal(await env.api.resolveRoute(songs[1]),'/now-playing/?song=armando&version=main');
});
test('a slow previous navigation cannot override the newest song',async()=>{
  let resolve;const env=environment({fetch:()=>new Promise(r=>resolve=r)}),audio=new Media('/armando.mp3');
  const h=env.api.connect({id:'race',media:audio,track:songs[1]});audio.play();
  audio.src='/unfinished.mp3';h.update({track:songs[2]});audio.emit('playing');await flush();
  resolve(response());await flush();assert.deepEqual(env.navigations,['/now-playing/?song=unfinished&version=main']);
});
test('browsing during the same song does not repeatedly snap back',async()=>{
  const env=environment(),audio=new Media('/unfinished.mp3');env.api.connect({id:'u',media:audio,track:songs[2]});audio.play();await flush();
  env.location.pathname='/music/';for(let i=0;i<5;i++)audio.emit('timeupdate');await flush();assert.equal(env.navigations.length,1);
});
test('pause or failed playback prevents pending navigation',async()=>{
  let resolve;const env=environment({fetch:()=>new Promise(r=>resolve=r)}),audio=new Media('/armando.mp3');env.api.connect({id:'pause',media:audio,track:songs[1]});audio.play();audio.pause();resolve(response());await flush();assert.deepEqual(env.navigations,[]);
});
test('variant identity is included in fallback routes',()=>{
  const env=environment();assert.equal(env.api.fallbackRoute({id:'armando:remix',songId:'armando',variantId:'remix'}),'/now-playing/?song=armando&version=remix');
});
test('native detection does not compete with a managed continuous controller',()=>{
  const env=environment(),audio=new Media();audio.__cmdContinuousPlaybackController={};env.document.emit('play',{target:audio});assert.equal(env.api.getActive(),null);
});
test('replaced native listeners do not steal next/previous from the core',()=>{
  const env=environment(),audio=new Media();let next=0,previous=0;
  env.api.connect({id:'native',media:audio,track:songs[0]});
  env.api.connect({id:'core',media:audio,track:songs[0],next:()=>next++,previous:()=>previous++});audio.play();
  env.root().querySelector('.cmd-universal-next').emit('click');env.root().querySelector('.cmd-universal-prev').emit('click');
  assert.equal(env.api.getActive().id,'core');assert.deepEqual({next,previous},{next:1,previous:1});
});
test('destroy removes handlers and late updates cannot resurrect an adapter',()=>{
  const env=environment(),audio=new Media();const h=env.api.connect({id:'destroy',media:audio,track:songs[0]});audio.play();h.destroy();h.update({show:true});audio.emit('playing');assert.equal(env.api.getActive(),null);
});
test('uncatalogued replacement audio never shows the old title or cover',()=>{
  const env=environment(),audio=new Media();env.api.connect({id:'unknown',media:audio,track:songs[0]});audio.play();audio.src='/other.mp3';audio.emit('timeupdate');assert.equal(env.api.getTrack().title,'Uncatalogued recording');assert.notEqual(env.api.getTrack().cover,songs[0].cover);assert.equal(env.api.getTrack().experience,undefined);
});
test('the five-second Up next countdown remains in the shared core adapter',()=>{
  const env=environment(),audio=new Media();audio.paused=false;let observer;
  const controller={current:()=>songs[0],getState:()=>({index:0}),play(){},pause(){},toggle(){},next(){},previous(){}};
  env.api.observeContinuous({subscribe:fn=>{observer=fn;return()=>{}}});
  observer({type:'time',id:'queue',controller,audio,track:songs[0],options:{tracks:[songs[0]]},state:{hasPlayed:true,secondsRemaining:4.1,nextTrack:songs[1]}});
  assert.equal(env.root().querySelector('.cmd-universal-detail').textContent,'Up next in 5 · Armando');
});
test('a known owner iframe uses the top dock and its own real controls',()=>{
  const top=environment(),child=environment(),audio=new Media('/armando.mp3');
  child.window.top=top.window;const frame=new Element('iframe');frame.contentWindow=child.window;top.document.body.append(frame);
  let next=0;child.api.connect({id:'child',media:audio,track:songs[1],next:()=>next++});audio.play();
  assert.equal(top.api.getTrack().title,'Armando');assert.equal(child.root().hidden,true);top.root().querySelector('.cmd-universal-next').emit('click');assert.equal(next,1);assert.ok(top.claims.includes(child.window));
});
test('an unrelated or cross-origin window cannot adopt the site dock',()=>{
  const env=environment();assert.equal(env.api.adopt({}, {location:{origin:'https://malicious.test'}}),false);assert.equal(env.api.adopt({}, {location:{origin:env.location.origin}}),false);
});
test('Superstore delegates first tap, next and previous to exactly one shared controller',()=>{
  const env=environment();const ids={};for(const id of ['ssPlayer','ssAudio','ssPlayerStatus','ssPlayerCover','ssPlayerTitle','ssPlayerLabel','ssPlay','ssPrev','ssNext','ssPlayerShare','ssProgress','ssProgressBar'])ids[id]=id==='ssAudio'?new Media():new Element();
  env.document.getElementById=id=>ids[id];const button=new Element('button');env.document.querySelector=()=>null;env.document.querySelectorAll=s=>s==='[data-ss-play]'?[button]:[];
  let creates=0,toggles=0,next=0,previous=0;env.window.CMDContinuousPlayback={create:options=>{creates++;assert.equal(options.replacePlayer,ids.ssPlayer);return {current:()=>options.tracks[0],toggle:()=>toggles++,next:()=>next++,previous:()=>previous++}}};
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../superstore-effect/player.js'),'utf8'),env.context);
  button.emit('click');ids.ssNext.emit('click');ids.ssPrev.emit('click');assert.deepEqual({creates,toggles,next,previous},{creates:1,toggles:1,next:1,previous:1});assert.equal(ids.ssAudio.listeners.has('ended'),false);
});
test('fallback page attaches to current playback without starting a second audio owner',()=>{
  const env=environment(),audio=new Media('/unfinished.mp3');env.api.connect({id:'real',media:audio,track:songs[2]});audio.play();
  env.location.search='?song=unfinished&version=main';const ids={};for(const id of ['npTitle','npArtist','npCover','npArt','npPlay','npStatus','npAudio'])ids[id]=new Element();env.document.getElementById=id=>ids[id];env.document.querySelector=()=>null;
  let creates=0;env.window.CMDContinuousPlayback={create:()=>{creates++;throw Error('should not create')}};
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../now-playing/player.js'),'utf8'),env.context);
  assert.equal(ids.npTitle.textContent,'Unfinished');assert.equal(creates,0);ids.npArt.emit('click');assert.equal(audio.paused,true);assert.equal(creates,0);
});
test('protected collection adapters can opt out of automatic page following',async()=>{
  const env=environment(),audio=new Media('/unfinished.mp3');env.api.connect({id:'collection',media:audio,track:songs[2],followPages:false});audio.play();await flush();assert.deepEqual(env.navigations,[]);
});
function persistentEnvironment(){
  const env=environment(),globalEvents=new Target(),rootAudio=new Media();
  env.document.querySelectorAll=s=>s==='audio,video'?[rootAudio]:s==='iframe'?env.document.body.querySelectorAll('iframe'):[];
  const makeElement=env.document.createElement;
  env.document.createElement=tag=>{
    const element=makeElement(tag);
    if(tag==='iframe'){
      const audio=new Media('/armando.mp3'),doc=new Target();doc.body=new Element('body');doc.querySelectorAll=s=>s==='audio,video'?[audio]:[];doc.dispatchEvent=()=>{};
      element.contentDocument=doc;element.contentWindow={location:{origin:env.location.origin,href:env.location.origin+'/child/'},document:doc,postMessage(){},audio};
    }
    return element;
  };
  env.document.dispatchEvent=()=>{};
  Object.assign(env.context,{HTMLAudioElement:Media,HTMLVideoElement:class{},sessionStorage:{getItem:()=>null},history:{pushState(){},replaceState(){}},CustomEvent:class{constructor(type){this.type=type}},requestAnimationFrame:()=>1,MutationObserver:class{observe(){}disconnect(){}},addEventListener:globalEvents.addEventListener.bind(globalEvents)});
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../persistent-site-browser.js'),'utf8'),env.context);
  return {...env,site:env.window.CMDPersistentSite,rootAudio};
}
test('persistent navigation retains an owner iframe when another song page opens',()=>{
  const env=persistentEnvironment();env.site.setSession(true);env.site.open('/first/');
  const first=env.document.body.querySelector('iframe');first.contentWindow.audio.paused=false;env.site.claimPlayback(first.contentWindow);env.site.open('/second/');
  const frames=env.document.body.querySelectorAll('iframe');assert.equal(frames.length,2);assert.equal(first.src,'https://example.test/first/');assert.equal(first.contentWindow.audio.paused,false);assert.equal(frames[1].src,'https://example.test/second/');
});
test('claiming a new known frame pauses the old owner; arbitrary frames cannot claim',()=>{
  const env=persistentEnvironment();env.site.setSession(true);env.site.open('/first/');const first=env.document.body.querySelector('iframe');first.contentWindow.audio.paused=false;env.site.claimPlayback(first.contentWindow);
  env.site.claimPlayback({location:{origin:env.location.origin}});assert.equal(first.contentWindow.audio.paused,false);
  env.site.open('/second/');const second=env.document.body.querySelectorAll('iframe')[1];env.site.claimPlayback(second.contentWindow);assert.equal(first.contentWindow.audio.paused,true);assert.equal(env.document.body.querySelectorAll('iframe').length,1);
});
test('navigation called inside the owner frame is delegated without changing its location',()=>{
  const top=environment(),child=environment(),events=new Target();child.window.top=top.window;child.window.parent=top.window;top.window.postMessage=()=>{};
  Object.assign(child.context,{HTMLAudioElement:Media,HTMLVideoElement:class{},CustomEvent:class{},addEventListener:events.addEventListener.bind(events)});
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../persistent-site-browser.js'),'utf8'),child.context);
  const before=child.location.href;child.window.CMDPersistentSite.open('/next-song/');assert.equal(child.location.href,before);assert.deepEqual(top.navigations,['/next-song/']);
});

test('Concrete page Play delegates to the live shared session instead of claiming a second audio',()=>{
  const env=environment();
  const live=new Media('/media/songs/2026/08/concrete-under-evergreens/audio.mp3');
  live.paused=false;
  env.api.connect({id:'owner',media:live,track:{id:'concrete-under-evergreens',songId:'concrete-under-evergreens',title:'Concrete Under Evergreens',audio:live.src,cover:'/c.png',experience:'/concrete-under-evergreens/'}});
  live.emit('play');
  const ids={};for(const id of ['concretePlayer','concreteAudio','concretePlayerStatus','concretePlayerCover','concretePlayerTitle','concretePlayerLabel','concretePlay','concretePrev','concreteNext','concretePlayerShare','concreteProgress','concreteProgressBar'])ids[id]=id==='concreteAudio'?new Media():new Element();
  env.document.getElementById=id=>ids[id];
  const button=new Element('button');const coverPlay=new Element('span');coverPlay.className='concrete-cover-play';
  env.document.querySelector=s=>s==='.concrete-cover-play'?coverPlay:s==='.concrete-cover-button'?button:null;
  env.document.querySelectorAll=s=>s==='[data-concrete-play]'?[button]:[];
  let creates=0;env.window.CMDContinuousPlayback={create:()=>{creates++;throw Error('must not create while shared owns this song')}};
  env.location.href='https://example.test/concrete-under-evergreens/';env.location.pathname='/concrete-under-evergreens/';
  env.window.setInterval=(fn)=>1;env.window.addEventListener=()=>{};env.context.setInterval=env.window.setInterval;env.context.clearInterval=()=>{};env.window.clearInterval=()=>{};env.context.addEventListener=()=>{};
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../concrete-under-evergreens/player.js'),'utf8'),env.context);
  assert.equal(creates,0);assert.equal(coverPlay.hidden,true);
  button.emit('click');
  assert.equal(creates,0);assert.equal(live.paused,true);assert.equal(ids.concreteAudio.paused,true);assert.equal(ids.concreteAudio.plays,0);
});
test('Superstore attaches to a live shared session without creating a competing controller',()=>{
  const env=environment();
  const live=new Media('/media/songs/2026/09/superstore-effect/audio.mp3');
  live.paused=false;
  env.api.connect({id:'owner',media:live,track:{id:'superstore-effect',songId:'superstore-effect',title:'the superstore effect',audio:live.src,cover:'/s.jpg',experience:'/superstore-effect/'}});
  live.emit('play');
  const ids={};for(const id of ['ssPlayer','ssAudio','ssPlayerStatus','ssPlayerCover','ssPlayerTitle','ssPlayerLabel','ssPlay','ssPrev','ssNext','ssPlayerShare','ssProgress','ssProgressBar'])ids[id]=id==='ssAudio'?new Media():new Element();
  env.document.getElementById=id=>ids[id];const button=new Element('button');const coverPlay=new Element('span');
  env.document.querySelector=s=>s==='.ss-cover-play'?coverPlay:s==='.ss-cover-button'?button:null;
  env.document.querySelectorAll=s=>s==='[data-ss-play]'?[button]:[];
  let creates=0;env.window.CMDContinuousPlayback={create:()=>{creates++;throw Error('must not create while shared owns this song')}};
  env.location.href='https://example.test/superstore-effect/';env.location.pathname='/superstore-effect/';
  env.window.setInterval=(fn)=>1;env.window.addEventListener=()=>{};env.context.setInterval=env.window.setInterval;env.context.clearInterval=()=>{};env.window.clearInterval=()=>{};env.context.addEventListener=()=>{};
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../superstore-effect/player.js'),'utf8'),env.context);
  assert.equal(creates,0);assert.equal(coverPlay.hidden,true);
  button.emit('click');assert.equal(creates,0);assert.equal(live.paused,true);assert.equal(ids.ssAudio.plays,0);
});
