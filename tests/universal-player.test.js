const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../universal-player.js'),'utf8');

class FakeTarget{
  constructor(){this.listeners=new Map()}
  addEventListener(type,handler){const handlers=this.listeners.get(type)||[];handlers.push(handler);this.listeners.set(type,handlers)}
  emit(type,event={}){for(const handler of this.listeners.get(type)||[])handler({type,target:this,preventDefault(){},...event})}
}

class FakeElement extends FakeTarget{
  constructor(tag='div'){
    super();
    this.tagName=String(tag).toUpperCase();
    this.children=[];
    this.parentNode=null;
    this.attributes=new Map();
    this.className='';
    this.hidden=false;
    this.style={};
    this.dataset={};
    this.textContent='';
    this.classList={
      add:(...names)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));names.forEach(name=>set.add(name));this.className=[...set].join(' ')},
      remove:(...names)=>{const remove=new Set(names);this.className=this.className.split(/\s+/).filter(name=>name&&!remove.has(name)).join(' ')},
      contains:name=>this.className.split(/\s+/).includes(name)
    };
  }
  append(...children){children.forEach(child=>this.appendChild(child))}
  appendChild(child){child.parentNode=this;this.children.push(child);return child}
  setAttribute(name,value){this.attributes.set(name,String(value))}
  getAttribute(name){return this.attributes.get(name)||null}
  getBoundingClientRect(){return {left:0,width:100,top:0,bottom:5,height:5}}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  querySelectorAll(selector){
    const parts=selector.trim().split(/\s+/);
    const matches=(node,part)=>part.startsWith('.')?node.className.split(/\s+/).includes(part.slice(1)):node.tagName.toLowerCase()===part.toLowerCase();
    const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
    if(parts.length===1)return descendants(this).filter(node=>matches(node,parts[0]));
    return descendants(this).filter(node=>matches(node,parts[0])).flatMap(node=>descendants(node).filter(child=>matches(child,parts.at(-1))));
  }
  set innerHTML(value){
    this._innerHTML=String(value);
    this.children=[];
    if(!this._innerHTML.includes('cmd-universal-shell'))return;
    const node=(tag,className)=>{const element=new FakeElement(tag);element.className=className;return element};
    const shell=node('div','cmd-universal-shell');
    const art=node('button','cmd-universal-art');art.append(node('img',''),node('span',''));
    const copy=node('div','cmd-universal-copy');copy.append(node('small','cmd-universal-context'),node('button','cmd-universal-title'),node('span','cmd-universal-detail'),node('a','cmd-universal-story'));
    const controls=node('div','cmd-universal-controls');controls.append(node('button','cmd-universal-prev'),node('button','cmd-universal-toggle'),node('button','cmd-universal-next'),node('button','cmd-universal-share'));
    const progress=node('div','cmd-universal-progress');progress.append(node('span',''));
    const times=node('div','cmd-universal-times');times.append(node('span','cmd-universal-current'),node('span',''),node('span','cmd-universal-duration'));
    shell.append(art,copy,controls,progress,times,node('span','cmd-universal-live'));
    this.appendChild(shell);
  }
  get innerHTML(){return this._innerHTML||''}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null}
}

class FakeMedia extends FakeTarget{
  constructor(){super();this.src='/song.mp3';this.currentSrc='/song.mp3';this.currentTime=30;this.duration=120;this.paused=true;this.ended=false;this.dataset={}}
  play(){this.paused=false;this.emit('play');return Promise.resolve()}
  pause(){this.paused=true;this.emit('pause')}
}

function environment(){
  const document=new FakeTarget();
  document.title='Release — Call Me Daddy';
  document.head=new FakeElement('head');
  document.body=new FakeElement('body');
  document.createElement=tag=>new FakeElement(tag);
  document.getElementById=id=>[...document.head.children,...document.body.children].find(node=>node.id===id)||null;
  document.querySelector=()=>null;
  const opened=[];
  const persistent=[];
  const location={href:'https://callmedaddy.musicsubject.com/release/',origin:'https://callmedaddy.musicsubject.com',pathname:'/release/',search:'',assign(url){opened.push(url)}};
  const window={
    CMD_ARTWORK:{fallbackCover:'/fallback.jpg'},
    CMDPersistentSite:{open:url=>persistent.push(url),refreshClearance(){}},
    open:(url,target,features)=>opened.push({url,target,features})
  };
  const navigator={clipboard:{writeText(){}}};
  const context=vm.createContext({window,document,location,navigator,URL,Number,String,Array,Object,Map,WeakMap,Set,Math});
  vm.runInContext(source,context,{filename:'universal-player.js'});
  return {window,document,opened,persistent};
}

test('one universal transport controls a legacy player and marks a missing story honestly',()=>{
  const env=environment();
  const media=new FakeMedia();
  const replacement=new FakeElement('div');
  let previous=0,next=0,toggles=0,shares=0;
  const handle=env.window.CMDUniversalPlayer.connect({
    id:'legacy',media,
    track:{id:'song',title:'Unfinished Story',artist:'Call Me Daddy',cover:'/cover.jpg',audio:'/song.mp3'},
    context:'Play the site',
    toggle:()=>{toggles+=1},previous:()=>{previous+=1},next:()=>{next+=1},share:()=>{shares+=1},
    replaceElement:replacement
  });
  handle.update({status:'Loading…'});
  media.play();

  const root=env.document.body.querySelector('.cmd-universal-player');
  assert.ok(root);
  assert.equal(root.hidden,false);
  assert.ok(replacement.classList.contains('cmd-universal-replaced'));
  assert.equal(root.querySelector('.cmd-universal-title').textContent,'Unfinished Story');
  assert.equal(root.querySelector('.cmd-universal-detail').textContent,'Playing');
  const story=root.querySelector('.cmd-universal-story');
  assert.equal(story.textContent,'Story coming soon · ask me about this song ↗');
  assert.equal(story.href,'https://facebook.com/callmedaddy');
  assert.ok(story.classList.contains('is-coming'));

  root.querySelector('.cmd-universal-prev').emit('click');
  root.querySelector('.cmd-universal-toggle').emit('click');
  root.querySelector('.cmd-universal-next').emit('click');
  root.querySelector('.cmd-universal-share').emit('click');
  assert.deepEqual({previous,next,toggles,shares},{previous:1,next:1,toggles:1,shares:1});

  root.querySelector('.cmd-universal-progress').emit('click',{clientX:50});
  assert.equal(media.currentTime,60);
  root.querySelector('.cmd-universal-progress').emit('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.equal(media.currentTime,65);

  root.querySelector('.cmd-universal-title').emit('click');
  assert.equal(env.opened[0].url,'https://facebook.com/callmedaddy');
});

test('the universal transport opens only a declared song story',()=>{
  const env=environment();
  const media=new FakeMedia();
  const handle=env.window.CMDUniversalPlayer.connect({id:'story',media,track:{title:'Ready Story',audio:'/song.mp3',experience:'/ready-story/'}});
  handle.update({show:true});
  const root=env.document.body.querySelector('.cmd-universal-player');
  const story=root.querySelector('.cmd-universal-story');
  assert.equal(story.textContent,'Open song story →');
  assert.equal(story.href,'/ready-story/');
  assert.equal(story.classList.contains('is-coming'),false);
  root.querySelector('.cmd-universal-title').emit('click');
  assert.deepEqual(env.persistent,['/ready-story/']);
});

test('continuous pages replace their local transport instead of showing two players',()=>{
  const root=path.resolve(__dirname,'..');
  const files=[
    'power-pulse-uprising/continuous-player.js','i-wont-let-the-wifi-go/wifi.js',
    'id-pick-you-first/player.js','namaste-hamster/namaste.js','funhouse-meltdown/player.js',
    'sad-music/song.js','sad-music/sad.js','archive/wild-ways/player.js',
    'archive/2019-heartbreak-rehearsals/player.js','twas-the-tism-mlord/player.js'
  ];
  files.forEach(file=>assert.ok(fs.readFileSync(path.join(root,file),'utf8').includes('replacePlayer'),`${file} must replace its old transport`));
});
