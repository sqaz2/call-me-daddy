import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSongSocial } from '../scripts/build-song-social.mjs';
import { resolveSocial, rewriteHead, readHead, routePath, imageURL, ORIGIN } from '../song-social.mjs';
const old = { title: 'Animal — earlier mix', description: 'Earlier recording', image: ORIGIN + '/old.jpg', type: 'music.song' };
const latest = { title: 'Make Me an Animal v6', description: 'MusicSubject & Call Me Daddy', image: ORIGIN + '/lion.png?art=123', width: 928, height: 1648, imageType: 'image/png', type: 'music.song' };
const data = { schemaVersion: 1, songs: { animal: { defaultVersion: 'v6', versions: { old, v6: latest } } }, pages: { '/animal-v6/': { ...latest, songId: 'animal', canonical: ORIGIN + '/animal-v6/' } } };
const html = `<!doctype html><html><head><title>Wrong</title><meta property="og:image" content="${ORIGIN}/fabric.png"><meta name='twitter:image' content='wrong'><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel='canonical' href='${ORIGIN}/music/'><meta property='og:image:width' content='600'><script>const sample = '<meta property="og:image" content="do not edit JavaScript">';</script></head><body>Untouched player</body></html>`;

test('exact version selects artwork and canonical does not collapse to /music/', () => {
  const record = resolveSocial('/music/?song=animal&version=v6&share=1&fbclid=test', data);
  assert.equal(record.image, latest.image);
  assert.equal(record.canonical, ORIGIN + '/music/?song=animal&version=v6');
  assert.notEqual(record.canonical, resolveSocial('/music/?song=animal&version=old', data).canonical);
});
test('earlier versions retain their original cover', () => assert.equal(resolveSocial('/music/?song=animal&version=old', data).image, old.image));
test('social artwork overrides preserve playback covers and other recordings keep their own artwork', () => {
  const catalog = [{
    id: 'social-artwork-fixture', title: 'Social artwork fixture', audio: '/main.mp3',
    cover: '/family-portrait.jpg', socialImage: '/family-landscape.jpg',
    variants: [
      { id: 'main', audio: '/main.mp3', cover: '/main-portrait.jpg', socialImage: '/main-landscape.jpg' },
      { id: 'alternate', audio: '/alternate.mp3', cover: '/alternate-portrait.jpg' },
      { id: 'family', audio: '/family.mp3' }
    ]
  }, {
    id: 'legacy-artwork-fixture', title: 'Legacy artwork fixture', audio: '/legacy.mp3', cover: '/legacy-portrait.jpg'
  }];
  const playbackCatalog = structuredClone(catalog);
  const built = buildSongSocial({ catalog, write: false });
  const preview = version => resolveSocial(`/music/?song=social-artwork-fixture&version=${version}`, built);

  assert.equal(preview('main').image, ORIGIN + '/main-landscape.jpg');
  assert.equal(preview('alternate').image, ORIGIN + '/alternate-portrait.jpg', 'a recording with its own cover must not inherit the main or family social image');
  assert.equal(preview('family').image, ORIGIN + '/family-landscape.jpg');
  assert.equal(resolveSocial('/music/?song=legacy-artwork-fixture&version=main', built).image, ORIGIN + '/legacy-portrait.jpg');
  assert.deepEqual(catalog, playbackCatalog, 'building social metadata must preserve the portrait covers and audio used by playback');
});
test('dedicated pages and version selectors resolve without changing playback', () => {
  assert.equal(resolveSocial('/animal-v6/index.html', data).image, latest.image);
  assert.equal(resolveSocial('/animal-v6/?version=old', data).image, old.image);
});
test('unknown song/version/prototype identifiers are never treated as recordings', () => {
  for (const value of ['/music/?song=__proto__', '/music/?song=toString', '/music/?song=missing', '/music/?song=animal&version=bad']) assert.equal(resolveSocial(value, data), null);
});
test('rendered HTML contains one correct social image, favicon and exact canonical before JS', () => {
  const record = resolveSocial('/music/?song=animal&version=v6', data);
  const output = rewriteHead(html, record);
  const head = readHead(output);
  assert.equal(head.image, latest.image); assert.equal(head.canonical, record.canonical);
  assert.equal(head.description, latest.description);
  assert.ok(output.includes(`<link rel="icon" href="${latest.image.replace('&', '&amp;')}">`));
  assert.ok(output.includes('content="928"')); assert.ok(output.includes('content="1648"'));
  assert.ok(output.includes('Untouched player')); assert.ok(output.includes('do not edit JavaScript'));
  assert.ok(!output.includes('fabric.png')); assert.ok(!output.includes('favicon.svg'));
});
test('rewriting is idempotent and preserves scripts/body', () => {
  const record = resolveSocial('/music/?song=animal&version=v6', data), once = rewriteHead(html, record);
  assert.equal(rewriteHead(once, record), once);
  assert.equal(once.split('</head>')[1], html.split('</head>')[1]);
});
test('quotes, HTML characters and non-HTTPS artwork are handled safely', () => {
  assert.equal(imageURL('javascript:alert(1)'), '');
  const output = rewriteHead(html, { ...latest, title: 'A "B" <C>', canonical: ORIGIN + '/?song=a&version=b' });
  assert.equal(readHead(output).title, 'A "B" <C>');
  assert.ok(!output.includes('<C>'));
  assert.equal(routePath('/music'), '/music/');
});
