const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('shared playlist tail excludes the local set once, then rebuilds forever',()=>{
  const storage=new Map();
  const window={};
  const context=vm.createContext({window,location:{search:'',origin:'https://callmedaddy.musicsubject.com',href:'https://callmedaddy.musicsubject.com/music/'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},crypto:{getRandomValues:values=>{values[0]=123;values[1]=456;return values;}},URL,URLSearchParams,Date,Math,Uint32Array});
  ['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','catalog-cycle.js','playlist-radio.js'].forEach(file=>vm.runInContext(read(file),context,{filename:file}));
  const excluded=['find-your-people','cut-from-the-same-fabric-instrumental','hell-has-people-too'];
  const controller=window.CMDPlaylistRadio.create({excludeIds:excluded,seed:'playlist-tail-test'});
  const first=[];
  first.push(controller.next().songId);
  const firstLength=controller.getState().length;
  while(first.length<firstLength)first.push(controller.next().songId);
  assert.equal(first.some(id=>excluded.includes(id)),false);
  const secondFirst=controller.next();
  assert.ok(secondFirst);
  assert.equal(controller.getState().cycle,2);
  assert.equal(controller.getState().length,firstLength+excluded.length);
});

test('every finite collection player hands its last local song into endless radio',()=>{
  const players={
    'power-pulse-uprising/continuous-player.js':['CMDPlaylistRadio?.create','ensureNext','radio?.next()'],
    'i-wont-let-the-wifi-go/wifi.js':['CMDPlaylistRadio?.create','ensureNext','radio?.next()'],
    'cut-from-the-same-fabric/player.js':['CMDPlaylistRadio?.create',"playbackMode==='radio'",'loadRadio(true)'],
    'old-files-new-tools/player.js':['CMDPlaylistRadio?.create','nextTrack','loadRadio()'],
    'archive/continuous-tail.js':['CMDPlaylistRadio?.create',"audio.addEventListener('ended'",'loadRadio()']
  };
  for(const [file,markers] of Object.entries(players)){
    const source=read(file);
    markers.forEach(marker=>assert.ok(source.includes(marker),`${file} needs ${marker}`));
    assert.ok(!source.includes('End of the current catalog'),`${file} must not stop at a terminal catalog message`);
  }
});

test('collection pages load the radio math before their local player',()=>{
  const pages={
    'power-pulse-uprising/index.html':'/power-pulse-uprising/continuous-player.js',
    'i-wont-let-the-wifi-go/index.html':'/i-wont-let-the-wifi-go/wifi.js',
    'cut-from-the-same-fabric/index.html':'/cut-from-the-same-fabric/player.js',
    'old-files-new-tools/index.html':'/old-files-new-tools/player.js',
    'archive/i-need-love/index.html':'/archive/continuous-tail.js',
    'archive/2010-wows/index.html':'/archive/continuous-tail.js'
  };
  for(const [file,player] of Object.entries(pages)){
    const html=read(file),playerIndex=html.indexOf(player);
    assert.ok(playerIndex>0,`${file} needs its player`);
    ['/data/songs.js','/data/radio-intents.js','/catalog-cycle.js','/playlist-radio.js'].forEach(dependency=>{
      const dependencyIndex=html.indexOf(dependency);
      assert.ok(dependencyIndex>0&&dependencyIndex<playerIndex,`${file} must load ${dependency} first`);
    });
  }
});

test('songs and versions expose direct share controls before update blurbs',()=>{
  const catalog=read('music/music.js');
  assert.ok(catalog.includes('song-share-action'));
  assert.ok(catalog.includes("url.searchParams.set('song',song.id)"));
  assert.ok(catalog.includes("url.searchParams.set('version',variant.id)"));

  const sadCollection=read('sad-music/sad.js');
  const sadSong=read('sad-music/song.js');
  assert.ok(sadCollection.includes('sad-share-song'));
  assert.ok(sadSong.includes('sad-version-share'));

  const antiAi=read('anti-generative-ai-diss/collection.js');
  assert.ok(antiAi.includes('data-share-track'));
  assert.ok(read('new-tools-trilogy.js').includes('trilogyShare'));

  const oldFiles=read('old-files-new-tools/index.html');
  assert.equal((oldFiles.match(/class="(?:tape-play|ab-play)/g)||[]).length,(oldFiles.match(/class="song-share/g)||[]).length);
  assert.ok(read('archive/continuous-tail.js').includes('Share this version'));
});

test('already-endless players remain cyclic',()=>{
  assert.ok(read('music/music.js').includes("audio.addEventListener('ended',()=>{bar.style.width='100%';nextTrack();})"));
  assert.ok(read('sad-music/sad.js').includes('pending=(index+1)%queue.length'));
  assert.ok(read('sad-music/song.js').includes('pending=(index+1)%queue.length'));
  assert.ok(read('new-tools-trilogy.js').includes('if(radioMode){nextRadioTrack();return}'));
});
