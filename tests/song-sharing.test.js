const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../share.js'),'utf8');
const registry=require('../data/song-links.json');
const origin=registry.origin;
const data={title:'Keep Moving — Trap Mix',text:'Listen to Keep Moving — Trap Mix.',url:`${origin}/updates/release-keep-moving/?version=trap-mix`};
const expected=`https://${registry.domains.other}/27/2`;

// Minimal DOM for exercising asynchronous failures and visible recovery UI.
class Element{
  constructor(tag,document){this.tagName=tag;this.document=document;this.children=[];this.attributes={};this.dataset={};this.listeners={};this.className='';this.textContent='';this.value='';this.classList={add:(...names)=>this.className+=' '+names.join(' ')};}
  appendChild(child){child.parentNode=this;this.children.push(child);return child}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null}
  setAttribute(name,value){this.attributes[name]=value;if(name==='class')this.className=value;if(name==='id')this.id=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value}
  getAttribute(name){return this.attributes[name]??null}
  hasAttribute(name){return name in this.attributes}
  addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}
  async emit(name,extra={}){for(const handler of this.listeners[name]||[])await handler({target:this,...extra})}
  matches(selector){return selector[0]==='.'?this.className.split(/\s+/).includes(selector.slice(1)):selector[0]==='#'?this.id===selector.slice(1):this.tagName===selector}
  closest(selector){return this.matches(selector)?this:this.parentNode?.closest(selector)||null}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)])}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  focus(){this.document.activeElement=this}
  select(){this.selected=this.value}
  setSelectionRange(start,end){this.selection=[start,end]}
  showModal(){this.open=true}
  close(){this.open=false;void this.emit('close')}
  set innerHTML(html){
    this.children=[];const stack=[this];
    for(const token of html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>|([^<]+)/gi)){
      if(token[3]){stack.at(-1).textContent+=token[3];continue}
      if(token[0].startsWith('</')){stack.pop();continue}
      const node=new Element(token[1],this.document);
      for(const attr of token[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))node.setAttribute(attr[1],attr[2]||'');
      stack.at(-1).appendChild(node);
      if(!['input','br','img'].includes(token[1]))stack.push(node);
    }
  }
}
async function environment({navigator={},legacy=false,ready=true,shortOnly=true}={}){
  const document={title:'Music',currentScript:{hasAttribute:()=>shortOnly}};
  document.head=new Element('head',document);document.body=new Element('body',document);
  document.createElement=tag=>new Element(tag,document);
  document.getElementById=id=>document.head.querySelector('#'+id)||document.body.querySelector('#'+id);
  document.querySelector=selector=>document.body.querySelector(selector);
  document.querySelectorAll=selector=>document.body.querySelectorAll(selector);
  const commands=[];document.execCommand=name=>{commands.push({name,text:document.activeElement?.selected});return legacy};
  const location={origin,href:origin+'/updates/release-keep-moving/',pathname:'/updates/release-keep-moving/',search:''};
  const window={document,location};window.top=window;window.self=window;
  vm.runInNewContext(source,{window,document,location,navigator,URL,URLSearchParams,AbortSignal,
    fetch:async()=>({ok:ready,json:async()=>({service:'musicsubject-song-links',revision:registry.revision})})});
  await window.CMDShortLinks.ready;
  return {window,document,commands,api:window.CMDShare,dialog:()=>document.body.querySelector('.cmd-share-dialog'),field:()=>document.body.querySelector('.cmd-share-link'),status:()=>document.body.querySelector('.cmd-share-copy-status')};
}

test('Facebook and Messenger copy the exact version on a tap without opening native sharing',async t=>{
  for(const userAgent of ['Android [FBAN/FB4A;FBAV/535.0]','iPhone [FBAN/FBIOS;FBAV/535.0]','Android [FB_IAB/FB4A;]','iPhone [FBAN/MessengerForiOS;]'])await t.test(userAgent,async()=>{
    const copies=[];let shares=0;
    const env=await environment({navigator:{userAgent,share:()=>shares++,clipboard:{writeText:async text=>copies.push(text)}}});
    assert.equal(copies.length,0);assert.equal(env.dialog(),null);
    const result=env.api.nativeShare(data);
    assert.equal(copies[0],expected,'clipboard call starts in the tap, before any asynchronous work');
    assert.equal(await result,true);assert.equal(shares,0);assert.equal(copies.length,1);
    assert.match(env.status().textContent,/Song link copied/);assert.equal(env.field().value,expected);
    assert.equal(env.dialog().querySelector('.cmd-share-song').textContent,data.title);
  });
});

test('ordinary native sharing keeps one exact URL and cancellation never copies',async()=>{
  const sent=[],copies=[];const env=await environment({navigator:{userAgent:'Chrome Mobile Safari',share:async value=>sent.push(value),clipboard:{writeText:async value=>copies.push(value)}}});
  const result=env.api.nativeShare(data);assert.equal(sent.length,1);assert.equal(await result,true);
  assert.equal(sent[0].text,`${data.text}\n${expected}`);assert.equal(copies.length,0);assert.equal(env.dialog(),null);
  const cancelled=await environment({navigator:{share:async()=>{throw Object.assign(Error(),{name:'AbortError'})},clipboard:{writeText:async value=>copies.push(value)}}});
  assert.equal(await cancelled.api.nativeShare(data),false);assert.equal(copies.length,0);assert.equal(cancelled.dialog(),null);
});

test('native denial falls back even when Facebook detection does not match',async()=>{
  const copies=[];const env=await environment({navigator:{share:async()=>{throw Object.assign(Error(),{name:'NotAllowedError'})},clipboard:{writeText:async value=>copies.push(value)}}});
  assert.equal(await env.api.nativeShare(data),true);assert.deepEqual(copies,[expected]);assert.ok(env.dialog().open);
});

test('missing or rejected clipboard and false legacy copy leave an honest selectable link',async t=>{
  for(const navigator of [{},{clipboard:{writeText:async()=>{throw Error('blocked')}}}])await t.test('blocked copy',async()=>{
    const env=await environment({navigator});const external={textContent:''};
    assert.equal(await env.api.nativeShare(data,external),false);
    assert.equal(env.field().value,expected);assert.equal(env.field().selected,expected);
    assert.match(env.status().textContent,/Press and hold/);assert.doesNotMatch(external.textContent,/copied/i);
    assert.equal(env.commands.length,1);assert.equal(env.commands[0].text,expected);
    await env.dialog().querySelector('.cmd-share-select').emit('click');assert.equal(env.field().selected,expected);
  });
});

test('only a successful legacy copy command reports success',async()=>{
  const env=await environment({legacy:true});assert.equal(await env.api.copyLink(data),true);
  assert.match(env.status().textContent,/Song link copied/);assert.equal(env.commands[0].text,expected);
});

test('a pending clipboard operation never hides the manual link or reopens a dismissed panel',async()=>{
  let resolve;const env=await environment({navigator:{clipboard:{writeText:()=>new Promise(r=>resolve=r)}}});
  const result=env.api.copyLink(data);assert.ok(env.dialog().open);assert.equal(env.field().value,expected);
  await env.dialog().querySelector('.cmd-share-done').emit('click');assert.equal(env.dialog(),null);
  resolve();await result;assert.equal(env.dialog(),null);
});

test('copy from a retained iframe uses the visible top document and its clipboard',async()=>{
  const copies=[];const top=await environment({navigator:{clipboard:{writeText:async value=>copies.push(value)}}});
  const child=await environment({navigator:{clipboard:{writeText(){assert.fail('hidden frame clipboard must not be used')}}}});child.window.top=top.window;
  await child.api.copyLink(data);assert.deepEqual(copies,[expected]);assert.equal(child.dialog(),null);assert.ok(top.dialog().open);
});

test('explicit copy works with native sharing available and keeps a selected track instead of the page URL',async()=>{
  const copies=[];const env=await environment({navigator:{share(){assert.fail('Copy link must bypass native sharing')},clipboard:{writeText:async value=>copies.push(value)}}});
  await env.api.shareTrack({songId:'keep-moving',variantId:'trap-mix',variantCount:2,variantLabel:'Trap Mix',title:'Keep Moving'},{copyOnly:true});
  assert.deepEqual(copies,[expected]);assert.match(env.dialog().querySelector('.cmd-share-song').textContent,/Trap Mix/);
  await env.api.shareTrack({songId:'keep-moving',variantId:'v2',title:'Keep Moving'},{copyOnly:true});
  assert.equal(copies[1],expected.replace('/27/2','/27'));assert.equal(env.document.body.querySelectorAll('.cmd-share-dialog').length,1);
});

test('unavailable short domains preserve exact song and version in a working full URL',async()=>{
  const env=await environment({ready:false});
  await env.api.shareTrack({songId:'keep-moving',variantId:'trap-mix',title:'Keep Moving',experience:'/updates/release-keep-moving/'},{copyOnly:true});
  assert.equal(env.field().value,data.url);
});

test('Facebook compact and full-page share controls offer copying without popup loops',async()=>{
  const copies=[];const env=await environment({navigator:{userAgent:'[FBAN/FB4A;]',clipboard:{writeText:async value=>copies.push(value)}}});
  env.window.open=()=>assert.fail('Facebook in-app sharing must not open another Facebook popup');
  const compact=env.document.createElement('div');compact.dataset={shareCompact:'1',shareUrl:data.url,shareTitle:data.title};
  env.api.mount(compact);assert.equal(compact.querySelector('button').textContent,'Copy link');
  await compact.querySelector('button').emit('click');
  const full=env.document.createElement('div');full.dataset={shareUrl:data.url,shareTitle:data.title};env.api.mount(full);
  const facebook=full.querySelectorAll('button').find(button=>button.dataset.network==='facebook');
  await full.emit('click',{target:facebook});assert.deepEqual(copies,[expected,expected]);
});
