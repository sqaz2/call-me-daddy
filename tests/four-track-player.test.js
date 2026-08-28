const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const radioFiles=['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','catalog-cycle.js'];

class FakeClassList{
  constructor(){this.values=new Set();}
  toggle(name,force){if(force===undefined)force=!this.values.has(name);if(force)this.values.add(name);else this.values.delete(name);return force;}
  add(name){this.values.add(name);}
  contains(name){return this.values.has(name);}
}

class FakeElement{
  constructor(tag='div',id=''){
    this.tagName=tag.toUpperCase();this.id=id;this.hidden=false;this.dataset={};this.attributes={};this.listeners=new Map();this.classList=new FakeClassList();this.style={setProperty(name,value){this[name]=value;}};this.textContent='';this.innerHTML='';this.src='';this.href='';this.alt='';
  }
  addEventListener(type,listener){const listeners=this.listeners.get(type)||[];listeners.push(listener);this.listeners.set(type,listeners);}
  dispatch(type,init={}){const event={target:this,currentTarget:this,clientX:50,preventDefault(){},...init};for(const listener of this.listeners.get(type)||[])listener(event);}
  click(){this.dispatch('click');}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(name){delete this.attributes[name];if(name==='src')this.src='';}
  appendChild(child){return child;}
  closest(){return this.card||null;}
  getBoundingClientRect(){return {left:0,width:100};}
}

class FakeAudio extends FakeElement{
  constructor(id,location){super('audio',id);this.location=location;this._src='';this.paused=true;this.ended=false;this.duration=180;this.currentTime=0;}
  set src(value){this._src=value?new URL(value,this.location.href).href:'';}
  get src(){return this._src;}
  get currentSrc(){return this._src;}
  load(){this.ended=false;this.currentTime=0;}
  play(){this.paused=false;this.ended=false;this.dispatch('play');this.dispatch('playing');return Promise.resolve();}
  pause(){if(this.paused)return;this.paused=true;this.dispatch('pause');}
  finish(){this.currentTime=this.duration;this.paused=true;this.ended=true;this.dispatch('ended');}
}

function createHarness(){
  const location={href:'https://callmedaddy.musicsubject.com/anti-generative-ai-diss/',origin:'https://callmedaddy.musicsubject.com',search:''};
  const elements=new Map();
  const controls=['sticks','police','level','diss'].map(key=>{const control=new FakeElement('button');control.dataset.trilogyTrack=key;control.card=new FakeElement('article');return control;});
  const documentListeners=new Map();
  const document={
    head:new FakeElement('head'),
    body:new FakeElement('body'),
    createElement(tag){return new FakeElement(tag);},
    getElementById(id){return elements.get(id)||null;},
    querySelector(){return null;},
    querySelectorAll(selector){return selector==='[data-trilogy-track]'?controls:[];},
    addEventListener(type,listener){const listeners=documentListeners.get(type)||[];listeners.push(listener);documentListeners.set(type,listeners);},
    dispatchEvent(event){for(const listener of documentListeners.get(event.type)||[])listener(event);}
  };
  document.body.appendChild=element=>{
    if(element.id)elements.set(element.id,element);
    if(element.id==='trilogyPlayer'){
      ['trilogyTactile','trilogyNowCover','trilogyYoutube','trilogyNowLabel','trilogyNowTitle','trilogyStatus','trilogyPrev','trilogyPlay','trilogyNext','trilogyShare','trilogyTimeline','trilogyProgress'].forEach(id=>elements.set(id,new FakeElement(id.includes('Prev')||id.includes('Play')||id.includes('Next')||id.includes('Share')||id.includes('Timeline')?'button':'div',id)));
      elements.set('trilogyAudio',new FakeAudio('trilogyAudio',location));
    }
    return element;
  };
  const storage=new Map();
  const window={document,location,CMDPersistentSite:{setSession(){},refreshClearance(){}},CMDTactileScrubber:{create(){return {}; }},setInterval(){return 1;},setTimeout};
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const context=vm.createContext({window,document,location,localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))},crypto:{getRandomValues:values=>{values[0]=123456789;values[1]=987654321;return values;}},URL,URLSearchParams,Date,Math,Uint32Array,CustomEvent,setTimeout});
  radioFiles.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file}));
  vm.runInContext(fs.readFileSync(path.join(root,'new-tools-trilogy.js'),'utf8'),context,{filename:'new-tools-trilogy.js'});
  return {controls,elements,audio:elements.get('trilogyAudio')};
}

test('ending track four hands the same audio element into Play the site',()=>{
  const {controls,elements,audio}=createHarness();
  controls.find(control=>control.dataset.trilogyTrack==='diss').click();
  assert.match(audio.src,/anti-generative-ai-diss\/audio\.mp3$/);
  audio.finish();
  const firstRadioLabel=elements.get('trilogyNowLabel').textContent;
  assert.match(firstRadioLabel,/^Play the site · cycle 1 · 1\//);
  assert.equal(elements.get('trilogyStatus').textContent,'Playing · Play the site');
  assert.ok(!['Back to Sticks (Soothing Mix)','The Musician Police','Level Up (Primal Dubstep Mix)','Anti Generative AI Diss'].includes(elements.get('trilogyNowTitle').textContent));
  assert.equal(audio.paused,false);

  const firstCycleLength=Number(firstRadioLabel.match(/\/(\d+)$/)?.[1]);
  assert.ok(firstCycleLength>2);
  const firstRadioSource=audio.src;
  audio.finish();
  assert.match(elements.get('trilogyNowLabel').textContent,/^Play the site · cycle 1 · 2\//);
  assert.notEqual(audio.src,firstRadioSource);
  elements.get('trilogyTimeline').dispatch('click',{clientX:50});
  assert.equal(audio.currentTime,90);
  for(let position=2;position<=firstCycleLength;position+=1)audio.finish();
  assert.match(elements.get('trilogyNowLabel').textContent,/^Play the site · cycle 2 · 1\//);
  assert.equal(audio.paused,false);
});

test('next from track four starts radio without waiting for the song to end',()=>{
  const {controls,elements,audio}=createHarness();
  controls.find(control=>control.dataset.trilogyTrack==='diss').click();
  elements.get('trilogyNext').click();
  assert.match(elements.get('trilogyNowLabel').textContent,/^Play the site · cycle 1 · 1\//);
  assert.equal(audio.paused,false);
});
