(()=>{
  'use strict';
  const ID='everybody-else-less';
  const audio=document.getElementById('releaseAudio');
  const status=document.getElementById('releaseStatus');
  const buttons=[...document.querySelectorAll('[data-play]')];
  const song=(window.CMD_SONGS||[]).find(item=>item.id===ID);
  if(!audio||!buttons.length)return;
  if(!song?.audio){buttons.forEach(button=>{button.disabled=true});if(status)status.textContent='The catalog did not load. Refresh, or use the Suno link.';return}
  const variant=song.variants?.find(item=>item.id==='main')||{id:'main',audio:song.audio};
  const track={...song,...variant,id:`${ID}:main`,songId:ID,variantId:'main',variantCount:1,variantLabel:variant.label||'Original upload',title:song.title,cover:variant.cover||song.cover,radioIntent:'think'};
  const absolute=value=>{try{return new URL(value,location.href).href}catch{return String(value||'')}};
  const shared=()=>{try{if(window.top!==window.self&&window.top.location.origin===location.origin)return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{}return window.CMDUniversalPlayer};
  const usable=media=>{if(!media||media.isConnected===false)return false;try{const doc=media.ownerDocument;return !doc||Boolean(doc.defaultView&&doc.defaultView.document===doc)}catch{return false}};
  const live=()=>{
    const owner=shared(),candidate=owner?.getMedia?.();
    const media=usable(candidate)?candidate:null;
    const source=media?.getAttribute?.('src')||media?.src||media?.currentSrc||'';
    return {owner,media,ours:Boolean(source&&absolute(source)===absolute(track.audio)),playing:Boolean(media&&!media.paused&&!media.ended)};
  };
  let controller=null,timer=null,message='';
  const draw=()=>{
    const current=live(),playing=current.ours&&current.playing;
    buttons.forEach(button=>{button.setAttribute('aria-pressed',String(playing));button.setAttribute('aria-label',`${playing?'Pause':'Play'} Everybody Else Less`);if(button.id!=='releasePlay')button.textContent=playing?'❚❚ Pause the song':'▶ Play the song'});
    const icon=document.getElementById('releasePlayIcon'),text=document.getElementById('releasePlayText');
    if(icon)icon.textContent=playing?'❚❚':'▶';
    if(text)text.textContent=`${playing?'Pause':'Play'} Everybody Else Less`;
    if(status)status.textContent=message||(current.ours?`${playing?'Playing':'Paused'} · Everybody Else Less · use the dock to seek or skip.`:current.playing?'Another song is playing in the dock. Tap here to return to Everybody Else Less.':'Tap the artwork or Play. More music follows in the bottom player.');
  };
  const ensure=()=>{
    if(controller)return controller;
    if(!window.CMDContinuousPlayback?.create){message='The player did not load. Refresh, or listen on Suno.';draw();return null}
    // Lazy creation keeps browsing from taking playback away from another song.
    controller=window.CMDContinuousPlayback.create({id:ID,audio,tracks:[track],localCount:1,intent:'think',pageFollowSeconds:0,
      onTrack:()=>{message='';draw()},onPlayState:()=>{message='';draw()},
      onStatus:kind=>{message=kind==='failed'?'Playback stopped. Tap to retry.':kind==='error'?'Recording unavailable. The shared player is trying the next song.':kind==='blocked'?'Tap the artwork to continue.':kind==='waiting'?'Buffering…':'';draw()},
      onNeedsTap:()=>{message='Tap the artwork to continue.';draw()}
    });
    return controller;
  };
  const start=()=>{
    const current=live();message='';
    if(current.ours&&current.media){current.owner.control('toggle');draw();return}
    // Only a deliberate tap transfers ownership. There is no page-specific ended queue.
    if(current.media&&current.media!==audio)current.owner.control('pause');
    const core=ensure();if(!core)return;
    if(absolute(core.current()?.audio)===absolute(track.audio))core.play();
    else core.load(0,{autoplay:true,reason:'song-artwork'});
    draw();
  };
  buttons.forEach(button=>button.addEventListener('click',start));
  document.querySelectorAll('[data-external-listen]').forEach(link=>link.addEventListener('click',()=>{const current=live();if(current.media)current.owner.control('pause');if(!audio.paused)audio.pause();draw()}));
  window.CMDContinuousPlayback?.subscribe?.(draw);
  const stop=()=>{if(timer!==null){window.clearInterval(timer);timer=null}};
  const resume=()=>{draw();if(timer===null&&document.visibilityState!=='hidden')timer=window.setInterval(draw,500)};
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);
  document.addEventListener('visibilitychange',()=>document.visibilityState==='hidden'?stop():resume());
  resume();
})();
