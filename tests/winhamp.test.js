const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const songs=[{id:'first',title:'First song',artist:'MusicSubject',date:'2026-10-18',audio:'/first.mp3',variants:[{id:'main',audio:'/first.mp3',label:'Original'},{id:'remix',audio:'/remix.mp3',label:'Gospel remix',cover:'/remix.jpg'}]},
{id:'second',title:'Second song',audio:'/second.mp3',aliases:['Secret name']},
{id:'optional',title:'Kill You',rotation:'opt-in',artist:'Sqaz',audio:'/explicit.mp3'},
{id:'video',title:'External only',youtubeId:'abc'}];
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.listeners=new Map();this.children=[];this.attributes={};this.dataset={};this.value='';this.hidden=false;this.volume=1;this.classes=new Set();this.classList={contains:v=>this.classes.has(v),add:v=>this.classes.add(v),remove:v=>this.classes.delete(v),toggle:(v,force)=>{const next=force??!this.classes.has(v);next?this.classes.add(v):this.classes.delete(v);return next;}};}
 addEventListener(k,fn){this.listeners.set(k,[...(this.listeners.get(k)||[]),fn]);}
 removeEventListener(k,fn){this.listeners.set(k,(this.listeners.get(k)||[]).filter(v=>v!==fn));}
 emit(k,event={}){for(const fn of [...(this.listeners.get(k)||[])])fn({target:this,type:k,preventDefault(){},...event});}
 append(...children){this.children.push(...children);}
 appendChild(child){this.append(child);return child;}
 replaceChildren(...children){this.children=children.flatMap(c=>c.tagName==='FRAGMENT'?c.children:[c]);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return k==='src'?this.src:this.attributes[k];}
 querySelector(){return this.childSpan ||= new Element('span');}
 getContext(){return null;}
 scrollIntoView(){}
 focus(){this.focused=true;}
 select(){}
 remove(){}
}
class Audio extends Element{
 constructor(){super('audio');this.currentTime=0;this.duration=180;this.paused=true;this.ended=false;this.loadCalls=0;this.playCalls=0;}
 load(){this.loadCalls++;this.currentSrc=this.src;this.currentTime=0;this.paused=true;this.ended=false;}
 play(){this.playCalls++;this.paused=false;this.ended=false;this.emit('play');this.emit('playing');return Promise.resolve();}
 pause(){this.paused=true;this.emit('pause');}
}
function environment({search='',external=false,snapshot=null,reload=false,starmuff=[]}={}){
 const elements=Object.fromEntries([...read('winhamp/index.html').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 elements.volume.value='85';elements.search.tagName='INPUT';
 const document=new Element();document.body=new Element('body');document.head=new Element('head');document.visibilityState='visible';document.getElementById=id=>elements[id];document.createElement=tag=>tag==='audio'?new Audio():new Element(tag);document.createDocumentFragment=()=>new Element('fragment');document.querySelector=()=>null;
 const location={origin:'https://example.test',pathname:'/winhamp/',search,href:`https://example.test/winhamp/${search}`};
 const store=new Map();if(snapshot)store.set('cmd:playback-session:v1',JSON.stringify(snapshot));const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const nativeEvents=new Element();let active=external?{audio:new Audio(),track:{songId:'old',variantId:'main',title:'Already playing',audio:'/old.mp3'}}:null;
 if(active){active.audio.src='/old.mp3';active.audio.paused=false;}
 const owner={getMedia:()=>active?.audio,getTrack:()=>active?.track,control:(action,value)=>{if(!active)return;if(action==='seek')active.audio.currentTime=value;else if(action==='pause')active.controller?.pause?.()??active.audio.pause();else if(action==='toggle')active.controller?.toggle?.()??(active.audio.paused?active.audio.play():active.audio.pause());else if(action==='next')active.controller?.next();else if(action==='previous')active.controller?.previous();}};
 const window={location,document,CMD_SONGS:songs,CMD_STARMUFF_SONGS:starmuff,CMDUniversalPlayer:owner,CMDPersistentSite:{setSession(){},refreshClearance(){},cancelFollow(){}}};window.top=window;window.self=window;
 let frame;const copied=[];
 const context=vm.createContext({window,document,location,navigator:{clipboard:{writeText:async t=>copied.push(t)}},sessionStorage:storage,localStorage:storage,performance:{getEntriesByType:()=>[{type:reload?'reload':'navigate'}]},requestAnimationFrame:fn=>{frame=fn;},addEventListener:nativeEvents.addEventListener.bind(nativeEvents),removeEventListener:nativeEvents.removeEventListener.bind(nativeEvents),URL,URLSearchParams,Date,Math,JSON,Uint8Array,Promise,Number,String,Error});
 vm.runInContext(read('continuous-playback.js'),context);
 window.CMDContinuousPlayback.subscribe(event=>{if(event.state.hasPlayed)active={audio:event.audio,track:event.track,controller:event.controller};});
 vm.runInContext(read('winhamp/model.js'),context);vm.runInContext(read('winhamp/player.js'),context);
 return {elements,window,document,model:window.CMDWinHampModel,active:()=>active,paint:()=>frame(250),copied};
}
test('catalogue retains exact variants, artwork and artist, and omits unplayable external entries',()=>{
 const env=environment(),tracks=env.model.build(songs);
 assert.equal(tracks.length,4);const remix=tracks.find(t=>t.variantId==='remix');
 assert.equal(remix.audio,'/remix.mp3');assert.equal(remix.cover,'/remix.jpg');assert.equal(remix.title,'First song');
 assert.equal(tracks.find(t=>t.songId==='optional').artist,'Sqaz');
 assert.ok(env.model.matches(tracks.find(t=>t.songId==='second'),'secret name'));
 assert.ok(env.model.matches(remix,'gospel'));
});
test('automatic upcoming tracks exclude opt-in recordings; a direct pick does not enable rotation',()=>{
 const env=environment(),tracks=env.model.build(songs);
 assert.equal(env.model.upcoming(tracks,tracks[0],true).some(t=>t.songId==='optional'),false);
 const row=env.elements.trackList.children.find(r=>r.dataset.key==='optional:main');row.emit('click');
 assert.equal(env.active().audio.src,'/explicit.mp3');env.active().controller.next();
 assert.notEqual(env.active().audio.src,'/explicit.mp3');
 assert.equal(env.model.allowed(tracks.find(t=>t.songId==='optional')),false);
});
test('opening a shared remix is silent; the first artwork tap starts that exact audio',()=>{
 const env=environment({search:'?song=first&version=remix'});
 assert.equal(env.active(),null);assert.equal(env.elements.versions.checked,true);
 assert.equal(env.elements.trackTitle.textContent,'First song');env.elements.artwork.emit('click');
 assert.equal(env.active().audio.src,'/remix.mp3');assert.equal(env.active().audio.paused,false);assert.equal(env.active().audio.playCalls,1);
});
test('visiting WinHamp preserves the existing owner and controls its real audio until an explicit pick',()=>{
 const env=environment({external:true});const initial=env.active();env.paint();
 assert.equal(env.elements.trackTitle.textContent,'Already playing');assert.equal(initial.audio.paused,false);assert.equal(initial.audio.loadCalls,0);
 env.elements.play.emit('click');assert.equal(initial.audio.paused,true);
 const row=env.elements.trackList.children.find(r=>r.dataset.key==='second:main');row.emit('click');
 assert.notEqual(env.active().audio,initial.audio);assert.equal(env.active().audio.src,'/second.mp3');assert.equal(initial.audio.paused,true);
});
test('rapid picks keep source and displayed version in sync; ended uses the shared controller',()=>{
 const env=environment();env.elements.versions.checked=true;env.elements.versions.emit('change');
 const pick=key=>env.elements.trackList.children.find(r=>r.dataset.key===key).emit('click');
 pick('first:main');pick('first:remix');pick('second:main');env.paint();
 const active=env.active();assert.equal(active.audio.src,'/second.mp3');assert.equal(env.elements.trackTitle.textContent,'Second song');
 assert.equal(active.audio.listeners.get('ended').length,1);
 active.audio.ended=true;active.audio.emit('ended');env.paint();
 assert.equal(env.elements.trackTitle.textContent,env.active().track.title);assert.equal(active.audio.src,env.active().track.audio);
});
test('shuffle and repeat changes do not reload, restart or replace the current audio',()=>{
 const env=environment();env.elements.play.emit('click');const active=env.active();active.audio.currentTime=43;
 const loads=active.audio.loadCalls;env.elements.shuffle.emit('click');env.elements.repeat.emit('click');
 assert.equal(env.active().audio,active.audio);assert.equal(active.audio.currentTime,43);assert.equal(active.audio.loadCalls,loads);
 active.audio.ended=true;active.audio.emit('ended');assert.equal(env.active().track.songId,'first');
});
test('song sharing preserves the WinHamp route and exact recording without autoplay',async()=>{
 const env=environment({search:'?song=first&version=remix'});env.elements.shareSong.emit('click');await Promise.resolve();
 const url=new URL(env.copied[0]);assert.equal(url.pathname,'/winhamp/');assert.equal(url.searchParams.get('version'),'remix');assert.equal(url.searchParams.has('autoplay'),false);
});
test('discard/reload restoration preserves the saved time without a second load',()=>{
 const snapshot={playerId:'winhamp',track:{id:'first:main',songId:'first',variantId:'main',audio:'/first.mp3'},currentTime:61,wantsPlayback:true,updatedAt:Date.now()};
 const env=environment({snapshot,reload:true});const active=env.active();
 assert.ok(active);assert.equal(active.audio.loadCalls,1);active.audio.emit('loadedmetadata');assert.equal(active.audio.currentTime,61);assert.equal(active.audio.playCalls,1);
});

const starSongs=[{id:'starmuff-one',title:'Casino StarMuff 2',artist:'MusicSubject',project:'StarMuff',playlist:'starmuff',audio:'/media/starmuff/one.mp3'},
{id:'starmuff-two',title:'Space Exploration',artist:'MusicSubject',project:'StarMuff',playlist:'starmuff',audio:'/media/starmuff/two.mp3'}];
test('StarMuff playlist links open the game library silently and Play starts its first recording',()=>{
 const env=environment({search:'?playlist=starmuff',starmuff:starSongs});
 assert.equal(env.active(),null);assert.equal(env.elements.trackList.children.length,2);
 assert.equal(env.elements.playlistStarMuff.getAttribute('aria-pressed'),'true');
 env.elements.play.emit('click');assert.equal(env.active().audio.src,'/media/starmuff/one.mp3');
 env.active().controller.next();assert.equal(env.active().audio.src,'/media/starmuff/two.mp3');
 env.active().controller.next();assert.equal(env.active().audio.src,'/media/starmuff/one.mp3','repeat stays inside the chosen StarMuff playlist');
});
test('browsing another library preserves playback; selecting its track starts the right queue',()=>{
 const env=environment({starmuff:starSongs});env.elements.play.emit('click');
 const original=env.active().audio;env.elements.playlistStarMuff.emit('click');
 assert.equal(original.paused,false);assert.equal(env.active().track.songId,'first');assert.equal(env.elements.trackList.children.length,2);
 env.elements.trackList.children[1].emit('click');env.paint();
 assert.equal(env.active().audio.src,'/media/starmuff/two.mp3');assert.equal(env.elements.trackTitle.textContent,'Space Exploration');
 env.elements.shuffle.emit('click');env.active().controller.next();assert.ok(env.active().track.songId.startsWith('starmuff-'));
});
test('Call Me Daddy and All music keep explicit library boundaries',()=>{
 const env=environment({starmuff:starSongs});env.elements.play.emit('click');
 assert.equal(env.active().controller.getQueue().some(t=>t.songId.startsWith('starmuff-')),false);
 env.elements.playlistAll.emit('click');assert.equal(env.elements.trackList.children.length,5);
 env.elements.trackList.children.find(r=>r.dataset.key==='starmuff-one:main').emit('click');
 assert.ok(env.active().controller.getQueue().some(t=>t.songId==='first'));
 assert.equal(env.active().controller.getQueue().some(t=>t.songId==='optional'),false);
});
test('StarMuff player and recording shares retain the selected library and exact song',async()=>{
 const env=environment({search:'?playlist=starmuff&song=starmuff-two&version=main',starmuff:starSongs});
 assert.equal(env.elements.trackTitle.textContent,'Space Exploration');
 env.elements.shareSong.emit('click');await Promise.resolve();
 let url=new URL(env.copied[0]);assert.equal(url.searchParams.get('playlist'),'starmuff');assert.equal(url.searchParams.get('song'),'starmuff-two');
 env.elements.sharePlayer.emit('click');await Promise.resolve();
 url=new URL(env.copied[1]);assert.equal(url.searchParams.get('playlist'),'starmuff');assert.equal(url.searchParams.has('song'),false);
});
