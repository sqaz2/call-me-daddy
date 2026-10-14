(()=>{
  const M=CatalogModel,$=id=>document.getElementById(id);
  let songs=[],filter='all',state={queue:[],track:{}},loader=null,pendingLoader=null,lastRefresh=0,loading=false,lastAudio='',queueKey='',seeking=false;
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
  let saved=new Set(read('saved-songs',[]));
  const send=(type,data={})=>{if(window.MusicSubjectNative)MusicSubjectNative.postMessage(JSON.stringify({type,...data}));else window.showError('This preview needs the Android app to play music.')};
  const time=value=>{const s=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  window.showError=message=>{$('notice').querySelector('span').textContent=message;$('notice').hidden=false};
  $('notice').querySelector('button').onclick=()=>$('notice').hidden=true;
  function putImage(img,src){img.onerror=()=>{img.onerror=null;img.src='icon.png'};img.src=src||'icon.png'}
  function matches(song){
    const text=[song.title,song.kind,song.description,...M.variants(song).map(v=>v.label)].join(' ').toLowerCase();
    const q=$('search').value.trim().toLowerCase();
    return (!q||text.includes(q))&&(filter==='all'||filter==='saved'&&saved.has(song.id)||filter==='jokes'&&(song.shareCategory==='jokes'||/satir|comedy|parody/i.test(song.kind||''))||filter==='dubstep'&&/dubstep/i.test(text)||filter==='hiphop'&&/hip.?hop|\brap\b/i.test(text));
  }
  function render(){
    const visible=songs.filter(matches);$('songs').replaceChildren();$('count').textContent=`${visible.length} songs`;$('empty').hidden=!!visible.length;
    $('listTitle').textContent=filter==='saved'?'Your saved songs':'The catalogue';
    for(const song of visible){
      const row=document.createElement('article');row.className='song'+(state.track.songId===song.id?' active':'');row.dataset.song=song.id;
      const start=document.createElement('button');start.className='song-start';start.setAttribute('aria-label',`Play ${song.title}`);
      const img=document.createElement('img');img.alt='';img.loading='lazy';putImage(img,M.track(song)?.cover);
      const copy=document.createElement('span');copy.className='song-copy';const title=document.createElement('strong');title.textContent=song.title;
      const label=document.createElement('small');const n=M.variants(song).length;label.textContent=`${song.kind||'MusicSubject'}${n>1?` · ${n} versions`:''}`;
      copy.append(title,label);start.append(img,copy);start.onclick=()=>{if(state.track.songId===song.id)send('toggle');else playSong(song)};
      const more=document.createElement('button');more.className='more';more.textContent='⋯';more.setAttribute('aria-label',`Versions and options for ${song.title}`);more.onclick=()=>showVersions(song);
      row.append(start,more);$('songs').append(row);
    }
  }
  function playQueue(queue){if(!queue.length){window.showError('No recordings are available yet. Refresh the catalogue.');return}send('play',{queue:queue.slice(0,500),index:0})}
  function playSong(song,variant){playQueue(M.selectedQueue(songs,song.id,variant?.id))}
  function showVersions(song){
    $('versionList').replaceChildren();
    for(const variant of M.variants(song)){const button=document.createElement('button');button.textContent=`▶ ${variant.label||variant.id||'Original'}`;button.onclick=()=>{playSong(song,variant);$('versionPicker').close()};$('versionList').append(button)}
    const save=document.createElement('button');save.textContent=saved.has(song.id)?'♥ Remove from saved':'♡ Save song';save.onclick=()=>{toggleSaved(song.id);$('versionPicker').close()};$('versionList').append(save);
    const story=document.createElement('button');story.textContent='Read the song story ↗';story.onclick=()=>send('open',{url:M.track(song)?.experience});$('versionList').append(story);
    $('versionPicker').showModal();
  }
  function toggleSaved(id){if(!id)return;if(saved.has(id))saved.delete(id);else saved.add(id);localStorage.setItem('saved-songs',JSON.stringify([...saved]));$('saveTrack').textContent=saved.has(state.track.songId)?'♥':'♡';render()}
  function installCatalogue(list,cached=false){
    songs=M.playable(list).sort((a,b)=>String(b.date||b.year||'').localeCompare(String(a.date||a.year||'')));
    render();$('catalogStatus').textContent=cached?'Saved catalogue · reconnect to check for new songs':`${songs.length} songs · updated just now`;
    $('playLatest').disabled=!songs.length;
    if(!cached){try{localStorage.setItem('catalog',JSON.stringify(list))}catch{}}
  }
  function refresh(){
    if(loading)return;loading=true;$('refresh').disabled=true;$('radio').disabled=true;$('catalogStatus').textContent='Checking for new songs…';
    const frame=document.createElement('iframe');frame.className='loader-frame';frame.title='Song catalogue';frame.src='catalog.html?refresh='+Date.now();pendingLoader=frame;document.body.append(frame);
  }
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==pendingLoader?.contentWindow)return;
    if(!['catalog-ready','catalog-error'].includes(event.data?.type))return;
    loading=false;$('refresh').disabled=false;
    if(event.data.type==='catalog-ready'){
      loader?.remove();loader=pendingLoader;pendingLoader=null;lastRefresh=Date.now();installCatalogue(event.data.songs);$('radio').disabled=false;
    }else{pendingLoader.remove();pendingLoader=null;$('radio').disabled=!loader;$('catalogStatus').textContent=songs.length?'Could not refresh · showing saved songs':'Unable to load songs. Check your connection and tap ↻.'}
  });
  window.refreshIfStale=()=>{if(Date.now()-lastRefresh>120000)refresh()};
  $('refresh').onclick=refresh;$('playLatest').onclick=()=>playQueue(M.latest(songs));
  $('radio').onclick=()=>{const q=M.radio(songs,loader?.contentWindow.CMDCatalogCycle);if(q.length)playQueue(q);else window.showError('Connect and refresh to start a new mix.')};
  $('search').oninput=()=>{$('clearSearch').hidden=!$('search').value;render()};$('clearSearch').onclick=()=>{$('search').value='';$('clearSearch').hidden=true;render()};
  document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render()});
  for(const id of ['miniPlay','play'])$(id).onclick=()=>send('toggle');for(const id of ['miniNext','next'])$(id).onclick=()=>send('next');$('previous').onclick=()=>send('previous');
  $('expand').onclick=()=>$('player').showModal();$('collapse').onclick=()=>$('player').close();$('closeVersions').onclick=()=>$('versionPicker').close();
  $('seek').oninput=()=>{seeking=true;$('position').textContent=time($('seek').value)};$('seek').onchange=()=>{send('seek',{seconds:Number($('seek').value)});seeking=false};
  $('saveTrack').onclick=()=>toggleSaved(state.track.songId);$('story').onclick=()=>send('open',{url:state.track.experience});$('share').onclick=()=>send('share',{url:state.track.shareUrl||state.track.experience,title:state.track.title});
  $('versions').onclick=()=>{const song=songs.find(s=>s.id===state.track.songId);if(song)showVersions(song)};
  $('website').onclick=()=>send('open',{url:M.SITE});$('showQueue').onclick=()=>{$('queue').hidden=!$('queue').hidden};
  window.closePanel=()=>{if($('versionPicker').open){$('versionPicker').close();return true}if($('player').open){$('player').close();return true}return false};
  window.receivePlayback=next=>{
    state=next;const track=state.track||{};$('dock').hidden=!track.audio;if(!track.audio)return;
    if(track.audio!==lastAudio){lastAudio=track.audio;putImage($('miniCover'),track.cover);putImage($('cover'),track.cover);
      $('miniTitle').textContent=track.title;$('title').textContent=track.title;$('artist').textContent=track.artist;$('version').textContent=track.label;
      $('saveTrack').textContent=saved.has(track.songId)?'♥':'♡';render();try{loader?.contentWindow.CMDCatalogCycle?.remember(track)}catch{}
    }
    const buttonText=state.error?'↻':state.wantsPlayback&&!state.ended?'Ⅱ':'▶';
    for(const id of ['play','miniPlay']){$(id).textContent=buttonText;$(id).setAttribute('aria-label',state.error?'Retry playback':state.wantsPlayback&&!state.ended?'Pause':'Play')}
    $('miniLabel').textContent=state.error?'Tap retry to reconnect':state.buffering?'Loading audio…':track.label||track.artist;
    $('playStatus').textContent=state.error|| (state.buffering?'Loading audio…':state.ended?'Queue finished':state.duration-state.position<=5&&state.queue[state.index+1]?`Up next: ${state.queue[state.index+1].title}`:'');
    $('miniProgress').style.width=`${state.duration?Math.min(100,state.position/state.duration*100):0}%`;
    if(!seeking){$('seek').max=state.duration||0;$('seek').value=state.position||0;$('position').textContent=time(state.position)}
    $('duration').textContent=time(state.duration);$('seek').disabled=!state.duration;
    $('next').disabled=$('miniNext').disabled=state.index>=state.queue.length-1;
    const nextKey=state.queue.map(t=>t.audio).join('|')+state.index;
    if(nextKey!==queueKey){queueKey=nextKey;$('queue').replaceChildren();state.queue.forEach((t,i)=>{const row=document.createElement('button');row.className='queue-row'+(i===state.index?' current':'');row.textContent=`${i===state.index?'▶':i+1}  ${t.title}`;const label=document.createElement('small');label.textContent=t.label||t.artist;row.append(label);row.onclick=()=>send('jump',{index:i});$('queue').append(row)})}
  };
  $('radio').disabled=true;const cached=read('catalog',[]);if(cached.length)installCatalogue(cached,true);refresh();send('ready');
})();
