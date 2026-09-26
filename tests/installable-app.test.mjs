import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { addAppShell } from '../worker/site.mjs';

const installSource=fs.readFileSync(new URL('../app/install.js',import.meta.url),'utf8');
const installHtml=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function installHarness(profile={}){
  const events={},registered=[],buttonEvents={};
  const node=()=>({textContent:'',hidden:false,open:false,focused:false,focus(){this.focused=true;}});
  const button={...node(),addEventListener:(name,fn)=>buttonEvents[name]=fn};
  const status=node(),recommendation=node(),help=node();
  const guides=Object.fromEntries([...installHtml.matchAll(/<details\s+id="([^"]+)"/g)].map(([,id])=>[id,node()]));
  const window={isSecureContext:true,matchMedia:()=>({matches:false}),addEventListener:(name,fn)=>events[name]=fn};window.top=window;window.self=window;
  const document={readyState:'complete',querySelector:selector=>({'[data-install-app]':button,'[data-install-status]':status,'[data-device-recommendation]':recommendation}[selector]||null),getElementById:id=>id==='install-help'?help:guides[id]};
  const navigator={serviceWorker:{register:(...args)=>{registered.push(args);return Promise.resolve()}},...profile};
  vm.runInNewContext(installSource,{window,document,navigator});
  return {events,registered,window,button,status,recommendation,help,guides,click:()=>buttonEvents.click()};
}

test('app shell is idempotent and preserves song identity and page body',()=>{
  const input='<html><head><title>Exact song version</title><link rel="icon" href="/song-cover.jpg"><link rel="canonical" href="https://example.test/song/?version=2"></head><body><audio src="/song.mp3"></audio><script src="/universal-player.js?v=old"></script></body></html>';
  const output=addAppShell(input);
  assert.equal(addAppShell(output),output);
  assert.ok(output.includes('<link rel="icon" href="/song-cover.jpg">'));
  assert.ok(output.includes('version=2'));
  assert.ok(output.includes('<audio src="/song.mp3"></audio>'));
  assert.equal(output.split('</head>')[1],input.split('</head>')[1]);
  assert.equal((output.match(/rel="manifest"/g)||[]).length,1);
});
test('installation manifest launches the music site with real square PNG icons',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/?source=app');
  for(const size of [192,512]){
    const icon=manifest.icons.find(icon=>icon.sizes===`${size}x${size}`);assert.ok(icon);
    const bytes=fs.readFileSync(new URL('..'+icon.src,import.meta.url));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
  }
});
test('service worker never intercepts media, range requests or scripts',async()=>{
  const events={},offline=new Response('Offline page'),stored=[];
  const self={addEventListener:(name,fn)=>events[name]=fn};
  vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{self,Response,fetch:()=>Promise.reject(Error('offline')),caches:{open:async()=>({add:async path=>stored.push(path)}),match:async()=>offline}});
  let install;events.install({waitUntil:value=>install=value});await install;assert.deepEqual(stored,['/app/offline.html']);
  for(const request of [{method:'GET',mode:'cors',url:'/media/song.mp3',headers:{range:'bytes=0-1024'}},{method:'GET',mode:'no-cors',url:'/universal-player.js'},{method:'POST',mode:'navigate'}]){
    events.fetch({request,respondWith(){assert.fail('non-navigation must go straight to network')}});
  }
  let result;events.fetch({request:{method:'GET',mode:'navigate'},respondWith:value=>result=value});assert.equal(await result,offline);
});
test('installation requires a click, consumes each browser prompt once, and never reloads playback',async()=>{
  const {events,registered,window,button,help,click}=installHarness();
  let prompts=0,prevented=0;events.beforeinstallprompt({preventDefault(){prevented++;},prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'dismissed'})});
  assert.equal(prevented,1);assert.equal(prompts,0);assert.equal(window.CMDInstall.available(),true);
  assert.match(button.textContent,/Install MusicSubject/);
  await click();assert.equal(prompts,1);assert.equal(window.CMDInstall.available(),false);
  await click();assert.equal(prompts,1);assert.equal(help.focused,true);
  assert.equal(window.CMDInstall.installed(),false);
  assert.equal(registered[0][0],'/sw.js');events.appinstalled();assert.equal(window.CMDInstall.installed(),true);assert.equal(button.hidden,true);
});

test('device suggestions select usable manual instructions, including iPad desktop mode and ChromeOS',async t=>{
  const profiles=[
    ['Android',{userAgent:'Mozilla/5.0 (Linux; Android 16; Pixel 9 Pro) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36'},'android'],
    ['iPad with desktop Safari',{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5},'ios'],
    ['Mac without touch',{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0},'mac'],
    ['Chromebook reporting a Linux platform',{userAgent:'Mozilla/5.0 (X11; CrOS x86_64 16093.68.0) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',platform:'Linux x86_64'},'chromeos'],
    ['ChromeOS client hint',{userAgent:'Mozilla/5.0 AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36',userAgentData:{platform:'Chrome OS'},platform:'Linux x86_64'},'chromeos'],
    ['Windows',{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36'},'windows'],
    ['Linux',{userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36'},'linux'],
  ];
  for(const [name,profile,expected]of profiles)await t.test(name,async()=>{
    const {guides,help,click}=installHarness(profile);
    await click();
    assert.ok(guides[expected],`installation page must contain ${expected} instructions`);
    assert.equal(guides[expected].open,true);assert.equal(guides[expected].focused,true);
    assert.equal(help.focused,false);
    assert.deepEqual(Object.keys(guides).filter(id=>guides[id].open),[expected]);
  });
});

test('Fire and TV devices use the compatibility fallback instead of ordinary Android instructions',async t=>{
  const profiles=[
    ['Fire tablet','Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 Silk/124.3.2 like Chrome/124.0.0.0 Safari/537.36'],
    ['Android TV','Mozilla/5.0 (Linux; Android 11; SHIELD Android TV Build/RQ1A.210105.003) AppleWebKit/537.36 Chrome/90.0.4430.210 Safari/537.36'],
    ['Samsung TV','Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) AppleWebKit/537.36 SamsungBrowser/5.0 TV Safari/537.36'],
  ];
  for(const [name,userAgent]of profiles)await t.test(name,async()=>{
    const {guides,help,click}=installHarness({userAgent});
    await click();assert.equal(help.focused,true);
    assert.deepEqual(Object.keys(guides).filter(id=>guides[id].open),[]);
  });
});

test('embedded browsers explain the browser handoff without suppressing device instructions',async t=>{
  for(const [name,userAgent]of [
    ['Facebook','Mozilla/5.0 (Linux; Android 16; Pixel 9 Pro) AppleWebKit/537.36 [FBAN/FB4A;FBAV/535.0.0.0]'],
    ['Android WebView','Mozilla/5.0 (Linux; Android 16; Pixel 9 Pro Build/BP2A; wv) AppleWebKit/537.36 Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36'],
  ])await t.test(name,async()=>{
    const {recommendation,status,guides,click}=installHarness({userAgent});
    assert.match(recommendation.textContent,/another app/);
    await click();assert.match(status.textContent,/browser first/);assert.equal(guides.android.open,true);
  });
});

test('a rejected native prompt opens manual installation help',async()=>{
  const {events,guides,window,click}=installHarness({userAgent:'Mozilla/5.0 (Linux; Android 16; Pixel 9 Pro)'});
  events.beforeinstallprompt({preventDefault(){},prompt:async()=>{throw Error('prompt unavailable')},userChoice:Promise.resolve()});
  await click();assert.equal(guides.android.open,true);assert.equal(window.CMDInstall.available(),false);
});
