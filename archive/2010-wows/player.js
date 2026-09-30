(()=>{
  'use strict';
  const SONG_ID='2010-wows';
  const byId=id=>document.getElementById(id);
  const audio=byId('releaseAudio');
  const coverButton=byId('releasePlay');
  const status=byId('releaseStatus');
  const song=(window.CMD_SONGS||[]).find(item=>item.id===SONG_ID);
  if(!audio||!coverButton)return;
  if(!song?.variants?.length){
    if(status)status.textContent='The catalog did not load. Refresh to choose a version.';
    coverButton.disabled=true;
    document.querySelectorAll('[data-cut]').forEach(button=>{button.disabled=true});
    return;
  }
  const variants=song.variants.filter(variant=>variant?.audio);
  const tracks=variants.map(variant=>({...song,...variant,id:`${SONG_ID}:${variant.id}`,songId:SONG_ID,variantId:variant.id,variantLabel:variant.label,variantCount:variants.length,title:song.title,cover:variant.cover||song.cover,radioIntent:'old-files'}));
  const absolute=value=>{try{return new URL(value,location.href).href}catch{return String(value||'')}};
  const indexFor=source=>source?tracks.findIndex(track=>absolute(track.audio)===absolute(source)):-1;
  const formatTime=value=>{const seconds=Math.round(Number(value)||0);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`};
  const shared=()=>{
    try{if(window.top!==window.self&&window.top.location.origin===location.origin)return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{}
    return window.CMDUniversalPlayer;
  };
  // A retained adapter can outlive its iframe's document after a reload. Its old
  // audio still has a src/paused property, but cannot deliver live playback events.
  const usableMedia=media=>{
    if(!media||media.isConnected===false)return false;
    try{
      const doc=media.ownerDocument;
      return !doc||Boolean(doc.defaultView&&doc.defaultView.document===doc);
    }catch{return false}
  };
  // The actual, live source owns identity, not metadata left by an unloaded page.
  const live=()=>{
    const owner=shared(),candidate=owner?.getMedia?.(),track=owner?.getTrack?.();
    const media=usableMedia(candidate)?candidate:null;
    const source=media?.getAttribute?.('src')||media?.src||media?.currentSrc||'';
    return {owner,media,track,index:indexFor(source),playing:Boolean(media&&!media.paused&&!media.ended)};
  };
  const requested=new URLSearchParams(location.search).get('version');
  let selected=Math.max(0,tracks.findIndex(track=>track.variantId===requested));
  let controller=null,timer=null;
  let message='';
  const draw=()=>{
    const current=live();
    if(current.index>=0)selected=current.index;
    const track=tracks[selected],playing=current.index===selected&&current.playing;
    const cover=byId('releaseCover'),icon=byId('releasePlayIcon'),text=byId('releasePlayText'),label=byId('releaseCutLabel'),duration=byId('releaseDuration'),share=byId('releaseShare');
    if(cover){if(absolute(cover.src)!==absolute(track.cover))cover.src=track.cover;cover.alt=`Artwork for ${track.variantLabel}`}
    coverButton.setAttribute('aria-label',`${playing?'Pause':'Play'} ${track.variantLabel}`);
    coverButton.setAttribute('aria-pressed',String(playing));
    if(icon)icon.textContent=playing?'❚❚':'▶';
    if(text)text.textContent=`${playing?'Pause':'Play'} ${track.variantLabel.toLowerCase()}`;
    if(label)label.textContent=track.variantLabel;
    if(duration)duration.textContent=formatTime(track.duration);
    if(share){share.dataset.shareTitle=`${track.title} — ${track.variantLabel}`;share.dataset.shareUrl=new URL(`${song.experience}?version=${encodeURIComponent(track.variantId)}`,location.origin).href;share.dataset.shareText=`Listen to 2010 WOWS — ${track.variantLabel}.`}
    document.querySelectorAll('[data-cut]').forEach(button=>{const active=button.dataset.cut===track.variantId;button.setAttribute('aria-pressed',String(active));const icon=button.querySelector('.cut-icon');if(icon)icon.textContent=active&&playing?'❚❚':'▶';});
    if(status){
      if(message)status.textContent=message;
      else if(current.index>=0)status.textContent=`${playing?'Playing':'Paused'} · ${track.variantLabel} · use the dock to seek or skip.`;
      else if(current.playing)status.textContent='Another song is playing in the dock. Tap a cut here to return.';
      else status.textContent='Tap the artwork or a cut to play. Same song, two versions.';
    }
  };
  const ensureController=()=>{
    if(controller)return controller;
    if(!window.CMDContinuousPlayback?.create){message='The player did not load. Refresh to try again.';draw();return null}
    // No eager initialization: browsing this page must never steal another player's dock.
    controller=window.CMDContinuousPlayback.create({
      id:SONG_ID,audio,tracks,startIndex:selected,localCount:tracks.length,intent:'old-files',pageFollowSeconds:0,
      onTrack:track=>{const index=indexFor(track?.audio);if(index>=0)selected=index;message='';},
      onPlayState:()=>{message='';draw()},
      onStatus:kind=>{message=kind==='failed'?'Playback stopped. Tap the artwork to retry.':kind==='error'?'Recording unavailable. The shared player is trying the next song.':kind==='blocked'?'Ready — tap the artwork to continue.':'Buffering…';draw()},
      onNeedsTap:()=>{message='Ready — tap the artwork to continue.';draw()}
    });
    return controller;
  };
  const start=(index,{toggle=false}={})=>{
    if(!tracks[index])return;
    const target=tracks[index],current=live();
    message='';
    if(current.index===index&&current.media){
      selected=index;
      current.owner.control(toggle?'toggle':'play');
      draw();
      return;
    }
    // A deliberate cut selection transfers playback, never adds a competing queue.
    if(current.media&&current.media!==audio)current.owner.control('pause');
    selected=index;
    const core=ensureController();
    if(!core)return;
    if(absolute(core.current()?.audio)===absolute(target.audio))core.play();
    else core.load(index,{autoplay:true,reason:'version-selection'});
    draw();
  };
  coverButton.addEventListener('click',()=>start(selected,{toggle:true}));
  document.querySelectorAll('[data-cut]').forEach(button=>button.addEventListener('click',()=>start(tracks.findIndex(track=>track.variantId===button.dataset.cut),{toggle:true})));
  // Updates local events immediately; polling only reflects an owner in another same-origin frame.
  window.CMDContinuousPlayback?.subscribe?.(()=>draw());
  const startSync=()=>{if(timer===null)timer=window.setInterval(draw,400)};
  window.addEventListener('pagehide',()=>{if(timer!==null){window.clearInterval(timer);timer=null}});
  window.addEventListener('pageshow',startSync);
  draw();startSync();
})();
