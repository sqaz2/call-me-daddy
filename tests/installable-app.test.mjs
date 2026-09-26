import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { addAppShell } from '../worker/site.mjs';

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
  const events={},registered=[];
  const window={isSecureContext:true,matchMedia:()=>({matches:false}),addEventListener:(name,fn)=>events[name]=fn};window.top=window;window.self=window;
  const document={readyState:'complete',querySelector:()=>null};
  const navigator={serviceWorker:{register:(...args)=>{registered.push(args);return Promise.resolve()}}};
  vm.runInNewContext(fs.readFileSync(new URL('../app/install.js',import.meta.url),'utf8'),{window,document,navigator});
  let prompts=0;events.beforeinstallprompt({preventDefault(){},prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'dismissed'})});
  assert.equal(prompts,0);assert.equal(window.CMDInstall.available(),true);
  assert.equal(await window.CMDInstall.install(),true);assert.equal(prompts,1);
  assert.equal(await window.CMDInstall.install(),false);assert.equal(window.CMDInstall.installed(),false);
  assert.equal(registered[0][0],'/sw.js');events.appinstalled();assert.equal(window.CMDInstall.installed(),true);
});
