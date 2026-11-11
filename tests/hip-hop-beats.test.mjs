import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog } from '../scripts/sync-song-links.mjs';
import { hipHopBeats } from '../beats/model.mjs';
import { buildLibraryCatalog } from '../library/catalog.mjs';
import { buildSongSocial } from '../scripts/build-song-social.mjs';
import { resolveSocial } from '../song-social.mjs';

const catalog = loadCatalog(), beats = hipHopBeats(catalog);
test('the beat collection uses explicit recording tags, retains song identity and preserves uploaded bytes', () => {
  assert.equal(beats.length, 1);
  const beat = beats[0], song = catalog.find(s => s.id === beat.songId);
  assert.equal(beat.songId, 'running-a-monopoly');
  assert.equal(beat.variantId, 'rap-beat');
  assert.equal(song.variants[0].id, 'main');
  assert.notEqual(beat.audio, song.audio);
  assert.deepEqual(fs.readFileSync('.' + beat.audio), fs.readFileSync('call-me-daddy-voice-running-a-monopoly-vocals.mp3'));
  assert.deepEqual(hipHopBeats([{ id: 'a', title: 'Rap beat', variants: [{ id: 'main', audio: '/vocal.mp3', kind: 'Hip-hop' }] }]), []);
});
test('beat shares and social previews identify the exact recording and carry the rapper question', () => {
  const links = JSON.parse(fs.readFileSync('data/song-links.json'));
  const row = links.rows.find(r => r.songId === beats[0].songId && r.version === 'rap-beat');
  assert.equal(row.genre, 'hiphop');
  assert.equal(row.shareCategory, 'music');
  assert.equal(row.target, beats[0].experience);
  assert.match(row.share.text, /What rapper—or rappers—would MURDER this beat/);
  const main = links.rows.find(r => r.songId === beats[0].songId && r.version === 'main');
  assert.equal(main.number, row.number);
  assert.equal(main.slot, 1);
  assert.equal(row.slot, 2);
  assert.equal(main.shareCategory, 'jokes');
  const social = resolveSocial(new URL(row.target, 'https://callmedaddy.musicsubject.com'), buildSongSocial({ write: false }));
  assert.equal(social.version, 'rap-beat');
  assert.match(social.title, /Rap beat/);
  assert.match(social.description, /dream lineup/);
});
test('supervisor discovery keeps the beat instrumental and the original freestyle lyrical and comedic', () => {
  const song = buildLibraryCatalog(catalog, [], { lyrics: { 'running-a-monopoly': { search: 'A fucking McShit.' } } }).find(s => s.id === beats[0].songId);
  const beat = song.tracks.find(t => t.variantId === 'rap-beat'), vocal = song.tracks.find(t => t.variantId === 'main');
  assert.equal(beat.vocals, 'instrumental');
  assert.equal(beat.lyricsAvailable, false);
  assert.deepEqual(beat.flags, []);
  assert.ok(beat.groups.includes('hiphop') && beat.groups.includes('high-energy'));
  assert.ok(!beat.groups.includes('comedy'));
  assert.ok(beat.facts.seconds > 230 && beat.facts.seconds < 231);
  assert.equal(vocal.vocals, 'vocal');
  assert.ok(vocal.groups.includes('comedy'));
});
