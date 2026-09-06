(()=>{
  const params=new URLSearchParams(location.search),id=params.get('song'),version=params.get('version')||'main';
  const byId=id=>document.getElementById(id);
  const owner=()=>{try{return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{return window.CMDUniversalPlayer}};
  const live=owner()?.getTrack?.();
  const song=[window.CMD_SONGS,window.CMD_ARCHIVE_CATALOG].filter(Array.isArray).flat().find(item=>item.id===id);
  const variant=version==='main'?song:(song?.variants||[]).find(item=>item.id===version);
  const liveMatches=live&&(live.songId||String(live.id||'').split(':')[0])===id&&(live.variantId||'main')===version;
  const track=liveMatches?live:song&&variant?{...song,...variant,id:version==='main'?song.id:`${song.id}:${version}`,songId:song.id,variantId:version,title:song.title,cover:variant.cover||song.cover,audio:variant.audio||variant.src||variant.expectedPath||song.audio}:null;
  if(!track){byId('npTitle').textContent='Song not found';byId('npStatus').textContent='This song or version is not in the catalog. Browse Music to choose another recording.';return}
  byId('npTitle').textContent=track.title;byId('npArtist').textContent=[track.artist,version!=='main'&&(track.variantLabel||track.label)].filter(Boolean).join(' · ');document.title=`${track.title} — MusicSubject × Call Me Daddy`;
  const cover=byId('npCover');cover.src=track.cover||'/media/site/image-coming-soon.jpg';cover.alt=`${track.title} artwork`;cover.onerror=()=>{cover.onerror=null;cover.src='/media/site/image-coming-soon.jpg'};
  byId('npArt').hidden=false;byId('npPlay').hidden=!track.audio;
  byId('npStatus').textContent=liveMatches?'Your current player continues below.':'Tap the artwork to listen.';
  document.querySelector('[data-share]')?.setAttribute('data-share-title',`${track.title} — Call Me Daddy`);
  let controller=null;
  const toggle=()=>{
    const current=owner()?.getTrack?.();
    if(current&&new URL(current.audio,location.origin).href===new URL(track.audio,location.origin).href){owner().control('toggle');return}
    if(!track.audio)return;
    if(!controller)controller=window.CMDContinuousPlayback.create({id:`now-playing:${id}:${version}`,audio:byId('npAudio'),tracks:[track],localCount:1,intent:track.radioIntent||'surprise',onNeedsTap:()=>{byId('npStatus').textContent='Tap play again to start audio.'}});
    controller.toggle();
  };
  byId('npArt').addEventListener('click',toggle);byId('npPlay').addEventListener('click',toggle);
})();
