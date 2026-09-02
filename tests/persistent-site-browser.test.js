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
    this.style={};
    this.attributes=new Map();
    this.parentNode=null;
    this.className='';
    this.id='';
    this.textContent='';
  }
  append(...children){children.forEach(child=>this.appendChild(child))}
  appendChild(child){child.parentNode=this;this.children.push(child);return child}
  setAttribute(name,value){this.attributes.set(name,String(value))}
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
  document.createElement=tag=>new FakeElement(tag);
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
  const context=vm.createContext({
    window,document,location,sessionStorage,URL,Date,Math,Number,String,Array,Object,
    HTMLAudioElement:FakeAudio,HTMLVideoElement:FakeVideo,
    addEventListener(){},requestAnimationFrame(){return 1},cancelAnimationFrame(){},
    setInterval(){intervalId+=1;return intervalId},clearInterval(){},
    history:{state:null,pushState(){},replaceState(){}},
    MutationObserver:class{observe(){}disconnect(){}},CustomEvent:class{}
  });
  vm.runInContext(source,context,{filename:'persistent-site-browser.js'});
  return {window,document};
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
