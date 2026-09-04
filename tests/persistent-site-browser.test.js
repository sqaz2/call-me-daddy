const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../persistent-site-browser.js'),'utf8');

class FakeTarget{
  constructor(){this.listeners=new Map()}
  addEventListener(type,handler){const handlers=this.listeners.get(type)||[];handlers.push(handler);this.listeners.set(type,handlers)}
  emit(type,event={}){for(const handler of this.listeners.get(type)||[])handler({type,target:this,...event})}
}

class FakeElement extends FakeTarget{
  constructor(tagName='div'){
    super();
    this.tagName=tagName.toUpperCase();
    this.children=[];
    this.style={setProperty(name,value){this[name]=value}};
    this.attributes=new Map();
    this.parentNode=null;
    this.className='';
    this.id='';
    this.textContent='';
    this.hidden=false;
    this.classList={
      add:(...names)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));names.forEach(name=>set.add(name));this.className=[...set].join(' ')},
      remove:(...names)=>{const remove=new Set(names);this.className=this.className.split(/\s+/).filter(name=>name&&!remove.has(name)).join(' ')},
      contains:name=>this.className.split(/\s+/).includes(name),
      toggle:(name,force)=>{const active=force===undefined?!this.classList.contains(name):Boolean(force);if(active)this.classList.add(name);else this.classList.remove(name);return active}
    };
  }
  append(...children){children.forEach(child=>this.appendChild(child))}
  appendChild(child){child.parentNode=this;this.children.push(child);return child}
  insertBefore(child,before){child.parentNode=this;const index=this.children.indexOf(before);if(index<0)this.children.push(child);else this.children.splice(index,0,child);return child}
  setAttribute(name,value){this.attributes.set(name,String(value))}
  hasAttribute(name){return this.attributes.has(name)}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  querySelectorAll(selector){
    const matches=node=>selector.startsWith('.')?node.className.split(/\s+/).includes(selector.slice(1)):node.tagName.toLowerCase()===selector.toLowerCase();
    const found=[];
    const visit=node=>{node.children.forEach(child=>{if(matches(child))found.push(child);visit(child)})};
    visit(this);
    return found;
  }
  set innerHTML(value){
    this._innerHTML=String(value);
    this.children=[];
    if(this._innerHTML.includes('cmd-site-session-pill')){
      const pill=new FakeElement('div');pill.className='cmd-site-session-pill';pill.hidden=true;
      const label=new FakeElement('span');label.textContent='♪ music continues';
      const button=new FakeElement('button');button.textContent='×';
      pill.append(label,button);this.appendChild(pill);
    }
  }
  get innerHTML(){return this._innerHTML||''}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null}
}

class FakeAudio extends FakeTarget{
  constructor(src){super();this.currentSrc=src;this.src=src;this.paused=false;this.ended=false}
}
class FakeVideo extends FakeAudio{constructor(src){super(src);this.muted=false}}

function environment({pathname='/release/',songs=[]}={}){
  const document=new FakeTarget();
  document.referrer='';
  document.visibilityState='visible';
  document.head=new FakeElement('head');
  document.body=new FakeElement('body');
  document.documentElement=new FakeElement('html');
  document.createElement=tag=>{
    const element=new FakeElement(tag);
    if(String(tag).toLowerCase()==='iframe'){
      element.contentWindow={location:{href:''},document:{querySelectorAll:()=>[]},postMessage(){}};
      element.contentDocument={body:new FakeElement('body'),addEventListener(){}};
    }
    return element;
  };
  document.querySelectorAll=()=>[];
  document.getElementById=id=>{
    const visit=node=>node.id===id?node:node.children.map(visit).find(Boolean);
    return visit(document.head)||visit(document.body)||null;
  };
  const location={href:`https://callmedaddy.musicsubject.com${pathname}`,origin:'https://callmedaddy.musicsubject.com',pathname,search:'',hash:''};
  const window={CMD_SONGS:songs,innerHeight:800};
  window.top=window;window.self=window;window.parent=window;
  const sessionStorage={getItem:()=>null,setItem(){}};
  let intervalId=0;
  let clock=Date.parse('2026-09-04T00:00:00Z');
  const intervals=new Map();
  const historyCalls=[];
  class FakeDate extends Date{static now(){return clock}}
  const context=vm.createContext({
    window,document,location,sessionStorage,URL,URLSearchParams,Date:FakeDate,Math,Number,String,Array,Object,
    HTMLAudioElement:FakeAudio,HTMLVideoElement:FakeVideo,
    addEventListener(){},requestAnimationFrame(){return 1},cancelAnimationFrame(){},
    setInterval(handler){intervalId+=1;intervals.set(intervalId,handler);return intervalId},clearInterval(id){intervals.delete(id)},
    history:{state:null,pushState(state,title,url){historyCalls.push({type:'push',state,url})},replaceState(state,title,url){historyCalls.push({type:'replace',state,url})}},
    MutationObserver:class{observe(){}disconnect(){}},CustomEvent:class{}
  });
  vm.runInContext(source,context,{filename:'persistent-site-browser.js'});
  return {window,document,historyCalls,advance(ms){clock+=ms;[...intervals.values()].forEach(handler=>handler())}};
}

function findByText(node,text){
  if(node.textContent===text)return node;
  return node.children.map(child=>findByText(child,text)).find(Boolean)||null;
}

test('the page-follow prompt has an escape and can be cancelled',()=>{
  const env=environment();
  const opened=env.window.CMDPersistentSite.followTrack({title:'Second Song',cover:'/cover.jpg',experience:'/second/'},{seconds:5});
  assert.equal(opened,true);
  const prompt=env.document.body.children.find(child=>child.className==='cmd-follow-music');
  assert.ok(prompt);
  assert.ok(findByText(prompt,'Up next'));
  assert.ok(findByText(prompt,'Second Song'));
  assert.ok(findByText(prompt,'Stay here'));
  assert.ok(findByText(prompt,'Open now'));
  env.window.CMDPersistentSite.cancelFollow();
  assert.equal(env.document.body.children.includes(prompt),false);
});

test('the five-second prompt opens the destination when its countdown expires',()=>{
  const env=environment();
  assert.equal(env.window.CMDPersistentSite.followTrack({title:'Second Song',experience:'/second/'},{seconds:5}),true);
  const prompt=env.document.body.children.find(child=>child.className==='cmd-follow-music');
  assert.ok(prompt);
  assert.ok(findByText(prompt,'Following the music in 5'));
  env.advance(5000);
  assert.equal(env.document.body.children.includes(prompt),false);
  const overlay=env.document.body.children.find(child=>child.classList.contains('cmd-site-view'));
  assert.ok(overlay?.classList.contains('is-open'));
  const frame=overlay.children.find(child=>child.tagName==='IFRAME');
  assert.equal(frame?.src,'https://callmedaddy.musicsubject.com/second/');
  assert.equal(env.historyCalls.at(-1)?.url,'https://callmedaddy.musicsubject.com/second/');
});

test('the prompt skips same-page songs',()=>{
  const env=environment({pathname:'/release/'});
  const opened=env.window.CMDPersistentSite.followTrack({title:'Same Song',experience:'/release/'});
  assert.equal(opened,false);
  assert.equal(env.document.body.children.length,0);
});

test('legacy players get page following from their catalog audio source',()=>{
  const audioPath='/media/songs/second.mp3';
  const env=environment({songs:[{id:'second',title:'Second Song',audio:audioPath,cover:'/cover.jpg',experience:'/second/'}]});
  env.document.emit('play',{target:new FakeAudio(`https://callmedaddy.musicsubject.com${audioPath}`)});
  const prompt=env.document.body.children.find(child=>child.className==='cmd-follow-music');
  assert.ok(prompt);
  assert.ok(findByText(prompt,'Second Song'));
});
