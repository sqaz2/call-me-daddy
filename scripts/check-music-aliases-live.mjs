import assert from 'node:assert/strict';

const origin = 'https://callmedaddy.musicsubject.com';
const aliases = [
  ['satans.loan', ['/music', '/music/'], `${origin}/satans-loan/`],
  ['music.frigging.link', ['/', '/music', '/music/'], `${origin}/`],
  ['music.fricking.link', ['/', '/music', '/music/'], `${origin}/`]
];
const results = await Promise.allSettled(aliases.flatMap(([host, paths, target]) => paths.map(async path => {
  const source = `https://${host}${path}`;
  const response = await fetch(source, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  assert.equal(response.status, 302, `${source}: HTTP ${response.status}, location ${response.headers.get('location')}`);
  assert.equal(response.headers.get('location'), target, `${source}: wrong destination`);
  console.log(`PASS ${source} -> ${target}`);
})));
for (const result of results) {
  if (result.status === 'rejected') {
    console.error(result.reason.message, result.reason.cause?.code || '');
    process.exitCode = 1;
  }
}
