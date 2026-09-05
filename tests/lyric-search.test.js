const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadScripts(files){
  const window={};
  const context=vm.createContext({window,console,URLSearchParams,Date,Math});
  files.forEach(file=>vm.runInContext(read(file),context,{filename:file}));
  return {window};
}

test('music page loads song lyrics before catalog search',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('/data/song-lyrics.js?v=20260905-lyrics-map2'));
  assert.ok(html.includes('/catalog-search.js?v=20260905-lyrics-map2'));
  const lyricsIdx=html.indexOf('/data/song-lyrics.js');
  const searchIdx=html.indexOf('/catalog-search.js');
  assert.ok(lyricsIdx>=0&&searchIdx>lyricsIdx,'lyrics script must precede catalog-search');
});

test('lyric phrase booger matches id-pick-you-first; nonsense does not; title still works',()=>{
  const {window}=loadScripts(['data/song-lyrics.js','catalog-search.js']);
  assert.ok(window.CMD_SONG_LYRICS?.['id-pick-you-first']?.search);
  assert.ok(String(window.CMD_SONG_LYRICS['id-pick-you-first'].search).toLowerCase().includes('booger'));

  const songs=[
    {id:'id-pick-you-first',title:"I'd Pick You First",project:'Call Me Daddy',kind:'Single'},
    {id:'armando',title:'Armando',project:'Armando',kind:'Single'},
    {id:'wild-ways',title:'Wild Ways',project:'Old files',kind:'Archive'}
  ];

  const byBooger=window.CMDCatalogSearch.filterSongs(songs,'booger');
  assert.equal(byBooger.length,1);
  assert.equal(byBooger[0].id,'id-pick-you-first');

  const nonsense=window.CMDCatalogSearch.filterSongs(songs,'zzzxqwv-not-a-lyric');
  assert.equal(nonsense.length,0);

  const byTitle=window.CMDCatalogSearch.filterSongs(songs,'Armando');
  assert.equal(byTitle.length,1);
  assert.equal(byTitle[0].id,'armando');

  const byWild=window.CMDCatalogSearch.filterSongs(songs,'wild ways');
  assert.equal(byWild.length,1);
  assert.equal(byWild[0].id,'wild-ways');
});

test('songHaystack includes CMD_SONG_LYRICS search text',()=>{
  const {window}=loadScripts(['data/song-lyrics.js','catalog-search.js']);
  const hay=window.CMDCatalogSearch.songHaystack({id:'id-pick-you-first',title:"I'd Pick You First"});
  assert.ok(hay.includes('booger'));
  assert.ok(hay.includes('pick you first')||hay.includes("i'd pick you first"));
});

test('buildHints can surface capped lyric snippets',()=>{
  const {window}=loadScripts(['data/song-lyrics.js','catalog-search.js']);
  const songs=Object.keys(window.CMD_SONG_LYRICS).slice(0,30).map(id=>({id,title:id,project:'x'}));
  const hints=window.CMDCatalogSearch.buildHints(songs,[]);
  assert.ok(hints.length>0);
  const lyricish=hints.filter(h=>/booger|namaste hamster|musician police|tiny cat/i.test(h));
  assert.ok(lyricish.length>=1,'expected at least one distinctive lyric snippet hint');
});
