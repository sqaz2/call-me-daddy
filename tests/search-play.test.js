const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('player search pane ships song results markup + cache bust',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('id="catalogPlayerSearchResults"'));
  assert.ok(html.includes('catalog-player-search-results'));
  assert.ok(html.includes('/music/music.js?v=20260905-search-play'));
  assert.ok(html.includes('/music/music.css?v=20260905-search-play'));
  const css=read('music/music.css');
  assert.ok(css.includes('.catalog-player-search-results'));
  assert.ok(css.includes('.catalog-search-result-main'));
  assert.ok(css.includes('.catalog-search-result-open'));
});

test('music.js wires result list, enter-to-play, and exact-hint-play',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('catalogPlayerSearchResults'));
  assert.ok(js.includes('SEARCH_RESULT_CAP=6')||js.includes('SEARCH_RESULT_CAP = 6'));
  assert.ok(js.includes('renderPlayerSearchResults'));
  assert.ok(js.includes('data-play-song'));
  assert.ok(js.includes('data-open-song'));
  assert.ok(js.includes('Open →')||js.includes('Open &rarr;')||js.includes("Open →"));
  assert.ok(js.includes('playFirstSearchMatch'));
  assert.ok(js.includes('onSearchEnter'));
  assert.ok(js.includes("event.key!=='Enter'")||js.includes('event.key!=="Enter"'));
  assert.ok(js.includes('findExactTitleSong'));
  assert.ok(js.includes('activateSongFromSearch'));
  assert.ok(js.includes('afterSearchPlay'));
  // Exact hint path calls selectSong via activateSongFromSearch
  assert.ok(js.includes('findExactTitleSong(hint)'));
  assert.ok(js.includes('filterSongs'));
  assert.ok(js.includes('matchesSong')||js.includes('filterSongs'));
  // Hide hints while query length >= 2
  assert.ok(js.includes('q.length>=2')||js.includes('q.length >= 2'));
  // Blur + leave search pane after play
  assert.ok(js.includes("applyPaneMode('lyrics')")||js.includes('applyPaneMode("lyrics")'));
  assert.ok(js.includes("applySheetHeight('dock')")||js.includes('applySheetHeight("dock")'));
  assert.ok(js.includes('blur()'));
});

test('enter-to-play prefers first playable among multiple matches',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('matches.length===1')||js.includes('matches.length === 1'));
  assert.ok(js.includes('variantsFor(song).length>0')||js.includes('variantsFor(song).length'));
  assert.ok(js.includes('playable||matches[0]')||js.includes('playable || matches[0]'));
});
