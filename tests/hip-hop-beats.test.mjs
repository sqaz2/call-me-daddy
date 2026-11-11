import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog } from '../scripts/sync-song-links.mjs';
import { hipHopBeats } from '../beats/model.mjs';
import { buildLibraryCatalog } from '../library/catalog.mjs';

const catalog = loadCatalog();
test('beats require an explicit published recording tag and never follow filenames or song titles', () => {
  const songs = [{ id: 'fixture', title: 'Rap beat', audio: '/vocal.mp3', variants: [
    { id: 'main', audio: '/vocal.mp3', kind: 'Hip-hop' },
    { id: 'beat', collection: 'hip-hop-beats', audio: '/confirmed-beat.mp3', label: 'Rap beat', video: '/confirmed-video.mp4' }
  ] }];
  const beats = hipHopBeats(songs);
  assert.equal(beats.length, 1);
  assert.equal(beats[0].songId, 'fixture');
  assert.equal(beats[0].variantId, 'beat');
  assert.equal(beats[0].audio, '/confirmed-beat.mp3');
  assert.equal(beats[0].video, '/confirmed-video.mp4');
  assert.equal(beats[0].experience, '/beats/?song=fixture&version=beat');
  assert.equal(songs[0].audio, '/vocal.mp3');
});
test('the mistaken Monopoly beat is withdrawn and its share slot stays reserved', () => {
  assert.ok(!hipHopBeats(catalog).some(t => t.songId === 'running-a-monopoly'));
  const song = catalog.find(s => s.id === 'running-a-monopoly');
  assert.deepEqual(song.variants.map(v => v.id), ['main']);
  const registry = JSON.parse(fs.readFileSync('content/song-links.json'));
  const saved = registry.songs.find(s => s.songId === song.id);
  assert.deepEqual(saved.versions, ['main', 'rap-beat']);
  const links = JSON.parse(fs.readFileSync('data/song-links.json'));
  assert.ok(!links.rows.some(r => r.number === saved.number && r.slot === 2));
  assert.ok(!fs.existsSync('updates/release-running-a-monopoly-rap-beat/index.html'));
});
test('the supervisor library retains the original freestyle without an invented instrumental', () => {
  const song = buildLibraryCatalog(catalog, [], { lyrics: { 'running-a-monopoly': { search: 'A fucking McShit.' } } }).find(s => s.id === 'running-a-monopoly');
  assert.equal(song.tracks.length, 1);
  const vocal = song.tracks[0];
  assert.equal(vocal.variantId, 'main');
  assert.equal(vocal.vocals, 'vocal');
  assert.ok(vocal.groups.includes('comedy'));
});
