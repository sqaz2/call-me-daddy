(()=>{
  'use strict';
  const audio=document.getElementById('audiobookAudio');
  const button=document.getElementById('audiobookPlay');
  const status=document.getElementById('audiobookStatus');
  if(!audio||!button)return;
  // This spoken-word extra is deliberately absent from song variants and all
  // catalog queues. Only its page button creates this one-recording session.
  const track={
    id:'her-story:audiobook',songId:'her-story',variantId:'audiobook',variantCount:1,
    title:'Her Story — Audiobook',artist:'MusicSubject × Call Me Daddy',
    variantLabel:'Spoken word · Read by me',duration:347.4,
    audio:'/media/songs/2026/10/her-story/audiobook.m4a',
    cover:'/media/songs/2026/10/her-story/cover.png',
    experience:'/her-story/?version=audiobook#audiobook',
    shareUrl:'/her-story/?version=audiobook#audiobook'
  };
  const absolute=value=>{try{return new URL(value,location.href).href}catch{return ''}};
  const shared=()=>{
    try{if(window.top!==window.self&&window.top.location.origin===location.origin)return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{}
    return window.CMDUniversalPlayer;
  };
  const live=()=>{
    const owner=shared(),candidate=owner?.getMedia?.();
    let media=candidate;
    try{if(!media||media.isConnected===false||(media.ownerDocument&&media.ownerDocument.defaultView?.document!==media.ownerDocument))media=null}catch{media=null}
    const source=media?.getAttribute?.('src')||media?.src||media?.currentSrc;
    return {owner,media,matches:Boolean(source&&absolute(source)===absolute(track.audio))};
  };
  let controller=null,message='',timer=null;
  const draw=()=>{
    const current=live(),playing=current.matches&&!current.media.paused&&!current.media.ended;
    button.setAttribute('aria-pressed',String(playing));
    document.getElementById('audiobookIcon').textContent=playing?'❚❚':'▶';
    document.getElementById('audiobookAction').textContent=playing?'Pause audiobook':'Play audiobook';
    status.textContent=message||(current.matches?(current.media.ended?'Audiobook finished.':playing?'Playing audiobook.':'Audiobook paused.'):'Optional listening. Tap to play.');
  };
  button.addEventListener('click',()=>{
    const current=live();message='';
    if(current.matches){
      if(current.media.ended)current.owner.control('seek',0);
      current.owner.control('toggle');draw();return;
    }
    if(!window.CMDContinuousPlayback?.create){message='The player did not load. Refresh to try again.';draw();return}
    if(current.media)current.owner.control('pause');
    if(!controller)controller=window.CMDContinuousPlayback.create({
      id:'her-story-audiobook',audio,tracks:[track],localCount:1,
      // No music tail, automatic replay, or automatic restoration on page load.
      radio:{next:()=>null},loopLocal:false,restoreSession:false,followPages:false,
      onPlayState:()=>{message='';draw()},onTime:()=>{message='';draw()},
      onStatus:kind=>{
        message=kind==='unavailable'?'':kind==='error'||kind==='failed'?'The audiobook could not load. Tap to try again.':kind==='blocked'?'Tap to play the audiobook.':'Buffering…';draw();
      }
    });
    if(audio.ended)audio.currentTime=0;
    controller.play();draw();
  });
  window.CMDContinuousPlayback?.subscribe?.(draw);
  const sync=()=>{if(timer===null)timer=window.setInterval(draw,400)};
  window.addEventListener('pagehide',()=>{if(timer!==null){window.clearInterval(timer);timer=null}});
  window.addEventListener('pageshow',sync);
  draw();sync();
})();
