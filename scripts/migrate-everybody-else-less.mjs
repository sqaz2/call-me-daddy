// One-time migration on the isolated release branch. All other music stays unchanged.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const ID='everybody-else-less',read=p=>fs.readFileSync(p,'utf8');
const load=p=>{const c={window:{}};vm.runInNewContext(read(p),c);return JSON.parse(JSON.stringify(c.window))};
const beforeSongs=load('data/songs.js').CMD_SONGS.filter(s=>s.id!==ID);
const beforeLyrics=load('data/song-lyrics.js').CMD_SONG_LYRICS;
const incoming=JSON.parse(read('content/releases/2026-08-everybody-else-less.json'));
assert.equal(beforeLyrics[ID].lyrics,incoming.lyrics.text,'Released lyrics must not change');
delete beforeLyrics[ID];
const edits=[
 ['data/songs.js',/^  \{\n    id:'everybody-else-less',[\s\S]*?^  \},\n/m],
 ['data/song-lyrics.js',/^    "everybody-else-less":.*\n/m],
 ['data/radio-intents.js',/^    'everybody-else-less':.*\n/m]
];
for(const [file,pattern] of edits){const text=read(file);fs.writeFileSync(file,text.replace(pattern,''))}
execFileSync(process.execPath,['scripts/sync-releases.mjs'],{stdio:'inherit'});
const afterSongs=load('data/songs.js').CMD_SONGS;
assert.equal(afterSongs.filter(s=>s.id===ID).length,1,'Duplicate song identity');
assert.deepEqual(afterSongs.filter(s=>s.id!==ID),beforeSongs,'Unrelated songs changed');
const afterLyrics=load('data/song-lyrics.js').CMD_SONG_LYRICS;
assert.equal(afterLyrics[ID].lyrics,incoming.lyrics.text);delete afterLyrics[ID];
assert.deepEqual(afterLyrics,beforeLyrics,'Unrelated lyrics changed');
console.log('One manifest identity; unchanged source URLs; all unrelated song and lyric objects unchanged.');
