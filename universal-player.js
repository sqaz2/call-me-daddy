(()=>{
  if(window.CMDUniversalPlayer)return;

  const VERSION='1.1.0';
  const CONTACT_URL='https://facebook.com/callmedaddy';
  const FALLBACK_COVER=window.CMD_ARTWORK?.fallbackCover||'/media/site/image-coming-soon.jpg';
  const adapters=new Map();
  const mediaOwners=new WeakMap();
  const coreHandles=new WeakMap();
  const routeCache=new Map();
  let active=null,root=null,nodes=null,stopCoreObserver=null;
  let followKey='',followGeneration=0,lastMediaKey='';

  const absolute=value=>{if(!value)return'';try{return new URL(value,location.href).href}catch{return String(value)}};
  const samePage=value=>{try{const u=new URL(value,location.href);return u.pathname===location.pathname&&u.search===location.search}catch{return false}};
  const mediaSource=media=>absolute(media?.getAttribute?.('src')||media?.src||media?.currentSrc||'');
  const formatTime=value=>{const s=Number(value);if(!Number.isFinite(s)||s<0)return'0:00';const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=String(Math.floor(s%60)).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${r}`:`${m}:${r}`};
  const mediaList=value=>{const list=typeof value==='function'?value():value;return(Array.isArray(list)?list:[list]).filter(Boolean)};
  const catalogTrackFor=media=>{
    const source=mediaSource(media);
    if(!source)return null;
    for(const song of [window.CMD_SONGS,window.CMD_ARCHIVE_CATALOG].filter(Array.isArray).flat()){
      const variant=[song,...(Array.isArray(song?.variants)?song.variants:[])].find(item=>absolute(item?.audio||item?.src||item?.expectedPath)===source);
      if(variant)return {...song,...variant,id:variant!==song?`${song.id}:${variant.id||'main'}`:song.id,songId:song.id,variantId:variant!==song?variant.id||'main':'main',variantLabel:variant.label||song.kind||'',variantCount:Math.max(1,(song.variants||[]).filter(item=>item?.audio||item?.src||item?.expectedPath).length),title:song.title,artist:song.artist,project:song.project,cover:variant.cover||song.cover||'',audio:variant.audio||variant.src||variant.expectedPath||song.audio||'',experience:song.experience||''};
    }
    return null;
  };
  const normalizeTrack=(track,media)=>{
    const source=mediaSource(media);
    // A legacy adapter may still supply its first track after changing audio.src.
    // Never pair that old identity/artwork/story with a different recording.
    const stale=Boolean(source&&track?.audio&&absolute(track.audio)!==source);
    const resolved=stale?(catalogTrackFor(media)||{audio:source,title:'Uncatalogued recording'}):(track||catalogTrackFor(media)||{});
    return {...resolved,title:resolved.title||media?.dataset?.title||'Call Me Daddy',artist:resolved.artist||'MusicSubject × Call Me Daddy',cover:resolved.cover||FALLBACK_COVER,audio:resolved.audio||source};
  };
  const trackKey=track=>absolute(track?.audio)||`${track?.songId||track?.id||''}:${track?.variantId||'main'}`;
  const fallbackRoute=track=>{
    const url=new URL('/now-playing/',location.origin);
    url.searchParams.set('song',track?.songId||String(track?.id||'').split(':')[0]);
    url.searchParams.set('version',track?.variantId||'main');
    return `${url.pathname}${url.search}`;
  };
  const routePath=value=>new URL(value,location.origin).pathname.replace(/index\.html$/,'').replace(/\/$/,'')||'/';
  async function resolveRoute(track){
    const fallback=fallbackRoute(track);
    if(!track?.experience)return fallback;
    let target;try{target=new URL(track.experience,location.origin)}catch{return fallback}
    if(target.origin!==location.origin)return fallback;
    if(track.variantCount>1&&track.variantId)target.searchParams.set('version',track.variantId);
    if(samePage(target.href))return `${target.pathname}${target.search}${target.hash}`;
    const key=target.pathname;
    if(!routeCache.has(key)){
      const check=(async()=>{
        if(typeof fetch!=='function')return false;
        const abort=typeof AbortController==='function'?new AbortController():null;
        const timeout=setTimeout(()=>abort?.abort(),4000);
        try{
          const response=await fetch(target.href,{credentials:'same-origin',signal:abort?.signal});
          if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return false;
          if(response.url&&(new URL(response.url).origin!==location.origin||routePath(response.url)!==routePath(target.href)))return false;
          const html=await response.text();
          // Reject soft-404/homepage fallbacks returned with HTTP 200.
          if(typeof DOMParser==='function'){
            const doc=new DOMParser().parseFromString(html,'text/html');
            const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href')||doc.querySelector('meta[property="og:url"]')?.getAttribute('content');
            if(canonical&&routePath(canonical)!==routePath(target.href))return false;
            if(/^\s*(404|not found|page not found)\b/i.test(doc.title||''))return false;
          }
          return true;
        }catch{return false}finally{clearTimeout(timeout)}
      })();
      routeCache.set(key,check);
    }
    const available=await routeCache.get(key);
    // Do not permanently cache an outage: a story can become live later.
    if(!available)routeCache.delete(key);
    return available?`${target.pathname}${target.search}${target.hash}`:fallback;
  }
  function cancelFollow(){followGeneration+=1;followKey=''}
  async function followTrack(track){
    if(!track||!(track.songId||track.id)||!active?.playing()||active.followPages===false)return false;
    const key=trackKey(track);
    if(!key||key===followKey)return false;
    followKey=key;
    const generation=++followGeneration;
    const route=await resolveRoute(track);
    if(generation!==followGeneration||!active?.playing()||trackKey(active.track())!==key)return false;
    if(!samePage(route)&&window.CMDPersistentSite?.open)window.CMDPersistentSite.open(route);
    return true;
  }

  function injectStyles(){
    if(document.getElementById('cmd-universal-player-style'))return;
    const style=document.createElement('style');style.id='cmd-universal-player-style';
    style.textContent=`
      .cmd-universal-replaced{display:none!important}
      body.cmd-universal-open{padding-bottom:calc(126px + env(safe-area-inset-bottom))!important}
      .cmd-universal-player{position:fixed;z-index:2147483500;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));left:max(12px,env(safe-area-inset-left));width:min(980px,calc(100% - 24px));margin:auto;color:#f4f0e8;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .cmd-universal-player[hidden]{display:none!important}
      .cmd-universal-shell{position:relative;display:grid;grid-template-columns:58px minmax(0,1fr) auto;grid-template-rows:auto 5px;align-items:center;gap:10px 14px;padding:12px 14px 18px;border:1px solid rgba(255,255,255,.17);border-radius:24px;background:rgba(8,8,9,.96);box-shadow:0 22px 74px rgba(0,0,0,.58);backdrop-filter:blur(22px);overflow:hidden}
      .cmd-universal-art{position:relative;grid-row:1;width:58px;height:58px;padding:0;overflow:hidden;border:1px solid rgba(255,255,255,.15);border-radius:13px;background:#171717;color:#fff;cursor:pointer}
      .cmd-universal-art img{display:block;width:100%;height:100%;object-fit:cover}
      .cmd-universal-art span{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.38);font-size:1rem;text-shadow:0 2px 8px #000;opacity:.92}
      .cmd-universal-copy{min-width:0;align-self:center}.cmd-universal-copy small,.cmd-universal-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cmd-universal-context{color:#c7a968;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.cmd-universal-title{display:block;width:100%;margin:3px 0 2px;padding:0;overflow:hidden;border:0;background:transparent;color:#f5f1ea;font:900 1.03rem/1.15 system-ui,sans-serif;text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}.cmd-universal-detail{color:#aaa59d;font-size:.7rem}.cmd-universal-story{display:inline-flex!important;width:max-content;max-width:100%;margin-top:4px;color:#d7d1c7!important;font-size:.68rem!important;font-weight:850;text-decoration:none}.cmd-universal-story.is-coming{color:#d7b266!important}.cmd-universal-controls{display:flex;align-items:center;gap:6px}.cmd-universal-controls button{display:grid;place-items:center;width:40px;height:40px;padding:0;border:1px solid rgba(255,255,255,.14);border-radius:50%;background:#191919;color:#f5f1ea;font:900 .95rem/1 system-ui,sans-serif;cursor:pointer}.cmd-universal-controls .cmd-universal-toggle{width:50px;height:50px;background:#f2efe8;color:#080808;font-size:1.02rem}.cmd-universal-controls button:disabled{cursor:not-allowed;opacity:.34}.cmd-universal-controls button:focus-visible,.cmd-universal-art:focus-visible,.cmd-universal-title:focus-visible,.cmd-universal-progress:focus-visible{outline:2px solid #f2efe8;outline-offset:2px}.cmd-universal-progress{position:relative;grid-column:1/-1;height:5px;border-radius:999px;background:#2b2927;cursor:pointer;overflow:hidden}.cmd-universal-progress span{display:block;width:0;height:100%;background:linear-gradient(90deg,#d7b266,#f4f0e8);transform-origin:left center}.cmd-universal-times{position:absolute;right:14px;bottom:5px;display:flex;gap:7px;color:#77736d;font-size:.58rem;pointer-events:none}.cmd-universal-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      @media(max-width:680px){body.cmd-universal-open{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}.cmd-universal-player{right:8px;bottom:max(8px,env(safe-area-inset-bottom));left:8px;width:calc(100% - 16px)}.cmd-universal-shell{grid-template-columns:48px minmax(0,1fr);grid-template-rows:auto auto 5px;padding:10px 11px 17px;border-radius:21px;gap:8px 10px}.cmd-universal-art{width:48px;height:48px;border-radius:11px}.cmd-universal-controls{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.cmd-universal-controls button,.cmd-universal-controls .cmd-universal-toggle{width:100%;height:38px;border-radius:999px}.cmd-universal-title{font-size:.96rem}.cmd-universal-detail{font-size:.66rem}.cmd-universal-story{font-size:.64rem!important}.cmd-universal-times{display:none}}
      @media(prefers-reduced-motion:reduce){.cmd-universal-player *{scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);
  }
  function mount(){
    if(root)return root;if(!document.body)return null;injectStyles();
    root=document.createElement('section');root.className='cmd-universal-player';root.hidden=true;root.setAttribute('aria-label','Site-wide music player');
    root.innerHTML=`<div class="cmd-universal-shell">
      <button class="cmd-universal-art" type="button" aria-label="Play or pause"><img alt=""><span aria-hidden="true">▶</span></button>
      <div class="cmd-universal-copy"><small class="cmd-universal-context">Play the site</small><button class="cmd-universal-title" type="button">Choose a song</button><span class="cmd-universal-detail">Ready</span><a class="cmd-universal-story" href="/music/">Browse music →</a></div>
      <div class="cmd-universal-controls" role="group" aria-label="Playback controls"><button class="cmd-universal-prev" type="button" aria-label="Previous song">↶</button><button class="cmd-universal-toggle" type="button" aria-label="Play">▶</button><button class="cmd-universal-next" type="button" aria-label="Next song">↷</button><button class="cmd-universal-share" type="button" aria-label="Share current song">↗</button></div>
      <div class="cmd-universal-progress" role="slider" tabindex="0" aria-label="Seek through song" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      <div class="cmd-universal-times"><span class="cmd-universal-current">0:00</span><span>/</span><span class="cmd-universal-duration">0:00</span></div><span class="cmd-universal-live" aria-live="polite"></span></div>`;
    document.body.appendChild(root);
    const q=s=>root.querySelector(s);
    nodes={art:q('.cmd-universal-art'),image:q('img'),icon:q('.cmd-universal-art span'),context:q('.cmd-universal-context'),title:q('.cmd-universal-title'),detail:q('.cmd-universal-detail'),story:q('.cmd-universal-story'),previous:q('.cmd-universal-prev'),toggle:q('.cmd-universal-toggle'),next:q('.cmd-universal-next'),share:q('.cmd-universal-share'),progress:q('.cmd-universal-progress'),bar:q('.cmd-universal-progress span'),current:q('.cmd-universal-current'),duration:q('.cmd-universal-duration'),live:q('.cmd-universal-live')};
    nodes.art.addEventListener('click',()=>active?.toggle?.());nodes.toggle.addEventListener('click',()=>active?.toggle?.());
    nodes.previous.addEventListener('click',()=>active?.previous?.());nodes.next.addEventListener('click',()=>active?.next?.());nodes.share.addEventListener('click',()=>active?.share?.());
    nodes.title.addEventListener('click',()=>{const track=active?.track();if(track?.experience&&!samePage(track.experience)){if(window.CMDPersistentSite?.open)window.CMDPersistentSite.open(track.experience);else location.assign(track.experience);return}if(!track?.experience)window.open(CONTACT_URL,'_blank','noopener')});
    nodes.progress.addEventListener('click',event=>{if(!active)return;const duration=active.duration(),rect=nodes.progress.getBoundingClientRect();if(Number.isFinite(duration)&&duration>0&&rect.width>0)active.seek(Math.max(0,Math.min(duration,(event.clientX-rect.left)/rect.width*duration)))});
    nodes.progress.addEventListener('keydown',event=>{if(!active||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const duration=active.duration();if(!Number.isFinite(duration)||duration<=0)return;active.seek(event.key==='Home'?0:event.key==='End'?duration:Math.max(0,Math.min(duration,active.time()+(event.key==='ArrowRight'?5:-5))));event.preventDefault()});
    return root;
  }
  function defaultShare(track){
    if(!track)return false;if(window.CMDPlaylistRadio?.share)return window.CMDPlaylistRadio.share(track);
    const url=track.shareUrl||track.experience||fallbackRoute(track),detail=track.variantCount>1&&track.variantLabel?` — ${track.variantLabel}`:'';
    const data={title:`${track.title}${detail}`,text:`Listen to ${track.title}${detail}.`,url:absolute(url)};
    try{if(navigator.share)return navigator.share(data);return navigator.clipboard?.writeText(`${data.text}\n${data.url}`)}catch{return false}
  }
  function configureMediaSession(adapter){
    if(!('mediaSession'in navigator))return;
    const handlers={play:adapter.play,pause:adapter.pause,previoustrack:adapter.previous,nexttrack:adapter.next,seekbackward:d=>adapter.seek(Math.max(0,adapter.time()-(d.seekOffset||10))),seekforward:d=>adapter.seek(Math.min(adapter.duration()||Infinity,adapter.time()+(d.seekOffset||10))),seekto:d=>{if(typeof d.seekTime==='number')adapter.seek(d.seekTime)}};
    Object.entries(handlers).forEach(([action,handler])=>{try{navigator.mediaSession.setActionHandler(action,typeof handler==='function'?handler:null)}catch{}});
  }
  function parentPlayer(){try{return window.top&&window.top!==window.self&&window.top.location.origin===location.origin?window.top.CMDUniversalPlayer:null}catch{return null}}
  function render(message=''){
    if(!active||!mount())return;
    // One visible dock in the top document controls the actual owner frame.
    const parent=parentPlayer();
    if(parent?.adopt?.(active,window)){root.hidden=true;return}
    if(parent&&!active.playing()){root.hidden=true;return}
    const media=active.media(),track=active.track(),playing=active.playing(),duration=active.duration(),time=active.time();
    const ratio=Number.isFinite(duration)&&duration>0?Math.max(0,Math.min(1,time/duration)):0;
    if(nodes.image.src!==absolute(track.cover||FALLBACK_COVER))nodes.image.src=track.cover||FALLBACK_COVER;
    nodes.image.alt=`${track.title} artwork`;nodes.image.onerror=()=>{if(nodes.image.src!==absolute(FALLBACK_COVER))nodes.image.src=FALLBACK_COVER};
    nodes.title.textContent=track.title;nodes.title.setAttribute('aria-label',track.experience?(samePage(track.experience)?`${track.title}, current song page`:`Open ${track.title} song page`):`Ask about ${track.title}`);
    nodes.context.textContent=active.context(track);
    const detail=message||active.status()||(playing?'Playing':media?.ended?'Loading next…':media?.paused?'Paused':'Ready');
    nodes.detail.textContent=detail;if(nodes.live.textContent!==`${track.title}. ${detail}`)nodes.live.textContent=`${track.title}. ${detail}`;
    nodes.icon.textContent=playing?'❚❚':'▶';nodes.toggle.textContent=playing?'❚❚':'▶';nodes.toggle.setAttribute('aria-label',playing?'Pause':'Play');nodes.art.setAttribute('aria-label',playing?`Pause ${track.title}`:`Play ${track.title}`);
    nodes.previous.disabled=typeof active.previous!=='function';nodes.next.disabled=typeof active.next!=='function';nodes.share.disabled=typeof active.share!=='function';
    nodes.bar.style.width=`${ratio*100}%`;nodes.progress.setAttribute('aria-valuenow',String(Math.round(ratio*100)));nodes.current.textContent=formatTime(time);nodes.duration.textContent=formatTime(duration);
    nodes.story.classList.remove('is-coming');
    if(track.experience){nodes.story.href=track.experience;nodes.story.target='';nodes.story.rel='';nodes.story.textContent=samePage(track.experience)?'You’re on this song’s page':'Open song story →'}
    else{nodes.story.href=CONTACT_URL;nodes.story.target='_blank';nodes.story.rel='noopener';nodes.story.classList.add('is-coming');nodes.story.textContent='Story coming soon · ask me about this song ↗'}
    const key=trackKey(track);
    if('mediaSession'in navigator){
      configureMediaSession(active);
      if((key!==lastMediaKey||navigator.mediaSession.metadata?.title!==track.title)&&typeof MediaMetadata!=='undefined')try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:track.project||'Play the site',artwork:track.cover?[{src:absolute(track.cover)}]:[]});lastMediaKey=key}catch{}
      try{navigator.mediaSession.playbackState=playing?'playing':'paused';if(Number.isFinite(duration)&&duration>0)navigator.mediaSession.setPositionState({duration,playbackRate:media?.playbackRate||1,position:Math.min(time,duration)})}catch{}
    }
    if(playing)void followTrack(track);
  }
  function activate(adapter,{show=true,message='',passive=false}={}){
    if(!adapter)return;
    // Idle setup/time events from another player must not steal the dock.
    if(passive&&active&&active!==adapter&&!adapter.playing())return;
    active=adapter;if(!parentPlayer())configureMediaSession(adapter);
    if(show&&mount()){root.hidden=false;document.body.classList.add('cmd-universal-open');window.CMDPersistentSite?.refreshClearance?.()}
    render(message);
  }
  function connect(options={}){
    const id=String(options.id||`player-${adapters.size+1}`),listed=mediaList(options.media||options.audio);
    if(adapters.has(id)){
      const previous=adapters.get(id);
      if(previous.media()===listed[0])return previous.handle;
      previous.handle.destroy();
    }
    const dynamicMedia=()=>options.getMedia?.()||listed.find(item=>!item.paused&&!item.ended)||listed[0]||null;
    let trackOverride=options.track||null,statusOverride='',playingOverride=null,disposed=false;
    const adapter={id,ownerWindow:window,followPages:options.followPages!==false,media:dynamicMedia,
      track:()=>normalizeTrack(options.getTrack?.()||trackOverride,dynamicMedia()),
      playing:()=>playingOverride===null?Boolean(dynamicMedia()&&!dynamicMedia().paused&&!dynamicMedia().ended):Boolean(playingOverride),
      time:()=>Number(options.getTime?.()??dynamicMedia()?.currentTime)||0,duration:()=>Number(options.getDuration?.()??dynamicMedia()?.duration)||0,
      context:track=>String(options.getContext?.(track)||options.context||[track.variantLabel,track.project,track.artist].filter(Boolean).slice(0,2).join(' · ')||'Play the site'),status:()=>String(options.getStatus?.()||statusOverride||''),
      play:options.play||(()=>dynamicMedia()?.play?.()),pause:options.pause||(()=>dynamicMedia()?.pause?.()),toggle:options.toggle||(()=>{const media=dynamicMedia();return media?.paused?media.play?.():media?.pause?.()}),seek:options.seek||(time=>{const media=dynamicMedia();if(media)media.currentTime=time}),
      previous:typeof options.previous==='function'?options.previous:null,next:typeof options.next==='function'?options.next:null,share:options.share||(()=>defaultShare(adapter.track()))};
    const events=['play','playing','pause','timeupdate','durationchange','loadstart','loadedmetadata','waiting','stalled','ended','error'];
    const onMediaEvent=event=>{
      if(disposed||mediaOwners.get(event.target)!==adapter)return;
      if(event.type==='play'||event.type==='playing'){playingOverride=null;statusOverride='';activate(adapter,{show:true})}
      else if(active===adapter){if(event.type==='waiting'||event.type==='stalled')statusOverride='Buffering…';else if(event.type==='error')statusOverride='Playback needs a tap';else if(event.type!=='timeupdate')statusOverride='';render()}
    };
    listed.forEach(media=>{mediaOwners.set(media,adapter);events.forEach(type=>media.addEventListener?.(type,onMediaEvent))});
    if(options.replaceElement)options.replaceElement.classList?.add('cmd-universal-replaced');
    const handle={id,activate:()=>{if(!disposed)activate(adapter,{show:true})},
      update:(update={})=>{if(disposed)return;if(update.track!==undefined)trackOverride=update.track;if(update.status!==undefined)statusOverride=String(update.status||'');if(update.playing!==undefined)playingOverride=update.playing===null?null:Boolean(update.playing);activate(adapter,{show:update.show!==false,message:update.message||'',passive:true})},
      refresh:()=>!disposed&&active===adapter&&render(),
      destroy:()=>{disposed=true;if(active===adapter){if(root)root.hidden=true;document.body.classList.remove('cmd-universal-open');active=null}adapters.delete(id);listed.forEach(media=>{events.forEach(type=>media.removeEventListener?.(type,onMediaEvent));if(mediaOwners.get(media)===adapter)mediaOwners.delete(media)})}};
    adapter.handle=handle;adapters.set(id,adapter);if(options.activate)activate(adapter,{show:Boolean(options.show)});return handle;
  }
  function connectCore(event){
    const controller=event?.controller;if(!controller)return;
    let handle=coreHandles.get(controller);
    if(!handle){const localCount=Number(event.options?.localCount??event.options?.tracks?.length??Infinity);
      handle=connect({id:`core:${event.id}`,audio:event.audio,getTrack:()=>controller.current(),getContext:track=>[track?.variantLabel,controller.getState().index>=localCount?'Play the site':track?.project,track?.artist].filter(Boolean).slice(0,2).join(' · '),play:()=>controller.play(),pause:()=>controller.pause(),toggle:()=>controller.toggle(),previous:()=>controller.previous(),next:()=>controller.next('universal-next'),seek:time=>{event.audio.currentTime=time},replaceElement:event.options?.replacePlayer||null,followPages:event.options?.followPages});coreHandles.set(controller,handle)}
    const remaining=Number(event.state?.secondsRemaining),upcoming=event.state?.nextTrack;
    const upNext=event.type==='time'&&upcoming&&remaining>0&&remaining<=5?`Up next in ${Math.max(1,Math.ceil(remaining))} · ${upcoming.title||'another song'}`:'';
    const status=upNext||(event.state?.status==='waiting'||event.state?.status==='stalled'?'Buffering…':event.state?.status==='error'?'Skipping unavailable track…':'');
    handle.update({track:event.track,status,show:Boolean(event.state?.hasPlayed)});
  }
  function observeContinuous(playback){if(stopCoreObserver||!playback?.subscribe)return;stopCoreObserver=playback.subscribe(connectCore)}
  function adopt(adapter,sourceWindow){
    try{
      if(sourceWindow===window||sourceWindow.location.origin!==location.origin)return false;
      if(![...document.querySelectorAll('iframe')].some(frame=>frame.contentWindow===sourceWindow))return false;
      if(active!==adapter&&!adapter.playing())return false;
      if(adapter.playing())window.CMDPersistentSite?.claimPlayback?.(sourceWindow);
      activate(adapter,{show:true,passive:true});return true;
    }catch{return false}
  }
  window.CMDUniversalPlayer={version:VERSION,connect,observeContinuous,adopt,followTrack,cancelFollow,resolveRoute,fallbackRoute,getActive:()=>active?.handle||null,getTrack:()=>active?.track()||null,getMedia:()=>active?.media()||null,control:(action,...args)=>{if(['play','pause','toggle','next','previous','seek','share'].includes(action))return active?.[action]?.(...args)},refresh:()=>render(),contactUrl:CONTACT_URL};
  observeContinuous(window.CMDContinuousPlayback);
  document.addEventListener('play',event=>{const media=event.target;if(!media||mediaOwners.has(media)||media.muted||media.__cmdContinuousPlaybackController)return;connect({id:`native:${media.id||adapters.size+1}`,media,track:catalogTrackFor(media),activate:true,show:true})},true);
  const queued=Array.isArray(window.CMDUniversalPlayerQueue)?window.CMDUniversalPlayerQueue.splice(0):[];queued.forEach(callback=>{try{callback(window.CMDUniversalPlayer)}catch{}});
})();
