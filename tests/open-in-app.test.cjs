const test=require('node:test'),assert=require('node:assert/strict');
const links=require('../app/open-in-app.js');
const model=require('../android/app/src/main/assets/catalog-model.js');
const catalog=[{id:'this-is-my-story',audio:'/remix.mp3',experience:'/this-is-my-story/',variants:[{id:'main',audio:'/remix.mp3'},{id:'gospel',audio:'/gospel.mp3'}]},{id:'other',audio:'/other.mp3'}];
test('browser to Android preserves the playing source, version and position rather than the visible page',()=>{
  const request=links.target({track:{songId:'this-is-my-story',variantId:'gospel'},media:{currentTime:87.25},url:'https://callmedaddy.musicsubject.com/other/?version=main',pageSongId:'other',catalog});
  const href=links.intent(request),url=new URL(href.replace(/^intent:/,'musicsubject:').split('#')[0]);
  const incoming=Object.fromEntries(url.searchParams),queue=model.requestedQueue(catalog,incoming);
  assert.equal(queue[0].audio,model.SITE+'/gospel.mp3');assert.equal(incoming.t,'87.3');assert.match(href,/package=com\.musicsubject\.player;/);
  const fallback=new URL(decodeURIComponent(href.match(/S.browser_fallback_url=([^;]+)/)[1]));
  assert.equal(fallback.pathname,'/app/');assert.equal(fallback.searchParams.get('song'),request.song);assert.equal(fallback.searchParams.get('version'),'gospel');
});
test('unplayed song pages use their selected version; generic pages open the app without starting an unrelated song',()=>{
  const selected=links.target({url:'https://callmedaddy.musicsubject.com/this-is-my-story/?version=gospel',pageSongId:'this-is-my-story',catalog});
  assert.equal(model.requestedQueue(catalog,selected)[0].variantId,'gospel');
  assert.equal(links.target({url:'https://callmedaddy.musicsubject.com/updates/',catalog}).song,'');
  const variantCatalog=[{id:'old',audio:'/original.mp3',experience:'/old/',variants:[{id:'original',audio:'/original.mp3'}]}];
  assert.equal(links.target({url:'https://callmedaddy.musicsubject.com/old/',catalog:variantCatalog}).version,'original');
});
test('invalid ids cannot inject intent directives and unavailable recordings never fall back to another version',()=>{
  assert.equal(model.requestedQueue(catalog,{song:'this-is-my-story',version:'missing'}).length,0);
  assert.equal(model.requestedQueue(catalog,{song:'not-in-catalog',version:'main'}).length,0);
  const href=links.intent({song:'x;package=evil',version:'main',t:Infinity});
  assert.doesNotMatch(href,/package=evil/);assert.equal(links.seconds(-5),0);assert.equal(links.seconds(Infinity),0);
});
test('finished playback opens the recording from its beginning',()=>{
  assert.equal(links.target({track:{songId:'this-is-my-story'},media:{currentTime:196,ended:true},url:model.SITE}).t,0);
});
