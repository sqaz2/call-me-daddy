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
  ['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','catalog-cycle.js','playlist-radio.js'].forEach(file=>vm.runInContext(read(file),context,{filename:file}));
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
    'power-pulse-uprising/continuous-player.js':['CMDContinuousPlayback.create',"tracks:[chosen,earlier]",'excludeIds:[chosen.id,earlier.id]'],
    'i-wont-let-the-wifi-go/wifi.js':['CMDContinuousPlayback.create','tracks:[self]','excludeIds:[self.id]'],
    'cut-from-the-same-fabric/player.js':['CMDPlaylistRadio?.create',"playbackMode==='radio'",'loadRadio(true)'],
    'old-files-new-tools/player.js':['CMDPlaylistRadio?.create','nextTrack','loadRadio()'],
    'archive/continuous-tail.js':['CMDPlaylistRadio?.create',"audio.addEventListener('ended'",'loadRadio()'],
    'concrete-under-evergreens/player.js':['CMDPlaylistRadio?.create','ensureNext','radio?.next()']
  };
  for(const [file,markers] of Object.entries(players)){
    const source=read(file);
    markers.forEach(marker=>assert.ok(source.includes(marker),`${file} needs ${marker}`));
    assert.ok(!source.includes('End of the current catalog'),`${file} must not stop at a terminal catalog message`);
  }
});

test('single-release pages no longer stop after their opening song',()=>{
  const players={
    'namaste-hamster/namaste.js':'namaste-endless-player',
    'id-pick-you-first/player.js':'pick-endless-player',
    'funhouse-meltdown/player.js':'funhouse-endless-player'
  };
  for(const [file,id] of Object.entries(players)){
    const source=read(file);
    assert.ok(source.includes('CMDContinuousPlayback.create'),`${file} needs the continuous player`);
    assert.ok(source.includes(id),`${file} needs a stable recovery id`);
    assert.ok(!source.includes("textContent='Finished'"),`${file} must not end at Finished`);
  }
});

test('collection pages load the radio math before their local player',()=>{
  const pages={
    'power-pulse-uprising/index.html':'/power-pulse-uprising/continuous-player.js',
    'i-wont-let-the-wifi-go/index.html':'/i-wont-let-the-wifi-go/wifi.js',
    'cut-from-the-same-fabric/index.html':'/cut-from-the-same-fabric/player.js',
    'old-files-new-tools/index.html':'/old-files-new-tools/player.js',
    'archive/i-need-love/index.html':'/archive/continuous-tail.js',
    'archive/2010-wows/index.html':'/archive/continuous-tail.js',
    'concrete-under-evergreens/index.html':'/concrete-under-evergreens/player.js',
    'namaste-hamster/index.html':'/namaste-hamster/namaste.js',
    'id-pick-you-first/index.html':'/id-pick-you-first/player.js',
    'funhouse-meltdown/index.html':'/funhouse-meltdown/player.js'
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

  const nowPlaying=read('music/now-playing-share.js');
  assert.ok(nowPlaying.includes("song?.shareUrl||song?.experience"));
  assert.ok(nowPlaying.includes(".song-share-action"));
  assert.ok(nowPlaying.includes('songShareUrl(song,variant)'));

  const sharedRadio=read('playlist-radio.js');
  assert.ok(sharedRadio.includes("track?.shareUrl||track?.experience"));

  const sadCollection=read('sad-music/sad.js');
  const sadSong=read('sad-music/song.js');
  assert.ok(sadCollection.includes('sad-share-song'));
  assert.ok(sadSong.includes('sad-version-share'));

  const antiAi=read('anti-generative-ai-diss/collection.js');
  assert.ok(antiAi.includes('data-share-track'));
  assert.ok(read('new-tools-trilogy.js').includes('trilogyShare'));

  const concrete=read('concrete-under-evergreens/index.html');
  assert.ok(concrete.includes('data-share-label="Send thoughts &amp; bass"'));
  assert.ok(concrete.includes('id="concretePlayerShare"'));
  assert.ok(concrete.includes('concrete-under-evergreens/cover.png'));
  assert.ok(concrete.includes('og:image:type" content="image/png"'));

  const oldFiles=read('old-files-new-tools/index.html');
  assert.equal((oldFiles.match(/class="(?:tape-play|ab-play)/g)||[]).length,(oldFiles.match(/class="song-share/g)||[]).length);
  assert.ok(read('archive/continuous-tail.js').includes('Share this version'));
});

test('already-endless players remain cyclic',()=>{
  assert.ok(read('music/music.js').includes("audio.addEventListener('ended',()=>{bar.style.width='100%';nextTrack();})"));
  assert.ok(read('sad-music/sad.js').includes('loopLocal:true'));
  assert.ok(read('sad-music/song.js').includes('loopLocal:true'));
  assert.ok(read('new-tools-trilogy.js').includes('if(radioMode){nextRadioTrack();return}'));
  const concrete=read('concrete-under-evergreens/player.js');
  assert.ok(concrete.includes("audio.addEventListener('ended'"));
  assert.ok(concrete.includes('advance()'));
});

test('background-sensitive players use immediate transitions without a silent media file',()=>{
  const players=['power-pulse-uprising/continuous-player.js','i-wont-let-the-wifi-go/wifi.js','sad-music/sad.js','sad-music/song.js','namaste-hamster/namaste.js','id-pick-you-first/player.js','funhouse-meltdown/player.js'];
  for(const file of players){
    const source=read(file);
    assert.ok(source.includes('CMDContinuousPlayback.create'),`${file} must use the shared transition guard`);
    assert.ok(!source.includes('CMD_SILENT_GAP'),`${file} must not use silent handoff audio`);
    assert.ok(!source.includes('silent-gap.js'),`${file} must not load the old gap file`);
  }
  const pages=fs.readdirSync(path.join(root,'sad-music'),{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>`sad-music/${entry.name}/index.html`).filter(file=>fs.existsSync(path.join(root,file))&&read(file).includes('/sad-music/song.js'));
  pages.push('sad-music/index.html','power-pulse-uprising/index.html','i-wont-let-the-wifi-go/index.html','namaste-hamster/index.html','id-pick-you-first/index.html','funhouse-meltdown/index.html');
  for(const file of pages){
    const html=read(file),guard=html.indexOf('/continuous-playback.js'),player=Math.max(html.indexOf('/sad-music/song.js'),html.indexOf('/sad-music/sad.js'),html.indexOf('/power-pulse-uprising/continuous-player.js'),html.indexOf('/i-wont-let-the-wifi-go/wifi.js'),html.indexOf('/namaste-hamster/namaste.js'),html.indexOf('/id-pick-you-first/player.js'),html.indexOf('/funhouse-meltdown/player.js'));
    assert.ok(guard>0&&player>guard,`${file} must load the recovery layer before its player`);
  }
});

test('every page with an audio element has a continuous controller',()=>{
  const controllers=['/continuous-playback.js','/music/music.js','/cut-from-the-same-fabric/player.js','/old-files-new-tools/player.js','/archive/continuous-tail.js','/concrete-under-evergreens/player.js'];
  const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()&&!entry.name.startsWith('.')?walk(path.join(directory,entry.name)):entry.isFile()&&entry.name.endsWith('.html')?[path.join(directory,entry.name)]:[]);
  const pages=walk(root).filter(file=>read(path.relative(root,file)).includes('<audio'));
  assert.ok(pages.length>0);
  pages.forEach(file=>{const relative=path.relative(root,file),html=read(relative);assert.ok(controllers.some(controller=>html.includes(controller)),`${relative} needs a player that continues after ended`)});
});
