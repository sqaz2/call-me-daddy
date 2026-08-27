const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const radioFiles=['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','catalog-cycle.js','playlist-radio.js'];

class FakeClassList{
  constructor(){this.values=new Set();}
  add(name){this.values.add(name);}
  contains(name){return this.values.has(name);}
}

class FakeElement{
  constructor(tag='div',id=''){
    this.tagName=tag.toUpperCase();this.id=id;this.hidden=false;this.listeners=new Map();this.style={};this.textContent='';this.src='';this.href='';
  }
  addEventListener(type,listener){const listeners=this.listeners.get(type)||[];listeners.push(listener);this.listeners.set(type,listeners);}
  dispatch(type,init={}){const event={target:this,currentTarget:this,clientX:50,...init};for(const listener of this.listeners.get(type)||[])listener(event);}
  click(){this.dispatch('click');}
  getBoundingClientRect(){return {left:0,width:100};}
}

class FakeAudio extends FakeElement{
  constructor(id,location){super('audio',id);this.location=location;this._src='';this.paused=true;this.ended=false;this.duration=180;this.currentTime=0;}
  set src(value){this._src=value?new URL(value,this.location.href).href:'';}
  get src(){return this._src;}
  load(){this.ended=false;this.currentTime=0;}
  play(){this.paused=false;this.ended=false;this.dispatch('play');return Promise.resolve();}
  pause(){if(this.paused)return;this.paused=true;this.dispatch('pause');}
  finish(){this.currentTime=this.duration;this.paused=true;this.ended=true;this.dispatch('ended');}
}

class FakeVideo extends FakeElement{
  constructor(id){super('video',id);this.paused=true;}
  pause(){this.paused=true;}
}

function createHarness(){
  const location={href:'https://callmedaddy.musicsubject.com/concrete-under-evergreens/',origin:'https://callmedaddy.musicsubject.com',search:''};
  const ids=['concretePlayer','concretePlayerCover','concretePlayerLabel','concretePlayerTitle','concretePlayerStatus','concretePlay','concretePrev','concreteNext','concretePlayerShare','concreteProgress','concreteProgressBar'];
  const elements=new Map(ids.map(id=>[id,new FakeElement(id==='concretePlayerCover'?'img':id==='concretePlayerTitle'?'a':id.includes('Play')||id.includes('Prev')||id.includes('Next')||id.includes('Share')||id.includes('Progress')?'button':'div',id)]));
  elements.set('concreteAudio',new FakeAudio('concreteAudio',location));
  elements.set('concreteVideo',new FakeVideo('concreteVideo'));
  const triggers=[new FakeElement('button'),new FakeElement('button'),new FakeElement('button')];
  const marker=new FakeElement('b');
  const details=new FakeElement('details');
  details.querySelector=selector=>selector==='summary b'?marker:null;
  const document={
    body:{classList:new FakeClassList()},
    getElementById:id=>elements.get(id)||null,
    querySelector:selector=>selector==='.concrete-lyrics details'?details:null,
    querySelectorAll:selector=>selector==='[data-concrete-play]'?triggers:[]
  };
  const storage=new Map();
  let shared=null;
  const window={document,location,CMDPersistentSite:{setSession(){},refreshClearance(){}},CMDShare:{nativeShare(data){shared=data;return true;}},setTimeout};
  const context=vm.createContext({window,document,location,navigator:{},localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))},crypto:{getRandomValues:values=>{values[0]=123456789;values[1]=987654321;return values;}},URL,URLSearchParams,Date,Math,Uint32Array,setTimeout});
  radioFiles.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file}));
  vm.runInContext(fs.readFileSync(path.join(root,'concrete-under-evergreens/player.js'),'utf8'),context,{filename:'concrete-under-evergreens/player.js'});
  return {elements,triggers,audio:elements.get('concreteAudio'),getShared:()=>shared};
}

test('the release starts locally, shares exactly, then continues into Play the site',()=>{
  const {elements,triggers,audio,getShared}=createHarness();
  triggers[0].click();
  assert.match(audio.src,/concrete-under-evergreens\/audio\.mp3$/);
  assert.equal(elements.get('concretePlayerLabel').textContent,'Lacombe civic ballad');
  assert.equal(audio.paused,false);
  elements.get('concretePlayerShare').click();
  assert.match(getShared().url,/song=concrete-under-evergreens/);
  assert.match(getShared().url,/version=main/);

  audio.finish();
  assert.equal(elements.get('concretePlayerLabel').textContent.startsWith('Play the site'),true);
  assert.doesNotMatch(audio.src,/concrete-under-evergreens\/audio\.mp3$/);
  assert.notEqual(elements.get('concretePlayerTitle').textContent,'Concrete Under Evergreens');
  assert.equal(audio.paused,false);
});

test('Next hands the single into endless radio without waiting for the ending',()=>{
  const {elements,triggers,audio}=createHarness();
  triggers[0].click();
  elements.get('concreteNext').click();
  assert.equal(elements.get('concretePlayerLabel').textContent.startsWith('Play the site'),true);
  assert.doesNotMatch(audio.src,/concrete-under-evergreens\/audio\.mp3$/);
  assert.equal(audio.paused,false);
});
