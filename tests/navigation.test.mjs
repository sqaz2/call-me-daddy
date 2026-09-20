import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../worker/index.mjs';
import siteWorker from '../worker/site.mjs';
const origin='https://callmedaddy.musicsubject.com';
const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)}};
test('generic Music visits consolidate on homepage search',async()=>{
 for(const route of ['/music/','/music','/music/?q=survival%20mode']){
  const response=await handleRequest(new Request(origin+route),env);
  assert.equal(response.status,302);
  const url=new URL(response.headers.get('location'));
  assert.equal(url.pathname,'/');assert.equal(url.hash,'#homeSearchForm');
  if(route.includes('q='))assert.equal(url.searchParams.get('q'),'survival mode');
 }
});
test('exact recordings and intentional radio routes retain their listening destination',async()=>{
 for(const query of ['?song=survival-mode&version=celtic-north-remix','?intent=surprise','?intent=think&seed=shared&share=1']){
  const response=await handleRequest(new Request(origin+'/music/'+query),env);
  assert.equal(response.status,200);assert.equal(await response.text(),'/music/');
 }
});
test('music aliases redirect before generic Music navigation or asset lookup',async()=>{
 const noAssets={ASSETS:{fetch:async()=>{throw new Error('Alias reached assets');}}};
 const routes=[
  ['satans.loan',['/music','/music/'],origin+'/satans-loan/'],
  ['music.frigging.link',['/','/music','/music/'],origin+'/'],
  ['music.fricking.link',['/','/music','/music/'],origin+'/']
 ];
 for(const [host,paths,target] of routes)for(const path of paths)for(const method of ['GET','HEAD']){
  const response=await handleRequest(new Request('https://'+host+path+'?song=wrong&redirect=https://example.com',{method}),noAssets);
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),target);
  assert.equal(await response.text(),'');
 }
});
test('music subdomains reject unknown links and unsupported methods',async()=>{
 for(const host of ['music.frigging.link','music.fricking.link']){
  assert.equal((await handleRequest(new Request('https://'+host+'/missing'),env)).status,404);
  const response=await handleRequest(new Request('https://'+host+'/music',{method:'POST'}),env);
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET, HEAD');
 }
});
test('the narrow satans.loan route leaves other paths with their current origin',async t=>{
 const upstream=new Response('<html>Existing domain page</html>',{headers:{'content-type':'text/html'}});
 const passthrough=t.mock.method(globalThis,'fetch',async()=>upstream);
 const request=new Request('https://satans.loan/musical');
 assert.equal(await siteWorker.fetch(request,env),upstream);
 assert.equal(passthrough.mock.calls[0].arguments[0],request);
});
