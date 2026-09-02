import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const manifests = fs.readdirSync(path.join(root, 'content', 'releases'))
  .filter(name => name.endsWith('.json') && !name.startsWith('_'))
  .map(name => JSON.parse(read(`content/releases/${name}`)));

test('release manifests and generated site data are synchronized', () => {
  const result = childProcess.spawnSync(process.execPath, ['scripts/sync-releases.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('one manifest reaches catalog, homepage feed, radio, sharing and sitemap', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of ['data/songs.js', 'data/briefing.js', 'data/radio-intents.js']) {
    vm.runInContext(read(file), sandbox, { filename: file });
  }

  for (const manifest of manifests) {
    const song = sandbox.window.CMD_SONGS.find(item => item.id === manifest.song.id);
    const update = sandbox.window.CMD_BRIEFING.entries.find(item => item.id === manifest.update.id);
    assert.ok(song, `${manifest.song.id} is missing from Music`);
    assert.ok(update, `${manifest.update.id} is missing from Home and Updates`);
    assert.equal(update.featured, true, `${manifest.update.id} must reach the homepage release grid`);
    assert.ok(Number.isInteger(update.featuredOrder) && update.featuredOrder > 0);
    assert.deepEqual(
      Object.keys(sandbox.window.CMD_RADIO_CONFIG.profiles[manifest.song.id]).sort(),
      ['heavy', 'laugh', 'level-up', 'old-files', 'surprise', 'think'].sort()
    );
    assert.ok(fs.existsSync(path.join(root, 'updates', manifest.update.id, 'index.html')));
    assert.ok(read('sitemap.xml').includes(`https://callmedaddy.musicsubject.com${manifest.update.sharePath}`));
    assert.ok(read('sitemap.xml').includes(`https://callmedaddy.musicsubject.com${manifest.song.experience}`));
  }
});

test('Home, Music and Updates all load their canonical generated sources before rendering', () => {
  const contracts = {
    'index.html': ['/data/songs.js', '/data/briefing.js', '/home-briefing.js'],
    'music/index.html': ['/data/songs.js', '/music/music.js'],
    'updates/index.html': ['/data/songs.js', '/data/briefing.js', '/updates/updates.js']
  };
  for (const [file, dependencies] of Object.entries(contracts)) {
    const html = read(file);
    const positions = dependencies.map(dependency => html.indexOf(dependency));
    positions.forEach((position, index) => assert.ok(position >= 0, `${file} needs ${dependencies[index]}`));
    assert.deepEqual([...positions].sort((left, right) => left - right), positions, `${file} loads release data too late`);
  }
});

test('new dated upload patches cannot bypass the release manifest workflow', () => {
  const forbidden = fs.readdirSync(path.join(root, 'data'))
    .filter(name => /^\d{4}-\d{2}-\d{2}-uploads\.js$/.test(name))
    .filter(name => name.slice(0, 10) >= '2026-09-02');
  assert.deepEqual(forbidden, []);
});

test('featured homepage cards are newest-first', () => {
  const source = read('home-briefing.js');
  assert.ok(source.includes('const byDate = dateScore(b.published) - dateScore(a.published)'));
  assert.ok(source.includes('return byDate ||'));
});
