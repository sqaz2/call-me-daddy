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

test('song-lyrics entries expose lyrics + sunoUrl helpers',()=>{
  const {window}=loadScripts(['data/song-lyrics.js']);
  const ids=Object.keys(window.CMD_SONG_LYRICS||{});
  assert.ok(ids.length>=40,'expected a full lyrics map');
  assert.equal(typeof window.CMDSongLyrics?.get,'function');
  assert.equal(typeof window.CMDSongLyrics?.sunoUrl,'function');
  assert.equal(typeof window.CMDSongLyrics?.lyrics,'function');

  let withBoth=0;
  ids.forEach(id=>{
    const entry=window.CMD_SONG_LYRICS[id];
    assert.ok(entry&&typeof entry.lyrics==='string',`${id} missing lyrics`);
    assert.ok(entry.sunoUrl&&entry.sunoUrl.includes('suno.com'),`${id} missing sunoUrl`);
    assert.equal(window.CMDSongLyrics.lyrics(id),entry.lyrics);
    assert.equal(window.CMDSongLyrics.sunoUrl(id),entry.sunoUrl);
    if(entry.lyrics.trim()&&entry.sunoUrl)withBoth+=1;
  });
  assert.ok(withBoth>=40,'expected most songs to have on-site lyrics and Suno links');

  const pick=window.CMD_SONG_LYRICS['id-pick-you-first'];
  assert.ok(pick.lyrics.toLowerCase().includes('booger'));
  assert.ok(pick.sunoUrl.startsWith('https://suno.com/song/'));
});

test('music page wires lyrics UI hooks and cache-busted scripts',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('id="catalogLyrics"'));
  assert.ok(html.includes('data-lyrics-panel'));
  assert.ok(html.includes('id="catalogLyricsToggle"'));
  assert.ok(html.includes('id="catalogLyricsBody"'));
  assert.ok(html.includes('data-lyrics-body'));
  assert.ok(html.includes('Lyrics on Suno'));
  assert.ok(html.includes('/data/song-lyrics.js?v=20260905-lyrics-ui'));
  assert.ok(html.includes('/music/music.js?v=20260905-lyrics-ui'));
  assert.ok(html.includes('/music/music.css?v=20260905-lyrics-ui'));
  const lyricsIdx=html.indexOf('/data/song-lyrics.js');
  const musicIdx=html.indexOf('/music/music.js');
  assert.ok(lyricsIdx>=0&&musicIdx>lyricsIdx);
});

test('music.js resolves Suno from song or lyrics map and formats lyrics safely',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('resolveSunoUrl'));
  assert.ok(js.includes('resolveLyrics'));
  assert.ok(js.includes('formatLyricsHtml'));
  assert.ok(js.includes('renderPlayerLyrics'));
  assert.ok(js.includes('song-lyrics-details'));
  assert.ok(js.includes('Lyrics on Suno'));
  assert.ok(js.includes('lyric-tag'));
  assert.ok(js.includes("safe(text)"));
  // Prefer song.sunoUrl when present
  assert.ok(js.includes('if(song?.sunoUrl)return String(song.sunoUrl)'));
});

test('lyric search still finds booger → id-pick-you-first',()=>{
  const {window}=loadScripts(['data/song-lyrics.js','catalog-search.js']);
  const songs=[
    {id:'id-pick-you-first',title:"I'd Pick You First",project:'Call Me Daddy',kind:'Single'},
    {id:'armando',title:'Armando',project:'Armando',kind:'Single'}
  ];
  const hit=window.CMDCatalogSearch.filterSongs(songs,'booger');
  assert.equal(hit.length,1);
  assert.equal(hit[0].id,'id-pick-you-first');
});
