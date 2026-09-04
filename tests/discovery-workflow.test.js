const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function catalog(){
  const window={};
  const context=vm.createContext({window,location:{origin:'https://callmedaddy.musicsubject.com'},URL,Date,Number,String,Array,Object,Math});
  [
    'data/songs.js','data/archive-catalog.js','data/radio-intents.js',
    'data/2026-08-25-uploads.js','data/2026-08-26-uploads.js',
    'data/2026-08-27-uploads.js','data/2026-08-29-uploads.js','music/discovery.js'
  ].forEach(file=>vm.runInContext(read(file),context,{filename:file}));
  return {songs:window.CMD_SONGS,discovery:window.CMDMusicDiscovery};
}

test('listener-facing categories replace the project-name maze',()=>{
  const {discovery}=catalog();
  assert.deepEqual(Array.from(discovery.categories(),item=>item.id),[
    'all','laugh','think','level-up','heavy','old-files','story-ready','coming-soon'
  ]);
});

test('the homepage finder receives the complete archive-extended catalog',()=>{
  const html=read('index.html');
  const songs=html.indexOf('/data/songs.js');
  const archive=html.indexOf('/data/archive-catalog.js');
  const discovery=html.indexOf('/music/discovery.js');
  const finder=html.indexOf('/home-discovery.js');
  assert.ok(songs>=0&&archive>songs&&discovery>archive&&finder>discovery);
});

test('search handles remembered fragments, multiple terms and feeling words',()=>{
  const {songs,discovery}=catalog();
  const remembered=Array.from(discovery.filter(songs,{query:'2019 heart'}));
  assert.ok(remembered.length>0);
  remembered.forEach(song=>{
    const haystack=discovery.searchText(song);
    assert.ok(haystack.includes('2019'));
    assert.ok(haystack.includes('heart'));
  });
  const funny=Array.from(discovery.filter(songs,{query:'funny'}));
  assert.ok(funny.some(song=>song.id==='twas-the-tism-mlord'));
  assert.ok(funny.every(song=>discovery.scoreFor(song,'laugh')>=70));
});

test('songs without pages stay playable and get an honest ask-me state',()=>{
  const {songs,discovery}=catalog();
  const unfinished=songs.filter(song=>discovery.playable(song)&&!song.experience);
  assert.ok(unfinished.length>0);
  assert.ok(unfinished.some(song=>song.id==='power-moves-only'));
  assert.ok(unfinished.some(song=>song.id==='fractured-face'));
  unfinished.forEach(song=>{
    const story=discovery.storyState(song);
    assert.equal(story.id,'coming-soon');
    assert.equal(story.label,'Story coming soon');
    assert.equal(story.cta,'Ask me about this song');
    assert.equal(story.href,'https://facebook.com/callmedaddy');
    const exact=new URL(discovery.exactSongUrl(song));
    assert.equal(exact.pathname,'/music/');
    assert.equal(exact.searchParams.get('song'),song.id);
  });
});

test('external-only songs open their declared page instead of a random catalog track',()=>{
  const {songs,discovery}=catalog();
  const external=songs.find(song=>song.youtubeUrl&&!discovery.playable(song));
  assert.ok(external?.experience);
  assert.equal(discovery.exactSongUrl(external),new URL(external.experience,'https://callmedaddy.musicsubject.com').href);
});

test('every declared internal story route exists on disk',()=>{
  const {songs}=catalog();
  songs.filter(song=>song.experience?.startsWith('/')).forEach(song=>{
    const route=song.experience.split(/[?#]/)[0].replace(/^\//,'');
    const target=route.endsWith('/')?path.join(root,route,'index.html'):path.join(root,route);
    assert.ok(fs.existsSync(target),`${song.id} points at missing story route ${song.experience}`);
  });
});

test('every persistent site page loads the cache-busted universal transport',()=>{
  const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()&&!entry.name.startsWith('.')?walk(path.join(directory,entry.name)):entry.isFile()&&entry.name.endsWith('.html')?[path.join(directory,entry.name)]:[]);
  const pages=walk(root).filter(file=>fs.readFileSync(file,'utf8').includes('/persistent-site-browser.js'));
  assert.ok(pages.length>0);
  pages.forEach(file=>{
    const html=fs.readFileSync(file,'utf8');
    const persistent=html.indexOf('/persistent-site-browser.js?v=20260904-1');
    const universal=html.indexOf('/universal-player.js?v=20260904-1');
    assert.ok(persistent>=0,`${path.relative(root,file)} has a stale persistent player URL`);
    assert.ok(universal>persistent,`${path.relative(root,file)} must load the universal player after persistence`);
  });
});

test('custom player families register with the universal transport',()=>{
  const adapters=[
    'music/music.js','new-tools-trilogy.js','concrete-under-evergreens/player.js',
    'cut-from-the-same-fabric/player.js','old-files-new-tools/player.js','archive/continuous-tail.js'
  ];
  adapters.forEach(file=>assert.match(read(file),/CMDUniversalPlayer\?\.connect/,`${file} needs a universal adapter`));
  ['anti-generative-ai-diss/index.html','back-to-sticks/index.html','level-up/index.html','the-musician-police/index.html'].forEach(file=>{
    const html=read(file);
    const universal=html.indexOf('/universal-player.js?v=20260904-1');
    const player=html.indexOf('/new-tools-trilogy.js?v=20260904-1');
    assert.ok(universal>=0&&player>universal,`${file} must load the universal transport before its dynamic player`);
  });
  assert.ok(!read('funhouse-meltdown/index.html').includes('id="funhouseAudio" controls'));
});
