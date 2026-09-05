const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('swipe helper exposes CMDSwipeNav.attach',()=>{
  const sandbox={window:{},console};
  vm.createContext(sandbox);
  vm.runInContext(read('swipe-nav.js'),sandbox);
  assert.equal(typeof sandbox.window.CMDSwipeNav.attach,'function');
  assert.equal(typeof sandbox.window.CMDSwipeNav.attachMany,'function');
});

test('swipe defaults favor phone flicks over scrubber collisions',()=>{
  const source=read('swipe-nav.js');
  assert.ok(source.includes('threshold=40'));
  assert.ok(source.includes('touch-action')||source.includes('touchAction'));
  assert.ok(!source.includes(', img'));
  assert.ok(source.includes('tactile-scrubber'));
});

test('music page loads swipe helper before music.js',()=>{
  const html=read('music/index.html');
  const swipeAt=html.indexOf('/swipe-nav.js');
  const musicAt=html.indexOf('/music/music.js');
  assert.ok(swipeAt>0);
  assert.ok(musicAt>swipeAt);
  assert.ok(html.includes('Swipe cover'));
});

test('music.js wires swipe to previous and nextTrack on cover targets',()=>{
  const source=read('music/music.js');
  assert.ok(source.includes('CMDSwipeNav'));
  assert.ok(source.includes('onPrev:previous'));
  assert.ok(source.includes('onNext:nextTrack'));
  assert.ok(source.includes('catalog-player-inner'));
  assert.ok(source.includes('threshold:40'));
});
