(()=>{
  const library=window.CMDMyMusic,taste=window.CMDListenerTaste,engine=window.CMDCatalogCycle;
  const audio=document.getElementById('libraryAudio'),$=id=>document.getElementById(id);
  if(!library||!taste||!engine||!audio||!window.CMDContinuousPlayback)return;
  const records=(window.CMD_SONGS||[]).flatMap(song=>{
    const versions=engine.variants(song);
    return versions.map(version=>({...song,...version,id:`${song.id}:${version.id||'main'}`,songId:song.id,title:song.title,variantId:version.id||'main',variantLabel:version.label||song.kind||'Main version',variantCount:versions.length,cover:version.cover||song.cover}));
  });
  const key=ref=>`${ref?.songId||''}::${ref?.variantId||'main'}`;
  const catalog=new Map(records.map(track=>[key(track),track]));
  const resolve=ref=>catalog.get(key(ref));
  const formatTime=value=>{const n=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`};
  const label=track=>`${track.title} — ${track.variantLabel}`;
  let selected='',controller=null,revision='',resumeRevision='';
  const owner=()=>{try{return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{return window.CMDUniversalPlayer}};
  const message=text=>{$('libraryStatus').textContent=text};
  const playlist=()=>library.getPlaylists().find(item=>item.id===selected)||null;
  const saved=()=>taste.likedRecordings().map(resolve).filter(Boolean);
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
  function action(text,description,handler,focusId){
    const button=element('button','',text);button.type='button';button.setAttribute('aria-label',description);button.addEventListener('click',handler);if(focusId)button.dataset.focus=focusId;return button;
  }
  function result(outcome,success){message(outcome?.ok?success:outcome?.error||'Could not update your playlist.');renderAll(true);}
  function playTracks(tracks,index=0,position=0){
    if(!tracks.length)return message('No available recordings in this selection.');
    // Keep the browser's play permission within this button click. The shared
    // controller seeks on loadedmetadata before audio can become audible.
    owner()?.control?.('pause');
    if(controller){controller.pause();controller.destroy();controller=null;}
    controller=window.CMDContinuousPlayback.create({
      id:'my-music',audio,tracks,startIndex:index,radio:{next:()=>null},followPages:false,
      onNeedsTap:()=>message('Playback needs a tap. Use Play on the player below.'),
      onStatus:kind=>{if(kind==='unavailable')message('You’ve reached the end of this queue.');if(kind==='failed')message('These recordings could not load. Check your connection and try another song.');}
    });
    controller.load(index,{autoplay:false,position,reason:'my-music'});
    const playing=controller.play();playing?.catch?.(()=>{});
    message(`Playing ${label(tracks[index])}. ${tracks.length} recording${tracks.length===1?'':'s'} in this queue.`);
  }
  function row(track,scope,list,index=0){
    const card=element('article','recording');card.dataset.recording=key(track);
    const art=action(' ',`Play ${label(track)}`,()=>playTracks(list,index),`${scope}:${key(track)}:play`);art.className='art';
    const image=element('img');image.src=track.cover||'/media/site/image-coming-soon.jpg';image.alt='';image.loading='lazy';
    image.addEventListener('error',()=>{image.src='/media/site/image-coming-soon.jpg'},{once:true});
    const symbol=element('span','','▶');symbol.setAttribute('aria-hidden','true');art.replaceChildren(image,symbol);
    const copy=element('div');copy.append(element('h4','',track.title),element('p','',track.variantLabel));
    const actions=element('div','recording-actions');
    if(scope==='playlist'){
      const move=direction=>{
        const entries=playlist()?.recordings||[],neighbour=list[index+direction];
        if(!neighbour)return;
        const from=entries.findIndex(ref=>key(ref)===key(track)),to=entries.findIndex(ref=>key(ref)===key(neighbour));
        result(library.moveRecording(selected,track,to-from),`Recording moved ${direction<0?'up':'down'}.`);
      };
      const up=action('↑',`Move ${label(track)} up`,()=>move(-1),`${scope}:${key(track)}:up`);up.className='move';up.disabled=index===0;
      const down=action('↓',`Move ${label(track)} down`,()=>move(1),`${scope}:${key(track)}:down`);down.className='move';down.disabled=index===list.length-1;
      const remove=action('Remove',`Remove ${label(track)} from playlist`,()=>result(library.removeRecording(selected,track),'Recording removed from this playlist.'),`${scope}:${key(track)}:remove`);
      actions.append(up,down,remove);
    }else{
      const liked=taste.get(track.songId,track.variantId)==='like';
      const heart=action(liked?'♥ Saved':'♡ Save',`${liked?'Unsave':'Save'} ${label(track)}`,()=>{taste.like(track.songId,track.variantId);message(`${label(track)} ${liked?'removed from':'added to'} saved recordings.`);renderAll(true);},`${scope}:${key(track)}:save`);
      heart.setAttribute('aria-pressed',String(liked));actions.append(heart);
      const target=playlist();
      if(target){
        const exists=target.recordings.some(ref=>key(ref)===key(track));
        const add=action(exists?'✓ In playlist':'+ Playlist',`Add ${label(track)} to ${target.name}`,()=>result(library.addRecording(target.id,track),`Added to ${target.name}.`),`${scope}:${key(track)}:add`);add.disabled=exists;actions.append(add);
      }
    }
    card.append(art,copy,actions);return card;
  }
  function renderResume(){
    const snapshot=library.getResume(),signature=JSON.stringify(snapshot);
    if(signature===resumeRevision)return;resumeRevision=signature;
    $('resumeCard').hidden=!snapshot;if(!snapshot)return;
    const track=resolve(snapshot.queue[snapshot.index]);
    $('resumeQueue').disabled=!track;
    $('resumeHeading').textContent=track?.title||'This recording is no longer available';
    const available=snapshot.queue.map(resolve).filter(Boolean).length;
    $('resumeDescription').textContent=track?`${track.variantLabel} · ${formatTime(snapshot.position)} · ${available} recording${available===1?'':'s'} in your saved queue`:'Your playlists and saved recordings are still below.';
  }
  function renderSaved(){
    const tracks=saved();$('savedCount').textContent=String(tracks.length);$('savedEmpty').hidden=tracks.length>0;$('playSaved').disabled=!tracks.length;
    $('savedList').replaceChildren(...tracks.map((track,index)=>row(track,'saved',tracks,index)));
  }
  function renderPlaylists(){
    const lists=library.getPlaylists();if(!lists.some(item=>item.id===selected))selected=lists[0]?.id||'';
    $('playlistChoices').replaceChildren(...lists.map(item=>{const button=action(`${item.name} · ${item.recordings.length}`,`Open playlist ${item.name}`,()=>{selected=item.id;renderAll(true);},`playlist:${item.id}`);button.setAttribute('aria-pressed',String(item.id===selected));return button}));
    const active=playlist();$('playlistPanel').hidden=!active;
    $('addHint').textContent=active?`The + Playlist buttons add the exact recording to “${active.name}”. Choose a different playlist above any time.`:'Save a recording with its heart. Create a playlist above to start a collection.';
    if(!active)return;
    $('playlistTitle').textContent=active.name;$('renameName').value=active.name;
    const tracks=active.recordings.map(resolve).filter(Boolean),unavailable=active.recordings.length-tracks.length;
    $('playPlaylist').disabled=!tracks.length;
    $('playlistHint').textContent=tracks.length?`${tracks.length} recording${tracks.length===1?'':'s'} · use the arrows to set your order.${unavailable?' Some saved recordings are no longer in the catalog.':''}`:'Find a recording below and tap + Playlist to add it here.';
    $('playlistTracks').replaceChildren(...tracks.map((track,index)=>row(track,'playlist',tracks,index)));
  }
  function renderSearch(){
    const query=$('librarySearch').value.trim().toLowerCase(),words=query.split(/\s+/).filter(Boolean);
    const matches=records.filter(track=>{const text=[track.title,track.variantLabel,track.project,...(track.aliases||[])].join(' ').toLowerCase();return words.every(word=>text.includes(word))});
    const visible=matches.slice(0,query?40:12);
    $('searchCount').textContent=matches.length?`Showing ${visible.length} of ${matches.length} recordings${visible.length<matches.length?' · search to narrow the list.':'.'}`:'No recordings match. Try another title or version.';
    $('searchResults').replaceChildren(...visible.map(track=>row(track,'browse',[track],0)));
  }
  function renderAll(force=false){
    const persistent=library.storageStatus().persistent&&taste.storageStatus?.().persistent!==false;
    $('storageNotice').classList.toggle('is-warning',!persistent);
    $('storageNotice').textContent=persistent?'Saved on this browser. No account needed. Clearing browser data removes your library; it doesn’t sync between devices.':'This browser cannot save your library permanently. Changes will last only while this page stays open.';
    renderResume();
    const signature=JSON.stringify([library.getPlaylists(),taste.likedRecordings(),selected]);
    if(!force&&signature===revision)return;revision=signature;
    const focusId=document.activeElement?.dataset?.focus;
    renderPlaylists();renderSaved();renderSearch();
    if(focusId)[...document.querySelectorAll('[data-focus]')].find(node=>node.dataset.focus===focusId)?.focus({preventScroll:true});
  }
  $('librarySearch').addEventListener('input',renderSearch);
  $('playSaved').addEventListener('click',()=>playTracks(saved()));
  $('playPlaylist').addEventListener('click',()=>playTracks((playlist()?.recordings||[]).map(resolve).filter(Boolean)));
  $('createPlaylist').addEventListener('submit',event=>{
    event.preventDefault();const created=library.createPlaylist($('playlistName').value);
    if(created.ok){selected=created.playlist.id;$('playlistName').value='';}
    result(created,`Created ${created.playlist?.name||'playlist'}. Find recordings below to add.`);
  });
  $('renamePlaylist').addEventListener('submit',event=>{event.preventDefault();result(library.renamePlaylist(selected,$('renameName').value),'Playlist renamed.');});
  $('deletePlaylist').addEventListener('click',()=>{
    const active=playlist();if(!active||!window.confirm(`Delete “${active.name}”? This removes the playlist, but keeps your saved recordings.`))return;
    result(library.deletePlaylist(active.id),'Playlist deleted.');
  });
  $('resumeQueue').addEventListener('click',()=>{
    const snapshot=library.getResume();if(!snapshot)return;
    const current=resolve(snapshot.queue[snapshot.index]);if(!current)return message('This recording is no longer available.');
    const entries=snapshot.queue.map((ref,index)=>({track:resolve(ref),index})).filter(item=>item.track);
    const index=entries.findIndex(item=>item.index===snapshot.index);
    playTracks(entries.map(item=>item.track),index,snapshot.position);
  });
  library.subscribe(()=>renderAll());
  window.addEventListener('cmd:taste-change',()=>renderAll());
  try{if(window.top!==window&&window.top.location.origin===location.origin)window.top.addEventListener('cmd:taste-change',()=>renderAll())}catch{}
  window.addEventListener('storage',()=>renderAll());
  renderAll(true);
})();
