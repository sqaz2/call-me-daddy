(()=>{
  const audio=document.getElementById('archiveAudio');
  const player=document.getElementById('archivePlayer');
  const title=document.getElementById('archiveTitle');
  const version=document.getElementById('archiveVersion');
  const status=document.getElementById('archiveStatus');
  const shareNow=document.getElementById('archiveShare');
  const playNow=document.getElementById('archivePlay');
  const playButtons=[...document.querySelectorAll('.archive-version [data-src]')];
  if(!audio||!player||!playButtons.length)return;

  const archiveSongId=location.pathname.includes('i-need-love')?'i-need-love':'2010-wows';
  const radio=window.CMDPlaylistRadio?.create({intent:'old-files',excludeIds:[archiveSongId],lastSongId:archiveSongId});
  let localIndex=-1;
  let radioTrack=null;

  function versionShareUrl(button){
    const url=new URL('/music/',location.origin);
    url.searchParams.set('song',archiveSongId);
    url.searchParams.set('version',button.dataset.versionId||'main');
    url.searchParams.set('intent','old-files');
    url.searchParams.set('share','1');
    return url.href;
  }

  async function shareLocal(button){
    const data={title:`${button.dataset.title} — ${button.dataset.version}`,text:`Listen to ${button.dataset.title} — ${button.dataset.version}.`,url:versionShareUrl(button)};
    if(window.CMDShare?.nativeShare)return window.CMDShare.nativeShare(data);
    try{if(navigator.share)return navigator.share(data);await navigator.clipboard?.writeText(`${data.text}\n${data.url}`)}catch{}
  }

  playButtons.forEach((button,index)=>{
    button.addEventListener('click',()=>{localIndex=index;radioTrack=null});
    const share=document.createElement('button');
    share.className='btn';
    share.type='button';
    share.textContent='↗ Share this version';
    share.addEventListener('click',()=>shareLocal(button));
    button.after(share);
  });

  function loadRadioTrack(track){
    if(!track){status.textContent='Radio unavailable · open Music';return;}
    radioTrack=track;
    audio.src=track.audio;
    title.textContent=track.title;
    version.textContent=`Play the site${track.variantCount>1?` · ${track.variantLabel}`:''}`;
    status.textContent='Loading…';
    player.hidden=false;
    window.CMDPersistentSite?.refreshClearance?.();
    audio.play().catch(()=>status.textContent='Tap play to continue');
  }

  function loadRadio(){loadRadioTrack(radio?.next())}

  function nextTrack(){
    if(radioTrack){loadRadio();return;}
    if(localIndex>=0&&localIndex<playButtons.length-1){playButtons[localIndex+1].click();return;}
    loadRadio();
  }

  function previousTrack(){
    if(audio.currentTime>5){audio.currentTime=0;if(audio.paused)audio.play().catch(()=>{});return;}
    if(radioTrack){const track=radio?.previous?.();if(track&&track!==radioTrack)loadRadioTrack(track);else{audio.currentTime=0;if(audio.paused)audio.play().catch(()=>{})}return;}
    if(localIndex>0)playButtons[localIndex-1].click();else{audio.currentTime=0;if(audio.paused&&audio.src)audio.play().catch(()=>{})}
  }

  function currentTrack(){
    if(radioTrack)return radioTrack;
    const button=playButtons[localIndex];
    if(!button)return null;
    return {id:`${archiveSongId}:${button.dataset.versionId||'main'}`,songId:archiveSongId,variantId:button.dataset.versionId||'main',variantLabel:button.dataset.version||'Archive version',title:button.dataset.title||title.textContent,artist:'MusicSubject × Call Me Daddy',project:'Archive',audio:button.dataset.src,experience:location.pathname};
  }

  shareNow?.addEventListener('click',event=>{
    if(!radioTrack)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.CMDPlaylistRadio?.share(radioTrack);
  },true);

  audio.addEventListener('ended',nextTrack);
  audio.addEventListener('error',()=>{
    status.textContent='Skipping unavailable track…';
    if(radioTrack){window.setTimeout(loadRadio,500);return;}
    if(localIndex>=0&&localIndex<playButtons.length-1){window.setTimeout(()=>playButtons[localIndex+1].click(),500);return;}
    window.setTimeout(loadRadio,500);
  });
  window.CMDUniversalPlayer?.connect({
    id:`${archiveSongId}-universal`,media:audio,getTrack:currentTrack,getContext:track=>track?.variantLabel||'Archive',
    play:()=>{if(!audio.src)playButtons[0]?.click();else audio.play()},pause:()=>audio.pause(),toggle:()=>{if(!audio.src)playButtons[0]?.click();else if(audio.paused)audio.play();else audio.pause()},
    previous:previousTrack,next:nextTrack,share:()=>radioTrack?window.CMDPlaylistRadio?.share(radioTrack):playButtons[localIndex]&&shareLocal(playButtons[localIndex]),replaceElement:player
  });
})();
