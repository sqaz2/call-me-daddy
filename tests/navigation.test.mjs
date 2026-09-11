import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../worker/index.mjs';
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
