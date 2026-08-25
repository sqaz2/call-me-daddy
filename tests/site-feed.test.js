const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/songs.js'), 'utf8'), sandbox, { filename: 'data/songs.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'data/briefing.js'), 'utf8'), sandbox, { filename: 'data/briefing.js' });

const songs = sandbox.window.CMD_SONGS;
const feed = sandbox.window.CMD_BRIEFING;

const safeId = /^[a-z0-9][a-z0-9-]*$/;
const acceptedDate = /^\d{4}-\d{2}(?:-\d{2}(?:T.*)?)?$/;

test('catalog and public feed load', () => {
  assert.ok(Array.isArray(songs) && songs.length > 0, 'CMD_SONGS must contain songs');
  assert.ok(feed && Array.isArray(feed.entries) && feed.entries.length > 0, 'CMD_BRIEFING must contain entries');
});

test('feed ids are unique and safe for share URLs', () => {
  const ids = feed.entries.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'feed entry ids must be unique');
  ids.forEach(id => assert.match(id, safeId));
});

test('feed dates preserve known precision', () => {
  feed.entries.forEach(entry => {
    assert.ok(entry.published, `${entry.id} needs a published value`);
    assert.match(entry.published, acceptedDate, `${entry.id} has an unsupported published value`);
  });
});

test('song-backed updates point at real catalog songs', () => {
  const songIds = new Set(songs.map(song => song.id));
  feed.entries.filter(entry => entry.songId).forEach(entry => {
    assert.ok(songIds.has(entry.songId), `${entry.id} points at missing song ${entry.songId}`);
  });
});

test('featured release order is explicit and collision-free', () => {
  const featured = feed.entries.filter(entry => entry.featured);
  const orders = featured.map(entry => entry.featuredOrder);
  assert.ok(featured.length > 0, 'at least one featured release is required');
  featured.forEach(entry => assert.ok(Number.isInteger(entry.featuredOrder) && entry.featuredOrder > 0, `${entry.id} needs a positive integer featuredOrder`));
  assert.equal(new Set(orders).size, orders.length, 'featuredOrder values must be unique');
});

test('song catalog ids are unique', () => {
  const ids = songs.map(song => song.id);
  assert.equal(new Set(ids).size, ids.length, 'song ids must be unique');
});
