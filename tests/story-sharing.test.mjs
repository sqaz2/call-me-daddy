import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import data from '../worker/song-links-data.mjs';
import { loadCatalog } from '../scripts/sync-song-links.mjs';
import { loadShareCopy } from '../scripts/song-share-copy.mjs';

async function runtime(ready = true) {
  const window = {};
  vm.runInNewContext(fs.readFileSync('short-links/runtime.js','utf8').replace('/* SONG_LINK_DATA */',JSON.stringify(data)), {
    window, URL, AbortSignal, location: {origin:data.origin},
    fetch: async () => ({ok:ready,json:async()=>({service:'musicsubject-song-links',revision:data.revision})})
  });
  await window.CMDShortLinks.ready;
  return window.CMDShortLinks;
}

test('every recording shares its reviewed hook from either its long or numbered URL', async () => {
  const links = await runtime();
  assert.deepEqual([...new Set(data.rows.map(row=>row.songId))].sort(), [...new Set(loadCatalog().map(song=>song.id))].sort());
  for (const row of data.rows) {
    const short = links.forTrack({songId:row.songId,variantId:row.version});
    for (const url of [new URL(row.target,data.origin).href,short]) {
      const post = links.prepareShare(links.editorialShare({title:'Music',text:'Listen to this song.',url}));
      assert.equal(post.text,row.share.text+'\n'+short,`${row.songId}/${row.version}`);
      assert.equal(post.title,row.share.title);
      assert.equal((post.text.match(/https?:\/\//g)||[]).length,1);
      assert.doesNotMatch(post.text,/^Listen to /);
      assert.equal(links.prepareShare(links.editorialShare(post)).text,post.text);
    }
  }
});

test('actual source wins over stale title and URL; unregistered audiobook never borrows song copy',async()=>{
  const links=await runtime(),row=data.rows.find(row=>row.songId==='the-games-she-hates'&&row.version==='end-this-cycle');
  const post=links.editorialShare({text:'Wrong',url:data.origin+'/her-story/'},{songId:'her-story',variantId:'main',audio:row.audio});
  assert.equal(post.text,row.share.text);assert.match(post.text,/Two sets of lyrics/);
  const book={text:'Her Story — Audiobook',url:data.origin+'/her-story/?version=audiobook#audiobook'};
  assert.equal(links.editorialShare(book,{songId:'her-story',variantId:'audiobook',audio:'/media/songs/2026/10/her-story/audiobook.m4a'}).text,book.text);
  assert.equal(links.forUrl(book.url),book.url);
});

test('moments, player routes, stations and custom authored posts retain their intent',async()=>{
  const links=await runtime();
  for(const url of ['/music/?song=her-story&version=main&t=25','/winhamp/?song=her-story&version=main','/music/?intent=heavy&seed=123']){
    const input={title:'Custom',text:'This particular moment or route.',url:data.origin+url};
    const post=links.prepareShare(links.editorialShare(input));
    assert.equal(post.url,input.url);assert.equal(post.text,input.text+'\n'+input.url);
  }
  const input={text:'My own caption.',url:data.origin+'/her-story/',preserveShareText:true};
  assert.equal(links.editorialShare(input).text,input.text);
});

test('approved drafts are preserved and This Is My Story opens its exact story version',()=>{
  const entries=loadShareCopy(loadCatalog());
  assert.equal(entries['big-dick-willy'].text,'AI asked my name. I said “Big Dick Willy.”\n\nIt took me seriously. That was its first mistake.\n\nCome meet Willy—the backstory, the videos, and the rogue Kleenex.');
  assert.equal(entries['her-story'].text,'It learned her laugh from the clips on her phone.\n\nThen it went home to her wife.\n\nStep inside Her Story. There’s a short horror audiobook read by me.');
  assert.equal(entries['this-is-my-story'].text,'An email I sent in 2010 still had my voice attached.\n\nSixteen years later, I found it again and used AI to bring that old recording back.\n\nRead how This Is My Story survived in my sent folder.');
  for(const row of data.rows.filter(row=>row.songId==='this-is-my-story')){
    const target=new URL(row.target,data.origin);assert.equal(target.pathname,'/this-is-my-story/');assert.equal(target.searchParams.get('version'),row.version);
  }
  assert.throws(()=>loadShareCopy([...loadCatalog(),{id:'unreviewed-release'}]),/Write reviewed share copy for unreviewed-release/);
});
