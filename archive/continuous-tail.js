(()=>{
  const audio=document.getElementById('archiveAudio');
  const player=document.getElementById('archivePlayer');
  const title=document.getElementById('archiveTitle');
  const version=document.getElementById('archiveVersion');
  const status=document.getElementById('archiveStatus');
  const shareNow=document.getElementById('archiveShare');
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

  function loadRadio(){
    const track=radio?.next();
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

  shareNow?.addEventListener('click',event=>{
    if(!radioTrack)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.CMDPlaylistRadio?.share(radioTrack);
  },true);

  audio.addEventListener('ended',()=>{
    if(radioTrack){loadRadio();return;}
    if(localIndex>=0&&localIndex<playButtons.length-1){playButtons[localIndex+1].click();return;}
    loadRadio();
  });
  audio.addEventListener('error',()=>{
    status.textContent='Skipping unavailable track…';
    if(radioTrack){window.setTimeout(loadRadio,500);return;}
    if(localIndex>=0&&localIndex<playButtons.length-1){window.setTimeout(()=>playButtons[localIndex+1].click(),500);return;}
    window.setTimeout(loadRadio,500);
  });
})();
