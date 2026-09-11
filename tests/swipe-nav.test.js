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

function gestureEnvironment(pointer=true){
  const handlers=new Map(),moves=[];
  const target={style:{setProperty(){}},addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type),setPointerCapture(){},closest:()=>null};
  const window=pointer?{PointerEvent:function(){}}:{};
  vm.runInNewContext(read('swipe-nav.js'),{window});
  const cleanup=window.CMDSwipeNav.attach({target,nudge:false,onNext:()=>moves.push('next'),onPrev:()=>moves.push('previous')});
  const emit=(type,extra={})=>handlers.get(type)?.({target,pointerId:1,pointerType:'touch',clientX:200,clientY:100,preventDefault(){},stopImmediatePropagation(){},...extra});
  return {emit,handlers,moves,cleanup,target};
}
test('a phone swipe changes one song and suppresses the generated click',()=>{
  const g=gestureEnvironment();g.emit('pointerdown');g.emit('pointermove',{clientX:100});g.emit('pointerup',{clientX:80});
  // Browsers supporting Pointer Events also dispatch touch events.
  g.emit('touchstart',{touches:[{clientX:200,clientY:100}]});g.emit('touchend',{changedTouches:[{clientX:80,clientY:100}]});
  assert.deepEqual(g.moves,['next']);
  let stopped=0;g.emit('click',{preventDefault:()=>stopped++,stopImmediatePropagation:()=>stopped++});assert.equal(stopped,2);
  g.emit('pointerdown');g.emit('pointerup',{clientX:205});g.emit('click',{preventDefault:()=>stopped++});assert.equal(stopped,2,'An ordinary tap must still work');
  g.cleanup();assert.equal(g.handlers.size,0);
});
test('vertical movement, scrubbing and cancelled touches do not skip tracks',()=>{
  const g=gestureEnvironment();g.emit('pointerdown');g.emit('pointerup',{clientX:140,clientY:230});
  g.emit('pointerdown',{target:{closest:()=>({})}});g.emit('pointerup',{clientX:70});
  g.emit('pointerdown');g.emit('pointercancel');g.emit('pointerup',{clientX:70});
  g.emit('pointerdown');g.emit('pointerdown',{isPrimary:false,pointerId:2});g.emit('pointerup',{clientX:70});
  assert.deepEqual(g.moves,[]);
  g.emit('pointerdown');g.emit('pointerup',{clientX:280});assert.deepEqual(g.moves,['previous']);
});
test('touch fallback handles swipes without pointer support and rejects two-finger gestures',()=>{
  const g=gestureEnvironment(false);g.emit('touchstart',{touches:[{clientX:200,clientY:100}]});g.emit('touchend',{changedTouches:[{clientX:100,clientY:100}]});
  g.emit('touchstart',{touches:[{clientX:200,clientY:100},{clientX:210,clientY:100}]});g.emit('touchend',{changedTouches:[{clientX:100,clientY:100}]});
  assert.deepEqual(g.moves,['next']);assert.equal(g.handlers.has('pointerdown'),false);
});
