import test from 'node:test';
import assert from 'node:assert/strict';
import { STARMUFF_TRACKS } from '../data/starmuff-playlist.mjs';
import { readHead } from '../song-social.mjs';
import { decorateSongHTML } from '../worker/site.mjs';
import { handleStarMuffMedia } from '../worker/starmuff.mjs';
import { handleRequest } from '../worker/index.mjs';
const track=STARMUFF_TRACKS[0],origin='https://callmedaddy.musicsubject.com';
const request=(options={})=>new Request(origin+track.audio,options);
test('the original 50 StarMuff tracks have distinct playable identities and exact sharing routes',()=>{
 assert.equal(STARMUFF_TRACKS.length,50);assert.equal(new Set(STARMUFF_TRACKS.map(t=>t.id)).size,50);
 assert.ok(STARMUFF_TRACKS.some(t=>t.title==='Galactic Grove (StarMuff Casino)'));
 for(const t of STARMUFF_TRACKS){
  assert.equal(t.playlist,'starmuff');assert.match(t.audio,/^\/media\/starmuff\/[a-z0-9]+\.mp3$/);
  assert.ok(t.sourcePath.startsWith('/api/winhamp/audio/assets/')||t.sourcePath.startsWith('/audio/'));
  const url=new URL(t.shareUrl,origin);assert.equal(url.searchParams.get('playlist'),'starmuff');assert.equal(url.searchParams.get('song'),t.id);
 }
});
test('the service forwards byte ranges and validators without visitor credentials',async()=>{
 let seen;
 const env={STARMUFF:{fetch:async r=>{seen=r;return new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{'content-type':'audio/mpeg','content-range':'bytes 10-13/100','content-length':'4','set-cookie':'session=private'}});}}};
 const response=await handleRequest(request({headers:{range:'bytes=10-13','if-range':'"v1"',cookie:'visitor=secret',authorization:'Bearer private'}}),env);
 assert.equal(seen.redirect,'manual','Cloudflare workerd supports manual/follow, not error redirect mode');
 assert.equal(seen.url,'https://starmuff.com'+track.sourcePath);assert.equal(seen.headers.get('range'),'bytes=10-13');assert.equal(seen.headers.get('if-range'),'"v1"');
 assert.equal(seen.headers.has('cookie'),false);assert.equal(seen.headers.has('authorization'),false);
 assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 10-13/100');assert.equal(response.headers.has('set-cookie'),false);
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3,4]);
});
test('a large audio stream is returned before its body completes',async()=>{
 const body=new ReadableStream({start(c){c.enqueue(new Uint8Array([9,8,7]));}});
 const response=await handleStarMuffMedia(request(),{STARMUFF:{fetch:async()=>new Response(body,{headers:{'content-type':'audio/mpeg'}})}});
 const reader=response.body.getReader();assert.deepEqual([...((await reader.read()).value)],[9,8,7]);await reader.cancel();
});
test('HEAD and unsatisfiable ranges retain media metadata',async()=>{
 let method;
 let response=await handleStarMuffMedia(request({method:'HEAD'}),{STARMUFF:{fetch:async r=>{method=r.method;return new Response(null,{headers:{'content-type':'audio/mpeg','content-length':'12345'}});}}});
 assert.equal(method,'HEAD');assert.equal(response.body,null);assert.equal(response.headers.get('content-length'),'12345');
 response=await handleStarMuffMedia(request({headers:{range:'bytes=99999-'}}),{STARMUFF:{fetch:async()=>new Response(null,{status:416,headers:{'content-range':'bytes */12345'}})}});
 assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),'bytes */12345');
});
test('unknown paths, writes, upstream HTML and outages cannot become playable recordings',async()=>{
 let calls=0;const env={STARMUFF:{fetch:async()=>{calls++;return new Response('<html>Sign in</html>',{headers:{'content-type':'text/html'}});}}};
 assert.equal((await handleStarMuffMedia(new Request(origin+'/media/starmuff/not-listed.mp3'),env)).status,404);
 assert.equal((await handleStarMuffMedia(request({method:'POST'}),env)).status,405);assert.equal(calls,0);
 assert.equal((await handleStarMuffMedia(request(),env)).status,502);
 assert.equal((await handleStarMuffMedia(request(),{})).status,503);
 assert.equal((await handleStarMuffMedia(request(),{STARMUFF:{fetch:async()=>{throw Error('down');}}})).status,503);
 assert.equal(await handleStarMuffMedia(new Request(origin+'/media/songs/normal.mp3'),env),null);
});

test('StarMuff playlist previews preserve their own title, artwork and playlist URL',async()=>{
 const html='<!doctype html><html><head><title>WinHamp</title><meta property="og:image" content="https://example.test/old.jpg"></head><body>Player</body></html>';
 const env={ASSETS:{fetch:async()=>Response.json({schemaVersion:1,songs:{},pages:{}})}};
 for(const suffix of ['?playlist=starmuff','?playlist=starmuff&song='+track.id+'&version=main']){
  const response=await decorateSongHTML(new Request(origin+'/winhamp/'+suffix),new Response(html,{headers:{'content-type':'text/html'}}),env);
  const head=readHead(await response.text());assert.match(head.title,/StarMuff/);assert.equal(head.image,'https://starmuff.com/og-image.png');
  assert.equal(new URL(head.canonical).searchParams.get('playlist'),'starmuff');
  if(suffix.includes('song=')){assert.ok(head.title.includes(track.title));assert.equal(new URL(head.canonical).searchParams.get('song'),track.id);}
 }
});
